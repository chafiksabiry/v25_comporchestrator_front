/**
 * Create/update training journey on the platform backend (logic aligned with training JourneyService.saveJourney).
 */
import { extractObjectId, isValidMongoId } from './mongoIds';
import { trainingRequest } from './trainingPlatformClient';

function buildEmbeddedModules(modules: any[]): any[] {
  return modules.map((m, index) => {
    let sections: any[] = [];
    if (m.sections && Array.isArray(m.sections)) {
      sections = m.sections;
    } else if (m.content) {
      sections = Array.isArray(m.content) ? m.content : [m.content];
    }

    const embeddedSections = sections.map((section: any, sectionIndex: number) => ({
      title: section.title || section.content?.title || `Section ${sectionIndex + 1}`,
      type: section.type || 'document',
      order: sectionIndex,
      content: section.content || section,
      duration: section.duration || section.estimatedDuration || 0
    }));

    const embeddedQuizzes = (m.assessments || m.quizzes || []).map((assessment: any) => ({
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

    const dur = m.duration != null ? Number(m.duration) : 30;
    const durationMinutes = dur > 200 ? Math.round(dur / 60) : dur;

    return {
      title: m.title || `Module ${index + 1}`,
      description: m.description || '',
      duration: durationMinutes,
      difficulty: m.difficulty || 'beginner',
      learningObjectives: Array.isArray(m.learningObjectives) ? m.learningObjectives : [],
      prerequisites: Array.isArray(m.prerequisites) ? m.prerequisites : [],
      topics: Array.isArray(m.topics) ? m.topics : [],
      sections: embeddedSections,
      quizzes: embeddedQuizzes,
      order: index
    };
  });
}

export async function saveTrainingJourney(params: {
  journey: Record<string, unknown>;
  modules: any[];
  companyId: string;
  gigId?: string;
  presentationData?: unknown;
  filetraining?: string;
  journeyId?: string;
}): Promise<{ success: boolean; journeyId: string; journey: any }> {
  const { journey, modules, companyId, gigId, presentationData, filetraining, journeyId } = params;

  const embeddedModules = buildEmbeddedModules(modules || []);

  const titleValue = (journey.title || journey.name || 'Untitled Journey') as string;
  const journeyPayload: Record<string, unknown> = {
    title: titleValue,
    name: titleValue,
    description: journey.description,
    industry: journey.industry,
    status: journey.status || 'active',
    company: journey.company,
    vision: journey.vision,
    companyId,
    gigId: gigId || undefined,
    modules: embeddedModules,
    finalExam: null,
    presentationData,
    filetraining: filetraining || journey.filetraining
  };

  if (journeyId && isValidMongoId(journeyId)) {
    journeyPayload.id = journeyId;
    journeyPayload._id = journeyId;
  }

  let response: any;
  if (journeyId && isValidMongoId(journeyId)) {
    response = await trainingRequest<any>(`/training_journeys/${journeyId}`, {
      method: 'PUT',
      body: JSON.stringify(journeyPayload)
    });
    if (!response.success) throw new Error('Failed to update journey');
  } else {
    response = await trainingRequest<any>('/training_journeys', {
      method: 'POST',
      body: JSON.stringify(journeyPayload)
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to create journey');
    }
  }

  const savedJourney = response.journey || response;
  const savedJourneyId = extractObjectId(savedJourney?.id || savedJourney?._id) || journeyId || '';

  if (!savedJourneyId || !isValidMongoId(savedJourneyId)) {
    throw new Error('Invalid journey id returned from backend');
  }

  return { success: true, journeyId: savedJourneyId, journey: savedJourney };
}
