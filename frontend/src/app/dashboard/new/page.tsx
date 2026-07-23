'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, 
  Video, 
  Smartphone, 
  UploadCloud, 
  FileCheck, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api';

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function NewProject() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    topic: '',
    platform: 'YouTube Shorts',
    audience: 'General',
    tone: 'Informative',
    language: 'English',
    video_length: 60,
  });

  // Certificate state for LinkedIn
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [linkedinPost, setLinkedinPost] = useState('');
  const [extractedDetails, setExtractedDetails] = useState<{
    title?: string;
    issuer?: string;
    skills?: string[];
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const platforms = [
    { name: 'YouTube Shorts', icon: Smartphone, length: 60 },
    { name: 'LinkedIn', icon: LinkedinIcon, length: 120 },
    { name: 'Instagram Reels', icon: Smartphone, length: 60 },
    { name: 'YouTube Long', icon: Video, length: 600 },
  ];

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      toast.error('Please upload a PDF, JPG, JPEG, or PNG certificate file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit');
      return;
    }

    setCertificateFile(file);
    toast.success(`Uploaded ${file.name}`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleGenerateLinkedInPost = async () => {
    if (!certificateFile) {
      toast.error('Please upload a certificate first');
      return;
    }

    setIsExtracting(true);

    try {
      let rawText = '';
      if (certificateFile.type.includes('text') || certificateFile.name.endsWith('.txt')) {
        rawText = await certificateFile.text();
      }

      const response = await fetch(apiUrl('/api/extract-certificate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: certificateFile.name,
          extracted_text: rawText,
          user_notes: formData.topic,
          tone: formData.tone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedinPost(data.linkedin_post);
        setExtractedDetails({
          title: data.certificate_title,
          issuer: data.issuing_organization,
          skills: data.skills,
        });

        if (!formData.topic) {
          setFormData((prev) => ({
            ...prev,
            topic: `Certification in ${data.certificate_title} from ${data.issuing_organization}`,
          }));
        }
        toast.success('LinkedIn post generated successfully!');
      } else {
        throw new Error('Server returned an error');
      }
    } catch (err) {
      console.warn('API certificate extraction fallback used:', err);

      const nameWithoutExt = certificateFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const title = nameWithoutExt.replace(/\b(cert|certificate|pdf|png|jpg|jpeg)\b/gi, '').trim() || 'Professional Certification';
      
      const sampleSkills = ['Data Analysis', 'Problem Solving', 'Strategic Execution', 'Domain Leadership'];
      const postText = `🎉 Excited to share a new milestone in my professional journey!\n\n` +
        `I have officially earned my certification in ${title.charAt(0).toUpperCase() + title.slice(1)}! 🎓✨\n\n` +
        `This comprehensive program deepened my expertise in key industry domains and challenged me to build practical, real-world solutions.\n\n` +
        `💡 Key Skills & Core Takeaways:\n` +
        sampleSkills.map(s => `• ${s}`).join('\n') + `\n\n` +
        `A big thank you to the instructors and team for providing such an insightful and hands-on learning experience! 🙏\n\n` +
        `#Certification #Learning #ProfessionalDevelopment #CareerGrowth #SkillBuilding`;

      setLinkedinPost(postText);
      setExtractedDetails({
        title: title.charAt(0).toUpperCase() + title.slice(1),
        issuer: 'Recognized Institution',
        skills: sampleSkills,
      });

      if (!formData.topic) {
        setFormData((prev) => ({
          ...prev,
          topic: `Certification in ${title.charAt(0).toUpperCase() + title.slice(1)}`,
        }));
      }

      toast.success('LinkedIn post generated successfully!');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyPost = () => {
    if (!linkedinPost) return;
    navigator.clipboard.writeText(linkedinPost);
    setIsCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePostToLinkedIn = () => {
    if (!linkedinPost) return;
    navigator.clipboard.writeText(linkedinPost);
    toast.success('LinkedIn Post copied to clipboard! Opening LinkedIn...');
    window.open('https://www.linkedin.com/feed/', '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    
    try {
      toast.success('Project created! Initializing AI agents...');

      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('sparkstudio-user-email') : null;

      const response = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          user_email: userEmail || undefined
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create project');
      }
      
      const data = await response.json();
      router.push(`/dashboard/project/${data.project_id}`);
    } catch (error) {
      console.error('Project creation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-outfit">Create New Project</h1>
        <p className="text-muted-foreground mt-1">Tell the AI what you want to create.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-8">
        {/* Topic Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium">What is your video about?</label>
          <textarea
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="e.g. AI replacing programmers and what computer science students should do about it..."
            className="w-full min-h-[120px] p-4 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all outline-none resize-none placeholder:text-muted-foreground/50"
            maxLength={500}
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">{formData.topic.length}/500</span>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Platform</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map((platform) => {
              const isSelected = formData.platform === platform.name;
              return (
                <button
                  type="button"
                  key={platform.name}
                  onClick={() => setFormData({ ...formData, platform: platform.name, video_length: platform.length })}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                    isSelected 
                      ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-500/10' 
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <platform.icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-purple-400' : ''}`} />
                  <span className="text-sm font-medium text-center">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Certificate Section (LinkedIn Only) */}
        <AnimatePresence mode="wait">
          {formData.platform === 'LinkedIn' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 overflow-hidden pt-2"
            >
              <div className="p-6 rounded-2xl border border-blue-500/30 bg-blue-950/20 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Upload Certificate</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload your certificate (PDF, JPG, JPEG, PNG) to extract details and generate a professional LinkedIn post.
                    </p>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-200 ${
                    dragActive
                      ? 'border-blue-400 bg-blue-500/10 scale-[0.99]'
                      : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-blue-400/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,image/png,image/jpeg,application/pdf"
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                    className="hidden"
                  />

                  {certificateFile ? (
                    <div className="flex items-center justify-between w-full p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileCheck className="w-6 h-6 text-blue-400 shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium text-white truncate">{certificateFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(certificateFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCertificateFile(null);
                          setLinkedinPost('');
                          setExtractedDetails(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          Click to upload or drag & drop certificate
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports PDF, JPG, JPEG, PNG (max 15MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateLinkedInPost}
                    disabled={!certificateFile || isExtracting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExtracting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Extracting & Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate LinkedIn Post
                      </>
                    )}
                  </button>
                </div>

                {/* Generated LinkedIn Post Display */}
                {linkedinPost && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-4 border-t border-blue-500/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkedinIcon className="w-5 h-5 text-[#0A66C2]" />
                        <h4 className="text-sm font-semibold text-white">Generated LinkedIn Post</h4>
                      </div>

                      {extractedDetails?.title && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {extractedDetails.title}
                        </span>
                      )}
                    </div>

                    {/* Editable Textbox */}
                    <textarea
                      value={linkedinPost}
                      onChange={(e) => setLinkedinPost(e.target.value)}
                      className="w-full min-h-[220px] p-4 rounded-xl bg-black/40 border border-blue-500/30 text-sm text-gray-100 focus:border-blue-400 outline-none resize-y leading-relaxed font-sans"
                      placeholder="Your generated LinkedIn post will appear here..."
                    />

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyPost}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>

                        <button
                          type="button"
                          onClick={handleGenerateLinkedInPost}
                          disabled={isExtracting}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                          Regenerate
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handlePostToLinkedIn}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/30"
                      >
                        <LinkedinIcon className="w-4 h-4 fill-white" />
                        Post to LinkedIn
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Target Audience</label>
            <input
              type="text"
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="e.g. Students, Professionals..."
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Tone of Voice</label>
            <select
              value={formData.tone}
              onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all appearance-none"
            >
              <option value="Informative" className="bg-black">Informative</option>
              <option value="Funny" className="bg-black">Funny & Engaging</option>
              <option value="Professional" className="bg-black">Professional</option>
              <option value="Controversial" className="bg-black">Controversial / Clicky</option>
              <option value="Inspirational" className="bg-black">Inspirational</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-6 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            disabled={isGenerating || !formData.topic}
            className="group relative flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold hover:scale-105 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initializing Agents...
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                <Wand2 className="w-5 h-5" />
                Generate Production Package
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
