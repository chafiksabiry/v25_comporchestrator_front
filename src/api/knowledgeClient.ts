import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API ? `${import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API}/api` : 'http://localhost:3001/api', // Fallback to likely backend port
});

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
