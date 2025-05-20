import React from 'react';
import { Check } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const SubscriptionPlan = () => {
  const companyId = Cookies.get('companyId');

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
      const stepId = 3; // ID du step Subscription Plan
      const phaseId = 1; // ID de la phase Company Account Setup
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
        { status: 'completed' }
      );
      
      if (!stepResponse.data) {
        throw new Error('Pas de réponse du serveur pour la mise à jour de l\'étape');
      }
      console.log('Step completion response:', stepResponse.data);
      
      // Ajouter un message de succès
      alert('Plan gratuit activé avec succès !');
      
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
        alert(`Erreur lors de l'activation du plan: ${error.response.data?.message || error.message}`);
      } else {
        alert('Une erreur est survenue lors de l\'activation du plan');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Free Plan</h2>
        <p className="mt-2 text-gray-600">
          Start using our platform with our comprehensive free plan.
        </p>
      </div>

      <div className="max-w-xl">
        <div className="rounded-lg border border-indigo-600 p-8 shadow-sm ring-1 ring-indigo-600">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{freePlan.name}</h3>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800">
              Recommended
            </span>
          </div>
          
          <p className="mt-4 text-gray-500">{freePlan.description}</p>
          
          <p className="mt-6">
            <span className="text-5xl font-bold text-gray-900">${freePlan.price}</span>
            <span className="text-base font-medium text-gray-500">/month</span>
          </p>

          <ul className="mt-8 space-y-4">
            {freePlan.features.map((feature) => (
              <li key={feature} className="flex items-center">
                <Check className="h-5 w-5 text-indigo-600" />
                <span className="ml-3 text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleActivatePlan}
            className="mt-8 w-full rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Activate Free Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;