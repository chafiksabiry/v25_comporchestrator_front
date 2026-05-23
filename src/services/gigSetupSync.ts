/**
 * gigSetupSync
 *
 * Tiny client-side helper that keeps a gig's `setupSteps.*` field
 * in sync with the live application state. Each setup page should
 * call `markGigStepDone(gigId, field)` right after a successful
 * mutation (e.g. a phone number was bought, a script was saved,
 * contacts were uploaded, …) so the backend reflects progress
 * immediately — instead of waiting for the dashboard checklist
 * to re-probe the world later.
 *
 * The PATCH endpoint is `PATCH /api/gigs/:id/setup-steps` and
 * accepts a partial body, so a single field update is cheap.
 */

export const SETUP_STEP_FIELDS = [
  'telephony',
  'uploadContacts',
  'callScript',
  'knowledgeBase',
  'repOnboarding',
  'sessionPlanning',
  'gigActivation',
] as const;

export type SetupStepField = (typeof SETUP_STEP_FIELDS)[number];

export type SetupSteps = Record<SetupStepField, boolean>;

/** Same map used by the dashboard checklist — kept here so other
 *  pages can translate the UI step id into the DB field name. */
export const STEP_ID_TO_FIELD: Record<number, SetupStepField> = {
  4: 'telephony',
  5: 'uploadContacts',
  6: 'callScript',
  8: 'knowledgeBase',
  9: 'repOnboarding',
  10: 'sessionPlanning',
  12: 'gigActivation',
};

function envOr(key: string, fallback: string): string {
  const val = (import.meta as any).env?.[key];
  return val || fallback;
}

const GIGS_API = () =>
  envOr(
    'VITE_API_URL_GIGS',
    envOr(
      'VITE_GIGS_API',
      'https://v25gigsmanualcreationbackend-production.up.railway.app/api'
    )
  );

/** Fire-and-forget PATCH on `setupSteps.<field>` for a single gig.
 *  Silently swallows errors — the next probe run in the dashboard
 *  checklist will reconcile if the request fails. Also notifies
 *  the rest of the UI via `harx:gig-step-progress` so any open
 *  checklist re-renders instantly. */
export async function markGigStepDone(
  gigId: string,
  field: SetupStepField,
  value: boolean = true
): Promise<void> {
  if (!gigId) return;
  try {
    await fetch(`${GIGS_API()}/gigs/${encodeURIComponent(gigId)}/setup-steps`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  } catch {
    // ignore — best-effort, checklist will reconcile later
  } finally {
    try {
      window.dispatchEvent(
        new CustomEvent('harx:gig-step-progress', {
          detail: { stepId: fieldToStepId(field), gigId, field, value },
        })
      );
    } catch {
      // no-op — non-browser env
    }
  }
}

/** Update multiple flags in a single request. Useful when an action
 *  legitimately completes more than one step at once. */
export async function markGigSteps(
  gigId: string,
  patch: Partial<SetupSteps>
): Promise<void> {
  if (!gigId) return;
  const clean: Partial<SetupSteps> = {};
  for (const field of SETUP_STEP_FIELDS) {
    if (typeof patch[field] === 'boolean') clean[field] = patch[field];
  }
  if (Object.keys(clean).length === 0) return;

  try {
    await fetch(`${GIGS_API()}/gigs/${encodeURIComponent(gigId)}/setup-steps`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    });
  } catch {
    // ignore
  } finally {
    try {
      window.dispatchEvent(
        new CustomEvent('harx:gig-step-progress', { detail: { gigId, patch: clean } })
      );
    } catch {
      // no-op
    }
  }
}

function fieldToStepId(field: SetupStepField): number | null {
  for (const [id, f] of Object.entries(STEP_ID_TO_FIELD)) {
    if (f === field) return Number(id);
  }
  return null;
}
