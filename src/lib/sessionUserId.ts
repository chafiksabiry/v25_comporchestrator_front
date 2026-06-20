import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  userId?: string;
}

const SESSION_COOKIE_OPTS = { path: '/', sameSite: 'Lax' as const };

/**
 * Resolve the logged-in user id from cookie, localStorage, or JWT.
 * Syncs back to cookie so auth gates do not redirect to /auth in a loop.
 */
export function resolveSessionUserId(): string | undefined {
  const cookieUserId = Cookies.get('userId');
  if (cookieUserId) return cookieUserId;

  const storedUserId = localStorage.getItem('userId');
  if (storedUserId) {
    Cookies.set('userId', storedUserId, SESSION_COOKIE_OPTS);
    return storedUserId;
  }

  const token = localStorage.getItem('token');
  if (!token) return undefined;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    if (decoded.userId) {
      Cookies.set('userId', decoded.userId, SESSION_COOKIE_OPTS);
      localStorage.setItem('userId', decoded.userId);
      return decoded.userId;
    }
  } catch {
    /* ignore invalid token */
  }

  return undefined;
}
