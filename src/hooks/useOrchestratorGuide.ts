import { useCallback, useState } from 'react';

const STORAGE_KEY = 'orchestratorGuideCompleted';

export function useOrchestratorGuide() {
  const [shouldShowGuide, setShouldShowGuide] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== 'true'
  );

  const markGuideComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShouldShowGuide(false);
  }, []);

  return { shouldShowGuide, markGuideComplete };
}
