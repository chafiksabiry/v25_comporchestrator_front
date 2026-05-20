import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
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
  BadgeCheck
} from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface WalletState {
  companyId: string;
  balance: number;
}

interface WalletTransaction {
  _id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
  commission_rep?: number;
  commission_harx?: number;
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
  duration: number;
  startTime: string;
  validByCompany: boolean | null;
  validByReps: boolean | null;
  validByAI: boolean | null;
  valid: boolean | null;
  repCallCommission?: number;
  repTransactionCommission?: number;
  transactionOccurred?: boolean;
}

const COMMISSION_CHARGE_TYPES = new Set([
  'reward_charge',
  'transaction_charge',
  'bonus_charge',
  'call_charge'
]);

function formatEscrowTxLabel(type: string): string {
  switch (type) {
    case 'deposit': return 'Dépôt';
    case 'withdrawal': return 'Retrait';
    case 'reward_charge': return 'Appel validé';
    case 'transaction_charge': return 'Vente validée';
    case 'bonus_charge': return 'Bonus rep';
    case 'call_charge': return 'Commission IA';
    default: return type;
  }
}

export function WalletCompanyPanel() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [agentWithdrawals, setAgentWithdrawals] = useState<AgentWithdrawal[]>([]);
  const [companyCalls, setCompanyCalls] = useState<CompanyCallRow[]>([]);
  const [approvingCallId, setApprovingCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      // 2. Fetch transaction history (deposits, withdrawals, commissions 70/30)
      const txRes = await fetch(`${apiBaseUrl}/escrow/transactions/${companyId}`);
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.success && txData.data) {
          setTransactions(
            txData.data.filter(
              (t: WalletTransaction) =>
                t.type === 'deposit' ||
                t.type === 'withdrawal' ||
                COMMISSION_CHARGE_TYPES.has(t.type)
            )
          );
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

  const pendingValidationCalls = companyCalls.filter(
    (c) => c.validByCompany !== true && c.valid !== true
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              Validations appels & ventes
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Chaque validation débite votre portefeuille : 70% pour le rep, 30% pour HARX.
            </p>
          </div>
          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-bold uppercase">
            {pendingValidationCalls.length} en attente
          </span>
        </div>

        {pendingValidationCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-100 rounded-[1.5rem] text-gray-400 gap-2">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="text-sm font-bold">Aucune validation en attente.</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[50vh] rounded-2xl border border-gray-50 calls-scroll-company">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4 bg-white">Rep / Lead</th>
                  <th className="py-3 px-4 bg-white">Date</th>
                  <th className="py-3 px-4 bg-white">Durée</th>
                  <th className="py-3 px-4 bg-white">IA</th>
                  <th className="py-3 px-4 bg-white">Vente</th>
                  <th className="py-3 px-4 bg-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingValidationCalls.map((call) => {
                  const hasSale = call.validByReps === true;
                  return (
                    <tr key={call.callId} className="hover:bg-gray-50/80">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{call.lead}</div>
                        <div className="text-[10px] text-gray-400">{call.agent}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-500">
                        {new Date(call.startTime).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-4 px-4 font-bold tabular-nums text-slate-800">
                        {Math.floor((call.duration || 0) / 60)}:
                        {String((call.duration || 0) % 60).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4">
                        {call.validByAI === true ? (
                          <span className="text-emerald-600 font-bold">Validé IA</span>
                        ) : call.validByAI === false ? (
                          <span className="text-rose-500 font-bold">Refusé</span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {hasSale ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold">
                            <BadgeCheck size={12} /> Déclarée
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid section for lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Representative Withdrawals list */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              Demandes de versements des Représentants
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase">
              Action Requise
            </span>
          </div>

          {agentWithdrawals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-[1.5rem] text-gray-400 gap-3">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <p className="text-sm font-bold">Aucune demande de versement en attente.</p>
              <p className="text-xs text-gray-500 text-center max-w-xs">
                Vos représentants n'ont pas formulé de nouvelle demande de retrait ou tous leurs gains ont déjà été traités.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agentWithdrawals.map((withdrawal) => (
                <div key={withdrawal._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-200 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black">
                      {withdrawal.agentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{withdrawal.agentName}</h4>
                      <p className="text-[10px] text-gray-500">{withdrawal.agentEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">{withdrawal.amount.toLocaleString()} €</span>
                      <span className="text-[9px] text-gray-400 block">{new Date(withdrawal.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAgentWithdrawalAction(withdrawal._id, 'refuse')}
                        className="p-2.5 text-gray-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-gray-100 hover:border-rose-100 rounded-xl transition-all duration-300"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={() => handleAgentWithdrawalAction(withdrawal._id, 'approve')}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>Valider</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction History list */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-800 tracking-tight">
            Mouvements de fonds
          </h3>

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Info size={32} />
              <p className="text-xs font-bold">Aucun mouvement enregistré.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {transactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const isCharge = COMMISSION_CHARGE_TYPES.has(tx.type);
                const commissionRep = tx.commission_rep;
                const commissionHarx = tx.commission_harx;
                return (
                  <div key={tx._id} className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${isDeposit ? 'bg-emerald-100 text-emerald-600' : isCharge ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                        {isDeposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                          {formatEscrowTxLabel(tx.type)}
                        </h4>
                        <p className="text-[9px] text-gray-500 line-clamp-1">{tx.description}</p>
                        {isCharge && (commissionRep != null || commissionHarx != null) && (
                          <p className="text-[9px] text-orange-600/90 font-bold mt-0.5">
                            Rep 70%: {commissionRep?.toFixed(2)} € · HARX 30%: {commissionHarx?.toFixed(2)} €
                          </p>
                        )}
                        <span className="text-[9px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <span className={`text-xs font-black shrink-0 ${isDeposit ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isDeposit ? '+' : '-'}{tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

      <style>{`
        .calls-scroll-company { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .calls-scroll-company::-webkit-scrollbar { width: 8px; height: 8px; }
        .calls-scroll-company::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 9999px; }
      `}</style>
    </div>
  );
}
export default WalletCompanyPanel;
