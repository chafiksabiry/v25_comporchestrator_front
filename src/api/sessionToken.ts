import Cookies from 'js-cookie';

/** Jeton de la session HARX (même ordre de lecture que les autres clients de l'application). */
export function sessionToken(): string {
  try {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      Cookies.get('token') ||
      Cookies.get('auth_token') ||
      ''
    );
  } catch {
    return '';
  }
}

/** En-tête Authorization de la session, vide sans jeton. */
export function sessionAuthHeader(): Record<string, string> {
  const token = sessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Ajoute le jeton de la session à chaque requête d'un client axios. Le service de connaissance et les routes
 * de compte du service d'inscription l'exigent.
 */
type WithRequestInterceptors = {
  interceptors: { request: { use: (onFulfilled: (config: any) => any) => unknown } };
};

export function attachSessionToken<T extends WithRequestInterceptors>(instance: T): T {
  instance.interceptors.request.use((config: any) => {
    const token = sessionToken();
    if (token) {
      config.headers = config.headers || {};
      if (typeof config.headers.set === 'function') config.headers.set('Authorization', `Bearer ${token}`);
      else config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return instance;
}
