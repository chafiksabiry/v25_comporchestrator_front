import React, { useState } from 'react';
import { TrendingUp, Users, DollarSign, Clock, Star, Bell, BookOpen, MessageSquare, Phone, Target, Award, ArrowRight, Briefcase, Zap, Shield, CheckCircle2, Layout, Globe, Activity } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PremiumDashboardProps {
  profile?: any;
  companyName?: string | null;
  userType?: 'rep' | 'company';
  trainingStats?: {
    completed: number;
    inProgress: number;
    pending: number;
    totalModules: number;
    overallProgress: number;
  };
  companyStats?: {
    gigs: number;
    calls: number;
    gigsEnrolled: number;
    activeLeads: number;
    agentsEnrolled: number;
    conversionRate: number;
  };
  callsData?: any[];
  gigs?: any[];
  selectedGigId?: string;
  onGigSelect?: (id: string) => void;
  dateRange?: string;
  onDateRangeSelect?: (range: string) => void;
  customDates?: { start: string; end: string };
  onCustomDatesChange?: (dates: { start: string; end: string }) => void;
}

export default function PremiumDashboard({ 
  profile, 
  companyName, 
  userType = 'rep', 
  trainingStats, 
  companyStats, 
  callsData = [],
  gigs = [],
  selectedGigId = 'all',
  onGigSelect,
  dateRange = 'all',
  onDateRangeSelect,
  customDates,
  onCustomDatesChange
}: PremiumDashboardProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'transcript' | 'insights' | null>(null);

  const toggleExpand = (id: string, tab: 'transcript' | 'insights') => {
    if (expandedCallId === id && expandedTab === tab) {
      setExpandedCallId(null);
      setExpandedTab(null);
    } else {
      setExpandedCallId(id);
      setExpandedTab(tab);
    }
  };

  // Helper to calculate score (ported from ProfileView)
  const calculateOverallScore = () => {
    if (!profile?.skills?.contactCenter?.length || !profile?.skills?.contactCenter[0]?.assessmentResults?.keyMetrics) return 75; // Fallback
    const { professionalism = 0, effectiveness = 0, customerFocus = 0 } = profile.skills.contactCenter[0].assessmentResults.keyMetrics;
    return Math.floor((professionalism + effectiveness + customerFocus) / 3);
  };

  const displayName = profile?.personalInfo?.name
    ? profile.personalInfo.name.split(' ')[0]
    : (profile?.fullName?.split(' ')[0] || localStorage.getItem('userFullName')?.split(' ')[0] || 'User');
  const overallScore = calculateOverallScore();

  // Process calls data for histogram
  const processCallsForChart = () => {
    const now = new Date();
    let daysToShow = 7;
    let grouping: 'day' | 'month' = 'day';

    if (dateRange === 'today') daysToShow = 1;
    else if (dateRange === 'last_week') daysToShow = 7;
    else if (dateRange === 'last_month') daysToShow = 30;
    else if (dateRange === 'last_3_months') { daysToShow = 90; grouping = 'month'; }
    else if (dateRange === 'last_year') { daysToShow = 365; grouping = 'month'; }
    else if (dateRange === 'all') {
      if (callsData && callsData.length > 0) {
        const dates = callsData.map(c => new Date(c.createdAt || c.date).getTime());
        const minDate = new Date(Math.min(...dates));
        daysToShow = Math.ceil((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysToShow > 60) grouping = 'month';
        if (daysToShow < 7) daysToShow = 7;
      } else {
        daysToShow = 7;
      }
    } else if (dateRange === 'custom' && customDates?.start && customDates?.end) {
      const start = new Date(customDates.start);
      const end = new Date(customDates.end);
      daysToShow = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (daysToShow > 60) grouping = 'month';
    }

    if (grouping === 'day') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const range = Array.from({ length: daysToShow }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (daysToShow - 1 - i));
        return d;
      });

      const counts = range.map(date => {
        const dateString = date.toDateString();
        return (callsData || []).filter(call => {
          const callDate = new Date(call.createdAt || call.date);
          return callDate.toDateString() === dateString;
        }).length;
      });

      return {
        labels: range.map(d => daysToShow <= 7 ? dayNames[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`),
        datasets: [
          {
            label: 'Calls',
            data: counts,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
            borderRadius: 8,
            hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
        ],
      };
    } else {
      // Group by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthsToShow = Math.max(12, Math.ceil(daysToShow / 30));
      const range = Array.from({ length: monthsToShow }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (monthsToShow - 1 - i));
        return d;
      });

      const counts = range.map(date => {
        const m = date.getMonth();
        const y = date.getFullYear();
        return (callsData || []).filter(call => {
          const callDate = new Date(call.createdAt || call.date);
          return callDate.getMonth() === m && callDate.getFullYear() === y;
        }).length;
      });

      return {
        labels: range.map(d => months[d.getMonth()]),
        datasets: [
          {
            label: 'Calls',
            data: counts,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
            borderRadius: 8,
            hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
        ],
      };
    }
  };

  const chartData = processCallsForChart();
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.4)',
        },
        ticks: {
          stepSize: 1,
          font: { size: 11, weight: '600' as const },
          color: '#64748b',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11, weight: '600' as const },
          color: '#64748b',
        },
      },
    },
  };

  // Calculate completion percentage based on onboarding phases
  const calculateOnboardingProgress = () => {
    if (!profile?.onboardingProgress?.phases) return trainingStats?.overallProgress || 0;
    const phases = profile.onboardingProgress.phases;
    const completedPhases = Object.values(phases).filter((p: any) => p.status === 'completed').length;
    return Math.round((completedPhases / 5) * 100);
  };

  const onboardingProgress = calculateOnboardingProgress();

  const stats = userType === 'company' ? [
    { icon: Briefcase, label: 'Gigs', value: companyStats?.gigs || 0, change: 'Total', type: 'positive', color: 'harx' },
    { icon: Phone, label: 'Calls', value: companyStats?.calls || 0, change: 'Executed', type: 'positive', color: 'blue' },
    { icon: Activity, label: 'Active Leads', value: companyStats?.activeLeads || 0, change: 'Pipeline', type: 'positive', color: 'amber' },
    { icon: Target, label: 'Conversion Rate', value: `${companyStats?.conversionRate || 0}%`, change: 'Success', type: 'positive', color: 'indigo' },
    { icon: Users, label: 'Agents Enrolled', value: companyStats?.agentsEnrolled || 0, change: 'Total', type: 'positive', color: 'harx' },
  ] : [
    { icon: TrendingUp, label: 'REPS Score', value: `${overallScore}/100`, change: 'Current', type: 'positive', color: 'harx' },
    { icon: BookOpen, label: 'Training', value: `${trainingStats?.overallProgress || 0}%`, change: 'Completion', type: 'positive', color: 'blue' },
    { icon: CheckCircle2, label: 'Modules', value: `${trainingStats?.completed || 0}/${trainingStats?.totalModules || 0}`, change: 'Done', type: 'neutral', color: 'emerald' },
    { icon: Zap, label: 'Skills', value: (profile?.skills?.technical?.length || 0) + (profile?.skills?.professional?.length || 0), change: 'Verified', type: 'positive', color: 'amber' },
  ];

  const recentSpecialization = profile?.specialization?.industries?.slice(0, 3) || ['Customer Support', 'Tech Solutions', 'E-commerce'];

  const performanceMetrics = [
    {
      label: 'Professionalism',
      value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.professionalism || 85,
      icon: Shield,
      color: 'text-blue-500'
    },
    {
      label: 'Effectiveness',
      value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.effectiveness || 90,
      icon: Zap,
      color: 'text-amber-500'
    },
    {
      label: 'Customer Focus',
      value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.customerFocus || 92,
      icon: Users,
      color: 'text-emerald-500'
    },
    {
      label: 'Overall Match',
      value: `${overallScore}%`,
      icon: Target,
      color: 'text-harx-500'
    }
  ];

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">

      {/* Stats Overview */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${stats.length === 6 ? 'lg:grid-cols-6' : (stats.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')} gap-6`}>
        {stats.map((stat, index) => (
          <div key={index} className="group relative overflow-hidden bg-slate-50/50 backdrop-blur-md rounded-[28px] p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${stat.color === 'harx' ? 'bg-harx-500' :
                stat.color === 'blue' ? 'bg-blue-500' :
                  stat.color === 'amber' ? 'bg-amber-500' :
                    stat.color === 'indigo' ? 'bg-indigo-500' :
                      'bg-emerald-500'
              }`}></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${stat.color === 'harx' ? 'text-harx-500' :
                  stat.color === 'blue' ? 'text-blue-500' :
                    stat.color === 'amber' ? 'text-amber-500' :
                      stat.color === 'indigo' ? 'text-indigo-500' :
                        'text-emerald-500'
                }`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white shadow-sm border border-slate-100 text-slate-500`}>
                {stat.change}
              </div>
            </div>

            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {userType === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Histogram Card */}
          <div className="bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-2xl shadow-slate-200/40 overflow-hidden group transition-all duration-500 hover:shadow-harx-500/10">
            <div className="px-10 py-8 border-b border-white/40 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
                    Calls Activity
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    Real-time performance metrics
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-2xl border border-white/60 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gig:</span>
                  <select 
                    value={selectedGigId}
                    onChange={(e) => onGigSelect?.(e.target.value)}
                    className="bg-transparent text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Gigs</option>
                    {gigs.map((gig: any) => (
                      <option key={gig._id} value={gig._id}>
                        {gig.title || gig.name || 'Untitled Gig'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-2xl border border-white/60 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period:</span>
                  <select 
                    value={dateRange}
                    onChange={(e) => onDateRangeSelect?.(e.target.value)}
                    className="bg-transparent text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="last_week">Last Week</option>
                    <option value="last_month">Last Month</option>
                    <option value="last_3_months">Last 3 Months</option>
                    <option value="last_year">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {dateRange === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date"
                      value={customDates?.start || ''}
                      onChange={(e) => onCustomDatesChange?.({ ...customDates!, start: e.target.value })}
                      className="px-2 py-1.5 bg-white/50 border border-white/60 rounded-xl text-[9px] font-bold text-slate-700 outline-none"
                    />
                    <input 
                      type="date"
                      value={customDates?.end || ''}
                      onChange={(e) => onCustomDatesChange?.({ ...customDates!, end: e.target.value })}
                      className="px-2 py-1.5 bg-white/50 border border-white/60 rounded-xl text-[9px] font-bold text-slate-700 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-10">
              <div className="h-[350px] w-full">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Recent Calls Card */}
          {callsData && callsData.length > 0 && (
            <div className="bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-2xl shadow-slate-200/40 overflow-hidden transition-all duration-500 hover:shadow-indigo-500/10">
              <div className="px-10 py-8 border-b border-white/40 flex items-center justify-between bg-white/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
                      Recent Call Recordings
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      {callsData.length} total calls recorded
                    </p>
                  </div>
                </div>
                <button className="px-6 py-2 bg-white/60 hover:bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/80 shadow-sm transition-all active:scale-95">
                  View All History
                </button>
              </div>
              <div className="p-8 space-y-4">
                {callsData.slice().sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()).slice(0, 10).map((call, idx) => (
                  <div key={call._id || idx} className="group flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white/40 hover:bg-white/80 rounded-[24px] border border-white/60 transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${call.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Phone className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-harx-600 transition-colors">
                          {call.lead?.First_Name || call.lead?.Last_Name ? `${call.lead?.First_Name || ''} ${call.lead?.Last_Name || ''}`.trim() : 'Unknown Lead'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <p className="text-[11px] font-medium text-slate-500">{new Date(call.createdAt || call.date).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 flex-wrap md:flex-nowrap">
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Call Duration</p>
                        <p className="text-xs font-black text-slate-900">{call.duration ? `${Math.floor(call.duration/60)}m ${call.duration%60}s` : '0s'}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">AI Score</p>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${call.ai_call_score?.overall?.score >= 80 ? 'bg-emerald-500' : call.ai_call_score?.overall?.score >= 50 ? 'bg-amber-500' : 'bg-slate-300'}`} 
                                 style={{ width: `${call.ai_call_score?.overall?.score || 0}%` }}></div>
                          </div>
                          <span className={`text-xs font-black ${call.ai_call_score?.overall?.score >= 80 ? 'text-emerald-600' : call.ai_call_score?.overall?.score >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {call.ai_call_score?.overall?.score || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[280px]">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const recordingUrl = call.recording_url_cloudinary || call.recording_url;
                            if (!recordingUrl) return <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-50/50 rounded-xl">No recording</span>;
                            
                            const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) 
                              ? `${recordingUrl}.mp3` 
                              : recordingUrl;

                            return <audio controls src={finalUrl} className="h-9 w-full opacity-80 hover:opacity-100 transition-opacity" />;
                          })()}
                        </div>
                        <div className="flex items-center gap-4 justify-end">
                          {call.transcript && call.transcript.length > 0 && (
                            <button 
                              onClick={() => toggleExpand(call._id || idx, 'transcript')}
                              className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-lg ${expandedCallId === (call._id || idx) && expandedTab === 'transcript' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                              <MessageSquare className="w-3 h-3" />
                              Transcript
                            </button>
                          )}
                          {call.ai_call_score && (
                            <button 
                              onClick={() => toggleExpand(call._id || idx, 'insights')}
                              className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-lg ${expandedCallId === (call._id || idx) && expandedTab === 'insights' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            >
                              <Star className="w-3 h-3" />
                              AI Insights
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedCallId === (call._id || idx) && (
                      <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top duration-500 w-full">
                        {expandedTab === 'transcript' ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" />
                                Full Conversation Transcript
                              </h4>
                              <button onClick={() => setExpandedCallId(null)} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase">Close</button>
                            </div>
                            <div className="bg-slate-50/50 rounded-3xl p-8 max-h-[400px] overflow-y-auto border border-slate-100 space-y-4 custom-scrollbar">
                              {call.transcript.map((t: any, i: number) => (
                                <div key={i} className={`flex gap-4 ${t.speaker?.toLowerCase().includes('agent') ? 'flex-row' : 'flex-row-reverse'}`}>
                                  <div className={`flex flex-col max-w-[80%] ${t.speaker?.toLowerCase().includes('agent') ? 'items-start' : 'items-end'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.speaker}</span>
                                      <span className="text-[9px] font-bold text-slate-300">{t.timestamp}</span>
                                    </div>
                                    <div className={`px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed ${t.speaker?.toLowerCase().includes('agent') ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100' : 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10'}`}>
                                      {t.text}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-8">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                <Star className="w-3 h-3" />
                                Detailed AI Performance Analysis
                              </h4>
                              <button onClick={() => setExpandedCallId(null)} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase">Close</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {[
                                { label: 'Agent Fluency', data: call.ai_call_score["Agent fluency"], color: 'blue' },
                                { label: 'Sentiment Analysis', data: call.ai_call_score["Sentiment analysis"], color: 'indigo' },
                                { label: 'Fraud Detection', data: call.ai_call_score["Fraud detection"], color: 'rose' }
                              ].map((metric, mIdx) => (
                                <div key={mIdx} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
                                  <div className="flex justify-between items-center mb-4">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg bg-${metric.color}-50 text-${metric.color}-600`}>
                                      {metric.data?.score || 0}%
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">
                                    "{metric.data?.feedback || 'No specific feedback provided.'}"
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-100/50 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                              <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Activity className="w-3 h-3" />
                                Executive Summary & Recommendations
                              </h5>
                              <p className="text-sm font-bold text-emerald-900 leading-relaxed relative z-10">
                                {call.ai_call_score.overall?.feedback || 'Analysis completed. The agent demonstrated standard performance throughout the interaction.'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {userType === 'rep' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Professional Focus */}
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-md rounded-[32px] border border-white/80 shadow-xl shadow-slate-200/30 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/40">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-5 h-5 text-harx-500" />
                Professional Focus
              </h2>
              <button className="text-[10px] font-black text-harx-600 uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">About You</h3>
                <p className="text-slate-700 leading-relaxed font-medium italic">
                  "{profile?.professionalSummary?.profileDescription || 'No professional summary provided. Update your profile to showcase your expertise.'}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Industries</h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSpecialization.map((industry: any, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-harx-50 text-harx-700 rounded-xl text-xs font-bold border border-harx-100">
                        {typeof industry === 'string' ? industry : (industry.name || industry.title || 'Unknown Industry')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile?.specialization?.activities?.slice(0, 3).map((activity: any, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100">
                        {typeof activity === 'string' ? activity : (activity.name || activity.title || 'Unknown Activity')}
                      </span>
                    )) || ['Consulting', 'Sales', 'Support'].map((act, i) => (
                      <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold border border-slate-100 italic">
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="space-y-8">
            <div className="bg-slate-950 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-harx-500/30 transition-colors"></div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8 relative z-10 opacity-70">Assessment Metrics</h2>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <metric.icon className={`w-5 h-5 mb-3 ${metric.color}`} />
                    <p className="text-xl font-black text-white tracking-tighter">{metric.value}</p>
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-8 border border-white/80 shadow-xl shadow-slate-200/30">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Onboarding Status</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Completion</span>
                    <span className="text-harx-600">{onboardingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                    <div
                      className="bg-gradient-harx h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${onboardingProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((phase) => {
                    const isComp = profile?.onboardingProgress?.phases?.[`phase${phase}`]?.status === 'completed';
                    return (
                      <div key={phase} className={`h-1.5 rounded-full ${isComp ? 'bg-harx-500' : 'bg-slate-200'}`} />
                    );
                  })}
                </div>
                <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">
                  Phase {profile?.onboardingProgress?.currentPhase || 1} in progress
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skills & Expertise Section - Only for Reps */}
      {userType === 'rep' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-500" />
              Verified Expertise
            </h2>
            <button className="text-xs font-black text-harx-600 uppercase tracking-widest hover:text-harx-700 transition-colors px-4 py-2 bg-harx-50 rounded-xl border border-harx-100">
              View All Skills
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Technical Skills', items: profile?.skills?.technical || [], color: 'blue' },
              { label: 'Professional Skills', items: profile?.skills?.professional || [], color: 'harx' },
              { label: 'Soft Skills', items: profile?.skills?.soft || [], color: 'emerald' }
            ].map((category, idx) => (
              <div key={idx} className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 border border-white/80 shadow-xl shadow-slate-200/30">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{category.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {category.items.length > 0 ? (
                    category.items.map((skill: any, sIdx: number) => (
                      <span key={sIdx} className={`px-3 py-1 rounded-lg bg-${category.color}-50 text-${category.color}-700 text-[10px] font-black uppercase border border-${category.color}-100`}>
                        {typeof skill === 'string' ? skill : (skill.name || (typeof skill.skill === 'object' ? skill.skill?.name : skill.skill) || 'Unknown Skill')}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 italic">No skills listed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
