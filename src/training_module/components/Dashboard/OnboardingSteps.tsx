import React from 'react';
import { CheckCircle, Clock, Play, FileText, Users, Award } from 'lucide-react';
import { OnboardingStep } from '../../types';

interface OnboardingStepsProps {
  steps: OnboardingStep[];
}

export default function OnboardingSteps({ steps }: OnboardingStepsProps) {
  const getStepIcon = (type: string, status: string) => {
    if (status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }

    switch (type) {
      case 'training':
        return <Play className="h-5 w-5 text-blue-500" />;
      case 'assessment':
        return <Award className="h-5 w-5 text-purple-500" />;
      case 'documentation':
        return <FileText className="h-5 w-5 text-gray-500" />;
      case 'live-session':
        return <Users className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50';
      case 'pending':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Onboarding Checklist</h2>
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`border rounded-lg p-4 transition-all hover:shadow-sm ${getStepColor(step.status)}`}
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getStepIcon(step.type, step.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-gray-900">{step.title}</h3>
                  <span className="text-xs text-gray-500">{step.estimatedTime}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                
                {step.status !== 'pending' && (
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          step.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{step.progress}%</span>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0">
                {step.status === 'pending' ? (
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Start
                  </button>
                ) : step.status === 'in-progress' ? (
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Continue
                  </button>
                ) : (
                  <span className="text-green-600 text-sm font-medium">Completed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}