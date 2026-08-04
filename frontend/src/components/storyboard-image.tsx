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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(1);

  const cleanPrompt = (text: string): string => {
    if (!text) return 'cinematic 8k digital artwork';
    let clean = text.replace(/\[.*?\]/g, ' ');
    clean = clean.replace(/\b(close-up|extreme|wide shot|medium shot|camera|zooming|panning|focus|angle|b-roll|sfx)\b/gi, ' ');
    return clean.replace(/["']/g, '').replace(/[\n\r]/g, ' ').trim().substring(0, 200);
  };

  useEffect(() => {
    if (!prompt && !preloadedUrl) {
      setHasError(true);
      onLoadError();
      return;
    }

    if (!shouldLoad) return;

    setImageLoaded(false);
    setHasError(false);

    const cleanedText = cleanPrompt(prompt);
    const encoded = encodeURIComponent(cleanedText + ' cinematic 8k photorealistic');
    const seed = (sceneNumber * 10007) + (attempt * 31);
    const fallbackAiUrl = `https://image.pollinations.ai/prompt/${encoded}?width=480&height=270&nologo=true&seed=${seed}`;

    if (attempt === 1) {
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
            setSrc(fallbackAiUrl);
          }
        })
        .catch(() => {
          setSrc(fallbackAiUrl);
        });
    } else {
      setSrc(fallbackAiUrl);
    }
  }, [prompt, preloadedUrl, sceneNumber, attempt, shouldLoad]);

  const handleLoad = () => {
    setImageLoaded(true);
    setHasError(false);
    onLoadComplete();
  };

  const handleError = () => {
    if (attempt < 4) {
      setTimeout(() => {
        setAttempt(prev => prev + 1);
      }, 1200);
    } else {
      setHasError(true);
      onLoadError();
    }
  };

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageLoaded(false);
    setHasError(false);
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
      {/* Animated Gradient Placeholder Card — shown until image successfully loads */}
      <AnimatePresence>
        {!imageLoaded && !hasError && (
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
                {attempt > 1 ? `Retrying AI Visual (${attempt})...` : 'Generating AI Scene Visual...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual Rendered Image — hidden until loaded to prevent browser broken image icons */}
      {src && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
            imageLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          loading="eager"
        />
      )}

      {/* Error Fallback Card */}
      {hasError && (
        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br ${getGradientFallback(sceneNumber)}`}>
          <Sparkles className="w-4 h-4 text-purple-300 mb-1" />
          <span className="text-[9px] text-white/70 font-medium">AI Visual Cue Ready</span>
          <button
            onClick={handleManualRefresh}
            className="mt-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[8px] font-medium text-white transition-all shadow-md active:scale-95"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Generate Scene Visual
          </button>
        </div>
      )}

      {/* Scene number tag */}
      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[10px] font-bold text-white/90 border border-white/10 shadow-lg flex items-center gap-1.5">
        <span>Scene {sceneNumber}</span>
      </div>

      {/* Hover Refresh Button */}
      {imageLoaded && (
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
