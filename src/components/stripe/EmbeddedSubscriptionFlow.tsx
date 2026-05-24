import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { X, ShieldCheck, Sparkles, Check, Loader2 } from 'lucide-react';

interface ApiPlan {
  _id: string;
  name: string;
  price: number;
  currency: string;
  stripePriceId: string;
  description?: string;
  features?: string[];
  isPopular?: boolean;
}

interface ActiveSubscription {
  planId?: string;
  planName?: string;
  stripePriceId?: string;
  status?: string;
}

interface Props {
  companyId?: string;
  userId?: string;
  apiBaseUrl: string;
  onSubscribed?: () => void;
}

const FALLBACK_PUBLIC_KEY =
  'pk_live_51TCj3DPJXYVCMk8pTo20zxqkRKZSes7sCY6TJjSYdXqNEjCSvrsbtprRhy52KoggYnNpiJi0se31LuahqFLqN9Ex00kbTYXVSK';

function resolvePublicKey(): string {
  const fromEnv = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
  if (fromEnv?.startsWith('pk_live_')) return fromEnv;
  return FALLBACK_PUBLIC_KEY;
}

let stripeSingleton: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripeSingleton) stripeSingleton = loadStripe(resolvePublicKey());
  return stripeSingleton;
};

function isActivePlan(plan: ApiPlan, active: ActiveSubscription | null): boolean {
  if (!active) return false;
  if (active.planId && String(active.planId) === String(plan._id)) return true;
  if (active.stripePriceId && active.stripePriceId === plan.stripePriceId) return true;
  const a = (active.planName || '').trim().toLowerCase();
  const b = (plan.name || '').trim().toLowerCase();
  return Boolean(a && b && a === b);
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'EUR').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency?.toUpperCase() || 'EUR'}`;
  }
}

const EmbeddedSubscriptionFlow: React.FC<Props> = ({
  companyId,
  userId,
  apiBaseUrl,
  onSubscribed,
}) => {
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<ApiPlan | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [completed, setCompleted] = useState(false);

  const stripePromise = useMemo(() => getStripe(), []);
  const baseUrl = apiBaseUrl.replace(/\/$/, '');

  const fetchActiveSubscription = useCallback(async () => {
    if (!companyId) {
      setActiveSubscription(null);
      return;
    }
    try {
      const { data } = await axios.get<{
        success?: boolean;
        data?: {
          status?: string;
          planId?: { _id?: string; name?: string; stripePriceId?: string };
        };
      }>(`${baseUrl}/api/subscriptions/current/${companyId}`);
      const sub = data?.data;
      if (
        sub &&
        (sub.status === 'active' || sub.status === 'trialing')
      ) {
        setActiveSubscription({
          planId: sub.planId?._id ? String(sub.planId._id) : undefined,
          planName: sub.planId?.name,
          stripePriceId: sub.planId?.stripePriceId,
          status: sub.status,
        });
      } else {
        setActiveSubscription(null);
      }
    } catch {
      setActiveSubscription(null);
    }
  }, [baseUrl, companyId]);

  useEffect(() => {
    fetchActiveSubscription();
  }, [fetchActiveSubscription]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    axios
      .get<ApiPlan[]>(`${baseUrl}/api/subscriptions/plans`)
      .then((res) => {
        if (cancelled) return;
        setPlans(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlansError(err instanceof Error ? err.message : 'Failed to load plans');
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const closeModal = useCallback(() => {
    if (confirming) return;
    setSelectedPlan(null);
    setClientSecret(null);
    setPaymentId(null);
    setInitError(null);
    setCompleted(false);
  }, [confirming]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!selectedPlan) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedPlan, closeModal]);

  const openSubscribe = useCallback(
    async (plan: ApiPlan) => {
      if (!companyId || !userId) {
        setInitError('Missing company or user identifier — please reload the page.');
        return;
      }
      setSelectedPlan(plan);
      setClientSecret(null);
      setPaymentId(null);
      setInitError(null);
      setCompleted(false);
      setInitLoading(true);
      try {
        const { data } = await axios.post<{
          success: boolean;
          paymentId: string;
          clientSecret: string;
          uiMode: 'embedded';
        }>(`${baseUrl}/api/subscriptions/checkout/init`, {
          userId,
          companyId,
          priceId: plan.stripePriceId,
          planName: plan.name,
          provider: 'stripe',
          uiMode: 'embedded',
        });
        if (!data?.clientSecret) {
          throw new Error('No clientSecret returned by the server');
        }
        setClientSecret(data.clientSecret);
        setPaymentId(data.paymentId);
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Failed to initialize checkout');
        setInitError(message);
      } finally {
        setInitLoading(false);
      }
    },
    [baseUrl, companyId, userId]
  );

  const handleStripeComplete = useCallback(async () => {
    if (!paymentId) {
      setInitError('Missing payment identifier — cannot confirm.');
      return;
    }
    setConfirming(true);
    try {
      await axios.post(`${baseUrl}/api/subscriptions/checkout/confirm`, {
        paymentId,
      });
      setCompleted(true);
      if (selectedPlan) {
        setActiveSubscription({
          planId: selectedPlan._id,
          planName: selectedPlan.name,
          stripePriceId: selectedPlan.stripePriceId,
          status: 'active',
        });
      }
      await fetchActiveSubscription();
      onSubscribed?.();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Subscription confirmation failed');
      setInitError(message);
    } finally {
      setConfirming(false);
    }
  }, [baseUrl, paymentId, onSubscribed, selectedPlan, fetchActiveSubscription]);

  if (loadingPlans) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-harx-500 animate-spin" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Loading plans…
        </p>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-600">
        <p className="text-sm font-bold">{plansError}</p>
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 text-gray-600">
        <p className="text-sm font-bold">No subscription plan available yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const popular = Boolean(plan.isPopular);
          const isCurrent = isActivePlan(plan, activeSubscription);
          return (
            <div
              key={plan._id}
              className={`relative flex flex-col p-6 rounded-3xl border bg-white shadow-sm transition-all duration-300 ${
                isCurrent
                  ? 'border-green-500 ring-2 ring-green-500/40 shadow-md scale-[1.02]'
                  : popular
                    ? 'border-harx-500 ring-2 ring-harx-500/30 hover:-translate-y-1 hover:shadow-lg'
                    : 'border-gray-100 hover:-translate-y-1 hover:shadow-lg'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow">
                  <Check className="h-3 w-3" strokeWidth={3} /> Your plan
                </span>
              )}
              {!isCurrent && popular && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-harx-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow">
                  <Sparkles className="h-3 w-3" /> Popular
                </span>
              )}
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {plan.name}
              </h3>
              {plan.description && (
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {plan.description}
                </p>
              )}
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900 tracking-tight">
                  {formatPrice(plan.price, plan.currency)}
                </span>
                <span className="text-xs font-bold text-gray-400">/ month</span>
              </div>
              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.slice(0, 6).map((feat, i) => (
                    <li
                      key={`${plan._id}-feat-${i}`}
                      className="flex items-start gap-2 text-xs text-gray-700 font-medium"
                    >
                      <Check className="h-4 w-4 text-harx-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => !isCurrent && openSubscribe(plan)}
                disabled={
                  isCurrent ||
                  (initLoading && selectedPlan?._id === plan._id)
                }
                className={`mt-6 w-full px-4 py-2.5 rounded-xl text-sm font-black tracking-tight transition-all duration-300 ${
                  isCurrent
                    ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                    : popular
                      ? 'bg-harx-500 text-white hover:bg-harx-600 shadow'
                      : 'bg-gray-900 text-white hover:bg-black'
                } disabled:opacity-100 disabled:cursor-default`}
              >
                {isCurrent
                  ? 'Current plan'
                  : initLoading && selectedPlan?._id === plan._id
                    ? 'Opening…'
                    : activeSubscription
                      ? 'Change plan'
                      : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {selectedPlan &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483000] flex items-start justify-center overflow-y-auto bg-[#0a0b14]/80 backdrop-blur-md animate-fade-in"
            style={{ padding: 'clamp(8px, 4vh, 32px) 16px' }}
            onClick={closeModal}
          >
            <div
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-white/10 flex flex-col my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 bg-harx-50 rounded-xl flex items-center justify-center text-harx-500 shadow-inner shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight truncate">
                      Secure payment
                    </h2>
                    <p className="text-xs font-bold text-gray-500 truncate">
                      {selectedPlan.name} —{' '}
                      {formatPrice(selectedPlan.price, selectedPlan.currency)} / month
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  disabled={confirming}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-3"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-4 py-4">
                {initError && (
                  <div className="mb-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600">
                    <p className="text-sm font-bold">{initError}</p>
                  </div>
                )}

                {!clientSecret && !initError && !completed && (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 text-harx-500 animate-spin" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      Initializing Stripe…
                    </p>
                  </div>
                )}

                {clientSecret && !completed && (
                  <div className="stripe-embedded-wrapper">
                    <EmbeddedCheckoutProvider
                      stripe={stripePromise}
                      options={{ clientSecret, onComplete: handleStripeComplete }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}

                {confirming && (
                  <div className="mt-4 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-800/80 font-bold text-center">
                    Finalizing your subscription…
                  </div>
                )}

                {completed && (
                  <div className="p-8 flex flex-col items-center text-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <Check className="h-7 w-7" strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">
                        Subscription active
                      </h3>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        You are now subscribed to {selectedPlan.name}.
                      </p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="mt-2 px-6 py-2.5 rounded-xl bg-harx-500 hover:bg-harx-600 text-white text-sm font-black tracking-tight shadow transition-all duration-200"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default EmbeddedSubscriptionFlow;
