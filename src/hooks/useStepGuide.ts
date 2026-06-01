import Cookies from 'js-cookie';

export type StepGuidePhase = 'before' | 'inside' | 'all';

const beforeKey = (stepId: number) => `stepGuideBefore_${stepId}`;
const insideKey = (stepId: number) => `stepGuideInside_${stepId}`;

import { normalizeOnboardingStepIds, ONBOARDING_STEP } from './onboardingSteps';

/**
 * Required onboarding steps (non-disabled only — matches CompanyOnboarding.tsx).
 * Step 2 (KYC) is disabled and must not block completion.
 */
export const REQUIRED_ONBOARDING_STEP_IDS: number[] = [
  ONBOARDING_STEP.COMPANY_PROFILE,
  ONBOARDING_STEP.GIGS,
  ONBOARDING_STEP.TELEPHONY,
  ONBOARDING_STEP.CONTACTS,
  ONBOARDING_STEP.REPORTING,
  ONBOARDING_STEP.KNOWLEDGE_BASE,
  ONBOARDING_STEP.TRAINING,
  ONBOARDING_STEP.CALL_SCRIPT,
  ONBOARDING_STEP.SESSION_PLANNING,
  ONBOARDING_STEP.SUBSCRIPTION,
  ONBOARDING_STEP.GIG_ACTIVATION,
  ONBOARDING_STEP.MATCH_REPS,
];

/** @deprecated use REQUIRED_ONBOARDING_STEP_IDS */
export const ALL_ONBOARDING_STEP_IDS = REQUIRED_ONBOARDING_STEP_IDS;

function parseCompletedSteps(raw: string | undefined | null): number[] {
  if (!raw) return [];
  try {
    const progress = JSON.parse(raw);
    const steps = Array.isArray(progress.completedSteps) ? progress.completedSteps : [];
    return normalizeOnboardingStepIds(steps);
  } catch {
    return [];
  }
}

export function getCompletedStepsFromStorage(): number[] {
  // CompanyOnboarding persists progress in cookies; step events also use localStorage.
  const fromCookie = parseCompletedSteps(Cookies.get('companyOnboardingProgress'));
  if (fromCookie.length > 0) return fromCookie;
  return parseCompletedSteps(localStorage.getItem('companyOnboardingProgress'));
}

export function persistOnboardingProgress(completedSteps: number[], currentPhase?: number): void {
  const payload = {
    currentPhase: currentPhase ?? 4,
    completedSteps: normalizeOnboardingStepIds(completedSteps),
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem('companyOnboardingProgress', JSON.stringify(payload));
  Cookies.set('companyOnboardingProgress', JSON.stringify(payload));
}

/**
 * Load onboarding progress from the company API and mirror it to cookie + localStorage.
 */
export async function syncOnboardingProgressFromApi(companyId: string): Promise<number[]> {
  const apiUrl = import.meta.env.VITE_COMPANY_API_URL;
  if (!apiUrl || !companyId) return getCompletedStepsFromStorage();

  try {
    const res = await fetch(`${apiUrl}/onboarding/companies/${companyId}/onboarding`);
    if (!res.ok) return getCompletedStepsFromStorage();
    const progress = await res.json();
    const completedSteps = normalizeOnboardingStepIds(
      Array.isArray(progress.completedSteps) ? progress.completedSteps : []
    );
    persistOnboardingProgress(completedSteps, progress.currentPhase);
    return completedSteps;
  } catch {
    return getCompletedStepsFromStorage();
  }
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
