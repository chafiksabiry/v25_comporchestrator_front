/**
 * GigSetupChecklist
 *
 * Per-gig setup warning. For every gig that is still pending activation
 * (status `to_activate` / `pending` / `draft`) we render its own card
 * listing only the steps that are missing FOR THAT SPECIFIC GIG — not
 * the company-wide tracker. Each missing step has a "Continue" button
 * that navigates inside the dashboard shell (no orchestrator redirect).
 *
 * Per-step source of truth:
 *   • 4  Telephony          → `/phone-numbers` filtered by gigId
 *   • 5  Upload Contacts    → `/leads/.../has-leads?gigId=`
 *   • 6  Call Script        → `/rag/scripts?gigId=`
 *   • 8  Knowledge Base     → `/documents?gigId=`
 *   • 9  REP Onboarding     → company-wide tracker (no per-gig endpoint)
 *   • 10 Session Planning   → `gig.availability.schedule.length > 0`
 *   • 12 Gig Activation     → `gig.status === 'active'`
 *   • 13 Match HARX Reps    → company-wide tracker
 *
 * Used by:
 *   - `OperationsDashboard` (Dashboard home)
 *   - `GigDetails` (Gigs panel)
 */

import React, { useEffect, useMemo, useState } from 'react';
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
  Phone,
  Rocket,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  getCompletedStepsFromStorage,
  syncOnboardingProgressFromApi,
} from '../../../hooks/useStepGuide';

/** Step id → in-dashboard route. Keeps the rep inside the shell. */
const STEP_DASHBOARD_PATH: Record<number, string> = {
  4: '/dashboard/telephony',
  5: '/dashboard/leads',
  6: '/dashboard/script-generator',
  8: '/dashboard/knowledge-base',
  9: '/dashboard/training',
  10: '/dashboard/scheduler',
  12: '/dashboard/gig-activation',
  13: '/dashboard/rep-matching',
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

/** Check the 4 API-backed steps for a single gig. Steps 9, 10, 12, 13
 *  are derived locally (status + availability + company tracker). */
async function probeGigSetup(
  gig: MinimalGig,
  companyId: string,
  userId: string,
  phoneNumbersByGig: Record<string, boolean>,
  companyDoneSteps: number[]
): Promise<Record<number, boolean>> {
  const gigId = gig._id;
  const isActive = normalizeGigStatus(gig.status) === 'active';

  // Local-only checks (no network round-trip).
  const localDone: Record<number, boolean> = {
    9: companyDoneSteps.includes(9) || isActive,
    10: (gig.availability?.schedule?.length ?? 0) > 0,
    12: isActive,
    13: companyDoneSteps.includes(13) || isActive,
  };

  // Telephony — feed from the pre-fetched phone-numbers map.
  const telephonyDone = !!phoneNumbersByGig[gigId];

  // Run network checks in parallel.
  const [contactsDone, scriptDone, kbDone] = await Promise.all([
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
  ]);

  return {
    4: telephonyDone || isActive,
    5: contactsDone || isActive,
    6: scriptDone || isActive,
    8: kbDone || isActive,
    ...localDone,
  };
}

export default function GigSetupChecklist({ gigs: gigsProp }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const companyId = Cookies.get('companyId') || '';
  const userId = Cookies.get('userId') || localStorage.getItem('userId') || '';

  const [fetchedGigs, setFetchedGigs] = useState<MinimalGig[] | null>(null);
  const [companyDoneSteps, setCompanyDoneSteps] = useState<number[]>(() =>
    getCompletedStepsFromStorage()
  );
  /** gigId → { stepId → done }. Populated by `probeGigSetup` once per gig. */
  const [gigStepStatus, setGigStepStatus] = useState<Record<string, Record<number, boolean>>>({});
  /** Toggle to collapse/expand individual gig cards. Default = expanded. */
  const [collapsedGigs, setCollapsedGigs] = useState<Record<string, boolean>>({});

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

  // Refresh the company-wide tracker for the steps we can't verify per-gig
  // (REP Onboarding, Match HARX Reps).
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const steps = await syncOnboardingProgressFromApi(companyId);
        if (!cancelled) setCompanyDoneSteps(steps);
      } catch {
        // keep the local fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

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
          probeGigSetup(g, companyId, userId, phoneByGig, companyDoneSteps)
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
  }, [companyId, userId, pendingGigIdsKey, companyDoneSteps]);

  const checklist = useMemo(
    () => [
      { id: 4, label: t('gigDetails.setupBanner.steps.telephony'), icon: Phone, tone: 'sky' as const },
      { id: 5, label: t('gigDetails.setupBanner.steps.uploadContacts'), icon: Users, tone: 'indigo' as const },
      { id: 6, label: t('gigDetails.setupBanner.steps.callScript'), icon: FileText, tone: 'violet' as const },
      { id: 8, label: t('gigDetails.setupBanner.steps.knowledgeBase'), icon: BookOpen, tone: 'amber' as const },
      { id: 9, label: t('gigDetails.setupBanner.steps.repOnboarding'), icon: UserCheck, tone: 'rose' as const },
      { id: 10, label: t('gigDetails.setupBanner.steps.sessionPlanning'), icon: Calendar, tone: 'teal' as const },
      { id: 12, label: t('gigDetails.setupBanner.steps.gigActivation'), icon: Rocket, tone: 'emerald' as const },
      { id: 13, label: t('gigDetails.setupBanner.steps.matchReps'), icon: Sparkles, tone: 'purple' as const },
    ],
    [t]
  );

  if (pendingGigs.length === 0) return null;

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
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all ${
                          done
                            ? 'border-emerald-100 bg-emerald-50/80'
                            : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-sm'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                            done
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : toneStyles[step.tone]
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Icon className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`truncate text-[11px] font-black uppercase tracking-wider ${
                              done ? 'text-emerald-700' : 'text-slate-700'
                            }`}
                          >
                            {step.label}
                          </div>
                          <div
                            className={`text-[9px] font-bold uppercase tracking-wider ${
                              done ? 'text-emerald-500/80' : 'text-slate-400'
                            }`}
                          >
                            {done
                              ? t('gigDetails.setupBanner.completed')
                              : t('gigDetails.setupBanner.pending')}
                          </div>
                        </div>
                        {!done && targetPath && (
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
