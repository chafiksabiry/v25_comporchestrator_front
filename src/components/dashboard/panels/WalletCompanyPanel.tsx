import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
  DollarSign,
  Calendar,
  Info,
  TrendingUp,
  User,
  Zap,
  Check,
  CreditCard,
  Building2,
  Phone,
  BadgeCheck,
  Star,
  Brain,
  MessageSquare
} from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { PremiumAudioPlayer } from '../components/PremiumAudioPlayer';

interface WalletState {
  companyId: string;
  balance: number;
}

interface AgentWithdrawal {
  _id: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: string;
}

interface CompanyCallRow {
  callId: string;
  agent: string;
  lead: string;
  leadObj?: { First_Name: string; Last_Name: string };
  direction?: string;
  duration: number;
  startTime: string;
  createdAt?: string;
  status?: string;
  validByCompany: boolean | null;
  validByReps: boolean | null;
  validByAI: boolean | null;
  valid: boolean | null;
  repCallCommission?: number;
  repTransactionCommission?: number;
  transactionOccurred?: boolean;
  recording_url?: string | null;
  recording_url_cloudinary?: string | null;
  transcript?: any[];
  ai_call_score?: any;
}

const AI_SCORE_META_KEYS = new Set([
  'overall',
  'transaction_detected',
  'refusal_detected',
  'score',
  'sentiment',
  'rubrics',
  'transactionOccurred'
]);

interface NormalizedAiScore {
  score: number | null;
  sentimentLabel: string;
  transactionDetected: boolean;
  rubrics: Record<string, { score: number; feedback?: string }>;
  overallFeedback?: string;
}

function normalizeAiCallScore(raw: unknown): NormalizedAiScore | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const overall = (data.overall as Record<string, unknown> | undefined) || {};
  const rawScore = (overall.score ?? data.score) as number | undefined;
  const sentiment = data['Sentiment analysis'] as Record<string, unknown> | undefined;
  const sentimentScore = Number(sentiment?.score ?? -1);
  const sentimentLabel =
    sentimentScore >= 70 ? 'Positif'
      : sentimentScore >= 40 ? 'Neutre'
        : sentimentScore >= 0 ? 'Négatif'
          : '—';
  const rubrics: Record<string, { score: number; feedback?: string }> = {};
  if (data.rubrics && typeof data.rubrics === 'object') {
    for (const [k, v] of Object.entries(data.rubrics as Record<string, any>)) {
      if (v && typeof v === 'object' && typeof v.score === 'number') {
        rubrics[k] = { score: v.score, feedback: v.feedback };
      }
    }
  } else {
    for (const [k, v] of Object.entries(data)) {
      if (AI_SCORE_META_KEYS.has(k)) continue;
      if (v && typeof v === 'object' && typeof (v as any).score === 'number') {
        rubrics[k] = { score: (v as any).score, feedback: (v as any).feedback };
      }
    }
  }
  return {
    score: typeof rawScore === 'number' ? rawScore : null,
    sentimentLabel,
    transactionDetected: data.transaction_detected === true,
    rubrics,
    overallFeedback: (overall.feedback as string | undefined) || undefined
  };
}

function formatFloatMinutesToMMSS(mins: number): string {
  const totalSeconds = Math.max(0, Math.round(mins * 60));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function WalletCompanyPanel() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [agentWithdrawals, setAgentWithdrawals] = useState<AgentWithdrawal[]>([]);
  const [companyCalls, setCompanyCalls] = useState<CompanyCallRow[]>([]);
  const [approvingCallId, setApprovingCallId] = useState<string | null>(null);
  const [callsTab, setCallsTab] = useState<'pending' | 'validated' | 'refused'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CompanyCallRow | null>(null);
  const [selectedCallTab, setSelectedCallTab] = useState<'transcript' | 'insights'>('transcript');

  // Modals state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('500');
  const [depositMethod, setDepositMethod] = useState<'card' | 'paypal'>('card');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('200');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const companyId = Cookies.get('companyId') || '6a0bfd35d605ccca8b51e13b';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch wallet balance from our new vertical endpoint
      const walletRes = await fetch(`${apiBaseUrl}/wallet-company/${companyId}`);
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        if (walletData.success && walletData.data) {
          setWallet(walletData.data);
          
          // Dispatch global balance sync event for header
          const event = new CustomEvent('balanceUpdated', {
            detail: {
              balance: walletData.data.balance,
            }
          });
          window.dispatchEvent(event);
        }
      }

      // 3. Calls & sales awaiting company validation
      const callsRes = await fetch(`${apiBaseUrl}/escrow/calls/${companyId}`);
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        if (callsData.success && Array.isArray(callsData.data)) {
          setCompanyCalls(callsData.data);
        } else {
          setCompanyCalls([]);
        }
      }

      // 4. Fetch representatives withdrawal requests pending validation
      const agentRes = await fetch(`${apiBaseUrl}/wallet-company/agent-withdrawals/${companyId}`);
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        if (agentData.success && agentData.data) {
          setAgentWithdrawals(agentData.data);
        }
      }

    } catch (err) {
      console.error('Error loading Wallet Company data:', err);
      toast.error('Impossible de synchroniser le compte financier.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
    toast.success('Mon portefeuille mis à jour.', { id: 'refresh-wallet-toast' });
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Veuillez entrer un montant valide.');
      return;
    }

    setSubmittingDeposit(true);
    try {
      const res = await fetch(`${apiBaseUrl}/wallet-company/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          amount: parsed
        })
      });

      if (res.ok) {
        toast.success(`Dépôt de ${parsed.toLocaleString()} € validé !`);
        setShowDepositModal(false);
        fetchData(true);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Erreur lors du dépôt.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Échec de communication avec la passerelle.');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(withdrawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Veuillez entrer un montant valide.');
      return;
    }

    if (wallet && wallet.balance < parsed) {
      toast.error('Solde insuffisant.');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const res = await fetch(`${apiBaseUrl}/wallet-company/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          amount: parsed
        })
      });

      if (res.ok) {
        toast.success(`Retrait de ${parsed.toLocaleString()} € effectué !`);
        setShowWithdrawModal(false);
        fetchData(true);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Erreur lors du retrait.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Échec de communication avec la passerelle.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  // Validation = AI validation. Le wallet est débité automatiquement
  // dès que l'IA valide un appel (pas besoin d'action manuelle).
  const pendingValidationCalls = companyCalls.filter(
    (c) => c.validByAI == null
  );
  const validatedCalls = companyCalls.filter(
    (c) => c.validByAI === true
  );
  const refusedCalls = companyCalls.filter(
    (c) => c.validByAI === false
  );
  const visibleCalls =
    callsTab === 'pending' ? pendingValidationCalls
    : callsTab === 'validated' ? validatedCalls
    : refusedCalls;

  const handleCallApproval = async (callId: string, action: 'approve' | 'refuse') => {
    setApprovingCallId(callId);
    try {
      const res = await fetch(`${apiBaseUrl}/escrow/calls/approve/${callId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, action })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const booked = data.data?.repTransactions;
        const callBooked = booked?.call;
        if (action === 'approve' && callBooked) {
          toast.success(
            `Validé — débit ${callBooked.amount}€ (Rep 70%: ${callBooked.repShare}€ · HARX 30%: ${callBooked.harxShare}€)`
          );
        } else if (action === 'approve') {
          toast.success('Appel / vente validé — portefeuille mis à jour.');
        } else {
          toast.success('Validation refusée.');
        }
        if (data.data?.walletCompany?.balance != null) {
          setWallet({ companyId, balance: data.data.walletCompany.balance });
          window.dispatchEvent(
            new CustomEvent('balanceUpdated', { detail: { balance: data.data.walletCompany.balance } })
          );
        }
        fetchData(true);
      } else {
        toast.error(data.error || 'Impossible de traiter la validation.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la validation.');
    } finally {
      setApprovingCallId(null);
    }
  };

  const handleAgentWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'refuse') => {
    try {
      const res = await fetch(`${apiBaseUrl}/wallet-company/agent-withdrawals/approve/${withdrawalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        toast.success(action === 'approve' ? 'Demande de retrait approuvée !' : 'Demande de retrait refusée.');
        fetchData(true);
      } else {
        toast.error('Impossible de traiter la demande.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur technique lors du traitement.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-12 w-12 animate-spin text-orange-500" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement du portefeuille...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 rounded-2xl bg-orange-500/10 text-orange-500">
              <Wallet size={24} />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mon Portefeuille Cash</h1>
          </div>
          <p className="text-sm text-gray-500">
            Déposez des fonds en Euros pour rémunérer vos représentants et régler vos commissions HARX.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all duration-300 shadow-sm text-gray-600 hover:text-orange-500 disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs uppercase tracking-wider shadow-sm transition-all duration-300 active:scale-95"
          >
            Demander un retrait
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 rounded-2xl transition-all duration-300 active:scale-95 flex items-center gap-2"
          >
            <Sparkles size={16} />
            <span>Créditer Portefeuille</span>
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl border border-white/5">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute left-1/4 bottom-0 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/80 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                Solde Euros Cash
              </span>
              <Building2 size={24} className="text-white/40" />
            </div>

            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Disponible pour retraits & commissions
              </span>
              <span className="text-5xl font-black tracking-tight block">
                {(wallet?.balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Passerelle de paiement Stripe active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider mb-4">
              <TrendingUp size={16} />
              <span>Activité Représentants</span>
            </div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Demandes de retraits en attente</h3>
            <span className="text-4xl font-black text-slate-900 block mb-2">
              {agentWithdrawals.length}
            </span>
            <p className="text-xs text-gray-500">
              Représentants en attente de versement de commission accumulée lors de leurs appels qualifiés.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Total à liquider</span>
            <span className="text-lg font-black text-slate-800">
              {agentWithdrawals.reduce((sum, w) => sum + w.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </div>

      {/* Calls & transactions to validate — debits WalletCompany (70% rep / 30% HARX) */}
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              Validations appels & ventes
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Chaque validation débite votre portefeuille : 70% pour le rep, 30% pour HARX.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1">
            {([
              { id: 'pending', label: 'En attente', count: pendingValidationCalls.length, tone: 'text-amber-700' },
              { id: 'validated', label: 'Validés', count: validatedCalls.length, tone: 'text-emerald-700' },
              { id: 'refused', label: 'Refusés', count: refusedCalls.length, tone: 'text-rose-700' }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCallsTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  callsTab === tab.id
                    ? `bg-white shadow-sm border border-slate-200 ${tab.tone}`
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className="bg-slate-100 text-slate-600 px-1.5 rounded-full text-[9px]">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-[1.5rem] text-gray-400 gap-3">
            <Phone size={36} className="text-blue-500 animate-pulse" />
            <p className="text-sm font-bold">
              {callsTab === 'pending'
                ? 'Aucune validation en attente.'
                : callsTab === 'validated'
                  ? "Aucun appel validé pour l'instant."
                  : 'Aucun appel refusé.'}
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh] rounded-2xl border border-gray-50 calls-scroll">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4 bg-white">Destinataire</th>
                  <th className="py-3 px-4 bg-white">Date & Heure</th>
                  <th className="py-3 px-4 bg-white">Durée</th>
                  <th className="py-3 px-4 bg-white">Score AI</th>
                  <th className="py-3 px-4 bg-white">
                    {callsTab === 'pending' ? 'Action' : 'Commission'}
                  </th>
                  <th className="py-3 px-4 bg-white text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {visibleCalls.map((call) => {
                  const hasSale = call.validByReps === true;
                  return (
                    <tr key={call.callId} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span>
                            {call.leadObj
                              ? `${call.leadObj.First_Name} ${call.leadObj.Last_Name}`
                              : call.lead || 'Inconnu'}
                          </span>
                          {call.validByAI === true && (
                            <span
                              title="Appel validé par l'IA"
                              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100"
                            >
                              <BadgeCheck size={12} />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-0.5">{call.agent}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-500">
                        {new Date(call.startTime).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-4 px-4 text-slate-900 font-bold tabular-nums">
                        {formatFloatMinutesToMMSS((call.duration || 0) / 60)}
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const ai = normalizeAiCallScore(call.ai_call_score);
                          return ai?.score != null ? (
                            <div className="flex items-center gap-1 font-bold text-slate-800">
                              <Star size={14} className="fill-amber-400 text-amber-400" />
                              <span>{ai.score}/100</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Non noté</span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        {callsTab === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={approvingCallId === call.callId}
                              onClick={() => handleCallApproval(call.callId, 'refuse')}
                              className="p-2 text-gray-500 hover:text-rose-600 bg-white border border-gray-100 rounded-xl disabled:opacity-50"
                            >
                              <X size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={approvingCallId === call.callId}
                              onClick={() => handleCallApproval(call.callId, 'approve')}
                              className="px-3 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider disabled:opacity-50 flex items-center gap-1"
                            >
                              {approvingCallId === call.callId ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                              Valider
                            </button>
                          </div>
                        ) : callsTab === 'validated' ? (() => {
                          const repCall = Number(call.repCallCommission || 0);
                          const repTx = hasSale ? Number(call.repTransactionCommission || 0) : 0;
                          const repShare = repCall + repTx;
                          const gross = repShare > 0 ? repShare / 0.7 : 0;
                          const harxShare = gross > 0 ? gross - repShare : 0;
                          const agentName = call.agent || 'Rep';
                          return gross > 0 ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-sm font-black text-slate-900 tabular-nums">
                                {gross.toFixed(2)} €
                              </span>
                              <div className="text-[9px] font-bold leading-tight space-y-0.5">
                                <div className="text-emerald-700">
                                  70% {agentName} · {repShare.toFixed(2)} €
                                </div>
                                <div className="text-slate-500">
                                  30% HARX · {harxShare.toFixed(2)} €
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[9px] uppercase tracking-wider">
                              <BadgeCheck size={10} /> Validé
                            </span>
                          );
                        })() : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-bold text-[9px] uppercase tracking-wider">
                            <X size={10} /> Refusé
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCall(call);
                            setSelectedCallTab('transcript');
                          }}
                          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all"
                        >
                          Consulter
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-gray-100 p-6 shadow-2xl space-y-6 relative animate-fade-in-up">
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Alimenter mon Portefeuille</h3>
              <p className="text-xs text-gray-500">Créditez instantanément votre solde en Euros.</p>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Montant à créditer (€)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                    €
                  </div>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Méthode de paiement</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDepositMethod('card')}
                    className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${depositMethod === 'card' ? 'border-orange-500 bg-orange-50/50 text-orange-600' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <CreditCard size={18} />
                    <span>Carte Bancaire</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositMethod('paypal')}
                    className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${depositMethod === 'paypal' ? 'border-orange-500 bg-orange-50/50 text-orange-600' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <DollarSign size={18} />
                    <span>PayPal</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-2.5 text-[10px] text-blue-800/80 font-bold leading-relaxed">
                <Info size={16} className="shrink-0 text-blue-600" />
                <span>Simulation de transactions Stripe & PayPal sécurisées par bac à sable de paiement.</span>
              </div>

              <button
                type="submit"
                disabled={submittingDeposit}
                className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-orange-500/10 active:scale-95 disabled:opacity-50"
              >
                {submittingDeposit ? 'Transaction en cours...' : `Payer ${depositAmount} €`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-gray-100 p-6 shadow-2xl space-y-6 relative animate-fade-in-up">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Demander un Retrait</h3>
              <p className="text-xs text-gray-500">Récupérez les fonds Euros disponibles dans votre compte.</p>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Montant à retirer (€)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                    €
                  </div>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    min="1"
                    max={wallet?.balance || 0}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
                <span className="text-[9px] text-gray-400 font-bold block mt-1">Solde disponible: {(wallet?.balance || 0).toLocaleString()} €</span>
              </div>

              <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl flex gap-2.5 text-[10px] text-orange-800/80 font-bold leading-relaxed">
                <AlertCircle size={16} className="shrink-0 text-orange-600" />
                <span>Le versement sera traité sous 24-48 heures ouvrées sur votre compte bancaire d'entreprise enregistré.</span>
              </div>

              <button
                type="submit"
                disabled={submittingWithdraw}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50"
              >
                {submittingWithdraw ? 'Traitement en cours...' : `Confirmer le retrait de ${withdrawAmount} €`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Call Details Modal — same look & feel as the Calls panel */}
      {selectedCall && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl h-[85vh] bg-[#F8FAFC] rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="p-6 bg-white border-b border-gray-100 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Appel avec {selectedCall.leadObj
                      ? `${selectedCall.leadObj.First_Name} ${selectedCall.leadObj.Last_Name}`
                      : selectedCall.lead}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold block mt-0.5">ID d'appel: {selectedCall.callId}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCall(null)}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Audio Player */}
            {(selectedCall.recording_url || selectedCall.recording_url_cloudinary) && (
              <div className="bg-slate-950 p-6 border-b border-white/5 shrink-0">
                <PremiumAudioPlayer url={selectedCall.recording_url_cloudinary || selectedCall.recording_url || ''} />
              </div>
            )}

            {/* Modal Body Tabs */}
            <div className="bg-white border-b border-gray-100 shrink-0 flex items-center gap-2 px-6">
              <button
                onClick={() => setSelectedCallTab('transcript')}
                className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 ${selectedCallTab === 'transcript' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-slate-700'}`}
              >
                Transcription
              </button>
              <button
                onClick={() => setSelectedCallTab('insights')}
                className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 ${selectedCallTab === 'insights' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-slate-700'}`}
              >
                Score & Insights AI
              </button>
            </div>

            {/* Modal Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCallTab === 'transcript' ? (
                <div className="space-y-4">
                  {Array.isArray(selectedCall.transcript) && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((utterance: any, index: number) => {
                      const isRep = utterance.speaker === 'rep' || utterance.speaker === 'agent';
                      return (
                        <div key={index} className={`flex gap-3 max-w-[80%] ${isRep ? 'ml-auto flex-row-reverse' : ''}`}>
                          <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black ${isRep ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {isRep ? 'REP' : 'CLT'}
                          </div>
                          <div className={`p-4 rounded-2xl ${isRep ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-slate-800 rounded-tl-none'}`}>
                            <p className="text-xs leading-relaxed">{utterance.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <MessageSquare size={36} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-xs">Aucune transcription disponible pour cet appel.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const ai = normalizeAiCallScore(selectedCall.ai_call_score);
                    return ai ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Note d'assurance Qualité</span>
                            <span className="text-3xl font-black text-slate-900 mt-2">{ai.score ?? 0}/100</span>
                            {ai.overallFeedback && (
                              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">{ai.overallFeedback}</p>
                            )}
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sentiment Client</span>
                            <span className="text-base font-black text-slate-900 mt-2">{ai.sentimentLabel}</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Transaction détectée</span>
                            <span className={`text-xs font-black mt-2 ${ai.transactionDetected ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {ai.transactionDetected ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>

                        {Object.keys(ai.rubrics).length > 0 && (
                          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              <Brain size={16} className="text-blue-500" />
                              <span>Rubriques de notation AI</span>
                            </h4>
                            <div className="space-y-3.5">
                              {Object.entries(ai.rubrics).map(([k, v]) => (
                                <div key={k} className="flex flex-col gap-1.5 pb-3 border-b border-gray-50 last:border-0">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 capitalize">{k.replace(/_/g, ' ')}</span>
                                    <span className="font-black text-slate-900">{v.score}/100</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${v.score}%` }} />
                                  </div>
                                  {v.feedback && (
                                    <p className="text-[10px] text-gray-500 italic mt-0.5">{v.feedback}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <Brain size={36} className="mx-auto mb-2 text-gray-300 animate-pulse" />
                        <p className="text-xs">Analyse en attente d'exécution.</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .calls-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .calls-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .calls-scroll::-webkit-scrollbar-track { background: transparent; }
        .calls-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
        .calls-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}</style>
    </div>
  );
}
export default WalletCompanyPanel;
