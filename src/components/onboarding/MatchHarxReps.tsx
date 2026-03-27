import React, { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, CheckCircle2, Users, Plus } from 'lucide-react';
import Cookies from 'js-cookie';

interface MatchHarxRepsProps {
  onBack?: () => void;
}

const MatchHarxReps = ({ onBack }: MatchHarxRepsProps) => {
  // This is a placeholder for the actual MatchHarxReps component logic
  const companyId = Cookies.get('companyId');
  const [isStepCompleted, setIsStepCompleted] = useState(false);

  useEffect(() => {
    // Simulate checking step status for MatchHarxReps
    const storedProgress = localStorage.getItem('companyOnboardingProgress');
    if (storedProgress) {
      try {
        const progress = JSON.parse(storedProgress);
        if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(8)) {
          setIsStepCompleted(true);
        }
      } catch (e) {
        console.error('❌ Error parsing stored progress:', e);
      }
    }
  }, [companyId]);

  const handleCompleteMatchHarxReps = async () => {
    try {
      if (!companyId) return;
      setIsStepCompleted(true);
      const currentProgress = {
        currentPhase: 2,
        completedSteps: [8],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: {
          stepId: 8,
          phaseId: 2,
          status: 'completed',
          completedSteps: [8]
        }
      }));
    } catch (error) {
      console.error('❌ Error completing MatchHarxReps:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] w-full flex flex-col">
      {onBack && (
        <div className="p-4 border-b border-gray-100 bg-white">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-harx-600 transition-colors group"
          >
            <ChevronDown className="h-5 w-5 rotate-90 group-hover:-translate-x-1 transition-transform" />
            Back to onboarding overview
          </button>
        </div>
      )}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-gray-900">Match HarxReps</h2>
            {isStepCompleted && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>
          {!isStepCompleted && (
            <button
              onClick={handleCompleteMatchHarxReps}
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Matching
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500">This is where you would match your HarxReps.</p>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900">HarxReps Matching Interface</h3>
          <p className="mt-1 text-sm text-gray-500">
            Implement your HarxReps matching logic and UI here.
          </p>
          <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">Your HarxReps matching tools will appear here.</p>
            <button className="mt-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add HarxRep
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchHarxReps;