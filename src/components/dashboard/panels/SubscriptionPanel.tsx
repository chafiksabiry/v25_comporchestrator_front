import React, { useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { Sparkles, CreditCard } from 'lucide-react';
import EmbeddedSubscriptionFlow from '../../stripe/EmbeddedSubscriptionFlow';
import { markCompanyGigsStepDone } from '../../../services/gigSetupSync';

/**
 * Dashboard panel for subscription / upgrade.
 *
 * Uses an inline Stripe Embedded Checkout flow so the subscription is fully
 * handled inside HARX — no Stripe Dashboard config (no Pricing Table, no
 * redirect URL) is required.
 */
export function SubscriptionPanel() {
  const [companyId, setCompanyId] = useState<string | undefined>(() => Cookies.get('companyId'));
  const [userId, setUserId] = useState<string | undefined>(() =>
    Cookies.get('userId') || Cookies.get('user_id') || undefined
  );
  const [activePlanName, setActivePlanName] = useState<string | null>(null);

  const backUrl =
    import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL ||
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') ||
    'http://localhost:3003';

  const checkExistingSubscription = useCallback(async () => {
    if (!companyId) return;
    try {
      const response = await axios.get(
        `${backUrl}/api/subscriptions/current/${companyId}`
      );
      const subData = (response.data as { data?: { status?: string; planId?: { name?: string } } }).data;
      if (subData && (subData.status === 'active' || subData.status === 'trialing')) {
        if (subData.planId?.name) setActivePlanName(subData.planId.name);
        await markCompanyGigsStepDone(companyId, 'repOnboarding', true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [backUrl, companyId]);

  useEffect(() => {
    setCompanyId(Cookies.get('companyId'));
    setUserId(Cookies.get('userId') || Cookies.get('user_id') || undefined);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    checkExistingSubscription();
  }, [companyId, checkExistingSubscription]);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in p-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 text-harx-500">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Premium Access</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Subscription Plans
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Choose the perfect scale for your AI-powered orchestration engine.
          </p>
        </div>

        <div className="bg-white/50 backdrop-blur-sm p-2.5 rounded-xl border border-gray-100 flex items-center gap-2.5 shadow-sm">
          <div className="h-9 w-9 bg-harx-50 rounded-lg flex items-center justify-center text-harx-600">
            <CreditCard size={18} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
            <p className="text-xs font-black text-gray-800 tracking-tight">
              {activePlanName ? `Plan Active — ${activePlanName}` : 'Action Required'}
            </p>
          </div>
        </div>
      </div>

      {activePlanName && (
        <div className="mb-4 p-3 rounded-2xl border border-green-100 bg-green-50/60 text-green-700 text-sm font-bold">
          You are currently subscribed to <span className="uppercase">{activePlanName}</span>.
          You can manage or change your plan below.
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-4 md:p-6">
        <EmbeddedSubscriptionFlow
          apiBaseUrl={backUrl}
          companyId={companyId}
          userId={userId}
          onSubscribed={checkExistingSubscription}
        />
      </div>
    </div>
  );
}

export default SubscriptionPanel;
