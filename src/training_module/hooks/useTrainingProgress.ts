import { useState, useEffect, useCallback } from 'react';
import { TrainingModule, OnboardingStep, Assessment } from '../types';

export interface TrainingProgress {
  modules: TrainingModule[];
  steps: OnboardingStep[];
  assessments: Assessment[];
  overallProgress: number;
  completedModules: number;
  totalModules: number;
}

export const useTrainingProgress = (initialData: {
  modules: TrainingModule[];
  steps: OnboardingStep[];
  assessments: Assessment[];
}) => {
  const [progress, setProgress] = useState<TrainingProgress>(() => {
    console.log('[useTrainingProgress] Initializing with', initialData.modules.length, 'modules');
    return {
    modules: initialData.modules,
    steps: initialData.steps,
    assessments: initialData.assessments,
    overallProgress: 0,
    completedModules: 0,
    totalModules: initialData.modules.length,
    };
  });

  // Update modules when initialData.modules changes
  useEffect(() => {
    const currentModuleIds = progress.modules.map(m => m.id).sort().join(',');
    const newModuleIds = initialData.modules.map(m => m.id).sort().join(',');
    
    // Always update if length is different or IDs are different
    if (currentModuleIds !== newModuleIds || progress.modules.length !== initialData.modules.length) {
      console.log('[useTrainingProgress] Updating modules:', {
        currentLength: progress.modules.length,
        newLength: initialData.modules.length,
        currentIds: currentModuleIds.substring(0, 50),
        newIds: newModuleIds.substring(0, 50)
      });
      setProgress(prev => ({
        ...prev,
        modules: initialData.modules,
        totalModules: initialData.modules.length,
        completedModules: initialData.modules.filter(m => m.completed).length,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData.modules]);

  const calculateOverallProgress = useCallback((modules: TrainingModule[], steps: OnboardingStep[]) => {
    const moduleProgress = modules.reduce((sum, module) => sum + module.progress, 0) / modules.length;
    const stepProgress = steps.reduce((sum, step) => sum + step.progress, 0) / steps.length;
    return Math.round((moduleProgress + stepProgress) / 2);
  }, []);

  const updateModuleProgress = useCallback((moduleId: string, newProgress: number) => {
    setProgress(prev => {
      const updatedModules = prev.modules.map(module => {
        if (module.id === moduleId) {
          const completed = newProgress >= 100;
          return {
            ...module,
            progress: newProgress,
            completed,
            engagementScore: Math.min(module.engagementScore + (completed ? 10 : 2), 100),
            comprehensionScore: Math.min(module.comprehensionScore + (completed ? 15 : 3), 100),
          };
        }
        return module;
      });

      const completedCount = updatedModules.filter(m => m.completed).length;
      const overallProgress = calculateOverallProgress(updatedModules, prev.steps);

      return {
        ...prev,
        modules: updatedModules,
        completedModules: completedCount,
        overallProgress,
      };
    });
  }, [calculateOverallProgress]);

  const updateStepProgress = useCallback((stepId: string, newProgress: number, status?: OnboardingStep['status']) => {
    setProgress(prev => {
      const updatedSteps = prev.steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            progress: newProgress,
            status: status || (newProgress >= 100 ? 'completed' : newProgress > 0 ? 'in-progress' : 'pending'),
          };
        }
        return step;
      });

      const overallProgress = calculateOverallProgress(prev.modules, updatedSteps);

      return {
        ...prev,
        steps: updatedSteps,
        overallProgress,
      };
    });
  }, [calculateOverallProgress]);

  const updateAssessmentResult = useCallback((assessmentId: string, score: number, status: Assessment['status']) => {
    setProgress(prev => ({
      ...prev,
      assessments: prev.assessments.map(assessment => {
        if (assessment.id === assessmentId) {
          return {
            ...assessment,
            score,
            status,
            attempts: assessment.attempts + 1,
          };
        }
        return assessment;
      }),
    }));
  }, []);

  useEffect(() => {
    const overallProgress = calculateOverallProgress(progress.modules, progress.steps);
    if (overallProgress !== progress.overallProgress) {
      setProgress(prev => ({ ...prev, overallProgress }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.modules, progress.steps]);

  return {
    progress,
    updateModuleProgress,
    updateStepProgress,
    updateAssessmentResult,
  };
};