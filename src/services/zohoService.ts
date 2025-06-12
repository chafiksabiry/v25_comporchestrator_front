import Cookies from 'js-cookie';

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

  private constructor() {
    this.initializeFromStorage();
  }

  public static getInstance(): ZohoService {
    if (!ZohoService.instance) {
      ZohoService.instance = new ZohoService();
    }
    return ZohoService.instance;
  }

  private initializeFromStorage() {
    this.config.accessToken = localStorage.getItem('zoho_access_token');
    this.config.refreshToken = localStorage.getItem('zoho_refresh_token');
    const expiry = localStorage.getItem('zoho_token_expiry');
    this.config.tokenExpiry = expiry ? parseInt(expiry) : null;
    this.config.isConfigured = !!(this.config.accessToken && this.config.refreshToken);
  }

  public async initializeConfig() {
    try {
      const userId = Cookies.get('userId');
      if (!userId) {
        console.error('No userId found in cookies');
        return false;
      }

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/config/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('gigId')}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const config = await response.json();
        if (config.access_token) {
          this.config.accessToken = config.access_token;
          this.config.refreshToken = config.refresh_token;
          this.config.tokenExpiry = Date.now() + (config.expires_in * 1000);
          this.config.isConfigured = true;

          // Update localStorage
          localStorage.setItem('zoho_access_token', config.access_token);
          localStorage.setItem('zoho_refresh_token', config.refresh_token);
          localStorage.setItem('zoho_token_expiry', this.config.tokenExpiry.toString());

          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error initializing Zoho config:', error);
      return false;
    }
  }

  public async refreshToken() {
    try {
      const userId = Cookies.get('userId');
      const companyId = Cookies.get('companyId');
      
      if (!this.config.refreshToken || !userId || !companyId) {
        return false;
      }

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.config.refreshToken,
          userId,
          companyId
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.config.accessToken = data.accessToken;
        this.config.tokenExpiry = Date.now() + 3600000;

        localStorage.setItem('zoho_access_token', data.accessToken);
        localStorage.setItem('zoho_token_expiry', this.config.tokenExpiry.toString());

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
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
    if (!this.config.accessToken || !this.config.tokenExpiry || Date.now() >= this.config.tokenExpiry) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        return null;
      }
    }
    return this.config.accessToken;
  }
}

export default ZohoService; 