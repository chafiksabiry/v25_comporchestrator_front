import api from './index';

export interface DashboardStats {
  activeGigs: number;
  globalReps: number;
  successRate: number;
  revenue: number;
  liveCalls: Array<{
    id: string;
    name: string;
    type: string;
    duration: string;
    status: 'active' | 'waiting';
  }>;
  topGigs: Array<{
    name: string;
    success: number;
    calls: number;
    revenue: string;
  }>;
  topReps: Array<{
    name: string;
    rating: number;
    calls: number;
    revenue: string;
  }>;
}

export const dashboardApi = {
  getStats: async () => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  getLiveCalls: async () => {
    const response = await api.get('/dashboard/live-calls');
    return response.data;
  },

  getTopGigs: async () => {
    const response = await api.get('/dashboard/top-gigs');
    return response.data;
  },

  getTopReps: async () => {
    const response = await api.get('/dashboard/top-reps');
    return response.data;
  }
};
