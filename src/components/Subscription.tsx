import React from 'react';
import { Check, CreditCard, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'STARTER',
    price: '99',
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
  const handleStartTrial = (planName: string) => {
    console.log(`Starting trial for ${planName}`);
    // Redirect to backend checkout endpoint
    // const userId = document.cookie.split('; ').find(row => row.startsWith('userId='))?.split('=')[1];
    
    // Construct return URLs
    // const successUrl = `${window.location.origin}/subscription?session_id={CHECKOUT_SESSION_ID}`;
    // const cancelUrl = `${window.location.origin}/subscription`;

    // In a real implementation, you would call the backend API:
    // fetch('/api/subscriptions/checkout', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, planName, successUrl, cancelUrl })
    // }).then(res => res.json()).then(data => window.location.href = data.url);
    
    alert(`Redirection vers Stripe pour le plan ${planName} (Simulation)`);
  };

  return (
    <div className="min-h-full bg-transparent p-6">
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
            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
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
                onClick={() => handleStartTrial(plan.name)}
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
    </div>
  );
};

export default Subscription;
