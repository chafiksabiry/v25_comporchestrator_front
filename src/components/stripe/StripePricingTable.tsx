import React from 'react';

interface StripePricingTableProps {
  /** Optional: tie the resulting subscription back to your company / user via webhooks. */
  clientReferenceId?: string;
  /** Optional: prefill the email field on Stripe's hosted checkout. */
  customerEmail?: string;
  /** Optional: short-lived secret from a Customer Session for personalized pricing. */
  customerSessionClientSecret?: string;
}

/**
 * Thin React wrapper around Stripe's <stripe-pricing-table> web component.
 *
 * The pricing-table.js script is loaded once globally in index.html, so the
 * custom element is already registered by the time React renders this.
 *
 * Configuration (ID + publishable key) comes from environment variables so
 * we don't ship live keys hard-coded in the source. Set them in `.env`:
 *   VITE_STRIPE_PRICING_TABLE_ID=prctbl_xxx
 *   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
 */
export const StripePricingTable: React.FC<StripePricingTableProps> = ({
  clientReferenceId,
  customerEmail,
  customerSessionClientSecret,
}) => {
  const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID;
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (!pricingTableId || !publishableKey) {
    return (
      <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold">
        Stripe pricing table is not configured. Set
        <code className="mx-1 px-1 rounded bg-amber-100">VITE_STRIPE_PRICING_TABLE_ID</code>
        and
        <code className="mx-1 px-1 rounded bg-amber-100">VITE_STRIPE_PUBLISHABLE_KEY</code>
        in your <code>.env</code>.
      </div>
    );
  }

  return (
    <stripe-pricing-table
      pricing-table-id={pricingTableId}
      publishable-key={publishableKey}
      {...(clientReferenceId ? { 'client-reference-id': clientReferenceId } : {})}
      {...(customerEmail ? { 'customer-email': customerEmail } : {})}
      {...(customerSessionClientSecret
        ? { 'customer-session-client-secret': customerSessionClientSecret }
        : {})}
    />
  );
};

export default StripePricingTable;
