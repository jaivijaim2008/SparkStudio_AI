'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, History, Settings, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
            <span className="font-outfit font-bold text-xl">CreatorPilot</span>
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

        <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pro Plan</span>
            <span className="text-xs text-purple-400">92 credits</span>
          </div>
          <div className="h-2 rounded-full bg-black/50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-[70%]" />
          </div>
        </div>
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
