import axios from 'axios';
import api from './index';

export interface CompanySettings {
  data(data: any): unknown;
  name: string;
  company_logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  industry?: string;
  description?: string;
}

export const settingsApi = {
  getSettings: async () => {
    const response = await axios.get<CompanySettings>(`${import.meta.env.VITE_API_URL}/companies/67921fce031b145d2e8088ca`);
    return response.data;
  },

  updateSettings: async (settings: Partial<CompanySettings>) => {
    const response = await api.put<CompanySettings>('/settings', settings);
    return response.data;
  },

  updateLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.put('/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};
