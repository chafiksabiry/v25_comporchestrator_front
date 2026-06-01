/**
 * Prevents onboarding GET storms from refreshOnboardingProgress, stepCompleted loops, etc.
 */

const DEBOUNCE_MS = 800;

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

let lastLoadStartedAt = 0;
let inFlight = false;
let lastPayloadKey: string | null = null;

export function debouncedOnboardingLoad(
  companyId: string,
  fn: () => void | Promise<void>,
  delayMs = DEBOUNCE_MS
): void {
  const id = companyId.trim();
  if (!id) return;
  const prev = debounceTimers.get(id);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    id,
    setTimeout(() => {
      debounceTimers.delete(id);
      void Promise.resolve(fn()).catch(() => {});
    }, delayMs)
  );
}

export function canStartOnboardingLoad(companyId: string): boolean {
  if (!companyId) return false;
  if (inFlight) return false;
  const now = Date.now();
  if (now - lastLoadStartedAt < DEBOUNCE_MS) return false;
  return true;
}

export function beginOnboardingLoad(): void {
  lastLoadStartedAt = Date.now();
  inFlight = true;
}

export function finishOnboardingLoad(): void {
  inFlight = false;
}

export function setLastOnboardingPayloadKey(key: string): void {
  lastPayloadKey = key;
}

export function getLastOnboardingPayloadKey(): string | null {
  return lastPayloadKey;
}

export function buildOnboardingPayloadKey(
  completedSteps: number[],
  currentPhase: number,
  phasesLen: number
): string {
  const sorted = [...completedSteps].sort((a, b) => a - b);
  return JSON.stringify({ completedSteps: sorted, currentPhase, phasesLen });
}
