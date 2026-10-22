import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

/**
 * Session partagée avec l'application d'inscription HARX existante (mêmes clés : cookie `userId` /
 * `companyId`, `localStorage.token`), ce qui permet de se connecter avec le même compte.
 */

export const DATA_MODE: 'mock' | 'live' = import.meta.env.VITE_DATA_MODE === 'live' ? 'live' : 'mock';

const COOKIE_OPTS = { path: '/', sameSite: 'Lax' as const };

export function resolveSessionUserId(): string | undefined {
  const fromCookie = Cookies.get('userId');
  if (fromCookie) return fromCookie;
  try {
    const stored = localStorage.getItem('userId');
    if (stored) {
      Cookies.set('userId', stored, COOKIE_OPTS);
      return stored;
    }
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode<{ userId?: string }>(token);
      if (decoded.userId) {
        Cookies.set('userId', decoded.userId, COOKIE_OPTS);
        return decoded.userId;
      }
    }
  } catch {
    /* jeton invalide ou stockage indisponible */
  }
  return DATA_MODE === 'mock' ? 'demo-user' : undefined;
}

export function resolveCompanyId(): string | undefined {
  const fromCookie = Cookies.get('companyId');
  if (fromCookie) return fromCookie;
  try {
    const stored = localStorage.getItem('companyId');
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return DATA_MODE === 'mock' ? 'demo-company' : undefined;
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || Cookies.get('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  const userId = Cookies.get('userId');
  if (userId) headers['X-User-Id'] = userId;
  return headers;
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, headers: { ...authHeaders(), ...(init.headers as Record<string, string>) } });
}

export function registrationBase(): string {
  const raw =
    import.meta.env.VITE_REGISTRATION_BACKEND_URL || 'https://v25registrationbackend-production.up.railway.app';
  return String(raw).replace(/\/$/, '').replace(/\/api$/, '');
}

export function orchestratorApiBase(): string {
  return String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api').replace(/\/$/, '');
}
