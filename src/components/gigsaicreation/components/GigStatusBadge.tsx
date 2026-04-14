import React from 'react';
import { getStatusLabel, getStatusColor, GigStatus } from '../lib/gigStatus';

interface GigStatusBadgeProps {
  status: GigStatus;
  language?: 'en' | 'fr';
  className?: string;
  showIcon?: boolean;
}

export const GigStatusBadge: React.FC<GigStatusBadgeProps> = ({
  status,
  language = 'en',
  className = '',
  showIcon = false
}) => {
  const getStatusIcon = (status: GigStatus) => {
    switch (status) {
      case 'to_activate':
        return '⏳';
      case 'active':
        return '✅';
      case 'inactive':
        return '⏸️';
      case 'archived':
        return '📁';
      default:
        return '';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${getStatusColor(status)}
        ${className}
      `}
    >
      {showIcon && <span className="mr-1">{getStatusIcon(status)}</span>}
      {getStatusLabel(status, language)}
    </span>
  );
};

export default GigStatusBadge; 