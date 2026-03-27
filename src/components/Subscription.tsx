import React, { useState } from 'react';
import { Check, CreditCard, Sparkles, X, ShieldCheck, Lock } from 'lucide-react';
import CheckoutForm from './stripe/CheckoutForm';

const plans = [
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
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);

  const handleStartTrial = async (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
    setIsLoadingSecret(true);
    
    // In a real implementation, you would call your backend to create a PaymentIntent:
    /*
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.priceId })
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error('Error creating payment intent:', err);
    } finally {
      setIsLoadingSecret(false);
    }
    */

    // MOCK: Simulate getting a clientSecret
    setTimeout(() => {
      setClientSecret('pi_mock_secret_' + Math.random().toString(36).substring(7));
      setIsLoadingSecret(false);
    }, 1000);
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
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-[2rem] transition-all duration-500 group ${
                plan.popular 
                  ? 'bg-[#0a0b14] text-white scale-105 shadow-2xl shadow-harx-500/20 ring-1 ring-white/10' 
                  : 'bg-white text-gray-900 border border-gray-100 shadow-xl hover:shadow-2xl hover:border-harx-500/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gradient-harx text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-harx-500/30">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-2xl font-black tracking-tight ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  {plan.popular && <Sparkles className="h-5 w-5 text-harx-400" />}
                </div>
                <p className={`text-xs font-medium leading-relaxed ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">€{plan.price}</span>
                  <span className={`text-sm font-bold uppercase tracking-widest opacity-60 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>/ Mo</span>
                </div>
              </div>

              <button
                onClick={() => handleStartTrial(plan)}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all duration-300 mb-8 transform group-hover:scale-[1.02] active:scale-95 ${
                  plan.popular
                    ? 'bg-gradient-harx text-white shadow-xl shadow-harx-500/30 hover:shadow-harx-500/50'
                    : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-black/10'
                }`}
              >
                {plan.buttonText}
              </button>

              <div className={`h-px w-full mb-8 ${plan.popular ? 'bg-white/10' : 'bg-gray-100'}`} />

              <ul className="space-y-4 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      plan.popular ? 'bg-harx-500/20 text-harx-400' : 'bg-green-50 text-green-600'
                    }`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className={`text-xs font-bold leading-tight ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
                  setClientSecret(null);
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
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">Initializing Secure Gateway...</p>
                </div>
              ) : clientSecret && selectedPlan ? (
                <div className="animate-fade-in">
                  <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Plan Summary</p>
                      <p className="text-sm font-black text-gray-900">{selectedPlan.name} Membership</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-harx-500">€{selectedPlan.price}</p>
                    </div>
                  </div>
                  <CheckoutForm 
                    clientSecret={clientSecret} 
                    amount={selectedPlan.amount}
                    onSuccess={() => {
                      setTimeout(() => {
                        setShowCheckout(false);
                      }, 4000);
                    }}
                  />
                </div>
              ) : (
                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-center">
                  <p className="text-sm font-bold">Failed to initialize payment. Please try again.</p>
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
