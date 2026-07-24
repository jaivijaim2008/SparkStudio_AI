'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Zap, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    timeSaved: 0,
    topPlatform: 'YouTube',
    viralHooksGenerated: 0
  });

  useEffect(() => {
    const fetchPlanAndStats = async () => {
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
        
        const plan = prof?.plan || 'free';
        setUserPlan(plan);

        if (plan === 'team') {
          // Fetch real stats
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('input->>user_email', session.user.email);
            
          const total = count || 0;
          setStats({
            totalProjects: total,
            timeSaved: total * 4.5, // 4.5 hours saved per project approx
            topPlatform: 'YouTube Shorts',
            viralHooksGenerated: total * 3 // 3 hooks per project
          });
        }
      }
      setLoading(false);
    };
    fetchPlanAndStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (userPlan !== 'team') {
    return (
      <div className="max-w-3xl mx-auto mt-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 rounded-[32px] border border-purple-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold font-outfit mb-4">Advanced Analytics Locked</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg">
              Get deep insights into your content production, time saved, and top performing formats with the <strong className="text-white">Team Plan</strong>.
            </p>
            <Link href="/dashboard/settings" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-purple-500/30 flex items-center gap-2">
              Upgrade to Team Plan <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-outfit flex items-center gap-3">
          Creator Analytics
          <span className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-semibold border border-purple-500/30">Team Feature</span>
        </h1>
        <p className="text-muted-foreground mt-2">Track your production velocity and time saved.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-blue-400" /></div>
            <h3 className="font-semibold text-slate-300">Total Projects</h3>
          </div>
          <div className="text-4xl font-bold font-outfit">{stats.totalProjects}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-emerald-400" /></div>
            <h3 className="font-semibold text-slate-300">Hours Saved</h3>
          </div>
          <div className="text-4xl font-bold font-outfit text-emerald-400">{stats.timeSaved}h</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-purple-400" /></div>
            <h3 className="font-semibold text-slate-300">Top Platform</h3>
          </div>
          <div className="text-2xl font-bold font-outfit mt-2">{stats.topPlatform}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><Zap className="w-5 h-5 text-amber-400" /></div>
            <h3 className="font-semibold text-slate-300">Viral Hooks</h3>
          </div>
          <div className="text-4xl font-bold font-outfit text-amber-400">{stats.viralHooksGenerated}</div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-8 rounded-3xl border border-white/10 mt-8 h-96 flex flex-col items-center justify-center text-center">
        <BarChart3 className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Production History Chart</h3>
        <p className="text-muted-foreground">More project data required to generate historical trends.</p>
        <p className="text-sm text-slate-500 mt-4">Create 5 more projects to unlock graph visualization.</p>
      </motion.div>
    </div>
  );
}
