import api from './index';
import { API_ENDPOINTS } from '../../utils/constants';
import type { DashboardStats, LiveCall, TopGig, TopRep, Gig } from '../../types';

// Dashboard API
export const dashboardApi = {
  getStats: async (timeRange: string, region: string) => {
    const response = await api.get<DashboardStats>(
      `${API_ENDPOINTS.DASHBOARD}/stats?timeRange=${timeRange}&region=${region}`
    );
    return response.data;
  },

  getLiveCalls: async () => {
    const response = await api.get<LiveCall[]>(`${API_ENDPOINTS.DASHBOARD}/live-calls`);
    return response.data;
  },

  getTopGigs: async () => {
    const response = await api.get<TopGig[]>(`${API_ENDPOINTS.DASHBOARD}/top-gigs`);
    return response.data;
  },

  getTopReps: async () => {
    const response = await api.get<TopRep[]>(`${API_ENDPOINTS.DASHBOARD}/top-reps`);
    return response.data;
  }
};

// Gigs API
export const gigsApi = {
  getAll: async () => {
    const response = await api.get<Gig[]>(API_ENDPOINTS.GIGS);
    return response.data;
  },

  create: async (gigData: Partial<Gig>) => {
    const response = await api.post<Gig>(API_ENDPOINTS.GIGS, gigData);
    return response.data;
  },

  update: async (id: string, data: Partial<Gig>) => {
    const response = await api.put<Gig>(`${API_ENDPOINTS.GIGS}/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`${API_ENDPOINTS.GIGS}/${id}`);
  }
};
