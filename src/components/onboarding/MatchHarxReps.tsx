import React from 'react';
import { MatchingDashboard } from '../MatchingDashboard';
import { MemoryRouter } from 'react-router-dom';

const MatchHarxReps = () => {
  return (
    <div className="h-[calc(100vh-100px)] w-full">
      <MemoryRouter>
        <MatchingDashboard />
      </MemoryRouter>
    </div>
  );
};

export default MatchHarxReps;