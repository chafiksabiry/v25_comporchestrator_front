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
  'knowledgeBase',
  'repOnboarding',
  'callScript',
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
  7: 'knowledgeBase',
  8: 'repOnboarding',
  9: 'callScript',
  10: 'sessionPlanning',
  12: 'gigActivation',
};

/** Sequential order in which the rep should complete each step.
 *  Used by `getNextStepRoute` to drive the "Continue →" CTA after
 *  every successful action. Activation comes last. */
export const STEP_FIELD_ORDER: SetupStepField[] = [
  'telephony',
  'uploadContacts',
  'knowledgeBase',
  'repOnboarding',
  'callScript',
  'sessionPlanning',
  'gigActivation',
];

/** Dashboard route mounted for each step. Mirrors the in-dashboard
 *  shell `<Route>` definitions in `App.tsx`. */
export const STEP_FIELD_TO_ROUTE: Record<SetupStepField, string> = {
  telephony: '/dashboard/telephony',
  uploadContacts: '/dashboard/leads',
  callScript: '/dashboard/script-generator',
  knowledgeBase: '/dashboard/knowledge-base',
  repOnboarding: '/dashboard/training',
  sessionPlanning: '/dashboard/scheduler',
  gigActivation: '/dashboard/gig-activation',
};

/** Returns the dashboard route the rep should land on after completing
 *  the given step. Falls back to the gigs list once every step is done. */
export function getNextStepRoute(
  completedField: SetupStepField,
  gigId?: string
): string {
  const idx = STEP_FIELD_ORDER.indexOf(completedField);
  const nextField =
    idx === -1 || idx >= STEP_FIELD_ORDER.length - 1
      ? null
      : STEP_FIELD_ORDER[idx + 1];

  const base = nextField ? STEP_FIELD_TO_ROUTE[nextField] : '/dashboard/gigs';
  if (!gigId) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}gigId=${encodeURIComponent(gigId)}`;
}

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
      // When a step has just been completed, surface a unified
      // "Continue →" CTA via the top-level toast listener. We never
      // show it on a regression (value === false).
      if (value) {
        const nextRoute = getNextStepRoute(field, gigId);
        window.dispatchEvent(
          new CustomEvent('harx:gig-step-complete', {
            detail: { gigId, field, nextRoute },
          })
        );
      }
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

/** Mark the same setup step on every gig owned by a company (e.g. subscription
 *  is company-wide but `repOnboarding` lives on each gig document). */
export async function markCompanyGigsStepDone(
  companyId: string,
  field: SetupStepField,
  value: boolean = true
): Promise<void> {
  if (!companyId) return;
  try {
    const res = await fetch(
      `${GIGS_API()}/gigs/company/${encodeURIComponent(companyId)}`
    );
    if (!res.ok) return;
    const payload = await res.json();
    const gigs: Array<{ _id?: string }> = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    await Promise.all(
      gigs
        .filter((g) => g?._id)
        .map((g) => markGigStepDone(String(g._id), field, value))
    );
  } catch {
    // best-effort — checklist probes reconcile later
  }
}
