
import React, { useState } from 'react';
import { UserProfile, JobDetails, GeneratedEmail, JobListing } from '../types';
import { generateApplicationEmail, searchJobs } from '../services/geminiService';
import { Button } from './ui/Button';
// Added Loader2 to the lucide-react imports to fix the "Cannot find name 'Loader2'" error
import { Mail, Sparkles, Copy, Send, Search, MapPin, Briefcase, ArrowDown, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface GeneratorTabProps {
  userProfile: UserProfile;
}

export const GeneratorTab: React.FC<GeneratorTabProps> = ({ userProfile }) => {
  const [searchQuery, setSearchQuery] = useState('Flutter Developer Remote');
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
    } catch (err) {
      setError("Failed to search jobs.");
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
      setError("Please complete your profile first.");
      return;
    }
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        {/* Search Results Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
          <div 
            className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setShowSearch(!showSearch)}
          >
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Direct Job Search
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
                  className="flex-1 px-4 py-2.5 bg-white text-slate-900 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Flutter Engineer"
                />
                <Button type="submit" isLoading={isSearching} className="rounded-xl px-6">
                  Find
                </Button>
              </form>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {searchResults.map((listing, idx) => {
                  const isExpanded = expandedJobIdx === idx;
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{listing.title}</h4>
                          <p className="text-xs text-blue-600 font-bold">{listing.company}</p>
                        </div>
                        {listing.sourceSite && (
                          <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-100">
                            {listing.sourceSite}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                         <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {listing.location || 'Remote'}</span>
                         {listing.url && (
                           <a href={listing.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 font-bold hover:underline">
                             <ExternalLink className="w-3 h-3" /> Source
                           </a>
                         )}
                      </div>

                      <div className={`text-xs text-slate-600 leading-relaxed mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {isExpanded ? (listing.fullDescription || listing.snippet) : listing.snippet}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setExpandedJobIdx(isExpanded ? null : idx)} 
                          className="text-[10px] py-1.5 h-auto px-3 rounded-lg flex-1"
                        >
                          {isExpanded ? <><ChevronUp className="w-3 h-3" /> Hide</> : <><ChevronDown className="w-3 h-3" /> Full Context</>}
                        </Button>
                        <Button 
                          variant="primary" 
                          onClick={() => selectJob(listing)} 
                          className="flex-1 text-[10px] py-1.5 h-auto rounded-lg"
                        >
                          Use this Job
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Manual Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Active Application Details
          </h2>
          <form onSubmit={handleGenerate} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</label>
                  <input required type="text" name="companyName" value={job.companyName} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Title</label>
                  <input required type="text" name="jobTitle" value={job.jobTitle} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
               <textarea required name="jobDescription" value={job.jobDescription} onChange={handleInputChange} rows={8} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Paste requirements here..." />
            </div>
            <Button type="submit" isLoading={isGenerating} className="w-full py-3 rounded-xl shadow-lg shadow-blue-100">
              <Sparkles className="w-4 h-4" /> Generate AI Draft
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-full flex flex-col ${!result ? 'justify-center items-center' : ''}`}>
          {!result && !isGenerating && (
            <div className="text-center text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Mail className="w-8 h-8 opacity-20" />
              </div>
              <h3 className="text-slate-800 font-bold">No Draft Ready</h3>
              <p className="text-sm mt-2">Select a job or fill the form to start.</p>
            </div>
          )}
          {isGenerating && (
            <div className="text-center">
              {/* Correctly using Loader2 here now that it is imported */}
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-800 font-bold">Analyzing skills match...</p>
              <p className="text-xs text-slate-400 mt-1">Crafting a high-converting email</p>
            </div>
          )}
          {result && (
            <>
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject Line</label>
                   <button onClick={() => navigator.clipboard.writeText(result.subject)} className="text-blue-600 hover:text-blue-800 transition-colors"><Copy className="w-4 h-4" /></button>
                </div>
                <h3 className="text-xl font-bold text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-tight">{result.subject}</h3>
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Body</label>
                   <button onClick={() => navigator.clipboard.writeText(result.body)} className="text-blue-600 hover:text-blue-800 transition-colors"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 whitespace-pre-wrap text-slate-700 text-sm leading-relaxed p-6 bg-slate-50 rounded-2xl border border-slate-200 overflow-y-auto">
                  {result.body}
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(result.body)} className="flex-1 py-3 rounded-xl"><Copy className="w-4 h-4" /> Copy All</Button>
                <Button variant="primary" className="flex-1 py-3 rounded-xl" onClick={() => window.open(`mailto:${job.recruiterEmail}?subject=${encodeURIComponent(result.subject)}&body=${encodeURIComponent(result.body)}`)}><Send className="w-4 h-4" /> Send Now</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
