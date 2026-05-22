/**
 * GigSetupChecklist
 *
 * Reusable warning banner that surfaces orchestrator steps still required
 * before a gig can go live (telephony, contacts, script, KB, e-learning,
 * session planning, gig activation, REP matching). Used in two places:
 *
 *  1. `OperationsDashboard` (Dashboard home) — alerts the rep as soon as
 *     they land on the dashboard that they still have setup to finish.
 *  2. `GigDetails` (Gigs list) — duplicated inline there for legacy reasons
 *     but this component is meant to gradually become the single source.
 *
 * Behaviour:
 *  - Hidden when there is no pending gig OR no missing setup step.
 *  - Each pending step has a "Continue" button that navigates inside the
 *    dashboard shell (no orchestrator wizard redirect).
 *  - Excludes the Subscription Plan (step 11) — billing is non-blocking.
 *  - Re-syncs progress from `/onboarding-progress` so the banner stays in
 *    sync when the rep finishes a step in another tab.
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
}

interface Props {
  /** Inject gigs from a parent fetch to skip the duplicate request. */
  gigs?: MinimalGig[];
  /** Compact layout (smaller padding, icon, fewer columns). */
  compact?: boolean;
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

export default function GigSetupChecklist({ gigs: gigsProp, compact }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const companyId = Cookies.get('companyId');

  const [fetchedGigs, setFetchedGigs] = useState<MinimalGig[] | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>(() =>
    getCompletedStepsFromStorage()
  );

  // Fetch gigs only when the parent didn't already inject them.
  useEffect(() => {
    if (gigsProp || !companyId) return;
    let cancelled = false;
    const apiUrl =
      (import.meta as any).env?.VITE_GIGS_API ||
      (import.meta as any).env?.VITE_API_URL_GIGS ||
      'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/gigs/company/${companyId}?populate=companyId`);
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];
        if (!cancelled) setFetchedGigs(list);
      } catch {
        // Silent fail — widget just hides if we can't reach the API.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, gigsProp]);

  // Pull latest onboarding progress from the API. Falls back to the local
  // copy when offline (see useStepGuide.syncOnboardingProgressFromApi).
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const steps = await syncOnboardingProgressFromApi(companyId);
        if (!cancelled) setCompletedSteps(steps);
      } catch {
        // ignore — fall back to whatever's already in state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

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

  const allGigs = gigsProp ?? fetchedGigs ?? [];
  const pendingGigs = useMemo(
    () => allGigs.filter((g) => isGigPendingActivation(g.status)),
    [allGigs]
  );

  // A pending gig logically means step 12 (Gig Activation) is still not
  // done for that gig — even if the company-wide tracker reports it as
  // complete (because another gig was activated previously). Force-mark
  // it as missing so the rep always sees the "Continue" button.
  const effectiveCompletedSteps = useMemo(() => {
    if (pendingGigs.length === 0) return completedSteps;
    return completedSteps.filter((id) => id !== 12);
  }, [completedSteps, pendingGigs.length]);

  const missingSteps = useMemo(
    () => checklist.filter((s) => !effectiveCompletedSteps.includes(s.id)),
    [checklist, effectiveCompletedSteps]
  );

  if (pendingGigs.length === 0) return null;

  const completedCount = checklist.length - missingSteps.length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);

  const titleSize = compact ? 'text-sm' : 'text-base';
  const padding = compact ? 'p-5' : 'p-6 sm:p-7';
  const iconBoxSize = compact ? 'h-10 w-10' : 'h-12 w-12';
  const stepIconBoxSize = compact ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <div
      role="status"
      className={`relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 ${padding} shadow-md shadow-amber-100/40 animate-in slide-in-from-bottom-2 fade-in duration-500`}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Title + progress */}
        <div className="flex items-start gap-4 lg:max-w-xs">
          <div
            className={`flex shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 ${iconBoxSize}`}
          >
            <AlertCircle className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
          </div>
          <div className="flex-1">
            <h2 className={`font-black uppercase tracking-wider text-amber-900 ${titleSize}`}>
              {t('gigDetails.setupBanner.title')}
            </h2>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-amber-800/80">
              {t('opsDashboard.setupChecklist.pendingGigs', {
                count: pendingGigs.length,
                defaultValue:
                  pendingGigs.length > 1
                    ? '{{count}} gigs awaiting setup to activate.'
                    : '{{count}} gig awaiting setup to activate.',
              })}
            </p>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-amber-700">
                <span>
                  {t('gigDetails.setupBanner.progress', {
                    done: completedCount,
                    total: checklist.length,
                  })}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Pending gig titles — gives the rep context on what's blocked. */}
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {pendingGigs.slice(0, 3).map((g) => (
                <li
                  key={g._id}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700"
                  title={g.title}
                >
                  <span className="max-w-[180px] truncate">{g.title || g._id}</span>
                </li>
              ))}
              {pendingGigs.length > 3 && (
                <li className="inline-flex items-center rounded-lg border border-amber-200 bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                  +{pendingGigs.length - 3}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Checklist grid */}
        <div
          className={`grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 ${
            compact ? 'xl:grid-cols-3' : 'xl:grid-cols-3'
          }`}
        >
          {checklist.map((step) => {
            const Icon = step.icon;
            const done = effectiveCompletedSteps.includes(step.id);
            const targetPath = STEP_DASHBOARD_PATH[step.id];
            const titleKey = done
              ? 'gigDetails.setupBanner.completedTitle'
              : 'gigDetails.setupBanner.pendingTitle';
            return (
              <div
                key={step.id}
                className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-all ${
                  done
                    ? 'border-emerald-100 bg-emerald-50/80'
                    : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-sm'
                }`}
                title={t(titleKey, { label: step.label })}
              >
                <div
                  className={`flex shrink-0 items-center justify-center rounded-xl border ${stepIconBoxSize} ${
                    done
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : toneStyles[step.tone]
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
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
                    className={`text-[10px] font-bold uppercase tracking-wider ${
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
                    className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-md hover:shadow-amber-500/40 active:scale-95"
                    title={t('gigDetails.setupBanner.continue', { label: step.label })}
                  >
                    {t('gigDetails.setupBanner.continueBtn')}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
