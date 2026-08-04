'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';

interface StoryboardImageProps {
  prompt: string;
  sceneNumber: number;
  alt: string;
  className?: string;
  preloadedUrl?: string;
  shouldLoad?: boolean;
  onLoadComplete?: () => void;
  onLoadError?: () => void;
}

export function StoryboardImage({
  prompt,
  sceneNumber,
  alt,
  className = "",
  preloadedUrl = "",
  shouldLoad = true,
  onLoadComplete = () => {},
  onLoadError = () => {}
}: StoryboardImageProps) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  const extractCleanKeywords = (text: string): string => {
    if (!text) return 'digital art cinematic';
    let clean = text.replace(/\[.*?\]/g, ' ');
    clean = clean.replace(/\b(close-up|extreme|wide shot|medium shot|camera|zooming|panning|focus|angle|b-roll|sfx)\b/gi, ' ');
    const words = clean
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'with', 'that', 'this', 'for', 'from', 'into', 'over'].includes(w.toLowerCase()));
    
    return words.slice(0, 4).join(' ') || 'cinematic digital art';
  };

  useEffect(() => {
    if (!prompt && !preloadedUrl) {
      setError(true);
      setLoading(false);
      onLoadError();
      return;
    }

    if (!shouldLoad) return;

    setLoading(true);
    setError(false);

    const cleanQuery = extractCleanKeywords(prompt);
    const seed = sceneNumber * 100 + 42;
    const instantPicsumUrl = `https://picsum.photos/seed/${seed}/480/270`;

    // 1.5s Watchdog: If current source takes >1500ms, instantly force-swap to Picsum CDN
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    watchdogTimerRef.current = setTimeout(() => {
      setSrc(instantPicsumUrl);
      setFallbackTriggered(true);
    }, 1800);

    if (fallbackTriggered) {
      setSrc(instantPicsumUrl);
      return;
    }

    // Try Lexica AI image search first
    const encodedQuery = encodeURIComponent(cleanQuery);
    fetch(`https://lexica.art/api/v1/search?q=${encodedQuery}`)
      .then(r => r.json())
      .then(data => {
        if (data?.images?.length > 0) {
          const pick = data.images[sceneNumber % data.images.length];
          const url = pick?.src || pick?.srcSmall;
          if (url) {
            setSrc(url);
            return;
          }
        }
        setSrc(instantPicsumUrl);
      })
      .catch(() => {
        setSrc(instantPicsumUrl);
      });

    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, [prompt, preloadedUrl, sceneNumber, shouldLoad, fallbackTriggered]);

  const handleLoad = () => {
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    setLoading(false);
    setError(false);
    onLoadComplete();
  };

  const handleError = () => {
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    const seed = sceneNumber * 100 + 99;
    setSrc(`https://picsum.photos/seed/${seed}/480/270`);
    setFallbackTriggered(true);
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(false);
    setLoading(true);
    setFallbackTriggered(false);
  };

  const getGradientFallback = (num: number) => {
    const gradients = [
      'from-purple-900/80 via-indigo-900/60 to-slate-950',
      'from-blue-900/80 via-cyan-900/60 to-slate-950',
      'from-violet-900/80 via-pink-900/60 to-slate-950',
      'from-fuchsia-900/80 via-rose-900/60 to-slate-950',
      'from-emerald-900/80 via-teal-900/60 to-slate-950',
    ];
    return gradients[num % gradients.length];
  };

  return (
    <div className={`relative w-full h-full bg-black/40 rounded-lg overflow-hidden border border-white/10 group ${className}`}>
      {/* Loading Skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="absolute inset-0 z-20 overflow-hidden rounded-lg"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${getGradientFallback(sceneNumber)}`} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center p-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-[9px] text-white/60 font-medium tracking-wide">
                Rendering Scene {sceneNumber}...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rendered Image */}
      {src && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          loading="eager"
        />
      )}

      {/* Fallback Error Overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br ${getGradientFallback(sceneNumber)}`}
          >
            <Sparkles className="w-5 h-5 text-purple-300 mb-1" />
            <p className="text-[10px] font-semibold text-white/95 leading-none">Visual Cue Ready</p>
            <button
              onClick={handleManualRetry}
              className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 active:scale-95 text-[9px] font-medium text-white transition-all shadow-md"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Refresh Image
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene number tag */}
      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[10px] font-bold text-white/90 border border-white/10 shadow-lg">
        Scene {sceneNumber}
      </div>
    </div>
  );
}
