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
        if (config) {
          this.config.accessToken = config.access_token;
          this.config.refreshToken = config.refresh_token;
          this.config.tokenExpiry = Date.now() + (config.expires_in * 1000);
          this.config.isConfigured = true;
          
        }
      } else if (response.status === 404) {
        
      } else {
        
      }
    } catch (error) {
      
    }
  }

  public async refreshToken() {
    try {
      const userId = Cookies.get('userId');
      if (!userId) {
        
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
        
        return true;
      } else {
        
        return false;
      }
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
    this.config = {
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      isConfigured: false
    };
    
  }
}

export default ZohoService; 
