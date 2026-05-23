/**
 * GigSetupChecklist
 *
 * Per-gig setup warning. For every gig still in `to_activate` / `pending` /
 * `draft` we render its own card listing only the steps that are missing
 * FOR THAT SPECIFIC GIG — not the company-wide tracker.
 *
 * Steps are sequential: only the next pending step gets an active
 * "Continue →" button. Later pending steps are shown as "locked" so the
 * rep finishes the flow in order (Telephony → Contacts → Script → KB →
 * REP Onboarding → Session Planning → Gig Activation).
 *
 * Per-step source of truth (every check hits the real backend):
 *   • 4  Telephony          → `/phone-numbers` filtered by gigId
 *   • 5  Upload Contacts    → `/leads/.../has-leads?gigId=`
 *   • 6  Call Script        → `/rag/scripts?gigId=`
 *   • 8  Knowledge Base     → `/documents?gigId=`
 *   • 9  REP Onboarding     → `/training_journeys/trainer/companyId/:id?gigId=`
 *   • 10 Session Planning   → `/time-slots?gigId=` (matching backend)
 *   • 12 Gig Activation     → `gig.status === 'active'`
 *
 * Match HARX Reps is intentionally excluded — matching happens after the
 * gig is live and is owned by a different surface.
 *
 * Used by:
 *   - `OperationsDashboard` (Dashboard home)
 *   - `GigDetails` (Gigs panel)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import {
  markGigSteps,
  STEP_ID_TO_FIELD,
  type SetupSteps,
} from '../../../services/gigSetupSync';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  Phone,
  Rocket,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

/** The dismissal is intentionally in-memory only. A page refresh always
 *  brings the banner back so the rep can't permanently silence it while
 *  setup is still pending. */

/** Step id → in-dashboard route. Keeps the rep inside the shell.
 *  Pure pathname (no query string) so the inverse map below stays simple. */
const STEP_DASHBOARD_PATH: Record<number, string> = {
  4: '/dashboard/telephony',
  5: '/dashboard/leads',
  6: '/dashboard/script-generator',
  8: '/dashboard/knowledge-base',
  9: '/dashboard/training',
  10: '/dashboard/scheduler',
  12: '/dashboard/gig-activation',
};

/** Optional Continue-button override per step. Use this when the rep
 *  should land on a specific tab / action inside the destination page
 *  rather than its default landing view. */
const STEP_CONTINUE_TARGET: Record<number, string> = {
  // Telephony defaults to "My Lines"; we want the rep to land on "Buy a
  // line" because the warning means the gig has zero numbers yet.
  4: '/dashboard/telephony?action=buy',
};

/** Inverse map — given a pathname, returns the step id this page is
 *  responsible for (used to render the compact per-component warning). */
const PATH_TO_STEP: Record<string, number> = Object.entries(
  STEP_DASHBOARD_PATH
).reduce<Record<string, number>>((acc, [id, path]) => {
  acc[path] = Number(id);
  return acc;
}, {});

function getContinueTarget(stepId: number, gigId?: string): string {
  const base = STEP_CONTINUE_TARGET[stepId] || STEP_DASHBOARD_PATH[stepId];
  if (!base) return '#';
  if (!gigId) return base;
  // Append `gigId=<id>` to the target URL so the destination page can
  // auto-select that specific gig instead of defaulting to the first.
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}gigId=${encodeURIComponent(gigId)}`;
}

/** Routes that should show the full multi-gig banner. Anything else with
 *  no step match hides the widget entirely (e.g. wallet, overview,
 *  settings — overview is a static landing page redirecting to the
 *  orchestrator so it has no need for the setup checklist). */
const FULL_BANNER_PATHS = new Set<string>([
  '/dashboard/main',
  '/dashboard/gigs',
  '/dashboard',
]);

function normalizeGigStatus(status: string | undefined): string {
  return (status || '').toLowerCase().replace(/-/g, '_');
}

function isGigPendingActivation(status: string | undefined): boolean {
  const s = normalizeGigStatus(status);
  if (s === 'active') return false;
  return ['to_activate', 'pending', 'draft'].includes(s);
}

export interface MinimalGig {
  _id: string;
  title?: string;
  status: string;
  availability?: { schedule?: any[] };
  [key: string]: any;
}

interface Props {
  /** Inject gigs from a parent fetch to skip the duplicate request. */
  gigs?: MinimalGig[];
}

const toneStyles: Record<string, string> = {
  sky: 'bg-sky-50 text-sky-600 border-sky-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  violet: 'bg-violet-50 text-violet-600 border-violet-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  teal: 'bg-teal-50 text-teal-600 border-teal-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

/** Best-effort env resolver — falls back to known prod URLs so the widget
 *  works on Netlify even when the local `.env` file is incomplete. */
function envOr(key: string, fallback: string): string {
  const val = (import.meta as any).env?.[key];
  return val || fallback;
}

const GIGS_API = () =>
  envOr('VITE_API_URL_GIGS', envOr('VITE_GIGS_API', 'https://v25gigsmanualcreationbackend-production.up.railway.app/api'));
const PHONE_API = () =>
  envOr('VITE_API_BASE_URL', 'https://v25gigsmanualcreationbackend-production.up.railway.app/api');
const DASHBOARD_API = () =>
  envOr('VITE_DASHBOARD_API', 'https://v25dashboardbackend-production.up.railway.app/api');
const KB_API = () => {
  const base = envOr('VITE_BACKEND_KNOWLEDGEBASE_API', 'https://v25knowledgebasebackend-production.up.railway.app');
  return base.endsWith('/api') ? base : `${base}/api`;
};
const TRAINING_API = () => {
  const base = envOr(
    'VITE_TRAINING_BACKEND_URL',
    'https://v25platformtrainingbackend-production.up.railway.app'
  );
  return base.endsWith('/api') ? base : `${base}/api`;
};
/** Same endpoint family used by `schedulerService.ts` (time-slots + matching). */
const MATCHING_API = () =>
  envOr('VITE_MATCHING_API_URL', 'https://v25matchingbackend-production.up.railway.app/api');

/** Best-effort fetch that resolves to `false` on any error. The banner
 *  should never crash the dashboard if a side-service is down — we just
 *  treat it as "not done" so the rep is nudged to verify. */
async function safeBool(promise: Promise<boolean>): Promise<boolean> {
  try {
    return await promise;
  } catch {
    return false;
  }
}

/** Probe-result → DB sync. Whenever the live probes find a step
 *  has progressed since last time, push the diff to the backend via
 *  the shared `markGigSteps` helper. Same util is used directly by
 *  each step page after a successful mutation. */
async function persistSetupSteps(
  gigId: string,
  liveFlags: Record<number, boolean>,
  storedSteps?: Partial<SetupSteps>
): Promise<void> {
  const diff: Partial<SetupSteps> = {};
  for (const [stepIdStr, field] of Object.entries(STEP_ID_TO_FIELD)) {
    const stepId = Number(stepIdStr);
    const next = !!liveFlags[stepId];
    const prev = !!storedSteps?.[field];
    if (next !== prev) diff[field] = next;
  }
  if (Object.keys(diff).length === 0) return;
  await markGigSteps(gigId, diff);
}

/** Check every setup step for a single gig against the real backends.
 *  Returns a `{ stepId: done }` map. Step 10 (Session Planning) is
 *  derived from the gig's own availability since the scheduler backend
 *  is still mocked in `SchedulerPanel`. Step 12 (Gig Activation) is the
 *  gig's `status === 'active'`. */
async function probeGigSetup(
  gig: MinimalGig,
  companyId: string,
  userId: string,
  phoneNumbersByGig: Record<string, boolean>
): Promise<Record<number, boolean>> {
  const gigId = gig._id;
  const isActive = normalizeGigStatus(gig.status) === 'active';

  // Telephony — feed from the pre-fetched phone-numbers map (single
  // request shared across all gigs in the batch).
  const telephonyDone = !!phoneNumbersByGig[gigId];

  // Run every network probe in parallel. Each `safeBool` wraps a fetch
  // + small parsing helper so a 4xx/5xx never crashes the dashboard.
  const [contactsDone, scriptDone, kbDone, repOnboardingDone, sessionsDone] = await Promise.all([
    safeBool(
      (async () => {
        const r = await fetch(
          `${DASHBOARD_API()}/leads/company/${companyId}/has-leads?gigId=${gigId}`
        );
        if (!r.ok) return false;
        const j = await r.json();
        return Number(j?.count) > 0;
      })()
    ),
    safeBool(
      (async () => {
        const r = await fetch(`${KB_API()}/rag/scripts?gigId=${gigId}`);
        if (!r.ok) return false;
        const j = await r.json().catch(() => null);
        const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        return list.length > 0;
      })()
    ),
    safeBool(
      (async () => {
        const params = new URLSearchParams({ gigId });
        if (userId) params.append('userId', userId);
        const r = await fetch(`${KB_API()}/documents?${params.toString()}`);
        if (!r.ok) return false;
        const j = await r.json().catch(() => null);
        const list = Array.isArray(j?.documents)
          ? j.documents
          : Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j)
          ? j
          : [];
        return list.length > 0;
      })()
    ),
    safeBool(
      (async () => {
        // `RepOnboarding` lists training journeys for a (company, gig) pair.
        // If at least one journey exists we consider step 9 done for the gig.
        const r = await fetch(
          `${TRAINING_API()}/training_journeys/trainer/companyId/${companyId}?gigId=${gigId}`
        );
        if (!r.ok) return false;
        const j = await r.json().catch(() => null);
        const list = Array.isArray(j?.data?.journeys)
          ? j.data.journeys
          : Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j?.journeys)
          ? j.journeys
          : Array.isArray(j)
          ? j
          : [];
        return list.length > 0;
      })()
    ),
    safeBool(
      (async () => {
        // Session Planning is tracked as time-slots on the matching
        // backend (same endpoint family as `schedulerService.ts`).
        // The gig needs at least one slot to be considered planned.
        const r = await fetch(`${MATCHING_API()}/time-slots?gigId=${gigId}`);
        if (!r.ok) return false;
        const j = await r.json().catch(() => null);
        const list = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j)
          ? j
          : [];
        return list.length > 0;
      })()
    ),
  ]);

  // Active gigs are considered fully set up regardless of what the
  // micro-services return (they've already passed activation).
  if (isActive) {
    return { 4: true, 5: true, 6: true, 8: true, 9: true, 10: true, 12: true };
  }

  return {
    4: telephonyDone,
    5: contactsDone,
    6: scriptDone,
    8: kbDone,
    9: repOnboardingDone,
    10: sessionsDone,
    12: false,
  };
}

const GigSetupChecklist: React.FC<Props> = ({ gigs: gigsProp }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  /** When the rep is on a step page (e.g. /dashboard/telephony) we only
   *  render a small per-component warning for that specific step. */
  const currentStepId: number | null = PATH_TO_STEP[location.pathname] ?? null;
  const isFullBannerRoute = FULL_BANNER_PATHS.has(location.pathname);
  const companyId = Cookies.get('companyId') || '';
  const userId = Cookies.get('userId') || localStorage.getItem('userId') || '';

  const [fetchedGigs, setFetchedGigs] = useState<MinimalGig[] | null>(null);
  /** gigId → { stepId → done }. Populated by `probeGigSetup` once per gig. */
  const [gigStepStatus, setGigStepStatus] = useState<Record<string, Record<number, boolean>>>({});
  /** Toggle to collapse/expand individual gig cards. Default = expanded. */
  const [collapsedGigs, setCollapsedGigs] = useState<Record<string, boolean>>({});
  /** In-memory dismissal — resets on every page refresh. */
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(
    null
  );
  /** Bumped whenever any setup step just progressed so the probe useEffect
   *  re-runs and refreshes the per-gig status without a page refresh. */
  const [progressNonce, setProgressNonce] = useState(0);

  // Listen for cross-component "step just progressed" signals so the
  // checklist re-probes the backend without a page refresh. Components
  // like `PhoneNumberPanel`, `ScriptGenerator`, `KnowledgeBase`, etc.
  // can dispatch `harx:gig-step-progress` with a `{ stepId, gigId? }`
  // payload after a successful mutation.
  useEffect(() => {
    const onProgress = () => setProgressNonce((n) => n + 1);
    window.addEventListener('harx:gig-step-progress', onProgress as EventListener);
    return () =>
      window.removeEventListener('harx:gig-step-progress', onProgress as EventListener);
  }, []);

  // Fetch gigs only when the parent didn't already inject them.
  // Re-runs when a `harx:gig-step-progress` event bumps `progressNonce`
  // so gig statuses (e.g. `to_activate` → `active`) refresh live.
  useEffect(() => {
    if (gigsProp || !companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${GIGS_API()}/gigs/company/${companyId}?populate=companyId`);
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        if (!cancelled) setFetchedGigs(list);
      } catch {
        // Silent fail — widget just hides if we can't reach the API.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, gigsProp, progressNonce]);

  const allGigs = gigsProp ?? fetchedGigs ?? [];
  const pendingGigs = useMemo(
    () => allGigs.filter((g) => isGigPendingActivation(g.status)),
    [allGigs]
  );

  // Pre-fetch phone numbers ONCE for all pending gigs (`/phone-numbers`
  // returns the full list). Then `probeGigSetup` only does a hash lookup.
  // Re-runs when the list of pending gig ids changes.
  const pendingGigIdsKey = useMemo(
    () => pendingGigs.map((g) => g._id).sort().join(','),
    [pendingGigs]
  );

  // Dismissal signature: pending gig ids + their statuses. As soon as a
  // gig progresses or a new one is added, the signature changes and the
  // banner re-appears even if the rep clicked "close" earlier.
  const dismissSignature = useMemo(
    () =>
      pendingGigs
        .map((g) => `${g._id}:${normalizeGigStatus(g.status)}`)
        .sort()
        .join('|'),
    [pendingGigs]
  );
  const isDismissed = !!dismissedSignature && dismissedSignature === dismissSignature;

  const handleDismiss = () => {
    setDismissedSignature(dismissSignature);
  };

  useEffect(() => {
    if (!companyId || pendingGigs.length === 0) return;
    let cancelled = false;

    (async () => {
      // 1. Pre-fetch the phone-number directory.
      const phoneByGig: Record<string, boolean> = {};
      try {
        const r = await fetch(`${PHONE_API()}/phone-numbers`);
        if (r.ok) {
          const j = await r.json();
          const list = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j)
            ? j
            : [];
          for (const n of list) {
            if (n?.gigId) phoneByGig[String(n.gigId)] = true;
          }
        }
      } catch {
        // ignore — every gig's telephony will be marked not-done
      }

      // 2. Probe each pending gig in parallel.
      const probes = await Promise.all(
        pendingGigs.map((g) =>
          probeGigSetup(g, companyId, userId, phoneByGig)
        )
      );

      if (cancelled) return;
      const next: Record<string, Record<number, boolean>> = {};
      pendingGigs.forEach((g, i) => {
        next[g._id] = probes[i];
      });
      setGigStepStatus(next);

      // 3. Persist any drift between the live probe and the stored
      //    `setupSteps` field so the gig document stays in sync. We
      //    only fire PATCH calls for gigs that actually changed.
      pendingGigs.forEach((g, i) => {
        persistSetupSteps(
          g._id,
          probes[i],
          (g as any).setupSteps as Partial<SetupSteps> | undefined
        );
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, userId, pendingGigIdsKey, progressNonce]);

  // Sequential setup flow: every step must be completed before the next
  // one unlocks. Matching is intentionally not part of this list — it
  // belongs to the post-activation flow on the Rep Matching panel.
  const checklist = useMemo(
    () => [
      { id: 4, label: t('gigDetails.setupBanner.steps.telephony'), icon: Phone, tone: 'sky' as const },
      { id: 5, label: t('gigDetails.setupBanner.steps.uploadContacts'), icon: Users, tone: 'indigo' as const },
      { id: 6, label: t('gigDetails.setupBanner.steps.callScript'), icon: FileText, tone: 'violet' as const },
      { id: 8, label: t('gigDetails.setupBanner.steps.knowledgeBase'), icon: BookOpen, tone: 'amber' as const },
      { id: 9, label: t('gigDetails.setupBanner.steps.repOnboarding'), icon: UserCheck, tone: 'rose' as const },
      { id: 10, label: t('gigDetails.setupBanner.steps.sessionPlanning'), icon: Calendar, tone: 'teal' as const },
      { id: 12, label: t('gigDetails.setupBanner.steps.gigActivation'), icon: Rocket, tone: 'emerald' as const },
    ],
    [t]
  );

  if (pendingGigs.length === 0 || isDismissed) return null;

  // Hide the widget on routes that aren't related to any setup step
  // (wallet, settings, calls, analytics, …). We only ever surface it on
  // the dashboard, gigs list, or one of the dedicated step pages.
  if (!isFullBannerRoute && currentStepId === null) return null;

  const toggleCollapse = (gigId: string) =>
    setCollapsedGigs((prev) => ({ ...prev, [gigId]: !prev[gigId] }));

  // ────────────────────────────────────────────────────────────────────
  //  Compact variant — rendered on the dedicated step pages. Lists only
  //  the gigs that still need THIS specific step, with a small "Continue"
  //  shortcut. The big banner stays exclusive to the dashboard / gigs.
  // ────────────────────────────────────────────────────────────────────
  if (!isFullBannerRoute && currentStepId !== null) {
    const stepDef = checklist.find((s) => s.id === currentStepId);
    if (!stepDef) return null;
    const gigsMissingThisStep = pendingGigs.filter((g) => {
      const status = gigStepStatus[g._id];
      return !(status && status[currentStepId]);
    });
    if (gigsMissingThisStep.length === 0) return null;
    const StepIcon = stepDef.icon;
    return (
      <div
        role="status"
        className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 via-white to-amber-50/40 px-4 py-3 shadow-sm shadow-amber-100/40 animate-in slide-in-from-top-2 fade-in duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow shadow-amber-500/30">
            <StepIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-900">
              {t('gigDetails.setupBanner.stepWarningTitle', {
                step: stepDef.label,
                defaultValue: 'Action required: {{step}}',
              })}
            </div>
            <div className="mt-0.5 text-[10px] font-bold leading-snug text-amber-800/80">
              {t('gigDetails.setupBanner.stepWarningBody', {
                count: gigsMissingThisStep.length,
                step: stepDef.label,
                defaultValue:
                  gigsMissingThisStep.length > 1
                    ? '{{count}} gigs still need this step.'
                    : '{{count}} gig still needs this step.',
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {gigsMissingThisStep.slice(0, 4).map((g) => (
                <span
                  key={g._id}
                  className="inline-flex items-center rounded-md border border-amber-200 bg-white/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700"
                  title={g.title}
                >
                  <span className="max-w-[160px] truncate">
                    {g.title || g._id}
                  </span>
                </span>
              ))}
              {gigsMissingThisStep.length > 4 && (
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-white/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
                  +{gigsMissingThisStep.length - 4}
                </span>
              )}
            </div>
          </div>
          {STEP_CONTINUE_TARGET[currentStepId] && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  // If exactly one gig still needs this step, deep-link
                  // straight to it so the destination panel auto-selects
                  // that gig in its dropdown.
                  getContinueTarget(
                    currentStepId,
                    gigsMissingThisStep.length === 1
                      ? gigsMissingThisStep[0]._id
                      : undefined
                  )
                )
              }
              className="hidden shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-orange-600 active:scale-95 sm:inline-flex"
              title={t('gigDetails.setupBanner.continue', {
                label: stepDef.label,
              })}
            >
              {t('gigDetails.setupBanner.continueBtn')}
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/dashboard/gigs')}
            className="hidden shrink-0 items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-50 sm:inline-flex"
            title={t('gigDetails.setupBanner.viewAll', {
              defaultValue: 'View all',
            })}
          >
            {t('gigDetails.setupBanner.viewAll', { defaultValue: 'View all' })}
            <ArrowRight className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-lg border border-amber-200 bg-white/70 p-1 text-amber-700 transition-colors hover:bg-white hover:text-amber-900"
            aria-label={t('gigDetails.setupBanner.dismiss', {
              defaultValue: 'Dismiss',
            })}
            title={t('gigDetails.setupBanner.dismiss', {
              defaultValue: 'Dismiss',
            })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 px-4 py-3 shadow-sm shadow-amber-100/40 animate-in slide-in-from-bottom-2 fade-in duration-500"
    >
      {/* Banner header — compact: icon + one-line title + dismiss */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow shadow-amber-500/30">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-amber-900">
            {t('gigDetails.setupBanner.title')}
          </h2>
          <p className="text-[10px] font-bold leading-snug text-amber-800/70">
            {t('opsDashboard.setupChecklist.pendingGigs', {
              count: pendingGigs.length,
              defaultValue:
                pendingGigs.length > 1
                  ? '{{count}} gigs awaiting setup before activation.'
                  : '{{count}} gig awaiting setup before activation.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg border border-amber-200 bg-white/70 p-1 text-amber-700 transition-colors hover:bg-white hover:text-amber-900"
          aria-label={t('gigDetails.setupBanner.dismiss', {
            defaultValue: 'Dismiss',
          })}
          title={t('gigDetails.setupBanner.dismiss', { defaultValue: 'Dismiss' })}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* One row per pending gig — collapsed by default; the 7-tile grid is
          only revealed when the rep clicks the chevron. Keeps the banner
          one-line-per-gig in the common case while still letting power
          users drill into the full sequential checklist if needed. */}
      <div className="relative z-10 mt-2.5 space-y-1.5">
        {pendingGigs.map((gig) => {
          const status = gigStepStatus[gig._id];
          const isProbing = !status;
          const missing = checklist.filter((s) => !(status && status[s.id]));
          const completedCount = checklist.length - missing.length;
          const progressPct = Math.round((completedCount / checklist.length) * 100);
          // Default = collapsed so the banner stays compact. The rep
          // expands a card only if they want the full step grid.
          const isCollapsed = collapsedGigs[gig._id] ?? true;
          // Sequential gating: only the first non-done step is actionable.
          // Later pending steps are shown as locked so the rep follows the
          // intended order (Telephony → Contacts → Script → KB → REP
          // Onboarding → Sessions → Gig Activation).
          const nextActionableStepId = missing[0]?.id;
          const nextStep =
            nextActionableStepId != null
              ? checklist.find((s) => s.id === nextActionableStepId)
              : null;

          return (
            <div
              key={gig._id}
              className="rounded-xl border border-amber-200/70 bg-white px-3 py-2 shadow-sm"
            >
              {/* Single-line gig row: status pill · title · progress · next-step
                  shortcut · expand/collapse chevron. Everything stays on one
                  row at sm+ so the banner footprint is tiny by default. */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-700"
                  title={normalizeGigStatus(gig.status)}
                >
                  {normalizeGigStatus(gig.status)}
                </span>
                <h3
                  className="truncate text-[12px] font-black text-slate-800"
                  title={gig.title}
                >
                  {gig.title || gig._id}
                </h3>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
                  <span className="hidden sm:inline">
                    {isProbing
                      ? t('opsDashboard.setupChecklist.checking', {
                          defaultValue: 'Checking…',
                        })
                      : `${completedCount}/${checklist.length}`}
                  </span>
                  <span className="h-1 w-16 overflow-hidden rounded-full bg-amber-100">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700 ease-out"
                      style={{ width: isProbing ? '15%' : `${progressPct}%` }}
                    />
                  </span>
                  <span>{isProbing ? '…' : `${progressPct}%`}</span>
                </span>
                {nextStep && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(getContinueTarget(nextStep.id, gig._id))
                    }
                    className="hidden shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-sm shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-orange-600 active:scale-95 sm:inline-flex"
                    title={t('gigDetails.setupBanner.continue', {
                      label: nextStep.label,
                    })}
                  >
                    <span className="max-w-[120px] truncate">{nextStep.label}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleCollapse(gig._id)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white p-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Per-gig step list — only rendered when the rep expands the
                  card (the row above is already actionable thanks to the
                  inline "Next step" Continue button). */}
              {!isCollapsed && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {checklist.map((step) => {
                    const Icon = step.icon;
                    const done = !!(status && status[step.id]);
                    const targetPath = getContinueTarget(step.id, gig._id);
                    const isNext = !done && step.id === nextActionableStepId;
                    const isLocked = !done && !isNext;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all ${
                          done
                            ? 'border-emerald-100 bg-emerald-50/80'
                            : isNext
                            ? 'border-amber-300 bg-amber-50/70 shadow-sm shadow-amber-200/40 ring-1 ring-amber-200'
                            : 'border-slate-100 bg-slate-50/50 opacity-70'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                            done
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : isLocked
                              ? 'bg-slate-100 text-slate-400 border-slate-200'
                              : toneStyles[step.tone]
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isLocked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Icon className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`truncate text-[11px] font-black uppercase tracking-wider ${
                              done
                                ? 'text-emerald-700'
                                : isLocked
                                ? 'text-slate-500'
                                : 'text-slate-800'
                            }`}
                          >
                            {step.label}
                          </div>
                          <div
                            className={`text-[9px] font-bold uppercase tracking-wider ${
                              done
                                ? 'text-emerald-500/80'
                                : isLocked
                                ? 'text-slate-400'
                                : 'text-amber-600'
                            }`}
                          >
                            {done
                              ? t('gigDetails.setupBanner.completed')
                              : isLocked
                              ? t('gigDetails.setupBanner.locked', {
                                  defaultValue: 'Locked',
                                })
                              : t('gigDetails.setupBanner.next', {
                                  defaultValue: 'Next',
                                })}
                          </div>
                        </div>
                        {isNext && targetPath && (
                          <button
                            type="button"
                            onClick={() => navigate(targetPath)}
                            className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-sm shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-orange-600 active:scale-95"
                            title={t('gigDetails.setupBanner.continue', {
                              label: step.label,
                            })}
                          >
                            {t('gigDetails.setupBanner.continueBtn')}
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GigSetupChecklist;
