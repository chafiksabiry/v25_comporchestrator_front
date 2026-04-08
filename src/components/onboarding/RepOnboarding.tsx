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
import PresentationPreview from '../training/components/Training/PresentationPreview';
import { getGigsByCompanyId } from '../../api/matching';
import { DraftService } from '../training/infrastructure/services/DraftService';
import { OnboardingService } from '../training/infrastructure/services/OnboardingService';
import { mapJourneyToPresentation } from '../training/utils/PresentationMapper';
import '../training/index.css';

interface RepOnboardingProps { }

const RepOnboarding: React.FC<RepOnboardingProps> = () => {
  const [expandedSection, setExpandedSection] = useState<number | null>(1);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [legacyCompanyId, setLegacyCompanyId] = useState<string | null>(null);
  const [companyGigs, setCompanyGigs] = useState<any[]>([]);
  const [filterGigId, setFilterGigId] = useState<string>('all');
  const [showTraining, setShowTraining] = useState<{ isOpen: boolean, journeyId?: string, newJourney?: boolean }>({ isOpen: false });
  const [selectedPresentation, setSelectedPresentation] = useState<any | null>(null);
  const [loadingPresentation, setLoadingPresentation] = useState(false);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Helper function to format training journey data for display
  const formatTrainingJourney = (journey: any) => {
    // Map presentation fields
    const presentationUrl = journey.presentationUrl || journey.presentation?.url;
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
      progress: journey.progress || 0,
      presentationUrl
    };
  };

  const handleViewPresentation = async (url: string | null, journeyId: string, journey: any) => {
    setActiveJourneyId(journeyId);
    
    if (url) {
      setLoadingPresentation(true);
      try {
        console.log('[RepOnboarding] Fetching presentation JSON from:', url);
        const response = await axios.get(url);
        if (response.data) {
          setSelectedPresentation(response.data);
          setLoadingPresentation(false);
          return;
        }
      } catch (error) {
        console.error('[RepOnboarding] Error fetching presentation JSON:', error);
        // Fallback to local mapping if fetch fails
      } finally {
        setLoadingPresentation(false);
      }
    }

    // Fallback or Direct local mapping if no URL or fetch failed
    console.log('[RepOnboarding] Using local mapping for presentation');
    const localPresentation = mapJourneyToPresentation(journey);
    setSelectedPresentation(localPresentation);
  };

  const handleJourneyComplete = async () => {
    if (!activeJourneyId) return;
    
    setIsCompleting(true);
    try {
      const backendUrl = getTrainingBackendUrl();
      const endpoint = `${backendUrl}/api/training_journeys/${activeJourneyId}`;
      
      console.log('[RepOnboarding] Marking journey as completed:', endpoint);
      await axios.put(endpoint, {
        status: 'completed',
        journeyStatus: 'completed',
        progress: 100
      });

      // Update local state to show green badge immediately
      setTrainings(prev => prev.map(t => 
        (t._id === activeJourneyId || t.id === activeJourneyId) 
          ? { ...t, status: 'completed', journeyStatus: 'completed', progress: 100 } 
          : t
      ));

      // Close modal
      setSelectedPresentation(null);
      setActiveJourneyId(null);
      
      // Update main platform progress (Phase 3 Step 9)
      updateOnboardingProgress();
      
    } catch (error) {
      console.error('[RepOnboarding] Error completing journey:', error);
      alert('Erreur lors de la validation de la formation.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Function to get training backend URL
  const getTrainingBackendUrl = (): string => {
    const customUrl = import.meta.env.VITE_TRAINING_BACKEND_URL;
    if (customUrl) return customUrl;
    
    // Check if we are in a local environment
    const isLocal = typeof window !== 'undefined' && 
                   (window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1');
                    
    return isLocal 
      ? 'http://localhost:5010' 
      : 'https://v25platformtrainingbackend-production.up.railway.app';
  };

  // Function to update onboarding progress in the main company platform
  const updateOnboardingProgress = async () => {
    if (!companyId) return;

    try {
      const apiUrl = import.meta.env.VITE_COMPANY_API_URL || 'https://v25searchcompanywizardbackend-production.up.railway.app/api';
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
      const baseUrl = trainingBackendUrl.endsWith('/api') 
        ? trainingBackendUrl 
        : `${trainingBackendUrl}/api`;
        
      const effectiveId = legacyCompanyId || companyId;
      if (!effectiveId) return;

      const gigParam = filterGigId && filterGigId !== 'all' ? `?gigId=${filterGigId}` : '';
      const apiUrl = `${baseUrl}/training_journeys/trainer/companyId/${effectiveId}${gigParam}`;

      console.log('[RepOnboarding] Fetching trainings using effectiveId:', effectiveId, 'from URL:', apiUrl);
      let response = (await axios.get(apiUrl)) as any;
      console.log('[RepOnboarding] Primary API Response Data:', response.data);

      let backendData = response.data as any;
      let journeysArray: any[] = [];

      if (backendData && backendData.success && backendData.data) {
        journeysArray = backendData.data.journeys || (Array.isArray(backendData.data) ? backendData.data : []);
      } else if (Array.isArray(response.data)) {
        journeysArray = response.data;
      }

      // --- EMERGENCY BRIDGE: If still 0 and we have a local draft with a DIFFERENT id, try that too ---
      if (journeysArray.length === 0 && DraftService.hasDraft()) {
        const draft = DraftService.getDraft();
        const draftCompId = draft.company?.id;
        
        if (draftCompId && draftCompId !== effectiveId) {
          console.log('[RepOnboarding] ⚠️ 0 results, attempting fallback search with draftCompanyId:', draftCompId);
          const fallbackUrl = `${baseUrl}/training_journeys/trainer/companyId/${draftCompId}${gigParam}`;
          try {
            const fallbackResponse = await axios.get(fallbackUrl) as any;
            console.log('[RepOnboarding] Fallback API Response Data:', fallbackResponse.data);
            
            const fallbackData = fallbackResponse.data as any;
            const fallbackJourneys = (fallbackData && fallbackData.success && fallbackData.data && fallbackData.data.journeys)
              ? fallbackData.data.journeys
              : (fallbackData && fallbackData.data && Array.isArray(fallbackData.data) ? fallbackData.data : []);
              
            if (fallbackJourneys.length > 0) {
              console.log('[RepOnboarding] ✅ Fallback found', fallbackJourneys.length, 'trainings! Merging results.');
              journeysArray = [...journeysArray, ...fallbackJourneys];
            }
          } catch (fallbackErr) {
            console.error('[RepOnboarding] Fallback fetch failed:', fallbackErr);
          }
        }
      }

      console.log('[RepOnboarding] Total trainings found:', journeysArray.length);
      setTrainings(journeysArray);

      // Auto-complete step 9 if trainings exist
      if (journeysArray.length > 0) {
        updateOnboardingProgress();
        
        // --- DIAGNOSTIC: Log first journey structure ---
        console.log('[RepOnboarding] Sample journey from backend:', {
          id: journeysArray[0]._id || journeysArray[0].id,
          companyId: journeysArray[0].companyId,
          trainingName: journeysArray[0].name || journeysArray[0].title
        });
      }

      // --- DIAGNOSTIC: Check for local drafts ---
      if (DraftService.hasDraft()) {
        const draft = DraftService.getDraft();
        console.log('[RepOnboarding] Local draft found in storage:', {
          draftCompanyId: draft.company?.id,
          currentCompanyId: companyId,
          journeyName: draft.journey?.name
        });
      }
    } catch (error) {
      console.error('[RepOnboarding] Error fetching trainings:', error);
    } finally {
      setLoadingTrainings(false);
    }
  }, [companyId, legacyCompanyId, filterGigId]);

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

  // Fetch trainings once companyId or legacyCompanyId is available
  useEffect(() => {
    if (companyId || legacyCompanyId) {
      fetchCompanyTrainings();
    }
  }, [companyId, legacyCompanyId, fetchCompanyTrainings]);

  // Fetch legacy ID for training backend compatibility
  useEffect(() => {
    const fetchLegacyId = async () => {
      if (!companyId) return;
      try {
        console.log('[RepOnboarding] Fetching legacy ID for MongoDB ID:', companyId);
        const data = await OnboardingService.fetchCompanyData(companyId);
        
        // Extract legacy/internal companyId if it exists (e.g. 1775669981637)
        const idFromApi = data?._id || data?.id || data?.data?._id || data?.data?.id;
        const legacyId = data?.companyId || data?.data?.companyId;

        if (legacyId && legacyId !== companyId) {
          console.log('[RepOnboarding] Found distinct legacy ID:', legacyId);
          setLegacyCompanyId(legacyId);
        } else {
          console.log('[RepOnboarding] No distinct legacy ID found, using standard ID.');
          // Even if no distinct legacy ID, using the one from API might be safer
          if (idFromApi && idFromApi !== companyId) {
             setLegacyCompanyId(idFromApi);
          }
        }
      } catch (error) {
        console.error('[RepOnboarding] Error fetching legacy ID:', error);
      }
    };
    fetchLegacyId();
  }, [companyId]);

  // Fetch all company Gigs to populate the filter dropdown
  useEffect(() => {
    const fetchGigs = async () => {
      if (!companyId) return;
      try {
        const gigs = await getGigsByCompanyId(companyId);
        setCompanyGigs(gigs || []);
        console.log('[RepOnboarding] Gigs loaded for dropdown:', gigs.length);
      } catch (error) {
        console.error('[RepOnboarding] Error fetching gigs:', error);
      }
    };
    fetchGigs();
  }, [companyId]);

  if (showTraining.isOpen && showTraining.newJourney) {
    return (
      <MemoryRouter>
        <AppContent
          initialJourneyId={showTraining.journeyId}
          isEmbedded={true}
          startWithJourneyBuilder={true}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Training & Certification</h2>
                        <p className="text-sm text-gray-500">Skills development and validation</p>
                      </div>
                    </div>

                    {/* Gig Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gig:</span>
                      <select
                        id="gig-filter-dropdown"
                        value={filterGigId}
                        onChange={(e) => setFilterGigId(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all"
                      >
                        <option value="all">Tous les Gigs</option>
                        {companyGigs.map((gig: any) => (
                          <option key={gig._id || gig.id} value={gig._id || gig.id}>
                            {gig.title}
                          </option>
                        ))}
                      </select>
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
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewPresentation(formatted.presentationUrl, formatted.id, journey)}
                                disabled={loadingPresentation}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all flex items-center space-x-2 ${formatted.status === 'completed'
                                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                  }`}
                              >
                                {loadingPresentation ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                <span>
                                  {formatted.status === 'completed' ? 'Review' : formatted.status === 'in_progress' ? 'Continue' : 'Start'}
                                </span>
                              </button>
                            </div>
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
      {selectedPresentation && (
        <PresentationPreview 
          presentation={selectedPresentation} 
          onClose={() => {
            setSelectedPresentation(null);
            setActiveJourneyId(null);
          }} 
          onSave={handleJourneyComplete}
          isSaving={isCompleting}
        />
      )}
    </div>
  );
};

export default RepOnboarding;