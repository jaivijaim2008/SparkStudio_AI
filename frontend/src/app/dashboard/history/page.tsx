'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Film, ArrowRight, Trash2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiUrl } from '@/lib/api';

export default function HistoryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('sparkstudio-user-email') : null;
      const queryParams = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
      const data = await apiFetch<any[]>(`/api/projects${queryParams}`);
      if (!data) throw new Error('Backend is not running');
      setBackendError(false);
      // Sort by newest
      const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProjects(sorted);
    } catch (err) {
      console.error(err);
      setBackendError(true);
      toast.error('Backend is not running. Start the backend to see projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(apiUrl(`/api/project/${id}`), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
      toast.success('Project deleted');
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Production History</h1>
          <p className="text-muted-foreground text-sm">Access and manage all your generated content packages</p>
        </div>
        <button 
          onClick={fetchProjects}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {backendError && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Could not connect to the backend server.</p>
            <p className="text-xs text-red-400/70 mt-0.5">Make sure the backend is running on port 8000 (python -m backend.main).</p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto text-purple-400">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">No projects found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm">You haven't generated any creator packages yet. Start your first production now!</p>
          </div>
          <Link 
            href="/dashboard/new" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all font-semibold shadow-lg shadow-purple-500/20"
          >
            Create New Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link 
                href={`/dashboard/project/${project.id}`}
                className="block glass-card p-6 hover:border-purple-500/30 transition-all duration-300 group relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-purple-400 transition-colors">
                  {project.topic}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {project.platform}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/5">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold capitalize ${
                    project.status === 'completed' || project.status === 'finished'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : project.status === 'error'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {project.status === 'finished' ? 'completed' : project.status}
                  </span>
                  <span className="text-xs text-purple-400 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    View Package <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
