import React from 'react';
import SessionPlanning from '../../onboarding/SessionPlanning';

/**
 * SchedulerPanel
 *
 * The dashboard route `/dashboard/scheduler` shows the very same
 * `SessionPlanning` component used in the company orchestrator, so the
 * rep sees the consistent "Planification stratégique des sessions" UX
 * (weekly grid + project selector + AI panels) instead of the old
 * mock "Schedule Management" calendar.
 *
 * `SessionPlanning` reads the `?gigId=` query param to preselect the
 * gig coming from the "Continue →" CTA, falling back to the first gig
 * otherwise.
 */
function SchedulerPanel() {
  return <SessionPlanning />;
}

export default SchedulerPanel;
