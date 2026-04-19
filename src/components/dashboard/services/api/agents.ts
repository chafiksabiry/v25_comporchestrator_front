import api from './index';

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'busy';
  skills: string[];
  languages: string[];
  rating: number;
  availability: {
    schedule: Array<{
      day: string;
      start: string;
      end: string;
    }>;
    timezone: string;
  };
  performance: {
    calls_handled: number;
    avg_duration: number;
    success_rate: number;
    customer_satisfaction: number;
  };
  created_at: string;
  updated_at: string;
}

export const agentsApi = {
  getAll: async () => {
    const response = await api.get<Agent[]>('/agents');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Agent>(`/agents/${id}`);
    return response.data;
  },

  create: async (data: Partial<Agent>) => {
    const response = await api.post('/agents', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Agent>) => {
    const response = await api.put(`/agents/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/agents/${id}`);
    return response.data;
  },

  updateAvailability: async (id: string, availability: Agent['availability']) => {
    const response = await api.put(`/agents/${id}/availability`, availability);
    return response.data;
  },

  updateSkills: async (id: string, skills: string[]) => {
    const response = await api.put(`/agents/${id}/skills`, { skills });
    return response.data;
  }
};
