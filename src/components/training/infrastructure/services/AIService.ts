import { ApiClient } from '../../lib/api';

/** Coerce API presentation payloads into { title, slides[] } for the preview / export. */
export function normalizePresentationFromApi(raw: any): any | null {
  if (!raw || typeof raw !== 'object') return null;
  const slides = Array.isArray(raw.slides)
    ? raw.slides
    : Array.isArray(raw.Slides)
      ? raw.Slides
      : Array.isArray(raw.slideList)
        ? raw.slideList
        : [];
  return {
    ...raw,
    title: raw.title || 'Presentation',
    slides,
    totalSlides: slides.length || raw.totalSlides || 0
  };
}

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

export interface UploadCurriculumContext {
  fileName: string;
  fileType: string;
  keyTopics: string[];
  learningObjectives: string[];
  extractedText?: string;
}

export interface KnowledgeDocumentRef {
  _id: string;
  name: string;
  fileType?: string;
  summary?: string;
  keyTerms?: string[];
}

export interface CallRecordingRef {
  _id: string;
  recordingUrl?: string;
  duration?: number;
  summaryText?: string;
  keyIdeas?: Array<{ title: string; description?: string }>;
  transcriptionStatus?: string;
}

export interface PresentationGenerationContext {
  sourceMode?: 'uploads' | 'kb' | 'uploads+kb' | 'gig';
  uploadAnalyses?: UploadCurriculumContext[];
  knowledgeDocuments?: KnowledgeDocumentRef[];
  callRecordings?: CallRecordingRef[];
  /** Rich gig fields (title, industries, activities, …) so slides/plan stay anchored to the job */
  gigSnapshot?: Record<string, unknown> | null;
}

export interface TrainingGenerationPreferences {
  selectedDuration?: string;
  methodologyName?: string;
  methodologyDescription?: string;
  methodologyComponents?: string[];
  trainingTitle?: string;
  trainingDescription?: string;
}

export interface ChatHistoryItem {
  _id: string;
  title: string;
  lastActivityAt?: string;
  messagesCount?: number;
  preview?: string;
}

export interface ChatSessionDetails {
  _id: string;
  title: string;
  gigId?: string | null;
  lastActivityAt?: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string; createdAt?: string | null }>;
}

export interface SavedPodcastItem {
  _id: string;
  title: string;
  trainingTitle?: string;
  language: string;
  script: string;
  scriptCloudinaryUrl?: string;
  audioUrl?: string;
  createdAt?: string;
}

export interface SavedVideoItem {
  _id: string;
  title: string;
  trainingTitle?: string;
  prompt: string;
  provider: string;
  model: string;
  status: string;
  videoUrl?: string;
  createdAt?: string;
}

export interface AiBaseResponse {
  success: boolean;
  error?: string;
  message?: string;
  fallbackMode?: boolean;
}

export interface AiResponse<T> extends AiBaseResponse {
  analysis?: T;
  data?: T;
  questions?: T;
  sections?: T;
  content?: any;
  enhancedContent?: string;
  response?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export class AIService {
  /**
   * Uploads a document to the backend (GCS with local fallback)
   */
  static async uploadDocumentViaBackend(
    file: File,
    metadata?: { gigId?: string; companyId?: string }
  ): Promise<{ url: string, publicId: string, analysis?: any }> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.gigId) formData.append('gigId', metadata.gigId);
    if (metadata?.companyId) formData.append('companyId', metadata.companyId);
    
    const response = await ApiClient.upload<any>('/api/ai/analyze-document', formData);
    return {
      url: response.data.data?.fileUrl || response.data.url,
      publicId: response.data.data?.publicId || response.data.publicId,
      analysis: response.data.data
    };
  }

  /**
   * Analyse un document avec l'IA (OpenAI GPT-4 ou Claude)
   */
  static async analyzeDocument(
    file: File,
    metadata?: { gigId?: string; companyId?: string }
  ): Promise<DocumentAnalysis> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (metadata?.gigId) formData.append('gigId', metadata.gigId);
      if (metadata?.companyId) formData.append('companyId', metadata.companyId);

      

      const response = await ApiClient.upload<AiResponse<any>>('/api/ai/analyze-document', formData);

      if (!response.data.success) {
        const errorMsg = response.data.error || response.data.message || 'Analysis failed';
        console.error('❌ Analysis failed:', errorMsg);
        throw new Error(errorMsg);
      }

      
      // Support both structured analysis and nested data analysis
      const analysis = response.data.analysis || (response.data.data as any)?.aiAnalysis || response.data.data;
      if (!analysis) throw new Error('No analysis data received');

      // Defensive defaults to prevent frontend crashes (.map of undefined)
      const safeAnalysis = {
        ...analysis,
        keyTopics: analysis.keyTopics || [],
        learningObjectives: analysis.learningObjectives || [],
        prerequisites: analysis.prerequisites || [],
        suggestedModules: analysis.suggestedModules || [],
        improvementSuggestions: analysis.improvementSuggestions || [],
        mediaRecommendations: analysis.mediaRecommendations || []
      };

      return safeAnalysis;
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
    const response = await ApiClient.post<AiResponse<DocumentAnalysis>>('/api/ai/analyze-url', { url });

    if (!response.data.success) {
      throw new Error(response.data.error || 'URL analysis failed');
    }

    if (!response.data.analysis) {
      throw new Error('Analysis data is missing in URL analysis response');
    }

    return response.data.analysis;
  }

  /**
   * Améliore du contenu texte avec l'IA
   */
  static async enhanceContent(content: string): Promise<string> {
    const response = await ApiClient.post<AiResponse<any>>('/api/ai/enhance-content', { content });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Enhancement failed');
    }

    return response.data.enhancedContent || '';
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

    const response = await ApiClient.post<AiResponse<any>>('/api/ai/generate-quiz', requestBody);

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
    const response = await ApiClient.post<AiResponse<any>>('/api/ai/chat?stream=false', { message, context });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Chat failed');
    }

    return response.data.response || '';
  }

  /**
   * Génère le script oral du podcast côté backend (Claude).
   */
  static async generatePodcastScript(params: {
    trainingDigest: string;
    trainingTitle?: string;
    language?: string;
  }): Promise<string> {
    const response = await ApiClient.post<{
      success?: boolean;
      script?: string;
      error?: string;
      message?: string;
    }>('/api/ai/generate-podcast-script', {
      trainingDigest: params.trainingDigest,
      trainingTitle: params.trainingTitle || '',
      language: params.language || 'fr',
    });
    const raw = response.data as any;
    if (raw?.success === false) {
      throw new Error(raw?.error || raw?.message || 'Podcast script generation failed');
    }
    const script = String(raw?.script ?? '').trim();
    if (!script) {
      throw new Error(raw?.error || raw?.message || 'Empty podcast script');
    }
    return script;
  }

  static async podcastChat(params: {
    message: string;
    currentScript: string;
    trainingDigest?: string;
    trainingTitle?: string;
    language?: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string; createdAt?: string }>;
  }): Promise<{ assistantReply: string; updatedScript: string }> {
    const response = await ApiClient.post<{
      success?: boolean;
      assistantReply?: string;
      updatedScript?: string;
      error?: string;
      message?: string;
    }>('/api/ai/podcast/chat', {
      message: params.message,
      currentScript: params.currentScript,
      trainingDigest: params.trainingDigest || '',
      trainingTitle: params.trainingTitle || '',
      language: params.language || 'fr',
      history: params.history || [],
    });
    const raw = response.data as any;
    if (raw?.success === false) {
      throw new Error(raw?.error || raw?.message || 'Podcast chat failed');
    }
    const assistantReply = String(raw?.assistantReply || '').trim() || 'Script mis à jour.';
    const updatedScript = String(raw?.updatedScript || '').trim();
    if (!updatedScript) {
      throw new Error(raw?.error || raw?.message || 'Empty updated podcast script');
    }
    return { assistantReply, updatedScript };
  }

  static async savePodcast(params: {
    title: string;
    script: string;
    trainingTitle?: string;
    language?: string;
    gigId?: string;
    companyId?: string;
    audioUrl?: string;
    audioCloudinaryPublicId?: string;
    chatMessages?: Array<{ role: 'user' | 'assistant'; text: string; createdAt?: string }>;
  }): Promise<SavedPodcastItem> {
    const response = await ApiClient.post<{
      success?: boolean;
      podcast?: SavedPodcastItem;
      error?: string;
      message?: string;
    }>('/api/ai/podcast/save', {
      ...params,
      language: params.language || 'fr',
      chatMessages: params.chatMessages || [],
    });
    const raw = response.data as any;
    if (raw?.success === false) {
      throw new Error(raw?.error || raw?.message || 'Podcast save failed');
    }
    const podcast = raw?.podcast as SavedPodcastItem | undefined;
    if (!podcast?._id) throw new Error('Podcast save failed: invalid payload');
    return podcast;
  }

  static async listSavedPodcasts(params?: {
    gigId?: string;
    companyId?: string;
    limit?: number;
  }): Promise<SavedPodcastItem[]> {
    const qs = new URLSearchParams();
    if (params?.gigId) qs.set('gigId', params.gigId);
    if (params?.companyId) qs.set('companyId', params.companyId);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const suffix = qs.toString();
    const response = await ApiClient.get<{
      success?: boolean;
      podcasts?: SavedPodcastItem[];
      error?: string;
    }>(`/api/ai/podcast/list${suffix ? `?${suffix}` : ''}`);
    const raw = response.data as any;
    if (raw?.success === false) {
      throw new Error(raw?.error || 'Podcast list failed');
    }
    return Array.isArray(raw?.podcasts) ? (raw.podcasts as SavedPodcastItem[]) : [];
  }

  static async generateTrainingVideo(params: {
    prompt: string;
    trainingTitle?: string;
    aspectRatio?: string;
    durationSeconds?: number;
  }): Promise<{ jobId: string; provider: string; model: string }> {
    const response = await ApiClient.post<{
      success?: boolean;
      jobId?: string;
      provider?: string;
      model?: string;
      error?: string;
      message?: string;
    }>('/api/ai/video/generate', params);
    const raw = response.data as any;
    if (raw?.success === false) throw new Error(raw?.error || raw?.message || 'Video generation failed');
    const jobId = String(raw?.jobId || '').trim();
    if (!jobId) throw new Error('Video generation failed: missing job id');
    return {
      jobId,
      provider: String(raw?.provider || 'veo'),
      model: String(raw?.model || ''),
    };
  }

  static async getTrainingVideoStatus(jobId: string): Promise<{
    status: 'queued' | 'running' | 'completed' | 'failed';
    videoUrl?: string;
    provider?: string;
    model?: string;
    error?: string;
  }> {
    const response = await ApiClient.get<{
      success?: boolean;
      status?: 'queued' | 'running' | 'completed' | 'failed';
      videoUrl?: string;
      provider?: string;
      model?: string;
      error?: string;
      message?: string;
    }>(`/api/ai/video/status/${encodeURIComponent(jobId)}`);
    const raw = response.data as any;
    if (raw?.success === false) throw new Error(raw?.error || raw?.message || 'Video status failed');
    return {
      status: (raw?.status as any) || 'running',
      videoUrl: raw?.videoUrl ? String(raw.videoUrl) : undefined,
      provider: raw?.provider ? String(raw.provider) : undefined,
      model: raw?.model ? String(raw.model) : undefined,
      error: raw?.error ? String(raw.error) : undefined,
    };
  }

  static async saveTrainingVideo(params: {
    title: string;
    prompt: string;
    trainingTitle?: string;
    provider?: string;
    model?: string;
    gigId?: string;
    companyId?: string;
    jobId?: string;
    videoUrl?: string;
  }): Promise<SavedVideoItem> {
    const response = await ApiClient.post<{
      success?: boolean;
      video?: SavedVideoItem;
      error?: string;
      message?: string;
    }>('/api/ai/video/save', params);
    const raw = response.data as any;
    if (raw?.success === false) throw new Error(raw?.error || raw?.message || 'Video save failed');
    const video = raw?.video as SavedVideoItem | undefined;
    if (!video?._id) throw new Error('Video save failed: invalid payload');
    return video;
  }

  static async listSavedTrainingVideos(params?: {
    gigId?: string;
    companyId?: string;
    limit?: number;
  }): Promise<SavedVideoItem[]> {
    const qs = new URLSearchParams();
    if (params?.gigId) qs.set('gigId', params.gigId);
    if (params?.companyId) qs.set('companyId', params.companyId);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const suffix = qs.toString();
    const response = await ApiClient.get<{
      success?: boolean;
      videos?: SavedVideoItem[];
      error?: string;
    }>(`/api/ai/video/list${suffix ? `?${suffix}` : ''}`);
    const raw = response.data as any;
    if (raw?.success === false) throw new Error(raw?.error || 'Video list failed');
    return Array.isArray(raw?.videos) ? (raw.videos as SavedVideoItem[]) : [];
  }

  static async generateChatTitle(
    messages: Array<{ role: 'user' | 'assistant'; text: string }>
  ): Promise<string> {
    const response = await ApiClient.post<{ success?: boolean; title?: string; error?: string }>(
      '/api/ai/chat/title',
      { messages }
    );

    const raw = response.data as any;
    if (raw?.success === false) {
      throw new Error(raw?.error || 'Title generation failed');
    }

    return String(raw?.title || '').trim();
  }

  /**
   * Stream chat response chunk-by-chunk from Claude backend.
   */
  static async chatStream(
    message: string,
    context: string,
    onChunk: (chunk: string) => void,
    options?: { gigId?: string; companyId?: string; sessionId?: string }
  ): Promise<{ text: string; sessionId?: string }> {
    const token = ApiClient.getToken();
    const apiUrl =
      import.meta.env.VITE_API_TRAINING_URL ||
      import.meta.env.VITE_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://v25platformtrainingbackend-production.up.railway.app';
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

    const requestBody: Record<string, unknown> = { message, context };
    if (options?.gigId) requestBody.gigId = options.gigId;
    if (options?.companyId) requestBody.companyId = options.companyId;
    if (options?.sessionId) requestBody.sessionId = options.sessionId;

    const response = await fetch(`${baseUrl}/api/ai/chat?stream=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Chat failed (${response.status})`);
    }
    if (!response.body) {
      throw new Error('Streaming not supported by this response.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const sessionId = response.headers.get('X-Chat-Session-Id') || undefined;
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      fullText += chunk;
      onChunk(chunk);
    }

    return { text: fullText, sessionId };
  }

  static async listChatHistory(gigId: string): Promise<ChatHistoryItem[]> {
    const response = await ApiClient.get<{ success?: boolean; sessions?: ChatHistoryItem[] }>(
      `/api/ai/chat/history?gigId=${encodeURIComponent(gigId)}`
    );
    const raw = response.data as any;
    const sessions = raw.sessions ?? raw.data?.sessions ?? [];
    return Array.isArray(sessions) ? sessions : [];
  }

  static async getChatSession(sessionId: string): Promise<ChatSessionDetails | null> {
    const response = await ApiClient.get<{ success?: boolean; session?: ChatSessionDetails }>(
      `/api/ai/chat/history/${encodeURIComponent(sessionId)}`
    );
    const raw = response.data as any;
    return (raw.session ?? raw.data?.session ?? null) as ChatSessionDetails | null;
  }

  /**
   * Génère un curriculum complet basé sur l'analyse du document
   */
  static async generateCurriculum(
    analysis: DocumentAnalysis,
    industry: string = 'General',
    gig?: string,
    uploadContext: UploadCurriculumContext[] = [],
    generationPreferences?: TrainingGenerationPreferences
  ): Promise<Curriculum> {
    const response = await ApiClient.post<Curriculum & AiBaseResponse>('/api/ai/generate-curriculum', {
      analysis,
      industry,
      gig,
      uploadContext,
      generationPreferences
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

    const body = response.data as any;
    if (body?.data?.presentation) {
      const norm = normalizePresentationFromApi(body.data.presentation);
      if (norm) body.data.presentation = norm;
    }

    return body as Curriculum;
  }

  /**
   * Synthétise plusieurs analyses en un seul programme cohérent
   */
  static async synthesizeAnalyses(analyses: DocumentAnalysis[]): Promise<Curriculum> {
    const response = await ApiClient.post<Curriculum & AiBaseResponse & { data: any }>('/api/ai/synthesize-programs', {
      analyses
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Synthesis failed');
    }

    // Backend synthesis returns { success: true, title, description, ..., data: { program, presentation, unifiedAnalysis } }
    const result: any = {
      ...response.data,
      data: response.data.data // contains unified context for later presentation generation
    };

    if (result?.data?.presentation) {
      const norm = normalizePresentationFromApi(result.data.presentation);
      if (norm) result.data.presentation = norm;
    }

    return result as unknown as Curriculum;
  }

  /**
   * Génère une formation complète à partir du Job (Gig).
   * @param options.useKnowledgeBase false = programme/présentation sans contenu des documents KB du Gig.
   */
  static async generateTrainingFromGig(
    gigId: string,
    options?: { useKnowledgeBase?: boolean; includeCallRecordings?: boolean; sourceContext?: PresentationGenerationContext }
  ): Promise<Curriculum> {
    const body: Record<string, unknown> = {};
    if (options?.useKnowledgeBase !== undefined) body.useKnowledgeBase = options.useKnowledgeBase;
    if (options?.includeCallRecordings !== undefined) body.includeCallRecordings = options.includeCallRecordings;
    if (options?.sourceContext) body.sourceContext = options.sourceContext;

    const response = await ApiClient.post<AiResponse<any>>(
      `/api/ai/generate-training/${gigId}`,
      Object.keys(body).length > 0 ? body : undefined
    );

    if (!response.data.success && !response.data.journey) {
      throw new Error(response.data.error || 'Gig training generation failed');
    }

    const journey = response.data.journey;
    
    // Transform journey into Curriculum format
    const curriculum: Curriculum = {
      success: true,
      title: journey.title || journey.name || 'Formation Job',
      description: journey.description || '',
      totalDuration: parseInt(journey.estimatedDuration || '120'),
      methodology: 'Méthode 360° Grounded',
      modules: (journey.modules || []).map((m: any) => ({
        title: m.title,
        description: m.description,
        duration: m.duration || 30,
        difficulty: m.difficulty || 'intermediate',
        learningObjectives: m.learningObjectives || [],
        sections: m.sections || []
      })),
      // Store full data for presentation access
      data: {
        journeyId: journey._id || journey.id,
        presentation: (() => {
          const raw = journey.methodologyData?.presentation || journey.presentation;
          return normalizePresentationFromApi(raw) || raw;
        })()
      }
    } as any;

    return curriculum;
  }

  /** Documents enregistrés en KB pour ce Gig (analyse / méta). */
  static async listGigKnowledgeDocuments(gigId: string): Promise<
    Array<{
      _id: string;
      name: string;
      fileType?: string;
      description?: string;
      createdAt?: string;
      summary?: string;
      keyTerms?: string[];
    }>
  > {
    const response = await ApiClient.get<{ success?: boolean; documents?: any[] }>(
      `/api/ai/gig/${gigId}/knowledge-documents`
    );
    const raw = response.data as any;
    const list = raw.documents ?? raw.data?.documents ?? [];
    return Array.isArray(list) ? list : [];
  }

  static async listGigCallRecordings(gigId: string): Promise<CallRecordingRef[]> {
    const normalize = (items: any[]): CallRecordingRef[] =>
      items.map((call: any) => ({
        _id: String(call._id || call.id || ''),
        recordingUrl: call.recordingUrl,
        duration: call.duration,
        summaryText: call.summary || call.analysis?.summaryText || '',
        keyIdeas: call.analysis?.summary?.keyIdeas || [],
        transcriptionStatus: call.analysis?.transcription?.status || call.transcription?.status || 'unknown',
      }));

    try {
      const response = await ApiClient.get<any>(`/api/ai/gig/${gigId}/call-recordings`);
      const raw = response.data;
      const list = raw.callRecordings ?? raw.data?.callRecordings ?? raw.recordings ?? raw.data?.recordings ?? [];
      if (Array.isArray(list)) return normalize(list);
    } catch (error) {
      console.warn('[AIService] Could not load call recordings from /api/ai/gig/:gigId/call-recordings, trying fallback.', error);
    }

    try {
      const response = await ApiClient.get<any>(`/call-recordings?gigId=${encodeURIComponent(gigId)}`);
      const raw = response.data;
      const list = raw.callRecordings ?? raw.data?.callRecordings ?? [];
      return Array.isArray(list) ? normalize(list) : [];
    } catch (error) {
      console.warn('[AIService] Could not load call recordings from /call-recordings fallback.', error);
      return [];
    }
  }

  /**
   * Génère un script vidéo détaillé avec GPT-4
   */
  static async generateVideoScript(
    title: string,
    description: string,
    learningObjectives: string[]
  ): Promise<VideoScript> {
    const response = await ApiClient.post<VideoScript & AiBaseResponse>('/api/ai/generate-video-script', {
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
    const response = await ApiClient.post<AiResponse<any[]>>('/api/ai/generate-module-content', {
      moduleTitle,
      moduleDescription,
      fullTranscription,
      learningObjectives
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Module content generation failed');
    }

    return response.data.sections || (response.data as any).content || [];
  }

  /**
   * Génère un EXAMEN FINAL GLOBAL pour toute la formation
   * Couvre tous les modules avec 20-30 questions
   */
  static async generateFinalExam(modules: any[], formationTitle: string = 'Training Program'): Promise<any> {
    const response = await ApiClient.post<AiResponse<any>>('/api/ai/generate-final-exam', {
      modules,
      formationTitle
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Final exam generation failed');
    }

    const data = response.data;

    // Extraction robuste des données (supporte {data: {exam: ...}} ou {exam: ...} ou direct payload)
    const examData = (data as any).exam || (data as any).data?.exam || (data as any).data || data;

    // Normalisation proactive des clés (snake_case -> camelCase)
    if (examData && typeof examData === 'object') {
      if (examData.question_count !== undefined && examData.questionCount === undefined) {
        examData.questionCount = examData.question_count;
      }
      if (examData.total_points !== undefined && examData.totalPoints === undefined) {
        examData.totalPoints = examData.total_points;
      }
      if (examData.passing_score !== undefined && examData.passingScore === undefined) {
        examData.passingScore = examData.passing_score;
      }
    }

    

    // Assuming examData contains a 'questions' array that needs normalization
    const questions = examData.questions || [];
    const normalizedQuestions = questions.map((q: any) => ({
      ...q,
      correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer,
      moduleTitle: q.moduleTitle !== undefined ? q.moduleTitle : q.module_title
    }));

    // Re-assign normalized questions back to examData if it was an object
    if (examData && typeof examData === 'object') {
      examData.questions = normalizedQuestions;
    }

    return examData;
  }

  /**
   * Exporte une présentation riche en PowerPoint (.pptx)
   * Génère un fichier PowerPoint avec les slides complètes
   */
  static async exportPresentationToPPTX(presentation: any): Promise<void> {
    try {
      const token = ApiClient.getToken();
      const apiUrl = import.meta.env.VITE_API_TRAINING_URL || 'https://v25platformtrainingbackend-production.up.railway.app';
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

      

      // Call the new Python-based premium export endpoint
      const response = await fetch(`${baseUrl}/api/ai/export-pptx-python`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ presentation })
      });

      if (!response.ok) {
        throw new Error('PPTX export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${presentation.title || 'training_presentation'}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      
    } catch (error) {
      console.error('❌ Error exporting PPTX:', error);
      throw error;
    }
  }

  /**
   * Génère un module de formation complet basé sur la base de connaissances (Gig) en utilisant la méthodologie 360°
   */
  static async generateGigTrainingModule(
    knowledgeBaseContent: string,
    format: 'presentation' | 'video' = 'presentation'
  ): Promise<any> {
    try {
      // Use the newly created dedicated endpoint for module generation
      const response = await ApiClient.post('/api/ai/generate-gig-module', { 
        knowledgeBaseContent, 
        format 
      });

      const responseData = (response as any).data;

      if (!responseData.success) {
        throw new Error(responseData.error || 'Gig training module generation failed');
      }

      // The backend directly returns parsed JSON into responseData.data
      return responseData.data;
    } catch (error: any) {
      console.error('Failed to generate Gig Training Module:', error);
      throw new Error(error.message || 'Error generating module from knowledge base');
    }
  }

  /**
   * Exporte une présentation riche en PowerPoint (.pptx) - Legacy compatible method
   */
  static async exportToPowerPoint(presentation: any): Promise<Blob> {
    const token = ApiClient.getToken();
    const apiUrl = import.meta.env.VITE_API_TRAINING_URL || 'https://v25platformtrainingbackend-production.up.railway.app';
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

    const response = await fetch(`${baseUrl}/api/ai/export-pptx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ presentation })
    });

    if (!response.ok) {
      throw new Error('PowerPoint export failed');
    }

    return await response.blob();
  }

  /**
   * Generate a rich presentation from the curriculum.
   * @param kb — si gigId + useKnowledgeBase, le backend réinjecte les documents Mongo du Job dans le prompt (pas seulement le titre du programme).
   */
  static async generatePresentation(
    curriculum: any,
    kb?: {
      gigId?: string | null;
      useKnowledgeBase?: boolean;
      includeCallRecordings?: boolean;
      sourceContext?: PresentationGenerationContext;
      sourceMode?: 'uploads' | 'kb' | 'uploads+kb' | 'gig';
    }
  ): Promise<any> {
    const body: Record<string, unknown> = { curriculum };
    if (kb?.gigId) {
      body.gigId = kb.gigId;
    }
    if (kb?.useKnowledgeBase === true) {
      body.useKnowledgeBase = true;
    }
    if (kb?.includeCallRecordings === true) {
      body.includeCallRecordings = true;
    }
    if (kb?.sourceMode) {
      body.sourceMode = kb.sourceMode;
    }
    if (kb?.sourceContext) {
      body.sourceContext = kb.sourceContext;
    }

    const response = await ApiClient.post<AiResponse<any>>('/api/ai/generate-presentation', body);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Presentation generation failed');
    }

    const raw = (response.data as any).presentation || response.data;
    return normalizePresentationFromApi(raw) || raw;
  }

  /**
   * Modifie une slide spécifique via un prompt IA
   */
  static async editSlide(slide: any, prompt: string): Promise<any> {
    try {
      const response = await ApiClient.post<AiResponse<any>>('/api/ai/edit-slide', { slide, prompt });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Slide modification failed');
      }
      
      return response.data.slide;
    } catch (error: any) {
      console.error('❌ Error in editSlide:', error);
      throw error;
    }
  }

  /**
   * Génère un podcast audio de haute qualité avec Vertex AI
   */
  static async generatePodcast(title: string, content: string): Promise<string | undefined> {
    try {
      const response = await ApiClient.post<AiResponse<any>>('/api/ai/generate-podcast', { title, content });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Podcast generation failed');
      }
      return response.data.audioUrl;
    } catch (error: any) {
      console.error('❌ Error in generatePodcast:', error);
      throw error;
    }
  }

  /**
   * Génère une vidéo cinématique avec Google Veo
   */
  static async generateVeoVideo(title: string, content: string): Promise<string | undefined> {
    try {
      const response = await ApiClient.post<AiResponse<any>>('/api/ai/generate-veo-video', { title, content });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Veo video generation failed');
      }
      return response.data.videoUrl;
    } catch (error: any) {
      console.error('❌ Error in generateVeoVideo:', error);
      throw error;
    }
  }
}
