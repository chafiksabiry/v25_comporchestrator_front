import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { MemoryRouter } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle,
  FileText,
  Clock,
  Play,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  GraduationCap,
  Briefcase,
  Shield,
  BarChart3,
  Laptop
} from 'lucide-react';

import { AppContent } from '../training/App';
import PresentationPreview from '../training/components/Training/PresentationPreview';
import { getGigsByCompanyId } from '../../api/matching';
import { DraftService } from '../training/infrastructure/services/DraftService';
import { OnboardingService } from '../training/infrastructure/services/OnboardingService';
import { mapJourneyToPresentation } from '../training/utils/PresentationMapper';
import { cloudinaryService } from '../training/lib/cloudinaryService';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [settingsJourney, setSettingsJourney] = useState<any | null>(null);
  const [settingsForm, setSettingsForm] = useState<{
    title: string;
    description: string;
    logoUrl: string;
  }>({
    title: '',
    description: '',
    logoUrl: '',
  });
  const logoInputRef = useRef<HTMLInputElement | null>(null);

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
      presentationUrl,
      trainingLogo: journey.trainingLogo || null
    };
  };

  const logoIconByKey: Record<string, React.ComponentType<{ className?: string }>> = {
    'book-open': BookOpen,
    'graduation-cap': GraduationCap,
    'briefcase': Briefcase,
    'shield': Shield,
    'chart': BarChart3,
    'laptop': Laptop,
  };

  const renderTrainingLogo = (logo: any) => {
    const type = String(logo?.type || 'icon').toLowerCase();
    const value = String(logo?.value || '').trim();
    if (type === 'image' && value) {
      return (
        <img
          src={value}
          alt="Training logo"
          className="h-3 w-3 object-contain"
        />
      );
    }
    const IconComp = logoIconByKey[value] || BookOpen;
    return <IconComp className="h-3 w-3" />;
  };

  const openTrainingSettings = (journey: any) => {
    const logoUrl =
      String(journey?.trainingLogo?.type || '').toLowerCase() === 'image'
        ? String(journey?.trainingLogo?.value || '').trim()
        : '';
    setSettingsJourney(journey);
    setSettingsForm({
      title: asUiString(journey?.title ?? journey?.name, ''),
      description: asUiString(journey?.description, ''),
      logoUrl,
    });
    setIsSettingsOpen(true);
  };

  const handleUploadTrainingLogo = async (file: File) => {
    try {
      setIsUploadingLogo(true);
      const uploaded = await cloudinaryService.uploadImage(file, 'trainings/logos');
      setSettingsForm((prev) => ({ ...prev, logoUrl: uploaded.secureUrl || uploaded.url }));
    } catch (error: any) {
      console.error('[RepOnboarding] Failed uploading training logo:', error);
      window.alert(error?.message || 'Could not upload logo image.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveTrainingSettings = async () => {
    const journeyId = String(settingsJourney?._id || settingsJourney?.id || '');
    if (!journeyId) return;
    if (!settingsForm.title.trim()) {
      window.alert('Title is required.');
      return;
    }
    try {
      setIsSavingSettings(true);
      const trainingBackendUrl = getTrainingBackendUrl();
      const baseUrl = trainingBackendUrl.endsWith('/api')
        ? trainingBackendUrl
        : `${trainingBackendUrl}/api`;

      const payload = {
        title: settingsForm.title.trim(),
        name: settingsForm.title.trim(),
        description: settingsForm.description.trim(),
        trainingLogo: settingsForm.logoUrl.trim()
          ? {
              type: 'image',
              value: settingsForm.logoUrl.trim(),
            }
          : undefined,
      };
      await axios.put(`${baseUrl}/training_journeys/${journeyId}`, payload);
      setIsSettingsOpen(false);
      setSettingsJourney(null);
      await fetchCompanyTrainings();
    } catch (error) {
      console.error('[RepOnboarding] Failed to save training settings:', error);
      window.alert('Could not save training settings. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
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
        const raw = response.data as Record<string, unknown> | null | undefined;
        const fromUrl =
          raw && Array.isArray(raw.slides)
            ? (raw as { slides: unknown[] })
            : raw && typeof raw.presentation === 'object' && raw.presentation !== null && Array.isArray((raw.presentation as { slides?: unknown[] }).slides)
              ? (raw.presentation as { slides: unknown[] })
              : null;
        if (fromUrl?.slides?.length) {
          setSelectedPresentation(fromUrl);
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

    // Présentation embarquée (Mongo) : source de vérité pour titre, bullets, visualConfig
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

  /** Mark Phase 3 Step 9 (REP Onboarding) complete and notify CompanyOnboarding like other steps. */
  const updateOnboardingProgress = useCallback(async () => {
    if (!companyId) return;

    const apiUrl =
      import.meta.env.VITE_COMPANY_API_URL ||
      "https://v25searchcompanywizardbackend-production.up.railway.app/api";
    const onboardingUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding`;
    const stepUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/9`;

    try {
      await axios.put(stepUrl, { status: "completed" });
    } catch (error) {
      console.error("[RepOnboarding] Failed to mark step 9 completed:", error);
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
      return;
    }

    try {
      const { data: progress } = await axios.get(onboardingUrl);
      const raw = progress as Record<string, unknown>;
      const completedSteps = Array.isArray(raw?.completedSteps)
        ? [...(raw.completedSteps as number[])]
        : [];
      if (!completedSteps.includes(9)) completedSteps.push(9);
      const phaseId = typeof raw?.currentPhase === "number" ? (raw.currentPhase as number) : 3;
      const cookiePayload = { ...raw, completedSteps };
      Cookies.set("companyOnboardingProgress", JSON.stringify(cookiePayload), { expires: 7 });
      window.dispatchEvent(
        new CustomEvent("stepCompleted", {
          detail: {
            stepId: 9,
            phaseId,
            status: "completed",
            completedSteps,
          },
        })
      );
      console.log("[RepOnboarding] Step 9 synced with onboarding API");
    } catch (error) {
      console.error("[RepOnboarding] Failed to reload onboarding after step 9:", error);
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
    }
  }, [companyId]);

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

      // Auto-complete step 9 if trainings already exist (e.g. returning user)
      if (journeysArray.length > 0) {
        void updateOnboardingProgress();
        
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
  }, [companyId, legacyCompanyId, filterGigId, updateOnboardingProgress]);

  /** Après publish / launch du parcours : même flux que les autres étapes (step 9 + refresh UI parent). */
  const handleEmbeddedJourneyComplete = useCallback(() => {
    setShowTraining({ isOpen: false });
    void (async () => {
      await updateOnboardingProgress();
      await fetchCompanyTrainings();
    })();
  }, [updateOnboardingProgress, fetchCompanyTrainings]);

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
    <div className="space-y-6">
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
        <header className="mb-6 overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white px-6 py-5 shadow-2xl shadow-gray-200/40">
          <div className="h-1 w-full -mx-6 -mt-5 mb-5 rounded-t-2xl bg-gradient-harx" aria-hidden />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight text-gray-900">
                REP Onboarding
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500">Complete your setup and start your journey</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">Gig:</span>
                <select
                  id="gig-filter-dropdown"
                  value={filterGigId}
                  onChange={(e) => setFilterGigId(e.target.value)}
                  className="min-w-[170px] rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-harx-400 focus:ring-2 focus:ring-harx-500/20"
                >
                  <option value="all">Tous les Gigs</option>
                  {companyGigs.map((gig: any) => (
                    <option key={gig._id || gig.id} value={gig._id || gig.id}>
                      {gig.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowTraining({ isOpen: true, newJourney: true })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-harx px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-harx-500/20 transition-all hover:-translate-y-0.5 hover:shadow-harx-500/40 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span>New training journey</span>
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Training Section — HARX brand (rose / purple) aligned with Journey Builder */}
            <section className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-2xl shadow-gray-200/50">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-harx-50/40 blur-[100px] -mr-32 -mt-32" />
              <div className="h-1 w-full bg-gradient-harx" aria-hidden />
              <div className="relative z-10 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-2xl bg-gradient-harx p-3 text-white shadow-lg shadow-harx-500/30">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-900">Training</h2>
                        <p className="text-sm font-medium text-gray-500">Skills development and validation</p>
                      </div>
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
                        const trainingBgImage =
                          String(formatted?.trainingLogo?.type || '').toLowerCase() === 'image'
                            ? String(formatted?.trainingLogo?.value || '').trim()
                            : '';
                        return (
                          <div
                          key={formatted.id}
                          className="group relative overflow-hidden rounded-[26px] border border-[#f2d8e1] bg-white/95 p-0 shadow-[0_10px_24px_rgba(25,35,60,0.08)] transition-all duration-500 hover:-translate-y-1 hover:border-harx-300 hover:shadow-[0_18px_34px_rgba(244,63,94,0.15)]"
                          >
                          {trainingBgImage ? (
                            <>
                              <div
                                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.18]"
                                style={{ backgroundImage: `url("${trainingBgImage}")` }}
                              />
                              <div className="pointer-events-none absolute inset-0 bg-white/82" />
                            </>
                          ) : null}
                          <div className="h-1.5 w-full bg-gradient-harx" aria-hidden />
                          <div className="relative z-10 p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${formatted.status === 'completed' ? 'bg-green-100 text-green-600' :
                                  formatted.status === 'in_progress' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/25' : 'bg-harx-50 text-harx-500'
                                  }`}>
                                  {formatted.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </div>
                                <div>
                                  <div className="flex items-start gap-2">
                                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/85 text-harx-600 ring-1 ring-harx-100">
                                      {renderTrainingLogo(formatted.trainingLogo)}
                                    </span>
                                    <h3 className="line-clamp-2 text-[22px] font-black leading-[1.05] text-gray-900 transition-colors group-hover:text-harx-700">
                                      {formatted.title}
                                    </h3>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-500">
                                    {formatted.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-gray-100 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur">
                                <Clock className="mr-1.5 inline h-3.5 w-3.5 text-harx-500" />
                                {formatted.duration}
                              </div>
                              <div className="rounded-xl border border-gray-100 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur">
                                <FileText className="mr-1.5 inline h-3.5 w-3.5 text-harx-alt-500" />
                                {formatted.modulesCount} modules
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-white/70 pt-3">
                              <button
                                type="button"
                                onClick={() => handleViewPresentation(formatted.presentationUrl, formatted.id, journey)}
                                disabled={loadingPresentation || deletingJourneyId === formatted.id}
                                className={`inline-flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${formatted.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100'
                                  : 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20 hover:-translate-y-0.5 hover:shadow-harx-500/40'
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
                                  onClick={() => openTrainingSettings(journey)}
                                  disabled={loadingPresentation || deletingJourneyId === formatted.id}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-harx-200 bg-white/85 text-harx-700 shadow-sm hover:bg-harx-50 disabled:opacity-50"
                                  title="Training settings"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJourney(journey)}
                                  disabled={loadingPresentation || deletingJourneyId === formatted.id}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white/85 text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-50"
                                  title="Delete training"
                                >
                                  {deletingJourneyId === formatted.id ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
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
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-harx-100 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Training settings</h3>
              <button
                type="button"
                onClick={() => {
                  if (isSavingSettings) return;
                  setIsSettingsOpen(false);
                  setSettingsJourney(null);
                }}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Title</label>
                <input
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-harx-400 focus:ring-2 focus:ring-harx-500/20"
                  placeholder="Training title"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Description</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-harx-400 focus:ring-2 focus:ring-harx-500/20"
                  placeholder="Training description"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Training logo</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleUploadTrainingLogo(file);
                    }
                    e.currentTarget.value = '';
                  }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="inline-flex items-center gap-2 rounded-xl border border-harx-200 px-3 py-2 text-sm font-semibold text-harx-700 hover:bg-harx-50 disabled:opacity-60"
                  >
                    {isUploadingLogo ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                    {isUploadingLogo ? 'Uploading...' : 'Import image'}
                  </button>
                  {settingsForm.logoUrl ? (
                    <button
                      type="button"
                      onClick={() => setSettingsForm((prev) => ({ ...prev, logoUrl: '' }))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Remove logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {settingsForm.logoUrl ? (
                  <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <img src={settingsForm.logoUrl} alt="Training logo preview" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="text-xs font-semibold text-gray-600">Logo imported successfully</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">No logo selected. Import an image to set your training logo.</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isSavingSettings) return;
                  setIsSettingsOpen(false);
                  setSettingsJourney(null);
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveTrainingSettings()}
                disabled={isSavingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-harx px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
              >
                {isSavingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepOnboarding;