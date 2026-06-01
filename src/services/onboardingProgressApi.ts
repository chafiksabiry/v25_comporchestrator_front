import axios from 'axios';
import Cookies from 'js-cookie';

function parseCompletedSteps(raw: string | undefined | null): number[] {
  if (!raw) return [];
  try {
    const progress = JSON.parse(raw);
    return Array.isArray(progress.completedSteps) ? progress.completedSteps : [];
  } catch {
    return [];
  }
}

function readCompletedStepsFromStorage(): number[] {
  const fromCookie = parseCompletedSteps(Cookies.get('companyOnboardingProgress'));
  if (fromCookie.length > 0) return fromCookie;
  return parseCompletedSteps(localStorage.getItem('companyOnboardingProgress'));
}

function writeProgressToStorage(completedSteps: number[], currentPhase?: number): void {
  const payload = {
    currentPhase: currentPhase ?? 4,
    completedSteps,
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem('companyOnboardingProgress', JSON.stringify(payload));
  Cookies.set('companyOnboardingProgress', JSON.stringify(payload));
}

export type OnboardingProgressPayload = {
  completedSteps: number[];
  currentPhase: number;
  phases?: unknown[];
  lastUpdated?: string;
  [key: string]: unknown;
};

const FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
const failedUntilByCompany = new Map<string, number>();
const inflightByCompany = new Map<string, Promise<OnboardingProgressPayload | null>>();

function companyApiBase(): string {
  return (
    import.meta.env.VITE_COMPANY_API_URL ||
    'https://v25searchcompanywizardbackend-production.up.railway.app/api'
  );
}

function normalizeProgress(raw: unknown): OnboardingProgressPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const nested =
    data.data && typeof data.data === 'object'
      ? (data.data as Record<string, unknown>)
      : data;
  const completedSteps = Array.isArray(nested.completedSteps)
    ? (nested.completedSteps as number[]).filter((id) => Number.isFinite(id))
    : [];
  const currentPhase =
    typeof nested.currentPhase === 'number' && nested.currentPhase >= 1
      ? nested.currentPhase
      : 1;
  return {
    ...nested,
    completedSteps,
    currentPhase,
    phases: nested.phases,
  };
}

export function isOnboardingProgressApiUnavailable(companyId?: string | null): boolean {
  if (!companyId) return false;
  const until = failedUntilByCompany.get(companyId);
  return typeof until === 'number' && until > Date.now();
}

export function markOnboardingProgressApiUnavailable(companyId: string): void {
  failedUntilByCompany.set(companyId, Date.now() + FAILURE_COOLDOWN_MS);
}

export function clearOnboardingProgressApiUnavailable(companyId?: string | null): void {
  if (!companyId) return;
  failedUntilByCompany.delete(companyId);
}

export function getOnboardingProgressFromStorage(): OnboardingProgressPayload {
  const completedSteps = readCompletedStepsFromStorage();
  let currentPhase = 1;
  try {
    const raw =
      localStorage.getItem('companyOnboardingProgress') ||
      Cookies.get('companyOnboardingProgress');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.currentPhase === 'number' && parsed.currentPhase >= 1) {
        currentPhase = parsed.currentPhase;
      }
    }
  } catch {
    /* use defaults */
  }
  return { completedSteps, currentPhase };
}

/**
 * Fetches onboarding progress once per company (deduped). On 4xx/5xx or network error,
 * marks the API unavailable for a cooldown and returns cached local progress instead of retrying.
 */
export async function fetchOnboardingProgress(
  companyId: string,
  options?: { force?: boolean }
): Promise<OnboardingProgressPayload | null> {
  if (!companyId) return null;

  if (!options?.force && isOnboardingProgressApiUnavailable(companyId)) {
    return getOnboardingProgressFromStorage();
  }

  const existing = inflightByCompany.get(companyId);
  if (existing && !options?.force) return existing;

  const request = (async () => {
    try {
      const response = await axios.get(
        `${companyApiBase()}/onboarding/companies/${companyId}/onboarding`
      );
      const normalized = normalizeProgress(response.data);
      if (!normalized) {
        markOnboardingProgressApiUnavailable(companyId);
        return getOnboardingProgressFromStorage();
      }
      clearOnboardingProgressApiUnavailable(companyId);
      writeProgressToStorage(normalized.completedSteps, normalized.currentPhase);
      return normalized;
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) {
        // No record yet — treat as empty progress without entering failure cooldown.
        return { completedSteps: [], currentPhase: 1, phases: [] };
      }
      markOnboardingProgressApiUnavailable(companyId);
      return getOnboardingProgressFromStorage();
    } finally {
      inflightByCompany.delete(companyId);
    }
  })();

  inflightByCompany.set(companyId, request);
  return request;
}
