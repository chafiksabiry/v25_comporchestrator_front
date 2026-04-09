import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, ArrowRight, Sparkles, Upload, Wand2, Rocket } from 'lucide-react';
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
}

export default function JourneyBuilder({ onComplete, forceNew = false }: JourneyBuilderProps) {
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

  const steps = [
    {
      title: 'Setup & Vision',
      component: 'setup',
      icon: Sparkles,
      description: 'Define your company and training goals',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      title: 'Upload & Transform',
      component: 'upload',
      icon: Upload,
      description: 'Upload content and let AI analyze it',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      title: 'Curriculum Design',
      component: 'design',
      icon: Wand2,
      description: 'AI creates multimedia training modules',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Test & Launch',
      component: 'rehearsal',
      icon: Rocket,
      description: 'Rehearse, approve, and deploy to your team',
      color: 'from-pink-500 to-red-500'
    }
  ];

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
      className={`flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden ${currentStep === 0 ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}
    >
      {currentStep > 0 && (
        <div className="relative z-10 shrink-0 border-b border-gray-200 bg-white shadow-sm">
          <div className="w-full px-4 py-3">
            <div className="w-full">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                    <span className="text-base font-bold text-white">
                      {company?.name?.charAt(0) || 'T'}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 md:text-xl">
                      {journey?.name || 'Training Journey Builder'}
                    </h1>
                    <p className="text-xs text-gray-600 md:text-sm">
                      {company?.name} • Step {currentStep + 1} of {steps.length}
                      {methodology && ` • ${methodology.name}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mb-0.5 text-[10px] text-gray-500 md:text-xs">Progress</div>
                  <div className="text-lg font-bold text-gray-900 md:text-xl">
                    {Math.round(((currentStep + 1) / steps.length) * 100)}%
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = currentStep === index;
                    const isCompleted = currentStep > index;

                    return (
                      <div key={index} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border-[3px] transition-all duration-500 md:h-12 md:w-12 ${
                            isCompleted
                              ? 'scale-105 border-green-500 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                              : isActive
                                ? `scale-105 border-transparent bg-gradient-to-r ${step.color} text-white shadow-lg`
                                : 'border-gray-300 bg-white text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 md:h-6 md:w-6" />
                          ) : isActive ? (
                            <Icon className="h-5 w-5 md:h-6 md:w-6" />
                          ) : (
                            <Icon className="h-5 w-5 md:h-6 md:w-6" />
                          )}
                        </div>

                        <div className="mt-2 max-w-24 text-center md:max-w-28">
                          <div
                            className={`text-[10px] font-bold transition-colors md:text-xs ${
                              isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                            }`}
                          >
                            {step.title}
                          </div>
                          <div className="mt-0.5 hidden text-[9px] text-gray-500 sm:block">{step.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute left-6 right-6 top-5 -z-0 h-1 rounded-full bg-gray-200 md:left-8 md:right-8 md:top-6">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={mainScrollRef}
        data-journey-main-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
        {renderCurrentStep()}
      </div>
    </div>
  );
}
