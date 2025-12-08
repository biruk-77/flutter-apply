
import React, { useState, useEffect, useRef } from 'react';
import { findContactEmailsStream, generateColdEmail } from '../services/geminiService';
import { FoundEmail, UserProfile, GeneratedEmail } from '../types';
import { Button } from './ui/Button';
import { Search, Mail, User, Copy, Check, AlertCircle, Briefcase, Crown, Send, X, Edit, Sparkles, Square, CheckSquare, ChevronLeft, ChevronRight, AlertTriangle, MapPin, ArrowDown, Terminal, Loader2, Pause, Infinity as InfinityIcon, Flame } from 'lucide-react';

interface EmailFinderTabProps {
  userProfile?: UserProfile;
}

export const EmailFinderTab: React.FC<EmailFinderTabProps> = ({ userProfile }) => {
  const [query, setQuery] = useState('');
  const [strategy, setStrategy] = useState<'recruiters' | 'decision_makers' | 'active_hiring'>('active_hiring');
  const [resultCount, setResultCount] = useState<number>(10);
  const [location, setLocation] = useState('');
  
  const [results, setResults] = useState<FoundEmail[]>([]);
  // We use a ref to track results for the exclusion logic, so it's accessible inside the async loop closures
  const resultsRef = useRef<FoundEmail[]>([]);

  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Streaming & Infinity State
  const [logs, setLogs] = useState<string[]>([]);
  const [isInfinityMode, setIsInfinityMode] = useState(false);
  const stopSearchRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Selection State
  const [selectedEmails, setSelectedEmails] = useState<FoundEmail[]>([]);

  // Draft State
  const [isDrafting, setIsDrafting] = useState(false);
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  const [draftsCache, setDraftsCache] = useState<Record<string, GeneratedEmail>>({});
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Sync ref with state
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const handleSearch = async (e?: React.FormEvent, isAppend = false) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    stopSearchRef.current = false;
    
    if (!isAppend) {
        setError(null);
        setResults([]); 
        resultsRef.current = []; // Clear ref as well
        setLogs(['Initializing search agent...']);
        setSelectedEmails([]);
    } else {
        setLogs(prev => [...prev, '--- Fetching next batch ---']);
    }

    try {
      // Build exclusion list from current results to avoid duplicates
      // Take the last 30 items to give context to the AI without bloating tokens
      const excludeList = isAppend 
        ? resultsRef.current.map(r => r.name || r.company || '').filter(Boolean).slice(-30)
        : [];

      const stream = findContactEmailsStream(query, strategy, resultCount, location, excludeList);
      
      for await (const update of stream) {
        if (stopSearchRef.current) break;

        if (update.type === 'log') {
            setLogs(prev => [...prev.slice(-4), update.message]); // Keep last 5 logs
        } else if (update.type === 'result') {
            setResults(prev => {
                // Deduplicate on client side as a safety net
                if (prev.some(e => e.email === update.data.email)) return prev;
                return [...prev, update.data];
            });
        }
      }
      
      if (stopSearchRef.current) {
         setLogs(prev => [...prev, 'Search stopped by user.']);
      } else if (isInfinityMode) {
         // Infinity Mode Loop
         if (!stopSearchRef.current) {
            setLogs(prev => [...prev, 'Batch complete. Auto-restarting...']);
            setTimeout(() => handleSearch(undefined, true), 1000); // Small delay then recurse
         }
      } else {
         setLogs(prev => [...prev, 'Search complete.']);
      }

    } catch (err: any) {
      console.error(err);
      
      if (err.message && (err.message.includes("Limit Reached") || err.message.includes("Quota"))) {
        setError(err.message);
        handleStop(); // Force stop infinity mode
      } else {
        setError("Search interrupted. Please try again.");
      }
    } finally {
      if (!isInfinityMode || stopSearchRef.current) {
         setIsSearching(false);
      }
    }
  };

  const handleStop = () => {
    stopSearchRef.current = true;
    setIsSearching(false);
    setIsInfinityMode(false);
  };

  const toggleInfinity = () => {
    setIsInfinityMode(!isInfinityMode);
    // If we enable infinity while not searching, we don't auto start. 
    // If we disable infinity while searching, the current loop will finish and then stop (handled in handleSearch).
  };

  // --- Selection Logic ---

  const toggleSelectAll = () => {
    if (selectedEmails.length === results.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails([...results]);
    }
  };

  const toggleSelect = (email: FoundEmail) => {
    if (selectedEmails.some(e => e.email === email.email)) {
      setSelectedEmails(prev => prev.filter(e => e.email !== email.email));
    } else {
      setSelectedEmails(prev => [...prev, email]);
    }
  };

  const isSelected = (email: FoundEmail) => selectedEmails.some(e => e.email === email.email);

  // --- Drafting Logic ---

  const generateDraftFor = async (recipient: FoundEmail) => {
    if (!userProfile || !userProfile.name) return;
    
    if (draftsCache[recipient.email]) return;

    setIsGeneratingDraft(true);
    try {
      const generated = await generateColdEmail(userProfile, recipient);
      setDraftsCache(prev => ({ ...prev, [recipient.email]: generated }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleDraftSingle = (recipient: FoundEmail) => {
     if (!userProfile || !userProfile.name) {
      alert("Please complete your profile in the 'Profile' tab first!");
      return;
    }
    setSelectedEmails([recipient]);
    startBatchDraft([recipient]);
  };

  const startBatchDraft = (overrideSelection?: FoundEmail[]) => {
    const targetList = overrideSelection || selectedEmails;
    if (targetList.length === 0) return;
    
    if (!userProfile || !userProfile.name) {
      alert("Please complete your profile in the 'Profile' tab first!");
      return;
    }

    setDraftsCache({});
    setCurrentDraftIndex(0);
    setIsDrafting(true);
    generateDraftFor(targetList[0]);
  };

  const handleNavigateDraft = (direction: 1 | -1) => {
    const newIndex = currentDraftIndex + direction;
    if (newIndex >= 0 && newIndex < selectedEmails.length) {
      setCurrentDraftIndex(newIndex);
      const nextRecipient = selectedEmails[newIndex];
      if (!draftsCache[nextRecipient.email]) {
        generateDraftFor(nextRecipient);
      }
    }
  };

  const closeDraftModal = () => {
    setIsDrafting(false);
    setDraftsCache({});
    setCurrentDraftIndex(0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copySelectedEmails = () => {
    const text = selectedEmails.map(e => e.email).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedEmail('all');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const openGmail = () => {
    const activeRecipient = selectedEmails[currentDraftIndex];
    const draft = draftsCache[activeRecipient?.email];
    
    if (!draft || !activeRecipient) return;
    const to = activeRecipient.email;
    const sub = encodeURIComponent(draft.subject);
    const body = encodeURIComponent(draft.body);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${sub}&body=${body}`, '_blank');
  };

  // --- Render Helpers ---

  const getBadgeColor = (type: FoundEmail['type']) => {
    switch (type) {
      case 'recruitment': return 'bg-green-100 text-green-700 border-green-200';
      case 'personal': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'general': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getIcon = (type: FoundEmail['type'], role?: string) => {
    const lowerRole = role?.toLowerCase() || '';
    if (lowerRole.includes('ceo') || lowerRole.includes('founder') || lowerRole.includes('owner')) {
      return <Crown className="w-5 h-5" />;
    }
    if (type === 'personal') return <User className="w-5 h-5" />;
    if (type === 'recruitment') return <Briefcase className="w-5 h-5" />;
    return <Mail className="w-5 h-5" />;
  };

  const activeRecipient = selectedEmails[currentDraftIndex];
  const activeDraft = activeRecipient ? draftsCache[activeRecipient.email] : null;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col relative pb-24">
      
      {/* Search Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Live Email Finder
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time streaming search. Finds emails one by one.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
             <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${strategy === 'active_hiring' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:border-slate-300'}`}>
                <input 
                  type="radio" 
                  name="strategy" 
                  checked={strategy === 'active_hiring'} 
                  onChange={() => setStrategy('active_hiring')}
                  className="hidden"
                />
                <div className={`p-2 rounded-full ${strategy === 'active_hiring' ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className={`block text-sm font-bold ${strategy === 'active_hiring' ? 'text-amber-900' : 'text-slate-700'}`}>Hiring Now</span>
                  <span className="text-xs text-slate-500">Urgent searches, "Hiring" posts</span>
                </div>
             </label>

             <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${strategy === 'recruiters' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'}`}>
                <input 
                  type="radio" 
                  name="strategy" 
                  checked={strategy === 'recruiters'} 
                  onChange={() => setStrategy('recruiters')}
                  className="hidden"
                />
                <div className={`p-2 rounded-full ${strategy === 'recruiters' ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className={`block text-sm font-semibold ${strategy === 'recruiters' ? 'text-blue-900' : 'text-slate-700'}`}>Recruiters</span>
                  <span className="text-xs text-slate-500">HR, Talent, Hiring Managers</span>
                </div>
             </label>

             <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${strategy === 'decision_makers' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 hover:border-slate-300'}`}>
                <input 
                  type="radio" 
                  name="strategy" 
                  checked={strategy === 'decision_makers'} 
                  onChange={() => setStrategy('decision_makers')}
                  className="hidden"
                />
                <div className={`p-2 rounded-full ${strategy === 'decision_makers' ? 'bg-purple-200 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <span className={`block text-sm font-semibold ${strategy === 'decision_makers' ? 'text-purple-900' : 'text-slate-700'}`}>Founders</span>
                  <span className="text-xs text-slate-500">CEOs, CTOs, Owners</span>
                </div>
             </label>
          </div>

          <form onSubmit={(e) => handleSearch(e)} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm placeholder:text-slate-400"
                  placeholder={strategy === 'active_hiring' ? "e.g. Flutter Developer (Finds people hiring NOW)" : "e.g. Flutter, Fintech Startups, or Tim Cook"}
                  disabled={isSearching}
                />
                {query && !isSearching && (
                  <button 
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {isSearching ? (
                 <Button type="button" onClick={handleStop} variant="secondary" className="px-6 bg-red-100 text-red-700 border-red-200 hover:bg-red-200">
                    <Pause className="w-4 h-4 mr-2" /> Stop
                 </Button>
              ) : (
                 <Button type="submit" className="px-6 whitespace-nowrap">
                    <Search className="w-4 h-4 mr-2" /> Search
                 </Button>
              )}
            </div>
            
            {/* Filters & Infinity Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
               <div className="relative flex-1 min-w-[140px]">
                 <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                 <input 
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Location"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    disabled={isSearching}
                 />
               </div>
               
               <div className="relative">
                 <select 
                    value={resultCount}
                    onChange={(e) => setResultCount(Number(e.target.value))}
                    className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-slate-900"
                    disabled={isSearching}
                 >
                   <option value={10}>10 Batch</option>
                   <option value={25}>25 Batch</option>
                   <option value={50}>50 Batch</option>
                 </select>
                 <ArrowDown className="absolute right-3 top-3 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>

               <div className="h-8 w-px bg-slate-300 mx-1"></div>

               <button
                 type="button"
                 onClick={toggleInfinity}
                 className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                   isInfinityMode 
                     ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' 
                     : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                 }`}
               >
                 <InfinityIcon className={`w-4 h-4 ${isInfinityMode ? 'animate-spin-slow' : ''}`} />
                 Infinity Mode
               </button>
            </div>
          </form>
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Live Terminal */}
          {(isSearching || logs.length > 0) && (
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs shadow-inner">
               <div className="flex items-center gap-2 text-slate-400 mb-2 pb-2 border-b border-slate-800">
                  <Terminal className="w-3 h-3" />
                  <span>AI Agent Logs</span>
                  {isSearching && <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-auto" />}
               </div>
               <div className="space-y-1 h-24 overflow-y-auto custom-scrollbar flex flex-col justify-end">
                  {logs.length === 0 && <span className="text-slate-600 italic">Ready to search...</span>}
                  {logs.map((log, i) => (
                    <div key={i} className="text-slate-300 break-words animate-in slide-in-from-left-2 duration-200">
                       <span className="text-blue-500 mr-2">➜</span>
                       {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
               </div>
            </div>
          )}

        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        
        {results.length > 0 && (
          <div className="flex items-center justify-between px-2 mb-2">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              {selectedEmails.length === results.length && results.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-slate-300" />
              )}
              Select All ({results.length})
            </button>
            <span className="text-xs text-slate-400">
              {selectedEmails.length} selected
            </span>
          </div>
        )}

        {results.map((email, idx) => {
          const selected = isSelected(email);
          const isPattern = email.source?.toLowerCase().includes('pattern');
          
          return (
            <div 
              key={idx} 
              className={`rounded-xl shadow-sm border p-4 transition-all group flex items-start gap-4 cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500
                ${selected ? 'bg-blue-50/50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-slate-200 hover:border-blue-300'}
              `}
              onClick={() => toggleSelect(email)}
            >
              <div className="pt-1 flex-shrink-0">
                 {selected ? (
                   <CheckSquare className="w-5 h-5 text-blue-600" />
                 ) : (
                   <Square className="w-5 h-5 text-slate-300 group-hover:text-blue-400" />
                 )}
              </div>

              <div className="flex-1 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${getBadgeColor(email.type)} bg-opacity-50`}>
                    {getIcon(email.type, email.role)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      {email.name || 'Unknown Name'}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${getBadgeColor(email.type)}`}>
                        {email.type}
                      </span>
                    </h3>
                    
                    <p className="text-sm text-slate-600 font-medium flex items-center flex-wrap gap-1">
                      {email.role} <span className="text-slate-400">at</span> {email.company}
                      {email.industry && <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">• {email.industry}</span>}
                    </p>

                    {email.snippet && (
                        <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-200 pl-2">
                            "{email.snippet}"
                        </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                      <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-sm font-mono border border-slate-200 select-all">
                        {email.email}
                      </code>
                      <button 
                        onClick={() => { copyToClipboard(email.email); setCopiedEmail(email.email); setTimeout(() => setCopiedEmail(null), 1000); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-blue-600 transition-colors"
                        title="Copy Email"
                      >
                        {copiedEmail === email.email ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                        {email.source && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {email.source}
                          </p>
                        )}
                        {isPattern && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Unverified Pattern
                          </p>
                        )}
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={(e) => { e.stopPropagation(); handleDraftSingle(email); }}
                  className="hidden sm:flex"
                >
                  Draft Email
                </Button>
              </div>
            </div>
          );
        })}

        {results.length > 0 && !isSearching && !isInfinityMode && (
           <div className="pt-4 flex justify-center pb-8">
              <Button onClick={() => handleSearch(undefined, true)} variant="outline" className="w-full sm:w-auto px-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300">
                <ArrowDown className="w-4 h-4" /> 
                Load More Results
              </Button>
           </div>
        )}

        {results.length === 0 && !isSearching && !error && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Ready to search. Try "Infinity Mode" for continuous results.</p>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedEmails.length > 0 && !isDrafting && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-full shadow-xl flex items-center gap-2 z-40 animate-in slide-in-from-bottom-5">
           <div className="pl-4 pr-2 font-medium text-sm border-r border-slate-700">
             {selectedEmails.length} selected
           </div>
           
           <button 
             onClick={copySelectedEmails}
             className="px-4 py-2 hover:bg-slate-800 rounded-full flex items-center gap-2 text-sm font-medium transition-colors"
           >
             {copiedEmail === 'all' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
             Copy Emails
           </button>

           <button 
             onClick={() => startBatchDraft()}
             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center gap-2 text-sm font-medium transition-colors shadow-lg"
           >
             <Edit className="w-4 h-4" />
             Draft Emails
           </button>
        </div>
      )}

      {/* Drafting Modal / Overlay */}
      {isDrafting && activeRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                 {/* Navigation Controls */}
                 {selectedEmails.length > 1 && (
                   <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 mr-2">
                      <button 
                        disabled={currentDraftIndex === 0}
                        onClick={() => handleNavigateDraft(-1)}
                        className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <span className="text-xs font-mono w-12 text-center text-slate-500">
                        {currentDraftIndex + 1} / {selectedEmails.length}
                      </span>
                      <button 
                        disabled={currentDraftIndex === selectedEmails.length - 1}
                        onClick={() => handleNavigateDraft(1)}
                        className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                   </div>
                 )}

                 <div>
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                       To: {activeRecipient.name || 'Unknown'} 
                       <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded uppercase">{activeRecipient.type}</span>
                    </h3>
                    <p className="text-xs text-slate-500">{activeRecipient.email}</p>
                 </div>
              </div>

              <button 
                onClick={closeDraftModal}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {isGeneratingDraft ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                  <Sparkles className="w-10 h-10 mb-4 text-blue-400 animate-pulse" />
                  <p className="font-medium">AI is crafting email for {activeRecipient.name}...</p>
                </div>
              ) : activeDraft ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Subject</label>
                    <div className="flex gap-2">
                       <input 
                          type="text" 
                          value={activeDraft.subject}
                          onChange={(e) => setDraftsCache(prev => ({...prev, [activeRecipient.email]: {...activeDraft, subject: e.target.value}}))}
                          className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                       <button 
                        onClick={() => copyToClipboard(activeDraft.subject)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                       >
                         <Copy className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Body</label>
                    <div className="relative">
                      <textarea 
                        value={activeDraft.body}
                        onChange={(e) => setDraftsCache(prev => ({...prev, [activeRecipient.email]: {...activeDraft, body: e.target.value}}))}
                        className="w-full h-64 px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-sans text-sm leading-relaxed"
                      />
                      <button 
                        onClick={() => copyToClipboard(activeDraft.body)}
                        className="absolute right-2 top-2 p-2 text-slate-400 hover:text-blue-600 bg-white/50 hover:bg-white rounded-lg transition-all"
                        title="Copy Body"
                      >
                         <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p>Failed to load draft.</p>
                 </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
              <span className="text-xs text-slate-400 hidden sm:inline-block">
                 {selectedEmails.length > 1 ? 'Review all drafts before sending.' : 'Review draft before sending.'}
              </span>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={closeDraftModal}>
                   Close
                </Button>
                <Button onClick={openGmail} disabled={!activeDraft}>
                  <Send className="w-4 h-4" />
                  Open in Gmail
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
