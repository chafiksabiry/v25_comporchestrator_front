import React from 'react';

interface HarxLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const HarxLogo: React.FC<HarxLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <div className="relative">
        {/* HARX Logo - Modern geometric design */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="url(#harxGradient)" stroke="url(#harxBorder)" strokeWidth="2"/>
          
          {/* H letter */}
          <path d="M25 20 L25 80 M25 50 L45 50 M45 20 L45 80" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          
          {/* A letter */}
          <path d="M55 80 L65 20 L75 80 M58 60 L72 60" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          
          {/* R letter */}
          <path d="M80 20 L80 80 M80 20 L90 20 Q95 20 95 25 Q95 30 90 30 L80 30 M80 30 L95 80" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          
          {/* X letter */}
          <path d="M20 20 L30 30 M30 20 L20 30" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          
          {/* Gradients */}
          <defs>
            <linearGradient id="harxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4d4d"/>
              <stop offset="100%" stopColor="#ec4899"/>
            </linearGradient>
            <linearGradient id="harxBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4d4d"/>
              <stop offset="100%" stopColor="#ec4899"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default HarxLogo; 