// Types for Manual Training System

export interface ManualTraining {
  id?: string;
  companyId: string;
  title: string;
  description: string;
  thumbnail?: string;
  metadata: TrainingMetadata;
  moduleIds?: string[];
  status: 'draft' | 'published' | 'archived';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingMetadata {
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // in minutes
  tags: string[];
  targetRoles: string[];
  language: string;
}

export interface ManualTrainingModule {
  id?: string;
  trainingId: string;
  title: string;
  description: string;
  orderIndex: number;
  sections: TrainingSection[];
  quizIds?: string[];
  estimatedDuration: number; // in minutes
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingSection {
  id?: string;
  title: string;
  type: 'text' | 'video' | 'document' | 'youtube' | 'interactive';
  content: SectionContent;
  orderIndex: number;
  estimatedDuration?: number;
}

export interface SectionContent {
  text?: string;
  file?: ContentFile;
  youtubeUrl?: string;
  embedCode?: string;
  keyPoints?: string[];
}

export interface ContentFile {
  id?: string;
  name: string;
  type: 'video' | 'pdf' | 'word' | 'image';
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  size: number; // in bytes
  mimeType: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  duration?: number; // for videos in seconds
  pageCount?: number; // for documents
  width?: number; // for images/videos
  height?: number; // for images/videos
  format?: string;
}

export interface ManualQuiz {
  id?: string;
  moduleId: string;
  trainingId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number; // percentage
  timeLimit?: number; // in minutes, null for unlimited
  maxAttempts?: number;
  settings: QuizSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizQuestion {
  id?: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer: any; // Can be string, number, boolean, or array
  explanation: string;
  points: number;
  orderIndex: number;
  imageUrl?: string;
}

export interface QuizSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  showExplanations: boolean;
}

export interface TrainingProgress {
  id?: string;
  userId: string;
  trainingId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  overallProgress: number; // 0-100
  moduleProgress: Record<string, ModuleProgress>;
  quizAttempts: QuizAttempt[];
  startedAt?: string;
  completedAt?: string;
  lastAccessedAt?: string;
  totalTimeSpent: number; // in minutes
}

export interface ModuleProgress {
  moduleId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number; // 0-100
  sectionsCompleted: Record<string, boolean>;
  timeSpent: number; // in minutes
  startedAt?: string;
  completedAt?: string;
}

export interface QuizAttempt {
  quizId: string;
  attemptId: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  passed: boolean;
  timeSpent: number; // in seconds
  startedAt: string;
  completedAt: string;
  answers: Record<string, any>;
}

export interface QuizResult {
  score: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
  correctness: Record<string, boolean>;
}

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export interface TrainingStats {
  total: number;
  published: number;
  draft: number;
}

