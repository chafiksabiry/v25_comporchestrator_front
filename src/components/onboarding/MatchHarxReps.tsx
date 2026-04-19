import React from 'react';
import { MatchingDashboard } from '../MatchingDashboard';
import { MemoryRouter } from 'react-router-dom';

type MatchHarxRepsProps = {
  onBack?: () => void | Promise<void>;
};

const MatchHarxReps = ({ onBack }: MatchHarxRepsProps) => {
  return (
    <div className="h-[calc(100vh-100px)] w-full">
      <MatchingDashboard onBackToOnboarding={onBack} />
    </div>
  );
};

export default MatchHarxReps;