import React from 'react';

export function DashboardPanel() {
  const handleOrchestratorClick = () => {
    window.location.href = '/app11';
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center overflow-hidden relative" style={{ backgroundColor: 'rgb(243, 244, 246)' }}>
      {/* Orchestrator Button - Centered */}
      <button
        onClick={handleOrchestratorClick}
        className="bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white font-bold py-4 px-10 rounded-xl shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-rose-200 text-xl"
      >
        Orchestrator
      </button>
    </div>
  );
}

export default DashboardPanel;
