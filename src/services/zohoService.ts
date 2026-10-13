const ZOHO_BROWSER_KEYS = {
  access: 'zoho_access_token',
  refresh: 'zoho_refresh_token',
  expiry: 'zoho_token_expiry',
  apiDomain: 'zoho_api_domain',
  accounts: 'zoho_accounts_server',
} as const;

export function captureZohoSessionFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const access = params.get('zoho_access_token');
  if (!access) return;

  localStorage.setItem(ZOHO_BROWSER_KEYS.access, access);
  const refresh = params.get('zoho_refresh_token');
  if (refresh) localStorage.setItem(ZOHO_BROWSER_KEYS.refresh, refresh);
  const apiDomain = params.get('zoho_api_domain');
  if (apiDomain) localStorage.setItem(ZOHO_BROWSER_KEYS.apiDomain, apiDomain);
  const accounts = params.get('zoho_accounts_server');
  if (accounts) localStorage.setItem(ZOHO_BROWSER_KEYS.accounts, accounts);
  const expiresIn = Number(params.get('zoho_expires_in') || 3600);
  localStorage.setItem(ZOHO_BROWSER_KEYS.expiry, String(Date.now() + expiresIn * 1000));

  ['zoho_access_token', 'zoho_refresh_token', 'zoho_api_domain', 'zoho_accounts_server', 'zoho_expires_in'].forEach((key) => {
    params.delete(key);
  });
  const search = params.toString();
  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
  );
}

export function clearZohoBrowserSession(): void {
  Object.values(ZOHO_BROWSER_KEYS).forEach((key) => localStorage.removeItem(key));
}

class ZohoService {
  private static instance: ZohoService;
  private config: {
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiry: number | null;
    isConfigured: boolean;
  } = {
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    isConfigured: false
  };

  private initPromise: Promise<boolean>;

  private constructor() {
    this.initPromise = this.initializeFromServer().catch(() => false);
  }

  public static getInstance(): ZohoService {
    if (!ZohoService.instance) {
      ZohoService.instance = new ZohoService();
    }
    return ZohoService.instance;
  }

  /** Resolves once the saved Zoho config has been loaded for this user. */
  public whenReady(): Promise<boolean> {
    return this.initPromise;
  }

  private loadBrowserSession(): boolean {
    captureZohoSessionFromUrl();
    const accessToken = localStorage.getItem(ZOHO_BROWSER_KEYS.access);
    this.config.accessToken = accessToken;
    this.config.refreshToken = localStorage.getItem(ZOHO_BROWSER_KEYS.refresh);
    this.config.tokenExpiry = Number(localStorage.getItem(ZOHO_BROWSER_KEYS.expiry) || 0);
    this.config.isConfigured = Boolean(accessToken);
    return this.config.isConfigured;
  }

  private async initializeFromServer(): Promise<boolean> {
    try {
      return this.loadBrowserSession();
    } catch (error) {
      return false;
    }
  }

  public saveBrowserSession(data: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    api_domain?: string;
    accounts_server?: string;
  }): void {
    localStorage.setItem(ZOHO_BROWSER_KEYS.access, data.access_token);
    if (data.refresh_token) localStorage.setItem(ZOHO_BROWSER_KEYS.refresh, data.refresh_token);
    if (data.api_domain) localStorage.setItem(ZOHO_BROWSER_KEYS.apiDomain, data.api_domain);
    if (data.accounts_server) localStorage.setItem(ZOHO_BROWSER_KEYS.accounts, data.accounts_server);
    const expiresIn = Number(data.expires_in || 3600);
    localStorage.setItem(ZOHO_BROWSER_KEYS.expiry, String(Date.now() + expiresIn * 1000));
    this.config.accessToken = data.access_token;
    this.config.refreshToken = data.refresh_token || this.config.refreshToken;
    this.config.tokenExpiry = Date.now() + expiresIn * 1000;
    this.config.isConfigured = true;
  }

  public getApiDomain(): string {
    return localStorage.getItem(ZOHO_BROWSER_KEYS.apiDomain) || '';
  }

  public async refreshToken() {
    try {
      const refreshToken = localStorage.getItem(ZOHO_BROWSER_KEYS.refresh);
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken,
          accountsServer: localStorage.getItem(ZOHO_BROWSER_KEYS.accounts) || '',
          apiDomain: localStorage.getItem(ZOHO_BROWSER_KEYS.apiDomain) || '',
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.access_token) {
        return false;
      }

      this.saveBrowserSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_in: data.expires_in,
        api_domain: data.api_domain,
        accounts_server: localStorage.getItem(ZOHO_BROWSER_KEYS.accounts) || '',
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  public isConfigured(): boolean {
    return this.config.isConfigured;
  }

  public getAccessToken(): string | null {
    return this.config.accessToken;
  }

  public async getValidAccessToken(): Promise<string | null> {
    try {
      if (!this.config.accessToken || !this.config.tokenExpiry || Date.now() >= this.config.tokenExpiry) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          
          return null;
        }
      }
      return this.config.accessToken;
    } catch (error) {
      
      return null;
    }
  }

  public resetConfiguration(): void {
    clearZohoBrowserSession();
    this.config = {
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      isConfigured: false
    };
  }
}

export default ZohoService; 
