import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import GigSetupChecklist from '../components/GigSetupChecklist';
import StepCompletionToaster from '../components/StepCompletionToaster';
import { buildCompanyPageTitle, resolveCompanyTabTitle } from '../config/companySections';
import { usePageTitle } from '../../lib/tracking/usePageTitle';

export function DashboardLayout() {
  const location = useLocation();

  usePageTitle(
    buildCompanyPageTitle(resolveCompanyTabTitle(location.pathname)),
    'Portail entreprise HARX.',
  );

  return (
    <div className="flex-1 w-full h-full relative min-w-0 overflow-x-clip">
      <div className="px-4 py-3 pb-32 min-w-0 space-y-4">
        {/* Per-gig setup warning — shown on every dashboard step (Telephony,
            Leads, Script Generator, KB, Training, Scheduler, Gig Activation,
            Gigs, …). Dismissible for the current session; re-appears when a
            gig's status changes or a new pending gig is added. */}
        <GigSetupChecklist />
        {/* Listens for `harx:gig-step-complete` events and surfaces a
            unified "Continue →" toast that routes to the next step. */}
        <StepCompletionToaster />
        <Outlet />
      </div>
    </div>
  );
}

export default DashboardLayout;
