import React from 'react';
import mascotte from '../assets/mascotte.webp';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "" }) => {
  return (
    <div className={`relative group flex justify-center items-center ${className}`}>
      <div className="absolute -inset-8 bg-gradient-to-r from-harx-500/10 to-harx-alt-500/10 rounded-full blur-3xl group-hover:from-harx-500/20 group-hover:to-harx-alt-500/20 transition-all duration-1000 animate-pulse-premium" />
      <img 
        src={mascotte} 
        alt="HARX Mascotte" 
        className="w-48 h-48 object-contain relative z-10 transition-transform duration-700 group-hover:scale-110 animate-float-rotate animate-premium-glow"
      />
    </div>
  );
};

export default Logo; 