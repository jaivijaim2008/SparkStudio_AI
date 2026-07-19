'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, CheckCircle2, Circle, Loader2, Play, Image as ImageIcon, FileText, Search, Type, Mic, ShieldCheck, DownloadCloud } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ProjectResultPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [status, setStatus] = useState('generating'); // generating, completed
  const [activeTab, setActiveTab] = useState('pipeline');
  
  const [agents, setAgents] = useState([
    { name: 'Research', key: 'research', status: 'pending', icon: Search },
    { name: 'Script', key: 'script', status: 'pending', icon: FileText },
    { name: 'Storyboard', key: 'storyboard', status: 'pending', icon: Play },
    { name: 'Thumbnail', key: 'thumbnail', status: 'pending', icon: ImageIcon },
    { name: 'SEO', key: 'seo', status: 'pending', icon: Search },
    { name: 'Subtitles', key: 'subtitles', status: 'pending', icon: Type },
    { name: 'Voice', key: 'voice', status: 'pending', icon: Mic },
    { name: 'Quality', key: 'quality', status: 'pending', icon: ShieldCheck },
    { name: 'Publisher', key: 'publisher', status: 'pending', icon: DownloadCloud },
  ]);

  const [projectData, setProjectData] = useState<any>(null);

  // Simulate SSE pipeline for demo
  useEffect(() => {
    let currentAgentIndex = 0;
    
    const interval = setInterval(() => {
      setAgents(prev => prev.map((agent, index) => {
        if (index < currentAgentIndex) return { ...agent, status: 'completed' };
        if (index === currentAgentIndex) return { ...agent, status: 'running' };
        return { ...agent, status: 'pending' };
      }));
      
      currentAgentIndex++;
      
      if (currentAgentIndex > agents.length) {
        clearInterval(interval);
        setStatus('completed');
        setActiveTab('script'); // Switch to results once done
        
        // Load demo data
        fetch('/api/project/' + projectId)
          .then(res => res.json())
          .catch(() => {
             // Fallback to static mock if API isn't running
             setProjectData({
               script: { full_script: "So you're a CS major? Bad news, AI just stole your job...\n\nJust kidding. But seriously, everyone is panicking about Devin and GPT-4 writing code." },
               storyboard: { scenes: [{ scene_number: 1, duration: "5s", visual_description: "Stressed college student looking at glowing laptop screen"}] },
               seo: { title: "Will AI Replace Programmers? (The Truth)", description: "Are you a CS major worried about AI taking your job?" }
             });
          });
      }
    }, 1500); // Fast simulation for demo
    
    return () => clearInterval(interval);
  }, [projectId]);

  const tabs = [
    { id: 'pipeline', label: 'Pipeline Status' },
    { id: 'script', label: 'Script', disabled: status !== 'completed' },
    { id: 'storyboard', label: 'Storyboard', disabled: status !== 'completed' },
    { id: 'seo', label: 'SEO Metadata', disabled: status !== 'completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold font-outfit">Project: AI replacing programmers</h1>
            {status === 'generating' ? (
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium flex items-center gap-2 border border-blue-500/20">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium flex items-center gap-2 border border-green-500/20">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">YouTube Shorts • 60s • Funny Tone</p>
        </div>

        {status === 'completed' && (
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" />
            Download Package (.zip)
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium text-sm transition-all relative ${
              activeTab === tab.id ? 'text-white' : 'text-muted-foreground hover:text-white/80'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          {activeTab === 'pipeline' && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-8"
            >
              <h2 className="text-xl font-bold font-outfit mb-8">Agent Orchestration Pipeline</h2>
              <div className="space-y-6 max-w-2xl">
                {agents.map((agent, i) => (
                  <div key={agent.key} className="flex items-center gap-4 relative">
                    {/* Connection Line */}
                    {i !== agents.length - 1 && (
                      <div className={`absolute top-8 left-5 w-0.5 h-full -ml-[1px] ${
                        agent.status === 'completed' ? 'bg-purple-500/50' : 'bg-white/10'
                      }`} />
                    )}
                    
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 ${
                      agent.status === 'completed' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' :
                      agent.status === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
                      'bg-white/5 text-muted-foreground border border-white/10'
                    }`}>
                      {agent.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                       agent.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                       <agent.icon className="w-5 h-5" />}
                    </div>
                    
                    {/* Agent Name */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${agent.status === 'pending' ? 'text-muted-foreground' : 'text-white'}`}>
                          {agent.name} Agent
                        </span>
                        {agent.status === 'running' && (
                          <span className="text-xs text-blue-400 animate-pulse">Working...</span>
                        )}
                        {agent.status === 'completed' && (
                          <span className="text-xs text-purple-400">Done</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'script' && projectData?.script && (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8"
            >
              <h3 className="text-xl font-bold font-outfit mb-6">Generated Script</h3>
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-lg">
                  {projectData.script.full_script}
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'storyboard' && projectData?.storyboard && (
            <motion.div
              key="storyboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-6"
            >
              {projectData.storyboard.scenes.map((scene: any, idx: number) => (
                <div key={idx} className="glass-card p-6 flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-48 aspect-video bg-black/40 rounded-lg border border-white/5 flex items-center justify-center relative overflow-hidden group">
                     <ImageIcon className="w-8 h-8 text-white/20 group-hover:scale-110 transition-transform" />
                     <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs font-medium">Scene {scene.scene_number}</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-bold">Visual Description</h4>
                    <p className="text-muted-foreground text-sm">{scene.visual_description}</p>
                    <div className="flex gap-4 mt-4 text-xs font-medium">
                      <span className="px-2 py-1 bg-white/5 rounded-md">⏳ {scene.duration}</span>
                      <span className="px-2 py-1 bg-white/5 rounded-md text-purple-300">🎥 {scene.camera_angle || 'Auto'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
          
          {activeTab === 'seo' && projectData?.seo && (
            <motion.div
              key="seo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 space-y-6"
            >
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Optimized Title</h4>
                <p className="text-xl font-bold">{projectData.seo.title}</p>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-white/90">{projectData.seo.description}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
