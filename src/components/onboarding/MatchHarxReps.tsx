import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchingDashboard } from '../MatchingDashboard';

const MatchHarxReps = () => {
  const navigate = useNavigate();

  const handleAgentSelect = (agentId: string, gigId?: string) => {
    const gigParam = gigId ? `?gigId=${gigId}` : '';
    navigate(`/agent-details/${agentId}${gigParam}`);
  };

  return (
    <div className="h-[calc(100vh-100px)] w-full">
      <MatchingDashboard onAgentSelect={handleAgentSelect} />
    </div>
  );
};

export default MatchHarxReps;