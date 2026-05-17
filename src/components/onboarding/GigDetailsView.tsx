import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Target, Award, DollarSign, Users, MapPin, ClockIcon, Globe, Settings, Phone, Repeat, Star, X, ChevronRight, Briefcase, Sparkles } from 'lucide-react';
import RepProfileView from '../RepProfileView';

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
    <div className="space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-black uppercase tracking-tighter text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all duration-300 shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Gigs
        </button>
      </div>

      {/* Main Card (Matching 1st Image) */}
      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-10 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-black text-harx-400 uppercase tracking-widest">
              {gig.category || 'OUTBOUND SALES'}
            </span>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              {gig.title}
            </h1>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Job Description */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Job Description</h2>
            <p className="text-gray-600 leading-relaxed font-medium text-lg">
              {gig.description || 'Nous recherchons une équipe commerciale dynamique comprenant jusqu\'à 5 télévendeurs pour assurer l\'intégralité du cycle de vente de produits d\'assurance complémentaire santé/mutuelle à destination de clients particuliers en France. Votre mission couvrira toutes les étapes du processus de vente.'}
            </p>
            {/* Seniority Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                {gig.seniority?.level || 'Mid-Level'}
              </span>
              <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                {gig.seniority?.yearsExperience || '2'} Years Experience
              </span>
            </div>
          </div>

          {/* Right Column: Commission & Details */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Commission & details</h2>

            <div className="space-y-4">
              {/* Badges Row */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Phone size={14} />
                  {gig.commission?.commission_per_call || '2.8'}€ / APPEL
                </div>
                <div className="px-4 py-2 animate-shimmer-purple animate-pulse-subtle text-white rounded-lg text-sm font-black uppercase tracking-tight flex items-center gap-2 hover:scale-105 transition-transform duration-300 shadow-md">
                  <Repeat size={14} className="animate-spin-slow hover:rotate-180 transition-transform duration-500" />
                  {typeof gig.commission?.transactionCommission === 'number'
                    ? gig.commission.transactionCommission
                    : ((gig.commission?.transactionCommission as any)?.amount || '21')}€ / TRANSACTION
                </div>
              </div>

              {/* Bonus Badge */}
              <div className="px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-lg text-sm font-black uppercase tracking-tight inline-flex items-center gap-2">
                <Star size={14} />
                +{gig.commission?.bonusAmount || '84'}€ BONUS
                <span className="text-xs font-medium opacity-80 normal-case ml-1">
                  Chaque {gig.commission?.minimumVolume?.amount || '25'} appels / {gig.commission?.minimumVolume?.period || 'mois'}
                </span>
              </div>

              {/* Description Box */}
              <div className="bg-gray-50 rounded-2xl p-6 text-gray-600 text-sm font-medium leading-relaxed italic border border-gray-100">
                {gig.commission?.additionalDetails || "Une transaction est comptabilisée uniquement si le contrat est signé et non rétracté dans les 14 jours. Les résiliations dans les 3 mois suivant la signature entraînent l'annulation et le remboursement de la commission correspondante. La prime de performance est de 100 € pour 25 transactions validées sur un même mois."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Team, Territory & Agents Control Center */}
      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-8 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-600 animate-pulse" />
              Team & Territory setup
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Campaign staffing, target zone & active assignments
            </p>
          </div>

          {enrolledAgents.length > 0 && (
            <button
              onClick={() => setShowAgentsModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Users size={14} />
              Manage Representatives ({enrolledAgents.length})
            </button>
          )}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Team Size & Capacity */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Team Structure</span>
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl text-purple-700 shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 leading-none">{gig.team?.size || 5}</p>
                <p className="text-xs text-gray-500 font-bold mt-1 uppercase">Allocated Seats</p>
              </div>
            </div>
          </div>

          {/* Column 2: Destination Territory */}
          {gig.destination_zone && (
            <div className="space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Country</span>
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                {gig.destination_zone.flags?.png ? (
                  <img src={gig.destination_zone.flags.png} alt="" className="w-12 h-8 rounded-lg border border-gray-200 object-cover shrink-0 shadow-sm" />
                ) : (
                  <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-base font-extrabold text-gray-900 leading-none truncate">
                    {typeof gig.destination_zone === 'object' ? gig.destination_zone.name?.common : gig.destination_zone}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-black mt-1 uppercase tracking-wider">
                    {typeof gig.destination_zone === 'object' ? (gig.destination_zone.name?.official || 'Territory') : 'Territory'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Column 3: Active Reps & Live preview */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Assigned Representatives</span>
            {enrolledAgents.length > 0 ? (
              <div
                onClick={() => setShowAgentsModal(true)}
                className="p-4 bg-indigo-50/50 hover:bg-indigo-100/50 cursor-pointer rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 transition-all duration-300 group"
              >
                <div className="flex -space-x-3 overflow-hidden">
                  {enrolledAgents.slice(0, 4).map((agent, i) => (
                    <div
                      key={i}
                      className="inline-block h-8 w-8 rounded-full overflow-hidden ring-2 ring-white bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shadow-sm uppercase transition-transform group-hover:-translate-y-0.5"
                    >
                      {getAgentAvatar(agent) ? (
                        <img src={getAgentAvatar(agent)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        getAgentInitials(agent)
                      )}
                    </div>
                  ))}
                  {enrolledAgents.length > 4 && (
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 text-gray-600 font-bold text-[10px] flex items-center justify-center shadow-md">
                      +{enrolledAgents.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors uppercase tracking-wider flex items-center gap-1 shrink-0">
                  View List
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform animate-pulse" />
                </span>
              </div>
            ) : (
              <button 
                onClick={handleMatchingRedirect}
                className="w-full p-4 bg-indigo-50/50 hover:bg-indigo-100/50 rounded-2xl border border-indigo-100/70 border-dashed flex items-center justify-center gap-2 transition-all duration-300 group"
              >
                <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse group-hover:scale-110" />
                <span className="text-xs text-indigo-600 font-black uppercase tracking-wider group-hover:text-indigo-800">Match New Agents</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      {gig.skills && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-harx-50 rounded-xl">
              <Target className="h-6 w-6 text-harx-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Skills & Requirements</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gig.skills.professional && gig.skills.professional.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Professional</h3>
                {gig.skills.professional.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {typeof item.skill === 'object' ? item.skill?.name : (item.skill || 'Unnamed Skill')}
                    </span>
                    <span className="text-xs font-bold bg-harx-500 text-white px-2 py-0.5 rounded">Lvl {item.level}</span>
                  </div>
                ))}
              </div>
            )}
            {gig.skills.technical && gig.skills.technical.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Technical</h3>
                {gig.skills.technical.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {typeof item.skill === 'object' ? item.skill?.name : (item.skill || 'Unnamed Skill')}
                    </span>
                    <span className="text-xs font-bold bg-cyan-500 text-white px-2 py-0.5 rounded">Lvl {item.level}</span>
                  </div>
                ))}
              </div>
            )}
            {gig.skills.soft && gig.skills.soft.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Soft</h3>
                {gig.skills.soft.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {typeof item.skill === 'object' ? item.skill?.name : (item.skill || 'Unnamed Skill')}
                    </span>
                    <span className="text-xs font-bold bg-pink-500 text-white px-2 py-0.5 rounded">Lvl {item.level}</span>
                  </div>
                ))}
              </div>
            )}
            {gig.skills.languages && gig.skills.languages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Languages</h3>
                {gig.skills.languages.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {typeof item.language === 'object' ? item.language?.name : (item.language || 'Unnamed Language')}
                      </p>
                      {typeof item.language === 'object' && item.language?.nativeName && (
                        <p className="text-xs text-gray-400">{item.language.nativeName}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold bg-harx-500 text-white px-2 py-0.5 rounded">{item.proficiency}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enrolled Agents Modal */}
      {showAgentsModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-11/12 max-w-4xl shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Users className="text-purple-600" />
                  Enrolled Representatives
                </h3>
                <p className="text-sm text-gray-500 font-medium">Currently assigned agents for <span className="font-bold text-gray-700">{gig.title}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowAgentsModal(false);
                    handleMatchingRedirect();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow flex items-center gap-1.5"
                >
                  <Sparkles size={12} className="animate-pulse" />
                  Match New Reps
                </button>
                <button
                  onClick={() => setShowAgentsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              <div className="divide-y divide-gray-100">
                {enrolledAgents.map((agent, index) => {
                  const score = agent.matchScore || 0.85;
                  const scorePct = Math.round(score * 100);
                  const statusColors = getAgentStatusColor(agent.status || 'accepted');

                  return (
                    <div key={agent._id || index} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md uppercase">
                          {getAgentAvatar(agent) ? (
                            <img src={getAgentAvatar(agent)} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            getAgentInitials(agent)
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                            {getAgentName(agent)}
                            <span
                              className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md hover:underline cursor-pointer transition-colors hover:text-purple-600"
                              onClick={() => handleAgentClick(getAgentIdString(agent))}
                            >
                              #{getAgentIdString(agent).substring(0, 8)}...
                            </span>
                          </p>
                          {getAgentEmail(agent) && (
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-medium">
                              <span className="opacity-70">Email:</span> {getAgentEmail(agent)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
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
                          <span className="text-xs text-gray-400 font-bold block mb-1">MATCH SCORE</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${score >= 0.8 ? 'from-emerald-400 to-emerald-500' : 'from-amber-400 to-amber-500'}`}
                                style={{ width: `${scorePct}%` }}
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
        <div className="fixed inset-0 bg-gray-950/20 backdrop-blur-xs flex items-center justify-center z-[110] animate-in fade-in duration-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-harx-600"></div>
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
          50% { transform: scale(1.03); box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
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
      `}</style>
    </div>
  );
};

export default GigDetailsView;
