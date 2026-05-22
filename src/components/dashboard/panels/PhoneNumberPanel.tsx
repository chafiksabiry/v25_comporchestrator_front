import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [phoneNumbers, setPhoneNumbers] = useState<PurchasedNumber[]>([]);
  const [gigsAndReps, setGigsAndReps] = useState<GigAndReps[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Telephony Search & Purchase states. Default to "My lines" but allow
  // deep-linking into the "Buy a line" tab via `?action=buy` — the gig
  // setup warning relies on this so the rep lands directly on the buy
  // form when they click Continue from the dashboard checklist.
  const initialTab: 'my_numbers' | 'buy' =
    new URLSearchParams(location.search).get('action') === 'buy'
      ? 'buy'
      : 'my_numbers';
  const [telephonyTab, setTelephonyTab] = useState<'my_numbers' | 'buy'>(initialTab);

  // Keep the tab in sync if the rep navigates between `?action=buy`
  // links without unmounting the panel.
  useEffect(() => {
    const action = new URLSearchParams(location.search).get('action');
    if (action === 'buy') setTelephonyTab('buy');
  }, [location.search]);

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
            // Prefer `?gigId=<id>` from the URL (set by the gig-setup
            // warning's Continue button) so the rep lands directly on
            // the right gig in the Buy tab.
            const urlGigId =
              new URLSearchParams(location.search).get('gigId') || '';
            const preferred = gigsResult.data.find(
              (g: any) => g.gigId === urlGigId
            );
            setSelectedGigIdForNumber(
              preferred ? preferred.gigId : gigsResult.data[0].gigId
            );
          }
        }
      }

    } catch (err) {
      console.error('Error fetching telephony data:', err);
      toast.error(t('phoneNumberPanel.toasts.unavailable'));
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
    toast.success(t('phoneNumberPanel.toasts.refreshed'), { id: 'refresh-tel-toast' });
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
        toast.error(t('phoneNumberPanel.toasts.selectGigDestination'));
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
            toast.error(t('phoneNumberPanel.toasts.noNumbersFound'));
          } else {
            toast.success(t('phoneNumberPanel.toasts.numbersFound', { count: data.length }));
          }
        } else if (data.data && Array.isArray(data.data)) {
          setSearchResults(data.data);
        } else {
          setSearchResults([]);
          toast.error(t('phoneNumberPanel.toasts.unknownFormat'));
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || t('phoneNumberPanel.toasts.searchError'), { duration: 6000 });
      }
    } catch (err) {
      console.error(err);
      toast.error(t('phoneNumberPanel.toasts.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  // Step 1 — open the payment modal (does NOT debit the wallet).
  const handlePurchaseNumber = (numberToBuy: string) => {
    if (!selectedGigIdForNumber) {
      toast.error(t('phoneNumberPanel.toasts.selectGigFirst'));
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
        throw new Error(t('phoneNumberPanel.toasts.invalidPaymentResponse'));
      }
      if (!initRes.ok || !initData?.paymentId) {
        throw new Error(initData?.message || initData?.error || t('phoneNumberPanel.toasts.cannotInitPayment'));
      }
      return initData as {
        paymentId: string;
        paypalOrderId?: string;
        paypalApproveUrl?: string;
        checkoutUrl?: string;
      };
    },
    [apiBaseUrl, checkoutNumber, companyId, selectedGigIdForNumber, t]
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
        throw new Error(t('phoneNumberPanel.toasts.invalidPaymentResponse'));
      }
      if (!confirmRes.ok || !confirmData?.success) {
        throw new Error(confirmData?.message || confirmData?.error || t('phoneNumberPanel.toasts.paymentNotConfirmed'));
      }
    },
    [apiBaseUrl, t]
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
        throw new Error(err?.message || err?.error || t('phoneNumberPanel.toasts.purchaseFailed'));
      }
    },
    [apiBaseUrl, checkoutNumber, companyId, selectedGigIdForNumber, t]
  );

  const finishSuccessfulPurchase = useCallback(
    (method: 'stripe' | 'paypal') => {
      if (!checkoutNumber) return;
      setCheckoutStep('success');
      toast.success(
        method === 'stripe'
          ? t('phoneNumberPanel.toasts.purchaseSuccessCard', { number: checkoutNumber })
          : t('phoneNumberPanel.toasts.purchaseSuccessPaypal', { number: checkoutNumber })
      );
      setSearchResults(prev => prev.filter(n => n.phoneNumber !== checkoutNumber));
      fetchData(true);
      // Notify the gig-setup checklist (and any other listener) that one
      // of the per-gig setup steps just progressed so it can re-probe the
      // backend without a full page refresh.
      try {
        window.dispatchEvent(
          new CustomEvent('harx:gig-step-progress', {
            detail: {
              stepId: 4,
              gigId: selectedGigIdForNumber || undefined,
              source: 'phone-number-purchase',
              method,
            },
          })
        );
      } catch {
        // Older browsers without CustomEvent — non-blocking.
      }
    },
    [checkoutNumber, fetchData, selectedGigIdForNumber, t]
  );

  const startPaypalCheckout = async () => {
    if (!checkoutNumber || !selectedGigIdForNumber) return;
    if (!paypalEnabled) {
      toast.error(t('phoneNumberPanel.toasts.paypalNotConfigured'));
      return;
    }

    setPurchasing(checkoutNumber);
    try {
      const initData = await initLineCheckout('paypal');
      if (!initData.paypalApproveUrl || !initData.paymentId) {
        throw new Error(t('phoneNumberPanel.toasts.paypalOrderFailed'));
      }
      setCheckoutPaymentId(initData.paymentId);
      setCheckoutStep('paypal');

      const popup = openCenteredPopup(initData.paypalApproveUrl, 'paypal-checkout');
      if (!popup) {
        throw new Error(t('phoneNumberPanel.toasts.paypalPopupBlocked'));
      }

      const paymentId = initData.paymentId;
      const outcome = await waitForPaypalPopup(popup);

      if (outcome === 'cancelled') {
        toast.error(t('phoneNumberPanel.toasts.paypalCancelled'));
        setCheckoutStep('select');
        return;
      }
      if (outcome === 'closed') {
        toast.error(t('phoneNumberPanel.toasts.paypalClosed'));
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
        toast.error(captureErr?.message || t('phoneNumberPanel.toasts.paypalNotConfirmed'));
        setCheckoutStep('select');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || t('phoneNumberPanel.toasts.paypalStartFailed'));
      setCheckoutStep('select');
    } finally {
      setPurchasing(null);
    }
  };

  const handleConfirmStripePayment = async () => {
    if (!checkoutNumber || !selectedGigIdForNumber) return;
    if (!stripeEnabled) {
      toast.error(t('phoneNumberPanel.toasts.cardUnavailable'));
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
          throw new Error(t('phoneNumberPanel.toasts.cardPopupBlocked'));
        }
        setCheckoutStep('paypal'); // reuse same waiting UI
        const outcome = await waitForStripePopup(popup);
        if (outcome === 'cancelled') {
          toast.error(t('phoneNumberPanel.toasts.cardCancelled'));
          setCheckoutStep('select');
          return;
        }
        if (outcome === 'closed') {
          toast.error(t('phoneNumberPanel.toasts.cardClosed'));
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
      toast.error(err?.message || t('phoneNumberPanel.toasts.paymentError'));
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
          <RefreshCw className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('phoneNumberPanel.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in overflow-x-clip">
      {/* Decorative ambient orbs — contained inside panel */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl animate-blob -z-10" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl animate-blob animation-delay-2000 -z-10" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl animate-blob animation-delay-4000 -z-10" />

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white">
              <Phone size={22} />
            </span>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              {t('phoneNumberPanel.title')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 max-w-xl">
            {t('phoneNumberPanel.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-colors duration-200 text-slate-600 hover:text-indigo-600 disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Segmented tab control — animated gradient, attractive "Acheter" tab */}
          <div className="relative bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 p-1 rounded-2xl flex border border-indigo-100 overflow-hidden max-w-full">
            {/* Animated active pill */}
            <span
              aria-hidden
              className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 animate-gradient-x transition-all duration-300 ease-out ${
                telephonyTab === 'my_numbers' ? 'left-1' : 'left-[calc(50%+0.05rem)]'
              }`}
            />

            {/* Mes Lignes */}
            <button
              onClick={() => setTelephonyTab('my_numbers')}
              className={`relative z-10 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                telephonyTab === 'my_numbers' ? 'text-white' : 'text-slate-500 hover:text-indigo-700'
              }`}
            >
              {t('phoneNumberPanel.tabs.myNumbersWithCount', { count: phoneNumbers.length })}
            </button>

            {/* Acheter une ligne — animated CTA (vivid even when inactive) */}
            <button
              onClick={() => setTelephonyTab('buy')}
              className={`relative z-10 px-3 sm:px-5 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1.5 transition-all duration-300 ${
                telephonyTab === 'buy'
                  ? 'text-white'
                  : 'bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 border border-fuchsia-200/80 hover:border-fuchsia-400 hover:from-indigo-100 hover:via-violet-100 hover:to-fuchsia-100 active:scale-[0.98] overflow-hidden'
              }`}
            >
              {telephonyTab !== 'buy' && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full animate-shine bg-gradient-to-r from-transparent via-white/70 to-transparent"
                />
              )}
              <Sparkles
                size={13}
                className={
                  telephonyTab === 'buy'
                    ? 'relative z-10 text-yellow-300 animate-pulse shrink-0'
                    : 'relative z-10 text-fuchsia-600 animate-pulse-soft shrink-0'
                }
              />
              <span
                className={
                  telephonyTab === 'buy'
                    ? 'relative z-10 text-white'
                    : 'relative z-10 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent animate-gradient-x'
                }
              >
                {t('phoneNumberPanel.tabs.buy')}
              </span>
              {telephonyTab !== 'buy' && (
                <span className="relative z-10 flex h-1.5 w-1.5 ml-0.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-500" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 min-w-0">
        {/* Hero card — purchased lines (indigo → violet → fuchsia) */}
        <div className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-white">
          {/* Animated ambient orbs */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-72 w-72 bg-fuchsia-400/40 rounded-full blur-3xl animate-blob" />
          <div className="absolute left-0 bottom-0 -translate-x-12 translate-y-12 h-56 w-56 bg-cyan-400/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 bg-indigo-300/20 rounded-full blur-3xl animate-blob animation-delay-4000" />

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          />

          <div className="relative z-10 flex flex-col justify-between h-full gap-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 bg-emerald-500/25 px-3 py-1.5 rounded-full border border-emerald-300/40">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
                </span>
                {t('phoneNumberPanel.hero.activeNetwork')}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 border border-white/25">
                <Radio size={22} className="text-white" />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-[0.2em] block mb-2">
                {t('phoneNumberPanel.hero.rentedLabel')}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter text-white">
                  {phoneNumbers.length}
                </span>
                <span className="text-base text-white/70 font-bold uppercase tracking-wider">
                  {phoneNumbers.length !== 1
                    ? t('phoneNumberPanel.hero.linePlural')
                    : t('phoneNumberPanel.hero.lineSingular')}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-white/70">
                <Sparkles size={12} className="text-yellow-200" />
                <span>{t('phoneNumberPanel.hero.footer')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gigs card — cyan / teal */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-teal-50 border border-cyan-100 p-6">
          <div className="absolute -right-8 -top-8 h-40 w-40 bg-cyan-300/30 rounded-full blur-2xl animate-pulse-soft" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-cyan-700 font-bold text-[10px] uppercase tracking-[0.2em]">
                <span className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                  <Briefcase size={12} />
                </span>
                <span>{t('phoneNumberPanel.gigsCard.title')}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 text-[9px] font-black uppercase tracking-wider">
                {t('phoneNumberPanel.gigsCard.quota')}
              </span>
            </div>

            <h3 className="text-cyan-600/80 text-[10px] font-bold uppercase tracking-wider mb-1">
              {t('phoneNumberPanel.gigsCard.configured')}
            </h3>
            <span className="text-5xl font-black tracking-tight bg-gradient-to-br from-cyan-600 to-teal-600 bg-clip-text text-transparent block mb-3">
              {gigsAndReps.length}
            </span>

            <p className="text-[11px] text-slate-600 leading-relaxed flex items-start gap-1.5">
              <Users size={12} className="text-cyan-500 shrink-0 mt-0.5" />
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
              <span className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                <Hash size={12} />
              </span>
              {t('phoneNumberPanel.myNumbers.title')}
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
              {phoneNumbers.length > 1
                ? t('phoneNumberPanel.myNumbers.activePlural', { count: phoneNumbers.length })
                : t('phoneNumberPanel.myNumbers.activeSingular', { count: phoneNumbers.length })}
            </span>
          </div>

          {phoneNumbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-indigo-200 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-slate-400 gap-3">
              <Phone size={44} className="text-indigo-400 animate-bounce" />
              <p className="text-sm font-bold text-slate-700">{t('phoneNumberPanel.myNumbers.empty.title')}</p>
              <p className="text-xs text-slate-500 text-center max-w-xs mb-2">
                {t('phoneNumberPanel.myNumbers.empty.description')}
              </p>
              <button
                onClick={() => setTelephonyTab('buy')}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
              >
                {t('phoneNumberPanel.myNumbers.empty.cta')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600 border-b border-indigo-100">
                    <th className="py-3 px-4">{t('phoneNumberPanel.myNumbers.table.number')}</th>
                    <th className="py-3 px-4">{t('phoneNumberPanel.myNumbers.table.gig')}</th>
                    <th className="py-3 px-4">{t('phoneNumberPanel.myNumbers.table.price')}</th>
                    <th className="py-3 px-4">{t('phoneNumberPanel.myNumbers.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {phoneNumbers.map((num) => {
                    const linkedGig = gigsAndReps.find(g => g.gigId === num.gigId);
                    return (
                      <tr
                        key={num.phoneNumber}
                        className="group border-t border-slate-50 hover:bg-indigo-50/40 transition-colors duration-200"
                      >
                        <td className="py-4 px-4 font-black text-slate-900 tracking-tight">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 border border-indigo-100">
                              <Hash size={14} />
                            </span>
                            <span>{num.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">
                          {linkedGig
                            ? <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">{linkedGig.title}</span>
                            : <span className="text-slate-400 italic">{t('phoneNumberPanel.myNumbers.table.unassigned')}</span>}
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900 tabular-nums">
                          {typeof num.price === 'number' && num.price > 0
                            ? formatPrice(Math.round(num.price * 100), num.currency || 'EUR')
                            : <span className="text-slate-400 italic font-normal">—</span>}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-100 font-black text-[9px] uppercase tracking-wider">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            {num.status || t('phoneNumberPanel.myNumbers.table.active')}
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
                <span className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                  <Search size={12} />
                </span>
                {t('phoneNumberPanel.buy.search.title')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{t('phoneNumberPanel.buy.search.subtitle')}</p>
            </div>

            <form onSubmit={handleSearchNumbers} className="space-y-4">

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                  {t('phoneNumberPanel.buy.search.assignLabel')}
                </label>
                <select
                  value={selectedGigIdForNumber}
                  onChange={(e) => setSelectedGigIdForNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-indigo-50/40 border border-indigo-100 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                >
                  {gigsAndReps.map((g) => (
                    <option key={g.gigId} value={g.gigId}>{g.title}</option>
                  ))}
                </select>
                {selectedGigIdForNumber && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider">
                      <Phone size={10} />
                      {numbersForSelectedGig.length > 1
                        ? t('phoneNumberPanel.buy.search.chipActiveLinesPlural', { count: numbersForSelectedGig.length })
                        : t('phoneNumberPanel.buy.search.chipActiveLinesSingular', { count: numbersForSelectedGig.length })}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 text-[10px] font-bold uppercase tracking-wider">
                      <Users size={10} />
                      {selectedGigRepsCount > 1
                        ? t('phoneNumberPanel.buy.search.chipRepsPlural', { count: selectedGigRepsCount })
                        : t('phoneNumberPanel.buy.search.chipRepsSingular', { count: selectedGigRepsCount })}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                      {t('phoneNumberPanel.buy.search.chipMinQuota', { count: minRequiredForSelectedGig })}
                    </span>
                  </div>
                )}
              </div>

              {/* Warning: minimum reached — extra numbers must be paid */}
              {selectedGigIdForNumber && selectedGigHasReachedMinimum && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 p-1.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                      <AlertTriangle size={16} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-amber-900 tracking-tight">
                        {t('phoneNumberPanel.buy.search.warningTitle')}
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        {selectedGigTitle
                          ? (minRequiredForSelectedGig > 1
                              ? t('phoneNumberPanel.buy.search.warningWithTitlePlural', { title: selectedGigTitle, count: minRequiredForSelectedGig })
                              : t('phoneNumberPanel.buy.search.warningWithTitleSingular', { title: selectedGigTitle, count: minRequiredForSelectedGig }))
                          : (minRequiredForSelectedGig > 1
                              ? t('phoneNumberPanel.buy.search.warningPlural', { count: minRequiredForSelectedGig })
                              : t('phoneNumberPanel.buy.search.warningSingular', { count: minRequiredForSelectedGig }))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={searching}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                <span>{searching ? t('phoneNumberPanel.buy.search.searching') : t('phoneNumberPanel.buy.search.submit')}</span>
              </button>
            </form>
          </div>

          {/* Results column */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                  <Sparkles size={12} />
                </span>
                {t('phoneNumberPanel.buy.results.title')}
              </h3>
              {searchResults.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-100 px-3 py-1 rounded-full">
                  {searchResults.length > 1
                    ? t('phoneNumberPanel.buy.results.foundPlural', { count: searchResults.length })
                    : t('phoneNumberPanel.buy.results.foundSingular', { count: searchResults.length })}
                </span>
              )}
            </div>

            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 border-2 border-dashed border-cyan-200 rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50">
                <span className="p-3 rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100">
                  <Search size={28} className="text-cyan-600" />
                </span>
                <p className="text-xs font-bold text-slate-600">{t('phoneNumberPanel.buy.results.empty')}</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                {searchResults.map((resultNum: any) => {
                  const numberString = resultNum.phoneNumber || resultNum.nationalFormat || resultNum;
                  return (
                    <div
                      key={numberString}
                      className="group p-4 bg-gradient-to-r from-cyan-50/50 via-white to-indigo-50/50 rounded-2xl border border-slate-100 hover:border-indigo-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100 text-cyan-700">
                          <Hash size={15} />
                        </span>
                        <span className="text-sm font-black text-slate-900 tracking-tight tabular-nums truncate">{numberString}</span>
                      </div>

                      <button
                        onClick={() => handlePurchaseNumber(numberString)}
                        disabled={purchasing !== null}
                        className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        title={t('phoneNumberPanel.buy.results.buyTooltip')}
                      >
                        {purchasing === numberString
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <CreditCard size={12} />}
                        <span>{purchasing === numberString ? t('phoneNumberPanel.buy.results.buying') : t('phoneNumberPanel.buy.results.buy')}</span>
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
            {/* Header — indigo / violet / fuchsia gradient */}
            <div className="relative px-6 py-5 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white overflow-hidden">
              <div className="absolute -right-8 -top-8 h-32 w-32 bg-white/15 rounded-full blur-2xl animate-blob" />
              <div className="absolute -left-8 -bottom-8 h-24 w-24 bg-cyan-300/20 rounded-full blur-2xl animate-blob animation-delay-2000" />
              <button
                onClick={closeCheckoutModal}
                disabled={checkoutStep === 'processing'}
                className="absolute top-4 right-4 z-20 p-1.5 rounded-full hover:bg-white/15 transition disabled:opacity-30"
                aria-label={t('phoneNumberPanel.checkout.close')}
              >
                <X size={16} />
              </button>
              <div className="relative z-10 flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-white/15 text-white border border-white/25">
                  <CreditCard size={18} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                  {t('phoneNumberPanel.checkout.secure')}
                </span>
              </div>
              <h2 className="relative z-10 text-xl font-black tracking-tight">{t('phoneNumberPanel.checkout.heading')}</h2>
              <p className="relative z-10 text-xs text-white/80 mt-1">
                {t('phoneNumberPanel.checkout.intro')}
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Order summary */}
              <div className="rounded-2xl bg-gradient-to-br from-indigo-50/60 to-violet-50/60 border border-indigo-100 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-600/80 font-bold uppercase tracking-wider">{t('phoneNumberPanel.checkout.summary.number')}</span>
                  <span className="font-black text-slate-900 tracking-tight">{checkoutNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-600/80 font-bold uppercase tracking-wider">{t('phoneNumberPanel.checkout.summary.fee')}</span>
                  <span className="font-black text-slate-900">
                    {formatPrice(linePrice.amountCents, linePrice.currency)}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-indigo-200/50 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">{t('phoneNumberPanel.checkout.summary.total')}</span>
                  <span className="text-lg font-black bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                    {formatPrice(linePrice.amountCents, linePrice.currency)}
                  </span>
                </div>
              </div>

              {/* Method picker */}
              {checkoutStep === 'select' && (
                <>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                      {t('phoneNumberPanel.checkout.method.label')}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutMethod('stripe')}
                        className={`relative p-4 rounded-2xl border-2 transition-colors text-left ${
                          checkoutMethod === 'stripe'
                            ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50'
                            : 'border-slate-200 hover:border-indigo-300 bg-white'
                        }`}
                      >
                        {checkoutMethod === 'stripe' && (
                          <span className="absolute top-2 right-2 text-indigo-500">
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                        <span className="block text-sm font-black text-indigo-600 tracking-tight">{t('phoneNumberPanel.checkout.method.card')}</span>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                          {t('phoneNumberPanel.checkout.method.cardSub')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutMethod('paypal')}
                        className={`relative p-4 rounded-2xl border-2 transition-colors text-left ${
                          checkoutMethod === 'paypal'
                            ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50'
                            : 'border-slate-200 hover:border-amber-300 bg-white'
                        }`}
                      >
                        {checkoutMethod === 'paypal' && (
                          <span className="absolute top-2 right-2 text-amber-500">
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                        <span className="block text-sm font-black text-amber-600 tracking-tight">{t('phoneNumberPanel.checkout.method.paypal')}</span>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                          {t('phoneNumberPanel.checkout.method.paypalSub')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {checkoutMethod === 'paypal' && !paypalEnabled && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 font-medium">
                      {t('phoneNumberPanel.checkout.paypalUnavailable')}
                    </p>
                  )}
                  {checkoutMethod === 'stripe' && !stripeEnabled && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 font-medium">
                      {t('phoneNumberPanel.checkout.stripeUnavailable')}
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
                    className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors duration-200 active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock size={14} />
                    {purchasing
                      ? t('phoneNumberPanel.checkout.preparing')
                      : checkoutMethod === 'stripe'
                        ? t('phoneNumberPanel.checkout.payWithCard', { amount: formatPrice(linePrice.amountCents, linePrice.currency) })
                        : t('phoneNumberPanel.checkout.payWithPaypal', { amount: formatPrice(linePrice.amountCents, linePrice.currency) })}
                  </button>
                </>
              )}

              {checkoutStep === 'paypal' && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <RefreshCw size={28} className="animate-spin text-amber-500" />
                  <p className="text-sm font-black text-slate-900 tracking-tight">{t('phoneNumberPanel.checkout.paypalStep.title')}</p>
                  <p className="text-[11px] text-slate-500 text-center max-w-xs">
                    {t('phoneNumberPanel.checkout.paypalStep.body', { amount: formatPrice(linePrice.amountCents, linePrice.currency) })}
                  </p>
                  <p className="text-[10px] text-slate-400 text-center max-w-xs">
                    {t('phoneNumberPanel.checkout.paypalStep.footer')}
                  </p>
                </div>
              )}

              {checkoutStep === 'processing' && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <RefreshCw size={32} className="animate-spin text-indigo-600" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                    {checkoutMethod === 'stripe'
                      ? t('phoneNumberPanel.checkout.processingCard')
                      : t('phoneNumberPanel.checkout.processingPaypal')}
                  </p>
                  <p className="text-[11px] text-slate-500 text-center max-w-xs">
                    {t('phoneNumberPanel.checkout.processingBody')}
                  </p>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <span className="p-3 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 size={28} />
                  </span>
                  <p className="text-sm font-black text-slate-900 tracking-tight">{t('phoneNumberPanel.checkout.success.title')}</p>
                  <p
                    className="text-[11px] text-slate-500 text-center max-w-xs"
                    dangerouslySetInnerHTML={{
                      __html: t('phoneNumberPanel.checkout.success.body', { number: checkoutNumber })
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      closeCheckoutModal();
                      setTelephonyTab('my_numbers');
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                  >
                    {t('phoneNumberPanel.checkout.success.cta')}
                  </button>
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center">
                {t('phoneNumberPanel.checkout.encrypted')} · {checkoutPaymentId
                  ? t('phoneNumberPanel.checkout.ref', { ref: String(checkoutPaymentId).slice(-8) })
                  : t('phoneNumberPanel.checkout.noFee')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PhoneNumberPanel;
