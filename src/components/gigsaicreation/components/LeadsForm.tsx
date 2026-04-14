import React, { useState } from 'react';

interface LeadType {
  type: 'hot' | 'warm' | 'cold';
  percentage: number;
  description: string;
  conversionRate: number;
}

interface LeadsFormProps {
  onSave: (data: { types: LeadType[], sources: string[] }) => void;
  predefinedSources: string[];
  skipValidation?: boolean;
}

const LeadsForm: React.FC<LeadsFormProps> = ({ onSave, predefinedSources, skipValidation = false }) => {
  const [leads, setLeads] = useState<LeadType[]>([
    { type: 'hot', percentage: 0, description: '', conversionRate: 0 },
    { type: 'warm', percentage: 0, description: '', conversionRate: 0 },
    { type: 'cold', percentage: 0, description: '', conversionRate: 0 }
  ]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const handleLeadChange = (index: number, field: keyof LeadType, value: string | number) => {
    const newLeads = [...leads];
    newLeads[index] = { ...newLeads[index], [field]: value };
    setLeads(newLeads);
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const validateForm = () => {
    if (skipValidation) return true;
    
    const totalPercentage = leads.reduce((sum, lead) => sum + lead.percentage, 0);
    if (totalPercentage !== 100) {
      const confirmed = window.confirm('Total percentage must equal 100%. Click OK to continue editing or Cancel to ignore this warning.');
      if (!confirmed) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave({ types: leads, sources: selectedSources });
    }
  };

  return (
    <div className="space-y-6">
      {leads.map((lead, index) => (
        <div key={lead.type} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 capitalize">{lead.type} Leads</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                value={lead.percentage}
                onChange={(e) => handleLeadChange(index, 'percentage', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                placeholder="e.g. 30"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">Description</label>
              <input
                type="text"
                value={lead.description}
                onChange={(e) => handleLeadChange(index, 'description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                placeholder={`Describe ${lead.type} leads...`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">Conversion Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={lead.conversionRate}
                onChange={(e) => handleLeadChange(index, 'conversionRate', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                placeholder="e.g. 70"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Lead Sources</h3>
        <div className="grid grid-cols-2 gap-4">
          {predefinedSources.map(source => (
            <label
              key={source}
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedSources.includes(source)}
                onChange={() => handleSourceToggle(source)}
                className="w-5 h-5 rounded border-gray-300 text-harx-600 focus:ring-harx-500"
              />
              <span className="ml-3 text-gray-700 font-medium">{source}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-harx-500 hover:bg-harx-600 text-white rounded-lg transition-colors"
        >
          Save Leads Information
        </button>
      </div>
    </div>
  );
};

export default LeadsForm; 