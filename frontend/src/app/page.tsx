'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Bot, Video, Mic, Play, Sparkles, LayoutTemplate, PenTool, Zap, Shield, Globe, Check, LogOut, User, X, Wand2, Rocket, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api';

export default function LandingPage() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [proPaymentLink, setProPaymentLink] = useState('https://buy.stripe.com/your-mock-pro-link');
  const [teamPaymentLink, setTeamPaymentLink] = useState('https://buy.stripe.com/your-mock-team-link');
  const [upiId, setUpiId] = useState('');
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(0);

  const [claimEmail, setClaimEmail] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    if (upiModalOpen) {
      setClaimSuccess(false);
      setUtrNumber('');
      if (sessionUser?.email) {
        setClaimEmail(sessionUser.email);
      }
    }
  }, [upiModalOpen, sessionUser]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    // Load custom payment links from backend with local overrides
    fetch(apiUrl('/api/payments/config'))
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const savedPro = localStorage.getItem('sparkstudio-stripe-pro') || data.stripe_pro_link;
        if (savedPro) setProPaymentLink(savedPro);
        
        const savedTeam = localStorage.getItem('sparkstudio-stripe-team') || data.stripe_team_link;
        if (savedTeam) setTeamPaymentLink(savedTeam);
        
        const savedUpi = localStorage.getItem('sparkstudio-upi-id') || data.upi_id;
        if (savedUpi) setUpiId(savedUpi);
      })
      .catch(() => {
        const savedPro = localStorage.getItem('sparkstudio-stripe-pro');
        if (savedPro) setProPaymentLink(savedPro);
        
        const savedTeam = localStorage.getItem('sparkstudio-stripe-team');
        if (savedTeam) setTeamPaymentLink(savedTeam);
        
        const savedUpi = localStorage.getItem('sparkstudio-upi-id');
        if (savedUpi) setUpiId(savedUpi);
      });

    return () => subscription.unsubscribe();
  }, []);

  const handlePlanClick = (e: React.MouseEvent, plan: any) => {
    if (plan.name === 'Free') return;

    if (upiId) {
      e.preventDefault();
      setSelectedPlanName(plan.name);
      const usdAmount = parseInt(plan.price.replace('$', '')) || 0;
      const inrAmount = usdAmount === 19 ? 59 : 99;
      setSelectedPlanPrice(inrAmount);
      setUpiModalOpen(true);
    }
  };

  const handleClaimUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimEmail || !claimEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    if (!utrNumber || !utrNumber.trim() || utrNumber.trim().length !== 12 || !/^\d+$/.test(utrNumber.trim())) {
      toast.error('Please enter a valid 12-digit numeric UPI Transaction ID (UTR)');
      return;
    }

    setClaiming(true);
    try {
      const response = await fetch(apiUrl('/api/payments/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionUser?.id || 'guest',
          email: claimEmail.trim(),
          plan_name: selectedPlanName,
          utr_number: utrNumber.trim()
        })
      });

      if (!response.ok) throw new Error('Claim submission failed');

      setClaimSuccess(true);
      toast.success('Upgrade claim submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit claim. Please check your connection.');
    } finally {
      setClaiming(false);
    }
  };

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
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-slate-200 dark:border-white/5">
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
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                <Bot className="w-4 h-4 text-purple-400" />
                Dashboard
              </Link>
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/10 pl-4">
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
                <span className="text-xs text-slate-600 dark:text-white/70 max-w-[120px] truncate hidden sm:inline">{sessionUser.email}</span>
                <button 
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
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
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-sm mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
          <span className="text-xs font-medium text-purple-600 dark:text-purple-300">v1.0 Now Live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-outfit font-black tracking-tight mb-6 leading-[1.12] flex flex-col items-center gap-1.5"
        >
          <span className="text-slate-900 dark:text-white drop-shadow-sm">
            One Prompt.
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
            Complete Content
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-400">
            Production.
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
          <a href="#features" className="flex items-center gap-2 px-8 py-4 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors backdrop-blur-sm font-medium">
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
              className="glass-card p-6 text-left hover:-translate-y-1.5 transition-all duration-300 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10"
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
                <span className="text-4xl md:text-5xl font-outfit font-bold tracking-tight">
                  {upiId ? (plan.name === 'Pro' ? '₹59' : plan.name === 'Team' ? '₹99' : '₹0') : plan.price}
                </span>
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
                href={plan.name === 'Pro' ? proPaymentLink : plan.name === 'Team' ? teamPaymentLink : '/dashboard/new'}
                target={plan.name !== 'Free' ? '_blank' : undefined}
                rel={plan.name !== 'Free' ? 'noopener noreferrer' : undefined}
                onClick={(e) => handlePlanClick(e, plan)}
                className={`block w-full text-center py-3.5 rounded-full font-bold text-sm tracking-wide transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 !text-white shadow-lg shadow-purple-500/30`}
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
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/5 py-8 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-outfit font-bold text-sm">SparkStudio AI</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground text-center flex-wrap justify-center md:absolute md:left-1/2 md:-translate-x-1/2">
            <span className="flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-purple-500" />
              <Zap className="w-3 h-3 text-yellow-500" />
            </span>
            <span>© {new Date().getFullYear()} SparkStudio AI · Empowering creators with AI-powered content generation.</span>
            <span className="flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <Rocket className="w-3.5 h-3.5 text-pink-500" />
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>

      {/* UPI Checkout Modal */}
      {upiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-md text-left overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm mx-auto glass-card p-5 md:p-7 rounded-[28px] border border-purple-500/40 relative bg-white/95 dark:bg-zinc-950/95 shadow-2xl overflow-y-auto max-h-[calc(100vh-3rem)]"
          >
            <button 
              onClick={() => setUpiModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40"
            >
              <X className="w-4 h-4 text-slate-800 dark:text-slate-200" />
            </button>

            <div className="text-center space-y-4 pt-2">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold font-outfit text-slate-950 dark:text-white">Upgrade to {selectedPlanName}</h3>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500 font-outfit mt-1">
                  ₹{selectedPlanPrice.toLocaleString('en-IN')} <span className="text-xs text-muted-foreground font-medium">/ month</span>
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center gap-4">
                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-100 flex items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `upi://pay?pa=${upiId}&pn=SparkStudio%20AI&am=${selectedPlanPrice}&cu=INR&tn=${encodeURIComponent(selectedPlanName + ' Plan Upgrade')}`
                    )}`}
                    alt="UPI Payment QR Code"
                    className="w-40 h-40 block"
                  />
                </div>
                
                <div className="text-center space-y-1 w-full">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Payee UPI ID</span>
                  <p className="text-xs font-mono font-bold select-all bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 overflow-hidden text-ellipsis">
                    {upiId}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Scan using any UPI App (GPay, PhonePe, Paytm, BHIM) to make the payment instantly.
              </p>

              {/* Direct UPI Intent Link (Mobile Support) */}
              <div className="pt-2">
                <a 
                  href={`upi://pay?pa=${upiId}&pn=SparkStudio%20AI&am=${selectedPlanPrice}&cu=INR&tn=${encodeURIComponent(selectedPlanName + ' Plan Upgrade')}`}
                  className="block w-full text-center py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-sm text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Pay via UPI App
                </a>
              </div>

              {claimSuccess ? (
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs text-center space-y-1 mt-4">
                  <p className="font-bold flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" /> Claim Submitted!
                  </p>
                  <p className="text-[10px] opacity-80 leading-relaxed">
                    The admin will verify your UTR and activate your {selectedPlanName} plan within 10-15 minutes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleClaimUpgrade} className="border-t border-slate-200 dark:border-white/10 pt-4 mt-4 space-y-3 text-left">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                    Verify Payment to Activate Plan
                  </span>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-semibold block">Your Email Address</label>
                    <input
                      type="email"
                      required
                      value={claimEmail}
                      onChange={(e) => setClaimEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:border-purple-500 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-semibold block">12-Digit UPI Transaction ID (UTR)</label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 320958471203"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:border-purple-500 outline-none transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={claiming}
                    className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-xs font-bold text-white transition-all shadow-md shadow-purple-500/10 flex items-center justify-center gap-1.5"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting Claim...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Claim Upgrade
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
