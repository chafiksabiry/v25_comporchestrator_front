import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, Rocket } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const SubscriptionPlan = () => {
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const companyId = Cookies.get('companyId');

  // Vérifier l'état de l'étape au chargement
  useEffect(() => {
    if (companyId) {
      checkStepStatus();
      checkExistingSubscription();
    }
  }, [companyId]);

  const checkExistingSubscription = async () => {
    try {
      if (!companyId) return;

      // Vérifier si l'entreprise a déjà un abonnement
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}/subscription`
      );

      if (response.data && (response.data as any).subscription) {
        // Si un abonnement existe, marquer automatiquement l'étape comme complétée
        if (!isStepCompleted) {
          try {
            const stepResponse = await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/4/steps/11`,
              { status: 'completed' }
            );

            console.log('✅ Subscription step 11 automatically marked as completed:', stepResponse.data);

            // Mettre à jour l'état local
            setIsStepCompleted(true);

            // Mettre à jour le localStorage
            const currentProgress = {
              currentPhase: 4,
              completedSteps: [11],
              lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

            // Synchroniser avec les cookies
            Cookies.set('subscriptionStepCompleted', 'true', { expires: 7 });

          } catch (autoCompleteError) {
            console.error('Error auto-completing subscription step:', autoCompleteError);
          }
        }
      }

    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;

      // Vérifier l'état de l'étape 11 (Subscription Plan) dans la phase 4
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/4/steps/11`
      );

      if (response.data && (response.data as any).status === 'completed') {
        setIsStepCompleted(true);
        return;
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

  const freePlan = {
    name: 'Free',
    value: 'free',
    price: '0',
    description: 'Perfect for trying out our platform',
    features: [
      'Up to 5 active gigs',
      'Basic reporting',
      'Email support',
      'Community access',
      'Standard support',
      'Basic analytics',
      'Single phone number'
    ]
  };

  const handleActivatePlan = async () => {
    try {
      setIsLoading(true);
      console.log('Starting plan activation...');
      console.log('Company ID:', companyId);

      // Mettre à jour le plan d'abonnement
      const subscriptionResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}/subscription`,
        {
          subscription: 'free'
        }
      );

      if (!subscriptionResponse.data) {
        throw new Error('Pas de réponse du serveur pour la mise à jour du plan');
      }
      console.log('Subscription update response:', subscriptionResponse.data);

      // Marquer l'étape comme complétée
      const stepId = 11; // ID du step Subscription Plan
      const phaseId = 4; // ID de la phase Activation
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
        { status: 'completed' }
      );

      if (!stepResponse.data) {
        throw new Error('Pas de réponse du serveur pour la mise à jour de l\'étape');
      }
      console.log('Step completion response:', stepResponse.data);

      // Mettre à jour l'état local
      setIsStepCompleted(true);

      // Mettre à jour le localStorage
      const currentProgress = {
        currentPhase: 4,
        completedSteps: [11],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

      // Synchroniser avec les cookies
      Cookies.set('subscriptionStepCompleted', 'true', { expires: 7 });

      // Attendre un moment pour que l'API soit traitée
      await new Promise(resolve => setTimeout(resolve, 500));

      // Recharger la page pour mettre à jour l'interface
      window.location.reload();

    } catch (error: any) {
      console.error('Error details:', error);
      if (error.response) {
        console.error('API Error:', {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url
        });
        console.log(`Erreur lors de l'activation du plan: ${error.response.data?.message || error.message}`);
      } else {
        console.log('Une erreur est survenue lors de l\'activation du plan');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-4 border border-harx-100 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-harx-50 rounded-full blur-3xl group-hover:bg-harx-100 transition-colors duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-harx flex items-center justify-center shadow-lg shadow-harx-500/20">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Select Your Plan</h2>
                <p className="text-base text-gray-500 font-medium">Choose the perfect scale for your company's growth.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center p-3 bg-harx-50/50 rounded-xl border border-harx-100 backdrop-blur-sm">
            <span className="text-sm font-black text-harx-600 uppercase tracking-[0.2em] mb-2">Current Selection</span>
            <div className="text-xl font-black text-gray-900 tracking-tight">{freePlan.name} Plan</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="rounded-2xl border-4 border-harx-500 p-6 shadow-xl bg-white relative transform transition-all duration-500 hover:scale-[1.01] flex flex-col h-full ring-4 ring-harx-500/5">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded-2xl bg-gradient-harx px-6 py-2 text-sm font-black text-white uppercase tracking-widest shadow-xl shadow-harx-500/30">
              Recommended
            </span>
          </div>

          <div className="mb-4">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{freePlan.name} <span className="text-harx-500">Tier</span></h3>
            <p className="mt-2 text-base text-gray-500 font-medium leading-relaxed">{freePlan.description}</p>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-gray-900 tracking-tighter">${freePlan.price}</span>
              <span className="text-lg font-bold text-gray-400">/month</span>
            </div>
          </div>

          <div className="flex-grow">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">What's included:</h4>
            <ul className="space-y-3 mb-6">
              {freePlan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-4 group">
                  <div className="w-6 h-6 rounded-full bg-harx-50 flex items-center justify-center group-hover:bg-harx-100 transition-colors">
                    <Check className="h-4 w-4 text-harx-500" />
                  </div>
                  <span className="text-base text-gray-700 font-bold group-hover:text-gray-900 transition-colors">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={isStepCompleted ? undefined : handleActivatePlan}
            disabled={isStepCompleted || isLoading}
            className={`w-full rounded-xl py-4 text-lg font-black transition-all duration-300 transform active:scale-95 shadow-xl ${isStepCompleted
              ? 'bg-emerald-600 text-white cursor-not-allowed shadow-emerald-500/20'
              : isLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-harx text-white hover:brightness-110 shadow-harx-500/40 hover:-translate-y-1'
              }`}
          >
            {isStepCompleted ? (
              <span className="flex items-center justify-center gap-3">
                <CheckCircle2 className="w-6 h-6" />
                Plan Active
              </span>
            ) : isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                Activating...
              </span>
            ) : (
              'Unlock Full Potential'
            )}
          </button>
        </div>

        {/* Placeholder for future plans */}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 bg-gray-50/50 flex flex-col items-center justify-center text-center group transition-all duration-500 hover:border-harx-200 hover:bg-white">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:border-harx-200 group-hover:scale-110 transition-all shadow-sm">
            <Rocket className="w-8 h-8 text-gray-300 group-hover:text-harx-400 transition-colors" />
          </div>
          <h3 className="text-xl font-black text-gray-400 group-hover:text-gray-900 transition-colors">Enterprise Tier</h3>
          <p className="mt-2 text-base text-gray-400 font-medium px-4">Advanced scaling and dedicated infrastructure coming soon.</p>
          <div className="mt-8 px-6 py-3 rounded-xl bg-white border border-gray-200 text-sm font-black text-gray-400 group-hover:text-harx-500 transition-all">
            STAY TUNED
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;