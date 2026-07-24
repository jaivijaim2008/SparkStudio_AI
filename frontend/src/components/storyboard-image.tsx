'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Image as ImageIcon, Clock } from 'lucide-react';

interface StoryboardImageProps {
  prompt: string;
  sceneNumber: number;
  alt: string;
  className?: string;
  shouldLoad?: boolean;
  onLoadComplete?: () => void;
  onLoadError?: () => void;
}

export function StoryboardImage({ 
  prompt, 
  sceneNumber, 
  alt, 
  className = "",
  shouldLoad = true,
  onLoadComplete = () => {},
  onLoadError = () => {}
}: StoryboardImageProps) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Set early error state if prompt is completely missing
  useEffect(() => {
    if (!prompt) {
      setError(true);
      setLoading(false);
      onLoadError();
    }
  }, [prompt]);

  // Re-generate URL when prompt, retryCount, or shouldLoad changes
  useEffect(() => {
    if (!shouldLoad || !prompt) return;

    setLoading(true);
    setError(false);

    // Sanitize prompt for Pollinations AI (remove newlines, double quotes, and clean special characters)
    const sanitizedPrompt = prompt
      .replace(/[\n\r]+/g, ' ')
      .replace(/["']/g, '')
      .replace(/[^\w\s,.?-]/g, '')
      .trim();

    const encodedPrompt = encodeURIComponent(sanitizedPrompt.substring(0, 450));
    const seed = (sceneNumber * 1337) + (retryCount * 42);
    const cacheBuster = retryCount > 0 ? `&r=${retryCount}` : '';
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=480&height=270&nologo=true&model=turbo&seed=${seed}${cacheBuster}`;
    
    setSrc(url);
  }, [prompt, sceneNumber, retryCount, shouldLoad]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoadComplete();
  };

  const handleError = () => {
    if (retryCount < 5) {
      // Silent background retry after 1.5 seconds to bypass rate limits
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1500);
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
  };

  // The fallback is a premium abstract CSS gradient representing a digital scene
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
      
      {/* 1. Shimmering Loading Skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0d0d14] p-2"
          >
            <div className="flex flex-col items-center gap-1.5 text-center">
              {!shouldLoad ? (
                <>
                  <Clock className="w-4 h-4 text-purple-400/50" />
                  <span className="text-[9px] text-white/30 font-medium">
                    Queued...
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-[9px] text-white/40 font-medium animate-pulse">
                    {retryCount > 0 ? `Generating visual (attempt ${retryCount + 1}/6)...` : 'Generating visual...'}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Actual Image */}
      {src && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
      )}

      {/* 3. Space-Efficient Gradient Fallback for Load Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br ${getGradientFallback(
              sceneNumber
            )}`}
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
