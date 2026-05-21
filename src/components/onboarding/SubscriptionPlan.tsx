import React, { useState, useEffect } from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import StripePricingTable from '../stripe/StripePricingTable';

const SubscriptionPlan = () => {
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);
  const companyId = Cookies.get('companyId');

  useEffect(() => {
    if (!companyId) return;
    checkStepStatus();
    checkExistingSubscription();
  }, [companyId]);

  // Stripe Pricing Table redirige vers Stripe Checkout (hosted). Au retour, success_url
  // est défini dans Stripe Dashboard — on détecte un retour positif via le webhook
  // côté serveur, mais on rafraîchit aussi l'état à l'arrivée sur la page.
  useEffect(() => {
    if (!companyId) return;
    const url = new URL(window.location.href);
    const flags = [
      url.searchParams.get('subscription'),
      new URLSearchParams(url.hash.includes('?') ? url.hash.split('?')[1] : '').get('subscription'),
    ];
    if (!flags.includes('success')) return;

    // Nettoyer l'URL et resynchroniser.
    url.searchParams.delete('subscription');
    window.history.replaceState({}, '', url.toString());
    setTimeout(() => {
      checkExistingSubscription();
      completeOnboardingStep();
    }, 800);
  }, [companyId]);

  const checkExistingSubscription = async () => {
    try {
      if (!companyId) return;
      const response = await axios.get(
        `${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL}/api/subscriptions/current/${companyId}`
      );
      const subData = (response.data as any).data;
      if (subData && (subData.status === 'active' || subData.status === 'trialing')) {
        if (subData.planId?.name) setActivePlanName(subData.planId.name);
        if (!isStepCompleted) completeOnboardingStep();
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
      );
      const completed = (response.data as any)?.completedSteps;
      if (Array.isArray(completed) && completed.includes(11)) {
        setIsStepCompleted(true);
        return;
      }
      const stored = localStorage.getItem('companyOnboardingProgress');
      if (stored) {
        try {
          const progress = JSON.parse(stored);
          if (Array.isArray(progress.completedSteps) && progress.completedSteps.includes(11)) {
            setIsStepCompleted(true);
          }
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error('Error checking step status:', error);
    }
  };

  const completeOnboardingStep = async () => {
    try {
      if (!companyId) return;
      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/4/steps/11`,
        { status: 'completed' }
      );
      setIsStepCompleted(true);

      const stored = localStorage.getItem('companyOnboardingProgress');
      const progress = stored ? JSON.parse(stored) : { completedSteps: [] };
      if (!progress.completedSteps?.includes(11)) {
        progress.completedSteps = [...(progress.completedSteps || []), 11];
      }
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(progress));

      window.dispatchEvent(
        new CustomEvent('stepCompleted', { detail: { stepId: 11, phaseId: 4 } })
      );
    } catch (error) {
      console.error('Error completing onboarding step:', error);
    }
  };

  return (
    <div className="min-h-full bg-transparent p-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-harx-500">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Premium Access</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Select Your Plan</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm">
              Choose the perfect scale for your AI-powered orchestration engine.
            </p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                Status
              </p>
              <p className="text-sm font-black text-gray-800 tracking-tight">
                {isStepCompleted ? `Plan Active${activePlanName ? ` — ${activePlanName}` : ''}` : 'Action Required'}
              </p>
            </div>
          </div>
        </div>

        {activePlanName && (
          <div className="mb-4 p-3 rounded-2xl border border-green-100 bg-green-50/60 text-green-700 text-sm font-bold">
            You are currently subscribed to <span className="uppercase">{activePlanName}</span>. You can manage or change your plan below.
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-6">
          <StripePricingTable clientReferenceId={companyId || undefined} />
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;
