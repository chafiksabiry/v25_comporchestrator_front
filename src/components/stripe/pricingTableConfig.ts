/**
 * Stripe Pricing Table IDs — one per checkout context so each table can have
 * its own "Payment confirmation page" redirect URL in the Stripe Dashboard.
 *
 * Onboarding redirect (configure on the ONBOARDING table):
 *   https://harx.ai/company?subscription=success#/orchestrator
 *
 * Dashboard redirect (configure on the DASHBOARD table):
 *   https://harx.ai/company?subscription=success#/dashboard/subscription
 *
 * Until you duplicate the table in Stripe, both env vars can point to the same
 * prctbl_… ID — only the Dashboard redirect URL needs to differ once duplicated.
 */
const DEFAULT_TABLE_ID = 'prctbl_1TDNBOPJXYVCMk8pdPIA3s0k';

const legacyId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID as string | undefined;

export const ONBOARDING_PRICING_TABLE_ID =
  (import.meta.env.VITE_STRIPE_PRICING_TABLE_ID_ONBOARDING as string | undefined) ||
  legacyId ||
  DEFAULT_TABLE_ID;

export const DASHBOARD_PRICING_TABLE_ID =
  (import.meta.env.VITE_STRIPE_PRICING_TABLE_ID_DASHBOARD as string | undefined) ||
  legacyId ||
  DEFAULT_TABLE_ID;

export const KNOWN_LIVE_PRICING_TABLE_IDS = [
  DEFAULT_TABLE_ID,
  ONBOARDING_PRICING_TABLE_ID,
  DASHBOARD_PRICING_TABLE_ID,
].filter((id, i, arr) => Boolean(id) && arr.indexOf(id) === i);
