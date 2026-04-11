import React, { useState, useEffect } from 'react';
import { Target, ArrowLeft, ArrowRight } from 'lucide-react';

interface TrainingDetailsFormProps {
  onComplete: (data: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => void;
  onBack: () => void;
  gigData?: any;
}

export default function TrainingDetailsForm({ onComplete, onBack, gigData }: TrainingDetailsFormProps) {
  const [trainingName, setTrainingName] = useState('');
  const [trainingDescription, setTrainingDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  const handleSubmit = () => {
    onComplete({
      trainingName,
      trainingDescription,
      estimatedDuration
    });
  };

  const canProceed = trainingName.trim() && estimatedDuration;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1 flex flex-col md:p-5">
          {/* Navigation Labels */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-medium">
              AI-suggested goals
            </div>
            <div className="px-2 py-0.5 text-gray-500 bg-gray-50 rounded-md text-[10px] font-medium">
              Success metrics
            </div>
            <div className="px-2 py-0.5 text-gray-500 bg-gray-50 rounded-md text-[10px] font-medium">
              Timeline planning
            </div>
          </div>

          <div className="space-y-3">
            {/* Training Program Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Training Program Name *
              </label>
              <input
                type="text"
                value={trainingName}
                onChange={(e) => setTrainingName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
                placeholder="e.g., Customer Success Mastery Program"
              />
            </div>

            {/* Program Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Program Description
              </label>
              <textarea
                value={trainingDescription}
                onChange={(e) => setTrainingDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="Describe the goals, outcomes, and key benefits of this training program..."
              />
            </div>

            {/* Expected Program Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expected Program Duration
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { value: '120', label: 'Quick Start', desc: '1-2 hours' },
                  { value: '240', label: 'Half Day', desc: '3-4 hours' },
                  { value: '480', label: 'Full Day', desc: '6-8 hours' },
                  { value: '2400', label: 'One Week', desc: 'Multi-session' },
                  { value: '4800', label: 'Two Weeks', desc: 'Comprehensive' },
                  { value: '9600', label: 'One Month', desc: 'Deep Learning' },
                ].map((duration) => (
                  <button
                    key={duration.value}
                    type="button"
                    onClick={() => setEstimatedDuration(duration.value)}
                    className={`px-2 py-1.5 border rounded-lg text-left transition-all hover:shadow-sm ${estimatedDuration === duration.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 hover:border-indigo-300'
                      }`}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-medium text-[11px]">{duration.label}</span>
                      <span className="text-[9px] text-gray-500">({duration.desc})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Bar & Navigation Buttons */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <button
              onClick={onBack}
              className="px-4 py-1.5 border border-gray-200 text-xs text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium flex items-center space-x-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <div className="flex flex-col items-center w-1/3">
              <span className="text-[10px] font-medium text-gray-500 mb-1">Step 2 of 4</span>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div className="bg-indigo-500 h-1 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canProceed}
              className="px-5 py-1.5 bg-indigo-600 text-xs text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm flex items-center space-x-1"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
