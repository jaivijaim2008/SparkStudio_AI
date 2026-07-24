'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Bell, Palette, Download, HelpCircle, Save, Sun, Moon, Check, CreditCard, Shield, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/components/providers/theme-provider';
import { apiUrl } from '@/lib/api';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, setTheme } = useTheme();

  // Local state for all settings fields
  const [tempTheme, setTempTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState('en');
  const [tone, setTone] = useState('educational');
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [includeStoryboard, setIncludeStoryboard] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [personas, setPersonas] = useState<{name: string, description: string}[]>([]);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaDesc, setNewPersonaDesc] = useState('');
  const [stripeProLink, setStripeProLink] = useState('https://buy.stripe.com/your-mock-pro-link');
  const [stripeTeamLink, setStripeTeamLink] = useState('https://buy.stripe.com/your-mock-team-link');
  const [upiId, setUpiId] = useState('');

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [userPlan, setUserPlan] = useState('free');
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
        
        // Fetch user plan
        let prof: any = null;
        const { data: profById } = await supabase.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
        if (profById) prof = profById;
        else {
          const { data: profByEmail } = await supabase.from('profiles').select('plan').eq('email', session.user.email).maybeSingle();
          if (profByEmail) prof = profByEmail;
        }
        if (prof?.plan) {
          setUserPlan(prof.plan);
          // If free plan and tone is set to a premium one, reset it
          if (prof.plan === 'free' && ['viral', 'storytelling', 'funny'].includes(localStorage.getItem('sparkstudio-tone') || '')) {
            setTone('educational');
            localStorage.setItem('sparkstudio-tone', 'educational');
          }
        }
      }
    };
    fetchUser();
  }, []);

  const isAdmin = currentUserEmail === 'jaivijaim2008@gmail.com';

  const fetchClaims = async () => {
    setLoadingClaims(true);
    try {
      const res = await fetch(apiUrl('/api/payments/claims'));
      if (res.ok) {
        const data = await res.json();
        setClaims(data);
      }
    } catch (e) {
      console.error("Failed to fetch claims:", e);
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'claims' && isAdmin) {
      fetchClaims();
    }
  }, [activeTab, isAdmin]);

  const handleApproveClaim = async (claimId: string, userId: string, planName: string) => {
    try {
      const res = await fetch(apiUrl('/api/payments/claims/approve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId, user_id: userId, plan_name: planName })
      });
      if (res.ok) {
        toast.success("Payment claim approved and plan upgraded!");
        fetchClaims();
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.error("Failed to approve claim.");
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/payments/claims/reject?claim_id=${claimId}`), {
        method: 'POST'
      });
      if (res.ok) {
        toast.success("Payment claim rejected.");
        fetchClaims();
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.error("Failed to reject claim.");
    }
  };

  // Sync initial state from localStorage and Theme context on mount
  useEffect(() => {
    if (theme) {
      setTempTheme(theme);
    }
    
    const savedLang = localStorage.getItem('sparkstudio-lang');
    if (savedLang) setLanguage(savedLang);
    
    const savedTone = localStorage.getItem('sparkstudio-tone');
    if (savedTone) setTone(savedTone);

    const savedSubtitles = localStorage.getItem('sparkstudio-subtitles');
    if (savedSubtitles) setIncludeSubtitles(savedSubtitles === 'true');

    const savedStoryboard = localStorage.getItem('sparkstudio-storyboard');
    if (savedStoryboard) setIncludeStoryboard(savedStoryboard === 'true');

    const savedAutoDownload = localStorage.getItem('sparkstudio-autodownload');
    if (savedAutoDownload) setAutoDownload(savedAutoDownload === 'true');

    const savedBrowserNotifications = localStorage.getItem('sparkstudio-browser-notifications');
    if (savedBrowserNotifications) setBrowserNotifications(savedBrowserNotifications === 'true');

    const savedEmailUpdates = localStorage.getItem('sparkstudio-email-updates');
    if (savedEmailUpdates) setEmailUpdates(savedEmailUpdates === 'true');

    const savedPersonas = localStorage.getItem('sparkstudio-personas');
    if (savedPersonas) {
      try { setPersonas(JSON.parse(savedPersonas)); } catch (e) {}
    }

    const savedStripePro = localStorage.getItem('sparkstudio-stripe-pro');
    const savedStripeTeam = localStorage.getItem('sparkstudio-stripe-team');
    const savedUpiId = localStorage.getItem('sparkstudio-upi-id');

    if (!savedStripePro || !savedStripeTeam || !savedUpiId) {
      fetch(apiUrl('/api/payments/config'))
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          setStripeProLink(savedStripePro || data.stripe_pro_link);
          setStripeTeamLink(savedStripeTeam || data.stripe_team_link);
          setUpiId(savedUpiId || data.upi_id);
        })
        .catch(() => {
          if (savedStripePro) setStripeProLink(savedStripePro);
          if (savedStripeTeam) setStripeTeamLink(savedStripeTeam);
          if (savedUpiId) setUpiId(savedUpiId);
        });
    } else {
      setStripeProLink(savedStripePro);
      setStripeTeamLink(savedStripeTeam);
      setUpiId(savedUpiId);
    }
  }, [theme]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to global theme provider
    setTheme(tempTheme);
    
    // Save all other settings to localStorage
    localStorage.setItem('sparkstudio-lang', language);
    localStorage.setItem('sparkstudio-tone', tone);
    localStorage.setItem('sparkstudio-subtitles', String(includeSubtitles));
    localStorage.setItem('sparkstudio-storyboard', String(includeStoryboard));
    localStorage.setItem('sparkstudio-autodownload', String(autoDownload));
    localStorage.setItem('sparkstudio-browser-notifications', String(browserNotifications));
    localStorage.setItem('sparkstudio-email-updates', String(emailUpdates));
    localStorage.setItem('sparkstudio-personas', JSON.stringify(personas));
    localStorage.setItem('sparkstudio-stripe-pro', stripeProLink);
    localStorage.setItem('sparkstudio-stripe-team', stripeTeamLink);
    localStorage.setItem('sparkstudio-upi-id', upiId);

    toast.success('Configuration saved successfully!');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'export', label: 'Export Defaults', icon: Download },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(isAdmin ? [{ id: 'payments', label: 'Payment Links', icon: CreditCard }] : []),
    ...(isAdmin ? [{ id: 'claims', label: 'Admin Claims', icon: Shield }] : []),
    { id: 'help', label: 'Help & Docs', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-outfit">Workspace Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your personal SparkStudio environment</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Tabs */}
        <div className="w-full md:w-64 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 border-white/10 pb-4 md:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="flex-1 glass-card p-6 md:p-8">
          <form onSubmit={handleSave} className="space-y-6">
            
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 className="text-lg font-bold font-outfit">General Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">Note: AI API Keys and Model selections are securely handled at the server level (.env) to protect your infrastructure. Users cannot override them here.</p>
                
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Default Output Language</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="en">English (US)</option>
                      <option value="en-uk">English (UK)</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex justify-between">
                      Default Content Tone
                      {userPlan === 'free' && (
                        <Link href="/dashboard" className="text-xs text-purple-500 hover:text-purple-400">Upgrade to unlock all</Link>
                      )}
                    </label>
                    <select 
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="educational">Educational & Professional</option>
                      <option value="viral" disabled={userPlan === 'free'}>Viral & High Energy {userPlan === 'free' ? '🔒 (Pro/Team)' : ''}</option>
                      <option value="storytelling" disabled={userPlan === 'free'}>Cinematic Storytelling {userPlan === 'free' ? '🔒 (Pro/Team)' : ''}</option>
                      <option value="funny" disabled={userPlan === 'free'}>Humorous & Casual {userPlan === 'free' ? '🔒 (Pro/Team)' : ''}</option>
                    </select>
                  </div>
                </div>

                {/* Brand Personas (Team Plan Feature) */}
                <div className="pt-6 border-t border-slate-200 dark:border-white/10 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-md font-bold font-outfit flex items-center gap-2">
                        Brand Personas 
                        {userPlan !== 'team' && <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full font-semibold">Team Plan</span>}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">Save custom instructions to automatically adapt AI generation to your channels.</p>
                    </div>
                  </div>

                  <div className={`space-y-4 ${userPlan !== 'team' ? 'opacity-60 pointer-events-none grayscale select-none relative' : ''}`}>
                    {userPlan !== 'team' && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <Link href="/dashboard" className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-full text-sm hover:scale-105 transition-transform shadow-lg shadow-purple-500/30">
                          Upgrade to Team
                        </Link>
                      </div>
                    )}
                    
                    {personas.map((p, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 relative group">
                        <div className="font-bold text-sm mb-1">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                        <button type="button" onClick={() => setPersonas(personas.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {personas.length < 3 && (
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 space-y-3">
                        <input 
                          type="text" 
                          placeholder="Persona Name (e.g. 'Tech Gaming Channel')" 
                          value={newPersonaName}
                          onChange={(e) => setNewPersonaName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-purple-500"
                        />
                        <textarea 
                          placeholder="Instructions (e.g. 'Keep it Gen-Z, use lots of slang, focus on high energy hooks.')" 
                          value={newPersonaDesc}
                          onChange={(e) => setNewPersonaDesc(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-purple-500 resize-none"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (newPersonaName && newPersonaDesc) {
                              setPersonas([...personas, { name: newPersonaName, description: newPersonaDesc }]);
                              setNewPersonaName('');
                              setNewPersonaDesc('');
                            }
                          }}
                          className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                        >
                          + Add Persona
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit">Appearance & Theme</h3>
                  <p className="text-xs text-muted-foreground mt-1">Select your preferred SparkStudio interface theme</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
                  {/* Midnight Dark */}
                  <button 
                    type="button" 
                    onClick={() => {
                      setTempTheme('dark');
                    }}
                    className={`p-5 rounded-2xl text-left space-y-4 relative overflow-hidden border-2 transition-all ${
                      tempTheme === 'dark'
                        ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                        : 'border-slate-300 dark:border-white/10 hover:border-purple-400 bg-slate-200/50 dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center text-purple-400">
                        <Moon className="w-5 h-5" />
                      </div>
                      {tempTheme === 'dark' && (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="w-full h-14 bg-gradient-to-r from-gray-950 via-slate-900 to-zinc-900 rounded-xl border border-white/10 p-3 flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-500" />
                      <div className="w-16 h-2.5 rounded bg-white/30" />
                      <div className="w-8 h-2.5 rounded bg-white/15" />
                    </div>
                    <div>
                      <span className="text-base font-bold block">Midnight Dark</span>
                      <span className="text-xs text-muted-foreground">Deep dark theme with glassmorphism</span>
                    </div>
                  </button>

                  {/* Soft Light */}
                  <button 
                    type="button" 
                    onClick={() => {
                      setTempTheme('light');
                    }}
                    className={`p-5 rounded-2xl text-left space-y-4 relative overflow-hidden border-2 transition-all ${
                      tempTheme === 'light'
                        ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                        : 'border-slate-300 dark:border-white/10 hover:border-purple-400 bg-slate-200/50 dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300/40 flex items-center justify-center text-amber-600">
                        <Sun className="w-5 h-5" />
                      </div>
                      {tempTheme === 'light' && (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="w-full h-14 bg-gradient-to-r from-slate-200 via-slate-100 to-white rounded-xl border border-slate-300 p-3 flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-600" />
                      <div className="w-16 h-2.5 rounded bg-slate-700" />
                      <div className="w-8 h-2.5 rounded bg-slate-400" />
                    </div>
                    <div>
                      <span className="text-base font-bold block">Soft Light</span>
                      <span className="text-xs text-muted-foreground">Eye-friendly soft slate theme with crisp text contrast</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'export' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 className="text-lg font-bold font-outfit">Export Preferences</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                    <input 
                      type="checkbox" 
                      checked={includeSubtitles}
                      onChange={(e) => setIncludeSubtitles(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-black/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-white dark:focus:ring-offset-black" 
                    />
                    <div>
                      <p className="text-sm font-semibold">Include Subtitles (SRT/VTT)</p>
                      <p className="text-xs text-muted-foreground">Always include subtitle files in the ZIP export</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                    <input 
                      type="checkbox" 
                      checked={includeStoryboard}
                      onChange={(e) => setIncludeStoryboard(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-black/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-white dark:focus:ring-offset-black" 
                    />
                    <div>
                      <p className="text-sm font-semibold">Include Storyboard Data</p>
                      <p className="text-xs text-muted-foreground">Export visual directions and image prompts</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                    <input 
                      type="checkbox" 
                      checked={autoDownload}
                      onChange={(e) => setAutoDownload(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-black/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-white dark:focus:ring-offset-black" 
                    />
                    <div>
                      <p className="text-sm font-semibold">Auto-download on complete</p>
                      <p className="text-xs text-muted-foreground">Automatically save ZIP when pipeline finishes</p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 className="text-lg font-bold font-outfit">Notification Settings</h3>
                
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setBrowserNotifications(!browserNotifications)}
                    className="flex items-center justify-between w-full p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left cursor-pointer"
                  >
                    <div className="pr-4">
                      <p className="text-sm font-semibold">Browser Notifications</p>
                      <p className="text-xs text-muted-foreground">Get alerted when a project finishes generation</p>
                    </div>
                    <div className={`relative inline-block w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
                      browserNotifications ? 'bg-purple-600' : 'bg-slate-300 dark:bg-white/20'
                    }`}>
                      <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        browserNotifications ? 'translate-x-4' : 'translate-x-0'
                      }`}></span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailUpdates(!emailUpdates)}
                    className="flex items-center justify-between w-full p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left cursor-pointer"
                  >
                    <div className="pr-4">
                      <p className="text-sm font-semibold">Email Updates</p>
                      <p className="text-xs text-muted-foreground">Receive weekly analytics and feature updates</p>
                    </div>
                    <div className={`relative inline-block w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
                      emailUpdates ? 'bg-purple-600' : 'bg-slate-300 dark:bg-white/20'
                    }`}>
                      <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        emailUpdates ? 'translate-x-4' : 'translate-x-0'
                      }`}></span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit">Payment Links</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure your Stripe checkout URLs or UPI ID to receive pricing plan checkout funds directly.
                    <strong className="text-purple-500 dark:text-purple-400 block mt-1">
                      💡 Indian Users: If you only want UPI payments, you can leave the Stripe links blank. Setting your UPI ID will automatically switch the landing page pricing cards to display Indian Rupees (₹) instead of USD ($).
                    </strong>
                  </p>
                </div>
                
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Pro Plan Stripe / Checkout Link</label>
                    <input 
                      type="url"
                      value={stripeProLink}
                      onChange={(e) => setStripeProLink(e.target.value)}
                      placeholder="e.g. https://buy.stripe.com/your-pro-link"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Team Plan Stripe / Checkout Link</label>
                    <input 
                      type="url"
                      value={stripeTeamLink}
                      onChange={(e) => setStripeTeamLink(e.target.value)}
                      placeholder="e.g. https://buy.stripe.com/your-team-link"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors font-medium"
                    />
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-4 space-y-2">
                    <label className="text-sm font-semibold text-purple-600 dark:text-purple-400">UPI ID / VPA (For India Payments)</label>
                    <p className="text-xs text-muted-foreground">Setting this enables a beautiful UPI QR code scanner & direct UPI app launch checkout for Indian users.</p>
                    <input 
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@upi or paytm"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors font-medium"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'claims' && isAdmin && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit">UPI Payment Claims</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Review UTR payment claims submitted by users. Verify UTR numbers against your UPI/bank statement before approving.</p>
                </div>

                <div className="space-y-4">
                  {loadingClaims ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                  ) : claims.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-black/20">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-white/20 animate-pulse" />
                      <p className="text-sm font-semibold">No payment claims found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-white/15 rounded-xl bg-slate-50 dark:bg-black/30">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-muted-foreground uppercase tracking-wider font-bold">
                            <th className="py-3.5 px-5">User / Email</th>
                            <th className="py-3.5 px-5">Requested Plan</th>
                            <th className="py-3.5 px-5">UTR Number</th>
                            <th className="py-3.5 px-5">Date</th>
                            <th className="py-3.5 px-5">Status</th>
                            <th className="py-3.5 px-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                          {claims.map((claim) => (
                            <tr key={claim.id} className="hover:bg-slate-100 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 px-5 font-semibold text-slate-900 dark:text-white">{claim.email}</td>
                              <td className="py-4 px-5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  claim.plan_name.toLowerCase() === 'team'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                }`}>
                                  {claim.plan_name}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <span className="font-mono font-bold select-all bg-slate-200 dark:bg-white/5 px-2.5 py-1 rounded-md text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/5 font-semibold">
                                  {claim.utr_number}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-slate-500 dark:text-muted-foreground">
                                {new Date(claim.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-5">
                                <span className={`flex items-center gap-1 font-semibold ${
                                  claim.status === 'approved'
                                    ? 'text-green-600 dark:text-green-400'
                                    : claim.status === 'rejected'
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                  {claim.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {claim.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                                  {claim.status === 'pending' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right">
                                {claim.status === 'pending' && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRejectClaim(claim.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 transition-colors font-bold text-[10px]"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveClaim(claim.id, claim.user_id, claim.plan_name)}
                                      className="px-2.5 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/25 transition-colors font-bold text-[10px]"
                                    >
                                      Approve
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'help' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-lg font-bold font-outfit">Documentation & Help</h3>
                <div className="space-y-2 text-sm text-slate-700 dark:text-white/90 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                  <p><strong>SparkStudio AI</strong> runs a lightning-fast parallel multi-agent loop:</p>
                  <ol className="list-decimal pl-5 space-y-1 mt-2 text-muted-foreground marker:text-purple-400">
                    <li><strong>Research Agent</strong> scans trends and pain points.</li>
                    <li><strong>Script Agent</strong> writes engaging story text.</li>
                    <li><strong>Storyboard, Thumbnail, SEO, Subtitles, Voice</strong> run simultaneously for maximum speed.</li>
                    <li><strong>Quality Agent</strong> audits the entire package.</li>
                    <li><strong>Publisher Agent</strong> zips it up for download.</li>
                  </ol>
                </div>
              </motion.div>
            )}

            {/* Save Button */}
            {activeTab !== 'help' && activeTab !== 'claims' && (
              <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all font-semibold shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
