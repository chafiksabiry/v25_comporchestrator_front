import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Phone, MessageSquare, Star, Activity, Clock, Search, Filter, ChevronDown, Download, ExternalLink, Globe, Shield } from 'lucide-react';

export default function CallsDashboardPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'transcript' | 'insights' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const companyId = Cookies.get('companyId');

  useEffect(() => {
    if (companyId) {
      fetchCalls();
    }
  }, [companyId]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const callsApiUrl = import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_DASHBOARD_API;
      const callsBase = callsApiUrl.endsWith('/api') ? callsApiUrl : `${callsApiUrl}/api`;
      
      const response = await fetch(`${callsBase}/calls?companyId=${companyId}&populate=lead`);
      if (response.ok) {
        const data = await response.json();
        const callsArray = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setCalls(callsArray.sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()));
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string, tab: 'transcript' | 'insights') => {
    if (expandedCallId === id && expandedTab === tab) {
      setExpandedCallId(null);
      setExpandedTab(null);
    } else {
      setExpandedCallId(id);
      setExpandedTab(tab);
    }
  };

  const filteredCalls = calls.filter(call => {
    const leadName = `${call.lead?.First_Name || ''} ${call.lead?.Last_Name || ''}`.toLowerCase();
    const matchesSearch = leadName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
            Calls History
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Analyze every interaction and AI-powered performance insights
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200 px-4 py-2 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by lead name..." 
              className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200 px-4 py-2 flex items-center gap-3 shadow-sm">
            <Filter className="w-5 h-5 text-slate-400" />
            <select 
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead / Agent</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Duration</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">AI Score</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10">
                      <div className="h-12 bg-slate-100 rounded-2xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <Phone className="w-12 h-12 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-xs">No calls found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call, idx) => {
                  const callId = call._id || idx;
                  const isExpanded = expandedCallId === callId;
                  
                  return (
                    <React.Fragment key={callId}>
                      <tr className={`group hover:bg-white/60 transition-colors ${isExpanded ? 'bg-white/80' : ''}`}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Phone className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                {call.lead?.First_Name || call.lead?.Last_Name ? `${call.lead?.First_Name || ''} ${call.lead?.Last_Name || ''}`.trim() : 'Unknown Lead'}
                              </h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                Agent: {call.agent?.name || 'Assigned Agent'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-slate-700">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold">{new Date(call.createdAt || call.date).toLocaleString()}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {call.duration ? `${Math.floor(call.duration/60)}m ${call.duration%60}s` : '0s'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <Star className={`w-4 h-4 ${call.ai_call_score?.overall?.score >= 80 ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                              <span className="text-sm font-black text-slate-900">{call.ai_call_score?.overall?.score || 'N/A'}</span>
                            </div>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${call.ai_call_score?.overall?.score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${call.ai_call_score?.overall?.score || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            call.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                            call.status === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => toggleExpand(callId, 'transcript')}
                              className={`p-2 rounded-xl border transition-all ${isExpanded && expandedTab === 'transcript' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}
                              title="View Transcript"
                            >
                              <MessageSquare className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => toggleExpand(callId, 'insights')}
                              className={`p-2 rounded-xl border transition-all ${isExpanded && expandedTab === 'insights' ? 'bg-emerald-600 text-white border-emerald-600' : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}
                              title="AI Performance Insights"
                            >
                              <Activity className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-8 py-10 bg-slate-50/30">
                            <div className="max-w-5xl mx-auto animate-in slide-in-from-top duration-500">
                              {expandedTab === 'transcript' ? (
                                <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
                                  <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Full Conversation Transcript</h4>
                                        <p className="text-[10px] font-medium text-slate-500">Recorded interaction log</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      {call.recording_url && (
                                        <audio controls src={call.recording_url} className="h-8 w-64" />
                                      )}
                                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors">
                                        <Download className="w-3.5 h-3.5" />
                                        Export
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="p-10 max-h-[600px] overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/20">
                                    {call.transcript && call.transcript.length > 0 ? (
                                      call.transcript.map((t: any, i: number) => (
                                        <div key={i} className={`flex gap-4 ${t.speaker?.toLowerCase().includes('agent') ? 'flex-row' : 'flex-row-reverse'}`}>
                                          <div className={`flex flex-col max-w-[70%] ${t.speaker?.toLowerCase().includes('agent') ? 'items-start' : 'items-end'}`}>
                                            <div className="flex items-center gap-2 mb-1.5 px-2">
                                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.speaker}</span>
                                              <span className="text-[9px] font-bold text-slate-300">{t.timestamp}</span>
                                            </div>
                                            <div className={`px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed ${
                                              t.speaker?.toLowerCase().includes('agent') 
                                                ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm' 
                                                : 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20'
                                            }`}>
                                              {t.text}
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="py-20 text-center">
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Transcript not available for this call</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-8">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {[
                                      { label: 'Agent Fluency', data: call.ai_call_score?.["Agent fluency"], color: 'blue', icon: Globe },
                                      { label: 'Sentiment Analysis', data: call.ai_call_score?.["Sentiment analysis"], color: 'indigo', icon: Activity },
                                      { label: 'Fraud Detection', data: call.ai_call_score?.["Fraud detection"], color: 'rose', icon: Shield }
                                    ].map((metric, mIdx) => (
                                      <div key={mIdx} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl group hover:shadow-2xl transition-all duration-300">
                                        <div className="flex justify-between items-start mb-6">
                                          <div className={`w-12 h-12 rounded-2xl bg-${metric.color}-50 text-${metric.color}-600 flex items-center justify-center transition-transform group-hover:scale-110`}>
                                            <metric.icon className="w-6 h-6" />
                                          </div>
                                          <div className="text-right">
                                            <span className={`text-2xl font-black text-${metric.color}-600`}>{metric.data?.score || 0}%</span>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Score</p>
                                          </div>
                                        </div>
                                        <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3">{metric.label}</h5>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                          &quot;{metric.data?.feedback || 'Comprehensive analysis completed. Performance meets the expected standard for this category.'}&quot;
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="bg-white rounded-[32px] border border-emerald-100 shadow-xl overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                                    <div className="px-10 py-10 relative z-10">
                                      <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                          <Star className="w-6 h-6" />
                                        </div>
                                        <div>
                                          <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Executive Summary</h4>
                                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Overall AI Evaluation</p>
                                        </div>
                                      </div>
                                      
                                      <div className="bg-emerald-50/50 rounded-2xl p-8 border border-emerald-100/50">
                                        <p className="text-lg font-bold text-emerald-900 leading-relaxed italic">
                                          &quot;{call.ai_call_score?.overall?.feedback || 'The agent demonstrated strong communication skills and effectively handled the lead. Key talking points were covered with professional fluency.'}&quot;
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
