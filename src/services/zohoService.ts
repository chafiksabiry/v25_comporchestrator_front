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
    // Initialisation silencieuse
    this.initializeFromServer().catch(error => {
      console.debug('ZohoService: Initial configuration not found', error);
    });
  }

  public static getInstance(): ZohoService {
    if (!ZohoService.instance) {
      ZohoService.instance = new ZohoService();
    }
    return ZohoService.instance;
  }

  private async initializeFromServer() {
    try {
      const userId = Cookies.get('userId');
      if (!userId) {
        console.debug('ZohoService: No userId found in cookies');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/config/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('gigId')}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const config = await response.json();
        this.config.accessToken = config.access_token;
        this.config.refreshToken = config.refresh_token;
        this.config.tokenExpiry = Date.now() + (config.expires_in * 1000);
        this.config.isConfigured = true;
        console.debug('ZohoService: Configuration loaded successfully');
      } else if (response.status === 404) {
        console.debug('ZohoService: No configuration found for user');
      } else {
        console.debug('ZohoService: Failed to load configuration', response.status);
      }
    } catch (error) {
      console.debug('ZohoService: Error initializing from server', error);
    }
  }

  public async refreshToken() {
    try {
      const userId = Cookies.get('userId');
      if (!userId) {
        console.debug('ZohoService: No userId found for token refresh');
        return false;
      }

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/config/user/${userId}/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Cookies.get('gigId')}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.config.accessToken = data.access_token;
        this.config.refreshToken = data.refresh_token;
        this.config.tokenExpiry = Date.now() + (data.expires_in * 1000);
        console.debug('ZohoService: Token refreshed successfully');
        return true;
      } else {
        console.debug('ZohoService: Failed to refresh token', response.status);
        return false;
      }
    } catch (error) {
      console.debug('ZohoService: Error refreshing token', error);
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
          console.debug('ZohoService: Failed to get valid access token');
          return null;
        }
      }
      return this.config.accessToken;
    } catch (error) {
      console.debug('ZohoService: Error getting valid access token', error);
      return null;
    }
  }
}

export default ZohoService; 