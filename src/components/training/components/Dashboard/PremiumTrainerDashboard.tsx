import React from 'react';
import { TrendingUp, Users, Award, Target, Bell, MessageSquare, ArrowRight, Zap, Shield, Activity, Users2, BarChart3, Star } from 'lucide-react';

interface PremiumTrainerDashboardProps {
  profile?: any;
  dashboardData?: {
    totalTrainees: number;
    activeTrainees: number;
    completionRate: number;
    averageEngagement: number;
  };
}

export default function PremiumTrainerDashboard({ profile, dashboardData }: PremiumTrainerDashboardProps) {
  const displayName = profile?.personalInfo?.name ? profile.personalInfo.name.split(' ')[0] : (profile?.fullName?.split(' ')[0] || 'Admin');

  const stats = [
    { icon: Users2, label: 'Total Trainees', value: dashboardData?.totalTrainees || 0, change: 'Enrolled', type: 'positive', color: 'blue' },
    { icon: Activity, label: 'Active Now', value: dashboardData?.activeTrainees || 0, change: 'Live', type: 'positive', color: 'emerald' },
    { icon: BarChart3, label: 'Completion', value: `${dashboardData?.completionRate || 0}%`, change: 'Average', type: 'neutral', color: 'harx' },
    { icon: Star, label: 'Engagement', value: `${dashboardData?.averageEngagement || 0}%`, change: 'Score', type: 'positive', color: 'amber' },
  ];

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/60 shadow-xl shadow-slate-200/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-harx-100/30 to-blue-100/30 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl border-4 border-white overflow-hidden shrink-0 flex items-center justify-center">
               <div className="w-full h-full flex items-center justify-center bg-slate-100 text-2xl font-black text-slate-300 uppercase">
                 {displayName.charAt(0)}
               </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                Training <span className="text-transparent bg-clip-text bg-gradient-harx">Overview</span>
              </h1>
              <p className="text-slate-500 font-medium tracking-tight">
                Managing performance for {displayName}'s organization.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 hover:text-harx-500 transition-all group">
              <Bell className="w-6 h-6" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-harx-500 border-2 border-white rounded-full group-hover:scale-110 transition-transform"></span>
            </button>
            <button className="px-8 py-3.5 bg-gradient-harx text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-harx-500/30 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="group relative overflow-hidden bg-white/60 backdrop-blur-md rounded-[28px] p-6 border border-white/80 shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${
              stat.color === 'harx' ? 'bg-harx-500' :
              stat.color === 'blue' ? 'bg-blue-500' :
              stat.color === 'amber' ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${
                stat.color === 'harx' ? 'text-harx-500' :
                stat.color === 'blue' ? 'text-blue-500' :
                stat.color === 'amber' ? 'text-amber-500' :
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
    </div>
  );
}
