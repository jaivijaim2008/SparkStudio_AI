'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Video, Smartphone, Sparkles, Copy, Check, AlertCircle, Loader2, ArrowDownRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api';

const YoutubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface YouTubeSummaryResult {
  status: string;
  video_id: string;
  title: string;
  author_name?: string;
  thumbnail_url?: string;
  summary: string;
  key_takeaways: string[];
}

export default function NewProject() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // YouTube Summarization States
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<YouTubeSummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    topic: '',
    platform: 'YouTube Shorts',
    audience: 'General',
    tone: 'Informative',
    language: 'English',
    video_length: 60,
  });

  const platforms = [
    { name: 'YouTube Shorts', icon: Smartphone, length: 60 },
    { name: 'TikTok', icon: Smartphone, length: 60 },
    { name: 'Instagram Reels', icon: Smartphone, length: 60 },
    { name: 'YouTube Long', icon: Video, length: 600 },
  ];

  const handleGenerateSummary = async () => {
    if (!youtubeUrl.trim()) {
      setSummaryError('Please enter a YouTube video URL.');
      toast.error('Please enter a YouTube video URL.');
      return;
    }

    setSummaryError(null);
    setIsSummarizing(true);
    setSummaryResult(null);

    try {
      const response = await fetch(apiUrl('/api/youtube/summarize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to extract and summarize YouTube video.');
      }

      const data: YouTubeSummaryResult = await response.json();
      setSummaryResult(data);
      toast.success('YouTube summary generated successfully!');
    } catch (err: any) {
      console.error('YouTube summarization error:', err);
      const errMsg = err?.message || 'Could not summarize video. Please check the URL and try again.';
      setSummaryError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryResult?.summary) return;
    navigator.clipboard.writeText(summaryResult.summary);
    setCopied(true);
    toast.success('Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseAsTopic = () => {
    if (!summaryResult) return;
    
    // Construct a rich topic prompt based on the summarized video
    const generatedTopic = `${summaryResult.title}: ${summaryResult.key_takeaways[0] || 'Key concepts and main takeaways summarized from video'}`;
    
    setFormData((prev) => ({
      ...prev,
      topic: generatedTopic.slice(0, 500),
    }));
    
    toast.success('Populated project topic from YouTube summary!');
    
    // Smooth scroll down to the topic textarea
    const topicElement = document.getElementById('topic-input');
    if (topicElement) {
      topicElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderFormattedSummary = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-base font-bold text-purple-300 mt-4 mb-2 flex items-center gap-2 border-b border-purple-500/20 pb-1">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletContent = trimmed.replace(/^[\-\*]\s*/, '');
        const parts = bulletContent.split(/(\*\*.*?\*\*)/g);
        return (
          <li key={idx} className="ml-4 list-disc text-gray-200 my-1 leading-relaxed">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="text-purple-200 font-semibold">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </li>
        );
      }

      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="text-gray-300 leading-relaxed my-1">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="text-purple-200 font-semibold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    
    try {
      toast.success('Project created! Initializing AI agents...');

      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('sparkstudio-user-email') : null;

      const response = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          user_email: userEmail || undefined
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create project');
      }
      
      const data = await response.json();
      router.push(`/dashboard/project/${data.project_id}`);
    } catch (error) {
      console.error('Project creation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-outfit">Create New Project</h1>
        <p className="text-muted-foreground mt-1">Tell the AI what you want to create or summarize a YouTube video.</p>
      </div>

      <div className="space-y-8">
        {/* YouTube Summarizer Section */}
        <div className="glass-card p-6 md:p-8 space-y-5 border-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <YoutubeIcon className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  YouTube Video Summarizer
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                    AI Powered
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paste any YouTube link to extract transcripts and generate a beginner-friendly summary.
                </p>
              </div>
            </div>
          </div>

          {/* Input & Action Button */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">Paste YouTube Video URL</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    if (summaryError) setSummaryError(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-3.5 pl-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all outline-none text-sm placeholder:text-muted-foreground/50 text-slate-900 dark:text-white"
                />
                <YoutubeIcon className="w-4 h-4 text-red-500/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isSummarizing || !youtubeUrl.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    Generate Summary
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {summaryError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-200">Unable to summarize video</p>
                  <p className="text-xs text-red-300/80 mt-0.5">{summaryError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Card State */}
          {isSummarizing && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-black/40 border border-purple-500/30 flex flex-col items-center justify-center space-y-3 text-center py-10 animate-pulse">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-purple-400 absolute inset-0 m-auto" />
              </div>
              <div>
                <p className="text-sm font-semibold">Fetching Transcript & Analyzing Video</p>
                <p className="text-xs text-muted-foreground mt-1">Generating concise, beginner-friendly key takeaways...</p>
              </div>
            </div>
          )}

          {/* Scrollable Summary Result Card */}
          {summaryResult && !isSummarizing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-black/50 border border-purple-500/30 space-y-4 shadow-2xl shadow-purple-950/40 backdrop-blur-md"
            >
              {/* Header with Video Info & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  {summaryResult.thumbnail_url && (
                    <img
                      src={summaryResult.thumbnail_url}
                      alt={summaryResult.title}
                      className="w-24 h-14 object-cover rounded-lg border border-slate-200 dark:border-white/10 shadow-md shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="text-base font-bold line-clamp-1">{summaryResult.title}</h3>
                    {summaryResult.author_name && (
                      <p className="text-xs text-purple-600 dark:text-purple-300/80">{summaryResult.author_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>

                  <button
                    type="button"
                    onClick={handleUseAsTopic}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/40 hover:bg-purple-200 dark:hover:bg-purple-500/30 text-xs font-semibold text-purple-700 dark:text-purple-200 transition-all shadow-sm"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
                    Use as Video Topic
                  </button>
                </div>
              </div>

              {/* Key Takeaway Badges */}
              {summaryResult.key_takeaways && summaryResult.key_takeaways.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {summaryResult.key_takeaways.slice(0, 3).map((takeaway, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/25 text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-medium"
                    >
                      <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="truncate max-w-[240px]">{takeaway}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Scrollable Summary Body */}
              <div className="max-h-[380px] overflow-y-auto pr-2 space-y-2 text-sm text-slate-700 dark:text-gray-200 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-black/20">
                {renderFormattedSummary(summaryResult.summary)}
              </div>
            </motion.div>
          )}
        </div>

        {/* Existing Create New Project Form */}
        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-8">
          {/* Topic Input */}
          <div className="space-y-3" id="topic-input">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>What is your video about?</span>
              {formData.topic && (
                <span className="text-xs text-purple-600 dark:text-purple-400 font-normal">Topic Ready</span>
              )}
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g. AI replacing programmers and what computer science students should do about it..."
              className="w-full min-h-[120px] p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all outline-none resize-none placeholder:text-muted-foreground/50 text-slate-900 dark:text-white"
              maxLength={500}
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">{formData.topic.length}/500</span>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Platform</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {platforms.map((platform) => {
                const isSelected = formData.platform === platform.name;
                return (
                  <button
                    type="button"
                    key={platform.name}
                    onClick={() => setFormData({ ...formData, platform: platform.name, video_length: platform.length })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-500/10' 
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <platform.icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-purple-400' : ''}`} />
                    <span className="text-sm font-medium text-center">{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Target Audience</label>
              <input
                type="text"
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-blue-500/50 outline-none transition-all text-slate-900 dark:text-white"
                placeholder="e.g. Students, Beginners..."
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Tone of Voice</label>
              <select
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-blue-500/50 outline-none transition-all appearance-none text-slate-900 dark:text-white"
              >
                <option value="Informative" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Informative</option>
                <option value="Funny" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Funny & Engaging</option>
                <option value="Professional" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Professional</option>
                <option value="Controversial" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Controversial / Clicky</option>
                <option value="Inspirational" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Inspirational</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={isGenerating || !formData.topic}
              className="group relative flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold hover:scale-105 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initializing Agents...
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                  <Wand2 className="w-5 h-5" />
                  Generate Production Package
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
