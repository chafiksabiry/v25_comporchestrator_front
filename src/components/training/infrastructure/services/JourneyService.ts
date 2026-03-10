// src/infrastructure/services/JourneyService.ts
import { ApiClient } from '../../lib/api';
import { TrainingJourney, TrainingModule, Rep } from '../../types';
import { extractObjectId, isValidMongoId } from '../../lib/mongoUtils';

export interface LaunchJourneyRequest {
  journey: TrainingJourney;
  modules: TrainingModule[];
  enrolledRepIds: string[];
  launchSettings: {
    startDate: string;
    sendNotifications: boolean;
    allowSelfPaced: boolean;
    enableLiveStreaming: boolean;
    recordSessions: boolean;
    aiTutorEnabled: boolean;
  };
  rehearsalData: {
    rating: number;
    modulesCompleted: number;
    feedback: string[];
  };
  companyId?: string;
  gigId?: string;
}

export interface LaunchJourneyResponse {
  success: boolean;
  journey: any;
  message: string;
  enrolledCount: number;
}

// Helper function to validate MongoDB ObjectId format (24 hex characters)
const isValidMongoId = (id: string | undefined): boolean => {
  return !!(id && /^[0-9a-fA-F]{24}$/.test(id));
};

export class JourneyService {
  /**
   * Get all training journeys
   */
  static async getAllJourneys(): Promise<any[]> {
    const response = await ApiClient.get('/training_journeys');
    return response.data;
  }

  /**
   * Get a specific journey by ID
   */
  static async getJourneyById(id: string): Promise<any> {
    const response = await ApiClient.get(`/training_journeys/${id}`);
    return response.data;
  }

  /**
   * Get journeys by status
   */
  static async getJourneysByStatus(status: string): Promise<any[]> {
    const response = await ApiClient.get(`/training_journeys/status/${status}`);
    return response.data;
  }

  // Methods createQuizzesForModule and createFinalExam removed - using embedded structure
  // These methods are no longer needed since modules/quizzes are embedded in the journey document
  
  /**
   * @deprecated - No longer used, quizzes are embedded in modules
   */
  static async createQuizzesForModule(moduleId: string, trainingId: string, assessments: any[]): Promise<string[]> {
    const quizIds: string[] = [];
    
    if (!assessments || assessments.length === 0) {
      return quizIds;
    }

    for (const assessment of assessments) {
      if (!assessment.questions || assessment.questions.length === 0) {
        continue;
      }

      try {
        const quizPayload = {
          title: assessment.title || `${moduleId} - Quiz`,
          description: assessment.description || 'Module quiz',
          moduleId: moduleId,
          trainingId: trainingId,
          passingScore: assessment.passingScore || 70,
          timeLimit: assessment.timeLimit || 15,
          maxAttempts: assessment.maxAttempts || 3,
          questions: assessment.questions.map((q: any, idx: number) => ({
            _id: q._id || q.id || `q-${idx}`,
            id: q._id || q.id || `q-${idx}`,
            question: q.question || q.text || '',
            type: q.type || 'multiple-choice',
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            points: q.points || 10,
            orderIndex: idx
          })),
          settings: {
            shuffleQuestions: assessment.settings?.shuffleQuestions || false,
            shuffleOptions: assessment.settings?.shuffleOptions || false,
            showCorrectAnswers: assessment.settings?.showCorrectAnswers !== false,
            allowReview: assessment.settings?.allowReview !== false,
            showExplanations: assessment.settings?.showExplanations !== false
          }
        };

        // Use endpoint for module_quizzes collection
        const response = await ApiClient.post(`/training_journeys/modules/${moduleId}/quizzes`, quizPayload);
        // ApiClient already normalizes Extended JSON ObjectIds to strings, but use extractObjectId for safety
        const quizId = extractObjectId(response.data.data?._id || response.data.data?.id);
        if (quizId) {
          quizIds.push(quizId);
        }
      } catch (error) {
        console.error(`[JourneyService] Error creating quiz for module ${moduleId}:`, error);
      }
    }

    return quizIds;
  }

  /**
   * @deprecated - No longer used, final exam is embedded in journey
   */
  static async createFinalExam(trainingId: string, finalExamData: any): Promise<string | null> {
    if (!finalExamData || !finalExamData.questions || finalExamData.questions.length === 0) {
      return null;
    }

    try {
      const quizPayload = {
        title: finalExamData.title || 'Final Exam',
        description: finalExamData.description || 'Final examination for the training journey',
        trainingId: trainingId,
        passingScore: finalExamData.passingScore || 70,
        timeLimit: finalExamData.timeLimit || 60,
        maxAttempts: finalExamData.maxAttempts || 1,
        questions: finalExamData.questions.map((q: any, idx: number) => ({
          _id: q._id || q.id || `q-${idx}`,
          id: q._id || q.id || `q-${idx}`,
          question: q.question || q.text || '',
          type: q.type || 'multiple-choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 10,
          orderIndex: idx
        })),
        settings: {
          shuffleQuestions: finalExamData.settings?.shuffleQuestions || true,
          shuffleOptions: finalExamData.settings?.shuffleOptions || true,
          showCorrectAnswers: finalExamData.settings?.showCorrectAnswers !== false,
          allowReview: finalExamData.settings?.allowReview !== false,
          showExplanations: finalExamData.settings?.showExplanations !== false
        }
      };

      // Use endpoint for exam_final_quizzes collection
      const response = await ApiClient.post(`/training_journeys/${trainingId}/final-exam`, quizPayload);
      // ApiClient already normalizes Extended JSON ObjectIds to strings, but use extractObjectId for safety
      const finalExamId = extractObjectId(response.data.data?._id || response.data.data?.id);
      if (finalExamId) {
        return finalExamId;
      }
    } catch (error) {
      console.error('[JourneyService] Error creating final exam:', error);
    }

    return null;
  }

  /**
   * Create or save a journey with embedded modules, sections, and quizzes
   * All data is stored in a single collection: training_journeys
   * @param journeyId Optional: if provided, updates existing journey instead of creating new one
   */
  static async saveJourney(journey: TrainingJourney, modules: TrainingModule[], companyId?: string, gigId?: string, finalExam?: any, journeyId?: string): Promise<any> {
    // Convert modules to embedded structure with sections and quizzes
    const embeddedModules = modules.map((m, index) => {
      // Convert sections
      let sections: any[] = [];
      if ((m as any).sections && Array.isArray((m as any).sections)) {
        sections = (m as any).sections;
      } else if (m.content) {
        if (Array.isArray(m.content)) {
          sections = m.content;
        } else {
          sections = [m.content];
        }
      }
      
      // Convert sections to embedded format
      const embeddedSections = sections.map((section: any, sectionIndex: number) => ({
        title: section.title || section.content?.title || `Section ${sectionIndex + 1}`,
        type: section.type || 'document',
        order: sectionIndex,
        content: section.content || section,
        duration: section.duration || section.estimatedDuration || 0
      }));
      
      // Convert assessments to quizzes
      const embeddedQuizzes = (m.assessments || []).map((assessment: any) => ({
        title: assessment.title || `Quiz - ${m.title}`,
        description: assessment.description || '',
        questions: (assessment.questions || []).map((q: any, qIndex: number) => ({
          question: q.question || q.text || '',
          type: q.type || 'multiple-choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 10,
          orderIndex: qIndex
        })),
        passingScore: assessment.passingScore || 70,
        timeLimit: assessment.timeLimit || 15,
        maxAttempts: assessment.maxAttempts || 3,
        settings: assessment.settings || {
          shuffleQuestions: false,
          shuffleOptions: false,
          showCorrectAnswers: true,
          allowReview: true,
          showExplanations: true
        }
      }));
      
      return {
        title: m.title || `Module ${index + 1}`,
        description: m.description || '',
        duration: m.duration ? Math.round(m.duration * 60) : 0, // Convert hours to minutes
        difficulty: m.difficulty || 'beginner',
        learningObjectives: Array.isArray(m.learningObjectives) ? m.learningObjectives : [],
        prerequisites: Array.isArray(m.prerequisites) ? m.prerequisites : [],
        topics: Array.isArray(m.topics) ? m.topics : [],
        sections: embeddedSections,
        quizzes: embeddedQuizzes,
        order: index
      };
    });
    
    // Convert final exam to embedded format
    let embeddedFinalExam: any = null;
    if (finalExam) {
      embeddedFinalExam = {
        title: finalExam.title || 'Final Exam',
        description: finalExam.description || 'Final examination for the training journey',
        questions: (finalExam.questions || []).map((q: any, qIndex: number) => ({
          question: q.question || q.text || '',
          type: q.type || 'multiple-choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 10,
          orderIndex: qIndex
        })),
        passingScore: finalExam.passingScore || 70,
        timeLimit: finalExam.timeLimit || 60,
        maxAttempts: finalExam.maxAttempts || 1,
        settings: finalExam.settings || {
          shuffleQuestions: true,
          shuffleOptions: true,
          showCorrectAnswers: true,
          allowReview: true,
          showExplanations: true
        }
      };
    }
    
    const journeyPayload: any = {
      title: journey.title,
      description: journey.description,
      industry: journey.industry,
      status: journey.status || 'draft',
      company: journey.company,
      vision: journey.vision,
      companyId: companyId,
      gigId: gigId,
      modules: embeddedModules,
      finalExam: embeddedFinalExam
    };
    
    // If journeyId is provided, include it for update
    if (journeyId && isValidMongoId(journeyId)) {
      journeyPayload.id = journeyId;
      journeyPayload._id = journeyId;
    }

    console.log('[JourneyService] Saving journey with embedded modules:', {
      journeyId: journeyId || 'NEW',
      modulesCount: embeddedModules.length,
      hasFinalExam: !!embeddedFinalExam
    });

    let response;
    if (journeyId && isValidMongoId(journeyId)) {
      // Update existing journey
      response = await ApiClient.put(`/training_journeys/${journeyId}`, journeyPayload);
      if (!response.data.success) {
        throw new Error('Failed to update journey');
      }
      console.log('[JourneyService] Updated journey:', journeyId);
    } else {
      // Create new journey
      response = await ApiClient.post('/training_journeys', journeyPayload);
      
      if (!response.data.success) {
        console.error('[JourneyService] Create journey failed:', response.data);
        throw new Error(`Failed to create journey: ${response.data.error || 'Unknown error'}`);
      }
      
      const createdJourney = response.data.journey || response.data;
      const returnedJourneyId = extractObjectId(createdJourney?.id || createdJourney?._id);
      
      if (!returnedJourneyId || !isValidMongoId(returnedJourneyId)) {
        console.error('[JourneyService] ⚠️ Invalid journeyId returned from backend:', returnedJourneyId);
        throw new Error('Invalid journeyId returned from backend');
      }
      
      journeyId = returnedJourneyId;
      console.log('[JourneyService] Created new journey:', journeyId);
    }
    
    const savedJourney = response.data.journey || response.data;
    const savedJourneyId = extractObjectId(savedJourney?.id || savedJourney?._id) || journeyId;
    
    return {
      ...response.data,
      success: true,
      journey: {
        ...savedJourney,
        _id: savedJourneyId,
        id: savedJourneyId
      },
      journeyId: savedJourneyId,
      journey_id: savedJourneyId
    };
  }

  /**
   * Launch a training journey with embedded modules, sections, and quizzes
   * All data is stored in a single collection: training_journeys
   * @param journeyId Optional: if provided, updates existing journey instead of creating new one
   */
  static async launchJourney(request: LaunchJourneyRequest, finalExam?: any, journeyId?: string): Promise<LaunchJourneyResponse> {
    // Convert modules to embedded structure with sections and quizzes
    const embeddedModules = request.modules.map((m, index) => {
      // Convert sections
      let sections: any[] = [];
      if ((m as any).sections && Array.isArray((m as any).sections)) {
        sections = (m as any).sections;
      } else if (m.content) {
        if (Array.isArray(m.content)) {
          sections = m.content;
        } else {
          sections = [m.content];
        }
      }
      
      // Convert sections to embedded format
      const embeddedSections = sections.map((section: any, sectionIndex: number) => ({
        title: section.title || section.content?.title || `Section ${sectionIndex + 1}`,
        type: section.type || 'document',
        order: sectionIndex,
        content: section.content || section,
        duration: section.duration || section.estimatedDuration || 0
      }));
      
      // Convert assessments to quizzes
      const embeddedQuizzes = (m.assessments || []).map((assessment: any) => ({
        title: assessment.title || `Quiz - ${m.title}`,
        description: assessment.description || '',
        questions: (assessment.questions || []).map((q: any, qIndex: number) => ({
          question: q.question || q.text || '',
          type: q.type || 'multiple-choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 10,
          orderIndex: qIndex
        })),
        passingScore: assessment.passingScore || 70,
        timeLimit: assessment.timeLimit || 15,
        maxAttempts: assessment.maxAttempts || 3,
        settings: assessment.settings || {
          shuffleQuestions: false,
          shuffleOptions: false,
          showCorrectAnswers: true,
          allowReview: true,
          showExplanations: true
        }
      }));
      
      return {
        title: m.title || `Module ${index + 1}`,
        description: m.description || '',
        duration: m.duration ? Math.round(m.duration * 60) : 0, // Convert hours to minutes
        difficulty: m.difficulty || 'beginner',
        learningObjectives: Array.isArray(m.learningObjectives) ? m.learningObjectives : [],
        prerequisites: Array.isArray(m.prerequisites) ? m.prerequisites : [],
        topics: Array.isArray(m.topics) ? m.topics : [],
        sections: embeddedSections,
        quizzes: embeddedQuizzes,
        order: index
      };
    });
    
    // Convert final exam to embedded format
    let embeddedFinalExam: any = null;
    if (finalExam) {
      embeddedFinalExam = {
        title: finalExam.title || 'Final Exam',
        description: finalExam.description || 'Final examination for the training journey',
        questions: (finalExam.questions || []).map((q: any, qIndex: number) => ({
          question: q.question || q.text || '',
          type: q.type || 'multiple-choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 10,
          orderIndex: qIndex
        })),
        passingScore: finalExam.passingScore || 70,
        timeLimit: finalExam.timeLimit || 60,
        maxAttempts: finalExam.maxAttempts || 1,
        settings: finalExam.settings || {
          shuffleQuestions: true,
          shuffleOptions: true,
          showCorrectAnswers: true,
          allowReview: true,
          showExplanations: true
        }
      };
    }
    
    // Priority: journeyId parameter > journey._id (never use journey.id as it might be a timestamp)
    let journeyIdToUse = journeyId || (request.journey as any)._id;
    
    // Validate that it's a MongoDB ObjectId
    if (journeyIdToUse && !isValidMongoId(journeyIdToUse)) {
      console.warn('[JourneyService] Invalid journeyId format (launch, not MongoDB ObjectId):', journeyIdToUse, '- will create new journey');
      journeyIdToUse = null;
    }
    
    const journeyPayload: any = {
      title: (request.journey as any).title || request.journey.name || 'Untitled Journey',
      description: request.journey.description,
      industry: (request.journey as any).industry || (request.journey as any).company?.industry || null,
      status: 'active',
      company: (request.journey as any).company,
      vision: (request.journey as any).vision,
      companyId: request.companyId,
      gigId: request.gigId,
      modules: embeddedModules,
      finalExam: embeddedFinalExam,
      launchSettings: request.launchSettings,
      rehearsalData: request.rehearsalData
    };
    
    // If journeyId is provided, include it for update
    if (journeyIdToUse && isValidMongoId(journeyIdToUse)) {
      journeyPayload.id = journeyIdToUse;
      journeyPayload._id = journeyIdToUse;
    }

    console.log('[JourneyService] Launching journey with embedded modules:', {
      journeyId: journeyIdToUse || 'NEW',
      modulesCount: embeddedModules.length,
      hasFinalExam: !!embeddedFinalExam
    });

    const launchPayload = {
      journey: journeyPayload,
      enrolledRepIds: request.enrolledRepIds
    };

    const launchResponse = await ApiClient.post('/training_journeys/launch', launchPayload);
    
    if (!launchResponse.data.success) {
      throw new Error(launchResponse.data.error || 'Failed to launch journey');
    }

    const launchedJourney = launchResponse.data.journey || launchResponse.data;
    const launchedJourneyId = extractObjectId(launchedJourney?.id || launchedJourney?._id) || journeyIdToUse;

    return {
      ...launchResponse.data,
      journeyId: launchedJourneyId,
      journey_id: launchedJourneyId
    };
  }

  /**
   * Archive a journey
   */
  static async archiveJourney(id: string): Promise<any> {
    const response = await ApiClient.post(`/training_journeys/${id}/archive`);
    return response.data;
  }

  /**
   * Delete a journey
   */
  static async deleteJourney(id: string): Promise<any> {
    const response = await ApiClient.delete(`/training_journeys/${id}`);
    return response.data;
  }

  /**
   * Get journeys by company ID
   */
  static async getJourneysByCompany(companyId: string): Promise<any> {
    const endpoint = `/training_journeys/trainer/companyId/${companyId}`;
    console.log('[JourneyService] Fetching journeys by company from:', endpoint);
    try {
      const response = await ApiClient.get(endpoint);
      console.log('[JourneyService] Response:', response);
      // ApiClient.get returns {data: {...}, status: 200}
      // The backend returns {data: [...], success: true, count: N}
      // So we need to return response.data which contains {data: [...], success: true}
      return response.data;
    } catch (error: any) {
      console.error('[JourneyService] Error fetching journeys by company:', error);
      throw error;
    }
  }

  /**
   * Get journeys by company ID and gig ID
   */
  static async getJourneysByCompanyAndGig(companyId: string, gigId: string): Promise<any> {
    const endpoint = `/training_journeys/trainer/companyId/${companyId}/gigId/${gigId}`;
    console.log('[JourneyService] Fetching journeys by company and gig from:', endpoint);
    try {
      const response = await ApiClient.get(endpoint);
      console.log('[JourneyService] Response:', response);
      return response.data;
    } catch (error: any) {
      console.error('[JourneyService] Error fetching journeys by company and gig:', error);
      throw error;
    }
  }

  /**
   * Get journeys for a specific rep (trainee)
   */
  static async getJourneysForRep(repId: string): Promise<any[]> {
    const endpoint = `/training_journeys/rep/${repId}`;
    console.log('[JourneyService] Fetching journeys for rep from:', endpoint);
    try {
      const response = await ApiClient.get(endpoint);
      console.log('[JourneyService] Response:', response);
      // The backend returns a List<TrainingJourneyEntity> directly
      // ApiClient wraps it in response.data, so we have response.data = [...]
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Handle nested data structure if needed
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      console.error('[JourneyService] Error fetching journeys for rep:', error);
      throw error;
    }
  }

  /**
   * Get all available journeys for trainees (active and completed only)
   * This endpoint returns all journeys that trainees can see, regardless of enrollment
   */
  static async getAllAvailableJourneysForTrainees(): Promise<any> {
    const endpoint = `/training_journeys/trainee/available`;
    console.log('[JourneyService] Fetching all available journeys for trainees from:', endpoint);
    try {
      const response = await ApiClient.get(endpoint);
      console.log('[JourneyService] Response for available journeys:', response);
      // The backend returns {success: true, data: [...], count: N}
      // ApiClient wraps it in response.data, so we have response.data = {success: true, data: [...], count: N}
      return response.data;
    } catch (error: any) {
      console.error('[JourneyService] Error fetching available journeys for trainees:', error);
      throw error;
    }
  }

  /**
   * Get trainer dashboard statistics
   */
  static async getTrainerDashboard(companyId: string, gigId?: string): Promise<any> {
    const params = new URLSearchParams({ companyId });
    if (gigId) {
      params.append('gigId', gigId);
    }
    const endpoint = `/training_journeys/trainer/dashboard?${params.toString()}`;
    console.log('[JourneyService] Fetching trainer dashboard from:', endpoint);
    try {
      const response = await ApiClient.get(endpoint);
      console.log('[JourneyService] Response:', response);
      // The backend returns {success: true, data: {...}}
      // ApiClient wraps it in response.data, so we have response.data = {success: true, data: {...}}
      // Return the full response structure
      return response.data;
    } catch (error: any) {
      console.error('[JourneyService] Error fetching trainer dashboard:', error);
      throw error;
    }
  }
}

