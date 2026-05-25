/** Default calls API when Netlify build omits VITE_API_URL_CALL. */
export const DEFAULT_CALLS_API = 'https://preprod-api-dash-calls.harx.ai';

/**
 * Base URL for v25_dash_calls_backend (includes `/api` suffix).
 * Used by fetch() calls: `${base}/calls?...`
 */
export function getCallsApiBase(): string {
  const winEnv =
    typeof window !== 'undefined'
      ? (window as unknown as { __HARX_ENV__?: { VITE_API_URL_CALL?: string } })
          .__HARX_ENV__
      : undefined;
  const raw =
    (import.meta as any).env?.VITE_API_URL_CALL ||
    winEnv?.VITE_API_URL_CALL ||
    DEFAULT_CALLS_API;
  if (!raw) return '';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

/**
 * Origin for axios `apiCall` (paths already start with `/api/calls/...`).
 * Must NOT end with `/api` to avoid double `/api/api/`.
 */
export function getCallsApiOrigin(): string {
  const base = getCallsApiBase();
  return base.endsWith('/api') ? base.slice(0, -4) : base;
}
