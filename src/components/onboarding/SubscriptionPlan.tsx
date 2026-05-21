import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Sparkles } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  fetchSubscriptionCheckoutConfig,
  hasSubscriptionReturnFlag,
  clearSubscriptionReturnFlag,
} from '../../lib/paypalCheckout';
import EmbeddedSubscriptionCheckout from '../stripe/EmbeddedSubscriptionCheckout';


interface Plan {
  _id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular: boolean;
  buttonText: string;
  popular: boolean;
  stripePriceId: string;
}

const defaultPlans: Plan[] = [
  {
    _id: 'starter-default',
    name: 'STARTER',
    price: 99,
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
      'Email support + assisted onboarding',
    ],
    isPopular: false,
    buttonText: 'Start trial',
    popular: false,
    stripePriceId: '',
  },
  {
    _id: 'growth-default',
    name: 'GROWTH',
    price: 249,
    description: 'Drive multichannel efforts with AI automation',
    features: [
      'Active GIGs: 10',
      'Active REPs: 15',
      'Channels: Outbound Calls Only',
      'All Starter Features',
      'AI Powered Lead Management Engine',
      'AI Powered Knowledge Base Engine',
      'AI Powered Call Monitoring & Audit',
      'Call storage - 3 months',
      'Priority support + chat',
    ],
    isPopular: true,
    buttonText: 'Start trial',
    popular: true,
    stripePriceId: '',
  },
  {
    _id: 'scale-default',
    name: 'SCALE',
    price: 499,
    description: 'Activate intelligence at scale',
    features: [
      'Active GIGs: 25',
      'Active REPs: 50',
      'Channels: Outbound Calls Only',
      'Global Coverage',
      'All Growth Features Included',
      'Priority Support - live chat, email',
      'Customization - Dashboard, Analytics',
      'Full Integrations',
    ],
    isPopular: false,
    buttonText: 'Start trial',
    popular: false,
    stripePriceId: '',
  },
];

const SubscriptionPlan = () => {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activePriceId, setActivePriceId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const companyId = Cookies.get('companyId');
  const userId = Cookies.get('userId');
  const apiBaseUrl =
    `${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003'}/api`;

  // Vérifier l'état de l'étape au chargement
  useEffect(() => {
    fetchPlans();
    if (companyId) {
      checkStepStatus();
      checkExistingSubscription();
    }
  }, [companyId]);

  // Retour Stripe (stripe-return.html → ?subscription=success)
  useEffect(() => {
    if (!hasSubscriptionReturnFlag() || !companyId) return;

    const finalize = async () => {
      clearSubscriptionReturnFlag();
      await checkExistingSubscription();
      await completeOnboardingStep();
      window.dispatchEvent(
        new CustomEvent('stepCompleted', { detail: { stepId: 11, phaseId: 4 } })
      );
    };
    finalize();
  }, [companyId]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get<Plan[]>(`${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL}/api/subscriptions/plans`);
      if (!Array.isArray(response.data) || response.data.length === 0) {
        // Keep defaultPlans on empty response.
        return;
      }
      const formattedPlans = response.data
        .filter((plan) => plan && plan.stripePriceId)
        .map((plan: Plan) => ({
          ...plan,
          buttonText: 'Start trial',
          popular: plan.isPopular,
        }));
      if (formattedPlans.length > 0) {
        setPlans(formattedPlans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const checkExistingSubscription = async () => {
    try {
      if (!companyId) return;

      // Vérifier si l'entreprise a déjà un abonnement (sur le nouveau backend)
      const response = await axios.get(
        `${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL}/api/subscriptions/current/${companyId}`
      );

      const subData = (response.data as any).data;
      if (subData && (subData.status === 'active' || subData.status === 'trialing')) {
        if (subData.planId && subData.planId.stripePriceId) {
          setActivePriceId(subData.planId.stripePriceId);
        }
        
        // Si un abonnement existe, marquer automatiquement l'étape comme complétée
        if (!isStepCompleted) {
          completeOnboardingStep();
        }
      }

    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;

      // Fetch full onboarding progress instead of specific step GET (which doesn't exist)
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
      );

      if (response.data && (response.data as any).completedSteps && Array.isArray((response.data as any).completedSteps)) {
        if ((response.data as any).completedSteps.includes(11)) {
          setIsStepCompleted(true);
          return;
        }
      }

      // Vérifier aussi le localStorage pour la cohérence
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(11)) {
            setIsStepCompleted(true);
            return;
          }
        } catch (e) {
          console.error('Error parsing stored progress:', e);
        }
      }

    } catch (error) {
      console.error('Error checking step status:', error);
    }
  };

  const completeOnboardingStep = async () => {
    try {
      if (!companyId) return;
      
      const stepId = 11;
      const phaseId = 4;
      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
        { status: 'completed' }
      );

      setIsStepCompleted(true);
      
      const currentProgressStr = localStorage.getItem('companyOnboardingProgress');
      let currentProgress = currentProgressStr ? JSON.parse(currentProgressStr) : { completedSteps: [] };
      if (!currentProgress.completedSteps.includes(11)) {
        currentProgress.completedSteps.push(11);
      }
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
      
    } catch (error) {
      console.error('Error completing onboarding step:', error);
    }
  };

  const handleStartTrial = async (plan: Plan) => {
    if (!companyId || !userId) {
      setCheckoutError('Session utilisateur ou entreprise manquante.');
      return;
    }

    setIsLoading(true);
    setCheckoutError(null);
    try {
      const cfg = await fetchSubscriptionCheckoutConfig(apiBaseUrl);
      if (!cfg.stripeEnabled) {
        setCheckoutError('Le paiement par carte est temporairement indisponible.');
        return;
      }
      setCheckoutPlan(plan);
    } catch (error) {
      console.error('Checkout config error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Erreur configuration paiement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutSuccess = async () => {
    if (checkoutPlan) {
      setActivePriceId(checkoutPlan.stripePriceId);
    }
    setCheckoutPlan(null);
    await completeOnboardingStep();
    await checkExistingSubscription();
    window.dispatchEvent(
      new CustomEvent('stepCompleted', { detail: { stepId: 11, phaseId: 4 } })
    );
  };

  return (
    <div className="min-h-full bg-transparent p-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-harx-500">
              <span className="text-xs font-black uppercase tracking-[0.2em]">Premium Access</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Select Your Plan</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm">Choose the perfect scale for your AI-powered orchestration engine.</p>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
              <p className="text-sm font-black text-gray-800 tracking-tight">
                {isStepCompleted ? 'Plan Active' : 'Action Required'}
              </p>
            </div>
          </div>
        </div>

        {checkoutError && (
          <div className="mb-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-center">
            <p className="text-sm font-bold">{checkoutError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isActive = activePriceId === plan.stripePriceId;
            return (
              <div 
                key={plan.name}
                className={`relative flex flex-col p-6 rounded-[2rem] transition-all duration-500 group ${
                  isActive
                    ? 'bg-[#0a0b14] text-white scale-105 shadow-2xl shadow-harx-500/20 ring-2 ring-harx-500'
                    : plan.popular 
                      ? 'bg-[#0a0b14] text-white scale-105 shadow-2xl shadow-harx-500/20 ring-1 ring-white/10' 
                      : 'bg-white text-gray-900 border border-gray-100 shadow-xl hover:shadow-2xl hover:border-harx-500/30'
                }`}
              >
                {(plan.popular || isActive) && (
                  <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg ${
                    isActive ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-gradient-harx text-white shadow-harx-500/30'
                  }`}>
                    {isActive ? 'Current Plan' : 'Most Popular'}
                  </div>
                )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`text-xl font-black tracking-tight ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  {plan.popular && <Sparkles className="h-4 w-4 text-harx-400" />}
                </div>
                <p className={`text-[10px] font-medium leading-relaxed ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">€{plan.price}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>/ Mo</span>
                </div>
              </div>

              <button
                onClick={() => !isActive && handleStartTrial(plan)}
                disabled={isLoading || isActive}
                className={`w-full py-3 px-4 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all duration-300 mb-6 transform ${
                  !isActive ? 'group-hover:scale-[1.02] active:scale-95' : ''
                } ${
                  isActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                    : plan.popular
                      ? 'bg-gradient-harx text-white shadow-xl shadow-harx-500/30 hover:shadow-harx-500/50'
                      : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-black/10'
                }`}
              >
                {isLoading ? 'Loading...' : isActive ? 'Current Plan' : plan.buttonText}
              </button>

              <div className={`h-px w-full mb-6 ${plan.popular ? 'bg-white/10' : 'bg-gray-100'}`} />

              <ul className="space-y-3 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                      plan.popular ? 'bg-harx-500/20 text-harx-400' : 'bg-green-50 text-green-600'
                    }`}>
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className={`text-[10px] font-bold leading-tight ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
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

      {checkoutPlan && companyId && userId && (
        <EmbeddedSubscriptionCheckout
          open
          apiBaseUrl={apiBaseUrl}
          body={{
            userId,
            companyId,
            priceId: checkoutPlan.stripePriceId,
            planName: checkoutPlan.name,
            provider: 'stripe',
          }}
          planName={checkoutPlan.name}
          priceLabel={`€${checkoutPlan.price}/mois`}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
};

export default SubscriptionPlan;
