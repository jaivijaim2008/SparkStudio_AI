'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Plus, Video, TrendingUp, Clock } from 'lucide-react';

export default function DashboardOverview() {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Projects</span>
            <div className="p-2 bg-purple-500/10 rounded-lg"><Video className="w-4 h-4 text-purple-400" /></div>
          </div>
          <span className="text-3xl font-bold font-outfit">12</span>
        </div>
        
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Generated Scripts</span>
            <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-400" /></div>
          </div>
          <span className="text-3xl font-bold font-outfit">34</span>
        </div>
        
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Time Saved</span>
            <div className="p-2 bg-cyan-500/10 rounded-lg"><Clock className="w-4 h-4 text-cyan-400" /></div>
          </div>
          <span className="text-3xl font-bold font-outfit">~18h</span>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <h2 className="text-xl font-bold font-outfit mb-6">Recent Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Demo Project Card */}
          <Link href="/dashboard/project/demo-1234-5678" className="group">
            <div className="glass-card p-1 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-purple-500/10 group-hover:border-purple-500/50">
              <div className="h-32 rounded-xl bg-gradient-to-br from-purple-900/50 to-black relative overflow-hidden flex items-center justify-center p-4 text-center">
                <span className="font-bold text-lg text-white/90">AI replacing programmers</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium px-2 py-1 bg-white/5 rounded-md">YouTube Shorts</span>
                  <span className="text-xs text-muted-foreground">2 hours ago</span>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Empty State Card */}
          <Link href="/dashboard/new" className="glass-card p-6 border-dashed flex flex-col items-center justify-center text-center h-full min-h-[240px] hover:bg-white/5 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">New Project</h3>
            <p className="text-sm text-muted-foreground mt-1">Start your next video here</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
