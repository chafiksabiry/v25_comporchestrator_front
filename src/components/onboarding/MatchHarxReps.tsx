import React from 'react';
import { MatchingDashboard } from '../MatchingDashboard';

const MatchHarxReps = () => {
  return (
    <div className="h-[calc(100vh-100px)] w-full">
      <MatchingDashboard onAgentSelect={function (agentId: string, gigId?: string): void {
        throw new Error('Function not implemented.');
      } } />
    </div>
  );
};

export default MatchHarxReps;