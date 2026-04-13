import { trainingRequest, trainingUpload } from './trainingPlatformClient';
import { normalizePresentationFromApi } from './normalizePresentation';

export async function analyzeDocument(
  file: File,
  metadata?: { gigId?: string; companyId?: string }
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata?.gigId) formData.append('gigId', metadata.gigId);
  if (metadata?.companyId) formData.append('companyId', metadata.companyId);

  const raw = (await trainingUpload('/api/ai/analyze-document', formData)) as Record<string, unknown>;
  if (raw.success === false) {
    throw new Error((raw.error as string) || (raw.message as string) || 'Analysis failed');
  }
  const analysis =
    (raw.analysis as Record<string, unknown>) ||
    ((raw.data as Record<string, unknown>)?.aiAnalysis as Record<string, unknown>) ||
    (raw.data as Record<string, unknown>);
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('No analysis data received');
  }
  return {
    ...analysis,
    keyTopics: (analysis.keyTopics as string[]) || [],
    learningObjectives: (analysis.learningObjectives as string[]) || [],
    prerequisites: (analysis.prerequisites as string[]) || [],
    suggestedModules: (analysis.suggestedModules as string[]) || []
  };
}

export async function generateCurriculum(
  analysis: Record<string, unknown>,
  industry: string,
  gig: string | undefined,
  uploadContext: Array<Record<string, unknown>>,
  options?: { useKnowledgeBase?: boolean; gigId?: string }
): Promise<Record<string, unknown>> {
  const gigId = options?.gigId ?? gig;
  const body = await trainingRequest<Record<string, unknown>>('/api/ai/generate-curriculum', {
    method: 'POST',
    body: JSON.stringify({
      analysis,
      industry,
      gig,
      uploadContext,
      gigId: gigId || undefined,
      useKnowledgeBase: Boolean(options?.useKnowledgeBase && gigId)
    })
  });
  if (body.success === false) {
    throw new Error((body.error as string) || 'Curriculum generation failed');
  }
  const pres = (body as any).data?.presentation;
  if (pres) {
    const norm = normalizePresentationFromApi(pres);
    if (norm) (body as any).data.presentation = norm;
  }
  return body;
}

export async function generatePresentation(curriculum: Record<string, unknown>): Promise<Record<string, unknown>> {
  const body = await trainingRequest<Record<string, unknown>>('/api/ai/generate-presentation', {
    method: 'POST',
    body: JSON.stringify({ curriculum })
  });
  if (body.success === false) {
    throw new Error((body.error as string) || 'Presentation generation failed');
  }
  const raw = (body as any).presentation || body;
  return normalizePresentationFromApi(raw) || (raw as Record<string, unknown>);
}

export async function generateTrainingFromGig(gigId: string): Promise<Record<string, unknown>> {
  const body = await trainingRequest<Record<string, unknown>>(`/api/ai/generate-training/${gigId}`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (body.success === false && !(body as any).journey) {
    throw new Error((body.error as string) || 'Gig training generation failed');
  }
  const journey = (body as any).journey;
  const curriculum: Record<string, unknown> = {
    success: true,
    title: journey.title || journey.name || 'Formation',
    description: journey.description || '',
    totalDuration: parseInt(String(journey.estimatedDuration || '120'), 10) || 120,
    methodology: 'Méthode 360°',
    modules: (journey.modules || []).map((m: any) => ({
      title: m.title,
      description: m.description,
      duration: m.duration || 30,
      difficulty: m.difficulty || 'intermediate',
      learningObjectives: m.learningObjectives || [],
      sections: m.sections || []
    })),
    data: {
      presentation: normalizePresentationFromApi(journey.methodologyData?.presentation || journey.presentation) ||
        journey.methodologyData?.presentation ||
        journey.presentation
    }
  };
  return curriculum;
}

export { normalizePresentationFromApi } from './normalizePresentation';
