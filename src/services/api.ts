import axios from 'axios';

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  provider: 'telnyx' | 'twilio';
}

interface CheckNumberResponse {
  hasNumber: boolean;
  number?: PhoneNumber;
  message?: string;
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
    fax?: boolean;
  };
  monthlyFee?: number;
  setupFee?: number;
  currency?: string;
  provider?: 'telnyx' | 'twilio';
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout and validation
  timeout: 30000, // 30 seconds
  validateStatus: (status: number) => {
    return status >= 200 && status < 500; // Don't reject if status is 4xx to handle it in service
  },
});

// Custom error class for phone number service errors
export class PhoneNumberServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PhoneNumberServiceError';
  }
}

// Helper function to handle API errors
interface ApiError {
  response?: {
    status?: number;
    data?: any;
  };
  message?: string;
  config?: any;
}

const isAxiosError = (error: unknown): error is ApiError => {
  return error !== null && typeof error === 'object' && 'response' in error;
};

const handleApiError = (error: unknown, context: string): never => {
  console.error(`❌ Error in ${context}:`, error);

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    
    console.error('❌ Response status:', status);
    console.error('❌ Response data:', data);
    console.error('❌ Request config:', error.config);

    // Handle specific error cases
    if (status === 404) {
      throw new PhoneNumberServiceError(
        'Resource not found',
        'NOT_FOUND',
        status,
        data
      );
    } else if (status === 400) {
      throw new PhoneNumberServiceError(
        'Invalid request parameters',
        'INVALID_PARAMETERS',
        status,
        data
      );
    } else if (status === 401) {
      throw new PhoneNumberServiceError(
        'Authentication required',
        'UNAUTHORIZED',
        status,
        data
      );
    } else if (status === 403) {
      throw new PhoneNumberServiceError(
        'Operation not allowed',
        'FORBIDDEN',
        status,
        data
      );
    } else if (status === 429) {
      throw new PhoneNumberServiceError(
        'Rate limit exceeded',
        'RATE_LIMIT',
        status,
        data
      );
    } else if (status && status >= 500) {
      throw new PhoneNumberServiceError(
        'Server error occurred',
        'SERVER_ERROR',
        status,
        data
      );
    }

    throw new PhoneNumberServiceError(
      error.message || 'Unknown error occurred',
      'UNKNOWN_ERROR',
      status,
      data
    );
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  throw new PhoneNumberServiceError(
    errorMessage,
    'UNKNOWN_ERROR'
  );
};

export const phoneNumberService = {
  listPhoneNumbers: async (gigId: string): Promise<CheckNumberResponse> => {
    try {
      const response = await api.get<CheckNumberResponse>(`/phone-numbers/gig/${gigId}/check`);
      console.log('📞 Listed phone numbers:', response.data);
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'listPhoneNumbers');
    }
  },

  searchPhoneNumbers: async (
    countryCode: string,
    provider: 'telnyx' | 'twilio' = 'telnyx'
  ): Promise<AvailablePhoneNumber[]> => {
    try {
      const endpoint = provider === 'twilio' 
        ? '/phone-numbers/search/twilio'
        : '/phone-numbers/search';
      console.log(`🔍 Searching ${provider} numbers for ${countryCode}`);

      const response = await api.get<AvailablePhoneNumber[]>(endpoint, {
        params: { countryCode }
      });

      // Handle empty or invalid response
      if (!response.data || typeof response.data === 'string') {
        console.warn('⚠️ Invalid response format:', response.data);
        return [];
      }

      // Add provider info to each number
      const numbers = response.data.map((number: any) => ({
        ...number,
        provider
      }));

      console.log(`✅ Found ${numbers.length} numbers for ${countryCode}`);
      return numbers;
    } catch (error) {
      // Special case: return empty array for 500 errors
      if (isAxiosError(error) && error.response?.status === 500) {
        console.warn(`⚠️ ${provider} API error, returning empty array`);
          return [];
        }
      return handleApiError(error, 'searchPhoneNumbers');
    }
  },

  purchasePhoneNumber: async (data: {
    phoneNumber: string;
    provider: 'telnyx' | 'twilio';
    gigId: string;
    companyId: string;
    requirementGroupId?: string;
  }): Promise<PhoneNumber> => {
    const { phoneNumber, provider, gigId, requirementGroupId } = data;

    if (!gigId) {
      throw new PhoneNumberServiceError(
        'gigId is required to purchase a phone number',
        'MISSING_PARAMETER'
      );
    }

    if (!phoneNumber) {
      throw new PhoneNumberServiceError(
        'phoneNumber is required',
        'MISSING_PARAMETER'
      );
    }

    if (!data.companyId) {
      throw new PhoneNumberServiceError(
        'companyId is required to purchase a phone number',
        'MISSING_PARAMETER'
      );
    }

    // Vérifier le requirementGroupId pour Telnyx
    if (provider === 'telnyx' && !requirementGroupId) {
      throw new PhoneNumberServiceError(
        'requirementGroupId is required for Telnyx numbers',
        'MISSING_PARAMETER'
      );
    }

    try {
      const endpoint = provider === 'twilio'
        ? '/phone-numbers/purchase/twilio'
        : '/phone-numbers/purchase';
      console.log(`🛒 Purchasing ${provider} number ${phoneNumber} for gig ${gigId}`, 
        requirementGroupId ? `with requirement group ${requirementGroupId}` : '');

      const response = await api.post<PhoneNumber>(endpoint, {
        phoneNumber,
        provider,
        gigId,
        companyId: data.companyId,
        requirementGroupId
      });
      
      console.log('✅ Purchase successful:', response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'purchasePhoneNumber');
    }
  }
};

export default api; 