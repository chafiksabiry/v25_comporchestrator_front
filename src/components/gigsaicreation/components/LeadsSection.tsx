import { InfoText } from './InfoText';
import { 
  Target, TrendingUp, Zap, Flame, 
  Snowflake, BarChart2, Globe2, CheckCircle,
  Users, ArrowUpRight, Percent, ArrowLeft, ArrowRight
} from 'lucide-react';
import { predefinedOptions } from '../lib/guidance';

interface LeadsSectionProps {
  data: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate?: number;
    }>;
    sources: string[];
  };
  onChange: (data: any) => void;
  errors: { [key: string]: string[] };
  onPrevious: () => void;
  onNext: () => void;
}

export function LeadsSection({ data, onChange, onPrevious, onNext }: LeadsSectionProps) {
  const handleSourceToggle = (source: string) => {
    const newSources = data.sources?.includes(source)
      ? data.sources.filter(s => s !== source)
      : [...(data.sources || []), source];
    onChange({
      ...data,
      sources: newSources
    });
  };

  const handleLeadTypeChange = (index: number, field: 'percentage' | 'description' | 'conversionRate', value: string | number) => {
    const newTypes = [...data.types];
    newTypes[index] = { 
      ...newTypes[index], 
      [field]: field === 'conversionRate' ? Math.min(100, Math.max(0, Number(value) || 0)) : value 
    };
    onChange({
      ...data,
      types: newTypes
    });
  };

  const getLeadTypeIcon = (type: 'hot' | 'warm' | 'cold') => {
    switch (type) {
      case 'hot':
        return <Flame className="w-5 h-5 text-harx-600" />;
      case 'warm':
        return <Zap className="w-5 h-5 text-harx-alt-600" />;
      case 'cold':
        return <Snowflake className="w-5 h-5 text-harx-600" />;
    }
  };

  const getLeadTypeColor = (type: 'hot' | 'warm' | 'cold') => {
    switch (type) {
      case 'hot':
        return {
          bg: 'from-harx-50 to-harx-alt-50',
          border: 'border-harx-100',
          text: 'text-harx-700',
          input: 'focus:ring-harx-500 focus:border-harx-500'
        };
      case 'warm':
        return {
          bg: 'from-harx-50 to-yellow-50',
          border: 'border-harx-100',
          text: 'text-harx-700',
          input: 'focus:ring-harx-500 focus:border-harx-500'
        };
      case 'cold':
        return {
          bg: 'from-harx-50 to-harx-alt-50',
          border: 'border-harx-100',
          text: 'text-harx-700',
          input: 'focus:ring-harx-500 focus:border-harx-500'
        };
    }
  };

  const totalPercentage = data.types?.reduce((sum, type) => sum + type.percentage, 0) || 0;

  return (
    <div className="w-full bg-white py-6 space-y-8">
      <InfoText>
        Define the lead distribution strategy, including the mix of different lead types and their sources.
        Ensure the total percentage equals 100%. Set forecasted conversion rates to track expected success.
      </InfoText>

      {/* Lead Types & Conversion Rates */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-harx-100 rounded-lg">
              <Target className="w-5 h-5 text-harx-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Lead Types</h3>
              <p className="text-sm text-gray-600">Define lead distribution and expected conversion rates</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200">
            <BarChart2 className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Total: {totalPercentage}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {data.types?.map((lead, index) => {
            const colors = getLeadTypeColor(lead.type);
            return (
              <div 
                key={lead.type} 
                className={`bg-gradient-to-r ${colors.bg} rounded-xl p-6 border ${colors.border}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {getLeadTypeIcon(lead.type)}
                  <h4 className={`font-medium capitalize ${colors.text}`}>{lead.type} Leads</h4>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* Distribution */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distribution
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={lead.percentage}
                        onChange={(e) => handleLeadTypeChange(index, 'percentage', parseInt(e.target.value) || 0)}
                        className={`block w-full rounded-lg border-gray-300 pr-12 shadow-sm ${colors.input}`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Percent className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Conversion Rate */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Conv. Rate</span>
                      </div>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={lead.conversionRate || 0}
                        onChange={(e) => handleLeadTypeChange(index, 'conversionRate', parseInt(e.target.value) || 0)}
                        className={`block w-full rounded-lg border-gray-300 pr-12 shadow-sm ${colors.input}`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Percent className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={lead.description}
                      onChange={(e) => handleLeadTypeChange(index, 'description', e.target.value)}
                      placeholder={`Describe ${lead.type} leads...`}
                      className={`block w-full rounded-lg border-gray-300 shadow-sm ${colors.input}`}
                    />
                  </div>
                </div>

                {lead.conversionRate && lead.percentage && (
                  <div className="mt-4 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Expected Conversion:</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {((lead.percentage / 100) * (lead.conversionRate / 100) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {totalPercentage !== 100 && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-800">
              <BarChart2 className="w-5 h-5" />
              <div>
                <p className="font-medium">Distribution Mismatch</p>
                <p className="text-sm">
                  Total percentage is {totalPercentage}%. Please adjust values to sum to 100%.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lead Sources */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-harx-alt-100 rounded-lg">
            <Globe2 className="w-5 h-5 text-harx-alt-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Lead Sources</h3>
            <p className="text-sm text-gray-600">Select all applicable lead generation channels</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {predefinedOptions.leads.sources.map((source) => (
            <button
              key={source}
              onClick={() => handleSourceToggle(source)}
              className={`flex items-center gap-3 p-4 rounded-xl text-left transition-colors ${
                data.sources?.includes(source)
                  ? 'bg-harx-50 text-harx-700 border border-harx-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                data.sources?.includes(source)
                  ? 'bg-harx-600'
                  : 'border-2 border-gray-300'
              }`}>
                {data.sources?.includes(source) && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="flex-1">{source}</span>
              {data.sources?.includes(source) && (
                <Users className="w-4 h-4 text-harx-600" />
              )}
            </button>
          ))}
        </div>

        {data.sources?.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Selected Sources:</span>
              <span className="font-medium text-gray-900">{data.sources?.length || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5" />
          Previous
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-harx-600 text-white hover:bg-blue-700"
        >
          Next
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
