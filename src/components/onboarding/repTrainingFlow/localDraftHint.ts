const DRAFT_KEY = 'training_journey_draft';

/** Lightweight check without importing the full training DraftService. */
export function hasLocalTrainingDraft(): boolean {
  try {
    return !!localStorage.getItem(DRAFT_KEY);
  } catch {
    return false;
  }
}

export function getLocalTrainingDraftLabel(): string | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return undefined;
    const j = JSON.parse(raw);
    return j?.journey?.name || j?.journey?.title || undefined;
  } catch {
    return undefined;
  }
}

export function getDraftCompanyIdFromStorage(): string | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return undefined;
    const j = JSON.parse(raw);
    return j?.company?.id || j?.company?._id;
  } catch {
    return undefined;
  }
}
