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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
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

/** SessionStorage key used to remember the rep dismissed the banner.
 *  Tied to a signature that combines the pending gig IDs + their current
 *  statuses — as soon as a status changes (or a new gig is added) the
 *  signature is invalidated and the banner re-appears automatically. */
const DISMISS_STORAGE_KEY = 'harx:gigSetupChecklist:dismissed';

function readDismissedSignature(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDismissedSignature(sig: string | null): void {
  try {
    if (sig === null) sessionStorage.removeItem(DISMISS_STORAGE_KEY);
    else sessionStorage.setItem(DISMISS_STORAGE_KEY, sig);
  } catch {
    // Storage may be disabled (private mode) — degrade silently.
  }
}

/** Step id → in-dashboard route. Keeps the rep inside the shell. */
const STEP_DASHBOARD_PATH: Record<number, string> = {
  4: '/dashboard/telephony',
  5: '/dashboard/leads',
  6: '/dashboard/script-generator',
  8: '/dashboard/knowledge-base',
  9: '/dashboard/training',
  10: '/dashboard/scheduler',
  12: '/dashboard/gig-activation',
};

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

export default function GigSetupChecklist({ gigs: gigsProp }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const companyId = Cookies.get('companyId') || '';
  const userId = Cookies.get('userId') || localStorage.getItem('userId') || '';

  const [fetchedGigs, setFetchedGigs] = useState<MinimalGig[] | null>(null);
  /** gigId → { stepId → done }. Populated by `probeGigSetup` once per gig. */
  const [gigStepStatus, setGigStepStatus] = useState<Record<string, Record<number, boolean>>>({});
  /** Toggle to collapse/expand individual gig cards. Default = expanded. */
  const [collapsedGigs, setCollapsedGigs] = useState<Record<string, boolean>>({});
  /** Session-scoped dismissal — see DISMISS_STORAGE_KEY. */
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(
    () => readDismissedSignature()
  );

  // Fetch gigs only when the parent didn't already inject them.
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
  }, [companyId, gigsProp]);

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
    writeDismissedSignature(dismissSignature);
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
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, userId, pendingGigIdsKey]);

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

  const toggleCollapse = (gigId: string) =>
    setCollapsedGigs((prev) => ({ ...prev, [gigId]: !prev[gigId] }));

  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-5 sm:p-6 shadow-md shadow-amber-100/40 animate-in slide-in-from-bottom-2 fade-in duration-500"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Banner header */}
      <div className="relative z-10 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">
            {t('gigDetails.setupBanner.title')}
          </h2>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800/80">
            {t('opsDashboard.setupChecklist.pendingGigs', {
              count: pendingGigs.length,
              defaultValue:
                pendingGigs.length > 1
                  ? '{{count}} gigs awaiting setup to activate.'
                  : '{{count}} gig awaiting setup to activate.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-xl border border-amber-200 bg-white/70 p-1.5 text-amber-700 transition-colors hover:bg-white hover:text-amber-900"
          aria-label={t('gigDetails.setupBanner.dismiss', {
            defaultValue: 'Dismiss',
          })}
          title={t('gigDetails.setupBanner.dismiss', { defaultValue: 'Dismiss' })}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* One card per pending gig */}
      <div className="relative z-10 mt-4 space-y-3">
        {pendingGigs.map((gig) => {
          const status = gigStepStatus[gig._id];
          const isProbing = !status;
          const missing = checklist.filter((s) => !(status && status[s.id]));
          const completedCount = checklist.length - missing.length;
          const progressPct = Math.round((completedCount / checklist.length) * 100);
          const isCollapsed = collapsedGigs[gig._id] ?? false;
          // Sequential gating: only the first non-done step is actionable.
          // Later pending steps are shown as locked so the rep follows the
          // intended order (Telephony → Contacts → Script → KB → REP
          // Onboarding → Sessions → Gig Activation).
          const nextActionableStepId = missing[0]?.id;

          return (
            <div
              key={gig._id}
              className="rounded-2xl border border-amber-200/70 bg-white p-4 shadow-sm"
            >
              {/* Gig header row */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex shrink-0 items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700">
                      {normalizeGigStatus(gig.status)}
                    </span>
                    <h3
                      className="truncate text-[13px] font-black text-slate-800"
                      title={gig.title}
                    >
                      {gig.title || gig._id}
                    </h3>
                  </div>
                  {/* Per-gig progress bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-amber-700">
                      <span>
                        {isProbing
                          ? t('opsDashboard.setupChecklist.checking', {
                              defaultValue: 'Checking…',
                            })
                          : t('gigDetails.setupBanner.progress', {
                              done: completedCount,
                              total: checklist.length,
                            })}
                      </span>
                      <span>{isProbing ? '…' : `${progressPct}%`}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700 ease-out"
                        style={{ width: isProbing ? '15%' : `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleCollapse(gig._id)}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Per-gig step list */}
              {!isCollapsed && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {checklist.map((step) => {
                    const Icon = step.icon;
                    const done = !!(status && status[step.id]);
                    const targetPath = STEP_DASHBOARD_PATH[step.id];
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
}
