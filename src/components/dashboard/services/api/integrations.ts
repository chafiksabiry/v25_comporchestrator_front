import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'error' | 'pending';
  icon_url: string;
  config?: {
    fields: ConfigField[];
  };
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  validation?: (value: string) => string | undefined;
}

export interface IntegrationConnection {
  id: string;
  integration_id: string;
  status: 'active' | 'error' | 'pending';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const integrationsApi = {
  getAll: async () => {
    const response = await axios.get<Integration[]>(`${API_BASE_URL}/integrations`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axios.get<Integration>(`${API_BASE_URL}/integrations/${id}`);
    return response.data;
  },

  connect: async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/integrations/${id}/connect`);
    return response.data;
  },

  disconnect: async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/integrations/${id}/disconnect`);
    return response.data;
  },

  configure: async (id: string, config: Record<string, any>) => {
    const response = await axios.post(`${API_BASE_URL}/integrations/${id}/configure`, { config });
    return response.data;
  },

  getConnections: async () => {
    const response = await axios.get<IntegrationConnection[]>(`${API_BASE_URL}/integration-connections`);
    return response.data;
  }
};
