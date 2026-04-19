interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface IntegrationConfig {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  [key: string]: any;
}

const STORAGE_KEY = 'zoo_crm_integration';

export const integrationHandlers = {
  connect: async (integrationId: string) => {
    const config = localStorage.getItem(STORAGE_KEY);
    if (config) {
      const parsedConfig = JSON.parse(config);
      parsedConfig.status = 'connected';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedConfig));
    }
  },

  disconnect: async (integrationId: string) => {
    const config = localStorage.getItem(STORAGE_KEY);
    if (config) {
      const parsedConfig = JSON.parse(config);
      parsedConfig.status = 'pending';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedConfig));
    }
  },

  configure: async (integrationId: string, config: IntegrationConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...config,
      status: 'active'
    }));
  },

  refreshZooToken: async (integrationId: string) => {
    const configStr = localStorage.getItem(STORAGE_KEY);
    if (!configStr) {
      throw new Error('No integration configuration found');
    }

    const config: IntegrationConfig = JSON.parse(configStr);
    const refreshToken = config.refresh_token;

    try {
      // Call Zoo CRM refresh token endpoint
      const response = await fetch('https://api.zoocrm.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.ZOO_CLIENT_ID,
          client_secret: process.env.ZOO_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokenData: TokenResponse = await response.json();

      // Update the integration config with new tokens
      const newConfig = {
        ...config,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
      };

      await integrationHandlers.configure(integrationId, newConfig);
      return newConfig;
    } catch (error) {
      console.error('Error refreshing Zoo CRM token:', error);
      throw error;
    }
  },

  checkAndRefreshZooToken: async (integrationId: string) => {
    const configStr = localStorage.getItem(STORAGE_KEY);
    if (!configStr) {
      throw new Error('No integration configuration found');
    }

    const config: IntegrationConfig = JSON.parse(configStr);
    const expiresAt = config.expires_at;

    // If token is expired or will expire in the next 5 minutes, refresh it
    if (!expiresAt || Date.now() >= expiresAt - 30000) {
      return await integrationHandlers.refreshZooToken(integrationId);
    }

    return config;
  }
};
