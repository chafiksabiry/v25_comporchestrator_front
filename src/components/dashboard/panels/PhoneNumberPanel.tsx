import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Search,
  RefreshCw,
  CheckCircle2,
  Hash,
  Briefcase,
  Sparkles,
  Users,
  Radio,
  CreditCard,
  Lock,
  AlertTriangle,
  X
} from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { gigsApi } from '../services/api/endpoints';
import { waitForStripePopup } from '../../../lib/paypalCheckout';

type CheckoutStep = 'select' | 'paypal' | 'processing' | 'success';

const safeParseJson = async (res: Response) => {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return null;
  }
};

type PaypalPopupOutcome = 'approved' | 'cancelled' | 'closed';

const PAYPAL_RETURN_ORIGINS = new Set([
  'https://harxv25comporchestratorfront.netlify.app',
  'https://harx25pageslinks.netlify.app'
]);

/** Wait until PayPal redirects to our return/cancel page or the user closes the popup. */
const waitForPaypalPopup = (popup: Window): Promise<PaypalPopupOutcome> =>
  new Promise((resolve) => {
    let settled = false;
    let closedGraceTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (outcome: PaypalPopupOutcome) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(timer);
      if (closedGraceTimer) clearTimeout(closedGraceTimer);
      resolve(outcome);
    };

    const onMessage = (ev: MessageEvent) => {
      const data = ev?.data;
      if (!data || typeof data !== 'object') return;
      if (
        data.type !== 'HARX_PAYPAL_RETURN' &&
        data.type !== 'HARX_PAYPAL_CANCEL'
      ) {
        return;
      }
      if (ev.origin && !PAYPAL_RETURN_ORIGINS.has(ev.origin)) return;
      if (data.type === 'HARX_PAYPAL_RETURN') finish('approved');
      if (data.type === 'HARX_PAYPAL_CANCEL') finish('cancelled');
    };
    window.addEventListener('message', onMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        if (!closedGraceTimer) {
          closedGraceTimer = setTimeout(() => finish('closed'), 1200);
        }
        return;
      }
      if (closedGraceTimer) {
        clearTimeout(closedGraceTimer);
        closedGraceTimer = undefined;
      }
      try {
        const href = popup.location.href;
        if (/paypal-return\.html/i.test(href) || /\/paypal\/return/i.test(href)) {
          finish('approved');
        } else if (/paypal-cancel\.html/i.test(href) || /\/paypal\/cancel/i.test(href)) {
          finish('cancelled');
        }
      } catch {
        /* still on paypal.com — cross-origin */
      }
    }, 400);
  });

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
  const { t } = useTranslation();
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
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [linePrice, setLinePrice] = useState({ amountCents: 500, currency: 'EUR' });

  const companyId = Cookies.get('companyId') || '6a0bfd35d605ccca8b51e13b';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';
  const formatPrice = (cents: number, currency: string) =>
    `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency === 'EUR' ? '€' : currency}`;

  // A Gig must own at least as many phone lines as it has enrolled reps
  // (one line per rep, minimum). Once that quota is reached, any extra
  // number must be paid via card / PayPal.
  const selectedGig = gigsAndReps.find(g => g.gigId === selectedGigIdForNumber);
  const selectedGigRepsCount = selectedGig?.enrolledReps?.length ?? 0;
  const minRequiredForSelectedGig = Math.max(selectedGigRepsCount, 1);
  const numbersForSelectedGig = selectedGigIdForNumber
    ? phoneNumbers.filter(n => n.gigId === selectedGigIdForNumber)
    : [];
  const selectedGigHasReachedMinimum = numbersForSelectedGig.length >= minRequiredForSelectedGig;
  const selectedGigTitle = selectedGig?.title;

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
        setStripeEnabled(Boolean(cfg.stripe?.enabled));
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
      toast.success(`Numéro ${checkoutNumber} acquis via ${method === 'stripe' ? 'carte bancaire' : 'PayPal'} !`);
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
      const outcome = await waitForPaypalPopup(popup);

      if (outcome === 'cancelled') {
        toast.error('Paiement PayPal annulé.');
        setCheckoutStep('select');
        return;
      }
      if (outcome === 'closed') {
        toast.error('Fenêtre PayPal fermée avant validation. Complétez le paiement sur PayPal.');
        setCheckoutStep('select');
        return;
      }

      setCheckoutStep('processing');
      try {
        if (!popup.closed) popup.close();
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
    if (!stripeEnabled) {
      toast.error('Le paiement par carte est temporairement indisponible.');
      return;
    }

    setPurchasing(checkoutNumber);
    try {
      const initData = await initLineCheckout('stripe');
      const paymentId = initData.paymentId;
      setCheckoutPaymentId(paymentId);

      const checkoutUrl = initData.checkoutUrl;
      const isStubCheckout =
        !checkoutUrl || String(checkoutUrl).startsWith('internal://');

      if (!isStubCheckout) {
        const popup = openCenteredPopup(checkoutUrl as string, 'stripe-checkout');
        if (!popup) {
          throw new Error('Veuillez autoriser les pop-ups pour finaliser le paiement par carte.');
        }
        setCheckoutStep('paypal'); // reuse same waiting UI
        const outcome = await waitForStripePopup(popup);
        if (outcome === 'cancelled') {
          toast.error('Paiement par carte annulé.');
          setCheckoutStep('select');
          return;
        }
        if (outcome === 'closed') {
          toast.error('Fenêtre de paiement fermée avant validation.');
          setCheckoutStep('select');
          return;
        }
        if (!popup.closed) popup.close();
      }

      setCheckoutStep('processing');
      await confirmLineCheckout(paymentId);
      await provisionLine(paymentId);
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
          <RefreshCw className="h-12 w-12 animate-spin text-slate-900" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement de la téléphonie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in overflow-x-hidden">
      {/* Decorative ambient orbs — contained inside panel (no fixed = no page overflow) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl animate-blob -z-10" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl animate-blob animation-delay-2000 -z-10" />

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-2xl bg-slate-900 text-white">
              <Phone size={22} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Mes Lignes Téléphoniques
            </h1>
          </div>
          <p className="text-sm text-slate-500 max-w-xl">
            Achetez des numéros de téléphone et affectez-les directement à vos Gigs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors duration-200 text-slate-600 hover:text-slate-900 disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Segmented tab control — sober slate */}
          <div className="relative bg-slate-100 p-1 rounded-2xl flex border border-slate-200 overflow-hidden max-w-full">
            <span
              aria-hidden
              className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl bg-slate-900 transition-all duration-300 ease-out ${
                telephonyTab === 'my_numbers' ? 'left-1' : 'left-[calc(50%+0.05rem)]'
              }`}
            />
            <button
              onClick={() => setTelephonyTab('my_numbers')}
              className={`relative z-10 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                telephonyTab === 'my_numbers' ? 'text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mes Lignes ({phoneNumbers.length})
            </button>
            <button
              onClick={() => setTelephonyTab('buy')}
              className={`relative z-10 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                telephonyTab === 'buy' ? 'text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Acheter une ligne
            </button>
          </div>
        </div>
      </div>

      {/* Info Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 min-w-0">
        {/* Hero card — purchased lines */}
        <div className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white border border-slate-800">
          {/* Subtle ambient gradient */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-72 w-72 bg-indigo-500/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute left-0 bottom-0 -translate-x-12 translate-y-12 h-56 w-56 bg-cyan-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          />

          <div className="relative z-10 flex flex-col justify-between h-full gap-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-400/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Réseau Actif
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <Radio size={22} className="text-slate-300" />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] block mb-2">
                Lignes Téléphoniques louées
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter text-white">
                  {phoneNumbers.length}
                </span>
                <span className="text-base text-slate-400 font-bold uppercase tracking-wider">
                  Ligne{phoneNumbers.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles size={12} className="text-slate-500" />
                <span>Numéros provisionnés & associés à vos Gigs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gigs card */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-[10px] uppercase tracking-[0.2em]">
                <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                  <Briefcase size={12} />
                </span>
                <span>Gigs & Lignes</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-black uppercase tracking-wider">
                Quota
              </span>
            </div>

            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Gigs configurés</h3>
            <span className="text-5xl font-black tracking-tight text-slate-900 block mb-3">
              {gigsAndReps.length}
            </span>

            <p className="text-[11px] text-slate-600 leading-relaxed flex items-start gap-1.5">
              <Users size={12} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{t('phoneNumberPanel.gigsCard.description')}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs rendering */}
      {telephonyTab === 'my_numbers' ? (
        <div className="relative bg-white rounded-3xl border border-slate-200 p-6 space-y-5 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                <Hash size={12} />
              </span>
              Numéros de téléphone loués
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              {phoneNumbers.length} actif{phoneNumbers.length > 1 ? 's' : ''}
            </span>
          </div>

          {phoneNumbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 gap-3">
              <Phone size={44} className="text-slate-400 animate-bounce" />
              <p className="text-sm font-bold text-slate-700">Vous ne possédez aucune ligne active.</p>
              <p className="text-xs text-slate-500 text-center max-w-xs mb-2">
                Recherchez et achetez un numéro de téléphone pour l'associer à votre campagne d'appel.
              </p>
              <button
                onClick={() => setTelephonyTab('buy')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Rechercher un numéro
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-4">Numéro</th>
                    <th className="py-3 px-4">Gig Associé</th>
                    <th className="py-3 px-4">Prix</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {phoneNumbers.map((num) => {
                    const linkedGig = gigsAndReps.find(g => g.gigId === num.gigId);
                    return (
                      <tr
                        key={num.phoneNumber}
                        className="group border-t border-slate-50 hover:bg-slate-50/60 transition-colors duration-200"
                      >
                        <td className="py-4 px-4 font-black text-slate-900 tracking-tight">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                              <Hash size={14} />
                            </span>
                            <span>{num.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">
                          {linkedGig
                            ? <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">{linkedGig.title}</span>
                            : <span className="text-slate-400 italic">Non affecté</span>}
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900 tabular-nums">
                          {typeof num.price === 'number' && num.price > 0
                            ? formatPrice(Math.round(num.price * 100), num.currency || 'EUR')
                            : <span className="text-slate-400 italic font-normal">—</span>}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[9px] uppercase tracking-wider">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            {num.status || 'actif'}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
          {/* Search form column */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 min-w-0">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                  <Search size={12} />
                </span>
                Rechercher une ligne
              </h3>
              <p className="text-xs text-slate-500 mt-1">Sélectionnez le Gig pour cibler les numéros par pays.</p>
            </div>

            <form onSubmit={handleSearchNumbers} className="space-y-4">

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Affecter au Gig</label>
                <select
                  value={selectedGigIdForNumber}
                  onChange={(e) => setSelectedGigIdForNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                >
                  {gigsAndReps.map((g) => (
                    <option key={g.gigId} value={g.gigId}>{g.title}</option>
                  ))}
                </select>
                {selectedGigIdForNumber && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                      <Phone size={10} />
                      {numbersForSelectedGig.length} ligne{numbersForSelectedGig.length > 1 ? 's' : ''} active{numbersForSelectedGig.length > 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                      <Users size={10} />
                      {selectedGigRepsCount} rep{selectedGigRepsCount > 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                      Quota min&nbsp;: {minRequiredForSelectedGig}
                    </span>
                  </div>
                )}
              </div>

              {/* Warning: minimum reached — extra numbers must be paid */}
              {selectedGigIdForNumber && selectedGigHasReachedMinimum && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 p-1.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                      <AlertTriangle size={16} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-amber-900 tracking-tight">
                        Quota minimum atteint
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Le Gig{selectedGigTitle ? <> <span className="font-bold">« {selectedGigTitle} »</span></> : null}{' '}
                        dispose déjà du minimum requis de{' '}
                        <span className="font-bold">{minRequiredForSelectedGig}</span>{' '}
                        ligne{minRequiredForSelectedGig > 1 ? 's' : ''} (1 par Rep inscrit).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={searching}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                <span>{searching ? 'Recherche...' : 'Rechercher Lignes'}</span>
              </button>
            </form>
          </div>

          {/* Results column */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                  <Sparkles size={12} />
                </span>
                Numéros disponibles
              </h3>
              {searchResults.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                  {searchResults.length} trouvé{searchResults.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <span className="p-3 rounded-2xl bg-slate-100">
                  <Search size={28} className="text-slate-400" />
                </span>
                <p className="text-xs font-bold text-slate-600">Lancez une recherche pour voir les numéros disponibles.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                {searchResults.map((resultNum: any) => {
                  const numberString = resultNum.phoneNumber || resultNum.nationalFormat || resultNum;
                  return (
                    <div
                      key={numberString}
                      className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700">
                          <Hash size={15} />
                        </span>
                        <span className="text-sm font-black text-slate-900 tracking-tight tabular-nums truncate">{numberString}</span>
                      </div>

                      <button
                        onClick={() => handlePurchaseNumber(numberString)}
                        disabled={purchasing !== null}
                        className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        title="Régler par carte ou PayPal — sans toucher au portefeuille"
                      >
                        {purchasing === numberString
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <CreditCard size={12} />}
                        <span>{purchasing === numberString ? 'Paiement...' : 'Acheter'}</span>
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
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-200">
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
                <span className="p-2 rounded-xl bg-white/10 text-white border border-white/15">
                  <CreditCard size={18} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
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
                        className={`relative p-4 rounded-2xl border-2 transition-colors text-left ${
                          checkoutMethod === 'stripe'
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {checkoutMethod === 'stripe' && (
                          <span className="absolute top-2 right-2 text-indigo-500">
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                        <span className="block text-sm font-black text-indigo-600 tracking-tight">Carte</span>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                          Carte bancaire
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutMethod('paypal')}
                        className={`relative p-4 rounded-2xl border-2 transition-colors text-left ${
                          checkoutMethod === 'paypal'
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
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
                  {checkoutMethod === 'stripe' && !stripeEnabled && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 font-medium">
                      Le paiement par carte est temporairement indisponible.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={
                      Boolean(purchasing)
                      || (checkoutMethod === 'paypal' && !paypalEnabled)
                      || (checkoutMethod === 'stripe' && !stripeEnabled)
                    }
                    className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors duration-200 active:scale-95 flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock size={14} />
                    {purchasing
                      ? 'Préparation…'
                      : `Payer ${formatPrice(linePrice.amountCents, linePrice.currency)} par ${
                          checkoutMethod === 'stripe' ? 'carte' : 'PayPal'
                        }`}
                  </button>
                </>
              )}

              {checkoutStep === 'paypal' && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <RefreshCw size={28} className="animate-spin text-amber-500" />
                  <p className="text-sm font-black text-slate-900 tracking-tight">Validation sur PayPal…</p>
                  <p className="text-[11px] text-gray-500 text-center max-w-xs">
                    Validez le paiement de{' '}
                    <span className="font-bold text-slate-800">
                      {formatPrice(linePrice.amountCents, linePrice.currency)}
                    </span>{' '}
                    sur PayPal. Attendez la page «&nbsp;Paiement validé&nbsp;» — ne fermez pas la
                    fenêtre avant.
                  </p>
                  <p className="text-[10px] text-gray-400 text-center max-w-xs">
                    La fenêtre se fermera automatiquement après confirmation.
                  </p>
                </div>
              )}

              {checkoutStep === 'processing' && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <RefreshCw size={32} className="animate-spin text-slate-900" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Traitement du paiement par {checkoutMethod === 'stripe' ? 'carte' : 'PayPal'}…
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
