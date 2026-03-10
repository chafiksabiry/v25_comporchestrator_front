export interface Rep {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  avatar?: string;
  role: 'trainee' | 'trainer' | 'admin';
  department: string;
  skills: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  aiPersonalityProfile: {
    strengths: string[];
    improvementAreas: string[];
    preferredLearningPace: 'fast' | 'medium' | 'slow';
    motivationFactors: string[];
  };
}

export interface Gig {
  id: string;
  title: string;
  description: string;
  department: string;
  startDate: string;
  duration: string;
  status: 'active' | 'upcoming' | 'completed';
  requiredSkills: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  aiRecommendedPath: string[];
}

// API response types for Industries and Gigs
export interface Industry {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface IndustryApiResponse {
  success: boolean;
  data: Industry[];
  pagination: any | null;
  message: string;
}

export interface GigFromApi {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  companyId: string;
  userId: string;
  seniority: {
    level: string;
    yearsExperience: string;
  };
  skills: {
    professional: any[];
    technical: any[];
    soft: any[];
    languages: any[];
  };
  availability: {
    minimumHours: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    schedule: any[];
    time_zone: any;
    flexibility: string[];
  };
  commission: {
    minimumVolume: any;
    transactionCommission: any;
    base: string;
    baseAmount: string;
    bonus: string;
    bonusAmount: string;
    currency: {
      code: string;
      name: string;
      symbol: string;
    };
    structure?: string;
    additionalDetails: string;
  };
  industries: Industry[];
  activities: any[];
  destination_zone: any;
  createdAt: string;
  updatedAt: string;
}

export interface GigApiResponse {
  message: string;
  data: GigFromApi[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'training' | 'assessment' | 'documentation' | 'live-session' | 'ai-simulation' | 'peer-review';
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  progress: number;
  estimatedTime: string;
  actualTimeSpent?: string;
  aiDifficulty: number; // 1-10 scale
  prerequisites: string[];
  aiInsights?: {
    strugglingAreas: string[];
    recommendations: string[];
    nextBestAction: string;
  };
}

export interface TrainingModule {
  content: any;
  sections: any;
  assessments: any;
  learningObjectives: any;
  difficulty: ReactNode;
  difficulty: ReactNode;
  id: string;
  title: string;
  description: string;
  duration: string;
  topics: string[];
  completed: boolean;
  progress: number;
  type: 'video' | 'interactive' | 'simulation' | 'reading' | 'ai-tutor';
  aiAdaptiveContent: boolean;
  engagementScore: number;
  comprehensionScore: number;
  practicalExercises: Exercise[];
  aiGeneratedQuizzes: Quiz[];
}

export interface Exercise {
  id: string;
  title: string;
  type: 'scenario' | 'role-play' | 'problem-solving' | 'case-study';
  description: string;
  aiGenerated: boolean;
  difficulty: number;
  completed: boolean;
  score?: number;
  feedback?: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: number;
  aiGenerated: boolean;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  questions: number;
  passingScore: number;
  attempts: number;
  maxAttempts: number;
  status: 'not-started' | 'in-progress' | 'passed' | 'failed';
  score?: number;
  aiProctoring: boolean;
  adaptiveQuestions: boolean;
  timeLimit: number;
  aiAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendedActions: string[];
    confidenceLevel: number;
  };
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  category: string;
  type: 'document' | 'video' | 'guide' | 'faq' | 'ai-summary' | 'interactive-demo';
  description: string;
  lastUpdated: string;
  tags: string[];
  aiRelevanceScore: number;
  viewCount: number;
  helpfulnessRating: number;
  aiGeneratedSummary?: string;
  relatedItems: string[];
}

export interface LiveSession {
  id: string;
  title: string;
  instructor: string;
  date: string;
  time: string;
  duration: string;
  capacity: number;
  enrolled: number;
  status: 'upcoming' | 'live' | 'completed';
  type: 'lecture' | 'workshop' | 'q-and-a' | 'simulation' | 'ai-assisted';
  recordingAvailable: boolean;
  aiTranscript?: string;
  aiSummary?: string;
  interactionLevel: number;
  satisfactionScore?: number;
}

export interface AIInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'achievement' | 'prediction';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  suggestedActions: string[];
  confidence: number;
  timestamp: string;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  modules: string[];
  aiPersonalized: boolean;
  adaptiveSequencing: boolean;
  completionRate: number;
  averageScore: number;
}

export interface TrainerDashboard {
  totalTrainees: number;
  activeTrainees: number;
  completionRate: number;
  averageEngagement: number;
  strugglingTrainees: Rep[];
  topPerformers: Rep[];
  aiInsights: AIInsight[];
  upcomingDeadlines: {
    traineeId: string;
    traineeName: string;
    task: string;
    dueDate: string;
    riskLevel: 'low' | 'medium' | 'high';
  }[];
}

export interface CompanyAnalytics {
  totalReps: number;
  onboardingInProgress: number;
  certificationRate: number;
  averageTimeToCompletion: string;
  skillGapAnalysis: {
    skill: string;
    currentLevel: number;
    targetLevel: number;
    gap: number;
  }[];
  departmentPerformance: {
    department: string;
    completionRate: number;
    averageScore: number;
    engagementLevel: number;
  }[];
  aiPredictions: {
    riskOfDropout: Rep[];
    highPotential: Rep[];
    resourceNeeds: string[];
  };
  costAnalysis: {
    trainingCostPerRep: number;
    timeToProductivity: string;
    roi: number;
  };
}

export interface CurriculumBuilder {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  createdBy: string;
  createdAt: string;
  lastModified: string;
  version: string;
  sourceDocuments: SourceDocument[];
  generatedModules: TrainingModule[];
  aiEnhancements: AIEnhancement[];
  learningObjectives: string[];
  targetAudience: string[];
  estimatedDuration: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface SourceDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx' | 'video' | 'audio' | 'image' | 'url' | 'text';
  size: number;
  uploadedAt: string;
  processedAt?: string;
  status: 'uploading' | 'processing' | 'processed' | 'error';
  extractedContent?: {
    text: string;
    images: string[];
    metadata: Record<string, any>;
    keyTopics: string[];
    complexity: number;
    structure: DocumentStructure;
    mediaElements: MediaElement[];
  };
  aiAnalysis?: {
    readabilityScore: number;
    keyConceptsExtracted: string[];
    suggestedLearningObjectives: string[];
    recommendedModuleStructure: string[];
    contentGaps: string[];
    engagementScore: number;
    improvementSuggestions: ContentImprovement[];
    mediaRecommendations: MediaRecommendation[];
  };
}

export interface DocumentStructure {
  headings: Heading[];
  paragraphs: Paragraph[];
  lists: List[];
  tables: Table[];
  images: ImageElement[];
  codeBlocks: CodeBlock[];
}

export interface Heading {
  level: number;
  text: string;
  position: number;
}

export interface Paragraph {
  text: string;
  position: number;
  importance: number;
  concepts: string[];
}

export interface List {
  type: 'ordered' | 'unordered';
  items: string[];
  position: number;
}

export interface Table {
  headers: string[];
  rows: string[][];
  position: number;
}

export interface ImageElement {
  src: string;
  alt: string;
  caption?: string;
  position: number;
}

export interface CodeBlock {
  language: string;
  code: string;
  position: number;
}

export interface MediaElement {
  type: 'video' | 'audio' | 'image' | 'interactive' | 'animation';
  src: string;
  title: string;
  description: string;
  duration?: number;
  thumbnail?: string;
  position: number;
}

export interface ContentImprovement {
  type: 'structure' | 'clarity' | 'engagement' | 'media' | 'interactivity';
  priority: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  implementation: string;
  expectedImpact: string;
}

export interface MediaRecommendation {
  type: 'video' | 'audio' | 'image' | 'interactive' | 'animation' | 'infographic';
  position: number;
  purpose: string;
  description: string;
  aiGenerated: boolean;
  priority: number;
}

export interface EnhancedTrainingModule extends TrainingModule {
  originalDocument?: SourceDocument;
  transformations: ContentTransformation[];
  mediaElements: MediaElement[];
  interactiveElements: InteractiveElement[];
  visualDesign: VisualDesign;
  engagementFeatures: EngagementFeature[];
}

export interface ContentTransformation {
  id: string;
  type: 'text-to-video' | 'text-to-audio' | 'text-to-infographic' | 'text-to-interactive' | 'enhancement';
  originalContent: string;
  transformedContent: any;
  aiGenerated: boolean;
  status: 'pending' | 'processing' | 'completed' | 'error';
  quality: number;
}

export interface InteractiveElement {
  id: string;
  type: 'quiz' | 'drag-drop' | 'hotspot' | 'timeline' | 'scenario' | 'simulation';
  title: string;
  content: any;
  position: number;
  difficulty: number;
}

export interface VisualDesign {
  theme: 'modern' | 'corporate' | 'creative' | 'minimal' | 'vibrant';
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    codeFont: string;
  };
  layout: 'single-column' | 'two-column' | 'grid' | 'magazine';
}

export interface EngagementFeature {
  type: 'progress-bar' | 'achievements' | 'gamification' | 'social' | 'personalization';
  enabled: boolean;
  settings: Record<string, any>;
}
export interface AIEnhancement {
  id: string;
  type: 'content_generation' | 'quiz_creation' | 'exercise_design' | 'assessment_build' | 'interactive_element';
  status: 'pending' | 'processing' | 'completed' | 'error';
  input: any;
  output?: any;
  confidence: number;
  appliedAt?: string;
  reviewedBy?: string;
  approved: boolean;
}

export interface LiveStreamSession {
  id: string;
  title: string;
  description: string;
  instructor: Rep;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamUrl?: string;
  recordingUrl?: string;
  participants: LiveParticipant[];
  maxParticipants: number;
  streamSettings: StreamSettings;
  interactiveFeatures: InteractiveFeature[];
  analytics: StreamAnalytics;
  chatMessages: ChatMessage[];
  polls: Poll[];
  breakoutRooms?: BreakoutRoom[];
}

export interface LiveParticipant {
  id: string;
  rep: Rep;
  joinedAt?: string;
  leftAt?: string;
  status: 'invited' | 'joined' | 'left' | 'kicked';
  permissions: {
    canSpeak: boolean;
    canVideo: boolean;
    canChat: boolean;
    canScreenShare: boolean;
    isModerator: boolean;
  };
  engagementScore: number;
  attentionLevel: number;
}

export interface StreamSettings {
  quality: '720p' | '1080p' | '4K';
  bitrate: number;
  audioQuality: 'standard' | 'high' | 'studio';
  recordingEnabled: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  whiteboardEnabled: boolean;
  pollsEnabled: boolean;
  breakoutRoomsEnabled: boolean;
  aiTranscriptionEnabled: boolean;
  aiSummaryEnabled: boolean;
  backgroundBlurEnabled: boolean;
  virtualBackgroundEnabled: boolean;
}

export interface InteractiveFeature {
  id: string;
  type: 'poll' | 'quiz' | 'whiteboard' | 'screen_share' | 'breakout' | 'reaction' | 'hand_raise';
  isActive: boolean;
  data: any;
  participants: string[];
  results?: any;
}

export interface StreamAnalytics {
  totalViewers: number;
  peakViewers: number;
  averageViewTime: number;
  engagementRate: number;
  chatActivity: number;
  pollParticipation: number;
  attentionMetrics: {
    averageAttention: number;
    attentionDropPoints: number[];
    reEngagementPoints: number[];
  };
  technicalMetrics: {
    averageLatency: number;
    bufferingEvents: number;
    qualityChanges: number;
    connectionIssues: number;
  };
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  type: 'single' | 'multiple' | 'text' | 'rating';
  isActive: boolean;
  responses: PollResponse[];
  createdAt: string;
  endedAt?: string;
}

export interface PollResponse {
  participantId: string;
  answer: string | string[] | number;
  timestamp: string;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  participants: string[];
  maxParticipants: number;
  isActive: boolean;
  createdAt: string;
  topic?: string;
}

export interface ContentProcessor {
  processDocument: (file: File) => Promise<SourceDocument>;
  extractContent: (document: SourceDocument) => Promise<void>;
  analyzeContent: (document: SourceDocument) => Promise<void>;
  generateModules: (documents: SourceDocument[], objectives: string[]) => Promise<TrainingModule[]>;
  enhanceWithAI: (module: TrainingModule, enhancementType: string) => Promise<AIEnhancement>;
}

export interface StreamingService {
  createSession: (config: Partial<LiveStreamSession>) => Promise<LiveStreamSession>;
  startStream: (sessionId: string) => Promise<string>;
  endStream: (sessionId: string) => Promise<void>;
  joinSession: (sessionId: string, participantId: string) => Promise<void>;
  leaveSession: (sessionId: string, participantId: string) => Promise<void>;
  sendMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
  createPoll: (sessionId: string, poll: Omit<Poll, 'id' | 'responses' | 'createdAt'>) => Promise<Poll>;
  getAnalytics: (sessionId: string) => Promise<StreamAnalytics>;
}
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'trainer';
  message: string;
  timestamp: string;
  type: 'text' | 'suggestion' | 'resource' | 'assessment';
  metadata?: any;
}

export interface AITutor {
  id: string;
  name: string;
  specialty: string[];
  personality: 'encouraging' | 'analytical' | 'practical' | 'creative';
  avatar: string;
  conversationHistory: ChatMessage[];
  learningAdaptations: {
    pace: 'faster' | 'slower' | 'maintain';
    difficulty: 'increase' | 'decrease' | 'maintain';
    style: 'more-visual' | 'more-text' | 'more-interactive';
  };
}

export interface TrainingJourney {
  id: string;
  companyId: string;
  name: string;
  description: string;
  status: 'draft' | 'rehearsal' | 'active' | 'completed' | 'archived';
  steps: JourneyStep[];
  createdAt: string;
  estimatedDuration: string;
  targetRoles: string[];
  rehearsalData?: {
    startedAt: string;
    completedModules: string[];
    feedback: RehearsalFeedback[];
    overallRating: number;
    readyForLaunch: boolean;
  };
}

export interface RehearsalFeedback {
  id: string;
  moduleId: string;
  type: 'content' | 'technical' | 'engagement' | 'suggestion';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  resolved: boolean;
}