import React, { useState } from 'react';
import {
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  FileText,
  Video,
  MessageSquare,
  Award,
  Clock,
  Calendar,
  Settings,
  Download,
  Upload,
  Star,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RefreshCw,
  ThumbsUp,
  X,
  Plus,
  Edit,
  Save
} from 'lucide-react';

const RepOnboarding = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [expandedSection, setExpandedSection] = useState<number | null>(1);
  const [selectedTraining, setSelectedTraining] = useState<string[]>([]);

  const onboardingSteps = [
    {
      id: 1,
      title: 'Profile Setup',
      description: 'Complete REP profile and documentation',
      status: 'completed'
    },
    {
      id: 2,
      title: 'Training & Certification',
      description: 'Complete required training modules',
      status: 'current'
    },
    {
      id: 3,
      title: 'Channel Setup',
      description: 'Configure communication channels',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Skills Assessment',
      description: 'Validate skills and expertise',
      status: 'pending'
    }
  ];

  const trainingModules = [
    {
      id: 1,
      title: 'Platform Introduction',
      duration: '30 mins',
      type: 'video',
      required: true,
      status: 'completed',
      progress: 100
    },
    {
      id: 2,
      title: 'Communication Best Practices',
      duration: '1 hour',
      type: 'interactive',
      required: true,
      status: 'in_progress',
      progress: 60
    },
    {
      id: 3,
      title: 'Multi-Channel Support',
      duration: '45 mins',
      type: 'video',
      required: true,
      status: 'not_started',
      progress: 0
    },
    {
      id: 4,
      title: 'Customer Service Excellence',
      duration: '2 hours',
      type: 'course',
      required: true,
      status: 'not_started',
      progress: 0
    }
  ];

  const assessments = [
    {
      id: 1,
      title: 'Communication Skills',
      type: 'practical',
      status: 'pending',
      score: null
    },
    {
      id: 2,
      title: 'Technical Knowledge',
      type: 'written',
      status: 'completed',
      score: 92
    },
    {
      id: 3,
      title: 'Platform Proficiency',
      type: 'practical',
      status: 'in_progress',
      score: null
    }
  ];

  const toggleSection = (sectionId: number) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">REP Onboarding</h2>
          <p className="text-sm text-gray-500">Guide new REPS through the onboarding process</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </button>
          <button className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            New REP
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Onboarding Progress</h3>
          <span className="text-sm text-gray-500">Step {activeStep} of 4</span>
        </div>
        <div className="mt-4">
          <div className="relative">
            <div className="absolute left-0 top-2 h-0.5 w-full bg-gray-200">
              <div 
                className="absolute h-0.5 bg-indigo-600 transition-all duration-500"
                style={{ width: `${((activeStep - 1) / 3) * 100}%` }}
              />
            </div>
            <div className="relative flex justify-between">
              {onboardingSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    step.status === 'completed' ? 'border-indigo-600 bg-indigo-600' :
                    step.status === 'current' ? 'border-indigo-600 bg-white' :
                    'border-gray-300 bg-white'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className={`text-sm font-medium ${
                        step.status === 'current' ? 'text-indigo-600' : 'text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-indigo-600' :
                      step.status === 'current' ? 'text-gray-900' :
                      'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Training Modules */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Training & Certification</h3>
        <div className="mt-4 space-y-4">
          {trainingModules.map((module) => (
            <div
              key={module.id}
              className="rounded-lg border border-gray-200 bg-white"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div className={`rounded-lg p-2 ${
                    module.status === 'completed' ? 'bg-green-100 text-green-600' :
                    module.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {module.type === 'video' ? (
                      <Video className="h-5 w-5" />
                    ) : module.type === 'interactive' ? (
                      <MessageSquare className="h-5 w-5" />
                    ) : (
                      <BookOpen className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{module.title}</h4>
                    <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{module.duration}</span>
                      {module.required && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {module.status === 'completed' ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Completed
                    </span>
                  ) : module.status === 'in_progress' ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-indigo-600"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{module.progress}%</span>
                    </div>
                  ) : (
                    <button className="flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                      <Play className="mr-1 h-4 w-4" />
                      Start
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Assessment */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Skills Assessment</h3>
        <div className="mt-4 space-y-4">
          {assessments.map((assessment) => (
            <div
              key={assessment.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`rounded-lg p-2 ${
                    assessment.status === 'completed' ? 'bg-green-100 text-green-600' :
                    assessment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{assessment.title}</h4>
                    <p className="text-sm text-gray-500">
                      {assessment.type === 'practical' ? 'Practical Assessment' : 'Written Test'}
                    </p>
                  </div>
                </div>
                <div>
                  {assessment.status === 'completed' ? (
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-600">{assessment.score}%</span>
                      <p className="text-sm text-gray-500">Score</p>
                    </div>
                  ) : assessment.status === 'in_progress' ? (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-sm font-medium text-yellow-800">
                      <Clock className="mr-1 h-4 w-4" />
                      In Progress
                    </span>
                  ) : (
                    <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                      Start Assessment
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Setup */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Channel Configuration</h3>
        <div className="mt-4 space-y-4">
          {[
            { id: 'voice', name: 'Voice Channel', icon: Phone, status: 'configured' },
            { id: 'email', name: 'Email Integration', icon: Mail, status: 'pending' },
            { id: 'chat', name: 'Live Chat', icon: MessageSquare, status: 'configured' },
            { id: 'social', name: 'Social Media', icon: Globe, status: 'not_started' }
          ].map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-lg p-2 ${
                      channel.status === 'configured' ? 'bg-green-100 text-green-600' :
                      channel.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{channel.name}</h4>
                      <p className="text-sm text-gray-500">
                        {channel.status === 'configured' ? 'Ready to use' :
                         channel.status === 'pending' ? 'Configuration pending' :
                         'Not configured'}
                      </p>
                    </div>
                  </div>
                  <button className={`rounded-md px-3 py-1.5 text-sm font-medium shadow-sm ${
                    channel.status === 'configured'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}>
                    {channel.status === 'configured' ? 'Reconfigure' : 'Configure'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documentation */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Documentation & Resources</h3>
          <button className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
            <Download className="mr-1 h-4 w-4" />
            Download All
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { title: 'Onboarding Guide', type: 'PDF', size: '2.4 MB' },
            { title: 'Channel Setup Manual', type: 'PDF', size: '1.8 MB' },
            { title: 'Best Practices', type: 'PDF', size: '3.2 MB' },
            { title: 'Training Videos', type: 'ZIP', size: '156 MB' }
          ].map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-500">{doc.type} • {doc.size}</p>
                </div>
              </div>
              <button className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RepOnboarding;