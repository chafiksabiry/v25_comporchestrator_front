import axios from 'axios';

// Create an axios instance with the base URL setup
// Using the same environment variable or falling back to a likely default if specific env var is missing
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API ? `${import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API}/api` : 'http://localhost:3001/api', // Fallback to likely backend port
});

export default apiClient;
