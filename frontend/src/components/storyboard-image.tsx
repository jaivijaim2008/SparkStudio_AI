'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Image as ImageIcon } from 'lucide-react';

interface StoryboardImageProps {
  prompt: string;
  sceneNumber: number;
  alt: string;
  className?: string;
  preloadedUrl?: string;   // ← Backend pre-warmed URL (instant)
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
  const [retryCount, setRetryCount] = useState(0);

  // ── Build URL: prefer backend pre-warmed URL, else generate client-side ──
  useEffect(() => {
    if (!prompt && !preloadedUrl) {
      setError(true);
      setLoading(false);
      onLoadError();
      return;
    }

    // If backend already pre-warmed the image, use it immediately — no queue needed
    if (preloadedUrl) {
      setSrc(preloadedUrl);
      return;
    }

    // Fallback: client-side generation (only if preloadedUrl missing and shouldLoad = true)
    if (!shouldLoad) return;

    setLoading(true);
    setError(false);

    const sanitized = prompt
      .replace(/[\n\r]+/g, ' ')
      .replace(/["']/g, '')
      .replace(/[^\w\s,.?-]/g, '')
      .trim();

    const encodedPrompt = encodeURIComponent(sanitized.substring(0, 450));
    const seed = (sceneNumber * 1337) + (retryCount * 42);
    const cacheBuster = retryCount > 0 ? `&r=${retryCount}` : '';
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=480&height=270&nologo=true&model=turbo&seed=${seed}${cacheBuster}`;

    setSrc(url);
  }, [prompt, preloadedUrl, sceneNumber, retryCount, shouldLoad]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoadComplete();
  };

  const handleError = () => {
    if (retryCount < 8) {
      // Exponential backoff: 1s, 2s, 4s, 8s… avoids hammering Pollinations
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, delay);
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
    setRetryCount(0);
    // Force re-fetch by appending timestamp
    setSrc(src + `&_t=${Date.now()}`);
  };

  const getGradientFallback = (num: number) => {
    const gradients = [
      'from-purple-900/60 via-indigo-900/40 to-slate-900',
      'from-blue-900/60 via-cyan-900/40 to-slate-900',
      'from-violet-900/60 via-pink-900/40 to-slate-900',
      'from-fuchsia-900/60 via-rose-900/40 to-slate-900',
      'from-emerald-900/60 via-teal-900/40 to-slate-900',
    ];
    return gradients[num % gradients.length];
  };

  return (
    <div className={`relative w-full h-full bg-black/40 rounded-lg overflow-hidden border border-white/5 group ${className}`}>

      {/* Beautiful gradient placeholder — shows instantly, fades out when image loads */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 z-20 overflow-hidden rounded-lg"
          >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getGradientFallback(sceneNumber)} animate-pulse`} />
            {/* Shimmer sweep effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            {/* Center icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <div className="w-6 h-6 rounded-full border-2 border-purple-400/60 border-t-purple-300 animate-spin" />
              <span className="text-[8px] text-white/40 font-medium mt-0.5">
                {preloadedUrl ? 'Loading...' : 'Generating...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual Image */}
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

      {/* Gradient Fallback on Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br ${getGradientFallback(sceneNumber)}`}
          >
            <p className="text-[10px] font-semibold text-white/95 leading-none">Visual Generation Timeout</p>
            <p className="text-[8px] text-white/45 max-w-[150px] mt-1 leading-snug">
              AI server is busy.
            </p>
            <button
              onClick={handleManualRetry}
              className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95 text-[9px] font-medium text-white transition-all shadow-md"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Retry Scene
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene number tag */}
      <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-semibold border border-white/10 shadow-lg">
        Scene {sceneNumber}
      </div>

    </div>
  );
}
