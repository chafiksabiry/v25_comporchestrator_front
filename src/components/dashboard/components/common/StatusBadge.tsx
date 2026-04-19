import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
}

const variantStyles = {
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  error: 'bg-red-100 text-red-600',
  info: 'bg-rose-100 text-rose-600'
};

export function StatusBadge({ status, variant = 'info' }: StatusBadgeProps) {
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${variantStyles[variant]}`}>
      {status}
    </span>
  );
}
