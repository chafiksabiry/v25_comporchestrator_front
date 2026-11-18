import axios from 'axios';
import { attachSessionToken } from './sessionToken';

const apiClient = axios.create({
    baseURL: `${import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API}/api`
});
// Le service de connaissance exige le jeton de la session.
attachSessionToken(apiClient);

export const knowledgeApi = {
    analyzeKnowledgeBase: async (companyId: string) => {
        const response = await apiClient.post('/analysis/start', { companyId });
        return response.data;
    },
    analyzeDocuments: async (companyId: string, documentIds: string[]) => {
        const response = await apiClient.post(`/analysis/${companyId}/analyze-selected`, { documentIds });
        return response.data;
    },
    getAnalysisStatus: async (companyId: string) => {
        const response = await apiClient.get(`/analysis/${companyId}`);
        return response.data;
    }
};

export default apiClient;
