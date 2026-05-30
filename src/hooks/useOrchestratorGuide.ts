import { useCallback, useState } from 'react';
import { isOnboardingFullyCompleted } from './useStepGuide';

const STORAGE_KEY = 'orchestratorGuideCompleted';
// Legacy key set by an old duplicate of the guide in CompanyOnboarding.tsx.
// Honor it so users who already dismissed the modal under the previous
// implementation do not see it again after upgrade.
const LEGACY_STORAGE_KEY = 'orchestratorGuideSeen';

function hasSeenGuide(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return true;
    if (localStorage.getItem(LEGACY_STORAGE_KEY) === 'true') {
      // Migrate to the new key so we stop reading the legacy one.
      localStorage.setItem(STORAGE_KEY, 'true');
      return true;
    }
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  return false;
}

export function useOrchestratorGuide() {
  const [shouldShowGuide, setShouldShowGuide] = useState(() => {
    // Never show the welcome guide once the user has finished every onboarding phase.
    if (isOnboardingFullyCompleted()) return false;
    return !hasSeenGuide();
  });

  const markGuideComplete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(LEGACY_STORAGE_KEY, 'true');
    } catch {
      /* ignore */
    }
    setShouldShowGuide(false);
  }, []);

  return { shouldShowGuide, markGuideComplete };
}
