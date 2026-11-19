/**
 * `fetch` wrapper that attaches the logged-in user's Bearer token.
 *
 * Several company-facing endpoints (wallet-company, minutes-company,
 * tokens-company) previously had no authentication check at all on the
 * backend (cahier de recette PAY-12) and the frontend never sent a token
 * either. Now that the backend requires one, every call to those endpoints
 * must go through this helper instead of a bare `fetch`.
 */
import Cookies from 'js-cookie';
import { sessionToken } from '../api/sessionToken';
import { isJwtExpired } from '../utils/jwtExpiry';
import { broadcastAuthChanged } from './authSync';

/**
 * Jeton de l'utilisateur connecté (même source pour fetch, axios et WebSocket) ; null sans session.
 * Même ordre de lecture que `sessionToken` (localStorage token, auth_token, puis cookies).
 */
export function getAuthToken(): string | null {
  return sessionToken() || null;
}

let redirectingToLogin = false;

/**
 * Réponse 401 à une requête qui portait le jeton de la session : si ce jeton est expiré, on vide la session
 * et on renvoie vers la page de connexion de l'application (`/auth`, comme App.tsx quand il n'y a pas de
 * session). Un 401 avec un jeton encore valide (droits, autre entreprise...) ne déconnecte pas.
 */
export function handleUnauthorized(status: number, sentToken: string | null): void {
  if (status !== 401 || !sentToken || redirectingToLogin) return;
  if (!isJwtExpired(sentToken)) return;
  if (sessionToken() !== sentToken) return; // une nouvelle session a déjà remplacé ce jeton
  redirectingToLogin = true;
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userId');
  } catch {
    /* ignore */
  }
  Cookies.remove('token');
  Cookies.remove('auth_token');
  Cookies.remove('userId');
  Cookies.remove('userId', { path: '/' });
  broadcastAuthChanged({ token: null, userId: null, source: 'company' });
  window.location.replace('/auth');
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  handleUnauthorized(res.status, token);
  return res;
}

type AxiosLikeError = {
  response?: { status?: number };
  config?: { headers?: Record<string, unknown> & { get?: (name: string) => unknown } };
};
type WithResponseInterceptors = {
  interceptors: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepte instances axios de toute version
    response: { use: (onFulfilled: (r: any) => any, onRejected: (e: any) => any) => unknown };
  };
};

/**
 * Même renvoi vers la connexion pour les appels axios qui ont porté le jeton de la session
 * (`authHeaders()` ou intercepteur). Les appels vers des services tiers ne portent pas ce jeton
 * et ne sont donc jamais concernés.
 */
export function redirectOnExpiredSession<T extends WithResponseInterceptors>(instance: T): T {
  instance.interceptors.response.use(
    (response: unknown) => response,
    (error: AxiosLikeError) => {
      const status = error?.response?.status;
      const hdrs = error?.config?.headers;
      const raw = typeof hdrs?.get === 'function' ? hdrs.get('Authorization') : hdrs?.Authorization;
      const sent = typeof raw === 'string' && raw.startsWith('Bearer ') ? raw.slice(7) : null;
      if (typeof status === 'number') handleUnauthorized(status, sent);
      return Promise.reject(error);
    }
  );
  return instance;
}

/** En-tête Authorization de l'utilisateur connecté, pour les appels axios (vide si aucune session). */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
