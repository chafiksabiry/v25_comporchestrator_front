import { useCallback } from 'react';

const STORAGE_KEY = 'orchestratorGuideCompleted';
// Legacy key set by an old duplicate of the guide in CompanyOnboarding.tsx.
// Honor it so users who already dismissed the modal under the previous
// implementation do not see it again after upgrade.
const LEGACY_STORAGE_KEY = 'orchestratorGuideSeen';

// Single, unambiguous rule for the orchestrator welcome modal:
//   - Shown ONCE on the user's first visit to the orchestrator.
//   - Never shown again afterwards, regardless of onboarding progress,
//     refreshes, navigation, or any other state.
function hasSeenGuide(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return true;
    if (localStorage.getItem(LEGACY_STORAGE_KEY) === 'true') {
      localStorage.setItem(STORAGE_KEY, 'true');
      return true;
    }
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  return false;
}

export function useOrchestratorGuide() {
  // Old orchestrator welcome modal is permanently disabled — the per-phase
  // OnboardingProductTour (CompanyOnboarding.tsx) replaces it.
  const shouldShowGuide = false;

  const markGuideComplete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(LEGACY_STORAGE_KEY, 'true');
    } catch {
      /* ignore */
    }
  }, []);

  return { shouldShowGuide, markGuideComplete };
}
