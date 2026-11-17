/**
 * `fetch` wrapper that attaches the logged-in user's Bearer token.
 *
 * Several company-facing endpoints (wallet-company, minutes-company,
 * tokens-company) previously had no authentication check at all on the
 * backend (cahier de recette PAY-12) and the frontend never sent a token
 * either. Now that the backend requires one, every call to those endpoints
 * must go through this helper instead of a bare `fetch`.
 */
/** Jeton de l'utilisateur connecté (même source pour fetch, axios et WebSocket) ; null sans session. */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

/** En-tête Authorization de l'utilisateur connecté, pour les appels axios (vide si aucune session). */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
