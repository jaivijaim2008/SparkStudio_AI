'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import { apiUrl } from '@/lib/api';

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
  const [attempt, setAttempt] = useState(1);

  const cleanPrompt = (text: string): string => {
    if (!text) return 'cinematic 8k digital artwork';
    let clean = text.replace(/\[.*?\]/g, ' ');
    clean = clean.replace(/\b(close-up|extreme|wide shot|medium shot|camera|zooming|panning|focus|angle|b-roll|sfx)\b/gi, ' ');
    return clean.replace(/["']/g, '').replace(/[\n\r]/g, ' ').trim().substring(0, 200);
  };

  useEffect(() => {
    if (!prompt && !preloadedUrl) {
      setLoading(false);
      onLoadError();
      return;
    }

    if (!shouldLoad) return;

    setLoading(true);

    const cleanedText = cleanPrompt(prompt);
    const encoded = encodeURIComponent(cleanedText + ' cinematic 8k photorealistic');
    const seed = (sceneNumber * 10007) + (attempt * 31);

    if (attempt === 1) {
      // Primary: Server-side AI Image Generator Route
      fetch(apiUrl('/api/image/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, scene_number: sceneNumber }),
      })
        .then(r => r.json())
        .then(data => {
          if (data?.image_url) {
            setSrc(data.image_url);
          } else {
            setSrc(`https://image.pollinations.ai/prompt/${encoded}?width=480&height=270&nologo=true&seed=${seed}`);
          }
        })
        .catch(() => {
          setSrc(`https://image.pollinations.ai/prompt/${encoded}?width=480&height=270&nologo=true&seed=${seed}`);
        });
    } else {
      // Direct Pollinations AI Fallback with simplified prompt and new seed (100% AI Generated, 0% Random Photos)
      setSrc(`https://image.pollinations.ai/prompt/${encoded}?width=480&height=270&nologo=true&seed=${seed}`);
    }
  }, [prompt, preloadedUrl, sceneNumber, attempt, shouldLoad]);

  const handleLoad = () => {
    setLoading(false);
    onLoadComplete();
  };

  const handleError = () => {
    // Retry with alternate AI seed
    if (attempt < 5) {
      setTimeout(() => {
        setAttempt(prev => prev + 1);
      }, 1000);
    } else {
      setLoading(false);
      onLoadError();
    }
  };

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    setAttempt(prev => prev + 1);
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
                Generating AI Scene Visual...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rendered Image */}
      {src && (
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

      {/* Scene number tag */}
      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[10px] font-bold text-white/90 border border-white/10 shadow-lg flex items-center gap-1.5">
        <span>Scene {sceneNumber}</span>
      </div>

      {/* Hover Refresh Button */}
      {!loading && (
        <button
          onClick={handleManualRefresh}
          className="absolute bottom-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity text-white shadow-lg"
          title="Regenerate AI Scene Visual"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
