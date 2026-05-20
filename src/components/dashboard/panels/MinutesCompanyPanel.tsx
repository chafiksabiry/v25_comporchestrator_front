import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Zap,
  RefreshCw,
  X,
  CreditCard,
  DollarSign,
  Phone,
  CheckCircle2,
  Brain,
  MessageSquare,
  Star,
  Activity as ActivityIcon,
  Volume2,
  Info
} from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { PremiumAudioPlayer } from '../components/PremiumAudioPlayer';

interface MinutesState {
  companyId: string;
  minutes: number;
  purchasedMinutes?: number;
  consumedSeconds?: number;
}

interface CompanyCall {
  callId: string;
  agent: string;
  lead: string;
  leadObj?: { First_Name: string; Last_Name: string };
  direction: string;
  duration: number;
  startTime: string;
  createdAt?: string;
  status: string;
  validByCompany: boolean | null;
  validByReps: boolean | null;
  validByAI: boolean | null;
  valid: boolean | null;
  recording_url?: string | null;
  recording_url_cloudinary?: string | null;
  transcript?: any[];
  ai_call_score?: any;
  repCallCommission?: number;
  platformCallCommission?: number;
}

export function MinutesCompanyPanel() {
  const [minutesWallet, setMinutesWallet] = useState<MinutesState | null>(null);
  const [calls, setCalls] = useState<CompanyCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [minutesToBuy, setMinutesToBuy] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [submittingBuy, setSubmittingBuy] = useState(false);

  // Detail Modal state
  const [selectedCall, setSelectedCall] = useState<CompanyCall | null>(null);
  const [selectedCallTab, setSelectedCallTab] = useState<'transcript' | 'insights'>('transcript');

  const companyId = Cookies.get('companyId') || '6a0bfd35d605ccca8b51e13b';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch minutes balance from new vertical endpoint
      const minsRes = await fetch(`${apiBaseUrl}/minutes-company/${companyId}`);
      if (minsRes.ok) {
        const minsData = await minsRes.json();
        if (minsData.success && minsData.data) {
          setMinutesWallet(minsData.data);

          // Dispatch event to sync global header widget
          const event = new CustomEvent('balanceUpdated', {
            detail: {
              minutes: minsData.data.minutes,
            }
          });
          window.dispatchEvent(event);
        }
      }

      // 2. Fetch calls history for logs
      const callsRes = await fetch(`${apiBaseUrl}/escrow/calls/${companyId}`);
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        if (callsData.success && callsData.data) {
          setCalls(callsData.data);
        }
      }

    } catch (err) {
      console.error('Error loading Minutes Company data:', err);
      toast.error('Impossible de charger les minutes.');
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
    toast.success('Minutes rechargées mis à jour.', { id: 'refresh-mins-toast' });
  };

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(minutesToBuy);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Veuillez entrer un volume valide.');
      return;
    }

    setSubmittingBuy(true);
    try {
      const res = await fetch(`${apiBaseUrl}/minutes-company/buy-minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          amount: parsed
        })
      });

      if (res.ok) {
        toast.success(`Achat de ${parsed.toLocaleString()} minutes d'appels réussi !`);
        setShowBuyModal(false);
        fetchData(true);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Erreur lors de l'achat.");
      }
    } catch (err) {
      console.error(err);
      toast.error('Échec du paiement.');
    } finally {
      setSubmittingBuy(false);
    }
  };

  const formatFloatMinutesToMMSS = (floatMinutes: number): string => {
    if (isNaN(floatMinutes) || floatMinutes === null || floatMinutes === undefined) {
      return "00:00:00";
    }
    const isNegative = floatMinutes < 0;
    const absMinutes = Math.abs(floatMinutes);
    const totalSeconds = absMinutes * 60;
    const mm = Math.floor(absMinutes);
    const ss = Math.floor(totalSeconds % 60);
    const ll = Math.floor((totalSeconds % 1) * 100);

    return `${isNegative ? '-' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ll).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement du solde minutes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-500">
              <Clock size={24} />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recharge de Minutes d'Appel</h1>
          </div>
          <p className="text-sm text-gray-500">
            Achetez des minutes de communication directement par Stripe ou PayPal pour alimenter les campagnes de vos représentants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all duration-300 shadow-sm text-gray-600 hover:text-blue-500 disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowBuyModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 rounded-2xl transition-all duration-300 active:scale-95 flex items-center gap-2"
          >
            <Zap size={16} />
            <span>Acheter des Minutes</span>
          </button>
        </div>
      </div>

      {/* Main Minutes Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl border border-white/5">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute left-1/4 bottom-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                Solde Minutes Disponibles
              </span>
              <Volume2 size={24} className="text-white/40 animate-pulse-subtle" />
            </div>

            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Volume d'appels restant
              </span>
              <span className={`text-5xl font-black tracking-tight block ${(minutesWallet?.minutes ?? 0) < 0 ? 'text-rose-400' : ''}`}>
                {formatFloatMinutesToMMSS(minutesWallet?.minutes ?? 0)}
              </span>
              {(minutesWallet?.minutes ?? 0) < 0 && (
                <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider mt-1 block">
                  Surconsommation — rechargez vos minutes
                </span>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Décompte automatique à chaque appel — sans validation IA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wider mb-4">
              <ActivityIcon size={16} />
              <span>Consommation</span>
            </div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Appels facturés</h3>
            <span className="text-4xl font-black text-slate-900 block mb-2">
              {calls.filter(c => (c.duration || 0) > 0).length}
            </span>
            <p className="text-xs text-gray-500">
              Chaque appel complété est immédiatement déduit du solde de minutes,
              indépendamment de la validation IA.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Minutes consommées</span>
            <span className="font-bold text-slate-700 tabular-nums">
              {formatFloatMinutesToMMSS(
                (minutesWallet?.consumedSeconds ?? calls.reduce((s, c) => s + (c.duration || 0), 0)) / 60
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Calling History Logs list */}
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-800 tracking-tight">
            Consommation d'appels & validations
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase">
            Historique d'appels
          </span>
        </div>

        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-[1.5rem] text-gray-400 gap-3">
            <Phone size={36} className="text-blue-500 animate-pulse" />
            <p className="text-sm font-bold">Aucun appel enregistré pour le moment.</p>
            <p className="text-xs text-gray-500 text-center max-w-xs">
              Dès que vos représentants commenceront à émettre ou recevoir des appels, ils s'afficheront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4">Destinataire</th>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Durée</th>
                  <th className="py-3 px-4">Score AI</th>
                  <th className="py-3 px-4">Facturation</th>
                  <th className="py-3 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {calls.map((call) => (
                  <tr key={call.callId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {call.leadObj ? `${call.leadObj.First_Name} ${call.leadObj.Last_Name}` : call.lead || 'Inconnu'}
                    </td>
                    <td className="py-4 px-4 text-gray-500">
                      {new Date(call.startTime).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-4 px-4 text-slate-900 font-bold tabular-nums">
                      {formatFloatMinutesToMMSS(call.duration / 60)}
                    </td>
                    <td className="py-4 px-4">
                      {call.ai_call_score?.score ? (
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span>{call.ai_call_score.score}/100</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Non noté</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {(call.duration || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[9px] uppercase tracking-wider">
                          <CheckCircle2 size={10} /> Minutes débitées
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-100 font-bold text-[9px] uppercase tracking-wider">
                          Aucune durée
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buy Minutes Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-gray-100 p-6 shadow-2xl space-y-6 relative animate-fade-in-up">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Recharger des minutes d'appels</h3>
              <p className="text-xs text-gray-500">Ajoutez des minutes d'appel directement par carte bancaire ou PayPal.</p>
            </div>

            {/* Quick pack cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Standard', mins: '100', cost: '100 €' },
                { label: 'Pro', mins: '500', cost: '500 €' },
                { label: 'Expert', mins: '1000', cost: '1000 €' },
              ].map((pack) => (
                <button
                  key={pack.mins}
                  type="button"
                  onClick={() => setMinutesToBuy(pack.mins)}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-between text-center transition-all ${minutesToBuy === pack.mins ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{pack.label}</span>
                  <span className="text-sm font-black text-slate-900 mt-1">{pack.mins} Min</span>
                  <span className="text-[10px] text-blue-600 font-bold mt-1">{pack.cost}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleBuySubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Nombre personnalisé de minutes</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                    <Clock size={16} />
                  </div>
                  <input
                    type="number"
                    value={minutesToBuy}
                    onChange={(e) => setMinutesToBuy(e.target.value)}
                    required
                    min="1"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Méthode de paiement</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50/50 text-blue-600' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <CreditCard size={18} />
                    <span>Carte Bancaire</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${paymentMethod === 'paypal' ? 'border-blue-500 bg-blue-50/50 text-blue-600' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <DollarSign size={18} />
                    <span>PayPal</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-2.5 text-[10px] text-blue-800/80 font-bold leading-relaxed">
                <Info size={16} className="shrink-0 text-blue-600" />
                <span>Simulation Stripe & PayPal. Les minutes seront créditées immédiatement après confirmation de la recharge.</span>
              </div>

              <button
                type="submit"
                disabled={submittingBuy}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-750 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50"
              >
                {submittingBuy ? 'Achat en cours...' : `Acheter ${minutesToBuy} minutes`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Call Details Modal (using createPortal for perfect overlay rendering) */}
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
                    Appel avec {selectedCall.leadObj ? `${selectedCall.leadObj.First_Name} ${selectedCall.leadObj.Last_Name}` : selectedCall.lead}
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

            {/* Audio Waveform Player Widget */}
            {(selectedCall.recording_url || selectedCall.recording_url_cloudinary) && (
              <div className="bg-slate-950 p-6 border-b border-white/5 shrink-0">
                <PremiumAudioPlayer audioUrl={selectedCall.recording_url_cloudinary || selectedCall.recording_url || ''} />
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

            {/* Modal Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCallTab === 'transcript' ? (
                <div className="space-y-4">
                  {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((utterance, index) => {
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
                  {selectedCall.ai_call_score ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Note d'assurance Qualité</span>
                          <span className="text-3xl font-black text-slate-900 mt-2">{selectedCall.ai_call_score.score || 0}/100</span>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sentiment Client</span>
                          <span className="text-base font-black text-slate-900 mt-2">{selectedCall.ai_call_score.sentiment || 'Neutre'}</span>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Transaction détectée</span>
                          <span className={`text-xs font-black mt-2 ${selectedCall.ai_call_score.transaction_detected ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {selectedCall.ai_call_score.transaction_detected ? 'Oui' : 'Non'}
                          </span>
                        </div>
                      </div>

                      {/* Critères détaillés */}
                      {selectedCall.ai_call_score.rubrics && (
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Brain size={16} className="text-blue-500" />
                            <span>Rubriques de notation AI</span>
                          </h4>
                          <div className="space-y-3.5">
                            {Object.entries(selectedCall.ai_call_score.rubrics).map(([k, v]: any) => (
                              <div key={k} className="flex flex-col gap-1.5 pb-3 border-b border-gray-50 last:border-0">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-700 capitalize">{k.replace(/_/g, ' ')}</span>
                                  <span className="font-black text-slate-900">{v.score}/100</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${v.score}%` }} />
                                </div>
                                <p className="text-[10px] text-gray-500 italic mt-0.5">{v.feedback}</p>
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
                  )}
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
export default MinutesCompanyPanel;
