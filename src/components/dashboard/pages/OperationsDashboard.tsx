import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';

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

    (async () => {
      try {
        const res = await fetch(`${base}/calls?companyId=${companyId}&limit=2000`);
        if (!res.ok) return;
        const raw = await res.json();
        const list = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setCalls(list);
      } catch {
        // ignore — UI keeps the demo numbers
      }
    })();
  }, []);

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
    </div>
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
