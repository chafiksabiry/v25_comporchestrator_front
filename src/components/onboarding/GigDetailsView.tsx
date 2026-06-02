import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Target, Award, DollarSign, Users, MapPin, ClockIcon, Globe, Settings, Phone, Repeat, Star, X, ChevronRight, Briefcase, Sparkles, Calendar, Zap } from 'lucide-react';
import RepProfileView from '../RepProfileView';
import { groupSchedules } from '../gigsaicreation/lib/scheduleUtils';

interface Gig {
  _id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  seniority: {
    level: string;
    yearsExperience: string;
  };
  commission: {
    base?: string;
    baseAmount?: string;
    bonus?: string;
    bonusAmount?: string | number;
    structure?: string;
    currency?: {
      _id: string;
      code?: string;
      name?: string;
      symbol?: string;
      isActive?: boolean;
      createdAt?: string;
      updatedAt?: string;
      __v?: number;
    };
    transactionCommission?: number | {
      type: string;
      amount: string | number;
    };
    commission_per_call?: number;
    minimumVolume?: {
      amount: string | number;
      period: string;
      unit: string;
    };
    additionalDetails?: string;
  };
  availability: {
    minimumHours: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
      _id: string;
    }>;
    time_zone: {
      countryCode: string;
      countryName: string;
      zoneName: string;
      gmtOffset: number;
    };
    flexibility: string[];
  };
  team: {
    size: string;
    structure: Array<{
      seniority: {
        level: string;
        yearsExperience: string;
      };
      roleId: string;
      count: number;
      _id: string;
    }>;
    territories: Array<{
      name: {
        common: string;
        official: string;
      };
      flags: {
        png: string;
        svg: string;
        alt: string;
      };
      _id: string;
    }>;
  };
  skills: {
    professional: Array<{
      skill: {
        name: string;
        category: string;
      };
      level: number;
    }>;
    technical: Array<{
      skill: {
        name: string;
        category: string;
      };
      level: number;
    }>;
    soft: Array<{
      skill: {
        name: string;
        category: string;
      };
      level: number;
    }>;
    languages: Array<{
      language: {
        name: string;
        nativeName: string;
      };
      proficiency: string;
    }>;
  };
  destination_zone: {
    name: {
      common: string;
      official: string;
    };
    flags: {
      png: string;
      alt: string;
    };
    cca2: string;
  };
}

interface GigDetailsViewProps {
  gig: Gig;
  onBack: () => void;
}

const GigDetailsView: React.FC<GigDetailsViewProps> = ({ gig, onBack }) => {
  const [enrolledAgents, setEnrolledAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState<boolean>(false);
  const [showAgentsModal, setShowAgentsModal] = useState<boolean>(false);
  const [selectedAgentProfile, setSelectedAgentProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  const handleMatchingRedirect = () => {
    if (window.location.hash.includes('dashboard') || window.location.pathname.includes('dashboard')) {
      window.location.hash = '#/dashboard/rep-matching';
    } else {
      window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: 'matching' } }));
    }
  };

  useEffect(() => {
    if (gig?._id) {
      setLoadingAgents(true);
      const MATCHING_API_URL = import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api';
      fetch(`${MATCHING_API_URL}/gig-agents/gig/${gig._id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEnrolledAgents(data);
          }
        })
        .catch(err => console.error("Error fetching enrolled agents:", err))
        .finally(() => setLoadingAgents(false));
    }
  }, [gig?._id]);

  const handleAgentClick = async (agentId: string) => {
    try {
      setLoadingProfile(true);
      const REP_API_URL = 'https://v25repscreationwizardbackend-production.up.railway.app/api';
      const token = localStorage.getItem('token');
      const response = await fetch(`${REP_API_URL}/profiles/${agentId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setSelectedAgentProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      alert('Impossible de charger le profil de l\'agent.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'pending':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'rejected':
        return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const getAgentIdString = (agent: any): string => {
    if (!agent) return '';
    if (typeof agent.agentId === 'string') {
      return agent.agentId;
    }
    if (agent.agentId && typeof agent.agentId === 'object') {
      return agent.agentId._id || agent.agentId.id || '';
    }
    if (typeof agent.agent === 'string') {
      return agent.agent;
    }
    if (agent.agent && typeof agent.agent === 'object') {
      return agent.agent._id || agent.agent.id || '';
    }
    return agent._id || '';
  };

  const getAgentInitials = (agent: any): string => {
    if (!agent) return 'AG';
    const agentObj = agent.agentId;
    if (agentObj && typeof agentObj === 'object') {
      const name = agentObj.personalInfo?.name || agentObj.name;
      if (name && typeof name === 'string') {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        if (parts.length === 1 && parts[0].length >= 2) {
          return parts[0].substring(0, 2).toUpperCase();
        }
      }
    }
    const idStr = getAgentIdString(agent);
    if (idStr) return idStr.substring(0, 2).toUpperCase();
    return 'AG';
  };

  const getAgentName = (agent: any): string => {
    if (!agent) return 'Agent';
    const agentObj = agent.agentId;
    if (agentObj && typeof agentObj === 'object') {
      if (agentObj.personalInfo?.name) return agentObj.personalInfo.name;
      if (agentObj.name) return agentObj.name;
    }
    return `Agent ID: ${getAgentIdString(agent).substring(0, 8)}`;
  };

  const getAgentEmail = (agent: any): string => {
    if (!agent) return '';
    const agentObj = agent.agentId;
    if (agentObj && typeof agentObj === 'object') {
      return agentObj.personalInfo?.email || agentObj.email || '';
    }
    return '';
  };

  const getAgentPhone = (agent: any): string => {
    if (!agent) return '';
    const agentObj = agent.agentId;
    if (agentObj && typeof agentObj === 'object') {
      return agentObj.personalInfo?.phone || agentObj.phone || '';
    }
    return '';
  };

  const getAgentAvatar = (agent: any): string => {
    if (!agent) return '';
    const agentObj = agent.agentId;
    if (agentObj && typeof agentObj === 'object') {
      return (
        agentObj.personalInfo?.photo?.url ||
        agentObj.personalInfo?.profilePicture ||
        agentObj.photo?.url ||
        agentObj.photo ||
        agentObj.profilePicture ||
        ''
      );
    }
    return '';
  };

  return (
    <div className="space-y-8 p-8 bg-gradient-to-br from-slate-50 via-white to-purple-50/20 min-h-screen text-slate-800 rounded-[24px] border border-slate-100 relative overflow-hidden shadow-xl">
      {/* Soft elegant ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/[0.02] rounded-full blur-[120px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-rose-500/[0.02] rounded-full blur-[120px] pointer-events-none animate-float-slow" style={{ animationDelay: '-3s' }} />

      {/* Header Back Button */}
      <div className="flex items-center justify-between relative z-10 animate-slide-up">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2.5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:text-slate-950 transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to Gigs
        </button>
      </div>

      {/* Main Card (Matching 1st Image) */}
      <div className="rounded-[2rem] bg-white border border-slate-100 p-10 space-y-10 shadow-xl shadow-slate-100/50 relative overflow-hidden z-10 animate-slide-up [animation-delay:80ms] hover-lift">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block animate-pulse">
              {gig.category || 'OUTBOUND SALES'}
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight uppercase tracking-tight bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900/90">
              {gig.title}
            </h1>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
          {/* Left Column: Job Description */}
          <div className="space-y-6 animate-slide-up [animation-delay:120ms]">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Job Description</h2>
            <p className="text-slate-600 leading-relaxed font-medium text-[15px]">
              {gig.description || 'Nous recherchons une équipe commerciale dynamique comprenant jusqu\'à 5 télévendeurs pour assurer l\'intégralité du cycle de vente de produits d\'assurance complémentaire santé/mutuelle à destination de clients particuliers en France. Votre mission couvrira toutes les étapes du processus de vente.'}
            </p>
            {/* Seniority Tags */}
            <div className="flex flex-wrap gap-2.5 mt-4">
              <span className="px-3.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-extrabold uppercase tracking-wide hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-rose-100 hover:border-rose-200">
                {gig.seniority?.level || 'Mid-Level'}
              </span>
              <span className="px-3.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-extrabold uppercase tracking-wide hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-rose-100 hover:border-rose-200">
                {gig.seniority?.yearsExperience || '2'} Years Experience
              </span>
            </div>
          </div>

          {/* Right Column: Commission & Details */}
          <div className="space-y-6 animate-slide-up [animation-delay:150ms]">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Commission & details</h2>

            <div className="space-y-5">
              {/* Badges Row */}
              <div className="flex flex-wrap gap-3.5">
                <div className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-cyan-500/10 hover:scale-105 transition-all duration-300 cursor-default hover:shadow-cyan-500/20">
                  <Phone size={14} className="animate-bounce" />
                  {gig.commission?.commission_per_call || '2.8'}€ / APPEL
                </div>
                <div className="px-5 py-3 animate-shimmer-purple animate-pulse-subtle text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/15 cursor-default hover:shadow-purple-500/30">
                  <Repeat size={14} className="animate-spin-slow hover:rotate-180 transition-transform duration-500" />
                  {typeof gig.commission?.transactionCommission === 'number'
                    ? gig.commission.transactionCommission
                    : ((gig.commission?.transactionCommission as any)?.amount || '21')}€ / TRANSACTION
                </div>
              </div>

              {/* Bonus Badge */}
              <div className="px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 shadow-lg shadow-rose-500/10 hover:scale-105 transition-all duration-300 cursor-default hover:shadow-rose-500/20">
                <Star size={14} className="animate-spin-slow" />
                +{gig.commission?.bonusAmount || '84'}€ BONUS
                <span className="text-[10px] font-bold opacity-80 normal-case ml-1 tracking-normal bg-black/15 px-2 py-0.5 rounded-md">
                  Chaque {gig.commission?.minimumVolume?.amount || '25'} appels / {gig.commission?.minimumVolume?.period || 'mois'}
                </span>
              </div>

              {/* Description Box */}
              <div className="bg-slate-50 rounded-2xl p-6 text-slate-600 text-xs font-medium leading-relaxed italic border border-slate-100 hover:border-slate-200 transition-colors duration-300">
                {gig.commission?.additionalDetails || "Une transaction est comptabilisée uniquement si le contrat est signé et non rétracté dans les 14 jours. Les résiliations dans les 3 mois suivant la signature entraînent l'annulation et le remboursement de la commission correspondante. La prime de performance est de 100 € pour 25 transactions validées sur un même mois."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Team, Territory & Agents Control Center */}
      <div className="rounded-[2rem] bg-white border border-slate-100 p-8 relative overflow-hidden shadow-xl shadow-slate-100/50 z-10 animate-slide-up [animation-delay:150ms] hover-lift">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-gradient-to-br from-purple-500/[0.02] to-indigo-500/[0.02] rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600 animate-pulse animate-glow-pulse" />
              Team & Territory setup
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Campaign staffing, target zone & active assignments
            </p>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Team Size & Capacity */}
          <div className="space-y-2.5 hover:scale-[1.02] transition-transform duration-300">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Team Structure</span>
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center gap-4 hover:border-purple-200 transition-colors duration-300">
              <div className="p-3 bg-purple-100 rounded-xl text-purple-700 shrink-0 animate-bounce" style={{ animationDuration: '3s' }}>
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-955 leading-none">{gig.team?.size || 5}</p>
                <p className="text-[10px] text-purple-600 font-bold mt-1 uppercase tracking-wider">Allocated Seats</p>
              </div>
            </div>
          </div>

          {/* Column 2: Destination Territory */}
          {gig.destination_zone && (
            <div className="space-y-2.5 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Target Country</span>
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-4 hover:border-emerald-200 transition-colors duration-300">
                {gig.destination_zone.flags?.png ? (
                  <img src={gig.destination_zone.flags.png} alt="" className="w-12 h-8 rounded-lg border border-slate-200 object-cover shrink-0 shadow-sm animate-pulse-subtle" />
                ) : (
                  <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-base font-extrabold text-slate-950 leading-none truncate">
                    {typeof gig.destination_zone === 'object' ? gig.destination_zone.name?.common : gig.destination_zone}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-black mt-1 uppercase tracking-wider">
                    {typeof gig.destination_zone === 'object' ? (gig.destination_zone.name?.official || 'Territory') : 'Territory'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Column 3: Active Reps & Live preview */}
          <div className="space-y-2.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assigned Representatives</span>
            {enrolledAgents.length > 0 ? (
              <div
                onClick={() => setShowAgentsModal(true)}
                className="p-4 bg-indigo-50/50 hover:bg-indigo-100/50 cursor-pointer rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 transition-all duration-300 group hover:scale-[1.02] hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex -space-x-3 overflow-hidden">
                  {enrolledAgents.slice(0, 4).map((agent, i) => (
                    <div
                      key={i}
                      className="inline-block h-8 w-8 rounded-full overflow-hidden ring-2 ring-white bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shadow-sm uppercase transition-transform group-hover:-translate-y-0.5 group-hover:scale-110"
                      style={{ transitionDelay: `${i * 40}ms` }}
                    >
                      {getAgentAvatar(agent) ? (
                        <img src={getAgentAvatar(agent)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        getAgentInitials(agent)
                      )}
                    </div>
                  ))}
                  {enrolledAgents.length > 4 && (
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shadow-md">
                      +{enrolledAgents.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black text-indigo-600 group-hover:text-indigo-800 transition-colors uppercase tracking-wider flex items-center gap-1 shrink-0">
                  View List
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform animate-pulse" />
                </span>
              </div>
            ) : (
              <button 
                onClick={handleMatchingRedirect}
                className="w-full p-4 bg-indigo-50/50 hover:bg-indigo-100/50 rounded-2xl border border-indigo-100/70 border-dashed flex items-center justify-center gap-2 transition-all duration-300 group shadow-sm hover:scale-[1.02]"
              >
                <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse animate-glow-pulse group-hover:scale-110" />
                <span className="text-[10px] text-indigo-600 font-black uppercase tracking-wider group-hover:text-indigo-800">Match New Agents</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Availability */}
      {(() => {
        const rawSchedule = Array.isArray(gig.availability?.schedule) ? gig.availability.schedule : [];
        const grouped = rawSchedule.length > 0
          ? groupSchedules(rawSchedule.map((s) => ({ day: s.day, hours: { start: s.hours?.start, end: s.hours?.end } })))
          : [];

        const totalMinutes = rawSchedule.reduce((acc, s) => {
          const start = s?.hours?.start;
          const end = s?.hours?.end;
          if (!start || !end) return acc;
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return acc;
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          return acc + Math.max(0, diff);
        }, 0);
        const totalHoursDisplay = totalMinutes > 0
          ? `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 ? String(totalMinutes % 60).padStart(2, '0') : ''}`
          : '—';

        const tz: any = gig.availability?.time_zone;
        const timezoneDisplay =
          (tz && typeof tz === 'object' && (tz.zoneName || tz.countryName)) ||
          (typeof tz === 'string' ? tz : '') ||
          '';

        const flexibility = Array.isArray(gig.availability?.flexibility) ? gig.availability.flexibility : [];
        const minimumHours = gig.availability?.minimumHours || ({} as any);

        const hasAnything =
          grouped.length > 0 || !!timezoneDisplay || flexibility.length > 0 ||
          !!minimumHours?.daily || !!minimumHours?.weekly || !!minimumHours?.monthly;

        if (!hasAnything) return null;

        return (
          <div className="rounded-[2rem] bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/50 z-10 animate-slide-up [animation-delay:200ms] hover-lift">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Calendar className="h-5 w-5 text-indigo-600 animate-pulse animate-glow-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Availability</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Plages horaires actives du gig
                  </p>
                </div>
              </div>

              {/* Summary pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-indigo-100">
                  <ClockIcon className="w-3 h-3" />
                  {totalHoursDisplay} / semaine
                </div>
                {timezoneDisplay && (
                  <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-100">
                    <Globe className="w-3 h-3" />
                    {String(timezoneDisplay)}
                  </div>
                )}
                <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-slate-200">
                  {rawSchedule.length} jours
                </div>
              </div>
            </div>

            {/* Schedule groups */}
            {grouped.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.map((slot, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white flex items-center gap-4 hover:shadow-md hover:border-indigo-200 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <ClockIcon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">
                        {slot.days.join(' · ')}
                      </div>
                      <div className="text-lg font-black text-slate-900 tabular-nums">
                        {slot.hours.start}
                        <span className="text-slate-300 font-bold mx-1.5">→</span>
                        {slot.hours.end}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-500 font-medium italic">
                Aucune plage horaire renseignée.
              </div>
            )}

            {/* Minimum hours + Flexibility */}
            {(minimumHours?.daily || minimumHours?.weekly || minimumHours?.monthly || flexibility.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Minimum hours */}
                {(minimumHours?.daily || minimumHours?.weekly || minimumHours?.monthly) && (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      Minimum Hours
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(['daily', 'weekly', 'monthly'] as const).map((key) => (
                        <div key={key} className="text-center p-3 bg-white border border-slate-100 rounded-xl hover:border-purple-200 transition-colors">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{key}</p>
                          <p className="text-xl font-black text-slate-900 tabular-nums">
                            {minimumHours?.[key] ?? '—'}
                            {minimumHours?.[key] != null && <span className="text-xs text-slate-400 ml-0.5">h</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flexibility */}
                {flexibility.length > 0 && (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Flexibility
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {flexibility.map((opt, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 hover:border-rose-200 rounded-xl text-[11px] font-extrabold text-slate-700 transition-all duration-300 hover:scale-105"
                        >
                          <Zap className="w-3 h-3 text-rose-500" />
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Skills & Requirements */}
      {gig.skills && (
        <div className="rounded-[2rem] bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/50 z-10 animate-slide-up [animation-delay:220ms] hover-lift">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Target className="h-5 w-5 text-purple-600 animate-pulse animate-glow-pulse" />
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Skills & Requirements</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Skills & Stack */}
            <div className="lg:col-span-8 space-y-6">
              {/* Professional & Soft Skills Card */}
              <div className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-6 hover:bg-white hover:border-slate-200 transition-all duration-300 hover:shadow-md">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Core & Soft Competencies
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {/* Professional Skills */}
                  {gig.skills.professional?.map((item, index) => (
                    <div key={`prof-${index}`} className="inline-flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-100/80 hover:border-purple-200 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xs">
                      <span className="text-xs font-extrabold text-slate-700">
                        {typeof item.skill === 'object' ? item.skill?.name : (item.skill || 'Unnamed Skill')}
                      </span>
                      <span className="text-[9px] font-black bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-md">
                        Lvl {item.level}
                      </span>
                    </div>
                  ))}
                  {/* Soft Skills */}
                  {gig.skills.soft?.map((item, index) => (
                    <div key={`soft-${index}`} className="inline-flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-100/80 hover:border-rose-200 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xs">
                      <span className="text-xs font-extrabold text-slate-700">
                        {typeof item.skill === 'object' ? item.skill?.name : (item.skill || 'Unnamed Skill')}
                      </span>
                      <span className="text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-md">
                        Lvl {item.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Stack Card */}
              <div className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-6 hover:bg-white hover:border-slate-200 transition-all duration-300 hover:shadow-md">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  Technical & Operations Stack
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {gig.skills.technical?.map((item, index) => (
                    <div key={`tech-${index}`} className="inline-flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-100/80 hover:border-cyan-200 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xs">
                      <span className="text-xs font-extrabold text-slate-700">
                        {typeof item.skill === 'object' ? item.skill?.name : (item.skill || 'Unnamed Skill')}
                      </span>
                      <span className="text-[9px] font-black bg-cyan-50 text-cyan-600 border border-cyan-100 px-2 py-0.5 rounded-md">
                        Lvl {item.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Languages & Communication */}
            <div className="lg:col-span-4">
              <div className="bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white border border-indigo-100/40 rounded-2xl p-6 h-full hover:border-indigo-200 transition-all duration-300 hover:shadow-md relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-24 h-24 bg-indigo-500/[0.02] rounded-full blur-xl pointer-events-none" />
                
                <div>
                  <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest border-b border-indigo-100/50 pb-3 mb-4 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 animate-spin-slow text-indigo-500" />
                    Languages
                  </h3>
                  <div className="space-y-3">
                    {gig.skills.languages?.map((item, index) => (
                      <div key={`lang-${index}`} className="p-3 bg-white border border-slate-100/70 hover:border-indigo-200 rounded-xl flex justify-between items-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs">
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">
                            {typeof item.language === 'object' ? item.language?.name : (item.language || 'Unnamed Language')}
                          </p>
                          {typeof item.language === 'object' && item.language?.nativeName && (
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold italic">{item.language.nativeName}</p>
                          )}
                        </div>
                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          {item.proficiency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrolled Agents Modal */}
      {showAgentsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-11/12 max-w-4xl shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col overflow-hidden animate-scale-up-bounce">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="text-purple-600 animate-pulse animate-glow-pulse" />
                  Enrolled Representatives
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Currently assigned agents for <span className="font-extrabold text-purple-600">{gig.title}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAgentsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all duration-300 hover:scale-110 active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-8 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
              <div className="divide-y divide-slate-100">
                {enrolledAgents.map((agent, index) => {
                  const score = agent.matchScore || 0.85;
                  const scorePct = Math.round(score * 100);
                  const statusColors = getAgentStatusColor(agent.status || 'accepted');

                  return (
                    <div 
                      key={agent._id || index} 
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 border-b border-slate-100 last:border-b-0 animate-fade-in-row"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 ring-2 ring-purple-100 text-white font-black text-sm flex items-center justify-center shadow-md uppercase hover:scale-110 hover:rotate-6 transition-transform duration-300">
                          {getAgentAvatar(agent) ? (
                            <img src={getAgentAvatar(agent)} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            getAgentInitials(agent)
                          )}
                        </div>
                        <div>
                          <p 
                            className="font-extrabold text-slate-950 text-base flex items-center gap-2 cursor-pointer hover:text-purple-600 transition-colors"
                            onClick={() => handleAgentClick(getAgentIdString(agent))}
                          >
                            {getAgentName(agent)}
                          </p>
                          <div className="flex items-center gap-2 mt-2 animate-slide-up" style={{ animationDelay: `${(index * 80) + 100}ms` }}>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors.bg} ${statusColors.text} ${statusColors.border} hover:scale-105 transition-transform duration-200 cursor-default`}>
                              {agent.status || 'accepted'}
                            </span>
                            {agent.emailSent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100">
                                Invited
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-end md:self-center">
                        {/* Match Score Indicator */}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">MATCH SCORE</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${score >= 0.8 ? 'from-emerald-400 to-emerald-500' : 'from-amber-400 to-amber-500'} animate-width-fill`}
                                style={{ width: `${scorePct}%`, animationDelay: `${(index * 80) + 150}ms` }}
                              />
                            </div>
                            <span className={`text-sm font-black ${score >= 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {scorePct}%
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rep Profile View Modal overlay */}
      {selectedAgentProfile && (
        <RepProfileView
          profile={selectedAgentProfile}
          onClose={() => setSelectedAgentProfile(null)}
        />
      )}

      {/* Loading Profile Overlay */}
      {loadingProfile && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs flex items-center justify-center z-[110] animate-in fade-in duration-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Styled custom classes and animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer-purple {
          background: linear-gradient(90deg, #c084fc 0%, #a855f7 25%, #6366f1 50%, #a855f7 75%, #c084fc 100%);
          background-size: 200% 100%;
          animation: shimmer 4s infinite linear;
        }
        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(168, 85, 247, 0); }
          50% { transform: scale(1.03); box-shadow: 0 0 15px rgba(168, 85, 247, 0.3); }
        }
        .animate-pulse-subtle {
          animation: subtlePulse 3s infinite ease-in-out;
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 12s infinite linear;
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        .animate-float-slow {
          animation: floatSlow 8s infinite ease-in-out;
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(168, 85, 247, 0.1)); }
          50% { filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.4)); }
        }
        .animate-glow-pulse {
          animation: glowPulse 2.5s infinite ease-in-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes scaleUpBounce {
          from { opacity: 0; transform: scale(0.96) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-up-bounce {
          animation: scaleUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-row {
          animation: fadeInRow 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes widthFill {
          from { width: 0%; }
        }
        .animate-width-fill {
          animation: widthFill 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hover-lift {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.05);
          border-color: rgba(168, 85, 247, 0.15);
        }
      `}</style>
    </div>
  );
};

export default GigDetailsView;
