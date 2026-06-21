import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { Phone, MessageSquare, Star, Activity as ActivityIcon, Clock, Search, Filter, ChevronDown, Download, ExternalLink, Globe, Shield, ShieldAlert, ShieldCheck, X, Check, TrendingUp, Brain, CreditCard, Calendar, Briefcase, ArrowRight, PhoneIncoming, PhoneOutgoing, BadgeCheck, BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CallDetailModal, { type NormalizedCall, companyTransactionCanValidate } from '../components/CallDetailModal';
import {
  computeAgentFraudStats,
  getCompanyAgentFraudCountLabel,
  getCompanyAgentFraudSectionTitle,
  getCompanyAgentFraudWarning,
  getCompanyFraudGlobalWarning,
  getFraudDetectedCountLabel,
  isCallApprovedByAI,
  isCallFraudDetected,
  isCallRejectedByAI,
  isCallVoicemail,
  resolveUnvalidatedTransactionStatus,
} from '../../../utils/callStatusDisplay';
import { callsApi } from '../services/api/calls';
import { getCallsApiBase } from '../lib/callsApiBase';
import { fetchCompanyFraudStats, pickBilingual, type CompanyFraudStatsApi } from '../../../lib/fraudStatsApi';
import { getCallAnalyzeErrorMessage } from '../lib/callAnalyzeErrors';
import { refreshCompanyWalletAfterValidation } from '../../../lib/walletBalanceSync';
import { CALL_ANALYSIS_HELP_EVENT, OPEN_CALL_DETAILS_EVENT, type OpenCallDetailsDetail } from '../../../lib/callAnalysisHelpNotification';
import type { EscrowMessage } from '../../../lib/escrowSocket';

export default function CallsDashboardPage() {
  const { t, i18n } = useTranslation();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'insights'>('transcript');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gigFilter, setGigFilter] = useState<string>('all');
  const [gigs, setGigs] = useState<Array<{ _id: string; title: string }>>([]);
  const [companyFraudStats, setCompanyFraudStats] = useState<CompanyFraudStatsApi | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<{ callId: string; type: 'validation' | 'transaction' } | null>(null);

  const companyId = Cookies.get('companyId');

  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<{ callId: string; message: string } | null>(null);

  const normalizeCallId = (callOrId: { _id?: unknown } | string | undefined) => {
    if (!callOrId) return '';
    if (typeof callOrId === 'string') return callOrId;
    const id = callOrId._id;
    if (typeof id === 'object' && id && '$oid' in (id as object)) return String((id as { $oid: string }).$oid);
    return String(id ?? '');
  };

  const pendingCallHandledRef = useRef(false);

  const openCallDetails = useCallback((call: any, tab: 'transcript' | 'insights') => {
    setSelectedCall(call);
    setActiveTab(tab);
  }, []);

  const openCallById = useCallback(async (callId: string, tab: 'transcript' | 'insights' = 'insights') => {
    const normalizedId = String(callId);
    const existing = calls.find((c) => normalizeCallId(c) === normalizedId);
    if (existing) {
      openCallDetails(existing, tab);
      return;
    }

    const callsBase = getCallsApiBase();
    if (!callsBase) return;
    try {
      const res = await fetch(`${callsBase}/calls/${encodeURIComponent(normalizedId)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data) openCallDetails(json.data, tab);
    } catch {
      /* ignore */
    }
  }, [calls, openCallDetails]);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetchCalls();
    fetchGigs();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const applyAnalysisHelpAlert = (data: EscrowMessage) => {
      const callId = data.callId ? String(data.callId) : '';
      if (!callId) return;

      const alert = {
        requestedAt: data.requestedAt || new Date().toISOString(),
        repName: data.repName || 'Rep',
        message: data.message || '',
        requestCount: data.requestCount || 1,
      };

      setCalls((prev) =>
        prev.map((c) => (normalizeCallId(c) === callId ? { ...c, analysisCompanyAlert: alert } : c))
      );
      setSelectedCall((prev: any) =>
        prev && normalizeCallId(prev) === callId ? { ...prev, analysisCompanyAlert: alert } : prev
      );
    };

    const onAnalysisHelp = (event: Event) => {
      const data = (event as CustomEvent<EscrowMessage>).detail;
      if (!data) return;
      applyAnalysisHelpAlert(data);
    };

    window.addEventListener(CALL_ANALYSIS_HELP_EVENT, onAnalysisHelp);
    return () => window.removeEventListener(CALL_ANALYSIS_HELP_EVENT, onAnalysisHelp);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const onOpenCallDetails = (event: Event) => {
      const detail = (event as CustomEvent<OpenCallDetailsDetail>).detail;
      if (!detail?.callId) return;
      void openCallById(detail.callId, detail.tab || 'insights');
    };

    window.addEventListener(OPEN_CALL_DETAILS_EVENT, onOpenCallDetails);
    return () => window.removeEventListener(OPEN_CALL_DETAILS_EVENT, onOpenCallDetails);
  }, [companyId, openCallById]);

  useEffect(() => {
    if (!companyId || pendingCallHandledRef.current) return;

    const pendingRaw = sessionStorage.getItem('harx:pendingCallOpen');
    if (!pendingRaw) return;

    pendingCallHandledRef.current = true;
    sessionStorage.removeItem('harx:pendingCallOpen');

    try {
      const pending = JSON.parse(pendingRaw) as OpenCallDetailsDetail;
      if (pending?.callId) {
        void openCallById(pending.callId, pending.tab || 'insights');
      }
    } catch {
      /* ignore */
    }
  }, [companyId, openCallById]);

  const fetchGigs = async () => {
    try {
      const gigsApiUrl =
        (import.meta as any).env?.VITE_GIGS_API ||
        (import.meta as any).env?.VITE_API_URL_GIGS ||
        'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
      const res = await fetch(`${gigsApiUrl}/gigs/company/${companyId}`);
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setGigs(list);
    } catch (error) {
      console.error('Error fetching gigs:', error);
    }
  };

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const callsBase = getCallsApiBase();
      if (!callsBase) {
        toast.error(t('calls.errors.config', 'Configuration API appels manquante.'));
        setCalls([]);
        return;
      }

      const response = await fetch(
        `${callsBase}/calls?companyId=${encodeURIComponent(companyId!)}&populate=lead&populate=agent`
      );
      if (response.ok) {
        const data = await response.json();
        const callsArray = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setCalls(callsArray.sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()));
        if (data.fraudStats) {
          setCompanyFraudStats(data.fraudStats);
        } else {
          const stats = await fetchCompanyFraudStats(companyId!);
          setCompanyFraudStats(stats);
        }
      } else {
        toast.error(t('calls.errors.load', 'Impossible de charger les appels.'));
        setCalls([]);
        setCompanyFraudStats(null);
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast.error(t('calls.errors.load', 'Impossible de charger les appels.'));
      setCalls([]);
      setCompanyFraudStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCall = async (callId: string) => {
    try {
      setAnalyzingCallId(callId);
      setAnalysisError(null);
      // Same endpoint as dash_rep: POST /api/calls/:id/analyze on v25_dash_calls_backend
      const result = await callsApi.analyze(callId);

      if ((result as { inProgress?: boolean })?.inProgress) {
        if (selectedCall && selectedCall._id === callId) {
          setSelectedCall({ ...selectedCall, ai_call_status: 'processing' });
        }
        await fetchCalls();
        return;
      }

      if (result?.success) {
        if (selectedCall && selectedCall._id === callId) {
          setSelectedCall({
            ...selectedCall,
            ai_call_score: result.data,
            transcript: result.transcript || selectedCall.transcript,
            validByAI: result.validByAI,
            valid: result.validByAI,
            ai_call_status: 'scored',
          });
        }
        await fetchCalls();
      } else {
        const message = getCallAnalyzeErrorMessage(result);
        setAnalysisError({ callId, message });
        toast.error(message);
        if (selectedCall && selectedCall._id === callId) {
          setSelectedCall({ ...selectedCall, ai_call_status: 'error' });
        }
        setCalls((prev) =>
          prev.map((c) => (c._id === callId ? { ...c, ai_call_status: 'error' } : c))
        );
      }
    } catch (error: unknown) {
      const message = getCallAnalyzeErrorMessage(error);
      setAnalysisError({ callId, message });
      toast.error(message);
      if (selectedCall && selectedCall._id === callId) {
        setSelectedCall({ ...selectedCall, ai_call_status: 'error' });
      }
      setCalls((prev) =>
        prev.map((c) => (c._id === callId ? { ...c, ai_call_status: 'error' } : c))
      );
      console.error('Error analyzing call:', error);
    } finally {
      setAnalyzingCallId(null);
    }
  };

  const handleUpdateTransactionValidation = async (callId: string, currentStatus: boolean | null, clickedStatus: boolean) => {
    try {
      const status = currentStatus === clickedStatus ? null : clickedStatus;
      const callsBase = getCallsApiBase();
      if (!callsBase) return;

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
        if (status === true) {
          toast.success('Transaction validée par votre entreprise');
        } else if (status === false) {
          toast.success('Transaction refusée');
        } else {
          toast.success('Validation transaction annulée');
        }
        void refreshCompanyWalletAfterValidation(companyId || undefined);
      } else {
        toast.error('Impossible de mettre à jour la validation');
      }
    } catch (error) {
      console.error('Error updating transaction validation:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const callGigId = (call: any): string => {
    const raw =
      call?.lead?.gigId?._id ||
      call?.lead?.gigId ||
      call?.gigId?._id ||
      call?.gigId;
    if (!raw) return '';
    if (typeof raw === 'object' && (raw as any).$oid) return String((raw as any).$oid);
    return String(raw);
  };

  const callGigTitle = (call: any): string => {
    const fromLead = call?.lead?.gigId?.title || call?.lead?.gigId?.name;
    if (fromLead) return String(fromLead);
    const id = callGigId(call);
    const match = gigs.find((g) => g._id === id);
    return match?.title || '';
  };

  const callIdStr = (call: any): string => {
    const raw = call?._id;
    if (!raw) return '';
    if (typeof raw === 'object' && (raw as any).$oid) return String((raw as any).$oid);
    return String(raw);
  };

  const callLeadName = (call: any): string => {
    const lead = call?.lead;
    if (lead && typeof lead === 'object') {
      const n = `${lead.First_Name || ''} ${lead.Last_Name || ''}`.trim();
      if (n) return n;
    }
    return 'Lead';
  };

  const callAgentName = (call: any): string => {
    const agent = call?.agent;
    if (agent && typeof agent === 'object') {
      const n =
        `${agent.firstName || agent.first_name || ''} ${agent.lastName || agent.last_name || ''}`.trim() ||
        agent.personalInfo?.name ||
        agent.name ||
        agent.email ||
        '';
      if (n) return n;
    }
    if (typeof agent === 'string' && agent.length < 30) return agent;
    return 'Agent';
  };

  const callAgentId = (call: any): string => {
    const agent = call?.agent;
    if (agent && typeof agent === 'object') {
      const raw = agent._id ?? agent.id;
      if (raw && typeof raw === 'object' && (raw as any).$oid) return String((raw as any).$oid);
      if (raw) return String(raw);
    }
    if (typeof agent === 'string') return agent;
    return callAgentName(call);
  };

  const filteredCalls = calls.filter(call => {
    const q = searchTerm.trim().toLowerCase();
    const leadName = `${call.lead?.First_Name || ''} ${call.lead?.Last_Name || ''}`.trim().toLowerCase();
    const matchesSearch =
      !q ||
      leadName.includes(q) ||
      callGigTitle(call).toLowerCase().includes(q) ||
      callIdStr(call).toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'voicemail' && isCallVoicemail(call)) ||
      (statusFilter !== 'voicemail' &&
        String(call.status || '').toLowerCase() === statusFilter.toLowerCase());
    const matchesGig = gigFilter === 'all' || callGigId(call) === gigFilter;
    return matchesSearch && matchesStatus && matchesGig;
  });

  const fraudCallCount = companyFraudStats?.totalFraudCount ?? calls.filter(isCallFraudDetected).length;

  const agentFraudStats = useMemo(() => {
    if (companyFraudStats?.agentStats?.length) {
      return companyFraudStats.agentStats.map((row) => ({
        agentId: row.agentId,
        agentName: row.agentName,
        fraudCount: row.fraudCount,
      }));
    }
    return computeAgentFraudStats(calls, callAgentId, callAgentName);
  }, [companyFraudStats, calls]);

  const agentFraudCountById = useMemo(() => {
    const map = new Map<string, number>();
    for (const stat of agentFraudStats) {
      map.set(stat.agentId, stat.fraudCount);
    }
    return map;
  }, [agentFraudStats]);

  const apiAgentWarning = (agentId: string, fallbackCount: number) => {
    const fromApi = companyFraudStats?.agentStats?.find((row) => row.agentId === agentId);
    if (fromApi?.warnings?.agent) {
      return pickBilingual(fromApi.warnings.agent, i18n.language);
    }
    return getCompanyAgentFraudWarning(fallbackCount, i18n.language);
  };

  const selectedCallAnalysisError =
    selectedCall && analysisError?.callId === selectedCall._id ? analysisError.message : null;

  const renderAnalysisErrorBanner = () =>
    selectedCallAnalysisError ? (
      <div
        role="alert"
        className="w-full max-w-lg mx-auto flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium text-left"
      >
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <p>{selectedCallAnalysisError}</p>
      </div>
    ) : null;

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
              placeholder={t(
                'calls.search.placeholder',
                'Rechercher par prospect, gig ou ID…'
              )}
              className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('calls.search.label', 'Rechercher des appels')}
            />
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200 px-4 py-2 flex items-center gap-3 shadow-sm">
            <Briefcase className="w-5 h-5 text-slate-400" />
            <select
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer max-w-[200px]"
              value={gigFilter}
              onChange={(e) => setGigFilter(e.target.value)}
              title={t('calls.filters.gig', 'Filtrer par gig')}
            >
              <option value="all">{t('calls.filters.allGigs', 'Tous les gigs')}</option>
              {gigs.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200 px-4 py-2 flex items-center gap-3 shadow-sm">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title={t('calls.filters.status', 'Filtrer par statut')}
            >
              <option value="all">{t('calls.filters.allStatus', 'Tous les statuts')}</option>
              <option value="completed">{t('calls.status.completed', 'Terminé')}</option>
              <option value="missed">{t('calls.status.missed', 'Manqué')}</option>
              <option value="failed">{t('calls.status.failed', 'Échoué')}</option>
              <option value="voicemail">{t('calls.status.voicemail', 'Messagerie')}</option>
            </select>
          </div>
        </div>
      </div>

      {fraudCallCount > 0 && (
        <div className="space-y-4">
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900"
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                {pickBilingual(companyFraudStats?.warnings?.countLabel, i18n.language) ||
                  getFraudDetectedCountLabel(fraudCallCount, i18n.language)}
              </p>
              <p className="text-sm font-medium leading-relaxed">
                {pickBilingual(companyFraudStats?.warnings?.global, i18n.language) ||
                  getCompanyFraudGlobalWarning(fraudCallCount, i18n.language)}
              </p>
            </div>
          </div>

          {agentFraudStats.length > 0 && (
            <div className="rounded-2xl border border-rose-100 bg-white p-4 md:p-5 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                {getCompanyAgentFraudSectionTitle(i18n.language)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {agentFraudStats.map((agent) => (
                  <div
                    key={agent.agentId}
                    className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-slate-900 truncate">{agent.agentName}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-rose-100 text-rose-800 border-rose-200 shrink-0">
                        <ShieldAlert className="w-3 h-3" />
                        {getCompanyAgentFraudCountLabel(agent.fraudCount, i18n.language)}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-rose-800 leading-relaxed">
                      {apiAgentWarning(agent.agentId, agent.fraudCount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
          ) : !companyId ? (
            <div className="flex flex-col justify-center items-center p-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                <Phone className="w-10 h-10 text-slate-300 opacity-40" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">
                {t('calls.empty.noCompany', 'Entreprise non identifiée')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                {t(
                  'calls.empty.noCompanyHint',
                  'Reconnectez-vous ou sélectionnez une entreprise pour afficher l’historique des appels.'
                )}
              </p>
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                <Phone className="w-10 h-10 text-slate-300 opacity-40" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">
                {t('calls.empty.none', 'Aucun appel')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                {t(
                  'calls.empty.noneHint',
                  'Aucun appel enregistré pour cette entreprise pour le moment.'
                )}
              </p>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                <Phone className="w-10 h-10 text-slate-300 opacity-40" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">
                {t('calls.empty.filtered', 'Aucun résultat')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                {t(
                  'calls.empty.filteredHint',
                  'Aucun appel ne correspond à vos filtres. Réinitialisez la recherche ou le gig sélectionné.'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCalls.map((call, idx) => {
                const callId = call._id || idx;
                const isInbound = String(call.direction || '').toLowerCase().startsWith('inbound');
                const agentName = callAgentName(call);
                const leadName = callLeadName(call);
                const fromName = isInbound ? leadName : agentName;
                const toName = isInbound ? agentName : leadName;
                return (
                  <div
                    key={callId}
                    role={call.status?.toLowerCase() === 'completed' ? 'button' : undefined}
                    tabIndex={call.status?.toLowerCase() === 'completed' ? 0 : undefined}
                    onClick={
                      call.status?.toLowerCase() === 'completed'
                        ? () => openCallDetails(call, 'insights')
                        : undefined
                    }
                    onKeyDown={
                      call.status?.toLowerCase() === 'completed'
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openCallDetails(call, 'insights');
                            }
                          }
                        : undefined
                    }
                    className={`p-6 bg-white rounded-3xl border border-slate-100/80 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300 group ${
                      call.status?.toLowerCase() === 'completed' ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          title={isInbound ? 'Appel entrant' : 'Appel sortant'}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0 ${
                            isInbound
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-violet-50 text-violet-600'
                          }`}
                        >
                          {isInbound ? <PhoneIncoming className="w-6 h-6" /> : <PhoneOutgoing className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <span className="font-black text-slate-900 tracking-tight">{fromName}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span className="font-black text-slate-900 tracking-tight inline-flex items-center gap-1">
                              {toName}
                              {(call.validByAI === true || call.valid === true) && (
                                <span
                                  title="Appel validé par l'IA"
                                  className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100"
                                >
                                  <BadgeCheck className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${call.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'}`}>
                              {call.status}
                            </span>
                            {isCallVoicemail(call) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-200">
                                <Phone className="w-3 h-3" />
                                {i18n.language.startsWith('en') ? 'Voicemail' : 'Messagerie'}
                              </span>
                            )}
                            {isCallFraudDetected(call) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                                <ShieldAlert className="w-3 h-3" />
                                {i18n.language.startsWith('en') ? 'Fraud' : 'Fraude'}
                              </span>
                            )}
                            {call.analysisCompanyAlert?.requestedAt && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCallDetails(call, 'insights');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 animate-pulse hover:bg-amber-100 transition-colors"
                              >
                                <BellRing className="w-3 h-3" />
                                Rep demande analyse
                              </button>
                            )}
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                              Durée: {Math.floor((call.duration || 0) / 60)}m {(call.duration || 0) % 60}s
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400/90 mt-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                            <span>{new Date(call.createdAt || call.date).toLocaleString()}</span>
                          </div>
                          {isCallFraudDetected(call) && (
                            <p className="text-[10px] font-semibold text-rose-700 mt-2 leading-snug max-w-xl">
                              {apiAgentWarning(
                                callAgentId(call),
                                agentFraudCountById.get(callAgentId(call)) || 1
                              )}
                            </p>
                          )}
                          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <span>ID: {typeof call._id === 'object' ? (call._id as any).$oid : call._id}</span>
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

                            {/* Validation de l'Appel AI */}
                            <div className="flex flex-col items-center gap-1 min-w-[120px]">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Appel</span>
                              {isCallApprovedByAI(call) ? (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-36 whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Validé par AI (-{(call.lead?.gigId?.commission?.commission_per_call || call.lead?.gigId?.rewardPerCall || 4).toFixed(2)}€)
                                </span>
                              ) : isCallRejectedByAI(call) ? (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <X className="w-3.5 h-3.5" />
                                  Refusé AI
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-200/40 shadow-sm w-32 whitespace-nowrap">
                                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                                  Pending analyse
                                </span>
                              )}
                            </div>

                            <div className="h-8 w-px bg-slate-200/70 hidden xl:block"></div>

                            {/* Validation de la Transaction AI */}
                            <div className="flex flex-col items-center gap-1 min-w-[120px]">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Transaction </span>
                              {call.transaction?.validByCompany === true ? (
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/40 shadow-sm w-36 whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Signé (-{(call.lead?.gigId?.commission?.transactionCommission || call.lead?.gigId?.rewardPerSale || 30).toFixed(2)}€)
                                </span>
                              ) : isCallRejectedByAI(call) ? (
                                (() => {
                                  const txStatus = resolveUnvalidatedTransactionStatus(call);
                                  return (
                                    <span
                                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm min-w-[7rem] max-w-[11rem] text-center leading-tight ${txStatus.tone}`}
                                      title={txStatus.title}
                                    >
                                      <X className="w-3.5 h-3.5 shrink-0" />
                                      {txStatus.label}
                                    </span>
                                  );
                                })()
                              ) : !isCallApprovedByAI(call) ? (
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              ) : companyTransactionCanValidate(call, call.transaction) ? (
                                <div className="flex flex-col items-center gap-1.5">
                                  {(() => {
                                    const txStatus = resolveUnvalidatedTransactionStatus(call);
                                    return (
                                      <span
                                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm min-w-[7rem] max-w-[11rem] text-center leading-tight ${txStatus.tone}`}
                                        title={txStatus.title}
                                      >
                                        {txStatus.label}
                                      </span>
                                    );
                                  })()}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateTransactionValidation(callId, call.transaction?.validByCompany ?? null, true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all text-[9px] font-black uppercase tracking-widest"
                                      title="Valider la transaction"
                                    >
                                      <Check className="w-3 h-3" />
                                      Valider
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateTransactionValidation(callId, call.transaction?.validByCompany ?? null, false);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all text-[9px] font-black uppercase tracking-widest"
                                      title="Marquer comme non signé"
                                    >
                                      <X className="w-3 h-3" />
                                      Non signé
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
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

                        {call.status?.toLowerCase() === 'completed' && (
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCallDetails(call, 'insights');
                              }}
                              className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all"
                              title="View Details"
                            >
                              <Brain className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Call Detail Modal */}
      {selectedCall && (() => {
        const normalized: NormalizedCall = {
          id: typeof selectedCall._id === 'object' ? (selectedCall._id as any).$oid : selectedCall._id,
          leadName: selectedCall.lead?.First_Name || selectedCall.lead?.Last_Name
            ? `${selectedCall.lead?.First_Name || ''} ${selectedCall.lead?.Last_Name || ''}`.trim()
            : 'Call Details',
          agentName: callAgentName(selectedCall),
          status: selectedCall.status,
          createdAt: selectedCall.createdAt || selectedCall.date || '',
          recording_url: selectedCall.recording_url,
          recording_url_cloudinary: selectedCall.recording_url_cloudinary,
          transcript: selectedCall.transcript,
          ai_call_score: selectedCall.ai_call_score,
          ai_summary_en: selectedCall.ai_summary_en,
          ai_summary_fr: selectedCall.ai_summary_fr,
          validByAI: selectedCall.validByAI,
          callOutcome: selectedCall.callOutcome,
          flags: selectedCall.flags,
          transaction: selectedCall.transaction,
        };
        const selectedAgentFraudCount =
          agentFraudCountById.get(callAgentId(selectedCall)) ||
          (isCallFraudDetected(selectedCall) ? 1 : 0);
        return (
          <CallDetailModal
            call={normalized}
            agentFraudCount={selectedAgentFraudCount}
            onClose={() => {
              setSelectedCall(null);
              setAnalysisError(null);
            }}
            onAnalyze={handleAnalyzeCall}
            analyzingCallId={analyzingCallId}
            analysisError={selectedCallAnalysisError}
            onValidateTransaction={(callId, current, next) => handleUpdateTransactionValidation(callId, current, next)}
          />
        );
      })()}

      {(false as boolean) && selectedCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300 bg-slate-905/80 backdrop-blur-md" onClick={() => setSelectedCall(null)}>
          <div className="relative bg-white w-full md:max-w-5xl h-[92vh] md:h-[88vh] max-h-[92vh] md:max-h-[88vh] rounded-[24px] md:rounded-[36px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100/80" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-4 py-4 md:px-8 md:py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 shrink-0">
              <div className="flex justify-between items-start md:items-center w-full md:w-auto flex-1">
                <div>
                  <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-widest leading-snug">
                    {selectedCall.lead?.First_Name || selectedCall.lead?.Last_Name ? `${selectedCall.lead?.First_Name || ''} ${selectedCall.lead?.Last_Name || ''}`.trim() : 'Call Details'}
                  </h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">
                    {new Date(selectedCall.createdAt || selectedCall.date).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 opacity-60">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">
                      Call ID: {typeof selectedCall._id === 'object' ? (selectedCall._id as any).$oid : selectedCall._id}
                    </span>
                  </div>
                </div>
                {/* Close button on mobile */}
                <div className="md:hidden">
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="w-full md:w-auto md:flex-1 max-w-full md:max-w-md shrink-0">
                {(() => {
                  const recordingUrl = selectedCall.recording_url_cloudinary || selectedCall.recording_url;
                  if (!recordingUrl) return <div className="text-[10px] font-black text-slate-400 uppercase text-center py-2 bg-slate-100/50 rounded-xl italic">No recording</div>;
                  const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) ? `${recordingUrl}.mp3` : recordingUrl;
                  return <PremiumAudioPlayer url={finalUrl} />;
                })()}
              </div>

              {/* Close button on desktop */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs & Decision Panel */}
            <div className="px-4 py-3 md:px-8 md:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 lg:pb-0">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Transcript
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <ActivityIcon className="w-4 h-4" />
                  AI Insights
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                {/* Section Décision de l'IA */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest sm:min-w-[100px]">Décision de l'IA:</span>
                  
                  {/* Appel */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1 text-slate-400" title="Appel">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Appel</span>
                    </div>
                    {selectedCall.validByAI === true ? (
                      <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100" title="Validé par AI">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : selectedCall.validByAI === false ? (
                      <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100" title="Refusé par AI">
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100" title="En cours">
                        <Clock className="w-3 h-3 animate-pulse" />
                      </span>
                    )}
                  </div>

                  {/* Transaction (IA part) */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1 text-slate-400" title="Transaction">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Trans.</span>
                    </div>
                    {selectedCall.transaction?.validByCompany === true ? (
                      <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Check className="w-3 h-3" />
                        -{(selectedCall.lead?.gigId?.commission?.transactionCommission || selectedCall.lead?.gigId?.rewardPerSale || 30).toFixed(2)}€
                      </span>
                    ) : selectedCall.transaction?.validByCompany === false ? (
                      <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100" title="Refusé">
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {selectedCall.validByAI !== null && selectedCall.validByAI !== undefined && selectedCall.transaction?.validByAI === false && (
                          <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100" title="Refusé AI">
                            <X className="w-3 h-3" />
                          </span>
                        )}
                        {selectedCall.validByAI !== null && selectedCall.validByAI !== undefined && selectedCall.transaction?.validByAI === true && (
                          <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100" title="Wait for Validation">
                            <Clock className="w-3 h-3 animate-pulse" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Votre Décision */}
                {selectedCall.transaction?.validByCompany === null && (
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest sm:min-w-[80px]">Votre choix:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateTransactionValidation(selectedCall._id, selectedCall.transaction?.validByCompany ?? null, true)}
                        className="p-1.5 rounded-xl transition-all flex items-center justify-center shadow-sm bg-blue-50/50 text-blue-600 border border-blue-100/40 hover:bg-blue-100/60"
                        title="Valider"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUpdateTransactionValidation(selectedCall._id, selectedCall.transaction?.validByCompany ?? null, false)}
                        className="p-1.5 rounded-xl transition-all flex items-center justify-center shadow-sm bg-rose-50/50 text-rose-600 border border-rose-100/40 hover:bg-rose-100/60"
                        title="Refuser"
                      >
  
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/20 custom-scrollbar">
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
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                      {renderAnalysisErrorBanner()}
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Transcript not available for this call</p>
                      <button
                        onClick={() => handleAnalyzeCall(selectedCall._id)}
                        disabled={analyzingCallId === selectedCall._id}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${analyzingCallId === selectedCall._id ? 'animate-spin' : ''}`} />
                        {analyzingCallId === selectedCall._id ? 'Analyse...' : 'Analyze & Transcribe'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-4 pb-2">
                  {(!selectedCall.ai_call_score || !selectedCall.ai_call_score.overall?.score) ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                      {renderAnalysisErrorBanner()}
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No analysis available for this call</p>
                      <button
                        onClick={() => handleAnalyzeCall(selectedCall._id)}
                        disabled={analyzingCallId === selectedCall._id}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${analyzingCallId === selectedCall._id ? 'animate-spin' : ''}`} />
                        {analyzingCallId === selectedCall._id ? 'Analyse...' : 'Analyze & Transcribe'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {(() => {
                          const colorMap: Record<string, { bg: string, text: string, bgBar: string }> = {
                            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bgBar: 'bg-emerald-500' },
                            blue: { bg: 'bg-blue-50', text: 'text-blue-600', bgBar: 'bg-blue-500' },
                            rose: { bg: 'bg-rose-50', text: 'text-rose-600', bgBar: 'bg-rose-500' },
                            indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bgBar: 'bg-indigo-500' },
                            amber: { bg: 'bg-amber-50', text: 'text-amber-600', bgBar: 'bg-amber-500' },
                            violet: { bg: 'bg-violet-50', text: 'text-violet-600', bgBar: 'bg-violet-500' },
                          };

                          return [
                            { label: t('calls.metrics.fluency', 'Agent Fluency'), key: "Agent fluency", icon: Globe, color: 'emerald' },
                            { label: t('calls.metrics.sentiment', 'Sentiment Analysis'), key: "Sentiment analysis", icon: ActivityIcon, color: 'blue' },
                            { label: t('calls.metrics.fraud', 'Fraud Detection'), key: "Fraud detection", icon: ShieldAlert, color: 'rose' },
                            { label: t('calls.metrics.coherence', 'Script Coherence'), key: "Script coherence", icon: ShieldCheck, color: 'indigo' },
                            { label: t('calls.metrics.argumentation', 'Argumentation Quality'), key: "Argumentation", icon: TrendingUp, color: 'amber' },
                            { label: t('calls.metrics.transaction', 'Transaction Analysis'), key: "Transaction analysis", icon: TrendingUp, color: 'emerald' }
                          ].map((metric, mIdx) => {
                            const metricData = selectedCall.ai_call_score?.[metric.key];
                            
                            const isFraudMetric = metric.key === "Fraud detection";
                            const originalScore = metricData?.score || 0;
                            const score = isFraudMetric ? (100 - originalScore) : originalScore;

                            const rawFeedback = i18n.language === 'en'
                              ? (metricData?.feedback_en || metricData?.feedback || '')
                              : (metricData?.feedback_fr || metricData?.feedback || '');

                            const theme = colorMap[metric.color] || { bg: 'bg-slate-50', text: 'text-slate-600', bgBar: 'bg-slate-500' };

                            return (
                              <div key={mIdx} className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                                <div>
                                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-sm shrink-0`}>
                                      <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="text-right">
                                      <span className={`text-base sm:text-lg font-black ${theme.text}`}>{score}%</span>
                                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Score</p>
                                    </div>
                                  </div>
                                  <h5 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className={`w-1.5 h-3.5 ${theme.bgBar} rounded-full`}></span>
                                    {metric.label}
                                  </h5>
                                </div>
                                <div className="mt-2">
                                  <div className="text-xs sm:text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl sm:rounded-2xl p-4 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all max-h-[160px] overflow-y-auto custom-scrollbar italic">
                                    {rawFeedback ? rawFeedback.split('"').map((part, i) =>
                                      i % 2 === 1 ? (
                                        <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b border-amber-200 not-italic">&quot;{part}&quot;</span>
                                      ) : part
                                    ) : (i18n.language === 'en' ? 'Detailed analysis completed.' : 'Analyse détaillée terminée.')}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Statuts & Réponses Prospect */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 px-4 pt-2">
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Statuts & Réponses Prospect</h5>
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {(() => {
                            const colorMap: Record<string, { bg: string, text: string, bgBar: string }> = {
                              emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bgBar: 'bg-emerald-500' },
                              blue: { bg: 'bg-blue-50', text: 'text-blue-600', bgBar: 'bg-blue-500' },
                              rose: { bg: 'bg-rose-50', text: 'text-rose-600', bgBar: 'bg-rose-500' },
                              indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bgBar: 'bg-indigo-500' },
                              amber: { bg: 'bg-amber-50', text: 'text-amber-600', bgBar: 'bg-amber-500' },
                            };

                            return [
                              { label: 'Pas intéressé', key: "PAS INTÉRESSÉS", icon: ShieldAlert, color: 'rose' },
                              { label: 'Pas au courant', key: "PAS AU COURANT", icon: Globe, color: 'blue' },
                              { label: 'Déjà équipé / Fourni', key: "DÉJÀ ÉQUIPÉS", icon: ShieldCheck, color: 'indigo' },
                              { label: 'Prise de RDV', key: "RDV", icon: Calendar, color: 'emerald' },
                              { label: 'À plus tard / Rappel', key: "A plus tard", icon: Clock, color: 'amber' }
                            ].map((metric, mIdx) => {
                              const metricData = selectedCall.ai_call_score?.[metric.key];
                              if (!metricData) return null;
                              const score = metricData?.score || 0;
                              const scoreColorClass = score >= 50 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50';
                              const passed = typeof metricData?.passed === 'boolean' ? metricData.passed : score >= 50;

                              const theme = colorMap[metric.color] || { bg: 'bg-slate-50', text: 'text-slate-600', bgBar: 'bg-slate-500' };

                              return (
                                <div key={mIdx} className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                                  <div>
                                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-sm shrink-0`}>
                                        <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                      </div>
                                      <div className="text-right">
                                        <span className={`text-xs sm:text-sm font-black ${scoreColorClass} px-2.5 py-1 rounded-xl shadow-sm border border-transparent`}>
                                          {passed ? 'Oui' : 'Non'} ({score}%)
                                        </span>
                                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Détecté</p>
                                      </div>
                                    </div>
                                    <h5 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                      <span className={`w-1.5 h-3.5 ${theme.bgBar} rounded-full`}></span>
                                      {metric.label}
                                    </h5>
                                  </div>
                                  <div className="mt-2">
                                    <div className="text-xs sm:text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl sm:rounded-2xl p-4 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all max-h-[160px] overflow-y-auto custom-scrollbar italic">
                                      {metricData?.feedback ? metricData.feedback.split('"').map((part, i) =>
                                        i % 2 === 1 ? (
                                          <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b border-amber-200 not-italic">&quot;{part}&quot;</span>
                                        ) : part
                                      ) : (i18n.language === 'en' ? 'No quote detected.' : 'Aucune citation détectée.')}
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Executive Summary Section */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[28px] sm:rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative bg-white rounded-[28px] sm:rounded-[40px] border border-emerald-100/50 shadow-2xl shadow-emerald-500/5 p-6 sm:p-10 overflow-hidden">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-40 -mt-40 blur-3xl"></div>

                          <div className="relative z-10">
                            <div className="flex items-center gap-4 sm:gap-6 mb-6">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                                <Star className="w-6 h-6 sm:w-8 sm:h-8" />
                              </div>
                              <div>
                                <h4 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-widest">Executive Summary</h4>
                                <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5 sm:mt-1 opacity-80">Overall AI Evaluation</p>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-[20px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-100 shadow-inner">
                              <p className="text-base sm:text-xl font-bold text-slate-800 leading-relaxed italic relative">
                                <span className="absolute -left-2 -top-4 sm:-left-4 sm:-top-4 text-emerald-200 text-4xl sm:text-6xl font-serif opacity-50">&quot;</span>
                                {i18n.language === 'en'
                                  ? (selectedCall.ai_summary_en || selectedCall.ai_call_score?.overall?.feedback_en || selectedCall.ai_summary || selectedCall.ai_call_score?.overall?.feedback || 'The agent demonstrated standard performance.')
                                  : (selectedCall.ai_summary_fr || selectedCall.ai_call_score?.overall?.feedback_fr || selectedCall.ai_summary || selectedCall.ai_call_score?.overall?.feedback || 'L\'agent a fait preuve de performances standards.')}
                                <span className="text-emerald-200 text-4xl sm:text-6xl font-serif opacity-50 ml-1 leading-none align-bottom">&quot;</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-4 md:px-8 md:py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-6 py-2.5 sm:px-8 sm:py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 shrink-0"
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
