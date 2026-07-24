'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, Loader2, Play, Image as ImageIcon, FileText, Search, Type, Mic, ShieldCheck, DownloadCloud, AlertCircle, Clock, Zap } from 'lucide-react';
import { useParams } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import { StoryboardImage } from '@/components/storyboard-image';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ProjectResultPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [status, setStatus] = useState('generating');
  const [activeTab, setActiveTab] = useState('pipeline');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [userPlan, setUserPlan] = useState('free');
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [agents, setAgents] = useState([
    { name: 'Research', key: 'research', status: 'pending', icon: Search },
    { name: 'Script', key: 'script', status: 'pending', icon: FileText },
    { name: 'Storyboard', key: 'storyboard', status: 'pending', icon: Play },
    { name: 'Thumbnail', key: 'thumbnail', status: 'pending', icon: ImageIcon },
    { name: 'SEO', key: 'seo', status: 'pending', icon: Search },
    { name: 'Subtitles', key: 'subtitle', status: 'pending', icon: Type },
    { name: 'Voice', key: 'voice', status: 'pending', icon: Mic },
    { name: 'Quality', key: 'quality', status: 'pending', icon: ShieldCheck },
    { name: 'Publisher', key: 'publisher', status: 'pending', icon: DownloadCloud },
  ]);

  const [projectData, setProjectData] = useState<any>({});
  const [imageStatuses, setImageStatuses] = useState<string[]>([]);

  // Initialize image load status array when storyboard scenes load
  useEffect(() => {
    if (projectData?.storyboard?.scenes) {
      const len = projectData.storyboard.scenes.length;
      setImageStatuses(prev => {
        if (prev.length === len) return prev;
        return new Array(len).fill('pending');
      });
    }
  }, [projectData]);

  const scheduledIndexRef = useRef<number | null>(null);

  // Queue coordinator: stagger image requests by 200ms to prevent Pollinations rate limiting
  useEffect(() => {
    if (imageStatuses.length === 0) return;
    
    const nextIdx = imageStatuses.findIndex(s => s === 'pending');
    if (nextIdx !== -1 && scheduledIndexRef.current !== nextIdx) {
      scheduledIndexRef.current = nextIdx;
      const timer = setTimeout(() => {
        setImageStatuses(prev => {
          const next = [...prev];
          next[nextIdx] = 'loading';
          return next;
        });
        scheduledIndexRef.current = null;
      }, 200); // 200ms spacing between triggers
      
      return () => {
        clearTimeout(timer);
        scheduledIndexRef.current = null;
      };
    }
  }, [imageStatuses]);

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  useEffect(() => {
    const eventSource = new EventSource(apiUrl(`/api/projects/${projectId}/generate`));
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.agent && data.agent !== 'pipeline') {
          setAgents(prev => prev.map(a => 
            a.key === data.agent 
              ? { ...a, status: data.status === 'error' ? 'completed' : data.status }
              : a
          ));
        }

        if ((data.status === 'completed' || data.status === 'error') && data.data) {
          setProjectData((prev: any) => ({
            ...prev,
            [data.agent]: data.data
          }));
        }

        if (data.agent === 'pipeline' && (data.status === 'finished' || data.status === 'started')) {
          if (data.status === 'finished') {
            setStatus('completed');
            setActiveTab('script');
            if (timerRef.current) clearInterval(timerRef.current);
            eventSource.close();
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse SSE event:', parseError);
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      // If we already have some data, consider it completed
      setStatus('completed');
      setActiveTab('script');
    };

    return () => eventSource.close();
  }, [projectId]);

  useEffect(() => {
    const fetchPlan = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        let prof: any = null;
        const { data: profById } = await supabase.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
        if (profById) prof = profById;
        else {
          const { data: profByEmail } = await supabase.from('profiles').select('plan').eq('email', session.user.email).maybeSingle();
          if (profByEmail) prof = profByEmail;
        }
        if (prof?.plan) setUserPlan(prof.plan);
      }
    };
    fetchPlan();
  }, []);

  const tabs = [
    { id: 'pipeline', label: 'Pipeline Status' },
    { id: 'script', label: 'Script' },
    { id: 'storyboard', label: 'Storyboard' },
    { id: 'seo', label: 'SEO Metadata' },
    { id: 'voice', label: 'Voice-Over' },
    { id: 'quality', label: 'Quality Audit' },
  ];

  // Helper to safely get nested data
  const getScript = () => projectData?.script?.full_script || '';
  const getScriptSections = () => projectData?.script?.sections || [];
  const getScenes = () => projectData?.storyboard?.scenes || [];
  const getSeoTitle = () => projectData?.seo?.title || 'Generating...';
  const getSeoDescription = () => projectData?.seo?.description || '';
  const getSeoTags = () => projectData?.seo?.tags || [];
  const getSeoHashtags = () => projectData?.seo?.hashtags || [];
  const getVoice = () => projectData?.voice || {};
  const getQuality = () => projectData?.quality || {};
  const getResearch = () => projectData?.research || {};

  const handleDownload = () => {
    if (userPlan === 'free') {
      toast.error('ZIP export is a Pro/Team plan feature. Upgrade to download all assets.');
      return;
    }
    const link = document.createElement('a');
    link.href = apiUrl(`/api/project/${projectId}/export`);
    link.download = `sparkstudio_${projectId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkdownExport = () => {
    if (userPlan === 'free') {
      toast.error('Markdown export is a Team plan feature.');
      return;
    }
    const mdContent = `# ${getSeoTitle()}\n\n## Description\n${getSeoDescription()}\n\n## Tags\n${getSeoTags().join(', ')}\n\n## Script\n${getScript()}`;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sparkstudio_${projectId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-outfit font-bold flex items-center gap-3">
            Project <span className="text-purple-400 font-mono text-xl bg-purple-500/10 px-3 py-1 rounded-lg">#{projectId.slice(0,6)}</span>
            {status === 'completed' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 text-sm font-medium bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" /> Ready
              </motion.div>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              {status === 'generating' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  Generating your content... ({elapsedSeconds}s)
                </>
              ) : 'Generation complete.'}
            </p>
            
            {/* Simulated Priority Queue Badge */}
            {status === 'generating' && (userPlan === 'pro' || userPlan === 'team') && (
              <div className="flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-500 px-2 py-1 rounded border border-amber-500/30">
                <Zap className="w-3 h-3" /> Priority Queue Active
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {status === 'completed' && (
            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={handleDownload} className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/25 border border-purple-500/50 ${userPlan === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Download className="w-5 h-5" /> Download ZIP {userPlan === 'free' ? '🔒 (Pro/Team)' : ''}
              </button>
              <button onClick={handleMarkdownExport} className={`flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/10 ${userPlan === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <FileText className="w-5 h-5" /> Export Markdown {userPlan === 'free' ? '🔒 (Team)' : ''}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium text-sm transition-all relative whitespace-nowrap ${
              activeTab === tab.id 
                ? 'text-foreground font-semibold' 
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {/* Pipeline Tab */}
          {activeTab === 'pipeline' && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-8"
            >
              <h2 className="text-xl font-bold font-outfit mb-4">Agent Orchestration Pipeline</h2>

              {/* Progress Bar */}
              {(() => {
                const completed = agents.filter(a => a.status === 'completed').length;
                const total = agents.length;
                const pct = Math.round((completed / total) * 100);
                return (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-white/70">
                        {status === 'completed'
                          ? `✅ Pipeline Complete in ${formatTime(elapsedSeconds)}`
                          : `⚡ Generating... ${completed} of ${total} agents done`}
                      </span>
                      <div className="flex items-center gap-3">
                        {status === 'generating' && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/40">
                            <Clock className="w-3 h-3" />
                            {formatTime(elapsedSeconds)}
                          </span>
                        )}
                        <span className="text-sm font-bold text-purple-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    {status === 'generating' && completed === 0 && elapsedSeconds > 5 && (
                      <p className="text-xs text-yellow-400/80 mt-2 animate-pulse">
                        ⏳ Waiting for AI model to respond... (first request may take a few seconds)
                      </p>
                    )}
                    {status === 'generating' && completed > 0 && completed < total && (
                      <p className="text-xs text-blue-400 mt-2 animate-pulse">
                        ⚡ Agents running sequentially for rate-limit compliance...
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-4 max-w-2xl">
                {agents.map((agent, i) => (
                  <motion.div 
                    key={agent.key} 
                    className={`flex items-center gap-4 relative p-3 rounded-2xl transition-all duration-300 ${
                      agent.status === 'running' ? 'bg-blue-500/5 border border-blue-500/10 shadow-[0_4px_20px_rgba(59,130,246,0.03)]' :
                      agent.status === 'completed' ? 'bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-transparent' : 'opacity-50 border border-transparent'
                    }`}
                    animate={{
                      scale: agent.status === 'running' ? 1.02 : 1,
                      x: agent.status === 'running' ? 4 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {/* Animated Connection Line */}
                    {i !== agents.length - 1 && (
                      <div className="absolute top-12 left-8 w-[2px] h-[calc(100%-12px)] bg-slate-200 dark:bg-white/5 -translate-x-[1px] overflow-hidden">
                        <motion.div
                          className="w-full h-full bg-gradient-to-b from-purple-500 via-blue-500 to-transparent"
                          initial={{ height: "0%" }}
                          animate={{ height: agent.status === 'completed' ? '100%' : '0%' }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                      </div>
                    )}
                    
                    {/* Pulsing Node */}
                    <div className="relative">
                      {agent.status === 'running' && (
                        <motion.div
                          layoutId="activeGlow"
                          className="absolute -inset-1.5 rounded-full bg-blue-500/20 blur-sm"
                          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.8, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        />
                      )}
                      
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 ${
                        agent.status === 'completed' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' :
                        agent.status === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' :
                        agent.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                        'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-500 border border-slate-300 dark:border-white/10'
                      }`}>
                        {agent.status === 'completed' ? (
                          <motion.div 
                            initial={{ scale: 0.4, rotate: -30 }} 
                            animate={{ scale: 1, rotate: 0 }} 
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </motion.div>
                        ) : agent.status === 'running' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : agent.status === 'error' ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          <agent.icon className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                    
                    {/* Info Column */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium transition-colors ${
                          agent.status === 'running' ? 'text-blue-400 font-semibold' :
                          agent.status === 'completed' ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-gray-500'
                        }`}>
                          {agent.name} Agent
                        </span>
                        {agent.status === 'running' && (
                          <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />
                            Working...
                          </span>
                        )}
                        {agent.status === 'completed' && (
                          <span className="text-xs text-purple-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-purple-400" /> Done
                          </span>
                        )}
                        {agent.status === 'error' && (
                          <span className="text-xs text-red-400 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Script Tab */}
          {activeTab === 'script' && (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="glass-card p-8">
                <h3 className="text-xl font-bold font-outfit mb-6">Generated Script</h3>
                {getScript() ? (
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed text-lg">
                      {getScript()}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Script data is being generated...</p>
                )}
              </div>

              {getScriptSections().length > 0 && (
                <div className="glass-card p-8">
                  <h3 className="text-lg font-bold font-outfit mb-4">Script Sections</h3>
                  <div className="space-y-4">
                    {getScriptSections().map((section: any, idx: number) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-purple-500 dark:text-purple-400">{section.label || `Section ${idx + 1}`}</span>
                          <span className="text-xs text-muted-foreground">{section.time_range || ''}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-white/80">{section.content || ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research insights */}
              {getResearch().trends && getResearch().trends.length > 0 && (
                <div className="glass-card p-8">
                  <h3 className="text-lg font-bold font-outfit mb-4">Research Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getResearch().hooks && getResearch().hooks.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                        <h4 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mb-2">🎣 Hooks</h4>
                        <ul className="space-y-1">
                          {getResearch().hooks.map((h: string, i: number) => (
                            <li key={i} className="text-sm text-slate-600 dark:text-white/70">• {h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {getResearch().viral_angles && getResearch().viral_angles.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                        <h4 className="text-sm font-bold text-pink-600 dark:text-pink-400 mb-2">🔥 Viral Angles</h4>
                        <ul className="space-y-1">
                          {getResearch().viral_angles.map((a: string, i: number) => (
                            <li key={i} className="text-sm text-slate-600 dark:text-white/70">• {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Storyboard Tab */}
          {activeTab === 'storyboard' && (
            <motion.div
              key="storyboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {getScenes().length > 0 ? (
                getScenes().map((scene: any, idx: number) => (
                  <div key={idx} className="glass-card p-6 flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 aspect-video relative">
                      <StoryboardImage
                        prompt={scene.image_prompt || scene.visual_description}
                        sceneNumber={scene.scene_number || idx + 1}
                        alt={`Scene ${scene.scene_number || idx + 1}`}
                        shouldLoad={imageStatuses[idx] === 'loading' || imageStatuses[idx] === 'completed' || imageStatuses[idx] === 'failed'}
                        onLoadComplete={() => {
                          setImageStatuses(prev => {
                            const next = [...prev];
                            next[idx] = 'completed';
                            return next;
                          });
                        }}
                        onLoadError={() => {
                          setImageStatuses(prev => {
                            const next = [...prev];
                            next[idx] = 'failed';
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-bold">Visual Description</h4>
                      <p className="text-muted-foreground text-sm">{scene.visual_description || 'No description available'}</p>
                      <div className="flex gap-4 mt-4 text-xs font-medium flex-wrap">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-md">⏳ {scene.duration || 'N/A'}</span>
                        <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md text-purple-600 dark:text-purple-300">🎥 {scene.camera_angle || 'Auto'}</span>
                        {scene.emotion && <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md text-pink-600 dark:text-pink-300">💡 {scene.emotion}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted-foreground">Storyboard data is being generated...</p>
                </div>
              )}
            </motion.div>
          )}
          
          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <motion.div
              key="seo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 space-y-6"
            >
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Optimized Title</h4>
                <p className="text-xl font-bold">{getSeoTitle()}</p>
              </div>
              <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-slate-700 dark:text-white/90">{getSeoDescription() || 'Generating...'}</p>
              </div>
              {getSeoTags().length > 0 && (
                <>
                  <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {getSeoTags().map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full text-xs border border-purple-500/20">{tag}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {getSeoHashtags().length > 0 && (
                <>
                  <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Hashtags</h4>
                    <div className="flex flex-wrap gap-2">
                      {getSeoHashtags().map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full text-xs border border-blue-500/20">{tag}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Voice-Over Tab */}
          {activeTab === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 space-y-6"
            >
              <h3 className="text-xl font-bold font-outfit mb-4">Voice-Over Directions</h3>
              {getVoice().narration_script ? (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Narration Script</h4>
                    <p className="whitespace-pre-wrap text-slate-700 dark:text-white/90 leading-relaxed">{getVoice().narration_script}</p>
                  </div>
                  <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                      <h4 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mb-1">Speaking Speed</h4>
                      <p className="text-slate-600 dark:text-white/80 text-sm capitalize">{getVoice().speaking_speed || 'Medium'}</p>
                    </div>
                    {getVoice().pauses && getVoice().pauses.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                        <h4 className="text-sm font-bold text-pink-600 dark:text-pink-400 mb-1">Pauses</h4>
                        <ul className="space-y-1">
                          {getVoice().pauses.map((p: string, i: number) => (
                            <li key={i} className="text-sm text-slate-600 dark:text-white/70">• {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Voice-over data is being generated...</p>
              )}
            </motion.div>
          )}

          {/* Quality Audit Tab */}
          {activeTab === 'quality' && (
            <motion.div
              key="quality"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 space-y-6"
            >
              <h3 className="text-xl font-bold font-outfit mb-4">Quality Audit</h3>
              {getQuality().overall_score !== undefined ? (
                <>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500 flex items-center justify-center">
                      <span className="text-3xl font-bold">{getQuality().overall_score || 0}</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold">Overall Quality Score</p>
                      <p className="text-muted-foreground text-sm">Based on {(getQuality().metrics || []).length} metrics</p>
                    </div>
                  </div>
                  {(getQuality().metrics || []).length > 0 && (
                    <>
                      <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
                      <div className="space-y-3">
                        {getQuality().metrics.map((metric: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{metric.name || `Metric ${i+1}`}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-2 rounded-full bg-slate-200 dark:bg-black/50 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{width: `${metric.score || 0}%`}} />
                              </div>
                              <span className="text-sm font-bold w-8 text-right">{metric.score || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {(getQuality().suggestions || []).length > 0 && (
                    <>
                      <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
                      <div>
                        <h4 className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mb-2">💡 Suggestions</h4>
                        <ul className="space-y-1">
                          {getQuality().suggestions.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-slate-600 dark:text-white/70">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Quality audit data is being generated...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
