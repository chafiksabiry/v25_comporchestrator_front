import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const STRIPE_PRICING_SCRIPT = 'https://js.stripe.com/v3/pricing-table.js';

const FALLBACK_PUBLIC_KEY =
  'pk_live_51TCj3DPJXYVCMk8pTo20zxqkRKZSes7sCY6TJjSYdXqNEjCSvrsbtprRhy52KoggYnNpiJi0se31LuahqFLqN9Ex00kbTYXVSK';

let scriptLoadPromise: Promise<void> | null = null;

function loadStripePricingScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${STRIPE_PRICING_SCRIPT}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = STRIPE_PRICING_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger Stripe Pricing Table'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id'?: string;
          'publishable-key'?: string;
          'client-reference-id'?: string;
          'customer-email'?: string;
        },
        HTMLElement
      >;
    }
  }
}

export type StripeMinutesPricingTableProps = {
  className?: string;
  /** companyId Mongo — lié au webhook (client_reference_id). */
  companyId?: string;
  customerEmail?: string;
};

/** Tableau Stripe — forfaits minutes company (dépôt one-shot). */
export function StripeMinutesPricingTable({
  className = '',
  companyId,
  customerEmail,
}: StripeMinutesPricingTableProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricingTableId = import.meta.env.VITE_STRIPE_MINUTES_PRICING_TABLE_ID as string | undefined;
  const publishableKey =
    (import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined)?.startsWith('pk_')
      ? (import.meta.env.VITE_STRIPE_PUBLIC_KEY as string)
      : FALLBACK_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    void loadStripePricingScript()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur Stripe');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pricingTableId) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Configurez <code className="font-mono text-xs">VITE_STRIPE_MINUTES_PRICING_TABLE_ID</code> pour
        afficher les forfaits minutes Stripe.
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    );
  }

  if (!ready) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={className}>
      <stripe-pricing-table
        pricing-table-id={pricingTableId}
        publishable-key={publishableKey}
        {...(companyId ? { 'client-reference-id': companyId } : {})}
        {...(customerEmail ? { 'customer-email': customerEmail } : {})}
      />
    </div>
  );
}
