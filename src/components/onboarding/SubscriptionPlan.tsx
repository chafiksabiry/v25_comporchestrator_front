import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Free Plan</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Start using our platform with our comprehensive free plan.
          </p>
        </div>
      </div>

      <div className="max-w-md">
        <div className="rounded-lg border border-indigo-600 p-4 shadow-sm ring-1 ring-indigo-600">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">{freePlan.name}</h3>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
              Recommended
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-500">{freePlan.description}</p>

          <p className="mt-4">
            <span className="text-3xl font-bold text-gray-900">${freePlan.price}</span>
            <span className="text-sm font-medium text-gray-500">/month</span>
          </p>

          <ul className="mt-4 space-y-1">
            {freePlan.features.map((feature) => (
              <li key={feature} className="flex items-center">
                <Check className="h-4 w-4 text-indigo-600" />
                <span className="ml-2 text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={isStepCompleted ? undefined : handleActivatePlan}
            disabled={isStepCompleted || isLoading}
            className={`mt-6 w-full rounded-lg px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition-all ${isStepCompleted
              ? 'bg-green-600 cursor-not-allowed'
              : isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
          >
            {isStepCompleted ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Plan Already Activated
              </span>
            ) : isLoading ? (
              'Activating Plan...'
            ) : (
              'Activate Free Plan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;