import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { MemoryRouter } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle,
  FileText,
  Clock,
  Download,
  Play,
  RefreshCw,
  Plus
} from 'lucide-react';

import { AppContent } from '../training/App';
import '../training/index.css';

interface RepOnboardingProps { }

const RepOnboarding: React.FC<RepOnboardingProps> = () => {
  const [expandedSection, setExpandedSection] = useState<number | null>(1);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showTraining, setShowTraining] = useState<{ isOpen: boolean, journeyId?: string, newJourney?: boolean }>({ isOpen: false });

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
      id: String(journey._id || journey.id || ''),
      title: journey.title || journey.name || 'Untitled Training',
      description: journey.description || 'No description provided',
      duration: duration,
      modulesCount: journey.modules ? journey.modules.length : 0,
      status: status,
      progress: journey.progress || 0
    };
  };

  // Function to get training backend URL
  const getTrainingBackendUrl = (): string => {
    const customUrl = import.meta.env.VITE_TRAINING_BACKEND_URL;
    if (customUrl) return customUrl;
    return 'https://v25-platform-training-backend.onrender.com/api';
  };

  // Function to update onboarding progress in the main company platform
  const updateOnboardingProgress = async () => {
    if (!companyId) return;

    try {
      const apiUrl = import.meta.env.VITE_COMPANY_API_URL || 'https://v25-platform-company-backend.onrender.com/api';
      const endpoint = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/9`;

      console.log('[RepOnboarding] Marking Step 9 as completed:', endpoint);
      const response = (await axios.put(endpoint, { status: "completed" })) as any;

      if (response.data) {
        // Update the cookie to keep frontend in sync
        Cookies.set('companyOnboardingProgress', JSON.stringify(response.data), { expires: 7 });

        // Notify parent component for real-time UI update
        window.dispatchEvent(new CustomEvent('stepCompleted', {
          detail: {
            stepId: 9,
            phaseId: 3,
            status: 'completed',
            completedSteps: response.data.completedSteps || []
          }
        }));
        console.log('[RepOnboarding] Step 9 successfully marked as completed');
      }
    } catch (error) {
      console.error('[RepOnboarding] Failed to update onboarding progress:', error);
    }
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
      const response = (await axios.get(apiUrl)) as any;

      console.log('[RepOnboarding] Training API Response:', response.data);

      const backendData = response.data as any;
      if (backendData && backendData.success && backendData.data) {
        // If the data object has a 'journeys' property, use that (new dashboard format)
        // Otherwise use the data object itself (if it was an array)
        const journeysArray = backendData.data.journeys || (Array.isArray(backendData.data) ? backendData.data : []);
        console.log('[RepOnboarding] Found', journeysArray.length, 'trainings');
        setTrainings(journeysArray);

        // Auto-complete step 9 if trainings exist
        if (journeysArray.length > 0) {
          updateOnboardingProgress();
        }
      } else if (Array.isArray(response.data)) {
        console.log('[RepOnboarding] Response is array, found', response.data.length, 'trainings');
        setTrainings(response.data);
        if (response.data.length > 0) {
          updateOnboardingProgress();
        }
      }
    } catch (error) {
      console.error('[RepOnboarding] Error fetching trainings:', error);
    } finally {
      setLoadingTrainings(false);
    }
  }, [companyId]);

  // Load company ID on mount
  useEffect(() => {
    const id = Cookies.get('companyId');
    if (id) {
      setCompanyId(id);
    } else {
      console.warn('[RepOnboarding] No companyId found in cookies');
      // For testing, use a default company ID if needed
      // setCompanyId('65bcc8e6f1a2b3c4d5e6f7a8'); 
    }
  }, []);

  // Fetch trainings once companyId is available
  useEffect(() => {
    if (companyId) {
      fetchCompanyTrainings();
    }
  }, [companyId, fetchCompanyTrainings]);

  if (showTraining.isOpen) {
    return (
      <MemoryRouter>
        <AppContent
          initialJourneyId={showTraining.journeyId}
          isEmbedded={true}
          startWithJourneyBuilder={showTraining.newJourney}
        />
      </MemoryRouter>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">REP Onboarding</h1>
            <p className="mt-1 text-gray-500">Complete your setup and start your journey</p>
          </div>
          <div className="hidden space-x-2 md:flex">
            <button className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50">
              <Download className="h-4 w-4" />
              <span>Guide PDF</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Training Section */}
            <section className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Training & Certification</h2>
                      <p className="text-sm text-gray-500">Skills development and validation</p>
                    </div>
                  </div>
                </div>

                {loadingTrainings ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 py-12 rounded-xl">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
                    <p className="mt-4 text-gray-500">Loading available trainings...</p>
                  </div>
                ) : trainings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-12 text-center border border-dashed border-gray-200 p-8">
                    <div className="mb-4 rounded-full bg-white p-3 shadow-sm">
                      <Plus className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">No training journeys yet</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                      Add your first training journey to start onboarding your REPs.
                    </p>
                    <button
                      onClick={() => setShowTraining({ isOpen: true, newJourney: true })}
                      className="mt-6 inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create First Journey</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trainings.filter(Boolean).map((journey) => {
                      const formatted = formatTrainingJourney(journey);
                      return (
                        <div
                          key={formatted.id}
                          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-lg ${formatted.status === 'completed' ? 'bg-green-50 text-green-600' :
                                formatted.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                                }`}>
                                {formatted.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {formatted.title}
                                </h3>
                                <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                                  {formatted.description}
                                </p>
                                <div className="mt-3 flex items-center space-x-4">
                                  <div className="flex items-center text-xs text-gray-400">
                                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                                    {formatted.duration}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-400">
                                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                                    {formatted.modulesCount} modules
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowTraining({ isOpen: true, journeyId: formatted.id })}
                              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${formatted.status === 'completed' ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                                'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                }`}
                            >
                              {formatted.status === 'completed' ? 'Review' : formatted.status === 'in_progress' ? 'Continue' : 'Start'}
                            </button>
                          </div>
                          {formatted.status === 'in_progress' && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-gray-500">Progress</span>
                                <span className="font-medium text-indigo-600">{formatted.progress}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full bg-indigo-600 transition-all duration-500"
                                  style={{ width: `${formatted.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      onClick={() => setShowTraining({ isOpen: true, newJourney: true })}
                      className="flex w-full items-center justify-center space-x-2 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New Training Journey</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Assigned</span>
                  <span className="font-bold text-gray-900">{trainings.filter(Boolean).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Completed</span>
                  <span className="font-bold text-green-600">
                    {trainings.filter(Boolean).filter(t => t && (t.status === 'completed' || t.journeyStatus === 'completed')).length}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-gray-900">Overall Progress</span>
                    <span className="text-indigo-600">
                      {trainings.filter(Boolean).length > 0
                        ? Math.round((trainings.filter(Boolean).filter(t => t && (t.status === 'completed' || t.journeyStatus === 'completed')).length / trainings.filter(Boolean).length) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepOnboarding;