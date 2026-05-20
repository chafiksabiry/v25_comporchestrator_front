import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  Search,
  RefreshCw,
  CheckCircle2,
  Hash,
  Briefcase,
  Cpu,
  CreditCard,
  Lock,
  AlertTriangle,
  X
} from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { gigsApi } from '../services/api/endpoints';

type CheckoutStep = 'select' | 'paypal' | 'processing' | 'success';

const safeParseJson = async (res: Response) => {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return null;
  }
};

const openCenteredPopup = (url: string, title: string, w = 520, h = 720): Window | null => {
  const dualLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualTop = window.screenTop ?? window.screenY ?? 0;
  const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const height = window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = dualLeft + (width - w) / 2;
  const top = dualTop + (height - h) / 2;
  return window.open(
    url,
    title,
    `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`
  );
};

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
  price?: number;
  currency?: string;
}

interface EnrolledRep {
  agentId: string;
  name: string;
}

interface GigAndReps {
  gigId: string;
  title: string;
  destinationCountry?: string;
  enrolledReps: EnrolledRep[];
}

export function PhoneNumberPanel() {
  const [phoneNumbers, setPhoneNumbers] = useState<PurchasedNumber[]>([]);
  const [gigsAndReps, setGigsAndReps] = useState<GigAndReps[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Telephony Search & Purchase states
  const [telephonyTab, setTelephonyTab] = useState<'my_numbers' | 'buy'>('my_numbers');

  const [selectedGigIdForNumber, setSelectedGigIdForNumber] = useState('');
  const [searchLimit, setSearchLimit] = useState('10');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Checkout / payment state for the new Stripe-or-PayPal flow
  const [checkoutNumber, setCheckoutNumber] = useState<string | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('select');
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [linePrice, setLinePrice] = useState({ amountCents: 500, currency: 'EUR' });

  const companyId = Cookies.get('companyId') || '6a0bfd35d605ccca8b51e13b';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';
  const formatPrice = (cents: number, currency: string) =>
    `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency === 'EUR' ? '€' : currency}`;

  // Every gig is entitled to a baseline of phone lines. Once it has
  // reached this threshold, any additional number must be purchased
  // separately via Stripe / PayPal.
  const MIN_PHONE_NUMBERS_PER_GIG = 1;
  const numbersForSelectedGig = selectedGigIdForNumber
    ? phoneNumbers.filter(n => n.gigId === selectedGigIdForNumber)
    : [];
  const selectedGigHasReachedMinimum = numbersForSelectedGig.length >= MIN_PHONE_NUMBERS_PER_GIG;
  const selectedGigTitle = gigsAndReps.find(g => g.gigId === selectedGigIdForNumber)?.title;

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
      console.log('[handleSearchNumbers] Current selectedGigIdForNumber:', selectedGigIdForNumber);
      console.log('[handleSearchNumbers] Available gigsAndReps in state:', gigsAndReps);
      const selectedGig = gigsAndReps.find(g => g.gigId === selectedGigIdForNumber);
      console.log('[handleSearchNumbers] Found selectedGig:', selectedGig);
      const targetCountry = selectedGig?.destinationCountry;
      console.log('[handleSearchNumbers] targetCountry resolved to:', targetCountry);
      if (!targetCountry) {
        toast.error('Veuillez sélectionner un Gig avec une destination country.');
        return;
      }

      const endpoint = `${apiBaseUrl}/phone-numbers/search/twilio?countryCode=${targetCountry}&limit=${searchLimit}`;
      console.log('[handleSearchNumbers] Fetching telephony search endpoint:', endpoint);
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
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Erreur technique lors de la recherche.", { duration: 6000 });
      }
    } catch (err) {
      console.error(err);
      toast.error('Échec de la recherche de numéros.');
    } finally {
      setSearching(false);
    }
  };

  // Step 1 — open the payment modal (does NOT debit the wallet).
  const handlePurchaseNumber = (numberToBuy: string) => {
    if (!selectedGigIdForNumber) {
      toast.error("Veuillez d'abord sélectionner un Gig à associer.");
      return;
    }
    setCheckoutNumber(numberToBuy);
    setCheckoutMethod('stripe');
    setCheckoutStep('select');
    setCheckoutPaymentId(null);
  };

  const closeCheckoutModal = () => {
    if (checkoutStep === 'processing') return;
    setCheckoutNumber(null);
    setCheckoutPaymentId(null);
    setCheckoutStep('select');
  };

  useEffect(() => {
    if (!checkoutNumber) return;
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/phone-numbers/checkout/config`);
        const cfg = await safeParseJson(res);
        if (!res.ok || !cfg) return;
        if (cfg.pricing?.amountCents) {
          setLinePrice({
            amountCents: cfg.pricing.amountCents,
            currency: cfg.pricing.currency || 'EUR'
          });
        }
        setPaypalEnabled(Boolean(cfg.paypal?.enabled));
      } catch (err) {
        console.warn('[checkout] config unavailable', err);
      }
    })();
  }, [checkoutNumber, apiBaseUrl]);

  const initLineCheckout = useCallback(
    async (provider: 'stripe' | 'paypal') => {
      const initRes = await fetch(`${apiBaseUrl}/phone-numbers/checkout/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: checkoutNumber,
          gigId: selectedGigIdForNumber,
          companyId,
          provider
        })
      });
      const initData = await safeParseJson(initRes);
      if (!initData) {
        throw new Error('Réponse du serveur de paiement invalide. Veuillez réessayer.');
      }
      if (!initRes.ok || !initData?.paymentId) {
        throw new Error(initData?.message || initData?.error || "Impossible d'initialiser le paiement.");
      }
      return initData as {
        paymentId: string;
        paypalOrderId?: string;
        paypalApproveUrl?: string;
        checkoutUrl?: string;
      };
    },
    [apiBaseUrl, checkoutNumber, companyId, selectedGigIdForNumber]
  );

  const confirmLineCheckout = useCallback(
    async (paymentId: string, providerRef?: string) => {
      const confirmRes = await fetch(`${apiBaseUrl}/phone-numbers/checkout/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, providerRef })
      });
      const confirmData = await safeParseJson(confirmRes);
      if (!confirmData) {
        throw new Error('Réponse du serveur de paiement invalide. Veuillez réessayer.');
      }
      if (!confirmRes.ok || !confirmData?.success) {
        throw new Error(confirmData?.message || confirmData?.error || 'Paiement non confirmé.');
      }
    },
    [apiBaseUrl]
  );

  const provisionLine = useCallback(
    async (paymentId: string) => {
      if (!checkoutNumber || !selectedGigIdForNumber) return;

      const purchaseRes = await fetch(`${apiBaseUrl}/phone-numbers/purchase/twilio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: checkoutNumber,
          gigId: selectedGigIdForNumber,
          companyId,
          paymentId
        })
      });

      if (!purchaseRes.ok) {
        const err = await purchaseRes.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "L'achat du numéro a échoué.");
      }
    },
    [apiBaseUrl, checkoutNumber, companyId, selectedGigIdForNumber]
  );

  const finishSuccessfulPurchase = useCallback(
    (method: 'stripe' | 'paypal') => {
      if (!checkoutNumber) return;
      setCheckoutStep('success');
      toast.success(`Numéro ${checkoutNumber} acquis via ${method === 'stripe' ? 'Stripe' : 'PayPal'} !`);
      setSearchResults(prev => prev.filter(n => n.phoneNumber !== checkoutNumber));
      fetchData(true);
    },
    [checkoutNumber, fetchData]
  );

  const startPaypalCheckout = async () => {
    if (!checkoutNumber || !selectedGigIdForNumber) return;
    if (!paypalEnabled) {
      toast.error("PayPal n'est pas configuré sur le serveur (variables PAYPAL_*).");
      return;
    }

    setPurchasing(checkoutNumber);
    try {
      const initData = await initLineCheckout('paypal');
      if (!initData.paypalApproveUrl || !initData.paymentId) {
        throw new Error("La commande PayPal n'a pas pu être créée.");
      }
      setCheckoutPaymentId(initData.paymentId);
      setCheckoutStep('paypal');

      const popup = openCenteredPopup(initData.paypalApproveUrl, 'paypal-checkout');
      if (!popup) {
        throw new Error('Veuillez autoriser les pop-ups pour finaliser le paiement PayPal.');
      }

      const paymentId = initData.paymentId;
      const popupClosed: Promise<void> = new Promise((resolve) => {
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            resolve();
          }
        }, 800);
      });

      await popupClosed;

      setCheckoutStep('processing');
      try {
        await confirmLineCheckout(paymentId, initData.paypalOrderId);
        await provisionLine(paymentId);
        finishSuccessfulPurchase('paypal');
      } catch (captureErr: any) {
        console.error(captureErr);
        toast.error(captureErr?.message || 'Paiement PayPal non confirmé.');
        setCheckoutStep('select');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Impossible de démarrer le paiement PayPal.');
      setCheckoutStep('select');
    } finally {
      setPurchasing(null);
    }
  };

  const handleConfirmStripePayment = async () => {
    if (!checkoutNumber || !selectedGigIdForNumber) return;

    setCheckoutStep('processing');
    setPurchasing(checkoutNumber);
    try {
      let paymentId: string | null = null;
      let checkoutSupported = true;

      const initRes = await fetch(`${apiBaseUrl}/phone-numbers/checkout/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: checkoutNumber,
          gigId: selectedGigIdForNumber,
          companyId,
          provider: 'stripe'
        })
      });

      if (initRes.status === 404) {
        console.warn('[checkout] /checkout/init not available, falling back to legacy purchase.');
        checkoutSupported = false;
      } else {
        const initData = await safeParseJson(initRes);
        if (!initData?.paymentId) {
          throw new Error(initData?.message || initData?.error || "Impossible d'initialiser le paiement.");
        }
        paymentId = initData.paymentId as string;
        setCheckoutPaymentId(paymentId);

        if (initData.checkoutUrl && !String(initData.checkoutUrl).startsWith('internal://')) {
          window.open(initData.checkoutUrl, '_blank', 'noopener,noreferrer,width=520,height=720');
        }

        await confirmLineCheckout(paymentId);
      }

      if (checkoutSupported && paymentId) {
        await provisionLine(paymentId);
      } else {
        const purchaseRes = await fetch(`${apiBaseUrl}/phone-numbers/purchase/twilio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: checkoutNumber,
            gigId: selectedGigIdForNumber,
            companyId
          })
        });
        if (!purchaseRes.ok) {
          const err = await purchaseRes.json().catch(() => ({}));
          throw new Error(err?.message || err?.error || "L'achat du numéro a échoué.");
        }
      }

      finishSuccessfulPurchase('stripe');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erreur lors du paiement.');
      setCheckoutStep('select');
    } finally {
      setPurchasing(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (checkoutMethod === 'paypal') {
      await startPaypalCheckout();
      return;
    }
    await handleConfirmStripePayment();
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
                    <th className="py-3 px-4">Prix</th>
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
                        <td className="py-4 px-4 font-black text-slate-900 tabular-nums">
                          {typeof num.price === 'number' && num.price > 0
                            ? formatPrice(Math.round(num.price * 100), num.currency || 'EUR')
                            : <span className="text-gray-400 italic font-normal">—</span>}
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
                {selectedGigIdForNumber && (
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {numbersForSelectedGig.length} ligne{numbersForSelectedGig.length > 1 ? 's' : ''} déjà affectée{numbersForSelectedGig.length > 1 ? 's' : ''} à ce Gig
                  </p>
                )}
              </div>

              {/* Warning: minimum reached — extra numbers must be paid */}
              {selectedGigIdForNumber && selectedGigHasReachedMinimum && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 p-1.5 rounded-xl bg-amber-100 text-amber-600">
                      <AlertTriangle size={16} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-amber-900 tracking-tight">
                        Seuil minimum atteint
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Le Gig{selectedGigTitle ? <> <span className="font-bold">« {selectedGigTitle} »</span></> : null} dispose déjà du minimum requis
                        de <span className="font-bold">{MIN_PHONE_NUMBERS_PER_GIG}</span>{' '}
                        ligne{MIN_PHONE_NUMBERS_PER_GIG > 1 ? 's' : ''} active{MIN_PHONE_NUMBERS_PER_GIG > 1 ? 's' : ''}.
                        Tout numéro supplémentaire devra être <span className="font-bold">acheté via Stripe ou PayPal</span>{' '}
                        ({formatPrice(linePrice.amountCents, linePrice.currency)} par ligne) — votre portefeuille HARX n'est pas affecté.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                        title="Régler par Stripe ou PayPal — sans toucher au wallet"
                      >
                        {purchasing === numberString
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <CreditCard size={12} />}
                        <span>{purchasing === numberString ? 'Paiement...' : 'Acheter (Stripe / PayPal)'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===========================================================
          Payment modal — Stripe / PayPal
          NOT linked to WalletCompany. Charges the company's external
          card or PayPal account for the phone line setup fee.
         =========================================================== */}
      {checkoutNumber && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="relative px-6 py-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
              <button
                onClick={closeCheckoutModal}
                disabled={checkoutStep === 'processing'}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition disabled:opacity-30"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                  <CreditCard size={18} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                  Paiement sécurisé
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight">Acquisition d'une ligne</h2>
              <p className="text-xs text-gray-300 mt-1">
                Réglez par carte ou PayPal — votre portefeuille HARX n'est pas affecté.
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Order summary */}
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Numéro</span>
                  <span className="font-black text-slate-900 tracking-tight">{checkoutNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Frais d'activation</span>
                  <span className="font-black text-slate-900">
                    {formatPrice(linePrice.amountCents, linePrice.currency)}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Total à payer</span>
                  <span className="text-lg font-black text-slate-900">
                    {formatPrice(linePrice.amountCents, linePrice.currency)}
                  </span>
                </div>
              </div>

              {/* Method picker */}
              {checkoutStep === 'select' && (
                <>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                      Méthode de paiement
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutMethod('stripe')}
                        className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                          checkoutMethod === 'stripe'
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        {checkoutMethod === 'stripe' && (
                          <span className="absolute top-2 right-2 text-indigo-500">
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                        <span className="block text-sm font-black text-indigo-600 tracking-tight">Stripe</span>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                          Carte bancaire
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutMethod('paypal')}
                        className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                          checkoutMethod === 'paypal'
                            ? 'border-amber-500 bg-amber-50 shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        {checkoutMethod === 'paypal' && (
                          <span className="absolute top-2 right-2 text-amber-500">
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                        <span className="block text-sm font-black text-amber-600 tracking-tight">PayPal</span>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                          Compte PayPal
                        </span>
                      </button>
                    </div>
                  </div>

                  {checkoutMethod === 'paypal' && !paypalEnabled && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 font-medium">
                      PayPal n&apos;est pas encore activé sur le serveur. Configurez{' '}
                      <span className="font-bold">PAYPAL_CLIENT_ID</span> et{' '}
                      <span className="font-bold">PAYPAL_CLIENT_SECRET</span> sur Railway.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={Boolean(purchasing) || (checkoutMethod === 'paypal' && !paypalEnabled)}
                    className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-orange-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock size={14} />
                    {purchasing
                      ? 'Préparation…'
                      : `Payer ${formatPrice(linePrice.amountCents, linePrice.currency)} avec ${
                          checkoutMethod === 'stripe' ? 'Stripe' : 'PayPal'
                        }`}
                  </button>
                </>
              )}

              {checkoutStep === 'paypal' && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <RefreshCw size={28} className="animate-spin text-amber-500" />
                  <p className="text-sm font-black text-slate-900 tracking-tight">Validation sur PayPal…</p>
                  <p className="text-[11px] text-gray-500 text-center max-w-xs">
                    Une fenêtre PayPal s&apos;est ouverte pour valider le paiement de{' '}
                    <span className="font-bold text-slate-800">
                      {formatPrice(linePrice.amountCents, linePrice.currency)}
                    </span>
                    . Terminez la connexion / le paiement, puis revenez ici.
                  </p>
                  <p className="text-[10px] text-gray-400 text-center max-w-xs">
                    La fenêtre se fermera automatiquement après confirmation.
                  </p>
                </div>
              )}

              {checkoutStep === 'processing' && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <RefreshCw size={32} className="animate-spin text-orange-500" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Traitement du paiement {checkoutMethod === 'stripe' ? 'Stripe' : 'PayPal'}…
                  </p>
                  <p className="text-[11px] text-gray-500 text-center max-w-xs">
                    Ne fermez pas cette fenêtre. Provisioning de votre ligne en cours.
                  </p>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <span className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={28} />
                  </span>
                  <p className="text-sm font-black text-slate-900 tracking-tight">Paiement confirmé</p>
                  <p className="text-[11px] text-gray-500 text-center max-w-xs">
                    Votre nouvelle ligne <span className="font-bold">{checkoutNumber}</span> est active et
                    associée à votre Gig.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCheckoutModal();
                      setTelephonyTab('my_numbers');
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Voir mes lignes
                  </button>
                </div>
              )}

              <p className="text-[10px] text-gray-400 text-center">
                Paiement chiffré · {checkoutPaymentId ? `Ref ${String(checkoutPaymentId).slice(-8)}` : 'Aucun frais débité du wallet'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PhoneNumberPanel;
