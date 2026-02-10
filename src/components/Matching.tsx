import React from 'react';
import { MatchingDashboard } from './MatchingDashboard';
import { useNavigate } from 'react-router-dom';

const Matching = () => {
  const navigate = useNavigate();

  const handleAgentSelect = (agentId: string, gigId?: string) => {
    const gigParam = gigId ? `?gigId=${gigId}` : '';
    navigate(`/agent-details/${agentId}${gigParam}`);
  };

  return (
    <MatchingDashboard onAgentSelect={handleAgentSelect} />
  );
};

export default Matching;