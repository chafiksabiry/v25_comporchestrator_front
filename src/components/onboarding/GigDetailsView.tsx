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
    currency: string;
    transactionCommission: {
      type: string;
      amount: string;
    };
  };
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZone: string;
    flexibility: string[];
  };
  team: {
    size: string;
    territories: string[];
  };
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
    
    let details = [];
    if (commission.base) details.push(`Base: ${commission.base}`);
    if (commission.baseAmount) details.push(`Base Amount: ${commission.baseAmount} ${commission.currency || 'EUR'}`);
    if (commission.bonus) details.push(`Bonus: ${commission.bonus}`);
    if (commission.bonusAmount) details.push(`Bonus Amount: ${commission.bonusAmount} ${commission.currency || 'EUR'}`);
    if (commission.transactionCommission?.amount) {
      details.push(`Transaction: ${commission.transactionCommission.amount} ${commission.currency || 'EUR'}`);
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
                      <span className="font-medium text-gray-900">{gig.commission.baseAmount} {gig.commission.currency || 'EUR'}</span>
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
                      <span className="font-medium text-gray-900">{gig.commission.bonusAmount} {gig.commission.currency || 'EUR'}</span>
                    </div>
                  )}
                  {gig.commission.transactionCommission?.amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transaction Commission:</span>
                      <span className="font-medium text-gray-900">{gig.commission.transactionCommission.amount} {gig.commission.currency || 'EUR'}</span>
                    </div>
                  )}
                  {gig.commission.structure && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Structure:</span>
                      <span className="font-medium text-gray-900">{gig.commission.structure}</span>
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
                  <p className="text-gray-900 font-medium">{gig.team.territories.join(', ')}</p>
                </div>
              )}
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {gig.availability.timeZone && (
                <div className="bg-white rounded-lg p-4 border border-cyan-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-cyan-500" />
                    <label className="text-sm font-semibold text-gray-700">
                      Time Zone
                    </label>
                  </div>
                  <p className="text-gray-900 font-medium">{gig.availability.timeZone}</p>
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