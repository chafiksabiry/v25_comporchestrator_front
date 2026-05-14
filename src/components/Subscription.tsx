import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Sparkles, X, ShieldCheck, Lock } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

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

  const companyId = Cookies.get('companyId');
  const userId = Cookies.get('userId');

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

  const handleStartTrial = async (plan: Plan) => {
    const priceId = plan.priceId || plan.stripePriceId;
    if (!priceId) {
      alert('ID de plan invalide.');
      return;
    }

    setSelectedPlan(plan);
    setShowCheckout(true);
    setIsLoadingSecret(true);
    setErrorMessage(null);

    try {
      const response = await axios.post(`${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL}/api/subscriptions/checkout`, {
        userId,
        companyId,
        priceId,
        planName: plan.name,
        successUrl: `${window.location.origin}/#/orchestrator?success=true`,
        cancelUrl: `${window.location.origin}/#/orchestrator?cancel=true`
      });

      if (response.data && response.data.data && response.data.data.url) {
        window.location.href = response.data.data.url;
      } else {
        setErrorMessage('Erreur lors de la création de la session de paiement.');
        setIsLoadingSecret(false);
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setErrorMessage('Une erreur est survenue lors de la redirection vers Stripe.');
      setIsLoadingSecret(false);
    }
  };

  return (
    <div className="min-h-full bg-transparent p-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2 text-harx-500">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Premium Access</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Subscription Plans</h1>
            <p className="text-gray-500 mt-2 font-medium">Choose the perfect scale for your AI-powered orchestration engine.</p>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
            <div className="h-12 w-12 bg-harx-50 rounded-xl flex items-center justify-center text-harx-600">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pricing Model</p>
              <p className="text-sm font-black text-gray-800 tracking-tight">Subscription / Monthly</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isActive = activePriceId === (plan.priceId || plan.stripePriceId);
            return (
              <div 
                key={plan.name}
                className={`relative flex flex-col p-8 rounded-[2rem] transition-all duration-500 group ${
                  isActive
                    ? 'bg-[#0a0b14] text-white scale-105 shadow-2xl shadow-harx-500/20 ring-2 ring-harx-500'
                    : plan.popular 
                      ? 'bg-[#0a0b14] text-white scale-105 shadow-2xl shadow-harx-500/20 ring-1 ring-white/10' 
                      : 'bg-white text-gray-900 border border-gray-100 shadow-xl hover:shadow-2xl hover:border-harx-500/30'
                }`}
              >
                {(plan.popular || isActive) && (
                  <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${
                    isActive ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-gradient-harx text-white shadow-harx-500/30'
                  }`}>
                    {isActive ? 'Current Plan' : 'Most Popular'}
                  </div>
                )}

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-2xl font-black tracking-tight ${plan.popular || isActive ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    {(plan.popular || isActive) && <Sparkles className="h-5 w-5 text-harx-400" />}
                  </div>
                  <p className={`text-xs font-medium leading-relaxed ${plan.popular || isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tighter">€{plan.price}</span>
                    <span className={`text-sm font-bold uppercase tracking-widest opacity-60 ${plan.popular || isActive ? 'text-gray-400' : 'text-gray-500'}`}>/ Mo</span>
                  </div>
                </div>

                <button
                  onClick={() => !isActive && handleStartTrial(plan)}
                  disabled={isActive}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all duration-300 mb-8 transform ${
                    !isActive ? 'group-hover:scale-[1.02] active:scale-95' : ''
                  } ${
                    isActive
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                      : plan.popular
                        ? 'bg-gradient-harx text-white shadow-xl shadow-harx-500/30 hover:shadow-harx-500/50'
                        : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-black/10'
                  }`}
                >
                  {isActive ? 'Current Plan' : plan.buttonText}
                </button>

                <div className={`h-px w-full mb-8 ${plan.popular || isActive ? 'bg-white/10' : 'bg-gray-100'}`} />

                <ul className="space-y-4 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        plan.popular || isActive ? 'bg-harx-500/20 text-harx-400' : 'bg-green-50 text-green-600'
                      }`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className={`text-xs font-bold leading-tight ${plan.popular || isActive ? 'text-gray-300' : 'text-gray-600'}`}>
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

      {/* Checkout Modal Overlay */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0b14]/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
            {/* Modal Header */}
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => {
                  setShowCheckout(false);
                }}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-300 text-gray-500 hover:text-gray-900 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 bg-harx-50 rounded-2xl flex items-center justify-center text-harx-500 shadow-inner">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Complete Subscription</h2>
                  <div className="flex items-center gap-2 text-harx-500">
                    <Lock size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Secure checkout powered by Stripe</span>
                  </div>
                </div>
              </div>

              {isLoadingSecret ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                  <div className="h-12 w-12 border-4 border-harx-500/20 border-t-harx-500 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">Redirecting to Secure Stripe Checkout...</p>
                </div>
              ) : errorMessage ? (
                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-center">
                  <p className="text-sm font-bold">{errorMessage}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;

