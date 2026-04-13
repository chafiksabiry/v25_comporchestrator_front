import React from 'react';
import { MatchingDashboard } from '../MatchingDashboard';
import { MemoryRouter } from 'react-router-dom';

interface MatchHarxRepsProps {
  companyId?: string | null;
  onBack?: () => void;
}

/** Step 13: embedded in CompanyOnboarding — pass onBack so global "Back" closes the step, not only tab switch. */
const MatchHarxReps = ({ onBack }: MatchHarxRepsProps) => {
  return (
    <div className="h-[calc(100vh-100px)] w-full">
      <MemoryRouter>
        <MatchingDashboard onBackToOnboarding={onBack} />
      </MemoryRouter>
    </div>
  );
};

export default MatchHarxReps;