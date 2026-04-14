import React from 'react';
import { GIG_STATUS, getStatusLabel, getStatusColor, GigStatus } from '../lib/gigStatus';

interface GigStatusSelectorProps {
  value: GigStatus;
  onChange: (status: GigStatus) => void;
  disabled?: boolean;
  className?: string;
  language?: 'en' | 'fr';
}

export const GigStatusSelector: React.FC<GigStatusSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  language = 'en'
}) => {
  const statusOptions = Object.values(GIG_STATUS);

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">
        {language === 'fr' ? 'Statut' : 'Status'}
      </label>
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            disabled={disabled}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${value === status 
                ? `${getStatusColor(status)} border-2 border-current` 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {getStatusLabel(status, language)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GigStatusSelector; 