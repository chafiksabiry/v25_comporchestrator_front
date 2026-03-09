import React, { useState, useEffect } from 'react';
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
}

export default function JourneyBuilder({ onComplete }: JourneyBuilderProps) {
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

  // Restaurer le brouillon au chargement
  useEffect(() => {
    const restoreDraft = () => {
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
    
    if (!isRestoringDraft && (company || journey || uploads.length > 0 || modules.length > 0)) {
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

  const handleUploadComplete = async (newUploads: ContentUpload[]) => {
    setUploads(newUploads);
    setCurrentStep(2); // Go directly to Curriculum Design
    
    // Sauvegarder immédiatement après l'upload
    await DraftService.saveDraftImmediately({
      uploads: newUploads,
      currentStep: 2
    });
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
            onBack={() => setCurrentStep(0)}
          />
        );
      case 2:
        return (
          <CurriculumDesigner
            uploads={uploads}
            methodology={methodology}
            onComplete={handleCurriculumComplete}
            onBack={() => setCurrentStep(1)}
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

  // Show setup wizard without progress for first step
  if (currentStep === 0) {
    return renderCurrentStep();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
            {/* Company Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {company?.name?.charAt(0) || 'T'}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {journey?.name || 'Training Journey Builder'}
                  </h1>
                  <p className="text-gray-600">
                    {company?.name} • {company?.industry} • Step {currentStep + 1} of {steps.length}
                    {methodology && ` • ${methodology.name}`}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Overall Progress</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(((currentStep + 1) / steps.length) * 100)}%
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="relative">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === index;
                  const isCompleted = currentStep > index;
                  const isPending = currentStep < index;

                  return (
                    <div key={index} className="flex flex-col items-center relative z-10">
                      <div className={`flex items-center justify-center w-16 h-16 rounded-2xl border-4 transition-all duration-500 ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 text-white shadow-lg scale-110'
                          : isActive
                          ? `bg-gradient-to-r ${step.color} border-transparent text-white shadow-xl scale-125`
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-8 w-8" />
                        ) : isActive ? (
                          <Icon className="h-8 w-8 animate-pulse" />
                        ) : (
                          <Icon className="h-8 w-8" />
                        )}
                      </div>
                      
                      <div className="mt-4 text-center max-w-32">
                        <div className={`text-sm font-bold transition-colors ${
                          isActive ? 'text-purple-600' : 
                          isCompleted ? 'text-green-600' : 
                          'text-gray-400'
                        }`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress Line */}
              <div className="absolute top-8 left-8 right-8 h-1 bg-gray-200 rounded-full -z-0">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        {renderCurrentStep()}
      </div>
    </div>
  );
}