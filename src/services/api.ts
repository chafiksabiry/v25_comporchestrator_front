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

// Add request interceptor for better error handling
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.warn(`⚠️ API Endpoint not found: ${error.config?.url}`);
      } else if (error.response?.status >= 500) {
        console.error(`❌ Server Error: ${error.response.status} ${error.config?.url}`);
      } else {
        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
      }
    } else {
      console.error('❌ Network Error:', error);
    }
    return Promise.reject(error);
  }
);

export const phoneNumberService = {
  listPhoneNumbers: async (): Promise<PhoneNumber[]> => {
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/phone-numbers`;
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

// Onboarding service for managing onboarding progress
export const onboardingService = {
  // Get onboarding progress
  getProgress: async (companyId: string) => {
    try {
      return await axios.get(`${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`);
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
      throw error;
    }
  },

  // Update step progress
  updateStepProgress: async (companyId: string, stepId: number, status: string) => {
    try {
      // Determine phase based on step ID
      let phaseId = 1;
      if (stepId >= 1 && stepId <= 3) phaseId = 1;
      else if (stepId >= 4 && stepId <= 6) phaseId = 2;
      else if (stepId >= 7 && stepId <= 10) phaseId = 3;
      else if (stepId >= 11 && stepId <= 13) phaseId = 4;

      return await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
        { status }
      );
    } catch (error) {
      console.error('Error updating step progress:', error);
      throw error;
    }
  },

  // Check company leads (step 6)
  checkCompanyLeads: async (companyId: string) => {
    try {
      return await axios.get(`${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}/has-leads`);
    } catch (error: any) {
      // Handle 404 gracefully - return default data
      if (error.response?.status === 404) {
        console.log('⚠️ Leads endpoint not found, returning default data');
        return {
          data: {
            success: true,
            hasLeads: false,
            count: 0
          }
        };
      }
      console.error('Error checking company leads:', error);
      throw error;
    }
  },

  // Check company gigs (step 13)
  checkCompanyGigs: async (companyId: string) => {
    try {
      return await axios.get(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}/last`);
    } catch (error: any) {
      // Handle 404 gracefully - return default data
      if (error.response?.status === 404) {
        console.log('⚠️ Gigs endpoint not found, returning default data');
        return {
          data: {
            data: null,
            totalGigs: 0,
            hasActiveGig: false,
            gigStatuses: []
          }
        };
      }
      console.error('Error checking company gigs:', error);
      throw error;
    }
  }
};

export default api; 