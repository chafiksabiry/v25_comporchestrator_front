export type StepGuidePhase = 'before' | 'inside' | 'all';

const beforeKey = (stepId: number) => `stepGuideBefore_${stepId}`;
const insideKey = (stepId: number) => `stepGuideInside_${stepId}`;

// All onboarding step IDs (4 phases × steps, see CompanyOnboarding.tsx)
export const ALL_ONBOARDING_STEP_IDS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
];

export function getCompletedStepsFromStorage(): number[] {
  try {
    const raw = localStorage.getItem('companyOnboardingProgress');
    if (!raw) return [];
    const progress = JSON.parse(raw);
    return Array.isArray(progress.completedSteps) ? progress.completedSteps : [];
  } catch {
    return [];
  }
}

/**
 * Returns true when every onboarding step (all 4 phases) is marked as
 * completed in `companyOnboardingProgress`. Used to skip the welcome
 * orchestrator modal and to land returning users directly on the dashboard.
 */
export function isOnboardingFullyCompleted(completedSteps?: number[]): boolean {
  const steps = completedSteps ?? getCompletedStepsFromStorage();
  if (!steps.length) return false;
  return ALL_ONBOARDING_STEP_IDS.every((id) => steps.includes(id));
}

export function isStepCompleted(
  stepId: number,
  completedSteps?: number[]
): boolean {
  const steps = completedSteps ?? getCompletedStepsFromStorage();
  return steps.includes(stepId);
}

export function shouldShowStepGuide(
  stepId: number,
  variant: 'before' | 'inside',
  completedSteps?: number[]
): boolean {
  if (isStepCompleted(stepId, completedSteps)) return false;
  const key = variant === 'before' ? beforeKey(stepId) : insideKey(stepId);
  return localStorage.getItem(key) !== 'true';
}

export function markStepGuideSeen(stepId: number, variant: StepGuidePhase): void {
  if (variant === 'before' || variant === 'all') {
    localStorage.setItem(beforeKey(stepId), 'true');
  }
  if (variant === 'inside' || variant === 'all') {
    localStorage.setItem(insideKey(stepId), 'true');
  }
}

/** @deprecated use shouldShowStepGuide */
export function hasSeenStepGuide(stepId: number): boolean {
  return (
    localStorage.getItem(beforeKey(stepId)) === 'true' &&
    localStorage.getItem(insideKey(stepId)) === 'true'
  );
}
