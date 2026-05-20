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
    callsByStatus: Record<string, number>;
    registeredReps: number;
}

interface WindowedStats {
    totalCalls: number;
    contactedLeads: number;
    validNumbers: number;
    callsOver90s: number;
    answeringMachineCalls: number;
    callsByStatus: Record<string, number>;
}

const EMPTY_WINDOW: WindowedStats = {
    totalCalls: 0,
    contactedLeads: 0,
    validNumbers: 0,
    callsOver90s: 0,
    answeringMachineCalls: 0,
    callsByStatus: {}
};

function computeWindowedStats(calls: any[]): WindowedStats {
    const w: WindowedStats = { ...EMPTY_WINDOW, callsByStatus: {} };
    for (const call of calls) {
        const status = call.status || 'Inconnu';
        w.callsByStatus[status] = (w.callsByStatus[status] || 0) + 1;
        if (status === 'completed' || status === 'Completed') w.contactedLeads++;
        if (status !== 'Failed' && status !== 'invalid') w.validNumbers++;
        if ((call.duration || 0) >= 90) w.callsOver90s++;
        if (status.toLowerCase().includes('machine')) w.answeringMachineCalls++;
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
        callsByStatus: {},
        registeredReps: 0
    });
    const [callsList, setCallsList] = useState<any[]>([]);

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

                // 2. Fetch Leads Count
                const leadsUrl = `${import.meta.env.VITE_DASHBOARD_API}/leads/company/${companyId}/has-leads`;
                const leadsRes = await fetch(leadsUrl);
                let totalLeads = 0;
                if (leadsRes.ok) {
                    const leadsData = await leadsRes.json();
                    totalLeads = leadsData.count || 0;
                }

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

                    // Process Stats
                    const statusCount: Record<string, number> = {};
                    let valid = 0;
                    let over90s = 0;
                    let machines = 0;
                    let contacted = 0;

                    allCalls.forEach((call: any) => {
                        // Status breakdown
                        const status = call.status || 'Inconnu';
                        statusCount[status] = (statusCount[status] || 0) + 1;

                        // Contacted (successful calls)
                        if (status === 'completed' || status === 'Completed') {
                            contacted++;
                        }

                        // Valid Numbers (assuming any call that isn't failed/invalid is valid)
                        if (status !== 'Failed' && status !== 'invalid') {
                            valid++;
                        }

                        // Argumentation (> 90s)
                        if (call.duration >= 90) {
                            over90s++;
                        }

                        // Answering Machine
                        if (status.toLowerCase().includes('machine')) {
                            machines++;
                        }
                    });

                    setStats({
                        totalLeads,
                        totalCalls: allCalls.length,
                        contactedLeads: contacted,
                        validNumbers: valid,
                        callsOver90s: over90s,
                        answeringMachineCalls: machines,
                        callsByStatus: statusCount,
                        registeredReps: 0 // Will be updated below
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

    // Slice calls into current window vs previous window so we can show real
    // period-over-period trends instead of hardcoded "+12%".
    const { currentWindow, previousWindow } = useMemo(() => {
        const now = Date.now();
        const win = timeRangeWindowMs(timeRange);
        const currentStart = now - win;
        const previousStart = now - 2 * win;
        const currentCalls: any[] = [];
        const previousCalls: any[] = [];
        for (const call of callsList) {
            const ts = new Date(call.createdAt || call.date || 0).getTime();
            if (Number.isNaN(ts)) continue;
            if (ts >= currentStart && ts <= now) currentCalls.push(call);
            else if (ts >= previousStart && ts < currentStart) previousCalls.push(call);
        }
        return {
            currentWindow: computeWindowedStats(currentCalls),
            previousWindow: computeWindowedStats(previousCalls)
        };
    }, [callsList, timeRange]);

    // Trends (period-over-period % change). null = no comparison available.
    const trendTotalCalls = computeTrendPct(currentWindow.totalCalls, previousWindow.totalCalls);
    const trendContacted = computeTrendPct(currentWindow.contactedLeads, previousWindow.contactedLeads);
    const trendValid = computeTrendPct(currentWindow.validNumbers, previousWindow.validNumbers);

    // Display stats — totalLeads and registeredReps are cumulative snapshots
    // (no period filtering), so they stay on the unscoped values.
    const displayStats = {
        totalLeads: stats.totalLeads,
        registeredReps: stats.registeredReps,
        totalCalls: currentWindow.totalCalls,
        contactedLeads: currentWindow.contactedLeads,
        validNumbers: currentWindow.validNumbers,
        callsOver90s: currentWindow.callsOver90s,
        answeringMachineCalls: currentWindow.answeringMachineCalls,
        callsByStatus: currentWindow.callsByStatus
    };

    // Calculated rate metrics — all derived from the current window so the
    // filter actually changes them.
    const coverageRate = useMemo(() => displayStats.totalLeads > 0 ? (displayStats.contactedLeads / displayStats.totalLeads) * 100 : 0, [displayStats.totalLeads, displayStats.contactedLeads]);
    const reachabilityRate = useMemo(() => displayStats.totalCalls > 0 ? (displayStats.validNumbers / displayStats.totalCalls) * 100 : 0, [displayStats.totalCalls, displayStats.validNumbers]);
    const argumentationRate = useMemo(() => displayStats.contactedLeads > 0 ? (displayStats.callsOver90s / displayStats.contactedLeads) * 100 : 0, [displayStats.contactedLeads, displayStats.callsOver90s]);
    const machineRate = useMemo(() => displayStats.totalCalls > 0 ? (displayStats.answeringMachineCalls / displayStats.totalCalls) * 100 : 0, [displayStats.totalCalls, displayStats.answeringMachineCalls]);

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
                    trendPct={null}
                    trendLabel={selectedGig === 'all' ? 'Total cumulé sur tous les gigs' : 'Reps actifs sur ce gig'}
                />
                <MetricCard
                    title={t('performanceDashboard.metrics.totalLeads')}
                    value={displayStats.totalLeads.toLocaleString()}
                    icon={<Users className="w-6 h-6" />}
                    color="blue"
                    trendPct={null}
                    trendLabel="Stock total de leads"
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

            {/* Performance Ratios */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <RatioCard
                    title={t('performanceDashboard.ratios.coverageRate')}
                    subtitle={t('performanceDashboard.ratios.coverageSubtitle')}
                    value={coverageRate}
                    color="harx"
                />
                <RatioCard
                    title={t('performanceDashboard.ratios.reachabilityRate')}
                    subtitle={t('performanceDashboard.ratios.reachabilitySubtitle')}
                    value={reachabilityRate}
                    color="emerald"
                />
                <RatioCard
                    title={t('performanceDashboard.ratios.argumentationRate')}
                    subtitle={t('performanceDashboard.ratios.argumentationSubtitle')}
                    value={argumentationRate}
                    color="blue"
                />
                <RatioCard
                    title={t('performanceDashboard.ratios.machineRate')}
                    subtitle={t('performanceDashboard.ratios.machineSubtitle')}
                    value={machineRate}
                    color="amber"
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

function RatioCard({ title, subtitle, value, color }: { title: string, subtitle: string, value: number, color: 'harx' | 'blue' | 'emerald' | 'amber' }) {
    const barColor = color === 'harx' ? 'bg-harx-500' :
        color === 'blue' ? 'bg-blue-500' :
            color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';

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
                    <div className="flex items-end justify-between">
                        <div className="text-4xl font-black text-white italic tracking-tighter">
                            {value.toFixed(1)}<span className="text-lg ml-0.5 not-italic">%</span>
                        </div>
                    </div>

                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${barColor} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,77,77,0.5)]`}
                            style={{ width: `${value}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
