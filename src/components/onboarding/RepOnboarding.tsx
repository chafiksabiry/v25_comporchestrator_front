import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
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
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

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

  // Helper function to format training journey data for display
  const formatTrainingJourney = (journey: any) => {
    // Calculate total duration from modules if available
    let duration = 'N/A';
    if (journey.modules && Array.isArray(journey.modules)) {
      const totalMinutes = journey.modules.reduce((acc: number, module: any) => {
        return acc + (module.duration || 0);
      }, 0);
      if (totalMinutes > 0) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
      }
    }

    // Map backend status to UI status
    let status = 'not_started';
    if (journey.status === 'completed' || journey.journeyStatus === 'completed') {
      status = 'completed';
    } else if (journey.status === 'in_progress' || journey.journeyStatus === 'in_progress' || journey.status === 'active') {
      status = 'in_progress';
    }

    return {
      id: journey._id || journey.id,
      title: journey.title || journey.name || 'Untitled Training',
      description: journey.description || '',
      duration: duration,
      type: journey.type || 'course',
      required: journey.required !== false, // Default to required
      status: status,
      progress: journey.progress || (status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0),
      modules: journey.modules || []
    };
  };

  // Extract all documents from training modules sections
  const extractDocumentsFromTrainings = (): Array<{
    id: string;
    title: string;
    type: string;
    size: string;
    url?: string;
  }> => {
    const documents: Array<{
      id: string;
      title: string;
      type: string;
      size: string;
      url?: string;
    }> = [];

    trainings.forEach((journey: any) => {
      if (journey.modules && Array.isArray(journey.modules)) {
        journey.modules.forEach((module: any) => {
          if (module.sections && Array.isArray(module.sections)) {
            module.sections.forEach((section: any) => {
              // Check if section has a file in content
              if (section.content && section.content.file) {
                const file = section.content.file;
                const fileName = file.name || section.title || 'Untitled Document';
                const fileType = file.type || file.mimeType?.split('/')[1]?.toUpperCase() || 'FILE';
                const fileSize = file.size
                  ? file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(file.size / 1024).toFixed(1)} KB`
                  : 'Unknown size';

                documents.push({
                  id: file.id || file.publicId || `${journey.id}-${module._id}-${section._id}`,
                  title: fileName,
                  type: fileType,
                  size: fileSize,
                  url: file.url
                });
              }
            });
          }
        });
      }
    });

    // Remove duplicates based on URL or ID
    const uniqueDocuments = documents.filter((doc, index, self) =>
      index === self.findIndex((d) => d.id === doc.id || d.url === doc.url)
    );

    return uniqueDocuments;
  };

  // Get documents from trainings
  const trainingDocuments = extractDocumentsFromTrainings();

  // Format file type for display
  const formatFileType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'pdf': 'PDF',
      'doc': 'DOC',
      'docx': 'DOCX',
      'xls': 'XLS',
      'xlsx': 'XLSX',
      'ppt': 'PPT',
      'pptx': 'PPTX',
      'mp4': 'VIDEO',
      'mov': 'VIDEO',
      'avi': 'VIDEO',
      'zip': 'ZIP',
      'rar': 'RAR',
      'jpg': 'IMAGE',
      'jpeg': 'IMAGE',
      'png': 'IMAGE',
      'gif': 'IMAGE'
    };

    const normalizedType = type.toLowerCase();
    return typeMap[normalizedType] || type.toUpperCase();
  };

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

  // Function to get training backend URL
  const getTrainingBackendUrl = (): string => {
    const customUrl = import.meta.env.VITE_TRAINING_BACKEND_URL;
    if (customUrl) {
      return customUrl;
    }
    // Check if running locally
    const isLocal = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocal) {
      return 'http://localhost:5010';
    }
    // Default to sandbox API
    return 'https://v25platformtrainingbackend-production.up.railway.app';
  };

  // Function to fetch trainings for the company
  const fetchCompanyTrainings = useCallback(async () => {
    if (!companyId) {
      console.log('[RepOnboarding] No companyId available, skipping training fetch');
      return;
    }

    setLoadingTrainings(true);
    try {
      const trainingBackendUrl = getTrainingBackendUrl();
      const apiUrl = `${trainingBackendUrl}/training_journeys/trainer/companyId/${companyId}`;

      console.log('[RepOnboarding] Fetching trainings from:', apiUrl);
      console.log('[RepOnboarding] Company ID:', companyId);
      console.log('[RepOnboarding] Training Backend URL:', trainingBackendUrl);

      const response = await axios.get(apiUrl);

      console.log('[RepOnboarding] Training API Response:', response.data);

      if (response.data && response.data.success && response.data.data) {
        const trainingsData = Array.isArray(response.data.data) ? response.data.data : [];
        console.log('[RepOnboarding] Found', trainingsData.length, 'trainings');
        setTrainings(trainingsData);
      } else if (Array.isArray(response.data)) {
        console.log('[RepOnboarding] Response is array, found', response.data.length, 'trainings');
        setTrainings(response.data);
      } else {
        console.log('[RepOnboarding] No trainings found in response');
        setTrainings([]);
      }
    } catch (error: any) {
      console.error('[RepOnboarding] Error fetching company trainings:', error);
      if (error.response) {
        console.error('[RepOnboarding] Error response status:', error.response.status);
        console.error('[RepOnboarding] Error response data:', error.response.data);
        console.error('[RepOnboarding] Requested URL:', error.config?.url);
      }
      setTrainings([]);
    } finally {
      setLoadingTrainings(false);
    }
  }, [companyId]);

  // Navigate to training URL
  const navigateToUrl = (url: string) => {
    window.location.href = url;
  };

  // Get company ID from cookie or fetch it
  useEffect(() => {
    const storedCompanyId = Cookies.get('companyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    } else {
      // Try to fetch company ID from user ID
      const userId = Cookies.get('userId');
      if (userId) {
        axios.get(`${import.meta.env.VITE_COMPANY_API_URL}/companies/user/${userId}`)
          .then((response) => {
            if (response.data.success && response.data.data) {
              const companyId = response.data.data._id;
              setCompanyId(companyId);
              Cookies.set('companyId', companyId);
            }
          })
          .catch((error) => {
            console.error('Error fetching company ID:', error);
          });
      }
    }
  }, []);

  // Fetch trainings when company ID is available
  useEffect(() => {
    if (companyId) {
      fetchCompanyTrainings();
    }
  }, [companyId, fetchCompanyTrainings]);

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
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${step.status === 'completed' ? 'border-indigo-600 bg-indigo-600' :
                    step.status === 'current' ? 'border-indigo-600 bg-white' :
                      'border-gray-300 bg-white'
                    }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className={`text-sm font-medium ${step.status === 'current' ? 'text-indigo-600' : 'text-gray-500'
                        }`}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${step.status === 'completed' ? 'text-indigo-600' :
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
          {loadingTrainings ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Loading trainings...</p>
            </div>
          ) : trainings.length > 0 ? (
            trainings.map((journey) => {
              const module = formatTrainingJourney(journey);
              return (
                <div
                  key={module.id}
                  className="rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className={`rounded-lg p-2 ${module.status === 'completed' ? 'bg-green-100 text-green-600' :
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
                        {module.description && (
                          <p className="mt-1 text-xs text-gray-400 line-clamp-1">{module.description}</p>
                        )}
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
                        <button
                          onClick={() => navigateToUrl(`/training/${module.id}`)}
                          className="flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-500">
                No trainings available yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Company Trainings Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Company Trainings</h3>
          <button
            onClick={() => navigateToUrl('/training')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 flex items-center space-x-2"
          >
            <BookOpen className="h-4 w-4" />
            <span>Go to Training</span>
          </button>
        </div>

        {loadingTrainings ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Loading trainings...</p>
          </div>
        ) : trainings.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Your company has {trainings.length} training{trainings.length > 1 ? 's' : ''} available:
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trainings.map((training: any) => (
                <div
                  key={training._id || training.id}
                  className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="rounded-full bg-indigo-100 p-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {training.title || training.name || 'Untitled Training'}
                      </h4>
                      {training.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {training.description}
                        </p>
                      )}
                      {training.duration && (
                        <p className="mt-2 text-xs text-gray-400">
                          Duration: {training.duration}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">
              No trainings available for your company yet.
            </p>
            <button
              onClick={() => navigateToUrl('/training')}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              Create Training
            </button>
          </div>
        )}
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
                  <div className={`rounded-lg p-2 ${assessment.status === 'completed' ? 'bg-green-100 text-green-600' :
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
                    <div className={`rounded-lg p-2 ${channel.status === 'configured' ? 'bg-green-100 text-green-600' :
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
                  <button className={`rounded-md px-3 py-1.5 text-sm font-medium shadow-sm ${channel.status === 'configured'
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
          {trainingDocuments.length > 0 && (
            <button
              onClick={() => {
                // Download all documents
                trainingDocuments.forEach((doc) => {
                  if (doc.url) {
                    window.open(doc.url, '_blank');
                  }
                });
              }}
              className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <Download className="mr-1 h-4 w-4" />
              Download All
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {trainingDocuments.length > 0 ? (
            trainingDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">{formatFileType(doc.type)} • {doc.size}</p>
                  </div>
                </div>
                {doc.url && (
                  <button
                    onClick={() => window.open(doc.url, '_blank')}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 flex-shrink-0 ml-2"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-500">
                No documents available in training modules yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepOnboarding;