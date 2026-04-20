import React from 'react';
import { Info } from 'lucide-react';

interface InfoTextProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoText({ children, className = '' }: InfoTextProps) {
  return (
    <div className={`flex items-start gap-3 p-4 bg-blue-50 rounded-lg ${className}`}>
      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="text-sm text-blue-700">{children}</div>
    </div>
  );
}
