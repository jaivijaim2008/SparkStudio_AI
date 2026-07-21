'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, History, Settings, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        localStorage.setItem('sparkstudio-user-email', session.user.email);
        setUser(session.user);
      } else {
        localStorage.removeItem('sparkstudio-user-email');
        setUser(null);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        localStorage.setItem('sparkstudio-user-email', session.user.email);
        setUser(session.user);
      } else {
        localStorage.removeItem('sparkstudio-user-email');
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'New Project', href: '/dashboard/new', icon: Plus },
    { name: 'History', href: '/dashboard/history', icon: History },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-md flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-outfit font-bold text-xl">SparkStudio</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${
                  isActive 
                    ? 'text-white font-medium' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/10 rounded-xl border border-white/10"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile Section */}
        {user && (
          <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="avatar" 
                  className="w-8 h-8 rounded-full border border-purple-500/50" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-purple-300" />
                </div>
              )}
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-semibold text-white/95 truncate">
                  {user.user_metadata?.full_name || 'Creator'}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <button 
              onClick={async () => {
                const supabase = createClient();
                if (!supabase) return;
                try {
                  await supabase.auth.signOut();
                  localStorage.removeItem('sparkstudio-user-email');
                  toast.success('Signed out successfully');
                } catch (e) {
                  toast.error('Failed to sign out');
                }
              }}
              className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none" />
        <div className="p-8 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
