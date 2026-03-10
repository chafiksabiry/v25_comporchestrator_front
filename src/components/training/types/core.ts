// Core types for the training journey
export interface Company {
  id: string;
  name: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  setupComplete: boolean;
}

export interface TrainingJourney {
  id: string;
  companyId: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  steps: JourneyStep[];
  createdAt: string;
  estimatedDuration: string;
  targetRoles: string[];
}

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  type: 'content-upload' | 'ai-analysis' | 'curriculum-design' | 'review' | 'launch';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  order: number;
  estimatedTime: string;
  requirements?: string[];
  outputs?: string[];
}

export interface ContentUpload {
  id: string;
  name: string;
  type: 'document' | 'video' | 'audio' | 'presentation' | 'image';
  size: number;
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'analyzed' | 'error';
  file: File;  // ✅ Ajout du fichier original pour l'analyse AI
  aiAnalysis?: ContentAnalysis;
  error?: string;  // Error message if analysis fails
  cloudinaryUrl?: string;  // Cloudinary URL after upload
  publicId?: string;  // Cloudinary public ID
}

export interface ContentAnalysis {
  keyTopics: string[];
  difficulty: number;
  estimatedReadTime: number;
  learningObjectives: string[];
  prerequisites: string[];
  suggestedModules: string[];
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content: ModuleContent[];
  sections?: any[]; // Sections basées sur les documents uploadés (TrainingSection from manualTraining.ts)
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  learningObjectives: string[];
  assessments: Assessment[];
  order?: number;
  topics?: string[];
  completionCriteria?: {
    minimumScore: number;
    requiredActivities: string[];
    timeRequirement: number;
  };
}

export interface ModuleContent {
  id: string;
  type: 'text' | 'video' | 'interactive' | 'quiz' | 'exercise';
  title: string;
  content: any;
  duration: number;
}

export interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'practical' | 'project';
  questions: Question[];
  passingScore: number;
  timeLimit?: number;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  points: number;
}

export interface Rep {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  enrolledJourneys: string[];
  progress: RepProgress[];
}

export interface RepProgress {
  journeyId: string;
  moduleId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  score?: number;
  timeSpent: number;
  lastAccessed: string;
}