import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Phone, MessageSquare, Star, Activity as ActivityIcon, Clock, Search, Filter, ChevronDown, Download, ExternalLink, Globe, Shield, X, Check, TrendingUp, Brain } from 'lucide-react';
import { PremiumAudioPlayer } from '../components/PremiumAudioPlayer';

export default function CallsDashboardPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'insights'>('transcript');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDropdownId, setOpenDropdownId] = useState<{ callId: string; type: 'validation' | 'transaction' } | null>(null);

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

  const openCallDetails = (call: any, tab: 'transcript' | 'insights') => {
    setSelectedCall(call);
    setActiveTab(tab);
  };

  const handleUpdateValidation = async (callId: string, currentStatus: string, clickedStatus: string) => {
    try {
      const status = currentStatus === clickedStatus ? 'pending' : clickedStatus;
      const callsApiUrl = import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_DASHBOARD_API;
      const callsBase = callsApiUrl.endsWith('/api') ? callsApiUrl : `${callsApiUrl}/api`;

      const response = await fetch(`${callsBase}/calls/${callId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyValidation: status }),
      });

      if (response.ok) {
        setCalls(prevCalls => prevCalls.map(c => c._id === callId ? { ...c, companyValidation: status } : c));
        setSelectedCall((prev: any) => prev && prev._id === callId ? { ...prev, companyValidation: status } : prev);
      }
    } catch (error) {
      console.error('Error updating call validation status:', error);
    }
  };

  const handleUpdateTransactionValidation = async (callId: string, currentStatus: boolean | null, clickedStatus: boolean) => {
    try {
      const status = currentStatus === clickedStatus ? null : clickedStatus;
      const callsApiUrl = import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_DASHBOARD_API;
      const callsBase = callsApiUrl.endsWith('/api') ? callsApiUrl : `${callsApiUrl}/api`;

      const response = await fetch(`${callsBase}/calls/${callId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 'transaction.validByCompany': status }),
      });

      if (response.ok) {
        setCalls(prevCalls => prevCalls.map(c => {
          if (c._id === callId) {
            const updatedTx = c.transaction
              ? { ...c.transaction, validByCompany: status }
              : { validByCompany: status, validByReps: null };
            return { ...c, transaction: updatedTx };
          }
          return c;
        }));
        setSelectedCall((prev: any) => {
          if (prev && prev._id === callId) {
            const updatedTx = prev.transaction
              ? { ...prev.transaction, validByCompany: status }
              : { validByCompany: status, validByReps: null };
            return { ...prev, transaction: updatedTx };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error updating transaction validation:', error);
    }
  };

  const filteredCalls = calls.filter(call => {
    const leadName = `${call.lead?.First_Name || ''} ${call.lead?.Last_Name || ''}`.toLowerCase();
    const matchesSearch = leadName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 relative">
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

      <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-2xl shadow-slate-200/40 h-[calc(100vh-320px)] flex flex-col overflow-hidden min-h-[400px]">
        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 bg-white rounded-3xl border border-slate-100/80 shadow-sm animate-pulse flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 rounded-md w-36"></div>
                      <div className="flex gap-2">
                        <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                        <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-md w-28 mt-1"></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 xl:gap-6">
                    <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                    <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                    <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                <Phone className="w-10 h-10 text-slate-300 opacity-40" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">No calls found</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                No call records were found matching your filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCalls.map((call, idx) => {
                const callId = call._id || idx;
                return (
                  <div
                    key={callId}
                    className="p-6 bg-white rounded-3xl border border-slate-100/80 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                          <Phone className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm tracking-tight">
                            {call.lead?.First_Name || call.lead?.Last_Name ? `${call.lead?.First_Name || ''} ${call.lead?.Last_Name || ''}`.trim() : 'Unknown Lead'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${call.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'}`}>
                              {call.status}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                              Durée: {Math.floor((call.duration || 0) / 60)}m {(call.duration || 0) % 60}s
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400/90 mt-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                            <span>{new Date(call.createdAt || call.date).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 xl:gap-6">
                        {call.ai_call_score?.overall?.score !== undefined && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100/50 shadow-sm">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span className="text-xs font-black">{call.ai_call_score.overall.score}%</span>
                          </div>
                        )}

                        {call.status?.toLowerCase() === 'completed' ? (
                          <>
                            <div className="h-8 w-px bg-slate-200/70 hidden xl:block"></div>

                            {/* Validation de l'Appel par la Compagnie */}
                            <div className="flex flex-col items-center gap-1 min-w-[120px]">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Appel (Validation)</span>
                              {call.companyValidation === 'approved' && call.agentValidation === 'approved' ? (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Validé
                                </span>
                              ) : call.companyValidation === 'rejected' || call.agentValidation === 'rejected' ? (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <X className="w-3.5 h-3.5" />
                                  Refusé
                                </span>
                              ) : call.companyValidation === 'approved' && call.agentValidation !== 'approved' ? (
                                <span
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200/40 shadow-sm w-32 whitespace-nowrap text-center cursor-help"
                                  title="En attente de la confirmation de l'agent"
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                  Attente Agent
                                </span>
                              ) : (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(
                                        openDropdownId?.callId === call._id && openDropdownId?.type === 'validation'
                                          ? null
                                          : { callId: call._id, type: 'validation' }
                                      );
                                    }}
                                    className="w-24 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1 shadow-sm bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                  >
                                    <span>Action</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openDropdownId?.callId === call._id && openDropdownId?.type === 'validation' ? 'rotate-180' : ''
                                      }`} />
                                  </button>

                                  {openDropdownId?.callId === call._id && openDropdownId?.type === 'validation' && (
                                    <>
                                      <div className="fixed inset-0 z-30" onClick={() => setOpenDropdownId(null)} />
                                      <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-32 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <button
                                          onClick={() => {
                                            handleUpdateValidation(call._id, call.companyValidation || 'pending', 'approved');
                                            setOpenDropdownId(null);
                                          }}
                                          className="w-full px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50/60 flex items-center gap-2 transition-colors"
                                        >
                                          <Check className="w-3.5 h-3.5 shrink-0" />
                                          <span>Valider</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleUpdateValidation(call._id, call.companyValidation || 'pending', 'rejected');
                                            setOpenDropdownId(null);
                                          }}
                                          className="w-full px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50/60 flex items-center gap-2 transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5 shrink-0" />
                                          <span>Refuser</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="h-8 w-px bg-slate-200/70 hidden xl:block"></div>

                            {/* Validation de la Transaction par la Compagnie */}
                            <div className="flex flex-col items-center gap-1 min-w-[120px]">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Transaction</span>
                              {call.transactionOccurred !== true ? (
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              ) : call.transaction?.validByCompany === true && call.transaction?.validByReps === true ? (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Signé
                                </span>
                              ) : call.transaction?.validByCompany === false || call.transaction?.validByReps === false ? (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <X className="w-3.5 h-3.5" />
                                  Refusé
                                </span>
                              ) : call.transaction?.validByCompany === true && call.transaction?.validByReps !== true ? (
                                <span
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200/40 shadow-sm w-32 whitespace-nowrap text-center cursor-help"
                                  title="En attente de la confirmation de l'agent"
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                  Attente Agent
                                </span>
                              ) : (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(
                                        openDropdownId?.callId === call._id && openDropdownId?.type === 'transaction'
                                          ? null
                                          : { callId: call._id, type: 'transaction' }
                                      );
                                    }}
                                    className="w-24 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1 shadow-sm bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                  >
                                    <span>Action</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openDropdownId?.callId === call._id && openDropdownId?.type === 'transaction' ? 'rotate-180' : ''
                                      }`} />
                                  </button>

                                  {openDropdownId?.callId === call._id && openDropdownId?.type === 'transaction' && (
                                    <>
                                      <div className="fixed inset-0 z-30" onClick={() => setOpenDropdownId(null)} />
                                      <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-32 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <button
                                          onClick={() => {
                                            handleUpdateTransactionValidation(call._id, call.transaction?.validByCompany ?? null, true);
                                            setOpenDropdownId(null);
                                          }}
                                          className="w-full px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50/60 flex items-center gap-2 transition-colors"
                                        >
                                          <Check className="w-3.5 h-3.5 shrink-0" />
                                          <span>Signer</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleUpdateTransactionValidation(call._id, call.transaction?.validByCompany ?? null, false);
                                            setOpenDropdownId(null);
                                          }}
                                          className="w-full px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50/60 flex items-center gap-2 transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5 shrink-0" />
                                          <span>Refuser</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-8 w-px bg-slate-200/70 hidden xl:block"></div>
                            <div className="flex flex-col items-center justify-center min-w-[80px]">
                              <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                            </div>
                          </>
                        )}

                        <div className="flex items-center gap-2 ml-2">
                          <button
                            onClick={() => openCallDetails(call, 'transcript')}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all"
                            title="Transcript"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openCallDetails(call, 'insights')}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all"
                            title="AI Insights"
                          >
                            <Brain className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {selectedCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedCall(null)}></div>

          <div className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
            {/* Modal Header */}
            <div className="px-8 py-8 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-harx text-white flex items-center justify-center shadow-xl shadow-harx-500/20">
                  <Phone className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
                    {selectedCall.lead?.First_Name || selectedCall.lead?.Last_Name ? `${selectedCall.lead?.First_Name || ''} ${selectedCall.lead?.Last_Name || ''}`.trim() : 'Call Details'}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">
                    {new Date(selectedCall.createdAt || selectedCall.date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex-1 max-w-md">
                {(() => {
                  const recordingUrl = selectedCall.recording_url_cloudinary || selectedCall.recording_url;
                  if (!recordingUrl) return <div className="text-[10px] font-black text-slate-400 uppercase text-center py-2 bg-slate-100/50 rounded-xl italic">No recording</div>;
                  const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) ? `${recordingUrl}.mp3` : recordingUrl;
                  return <PremiumAudioPlayer url={finalUrl} />;
                })()}
              </div>

              <button
                onClick={() => setSelectedCall(null)}
                className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl border border-slate-100 transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-8 py-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Transcript
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <ActivityIcon className="w-4 h-4" />
                  AI Insights
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Val. Appel :</span>
                  {selectedCall.companyValidation === 'approved' ? (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-24">
                      <Check className="w-3.5 h-3.5" />
                      Validé
                    </span>
                  ) : selectedCall.companyValidation === 'rejected' ? (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-24">
                      <X className="w-3.5 h-3.5" />
                      Refusé
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateValidation(selectedCall._id, selectedCall.companyValidation || 'pending', 'approved')}
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm bg-blue-50/50 text-blue-600 border border-blue-100/40 hover:bg-blue-100/60 w-24"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Valider
                      </button>
                      <button
                        onClick={() => handleUpdateValidation(selectedCall._id, selectedCall.companyValidation || 'pending', 'rejected')}
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm bg-rose-50/50 text-rose-600 border border-rose-100/40 hover:bg-rose-100/60 w-24"
                      >
                        <X className="w-3.5 h-3.5" />
                        Refuser
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Val. Tx (Agent) :</span>
                  {selectedCall.transaction?.validByReps === true ? (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-24">
                      <Check className="w-3.5 h-3.5" />
                      Validé
                    </span>
                  ) : selectedCall.transaction?.validByReps === false ? (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-24">
                      <X className="w-3.5 h-3.5" />
                      Refusé
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100/40 shadow-sm w-24">
                      En attente
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Val. Tx (Compagnie) :</span>
                  {selectedCall.transaction?.validByCompany === true ? (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-24">
                      <Check className="w-3.5 h-3.5" />
                      Validé
                    </span>
                  ) : selectedCall.transaction?.validByCompany === false ? (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-24">
                      <X className="w-3.5 h-3.5" />
                      Refusé
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateTransactionValidation(selectedCall._id, selectedCall.transaction?.validByCompany ?? null, true)}
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm bg-blue-50/50 text-blue-600 border border-blue-100/40 hover:bg-blue-100/60 w-24"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Valider
                      </button>
                      <button
                        onClick={() => handleUpdateTransactionValidation(selectedCall._id, selectedCall.transaction?.validByCompany ?? null, false)}
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm bg-rose-50/50 text-rose-600 border border-rose-100/40 hover:bg-rose-100/60 w-24"
                      >
                        <X className="w-3.5 h-3.5" />
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
              {activeTab === 'transcript' ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((t: any, i: number) => (
                      <div key={i} className={`flex gap-4 ${t.speaker?.toLowerCase().includes('agent') ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`flex flex-col max-w-[75%] ${t.speaker?.toLowerCase().includes('agent') ? 'items-start' : 'items-end'}`}>
                          <div className="flex items-center gap-2 mb-1.5 px-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.speaker}</span>
                            <span className="text-[9px] font-bold text-slate-300">{t.timestamp}</span>
                          </div>
                          <div className={`px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed ${t.speaker?.toLowerCase().includes('agent')
                              ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                              : 'bg-gradient-harx text-white rounded-tr-none shadow-lg shadow-harx-500/20'
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
              ) : (
                <div className="max-w-5xl mx-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Agent Fluency', data: selectedCall.ai_call_score?.["Agent fluency"], icon: Globe },
                      { label: 'Sentiment Analysis', data: selectedCall.ai_call_score?.["Sentiment analysis"], icon: ActivityIcon },
                      { label: 'Fraud Detection', data: selectedCall.ai_call_score?.["Fraud detection"], icon: Shield },
                      {
                        label: 'Conversion Potential',
                        data: {
                          score: Math.round(((selectedCall.ai_call_score?.["Agent fluency"]?.score || 0) * 0.4) + ((selectedCall.ai_call_score?.["Sentiment analysis"]?.score || 0) * 0.6)),
                          feedback: "Probabilité de conversion estimée basée sur l'analyse sémantique."
                        },
                        icon: TrendingUp
                      }
                    ].map((metric, mIdx) => (
                      <div key={mIdx} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl group hover:shadow-2xl transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-12 h-12 rounded-2xl bg-harx-50 text-harx-600 flex items-center justify-center transition-transform group-hover:scale-110`}>
                            <metric.icon className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-black text-harx-600`}>{metric.data?.score || 0}%</span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Score</p>
                          </div>
                        </div>
                        <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3">{metric.label}</h5>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                          &quot;{metric.data?.feedback || 'Comprehensive analysis completed.'}&quot;
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-[32px] border border-emerald-100 shadow-xl overflow-hidden relative group p-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="relative z-10">
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
                          &quot;{selectedCall.ai_call_score?.overall?.feedback || 'The agent demonstrated standard performance.'}&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
