/// <reference types="vite/client" />

interface ImportMetaEnv {
    [x: string]: any;
    readonly VITE_API_URL: string;
    readonly VITE_QIANKUN: string;
    readonly VITE_STRIPE_PRICING_TABLE_ID: string;
    readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

// Allow Stripe's <stripe-pricing-table> web component in JSX.
declare namespace JSX {
  interface IntrinsicElements {
    'stripe-pricing-table': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'pricing-table-id': string;
        'publishable-key': string;
        'client-reference-id'?: string;
        'customer-email'?: string;
        'customer-session-client-secret'?: string;
      },
      HTMLElement
    >;
  }
}
