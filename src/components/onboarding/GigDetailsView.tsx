import React from 'react';
import { ArrowLeft, FileText, Target, Award, DollarSign, TrendingUp, Users, MapPin, ClockIcon, Globe, Building, Settings } from 'lucide-react';

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
    base: string;
    baseAmount: string;
    bonus: string;
    bonusAmount: string;
    structure: string;
    currency: {
      _id: string;
      code: string;
      name: string;
      symbol: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      __v: number;
    };
    transactionCommission: {
      type: string;
      amount: string;
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCommission = (commission: Gig['commission']) => {
    if (!commission) return 'Not specified';
    
    const currencySymbol = commission.currency?.symbol || '€';
    const currencyCode = commission.currency?.code || 'EUR';
    
    let details = [];
    if (commission.base) details.push(`Base: ${commission.base}`);
    if (commission.baseAmount) details.push(`Base Amount: ${commission.baseAmount} ${currencySymbol}`);
    if (commission.bonus) details.push(`Bonus: ${commission.bonus}`);
    if (commission.bonusAmount) details.push(`Bonus Amount: ${commission.bonusAmount} ${currencySymbol}`);
    if (commission.transactionCommission?.amount) {
      details.push(`Transaction: ${commission.transactionCommission.amount} ${currencySymbol}`);
    }
    if (commission.structure) details.push(`Structure: ${commission.structure}`);
    
    return details.length > 0 ? details.join(', ') : 'Not specified';
  };

  const formatSchedule = (schedule: Array<{day: string, hours: {start: string, end: string}}>) => {
    if (!schedule || schedule.length === 0) return 'Flexible';
    
    return schedule.map(item => 
      `${item.day}: ${item.hours.start} - ${item.hours.end}`
    ).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
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
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-500" />
                <label className="text-sm font-semibold text-gray-700">
                  Gig Title
                </label>
              </div>
              <p className="text-gray-900 font-medium">{gig.title}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-blue-500" />
                <label className="text-sm font-semibold text-gray-700">
                  Description
                </label>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {gig.description || 'No description available'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-purple-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Category
                  </label>
                </div>
                <p className="text-gray-900 font-medium">{gig.category || 'Not specified'}</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-indigo-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Status
                  </label>
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(gig.status)}`}>
                  {gig.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seniority */}
        {gig.seniority && (
          <div className="rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Seniority Requirements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-purple-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Seniority Level
                  </label>
                </div>
                <p className="text-gray-900 font-medium">{gig.seniority.level || 'Not specified'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="h-4 w-4 text-violet-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Years of Experience
                  </label>
                </div>
                <p className="text-gray-900 font-medium">{gig.seniority.yearsExperience || '0'} years</p>
              </div>
            </div>
          </div>
        )}

        {/* Commission */}
        {gig.commission && (
          <div className="space-y-6">
            {/* Base Commission */}
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Commission Structure</h2>
                  <p className="text-sm text-gray-600">Commission details and structure</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="space-y-3">
                  {gig.commission.base && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Base Type:</span>
                      <span className="font-medium text-gray-900">{gig.commission.base}</span>
                    </div>
                  )}
                  {gig.commission.baseAmount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Base Amount:</span>
                      <span className="font-medium text-gray-900">{gig.commission.baseAmount} {gig.commission.currency?.symbol || '€'}</span>
                    </div>
                  )}
                  {gig.commission.bonus && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Bonus Type:</span>
                      <span className="font-medium text-gray-900">{gig.commission.bonus}</span>
                    </div>
                  )}
                  {gig.commission.bonusAmount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Bonus Amount:</span>
                      <span className="font-medium text-gray-900">{gig.commission.bonusAmount} {gig.commission.currency?.symbol || '€'}</span>
                    </div>
                  )}
                  {gig.commission.transactionCommission?.amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transaction Commission:</span>
                      <span className="font-medium text-gray-900">{gig.commission.transactionCommission.amount} {gig.commission.currency?.symbol || '€'}</span>
                    </div>
                  )}
                  {gig.commission.structure && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Structure:</span>
                      <span className="font-medium text-gray-900">{gig.commission.structure}</span>
                    </div>
                  )}
                  {gig.commission.additionalDetails && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Additional Details:</span>
                      <p className="text-sm text-gray-900 mt-1">{gig.commission.additionalDetails}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team */}
        {gig.team && (
          <div className="rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Users className="h-6 w-6 text-pink-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Team Structure</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gig.team.size && (
                <div className="bg-white rounded-lg p-4 border border-pink-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-pink-500" />
                    <label className="text-sm font-semibold text-gray-700">
                      Team Size
                    </label>
                  </div>
                  <p className="text-gray-900 font-medium">{gig.team.size} members</p>
                </div>
              )}
              {gig.team.territories && gig.team.territories.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-pink-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <label className="text-sm font-semibold text-gray-700">
                      Territories
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gig.team.territories.map((territory, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-1 bg-rose-50 rounded-full border border-rose-200">
                        <img 
                          src={territory.flags.png} 
                          alt={territory.flags.alt} 
                          className="w-4 h-3 rounded-sm"
                        />
                        <span className="text-sm font-medium text-rose-800">{territory.name.common}</span>
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
          <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Skills & Requirements</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gig.skills.professional && gig.skills.professional.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Skills</h3>
                  <div className="space-y-2">
                    {gig.skills.professional.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-purple-900">{item.skill.name}</span>
                          <p className="text-xs text-purple-600">{item.skill.category}</p>
                        </div>
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                          Level {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {gig.skills.technical && gig.skills.technical.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Skills</h3>
                  <div className="space-y-2">
                    {gig.skills.technical.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-indigo-900">{item.skill.name}</span>
                          <p className="text-xs text-indigo-600">{item.skill.category}</p>
                        </div>
                        <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">
                          Level {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {gig.skills.soft && gig.skills.soft.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Soft Skills</h3>
                  <div className="space-y-2">
                    {gig.skills.soft.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-pink-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-pink-900">{item.skill.name}</span>
                          <p className="text-xs text-pink-600">{item.skill.category}</p>
                        </div>
                        <span className="text-xs bg-pink-200 text-pink-800 px-2 py-1 rounded-full">
                          Level {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {gig.skills.languages && gig.skills.languages.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Languages</h3>
                  <div className="space-y-2">
                    {gig.skills.languages.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-green-900">{item.language.name}</span>
                          <p className="text-xs text-green-600">{item.language.nativeName}</p>
                        </div>
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
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
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Destination Zone</h2>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <div className="flex items-center gap-4">
                <img 
                  src={gig.destination_zone.flags.png} 
                  alt={gig.destination_zone.flags.alt} 
                  className="w-12 h-8 rounded-md border border-gray-200"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{gig.destination_zone.name.common}</h3>
                  <p className="text-sm text-gray-600">{gig.destination_zone.name.official}</p>
                  <p className="text-xs text-gray-500">Code: {gig.destination_zone.cca2}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule */}
        {gig.availability && (
          <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-cyan-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Schedule & Availability</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {gig.availability.minimumHours && (
                <div className="bg-white rounded-lg p-4 border border-cyan-100">
                  <div className="flex items-center gap-2 mb-3">
                    <ClockIcon className="h-4 w-4 text-cyan-500" />
                    <label className="text-sm font-semibold text-gray-700">
                      Minimum Hours
                    </label>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900">Daily: <span className="font-medium">{gig.availability.minimumHours.daily}h</span></p>
                    <p className="text-sm text-gray-900">Weekly: <span className="font-medium">{gig.availability.minimumHours.weekly}h</span></p>
                    <p className="text-sm text-gray-900">Monthly: <span className="font-medium">{gig.availability.minimumHours.monthly}h</span></p>
                  </div>
                </div>
              )}
              {gig.availability.time_zone && (
                <div className="bg-white rounded-lg p-4 border border-cyan-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-cyan-500" />
                    <label className="text-sm font-semibold text-gray-700">
                      Time Zone
                    </label>
                  </div>
                  <p className="text-gray-900 font-medium">{gig.availability.time_zone.zoneName}</p>
                  <p className="text-sm text-gray-600">{gig.availability.time_zone.countryName} ({gig.availability.time_zone.countryCode})</p>
                </div>
              )}
              {gig.availability.flexibility && gig.availability.flexibility.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-cyan-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-blue-500" />
                    <label className="text-sm font-semibold text-gray-700">
                      Flexibility
                    </label>
                  </div>
                  <p className="text-gray-900 font-medium">{gig.availability.flexibility.join(', ')}</p>
                </div>
              )}
            </div>

            {gig.availability.schedule && gig.availability.schedule.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-cyan-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Schedule</h3>
                <div className="space-y-3">
                  {gig.availability.schedule.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ClockIcon className="h-4 w-4 text-cyan-500" />
                        <span className="text-sm font-medium text-gray-900">{item.day}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {item.hours.start} - {item.hours.end}
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