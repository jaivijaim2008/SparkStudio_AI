'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Plus, Video, TrendingUp, Clock, ArrowRight, Loader2, AlertCircle, Shield, Gem } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase';

interface Project {
  id: string;
  topic: string;
  platform: string;
  status: string;
  created_at: string;
}

export default function DashboardOverview() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const userEmail = typeof window !== 'undefined' ? localStorage.getItem('sparkstudio-user-email') : null;
        const queryParams = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const data = await apiFetch<Project[]>(`/api/projects${queryParams}`);
        if (!data) throw new Error('Backend is not running');
        const sorted = data.sort(
          (a: Project, b: Project) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setProjects(data);
        setBackendError(false);
      } catch (err: any) {
        console.error('Failed to load projects:', err);
        setBackendError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const [profile, setProfile] = useState<any>(null);
  const [projectCount, setProjectCount] = useState<number>(0);
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);

  useEffect(() => {
    const loadProfileAndCount = async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) return;

        // Fetch profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (prof) {
          setProfile(prof);
          
          // Fetch exact project count
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('input->>user_email', session.user.email);
            
          setProjectCount(count || 0);

          // Calculate trial expiry hours (24 hours trial)
          const regDate = new Date(prof.created_at);
          const now = new Date();
          const msLeft = (24 * 60 * 60 * 1000) - (now.getTime() - regDate.getTime());
          const hrsLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
          setHoursLeft(hrsLeft);
        }
      } catch (e) {
        console.error("Failed to load profile settings:", e);
      }
    };
    loadProfileAndCount();
  }, []);

  // Real computed stats
  const totalProjects = projects.length;
  const completedProjects = projects.filter(
    (p) => p.status === 'completed' || p.status === 'finished'
  ).length;
  // Each completed project generates ~9 agent outputs; count the script as 1 per completed project
  const generatedScripts = completedProjects;
  // Estimate: each project saves ~1.5 hours of manual work
  const timeSavedHours = Math.round(completedProjects * 1.5 * 10) / 10;

  const recentProjects = projects.slice(0, 5);

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed' || status === 'finished')
      return 'bg-green-400 animate-pulse';
    if (status === 'error') return 'bg-red-400';
    if (status === 'generating') return 'bg-blue-400 animate-pulse';
    return 'bg-yellow-400 animate-pulse';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'finished') return 'Completed';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-outfit">Welcome back, Creator 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your content today.</p>
        </div>
        <Link 
          href="/dashboard/new" 
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Create Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Projects</span>
            <div className="p-2 bg-purple-500/10 rounded-lg"><Video className="w-4 h-4 text-purple-400" /></div>
          </div>
          <span className="text-3xl font-bold font-outfit">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-purple-400" /> : totalProjects}
          </span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Generated Scripts</span>
            <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-400" /></div>
          </div>
          <span className="text-3xl font-bold font-outfit">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-blue-400" /> : generatedScripts}
          </span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Time Saved</span>
            <div className="p-2 bg-cyan-500/10 rounded-lg"><Clock className="w-4 h-4 text-cyan-400" /></div>
          </div>
          <span className="text-3xl font-bold font-outfit">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            ) : timeSavedHours > 0 ? (
              `~${timeSavedHours}h`
            ) : (
              '0h'
            )}
          </span>
        </motion.div>

        {/* Account Plan Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`glass-card p-6 flex flex-col gap-3 relative overflow-hidden border ${
            profile?.plan && profile.plan.toLowerCase() !== 'free'
              ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent'
              : 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent'
          }`}
        >
          {!profile ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {profile.plan?.toLowerCase() !== 'free' ? 'Subscription' : 'Free Trial'}
                </span>
                <div className={`p-2 rounded-lg ${
                  profile.plan?.toLowerCase() !== 'free' ? 'bg-purple-500/10' : 'bg-amber-500/10'
                }`}>
                  {profile.plan?.toLowerCase() !== 'free' ? (
                    <Gem className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Shield className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-2xl font-bold font-outfit block">
                  {profile.plan?.toLowerCase() !== 'free' 
                    ? `${profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)} Plan`
                    : `${Math.max(0, 5 - projectCount)} of 5 runs left`
                  }
                </span>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {profile.plan?.toLowerCase() !== 'free' 
                    ? 'Unlimited high-speed runs active'
                    : hoursLeft !== null 
                      ? hoursLeft <= 0 
                        ? 'Trial expired (24h limit)' 
                        : `Trial ends in ${hoursLeft}h`
                      : '24h trial active'
                  }
                </span>
              </div>

              {profile.plan?.toLowerCase() === 'free' && (
                <div className="pt-1 mt-auto">
                  <Link 
                    href="/#pricing" 
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Upgrade Plan <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Backend Error Banner */}
      {backendError && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Could not connect to the backend server.</p>
            <p className="text-xs text-red-400/70 mt-0.5">Make sure the backend is running on port 8000. Project history will be empty until then.</p>
          </div>
        </motion.div>
      )}

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-outfit">Recent Projects</h2>
          {projects.length > 0 && (
            <Link href="/dashboard/history" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="h-[240px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <Link href={`/dashboard/project/${project.id}`} className="group block">
                  <div className="glass-card p-1 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-purple-500/10 group-hover:border-purple-500/50">
                    <div className="h-32 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/50 dark:to-black relative overflow-hidden flex items-center justify-center p-4 text-center">
                      <span className="font-bold text-lg text-purple-900 dark:text-white/90 line-clamp-2">{project.topic}</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md">{project.platform}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(project.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                        <span className="text-sm text-muted-foreground">{getStatusLabel(project.status)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* New Project Card — always shown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: recentProjects.length * 0.08 }}
            >
              <Link href="/dashboard/new" className="glass-card p-6 border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-center h-full min-h-[240px] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">New Project</h3>
                <p className="text-sm text-muted-foreground mt-1">Start your next video here</p>
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
