import { useCallback, useState } from 'react';
import { isOnboardingFullyCompleted } from './useStepGuide';

const STORAGE_KEY = 'orchestratorGuideCompleted';

export function useOrchestratorGuide() {
  const [shouldShowGuide, setShouldShowGuide] = useState(() => {
    // Never show the welcome guide once the user has finished every onboarding phase.
    if (isOnboardingFullyCompleted()) return false;
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  const markGuideComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShouldShowGuide(false);
  }, []);

  return { shouldShowGuide, markGuideComplete };
}
