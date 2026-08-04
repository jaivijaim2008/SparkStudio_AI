'use client';

import { useState, useEffect } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);

  const cleanPrompt = (text: string): string => {
    if (!text) return 'digital art cinematic news broadcast studio';
    let cleaned = text.replace(/\[.*?\]/g, ' '); // remove bracketed cues like [B-ROLL: ...]
    cleaned = cleaned.replace(/\b(close-up|extreme|wide shot|medium shot|camera|zooming|panning|focus|angle|b-roll|sfx)\b/gi, ' ');
    cleaned = cleaned.replace(/["']/g, '').replace(/[\n\r]/g, ' ').trim();
    return cleaned.substring(0, 300);
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

    const promptText = cleanPrompt(prompt);
    const encodedPrompt = encodeURIComponent(promptText);
    const seed = (sceneNumber * 1337) + (retryCount * 79);

    // Primary: Direct AI generation via Pollinations AI (Custom AI art for this exact scene prompt)
    const aiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=480&height=270&nologo=true&model=turbo&seed=${seed}`;
    
    // If retry count > 0, try searching Lexica.art AI database for matching SD art
    if (retryCount > 0) {
      const searchKeywords = promptText.split(/\s+/).slice(0, 5).join(' ');
      fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(searchKeywords)}`)
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
          setSrc(aiUrl);
        })
        .catch(() => setSrc(aiUrl));
    } else {
      setSrc(aiUrl);
    }
  }, [prompt, preloadedUrl, sceneNumber, retryCount, shouldLoad]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoadComplete();
  };

  const handleError = () => {
    if (retryCount < 4) {
      // Retry with a slightly modified seed / Lexica search fallback after 1.5s
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
    setRetryCount(prev => prev + 1);
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
                Generating Custom AI Art...
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
            <p className="text-[10px] font-semibold text-white/95 leading-none">AI Generation Timeout</p>
            <button
              onClick={handleManualRetry}
              className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 active:scale-95 text-[9px] font-medium text-white transition-all shadow-md"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Regenerate AI Image
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
