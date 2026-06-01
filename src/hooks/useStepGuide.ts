import Cookies from 'js-cookie';
import {
  fetchOnboardingProgress,
  getOnboardingProgressFromStorage,
} from '../services/onboardingProgressApi';

export type StepGuidePhase = 'before' | 'inside' | 'all';

const beforeKey = (stepId: number) => `stepGuideBefore_${stepId}`;
const insideKey = (stepId: number) => `stepGuideInside_${stepId}`;

/**
 * Required onboarding steps (non-disabled only — matches CompanyOnboarding.tsx).
 * Steps 2 (KYC) and 7 (Reporting) are disabled and must not block completion.
 */
export const REQUIRED_ONBOARDING_STEP_IDS: number[] = [
  1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13,
];

/** @deprecated use REQUIRED_ONBOARDING_STEP_IDS */
export const ALL_ONBOARDING_STEP_IDS = REQUIRED_ONBOARDING_STEP_IDS;

export function getCompletedStepsFromStorage(): number[] {
  return getOnboardingProgressFromStorage().completedSteps;
}

export function persistOnboardingProgress(completedSteps: number[], currentPhase?: number): void {
  const payload = {
    currentPhase: currentPhase ?? 4,
    completedSteps,
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem('companyOnboardingProgress', JSON.stringify(payload));
  Cookies.set('companyOnboardingProgress', JSON.stringify(payload));
}

/**
 * Load onboarding progress from the company API and mirror it to cookie + localStorage.
 */
export async function syncOnboardingProgressFromApi(companyId: string): Promise<number[]> {
  if (!companyId) return getCompletedStepsFromStorage();
  const progress = await fetchOnboardingProgress(companyId);
  return progress?.completedSteps ?? getCompletedStepsFromStorage();
}

/**
 * True when every required (non-disabled) onboarding step is completed.
 */
export function isOnboardingFullyCompleted(completedSteps?: number[]): boolean {
  const steps = completedSteps ?? getCompletedStepsFromStorage();
  if (!steps.length) return false;
  return REQUIRED_ONBOARDING_STEP_IDS.every((id) => steps.includes(id));
}

export function isStepCompleted(
  stepId: number,
  completedSteps?: number[]
): boolean {
  const steps = completedSteps ?? getCompletedStepsFromStorage();
  return steps.includes(stepId);
}

export function shouldShowStepGuide(
  _stepId: number,
  _variant: 'before' | 'inside',
  _completedSteps?: number[]
): boolean {
  // Per-step guides are disabled — only the orchestrator guide is shown on first login.
  return false;
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
