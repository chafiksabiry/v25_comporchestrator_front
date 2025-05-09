import axios from 'axios';

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: string[];
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
    const response = await api.get<PhoneNumber[]>('/phone-numbers');
    return response.data;
  },

  searchPhoneNumbers: async (countryCode: string): Promise<PhoneNumber[]> => {
    const response = await api.get<PhoneNumber[]>(`/phone-numbers/search`, {
      params: { countryCode }
    });
    return response.data;
  },

  purchasePhoneNumber: async (phoneNumber: string): Promise<PhoneNumber> => {
    const response = await api.post<PhoneNumber>('/phone-numbers/purchase', { phoneNumber });
    return response.data;
  }
};

export default api; 