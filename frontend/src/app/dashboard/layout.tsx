'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, History, Settings, Sparkles, Menu, X, LogOut, User as UserIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        localStorage.setItem('sparkstudio-user-email', session.user.email);
        setUser(session.user);
      } else {
        localStorage.removeItem('sparkstudio-user-email');
        setUser(null);
      }
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Auto-close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'New Project', href: '/dashboard/new', icon: Plus },
    { name: 'History', href: '/dashboard/history', icon: History },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const getCurrentPageTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname === '/dashboard/new') return 'New Project';
    if (pathname === '/dashboard/history') return 'History';
    if (pathname === '/dashboard/settings') return 'Settings';
    if (pathname.startsWith('/dashboard/project/')) return 'Project Details';
    return 'Dashboard';
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative transition-colors duration-200 dashboard-wrapper">
      {/* Top Header with Hamburger Menu */}
      <header className="shrink-0 h-16 w-full backdrop-blur-xl border-b px-4 md:px-6 flex items-center justify-between z-30 transition-colors duration-200">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Navigation Menu"
            className="p-2 rounded-xl text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link 
            href="/" 
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-md shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-outfit font-bold text-xl tracking-tight text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-gray-400 dark:bg-clip-text dark:text-transparent">
              SparkStudio
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-muted-foreground border-l border-slate-300 dark:border-white/10 pl-4 ml-1">
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/30" />
            <span className="font-medium text-slate-800 dark:text-white/90">{getCurrentPageTitle()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pathname !== '/dashboard/new' && (
            <Link
              href="/dashboard/new"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium text-xs md:text-sm transition-all shadow-md shadow-purple-500/20 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </Link>
          )}

          {user && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              title="Open Navigation & Profile"
              className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-white/10 hover:opacity-80 transition-opacity"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border border-purple-500/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </div>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Slide-out Sidebar Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Semi-transparent Overlay Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:w-80 bg-white/95 dark:bg-black/90 backdrop-blur-2xl border-r border-slate-300 dark:border-white/10 shadow-2xl flex flex-col transition-colors duration-200"
            >
              {/* Drawer Header */}
              <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
                <Link 
                  href="/" 
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-outfit font-bold text-xl text-slate-900 dark:text-white">SparkStudio AI</span>
                </Link>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close Navigation Menu"
                  className="p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 relative font-medium ${
                        isActive 
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg shadow-purple-500/30' 
                          : 'text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/10'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? '!text-white' : 'text-slate-500 dark:text-gray-400'}`} />
                      <span className={isActive ? '!text-white font-bold' : ''}>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User Profile Section at Bottom of Drawer */}
              {user && (
                <div className="p-4 m-4 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {user.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="avatar" 
                        className="w-9 h-9 rounded-full border border-purple-500/50 shrink-0" 
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center shrink-0">
                        <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden text-left">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white/95 truncate">
                        {user.user_metadata?.full_name || 'Creator'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-muted-foreground truncate">
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
                        setIsDrawerOpen(false);
                      } catch (e) {
                        toast.error('Failed to sign out');
                      }
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Full-Screen Content Area */}
      <main className="flex-1 w-full overflow-y-auto relative p-4 md:p-8 transition-colors duration-200 dashboard-main">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] pointer-events-none" />
        <div className="w-full max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
