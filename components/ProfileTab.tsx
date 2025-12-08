import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Button } from './ui/Button';
import { Save, User, Briefcase, Link as LinkIcon, FileText, Check, AlertTriangle } from 'lucide-react';

interface ProfileTabProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => Promise<void>;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ initialProfile, onSave }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'offline'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setSaveStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    setStatusMessage('');
    
    try {
      await onSave(profile);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e: any) {
      // Log as warning only, since data is safe locally
      console.warn("Profile saved locally only. Cloud error:", e.message);
      
      setSaveStatus('offline');
      if (e.message.includes('Rules')) {
        setStatusMessage("Check Firestore Security Rules.");
      } else {
        setStatusMessage("Cloud sync failed. Check connection.");
      }
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Your Developer Profile
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            The AI uses this information to personalize your application emails.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={profile.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. Jane Doe"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Years of Experience</label>
              <input
                type="text"
                name="yearsExperience"
                value={profile.yearsExperience}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. 4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Technical Skills (comma separated)</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="skills"
                value={profile.skills}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Dart, Flutter, Bloc, Riverpod, Firebase, REST APIs, Git"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Portfolio URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  name="portfolioUrl"
                  value={profile.portfolioUrl}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="https://github.com/janedoe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">LinkedIn URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  name="linkedinUrl"
                  value={profile.linkedinUrl}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="https://linkedin.com/in/janedoe"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Short Bio / Summary</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                rows={4}
                className="w-full pl-10 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Briefly describe your background, strengths, and what you are looking for..."
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
             {saveStatus === 'success' && (
               <span className="text-green-600 text-sm font-medium animate-pulse flex items-center gap-1">
                 <Check className="w-4 h-4" /> Profile Saved!
               </span>
             )}
             {saveStatus === 'offline' && (
               <div className="flex flex-col items-end">
                 <span className="text-amber-600 text-sm font-medium flex items-center gap-1">
                   <AlertTriangle className="w-4 h-4" /> Saved (Device Only)
                 </span>
                 <span className="text-[10px] text-slate-400">
                    {statusMessage || "Cloud sync failed. Check internet."}
                 </span>
               </div>
             )}
            <Button type="submit" isLoading={isSaving}>
              <Save className="w-4 h-4" />
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};