import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Phone,
  Voicemail,
  PhoneOff,
  ShieldAlert,
  Clock,
  Users,
  PhoneCall,
  Trophy,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ChevronRight,
  Database,
  PhoneIncoming,
  CheckCircle2,
  BatteryLow,
  Hourglass,
  Repeat,
  ShieldCheck,
  ListChecks,
  CalendarClock,
  Star,
  TrendingUp,
  XCircle,
  PieChart,
  Activity,
  GraduationCap,
  Mail,
  Sparkles,
  Plus,
  Minus,
  Calculator,
  ChevronDown,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart, Doughnut } from 'react-chartjs-2';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// Idempotent: other dashboards already register the same scales, registering
// again is a no-op so it's safe to keep it co-located with the chart.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

/** Base URL for call analytics (`v25_dash_calls_backend`). */
function getCallsApiBase(): string | null {
  const raw =
    (import.meta as any).env?.VITE_API_URL_CALL ||
    (import.meta as any).env?.VITE_DASHBOARD_API;
  if (!raw) return null;
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

function todayIsoRange(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: new Date().toISOString() };
}

function monthIsoRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: start.toISOString(), to: now.toISOString() };
}

function gigQuery(gigId: string): string {
  return gigId && gigId !== 'all' ? `gigId=${encodeURIComponent(gigId)}&` : '';
}

function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}m`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}j`;
}

function initialsOf(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

type AnalyticsOverview = {
  totals: {
    total: number;
    serious: number;
    fraud: number;
    voicemail: number;
    unreachable: number;
    avgDuration: number;
  };
  statuses: Array<{ outcome: string; count: number }>;
  series7d: Array<{ date: string; total: number; serious: number; transactions: number }>;
};

type AnalyticsOutcome = { outcome: string; count: number; pct: number };

type AnalyticsRep = {
  userId: string;
  name: string;
  total: number;
  transaction: number;
  appointment: number;
  callbacks: number;
  argued: number;
  refusal: number;
  serious: number;
  validByAIPct: number;
  avgScore: number;
};

type RecentCallApi = {
  _id: string;
  createdAt?: string;
  duration?: number;
  outcome?: string;
  score?: number | null;
  repName?: string | null;
  leadName?: string | null;
};

type CallbacksStats = { today: number; week: number; appointmentsConfirmed: number };

/** Map persisted / derived callOutcome → UI tag on recent-call rows. */
function outcomeTag(
  outcome: string | null | undefined,
  t: TFunction
): RecentCall['tag'] | undefined {
  if (!outcome) return undefined;
  const map: Record<string, RecentCall['tag']> = {
    transaction: { label: t('opsDashboard.tags.transaction', 'transaction'), tone: 'emerald' },
    appointment: { label: t('opsDashboard.tags.appointment', 'RDV fixé'), tone: 'violet' },
    callback_requested: { label: t('opsDashboard.tags.callbackJ2', 'rappel'), tone: 'amber' },
    fraud: { label: t('opsDashboard.tags.fraud', 'fraude'), tone: 'rose' },
    voicemail: {
      label: t('opsDashboard.statuses.voicemail', 'messagerie vocale'),
      tone: 'slate',
    },
    no_answer: {
      label: t('opsDashboard.statuses.unreachable', 'injoignable').toLowerCase(),
      tone: 'amber',
    },
    busy: {
      label: t('opsDashboard.statuses.unreachable', 'injoignable').toLowerCase(),
      tone: 'amber',
    },
    wrong_number: { label: t('opsDashboard.statuses.wrongNumber', 'faux numéro'), tone: 'rose' },
    argued_interested: { label: t('opsDashboard.results.issues.argued', 'Argumenté'), tone: 'emerald' },
    refusal: { label: t('opsDashboard.results.issues.refusal', 'Refus'), tone: 'rose' },
    not_interested: { label: t('opsDashboard.results.issues.notInterested', 'Pas intéressé'), tone: 'amber' },
    already_insured: {
      label: t('opsDashboard.results.issues.alreadyInsured', 'Déjà assuré'),
      tone: 'slate',
    },
  };
  return map[outcome];
}

type TabId = 'overview' | 'leads' | 'calls' | 'results' | 'team' | 'wallet';

interface StatusBucket {
  key: string;
  label: string;
  count: number;
  pct: number;
  /** Tailwind class for the progress fill. */
  bar: string;
  /** Tailwind class for the leading dot. */
  dot: string;
  /** Tailwind class for the small left-side pill tone. */
  pill: string;
}

interface RecentCall {
  score: number | null;
  agent: string;
  lead: string;
  meta: string;
  tag?: { label: string; tone: 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' };
  when: string;
}

/** Operations-style dashboard. Replaces the old analytics view at /dashboard/main.
 *  Layout follows the product mock: wallet alert banner + section tabs +
 *  6 KPI tiles + statuses panel + recent calls panel + MTD analysis grid. */
export default function OperationsDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('overview');
  // Friendly greeting: use the user's first name if we can find one. Falls
  // back to "there" when nothing is stored yet (e.g. a fresh login).
  const userName = useMemo(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('userFullName')) || '';
    const first = stored.trim().split(/\s+/)[0];
    return first || t('opsDashboard.header.fallbackName', 'there');
  }, [t]);

  // ----- Gig selector (real data) -----
  // Persist the last picked gig so the dashboard remembers it between visits.
  const [gigs, setGigs] = useState<Array<{ _id: string; title: string }>>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('opsDashboard.selectedGigId')) || 'all';
  });
  const [gigDropdownOpen, setGigDropdownOpen] = useState(false);
  const gigDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const companyId = Cookies.get('companyId');
    if (!companyId) return;
    const gigsApiUrl =
      (import.meta as any).env?.VITE_GIGS_API ||
      (import.meta as any).env?.VITE_API_URL_GIGS ||
      'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
    (async () => {
      try {
        const res = await fetch(`${gigsApiUrl}/gigs/company/${companyId}?populate=companyId`);
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setGigs(list);
        // If a previously remembered gig is no longer in the list, fall back to "all".
        const stored = localStorage.getItem('opsDashboard.selectedGigId');
        if (stored && stored !== 'all' && !list.find((g: any) => g._id === stored)) {
          setSelectedGigId('all');
        }
      } catch {
        // ignore — header shows the i18n default name when nothing is fetched
      }
    })();
  }, []);

  // Close the dropdown when the user clicks elsewhere or presses Escape.
  useEffect(() => {
    if (!gigDropdownOpen) return;
    const onMouse = (e: MouseEvent) => {
      if (gigDropdownRef.current && !gigDropdownRef.current.contains(e.target as Node)) {
        setGigDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGigDropdownOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [gigDropdownOpen]);

  const selectedGig = useMemo(
    () => gigs.find((g) => g._id === selectedGigId) || null,
    [gigs, selectedGigId]
  );

  const selectedGigLabel = selectedGig
    ? selectedGig.title
    : selectedGigId === 'all'
    ? t('opsDashboard.header.allGigs', 'Tous les gigs')
    : t('opsDashboard.header.gigName', 'Digital Assurance — Mutuelles Santé');

  const handlePickGig = (id: string) => {
    setSelectedGigId(id);
    localStorage.setItem('opsDashboard.selectedGigId', id);
    setGigDropdownOpen(false);
  };

  // ----- Lead stats (KPIs + quality + attempts breakdown) -----
  type LeadStats = {
    total: number;
    called: number;
    contacted: number;
    exhausted: number;
    avgAttempts: number;
    coveragePct: number;
    reachablePct: number;
    quality: {
      valid: { count: number; pct: number };
      unreachable: { count: number; pct: number };
      wrong: { count: number; pct: number };
      notInterested: { count: number; pct: number };
      notAware: { count: number; pct: number };
      alreadyInsured: { count: number; pct: number };
    };
    qualityScorePct: number;
    attemptDistribution: {
      one: { count: number; pct: number };
      two: { count: number; pct: number };
      three: { count: number; pct: number };
      four: { count: number; pct: number };
      fivePlus: { count: number; pct: number };
    };
  };
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);

  // ----- Per-rep coverage (Leads view → "Progression de couverture") -----
  type RepCoverageRow = {
    userId: string;
    name: string;
    current: number;
    target: number;
    pct: number;
  };
  const [repCoverage, setRepCoverage] = useState<RepCoverageRow[] | null>(null);

  useEffect(() => {
    const companyId = Cookies.get('companyId');
    if (!companyId) return;
    const dashboardBase = (import.meta as any).env?.VITE_DASHBOARD_API;
    if (!dashboardBase) return;

    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: '8' });
        if (selectedGigId && selectedGigId !== 'all') {
          params.set('gigId', selectedGigId);
        }
        const url = `${dashboardBase}/leads/company/${companyId}/rep-coverage?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success || !Array.isArray(json.reps)) return;
        setRepCoverage(
          json.reps.map((r: any) => ({
            userId: String(r.userId ?? ''),
            name: typeof r.name === 'string' ? r.name : 'Rep',
            current: Number(r.current) || 0,
            target: Number(r.target) || 0,
            pct: Number(r.pct) || 0,
          }))
        );
      } catch {
        // ignore — fall back to mock list on failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGigId]);

  useEffect(() => {
    const companyId = Cookies.get('companyId');
    if (!companyId) return;
    const dashboardBase = (import.meta as any).env?.VITE_DASHBOARD_API;
    if (!dashboardBase) return;

    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedGigId && selectedGigId !== 'all') {
          params.set('gigId', selectedGigId);
        }
        const qs = params.toString();
        const url = `${dashboardBase}/leads/company/${companyId}/stats${qs ? `?${qs}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success) return;
        if (
          typeof json.total === 'number' &&
          typeof json.called === 'number'
        ) {
          // Re-compute ratios from raw counts so we keep precision —
          // the backend pre-rounds which would collapse very small ratios
          // (e.g. 2 / 7041 = 0.0284%) to "0".
          const contacted =
            typeof json.contacted === 'number' ? json.contacted : 0;
          const exhausted =
            typeof json.exhausted === 'number' ? json.exhausted : 0;
          const avgAttempts =
            typeof json.avgAttempts === 'number' ? json.avgAttempts : 0;
          const coveragePct =
            json.total > 0 ? (json.called / json.total) * 100 : 0;
          const reachablePct =
            json.called > 0 ? (contacted / json.called) * 100 : 0;

          // Normalise the quality buckets — fall back to zero objects so
          // the UI never crashes on a partial response.
          const blank = { count: 0, pct: 0 };
          const q = json.quality || {};
          const quality = {
            valid: q.valid || blank,
            unreachable: q.unreachable || blank,
            wrong: q.wrong || blank,
            notInterested: q.notInterested || blank,
            notAware: q.notAware || blank,
            alreadyInsured: q.alreadyInsured || blank,
          };
          const qualityScorePct =
            typeof json.qualityScorePct === 'number'
              ? json.qualityScorePct
              : quality.valid.pct;

          const ad = json.attemptDistribution || {};
          const attemptDistribution = {
            one: ad.one || blank,
            two: ad.two || blank,
            three: ad.three || blank,
            four: ad.four || blank,
            fivePlus: ad.fivePlus || blank,
          };

          setLeadStats({
            total: json.total,
            called: json.called,
            contacted,
            exhausted,
            avgAttempts,
            coveragePct,
            reachablePct,
            quality,
            qualityScorePct,
            attemptDistribution,
          });
        }
      } catch {
        // ignore — Leads view keeps showing the previous (or placeholder) value
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGigId]);

  // ----- Call analytics (v25_dash_calls_backend) -----
  const [overviewToday, setOverviewToday] = useState<AnalyticsOverview | null>(null);
  const [overviewMonth, setOverviewMonth] = useState<AnalyticsOverview | null>(null);
  const [recentCallsApi, setRecentCallsApi] = useState<RecentCallApi[] | null>(null);
  const [outcomesMonth, setOutcomesMonth] = useState<{
    total: number;
    outcomes: AnalyticsOutcome[];
  } | null>(null);
  const [repsMonth, setRepsMonth] = useState<AnalyticsRep[] | null>(null);
  const [callbacksStats, setCallbacksStats] = useState<CallbacksStats | null>(null);

  useEffect(() => {
    const companyId = Cookies.get('companyId');
    const base = getCallsApiBase();
    if (!companyId || !base) return;

    let cancelled = false;
    const gq = gigQuery(selectedGigId);
    const today = todayIsoRange();
    const month = monthIsoRange();

    (async () => {
      try {
        const [ovToday, ovMonth, recent, outcomes, reps, cb] = await Promise.all([
          fetch(
            `${base}/calls/company/${companyId}/analytics/overview?${gq}from=${encodeURIComponent(today.from)}&to=${encodeURIComponent(today.to)}`
          ),
          fetch(
            `${base}/calls/company/${companyId}/analytics/overview?${gq}from=${encodeURIComponent(month.from)}&to=${encodeURIComponent(month.to)}`
          ),
          fetch(`${base}/calls/company/${companyId}/analytics/recent?${gq}limit=8`),
          fetch(
            `${base}/calls/company/${companyId}/analytics/outcomes?${gq}from=${encodeURIComponent(month.from)}&to=${encodeURIComponent(month.to)}`
          ),
          fetch(
            `${base}/calls/company/${companyId}/analytics/reps?${gq}from=${encodeURIComponent(month.from)}&to=${encodeURIComponent(month.to)}&limit=12`
          ),
          fetch(
            `${base}/calls/company/${companyId}/analytics/callbacks${
              selectedGigId && selectedGigId !== 'all'
                ? `?gigId=${encodeURIComponent(selectedGigId)}`
                : ''
            }`
          ),
        ]);

        if (cancelled) return;

        if (ovToday.ok) {
          const j = await ovToday.json();
          if (j.success && j.totals) {
            setOverviewToday({
              totals: j.totals,
              statuses: j.statuses || [],
              series7d: j.series7d || [],
            });
          }
        }
        if (ovMonth.ok) {
          const j = await ovMonth.json();
          if (j.success && j.totals) {
            setOverviewMonth({
              totals: j.totals,
              statuses: j.statuses || [],
              series7d: j.series7d || [],
            });
          }
        }
        if (recent.ok) {
          const j = await recent.json();
          if (j.success && Array.isArray(j.calls)) setRecentCallsApi(j.calls);
        }
        if (outcomes.ok) {
          const j = await outcomes.json();
          if (j.success && Array.isArray(j.outcomes)) {
            setOutcomesMonth({ total: j.total ?? 0, outcomes: j.outcomes });
          }
        }
        if (reps.ok) {
          const j = await reps.json();
          if (j.success && Array.isArray(j.reps)) setRepsMonth(j.reps);
        }
        if (cb.ok) {
          const j = await cb.json();
          if (j.success) {
            setCallbacksStats({
              today: j.today ?? 0,
              week: j.week ?? 0,
              appointmentsConfirmed: j.appointmentsConfirmed ?? 0,
            });
          }
        }
      } catch {
        // keep mock fallbacks
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGigId]);

  const stats = useMemo(() => {
    const MOCK = {
      total: 247,
      serious: 189,
      voicemail: 34,
      unreachable: 17,
      fraud: 2,
      avgDurationSec: 4 * 60 + 12,
    };
    const t = overviewToday?.totals;
    const total = t?.total ?? MOCK.total;
    const serious = t?.serious ?? MOCK.serious;
    const voicemail = t?.voicemail ?? MOCK.voicemail;
    const unreachable = t?.unreachable ?? MOCK.unreachable;
    const fraud = t?.fraud ?? MOCK.fraud;
    const avgDurationSec = t?.avgDuration ?? MOCK.avgDurationSec;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

    return {
      total,
      serious,
      voicemail,
      unreachable,
      fraud,
      avgDurationSec,
      pctSerious: pct(serious),
      pctVoicemail: pct(voicemail),
      pctUnreachable: pct(unreachable),
    };
  }, [overviewToday]);

  const countByOutcome = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of overviewToday?.statuses ?? []) {
      if (s.outcome) m[s.outcome] = s.count;
    }
    return m;
  }, [overviewToday]);

  const statuses: StatusBucket[] = useMemo(() => {
    const pct = (n: number) =>
      stats.total > 0 ? Math.round((n / stats.total) * 1000) / 10 : 0;
    const wrong = countByOutcome.wrong_number ?? 0;
    const hangup = countByOutcome.too_short ?? 0;

    return [
      {
        key: 'serious',
        label: t('opsDashboard.statuses.serious', 'Sérieux — argumenté'),
        count: stats.serious,
        pct: stats.pctSerious,
        bar: 'bg-emerald-500',
        dot: 'bg-emerald-500',
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      {
        key: 'voicemail',
        label: t('opsDashboard.statuses.voicemail', 'Messagerie vocale'),
        count: stats.voicemail,
        pct: stats.pctVoicemail,
        bar: 'bg-slate-400',
        dot: 'bg-slate-400',
        pill: 'bg-slate-100 text-slate-600 border-slate-200',
      },
      {
        key: 'unreachable',
        label: t('opsDashboard.statuses.unreachable', 'Injoignable'),
        count: stats.unreachable,
        pct: stats.pctUnreachable,
        bar: 'bg-amber-400',
        dot: 'bg-amber-400',
        pill: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      {
        key: 'wrong-number',
        label: t('opsDashboard.statuses.wrongNumber', 'Faux numéro'),
        count: wrong,
        pct: pct(wrong),
        bar: 'bg-rose-400',
        dot: 'bg-rose-400',
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      {
        key: 'fraud',
        label: t('opsDashboard.statuses.fraud', 'Fraude'),
        count: stats.fraud,
        pct: pct(stats.fraud),
        bar: 'bg-rose-600',
        dot: 'bg-rose-600',
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      {
        key: 'hangup',
        label: t('opsDashboard.statuses.hangup', 'Raccrochage immédiat'),
        count: hangup,
        pct: pct(hangup),
        bar: 'bg-slate-300',
        dot: 'bg-slate-300',
        pill: 'bg-slate-100 text-slate-500 border-slate-200',
      },
    ];
  }, [stats, countByOutcome, t]);

  const MOCK_RECENT: RecentCall[] = [
    {
      score: 92,
      agent: 'Karima A.',
      lead: 'M. Dupont',
      meta: '5m43s',
      tag: { label: t('opsDashboard.tags.transaction', 'transaction'), tone: 'emerald' },
      when: '2m',
    },
    {
      score: 78,
      agent: 'Younes O.',
      lead: 'Mme Martin',
      meta: '3m12s',
      tag: { label: t('opsDashboard.tags.callbackJ2', 'rappel J+2'), tone: 'amber' },
      when: '5m',
    },
  ];

  const recentCalls: RecentCall[] = useMemo(() => {
    if (!recentCallsApi?.length) return MOCK_RECENT;
    return recentCallsApi.map((c) => {
      const dur = c.duration ?? 0;
      const m = Math.floor(dur / 60);
      const s = dur % 60;
      const meta =
        dur > 0
          ? `${m}m${s.toString().padStart(2, '0')}s${c.score != null ? ` · ${Math.round(c.score)}%` : ''}`
          : '';
      return {
        score: c.score ?? null,
        agent: c.repName || t('opsDashboard.recent.unknownRep', 'Rep'),
        lead: (c.leadName || '').trim() || t('opsDashboard.recent.unknownLead', 'Lead'),
        meta,
        tag: outcomeTag(c.outcome, t),
        when: timeAgo(c.createdAt),
      };
    });
  }, [recentCallsApi, t]);

  const mtd = useMemo(() => {
    const mt = overviewMonth?.totals;
    const monthOutcomes: Record<string, number> = {};
    for (const s of overviewMonth?.statuses ?? []) {
      if (s.outcome) monthOutcomes[s.outcome] = s.count;
    }
    return {
      voicemail: mt?.voicemail ?? 0,
      unreachable: mt?.unreachable ?? 0,
      wrongNumber: monthOutcomes.wrong_number ?? 0,
      callbacksToday: callbacksStats?.today ?? 0,
    };
  }, [overviewMonth, callbacksStats]);

  // ────────────────────────────────────────────────────────────────────
  //  Vue globale — derived KPIs & deltas
  //  - `transactionsToday`: outcomes-bucket lookup (single source of truth)
  //  - `vsYesterdayPct`:    self-comparison from the analyzer 7-day series
  //  - `qualityScore`:      avg validByAIPct across reps (proxy until the
  //                         backend exposes a dedicated company-quality KPI)
  //  All fields gracefully fall back to `null` when data is missing so the
  //  KPI cards can render a "—" without crashing.
  // ────────────────────────────────────────────────────────────────────
  const overviewExtras = useMemo(() => {
    const transactionsToday = countByOutcome.transaction ?? 0;
    const conversionPct =
      stats.total > 0 ? (transactionsToday / stats.total) * 100 : 0;

    const series = overviewToday?.series7d ?? [];
    let vsYesterdayPct: number | null = null;
    if (series.length >= 2) {
      const today = series[series.length - 1]?.total ?? 0;
      const yest = series[series.length - 2]?.total ?? 0;
      if (yest > 0) vsYesterdayPct = ((today - yest) / yest) * 100;
      else if (today > 0) vsYesterdayPct = 100; // 0 → N transitions
    }

    // Quality score = mean of per-rep validByAIPct (each already a 0–100).
    // We use month data so a single bad/good morning doesn't swing the KPI.
    let qualityScore: number | null = null;
    if (repsMonth && repsMonth.length > 0) {
      const sum = repsMonth.reduce((acc, r) => acc + (r.validByAIPct || 0), 0);
      qualityScore = Math.round(sum / repsMonth.length);
    }

    return { transactionsToday, conversionPct, vsYesterdayPct, qualityScore };
  }, [countByOutcome, stats.total, overviewToday, repsMonth]);

  // ────────────────────────────────────────────────────────────────────
  //  "Résultats d'appels (aujourd'hui)" — donut chart data.
  //  We collapse the raw `callOutcome` enum into 8 user-facing buckets
  //  (transaction, RDV, argumenté, rappel, refus, msg vocale, injoignable,
  //  faux numéro). Each bucket has a stable colour so legend ↔ slice ↔
  //  underlying bar charts stay visually consistent across the dashboard.
  // ────────────────────────────────────────────────────────────────────
  const outcomeBuckets = useMemo(() => {
    const c = countByOutcome;
    const buckets = [
      { key: 'transaction', label: t('opsDashboard.overview.donut.transaction', 'Transaction'), color: '#10b981', count: c.transaction ?? 0 },
      { key: 'appointment', label: t('opsDashboard.overview.donut.appointment', 'RDV'),         color: '#8b5cf6', count: c.appointment ?? 0 },
      { key: 'argued',      label: t('opsDashboard.overview.donut.argued', 'Argumenté'),        color: '#3b82f6', count: c.argued_interested ?? 0 },
      { key: 'callback',    label: t('opsDashboard.overview.donut.callback', 'Rappel'),         color: '#f59e0b', count: c.callback_requested ?? 0 },
      { key: 'refusal',     label: t('opsDashboard.overview.donut.refusal', 'Refus'),           color: '#ef4444', count: (c.refusal ?? 0) + (c.not_interested ?? 0) + (c.already_insured ?? 0) },
      { key: 'voicemail',   label: t('opsDashboard.overview.donut.voicemail', 'Msg vocale'),    color: '#14b8a6', count: c.voicemail ?? 0 },
      { key: 'unreachable', label: t('opsDashboard.overview.donut.unreachable', 'Injoignable'), color: '#94a3b8', count: (c.no_answer ?? 0) + (c.busy ?? 0) + (c.too_short ?? 0) },
      { key: 'wrong',       label: t('opsDashboard.overview.donut.wrongNumber', 'Faux numéro'), color: '#f9a8d4', count: c.wrong_number ?? 0 },
    ];
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    return buckets.map((b) => ({
      ...b,
      pct: total > 0 ? Math.round((b.count / total) * 1000) / 10 : 0,
    }));
  }, [countByOutcome, t]);

  const donutHasData = outcomeBuckets.some((b) => b.count > 0);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('opsDashboard.tabs.overview', 'Vue globale'), icon: <BarChart3 size={14} /> },
    { id: 'leads', label: t('opsDashboard.tabs.leads', 'Leads'), icon: <Users size={14} /> },
    { id: 'calls', label: t('opsDashboard.tabs.calls', 'Appels'), icon: <PhoneCall size={14} /> },
    { id: 'results', label: t('opsDashboard.tabs.results', 'Résultats'), icon: <BarChart3 size={14} /> },
    { id: 'team', label: t('opsDashboard.tabs.team', 'Équipe'), icon: <Trophy size={14} /> },
    { id: 'wallet', label: t('opsDashboard.tabs.wallet', 'Wallet'), icon: <Wallet size={14} /> },
  ];

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12 animate-in fade-in duration-500">
      {/* ---------- Brand header ---------- */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t('opsDashboard.header.welcome', { name: userName, defaultValue: 'Welcome, {{name}}' })}
          </h1>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t('opsDashboard.header.live', 'Live')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div ref={gigDropdownRef} className="relative">
            <button
              onClick={() => setGigDropdownOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-[12px] font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 ${
                gigDropdownOpen ? 'border-harx-500 ring-1 ring-harx-500/20' : 'border-slate-200'
              }`}
              aria-haspopup="listbox"
              aria-expanded={gigDropdownOpen}
            >
              <span className="truncate max-w-[260px]">{selectedGigLabel}</span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${
                  gigDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {gigDropdownOpen && (
              <div className="absolute right-0 z-30 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t('opsDashboard.header.pickGig', 'Sélectionner un gig')}
                </div>
                <ul className="max-h-[320px] overflow-y-auto py-1" role="listbox">
                  <li>
                    <button
                      onClick={() => handlePickGig('all')}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-bold transition-colors hover:bg-slate-50 ${
                        selectedGigId === 'all' ? 'bg-harx-500/10 text-harx-700' : 'text-slate-700'
                      }`}
                      role="option"
                      aria-selected={selectedGigId === 'all'}
                    >
                      <span>{t('opsDashboard.header.allGigs', 'Tous les gigs')}</span>
                      {selectedGigId === 'all' && (
                        <CheckCircle2 size={14} className="text-harx-500" />
                      )}
                    </button>
                  </li>
                  {gigs.length === 0 ? (
                    <li className="px-3 py-3 text-center text-[11px] font-medium italic text-slate-400">
                      {t('opsDashboard.header.noGigs', 'Aucun gig disponible')}
                    </li>
                  ) : (
                    gigs.map((g) => (
                      <li key={g._id}>
                        <button
                          onClick={() => handlePickGig(g._id)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-bold transition-colors hover:bg-slate-50 ${
                            selectedGigId === g._id ? 'bg-harx-500/10 text-harx-700' : 'text-slate-700'
                          }`}
                          role="option"
                          aria-selected={selectedGigId === g._id}
                          title={g.title}
                        >
                          <span className="truncate">{g.title}</span>
                          {selectedGigId === g._id && (
                            <CheckCircle2 size={14} className="shrink-0 text-harx-500" />
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Section tabs ---------- */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tabItem) => {
          const active = tab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={active ? 'text-white' : 'text-slate-500'}>{tabItem.icon}</span>
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {/* ---------- Tab content ---------- */}
      {tab === 'leads' ? (
        <LeadsView
          leadStats={leadStats}
          repCoverage={repCoverage}
          callbacksStats={callbacksStats}
        />
      ) : tab === 'results' ? (
        <ResultsView
          outcomes={outcomesMonth}
          reps={repsMonth}
          seriousToday={stats.serious}
        />
      ) : tab === 'team' ? (
        <TeamView reps={repsMonth} />
      ) : tab === 'wallet' ? (
        <WalletView />
      ) : tab === 'calls' ? (
        // ── "Appels" tab keeps the legacy call-centric layout. ────────────
        <CallsView
          stats={stats}
          statuses={statuses}
          recentCalls={recentCalls}
          mtd={mtd}
          series7d={overviewToday?.series7d ?? null}
          fmtDuration={fmtDuration}
        />
      ) : (
        // ── "Vue globale" — top-level KPIs + coverage + outcomes donut. ───
        <OverviewView
          stats={stats}
          leadStats={leadStats}
          transactionsToday={overviewExtras.transactionsToday}
          conversionPct={overviewExtras.conversionPct}
          vsYesterdayPct={overviewExtras.vsYesterdayPct}
          qualityScore={overviewExtras.qualityScore}
          outcomeBuckets={outcomeBuckets}
          donutHasData={donutHasData}
          series7d={overviewToday?.series7d ?? null}
          onSeeLeads={() => setTab('leads')}
          onSeeResults={() => setTab('results')}
        />
      )}
    </div>
  );
}

/* ---------------- Leads view ---------------- */

interface LeadQuality {
  key: string;
  label: string;
  pct: number;
  leads: number;
  tone: 'emerald' | 'amber' | 'rose';
}

interface AttemptBucket {
  label: string;
  leads: number;
  pct: number;
  /** Tailwind class for the colored bar */
  bar: string;
  /** Tailwind class for the right-hand count text */
  textTone?: string;
}

interface RepCoverage {
  initials: string;
  name: string;
  current: number;
  target: number;
  /** Tailwind class for the bar fill */
  bar: string;
  /** Tailwind class for the avatar background */
  avatar: string;
  /** Optional warning marker (e.g. red triangle for under-performers) */
  warn?: boolean;
}

type LeadStatsProp = {
  total: number;
  called: number;
  contacted: number;
  exhausted: number;
  avgAttempts: number;
  coveragePct: number;
  reachablePct: number;
  quality: {
    valid: { count: number; pct: number };
    unreachable: { count: number; pct: number };
    wrong: { count: number; pct: number };
    notInterested: { count: number; pct: number };
    notAware: { count: number; pct: number };
    alreadyInsured: { count: number; pct: number };
  };
  qualityScorePct: number;
  attemptDistribution: {
    one: { count: number; pct: number };
    two: { count: number; pct: number };
    three: { count: number; pct: number };
    four: { count: number; pct: number };
    fivePlus: { count: number; pct: number };
  };
};

function LeadsView({
  leadStats,
  repCoverage,
  callbacksStats,
}: {
  leadStats: LeadStatsProp | null;
  repCoverage:
    | { userId: string; name: string; current: number; target: number; pct: number }[]
    | null;
  callbacksStats: CallbacksStats | null;
}) {
  const { t } = useTranslation();
  // Mock baseline used until the real stats land. Keeps the page presentable
  // for first-paint and for demo accounts that don't have data yet.
  const MOCK_TOTAL = 12450;
  const MOCK_CALLED = 8466;
  const MOCK_CONTACTED = 5830;
  const MOCK_EXHAUSTED = 812;
  const MOCK_AVG_ATTEMPTS = 2.1;
  const MOCK_COVERAGE = 68;
  const MOCK_REACHABLE = 47;

  const baseCount = leadStats?.total ?? MOCK_TOTAL;
  const calledCount = leadStats?.called ?? MOCK_CALLED;
  const contactedCount = leadStats?.contacted ?? MOCK_CONTACTED;
  const exhaustedCount = leadStats?.exhausted ?? MOCK_EXHAUSTED;
  const avgAttempts = leadStats?.avgAttempts ?? MOCK_AVG_ATTEMPTS;
  const coveragePct = leadStats?.coveragePct ?? MOCK_COVERAGE;
  const reachablePct = leadStats?.reachablePct ?? MOCK_REACHABLE;

  // "2.1x" with one decimal — but show an integer when the value is whole
  // (e.g. "3x" not "3.0x") to stay readable.
  const avgAttemptsLabel =
    Number.isInteger(avgAttempts)
      ? `${avgAttempts}x`
      : `${avgAttempts.toFixed(1)}x`;

  const baseLabel =
    leadStats === null
      ? t('opsDashboard.leads.kpi.totalBaseSub', 'leads uploadés')
      : t('opsDashboard.leads.kpi.totalBaseSubReal', 'leads en base');

  // Smart-format the percentage so small ratios stay visible:
  // ≥10 → integer (e.g. "68"), ≥1 → 1 decimal (e.g. "4.2"),
  // ≥0.01 → 2 decimals (e.g. "0.03"), else 4 decimals (e.g. "0.0008").
  const fmtPct = (p: number): string => {
    if (!Number.isFinite(p) || p === 0) return '0';
    if (p >= 10) return p.toFixed(0);
    if (p >= 1) return p.toFixed(1);
    if (p >= 0.01) return p.toFixed(2);
    return p.toFixed(4);
  };
  const calledSub = t('opsDashboard.leads.kpi.calledOnceSub', {
    pct: fmtPct(coveragePct),
    defaultValue: '{{pct}}% couverture',
  });
  const contactedSub = t('opsDashboard.leads.kpi.contactedSub', {
    pct: fmtPct(reachablePct),
    defaultValue: '{{pct}}% joignables',
  });

  // Base-quality buckets: pull straight from the backend when available,
  // otherwise show the mock numbers so the layout never breaks.
  const MOCK_QUALITY = {
    valid: { count: 8516, pct: 68.4 },
    unreachable: { count: 1531, pct: 12.3 },
    wrong: { count: 511, pct: 4.1 },
    notInterested: { count: 1083, pct: 8.7 },
    notAware: { count: 398, pct: 3.2 },
    alreadyInsured: { count: 411, pct: 3.3 },
  };
  const q = leadStats?.quality ?? MOCK_QUALITY;
  const qualityScorePct = leadStats?.qualityScorePct ?? MOCK_QUALITY.valid.pct;

  const qualities: LeadQuality[] = [
    {
      key: 'valid',
      label: t('opsDashboard.leads.quality.valid', 'VALIDES JOIGNABLES'),
      pct: q.valid.pct,
      leads: q.valid.count,
      tone: 'emerald',
    },
    {
      key: 'unreachable',
      label: t('opsDashboard.leads.quality.unreachable', 'INJOIGNABLES'),
      pct: q.unreachable.pct,
      leads: q.unreachable.count,
      tone: 'amber',
    },
    {
      key: 'wrong',
      label: t('opsDashboard.leads.quality.wrong', 'FAUX NUMÉROS'),
      pct: q.wrong.pct,
      leads: q.wrong.count,
      tone: 'rose',
    },
    {
      key: 'notInterested',
      label: t('opsDashboard.leads.quality.notInterested', 'PAS INTÉRESSÉS'),
      pct: q.notInterested.pct,
      leads: q.notInterested.count,
      tone: 'amber',
    },
    {
      key: 'notAware',
      label: t('opsDashboard.leads.quality.notAware', 'PAS AU COURANT'),
      pct: q.notAware.pct,
      leads: q.notAware.count,
      tone: 'amber',
    },
    {
      key: 'alreadyInsured',
      label: t('opsDashboard.leads.quality.alreadyInsured', 'DÉJÀ ASSURÉS'),
      pct: q.alreadyInsured.pct,
      leads: q.alreadyInsured.count,
      tone: 'amber',
    },
  ];

  // Attempt distribution — real data from the backend; mock fallback keeps
  // the layout populated while waiting for data or on demo accounts.
  const MOCK_AD = {
    one:      { count: 3124, pct: 37 },
    two:      { count: 2810, pct: 33 },
    three:    { count: 1520, pct: 18 },
    four:     { count: 1000, pct: 12 },
    fivePlus: { count: 812,  pct: 6.5 },
  };
  const ad = leadStats?.attemptDistribution ?? MOCK_AD;

  const attempts: AttemptBucket[] = [
    {
      label: t('opsDashboard.leads.attempts.one', '1 tentative'),
      leads: ad.one.count,
      pct: ad.one.pct,
      bar: 'bg-harx-500',
    },
    {
      label: t('opsDashboard.leads.attempts.two', '2 tentatives'),
      leads: ad.two.count,
      pct: ad.two.pct,
      bar: 'bg-harx-400',
    },
    {
      label: t('opsDashboard.leads.attempts.three', '3 tentatives'),
      leads: ad.three.count,
      pct: ad.three.pct,
      bar: 'bg-harx-300',
    },
    {
      label: t('opsDashboard.leads.attempts.four', '4 tentatives'),
      leads: ad.four.count,
      pct: ad.four.pct,
      bar: 'bg-blue-500',
    },
    {
      label: t('opsDashboard.leads.attempts.five', '≥5 tentatives (épuisés)'),
      leads: ad.fivePlus.count,
      pct: ad.fivePlus.pct,
      bar: 'bg-rose-500',
      textTone: 'text-rose-600',
    },
  ];

  // Rep coverage — real backend data when available, mock otherwise. Colors
  // cycle through a fixed palette so reps stay visually distinguishable even
  // when the list is long.
  const REP_PALETTE: { bar: string; avatar: string }[] = [
    { bar: 'bg-harx-500', avatar: 'bg-harx-500/15 text-harx-700' },
    { bar: 'bg-blue-500', avatar: 'bg-blue-500/15 text-blue-700' },
    { bar: 'bg-emerald-500', avatar: 'bg-emerald-500/15 text-emerald-700' },
    { bar: 'bg-amber-500', avatar: 'bg-amber-500/15 text-amber-700' },
    { bar: 'bg-rose-500', avatar: 'bg-rose-500/15 text-rose-700' },
    { bar: 'bg-violet-500', avatar: 'bg-violet-500/15 text-violet-700' },
    { bar: 'bg-cyan-500', avatar: 'bg-cyan-500/15 text-cyan-700' },
    { bar: 'bg-fuchsia-500', avatar: 'bg-fuchsia-500/15 text-fuchsia-700' },
  ];

  const initialsOf = (full: string): string => {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  };

  const MOCK_REPS: RepCoverage[] = [
    { initials: 'KA', name: 'Karima A.', current: 1050, target: 1250, bar: 'bg-harx-500', avatar: 'bg-harx-500/15 text-harx-700' },
    { initials: 'YO', name: 'Younes O.', current: 887, target: 1250, bar: 'bg-blue-500', avatar: 'bg-blue-500/15 text-blue-700' },
    { initials: 'SB', name: 'Sara B.', current: 788, target: 1250, bar: 'bg-emerald-500', avatar: 'bg-emerald-500/15 text-emerald-700' },
    { initials: 'AM', name: 'Amine M.', current: 675, target: 1250, bar: 'bg-amber-500', avatar: 'bg-amber-500/15 text-amber-700' },
    { initials: 'HB', name: 'Hassan B.', current: 388, target: 1250, bar: 'bg-rose-500', avatar: 'bg-rose-500/15 text-rose-700', warn: true },
  ];

  const reps: RepCoverage[] =
    repCoverage && repCoverage.length > 0
      ? repCoverage.map((r, idx) => {
          const palette = REP_PALETTE[idx % REP_PALETTE.length]!;
          return {
            initials: initialsOf(r.name),
            name: r.name,
            current: r.current,
            target: r.target,
            bar: palette.bar,
            avatar: palette.avatar,
            // Flag clearly under-performing reps (<35% of fair-share target)
            warn: r.target > 0 && r.current / r.target < 0.35,
          };
        })
      : MOCK_REPS;

  return (
    <>
      {/* ---------- Leads KPI cards ---------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          tone="primary"
          icon={<Database size={14} />}
          label={t('opsDashboard.leads.kpi.totalBase', 'Base totale')}
          value={baseCount.toLocaleString('fr-FR')}
          sub={baseLabel}
        />
        <KpiCard
          tone="default"
          icon={<PhoneIncoming size={14} className="text-harx-500" />}
          label={t('opsDashboard.leads.kpi.calledOnce', 'Appelés ≥1x')}
          value={calledCount.toLocaleString('fr-FR')}
          sub={calledSub}
        />
        <KpiCard
          tone="default"
          icon={<CheckCircle2 size={14} className="text-emerald-500" />}
          label={t('opsDashboard.leads.kpi.contacted', 'Contactés')}
          value={contactedCount.toLocaleString('fr-FR')}
          sub={contactedSub}
        />
        <KpiCard
          tone="dark"
          icon={<BatteryLow size={14} />}
          label={t('opsDashboard.leads.kpi.exhausted', 'Épuisés')}
          value={exhaustedCount.toLocaleString('fr-FR')}
          sub={t('opsDashboard.leads.kpi.exhaustedSub', '>5 tentatives')}
        />
        <KpiCard
          tone="default"
          icon={<Hourglass size={14} className="text-slate-500" />}
          label={t('opsDashboard.leads.kpi.remaining', 'Reste à appeler')}
          value="3,984"
          sub={t('opsDashboard.leads.kpi.remainingSub', '~8 jours restants')}
        />
        <KpiCard
          tone="default"
          icon={<Repeat size={14} className="text-blue-500" />}
          label={t('opsDashboard.leads.kpi.avgAttempts', 'Moy. tentatives')}
          value={avgAttemptsLabel}
          sub={t('opsDashboard.leads.kpi.avgAttemptsSub', 'par lead appelé')}
        />
      </div>

      {/* ---------- Quality of base + Attempt distribution ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Qualité de la base */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <ShieldCheck size={14} className="text-harx-500" />
              {t('opsDashboard.leads.qualityTitle', 'Qualité de la base')}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('opsDashboard.leads.scoredCallsSuite', 'suite appels scorés')}
            </span>
          </header>

          <div className="grid grid-cols-2 gap-3">
            {qualities.map((q) => {
              const { key, ...rest } = q;
              return <QualityTile key={key} {...rest} />;
            })}
          </div>

          {/* Warning footer — green ≥75%, amber otherwise. */}
          {(() => {
            const isHealthy = qualityScorePct >= 75;
            const wrapCls = isHealthy
              ? 'mt-4 flex items-start gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2.5 text-emerald-900'
              : 'mt-4 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-amber-900';
            const iconCls = isHealthy
              ? 'mt-0.5 shrink-0 text-emerald-600'
              : 'mt-0.5 shrink-0 text-amber-600';
            const head = t('opsDashboard.leads.qualityScoreHead', {
              pct: fmtPct(qualityScorePct),
              defaultValue: 'Score qualité base : {{pct}}%',
            });
            const body = isHealthy
              ? t(
                  'opsDashboard.leads.qualityHealthyBody',
                  'au-dessus du seuil recommandé (75%). Votre base est saine.'
                )
              : t(
                  'opsDashboard.leads.qualityWarningBody',
                  'en dessous du seuil recommandé (75%). Envisager un nettoyage ou un nouvel upload.'
                );
            return (
              <div className={wrapCls}>
                {isHealthy ? (
                  <CheckCircle2 size={14} className={iconCls} />
                ) : (
                  <AlertTriangle size={14} className={iconCls} />
                )}
                <p className="text-[11px] font-medium leading-snug">
                  <span className="font-black">{head}</span> — {body}
                </p>
              </div>
            );
          })()}
        </section>

        {/* Distribution tentatives + Rappels programmés */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
            <ListChecks size={14} className="text-harx-500" />
            {t('opsDashboard.leads.attemptsTitle', 'Distribution tentatives')}
          </header>

          <div className="space-y-3">
            {attempts.map((a, idx) => (
              <div key={idx}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-700">{a.label}</span>
                  <span className={`text-[12px] font-black tabular-nums ${a.textTone || 'text-slate-900'}`}>
                    {a.leads.toLocaleString('fr-FR')} {t('opsDashboard.leads.leads', 'leads')}{' '}
                    <span className="text-slate-400 font-bold">({fmtPct(a.pct)}%)</span>
                  </span>
                </div>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${a.bar} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.max(2, Math.min(100, a.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Rappels programmés */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <header className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
              <CalendarClock size={14} className="text-harx-500" />
              {t('opsDashboard.leads.callbacksTitle', 'Rappels programmés')}
            </header>
            <ul className="space-y-2">
              <li className="flex items-center justify-between py-1.5">
                <span className="text-[12px] font-bold text-slate-700">
                  {t('opsDashboard.leads.callbackToday', "À rappeler aujourd'hui")}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-black tabular-nums text-slate-900">
                    {(callbacksStats?.today ?? 0).toLocaleString('fr-FR')}
                  </span>
                  {(callbacksStats?.today ?? 0) > 0 && (
                    <Tag tone="rose">{t('opsDashboard.leads.urgent', 'urgent')}</Tag>
                  )}
                </span>
              </li>
              <li className="flex items-center justify-between py-1.5">
                <span className="text-[12px] font-bold text-slate-700">
                  {t('opsDashboard.leads.callbackWeek', 'Cette semaine')}
                </span>
                <span className="text-sm font-black tabular-nums text-slate-900">
                  {(callbacksStats?.week ?? 0).toLocaleString('fr-FR')}
                </span>
              </li>
              <li className="flex items-center justify-between py-1.5">
                <span className="text-[12px] font-bold text-slate-700">
                  {t('opsDashboard.leads.appointmentsConfirmed', 'RDV confirmés')}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-black tabular-nums text-slate-900">
                    {(callbacksStats?.appointmentsConfirmed ?? 0).toLocaleString('fr-FR')}
                  </span>
                  {(callbacksStats?.appointmentsConfirmed ?? 0) > 0 && (
                    <Tag tone="emerald">{t('opsDashboard.leads.active', 'actifs')}</Tag>
                  )}
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* ---------- Coverage progression per rep ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
          <Trophy size={14} className="text-harx-500" />
          {t('opsDashboard.leads.coverageTitle', 'Progression de couverture — par rep')}
        </header>

        <ul className="space-y-3">
          {reps.length === 0 && (
            <li className="text-[12px] italic text-slate-400">
              {t('opsDashboard.leads.noReps', 'Aucun rep n’a encore appelé.')}
            </li>
          )}
          {reps.map((rep, idx) => {
            const pct =
              rep.target > 0
                ? Math.round((rep.current / rep.target) * 100)
                : 0;
            return (
              <li key={`${rep.name}-${idx}`} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${rep.avatar}`}
                >
                  {rep.initials}
                </span>
                <span className="w-24 shrink-0 truncate text-[12px] font-bold text-slate-800">
                  {rep.name}
                </span>
                <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${rep.bar} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                  />
                </div>
                <span
                  className={`shrink-0 text-[11px] font-black tabular-nums ${
                    rep.warn ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {rep.current.toLocaleString('fr-FR')}/{rep.target.toLocaleString('fr-FR')} ({pct}%)
                  {rep.warn && <AlertTriangle size={11} className="ml-1 inline-block text-rose-500" />}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function QualityTile({
  label,
  pct,
  leads,
  tone,
}: {
  label: string;
  pct: number;
  leads: number;
  tone: 'emerald' | 'amber' | 'rose';
}) {
  const valueColor = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  }[tone];
  const dotColor = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-black leading-none ${valueColor}`}>{pct}%</div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500">
          {leads.toLocaleString('fr-FR')} leads
        </span>
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      </div>
    </div>
  );
}

/* ---------------- Results view ---------------- */

interface IssueBucket {
  label: string;
  count: number;
  pct: number;
  tone: 'emerald' | 'rose' | 'violet' | 'amber' | 'blue';
}

interface RepIssueRow {
  name: string;
  transaction: number;
  rdv: number;
  rappel: number;
  argumente: number;
  refus: number;
  convPct: number;
  warn?: boolean;
  nameTone?: 'harx' | 'slate' | 'rose';
  convTone?: 'emerald' | 'amber' | 'rose';
}

const RESULT_ISSUE_DEFS: Array<{
  outcome: string;
  labelKey: string;
  defaultLabel: string;
  tone: IssueBucket['tone'];
}> = [
  { outcome: 'transaction', labelKey: 'opsDashboard.results.issues.transactionDone', defaultLabel: 'Transaction aboutie', tone: 'emerald' },
  { outcome: 'appointment', labelKey: 'opsDashboard.results.issues.appointment', defaultLabel: 'RDV fixé', tone: 'violet' },
  { outcome: 'callback_requested', labelKey: 'opsDashboard.results.issues.callback', defaultLabel: 'Rappel demandé', tone: 'amber' },
  { outcome: 'argued_interested', labelKey: 'opsDashboard.results.issues.argued', defaultLabel: 'Argumenté (intéressé)', tone: 'emerald' },
  { outcome: 'refusal', labelKey: 'opsDashboard.results.issues.refusal', defaultLabel: 'Refus catégorique', tone: 'rose' },
  { outcome: 'not_interested', labelKey: 'opsDashboard.results.issues.notInterested', defaultLabel: 'Pas intéressé', tone: 'amber' },
  { outcome: 'already_insured', labelKey: 'opsDashboard.results.issues.alreadyInsured', defaultLabel: 'Déjà assuré', tone: 'blue' },
  { outcome: 'connected_no_sale', labelKey: 'opsDashboard.results.issues.transactionFailed', defaultLabel: 'Transaction non aboutie', tone: 'rose' },
];

function ResultsView({
  outcomes,
  reps,
  seriousToday,
}: {
  outcomes: { total: number; outcomes: AnalyticsOutcome[] } | null;
  reps: AnalyticsRep[] | null;
  seriousToday: number;
}) {
  const { t } = useTranslation();

  const byOutcome = useMemo(() => {
    const m: Record<string, AnalyticsOutcome> = {};
    for (const o of outcomes?.outcomes ?? []) m[o.outcome] = o;
    return m;
  }, [outcomes]);

  const issues: IssueBucket[] = useMemo(() => {
    const MOCK: IssueBucket[] = [
      { label: t('opsDashboard.results.issues.transactionDone', 'Transaction aboutie'), count: 23, pct: 12.2, tone: 'emerald' },
      { label: t('opsDashboard.results.issues.appointment', 'RDV fixé'), count: 15, pct: 7.9, tone: 'violet' },
      { label: t('opsDashboard.results.issues.callback', 'Rappel demandé'), count: 28, pct: 14.8, tone: 'amber' },
      { label: t('opsDashboard.results.issues.argued', 'Argumenté (intéressé)'), count: 34, pct: 18.0, tone: 'emerald' },
      { label: t('opsDashboard.results.issues.refusal', 'Refus catégorique'), count: 42, pct: 22.2, tone: 'rose' },
    ];
    if (!outcomes?.outcomes.length) return MOCK;
    return RESULT_ISSUE_DEFS.map((def) => {
      const row = byOutcome[def.outcome];
      return {
        label: t(def.labelKey, def.defaultLabel),
        count: row?.count ?? 0,
        pct: row?.pct ?? 0,
        tone: def.tone,
      };
    }).filter((i) => i.count > 0);
  }, [outcomes, byOutcome, t]);

  const repRows: RepIssueRow[] = useMemo(() => {
    const MOCK: RepIssueRow[] = [
      { name: 'Karima A.', transaction: 67, rdv: 18, rappel: 32, argumente: 41, refus: 89, convPct: 15.5, nameTone: 'harx', convTone: 'emerald' },
    ];
    if (!reps?.length) return MOCK;
    return reps.map((r, idx) => {
      const convPct =
        r.total > 0 ? Math.round((r.transaction / r.total) * 1000) / 10 : 0;
      const warn = convPct < 5 || r.avgScore < 50;
      return {
        name: r.name,
        transaction: r.transaction,
        rdv: r.appointment,
        rappel: r.callbacks,
        argumente: r.argued,
        refus: r.refusal,
        convPct,
        warn,
        nameTone: warn ? 'rose' : idx === 0 ? 'harx' : 'slate',
        convTone: convPct >= 12 ? 'emerald' : convPct >= 6 ? 'amber' : 'rose',
      };
    });
  }, [reps]);

  const count = (key: string) => byOutcome[key]?.count ?? 0;
  const pctSerious = (n: number) =>
    seriousToday > 0 ? ((n / seriousToday) * 100).toFixed(1) : '0';
  const pipelineHot = count('appointment') + count('callback_requested');

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          tone="primary"
          icon={<Star size={14} />}
          label={t('opsDashboard.results.kpi.transactions', 'Transactions')}
          value={count('transaction').toLocaleString('fr-FR')}
          sub={t('opsDashboard.results.kpi.transactionsSub', {
            pct: byOutcome.transaction?.pct?.toFixed(1) ?? '0',
            defaultValue: '{{pct}}% conv.',
          })}
        />
        <KpiCard
          tone="default"
          icon={<CalendarClock size={14} className="text-violet-500" />}
          label={t('opsDashboard.results.kpi.appointments', 'RDV fixés')}
          value={count('appointment').toLocaleString('fr-FR')}
          sub={t('opsDashboard.results.kpi.appointmentsSub', {
            pct: pctSerious(count('appointment')),
            defaultValue: '{{pct}}% des sérieux',
          })}
        />
        <KpiCard
          tone="default"
          icon={<Repeat size={14} className="text-amber-500" />}
          label={t('opsDashboard.results.kpi.callbacks', 'Rappels demandés')}
          value={count('callback_requested').toLocaleString('fr-FR')}
          sub={t('opsDashboard.results.kpi.callbacksSub', {
            pct: pctSerious(count('callback_requested')),
            defaultValue: '{{pct}}% des sérieux',
          })}
        />
        <KpiCard
          tone="default"
          icon={<CheckCircle2 size={14} className="text-emerald-500" />}
          label={t('opsDashboard.results.kpi.argued', 'Argumentés')}
          value={count('argued_interested').toLocaleString('fr-FR')}
          sub={t('opsDashboard.results.kpi.arguedSub', {
            pct: pctSerious(count('argued_interested')),
            defaultValue: '{{pct}}% des sérieux',
          })}
        />
        <KpiCard
          tone="dark"
          icon={<XCircle size={14} />}
          label={t('opsDashboard.results.kpi.refusals', 'Refus')}
          value={count('refusal').toLocaleString('fr-FR')}
          sub={t('opsDashboard.results.kpi.refusalsSub', {
            pct: pctSerious(count('refusal')),
            defaultValue: '{{pct}}% des sérieux',
          })}
        />
        <KpiCard
          tone="default"
          icon={<TrendingUp size={14} className="text-blue-500" />}
          label={t('opsDashboard.results.kpi.pipeline', 'Pipe potentiel')}
          value={pipelineHot.toLocaleString('fr-FR')}
          sub={t('opsDashboard.results.kpi.pipelineSub', 'RDV + rappels')}
        />
      </div>

      {/* Issues + visual breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Issues des appels sérieux */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <BarChart3 size={14} className="text-harx-500" />
              {t('opsDashboard.results.issuesTitle', 'Issues des appels sérieux')}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {seriousToday.toLocaleString('fr-FR')}{' '}
              {t('opsDashboard.results.callsToday', 'appels sérieux · aujourd\'hui')}
            </span>
          </header>

          <div className="grid grid-cols-2 gap-3">
            {issues.map((i, idx) => (
              <IssueTile key={idx} {...i} />
            ))}
          </div>
        </section>

        {/* Répartition visuelle */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
            <PieChart size={14} className="text-harx-500" />
            {t('opsDashboard.results.distributionTitle', 'Répartition visuelle')}
          </header>

          <div className="mb-5 flex items-center justify-center">
            <DonutChart segments={issues.map((i) => ({ pct: i.pct, tone: i.tone }))} />
          </div>

          <ul className="space-y-2 border-t border-slate-100 pt-3">
            <li className="flex items-center justify-between py-1.5 text-[12px]">
              <span className="font-bold text-slate-700">
                {t('opsDashboard.results.hotPipeline', 'Pipeline chaud (RDV + rappels)')}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-black tabular-nums text-slate-900">
                  {pipelineHot.toLocaleString('fr-FR')} leads
                </span>
                <Tag tone="emerald">{t('opsDashboard.results.toWork', 'à travailler')}</Tag>
              </span>
            </li>
            <li className="flex items-center justify-between py-1.5 text-[12px]">
              <span className="font-bold text-slate-700">
                {t('opsDashboard.results.refusalReopen', 'Taux de réouverture refus')}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-black tabular-nums text-slate-900">8.3%</span>
                <Tag tone="amber">{t('opsDashboard.results.low', 'faible')}</Tag>
              </span>
            </li>
            <li className="flex items-center justify-between py-1.5 text-[12px]">
              <span className="font-bold text-slate-700">
                {t('opsDashboard.results.signatureDelay', 'Délai moy. RDV → signature')}
              </span>
              <span className="font-black tabular-nums text-slate-900">
                2.4 {t('opsDashboard.results.days', 'jours')}
              </span>
            </li>
          </ul>
        </section>
      </div>

      {/* Issues par rep — table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Users size={14} className="text-harx-500" />
            {t('opsDashboard.results.byRepTitle', 'Issues par rep')}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('opsDashboard.results.thisMonth', 'ce mois')}
          </span>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-4 font-black">Rep</th>
                <th className="py-2 pr-4 font-black text-emerald-500">
                  {t('opsDashboard.results.table.transaction', 'Transaction')}
                </th>
                <th className="py-2 pr-4 font-black text-violet-500">RDV</th>
                <th className="py-2 pr-4 font-black text-amber-500">
                  {t('opsDashboard.results.table.callback', 'Rappel')}
                </th>
                <th className="py-2 pr-4 font-black text-blue-500">
                  {t('opsDashboard.results.table.argued', 'Argumenté')}
                </th>
                <th className="py-2 pr-4 font-black text-rose-500">
                  {t('opsDashboard.results.table.refusal', 'Refus')}
                </th>
                <th className="py-2 pr-0 font-black">Conv.%</th>
              </tr>
            </thead>
            <tbody>
              {repRows.map((r, idx) => {
                const nameColor =
                  r.nameTone === 'harx' ? 'text-harx-600' : r.nameTone === 'rose' ? 'text-rose-600' : 'text-slate-800';
                const convColor =
                  r.convTone === 'emerald' ? 'text-emerald-600' : r.convTone === 'amber' ? 'text-amber-600' : 'text-rose-600';
                return (
                  <tr key={idx} className="border-b border-slate-50 last:border-0">
                    <td className={`py-2.5 pr-4 font-bold ${nameColor}`}>{r.name}</td>
                    <td className="py-2.5 pr-4 font-black tabular-nums text-emerald-600">{r.transaction}</td>
                    <td className="py-2.5 pr-4 font-bold tabular-nums text-slate-700">{r.rdv}</td>
                    <td className="py-2.5 pr-4 font-bold tabular-nums text-slate-700">{r.rappel}</td>
                    <td className="py-2.5 pr-4 font-bold tabular-nums text-slate-700">{r.argumente}</td>
                    <td className="py-2.5 pr-4 font-bold tabular-nums text-slate-700">{r.refus}</td>
                    <td className={`py-2.5 pr-0 font-black tabular-nums ${convColor}`}>
                      {r.convPct.toFixed(1)}%
                      {r.warn && <AlertTriangle size={11} className="ml-1 inline-block text-rose-500" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function IssueTile({
  label,
  count,
  pct,
  tone,
}: {
  label: string;
  count: number;
  pct: number;
  tone: 'emerald' | 'rose' | 'violet' | 'amber' | 'blue';
}) {
  const tones: Record<string, { strip: string; value: string }> = {
    emerald: { strip: 'border-l-emerald-500', value: 'text-emerald-600' },
    rose: { strip: 'border-l-rose-500', value: 'text-rose-600' },
    violet: { strip: 'border-l-violet-500', value: 'text-violet-600' },
    amber: { strip: 'border-l-amber-500', value: 'text-amber-600' },
    blue: { strip: 'border-l-blue-500', value: 'text-blue-600' },
  };
  const c = tones[tone];

  return (
    <div className={`rounded-xl border-l-4 ${c.strip} border-y border-r border-slate-200 bg-slate-50/60 p-3`}>
      <div className="text-[11px] font-bold text-slate-700">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-xl font-black leading-none tabular-nums ${c.value}`}>{count}</span>
      </div>
      <div className="mt-0.5 text-[10px] font-bold text-slate-400 tabular-nums">{pct.toFixed(1)}%</div>
    </div>
  );
}

/** Minimalist SVG donut chart. Colored segments come from the same tone
 *  palette as the IssueTile so the visual is consistent with the cards. */
function DonutChart({ segments }: { segments: Array<{ pct: number; tone: string }> }) {
  const colors: Record<string, string> = {
    emerald: '#10b981',
    rose: '#ef4444',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    blue: '#3b82f6',
  };

  // Normalize so segments fill the ring (their percentages refer to the
  // serious-call total, not 100%, so we rescale them to a 360° ring).
  const total = segments.reduce((s, x) => s + x.pct, 0);
  const r = 60;
  const cx = 70;
  const cy = 70;
  let acc = 0;

  const polar = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  return (
    <svg viewBox="0 0 140 140" width="160" height="160" className="block">
      {segments.map((seg, idx) => {
        const start = (acc / total) * 360;
        acc += seg.pct;
        const end = (acc / total) * 360;
        const [sx, sy] = polar(start);
        const [ex, ey] = polar(end);
        const large = end - start > 180 ? 1 : 0;
        const d = `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
        return <path key={idx} d={d} fill={colors[seg.tone] || '#cbd5e1'} />;
      })}
      <circle cx={cx} cy={cy} r={32} fill="#ffffff" />
    </svg>
  );
}

/* ---------------- Team view ---------------- */

interface RepLeaderboard {
  rank: number;
  initials: string;
  name: string;
  score: number;
  convPct: number;
  leadsCovered: number;
  transactions: number;
  avatar: string;
  warn?: boolean;
}

const TEAM_PALETTE = [
  'bg-harx-500/15 text-harx-700',
  'bg-blue-500/15 text-blue-700',
  'bg-emerald-500/15 text-emerald-700',
  'bg-amber-500/15 text-amber-700',
  'bg-rose-500/15 text-rose-700',
];

function TeamView({ reps: repsApi }: { reps: AnalyticsRep[] | null }) {
  const { t } = useTranslation();

  const reps: RepLeaderboard[] = useMemo(() => {
    const MOCK: RepLeaderboard[] = [
      { rank: 1, initials: 'KA', name: 'Karima A.', score: 84, convPct: 15.5, leadsCovered: 1050, transactions: 67, avatar: TEAM_PALETTE[0]! },
    ];
    if (!repsApi?.length) return MOCK;
    const sorted = [...repsApi].sort((a, b) => b.transaction - a.transaction);
    return sorted.map((r, idx) => {
      const convPct = r.total > 0 ? Math.round((r.transaction / r.total) * 1000) / 10 : 0;
      const warn = r.avgScore < 50 || convPct < 5;
      return {
        rank: idx + 1,
        initials: initialsOf(r.name),
        name: r.name,
        score: Math.round(r.avgScore),
        convPct,
        leadsCovered: r.serious,
        transactions: r.transaction,
        avatar: TEAM_PALETTE[idx % TEAM_PALETTE.length]!,
        warn,
      };
    });
  }, [repsApi]);

  const teamKpis = useMemo(() => {
    const list = repsApi ?? [];
    const enrolled = list.length;
    const active = list.filter((r) => r.total > 0).length;
    const atRisk = list.filter((r) => r.avgScore < 50).length;
    const avgScore =
      enrolled > 0
        ? Math.round(list.reduce((s, r) => s + r.avgScore, 0) / enrolled)
        : 0;
    return { enrolled, active, atRisk, avgScore };
  }, [repsApi]);

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          tone="primary"
          icon={<Users size={14} />}
          label={t('opsDashboard.team.kpi.enrolled', 'Enrollés')}
          value={teamKpis.enrolled.toLocaleString('fr-FR')}
          sub={t('opsDashboard.team.kpi.enrolledSub', 'reps avec appels')}
        />
        <KpiCard
          tone="default"
          icon={<Activity size={14} className="text-emerald-500" />}
          label={t('opsDashboard.team.kpi.activeWeek', 'Actifs (MTD)')}
          value={teamKpis.active.toLocaleString('fr-FR')}
          sub={
            teamKpis.enrolled > 0
              ? `${Math.round((teamKpis.active / teamKpis.enrolled) * 100)}%`
              : '—'
          }
        />
        <KpiCard
          tone="default"
          icon={<GraduationCap size={14} className="text-blue-500" />}
          label={t('opsDashboard.team.kpi.lmsDone', 'LMS complété')}
          value="—"
          sub={t('opsDashboard.team.kpi.lmsPending', 'bientôt')}
        />
        <KpiCard
          tone="dark"
          icon={<AlertTriangle size={14} />}
          label={t('opsDashboard.team.kpi.atRisk', 'À risque')}
          value={teamKpis.atRisk.toLocaleString('fr-FR')}
          sub={t('opsDashboard.team.kpi.atRiskSub', 'score < 50')}
          subTone="rose"
        />
        <KpiCard
          tone="default"
          icon={<Sparkles size={14} className="text-amber-500" />}
          label={t('opsDashboard.team.kpi.avgScore', 'Score moyen')}
          value={`${teamKpis.avgScore}/100`}
          sub={t('opsDashboard.team.kpi.avgScoreSub', 'MTD')}
        />
        <KpiCard
          tone="default"
          icon={<Mail size={14} className="text-slate-500" />}
          label={t('opsDashboard.team.kpi.invitations', 'Invitations')}
          value="6"
          sub={t('opsDashboard.team.kpi.invitationsSub', 'en attente')}
        />
      </div>

      {/* Leaderboard */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
          <Trophy size={14} className="text-harx-500" />
          {t('opsDashboard.team.leaderboardTitle', 'Leaderboard — transactions ce mois')}
        </header>

        <ul className="divide-y divide-slate-100">
          {reps.map((r) => (
            <li
              key={r.rank}
              className={`flex items-center gap-3 py-3 ${r.warn ? 'rounded-xl bg-rose-50/40 px-2' : ''}`}
            >
              <span
                className={`shrink-0 text-[12px] font-black tabular-nums ${
                  r.warn ? 'text-rose-500' : 'text-slate-500'
                }`}
              >
                {r.rank}
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${r.avatar}`}
              >
                {r.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-black ${
                    r.warn ? 'text-rose-600' : r.rank === 1 ? 'text-harx-600' : 'text-slate-900'
                  }`}
                >
                  {r.name}
                  {r.warn && (
                    <span className="ml-2 text-[11px] font-bold text-rose-500">
                      {t('opsDashboard.team.atRiskInline', 'à risque')}
                    </span>
                  )}
                </p>
                <p className={`text-[11px] font-medium ${r.warn ? 'text-rose-500' : 'text-slate-500'}`}>
                  score {r.score} · conv. {r.convPct.toFixed(1)}% · {r.leadsCovered.toLocaleString('fr-FR')}{' '}
                  {t('opsDashboard.team.coveredLeads', 'leads couverts')}
                  {r.warn && ` ${t('opsDashboard.team.onlyWord', 'seulement')}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-2xl font-black tabular-nums ${
                  r.warn ? 'text-rose-500' : r.rank === 1 ? 'text-emerald-500' : 'text-slate-700'
                }`}
              >
                {r.transactions}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* ---------------- Overview view (Vue globale) ---------------- */

interface OverviewKpiStats {
  total: number;
  serious: number;
  pctSerious: number;
}

interface OverviewLeadStats {
  total: number;
  called: number;
  contacted: number;
  exhausted: number;
  coveragePct: number;
}

interface OutcomeBucket {
  key: string;
  label: string;
  color: string;
  count: number;
  pct: number;
}

/**
 * Vue globale — high-level operations dashboard.
 *
 *  Layout (top → bottom):
 *    1. Six KPI cards (Wallet · Leads · Appels · Sérieux · Transactions ·
 *       Score qualité). Each card surfaces both the raw value and a
 *       secondary metric (delta vs yesterday, % conversion, …).
 *    2. Two side-by-side cards: "Couverture leads" (horizontal bars sourced
 *       from /leads/.../stats) and "Résultats d'appels (aujourd'hui)" (donut
 *       built from `overviewToday.statuses` collapsed into 8 buckets).
 *    3. Performance 7 jours chart (shared with the Calls tab).
 *
 *  Why a separate component? Keeping the JSX inline inside the main
 *  `OperationsDashboard` made the file very hard to scan and the JSX tree
 *  often nested 10 levels deep. Extracting also lets us pass the navigation
 *  callbacks (`onSeeLeads`, `onSeeResults`) explicitly so deep-linking from
 *  the "Détail" buttons is type-safe.
 */
function OverviewView({
  stats,
  leadStats,
  transactionsToday,
  conversionPct,
  vsYesterdayPct,
  qualityScore,
  outcomeBuckets,
  donutHasData,
  series7d,
  onSeeLeads,
  onSeeResults,
}: {
  stats: OverviewKpiStats;
  leadStats: OverviewLeadStats | null;
  transactionsToday: number;
  conversionPct: number;
  vsYesterdayPct: number | null;
  qualityScore: number | null;
  outcomeBuckets: OutcomeBucket[];
  donutHasData: boolean;
  series7d: Array<{ date: string; total: number; transactions: number }> | null;
  onSeeLeads: () => void;
  onSeeResults: () => void;
}) {
  const { t } = useTranslation();

  // ── Leads-coverage rows. Fallback values keep the card meaningful when
  //    /leads/.../stats hasn't responded yet (first paint).
  const leadsBase = leadStats?.total ?? 0;
  const called = leadStats?.called ?? 0;
  const contacted = leadStats?.contacted ?? 0;
  const exhausted = leadStats?.exhausted ?? 0;
  const remaining = Math.max(0, leadsBase - called);
  const pctOf = (n: number) => (leadsBase > 0 ? (n / leadsBase) * 100 : 0);

  // ── KPI card 2 (Leads): "% couverts". Reuse the backend value when
  //    available, otherwise compute locally.
  const coveragePct = leadStats?.coveragePct ?? pctOf(called);

  // ── Donut data — Chart.js doughnut.
  const donutData = {
    labels: outcomeBuckets.map((b) => b.label),
    datasets: [
      {
        data: outcomeBuckets.map((b) => b.count),
        backgroundColor: outcomeBuckets.map((b) => b.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };
  const donutOptions = {
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx: any) => {
            const b = outcomeBuckets[ctx.dataIndex];
            return ` ${b?.label}: ${b?.count} (${(b?.pct ?? 0).toFixed(1)}%)`;
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  const fmtNum = (n: number) => n.toLocaleString('fr-FR');
  const fmtDelta = (n: number | null) => {
    if (n === null || Number.isNaN(n)) return t('opsDashboard.overview.kpi.noBaseline', 'pas de référence');
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(0)}% ${t('opsDashboard.overview.kpi.vsYesterday', 'vs hier')}`;
  };

  return (
    <>
      {/* ---------- KPI cards (6) ---------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {/* 1) Wallet — primary highlight. Real-time wallet integration is
            pending; we keep deterministic mock values so the dashboard ships
            as a complete visual even when the wallet service is offline. */}
        <KpiCard
          tone="primary"
          icon={<Wallet size={14} />}
          label={t('opsDashboard.overview.kpi.wallet', 'Wallet')}
          value="€3,240"
          sub={t('opsDashboard.overview.kpi.walletSub', '2.8 jours restants')}
        />

        {/* 2) Leads base */}
        <KpiCard
          tone="default"
          icon={<Users size={14} className="text-slate-500" />}
          label={t('opsDashboard.overview.kpi.leadsBase', 'Leads base')}
          value={fmtNum(leadsBase || 12450)}
          sub={`${(coveragePct || 68).toFixed(0)}% ${t('opsDashboard.overview.kpi.covered', 'couverts')}`}
        />

        {/* 3) Appels aujourd'hui — with delta vs yesterday from series7d */}
        <KpiCard
          tone="default"
          icon={<PhoneCall size={14} className="text-slate-500" />}
          label={t('opsDashboard.overview.kpi.callsToday', 'Appels aujourd\'hui')}
          value={fmtNum(stats.total)}
          sub={fmtDelta(vsYesterdayPct)}
        />

        {/* 4) Appels sérieux */}
        <KpiCard
          tone="default"
          icon={<CheckCircle2 size={14} className="text-emerald-500" />}
          label={t('opsDashboard.overview.kpi.seriousCalls', 'Appels sérieux')}
          value={fmtNum(stats.serious)}
          sub={`${stats.pctSerious.toFixed(1)}% ${t('opsDashboard.overview.kpi.rate', 'taux')}`}
        />

        {/* 5) Transactions today */}
        <KpiCard
          tone="default"
          icon={<TrendingUp size={14} className="text-slate-500" />}
          label={t('opsDashboard.overview.kpi.transactions', 'Transactions')}
          value={fmtNum(transactionsToday)}
          sub={`${conversionPct.toFixed(1)}% ${t('opsDashboard.overview.kpi.conversion', 'conversion')}`}
        />

        {/* 6) Score qualité — avg validByAIPct across reps (month). */}
        <KpiCard
          tone="default"
          icon={<Star size={14} className="text-slate-500" />}
          label={t('opsDashboard.overview.kpi.quality', 'Score qualité')}
          value={qualityScore !== null ? `${qualityScore}/100` : '—'}
          sub={t('opsDashboard.overview.kpi.qualitySub', 'moyenne équipe')}
        />
      </div>

      {/* ---------- Couverture leads + Résultats d'appels (donut) ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Couverture leads */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Users size={14} className="text-rose-500" />
              {t('opsDashboard.overview.coverage.title', 'Couverture leads')}
            </div>
            <button
              onClick={onSeeLeads}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t('opsDashboard.overview.detail', 'Détail')}
              <ArrowUpRight size={12} />
            </button>
          </header>

          <div className="space-y-4">
            <CoverageRow
              label={t('opsDashboard.overview.coverage.calledAtLeastOnce', 'Appelés au moins 1x')}
              value={`${fmtNum(called)} / ${fmtNum(leadsBase)}`}
              pct={pctOf(called)}
              color="bg-rose-500"
            />
            <CoverageRow
              label={t('opsDashboard.overview.coverage.contacted', 'Contactés (réponse)')}
              value={`${fmtNum(contacted)} / ${fmtNum(leadsBase)}`}
              pct={pctOf(contacted)}
              color="bg-blue-500"
            />
            <CoverageRow
              label={t('opsDashboard.overview.coverage.remaining', 'Non encore appelés')}
              value={fmtNum(remaining)}
              pct={pctOf(remaining)}
              color="bg-slate-300"
              muted
            />
            <CoverageRow
              label={t('opsDashboard.overview.coverage.exhausted', 'Épuisés (>5 tentatives)')}
              value={fmtNum(exhausted)}
              pct={pctOf(exhausted)}
              color="bg-rose-400"
              valueClassName="text-rose-600"
            />
          </div>
        </section>

        {/* Résultats d'appels (aujourd'hui) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <PieChart size={14} className="text-rose-500" />
              {t('opsDashboard.overview.outcomes.title', 'Résultats d\'appels (aujourd\'hui)')}
            </div>
            <button
              onClick={onSeeResults}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t('opsDashboard.overview.detail', 'Détail')}
              <ArrowUpRight size={12} />
            </button>
          </header>

          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            {/* Donut */}
            <div className="relative h-48">
              {donutHasData ? (
                <Doughnut data={donutData} options={donutOptions as any} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-[11px] font-bold text-slate-400">
                  {t('opsDashboard.overview.outcomes.noData', 'Aucun appel aujourd\'hui')}
                </div>
              )}
            </div>

            {/* Legend */}
            <ul className="grid grid-cols-1 gap-2 text-[11px] font-bold text-slate-700">
              {outcomeBuckets.map((b) => (
                <li key={b.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="truncate">{b.label}</span>
                  </span>
                  <span className="shrink-0 text-slate-500 tabular-nums">
                    {b.pct.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ---------- Performance 7 jours ---------- */}
      <Performance7Days series={series7d} />
    </>
  );
}

/** Horizontal coverage bar used in the "Couverture leads" card. */
function CoverageRow({
  label,
  value,
  pct,
  color,
  muted,
  valueClassName,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  muted?: boolean;
  valueClassName?: string;
}) {
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`text-[12px] font-bold ${muted ? 'text-slate-500' : 'text-slate-700'}`}>
          {label}
        </span>
        <span className={`text-[12px] font-black tabular-nums ${valueClassName ?? 'text-slate-900'}`}>
          {value}
          <span className="ml-1 text-[11px] font-bold text-slate-400">
            ({pct.toFixed(pct < 1 && pct > 0 ? 1 : 0)}%)
          </span>
        </span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Calls view (legacy detail tab) ---------------- */

/**
 * Detailed call-centric dashboard kept under the "Appels" tab.
 *
 * This component preserves the previous Vue-globale layout (KPI strip,
 * call-status bars, recent calls, MTD analysis) so power users still have
 * access to the granular breakdown while the new top-level Vue globale
 * focuses on executive-friendly KPIs.
 */
function CallsView({
  stats,
  statuses,
  recentCalls,
  mtd,
  series7d,
  fmtDuration,
}: {
  stats: {
    total: number;
    serious: number;
    voicemail: number;
    unreachable: number;
    fraud: number;
    avgDurationSec: number;
    pctSerious: number;
    pctVoicemail: number;
    pctUnreachable: number;
  };
  statuses: StatusBucket[];
  recentCalls: RecentCall[];
  mtd: { voicemail: number; unreachable: number; wrongNumber: number; callbacksToday: number };
  series7d: Array<{ date: string; total: number; transactions: number }> | null;
  fmtDuration: (sec: number) => string;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* ---------- KPI cards ---------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          tone="primary"
          icon={<Phone size={14} />}
          label={t('opsDashboard.kpi.totalToday', 'Total aujourd\'hui')}
          value={stats.total.toLocaleString('fr-FR')}
          sub={t('opsDashboard.kpi.allStatus', 'tous statuts')}
        />
        <KpiCard
          tone="default"
          icon={<Phone size={14} className="text-emerald-500" />}
          label={t('opsDashboard.kpi.serious', 'Sérieux')}
          value={stats.serious.toLocaleString('fr-FR')}
          sub={`${stats.pctSerious.toFixed(1)}%`}
        />
        <KpiCard
          tone="default"
          icon={<Voicemail size={14} className="text-slate-500" />}
          label={t('opsDashboard.kpi.voicemail', 'Messagerie vocale')}
          value={stats.voicemail.toLocaleString('fr-FR')}
          sub={`${stats.pctVoicemail.toFixed(1)}%`}
        />
        <KpiCard
          tone="default"
          icon={<PhoneOff size={14} className="text-amber-500" />}
          label={t('opsDashboard.kpi.unreachable', 'Injoignables')}
          value={stats.unreachable.toLocaleString('fr-FR')}
          sub={`${stats.pctUnreachable.toFixed(1)}%`}
        />
        <KpiCard
          tone="dark"
          icon={<ShieldAlert size={14} />}
          label={t('opsDashboard.kpi.fraud', 'Fraude détectée')}
          value={stats.fraud.toLocaleString('fr-FR')}
          sub={t('opsDashboard.kpi.toReview', 'à examiner')}
          subTone="rose"
        />
        <KpiCard
          tone="default"
          icon={<Clock size={14} className="text-slate-500" />}
          label={t('opsDashboard.kpi.avgDuration', 'Durée moy.')}
          value={fmtDuration(stats.avgDurationSec)}
          sub={t('opsDashboard.kpi.seriousCalls', 'appels sérieux')}
        />
      </div>

      {/* ---------- Statuses + Recent calls ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <span className="inline-flex h-5 w-1.5 rounded-sm bg-harx-500" />
              {t('opsDashboard.statusesTitle', 'Statuts d\'appels')}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('opsDashboard.today', 'aujourd\'hui')}
            </span>
          </header>

          <div className="space-y-4">
            {statuses.map((s) => (
              <div key={s.key}>
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${s.pill}`}
                  >
                    {s.label}
                  </span>
                  <span className="text-sm font-black tabular-nums text-slate-900">
                    {s.count.toLocaleString('fr-FR')}{' '}
                    <span className="text-[11px] font-bold text-slate-400">
                      ({s.pct.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${s.bar} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.max(0, Math.min(100, s.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <PhoneCall size={14} className="text-harx-500" />
              {t('opsDashboard.recentCallsTitle', 'Appels récents')}
            </div>
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
              {t('opsDashboard.seeAll', 'Voir tout')}
              <ArrowUpRight size={12} />
            </button>
          </header>

          <ul className="divide-y divide-slate-100">
            {recentCalls.map((c, idx) => (
              <li key={idx} className="flex items-center gap-3 py-2.5">
                <ScoreBubble score={c.score} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {c.agent} <span className="text-slate-400">→</span> {c.lead}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.meta && (
                      <span className="text-[11px] font-medium text-slate-500">{c.meta}</span>
                    )}
                    {c.tag && <Tag tone={c.tag.tone}>{c.tag.label}</Tag>}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-400">
                  {c.when}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ---------- Performance 7 jours ---------- */}
      <Performance7Days series={series7d} />

      {/* ---------- Voicemail & non-aboutis analysis ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">
            {t('opsDashboard.analysisTitle', 'Messagerie vocale & non aboutis — analyse')}
          </h2>
          <button className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700">
            {t('opsDashboard.details', 'Détails')}
            <ChevronRight size={12} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MtdCard
            label={t('opsDashboard.mtd.voicemail', 'MSG VOCALE MTD')}
            value={mtd.voicemail.toLocaleString('fr-FR')}
            sub={t('opsDashboard.mtd.voicemailSub', '→ 18% rappelés en J+1')}
            tone="slate"
          />
          <MtdCard
            label={t('opsDashboard.mtd.unreachable', 'INJOIGNABLES MTD')}
            value={mtd.unreachable.toLocaleString('fr-FR')}
            sub={t('opsDashboard.mtd.unreachableSub', '→ 41% rappelés ≥3x')}
            tone="amber"
          />
          <MtdCard
            label={t('opsDashboard.mtd.wrongNumbers', 'FAUX NUMÉROS MTD')}
            value={mtd.wrongNumber.toLocaleString('fr-FR')}
            sub={t('opsDashboard.mtd.wrongNumbersSub', '→ retirés de la base')}
            tone="rose"
          />
          <MtdCard
            label={t('opsDashboard.mtd.bestSlot', 'MEILLEURE PLAGE HORAIRE')}
            value="10h-12h"
            sub={t('opsDashboard.mtd.bestSlotSub', 'taux contact 61%')}
            tone="emerald"
            barPct={61}
          />
          <MtdCard
            label={t('opsDashboard.mtd.worstSlot', 'PIRE PLAGE HORAIRE')}
            value="18h-20h"
            sub={t('opsDashboard.mtd.worstSlotSub', 'taux contact 22%')}
            tone="rose"
            barPct={22}
          />
          <MtdCard
            label={t('opsDashboard.mtd.autoCallbacks', 'RAPPELS AUTO. PROG.')}
            value={mtd.callbacksToday.toLocaleString('fr-FR')}
            sub={t('opsDashboard.mtd.autoCallbacksSub', 'pour aujourd\'hui')}
            tone="blue"
          />
        </div>
      </section>
    </>
  );
}

/* ---------------- Wallet view ---------------- */

interface WalletTx {
  type: 'topup' | 'floor' | 'commission';
  label: string;
  amount: number;
  date: string;
}

function WalletView() {
  const { t } = useTranslation();

  const txs: WalletTx[] = [
    { type: 'topup', label: 'Top-up', amount: 10000, date: '12 mai' },
    { type: 'floor', label: 'Floor — Karima A. (214 appels)', amount: -856, date: '12 mai' },
    { type: 'commission', label: 'Commission — 23 transactions', amount: -1150, date: '12 mai' },
    { type: 'floor', label: 'Floor — Younes O. (178 appels)', amount: -712, date: '11 mai' },
    { type: 'commission', label: 'Commission — 19 transactions', amount: -950, date: '11 mai' },
  ];

  const formatEur = (n: number) => {
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    return `${sign}€${Math.abs(n).toLocaleString('fr-FR')}`;
  };

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          tone="primary"
          icon={<Wallet size={14} />}
          label={t('opsDashboard.wallet.kpi.available', 'Disponible')}
          value="€3,240"
          sub={t('opsDashboard.wallet.kpi.availableSub', '2.8 jours')}
        />
        <KpiCard
          tone="default"
          icon={<Hourglass size={14} className="text-slate-500" />}
          label={t('opsDashboard.wallet.kpi.onHold', 'On hold')}
          value="€1,370"
          sub={t('opsDashboard.wallet.kpi.onHoldSub', 'en validation')}
        />
        <KpiCard
          tone="default"
          icon={<TrendingUp size={14} className="text-slate-500" />}
          label={t('opsDashboard.wallet.kpi.spentMtd', 'Dépensé MTD')}
          value="€7,080"
          sub={t('opsDashboard.wallet.kpi.spentMtdSub', 'ce mois')}
        />
        <KpiCard
          tone="dark"
          icon={<Activity size={14} />}
          label={t('opsDashboard.wallet.kpi.burnRate', 'Burn rate')}
          value="€1,156"
          sub={t('opsDashboard.wallet.kpi.burnRateSub', 'par jour')}
        />
      </div>

      {/* Transactions récentes */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
          <span className="inline-flex h-5 w-1.5 rounded-sm bg-harx-500" />
          {t('opsDashboard.wallet.txTitle', 'Transactions récentes')}
        </header>

        <ul className="divide-y divide-slate-100">
          {txs.map((tx, idx) => {
            const isCredit = tx.amount > 0;
            return (
              <li key={idx} className="flex items-center gap-3 py-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isCredit
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-rose-500/15 text-rose-600'
                  }`}
                >
                  {isCredit ? <Plus size={12} /> : <Minus size={12} />}
                </span>
                <span className="flex-1 truncate text-[13px] font-bold text-slate-800">{tx.label}</span>
                <span
                  className={`shrink-0 text-[12px] font-black tabular-nums ${
                    isCredit ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatEur(tx.amount)} · {tx.date}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Top-up CTA */}
      <button className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-harx-500 px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-harx-500/30 transition-all hover:-translate-y-0.5 hover:bg-harx-600">
        <Calculator size={16} />
        {t('opsDashboard.wallet.computeTopup', 'Calculer le prochain top-up')}
        <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>
    </>
  );
}

/* ---------------- Sub-components ---------------- */

function KpiCard({
  icon,
  label,
  value,
  sub,
  subTone,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subTone?: 'rose';
  tone: 'default' | 'primary' | 'dark';
}) {
  const baseTone =
    tone === 'primary'
      ? 'border-harx-500 bg-harx-500/10 ring-1 ring-harx-500/20'
      : tone === 'dark'
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-slate-200 bg-white';

  const labelColor =
    tone === 'dark' ? 'text-slate-300' : tone === 'primary' ? 'text-harx-700' : 'text-slate-500';
  const valueColor = tone === 'dark' ? 'text-white' : 'text-slate-900';
  const iconBg =
    tone === 'dark'
      ? 'bg-white/10 text-white'
      : tone === 'primary'
      ? 'bg-harx-500/15 text-harx-600'
      : 'bg-slate-100 text-slate-500';
  const subColor =
    subTone === 'rose'
      ? 'text-rose-300'
      : tone === 'dark'
      ? 'text-slate-400'
      : 'text-slate-400';

  return (
    <div
      className={`relative flex flex-col gap-2 rounded-2xl border p-3.5 shadow-sm transition-all hover:-translate-y-0.5 ${baseTone}`}
    >
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
      </div>
      <div className={`text-[28px] font-black leading-none tracking-tight ${valueColor}`}>
        {value}
      </div>
      <div className={`text-[11px] font-bold ${subColor}`}>{sub}</div>
    </div>
  );
}

function ScoreBubble({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-slate-200 text-[10px] font-black text-slate-300">
        —
      </div>
    );
  }
  let cls = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (score < 40) cls = 'bg-rose-500/15 text-rose-700 border-rose-500/30';
  else if (score < 75) cls = 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black tabular-nums ${cls}`}
    >
      {score}
    </div>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function MtdCard({
  label,
  value,
  sub,
  tone,
  barPct,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'slate' | 'amber' | 'rose' | 'emerald' | 'blue';
  barPct?: number;
}) {
  const valueColor = {
    slate: 'text-slate-900',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
  }[tone];

  const barColor = {
    slate: 'bg-slate-300',
    amber: 'bg-amber-400',
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-black leading-none ${valueColor}`}>{value}</div>
      <div className="mt-2 text-[10px] font-bold text-slate-500">{sub}</div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${barPct !== undefined ? barPct : 35}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- 7-day performance chart ---------------- */

/** Mixed bar (calls) + line (transactions) chart with dual Y-axes.
 *  Uses the same color codes as the rest of the dashboard:
 *  HARX coral for calls, emerald for transactions. */
function Performance7Days({
  series,
}: {
  series: Array<{ date: string; total: number; transactions: number }> | null;
}) {
  const { t } = useTranslation();

  const chartPoints = useMemo(() => {
    const MOCK_CALLS = [195, 220, 240, 185, 250, 130, 85];
    const MOCK_TX = [20, 25, 27, 15, 26, 12, 8];
    const dayKeys: string[] = [];
    const dayLabels: string[] = [];
    const weekday = (d: Date) =>
      [t('opsDashboard.perf.sun', 'Dim'), t('opsDashboard.perf.mon', 'Lun'), t('opsDashboard.perf.tue', 'Mar'), t('opsDashboard.perf.wed', 'Mer'), t('opsDashboard.perf.thu', 'Jeu'), t('opsDashboard.perf.fri', 'Ven'), t('opsDashboard.perf.sat', 'Sam')][d.getDay()];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
      dayLabels.push(weekday(d));
    }

    if (!series?.length) {
      return { labels: dayLabels, calls: MOCK_CALLS, transactions: MOCK_TX };
    }

    const byDate = Object.fromEntries(series.map((s) => [s.date, s]));
    return {
      labels: dayLabels,
      calls: dayKeys.map((k) => byDate[k]?.total ?? 0),
      transactions: dayKeys.map((k) => byDate[k]?.transactions ?? 0),
    };
  }, [series, t]);

  const data = {
    labels: chartPoints.labels,
    datasets: [
      {
        type: 'bar' as const,
        label: t('opsDashboard.perf.calls', 'Appels'),
        data: chartPoints.calls,
        backgroundColor: 'rgba(255, 77, 77, 0.30)',
        borderColor: '#ff4d4d',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line' as const,
        label: t('opsDashboard.perf.transactions', 'Transactions'),
        data: chartPoints.transactions,
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 12 },
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' as const } },
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: t('opsDashboard.perf.calls', 'Appels'),
          color: '#ff4d4d',
          font: { size: 10, weight: 'bold' as const },
        },
        grid: { color: 'rgba(15, 23, 42, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
        beginAtZero: true,
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: {
          display: true,
          text: t('opsDashboard.perf.transactions', 'Transactions'),
          color: '#10b981',
          font: { size: 10, weight: 'bold' as const },
        },
        grid: { display: false },
        ticks: { color: '#10b981', font: { size: 10, weight: 'bold' as const } },
        beginAtZero: true,
      },
    },
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
        <TrendingUp size={14} className="text-harx-500" />
        {t('opsDashboard.perf.title', 'Performance 7 jours')}
      </header>
      <div className="h-[260px] w-full">
        {/* The Chart component handles mixed bar+line types in a single canvas. */}
        <Chart type="bar" data={data as any} options={options as any} />
      </div>
    </section>
  );
}
