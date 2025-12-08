
import React, { useState } from 'react';
import { UserProfile, JobDetails, GeneratedEmail, JobListing } from '../types';
import { generateApplicationEmail, searchJobs } from '../services/geminiService';
import { Button } from './ui/Button';
import { Mail, Sparkles, Copy, Send, Search, MapPin, Globe, Briefcase, ArrowDown, ExternalLink } from 'lucide-react';

interface GeneratorTabProps {
  userProfile: UserProfile;
}

export const GeneratorTab: React.FC<GeneratorTabProps> = ({ userProfile }) => {
  // Search State
  const [searchQuery, setSearchQuery] = useState('Flutter Developer');
  const [searchResults, setSearchResults] = useState<JobListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(true);

  // Generation State
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
      jobDescription: listing.snippet + (listing.url ? `\n\nJob Link: ${listing.url}` : ''),
      hiringManagerName: ''
    });
    setShowSearch(false); // Collapse search to focus on form
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
      setError("Failed to generate email. Please check your network and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMailtoLink = () => {
    if (!result) return '#';
    const subject = encodeURIComponent(result.subject);
    const body = encodeURIComponent(result.body);
    const email = job.recruiterEmail || '';
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Column: Search & Input */}
      <div className="flex flex-col gap-6">
        
        {/* Search Section */}
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

              {/* Search Results */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {searchResults.map((listing, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{listing.title}</h4>
                        <p className="text-xs text-slate-500 font-medium">{listing.company}</p>
                      </div>
                      {listing.email && (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Mail className="w-3 h-3" /> EMAIL FOUND
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                       <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {listing.location || 'Remote'}</span>
                       {listing.url && <a href={listing.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600"><Globe className="w-3 h-3" /> Link</a>}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                      {listing.snippet}
                    </p>

                    <Button variant="outline" onClick={() => selectJob(listing)} className="w-full text-xs py-1.5 h-auto">
                      Draft Application
                    </Button>
                  </div>
                ))}
                {searchResults.length === 0 && !isSearching && (
                  <p className="text-center text-xs text-slate-400 py-4">Search for jobs to see listings here.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manual Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Job Details
          </h2>
          <form onSubmit={handleGenerate} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</label>
                  <input
                    required
                    type="text"
                    name="companyName"
                    value={job.companyName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="e.g. TechCorp"
                  />
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Title</label>
                  <input
                    required
                    type="text"
                    name="jobTitle"
                    value={job.jobTitle}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Flutter Engineer"
                  />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hiring Manager (Opt)</label>
                  <input
                    type="text"
                    name="hiringManagerName"
                    value={job.hiringManagerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="e.g. John Smith"
                  />
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Email</label>
                  <div className="relative">
                    <input
                        type="email"
                        name="recruiterEmail"
                        value={job.recruiterEmail}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${job.recruiterEmail ? 'border-green-300 bg-green-50' : 'border-slate-300'}`}
                        placeholder="jobs@company.com"
                    />
                     {job.recruiterEmail && <Mail className="w-4 h-4 text-green-600 absolute right-3 top-2.5" />}
                  </div>
                </div>
             </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Description / Snippet</label>
              <textarea
                required
                name="jobDescription"
                value={job.jobDescription}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed"
                placeholder="Paste the full job description here..."
              />
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

            <Button type="submit" isLoading={isGenerating} className="w-full">
              <Sparkles className="w-4 h-4" />
              Generate Email
            </Button>
          </form>
        </div>
      </div>

      {/* Right Column: Output Section */}
      <div className="flex flex-col gap-6">
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col ${!result ? 'justify-center items-center' : ''}`}>
          
          {!result && !isGenerating && (
            <div className="text-center text-slate-400">
              <div className="bg-slate-50 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                 <Mail className="w-8 h-8 opacity-40" />
              </div>
              <p className="font-medium text-slate-600">Ready to Draft</p>
              <p className="text-sm mt-1">Select a job from search or enter details manually.</p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center text-slate-500 animate-pulse">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-400" />
              <p className="font-medium">Crafting your application...</p>
              <p className="text-sm mt-1">Analyzing fit and tone...</p>
            </div>
          )}

          {result && (
            <>
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                <div className="space-y-1 w-full mr-4">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">SUBJECT</span>
                   </div>
                   <h3 className="text-lg font-medium text-slate-900 leading-snug">{result.subject}</h3>
                </div>
                <button 
                  onClick={() => copyToClipboard(result.subject)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy Subject"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-6 pr-2">
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white pb-2">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">BODY</span>
                </div>
                <div className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed font-normal font-sans p-4 bg-slate-50 rounded-lg border border-slate-100">
                  {result.body}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <Button 
                   variant="secondary" 
                   onClick={() => copyToClipboard(result.body)}
                   className="flex-1"
                >
                  <Copy className="w-4 h-4" />
                  Copy Body
                </Button>
                <a 
                  href={getMailtoLink()}
                  className={`flex-1 ${!job.recruiterEmail ? 'pointer-events-none opacity-50' : ''}`}
                >
                   <Button variant="primary" className="w-full">
                     <Send className="w-4 h-4" />
                     Send Email
                   </Button>
                </a>
              </div>
              {!job.recruiterEmail ? (
                 <p className="text-xs text-center text-amber-500 mt-3 flex items-center justify-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                   Target email missing. AI couldn't find it automatically.
                 </p>
              ) : (
                  <p className="text-xs text-center text-green-600 mt-3 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Target email found! Ready to send.
                  </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
