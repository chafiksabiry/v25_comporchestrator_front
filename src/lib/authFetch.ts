/**
 * `fetch` wrapper that attaches the logged-in user's Bearer token.
 *
 * Several company-facing endpoints (wallet-company, minutes-company,
 * tokens-company) previously had no authentication check at all on the
 * backend (cahier de recette PAY-12) and the frontend never sent a token
 * either. Now that the backend requires one, every call to those endpoints
 * must go through this helper instead of a bare `fetch`.
 */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
