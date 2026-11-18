import axios from 'axios';
import { attachSessionToken } from '../../../api/sessionToken';

// Create an axios instance with the base URL from the environment variable
const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_BACKEND}/api`,
});
// Le service de connaissance exige le jeton de la session.
attachSessionToken(apiClient);

export default apiClient;
