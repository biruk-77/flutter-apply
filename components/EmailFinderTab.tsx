
import React, { useState, useEffect, useRef } from 'react';
import { findContactEmailsStream, generateColdEmail } from '../services/geminiService';
import { FoundEmail, UserProfile, GeneratedEmail } from '../types';
import { Button } from './ui/Button';
import { Search, Mail, User, Copy, Check, AlertCircle, Briefcase, Crown, Send, X, Edit, Sparkles, Square, CheckSquare, ChevronLeft, ChevronRight, AlertTriangle, MapPin, ArrowDown, Terminal, Loader2, Pause, Infinity as InfinityIcon, Flame, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';

interface EmailFinderTabProps {
  userProfile?: UserProfile;
}

export const EmailFinderTab: React.FC<EmailFinderTabProps> = ({ userProfile }) => {
  const [query, setQuery] = useState('');
  const [strategy, setStrategy] = useState<'recruiters' | 'decision_makers' | 'active_hiring'>('active_hiring');
  const [resultCount, setResultCount] = useState<number>(10);
  const [location, setLocation] = useState('');
  
  const [results, setResults] = useState<FoundEmail[]>([]);
  const resultsRef = useRef<FoundEmail[]>([]);
  const [expandedEmailIdx, setExpandedEmailIdx] = useState<number | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [isInfinityMode, setIsInfinityMode] = useState(false);
  const stopSearchRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [selectedEmails, setSelectedEmails] = useState<FoundEmail[]>([]);

  const [isDrafting, setIsDrafting] = useState(false);
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  const [draftsCache, setDraftsCache] = useState<Record<string, GeneratedEmail>>({});
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
    
    if (!isAppend) {
        setError(null);
        setResults([]); 
        resultsRef.current = [];
        setLogs(['Initializing search agent...']);
        setSelectedEmails([]);
    } else {
        setLogs(prev => [...prev, '--- Fetching next batch ---']);
    }

    try {
      const excludeList = isAppend 
        ? resultsRef.current.map(r => r.name || r.company || '').filter(Boolean).slice(-30)
        : [];

      const stream = findContactEmailsStream(query, strategy, resultCount, location, excludeList);
      
      for await (const update of stream) {
        if (stopSearchRef.current) break;
        if (update.type === 'log') {
            setLogs(prev => [...prev.slice(-4), update.message]);
        } else if (update.type === 'result') {
            setResults(prev => {
                if (prev.some(e => e.email === update.data.email)) return prev;
                return [...prev, update.data];
            });
        }
      }
      
      if (isInfinityMode && !stopSearchRef.current) {
         setTimeout(() => handleSearch(undefined, true), 1000);
      }
    } catch (err: any) {
      setError("Search interrupted.");
    } finally {
      if (!isInfinityMode || stopSearchRef.current) setIsSearching(false);
    }
  };

  const handleStop = () => {
    stopSearchRef.current = true;
    setIsSearching(false);
    setIsInfinityMode(false);
  };

  const toggleSelect = (email: FoundEmail) => {
    if (selectedEmails.some(e => e.email === email.email)) {
      setSelectedEmails(prev => prev.filter(e => e.email !== email.email));
    } else {
      setSelectedEmails(prev => [...prev, email]);
    }
  };

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
    if (!userProfile?.name) return alert("Complete profile first!");
    setSelectedEmails([recipient]);
    setDraftsCache({});
    setCurrentDraftIndex(0);
    setIsDrafting(true);
    generateDraftFor(recipient);
  };

  const getBadgeColor = (type: FoundEmail['type']) => {
    switch (type) {
      case 'recruitment': return 'bg-green-100 text-green-700 border-green-200';
      case 'personal': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'general': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const activeRecipient = selectedEmails[currentDraftIndex];
  const activeDraft = activeRecipient ? draftsCache[activeRecipient.email] : null;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col relative pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Direct Email Prospector
          </h2>
          <p className="text-sm text-slate-500 mt-1">Extract contact details and full context for active job postings.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
             {['active_hiring', 'recruiters', 'decision_makers'].map((s) => (
               <label key={s} className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${strategy === s ? 'border-blue-500 bg-blue-50 ring-1' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="strategy" checked={strategy === s} onChange={() => setStrategy(s as any)} className="hidden" />
                  <div className="capitalize">
                    <span className="block text-sm font-bold text-slate-700">{s.replace('_', ' ')}</span>
                  </div>
               </label>
             ))}
          </div>

          <form onSubmit={(e) => handleSearch(e)} className="space-y-3">
            <div className="flex gap-2">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 px-4 py-3 border rounded-lg outline-none" placeholder="Search query (e.g. Flutter Dev)" disabled={isSearching} />
              {isSearching ? (
                 <Button onClick={handleStop} variant="secondary">Stop</Button>
              ) : (
                 <Button type="submit">Search</Button>
              )}
            </div>
          </form>
          
          {(isSearching || logs.length > 0) && (
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs">
               <div className="space-y-1 h-20 overflow-y-auto custom-scrollbar flex flex-col justify-end">
                  {logs.map((log, i) => <div key={i} className="text-slate-300"><span className="text-blue-500 mr-2">➜</span>{log}</div>)}
                  <div ref={logsEndRef} />
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {results.map((email, idx) => {
          const selected = selectedEmails.some(e => e.email === email.email);
          const isExpanded = expandedEmailIdx === idx;
          return (
            <div key={idx} className={`rounded-xl border p-4 transition-all ${selected ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200'}`} onClick={() => toggleSelect(email)}>
              <div className="flex items-start gap-4">
                <div className="pt-1">{selected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-300" />}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{email.name || 'Unknown'} <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${getBadgeColor(email.type)}`}>{email.type}</span></h3>
                      <p className="text-sm text-slate-600">{email.role} at <span className="font-bold">{email.company}</span></p>
                    </div>
                    {email.source && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border">via {email.source}</span>}
                  </div>
                  
                  <div className={`text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {email.snippet || "No description available."}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <code className="text-xs bg-white border px-2 py-1 rounded font-mono">{email.email}</code>
                    <div className="flex gap-2 ml-auto" onClick={e => e.stopPropagation()}>
                        {email.sourceUrl && (
                          <a href={email.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" /> Apply / View Post
                          </a>
                        )}
                        <Button variant="outline" onClick={() => setExpandedEmailIdx(isExpanded ? null : idx)} className="text-[10px] py-1 px-2 h-auto">
                           {isExpanded ? 'Show Less' : 'Full Context'}
                        </Button>
                        <Button onClick={() => handleDraftSingle(email)} className="text-[10px] py-1 px-3 h-auto">Draft Email</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isDrafting && activeRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Draft for {activeRecipient.name}</h3>
              <button onClick={() => setIsDrafting(false)} className="p-1 hover:bg-slate-200 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {isGeneratingDraft ? <div className="text-center py-20 animate-pulse">Crafting email...</div> : (
                <>
                  <input type="text" value={activeDraft?.subject} className="w-full p-2 border rounded font-bold" />
                  <textarea value={activeDraft?.body} className="w-full h-64 p-3 border rounded text-sm leading-relaxed" />
                </>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
               <Button variant="secondary" onClick={() => setIsDrafting(false)}>Close</Button>
               <Button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${activeRecipient.email}&su=${encodeURIComponent(activeDraft?.subject || '')}&body=${encodeURIComponent(activeDraft?.body || '')}`, '_blank')}>Open in Gmail</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
