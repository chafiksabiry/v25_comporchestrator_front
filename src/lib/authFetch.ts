/**
 * fetch wrapper that attaches the logged-in user's Bearer token.
 * Wallet, minutes, tokens and escrow reads now require that token.
 */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
