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
    <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 py-4">
      <div className="container mx-auto px-2">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            {/* Navigation Labels */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                AI-suggested goals
              </div>
              <div className="px-3 py-1 text-gray-600 rounded-lg text-xs font-medium">
                Success metrics
              </div>
              <div className="px-3 py-1 text-gray-600 rounded-lg text-xs font-medium">
                Timeline planning
              </div>
            </div>

            <div className="space-y-4">
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
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Describe the goals, outcomes, and key benefits of this training program..."
                />
              </div>

              {/* Expected Program Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Program Duration
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                      className={`p-2 border rounded-lg text-center transition-all hover:shadow-sm ${estimatedDuration === duration.value
                          ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                          : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <div className="font-semibold text-xs">{duration.label}</div>
                      <div className="text-[10px] text-gray-600">{duration.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Step 2 of 4</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={onBack}
                className="px-4 py-2 border text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={!canProceed}
                className="px-6 py-2 bg-gradient-to-r text-sm from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md flex items-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

