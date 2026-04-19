import axios from 'axios';

// Create an axios instance with the base URL from the environment variable
const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_BACKEND}/api`,
});

export default apiClient;
