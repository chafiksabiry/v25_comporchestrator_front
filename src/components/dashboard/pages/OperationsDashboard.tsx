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
  X,
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
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';

// Idempotent: other dashboards already register the same scales, registering
// again is a no-op so it's safe to keep it co-located with the chart.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

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
  const [bannerOpen, setBannerOpen] = useState(true);

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

  // ----- Lead stats (total + called ≥1x) — scoped by gig selector -----
  const [leadStats, setLeadStats] = useState<{
    total: number;
    called: number;
    coveragePct: number;
  } | null>(null);

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
          // Re-compute the coverage from raw counts so we keep precision —
          // the backend pre-rounds to 1 decimal which would collapse very
          // small ratios (e.g. 2 / 7041 = 0.0284%) to "0".
          const ratio = json.total > 0 ? (json.called / json.total) * 100 : 0;
          setLeadStats({
            total: json.total,
            called: json.called,
            coveragePct: ratio,
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

  // Real-data hook: we pull call counts the same way the previous dashboard
  // did so the top cards stay in sync with what the API actually exposes
  // for the company. Falls back to the mock numbers from the mock when the
  // backend is unreachable so the page never renders empty.
  const [calls, setCalls] = useState<any[] | null>(null);

  useEffect(() => {
    const companyId = Cookies.get('companyId');
    if (!companyId) return;
    const callsApiUrl =
      (import.meta as any).env?.VITE_API_URL_CALL ||
      (import.meta as any).env?.VITE_DASHBOARD_API;
    if (!callsApiUrl) return;
    const base = callsApiUrl.endsWith('/api') ? callsApiUrl : `${callsApiUrl}/api`;

    const params = new URLSearchParams({ companyId, limit: '2000' });
    if (selectedGigId && selectedGigId !== 'all') {
      params.set('gigId', selectedGigId);
    }

    (async () => {
      try {
        const res = await fetch(`${base}/calls?${params.toString()}`);
        if (!res.ok) return;
        const raw = await res.json();
        const list = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setCalls(list);
      } catch {
        // ignore — UI keeps the demo numbers
      }
    })();
  }, [selectedGigId]);

  // Slice the call list down to "today" so the cards mirror the design.
  // When the API yielded nothing we keep the mock numbers from the mock.
  const today = useMemo(() => {
    if (!calls) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const ms = start.getTime();
    return calls.filter((c) => {
      const ts = new Date(c.createdAt || c.date || 0).getTime();
      return ts >= ms;
    });
  }, [calls]);

  const stats = useMemo(() => {
    // Mock baseline — gets overridden by real numbers when available.
    let total = 247;
    let serious = 189;
    let voicemail = 34;
    let unreachable = 17;
    let fraud = 2;
    let avgDurationSec = 4 * 60 + 12;

    if (today && today.length > 0) {
      total = today.length;
      serious = today.filter((c) => c.validByAI === true).length;
      voicemail = today.filter((c) =>
        (c.status || '').toLowerCase().includes('machine')
      ).length;
      unreachable = today.filter((c) => {
        const s = (c.status || '').toLowerCase();
        return s && s !== 'completed';
      }).length;
      fraud = today.filter(
        (c) => c.ai_call_score?.fraud_detected === true || c.fraud === true
      ).length;
      const seriousCalls = today.filter((c) => c.validByAI === true);
      const dur = seriousCalls.reduce((a, c) => a + (c.duration || 0), 0);
      avgDurationSec = seriousCalls.length > 0 ? Math.round(dur / seriousCalls.length) : 0;
    }

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
  }, [today]);

  const statuses: StatusBucket[] = useMemo(
    () => [
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
        count: 5,
        pct: 2.0,
        bar: 'bg-rose-400',
        dot: 'bg-rose-400',
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      {
        key: 'fraud',
        label: t('opsDashboard.statuses.fraud', 'Fraude'),
        count: stats.fraud,
        pct: stats.total > 0 ? Math.round((stats.fraud / stats.total) * 1000) / 10 : 0,
        bar: 'bg-rose-600',
        dot: 'bg-rose-600',
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      {
        key: 'hangup',
        label: t('opsDashboard.statuses.hangup', 'Raccrochage immédiat'),
        count: 0,
        pct: 0,
        bar: 'bg-slate-300',
        dot: 'bg-slate-300',
        pill: 'bg-slate-100 text-slate-500 border-slate-200',
      },
    ],
    [stats, t]
  );

  // The recent-calls list is a presentational sample — the per-call lead
  // metadata we'd need (lead first/last name, agent name, AI score) is
  // currently not joined into the /calls endpoint response, so we keep it
  // visual until that join lands on the backend. The wiring above already
  // tolerates real data being substituted later.
  const recentCalls: RecentCall[] = [
    {
      score: 92,
      agent: 'Karima A.',
      lead: 'M. Dupont',
      meta: '5m43s · script 96%',
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
    {
      score: 19,
      agent: 'Hassan B.',
      lead: 'M. Leblanc',
      meta: '0m12s',
      tag: { label: t('opsDashboard.tags.fraud', 'fraude'), tone: 'rose' },
      when: '8m',
    },
    {
      score: 88,
      agent: 'Sara B.',
      lead: 'Mme Rousseau',
      meta: '4m55s',
      tag: { label: t('opsDashboard.tags.appointment', 'RDV fixé'), tone: 'violet' },
      when: '11m',
    },
    {
      score: null,
      agent: 'Amine M.',
      lead: 'M. Garnier',
      meta: t('opsDashboard.statuses.voicemail', 'messagerie vocale'),
      when: '14m',
    },
    {
      score: null,
      agent: 'Karima A.',
      lead: 'Mme Petit',
      meta: '',
      tag: { label: t('opsDashboard.statuses.unreachable', 'injoignable').toLowerCase(), tone: 'amber' },
      when: '18m',
    },
  ];

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
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="More"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* ---------- Wallet / fraud alert banner ---------- */}
      {bannerOpen && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-3 text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm font-medium leading-snug">
            <span className="font-black">{t('opsDashboard.banner.wallet', 'Wallet')}</span> —{' '}
            <span className="font-black">
              {t('opsDashboard.banner.daysLeft', { count: 2.8, defaultValue: '2.8 jours restants' })}
            </span>{' '}
            {t('opsDashboard.banner.beforeShutdown', 'avant interruption')} ·{' '}
            <span className="font-bold">
              {t('opsDashboard.banner.leadsUnreachable', {
                count: 12,
                defaultValue: '12 leads injoignables détectés',
              })}
            </span>{' '}
            ·{' '}
            <span className="font-bold">
              {t('opsDashboard.banner.fraudAlerts', {
                count: 2,
                defaultValue: '2 alertes fraude non examinées',
              })}
            </span>
          </p>
          <button
            onClick={() => setBannerOpen(false)}
            className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 transition-colors"
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
        <LeadsView leadStats={leadStats} />
      ) : tab === 'results' ? (
        <ResultsView />
      ) : tab === 'team' ? (
        <TeamView />
      ) : tab === 'wallet' ? (
        <WalletView />
      ) : (
        // Vue globale + Appels share the same call-centric overview content.
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
        {/* Statuts d'appels */}
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

        {/* Appels récents */}
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
      <Performance7Days />

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
            value="412"
            sub={t('opsDashboard.mtd.voicemailSub', '→ 18% rappelés en J+1')}
            tone="slate"
          />
          <MtdCard
            label={t('opsDashboard.mtd.unreachable', 'INJOIGNABLES MTD')}
            value="203"
            sub={t('opsDashboard.mtd.unreachableSub', '→ 41% rappelés ≥3x')}
            tone="amber"
          />
          <MtdCard
            label={t('opsDashboard.mtd.wrongNumbers', 'FAUX NUMÉROS MTD')}
            value="61"
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
            value="143"
            sub={t('opsDashboard.mtd.autoCallbacksSub', 'pour aujourd\'hui')}
            tone="blue"
          />
        </div>
      </section>
        </>
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

function LeadsView({
  leadStats,
}: {
  leadStats: { total: number; called: number; coveragePct: number } | null;
}) {
  const { t } = useTranslation();
  // Mock baseline used until the real stats land. Keeps the page presentable
  // for first-paint and for demo accounts that don't have data yet.
  const MOCK_TOTAL = 12450;
  const MOCK_CALLED = 8466;
  const MOCK_COVERAGE = 68;

  const baseCount = leadStats?.total ?? MOCK_TOTAL;
  const calledCount = leadStats?.called ?? MOCK_CALLED;
  const coveragePct = leadStats?.coveragePct ?? MOCK_COVERAGE;

  const baseLabel =
    leadStats === null
      ? t('opsDashboard.leads.kpi.totalBaseSub', 'leads uploadés')
      : t('opsDashboard.leads.kpi.totalBaseSubReal', 'leads en base');

  // Smart-format the coverage so small ratios stay visible:
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

  const qualities: LeadQuality[] = [
    {
      key: 'valid',
      label: t('opsDashboard.leads.quality.valid', 'VALIDES JOIGNABLES'),
      pct: 68.4,
      leads: 8516,
      tone: 'emerald',
    },
    {
      key: 'unreachable',
      label: t('opsDashboard.leads.quality.unreachable', 'INJOIGNABLES'),
      pct: 12.3,
      leads: 1531,
      tone: 'amber',
    },
    {
      key: 'wrong',
      label: t('opsDashboard.leads.quality.wrong', 'FAUX NUMÉROS'),
      pct: 4.1,
      leads: 511,
      tone: 'rose',
    },
    {
      key: 'notInterested',
      label: t('opsDashboard.leads.quality.notInterested', 'PAS INTÉRESSÉS'),
      pct: 8.7,
      leads: 1083,
      tone: 'amber',
    },
    {
      key: 'notAware',
      label: t('opsDashboard.leads.quality.notAware', 'PAS AU COURANT'),
      pct: 3.2,
      leads: 398,
      tone: 'amber',
    },
    {
      key: 'alreadyInsured',
      label: t('opsDashboard.leads.quality.alreadyInsured', 'DÉJÀ ASSURÉS'),
      pct: 3.3,
      leads: 411,
      tone: 'amber',
    },
  ];

  const attempts: AttemptBucket[] = [
    {
      label: t('opsDashboard.leads.attempts.one', '1 tentative'),
      leads: 3124,
      pct: 37,
      bar: 'bg-harx-500',
    },
    {
      label: t('opsDashboard.leads.attempts.two', '2 tentatives'),
      leads: 2810,
      pct: 33,
      bar: 'bg-harx-400',
    },
    {
      label: t('opsDashboard.leads.attempts.three', '3 tentatives'),
      leads: 1520,
      pct: 18,
      bar: 'bg-harx-300',
    },
    {
      label: t('opsDashboard.leads.attempts.four', '4 tentatives'),
      leads: 1000,
      pct: 12,
      bar: 'bg-blue-500',
    },
    {
      label: t('opsDashboard.leads.attempts.five', '≥5 tentatives (épuisés)'),
      leads: 812,
      pct: 6.5,
      bar: 'bg-rose-500',
      textTone: 'text-rose-600',
    },
  ];

  const reps: RepCoverage[] = [
    { initials: 'KA', name: 'Karima A.', current: 1050, target: 1250, bar: 'bg-harx-500', avatar: 'bg-harx-500/15 text-harx-700' },
    { initials: 'YO', name: 'Younes O.', current: 887, target: 1250, bar: 'bg-blue-500', avatar: 'bg-blue-500/15 text-blue-700' },
    { initials: 'SB', name: 'Sara B.', current: 788, target: 1250, bar: 'bg-emerald-500', avatar: 'bg-emerald-500/15 text-emerald-700' },
    { initials: 'AM', name: 'Amine M.', current: 675, target: 1250, bar: 'bg-amber-500', avatar: 'bg-amber-500/15 text-amber-700' },
    { initials: 'HB', name: 'Hassan B.', current: 388, target: 1250, bar: 'bg-rose-500', avatar: 'bg-rose-500/15 text-rose-700', warn: true },
  ];

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
          value="5,830"
          sub={t('opsDashboard.leads.kpi.contactedSub', '47% joignables')}
        />
        <KpiCard
          tone="dark"
          icon={<BatteryLow size={14} />}
          label={t('opsDashboard.leads.kpi.exhausted', 'Épuisés')}
          value="812"
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
          value="2.1x"
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

          {/* Warning footer */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-[11px] font-medium leading-snug">
              <span className="font-black">
                {t('opsDashboard.leads.qualityWarningHead', 'Score qualité base : 68.4%')}
              </span>{' '}
              —{' '}
              {t(
                'opsDashboard.leads.qualityWarningBody',
                "en dessous du seuil recommandé (75%). Envisager un nettoyage ou un nouvel upload."
              )}
            </p>
          </div>
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
                    <span className="text-slate-400 font-bold">({a.pct}%)</span>
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
                  <span className="text-sm font-black tabular-nums text-slate-900">143</span>
                  <Tag tone="rose">{t('opsDashboard.leads.urgent', 'urgent')}</Tag>
                </span>
              </li>
              <li className="flex items-center justify-between py-1.5">
                <span className="text-[12px] font-bold text-slate-700">
                  {t('opsDashboard.leads.callbackWeek', 'Cette semaine')}
                </span>
                <span className="text-sm font-black tabular-nums text-slate-900">389</span>
              </li>
              <li className="flex items-center justify-between py-1.5">
                <span className="text-[12px] font-bold text-slate-700">
                  {t('opsDashboard.leads.appointmentsConfirmed', 'RDV confirmés')}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-black tabular-nums text-slate-900">67</span>
                  <Tag tone="emerald">{t('opsDashboard.leads.active', 'actifs')}</Tag>
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
          {reps.map((rep) => {
            const pct = Math.round((rep.current / rep.target) * 100);
            return (
              <li key={rep.initials} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${rep.avatar}`}
                >
                  {rep.initials}
                </span>
                <span className="w-24 shrink-0 text-[12px] font-bold text-slate-800">{rep.name}</span>
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

function ResultsView() {
  const { t } = useTranslation();

  const issues: IssueBucket[] = [
    { label: t('opsDashboard.results.issues.transactionDone', 'Transaction aboutie'), count: 23, pct: 12.2, tone: 'emerald' },
    { label: t('opsDashboard.results.issues.transactionFailed', 'Transaction non aboutie'), count: 18, pct: 9.5, tone: 'rose' },
    { label: t('opsDashboard.results.issues.appointment', 'RDV fixé'), count: 15, pct: 7.9, tone: 'violet' },
    { label: t('opsDashboard.results.issues.callback', 'Rappel demandé'), count: 28, pct: 14.8, tone: 'amber' },
    { label: t('opsDashboard.results.issues.argued', 'Argumenté (intéressé)'), count: 34, pct: 18.0, tone: 'emerald' },
    { label: t('opsDashboard.results.issues.refusal', 'Refus catégorique'), count: 42, pct: 22.2, tone: 'rose' },
    { label: t('opsDashboard.results.issues.notInterested', 'Pas intéressé'), count: 16, pct: 8.5, tone: 'amber' },
    { label: t('opsDashboard.results.issues.alreadyInsured', 'Déjà assuré'), count: 13, pct: 6.9, tone: 'blue' },
  ];

  const repRows: RepIssueRow[] = [
    { name: 'Karima A.', transaction: 67, rdv: 18, rappel: 32, argumente: 41, refus: 89, convPct: 15.5, nameTone: 'harx', convTone: 'emerald' },
    { name: 'Younes O.', transaction: 54, rdv: 12, rappel: 28, argumente: 35, refus: 94, convPct: 12.1, convTone: 'emerald' },
    { name: 'Sara B.', transaction: 48, rdv: 15, rappel: 21, argumente: 38, refus: 102, convPct: 10.8, convTone: 'amber' },
    { name: 'Amine M.', transaction: 41, rdv: 9, rappel: 18, argumente: 29, refus: 118, convPct: 9.2, convTone: 'amber' },
    { name: 'Hassan B.', transaction: 3, rdv: 1, rappel: 4, argumente: 6, refus: 41, convPct: 3.1, warn: true, nameTone: 'rose', convTone: 'rose' },
  ];

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          tone="primary"
          icon={<Star size={14} />}
          label={t('opsDashboard.results.kpi.transactions', 'Transactions')}
          value="23"
          sub={t('opsDashboard.results.kpi.transactionsSub', '12.2% conv.')}
        />
        <KpiCard
          tone="default"
          icon={<CalendarClock size={14} className="text-violet-500" />}
          label={t('opsDashboard.results.kpi.appointments', 'RDV fixés')}
          value="15"
          sub={t('opsDashboard.results.kpi.appointmentsSub', '7.9% des sérieux')}
        />
        <KpiCard
          tone="default"
          icon={<Repeat size={14} className="text-amber-500" />}
          label={t('opsDashboard.results.kpi.callbacks', 'Rappels demandés')}
          value="28"
          sub={t('opsDashboard.results.kpi.callbacksSub', '14.8% des sérieux')}
        />
        <KpiCard
          tone="default"
          icon={<CheckCircle2 size={14} className="text-emerald-500" />}
          label={t('opsDashboard.results.kpi.argued', 'Argumentés')}
          value="34"
          sub={t('opsDashboard.results.kpi.arguedSub', '18% des sérieux')}
        />
        <KpiCard
          tone="dark"
          icon={<XCircle size={14} />}
          label={t('opsDashboard.results.kpi.refusals', 'Refus')}
          value="42"
          sub={t('opsDashboard.results.kpi.refusalsSub', '22.2% des sérieux')}
        />
        <KpiCard
          tone="default"
          icon={<TrendingUp size={14} className="text-blue-500" />}
          label={t('opsDashboard.results.kpi.pipeline', 'Pipe potentiel')}
          value="43"
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
              189 {t('opsDashboard.results.callsToday', 'appels · aujourd\'hui')}
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
                <span className="font-black tabular-nums text-slate-900">43 leads</span>
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

function TeamView() {
  const { t } = useTranslation();

  const reps: RepLeaderboard[] = [
    { rank: 1, initials: 'KA', name: 'Karima A.', score: 84, convPct: 15.5, leadsCovered: 1050, transactions: 67, avatar: 'bg-harx-500/15 text-harx-700' },
    { rank: 2, initials: 'YO', name: 'Younes O.', score: 79, convPct: 12.1, leadsCovered: 887, transactions: 54, avatar: 'bg-blue-500/15 text-blue-700' },
    { rank: 3, initials: 'SB', name: 'Sara B.', score: 77, convPct: 10.8, leadsCovered: 788, transactions: 48, avatar: 'bg-emerald-500/15 text-emerald-700' },
    { rank: 4, initials: 'AM', name: 'Amine M.', score: 71, convPct: 9.2, leadsCovered: 675, transactions: 41, avatar: 'bg-amber-500/15 text-amber-700' },
    { rank: 5, initials: 'HB', name: 'Hassan B.', score: 38, convPct: 3.1, leadsCovered: 388, transactions: 3, avatar: 'bg-rose-500/15 text-rose-700', warn: true },
  ];

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          tone="primary"
          icon={<Users size={14} />}
          label={t('opsDashboard.team.kpi.enrolled', 'Enrollés')}
          value="18"
          sub={t('opsDashboard.team.kpi.enrolledSub', 'sur ce gig')}
        />
        <KpiCard
          tone="default"
          icon={<Activity size={14} className="text-emerald-500" />}
          label={t('opsDashboard.team.kpi.activeWeek', 'Actifs semaine')}
          value="14"
          sub="78%"
        />
        <KpiCard
          tone="default"
          icon={<GraduationCap size={14} className="text-blue-500" />}
          label={t('opsDashboard.team.kpi.lmsDone', 'LMS complété')}
          value="16/18"
          sub="89%"
        />
        <KpiCard
          tone="dark"
          icon={<AlertTriangle size={14} />}
          label={t('opsDashboard.team.kpi.atRisk', 'À risque')}
          value="2"
          sub={t('opsDashboard.team.kpi.atRiskSub', 'score < 50')}
          subTone="rose"
        />
        <KpiCard
          tone="default"
          icon={<Sparkles size={14} className="text-amber-500" />}
          label={t('opsDashboard.team.kpi.avgScore', 'Score moyen')}
          value="74/100"
          sub={t('opsDashboard.team.kpi.avgScoreSub', '+3 vs semaine')}
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
function Performance7Days() {
  const { t } = useTranslation();

  const labels = [
    t('opsDashboard.perf.mon', 'Lun'),
    t('opsDashboard.perf.tue', 'Mar'),
    t('opsDashboard.perf.wed', 'Mer'),
    t('opsDashboard.perf.thu', 'Jeu'),
    t('opsDashboard.perf.fri', 'Ven'),
    t('opsDashboard.perf.sat', 'Sam'),
    t('opsDashboard.perf.sun', 'Dim'),
  ];

  const data = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: t('opsDashboard.perf.calls', 'Appels'),
        data: [195, 220, 240, 185, 250, 130, 85],
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
        data: [20, 25, 27, 15, 26, 12, 8],
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
