import api from './index';

export interface AnalyticsData {
  calls: {
    total: number;
    answered: number;
    missed: number;
    avg_duration: number;
    by_hour: Array<{
      hour: number;
      count: number;
    }>;
  };
  agents: {
    total: number;
    active: number;
    performance: Array<{
      agent_id: string;
      calls_handled: number;
      avg_duration: number;
      success_rate: number;
    }>;
  };
  quality: {
    avg_score: number;
    by_category: Array<{
      category: string;
      score: number;
    }>;
  };
}

export const analyticsApi = {
  getOverview: async (timeRange: string) => {
    const response = await api.get<AnalyticsData>(`/analytics/overview?timeRange=${timeRange}`);
    return response.data;
  },

  getCallMetrics: async (timeRange: string) => {
    const response = await api.get(`/analytics/calls?timeRange=${timeRange}`);
    return response.data;
  },

  getAgentMetrics: async (timeRange: string) => {
    const response = await api.get(`/analytics/agents?timeRange=${timeRange}`);
    return response.data;
  },

  getQualityMetrics: async (timeRange: string) => {
    const response = await api.get(`/analytics/quality?timeRange=${timeRange}`);
    return response.data;
  },

  exportReport: async (type: string, timeRange: string) => {
    const response = await api.get(`/analytics/export?type=${type}&timeRange=${timeRange}`);
    return response.data;
  }
};
