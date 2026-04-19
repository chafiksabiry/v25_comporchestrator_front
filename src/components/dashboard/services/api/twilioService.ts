import axios from 'axios';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumbers: string[];
  webhookUrl: string;
  status: 'active' | 'error' | 'pending';
}

export interface TwilioUsageMetrics {
  calls: number;
  minutes: number;
  cost: number;
  period: string;
}

export const twilioService = {
  async validateCredentials(config: Partial<TwilioConfig>): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.post('/api/twilio/validate', config);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { valid: false, error: errorMessage };
    }
  },

  async getClientConfig(organizationId: string): Promise<TwilioConfig | null> {
    try {
      const response = await axios.get(`/api/organizations/${organizationId}/twilio-config`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async saveClientConfig(organizationId: string, config: Partial<TwilioConfig>): Promise<TwilioConfig> {
    const response = await axios.post(`/api/organizations/${organizationId}/twilio-config`, config);
    return response.data;
  },

  async getUsageMetrics(organizationId: string, period: string): Promise<TwilioUsageMetrics> {
    const response = await axios.get(`/api/organizations/${organizationId}/twilio-usage`, {
      params: { period }
    });
    return response.data;
  }
}; 
