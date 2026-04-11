import React, { useState, useEffect, useRef } from 'react';
import SetupWizard from './SetupWizard';
import ContentUploader from './ContentUploader';
import CurriculumDesigner from './CurriculumDesigner';
import RehearsalMode from './RehearsalMode';
import LaunchApproval from './LaunchApproval';
import { Company, TrainingJourney, ContentUpload, TrainingModule, Rep, RehearsalFeedback } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import { DraftService } from '../../infrastructure/services/DraftService';

interface JourneyBuilderProps {
  onComplete: (journey: TrainingJourney, modules: TrainingModule[], enrolledReps: Rep[]) => void;
  forceNew?: boolean;
  repOnboardingLayout?: boolean;
}

export default function JourneyBuilder({ onComplete, forceNew = false, repOnboardingLayout = false }: JourneyBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [company, setCompany] = useState<Company | null>(null);
  const [journey, setJourney] = useState<TrainingJourney | null>(null);
  const [methodology, setMethodology] = useState<TrainingMethodology | null>(null);
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [rehearsalFeedback, setRehearsalFeedback] = useState<RehearsalFeedback[]>([]);
  const [rehearsalRating, setRehearsalRating] = useState(0);
  const [showLaunchApproval, setShowLaunchApproval] = useState(false);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep]);

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
    // Skip auto-save during RehearsalMode (step 3) - quizzes are saved locally only
    if (currentStep === 3) {
      console.log('[JourneyBuilder] Skipping auto-save - in RehearsalMode. Quizzes will be saved when journey is launched.');
      return;
    }

    if (!isFinishing && !isRestoringDraft && (company || journey || uploads.length > 0 || modules.length > 0)) {
      // IMPORTANT: Check if draftId exists before saving to avoid creating duplicate journeys
      const currentDraft = DraftService.getDraft();

      // Only auto-save if we have a draftId (journey already created)
      // Initial creation is handled by saveDraftImmediately in handleSetupComplete, handleUploadComplete, handleCurriculumComplete
      if (currentDraft.draftId) {
        console.log('[JourneyBuilder] Auto-saving with existing draftId:', currentDraft.draftId);
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
        console.log('[JourneyBuilder] Skipping auto-save - no draftId yet. Initial save will be handled by explicit saveDraftImmediately calls.');
      }
    }
  }, [company, journey, methodology, uploads, modules, currentStep, selectedGigId, isRestoringDraft]);

  const handleSetupComplete = async (newCompany: Company, newJourney: TrainingJourney, selectedMethodology?: TrainingMethodology, gigId?: string) => {
    setCompany(newCompany);
    setJourney(newJourney);
    if (selectedMethodology) {
      setMethodology(selectedMethodology);
    }
    if (gigId) {
      setSelectedGigId(gigId);
    }
    setCurrentStep(1);

    // Sauvegarder immédiatement après le setup
    // IMPORTANT: Don't pass modules yet (empty array) to avoid creating journey without modules
    await DraftService.saveDraftImmediately({
      company: newCompany,
      journey: newJourney,
      methodology: selectedMethodology || null,
      selectedGigId: gigId || null,
      currentStep: 1,
      modules: [] // Empty modules - journey will be created when modules are added
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

  const handleFinishEarly = async (finalUploads: ContentUpload[], curriculum: any, presentationData?: any, filetraining?: string) => {
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
      
      // Save draft immediately to ensure database has it
      if (journey) {
        const activeJourney = { 
          ...journey, 
          status: 'active' as const,
          // Explicitly pass AI generation artifacts
          filetraining,
          presentation: presentationData 
        };
        
        console.log('[JourneyBuilder] Finalizing journey with PPTX/Presentation:', { filetraining, hasPresentation: !!presentationData });
        
        await DraftService.saveDraftImmediately({
          uploads: finalUploads,
          modules: parsedModules,
          journey: activeJourney,
          presentationData,
          filetraining
        });
        
        // Clear draft since it's fully finished and call onComplete to return to onboarding main page
        DraftService.clearDraft();
        onComplete(activeJourney, parsedModules, []);
      }
    } catch (error) {
       console.error('[JourneyBuilder] Error in handleFinishEarly:', error);
    } finally {
       setIsFinishing(false);
    }
  };

  const handleCurriculumComplete = async (newModules: TrainingModule[]) => {
    // If methodology is selected, enhance modules with methodology-specific content
    let finalModules = newModules;
    if (methodology) {
      finalModules = enhanceModulesWithMethodology(newModules, methodology);
    }
    setModules(finalModules);
    setCurrentStep(3); // Go to Test & Launch

    // Sauvegarder immédiatement après la création du curriculum
    await DraftService.saveDraftImmediately({
      modules: finalModules,
      currentStep: 3
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
        duration: module.duration + methodologyComponent.estimatedDuration,
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
        return <SetupWizard onComplete={handleSetupComplete} />;
      case 1:
        return (
          <ContentUploader
            onComplete={handleUploadComplete}
            onFinishEarly={handleFinishEarly}
            onBack={() => setCurrentStep(0)}
            company={company}
            gigId={selectedGigId}
            repOnboardingLayout={repOnboardingLayout}
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
        if (!showLaunchApproval) {
          return journey ? (
            <RehearsalMode
              journey={journey}
              modules={modules}
              uploads={uploads}
              methodology={methodology}
              onComplete={handleRehearsalComplete}
              onBack={() => setCurrentStep(2)}
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
              onBack={() => setCurrentStep(2)}
              gigId={selectedGigId}
              company={company}
            />
          ) : null;
        }
      default:
        return null;
    }
  };

  return (
    <div
      className="flex w-full flex-col overflow-hidden"
      style={{ height: '100%', maxHeight: '100%', background: currentStep === 0 ? '#fff' : undefined }}
    >
      <div
        ref={mainScrollRef}
        data-journey-main-scroll
        className={`flex min-h-0 flex-1 flex-col overscroll-y-contain ${
          currentStep === 0 ? 'overflow-hidden' : 'overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}
