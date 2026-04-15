import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { MemoryRouter } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle,
  FileText,
  Clock,
  Play,
  RefreshCw,
  Plus,
  Pencil,
  Trash2
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
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [legacyCompanyId, setLegacyCompanyId] = useState<string | null>(null);
  const [companyGigs, setCompanyGigs] = useState<any[]>([]);
  const [filterGigId, setFilterGigId] = useState<string>('all');
  const [showTraining, setShowTraining] = useState<{ isOpen: boolean, journeyId?: string, newJourney?: boolean }>({ isOpen: false });
  const [selectedPresentation, setSelectedPresentation] = useState<any | null>(null);
  /** Journey used for module sidebar when previewing slides */
  const [previewJourney, setPreviewJourney] = useState<any | null>(null);
  const [openClaudeEditorOnPreview, setOpenClaudeEditorOnPreview] = useState(false);
  const [loadingPresentation, setLoadingPresentation] = useState(false);
  const [deletingJourneyId, setDeletingJourneyId] = useState<string | null>(null);

  // Helper function to format training journey data for display
  const asUiString = (v: unknown, fallback: string): string => {
    if (v == null) return fallback;
    if (typeof v === 'string') return v || fallback;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.title === 'string') return o.title;
      if (typeof o.name === 'string') return o.name;
      if (typeof o.label === 'string') return o.label;
    }
    return fallback;
  };

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
      title: asUiString(journey.title ?? journey.name, 'Untitled Training'),
      description: asUiString(journey.description, 'No description provided'),
      duration: duration,
      modulesCount: journey.modules ? journey.modules.length : 0,
      status: status,
      progress: journey.progress || 0,
      presentationUrl
    };
  };

  const handleViewPresentation = async (
    url: string | null,
    _journeyId: string,
    journey: any,
    openEditor: boolean = false
  ) => {
    setPreviewJourney(journey || null);
    setOpenClaudeEditorOnPreview(openEditor);

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

    // Use AI generated presentation if it exists in the journey object, otherwise fallback to local mapping
    let presentationToUse;
    if (journey.presentation && journey.presentation.slides && journey.presentation.slides.length > 0) {
      console.log('[RepOnboarding] Using stored AI presentation from journey object');
      presentationToUse = journey.presentation;
    } else {
      console.log('[RepOnboarding] Using local mapping for presentation');
      presentationToUse = mapJourneyToPresentation(journey);
    }
    
    setSelectedPresentation(presentationToUse);
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

  const handleDeleteJourney = async (journey: any) => {
    const journeyId = String(journey?._id || journey?.id || '');
    if (!journeyId) return;

    const journeyTitle = asUiString(journey?.title ?? journey?.name, 'this training');
    const confirmed = window.confirm(`Delete "${journeyTitle}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingJourneyId(journeyId);
      const trainingBackendUrl = getTrainingBackendUrl();
      const baseUrl = trainingBackendUrl.endsWith('/api')
        ? trainingBackendUrl
        : `${trainingBackendUrl}/api`;

      await axios.delete(`${baseUrl}/training_journeys/${journeyId}`);

      if (previewJourney && String(previewJourney?._id || previewJourney?.id || '') === journeyId) {
        setSelectedPresentation(null);
        setPreviewJourney(null);
      }

      await fetchCompanyTrainings();
    } catch (error) {
      console.error('[RepOnboarding] Failed to delete training:', error);
      window.alert('Could not delete this training. Please try again.');
    } finally {
      setDeletingJourneyId(null);
    }
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
        
      const gigParam = filterGigId && filterGigId !== 'all' ? `?gigId=${filterGigId}` : '';
      
      // Determine which IDs to fetch
      const idsToFetch = [companyId];
      if (legacyCompanyId && legacyCompanyId !== companyId) {
        idsToFetch.push(legacyCompanyId);
      }

      console.log('[RepOnboarding] Fetching trainings for IDs:', idsToFetch, 'from URL:', baseUrl);
      
      // Fetch from all identified IDs in parallel
      const fetchPromises = idsToFetch.map(async (id) => {
        try {
          const apiUrl = `${baseUrl}/training_journeys/trainer/companyId/${id}${gigParam}`;
          const response = (await axios.get(apiUrl)) as any;
          console.log(`[RepOnboarding] API Response for ID ${id}:`, response.data);

          let backendData = response.data as any;
          if (backendData && backendData.success && backendData.data) {
            return backendData.data.journeys || (Array.isArray(backendData.data) ? backendData.data : []);
          } else if (Array.isArray(response.data)) {
            return response.data;
          }
          return [];
        } catch (error) {
          console.error(`[RepOnboarding] Error fetching for ID ${id}:`, error);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      
      // Merge and deduplicate
      let journeysArray = results.flat().filter(Boolean);
      
      // Deduplicate by ID
      const seenIds = new Set();
      journeysArray = journeysArray.filter(journey => {
        const id = String(journey._id || journey.id || '');
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      // --- EMERGENCY BRIDGE: If still 0 and we have a local draft, try that too ---
      if (journeysArray.length === 0 && DraftService.hasDraft()) {
        const draft = DraftService.getDraft();
        const draftCompId = draft.company?.id;
        
        if (draftCompId && !idsToFetch.includes(draftCompId)) {
          console.log('[RepOnboarding] ⚠️ 0 results, attempting fallback search with draftCompanyId:', draftCompId);
          try {
            const fallbackUrl = `${baseUrl}/training_journeys/trainer/companyId/${draftCompId}${gigParam}`;
            const fallbackResponse = await axios.get(fallbackUrl) as any;
            
            const fallbackData = fallbackResponse.data as any;
            const fallbackJourneys = (fallbackData && fallbackData.success && fallbackData.data && fallbackData.data.journeys)
              ? fallbackData.data.journeys
              : (fallbackData && fallbackData.data && Array.isArray(fallbackData.data) ? fallbackData.data : []);
              
            if (fallbackJourneys.length > 0) {
              console.log('[RepOnboarding] ✅ Fallback found', fallbackJourneys.length, 'trainings! Merging.');
              journeysArray = [...journeysArray, ...fallbackJourneys];
              
              // Second deduplication
              const secondSeenIds = new Set();
              journeysArray = journeysArray.filter(journey => {
                const id = String(journey._id || journey.id || '');
                if (!id || secondSeenIds.has(id)) return false;
                secondSeenIds.add(id);
                return true;
              });
            }
          } catch (fallbackErr) {
            console.error('[RepOnboarding] Fallback fetch failed:', fallbackErr);
          }
        }
      }

      console.log('[RepOnboarding] Total unique trainings found:', journeysArray.length);
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

  /** Ferme le Journey Builder embarqué et revient à la liste « Training & Certification » (évite l’écran JourneySuccess / déploiement). */
  const handleEmbeddedJourneyComplete = useCallback(() => {
    setShowTraining({ isOpen: false });
    void fetchCompanyTrainings();
  }, [fetchCompanyTrainings]);

  // Load company ID on mount
  useEffect(() => {
    // Use centralized service to get companyId
    const id = OnboardingService.getCompanyId();
    
    if (id) {
      setCompanyId(id);
    } else {
      console.warn('[RepOnboarding] No companyId found in cookies or localStorage');
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
      <div className="flex min-h-[calc(100dvh-5.5rem)] w-full min-w-0 flex-col px-4 pt-2 pb-4 md:px-8 md:pt-3 md:pb-6">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
          <header className="mb-3 shrink-0 overflow-hidden rounded-xl border border-harx-100 px-5 py-3">
            <div className="h-0.5 w-full -mx-5 -mt-3 mb-3 rounded-t-xl bg-gradient-harx" aria-hidden />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold tracking-tight text-harx-600">
                  REP Onboarding
                </h1>
                <p className="text-xs text-gray-500">Complete your setup and start your journey</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTraining({ isOpen: false })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:border-harx-200 hover:text-harx-600"
              >
                ← Back to list
              </button>
            </div>
          </header>
          <div className="flex min-h-0 w-full flex-1 flex-col rounded-xl border border-harx-100 bg-white">
            <div className="h-0.5 w-full shrink-0 bg-gradient-harx" aria-hidden />
            <div className="flex min-h-0 flex-1 flex-col">
              <MemoryRouter>
                <AppContent
                  initialJourneyId={showTraining.journeyId}
                  isEmbedded={true}
                  startWithJourneyBuilder={true}
                  repOnboardingLayout={true}
                  onJourneyLaunch={handleEmbeddedJourneyComplete}
                />
              </MemoryRouter>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {selectedPresentation ? (
          <div className="overflow-hidden rounded-2xl border border-harx-100 bg-white">
            <div className="grid min-h-[min(720px,calc(100dvh-8rem))] grid-cols-1 lg:grid-cols-[minmax(260px,300px)_1fr] lg:min-h-[calc(100dvh-10rem)]">
              <aside className="max-h-[40vh] overflow-y-auto border-b border-harx-100/60 p-4 lg:max-h-none lg:border-b-0 lg:border-r lg:border-harx-100/60">
                <div className="mb-2 flex items-center gap-2 text-harx-600">
                  <BookOpen className="h-5 w-5 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Modules</span>
                </div>
                <h2 className="text-base font-bold leading-snug text-gray-900 line-clamp-2">
                  {previewJourney?.title || previewJourney?.name || selectedPresentation?.title || 'Training'}
                </h2>
                <ol className="mt-3 space-y-1.5">
                  {Array.isArray(previewJourney?.modules) && previewJourney.modules.length > 0 ? (
                    previewJourney.modules.map((mod: any, idx: number) => (
                      <li
                        key={mod._id || mod.id || idx}
                        className="flex gap-2 rounded-xl px-2 py-2 text-sm text-gray-800 hover:bg-white/80"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-harx-50 text-xs font-bold text-harx-600">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1 font-medium leading-snug">{mod.title || `Module ${idx + 1}`}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-gray-500">Module list unavailable — browse slides on the right.</li>
                  )}
                </ol>
              </aside>
              <div className="min-h-[360px] min-w-0 lg:min-h-0">
                <PresentationPreview
                  presentation={selectedPresentation}
                  onClose={() => {
                    setSelectedPresentation(null);
                    setPreviewJourney(null);
                    setOpenClaudeEditorOnPreview(false);
                  }}
                  isEmbedded={true}
                  showPagination={false}
                  hideExportPptx={true}
                  embedLightCanvas={true}
                  backLabel="Back to list"
                  openClaudeEditor={openClaudeEditorOnPreview}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
        <header className="mb-6 overflow-hidden rounded-2xl border border-harx-100 px-6 py-5">
          <div className="h-1 w-full -mx-6 -mt-5 mb-5 rounded-t-2xl bg-gradient-harx" aria-hidden />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-harx-600 md:text-3xl">
                REP Onboarding
              </h1>
              <p className="mt-1 text-sm text-gray-500">Complete your setup and start your journey</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTraining({ isOpen: true, newJourney: true })}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-harx px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>New training journey</span>
            </button>
          </div>
        </header>

        <div className="space-y-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Training Section — HARX brand (rose / purple) aligned with Journey Builder */}
            <section className="overflow-hidden rounded-2xl border border-harx-100">
              <div className="h-1 w-full bg-gradient-harx" aria-hidden />
              <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-harx-50 text-harx-500 ring-1 ring-harx-100">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Training & Certification</h2>
                        <p className="text-sm text-harx-500/80">Skills development and validation</p>
                      </div>
                    </div>

                    {/* Gig Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-harx-500">Gig:</span>
                      <select
                        id="gig-filter-dropdown"
                        value={filterGigId}
                        onChange={(e) => setFilterGigId(e.target.value)}
                        className="rounded-xl border border-harx-100 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none transition-all focus:border-harx-400 focus:ring-2 focus:ring-harx-500/20"
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
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-harx-100 py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-harx-500" />
                    <p className="mt-4 text-sm font-medium text-gray-600">Loading available trainings...</p>
                  </div>
                ) : trainings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-harx-200 py-12 p-8 text-center">
                    <div className="mb-4 rounded-2xl border border-harx-100 bg-white p-3">
                      <Plus className="h-6 w-6 text-harx-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No training journeys yet</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-gray-600">
                      Add your first training journey to start onboarding your REPs.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTraining({ isOpen: true, newJourney: true })}
                      className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-gradient-harx px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create First Journey</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {trainings.filter(Boolean).map((journey) => {
                        const formatted = formatTrainingJourney(journey);
                        return (
                          <div
                          key={formatted.id}
                          className="group relative overflow-hidden rounded-2xl border border-harx-100 bg-white p-0 transition-all duration-200 hover:-translate-y-1 hover:border-harx-200 hover:shadow-md"
                          >
                          <div className="h-1.5 w-full bg-gradient-harx" aria-hidden />
                          <div className="p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${formatted.status === 'completed' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' :
                                  formatted.status === 'in_progress' ? 'bg-harx-50 text-harx-500 ring-1 ring-harx-100' : 'bg-harx-50 text-harx-400 ring-1 ring-harx-100'
                                  }`}>
                                  {formatted.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </div>
                                <div>
                                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-harx-600">
                                    {formatted.title}
                                  </h3>
                                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                                    {formatted.description}
                                  </p>
                                </div>
                              </div>
                              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${formatted.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : formatted.status === 'in_progress'
                                  ? 'bg-harx-50 text-harx-600'
                                  : 'bg-harx-50 text-harx-500'
                                }`}>
                                {formatted.status === 'completed' ? 'Done' : formatted.status === 'in_progress' ? 'In progress' : 'New'}
                              </span>
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2 text-xs text-gray-600">
                                <Clock className="mr-1.5 inline h-3.5 w-3.5 text-harx-500" />
                                {formatted.duration}
                              </div>
                              <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2 text-xs text-gray-600">
                                <FileText className="mr-1.5 inline h-3.5 w-3.5 text-harx-alt-500" />
                                {formatted.modulesCount} modules
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => handleViewPresentation(formatted.presentationUrl, formatted.id, journey)}
                                disabled={loadingPresentation || deletingJourneyId === formatted.id}
                                className={`inline-flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${formatted.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100'
                                  : 'bg-gradient-harx text-white shadow-sm hover:shadow-md'
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

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewPresentation(formatted.presentationUrl, formatted.id, journey, true)}
                                  disabled={loadingPresentation || deletingJourneyId === formatted.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-600 hover:border-harx-200 hover:text-harx-600 disabled:opacity-50"
                                  title="Edit training"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJourney(journey)}
                                  disabled={loadingPresentation || deletingJourneyId === formatted.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                  title="Delete training"
                                >
                                  {deletingJourneyId === formatted.id ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RepOnboarding;