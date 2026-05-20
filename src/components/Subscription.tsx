import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Sparkles, X, ShieldCheck, Lock, DollarSign, Info } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  fetchSubscriptionCheckoutConfig,
  paymentFlowErrorMessage,
  runSubscriptionPaypalFlow,
  runSubscriptionStripeFlow
} from '../lib/paypalCheckout';

interface Plan {
  _id?: string;
  name: string;
  price: string | number;
  priceId?: string;
  stripePriceId?: string;
  amount?: number;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
  isPopular?: boolean;
}

const defaultPlans: Plan[] = [
  {
    name: 'STARTER',
    price: '99',
    priceId: 'price_starter_mock', // Mock ID
    amount: 9900,
    description: 'Start your campaigns with simplicity and efficiency',
    features: [
      'Active GIGs: 3',
      'Active REPs: 5',
      'AI Powered Gig Engine',
      'AI Powered Script Engine',
      'AI Powered Learning Planner',
      'AI Powered GIGS REPS Matching',
      'Qualified REPs on demand',
      'Dashboard with Standard KPIs',
      'Email support + assisted onboarding'
    ],
    buttonText: 'Start trial',
    popular: false
  },
  {
    name: 'GROWTH',
    price: '249',
    priceId: 'price_growth_mock', // Mock ID
    amount: 24900,
    description: 'Drive multi channel efforts with AI automation',
    features: [
      'Active GIGs: 10',
      'Active REPs: 15',
      'Channels: Outbound Calls Only',
      'All Starter Features',
      'AI Powered Lead Management Engine',
      'AI Powered Knowledge Base Engine',
      'AI Powered Call Monitoring & Audit',
      'Call storage - 3 months',
      'Priority support + chat'
    ],
    buttonText: 'Start trial',
    popular: true
  },
  {
    name: 'SCALE',
    price: '499',
    priceId: 'price_scale_mock', // Mock ID
    amount: 49900,
    description: 'Activate Intelligence at scale',
    features: [
      'Active GIGs: 25',
      'Active REPs: 50',
      'Channels: Outbound Calls Only',
      'Global Coverage',
      'All Growth Features Included',
      'Priority Support - live chat, email',
      'Customization - Dashboard, Analytics',
      'Full Integrations'
    ],
    buttonText: 'Start trial',
    popular: false
  }
];

const Subscription: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePriceId, setActivePriceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  const companyId = Cookies.get('companyId');
  const userId = Cookies.get('userId');
  const apiBaseUrl =
    `${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003'}/api`;

  useEffect(() => {
    const fetchRealPlans = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL}/api/subscriptions/plans`);
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const formattedPlans = response.data.map((plan: any) => ({
            ...plan,
            priceId: plan.stripePriceId || plan.priceId,
            buttonText: 'Start trial',
            popular: plan.isPopular || false
          }));
          setPlans(formattedPlans);
        }
      } catch (error) {
        console.error('Error fetching real plans:', error);
      }
    };

    const checkCurrentSubscription = async () => {
      if (!companyId) return;
      try {
        const response = await axios.get(`${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL}/api/subscriptions/current/${companyId}`);
        const subData = response.data?.data;
        if (subData && (subData.status === 'active' || subData.status === 'trialing')) {
          if (subData.planId && subData.planId.stripePriceId) {
            setActivePriceId(subData.planId.stripePriceId);
          }
        }
      } catch (error) {
        console.error('Error checking current subscription:', error);
      }
    };

    fetchRealPlans();
    checkCurrentSubscription();
  }, [companyId]);

  useEffect(() => {
    if (!showCheckout) return;
    fetchSubscriptionCheckoutConfig(apiBaseUrl).then((cfg) => {
      setPaypalEnabled(cfg.paypalEnabled);
      setStripeEnabled(cfg.stripeEnabled);
    });
  }, [showCheckout, apiBaseUrl]);

  const refreshActivePlan = async () => {
    if (!companyId) return;
    try {
      const response = await axios.get(`${apiBaseUrl}/subscriptions/current/${companyId}`);
      const subData = response.data?.data;
      if (subData && (subData.status === 'active' || subData.status === 'trialing')) {
        const pid = subData.planId?.stripePriceId;
        if (pid) setActivePriceId(pid);
      }
    } catch {
      /* ignore */
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    const priceId = plan.priceId || plan.stripePriceId;
    if (!priceId) {
      alert('ID de plan invalide.');
      return;
    }
    setSelectedPlan(plan);
    setPaymentMethod('card');
    setErrorMessage(null);
    setShowCheckout(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || !companyId || !userId) {
      setErrorMessage('Session utilisateur ou entreprise manquante.');
      return;
    }
    const priceId = selectedPlan.priceId || selectedPlan.stripePriceId;
    if (!priceId) return;

    if (paymentMethod === 'paypal' && !paypalEnabled) {
      setErrorMessage("PayPal n'est pas configuré (PAYPAL_* sur Railway).");
      return;
    }
    if (paymentMethod === 'card' && !stripeEnabled) {
      setErrorMessage('Le paiement par carte est temporairement indisponible.');
      return;
    }

    setIsLoadingSecret(true);
    setErrorMessage(null);

    try {
      const body = {
        userId,
        companyId,
        priceId,
        planName: selectedPlan.name,
        provider: paymentMethod === 'paypal' ? 'paypal' as const : 'stripe' as const
      };

      if (paymentMethod === 'paypal') {
        await runSubscriptionPaypalFlow(apiBaseUrl, body);
      } else {
        await runSubscriptionStripeFlow(apiBaseUrl, body);
      }

      setShowCheckout(false);
      await refreshActivePlan();
    } catch (err) {
      console.error(err);
      setErrorMessage(paymentFlowErrorMessage(err));
    } finally {
      setIsLoadingSecret(false);
    }
  };

  return (
    <div className="min-h-full bg-transparent p-3 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-harx-500">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Premium Access</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Subscription Plans</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Choose the perfect scale for your AI-powered orchestration engine.</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm p-2.5 rounded-xl border border-gray-100 flex items-center gap-2.5 shadow-sm">
            <div className="h-9 w-9 bg-harx-50 rounded-lg flex items-center justify-center text-harx-600">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pricing Model</p>
              <p className="text-xs font-black text-gray-800 tracking-tight">Subscription / Monthly</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isActive = activePriceId === (plan.priceId || plan.stripePriceId);
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col p-4 rounded-2xl transition-all duration-500 group ${
                  isActive
                    ? 'bg-[#0a0b14] text-white shadow-2xl shadow-harx-500/20 ring-2 ring-harx-500'
                    : plan.popular
                      ? 'bg-[#0a0b14] text-white shadow-2xl shadow-harx-500/20 ring-1 ring-white/10'
                      : 'bg-white text-gray-900 border border-gray-100 shadow-md hover:shadow-xl hover:border-harx-500/30'
                }`}
              >
                {(plan.popular || isActive) && (
                  <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] shadow-lg ${
                    isActive ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-gradient-harx text-white shadow-harx-500/30'
                  }`}>
                    {isActive ? 'Current Plan' : 'Most Popular'}
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-lg font-black tracking-tight ${plan.popular || isActive ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    {(plan.popular || isActive) && <Sparkles className="h-4 w-4 text-harx-400" />}
                  </div>
                  <p className={`text-[11px] font-medium leading-snug ${plan.popular || isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tighter">€{plan.price}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${plan.popular || isActive ? 'text-gray-400' : 'text-gray-500'}`}>/ Mo</span>
                  </div>
                </div>

                <button
                  onClick={() => !isActive && handleSelectPlan(plan)}
                  disabled={isActive}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all duration-300 mb-3 transform ${
                    !isActive ? 'group-hover:scale-[1.02] active:scale-95' : ''
                  } ${
                    isActive
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                      : plan.popular
                        ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/30 hover:shadow-harx-500/50'
                        : 'bg-gray-900 text-white hover:bg-black shadow shadow-black/10'
                  }`}
                >
                  {isActive ? 'Current Plan' : plan.buttonText}
                </button>

                <div className={`h-px w-full mb-3 ${plan.popular || isActive ? 'bg-white/10' : 'bg-gray-100'}`} />

                <ul className="space-y-1.5 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                        plan.popular || isActive ? 'bg-harx-500/20 text-harx-400' : 'bg-green-50 text-green-600'
                      }`}>
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className={`text-[11px] font-bold leading-tight ${plan.popular || isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal — Stripe ou PayPal */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0b14]/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
            <div className="absolute top-6 right-6 z-10">
              <button
                onClick={() => {
                  if (!isLoadingSecret) setShowCheckout(false);
                }}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-300 text-gray-500 hover:text-gray-900 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 bg-harx-50 rounded-2xl flex items-center justify-center text-harx-500 shadow-inner">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Paiement sécurisé</h2>
                  <p className="text-sm font-bold text-gray-500 mt-0.5">
                    Plan {selectedPlan.name} — €{selectedPlan.price}/mois
                  </p>
                </div>
              </div>

              {!isLoadingSecret && (
                <>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                    Méthode de paiement
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                        paymentMethod === 'card'
                          ? 'border-harx-500 bg-harx-50/50 text-harx-600'
                          : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard size={18} />
                      <span>Carte bancaire</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                        paymentMethod === 'paypal'
                          ? 'border-amber-500 bg-amber-50/50 text-amber-700'
                          : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <DollarSign size={18} />
                      <span>PayPal</span>
                    </button>
                  </div>

                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-2.5 text-[10px] text-blue-800/80 font-bold leading-relaxed mb-4">
                    <Info size={16} className="shrink-0 text-blue-600" />
                    <span>
                      {paymentMethod === 'paypal'
                        ? 'Paiement du premier mois via PayPal puis activation du plan. Une fenêtre PayPal s\'ouvrira.'
                        : 'Abonnement mensuel par carte avec essai 7 jours. Une fenêtre sécurisée s\'ouvrira.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={
                      (paymentMethod === 'paypal' && !paypalEnabled)
                      || (paymentMethod === 'card' && !stripeEnabled)
                    }
                    className="w-full py-3.5 bg-gradient-to-r from-[#EC4899] via-[#F43F5E] to-[#8B5CF6] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Lock size={14} />
                    Payer €{selectedPlan.price} par {paymentMethod === 'paypal' ? 'PayPal' : 'carte'}
                  </button>
                </>
              )}

              {isLoadingSecret && (
                <div className="h-48 flex flex-col items-center justify-center gap-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                  <div className="h-12 w-12 border-4 border-harx-500/20 border-t-harx-500 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse text-center px-4">
                    Finalisation du paiement…
                  </p>
                </div>
              )}

              {errorMessage && !isLoadingSecret && (
                <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-center">
                  <p className="text-sm font-bold">{errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;

