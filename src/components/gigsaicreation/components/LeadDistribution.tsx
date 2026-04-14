import React from 'react';
import { AlertCircle } from 'lucide-react';
import { InfoText } from './InfoText';

interface LeadDistributionProps {
  leads: Array<{
    type: 'hot' | 'warm' | 'cold';
    percentage: number;
    description: string;
  }>;
  onChange: (leads: Array<{
    type: 'hot' | 'warm' | 'cold';
    percentage: number;
    description: string;
  }>) => void;
}

export function LeadDistribution({ leads, onChange }: LeadDistributionProps) {
  const totalPercentage = leads.reduce((sum, lead) => sum + lead.percentage, 0);

  const handleChange = (index: number, field: 'percentage' | 'description', value: string | number) => {
    const newLeads = [...leads];
    newLeads[index] = { ...newLeads[index], [field]: value };
    onChange(newLeads);
  };

  return (
    <div className="space-y-6">
      <InfoText>
        Specify the distribution of different lead types. The total percentage should equal 100%.
      </InfoText>

      {leads.map((lead, index) => (
        <div key={lead.type} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
              {lead.type} Leads
            </label>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={lead.percentage}
                    onChange={(e) => handleChange(index, 'percentage', parseInt(e.target.value) || 0)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-8"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={lead.description}
                  onChange={(e) => handleChange(index, 'description', e.target.value)}
                  placeholder={`Describe ${lead.type} leads...`}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {totalPercentage !== 100 && (
        <div className="flex items-start gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Invalid Distribution</p>
            <p className="text-sm">
              Total percentage is {totalPercentage}%. Please adjust the values to sum to 100%.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}