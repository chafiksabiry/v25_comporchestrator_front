import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    Phone,
    Target,
    BarChart3,
    PieChart,
    TrendingUp,
    Calendar,
    Briefcase,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    Filter,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    Info
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import Cookies from 'js-cookie';
import axios from 'axios';
import { getActiveAgentsForCompany, getGigsByCompanyId } from '../matching';
import { useTranslation } from 'react-i18next';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface PerformanceStats {
    totalLeads: number;
    totalCalls: number;
    contactedLeads: number;
    validNumbers: number;
    callsOver90s: number;
    answeringMachineCalls: number;
    /** Calls flagged `validByAI === true` (the only authoritative validation signal). */
    validatedCalls: number;
    /** Calls where a sale / transaction was recorded (rep flag, IA detection, or explicit flag). */
    transactionCalls: number;
    /** Calls that never reached a human (status ≠ completed). */
    unansweredCalls: number;
    callsByStatus: Record<string, number>;
    registeredReps: number;
}

interface WindowedStats {
    totalCalls: number;
    contactedLeads: number;
    validNumbers: number;
    callsOver90s: number;
    answeringMachineCalls: number;
    validatedCalls: number;
    transactionCalls: number;
    unansweredCalls: number;
    callsByStatus: Record<string, number>;
}

const EMPTY_WINDOW: WindowedStats = {
    totalCalls: 0,
    contactedLeads: 0,
    validNumbers: 0,
    callsOver90s: 0,
    answeringMachineCalls: 0,
    validatedCalls: 0,
    transactionCalls: 0,
    unansweredCalls: 0,
    callsByStatus: {}
};

function computeWindowedStats(calls: any[]): WindowedStats {
    const w: WindowedStats = { ...EMPTY_WINDOW, callsByStatus: {} };
    for (const call of calls) {
        const status = (call.status || 'Inconnu').toString();
        w.callsByStatus[status] = (w.callsByStatus[status] || 0) + 1;
        const isCompleted = status === 'completed' || status === 'Completed';
        if (isCompleted) w.contactedLeads++;
        else w.unansweredCalls++;
        if (status !== 'Failed' && status !== 'invalid') w.validNumbers++;
        if ((call.duration || 0) >= 90) w.callsOver90s++;
        if (status.toLowerCase().includes('machine')) w.answeringMachineCalls++;
        if (call.validByAI === true) w.validatedCalls++;
        if (
            call.transactionOccurred === true ||
            call.validByReps === true ||
            call.ai_call_score?.transaction_detected === true
        ) w.transactionCalls++;
    }
    w.totalCalls = calls.length;
    return w;
}

function timeRangeWindowMs(range: 'daily' | 'weekly' | 'monthly' | 'yearly'): number {
    const day = 24 * 60 * 60 * 1000;
    switch (range) {
        case 'daily':   return day;
        case 'weekly':  return 7 * day;
        case 'monthly': return 30 * day;
        case 'yearly':  return 365 * day;
    }
}

function computeTrendPct(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

function periodLabel(range: 'daily' | 'weekly' | 'monthly' | 'yearly', t: (k: string) => string): string {
    const key = `performanceDashboard.metrics.vsPrevious_${range}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    switch (range) {
        case 'daily':   return 'vs 24h précédentes';
        case 'weekly':  return 'vs 7 jours précédents';
        case 'monthly': return 'vs 30 jours précédents';
        case 'yearly':  return 'vs 12 mois précédents';
    }
}

export function CompanyPerformanceDashboard() {
    const { t } = useTranslation();
    const [selectedGig, setSelectedGig] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [gigs, setGigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<PerformanceStats>({
        totalLeads: 0,
        totalCalls: 0,
        contactedLeads: 0,
        validNumbers: 0,
        callsOver90s: 0,
        answeringMachineCalls: 0,
        validatedCalls: 0,
        transactionCalls: 0,
        unansweredCalls: 0,
        callsByStatus: {},
        registeredReps: 0
    });
    const [callsList, setCallsList] = useState<any[]>([]);
    const [leadsList, setLeadsList] = useState<any[]>([]);
    const [agentsList, setAgentsList] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const companyId = Cookies.get('companyId');
            if (!companyId) return;

            setLoading(true);
            try {
                // 1. Fetch Gigs
                const gigsData = await getGigsByCompanyId(companyId);
                const gigsArray = Array.isArray(gigsData) ? gigsData : [];
                setGigs(gigsArray);

                // 2. Fetch Leads — try the full list (with createdAt) so we
                // can compute period-over-period trends. Fallback to the
                // lightweight count endpoint if the list endpoint is missing.
                const dashboardBase: string = import.meta.env.VITE_DASHBOARD_API;
                let totalLeads = 0;
                let fetchedLeads: any[] = [];
                try {
                    const targetGigs = selectedGig === 'all'
                        ? gigsArray.map((g: any) => g._id).filter(Boolean)
                        : [selectedGig];

                    const leadsByGig = await Promise.all(targetGigs.map(async (gid: string) => {
                        try {
                            const res = await fetch(`${dashboardBase}/leads/gig/${gid}?page=1&limit=100000`);
                            if (!res.ok) return [];
                            const json = await res.json();
                            return Array.isArray(json.data) ? json.data : [];
                        } catch {
                            return [];
                        }
                    }));
                    fetchedLeads = leadsByGig.flat();
                } catch {
                    fetchedLeads = [];
                }
                if (fetchedLeads.length > 0) {
                    totalLeads = fetchedLeads.length;
                } else {
                    // Fallback: just the count
                    try {
                        const leadsUrl = `${dashboardBase}/leads/company/${companyId}/has-leads`;
                        const leadsRes = await fetch(leadsUrl);
                        if (leadsRes.ok) {
                            const leadsData = await leadsRes.json();
                            totalLeads = leadsData.count || 0;
                        }
                    } catch { /* keep totalLeads = 0 */ }
                }
                setLeadsList(fetchedLeads);

                // 3. Fetch Calls
                const callsApiUrl = import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_DASHBOARD_API;
                const callsBase = callsApiUrl.endsWith('/api') ? callsApiUrl : `${callsApiUrl}/api`;
                let callsUrl = `${callsBase}/calls?companyId=${companyId}&limit=10000`;

                if (selectedGig !== 'all') {
                    callsUrl += `&gigId=${selectedGig}`;
                }

                const callsRes = await fetch(callsUrl);

                if (callsRes.ok) {
                    const callsDataRaw = await callsRes.json();
                    const allCalls = Array.isArray(callsDataRaw.data) ? callsDataRaw.data : (Array.isArray(callsDataRaw) ? callsDataRaw : []);
                    setCallsList(allCalls);

                    // All counters now come from the same shared helper so the
                    // global snapshot and the windowed slices stay consistent.
                    const agg = computeWindowedStats(allCalls);
                    setStats({
                        totalLeads,
                        totalCalls: agg.totalCalls,
                        contactedLeads: agg.contactedLeads,
                        validNumbers: agg.validNumbers,
                        callsOver90s: agg.callsOver90s,
                        answeringMachineCalls: agg.answeringMachineCalls,
                        validatedCalls: agg.validatedCalls,
                        transactionCalls: agg.transactionCalls,
                        unansweredCalls: agg.unansweredCalls,
                        callsByStatus: agg.callsByStatus,
                        registeredReps: 0
                    });
                }

                // 4. Fetch Active Agents
                const agentsData = await getActiveAgentsForCompany(companyId);
                const agentsArray = Array.isArray(agentsData) ? agentsData : [];

                // If a specific gig is selected, filter agents by that gig
                let filteredAgents = agentsArray;
                if (selectedGig !== 'all') {
                    filteredAgents = agentsArray.filter(agent => agent.gigId === selectedGig);
                }

                setAgentsList(filteredAgents);
                setStats(prev => ({
                    ...prev,
                    registeredReps: filteredAgents.length
                }));

            } catch (error) {
                console.error("Error fetching performance data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedGig]);

    // Slice everything into current window vs previous window so we can show
    // real period-over-period trends instead of hardcoded "+12%".
    const { currentWindow, previousWindow, leadsWin, agentsWin } = useMemo(() => {
        const now = Date.now();
        const win = timeRangeWindowMs(timeRange);
        const currentStart = now - win;
        const previousStart = now - 2 * win;

        const sliceByTimestamp = <T,>(arr: T[], pickTs: (item: T) => number) => {
            const curr: T[] = [];
            const prev: T[] = [];
            for (const item of arr) {
                const ts = pickTs(item);
                if (!ts || Number.isNaN(ts)) continue;
                if (ts >= currentStart && ts <= now) curr.push(item);
                else if (ts >= previousStart && ts < currentStart) prev.push(item);
            }
            return { curr, prev };
        };

        const calls = sliceByTimestamp(callsList, c => new Date((c as any).createdAt || (c as any).date || 0).getTime());
        const leads = sliceByTimestamp(leadsList, l => new Date((l as any).createdAt || (l as any).Last_Activity_Time || 0).getTime());
        const agents = sliceByTimestamp(agentsList, a => new Date((a as any).createdAt || (a as any).enrolledAt || (a as any).joinedAt || 0).getTime());

        return {
            currentWindow: computeWindowedStats(calls.curr),
            previousWindow: computeWindowedStats(calls.prev),
            leadsWin: { current: leads.curr.length, previous: leads.prev.length },
            agentsWin: { current: agents.curr.length, previous: agents.prev.length }
        };
    }, [callsList, leadsList, agentsList, timeRange]);

    // Trends (period-over-period % change). null = no comparison available.
    const trendTotalCalls = computeTrendPct(currentWindow.totalCalls, previousWindow.totalCalls);
    const trendContacted = computeTrendPct(currentWindow.contactedLeads, previousWindow.contactedLeads);
    const trendValid = computeTrendPct(currentWindow.validNumbers, previousWindow.validNumbers);

    // Leads / Reps trends — only available when we managed to fetch the full
    // list with timestamps. Otherwise fall back to "Total" snapshot.
    const hasLeadsTimestamps = leadsList.length > 0;
    const hasAgentsTimestamps = agentsList.some(a => a.createdAt || a.enrolledAt || a.joinedAt);
    const trendLeads = hasLeadsTimestamps ? computeTrendPct(leadsWin.current, leadsWin.previous) : null;
    const trendReps = hasAgentsTimestamps ? computeTrendPct(agentsWin.current, agentsWin.previous) : null;

    // Display stats — if we have timestamped data we scope to the window so
    // the big number tracks the filter. Otherwise we show the total stock.
    const displayStats = {
        totalLeads: hasLeadsTimestamps ? leadsWin.current : stats.totalLeads,
        registeredReps: hasAgentsTimestamps ? agentsWin.current : stats.registeredReps,
        totalCalls: currentWindow.totalCalls,
        contactedLeads: currentWindow.contactedLeads,
        validNumbers: currentWindow.validNumbers,
        callsOver90s: currentWindow.callsOver90s,
        answeringMachineCalls: currentWindow.answeringMachineCalls,
        validatedCalls: currentWindow.validatedCalls,
        transactionCalls: currentWindow.transactionCalls,
        unansweredCalls: currentWindow.unansweredCalls,
        callsByStatus: currentWindow.callsByStatus
    };

    // Four rate metrics requested by the company team:
    //   • Coverage    = total calls / total leads        (call activity vs lead stock)
    //   • Non-answer  = unanswered  / total calls        (% of calls that never reached a human)
    //   • Argumentation = validByAI=true / total calls   (validated calls — the audit-passing rate)
    //   • Conversion  = transactions / total calls       (% of calls that closed a sale)
    // All four are computed from the current time window so the filter
    // (Quotidien / Hebdo / Mensuel / Annuel) actually changes them.
    const coverageRate = useMemo(
        () => displayStats.totalLeads > 0 ? (displayStats.totalCalls / displayStats.totalLeads) * 100 : 0,
        [displayStats.totalLeads, displayStats.totalCalls]
    );
    const unansweredRate = useMemo(
        () => displayStats.totalCalls > 0 ? (displayStats.unansweredCalls / displayStats.totalCalls) * 100 : 0,
        [displayStats.totalCalls, displayStats.unansweredCalls]
    );
    const argumentationRate = useMemo(
        () => displayStats.totalCalls > 0 ? (displayStats.validatedCalls / displayStats.totalCalls) * 100 : 0,
        [displayStats.totalCalls, displayStats.validatedCalls]
    );
    const conversionRate = useMemo(
        () => displayStats.totalCalls > 0 ? (displayStats.transactionCalls / displayStats.totalCalls) * 100 : 0,
        [displayStats.totalCalls, displayStats.transactionCalls]
    );

    // Chart Data — scoped to the current window so it matches the cards.
    // Buckets are keyed with a sortable key (so the X axis stays chronological)
    // and rendered as day-of-month numbers (or hour / month numbers).
    const histogramData = useMemo(() => {
        const now = Date.now();
        const win = timeRangeWindowMs(timeRange);
        const start = now - win;
        const groups: Record<string, { calls: number, contacts: number, label: string }> = {};

        callsList.forEach(call => {
            const ts = new Date(call.createdAt || call.date || 0).getTime();
            if (Number.isNaN(ts) || ts < start || ts > now) return;
            const date = new Date(ts);
            let key = '';
            let label = '';
            if (timeRange === 'daily') {
                const h = date.getHours();
                key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${h}`;
                label = `${h.toString().padStart(2, '0')}h`;
            } else if (timeRange === 'weekly') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                label = date.getDate().toString().padStart(2, '0');
            } else if (timeRange === 'monthly') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                label = date.getDate().toString().padStart(2, '0');
            } else {
                const m = date.getMonth() + 1;
                key = `${date.getFullYear()}-${m.toString().padStart(2, '0')}`;
                label = m.toString().padStart(2, '0');
            }

            if (!groups[key]) groups[key] = { calls: 0, contacts: 0, label };
            groups[key].calls++;
            if (call.status === 'completed' || call.status === 'Completed') groups[key].contacts++;
        });

        const sortedKeys = Object.keys(groups).sort();
        const labels = sortedKeys.map(k => groups[k].label);
        const callsData = sortedKeys.map(k => groups[k].calls);
        const contactsData = sortedKeys.map(k => groups[k].contacts);

        return {
            labels: labels.length > 0 ? labels : [t('performanceDashboard.charts.noData')],
            datasets: [
                {
                    label: t('performanceDashboard.charts.callCount'),
                    data: callsData.length > 0 ? callsData : [0],
                    backgroundColor: 'rgba(255, 77, 77, 0.8)',
                    borderRadius: 8,
                },
                {
                    label: t('performanceDashboard.charts.contactedLeads'),
                    data: contactsData.length > 0 ? contactsData : [0],
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: 8,
                }
            ]
        };
    }, [callsList, timeRange, t]);

    const statusChartData = {
        labels: Object.keys(displayStats.callsByStatus),
        datasets: [{
            data: Object.values(displayStats.callsByStatus),
            backgroundColor: [
                '#10b981', // green-500
                '#f59e0b', // amber-500
                '#3b82f6', // blue-500
                '#ef4444', // red-500
                '#6366f1', // indigo-500
                '#ec4899', // pink-500
                '#94a3b8', // slate-400
            ],
            borderWidth: 0,
        }]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12, weight: '600' as const }
                }
            },
            tooltip: {
                backgroundColor: '#0f172a',
                padding: 12,
                titleFont: { size: 14, weight: 'bold' as const },
                bodyFont: { size: 13 },
                displayColors: true,
                cornerRadius: 8
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { display: false }
            },
            x: {
                grid: { display: false }
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-harx-500/10 rounded-2xl">
                            <BarChart3 className="w-8 h-8 text-harx-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('performanceDashboard.title')}</h1>
                            <p className="text-slate-500 font-medium">{t('performanceDashboard.subtitle')}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Gig Selector */}
                    <div className="relative group">
                        <select
                            value={selectedGig}
                            onChange={(e) => setSelectedGig(e.target.value)}
                            className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 pr-12 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all cursor-pointer shadow-sm hover:bg-white"
                        >
                            <option value="all">{t('performanceDashboard.allGigs')}</option>
                            {gigs.map(gig => (
                                <option key={gig._id} value={gig._id}>{gig.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((range) => {
                            return (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === range
                                            ? 'bg-white text-harx-500 shadow-md ring-1 ring-black/5'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {t(`performanceDashboard.timeRange.${range}`)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Top KPI Cards — periods + trends respect the timeRange filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <MetricCard
                    title={t('performanceDashboard.metrics.repsRegistered')}
                    value={displayStats.registeredReps.toLocaleString()}
                    icon={<Briefcase className="w-6 h-6" />}
                    color="purple"
                    trendPct={trendReps}
                    trendLabel={hasAgentsTimestamps ? periodLabel(timeRange, t) : 'Stock total de reps'}
                />
                <MetricCard
                    title={t('performanceDashboard.metrics.totalLeads')}
                    value={displayStats.totalLeads.toLocaleString()}
                    icon={<Users className="w-6 h-6" />}
                    color="blue"
                    trendPct={trendLeads}
                    trendLabel={hasLeadsTimestamps ? periodLabel(timeRange, t) : 'Stock total de leads'}
                />
                <MetricCard
                    title={t('performanceDashboard.metrics.totalCalls')}
                    value={displayStats.totalCalls.toLocaleString()}
                    icon={<Phone className="w-6 h-6" />}
                    color="harx"
                    trendPct={trendTotalCalls}
                    trendLabel={periodLabel(timeRange, t)}
                />
                <MetricCard
                    title={t('performanceDashboard.metrics.contactedLeads')}
                    value={displayStats.contactedLeads.toLocaleString()}
                    icon={<Target className="w-6 h-6" />}
                    color="emerald"
                    trendPct={trendContacted}
                    trendLabel={periodLabel(timeRange, t)}
                />
                <MetricCard
                    title={t('performanceDashboard.metrics.validNumbers')}
                    value={displayStats.validNumbers.toLocaleString()}
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    color="amber"
                    trendPct={trendValid}
                    trendLabel={periodLabel(timeRange, t)}
                />
            </div>

            {/* Performance Ratios — 4 KPIs requested by the company team */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <RatioCard
                    title={t('performanceDashboard.ratios.coverageRate')}
                    subtitle={t('performanceDashboard.ratios.coverageSubtitle')}
                    value={coverageRate}
                    color="harx"
                    extra={`${displayStats.totalCalls.toLocaleString()} / ${displayStats.totalLeads.toLocaleString()}`}
                />
                <RatioCard
                    title={t('performanceDashboard.ratios.unansweredRate')}
                    subtitle={t('performanceDashboard.ratios.unansweredSubtitle')}
                    value={unansweredRate}
                    color="amber"
                    extra={`${displayStats.unansweredCalls.toLocaleString()} / ${displayStats.totalCalls.toLocaleString()}`}
                />
                <RatioCard
                    title={t('performanceDashboard.ratios.argumentationRate')}
                    subtitle={t('performanceDashboard.ratios.argumentationSubtitle')}
                    value={argumentationRate}
                    color="blue"
                    extra={`${displayStats.validatedCalls.toLocaleString()} / ${displayStats.totalCalls.toLocaleString()}`}
                />
                <RatioCard
                    title={t('performanceDashboard.ratios.conversionRate')}
                    subtitle={t('performanceDashboard.ratios.conversionSubtitle')}
                    value={conversionRate}
                    color="emerald"
                    extra={`${displayStats.transactionCalls.toLocaleString()} / ${displayStats.totalCalls.toLocaleString()}`}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Histogram */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('performanceDashboard.charts.activityTitle')}</h3>
                            <p className="text-slate-500 text-sm font-medium italic">{t('performanceDashboard.charts.activitySubtitle')}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">{t('performanceDashboard.charts.liveData')}</span>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[350px]">
                        <Bar data={histogramData} options={chartOptions} />
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col">
                    <div className="mb-8">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('performanceDashboard.charts.statusBreakdownTitle')}</h3>
                        <p className="text-slate-500 text-sm font-medium italic">{t('performanceDashboard.charts.statusBreakdownSubtitle')}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-full max-w-[280px] mb-8">
                            <Pie data={statusChartData} options={{
                                ...chartOptions,
                                plugins: {
                                    ...chartOptions.plugins,
                                    legend: { display: false }
                                }
                            }} />
                        </div>
                        <div className="w-full space-y-3">
                            {Object.entries(displayStats.callsByStatus).slice(0, 4).map(([status, count], idx) => (
                                <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: (statusChartData.datasets[0].backgroundColor as string[])[idx] }} />
                                        <span className="text-sm font-bold text-slate-700">{status}</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-900">{count.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    icon,
    color,
    trendPct,
    trendLabel
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: 'harx' | 'blue' | 'emerald' | 'amber' | 'purple';
    /** Period-over-period variation in %. `null` => no comparable data (snapshot stat). */
    trendPct: number | null;
    /** Human-readable comparison label, e.g. "vs 7 derniers jours". */
    trendLabel: string;
}) {
    const colorClasses = {
        harx: 'bg-harx-500/10 text-harx-500 ring-harx-500/20',
        blue: 'bg-blue-500/10 text-blue-500 ring-blue-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-500 ring-amber-500/20',
        purple: 'bg-purple-500/10 text-purple-500 ring-purple-500/20'
    };

    const showTrend = trendPct !== null && Number.isFinite(trendPct);
    const isPositive = showTrend && (trendPct as number) > 0;
    const isNeutral = showTrend && (trendPct as number) === 0;
    let pillTone = 'bg-slate-100 text-slate-500';
    if (showTrend && !isNeutral) {
        pillTone = isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colorClasses[color]} ring-1 transition-transform group-hover:scale-110 duration-300`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full ${pillTone}`}>
                    {showTrend && !isNeutral && (isPositive
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />)}
                    {showTrend
                        ? `${isPositive ? '+' : ''}${Math.round(trendPct as number)}%`
                        : 'Total'}
                </div>
            </div>
            <div className="space-y-1">
                <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</h3>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
                <p className="text-[10px] text-slate-400 font-medium italic pt-2">{trendLabel}</p>
            </div>
        </div>
    );
}

function RatioCard({
    title,
    subtitle,
    value,
    color,
    extra
}: {
    title: string;
    subtitle: string;
    value: number;
    color: 'harx' | 'blue' | 'emerald' | 'amber';
    /** Optional raw counters shown next to the percentage (e.g. "12 / 50"). */
    extra?: string;
}) {
    const barColor = color === 'harx' ? 'bg-harx-500' :
        color === 'blue' ? 'bg-blue-500' :
            color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
    const clampedWidth = Math.max(0, Math.min(100, value));

    return (
        <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={48} className="text-white" />
            </div>

            <div className="relative z-10 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-white font-black text-sm uppercase tracking-tight">{title}</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{subtitle}</p>
                </div>

                <div className="space-y-2">
                    <div className="flex items-end justify-between gap-2">
                        <div className="text-4xl font-black text-white italic tracking-tighter">
                            {value.toFixed(1)}<span className="text-lg ml-0.5 not-italic">%</span>
                        </div>
                        {extra && (
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider tabular-nums pb-1">
                                {extra}
                            </div>
                        )}
                    </div>

                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${barColor} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,77,77,0.5)]`}
                            style={{ width: `${clampedWidth}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
