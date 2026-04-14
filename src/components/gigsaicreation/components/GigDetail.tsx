import { 
  Calendar, Clock, DollarSign, Users, 
  Building2, Target,
  ArrowLeft, Phone, Languages
} from 'lucide-react';
import Logo from './Logo';

interface GigDetailProps {
  gig: any;
  onBack: () => void;
}

export function GigDetail({ gig, onBack }: GigDetailProps) {

  const formatCurrency = (amount: string | number) => {
    try {
      const currency = gig?.commission?.currency || 'USD';
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
      
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(numericAmount);
      
      return formattedAmount;
    } catch (error) {
      console.error('Error in formatCurrency:', error);
      return '$0.00';
    }
  };

  // Helper function to safely get commission amount
  const getCommissionAmount = (amount: string | number) => {
    if (!amount) {
      return 0;
    }
    return typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  };

  // Helper function to format minimum volume
  const formatMinimumVolume = () => {
    if (!gig?.commission?.minimumVolume) return 'Not specified';
    
    const { amount, unit, period } = gig.commission.minimumVolume;
    if (!amount || !unit || !period) return 'Not specified';
    
    return `${amount} ${unit} per ${period}`;
  };

  return (
    <div className="w-full h-full py-8 px-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <Logo className="mb-6" />
      </div>
      
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Gigs
        </button>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            {/* Logo */}
            {/* Remove the logo rendering block that uses gig.logoUrl */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{gig?.title || 'Untitled Gig'}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-100 text-harx-800">
                  {gig?.category || 'Uncategorized'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-alt-100 text-harx-alt-800">
                  {gig?.seniority_level || 'Not Specified'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-100 text-harx-800">
                  {gig?.years_experience || '0'} Experience
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Team Size</div>
            <div className="text-xl font-semibold text-gray-900">{gig?.team_size || '0'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="col-span-2 space-y-8">
          {/* Description */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{gig?.description || 'No description provided.'}</p>
          </section>

          {/* Schedule */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-6 h-6 text-harx-600" />
              <h2 className="text-xl font-semibold text-gray-900">Schedule</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Working Days</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gig?.schedule_days?.map((day: string) => (
                    <span key={day} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                      {day}
                    </span>
                  )) || <span className="text-gray-500">No working days specified</span>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Working Hours</h3>
                <div className="mt-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{gig?.schedule_hours || 'Not specified'}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Time Zones</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gig?.schedule_timezone?.map((zone: string) => (
                    <span key={zone} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                      {zone}
                    </span>
                  )) || <span className="text-gray-500">No time zones specified</span>}
                </div>
              </div>
            </div>
          </section>

          {/* Commission Structure */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-6 h-6 text-harx-600" />
              <h2 className="text-xl font-semibold text-gray-900">Commission Structure</h2>
            </div>
            <div className="space-y-6">
              {/* Base Commission */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Base Commission</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Amount</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {(() => {
                        const baseAmount = gig?.commission?.baseAmount || "";
                        return formatCurrency(getCommissionAmount(baseAmount));
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Type</div>
                    <div className="text-gray-900">{gig?.commission?.base || 'Not specified'}</div>
                  </div>
                </div>
              </div>

              {/* Minimum Volume */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Minimum Volume</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Requirements</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatMinimumVolume()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Bonus */}
              {gig?.commission?.bonus && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Performance Bonus</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Amount</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {(() => {
                          const bonusAmount = gig?.commission?.bonusAmount || 0;
                          return formatCurrency(getCommissionAmount(bonusAmount));
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Type</div>
                      <div className="text-gray-900">{gig?.commission?.bonus}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {gig?.commission_structure && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Additional Details</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{gig.commission_structure}</p>
                </div>
              )}
            </div>
          </section>

          {/* Lead Distribution */}
          {/* {gig?.gig_leads && gig?.gig_leads?.length > 0 && (
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">Lead Distribution</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {gig?.gig_leads?.map((lead: any) => (
                    <div key={lead?.lead_type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 capitalize">{lead?.lead_type} Leads</h3>
                        <span className="text-sm font-semibold text-harx-600">{lead?.percentage}%</span>
                      </div>
                      <p className="text-sm text-gray-600">{lead?.description}</p>
                    </div>
                  ))}
                </div>

                {gig?.gig_leads?.[0]?.sources && gig?.gig_leads?.[0]?.sources?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Lead Sources</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig?.gig_leads?.[0]?.sources?.map((source: string) => (
                        <span key={source} className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )} */}

          {/* Team Structure */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-6 h-6 text-harx-alt-600" />
              <h2 className="text-xl font-semibold text-gray-900">Team Structure</h2>
            </div>
            <div className="space-y-6">
              {/* Roles */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Team Roles</h3>
                <div className="grid grid-cols-2 gap-4">
                  {gig?.team_structure?.map((role: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">{role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Territories */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Coverage Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {gig?.team_territories?.map((territory: string, index: number) => (
                    <span key={index} className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      {territory}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Call Types</div>
                  <div className="text-sm text-gray-500">{gig?.call_types?.join(', ') || 'Not specified'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Experience Required</div>
                  <div className="text-sm text-gray-500">{gig?.years_experience || 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          {gig?.gig_skills && gig?.gig_skills?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-harx-600" />
                <h3 className="text-lg font-semibold text-gray-900">Required Skills</h3>
              </div>
              <div className="space-y-6">
                {/* Languages */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Languages</h4>
                  <div className="space-y-2">
                    {gig?.gig_skills
                      ?.filter((skill: any) => skill?.category === 'language')
                      ?.map((skill: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{skill?.name}</span>
                          <span className="text-sm text-gray-500">({skill?.level})</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Professional Skills */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Professional Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {gig?.gig_skills
                      ?.filter((skill: any) => skill?.category === 'professional')
                      ?.map((skill: any, index: number) => (
                        <span key={index} className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                          {skill?.name}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Technical Skills */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Technical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {gig?.gig_skills
                      ?.filter((skill: any) => skill?.category === 'technical')
                      ?.map((skill: any, index: number) => (
                        <span key={index} className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                          {skill?.name}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}