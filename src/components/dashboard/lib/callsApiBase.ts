/**
 * Two distinct backends are involved in "calls":
 *
 *   • v25_dashboard_backend   → basic CRUD: GET /api/calls?companyId=...,
 *                               PUT /api/calls/:id (transaction validation)
 *                               Configured via VITE_API_URL_CALL.
 *
 *   • v25_dash_calls_backend  → AI analyze + analytics endpoints:
 *                               POST /api/calls/:id/analyze
 *                               GET  /api/calls/company/:id/analytics/*
 *                               Configured via VITE_DASH_CALLS_API_URL,
 *                               defaults to the preprod host.
 *
 * Keeping them in separate getters guarantees that changing VITE_API_URL_CALL
 * (e.g. swapping CRUD providers) never breaks the AI/analytics pipeline.
 */

/**
 * Default analytics + analyze backend when no env var is set.
 *
 * The Railway-hosted instance of `v25_dash_calls_backend`. The vanity
 * domain `preprod-api-dash-calls.harx.ai` is not registered, so we use
 * the canonical Railway URL as the safe fallback.
 */
export const DEFAULT_DASH_CALLS_API =
  'https://v25dashcallsbackend-production.up.railway.app/api';

/** Default basic-CRUD backend (Railway dashboard). */
export const DEFAULT_CALLS_CRUD_API =
  'https://v25dashboardbackend-production.up.railway.app/api';

type WinEnv = {
  __HARX_ENV__?: {
    VITE_API_URL_CALL?: string;
    VITE_DASH_CALLS_API_URL?: string;
  };
};

function readEnv(key: 'VITE_API_URL_CALL' | 'VITE_DASH_CALLS_API_URL'): string | undefined {
  const fromImportMeta = (import.meta as any).env?.[key];
  if (fromImportMeta) return fromImportMeta;
  if (typeof window !== 'undefined') {
    return (window as unknown as WinEnv).__HARX_ENV__?.[key];
  }
  return undefined;
}

function withApiSuffix(raw: string): string {
  if (!raw) return '';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
}

/**
 * Base URL for basic CRUD on calls (`v25_dashboard_backend`).
 * Already includes `/api`. Example return:
 *   `https://v25dashboardbackend-production.up.railway.app/api`
 */
export function getCallsApiBase(): string {
  return withApiSuffix(readEnv('VITE_API_URL_CALL') || DEFAULT_CALLS_CRUD_API);
}

/**
 * Base URL for AI analyze + analytics (`v25_dash_calls_backend`).
 * Always lives on its own host, never falls back to the CRUD backend.
 * Example return: `https://v25dashcallsbackend-production.up.railway.app/api`
 */
export function getDashCallsApiBase(): string {
  return withApiSuffix(
    readEnv('VITE_DASH_CALLS_API_URL') || DEFAULT_DASH_CALLS_API
  );
}

/**
 * Origin (no `/api`) for the dash_calls backend. Used when an existing
 * caller already prefixes paths with `/api/...` (axios `apiCall`).
 */
export function getDashCallsApiOrigin(): string {
  const base = getDashCallsApiBase();
  return base.endsWith('/api') ? base.slice(0, -4) : base;
}

/**
 * Legacy alias preserved for callers that still default the analytics base
 * via VITE_API_URL_CALL. Prefer `getDashCallsApiBase()` for new code.
 */
export const DEFAULT_CALLS_API = DEFAULT_DASH_CALLS_API;
