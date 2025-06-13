import axios from 'axios';

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: string[];
  gigId: string;
}

export interface AvailablePhoneNumber {
  phone_number?: string;
  phoneNumber?: string;
  friendlyName?: string;
  locality?: string;
  region?: string;
  isoCountry?: string;
  capabilities?: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const phoneNumberService = {
  listPhoneNumbers: async (): Promise<PhoneNumber[]> => {
    try {
      const url = `${import.meta.env.VITE_PHONE_API}/phone-numbers`;
      console.log('Fetching phone numbers from:', url);
      const response = await axios.get<PhoneNumber[]>(url);
      return response.data;
    } catch (error) {
      console.error('Error listing phone numbers:', error);
      throw error;
    }
  },

  searchPhoneNumbers: async (countryCode: string, provider: string = 'telnyx'): Promise<AvailablePhoneNumber[]> => {
    try {
      const endpoint = provider === 'twilio' ? '/search/twilio' : '/search';
      const url = `${import.meta.env.VITE_API_BASE_URL}/phone-numbers${endpoint}`;
      console.log(`Searching ${provider} numbers from:`, url);
      console.log('Search params:', { countryCode, provider });
      
      const response = await axios.get<AvailablePhoneNumber[]>(url, {
        params: { countryCode }
      });

      if (!response.data || typeof response.data === 'string') {
        console.error('Invalid response format:', response.data);
        return [];
      }

      return response.data;
    } catch (error) {
      console.error(`Error searching ${provider} phone numbers:`, error);
      throw error;
    }
  },

  purchasePhoneNumber: async (phoneNumber: string, provider: string = 'telnyx', gigId: string): Promise<PhoneNumber> => {
    if (!gigId) {
      throw new Error('gigId is required to purchase a phone number');
    }

    try {
      const endpoint = provider === 'twilio' ? '/purchase/twilio' : '/purchase';
      const url = `${import.meta.env.VITE_API_BASE_URL}/phone-numbers${endpoint}`;
      console.log(`Purchasing ${provider} number from:`, url);
      console.log('Purchase params:', { phoneNumber, provider, gigId });
      
      const response = await axios.post<PhoneNumber>(url, {
        phoneNumber,
        provider,
        gigId
      });
      return response.data;
    } catch (error) {
      console.error(`Error purchasing ${provider} phone number:`, error);
      throw error;
    }
  }
};

export default api; 