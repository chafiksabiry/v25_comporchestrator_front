import api from './index';

export interface Lead {
  _id: string;
  userId: string;
  gigId: string;
  refreshToken: string;
  id: string; // Zoho CRM ID
  Last_Activity_Time: string | null;
  Deal_Name: string;
  Stage: string;
  Email_1: string;
  Phone?: string;
  updatedAt: string;
  // Champs optionnels pour compatibilité
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  status?: string;
  value?: number;
  probability?: number;
  source?: string;
  assignedTo?: string;
  lastContact?: string;
  nextAction?: string;
  notes?: string;
  metadata?: {
    ai_analysis?: {
      score?: number;
      sentiment?: string;
    };
  };
  created_at?: string;
  updated_at?: string;
}

// Interface pour la réponse paginée des leads
export interface LeadsResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Lead[];
}

export const leadsApi = {
  getAll: async () => {
    const response = await api.get<Lead[]>('/leads');
    return response.data;
  },

  // Nouvelle méthode pour récupérer les leads par gig avec pagination
  getByGig: async (gigId: string, page: number = 1, limit: number = 10) => {
    const response = await api.get<LeadsResponse>(`/leads/gig/${gigId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Lead>(`/leads/${id}`);
    return response.data;
  },

  create: async (data: Partial<Lead>) => {
    const response = await api.post('/leads', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Lead>) => {
    const response = await api.put(`/leads/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  analyze: async (id: string) => {
    const response = await api.post(`/leads/${id}/analyze`);
    return response.data;
  },

  generateScript: async (id: string, type: 'email' | 'call') => {
    const response = await api.post(`/leads/${id}/generate-script`, { type });
    return response.data;
  }
};
