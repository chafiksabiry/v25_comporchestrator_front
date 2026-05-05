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
import { getGigsByCompanyId } from '../matching';

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
}

export function CompanyPerformanceDashboard() {
    const [selectedGig, setSelectedGig] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [gigs, setGigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<PerformanceStats>({
        totalLeads: 12450,
        totalCalls: 8940,
        contactedLeads: 5670,
        validNumbers: 7820,
        callsOver90s: 3420,
        answeringMachineCalls: 1240,
        callsByStatus: {
            'Completed': 4500,
            'Busy': 800,
            'No Answer': 1200,
            'Failed': 340,
            'Canceled': 100,
            'Machine': 1240,
            'Other': 760
        }
    });

    useEffect(() => {
        const fetchGigs = async () => {
            const companyId = Cookies.get('companyId');
            if (companyId) {
                try {
                    const gigsData = await getGigsByCompanyId(companyId);
                    setGigs(Array.isArray(gigsData) ? gigsData : []);
                } catch (error) {
                    console.error("Error fetching gigs:", error);
                }
            }
            setLoading(false);
        };
        fetchGigs();
    }, []);

    // Calculated Metrics
    const coverageRate = useMemo(() => (stats.contactedLeads / stats.totalLeads) * 100, [stats]);
    const reachabilityRate = useMemo(() => (stats.validNumbers / stats.totalCalls) * 100, [stats]);
    const argumentationRate = useMemo(() => (stats.callsOver90s / stats.contactedLeads) * 100, [stats]);
    const machineRate = useMemo(() => (stats.answeringMachineCalls / stats.totalCalls) * 100, [stats]);

    // Chart Data
    const histogramData = {
        labels: timeRange === 'monthly' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : 
                timeRange === 'daily' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
                timeRange === 'weekly' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4'] :
                ['2023', '2024', '2025'],
        datasets: [
            {
                label: 'Number of Calls',
                data: [450, 590, 800, 810, 560, 550, 400, 700, 900, 1100, 1200, 1000],
                backgroundColor: 'rgba(255, 77, 77, 0.8)',
                borderRadius: 8,
            },
            {
                label: 'Leads Contacted',
                data: [300, 400, 500, 600, 400, 350, 250, 500, 650, 800, 850, 750],
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 8,
            }
        ]
    };

    const statusChartData = {
        labels: Object.keys(stats.callsByStatus),
        datasets: [{
            data: Object.values(stats.callsByStatus),
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
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Company Analytics</h1>
                            <p className="text-slate-500 font-medium">Performance monitoring & call metrics</p>
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
                            <option value="all">All Gigs</option>
                            {gigs.map(gig => (
                                <option key={gig._id} value={gig._id}>{gig.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    timeRange === range 
                                    ? 'bg-white text-harx-500 shadow-md ring-1 ring-black/5' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Total Leads" 
                    value={stats.totalLeads.toLocaleString()} 
                    icon={<Users className="w-6 h-6" />}
                    color="blue"
                    trend="+12% vs last month"
                    isPositive={true}
                />
                <MetricCard 
                    title="Total Calls" 
                    value={stats.totalCalls.toLocaleString()} 
                    icon={<Phone className="w-6 h-6" />}
                    color="harx"
                    trend="+8% vs last month"
                    isPositive={true}
                />
                <MetricCard 
                    title="Contacted Leads" 
                    value={stats.contactedLeads.toLocaleString()} 
                    icon={<Target className="w-6 h-6" />}
                    color="emerald"
                    trend="+15% vs last month"
                    isPositive={true}
                />
                <MetricCard 
                    title="Valid Numbers" 
                    value={stats.validNumbers.toLocaleString()} 
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    color="amber"
                    trend="+5% vs last month"
                    isPositive={true}
                />
            </div>

            {/* Performance Ratios */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <RatioCard 
                    title="Coverage Rate" 
                    subtitle="Leads Contacted / Total Leads"
                    value={coverageRate} 
                    color="harx"
                />
                <RatioCard 
                    title="Reachability Rate" 
                    subtitle="Valid Numbers / Total Calls"
                    value={reachabilityRate} 
                    color="emerald"
                />
                <RatioCard 
                    title="Argumentation Rate" 
                    subtitle="Calls > 1min30 / Contacted Leads"
                    value={argumentationRate} 
                    color="blue"
                />
                <RatioCard 
                    title="Answering Machine Rate" 
                    subtitle="Machine Calls / Total Calls"
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
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Call Volume Activity</h3>
                            <p className="text-slate-500 text-sm font-medium italic">Tracking calls vs successful contacts</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">Live Data</span>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[350px]">
                        <Bar data={histogramData} options={chartOptions} />
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col">
                    <div className="mb-8">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Call Status Breakdown</h3>
                        <p className="text-slate-500 text-sm font-medium italic">Distribution by outcome</p>
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
                            {Object.entries(stats.callsByStatus).slice(0, 4).map(([status, count], idx) => (
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

function MetricCard({ title, value, icon, color, trend, isPositive }: { title: string, value: string, icon: React.ReactNode, color: 'harx' | 'blue' | 'emerald' | 'amber', trend: string, isPositive: boolean }) {
    const colorClasses = {
        harx: 'bg-harx-500/10 text-harx-500 ring-harx-500/20',
        blue: 'bg-blue-500/10 text-blue-500 ring-blue-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-500 ring-amber-500/20'
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colorClasses[color]} ring-1 transition-transform group-hover:scale-110 duration-300`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isPositive ? '+12%' : '-2%'}
                </div>
            </div>
            <div className="space-y-1">
                <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</h3>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
                <p className="text-[10px] text-slate-400 font-medium italic pt-2">{trend}</p>
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
