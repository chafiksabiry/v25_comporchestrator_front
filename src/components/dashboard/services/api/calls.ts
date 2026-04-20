import { apiCall } from './index';
import { Lead } from './leads';
import { Agent } from './agents';


export interface Call {
  _id: string;
  agent: Agent;
  lead: Lead;
  direction: "inbound" | "outbound-dial";
  status: string;
  duration: number;
  recording_url: string;
  recording_url_cloudinary: string;
  startTime: string;
  endTime:string;
  sid:string;
  parentCallSid:string;
  childCalls: [String],
  //notes: string;
  //tags: string[];
  quality_score: number;
  ai_call_score: {
    "Agent fluency": {
      score: number; // 0-100 range enforced in logic
      feedback: string;
    };
    "Sentiment analysis": {
      score: number;
      feedback: string;
    };
    "Fraud detection": {
      score: number;
      feedback: string;
    };
    "overall": {
      score: number;
      feedback: string;
    };
  };
  createdAt: string;
  updatedAt: string;

}

export const callsApi = {
  getAll: async () => {
    const response = await apiCall.get<Call[]>('/api/calls');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiCall.get<Call>(`/calls/${id}`);
    return response.data;
  },

  create: async (data: Partial<Call>) => {
    const response = await apiCall.post('api/calls', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Call>) => {
    const response = await apiCall.put(`/api/calls/${id}`, data);
    return response.data;
  },

  end: async (id: string) => {
    const response = await apiCall.post(`/calls/${id}/end`);
    return response.data;
  },

  addNote: async (id: string, note: string) => {
    const response = await apiCall.post(`/calls/${id}/notes`, { note });
    return response.data;
  },

  updateQualityScore: async (id: string, score: number) => {
    const response = await apiCall.put(`/calls/${id}/quality-score`, { score });
    return response.data;
  },
  initiateCall: async (to: string) => {
    const response = await apiCall.post('/api/calls/outgoing', {to});
    
    return response.data;
  },
  trackCallStatus: async (callSid: string) => {
    const response = await apiCall.get(`/api/calls/status/${callSid}`);
    
    return response.data;
  },
   hangUpCall: async (callSid: string) => {
    const response = await apiCall.post(`/api/calls/hangup/${callSid}`);
    
    return response.data;
},
generateTwilioToken: async () => {
  const response = await apiCall.get('/api/calls/token');
  
  return response.data;
},
saveCallToDB:async (callSid: string, agentId: string, leadId: string, call: any, cloudinaryrecord: string) => {
  const response = await apiCall.post('/api/calls/store-call', {
    CallSid: callSid,     // CallSid dans le body
    agentId: agentId,     // agentId dans le body
    leadId: leadId,
  call,
cloudinaryrecord  });
  
  return response.data;
},
fetchTwilioRecording:async (recordingUrl: string, ) => {
  const response = await apiCall.post('/api/calls/fetch-recording', {
    recordingUrl,
      });
  
  return response.data;
},
getCallDetails:async (callSid: string, ) => {
  const response = await apiCall.post('/api/calls/call-details', {
    callSid,
      });
  
  return response.data;

},
  storeCallInDBAtStartCall: async (storeCall: any) => {
    
    const response = await apiCall.post('/api/calls/store-call-in-db-at-start-call', { storeCall });
    
    return response.data;
  },
  storeCallInDBAtEndCall: async (phoneNumber: string, callSid: string) => {
    const response = await apiCall.post('/api/calls/store-call-in-db-at-end-call', { phoneNumber, callSid });
    
    return response.data;
  },

}
