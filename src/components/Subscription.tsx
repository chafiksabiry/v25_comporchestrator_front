import React, { useState, useEffect } from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import StripePricingTable from './stripe/StripePricingTable';

const Subscription: React.FC = () => {
  const [activePlanName, setActivePlanName] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const companyId = Cookies.get('companyId');
  const apiBaseUrl =
    `${import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003'}/api`;

  useEffect(() => {
    const checkCurrentSubscription = async () => {
      if (!companyId) return;
      try {
        const response = await axios.get(`${apiBaseUrl}/subscriptions/current/${companyId}`);
        const subData = response.data?.data;
        if (subData && (subData.status === 'active' || subData.status === 'trialing')) {
          if (subData.planId?.name) setActivePlanName(subData.planId.name);
          setActiveStatus(subData.status);
        }
      } catch (error) {
        console.error('Error checking current subscription:', error);
      }
    };

    checkCurrentSubscription();
  }, [companyId, apiBaseUrl]);

  return (
    <div className="min-h-full bg-transparent p-3 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
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
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Pricing Model
              </p>
              <p className="text-xs font-black text-gray-800 tracking-tight">
                Subscription / Monthly
              </p>
            </div>
          </div>
        </div>

        {activePlanName && (
          <div className="mb-4 p-3 rounded-2xl border border-green-100 bg-green-50/60 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600">
                Current plan
              </p>
              <p className="text-sm font-black text-green-700 tracking-tight">
                {activePlanName}
                {activeStatus ? (
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-green-500/80">
                    ({activeStatus})
                  </span>
                ) : null}
              </p>
            </div>
            <span className="text-[10px] font-bold text-green-700/70 uppercase tracking-wider">
              Manage below
            </span>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-6">
          <StripePricingTable clientReferenceId={companyId || undefined} />
        </div>
      </div>
    </div>
  );
};

export default Subscription;
