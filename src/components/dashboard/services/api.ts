import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_COMPANY_API_URL}`,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);

// Dashboard API calls
export const dashboardApi = {
  getStats: async (timeRange: string, region: string) => {
    const response = await api.get(`/dashboard/stats?timeRange=${timeRange}&region=${region}`);
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
  },
  
};

export default api;
