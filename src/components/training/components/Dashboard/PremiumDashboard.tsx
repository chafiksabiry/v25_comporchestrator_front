import React from 'react';
import { TrendingUp, Users, DollarSign, Clock, Star, Bell, BookOpen, MessageSquare, Phone, Target, Award, ArrowRight, Briefcase, Zap, Shield, CheckCircle2, Layout, Globe, Activity } from 'lucide-react';

interface PremiumDashboardProps {
  profile?: any;
  trainingStats?: {
    completed: number;
    inProgress: number;
    pending: number;
    totalModules: number;
    overallProgress: number;
  };
}

export default function PremiumDashboard({ profile, trainingStats }: PremiumDashboardProps) {
  // Helper to calculate score (ported from ProfileView)
  const calculateOverallScore = () => {
    if (!profile?.skills?.contactCenter?.length || !profile?.skills?.contactCenter[0]?.assessmentResults?.keyMetrics) return 75; // Fallback
    const { professionalism = 0, effectiveness = 0, customerFocus = 0 } = profile.skills.contactCenter[0].assessmentResults.keyMetrics;
    return Math.floor((professionalism + effectiveness + customerFocus) / 3);
  };

  const displayName = profile?.personalInfo?.name ? profile.personalInfo.name.split(' ')[0] : (profile?.fullName?.split(' ')[0] || 'User');
  const overallScore = calculateOverallScore();
  
  // Calculate completion percentage based on onboarding phases
  const calculateOnboardingProgress = () => {
    if (!profile?.onboardingProgress?.phases) return trainingStats?.overallProgress || 0;
    const phases = profile.onboardingProgress.phases;
    const completedPhases = Object.values(phases).filter((p: any) => p.status === 'completed').length;
    return Math.round((completedPhases / 5) * 100);
  };

  const onboardingProgress = calculateOnboardingProgress();

  const stats = [
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
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/60 shadow-xl shadow-slate-200/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-harx-100/30 to-blue-100/30 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl border-4 border-white overflow-hidden shrink-0">
               {profile?.personalInfo?.photo?.url ? (
                  <img src={profile.personalInfo.photo.url} className="w-full h-full object-cover" alt="Profile" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-2xl font-black text-slate-300">
                    {displayName.charAt(0)}
                  </div>
               )}
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-harx">{displayName}!</span>
              </h1>
              <p className="text-slate-500 font-medium tracking-tight">
                {profile?.professionalSummary?.currentRole || 'Professional Representative'} • {profile?.personalInfo?.email || profile?.email || ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 hover:text-harx-500 transition-all group">
              <Bell className="w-6 h-6" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-harx-500 border-2 border-white rounded-full group-hover:scale-110 transition-transform"></span>
            </button>
            <button className="px-8 py-3.5 bg-gradient-harx text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-harx-500/30 hover:opacity-90 active:scale-95 transition-all">
              Update Profile
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="group relative overflow-hidden bg-slate-50/50 backdrop-blur-md rounded-[28px] p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Professional Focus (Like "Company" section) */}
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
                          {industry}
                        </span>
                      ))}
                   </div>
                </div>
                <div className="space-y-3">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Activities</h3>
                   <div className="flex flex-wrap gap-2">
                      {profile?.specialization?.activities?.slice(0, 3).map((activity: any, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100">
                          {activity}
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
                  {[1,2,3,4,5].map((phase) => {
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

      {/* Skills & Expertise Section */}
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
                        {typeof skill === 'string' ? skill : (skill.name || skill.skill)}
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
    </div>
  );
}
