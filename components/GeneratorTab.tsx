
import React, { useState } from 'react';
import { UserProfile, JobDetails, GeneratedEmail, JobListing } from '../types';
import { generateApplicationEmail, searchJobs } from '../services/geminiService';
import { Button } from './ui/Button';
import { Mail, Sparkles, Copy, Send, Search, MapPin, Globe, Briefcase, ArrowDown, ExternalLink, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface GeneratorTabProps {
  userProfile: UserProfile;
}

export const GeneratorTab: React.FC<GeneratorTabProps> = ({ userProfile }) => {
  const [searchQuery, setSearchQuery] = useState('Flutter Developer');
  const [searchResults, setSearchResults] = useState<JobListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const [expandedJobIdx, setExpandedJobIdx] = useState<number | null>(null);

  const [job, setJob] = useState<JobDetails>({
    companyName: '',
    jobTitle: 'Flutter Developer',
    recruiterEmail: '',
    jobDescription: '',
    hiringManagerName: ''
  });
  
  const [result, setResult] = useState<GeneratedEmail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJob(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchResults([]);
    setError(null);
    try {
      const jobs = await searchJobs(searchQuery);
      setSearchResults(jobs);
      if (jobs.length === 0) {
        setError("No jobs found. Try a different query.");
      }
    } catch (err) {
      setError("Failed to search jobs. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectJob = (listing: JobListing) => {
    setJob({
      companyName: listing.company,
      jobTitle: listing.title,
      recruiterEmail: listing.email || '',
      jobDescription: listing.fullDescription || listing.snippet,
      hiringManagerName: ''
    });
    setShowSearch(false); 
    setResult(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.name) {
      setError("Please complete your profile in the 'Profile' tab first.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setResult(null);

    try {
      const generated = await generateApplicationEmail(userProfile, job);
      setResult(generated);
    } catch (err) {
      setError("Failed to generate email.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div 
            className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setShowSearch(!showSearch)}
          >
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Find Jobs Online
            </h2>
            <ArrowDown className={`w-4 h-4 text-slate-400 transition-transform ${showSearch ? 'rotate-180' : ''}`} />
          </div>
          
          {showSearch && (
            <div className="p-4 space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Flutter Developer Remote"
                />
                <Button type="submit" isLoading={isSearching} className="whitespace-nowrap">
                  Search
                </Button>
              </form>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {searchResults.map((listing, idx) => {
                  const isExpanded = expandedJobIdx === idx;
                  return (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors bg-white">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{listing.title}</h4>
                          <p className="text-xs text-blue-600 font-bold">{listing.company}</p>
                        </div>
                        {listing.sourceSite && (
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                            via {listing.sourceSite}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                         <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {listing.location || 'Remote'}</span>
                         {listing.url && (
                           <a href={listing.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 font-semibold hover:underline">
                             <ExternalLink className="w-3 h-3" /> Apply Here
                           </a>
                         )}
                      </div>

                      <div className={`text-xs text-slate-600 leading-relaxed mb-3 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {isExpanded ? (listing.fullDescription || listing.snippet) : listing.snippet}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setExpandedJobIdx(isExpanded ? null : idx)} 
                          className="text-[10px] py-1 h-auto px-2"
                        >
                          {isExpanded ? <><ChevronUp className="w-3 h-3" /> Hide Details</> : <><ChevronDown className="w-3 h-3" /> View Full Description</>}
                        </Button>
                        <Button 
                          variant="primary" 
                          onClick={() => selectJob(listing)} 
                          className="flex-1 text-[10px] py-1 h-auto"
                        >
                          Select for Draft
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Application Form
          </h2>
          <form onSubmit={handleGenerate} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Company</label>
                  <input required type="text" name="companyName" value={job.companyName} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Job Title</label>
                  <input required type="text" name="jobTitle" value={job.jobTitle} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-semibold text-slate-500">Recruiter Email (Optional)</label>
               <input type="email" name="recruiterEmail" value={job.recruiterEmail} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. jobs@company.com" />
             </div>
             <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Full Job Description</label>
              <textarea required name="jobDescription" value={job.jobDescription} onChange={handleInputChange} rows={10} className="w-full px-3 py-2 border rounded-lg text-sm font-sans" placeholder="Paste the full job description here..." />
            </div>
            <Button type="submit" isLoading={isGenerating} className="w-full">
              <Sparkles className="w-4 h-4" /> Generate Email
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col ${!result ? 'justify-center items-center' : ''}`}>
          {!result && !isGenerating && (
            <div className="text-center text-slate-400">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select a job or enter details to draft your email.</p>
            </div>
          )}
          {isGenerating && (
            <div className="text-center text-slate-500 animate-pulse">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-400" />
              <p>Analyzing job fit...</p>
            </div>
          )}
          {result && (
            <>
              <div className="flex justify-between items-start mb-6 pb-4 border-b">
                <div className="space-y-1 w-full">
                   <span className="text-[10px] font-bold text-blue-600 uppercase">Subject</span>
                   <h3 className="text-lg font-bold text-slate-900">{result.subject}</h3>
                </div>
                <button onClick={() => copyToClipboard(result.subject)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Copy className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto mb-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Email Content</span>
                <div className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed p-4 bg-slate-50 rounded-lg border mt-2">
                  {result.body}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => copyToClipboard(result.body)} className="flex-1"><Copy className="w-4 h-4" /> Copy Body</Button>
                <Button variant="primary" className="flex-1" onClick={() => window.open(`mailto:${job.recruiterEmail}?subject=${encodeURIComponent(result.subject)}&body=${encodeURIComponent(result.body)}`)}><Send className="w-4 h-4" /> Send Email</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
