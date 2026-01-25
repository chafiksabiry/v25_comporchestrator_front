export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  lastContact: string;
  status: 'active' | 'inactive' | 'lead' | 'customer';
  notes: string;
  tags: string[];
  assignedTo?: string; // ID of the rep assigned to this contact
  companyId?: string; // ID of the company this contact belongs to
}

export interface AIInsight {
  id: string;
  contactId: string;
  type: 'follow-up' | 'opportunity' | 'risk' | 'suggestion';
  content: string;
  createdAt: string;
  companyId?: string; // Company this insight belongs to
}

export interface KnowledgeItem {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'video' | 'link' | 'audio';
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  tags: string[];
  usagePercentage: number;
  companyId?: string; // Company this knowledge item belongs to
  isPublic: boolean; // Whether this item is shared across companies
}

export interface CallRecord {
  id: string;
  contactId: string;
  date: string;
  duration: number; // minutes
  recordingUrl: string;
  transcriptUrl: string | null;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  tags: string[];
  aiInsights: string[];
  repId: string; // ID of the rep who made the call
  companyId: string; // Company this call belongs to
  processingOptions: {
    transcription: boolean;
    sentiment: boolean;
    insights: boolean;
  };
  // Playback state
  audioState: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    audioInstance: HTMLAudioElement | null;
    showPlayer: boolean;
    showTranscript: boolean;
  };
}

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  attachments?: {
    type: 'document' | 'knowledge' | 'contact';
    id: string;
    name: string;
  }[];
}

export interface LearningMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
  companyId?: string; // Company this metric belongs to
}

export interface LearningInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  status: 'open' | 'implemented' | 'in-progress';
  createdAt: string;
  relatedDocuments: string[];
  companyId?: string; // Company this insight belongs to
}

export interface TrainingActivity {
  id: string;
  title: string;
  description: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
  progress?: string;
  improvement?: string;
  companyId?: string; // Company this activity belongs to
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'rep';
  avatar?: string;
  companyId: string; // Company this user belongs to
  department?: string;
  lastActive: string;
}

export interface Company {
  id: string;
  name: string;
  plan: 'basic' | 'professional' | 'enterprise';
  industry: string;
  contactCount: number;
  userCount: number;
  createdAt: string;
  logo?: string;
  settings: {
    aiFeatures: boolean;
    knowledgeBase: boolean;
    callRecording: boolean;
    analytics: boolean;
  };
}

export interface UserPermission {
  canViewContacts: boolean;
  canEditContacts: boolean;
  canDeleteContacts: boolean;
  canViewKnowledge: boolean;
  canEditKnowledge: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canConfigureAI: boolean;
}