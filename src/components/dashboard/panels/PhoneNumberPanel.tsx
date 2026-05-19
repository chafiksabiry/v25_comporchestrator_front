import React, { useState, useEffect } from 'react';
import {
  Phone,
  Search,
  Globe,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Hash,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface PurchasedNumber {
  _id?: string;
  id?: string;
  phoneNumber: string;
  provider: 'telnyx' | 'twilio';
  status: string;
  features: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  gigId?: string;
  companyId?: string;
  createdAt?: string;
}

interface EnrolledRep {
  agentId: string;
  name: string;
}

interface GigAndReps {
  gigId: string;
  title: string;
  enrolledReps: EnrolledRep[];
}

export function PhoneNumberPanel() {
  const [phoneNumbers, setPhoneNumbers] = useState<PurchasedNumber[]>([]);
  const [gigsAndReps, setGigsAndReps] = useState<GigAndReps[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Telephony Search & Purchase states
  const [telephonyTab, setTelephonyTab] = useState<'my_numbers' | 'buy'>('my_numbers');
  const [searchCountry, setSearchCountry] = useState('US');
  const [searchProvider, setSearchProvider] = useState<'telnyx' | 'twilio'>('twilio');
  const [selectedGigIdForNumber, setSelectedGigIdForNumber] = useState('');
  const [searchLimit, setSearchLimit] = useState('10');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const companyId = Cookies.get('companyId') || 'demo_company_id';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch phone numbers active
      const res = await fetch(`${apiBaseUrl}/phone-numbers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPhoneNumbers(data.filter((n: any) => n.companyId === companyId));
        }
      }

      // 2. Fetch gigs details for dropdown association
      const gigsRes = await fetch(`${apiBaseUrl}/escrow/gigs-and-reps/${companyId}`);
      if (gigsRes.ok) {
        const gigsResult = await gigsRes.json();
        if (gigsResult.success && gigsResult.data) {
          setGigsAndReps(gigsResult.data);
          if (gigsResult.data.length > 0 && !selectedGigIdForNumber) {
            setSelectedGigIdForNumber(gigsResult.data[0].gigId);
          }
        }
      }

    } catch (err) {
      console.error('Error fetching telephony data:', err);
      toast.error("Impossible d'accéder au service de téléphonie.");
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
    toast.success('Lignes téléphoniques actualisées.', { id: 'refresh-tel-toast' });
  };

  const handleSearchNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setSearchResults([]);

    try {
      const endpoint = `${apiBaseUrl}/phone-numbers/search/twilio?countryCode=${searchCountry}&limit=${searchLimit}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
          if (data.length === 0) {
            toast.error("Aucun numéro disponible n'a été trouvé.");
          } else {
            toast.success(`${data.length} numéros disponibles trouvés !`);
          }
        } else if (data.data && Array.isArray(data.data)) {
          setSearchResults(data.data);
        } else {
          setSearchResults([]);
          toast.error("Format de données inconnu reçu de la recherche.");
        }
      } else {
        toast.error("Erreur technique lors de la recherche.");
      }
    } catch (err) {
      console.error(err);
      toast.error('Échec de la recherche de numéros.');
    } finally {
      setSearching(false);
    }
  };

  const handlePurchaseNumber = async (numberToBuy: string) => {
    if (!selectedGigIdForNumber) {
      toast.error('Veuillez d’abord sélectionner un Gig à associer.');
      return;
    }

    setPurchasing(numberToBuy);
    try {
      const res = await fetch(`${apiBaseUrl}/phone-numbers/purchase/twilio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: numberToBuy,
          gigId: selectedGigIdForNumber,
          companyId
        })
      });

      if (res.ok) {
        toast.success(`Numéro ${numberToBuy} acheté avec succès !`);
        setSearchResults(prev => prev.filter(n => n.phoneNumber !== numberToBuy));
        fetchData(true);
        setTelephonyTab('my_numbers');
      } else {
        const errData = await res.json();
        toast.error(errData.error || "L'achat du numéro a échoué.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'acquisition.");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-12 w-12 animate-spin text-orange-500" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement de la téléphonie...</p>
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
              <Phone size={24} />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mes Lignes Téléphoniques</h1>
          </div>
          <p className="text-sm text-gray-500">
            Achetez des numéros Twilio/Telnyx locaux ou internationaux et affectez-les directement à vos Gigs.
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

          <div className="bg-gray-100 p-1 rounded-2xl flex border border-gray-200 shadow-inner">
            <button
              onClick={() => setTelephonyTab('my_numbers')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${telephonyTab === 'my_numbers' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'}`}
            >
              Mes Lignes ({phoneNumbers.length})
            </button>
            <button
              onClick={() => setTelephonyTab('buy')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${telephonyTab === 'buy' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'}`}
            >
              Acheter une ligne
            </button>
          </div>
        </div>
      </div>

      {/* Info Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl border border-white/5">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute left-1/4 bottom-0 h-48 w-48 bg-rose-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                Fournisseurs Réseau Actifs
              </span>
              <Cpu size={24} className="text-white/40" />
            </div>

            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Lignes Téléphoniques louées
              </span>
              <span className="text-5xl font-black tracking-tight block">
                {phoneNumbers.length} <span className="text-lg text-gray-400 font-bold">Lignes</span>
              </span>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Twilio & Telnyx Webhook Routing synchronisé</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider mb-4">
              <Briefcase size={16} />
              <span>Gigs & Lignes</span>
            </div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Gigs configurés</h3>
            <span className="text-4xl font-black text-slate-900 block mb-2">
              {gigsAndReps.length}
            </span>
            <p className="text-xs text-gray-500">
              Chaque Gig doit posséder son propre numéro de téléphone de marque pour émettre et recevoir des appels.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs rendering */}
      {telephonyTab === 'my_numbers' ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-800 tracking-tight">Numéros de téléphone loués</h3>

          {phoneNumbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-100 rounded-[1.5rem] text-gray-400 gap-3">
              <Phone size={44} className="text-orange-500 animate-bounce" />
              <p className="text-sm font-bold">Vous ne possédez aucune ligne active.</p>
              <p className="text-xs text-gray-500 text-center max-w-xs mb-2">
                Recherchez et achetez un numéro de téléphone Twilio ou Telnyx pour l'associer à votre campagne d'appel.
              </p>
              <button
                onClick={() => setTelephonyTab('buy')}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Rechercher un numéro
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4">Numéro</th>
                    <th className="py-3 px-4">Fournisseur</th>
                    <th className="py-3 px-4">Fonctionnalités</th>
                    <th className="py-3 px-4">Gig Associé</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {phoneNumbers.map((num) => {
                    const linkedGig = gigsAndReps.find(g => g.gigId === num.gigId);
                    return (
                      <tr key={num.phoneNumber} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <Hash size={14} className="text-gray-400" />
                          <span>{num.phoneNumber}</span>
                        </td>
                        <td className="py-4 px-4 uppercase font-bold text-gray-500">
                          {num.provider}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500">
                            {num.features?.voice && <span className="bg-slate-100 px-2 py-0.5 rounded border border-gray-200">VOICE</span>}
                            {num.features?.sms && <span className="bg-slate-100 px-2 py-0.5 rounded border border-gray-200">SMS</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">
                          {linkedGig ? linkedGig.title : <span className="text-gray-400 italic">Non affecté</span>}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[9px] uppercase tracking-wider">
                            <CheckCircle2 size={10} /> {num.status || 'actif'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search form column */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Rechercher une ligne</h3>
              <p className="text-xs text-gray-500">Sélectionnez le pays et le fournisseur pour l'acquisition.</p>
            </div>

            <form onSubmit={handleSearchNumbers} className="space-y-4">

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Affecter au Gig</label>
                <select
                  value={selectedGigIdForNumber}
                  onChange={(e) => setSelectedGigIdForNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                >
                  {gigsAndReps.map((g) => (
                    <option key={g.gigId} value={g.gigId}>{g.title}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                <span>{searching ? 'Recherche...' : 'Rechercher Lignes'}</span>
              </button>
            </form>
          </div>

          {/* Results column */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-black text-slate-800 tracking-tight">Numéros de téléphone disponibles</h3>

            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Search size={32} />
                <p className="text-xs font-bold">Lancez une recherche pour voir les numéros disponibles.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {searchResults.map((resultNum: any) => {
                  const numberString = resultNum.phoneNumber || resultNum.nationalFormat || resultNum;
                  return (
                    <div key={numberString} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-gray-200 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <Hash size={16} className="text-orange-500 shrink-0" />
                        <span className="text-sm font-black text-slate-900 tracking-tight">{numberString}</span>
                      </div>

                      <button
                        onClick={() => handlePurchaseNumber(numberString)}
                        disabled={purchasing !== null}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {purchasing === numberString ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        <span>{purchasing === numberString ? 'Acquisition...' : 'Acheter'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default PhoneNumberPanel;
