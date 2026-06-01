/**
 * Canonical onboarding step IDs (aligned with phase order in CompanyOnboarding).
 *
 * Phase 1: 1–2 | Phase 2: 3–6 | Phase 3: 7–10 | Phase 4: 11–13
 */
export const ONBOARDING_STEP = {
  COMPANY_PROFILE: 1,
  KYC: 2,
  GIGS: 3,
  TELEPHONY: 4,
  CONTACTS: 5,
  REPORTING: 6,
  KNOWLEDGE_BASE: 7,
  TRAINING: 8,
  CALL_SCRIPT: 9,
  SESSION_PLANNING: 10,
  SUBSCRIPTION: 11,
  GIG_ACTIVATION: 12,
  MATCH_REPS: 13,
} as const;

/** Legacy IDs before 2026 renumber (7→6, 8→7, 9→8, old 6→9). */
const LEGACY_STEP_ID_MAP: Record<number, number> = {
  7: ONBOARDING_STEP.REPORTING,
  8: ONBOARDING_STEP.KNOWLEDGE_BASE,
  9: ONBOARDING_STEP.TRAINING,
  6: ONBOARDING_STEP.CALL_SCRIPT,
};

export function normalizeOnboardingStepIds(stepIds: number[]): number[] {
  const normalized = new Set<number>();
  for (const id of stepIds) {
    if (!Number.isFinite(id)) continue;
    const mapped = LEGACY_STEP_ID_MAP[id] ?? id;
    normalized.add(mapped);
  }
  return [...normalized].sort((a, b) => a - b);
}
