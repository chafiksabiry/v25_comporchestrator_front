import React from 'react';

interface ProgressBarProps {
  progress: number;
  variant?: 'primary' | 'success' | 'warning';
}

const variantStyles = {
  primary: 'bg-rose-500',
  success: 'bg-green-600',
  warning: 'bg-yellow-600'
};

export function ProgressBar({ progress, variant = 'primary' }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${variantStyles[variant]}`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
}
