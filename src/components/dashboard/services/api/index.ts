import axios from 'axios';
import { toast } from 'react-toastify';
import { env } from '../../lib/env';
import { getAuthToken } from '../../../../lib/authFetch';

const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});
const apiCall = axios.create({
baseURL: env.API_URL_CALL,
headers: {
  'Content-Type': 'application/json'
}
});

// Calls routes (VITE_API_URL_CALL) are scoped to the logged-in user's company: send their JWT.
apiCall.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers?.set('Authorization', `Bearer ${token}`);
  return config;
});

// Request interceptor
/* api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
); */

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);

export default api ;
export { apiCall };
