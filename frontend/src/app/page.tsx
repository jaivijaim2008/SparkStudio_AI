'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Bot, Video, Mic, Play, Sparkles, LayoutTemplate, PenTool, Zap, Shield, Globe, Check, LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';

export default function LandingPage() {
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('sparkstudio-user-email');
      toast.success('Signed out successfully');
    } catch (err) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-30 animate-blob" style={{ animationDelay: '4s' }}></div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-outfit font-bold text-xl tracking-tight">SparkStudio AI</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline">Features</a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline">Pricing</a>
          
          {sessionUser ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                <Bot className="w-4 h-4 text-purple-400" />
                Dashboard
              </Link>
              <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                {sessionUser.user_metadata?.avatar_url ? (
                  <img 
                    src={sessionUser.user_metadata.avatar_url} 
                    alt="avatar" 
                    className="w-7 h-7 rounded-full border border-purple-500/50" 
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-purple-300" />
                  </div>
                )}
                <span className="text-xs text-white/70 max-w-[120px] truncate hidden sm:inline">{sessionUser.email}</span>
                <button 
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
              <Link href="/dashboard/new" className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 pb-20 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
          <span className="text-xs font-medium text-purple-300">v1.0 Now Live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-outfit font-bold tracking-tight mb-6 leading-tight"
        >
          One Prompt. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
            Complete Content Production.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
        >
          Stop jumping between 10 different tools. SparkStudio AI uses 9 specialized agents to research, write, storyboard, and optimize your videos automatically.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/dashboard/new" className="flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-medium hover:scale-105 transition-transform shadow-lg shadow-primary/25">
            Start Creating Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#features" className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm font-medium">
            <Video className="w-4 h-4" />
            See How It Works
          </a>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-outfit font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">9 AI Agents</span>, One Pipeline
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Each agent specializes in a different aspect of content production, working together to deliver a complete package in seconds.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Bot, color: 'purple', title: '🔬 Research Agent', desc: 'Analyzes trends, audience psychology, viral angles, and hooks for your topic.' },
            { icon: PenTool, color: 'blue', title: '✍️ Script Agent', desc: 'Writes a perfectly timed, section-by-section video script with hooks and CTAs.' },
            { icon: LayoutTemplate, color: 'cyan', title: '🎬 Storyboard Agent', desc: 'Generates visual scenes with camera angles, animations, and AI image prompts.' },
            { icon: Sparkles, color: 'pink', title: '🖼️ Thumbnail Agent', desc: 'Designs click-worthy thumbnail concepts with layout and image generation prompts.' },
            { icon: Globe, color: 'green', title: '📈 SEO Agent', desc: 'Optimizes title, description, tags, hashtags, and upload timing for max reach.' },
            { icon: Mic, color: 'orange', title: '🎙️ Voice Agent', desc: 'Creates narration scripts with speaking speed, pause marks, and emotion cues.' },
            { icon: Play, color: 'red', title: '📝 Subtitle Agent', desc: 'Generates SRT/VTT captions with emoji enhancements and highlighted keywords.' },
            { icon: Shield, color: 'yellow', title: '✅ Quality Agent', desc: 'Audits the entire package across hook strength, pacing, SEO, and engagement.' },
            { icon: Zap, color: 'teal', title: '📦 Publisher Agent', desc: 'Packages everything into a downloadable ZIP with scripts, captions, and reports.' },
          ].map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.06 }}
              className="glass-card p-6 text-left hover:-translate-y-1.5 transition-all duration-300 rounded-3xl overflow-hidden border border-white/10"
            >
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-outfit font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">Three simple steps to a complete production package.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Describe Your Video', desc: 'Enter your topic, pick a platform, choose a tone. That\'s it.' },
            { step: '02', title: 'AI Agents Go to Work', desc: 'Watch 9 agents research, write, storyboard, and optimize in real-time.' },
            { step: '03', title: 'Download Your Package', desc: 'Get your script, storyboard, captions, SEO metadata, and quality report as a ZIP.' },
          ].map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-outfit font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{item.step}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-outfit font-bold mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground text-lg">Start for free. Scale when you need it.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Free',
              price: '$0',
              period: '/forever',
              desc: 'Perfect for trying it out',
              features: ['3 projects / day', 'All 9 AI agents', 'ZIP export', 'Community support'],
              cta: 'Get Started',
              featured: false,
            },
            {
              name: 'Pro',
              price: '$19',
              period: '/month',
              desc: 'For serious creators',
              features: ['Unlimited projects', 'Priority AI processing', 'Custom branding', 'API access', 'Priority support'],
              cta: 'Upgrade to Pro',
              featured: true,
            },
            {
              name: 'Team',
              price: '$49',
              period: '/month',
              desc: 'For agencies & teams',
              features: ['Everything in Pro', '5 team members', 'Shared workspace', 'Analytics dashboard', 'Dedicated support'],
              cta: 'Contact Sales',
              featured: false,
            },
          ].map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`glass-card p-8 md:p-10 text-left relative overflow-hidden rounded-[28px] md:rounded-[32px] transition-all duration-300 hover:-translate-y-2 border backdrop-blur-2xl ${
                plan.featured
                  ? 'border-purple-500/60 bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-purple-500/10 dark:from-purple-500/20 dark:via-purple-500/5 dark:to-black/40 shadow-2xl shadow-purple-500/20'
                  : 'border-slate-200 dark:border-white/10 hover:border-purple-500/40 bg-white/90 dark:bg-black/40 shadow-xl'
              }`}
            >
              {plan.featured && (
                <div className="absolute top-0 right-6 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-b-xl text-xs font-bold text-white shadow-lg shadow-purple-500/30 tracking-wide uppercase">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold font-outfit mb-1">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-6">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl md:text-5xl font-outfit font-bold tracking-tight">{plan.price}</span>
                <span className="text-muted-foreground text-sm font-medium">{plan.period}</span>
              </div>
              <ul className="space-y-3.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/new"
                className={`block w-full text-center py-3.5 rounded-full font-bold text-sm tracking-wide transition-all ${
                  plan.featured
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 !text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-900 hover:bg-purple-600 !text-white border border-slate-800 shadow-md'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 px-6 py-24 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-outfit font-bold mb-6">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">10x</span> your content?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join thousands of creators who already use AI to produce studio-quality content in seconds.
          </p>
          <Link href="/dashboard/new" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-medium hover:scale-105 transition-transform shadow-lg shadow-primary/25">
            Start Creating Now — It's Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-outfit font-bold text-sm">SparkStudio AI</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 SparkStudio AI. Built with ❤️ for the Zero to One Hackathon.</p>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
