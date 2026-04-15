import React from 'react';
import { ArrowLeft, FileText, Target, Award, DollarSign, Users, MapPin, ClockIcon, Globe, Settings, Phone, Repeat, Star } from 'lucide-react';

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
      _id: string;
      countryCode: string;
      countryName: string;
      zoneName: string;
      gmtOffset: number;
      lastUpdated: string;
      __v: number;
      createdAt: string;
      updatedAt: string;
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
        nativeName: {
          [key: string]: {
            official: string;
            common: string;
            _id: string;
          };
        };
      };
      flags: {
        png: string;
        svg: string;
        alt: string;
      };
      _id: string;
      cca2: string;
      __v: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  skills: {
    professional: Array<{
      skill: {
        _id: string;
        name: string;
        description: string;
        category: string;
        isActive: boolean;
        __v: number;
        createdAt: string;
        updatedAt: string;
      };
      level: number;
      _id: string;
    }>;
    technical: Array<{
      skill: {
        _id: string;
        name: string;
        description: string;
        category: string;
        isActive: boolean;
        __v: number;
        createdAt: string;
        updatedAt: string;
      };
      level: number;
      _id: string;
    }>;
    soft: Array<{
      skill: {
        _id: string;
        name: string;
        description: string;
        category: string;
        isActive: boolean;
        __v: number;
        createdAt: string;
        updatedAt: string;
      };
      level: number;
      _id: string;
    }>;
    languages: Array<{
      language: {
        _id: string;
        code: string;
        __v: number;
        createdAt: string;
        lastUpdated: string;
        name: string;
        nativeName: string;
        updatedAt: string;
      };
      proficiency: string;
      iso639_1: string;
      _id: string;
    }>;
  };
  destination_zone: {
    name: {
      common: string;
      official: string;
      nativeName: {
        [key: string]: {
          official: string;
          common: string;
          _id: string;
        };
      };
    };
    flags: {
      png: string;
      svg: string;
      alt: string;
    };
    _id: string;
    cca2: string;
    __v: number;
    createdAt: string;
    updatedAt: string;
  };
  activities: Array<{
    _id: string;
    name: string;
    description: string;
    category: string;
    isActive: boolean;
    __v: number;
    createdAt: string;
    updatedAt: string;
  }>;
  industries: Array<{
    _id: string;
    name: string;
    description: string;
    isActive: boolean;
    __v: number;
    createdAt: string;
    updatedAt: string;
  }>;
  highlights: any[];
  deliverables: any[];
  userId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface GigDetailsViewProps {
  gig: Gig;
  onBack: () => void;
}

const GigDetailsView: React.FC<GigDetailsViewProps> = ({ gig, onBack }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-harx-50 text-harx-600 border-harx-100';
      case 'pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'completed':
        return 'bg-harx-alt-50 text-harx-alt-600 border-harx-alt-100';
      case 'cancelled':
        return 'bg-red-50 text-red-600 border-red-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };





  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-black uppercase tracking-tighter text-gray-600 bg-white/60 backdrop-blur-md border border-white/40 rounded-full hover:bg-white/80 hover:text-harx-500 transition-all duration-300 shadow-sm"
          >
            <ArrowLeft size={16} />
            Back to Gigs
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">View: {gig.title}</h1>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-harx-50 rounded-xl shadow-inner">
              <FileText className="h-6 w-6 text-harx-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Basic Information</h2>
          </div>
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-harx-400" />
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  Gig Title
                </label>
              </div>
              <p className="text-gray-900 font-bold text-lg">{gig.title}</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-harx-400" />
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  Description
                </label>
              </div>
              <p className="text-gray-700 leading-relaxed font-medium">
                {gig.description || 'No description available'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-harx-alt-400" />
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Category
                  </label>
                </div>
                <p className="text-gray-900 font-bold">{gig.category || 'Not specified'}</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-harx-400" />
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Status
                  </label>
                </div>
                <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter border ${getStatusColor(gig.status)}`}>
                  {gig.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seniority */}
        {gig.seniority && (
          <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-harx-alt-50 rounded-xl shadow-inner">
                <Award className="h-6 w-6 text-harx-alt-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Seniority Requirements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-harx-alt-400" />
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Seniority Level
                  </label>
                </div>
                <p className="text-gray-900 font-bold">{gig.seniority.level || 'Not specified'}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="h-4 w-4 text-harx-400" />
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Years of Experience
                  </label>
                </div>
                <p className="text-gray-900 font-bold">{gig.seniority.yearsExperience || '0'} years</p>
              </div>
            </div>
          </div>
        )}

        {/* Commission section updated to match the UI precisely */}
        {gig.commission && (
          <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-harx-50 rounded-xl shadow-inner">
                <DollarSign className="h-6 w-6 text-harx-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Commission Structure</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Per call compensation */}
              <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 flex flex-col justify-between h-40 group hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-harx-50 rounded-xl">
                    <Phone className="h-6 w-6 text-harx-500" />
                  </div>
                  <span className="text-lg font-bold text-gray-700">Per call compensation</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">{gig.commission.commission_per_call ?? 0}</span>
                  <span className="text-2xl text-harx-400 font-black">{gig.commission.currency?.symbol || '€'}</span>
                </div>
              </div>

              {/* Card 2: Transaction Commission */}
              <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 flex flex-col justify-between h-40 group hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-harx-alt-50 rounded-xl">
                    <Repeat className="h-6 w-6 text-harx-alt-500" />
                  </div>
                  <span className="text-lg font-bold text-gray-700">Transaction Commission</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">
                    {typeof gig.commission.transactionCommission === 'number' 
                      ? gig.commission.transactionCommission 
                      : ((gig.commission.transactionCommission as any)?.amount || 0)}
                  </span>
                  <span className="text-2xl text-harx-alt-300 font-black">{gig.commission.currency?.symbol || '€'}</span>
                </div>
              </div>

              {/* Card 3: Bonus & Incentives */}
              <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 flex flex-col justify-between h-40 group hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <Star className="h-6 w-6 text-amber-500" />
                  </div>
                  <span className="text-lg font-bold text-gray-700">Bonus & Incentives</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">{gig.commission.bonusAmount || 0}</span>
                  <span className="text-2xl text-amber-400 font-black">{gig.commission.currency?.symbol || '€'}</span>
                </div>
              </div>

              {/* Card 4: Minimum Volume Requirements For Bonus */}
              <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 flex flex-col justify-between h-40 group hover:shadow-lg transition-all duration-300 relative">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-harx-50 rounded-xl">
                    <Target className="h-6 w-6 text-harx-500" />
                  </div>
                  <span className="text-lg font-bold text-gray-700">Min Volume</span>
                </div>
                <div className="flex items-baseline justify-between w-full">
                  <span className="text-4xl font-black text-gray-900">{gig.commission.minimumVolume?.amount || 0}</span>
                  <div className="px-3 py-1 bg-harx-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-harx-500/20">
                    {gig.commission.minimumVolume?.period || 'MONTHLY'}
                  </div>
                </div>
              </div>
            </div>

            {gig.commission.additionalDetails && (
              <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-harx-400" />
                  <span className="text-[10px] font-black text-harx-500 uppercase tracking-widest">Additional Details</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed font-medium italic">{gig.commission.additionalDetails}</p>
              </div>
            )}
          </div>
        )}

        {/* Team */}
        {gig.team && (
          <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-harx-alt-50 rounded-xl shadow-inner">
                <Users className="h-6 w-6 text-harx-alt-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Team Structure</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gig.team.size && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-harx-alt-400" />
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Team Size
                    </label>
                  </div>
                  <p className="text-gray-900 font-black text-xl">{gig.team.size} <span className="text-sm text-gray-400 font-bold uppercase tracking-tighter ml-1">members</span></p>
                </div>
              )}
              {gig.team.territories && gig.team.territories.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-harx-400" />
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Territories
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gig.team.territories.map((territory, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-harx-50/50 rounded-lg border border-harx-100 shadow-sm">
                        <img 
                          src={territory.flags.png} 
                          alt={territory.flags.alt} 
                          className="w-5 h-3.5 rounded-sm object-cover shadow-sm"
                        />
                        <span className="text-xs font-black text-harx-700 tracking-tight">{territory.name.common}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {gig.skills && (
          <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-harx-50 rounded-xl shadow-inner">
                <Target className="h-6 w-6 text-harx-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Skills & Requirements</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {gig.skills.professional && gig.skills.professional.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-sm">
                  <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.15em] mb-5 pb-2 border-b border-gray-100">Professional Skills</h3>
                  <div className="space-y-3">
                    {gig.skills.professional.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-harx-50/50 rounded-xl border border-harx-100 transition-transform hover:scale-[1.02]">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-harx-800 tracking-tight">{item.skill.name}</span>
                          <span className="text-[10px] font-bold text-harx-400 uppercase tracking-tighter">{item.skill.category}</span>
                        </div>
                        <span className="text-[10px] font-black bg-harx-500 text-white px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-md shadow-harx-500/20">
                          LVL {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {gig.skills.technical && gig.skills.technical.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-sm">
                  <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.15em] mb-5 pb-2 border-b border-gray-100">Technical Skills</h3>
                  <div className="space-y-3">
                    {gig.skills.technical.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-harx-alt-50/50 rounded-xl border border-harx-alt-100 transition-transform hover:scale-[1.02]">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-harx-alt-800 tracking-tight">{item.skill.name}</span>
                          <span className="text-[10px] font-bold text-harx-alt-500 uppercase tracking-tighter">{item.skill.category}</span>
                        </div>
                        <span className="text-[10px] font-black bg-harx-alt-500 text-white px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-md shadow-harx-alt-500/20">
                          LVL {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {gig.skills.soft && gig.skills.soft.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-sm">
                  <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.15em] mb-5 pb-2 border-b border-gray-100">Soft Skills</h3>
                  <div className="space-y-3">
                    {gig.skills.soft.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100 transition-transform hover:scale-[1.02]">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-amber-800 tracking-tight">{item.skill.name}</span>
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">{item.skill.category}</span>
                        </div>
                        <span className="text-[10px] font-black bg-amber-500 text-white px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-md shadow-amber-500/20">
                          LVL {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {gig.skills.languages && gig.skills.languages.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-sm">
                  <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.15em] mb-5 pb-2 border-b border-gray-100">Languages</h3>
                  <div className="space-y-3">
                    {gig.skills.languages.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-harx-50/50 rounded-xl border border-harx-100 transition-transform hover:scale-[1.02]">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-harx-800 tracking-tight">{item.language.name}</span>
                          <span className="text-[10px] font-bold text-harx-400 tracking-tighter">{item.language.nativeName}</span>
                        </div>
                        <span className="text-[10px] font-black bg-harx-500 text-white px-3 py-1.5 rounded-lg uppercase tracking-[0.2em] shadow-md shadow-harx-500/20">
                          {item.proficiency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Destination Zone */}
        {gig.destination_zone && (
          <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-50 rounded-xl shadow-inner">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Destination Zone</h2>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-sm flex items-center gap-6">
              <img 
                src={gig.destination_zone.flags.png} 
                alt={gig.destination_zone.flags.alt} 
                className="w-16 h-10 rounded-lg border border-gray-100 shadow-md object-cover"
              />
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{gig.destination_zone.name.common}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{gig.destination_zone.name.official}</p>
                <div className="mt-2 inline-block px-2 py-0.5 bg-gray-100 rounded text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  ISO: {gig.destination_zone.cca2}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule */}
        {gig.availability && (
          <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-harx-50 rounded-xl shadow-inner">
                <ClockIcon className="h-6 w-6 text-harx-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Schedule & Availability</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {gig.availability.minimumHours && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <ClockIcon className="h-4 w-4 text-harx-400" />
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Min Hours
                    </label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Daily</span>
                      <span className="text-sm font-black text-gray-800">{gig.availability.minimumHours.daily}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Weekly</span>
                      <span className="text-sm font-black text-gray-800">{gig.availability.minimumHours.weekly}h</span>
                    </div>
                  </div>
                </div>
              )}
              {gig.availability.time_zone && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-4 w-4 text-harx-alt-400" />
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Time Zone
                    </label>
                  </div>
                  <p className="text-gray-900 font-black text-lg leading-tight mb-1">{gig.availability.time_zone.zoneName}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{gig.availability.time_zone.countryName} ({gig.availability.time_zone.countryCode})</p>
                </div>
              )}
              {gig.availability.flexibility && gig.availability.flexibility.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-4 w-4 text-amber-500" />
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Flexibility
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gig.availability.flexibility.map((flex, i) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-black uppercase tracking-widest border border-amber-100">
                        {flex}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {gig.availability.schedule && gig.availability.schedule.length > 0 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-inner">
                <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.15em] mb-6 pb-2 border-b border-gray-100/20">Weekly Working Schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gig.availability.schedule.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/40 shadow-sm group hover:scale-[1.02] transition-transform">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-harx-50 rounded-lg group-hover:bg-harx-500 group-hover:text-white transition-all">
                          <ClockIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{item.day}</span>
                      </div>
                      <span className="text-xs font-bold text-harx-600 bg-harx-50 px-3 py-1 rounded-full group-hover:bg-harx-500 group-hover:text-white transition-all shadow-sm">
                        {item.hours.start} — {item.hours.end}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
};

export default GigDetailsView; 