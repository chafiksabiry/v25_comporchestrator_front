import api from './index';

export const vertexApi = {
    getCallScoring: async (data: Object,) => {
        const response = await api.post('/vertex/call/score', data);
        return response.data;
    },

    getCallTranscription: async (data: Object,) => {
        const response = await api.post('/vertex/audio/transcribe', data);
        return response.data;
    },

    getCallSummary: async (data: Object,) => {
        const response = await api.post('/vertex/audio/summarize', data);
        return response.data;
    },

    getCallPostActions: async (data: Object,) => {
        const response = await api.post('/vertex/call/post-actions', data);
        return response.data;
    }
};
