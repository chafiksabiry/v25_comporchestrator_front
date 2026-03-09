import { ApiClient } from '../../lib/api';

export interface DocumentAnalysis {
  keyTopics: string[];
  difficulty: number;
  estimatedReadTime: number;
  learningObjectives: string[];
  prerequisites: string[];
  suggestedModules: string[];
}

export interface QuizQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface CurriculumModule {
  title: string;
  description: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  contentItems: number;
  assessments: number;
  enhancedElements: string[];
  learningObjectives: string[];
}

export interface Curriculum {
  success: boolean;
  title: string;
  description: string;
  totalDuration: number;
  methodology: string;
  modules: CurriculumModule[];
}

export interface VideoScene {
  timestamp: string;
  title: string;
  visual: string;
  narration: string;
  onScreenText: string[];
}

export interface VideoScript {
  success: boolean;
  type: 'gpt4-script' | 'fallback';
  title: string;
  duration: number;
  description: string;
  scenes: VideoScene[];
}

export class AIService {
  /**
   * Analyse un document avec l'IA (OpenAI GPT-4)
   */
  static async analyzeDocument(file: File): Promise<DocumentAnalysis> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('📄 Analyzing document:', file.name, 'Size:', file.size, 'Type:', file.type);

      const response = await ApiClient.upload('/api/ai/analyze-document', formData);

      if (!response.data.success) {
        const errorMsg = response.data.error || response.data.message || 'Analysis failed';
        console.error('❌ Analysis failed:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ Document analyzed successfully');
      return response.data.analysis || response.data.data?.analysis;
    } catch (error: any) {
      console.error('❌ Error in analyzeDocument:', error);

      // Provide more specific error messages
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network error')) {
        throw new Error('Unable to connect to the AI service. Please check your internet connection and try again.');
      }

      if (error.status === 0) {
        throw new Error('Network error: Unable to reach the server. Please check your connection.');
      }

      if (error.status === 413) {
        throw new Error('File too large. Please upload a smaller file.');
      }

      if (error.status === 415) {
        throw new Error('Unsupported file type. Please upload a supported document format.');
      }

      // Re-throw with original message if it's already an Error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(error.message || 'Document analysis failed. Please try again.');
    }
  }

  /**
   * Analyse a URL (YouTube or HTML page) with AI
   */
  static async analyzeUrl(url: string): Promise<DocumentAnalysis> {
    const response = await ApiClient.post('/api/ai/analyze-url', { url });

    if (!response.data.success) {
      throw new Error(response.data.error || 'URL analysis failed');
    }

    return response.data.analysis;
  }

  /**
   * Améliore du contenu texte avec l'IA
   */
  static async enhanceContent(content: string): Promise<string> {
    const response = await ApiClient.post('/api/ai/enhance-content', { content });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Enhancement failed');
    }

    return response.data.enhancedContent;
  }

  /**
   * Génère des questions de quiz avec l'IA
   */
  static async generateQuiz(
    content: string | object,
    count: number = 5,
    questionDistribution?: {
      multipleChoice?: number;
      trueFalse?: number;
      multipleCorrect?: number;
    }
  ): Promise<QuizQuestion[]> {
    // If content is a string, convert it to the expected format
    let moduleContent: any;
    if (typeof content === 'string') {
      // For simple string content, create a basic structure
      moduleContent = {
        title: 'Training Module',
        description: content,
        sections: []
      };
    } else {
      // If it's already an object, use it as is
      moduleContent = content;
    }

    // Build question types configuration
    const questionTypes: any = {
      multipleChoice: questionDistribution?.multipleChoice !== undefined ? questionDistribution.multipleChoice > 0 : true,
      trueFalse: questionDistribution?.trueFalse !== undefined ? questionDistribution.trueFalse > 0 : true,
      shortAnswer: false,
      multipleCorrect: questionDistribution?.multipleCorrect !== undefined ? questionDistribution.multipleCorrect > 0 : false
    };

    const requestBody: any = {
      moduleContent: moduleContent,
      numberOfQuestions: count,
      difficulty: 'medium',
      questionTypes: questionTypes
    };

    // Add question distribution if provided
    if (questionDistribution) {
      requestBody.questionDistribution = {
        multipleChoice: questionDistribution.multipleChoice || 0,
        trueFalse: questionDistribution.trueFalse || 0,
        multipleCorrect: questionDistribution.multipleCorrect || 0
      };
    }

    const response = await ApiClient.post('/api/ai/generate-quiz', requestBody);

    // Log the response to verify number of questions returned
    const questions = response.data.data?.questions || response.data.questions || [];

    // Always log mismatch as error for debugging
    if (questions.length !== count) {
      console.error(`[AIService] ⚠️ Mismatch: Requested ${count} questions but received ${questions.length}`);
      console.error(`[AIService] Request body:`, {
        numberOfQuestions: count,
        questionDistribution: requestBody.questionDistribution
      });
    } else if (count >= 20) {
      // Log success for large quizzes (like final exams)
      console.log(`[AIService] ✅ Successfully received ${questions.length} questions`);
    }

    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message || 'Quiz generation failed');
    }

    return response.data.data?.questions || response.data.questions || [];
  }

  /**
   * Génère un audio à partir de texte (ElevenLabs)
   */
  static async generateAudio(text: string): Promise<Blob> {
    const token = ApiClient.getToken();
    const apiUrl = import.meta.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://v25platformtrainingbackend-production.up.railway.app';

    const response = await fetch(`${apiUrl}/api/ai/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error('Audio generation failed');
    }

    return await response.blob();
  }

  /**
   * Chat avec l'AI Tutor
   */
  static async chat(message: string, context: string = ''): Promise<string> {
    const response = await ApiClient.post('/api/ai/chat', { message, context });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Chat failed');
    }

    return response.data.response;
  }

  /**
   * Génère un curriculum complet basé sur l'analyse du document
   */
  static async generateCurriculum(
    analysis: DocumentAnalysis,
    industry: string = 'General'
  ): Promise<Curriculum> {
    const response = await ApiClient.post('/api/ai/generate-curriculum', {
      analysis,
      industry
    });

    // Check if response indicates failure
    if (response.data.success === false) {
      throw new Error(response.data.error || 'Curriculum generation failed');
    }

    // Show a console message if using fallback mode
    if (response.data.fallbackMode) {
      console.warn('⚠️ Using fallback curriculum generation (OpenAI quota exceeded or unavailable)');
      console.info('✅ Fallback curriculum created with', response.data.modules?.length || 0, 'modules');
    }

    return response.data as Curriculum;
  }

  /**
   * Génère un script vidéo détaillé avec GPT-4
   */
  static async generateVideoScript(
    title: string,
    description: string,
    learningObjectives: string[]
  ): Promise<VideoScript> {
    const response = await ApiClient.post('/api/ai/generate-video-script', {
      title,
      description,
      learningObjectives
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Video script generation failed');
    }

    return response.data as VideoScript;
  }

  /**
   * Génère le contenu détaillé d'un module avec des sections personnalisées
   * Utilise l'IA pour créer des titres de sections spécifiques basés sur le contenu réel
   */
  static async generateModuleContent(
    moduleTitle: string,
    moduleDescription: string,
    fullTranscription: string,
    learningObjectives: string[]
  ): Promise<any[]> {
    const response = await ApiClient.post('/api/ai/generate-module-content', {
      moduleTitle,
      moduleDescription,
      fullTranscription,
      learningObjectives
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Module content generation failed');
    }

    return response.data.sections || response.data.content;
  }

  /**
   * Génère un EXAMEN FINAL GLOBAL pour toute la formation
   * Couvre tous les modules avec 20-30 questions
   */
  static async generateFinalExam(modules: any[], formationTitle: string = 'Training Program'): Promise<any> {
    const response = await ApiClient.post('/api/ai/generate-final-exam', {
      modules,
      formationTitle
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Final exam generation failed');
    }

    return response.data;
  }

  /**
   * Exporte un curriculum en PowerPoint (.pptx)
   * Génère un fichier PowerPoint professionnel avec slides animées
   */
  static async exportToPowerPoint(curriculum: Curriculum): Promise<Blob> {
    const token = ApiClient.getToken();
    const apiUrl = import.meta.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://v25platformtrainingbackend-production.up.railway.app';

    const response = await fetch(`${apiUrl}/ai/export-powerpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ curriculum })
    });

    if (!response.ok) {
      throw new Error('PowerPoint export failed');
    }

    return await response.blob();
  }
}

