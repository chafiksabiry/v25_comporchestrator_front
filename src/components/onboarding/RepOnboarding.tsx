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
  Square,
  Settings,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  GraduationCap,
  Briefcase,
  Shield,
  BarChart3,
  Laptop,
  ChevronLeft,
  ChevronRight,
  Image,
} from 'lucide-react';

import { AppContent } from '../training/App';
import { getGigsByCompanyId } from '../../api/matching';
import { DraftService } from '../training/infrastructure/services/DraftService';
import { JourneyService } from '../training/infrastructure/services/JourneyService';
import type { TrainingJourney } from '../training/types';
import { OnboardingService } from '../training/infrastructure/services/OnboardingService';
import { AIService, type SavedPodcastItem, type TrainingImageSet } from '../training/infrastructure/services/AIService';
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
  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcastItem[]>([]);
  const [loadingPodcasts, setLoadingPodcasts] = useState(false);
  const [savedImageSets, setSavedImageSets] = useState<TrainingImageSet[]>([]);
  const [loadingImageSets, setLoadingImageSets] = useState(false);
  const [selectedImageSet, setSelectedImageSet] = useState<TrainingImageSet | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showTraining, setShowTraining] = useState<{ isOpen: boolean, journeyId?: string, gigId?: string, newJourney?: boolean }>({ isOpen: false });
  const [openingNewTrainingJourney, setOpeningNewTrainingJourney] = useState(false);
  /** Journey context when viewing generated slide images from a training card */
  const [previewJourney, setPreviewJourney] = useState<any | null>(null);
  const [deletingJourneyId, setDeletingJourneyId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [playingPodcastId, setPlayingPodcastId] = useState<string | null>(null);
  const [podcastPlaybackProgress, setPodcastPlaybackProgress] = useState<Record<string, number>>({});
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
  const podcastUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const podcastAudioRef = useRef<HTMLAudioElement | null>(null);

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

  const resolveJourneyGigId = useCallback(
    (journey: any): string => {
      const resolveId = (value: any): string => {
        if (!value) return '';
        if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
        if (typeof value === 'object') {
          const nestedId = value._id || value.id;
          if (typeof nestedId === 'string' || typeof nestedId === 'number') {
            return String(nestedId).trim();
          }
        }
        return '';
      };
      return (
        resolveId(journey?.gigId) ||
        resolveId(journey?.gig) ||
        resolveId(journey?.jobId) ||
        resolveId(journey?.job) ||
        resolveId(journey?.metadata?.gigId) ||
        resolveId(journey?.context?.gigId) ||
        (filterGigId !== 'all' ? String(filterGigId) : '')
      );
    },
    [filterGigId]
  );

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
        setPreviewJourney(null);
        setSelectedImageSet(null);
        setSelectedImageIndex(0);
      }

      await fetchCompanyTrainings();
    } catch (error) {
      console.error('[RepOnboarding] Failed to delete training:', error);
      window.alert('Could not delete this training. Please try again.');
    } finally {
      setDeletingJourneyId(null);
    }
  };

  const handleOpenTrainingChat = (journey: any) => {
    const journeyId = String(journey?._id || journey?.id || '').trim();
    if (!journeyId) {
      window.alert('Training ID not found.');
      return;
    }
    const resolvedGigId = resolveJourneyGigId(journey) || undefined;
    // Open journey chat directly on chat step, keeping journey context/history + gig context
    setShowTraining({ isOpen: true, newJourney: true, journeyId, gigId: resolvedGigId || undefined });
  };

  /** Nouveau parcours Mongo + nouveau fil chat (un gig peut avoir plusieurs journeys). */
  const handleCreateNewTrainingJourney = async () => {
    if (!companyId) {
      window.alert('Company context is missing. Cannot create a training journey.');
      return;
    }
    const gigId = filterGigId !== 'all' ? String(filterGigId).trim() : undefined;
    setOpeningNewTrainingJourney(true);
    try {
      const gigTitle =
        gigId &&
        companyGigs.find((g: any) => String(g?._id || g?.id || '').trim() === gigId)?.title;
      const stamp = new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
      const titleBase = gigTitle ? String(gigTitle) : 'Training';
      const shell: TrainingJourney = {
        name: `${titleBase} — ${stamp}`,
        title: `${titleBase} — ${stamp}`,
        description: '',
        status: 'draft',
      } as TrainingJourney;
      const result = await JourneyService.saveJourney(
        shell,
        [],
        companyId,
        gigId,
        undefined,
        undefined,
        undefined,
        undefined
      );
      const journeyId = String(result.journeyId || result.journey?._id || '').trim();
      if (!/^[a-f\d]{24}$/i.test(journeyId)) {
        throw new Error('Invalid journey id');
      }
      DraftService.clearDraft();
      setShowTraining({ isOpen: true, newJourney: true, journeyId, gigId });
    } catch (e) {
      console.error('[RepOnboarding] create training journey failed', e);
      window.alert('Could not create a new training journey. Please try again.');
    } finally {
      setOpeningNewTrainingJourney(false);
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
      
    } catch (error) {
      console.error("[RepOnboarding] Failed to reload onboarding after step 9:", error);
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
    }
  }, [companyId]);

  // Function to fetch trainings for the company
  const fetchCompanyTrainings = useCallback(async () => {
    if (!companyId) {
      
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

      
      
      // Fetch from all identified IDs in parallel
      const fetchPromises = idsToFetch.map(async (id) => {
        try {
          const apiUrl = `${baseUrl}/training_journeys/trainer/companyId/${id}${gigParam}`;
          const response = (await axios.get(apiUrl)) as any;
          

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
          
          try {
            const fallbackUrl = `${baseUrl}/training_journeys/trainer/companyId/${draftCompId}${gigParam}`;
            const fallbackResponse = await axios.get(fallbackUrl) as any;
            
            const fallbackData = fallbackResponse.data as any;
            const fallbackJourneys = (fallbackData && fallbackData.success && fallbackData.data && fallbackData.data.journeys)
              ? fallbackData.data.journeys
              : (fallbackData && fallbackData.data && Array.isArray(fallbackData.data) ? fallbackData.data : []);
              
            if (fallbackJourneys.length > 0) {
              
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

      
      setTrainings(journeysArray);

      // Auto-complete step 9 if trainings already exist (e.g. returning user)
      if (journeysArray.length > 0) {
        void updateOnboardingProgress();
        
        // --- DIAGNOSTIC: Log first journey structure ---
        
      }

      // --- DIAGNOSTIC: Check for local drafts ---
      if (DraftService.hasDraft()) {
        const draft = DraftService.getDraft();
        
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
        
        const data = await OnboardingService.fetchCompanyData(companyId);
        
        // Extract legacy/internal companyId if it exists (e.g. 1775669981637)
        const idFromApi = data?._id || data?.id || data?.data?._id || data?.data?.id;
        const legacyId = data?.companyId || data?.data?.companyId;

        if (legacyId && legacyId !== companyId) {
          
          setLegacyCompanyId(legacyId);
        } else {
          
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
        
      } catch (error) {
        console.error('[RepOnboarding] Error fetching gigs:', error);
      }
    };
    fetchGigs();
  }, [companyId]);

  const fetchSavedPodcasts = useCallback(async () => {
    if (!companyId) {
      setSavedPodcasts([]);
      return;
    }
    setLoadingPodcasts(true);
    try {
      const rows = await AIService.listSavedPodcasts({
        companyId,
        gigId: filterGigId !== 'all' ? filterGigId : undefined,
        limit: 50,
      });
      setSavedPodcasts(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('[RepOnboarding] Error fetching saved podcasts:', error);
      setSavedPodcasts([]);
    } finally {
      setLoadingPodcasts(false);
    }
  }, [companyId, filterGigId]);

  const fetchSavedImageSets = useCallback(async () => {
    if (!companyId) {
      setSavedImageSets([]);
      return;
    }
    setLoadingImageSets(true);
    try {
      const rows = await AIService.listTrainingImages({
        companyId,
        gigId: filterGigId !== 'all' ? filterGigId : undefined,
        limit: 100,
      });
      setSavedImageSets(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('[RepOnboarding] Error fetching training image sets:', error);
      setSavedImageSets([]);
    } finally {
      setLoadingImageSets(false);
    }
  }, [companyId, filterGigId]);

  useEffect(() => {
    void fetchSavedPodcasts();
  }, [fetchSavedPodcasts]);

  useEffect(() => {
    void fetchSavedImageSets();
  }, [fetchSavedImageSets]);

  const normalizeText = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const placeholderTrainingTitles = React.useMemo(
    () =>
      new Set(
        ['draft gig', 'training draft', 'new training journey', 'untitled training'].map((s) =>
          s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
        )
      ),
    []
  );

  const isPlaceholderTrainingTitle = useCallback(
    (value: unknown) => {
      const t = normalizeText(value);
      return !t || placeholderTrainingTitles.has(t);
    },
    [placeholderTrainingTitles]
  );

  /** Prefer real training name over gig placeholder titles (e.g. "Draft gig"). */
  const resolveCardTrainingTitle = useCallback(
    (journey: any, formatted: ReturnType<typeof formatTrainingJourney>, imageSet?: TrainingImageSet) => {
      if (!isPlaceholderTrainingTitle(formatted.title)) return formatted.title;

      const fromImageSet = String(imageSet?.trainingTitle || imageSet?.title || '').trim();
      if (fromImageSet && !isPlaceholderTrainingTitle(fromImageSet)) return fromImageSet;

      const gigId = resolveJourneyGigId(journey);
      const gig = gigId
        ? companyGigs.find((g: any) => String(g._id || g.id || '').trim() === gigId)
        : undefined;
      const fromGig = String(gig?.title || gig?.name || '').trim();
      if (fromGig && !isPlaceholderTrainingTitle(fromGig)) return fromGig;

      const rawDesc = String(journey?.description || '').trim();
      if (rawDesc) {
        const first = rawDesc.split(/\r?\n/)[0].trim();
        if (first.length > 8) return first.length > 140 ? `${first.slice(0, 137)}…` : first;
      }

      return formatted.title;
    },
    [companyGigs, isPlaceholderTrainingTitle, resolveJourneyGigId]
  );

  const findImageSetForJourney = useCallback(
    (journey: any): TrainingImageSet | undefined => {
      const gigId = resolveJourneyGigId(journey);
      if (gigId) {
        const byGig = savedImageSets.find((set) => String(set.gigId || '').trim() === gigId);
        if (byGig) return byGig;
      }

      const titleCandidates = [
        journey?.title,
        journey?.name,
        journey?.trainingTitle,
        journey?.metadata?.title,
      ]
        .map(normalizeText)
        .filter(Boolean);

      if (titleCandidates.length === 0) return undefined;
      return savedImageSets.find((set) => {
        const setCandidates = [set.title, set.trainingTitle].map(normalizeText).filter(Boolean);
        return setCandidates.some((candidate) =>
          titleCandidates.some((journeyTitle) =>
            candidate === journeyTitle ||
            candidate.includes(journeyTitle) ||
            journeyTitle.includes(candidate)
          )
        );
      });
    },
    [savedImageSets, resolveJourneyGigId]
  );

  const openImageSlides = (imageSet: TrainingImageSet, previewJourneyUpdate?: any) => {
    if (previewJourneyUpdate !== undefined) {
      setPreviewJourney(previewJourneyUpdate);
    }
    setSelectedImageSet(imageSet);
    setSelectedImageIndex(0);
  };

  /** Always opens the image carousel (same UX as Content), never text/HTML slides. */
  const openJourneyContentOrImages = (journey: any, formatted: ReturnType<typeof formatTrainingJourney>) => {
    const imageSet = findImageSetForJourney(journey);
    const hasItems = Array.isArray(imageSet?.items) && imageSet.items.length > 0;
    const effectiveSet: TrainingImageSet =
      hasItems && imageSet
        ? imageSet
        : imageSet && Array.isArray(imageSet.items)
          ? imageSet
          : {
              _id: `no-images-${formatted.id}`,
              title: formatted.title,
              trainingTitle: formatted.title,
              language: 'fr',
              items: [],
            };
    openImageSlides(effectiveSet, journey);
  };

  const stopPodcastPlayback = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (podcastAudioRef.current) {
      podcastAudioRef.current.pause();
      podcastAudioRef.current.currentTime = 0;
      podcastAudioRef.current = null;
    }
    podcastUtteranceRef.current = null;
    setPodcastPlaybackProgress((prev) => (playingPodcastId ? { ...prev, [playingPodcastId]: 0 } : prev));
    setPlayingPodcastId(null);
  }, [playingPodcastId]);

  const playPodcastAudio = useCallback((podcast: SavedPodcastItem) => {
    const runSpeak = (textToSpeak: string) => {
      const script = String(textToSpeak || '').trim();
      if (!script) return;
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.95;
      utterance.onstart = () => {
        setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: 0 }));
      };
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        const idx = typeof event.charIndex === 'number' ? event.charIndex : 0;
        const ratio = Math.max(0, Math.min(1, idx / Math.max(script.length, 1)));
        setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: Math.round(ratio * 100) }));
      };
      utterance.onend = () => {
        setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: 100 }));
        setPlayingPodcastId((current) => (current === podcast._id ? null : current));
      };
      utterance.onerror = () => {
        setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: 0 }));
        setPlayingPodcastId((current) => (current === podcast._id ? null : current));
      };
      podcastUtteranceRef.current = utterance;
      setPlayingPodcastId(podcast._id);
      window.speechSynthesis.speak(utterance);
    };

    if (playingPodcastId === podcast._id) {
      stopPodcastPlayback();
      return;
    }

    const localScript = String(podcast?.script || '').trim();
    const cloudinaryUrl = String(podcast?.scriptCloudinaryUrl || '').trim();
    const audioUrl = String(podcast?.audioUrl || '').trim();
    if (audioUrl && typeof window !== 'undefined') {
      const audio = new Audio(audioUrl);
      podcastAudioRef.current = audio;
      setPlayingPodcastId(podcast._id);
      setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: 0 }));
      audio.ontimeupdate = () => {
        const progress = audio.duration > 0 ? Math.round((audio.currentTime / audio.duration) * 100) : 0;
        setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: progress }));
      };
      audio.onended = () => {
        setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: 100 }));
        setPlayingPodcastId((current) => (current === podcast._id ? null : current));
      };
      audio.onerror = () => {
        setPodcastPlaybackProgress((prev) => ({ ...prev, [podcast._id]: 0 }));
        setPlayingPodcastId((current) => (current === podcast._id ? null : current));
      };
      void audio.play().catch(() => {
        setPlayingPodcastId(null);
      });
      return;
    }

    if (!cloudinaryUrl) {
      runSpeak(localScript);
      return;
    }

    fetch(cloudinaryUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: any) => {
        const fromCloudinary = String(
          payload?.script || payload?.transcript || payload?.content || ''
        ).trim();
        runSpeak(fromCloudinary || localScript);
      })
      .catch(() => {
        runSpeak(localScript);
      });
  }, [playingPodcastId, stopPodcastPlayback]);

  useEffect(() => {
    return () => {
      stopPodcastPlayback();
    };
  }, [stopPodcastPlayback]);

  if (showTraining.isOpen && showTraining.newJourney) {
    return (
      <div className="flex h-[calc(100dvh-5.5rem)] w-full min-w-0 flex-col overflow-hidden px-4 pt-0 pb-4 md:px-8 md:pt-1 md:pb-6">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
          <header className="mb-2 shrink-0 overflow-hidden rounded-xl border border-harx-100 px-5 py-2">
            <div className="h-0.5 w-full -mx-5 -mt-2 mb-2 rounded-t-xl bg-gradient-harx" aria-hidden />
            <div className="flex items-center justify-between">
              <div className="min-w-0" />
              <button
                type="button"
                onClick={() => setShowTraining({ isOpen: false })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:border-harx-200 hover:text-harx-600"
              >
                Back to trainings list
              </button>
            </div>
          </header>
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-harx-100 bg-white">
            <div className="h-0.5 w-full shrink-0 bg-gradient-harx" aria-hidden />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AppContent
                initialJourneyId={showTraining.journeyId}
                initialGigId={showTraining.gigId}
                isEmbedded={true}
                startWithJourneyBuilder={true}
                startJourneyStep={showTraining.journeyId ? 1 : 0}
                repOnboardingLayout={true}
                onJourneyLaunch={handleEmbeddedJourneyComplete}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-6xl">
        {selectedImageSet ? (
          <div className="relative overflow-hidden rounded-[1.75rem] border border-harx-600/35 bg-gradient-to-br from-harx-950 via-neutral-950 to-harx-alt-950 shadow-[0_32px_120px_-24px_rgba(236,72,153,0.25)] ring-1 ring-harx-500/20">
            {/* Fond ambiance HARX */}
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(255,77,77,0.22),transparent_55%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_105%,rgba(236,72,153,0.18),transparent_50%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(153,0,0,0.35)_0%,transparent_20%,transparent_80%,rgba(80,7,36,0.35)_100%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-harx-950/90 via-black/40 to-transparent"
              aria-hidden
            />

            <div className="relative z-20 flex min-h-[min(720px,calc(100dvh-8rem))] flex-col lg:min-h-[calc(100dvh-10rem)]">
              {/* Viewer toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-harx-500/25 bg-black/45 px-4 py-3 backdrop-blur-xl sm:px-5">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-harx-400/30 bg-harx-950/60 px-3 py-2 text-xs font-semibold text-harx-50 transition hover:border-harx-300/50 hover:bg-harx-900/70"
                  onClick={() => {
                    setSelectedImageSet(null);
                    setSelectedImageIndex(0);
                    setPreviewJourney(null);
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5 opacity-90" />
                  Back to training
                </button>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                  {selectedImageSet.items.length > 0 ? (
                    <span className="text-xs font-bold tabular-nums text-white/90">
                      {Math.min(selectedImageIndex + 1, selectedImageSet.items.length)} /{' '}
                      {selectedImageSet.items.length}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-white/60">No images</span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-harx-400/35 bg-harx-950/70 text-white shadow-lg shadow-harx-900/40 transition hover:bg-harx-900/80 disabled:cursor-not-allowed disabled:opacity-35"
                      disabled={selectedImageSet.items.length === 0 || selectedImageIndex <= 0}
                      onClick={() => setSelectedImageIndex((prev) => Math.max(prev - 1, 0))}
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-harx-alt-400/35 bg-harx-alt-950/50 text-white shadow-lg shadow-harx-alt-900/30 transition hover:bg-harx-alt-900/60 disabled:cursor-not-allowed disabled:opacity-35"
                      disabled={
                        selectedImageSet.items.length === 0 ||
                        selectedImageIndex >= selectedImageSet.items.length - 1
                      }
                      onClick={() =>
                        setSelectedImageIndex((prev) =>
                          Math.min(prev + 1, Math.max(selectedImageSet.items.length - 1, 0))
                        )
                      }
                      aria-label="Next"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stage + slide frame */}
              <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 pb-10 pt-6 sm:px-8">
                {selectedImageSet.items.length === 0 ? (
                  <div className="relative z-10 mx-auto max-w-md space-y-5 rounded-2xl border border-harx-500/30 bg-harx-950/70 p-8 text-center shadow-[0_0_40px_-10px_rgba(236,72,153,0.35)] backdrop-blur-md">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-harx p-[2px] shadow-lg shadow-harx-500/25">
                      <div className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-harx-950/90">
                        <Image className="h-7 w-7 text-harx-200" aria-hidden />
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-harx-50/90">
                      No images yet. Open the REP training chat and use the{' '}
                      <span className="font-semibold text-white">Presentation</span> action to generate them.
                    </p>
                    {previewJourney ? (
                      <button
                        type="button"
                        onClick={() => {
                          const j = previewJourney;
                          setSelectedImageSet(null);
                          setSelectedImageIndex(0);
                          setPreviewJourney(null);
                          handleOpenTrainingChat(j);
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-harx px-4 py-3 text-xs font-bold text-white shadow-lg shadow-harx-600/35 transition hover:brightness-110"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Open training chat
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {/* Slide content first (lower z); arrows above for hit targets */}
                    <div className="relative z-0 w-full max-w-[min(100%,56rem)] [perspective:1400px]">
                      {/* Subtle floor reflection */}
                      <div
                        className="pointer-events-none absolute -bottom-8 left-1/2 h-24 w-[88%] -translate-x-1/2 bg-gradient-to-b from-white/[0.07] to-transparent opacity-60 blur-md"
                        aria-hidden
                      />
                      <div className="relative mx-auto w-full origin-top [transform-style:preserve-3d] [transform:rotateX(4.5deg)] transition-transform duration-500 ease-out">
                        <div className="rounded-[0.65rem] bg-gradient-to-b from-harx-800/50 to-harx-950 p-[5px] shadow-[0_4px_0_0_rgba(153,0,0,0.85),0_28px_70px_-8px_rgba(236,72,153,0.35),inset_0_1px_0_0_rgba(255,255,255,0.15)] ring-1 ring-harx-400/25">
                          <div className="overflow-hidden rounded-[0.45rem] bg-black ring-1 ring-harx-900/60">
                            {selectedImageSet.items[selectedImageIndex]?.imageUrl ? (
                              <img
                                src={selectedImageSet.items[selectedImageIndex].imageUrl}
                                alt={`Image ${selectedImageIndex + 1}`}
                                className="max-h-[min(72vh,640px)] w-full bg-harx-950 object-contain"
                              />
                            ) : (
                              <div className="flex min-h-[240px] items-center justify-center bg-harx-950 px-6 py-16 text-sm text-harx-200/80">
                                Image unavailable.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="absolute left-1 top-1/2 z-[60] flex -translate-y-1/2 rounded-full border border-harx-400/40 bg-harx-950/90 p-3 text-white shadow-xl shadow-harx-900/50 backdrop-blur-md transition hover:bg-harx-900 hover:ring-2 hover:ring-harx-400/30 disabled:pointer-events-none disabled:opacity-25 sm:left-3 md:left-5"
                      disabled={selectedImageIndex <= 0}
                      onClick={() => setSelectedImageIndex((prev) => Math.max(prev - 1, 0))}
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-1 top-1/2 z-[60] flex -translate-y-1/2 rounded-full border border-harx-alt-400/40 bg-harx-alt-950/80 p-3 text-white shadow-xl shadow-harx-alt-900/40 backdrop-blur-md transition hover:bg-harx-alt-900/70 hover:ring-2 hover:ring-harx-alt-400/30 disabled:pointer-events-none disabled:opacity-25 sm:right-3 md:right-5"
                      disabled={selectedImageIndex >= selectedImageSet.items.length - 1}
                      onClick={() =>
                        setSelectedImageIndex((prev) =>
                          Math.min(prev + 1, Math.max(selectedImageSet.items.length - 1, 0))
                        )
                      }
                      aria-label="Next"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Progress bar */}
                    <div className="relative z-10 mt-8 flex w-full max-w-[min(100%,56rem)] flex-col items-center gap-2 px-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-harx-950/80 ring-1 ring-harx-500/20">
                        <div
                          className="h-full rounded-full bg-gradient-harx transition-[width] duration-300 ease-out"
                          style={{
                            width:
                              selectedImageSet.items.length > 0
                                ? `${((selectedImageIndex + 1) / selectedImageSet.items.length) * 100}%`
                                : '0%',
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
        <header className="mb-6 overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white px-6 py-5 shadow-2xl shadow-gray-200/40">
          <div className="h-1 w-full -mx-6 -mt-5 mb-5 rounded-t-2xl bg-gradient-harx" aria-hidden />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0" />
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">Gig:</span>
                <select
                  id="gig-filter-dropdown"
                  value={filterGigId}
                  onChange={(e) => setFilterGigId(e.target.value)}
                  className="min-w-[170px] rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-harx-400 focus:ring-2 focus:ring-harx-500/20"
                >
                  <option value="all">All gigs</option>
                  {companyGigs.map((gig: any) => (
                    <option key={gig._id || gig.id} value={gig._id || gig.id}>
                      {gig.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={openingNewTrainingJourney}
                onClick={() => void handleCreateNewTrainingJourney()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-harx px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-harx-500/20 transition-all hover:-translate-y-0.5 hover:shadow-harx-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {openingNewTrainingJourney ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
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
                  savedImageSets.length > 0 ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {savedImageSets.map((set) => (
                          <div
                            key={set._id}
                            className="group relative overflow-hidden rounded-[26px] border border-[#f2d8e1] bg-white/95 p-0 shadow-[0_10px_24px_rgba(25,35,60,0.08)] transition-all duration-500 hover:-translate-y-1 hover:border-harx-300"
                          >
                            <div className="h-1.5 w-full bg-gradient-harx" aria-hidden />
                            <div className="relative z-10 p-5">
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 text-[20px] font-black leading-[1.1] text-gray-900">
                                  {set.trainingTitle || set.title || 'Training images'}
                                </h3>
                                <span className="rounded-lg bg-harx-50 px-2 py-1 text-xs font-bold text-harx-700">
                                  {Array.isArray(set.items) ? set.items.length : 0} slides
                                </span>
                              </div>
                              <p className="line-clamp-1 text-xs font-medium text-gray-500">
                                {set.createdAt ? new Date(set.createdAt).toLocaleString() : 'Date unavailable'}
                              </p>
                              {Array.isArray(set.items) && set.items[0]?.imageUrl ? (
                                <img
                                  src={set.items[0].imageUrl}
                                  alt={set.items[0].title || 'Training slide preview'}
                                  className="mt-3 h-28 w-full rounded-xl border border-gray-100 object-cover"
                                />
                              ) : null}
                              <div className="mt-4">
                                <button
                                  type="button"
                                  onClick={() => openImageSlides(set, null)}
                                  disabled={!Array.isArray(set.items) || set.items.length === 0}
                                  className="inline-flex items-center gap-2 rounded-xl border border-harx-200 bg-white px-3 py-2 text-sm font-bold text-harx-700 hover:bg-harx-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <FileText className="h-4 w-4" />
                                  Content
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
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
                        disabled={openingNewTrainingJourney}
                        onClick={() => void handleCreateNewTrainingJourney()}
                        className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-gradient-harx px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {openingNewTrainingJourney ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        <span>Create First Journey</span>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {trainings.filter(Boolean).map((journey) => {
                        const formatted = formatTrainingJourney(journey);
                        const imageSet = findImageSetForJourney(journey);
                        const displayTitle = resolveCardTrainingTitle(journey, formatted, imageSet);
                        const imageSlidesCount = Array.isArray(imageSet?.items) ? imageSet.items.length : 0;
                        const imageSetPreview =
                          imageSet && Array.isArray(imageSet.items) && imageSet.items[0]?.imageUrl
                            ? String(imageSet.items[0].imageUrl).trim()
                            : '';
                        const trainingBgImage =
                          String(formatted?.trainingLogo?.type || '').toLowerCase() === 'image'
                            ? String(formatted?.trainingLogo?.value || '').trim()
                            : '';
                        const trainingPreviewImage = imageSetPreview || trainingBgImage;
                        return (
                          <div
                          key={formatted.id}
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-harx-300 hover:shadow-md"
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
                          <div className="h-1 w-full bg-gradient-harx" aria-hidden />
                          <div className="relative z-10 p-4">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${formatted.status === 'completed' ? 'bg-green-100 text-green-600' :
                                  formatted.status === 'in_progress' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/25' : 'bg-harx-50 text-harx-500'
                                  }`}>
                                  {formatted.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-start gap-2">
                                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/85 text-harx-600 ring-1 ring-harx-100">
                                      {renderTrainingLogo(formatted.trainingLogo)}
                                    </span>
                                    <h3 className="truncate text-lg font-black leading-tight text-gray-900 transition-colors group-hover:text-harx-700">
                                      {displayTitle}
                                    </h3>
                                  </div>
                                  <p className="mt-1 truncate text-xs font-medium text-gray-500">
                                    {formatted.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {trainingPreviewImage ? (
                              <div className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white/90 shadow-sm">
                                <img
                                  src={trainingPreviewImage}
                                  alt={`${displayTitle} preview`}
                                  className="h-28 w-full object-cover"
                                />
                              </div>
                            ) : null}
                            <div className="mb-3 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-gray-100 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur">
                                <Clock className="mr-1.5 inline h-3.5 w-3.5 text-harx-500" />
                                {formatted.duration}
                              </div>
                              <div className="rounded-xl border border-gray-100 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur">
                                <FileText className="mr-1.5 inline h-3.5 w-3.5 text-harx-alt-500" />
                                {formatted.modulesCount} modules
                              </div>
                              <div className="col-span-2 truncate rounded-xl border border-harx-100 bg-harx-50/50 px-3 py-2 text-xs font-semibold text-harx-700">
                                Slides images: {imageSlidesCount}
                                {loadingImageSets ? ' (loading...)' : ''}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openJourneyContentOrImages(journey, formatted)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className={`inline-flex items-center space-x-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${formatted.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100'
                                    : 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20 hover:-translate-y-0.5 hover:shadow-harx-500/40'
                                    }`}
                                >
                                  <Play className="h-4 w-4" />
                                  <span>
                                    {formatted.status === 'completed' ? 'Review' : formatted.status === 'in_progress' ? 'Continue' : 'Start'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openJourneyContentOrImages(journey, formatted)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex items-center gap-2 rounded-xl border border-harx-200 bg-white px-3 py-2 text-xs font-bold text-harx-700 hover:bg-harx-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <FileText className="h-4 w-4" />
                                  Content
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTrainingChat(journey)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-white/85 text-sky-700 shadow-sm hover:bg-sky-50 disabled:opacity-50"
                                  title="Open training chat"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTrainingSettings(journey)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-harx-200 bg-white/85 text-harx-700 shadow-sm hover:bg-harx-50 disabled:opacity-50"
                                  title="Training settings"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJourney(journey)}
                                  disabled={deletingJourneyId === formatted.id}
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
            <section className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-2xl shadow-gray-200/50">
              <div className="h-1 w-full bg-gradient-harx" aria-hidden />
              <div className="relative z-10 p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-2xl bg-gradient-harx p-3 text-white shadow-lg shadow-harx-500/30">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">Saved podcasts</h2>
                      <p className="text-sm font-medium text-gray-500">Generated and saved from REP training chat</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchSavedPodcasts()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingPodcasts ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {loadingPodcasts ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-harx-100 py-10">
                    <RefreshCw className="h-8 w-8 animate-spin text-harx-500" />
                    <p className="mt-4 text-sm font-medium text-gray-600">Loading saved podcasts...</p>
                  </div>
                ) : savedPodcasts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-harx-200 py-10 p-8 text-center">
                    <h3 className="text-base font-bold text-gray-900">No saved podcasts yet</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-gray-600">
                      Generate and save a podcast from the training chat, it will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {savedPodcasts.map((podcast) => (
                      <div
                        key={podcast._id}
                        className="rounded-2xl border border-[#f2d8e1] bg-white p-4 shadow-[0_10px_24px_rgba(25,35,60,0.08)]"
                      >
                        <h3 className="line-clamp-2 text-base font-black text-gray-900">
                          {podcast.title || 'Untitled podcast'}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-600">
                          {podcast.trainingTitle || 'Training podcast'}
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                          {podcast.createdAt ? new Date(podcast.createdAt).toLocaleString() : 'Date unavailable'}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playPodcastAudio(podcast)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {playingPodcastId === podcast._id ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {playingPodcastId === podcast._id ? 'Stop audio' : 'Play audio'}
                          </button>
                        </div>
                        {podcast.audioUrl ? (
                          <div className="mt-2">
                            <audio
                              controls
                              preload="none"
                              src={podcast.audioUrl}
                              className="w-full"
                            >
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                        ) : null}
                      </div>
                    ))}
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
