import React, { useEffect, useState } from 'react';
import { KNOWN_LIVE_PRICING_TABLE_IDS } from './pricingTableConfig';

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

const DEFAULT_PUBLISHABLE_KEY =
  'pk_live_51TCj3DPJXYVCMk8pTo20zxqkRKZSes7sCY6TJjSYdXqNEjCSvrsbtprRhy52KoggYnNpiJi0se31LuahqFLqN9Ex00kbTYXVSK';

/** Live pricing tables (prctbl_1…) must not use pk_test_ — Stripe returns 404. */
function resolvePublishableKey(tableId: string, explicitKey?: string): string {
  if (explicitKey?.startsWith('pk_live_')) return explicitKey;
  if (explicitKey?.startsWith('pk_test_')) {
    console.warn('[StripePricingTable] Ignoring pk_test_ prop for live pricing table.');
  }

  const fromEnv = import.meta.env.VITE_STRIPE_PRICING_TABLE_KEY as string | undefined;
  if (fromEnv?.startsWith('pk_live_')) return fromEnv;

  const isLiveTable =
    KNOWN_LIVE_PRICING_TABLE_IDS.includes(tableId) || tableId.startsWith('prctbl_1');
  if (isLiveTable && fromEnv?.startsWith('pk_test_')) {
    console.warn(
      '[StripePricingTable] VITE_STRIPE_PRICING_TABLE_KEY is pk_test_ but the pricing table is LIVE. ' +
        'Using pk_live fallback. On Netlify, set VITE_STRIPE_PRICING_TABLE_KEY to your pk_live_ key ' +
        '(not VITE_STRIPE_PUBLIC_KEY).'
    );
    return DEFAULT_PUBLISHABLE_KEY;
  }

  if (fromEnv?.startsWith('pk_test_')) return fromEnv;
  return DEFAULT_PUBLISHABLE_KEY;
}

/**
 * IMPORTANT: The pricing-table-id and the publishable-key MUST come from the
 * same Stripe environment (both live, or both test). A live pricing table won't
 * load with a pk_test_ key (Stripe returns 404 on /pricing-table/...).
 *
 * We use a dedicated env var so the table key is not accidentally overridden
 * by VITE_STRIPE_PUBLIC_KEY (which may be the test key used by Stripe Elements).
 */
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
    pricingTableId || import.meta.env.VITE_STRIPE_PRICING_TABLE_ID || KNOWN_LIVE_PRICING_TABLE_IDS[0];
  const resolvedKey = resolvePublishableKey(resolvedTableId, publishableKey);

  return React.createElement('stripe-pricing-table', {
    'pricing-table-id': resolvedTableId,
    'publishable-key': resolvedKey,
    ...(clientReferenceId ? { 'client-reference-id': clientReferenceId } : {}),
    ...(customerEmail ? { 'customer-email': customerEmail } : {}),
    className,
  });
};

export default StripePricingTable;
