'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight, Bot, Video, Mic, Youtube, Sparkles, LayoutTemplate, PenTool } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-30 animate-blob" style={{ animationDelay: '4s' }}></div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-outfit font-bold text-xl tracking-tight">CreatorPilot AI</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
          <Link href="/dashboard" className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Get Started
          </Link>
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
          Stop jumping between 10 different tools. CreatorPilot AI uses 9 specialized agents to research, write, storyboard, and optimize your videos automatically.
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
          <Link href="#demo" className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm font-medium">
            <Video className="w-4 h-4" />
            Watch Demo
          </Link>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full"
        >
          <div className="glass-card p-6 text-left hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">9 AI Agents</h3>
            <p className="text-muted-foreground text-sm">A full production team working in parallel. From research to SEO, everything is automated.</p>
          </div>

          <div className="glass-card p-6 text-left hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <LayoutTemplate className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Visual Storyboards</h3>
            <p className="text-muted-foreground text-sm">Automatically generated scenes with camera angles, animations, and image prompts.</p>
          </div>

          <div className="glass-card p-6 text-left hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
              <Youtube className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Platform Optimized</h3>
            <p className="text-muted-foreground text-sm">Perfect pacing for Shorts, Reels, or Long-form. SEO metadata generated automatically.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
