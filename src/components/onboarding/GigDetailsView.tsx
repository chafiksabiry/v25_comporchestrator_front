import React from 'react';

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Gigs
          </button>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(gig.status)}`}>
          {gig.status}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{gig.title}</h1>
          {gig.category && (
            <span className="inline-block bg-white/20 text-white px-3 py-1 rounded-md text-sm font-medium">
              {gig.category}
            </span>
          )}
        </div>

        {/* Content Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {gig.description || 'No description available'}
                </p>
              </div>

              {/* Seniority */}
              {gig.seniority && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Seniority Requirements</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Level:</span>
                        <p className="font-medium text-gray-900">{gig.seniority.level || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Experience:</span>
                        <p className="font-medium text-gray-900">{gig.seniority.yearsExperience || '0'} years</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission */}
              {gig.commission && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Commission Structure</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{formatCommission(gig.commission)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Availability */}
              {gig.availability && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Availability</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {gig.availability.schedule && gig.availability.schedule.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Schedule:</span>
                        <p className="font-medium text-gray-900">{formatSchedule(gig.availability.schedule)}</p>
                      </div>
                    )}
                    {gig.availability.timeZone && (
                      <div>
                        <span className="text-sm text-gray-600">Time Zone:</span>
                        <p className="font-medium text-gray-900">{gig.availability.timeZone}</p>
                      </div>
                    )}
                    {gig.availability.flexibility && gig.availability.flexibility.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Flexibility:</span>
                        <p className="font-medium text-gray-900">{gig.availability.flexibility.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Team */}
              {gig.team && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Team Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {gig.team.size && (
                      <div>
                        <span className="text-sm text-gray-600">Team Size:</span>
                        <p className="font-medium text-gray-900">{gig.team.size} members</p>
                      </div>
                    )}
                    {gig.team.territories && gig.team.territories.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Territories:</span>
                        <p className="font-medium text-gray-900">{gig.team.territories.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Created:</span>
                    <p className="font-medium text-gray-900">
                      {gig.createdAt ? new Date(gig.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <p className="font-medium text-gray-900">
                      {gig.updatedAt ? new Date(gig.updatedAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigDetailsView; 