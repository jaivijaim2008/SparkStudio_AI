'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wand2, Video, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api';

export default function NewProject() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  
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
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-outfit">Create New Project</h1>
        <p className="text-muted-foreground mt-1">Tell the AI what you want to create.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-8">
        {/* Topic Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium">What is your video about?</label>
          <textarea
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="e.g. AI replacing programmers and what computer science students should do about it..."
            className="w-full min-h-[120px] p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all outline-none resize-none placeholder:text-muted-foreground/50"
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
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="e.g. Students, Beginners..."
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Tone of Voice</label>
            <select
              value={formData.tone}
              onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-blue-500/50 outline-none transition-all appearance-none"
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
  );
}
