import React from 'react';
import { 
  ArrowLeft,
  FileText,
  Target,
  Award,
  TrendingUp,
  Building,
  Calendar,
  Clock,
  Globe,
  DollarSign,
  Users,
  MapPin,
  Sun,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Gigs
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">Gig Details: {gig.title}</h1>
        </div>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
          gig.status === 'active' || gig.status === 'approved' 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : gig.status === 'pending' || gig.status === 'to_activate'
            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
            : 'bg-red-100 text-red-800 border-red-200'
        }`}>
          {gig.status}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">Title</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{gig.title}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-700">Category</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{gig.category || 'Not specified'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-700">Created</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">
                  {gig.createdAt ? new Date(gig.createdAt).toLocaleDateString() : 'Not available'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm font-semibold text-gray-700">Updated</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">
                  {gig.updatedAt ? new Date(gig.updatedAt).toLocaleDateString() : 'Not available'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold text-gray-700">Status</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  gig.status === 'active' || gig.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : gig.status === 'pending' || gig.status === 'to_activate'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {gig.status}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">Description</span>
            </div>
            <p className="text-sm text-gray-900 leading-relaxed">{gig.description || 'No description available'}</p>
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
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-700">Level</span>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200">
                  {gig.seniority.level || 'Not specified'}
                </span>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-semibold text-gray-700">Years of Experience</span>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 border border-violet-200">
                  {gig.seniority.yearsExperience || 'Not specified'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Commission */}
        {gig.commission && (
          <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Commission Structure</h2>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-700">Details</span>
              </div>
              <p className="text-sm text-gray-900 leading-relaxed">{formatCommission(gig.commission)}</p>
            </div>
          </div>
        )}

        {/* Availability */}
        {gig.availability && (
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Sun className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Availability</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gig.availability.schedule && gig.availability.schedule.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold text-gray-700">Schedule</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{formatSchedule(gig.availability.schedule)}</p>
                </div>
              )}
              {gig.availability.timeZone && (
                <div className="bg-white rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">Time Zone</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{gig.availability.timeZone}</p>
                </div>
              )}
              {gig.availability.flexibility && gig.availability.flexibility.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold text-gray-700">Flexibility</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gig.availability.flexibility.map((item, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Information */}
        {gig.team && (
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Team Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gig.team.size && (
                <div className="bg-white rounded-lg p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">Team Size</span>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-800 border border-indigo-200">
                    {gig.team.size} members
                  </span>
                </div>
              )}
              {gig.team.territories && gig.team.territories.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700">Territories</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gig.team.territories.map((territory, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                        {territory}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GigDetailsView; 