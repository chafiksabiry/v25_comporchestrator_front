import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Sparkles, CreditCard } from 'lucide-react';
import StripePricingTable from '../../stripe/StripePricingTable';

/**
 * Dashboard panel for subscription / upgrade.
 *
 * Renders Stripe's hosted Pricing Table so plan management lives entirely in
 * the Stripe dashboard. We pass `client-reference-id` = companyId so the
 * webhook on the backend can correlate the resulting subscription with the
 * right company.
 */
export function SubscriptionPanel() {
  const [companyId, setCompanyId] = useState<string | undefined>(() => Cookies.get('companyId'));
  const [userEmail, setUserEmail] = useState<string | undefined>(() =>
    Cookies.get('userEmail') || localStorage.getItem('userEmail') || undefined
  );

  useEffect(() => {
    setCompanyId(Cookies.get('companyId'));
    setUserEmail(Cookies.get('userEmail') || localStorage.getItem('userEmail') || undefined);
  }, []);

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
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pricing Model</p>
            <p className="text-xs font-black text-gray-800 tracking-tight">Subscription / Monthly</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-4 md:p-6">
        <StripePricingTable
          clientReferenceId={companyId}
          customerEmail={userEmail}
        />
      </div>
    </div>
  );
}

export default SubscriptionPanel;
