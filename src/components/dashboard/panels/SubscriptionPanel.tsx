import React from 'react';
import Subscription from '../../Subscription';

/**
 * Dashboard panel for subscription / upgrade — wraps the existing Subscription
 * component so it lives at /dashboard/subscription, next to wallet, minutes
 * and telephony panels.
 */
export function SubscriptionPanel() {
  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto animate-fade-in">
      <Subscription />
    </div>
  );
}

export default SubscriptionPanel;
