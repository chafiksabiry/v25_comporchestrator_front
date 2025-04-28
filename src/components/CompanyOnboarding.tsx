import React, { useState } from 'react';
import {
  Building2,
  Shield,
  FileText,
  Phone,
  Users,
  BookOpen,
  MessageSquare,
  BarChart,
  CheckCircle,
  ChevronRight,
  AlertCircle,
  Upload,
  Globe,
  Calendar,
  Settings,
  Rocket
} from 'lucide-react';
import TelephonySetup from './TelephonySetup';
import CompanyProfile from './onboarding/CompanyProfile';
import KYCVerification from './onboarding/KYCVerification';
import SubscriptionPlan from './onboarding/SubscriptionPlan';
import CallScript from './onboarding/CallScript';
import KnowledgeBase from './onboarding/KnowledgeBase';
import ReportingSetup from './onboarding/ReportingSetup';
import CreateGig from './onboarding/CreateGig';
import UploadContacts from './onboarding/UploadContacts';
import MatchHarxReps from './onboarding/MatchHarxReps';
import RepOnboarding from './onboarding/RepOnboarding';
import SessionPlanning from './onboarding/SessionPlanning';

interface BaseStep {
  id: number;
  title: string;
  description: string;
  status: string;
}

interface ComponentStep extends BaseStep {
  component: React.ComponentType;
}

interface NonComponentStep extends BaseStep {
  component?: never;
}

type Step = ComponentStep | NonComponentStep;

interface Phase {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  steps: Step[];
}

const CompanyOnboarding = () => {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showTelephonySetup, setShowTelephonySetup] = useState(false);

  const phases: Phase[] = [
    {
      id: 1,
      title: 'Company Account Setup & Identity',
      icon: Building2,
      color: 'blue',
      steps: [
        {
          id: 1,
          title: 'Create Company Profile',
          description: 'Legal and commercial details, key contacts, terms agreement',
          status: 'completed',
          component: CompanyProfile
        },
        {
          id: 2,
          title: 'KYC / KYB Verification',
          description: 'Identity verification through Stripe Identity or Sumsub',
          status: 'current',
          component: KYCVerification
        },
        {
          id: 3,
          title: 'Subscription Plan',
          description: 'Select plan: Free, Standard, or Premium',
          status: 'pending',
          component: SubscriptionPlan
        }
      ]
    },
    {
      id: 2,
      title: 'Operational Setup',
      icon: Settings,
      color: 'yellow',
      steps: [
        {
          id: 4,
          title: 'Create Gigs',
          description: 'Define multi-channel gigs and requirements',
          status: 'pending',
          component: CreateGig
        },
        {
          id: 5,
          title: 'Telephony Setup',
          description: 'Phone numbers, call tracking, and dialer configuration',
          status: 'pending',
          component: TelephonySetup
        },
        {
          id: 6,
          title: 'Upload Contacts',
          description: 'Import contacts for multi-channel engagement',
          status: 'pending',
          component: UploadContacts
        },
        {
          id: 7,
          title: 'Knowledge Base',
          description: 'Create training materials and FAQs',
          status: 'pending',
          component: KnowledgeBase
        },
        {
          id: 8,
          title: 'Call Script',
          description: 'Define script and conversation flows',
          status: 'pending',
          component: CallScript
        },
        {
          id: 9,
          title: 'Reporting Setup',
          description: 'Configure KPIs and reporting preferences',
          status: 'pending',
          component: ReportingSetup
        }
      ]
    },
    {
      id: 3,
      title: 'REPS Engagement',
      icon: Users,
      color: 'green',
      steps: [
        {
          id: 10,
          title: 'Match HARX REPS',
          description: 'Connect with qualified REPS based on requirements',
          status: 'pending',
          component: MatchHarxReps
        },
        {
          id: 11,
          title: 'REP Onboarding',
          description: 'Training, validation, and contract acceptance',
          status: 'pending',
          component: RepOnboarding
        },
        {
          id: 12,
          title: 'Session Planning',
          description: 'Schedule call slots and prioritize leads',
          status: 'pending',
          component: SessionPlanning
        }
      ]
    },
    {
      id: 4,
      title: 'Activation & Monitoring',
      icon: Rocket,
      color: 'red',
      steps: [
        {
          id: 13,
          title: 'Gig Activation',
          description: 'Launch multi-channel operations',
          status: 'pending'
        },
        {
          id: 14,
          title: 'Feedback Collection',
          description: 'Monitor interactions and gather ratings',
          status: 'pending'
        },
        {
          id: 15,
          title: 'Deliverable Validation',
          description: 'Approve results and process payments',
          status: 'pending'
        }
      ]
    },
    {
      id: 5,
      title: 'Optimization & Upsale',
      icon: BarChart,
      color: 'purple',
      steps: [
        {
          id: 16,
          title: 'Improvement Analysis',
          description: 'Review performance and suggest optimizations',
          status: 'pending'
        },
        {
          id: 17,
          title: 'Plan Assessment',
          description: 'Evaluate usage and consider upgrades',
          status: 'pending'
        },
        {
          id: 18,
          title: 'Gig Management',
          description: 'Close or relaunch gigs based on performance',
          status: 'pending'
        }
      ]
    }
  ];

  const getStepIcon = (step: any) => {
    switch (step.id) {
      case 1: return Building2;
      case 2: return Shield;
      case 3: return FileText;
      case 4: return MessageSquare;
      case 5: return Phone;
      case 6: return Upload;
      case 7: return BookOpen;
      case 8: return FileText;
      case 9: return BarChart;
      case 10: return Users;
      case 11: return BookOpen;
      case 12: return Calendar;
      case 13: return Rocket;
      case 14: return MessageSquare;
      case 15: return CheckCircle;
      case 16: return BarChart;
      case 17: return FileText;
      case 18: return Globe;
      default: return CheckCircle;
    }
  };

  const handleStartStep = (stepId: number) => {
    const allSteps = phases.flatMap(phase => phase.steps);
    const step = allSteps.find(s => s.id === stepId);
    
    if (step?.component) {
      setActiveStep(stepId);
    }
  };

  const handleBackToOnboarding = () => {
    setActiveStep(null);
  };

  const handleStepClick = (stepId: number) => {
    const allSteps = phases.flatMap(phase => phase.steps);
    const step = allSteps.find(s => s.id === stepId);
    
    if (step?.component) {
      setActiveStep(stepId);
    }
  };

  // Find the active step component
  const ActiveStepComponent = activeStep 
    ? phases.flatMap(phase => phase.steps).find(step => step.id === activeStep)?.component 
    : null;

  if (ActiveStepComponent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToOnboarding}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
            <span>Back to Onboarding</span>
          </button>
        </div>
        <ActiveStepComponent />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Company Onboarding</h1>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Save Progress
        </button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-5 gap-4">
        {phases.map((phase) => {
          const PhaseIcon = phase.icon;
          const isActive = currentPhase === phase.id;
          const isCompleted = currentPhase > phase.id;
          
          return (
            <div
              key={phase.id}
              className={`relative rounded-lg p-4 ${
                isActive ? 'bg-indigo-50 border-2 border-indigo-500' :
                isCompleted ? 'bg-green-50 border border-green-500' :
                'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`rounded-full p-2 ${
                  isActive ? 'bg-indigo-100 text-indigo-600' :
                  isCompleted ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  <PhaseIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Phase {phase.id}</p>
                  <p className="text-xs text-gray-500">{phase.title}</p>
                </div>
              </div>
              {phase.id < 5 && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Phase Details */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Phase {currentPhase}: {phases[currentPhase - 1].title}
          </h2>
          <p className="text-sm text-gray-500">
            Complete the following steps to proceed to the next phase
          </p>
        </div>

        <div className="space-y-4">
          {phases[currentPhase - 1].steps.map((step) => {
            const StepIcon = getStepIcon(step);
            const isClickable = !!step.component;
            
            return (
              <div
                key={step.id}
                className={`rounded-lg border p-4 ${
                  step.status === 'completed' ? 'border-green-200 bg-green-50' :
                  step.status === 'current' ? 'border-indigo-200 bg-indigo-50' :
                  'border-gray-200 bg-white'
                } ${isClickable ? 'cursor-pointer hover:border-indigo-300' : ''}`}
                onClick={() => isClickable && handleStepClick(step.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`rounded-full p-2 ${
                    step.status === 'completed' ? 'bg-green-100 text-green-600' :
                    step.status === 'current' ? 'bg-indigo-100 text-indigo-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">{step.title}</h3>
                      {step.status === 'completed' ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </span>
                      ) : step.status === 'current' ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          In Progress
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{step.description}</p>
                    {isClickable && (
                      <button 
                        className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={() => handleStartStep(step.id)}
                      >
                        {step.status === 'completed' ? 'Review Step' : 'Start Step'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            disabled={currentPhase === 1}
            onClick={() => setCurrentPhase(Math.max(1, currentPhase - 1))}
          >
            Previous Phase
          </button>
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            disabled={currentPhase === 5}
            onClick={() => setCurrentPhase(Math.min(5, currentPhase + 1))}
          >
            Next Phase
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Need Help?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <MessageSquare className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Chat with Support</span>
          </button>
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <BookOpen className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">View Documentation</span>
          </button>
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <Calendar className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Schedule a Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboarding;