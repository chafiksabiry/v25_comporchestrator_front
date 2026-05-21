import React, { useEffect, useState } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string;
          'publishable-key': string;
          'client-reference-id'?: string;
          'customer-email'?: string;
        },
        HTMLElement
      >;
    }
  }
}

const PRICING_TABLE_SRC = 'https://js.stripe.com/v3/pricing-table.js';

let scriptPromise: Promise<void> | null = null;
const loadPricingTableScript = (): Promise<void> => {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.customElements?.get('stripe-pricing-table')) return resolve();

    const existing = document.querySelector(
      `script[src="${PRICING_TABLE_SRC}"]`
    ) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Stripe pricing-table.js failed to load')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = PRICING_TABLE_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Stripe pricing-table.js failed to load'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

interface Props {
  pricingTableId?: string;
  publishableKey?: string;
  clientReferenceId?: string;
  customerEmail?: string;
  className?: string;
}

const DEFAULT_PRICING_TABLE_ID = 'prctbl_1TDNBOPJXYVCMk8pdPIA3s0k';
const DEFAULT_PUBLISHABLE_KEY =
  'pk_live_51TCj3DPJXYVCMk8pTo20zxqkRKZSes7sCY6TJjSYdXqNEjCSvrsbtprRhy52KoggYnNpiJi0se31LuahqFLqN9Ex00kbTYXVSK';

const StripePricingTable: React.FC<Props> = ({
  pricingTableId,
  publishableKey,
  clientReferenceId,
  customerEmail,
  className,
}) => {
  const [ready, setReady] = useState<boolean>(
    typeof window !== 'undefined' && Boolean(window.customElements?.get('stripe-pricing-table'))
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadPricingTableScript()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pricing table');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (error) {
    return (
      <div className={`p-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 ${className || ''}`}>
        <p className="text-sm font-bold">{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className={`h-72 flex flex-col items-center justify-center gap-3 ${className || ''}`}>
        <div className="h-10 w-10 border-4 border-harx-500/20 border-t-harx-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Loading Stripe pricing…
        </p>
      </div>
    );
  }

  const resolvedTableId =
    pricingTableId || import.meta.env.VITE_STRIPE_PRICING_TABLE_ID || DEFAULT_PRICING_TABLE_ID;
  const resolvedKey =
    publishableKey || import.meta.env.VITE_STRIPE_PUBLIC_KEY || DEFAULT_PUBLISHABLE_KEY;

  return React.createElement('stripe-pricing-table', {
    'pricing-table-id': resolvedTableId,
    'publishable-key': resolvedKey,
    ...(clientReferenceId ? { 'client-reference-id': clientReferenceId } : {}),
    ...(customerEmail ? { 'customer-email': customerEmail } : {}),
    className,
  });
};

export default StripePricingTable;
