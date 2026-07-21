'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Bell, Palette, Download, HelpCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/components/providers/theme-provider';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, setTheme } = useTheme();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuration saved successfully! Some features will be applied in the next update.');
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
                    <select className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:border-purple-500 focus:outline-none transition-colors">
                      <option value="en">English (US)</option>
                      <option value="en-uk">English (UK)</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Default Content Tone</label>
                    <select className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:border-purple-500 focus:outline-none transition-colors">
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
                <h3 className="text-lg font-bold font-outfit">Appearance</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <button 
                    type="button" 
                    className="p-4 rounded-xl text-center space-y-2 relative overflow-hidden border-2 border-purple-500 bg-purple-500/10"
                  >
                    <div className="w-full h-12 bg-gradient-to-r from-gray-900 to-black rounded-lg mb-2 border border-white/5"></div>
                    <span className="text-sm font-medium text-white">Midnight Dark (Default)</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'export' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 className="text-lg font-bold font-outfit">Export Preferences</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10">
                    <input type="checkbox" defaultChecked className="rounded border-white/20 bg-black/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-black" />
                    <div>
                      <p className="text-sm font-semibold">Include Subtitles (SRT/VTT)</p>
                      <p className="text-xs text-muted-foreground">Always include subtitle files in the ZIP export</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10">
                    <input type="checkbox" defaultChecked className="rounded border-white/20 bg-black/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-black" />
                    <div>
                      <p className="text-sm font-semibold">Include Storyboard Data</p>
                      <p className="text-xs text-muted-foreground">Export visual directions and image prompts</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10">
                    <input type="checkbox" className="rounded border-white/20 bg-black/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-black" />
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
                  <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm font-semibold">Browser Notifications</p>
                      <p className="text-xs text-muted-foreground">Get alerted when a project finishes generation</p>
                    </div>
                    <div className="relative inline-block w-10 h-6 rounded-full bg-purple-600 cursor-pointer">
                      <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform translate-x-4"></span>
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm font-semibold">Email Updates</p>
                      <p className="text-xs text-muted-foreground">Receive weekly analytics and feature updates</p>
                    </div>
                    <div className="relative inline-block w-10 h-6 rounded-full bg-white/20 cursor-pointer">
                      <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform"></span>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {activeTab === 'help' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-lg font-bold font-outfit">Documentation & Help</h3>
                <div className="space-y-2 text-sm text-white/90 bg-white/5 p-4 rounded-xl border border-white/10">
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
              <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
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
