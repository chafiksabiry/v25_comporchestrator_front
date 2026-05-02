import React, { useState, useEffect, useRef, useCallback } from 'react';
import SetupWizard from './SetupWizard';
import ContentUploader from './ContentUploader';
import CurriculumDesigner from './CurriculumDesigner';
import RehearsalMode from './RehearsalMode';
import LaunchApproval from './LaunchApproval';
import SessionPlanningStep from './SessionPlanningStep';
import { Company, TrainingJourney, ContentUpload, TrainingModule, Rep, RehearsalFeedback } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import { DraftService } from '../../infrastructure/services/DraftService';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { scrollJourneyMainToTop } from './journeyScroll';

interface JourneyBuilderProps {
  onComplete: (journey: TrainingJourney, modules: TrainingModule[], enrolledReps: Rep[]) => void;
  forceNew?: boolean;
  repOnboardingLayout?: boolean;
  startWithRepViewer?: boolean;
  onExitToTrainingList?: () => void;
  initialStep?: number;
  initialJourneyId?: string;
  initialGigId?: string;
}

export default function JourneyBuilder({
  onComplete,
  forceNew = false,
  repOnboardingLayout = false,
  startWithRepViewer = false,
  onExitToTrainingList,
  initialStep = 0,
  initialJourneyId,
  initialGigId = null,
}: JourneyBuilderProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [company, setCompany] = useState<Company | null>(null);
  const [journey, setJourney] = useState<TrainingJourney | null>(null);
  const [methodology, setMethodology] = useState<TrainingMethodology | null>(null);
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [rehearsalFeedback, setRehearsalFeedback] = useState<RehearsalFeedback[]>([]);
  const [rehearsalRating, setRehearsalRating] = useState(0);
  const [showLaunchApproval, setShowLaunchApproval] = useState(false);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(initialGigId);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollJourneyMainToTop();
  }, [currentStep]);

  useEffect(() => {
    const id = String(initialJourneyId || '').trim();
    if (!id) return;
    setJourney((prev: any) => {
      const prevId = String(prev?._id || prev?.id || '').trim();
      if (prevId === id) return prev;
      return { ...(prev || {}), _id: id, id };
    });
  }, [initialJourneyId]);

  useEffect(() => {
    const id = String(initialJourneyId || '').trim();
    if (!id) return;
    let cancelled = false;
    JourneyService.getJourneyById(id)
      .then((fullJourney: any) => {
        if (cancelled || !fullJourney) return;
        setJourney((prev: any) => ({ ...(prev || {}), ...fullJourney }));
        const gid = String(fullJourney?.gigId?._id || fullJourney?.gigId || '').trim();
        if (gid) setSelectedGigId(gid);
        const cid = String(fullJourney?.companyId?._id || fullJourney?.companyId || '').trim();
        if (cid) {
          setCompany((prev: any) => ({ ...(prev || {}), id: cid, _id: cid }));
        }
      })
      .catch((e) => {
        console.warn('[JourneyBuilder] Failed to hydrate initial journey:', e);
      });
    return () => {
      cancelled = true;
    };
  }, [initialJourneyId]);

  // Restaurer le brouillon au chargement
  useEffect(() => {
    const restoreDraft = () => {
      if (forceNew) {
        DraftService.clearDraft();
        return;
      }

      if (DraftService.hasDraft()) {
        const draft = DraftService.getDraft();
        // Restoring draft silently

        setIsRestoringDraft(true);

        if (draft.company) setCompany(draft.company);
        if (draft.journey) setJourney(draft.journey);
        if (draft.methodology) setMethodology(draft.methodology);
        if (draft.uploads && draft.uploads.length > 0) setUploads(draft.uploads);
        if (draft.modules && draft.modules.length > 0) setModules(draft.modules);
        if (draft.selectedGigId) setSelectedGigId(draft.selectedGigId);
        if (draft.currentStep !== undefined && draft.currentStep > 0) {
          setCurrentStep(draft.currentStep);
        }

        setIsRestoringDraft(false);
      }
    };

    restoreDraft();
  }, []);

  // Sauvegarder automatiquement à chaque changement (avec debounce)
  // IMPORTANT: Only auto-save if draftId exists to prevent creating duplicate journeys
  // CRITICAL: Skip auto-save when in RehearsalMode (step 3) to prevent creating duplicate journeys when generating quizzes
  useEffect(() => {
    // Skip auto-save during RehearsalMode (step 4) - quizzes are saved locally only
    if (currentStep === 4) {
      
      return;
    }

    if (!isFinishing && !isRestoringDraft && (company || journey || uploads.length > 0 || modules.length > 0)) {
      // IMPORTANT: Check if draftId exists before saving to avoid creating duplicate journeys
      const currentDraft = DraftService.getDraft();

      // Only auto-save if we have a draftId (journey already created)
      // Première persistance backend : validation chat (ContentUploader), ou saveDraftImmediately après upload / curriculum — pas au seul wizard setup.
      if (currentDraft.draftId) {
        
        // Use debounced save to prevent multiple rapid saves
        DraftService.saveDraftToBackend({
          company,
          journey,
          methodology,
          uploads,
          modules,
          currentStep,
          selectedGigId,
          draftId: currentDraft.draftId // Explicitly pass draftId
        });
      } else {
        
      }
    }
  }, [company, journey, methodology, uploads, modules, currentStep, selectedGigId, isRestoringDraft]);

  const handleSetupComplete = (newCompany: Company, newJourney: TrainingJourney, selectedMethodology?: TrainingMethodology, gigId?: string) => {
    setCompany(newCompany);
    setJourney(newJourney);
    if (selectedMethodology) {
      setMethodology(selectedMethodology);
    }
    if (gigId) {
      setSelectedGigId(gigId);
    }
    setCurrentStep(1);

    // Brouillon local uniquement après le setup : ne pas créer de training_journey en base tant que l’utilisateur n’a pas validé dans le chat (ou terminé upload/curriculum).
    DraftService.saveDraftLocally({
      company: newCompany,
      journey: newJourney,
      methodology: selectedMethodology || null,
      selectedGigId: gigId || null,
      currentStep: 1,
      modules: []
    });
  };

  const handleUploadComplete = async (newUploads: ContentUpload[], fileTrainingUrl?: string) => {
    setUploads(newUploads);
    if (fileTrainingUrl && journey) {
      setJourney({ ...journey, filetraining: fileTrainingUrl });
    }
    setCurrentStep(2); // Go directly to Curriculum Design

    // Sauvegarder immédiatement après l'upload
    await DraftService.saveDraftImmediately({
      uploads: newUploads,
      filetraining: fileTrainingUrl,
      currentStep: 2
    });
  };

  const handleFinishEarly = async (
    finalUploads: ContentUpload[],
    curriculum: any,
    presentationData?: any,
    filetraining?: string,
    persistedJourneyId?: string
  ) => {
    try {
      setIsFinishing(true); // Stop auto-save from interfering
      setUploads(finalUploads);
      
      let parsedModules: TrainingModule[] = [];
      if (curriculum && curriculum.modules) {
        parsedModules = curriculum.modules.map((m: any, index: number) => ({
          id: m.id || Date.now().toString() + index,
          title: m.title,
          description: m.description,
          duration: m.duration || 30,
          difficulty: m.difficulty === 'beginner' ? 'beginner' : (m.difficulty === 'advanced' ? 'advanced' : 'intermediate'),
          prerequisites: m.prerequisites || [],
          learningObjectives: m.learningObjectives || [],
          // CRITICAL FIX: Don't lose sections/quizzes during the manual finish save
          sections: m.sections || [],
          quizzes: m.quizzes || [],
          content: m.sections || [],
          assessments: m.quizzes || []
        }));
        setModules(parsedModules);
      }
      
      if (journey) {
        const activeJourney = {
          ...journey,
          ...(persistedJourneyId
            ? { _id: persistedJourneyId, id: persistedJourneyId }
            : {}),
          status: 'active' as const,
          filetraining,
          presentation: presentationData
        };

        

        // ContentUploader a déjà fait POST/PUT via JourneyService : ne pas refaire saveDraftImmediately
        // sans draftId (sinon 2e POST = doublon liste REP onboarding).
        if (persistedJourneyId && /^[0-9a-fA-F]{24}$/.test(persistedJourneyId)) {
          
        } else {
          await DraftService.saveDraftImmediately({
            uploads: finalUploads,
            modules: parsedModules,
            journey: activeJourney,
            presentationData,
            filetraining
          });
        }

        DraftService.clearDraft();
        onComplete(activeJourney, parsedModules, []);
      }
    } catch (error) {
       console.error('[JourneyBuilder] Error in handleFinishEarly:', error);
    } finally {
       setIsFinishing(false);
    }
  };

  const handleForkNewJourneyTraining = useCallback(async (): Promise<{ trainingJourneyId: string }> => {
    const cid = String(company?.id || (company as any)?._id || '').trim();
    if (!cid) {
      throw new Error('Company ID is required to create a new training journey.');
    }
    const gid = selectedGigId ? String(selectedGigId).trim() : undefined;
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const shell: TrainingJourney = {
      name: `Formation — ${stamp}`,
      title: `Formation — ${stamp}`,
      description: '',
      status: 'draft',
    } as TrainingJourney;
    const result = await JourneyService.saveJourney(shell, [], cid, gid, undefined, undefined, undefined, undefined);
    const trainingJourneyId = String(result.journeyId || result.journey?._id || '').trim();
    if (!/^[a-f\d]{24}$/i.test(trainingJourneyId)) {
      throw new Error('Invalid training journey id returned by server.');
    }
    setJourney({
      _id: trainingJourneyId,
      id: trainingJourneyId,
      name: shell.name,
      title: shell.title,
      description: '',
      status: 'draft',
      modulePlan: [],
      planIsValid: false,
      methodologyData: {},
      gigId: gid,
      companyId: cid,
    } as TrainingJourney);
    DraftService.clearDraft();
    return { trainingJourneyId };
  }, [company, selectedGigId]);

  const handleCurriculumComplete = async (newModules: TrainingModule[]) => {
    // If methodology is selected, enhance modules with methodology-specific content
    let finalModules = newModules;
    if (methodology) {
      finalModules = enhanceModulesWithMethodology(newModules, methodology);
    }
    setModules(finalModules);
    setCurrentStep(3); // Go to Session Planning

    // Sauvegarder immédiatement après la création du curriculum
    await DraftService.saveDraftImmediately({
      modules: finalModules,
      currentStep: 3
    });
  };

  const handleSessionPlanningComplete = async () => {
    setCurrentStep(4); // Go to Test & Launch
    await DraftService.saveDraftImmediately({
      currentStep: 4
    });
  };

  const enhanceModulesWithMethodology = (modules: TrainingModule[], methodology: TrainingMethodology): TrainingModule[] => {
    return modules.map((module, index) => {
      const methodologyComponent = methodology.components[index % methodology.components.length];

      return {
        ...module,
        // Utiliser uniquement le titre du module basé sur l'analyse des documents, sans préfixe de méthodologie
        title: module.title,
        description: `${module.description} Enhanced with ${methodology.name} methodology.`,
        // IMPORTANT: keep duration from Vision selection; do not add methodology duration.
        duration: module.duration,
        difficulty: methodologyComponent.competencyLevel === 'expert' ? 'advanced' :
          methodologyComponent.competencyLevel === 'proficient' ? 'intermediate' : 'beginner',
        prerequisites: [...module.prerequisites, ...methodologyComponent.prerequisites],
        learningObjectives: [
          ...module.learningObjectives,
          ...methodology.learningFramework.learningObjectives
            .filter(obj => obj.level === 'apply' || obj.level === 'analyze')
            .map(obj => obj.description)
        ]
      };
    });
  };
  const handleRehearsalComplete = (feedback: RehearsalFeedback[], rating: number) => {
    setRehearsalFeedback(feedback);
    setRehearsalRating(rating);
    setShowLaunchApproval(true);
  };

  const handleLaunch = (finalJourney: TrainingJourney, finalModules: TrainingModule[], enrolledReps: Rep[]) => {
    // Supprimer le brouillon après le lancement réussi
    DraftService.clearDraft();
    onComplete(finalJourney, finalModules, enrolledReps);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <SetupWizard onComplete={handleSetupComplete} repOnboardingLayout={repOnboardingLayout} forceNew={forceNew} />;
      case 1:
        return (
          <ContentUploader
            onComplete={handleUploadComplete}
            onFinishEarly={handleFinishEarly}
            onBack={() => setCurrentStep(0)}
            company={company}
            gigId={selectedGigId}
            journey={journey}
            methodology={methodology}
            repOnboardingLayout={repOnboardingLayout}
            autoOpenFormationViewer={startWithRepViewer}
            onExitToTrainingList={onExitToTrainingList}
            onForkNewJourneyTraining={company ? handleForkNewJourneyTraining : undefined}
          />
        );
      case 2:
        return (
          <CurriculumDesigner
            uploads={uploads}
            methodology={methodology || undefined}
            gigId={selectedGigId}
            onComplete={handleCurriculumComplete}
            onBack={() => setCurrentStep(1)}
            fileTrainingUrl={journey?.filetraining}
          />
        );
      case 3:
        return (
          <SessionPlanningStep
            journey={journey!}
            gigId={selectedGigId}
            onComplete={handleSessionPlanningComplete}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        if (!showLaunchApproval) {
          return journey ? (
            <RehearsalMode
              journey={journey}
              modules={modules}
              uploads={uploads}
              methodology={methodology}
              onComplete={handleRehearsalComplete}
              onBack={() => setCurrentStep(3)}
            />
          ) : null;
        } else {
          return journey ? (
            <LaunchApproval
              journey={journey}
              modules={modules}
              rehearsalFeedback={rehearsalFeedback}
              rehearsalRating={rehearsalRating}
              onLaunch={handleLaunch}
              onBackToRehearsal={() => setShowLaunchApproval(false)}
              onBack={() => setCurrentStep(3)}
              gigId={selectedGigId}
              company={company}
            />
          ) : null;
        }
      default:
        return null;
    }
  };

  const documentScroll = repOnboardingLayout;

  return (
    <div
      ref={mainScrollRef}
      data-journey-main-scroll
      {...(documentScroll ? { 'data-journey-document-scroll': '' } : {})}
      style={
        documentScroll
          ? {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              width: '100%',
              minHeight: '100%',
              height: '100%',
              overflow: 'visible',
            }
          : {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: currentStep === 0 ? 'hidden' : 'auto',
            }
      }
    >
      {renderCurrentStep()}
    </div>
  );
}
