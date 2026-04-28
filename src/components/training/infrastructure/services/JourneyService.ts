// src/infrastructure/services/JourneyService.ts
import { ApiClient } from '../../lib/api';
import { TrainingJourney, TrainingModule } from '../../types';
import { extractObjectId, isValidMongoId } from '../../lib/mongoUtils';
import React from 'react';
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


export class JourneyService {
  /**
   * Get all training journeys
   */
  static async getAllJourneys(): Promise<any[]> {
    const response = await ApiClient.get('/training_journeys') as any;
    return response.data;
  }

  /**
   * Get a specific journey by ID
   */
  static async getJourneyById(id: string): Promise<any> {
    const response = await ApiClient.get(`/training_journeys/${id}`) as any;
    return response.data;
  }

  /**
   * Get journeys by status
   */
  static async getJourneysByStatus(status: string): Promise<any[]> {
    const response = await ApiClient.get(`/training_journeys/status/${status}`) as any;
    return response.data;
  }

  // Helper methods createQuizzesForModule and createFinalExam removed 
  // Partitioning is now handled by the backend service layer

  /**
   * Create or save a journey with nested modules, sections, and quizzes
   * The backend will automatically partition this data into separate collections.
   * @param journeyId Optional: if provided, updates existing journey instead of creating new one
   */
  static async saveJourney(journey: TrainingJourney, modules: TrainingModule[], companyId?: string, gigId?: string, finalExam?: any, journeyId?: string, presentationData?: any, filetraining?: string): Promise<any> {
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
        duration: m.duration ? Math.round((m.duration as any) * 60) : 0, // Convert hours to minutes
        difficulty: m.difficulty || 'beginner',
        learningObjectives: Array.isArray(m.learningObjectives) ? m.learningObjectives : [],
        prerequisites: Array.isArray((m as any).prerequisites) ? (m as any).prerequisites : [],
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

    const titleValue = (journey as any).title || (journey as any).name || 'Untitled Journey';
    const journeyPayload: any = {
      title: titleValue,
      name: titleValue, // Fix: Express validator requires 'name'
      description: (journey as any).description,
      industry: (journey as any).industry,
      status: (journey as any).status || 'draft',
      company: (journey as any).company,
      vision: (journey as any).vision,
      estimatedDuration: (journey as any).estimatedDuration,
      targetRoles: Array.isArray((journey as any).targetRoles) ? (journey as any).targetRoles : [],
      trainingLogo: (journey as any).trainingLogo,
      companyId: companyId,
      gigId: gigId,
      modules: embeddedModules,
      finalExam: embeddedFinalExam,
      presentationData: presentationData, // Send presentation data to backend
      filetraining: filetraining || (journey as any).filetraining
    };

    // If journeyId is provided, include it for update
    if (journeyId && isValidMongoId(journeyId)) {
      journeyPayload.id = journeyId;
      journeyPayload._id = journeyId;
    }

    console.log('[JourneyService] Saving journey payload:', {
      journeyId: journeyId || 'NEW',
      modulesCount: embeddedModules.length,
      hasFinalExam: !!embeddedFinalExam
    });

    let response: any;
    if (journeyId && isValidMongoId(journeyId)) {
      // Update existing journey
      response = await ApiClient.put(`/training_journeys/${journeyId}`, journeyPayload) as any;
      if (!response.data.success) {
        throw new Error('Failed to update journey');
      }
      
    } else {
      // Create new journey
      response = await ApiClient.post('/training_journeys', journeyPayload) as any;

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
   * Launch a training journey with nested segments
   * The backend will automatically partition this data into separate collections.
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
        duration: m.duration ? Math.round((m.duration as any) * 60) : 0, // Convert hours to minutes
        difficulty: m.difficulty || 'beginner',
        learningObjectives: Array.isArray(m.learningObjectives) ? m.learningObjectives : [],
        prerequisites: Array.isArray((m as any).prerequisites) ? (m as any).prerequisites : [],
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

    const titleValue = (request.journey as any).title || request.journey.name || 'Untitled Journey';
    const journeyPayload: any = {
      title: titleValue,
      name: titleValue, // Fix: Express validator requires 'name'
      description: request.journey.description,
      industry: (request.journey as any).industry || (request.journey as any).company?.industry || null,
      status: 'active',
      company: (request.journey as any).company,
      vision: (request.journey as any).vision,
      estimatedDuration: (request.journey as any).estimatedDuration,
      targetRoles: Array.isArray((request.journey as any).targetRoles) ? (request.journey as any).targetRoles : [],
      trainingLogo: (request.journey as any).trainingLogo,
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

    

    const launchPayload = {
      journey: journeyPayload,
      enrolledRepIds: (request as any).enrolledRepIds
    };

    const launchResponse = await ApiClient.post('/training_journeys/launch', launchPayload) as any;

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
    
    try {
      const response = await ApiClient.get(endpoint) as any;
      
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
    
    try {
      const response = await ApiClient.get(endpoint) as any;
      
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
    
    try {
      const response = await ApiClient.get(endpoint) as any;
      
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
   * Backend does not expose /trainee/available; use /training_journeys then filter.
   */
  static async getAllAvailableJourneysForTrainees(): Promise<any> {
    const endpoint = `/training_journeys`;
    
    try {
      const response = await ApiClient.get(endpoint) as any;
      const raw = response?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

      // Keep only journeys that are expected to be visible to reps.
      const visibleStatuses = new Set(['active', 'completed', 'published', 'launched']);
      const filtered = list.filter((journey: any) => {
        const status = String(journey?.status || '').toLowerCase();
        return status ? visibleStatuses.has(status) : true;
      });

      return {
        success: true,
        data: filtered,
        count: filtered.length,
      };
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
    
    try {
      const response = await ApiClient.get(endpoint) as any;
      
      // The backend returns {success: true, data: {...}}
      // ApiClient wraps it in response.data, so we have response.data = {success: true, data: {...}}
      // Return the full response structure
      return response.data;
    } catch (error: any) {
      console.error('[JourneyService] Error fetching trainer dashboard:', error);
      throw error;
    }
  }

  /**
   * Persiste une présentation HTML interactive (REP) dans methodologyData du parcours.
   * GET puis PUT avec le document complet pour éviter d’écraser des champs si le backend remplace tout le document.
   */
  static async saveJourneyRepInteractiveHtml(
    journeyId: string,
    html: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (!isValidMongoId(String(journeyId || '').trim())) {
      return { ok: false, error: 'Identifiant de parcours invalide' };
    }
    try {
      const journey = await JourneyService.getJourneyById(journeyId);
      if (!journey || typeof journey !== 'object') {
        return { ok: false, error: 'Parcours introuvable' };
      }
      const prevMd =
        journey.methodologyData && typeof journey.methodologyData === 'object' ? journey.methodologyData : {};
      const payload = {
        ...journey,
        methodologyData: {
          ...prevMd,
          repInteractivePresentationHtml: html,
          repInteractivePresentationSavedAt: new Date().toISOString(),
        },
      };
      const response = (await ApiClient.put(`/training_journeys/${journeyId}`, payload)) as any;
      if (response?.data?.success === false) {
        return { ok: false, error: String(response?.data?.error || 'Échec enregistrement') };
      }
      return { ok: true };
    } catch (e: any) {
      console.warn('[JourneyService] saveJourneyRepInteractiveHtml:', e);
      return { ok: false, error: e?.message || 'Erreur réseau' };
    }
  }
}

