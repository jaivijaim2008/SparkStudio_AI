'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Bell, Palette, Download, HelpCircle, Save, Sun, Moon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/components/providers/theme-provider';

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

    toast.success('Configuration saved successfully!');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'export', label: 'Export Defaults', icon: Download },
    { id: 'notifications', label: 'Notifications', icon: Bell },
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
                    <label className="text-sm font-medium text-muted-foreground">Default Content Tone</label>
                    <select 
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="educational">Educational & Professional</option>
                      <option value="viral">Viral & High Energy</option>
                      <option value="storytelling">Cinematic Storytelling</option>
                      <option value="funny">Humorous & Casual</option>
                    </select>
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
            {activeTab !== 'help' && (
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
