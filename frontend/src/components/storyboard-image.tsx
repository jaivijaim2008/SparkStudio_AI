'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    puter?: any;
  }
}

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
  const [attempt, setAttempt] = useState(1);

  const extractCleanPrompt = (text: string): string => {
    if (!text) return 'digital art cinematic broadcast studio';
    let clean = text.replace(/\[.*?\]/g, ' ');
    clean = clean.replace(/\b(close-up|extreme|wide shot|medium shot|camera|zooming|panning|focus|angle|b-roll|sfx)\b/gi, ' ');
    return clean.replace(/["']/g, '').replace(/[\n\r]/g, ' ').trim().substring(0, 250);
  };

  const extractSubjectTags = (text: string): string => {
    if (!text) return 'technology';
    let clean = text.replace(/\[.*?\]/g, ' ');
    clean = clean.replace(/\b(close-up|extreme|wide shot|medium shot|camera|zooming|panning|focus|angle|b-roll|sfx|the|and|with|that|this|for|from|into|over|host|scene|shot|view)\b/gi, ' ');
    const words = clean
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    return words.slice(0, 2).join(',') || 'technology';
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

    const clean = extractCleanPrompt(prompt);
    const tags = extractSubjectTags(prompt);
    const seed = (sceneNumber * 1337) + (attempt * 42);
    const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?width=480&height=270&nologo=true&model=turbo&seed=${seed}`;

    if (attempt === 1) {
      // Primary: Puter.js AI Text-to-Image (Free, Unlimited, Browser-Native AI generation)
      if (typeof window !== 'undefined' && window.puter?.ai?.txt2img) {
        window.puter.ai.txt2img(clean)
          .then((imgElement: any) => {
            const url = imgElement?.src || (typeof imgElement === 'string' ? imgElement : '');
            if (url) {
              setSrc(url);
            } else {
              setSrc(polUrl);
            }
          })
          .catch(() => {
            setSrc(polUrl);
          });
      } else {
        setSrc(polUrl);
      }
    } else if (attempt === 2) {
      // Secondary: Pollinations AI Turbo Generation
      setSrc(polUrl);
    } else {
      // Fallback: Scene Topic Match via LoremFlickr
      const topicUrl = `https://loremflickr.com/480/270/${encodeURIComponent(tags)}?random=${sceneNumber}`;
      setSrc(topicUrl);
    }
  }, [prompt, preloadedUrl, sceneNumber, attempt, shouldLoad]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoadComplete();
  };

  const handleError = () => {
    if (attempt < 3) {
      setAttempt(prev => prev + 1);
    } else {
      setLoading(false);
      setError(true);
      onLoadError();
    }
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(false);
    setLoading(true);
    setAttempt(1);
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
                Rendering Puter.js AI Art...
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
