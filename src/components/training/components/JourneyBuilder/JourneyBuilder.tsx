import React, { useState, useEffect } from 'react';
import { CheckCircle, Sparkles, Upload, Wand2, Rocket } from 'lucide-react';
import SetupWizard from './SetupWizard';
import ContentUploader from './ContentUploader';
import CurriculumDesigner from './CurriculumDesigner';
import RehearsalMode from './RehearsalMode';
import LaunchApproval from './LaunchApproval';
import { Company, TrainingJourney, ContentUpload, TrainingModule, Rep } from '../../types/core';
import { RehearsalFeedback } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import { DraftService } from '../../infrastructure/services/DraftService';

interface JourneyBuilderProps {
  onComplete: (journey: any, modules: any[], enrolledReps: any[]) => void;
  forceNew?: boolean;
}

export default function JourneyBuilder({ onComplete, forceNew = false }: JourneyBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [company, setCompany] = useState<any | null>(null);
  const [journey, setJourney] = useState<any | null>(null);
  const [methodology, setMethodology] = useState<TrainingMethodology | null>(null);
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [rehearsalFeedback, setRehearsalFeedback] = useState<RehearsalFeedback[]>([]);
  const [rehearsalRating, setRehearsalRating] = useState(0);
  const [showLaunchApproval, setShowLaunchApproval] = useState(false);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);

  // Restaurer le brouillon au chargement
  useEffect(() => {
    const restoreDraft = () => {
      if (forceNew) {
        DraftService.clearDraft();
        return;
      }

      if (DraftService.hasDraft()) {
        const draft = DraftService.getDraft();
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
  }, [forceNew]);

  // Sauvegarder automatiquement à chaque changement (avec debounce)
  useEffect(() => {
    // Skip auto-save during RehearsalMode (step 3)
    if (currentStep === 3) return;

    if (!isRestoringDraft && (company || journey || uploads.length > 0 || modules.length > 0)) {
      const currentDraft = DraftService.getDraft();
      if (currentDraft.draftId) {
        DraftService.saveDraftToBackend({
          company,
          journey,
          methodology,
          uploads,
          modules,
          currentStep,
          selectedGigId,
          draftId: currentDraft.draftId
        });
      }
    }
  }, [company, journey, methodology, uploads, modules, currentStep, selectedGigId, isRestoringDraft]);

  const steps = [
    { title: 'Setup & Vision', component: 'setup', icon: Sparkles, description: 'Define goals', color: 'from-blue-500 to-indigo-500' },
    { title: 'Upload & Transform', component: 'upload', icon: Upload, description: 'AI analysis', color: 'from-indigo-500 to-purple-500' },
    { title: 'Curriculum Design', component: 'design', icon: Wand2, description: 'Create modules', color: 'from-purple-500 to-pink-500' },
    { title: 'Test & Launch', component: 'rehearsal', icon: Rocket, description: 'Deploy', color: 'from-pink-500 to-red-500' }
  ];

  const handleSetupComplete = async (newCompany: any, newJourney: any, selectedMethodology?: any, gigId?: string) => {
    setCompany(newCompany);
    setJourney(newJourney);
    if (selectedMethodology) setMethodology(selectedMethodology);
    if (gigId) setSelectedGigId(gigId);
    setCurrentStep(1);

    await DraftService.saveDraftImmediately({
      company: newCompany,
      journey: newJourney,
      methodology: selectedMethodology || null,
      selectedGigId: gigId || null,
      currentStep: 1,
      modules: []
    });
  };

  const handleUploadComplete = async (newUploads: ContentUpload[]) => {
    setUploads(newUploads);
    setCurrentStep(2);
    await DraftService.saveDraftImmediately({ uploads: newUploads, currentStep: 2 });
  };

  const handleFinishEarly = async (finalUploads: ContentUpload[], curriculum: any) => {
    setUploads(finalUploads);
    let parsedModules: any[] = [];
    if (curriculum && curriculum.modules) {
      parsedModules = curriculum.modules.map((m: any, index: number) => ({
        id: Date.now().toString() + index,
        title: m.title,
        description: m.description,
        duration: m.duration || 30,
        difficulty: m.difficulty || 'beginner',
        prerequisites: m.prerequisites || [],
        learningObjectives: m.learningObjectives || [],
        sections: m.sections || [],
        assessments: m.assessments || []
      }));
      setModules(parsedModules);
    }
    
    if (journey) {
      const activeJourney = { ...journey, status: 'active' as const };
      await DraftService.saveDraftImmediately({ uploads: finalUploads, modules: parsedModules, journey: activeJourney });
      DraftService.clearDraft();
      onComplete(activeJourney, parsedModules, []);
    }
  };

  const handleCurriculumComplete = async (newModules: any[]) => {
    let finalModules = newModules;
    if (methodology) {
      finalModules = enhanceModulesWithMethodology(newModules, methodology);
    }
    setModules(finalModules);
    setCurrentStep(3);
    await DraftService.saveDraftImmediately({ modules: finalModules, currentStep: 3 });
  };

  const enhanceModulesWithMethodology = (modules: any[], methodology: TrainingMethodology): any[] => {
    return modules.map((module, index) => {
      const methodologyComponent = methodology.components[index % methodology.components.length];
      return {
        ...module,
        sections: module.sections || [],
        assessments: module.assessments || [],
        description: `${module.description} Enhanced with ${methodology.name} methodology.`,
        duration: (module.duration || 0) + (methodologyComponent.estimatedDuration || 0),
        difficulty: methodologyComponent.competencyLevel === 'expert' ? 'advanced' :
          methodologyComponent.competencyLevel === 'proficient' ? 'intermediate' : 'beginner',
        prerequisites: Array.isArray(module.prerequisites) ? [...module.prerequisites, ...methodologyComponent.prerequisites] : methodologyComponent.prerequisites,
        learningObjectives: [
          ...(module.learningObjectives || []),
          ...(methodology.learningFramework?.learningObjectives || [])
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

  const handleLaunch = (finalJourney: any, finalModules: any[], enrolledReps: any[]) => {
    DraftService.clearDraft();
    onComplete(finalJourney, finalModules, enrolledReps);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return <SetupWizard onComplete={handleSetupComplete} />;
      case 1: return <ContentUploader onComplete={handleUploadComplete} onFinishEarly={handleFinishEarly} onBack={() => setCurrentStep(0)} company={company} gigId={selectedGigId} />;
      case 2: return <CurriculumDesigner uploads={uploads} methodology={methodology || undefined} gigId={selectedGigId} onComplete={handleCurriculumComplete} onBack={() => setCurrentStep(1)} />;
      case 3:
        if (!showLaunchApproval) {
          return journey ? <RehearsalMode journey={journey} modules={modules} uploads={uploads} methodology={methodology} onComplete={handleRehearsalComplete} onBack={() => setCurrentStep(2)} /> : null;
        } else {
          return journey ? <LaunchApproval journey={journey} modules={modules} rehearsalFeedback={rehearsalFeedback} rehearsalRating={rehearsalRating} onLaunch={handleLaunch} onBackToRehearsal={() => setShowLaunchApproval(false)} onBack={() => setCurrentStep(2)} gigId={selectedGigId} company={company} /> : null;
        }
      default: return null;
    }
  };

  if (currentStep === 0) return renderCurrentStep();

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200 shadow-sm z-10 relative">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-base">{company?.name?.charAt(0) || 'T'}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{journey?.name || 'Training Journey Builder'}</h1>
                <p className="text-sm text-gray-600">{company?.name} • Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Overall Progress</div>
              <div className="text-xl font-bold text-gray-900">{Math.round(((currentStep + 1) / steps.length) * 100)}%</div>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === index;
                const isCompleted = currentStep > index;
                return (
                  <div key={index} className="flex flex-col items-center relative z-10">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl border-[3px] transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 text-white' : isActive ? `bg-gradient-to-r ${step.color} border-transparent text-white` : 'bg-white border-gray-300 text-gray-400'}`}>
                      {isCompleted ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <div className="mt-3 text-center max-w-28 text-xs font-bold">{step.title}</div>
                  </div>
                );
              })}
            </div>
            <div className="absolute top-8 left-8 right-8 h-1 bg-gray-200 rounded-full -z-0">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full h-full relative z-0">{renderCurrentStep()}</div>
    </div>
  );
}
