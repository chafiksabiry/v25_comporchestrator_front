import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  RefreshCw,
  X,
  Coins,
  Sparkles,
  DollarSign,
  Calendar,
  Info,
  TrendingUp,
  HelpCircle,
  User,
  Zap,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface EscrowContract {
  _id: string;
  gigId?: string;
  gigTitle?: string;
  agentId?: string;
  agentName?: string;
  amount: number;
  status: 'locked' | 'released' | 'refunded';
  purpose: string;
  createdAt: string;
}

interface EscrowTransaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'escrow_lock' | 'escrow_release' | 'escrow_refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  referenceId?: string;
  createdAt: string;
}

interface WalletState {
  companyId: string;
  balance: number;
  escrow: number;
  contracts: EscrowContract[];
}

export function EscrowPanel() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('500');
  const [depositDesc, setDepositDesc] = useState('Stripe credit card deposit');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('200');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockAmount, setLockAmount] = useState('250');
  const [lockGigId, setLockGigId] = useState('');
  const [lockGigTitle, setLockGigTitle] = useState('');
  const [lockAgentId, setLockAgentId] = useState('');
  const [lockAgentName, setLockAgentName] = useState('');
  const [lockPurpose, setLockPurpose] = useState('Weekly milestone performance guarantee');
  const [submittingLock, setSubmittingLock] = useState(false);

  interface EnrolledRep {
    agentId: string;
    name: string;
  }

  interface GigAndReps {
    gigId: string;
    title: string;
    enrolledReps: EnrolledRep[];
  }

  const [gigsAndReps, setGigsAndReps] = useState<GigAndReps[]>([]);
  const [gigsLoading, setGigsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'contracts' | 'history'>('contracts');

  const [isGigDropdownOpen, setIsGigDropdownOpen] = useState(false);
  const [isRepDropdownOpen, setIsRepDropdownOpen] = useState(false);

  // Custom Confirmation Popups
  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false);
  const [releaseContractId, setReleaseContractId] = useState('');
  const [releaseAmount, setReleaseAmount] = useState(0);
  const [releaseAgentName, setReleaseAgentName] = useState('');
  const [releasingInProcess, setReleasingInProcess] = useState(false);

  const [showRefundConfirmModal, setShowRefundConfirmModal] = useState(false);
  const [refundContractId, setRefundContractId] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundingInProcess, setRefundingInProcess] = useState(false);

  const companyId = Cookies.get('companyId') || 'demo_company_id';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

  const fetchWalletData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch wallet
      const walletRes = await fetch(`${apiBaseUrl}/escrow/wallet/${companyId}`);
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        if (walletData.success && walletData.data) {
          setWallet(walletData.data);
          
          const event = new CustomEvent('balanceUpdated', {
            detail: {
              balance: walletData.data.balance,
              escrow: walletData.data.escrow || 0
            }
          });
          window.dispatchEvent(event);
        }
      }

      // 2. Fetch transactions
      const txRes = await fetch(`${apiBaseUrl}/escrow/transactions/${companyId}`);
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.success && txData.data) {
          setTransactions(txData.data);
        }
      }
    } catch (err) {
      console.error('Error loading escrow data:', err);
      toast.error('Could not synchronize escrow account.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
    
    // Auto-update if balance is triggered elsewhere
    const handleRefreshRequest = () => {
      fetchWalletData(true);
    };
    window.addEventListener('refreshBalance', handleRefreshRequest);
    return () => {
      window.removeEventListener('refreshBalance', handleRefreshRequest);
    };
  }, [companyId]);

  useEffect(() => {
    const fetchGigsAndReps = async () => {
      setGigsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/escrow/gigs-and-reps/${companyId}`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            setGigsAndReps(result.data);
            
            // Set initial defaults if available
            if (result.data.length > 0) {
              const firstGig = result.data[0];
              setLockGigId(firstGig.gigId);
              setLockGigTitle(firstGig.title);
              
              if (firstGig.enrolledReps.length > 0) {
                const firstRep = firstGig.enrolledReps[0];
                setLockAgentId(firstRep.agentId);
                setLockAgentName(firstRep.name);
              } else {
                setLockAgentId('');
                setLockAgentName('');
              }
            } else {
              setLockGigId('');
              setLockGigTitle('');
              setLockAgentId('');
              setLockAgentName('');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching gigs and reps dropdown data:', err);
      } finally {
        setGigsLoading(false);
      }
    };

    if (companyId) {
      fetchGigsAndReps();
    }
  }, [companyId, showLockModal]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData(true);
    toast.success('Escrow status updated.', { id: 'refresh-toast' });
  };

  // Perform deposit
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmittingDeposit(true);
    try {
      const res = await fetch(`${apiBaseUrl}/escrow/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          amount: parsed,
          description: 'Balance Top-up (Stripe Payment)'
        })
      });

      if (res.ok) {
        toast.success(`Successfully funded account with $${parsed.toFixed(2)}!`);
        setShowDepositModal(false);
        fetchWalletData(true);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to deposit.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to communicate with billing gateway.');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Perform withdrawal
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(withdrawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (wallet && wallet.balance < parsed) {
      toast.error('Insufficient available balance to complete withdrawal.');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const res = await fetch(`${apiBaseUrl}/escrow/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          amount: parsed
        })
      });

      if (res.ok) {
        toast.success(`Successfully withdrawn $${parsed.toFixed(2)} to linked card.`);
        setShowWithdrawModal(false);
        fetchWalletData(true);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to process withdrawal.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to communicate with server.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  // Perform Escrow Lock
  const handleLockFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(lockAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (wallet && wallet.balance < parsed) {
      toast.error('Insufficient available balance. Top-up before locking escrow funds.');
      return;
    }

    setSubmittingLock(true);
    try {
      const res = await fetch(`${apiBaseUrl}/escrow/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          amount: parsed,
          gigId: lockGigId,
          gigTitle: lockGigTitle,
          agentId: lockAgentId,
          agentName: lockAgentName,
          purpose: lockPurpose
        })
      });

      if (res.ok) {
        toast.success(`Successfully secured $${parsed.toFixed(2)} in Escrow contract!`);
        setShowLockModal(false);
        fetchWalletData(true);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to lock funds.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to establish escrow lock contract.');
    } finally {
      setSubmittingLock(false);
    }
  };

  // Trigger custom confirmation modal for release
  const handleReleaseEscrow = (contractId: string, amount: number, agentName: string) => {
    setReleaseContractId(contractId);
    setReleaseAmount(amount);
    setReleaseAgentName(agentName);
    setShowReleaseConfirmModal(true);
  };

  const executeReleaseEscrow = async () => {
    setReleasingInProcess(true);
    try {
      const res = await fetch(`${apiBaseUrl}/escrow/release/${releaseContractId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });

      if (res.ok) {
        toast.success(`Payment disbursed successfully! $${releaseAmount.toFixed(2)} transferred to ${releaseAgentName}.`);
        setShowReleaseConfirmModal(false);
        fetchWalletData(true);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to disburse escrow funds.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not disburse escrow payment.');
    } finally {
      setReleasingInProcess(false);
    }
  };

  // Trigger custom confirmation modal for refund
  const handleRefundEscrow = (contractId: string, amount: number) => {
    setRefundContractId(contractId);
    setRefundAmount(amount);
    setShowRefundConfirmModal(true);
  };

  const executeRefundEscrow = async () => {
    setRefundingInProcess(true);
    try {
      const res = await fetch(`${apiBaseUrl}/escrow/refund/${refundContractId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });

      if (res.ok) {
        toast.success(`Escrow cancelled. $${refundAmount.toFixed(2)} restored to your available balance.`);
        setShowRefundConfirmModal(false);
        fetchWalletData(true);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to refund escrow funds.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not refund escrow contract.');
    } finally {
      setRefundingInProcess(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Synchronizing secure wallet...</p>
      </div>
    );
  }

  // Derived metrics
  const displayBalance = wallet?.balance || 0;
  const displayEscrow = wallet?.escrow || 0;
  const totalFunded = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDisbursed = wallet?.contracts
    .filter(c => c.status === 'released')
    .reduce((sum, c) => sum + c.amount, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-in">
      
      {/* Upper Navigation & Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-gradient-to-r from-orange-400 to-rose-500 text-white rounded-lg shadow-lg shadow-rose-500/10">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-none">Escrow & Balance Manager</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">Manage corporate campaigns fund deposits, secure agent lock guarantees, and verify transaction history.</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            className={`p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm text-slate-500 hover:text-slate-800 transition-all ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh Account State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Alimenter le compte
          </button>
        </div>
      </div>

      {/* Escrow Guarantee Infobar */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wide">HARX Escrow Secure Protocol Activated</h4>
          <p className="text-xs text-slate-600 leading-relaxed mt-0.5 font-medium">
            All agent bookings require a minimum milestone escrow pledge. Locked balances are strictly safe in the secure vault and are disembursed immediately upon validated campaign completions or restored to your balance if contracts are canceled.
          </p>
        </div>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Available Balance */}
        <div className="bg-white border border-slate-200 hover:border-orange-200 rounded-2xl p-5 shadow-sm relative group overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full translate-x-12 -translate-y-12 transition-transform duration-500 group-hover:scale-110" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solde Disponible</span>
            <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-slate-500">Unrestricted virtual capital</span>
              <span className="text-[10px] bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded-full">Available</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] relative z-10">
            <button onClick={() => setShowWithdrawModal(true)} className="text-slate-500 hover:text-orange-500 font-bold uppercase tracking-tight">Retrait fonds</button>
            <button onClick={() => setShowDepositModal(true)} className="text-orange-500 hover:text-orange-600 font-black uppercase tracking-tight">Alimenter</button>
          </div>
        </div>

        {/* Metric 2: Escrow Locked */}
        <div className="bg-white border border-slate-200 hover:border-rose-200 rounded-2xl p-5 shadow-sm relative group overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full translate-x-12 -translate-y-12 transition-transform duration-500 group-hover:scale-110" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fonds Séquestre (Locked)</span>
            <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">${displayEscrow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-slate-500">Secured for active campaigns</span>
              <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded-full">Escrow</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] relative z-10">
            <span className="text-slate-400 font-semibold">Active guarantees:</span>
            <button onClick={() => setShowLockModal(true)} className="text-rose-500 hover:text-rose-600 font-black uppercase tracking-tight">Nouveau séquestre</button>
          </div>
        </div>

        {/* Metric 3: Total Funded */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative group overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumul Approvisionné</span>
            <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">${totalFunded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Total inputs via external payment systems</p>
          </div>
        </div>

        {/* Metric 4: Paid to Representatives */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative group overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payé aux REPS</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg">
              <Unlock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">${totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Milestones completed & successfully paid</p>
          </div>
        </div>
      </div>

      {/* Main Tabbed Container: Active Escrows vs Audit Log */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-100 bg-slate-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeTab === 'contracts'
                ? 'bg-white text-orange-500 shadow-sm border border-slate-100'
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Garanties & Séquestres ({wallet?.contracts.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeTab === 'history'
                ? 'bg-white text-orange-500 shadow-sm border border-slate-100'
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Historique des Transactions ({transactions.length})
            </button>
          </div>
          <div className="flex items-center">
            {activeTab === 'contracts' ? (
              <button
                onClick={() => setShowLockModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-extrabold uppercase tracking-wide rounded-lg shadow-sm transition-all"
              >
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                Bloquer Nouveau Séquestre
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Immutable Audit Ledger
              </span>
            )}
          </div>
        </div>

        {/* Tab Content 1: Active Escrows Table */}
        {activeTab === 'contracts' && (
          <div className="overflow-x-auto">
            {(!wallet || wallet.contracts.length === 0) ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No active escrow locks</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">When you set campaign objectives or enroll a representative, lock guarantees to establish trusted relationships.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/10">
                    <th className="px-6 py-4">Garantie / Campagne</th>
                    <th className="px-6 py-4">Représentant</th>
                    <th className="px-6 py-4 text-right">Montant</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date de blocage</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wallet.contracts.map((contract) => (
                    <tr key={contract._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm leading-tight">{contract.gigTitle || 'Custom Contract'}</div>
                        <div className="text-[10px] text-slate-400 font-medium italic mt-0.5">{contract.purpose}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200">
                            {contract.agentName?.charAt(0) || 'R'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{contract.agentName || 'Assigned Representative'}</div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">ID: {contract.agentId || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                        ${contract.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {contract.status === 'locked' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            🔒 Locked / Séquestre
                          </span>
                        )}
                        {contract.status === 'released' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            🔓 Released / Payé
                          </span>
                        )}
                        {contract.status === 'refunded' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide bg-slate-50 text-slate-500 border border-slate-200 rounded-full">
                            ↩️ Restitué
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {new Date(contract.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {contract.status === 'locked' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleReleaseEscrow(contract._id, contract.amount, contract.agentName || 'Agent')}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                            >
                              Libérer Fonds
                            </button>
                            <button
                              onClick={() => handleRefundEscrow(contract._id, contract.amount)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                            >
                              Restituer
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Ledger Settled
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content 2: Transaction History Table */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No transaction records</h4>
                <p className="text-xs text-slate-400 mt-1">Your payments, deposits, and locks are fully recorded here for tax and auditing purposes.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/10">
                    <th className="px-6 py-4">Activité / Type</th>
                    <th className="px-6 py-4 text-right">Montant</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Date de transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {tx.type === 'deposit' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold uppercase text-[10px] tracking-wide">
                            <ArrowDownLeft className="w-3.5 h-3.5 bg-emerald-50 p-0.5 rounded" /> Dépôt / Alimentation
                          </span>
                        )}
                        {tx.type === 'withdrawal' && (
                          <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold uppercase text-[10px] tracking-wide">
                            <ArrowUpRight className="w-3.5 h-3.5 bg-slate-50 p-0.5 rounded" /> Retrait / Remboursement
                          </span>
                        )}
                        {tx.type === 'escrow_lock' && (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold uppercase text-[10px] tracking-wide">
                            <Lock className="w-3.5 h-3.5 bg-amber-50 p-0.5 rounded" /> Séquestre Bloqué
                          </span>
                        )}
                        {tx.type === 'escrow_release' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-500 font-bold uppercase text-[10px] tracking-wide">
                            <Unlock className="w-3.5 h-3.5 bg-emerald-50 p-0.5 rounded" /> Séquestre Libéré
                          </span>
                        )}
                        {tx.type === 'escrow_refund' && (
                          <span className="inline-flex items-center gap-1.5 text-indigo-600 font-bold uppercase text-[10px] tracking-wide">
                            <X className="w-3.5 h-3.5 bg-indigo-50 p-0.5 rounded" /> Restitution
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {tx.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending / En attente
                          </span>
                        ) : tx.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
                            <X className="w-3 h-3 text-rose-500" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Success
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 1. Modal: Deposit / Alimentation */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-r from-orange-400 to-rose-500 p-6 text-white relative">
              <button
                onClick={() => setShowDepositModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-2">
                <Coins className="w-5 h-5 animate-bounce-subtle" />
                <span className="text-[10px] bg-white/20 font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Secure Deposit</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-none">Alimenter Votre Solde</h3>
              <p className="text-xs text-white/80 mt-1">Add virtual demo funds securely to your corporate account balance to establish agent contract guarantees.</p>
            </div>

            <form onSubmit={handleDeposit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Montant D'approvisionnement ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="w-4 h-4 text-slate-400 font-black" />
                  </div>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                    min="1"
                    className="pl-9 w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl py-3 px-3 text-slate-900 text-sm font-black focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>



              <div className="grid grid-cols-3 gap-2 pt-1">
                {['250', '500', '1000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`py-2 border rounded-xl text-xs font-black transition-all ${depositAmount === amt
                      ? 'border-orange-500 bg-orange-50/50 text-orange-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    + ${amt}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-black uppercase tracking-tight transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="px-5 py-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white hover:from-orange-500 hover:to-rose-600 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all"
                >
                  {submittingDeposit ? 'Processing...' : 'Valider Dépôt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Withdraw / Retrait */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="bg-slate-900 p-6 text-white relative">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-2">
                <ArrowUpRight className="w-5 h-5 text-orange-400" />
                <span className="text-[10px] bg-white/10 font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Bank Withdrawal</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-none">Demander un Retrait</h3>
              <p className="text-xs text-white/60 mt-1">Return available balance directly to your registered banking coordinates.</p>
            </div>

            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5 mb-2">
                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Available Balance: ${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  Only unpledged available capital can be withdrawn immediately. Locked escrow funds are excluded.
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Montant de Retrait ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="w-4 h-4 text-slate-400 font-black" />
                  </div>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                    min="1"
                    max={displayBalance}
                    className="pl-9 w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl py-3 px-3 text-slate-900 text-sm font-black focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-black uppercase tracking-tight transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="px-5 py-2 bg-slate-900 text-white hover:bg-black font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-slate-900/20 disabled:opacity-50 transition-all"
                >
                  {submittingWithdraw ? 'Processing...' : 'Valider Retrait'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Lock Escrow / Nouveau Séquestre */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[999999] overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-lg overflow-visible shadow-2xl animate-in slide-in-from-bottom-4 my-auto relative">
            <div className="bg-gradient-to-r from-orange-400 to-rose-500 p-6 text-white relative rounded-t-[2rem]">
              <button
                onClick={() => {
                  setShowLockModal(false);
                  setIsGigDropdownOpen(false);
                  setIsRepDropdownOpen(false);
                }}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-2">
                <Lock className="w-5 h-5 animate-pulse" />
                <span className="text-[10px] bg-white/20 font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Secure Milestone Lock</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-none">Bloquer Fonds Sous Séquestre</h3>
              <p className="text-xs text-white/80 mt-1">Commit payment guarantees into escrow to assure active campaign representatives of financial security.</p>
            </div>

            <form onSubmit={handleLockFunds} className="p-6 space-y-4">
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Available Wallet Balance: ${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  Funding this escrow locks designated amount from your available balance. Real payouts are disbursed strictly on milestones validations.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Campagne / Gig</label>
                  {gigsLoading ? (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-400 text-xs font-bold animate-pulse">Chargement...</div>
                  ) : gigsAndReps.length === 0 ? (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-400 text-xs font-bold">Aucune campagne disponible</div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsGigDropdownOpen(!isGigDropdownOpen);
                          setIsRepDropdownOpen(false);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{lockGigTitle || 'Sélectionnez un Gig'}</span>
                        <span className={`text-[9px] text-slate-400 transition-transform duration-200 ${isGigDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                      
                      {isGigDropdownOpen && (
                        <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 z-[9999999] animate-in fade-in-50 slide-in-from-top-2">
                          {gigsAndReps.map((gig) => (
                            <button
                              key={gig.gigId}
                              type="button"
                              onClick={() => {
                                setLockGigId(gig.gigId);
                                setLockGigTitle(gig.title);
                                setIsGigDropdownOpen(false);
                                if (gig.enrolledReps.length > 0) {
                                  setLockAgentId(gig.enrolledReps[0].agentId);
                                  setLockAgentName(gig.enrolledReps[0].name);
                                } else {
                                  setLockAgentId('');
                                  setLockAgentName('');
                                }
                              }}
                              className={`w-full px-3.5 py-2 text-xs text-left cursor-pointer transition-colors flex items-center justify-between ${lockGigId === gig.gigId ? 'bg-orange-50 text-orange-600 font-extrabold' : 'text-slate-700 hover:bg-slate-50 font-bold'}`}
                            >
                              <span className="truncate">{gig.title}</span>
                              {lockGigId === gig.gigId && <span className="text-orange-500">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nom du Représentant</label>
                  {gigsLoading ? (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-400 text-xs font-bold animate-pulse">Chargement...</div>
                  ) : !lockGigId ? (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-400 text-xs font-bold">Sélectionnez une campagne</div>
                  ) : (
                    (() => {
                      const currentGig = gigsAndReps.find(g => g.gigId === lockGigId);
                      const reps = currentGig?.enrolledReps || [];
                      if (reps.length === 0) {
                        return <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-400 text-xs font-bold">Aucun représentant inscrit</div>;
                      }
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRepDropdownOpen(!isRepDropdownOpen);
                              setIsGigDropdownOpen(false);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">{lockAgentName || 'Sélectionnez un Rep'}</span>
                            <span className={`text-[9px] text-slate-400 transition-transform duration-200 ${isRepDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                          </button>
                          
                          {isRepDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 z-[9999999] animate-in fade-in-50 slide-in-from-top-2">
                              {reps.map((rep) => (
                                <button
                                  key={rep.agentId}
                                  type="button"
                                  onClick={() => {
                                    setLockAgentId(rep.agentId);
                                    setLockAgentName(rep.name);
                                    setIsRepDropdownOpen(false);
                                  }}
                                  className={`w-full px-3.5 py-2 text-xs text-left cursor-pointer transition-colors flex items-center justify-between ${lockAgentId === rep.agentId ? 'bg-orange-50 text-orange-600 font-extrabold' : 'text-slate-700 hover:bg-slate-50 font-bold'}`}
                                >
                                  <span className="truncate">{rep.name}</span>
                                  {lockAgentId === rep.agentId && <span className="text-orange-500">✓</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description de la Garantie / Objectif</label>
                <input
                  type="text"
                  value={lockPurpose}
                  onChange={(e) => setLockPurpose(e.target.value)}
                  placeholder="e.g. Bi-weekly performance milestone guarantee"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Montant à Séquestrer ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="w-4 h-4 text-slate-400 font-black" />
                  </div>
                  <input
                    type="number"
                    value={lockAmount}
                    onChange={(e) => setLockAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                    min="1"
                    max={displayBalance}
                    className="pl-9 w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl py-3 px-3 text-slate-900 text-sm font-black focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowLockModal(false);
                    setIsGigDropdownOpen(false);
                    setIsRepDropdownOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-black uppercase tracking-tight transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingLock}
                  className="px-5 py-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white hover:from-orange-500 hover:to-rose-600 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all"
                >
                  {submittingLock ? 'Securing...' : 'Établir Séquestre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 4. Modal: Custom Confirmation for releasing funds */}
      {showReleaseConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[999999] overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 my-auto relative">
            <div className="bg-gradient-to-r from-orange-400 to-rose-500 p-6 text-white relative">
              <button
                onClick={() => setShowReleaseConfirmModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="text-[10px] bg-white/20 font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Disbursal Validation</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-none">Libérer les Fonds</h3>
              <p className="text-xs text-white/80 mt-1">Disburse secure milestone payout directly to representative's available balance.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 text-xs text-slate-600 space-y-3">
                <p className="font-bold text-slate-700 leading-snug">
                  Êtes-vous sûr de vouloir libérer <span className="font-black text-rose-500 text-sm block mt-0.5">${releaseAmount.toFixed(2)}</span> à <span className="font-black text-slate-950">{releaseAgentName}</span> ?
                </p>
                <div className="text-[10px] bg-white border border-rose-500/15 rounded-xl p-3 text-slate-500 leading-relaxed">
                  ⚠️ <span className="font-extrabold text-slate-700">Action Irréversible :</span> Cette action transfère définitivement et immédiatement les fonds vers le solde disponible du représentant.
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  disabled={releasingInProcess}
                  onClick={() => setShowReleaseConfirmModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-black uppercase tracking-tight transition-all active:scale-95"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={releasingInProcess}
                  onClick={executeReleaseEscrow}
                  className="px-5 py-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white hover:from-orange-500 hover:to-rose-600 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {releasingInProcess ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                      <span>Transfert...</span>
                    </>
                  ) : (
                    <span>Libérer les Fonds</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Custom Confirmation for refunding/canceling escrow */}
      {showRefundConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[999999] overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 my-auto relative">
            <div className="bg-gradient-to-r from-orange-400 to-rose-500 p-6 text-white relative">
              <button
                onClick={() => setShowRefundConfirmModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-2">
                <RefreshCw className="w-5 h-5 animate-pulse" />
                <span className="text-[10px] bg-white/20 font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Secure Capital Return</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-none">Restituer Solde</h3>
              <p className="text-xs text-white/80 mt-1">Cancel secure milestone guarantee and return capital to your available balance.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 text-xs text-slate-600 space-y-3">
                <p className="font-bold text-slate-700 leading-snug">
                  Êtes-vous sûr de vouloir annuler ce contrat et restituer <span className="font-black text-rose-500 text-sm block mt-0.5">${refundAmount.toFixed(2)}</span> sur votre solde disponible ?
                </p>
                <div className="text-[10px] bg-white border border-rose-500/15 rounded-xl p-3 text-slate-500 leading-relaxed">
                  🔄 <span className="font-extrabold text-slate-700">Restitution Immédiate :</span> La garantie séquestre sera annulée et la somme sera instantanément recréditée sur votre portefeuille disponible d'entreprise.
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  disabled={refundingInProcess}
                  onClick={() => setShowRefundConfirmModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-black uppercase tracking-tight transition-all active:scale-95"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={refundingInProcess}
                  onClick={executeRefundEscrow}
                  className="px-5 py-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white hover:from-orange-500 hover:to-rose-600 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {refundingInProcess ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                      <span>Restitution...</span>
                    </>
                  ) : (
                    <span>Restituer les Fonds</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
        .animate-in { animation: slideIn 0.35s ease-out forwards; }
        .animate-bounce-subtle { animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>

    </div>
  );
}
