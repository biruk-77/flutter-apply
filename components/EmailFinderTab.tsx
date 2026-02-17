
import React, { useState, useEffect, useRef } from 'react';
import { findContactEmailsStream, generateColdEmail } from '../services/geminiService';
import { FoundEmail, UserProfile, GeneratedEmail } from '../types';
import { Button } from './ui/Button';
import { 
  Search, Mail, User, Copy, Check, Briefcase, Send, X, 
  Sparkles, Square, CheckSquare, ExternalLink, ChevronUp, 
  ChevronDown, Infinity as InfinityIcon, Loader2, Terminal,
  ClipboardList, ListChecks, Trash2
} from 'lucide-react';

interface EmailFinderTabProps {
  userProfile?: UserProfile;
}

export const EmailFinderTab: React.FC<EmailFinderTabProps> = ({ userProfile }) => {
  const [query, setQuery] = useState('Flutter Developer Hiring');
  const [strategy, setStrategy] = useState<'recruiters' | 'decision_makers' | 'active_hiring'>('active_hiring');
  const [location, setLocation] = useState('Remote');
  
  const [results, setResults] = useState<FoundEmail[]>([]);
  const resultsRef = useRef<FoundEmail[]>([]);
  const [expandedEmailIdx, setExpandedEmailIdx] = useState<number | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isInfinityMode, setIsInfinityMode] = useState(false);
  const stopSearchRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const searchIterationRef = useRef(0);

  const [selectedEmails, setSelectedEmails] = useState<FoundEmail[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [activeDraft, setActiveDraft] = useState<GeneratedEmail | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const handleSearch = async (e?: React.FormEvent, isAppend = false) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    stopSearchRef.current = false;
    
    // Determine the actual query to send (Base or Variation)
    let currentQuery = query;

    if (!isAppend) {
        // New Search Reset
        setResults([]); 
        resultsRef.current = [];
        setLogs(['Initializing Deep Search Agent...']);
        setSelectedEmails([]);
        searchIterationRef.current = 0;
    } else {
        // Infinity Mode: Rotate search terms to dig deeper
        setLogs(prev => [...prev, '--- Starting next Deep Search batch ---']);
        
        const modifiers = [
          " email contact",
          " hiring manager",
          " technical recruiter",
          " jobs",
          " talent acquisition",
          " engineering lead",
          " careers page",
          " github profile email",
          " linkedin summary email"
        ];
        
        // Cycle through modifiers based on iteration count
        const modifier = modifiers[searchIterationRef.current % modifiers.length];
        currentQuery = `${query} ${modifier}`;
        setLogs(prev => [...prev, `Applying search modifier: "${modifier.trim()}"`]);
        searchIterationRef.current++;
    }

    try {
      const excludeList = isAppend 
        ? resultsRef.current.map(r => r.name || r.company || '').filter(Boolean).slice(-50)
        : [];

      // Request slightly more results to allow for better filtering
      const stream = findContactEmailsStream(currentQuery, strategy, 15, location, excludeList);
      
      for await (const update of stream) {
        if (stopSearchRef.current) break;
        if (update.type === 'log') {
            setLogs(prev => [...prev.slice(-10), update.message]);
        } else if (update.type === 'result') {
            setResults(prev => {
                // Avoid duplicates based on email
                if (prev.some(e => e.email === update.data.email)) return prev;
                return [...prev, update.data];
            });
        }
      }
      
      // Handle Infinity logic
      if (isInfinityMode && !stopSearchRef.current) {
         setLogs(prev => [...prev, 'Analyzing results... Cooldown before next deep dive...']);
         // Wait 4 seconds before next batch to be polite and allow UI to settle
         setTimeout(() => handleSearch(undefined, true), 4000);
      } else {
        setIsSearching(false);
        setLogs(prev => [...prev, 'Search complete.']);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, "Search interrupted or failed."]);
      setIsSearching(false);
    }
  };

  const handleStop = () => {
    stopSearchRef.current = true;
    setIsInfinityMode(false);
    setIsSearching(false);
    setLogs(prev => [...prev, 'Stopping search agent...']);
  };

  const toggleSelect = (email: FoundEmail) => {
    if (selectedEmails.some(e => e.email === email.email)) {
      setSelectedEmails(prev => prev.filter(e => e.email !== email.email));
    } else {
      setSelectedEmails(prev => [...prev, email]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmails.length === results.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails([...results]);
    }
  };

  const copyEmailsOnly = () => {
    const list = selectedEmails.map(e => e.email).join(', ');
    navigator.clipboard.writeText(list);
    setLogs(prev => [...prev, `Copied ${selectedEmails.length} emails to clipboard.`]);
  };

  const copyFullDetails = () => {
    const list = selectedEmails.map(e => `${e.name || 'Unknown'} (${e.role} @ ${e.company}) - ${e.email}`).join('\n');
    navigator.clipboard.writeText(list);
    setLogs(prev => [...prev, `Copied details for ${selectedEmails.length} leads.`]);
  };

  const handleDraftSingle = async (recipient: FoundEmail) => {
    if (!userProfile?.name) {
      setLogs(prev => [...prev, 'Error: Profile incomplete.']);
      return;
    }
    setIsDrafting(true);
    setIsGeneratingDraft(true);
    setActiveDraft(null);
    try {
      const generated = await generateColdEmail(userProfile, recipient);
      setActiveDraft(generated);
    } catch (e) {
      setLogs(prev => [...prev, 'Failed to draft email.']);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const getBadgeColor = (type: FoundEmail['type']) => {
    switch (type) {
      case 'recruitment': return 'bg-green-100 text-green-700 border-green-200';
      case 'personal': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'general': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col relative pb-32">
      {/* Search Controls Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Lead Prospector & Infinity Finder
            </h2>
            <p className="text-sm text-slate-500">Auto-discover contacts and job posts from across the web.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsInfinityMode(!isInfinityMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-bold text-xs ${isInfinityMode ? 'bg-orange-500 border-orange-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}
            >
              <InfinityIcon className={`w-4 h-4 ${isInfinityMode ? 'animate-pulse' : ''}`} />
              Infinity Mode {isInfinityMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             {['active_hiring', 'recruiters', 'decision_makers'].map((s) => (
               <label key={s} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${strategy === s ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <input type="radio" name="strategy" checked={strategy === s} onChange={() => setStrategy(s as any)} className="hidden" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 capitalize">{s.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400">Targeting {s} strategy</span>
                  </div>
               </label>
             ))}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium" 
                placeholder="Search query (e.g. Flutter Engineer hiring)" 
              />
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="w-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium" 
                placeholder="Location" 
              />
              {isSearching ? (
                 <Button onClick={handleStop} variant="secondary" className="px-6 rounded-xl">Stop</Button>
              ) : (
                 <Button type="submit" className="px-8 rounded-xl shadow-blue-200">Search</Button>
              )}
            </div>
          </form>
          
          {logs.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs shadow-inner">
               <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 text-slate-500">
                  <Terminal className="w-3 h-3" />
                  <span>Agent Logs</span>
                  {isSearching && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
               </div>
               <div className="space-y-1 h-24 overflow-y-auto custom-scrollbar">
                  {logs.map((log, i) => (
                    <div key={i} className="text-slate-300">
                      <span className="text-green-500 mr-2 opacity-50">$</span>{log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Toolbar */}
      {results.length > 0 && (
        <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md py-3 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
              {selectedEmails.length === results.length ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
              Select All ({results.length})
            </button>
            {selectedEmails.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                {selectedEmails.length} Selected
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={copyEmailsOnly} 
              disabled={selectedEmails.length === 0}
              className="text-xs h-9 px-3 border-slate-300"
            >
              <Mail className="w-3.5 h-3.5" /> Copy Emails
            </Button>
            <Button 
              variant="outline" 
              onClick={copyFullDetails} 
              disabled={selectedEmails.length === 0}
              className="text-xs h-9 px-3 border-slate-300"
            >
              <ClipboardList className="w-3.5 h-3.5" /> Copy Details
            </Button>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results.map((email, idx) => {
          const selected = selectedEmails.some(e => e.email === email.email);
          const isExpanded = expandedEmailIdx === idx;
          return (
            <div 
              key={idx} 
              className={`group rounded-2xl border p-5 transition-all cursor-pointer ${selected ? 'bg-blue-50 border-blue-400 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
              onClick={() => toggleSelect(email)}
            >
              <div className="flex items-start gap-4">
                <div className="pt-1">
                  {selected ? <CheckSquare className="w-6 h-6 text-blue-600" /> : <Square className="w-6 h-6 text-slate-200 group-hover:text-slate-300 transition-colors" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-lg leading-none">{email.name || 'Professional Prospect'}</h3>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-tight ${getBadgeColor(email.type)}`}>
                          {email.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">{email.role}</span> at <span className="font-bold text-blue-600">{email.company}</span>
                      </p>
                    </div>
                    {email.source && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase">
                        via {email.source}
                      </span>
                    )}
                  </div>
                  
                  <div className={`mt-3 text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100 leading-relaxed relative ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {email.snippet || "No additional context found for this prospect."}
                    {!isExpanded && email.snippet && email.snippet.length > 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50/80 to-transparent pointer-events-none" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4 flex-wrap" onClick={e => e.stopPropagation()}>
                    <code className="text-[11px] bg-slate-100 border px-3 py-1.5 rounded-lg font-mono text-blue-700 font-bold">
                      {email.email}
                    </code>
                    
                    <div className="flex gap-2 ml-auto">
                        {email.sourceUrl && (
                          <a 
                            href={email.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" /> View Post
                          </a>
                        )}
                        <button 
                          onClick={() => setExpandedEmailIdx(isExpanded ? null : idx)} 
                          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                           {isExpanded ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Full Context</>}
                        </button>
                        <Button onClick={() => handleDraftSingle(email)} className="text-xs h-9 px-4 rounded-lg">Draft</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Draft Modal */}
      {isDrafting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                   <Sparkles className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-slate-900 leading-tight">AI Generated Pitch</h3>
                   <p className="text-xs text-slate-500">Tailored to prospect context</p>
                </div>
              </div>
              <button onClick={() => setIsDrafting(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {isGeneratingDraft ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-bold animate-pulse text-sm">Synthesizing personalized message...</p>
                </div>
              ) : activeDraft && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Subject Line</label>
                    <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 flex justify-between items-center">
                       {activeDraft.subject}
                       <button onClick={() => navigator.clipboard.writeText(activeDraft.subject)} className="text-slate-400 hover:text-blue-600 transition-colors"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Email Content</label>
                    <textarea 
                      defaultValue={activeDraft.body} 
                      className="w-full h-80 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all font-sans" 
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
               <Button variant="outline" className="px-6 rounded-xl" onClick={() => setIsDrafting(false)}>Close</Button>
               {activeDraft && (
                 <Button 
                    className="px-8 rounded-xl shadow-lg shadow-blue-200"
                    onClick={() => {
                        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${results.find(r => r.email)?.email}&su=${encodeURIComponent(activeDraft.subject)}&body=${encodeURIComponent(activeDraft.body)}`;
                        window.open(url, '_blank');
                    }}
                 >
                    <Send className="w-4 h-4" /> Open in Gmail
                 </Button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isSearching && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-400">
           <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-slate-100">
              <Mail className="w-10 h-10 opacity-20" />
           </div>
           <h3 className="text-lg font-bold text-slate-800">No leads discovered yet</h3>
           <p className="max-w-xs text-sm mt-2">Enter a query and toggle <strong>Infinity Mode</strong> to start your automated hiring search.</p>
        </div>
      )}
    </div>
  );
};
