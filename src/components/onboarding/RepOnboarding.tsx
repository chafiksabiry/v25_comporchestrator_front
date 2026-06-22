import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
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
  ChevronDown,
  Check,
  Image as ImageIcon,
  Users,
  TrendingUp,
  Target,
  Award
} from 'lucide-react';
import { PremiumAudioPlayer } from '../dashboard/components/PremiumAudioPlayer';
import { useTranslation } from 'react-i18next';

import { AppContent } from '../training/App';
import { getGigsByCompanyId, getActiveAgentsForCompany } from '../../api/matching';
import { DraftService } from '../training/infrastructure/services/DraftService';
import { OnboardingService } from '../training/infrastructure/services/OnboardingService';
import { AIService, type SavedPodcastItem, type TrainingImageSet } from '../training/infrastructure/services/AIService';
import {
  ProgressService,
  type GigProgress,
  type RepProgress,
} from '../training/infrastructure/services/ProgressService';
import { cloudinaryService } from '../training/lib/cloudinaryService';
import '../training/index.css';

interface RepOnboardingProps { }

type FormationPageTab = 'courses' | 'participants' | 'tracking';

type TrainingParticipantRow = {
  id: string;
  name: string;
  email: string;
  gigTitle: string;
  gigId: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  journeyTitle?: string;
};

type JourneyParticipantStats = {
  participantCount: number;
  avgProgress: number;
  completionRate: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
};

const extractMongoId = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.$oid === 'string') return record.$oid;
    if (record._id != null) return extractMongoId(record._id);
    if (record.id != null) return extractMongoId(record.id);
  }
  return '';
};

const clampProgressPercent = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const computeProgressFromRepProgress = (repProgress: RepProgress | null): number => {
  if (!repProgress) return 0;
  if (repProgress.moduleTotal > 0) {
    return clampProgressPercent((repProgress.moduleFinished / repProgress.moduleTotal) * 100);
  }
  const modules = Object.values(repProgress.modules || {});
  if (modules.length === 0) return 0;
  const average = modules.reduce((sum, module) => sum + Number(module.progress || 0), 0) / modules.length;
  return clampProgressPercent(average);
};

const mapTrainingStatus = (
  status: string | undefined,
  progress: number
): TrainingParticipantRow['status'] => {
  const normalized = String(status || '').toLowerCase().replace(/_/g, '-');
  if (progress >= 100 || normalized === 'completed' || normalized === 'finished') {
    return 'completed';
  }
  if (progress > 0 || normalized === 'in-progress' || normalized === 'active') {
    return 'in_progress';
  }
  return 'not_started';
};

const resolveParticipantProgress = async (
  repId: string,
  gigId: string,
  journeyId: string
): Promise<{ progress: number; status: TrainingParticipantRow['status']; journeyTitle?: string }> => {
  if (!repId || !gigId) {
    return { progress: 0, status: 'not_started' };
  }

  try {
    const gigProgress: GigProgress | null = await ProgressService.getRepProgressByGig(repId, gigId);
    if (gigProgress?.trainings?.length) {
      const matchedTraining =
        (journeyId
          ? gigProgress.trainings.find(
              (training) => extractMongoId(training.journeyId) === journeyId
            )
          : undefined) || gigProgress.trainings[0];

      if (matchedTraining) {
        const progress = clampProgressPercent(matchedTraining.progress);
        return {
          progress,
          status: mapTrainingStatus(matchedTraining.status, progress),
          journeyTitle: matchedTraining.journeyTitle || undefined,
        };
      }
    }

    if (typeof gigProgress?.overallProgress === 'number') {
      const progress = clampProgressPercent(gigProgress.overallProgress);
      return {
        progress,
        status: mapTrainingStatus(undefined, progress),
      };
    }

    if (journeyId) {
      const repProgress = await ProgressService.getRepProgress(repId, journeyId);
      const progress = computeProgressFromRepProgress(repProgress);
      return {
        progress,
        status: mapTrainingStatus(undefined, progress),
      };
    }
  } catch (error) {
    console.warn('[RepOnboarding] Could not fetch training progress:', { repId, gigId, journeyId, error });
  }

  return { progress: 0, status: 'not_started' };
};

const resolveJourneyModulesCount = (journey: Record<string, unknown>): number => {
  const modules = journey.modules;
  if (Array.isArray(modules) && modules.length > 0) return modules.length;
  const modulePlan = journey.modulePlan;
  if (Array.isArray(modulePlan) && modulePlan.length > 0) return modulePlan.length;
  const moduleCount = Number(journey.moduleCount ?? journey.modulesCount ?? 0);
  return Number.isFinite(moduleCount) && moduleCount > 0 ? moduleCount : 0;
};

const computeJourneyDurationLabel = (journey: Record<string, unknown>): string => {
  let totalMinutes = 0;
  const modules = journey.modules;
  if (Array.isArray(modules)) {
    totalMinutes = modules.reduce((acc: number, module: Record<string, unknown>) => {
      return acc + Number(module.duration ?? module.durationMinutes ?? module.estimatedDuration ?? 0);
    }, 0);
  }
  const modulePlan = journey.modulePlan;
  if (totalMinutes <= 0 && Array.isArray(modulePlan)) {
    totalMinutes = modulePlan.reduce((acc: number, module: Record<string, unknown>) => {
      return acc + Number(module.durationMinutes ?? module.duration ?? 0);
    }, 0);
  }
  if (totalMinutes <= 0 && journey.estimatedDuration) {
    return String(journey.estimatedDuration);
  }
  if (totalMinutes <= 0 && journey.totalDurationMinutes) {
    totalMinutes = Number(journey.totalDurationMinutes);
  }
  if (totalMinutes <= 0) return 'N/A';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  return `${minutes} min`;
};

const buildJourneyParticipantStats = (
  participants: TrainingParticipantRow[],
  trainings: Record<string, unknown>[],
  resolveJourneyGigId: (journey: Record<string, unknown>) => string
): Map<string, JourneyParticipantStats> => {
  const participantsByGigId = new Map<string, TrainingParticipantRow[]>();
  participants.forEach((participant) => {
    if (!participant.gigId) return;
    const existing = participantsByGigId.get(participant.gigId) || [];
    existing.push(participant);
    participantsByGigId.set(participant.gigId, existing);
  });

  const statsByKey = new Map<string, JourneyParticipantStats>();
  trainings.forEach((journey) => {
    const journeyId = extractMongoId(journey._id || journey.id);
    const gigId = resolveJourneyGigId(journey);
    const journeyParticipants = gigId ? participantsByGigId.get(gigId) || [] : [];
    const participantCount = journeyParticipants.length;
    const completedCount = journeyParticipants.filter((p) => p.status === 'completed').length;
    const inProgressCount = journeyParticipants.filter((p) => p.status === 'in_progress').length;
    const notStartedCount = journeyParticipants.filter((p) => p.status === 'not_started').length;
    const avgProgress =
      participantCount > 0
        ? Math.round(journeyParticipants.reduce((sum, p) => sum + p.progress, 0) / participantCount)
        : 0;
    const completionRate =
      participantCount > 0 ? Math.round((completedCount / participantCount) * 100) : 0;

    const stats: JourneyParticipantStats = {
      participantCount,
      avgProgress,
      completionRate,
      completedCount,
      inProgressCount,
      notStartedCount,
    };

    if (journeyId) statsByKey.set(journeyId, stats);
    if (gigId) statsByKey.set(`gig:${gigId}`, stats);
  });

  return statsByKey;
};

type HarxSelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type HarxSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: HarxSelectOption[];
  className?: string;
  minWidthClass?: string;
  /** Affiche un séparateur après la première option (ex. « Tous les gigs »). */
  separateFirstOption?: boolean;
  /** Alignement horizontal du panneau par rapport au trigger. */
  menuAlign?: 'start' | 'end';
  /** Permet au menu d'être plus large que le trigger pour afficher le texte complet. */
  expandMenu?: boolean;
  /** Réduit paddings et tailles pour un rendu plus compact. */
  compact?: boolean;
};

const HarxSelect: React.FC<HarxSelectProps> = ({
  id,
  value,
  onChange,
  options,
  className = '',
  minWidthClass = 'min-w-[170px]',
  separateFirstOption = false,
  menuAlign = 'start',
  expandMenu = false,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];
  const SelectedIcon = selected?.icon;

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPad = 8;
    const gap = compact ? 2 : 4;
    const maxMenuWidth = Math.min(520, window.innerWidth - viewportPad * 2);

    if (expandMenu) {
      if (menuAlign === 'end') {
        setMenuStyle({
          position: 'fixed',
          top: rect.bottom + gap,
          right: Math.max(viewportPad, window.innerWidth - rect.right),
          minWidth: rect.width,
          width: 'max-content',
          maxWidth: maxMenuWidth,
          zIndex: 9999,
        });
      } else {
        setMenuStyle({
          position: 'fixed',
          top: rect.bottom + gap,
          left: Math.max(viewportPad, rect.left),
          minWidth: rect.width,
          width: 'max-content',
          maxWidth: maxMenuWidth,
          zIndex: 9999,
        });
      }
      return;
    }

    const menuWidth = rect.width;
    const left =
      menuAlign === 'end'
        ? Math.max(viewportPad, rect.right - menuWidth)
        : Math.max(viewportPad, Math.min(rect.left, window.innerWidth - menuWidth - viewportPad));

    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + gap,
      left,
      width: menuWidth,
      zIndex: 9999,
    });
  }, [compact, expandMenu, menuAlign]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (open) {
      const selectedIndex = options.findIndex((option) => option.value === value);
      setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setHighlightIndex(-1);
    }
  }, [open, options, value]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && highlightIndex >= 0) {
      event.preventDefault();
      onChange(options[highlightIndex].value);
      setOpen(false);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const dropdownPanel = open ? (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="fixed inset-0 z-[9998] cursor-default bg-slate-900/10 backdrop-blur-[1px] transition-opacity"
        onClick={() => setOpen(false)}
      />
      <div
        style={menuStyle}
        className={`z-[9999] overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.16)] ring-1 ring-black/5 animate-fade-in ${
          compact ? 'text-xs' : ''
        }`}
      >
        <ul
          role="listbox"
          aria-labelledby={id}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className={`max-h-72 overflow-auto [scrollbar-width:thin] [scrollbar-color:#f43f5e20_#f8fafc] ${
            compact ? 'p-0.5' : 'p-1'
          }`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightIndex;
            const OptionIcon = option.icon;
            const showSeparator = separateFirstOption && index === 0 && options.length > 1;

            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`group flex w-full items-start gap-2 rounded-md text-left transition-colors duration-150 ${
                    compact ? 'px-2 py-1.5' : 'px-2 py-2'
                  } ${
                    isSelected
                      ? 'bg-harx-500 text-white'
                      : isHighlighted
                        ? 'bg-harx-50 text-harx-800'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {OptionIcon ? (
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-md transition-colors ${
                        compact ? 'mt-0.5 h-6 w-6' : 'h-7 w-7'
                      } ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-harx-600 group-hover:bg-white'
                      }`}
                    >
                      <OptionIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className={`block whitespace-normal break-words font-semibold leading-snug ${
                      compact ? 'text-xs' : 'text-sm'
                    }`}>
                      {option.label}
                    </span>
                    {option.description ? (
                      <span
                        className={`mt-0.5 block whitespace-normal break-words leading-snug ${
                          compact ? 'text-[10px]' : 'text-[11px]'
                        } font-medium ${
                          isSelected ? 'text-white/85' : 'text-slate-500'
                        }`}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <span className={`flex shrink-0 items-center justify-center rounded-full bg-white/20 ${
                      compact ? 'mt-0.5 h-5 w-5' : 'h-5 w-5'
                    }`}>
                      <Check className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                    </span>
                  ) : null}
                </button>
                {showSeparator ? (
                  <div className={`border-t border-dashed border-slate-100 ${compact ? 'my-0.5' : 'my-1'}`} role="separator" />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  ) : null;

  return (
    <div className={`relative ${minWidthClass} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) {
              requestAnimationFrame(updateMenuPosition);
            }
            return next;
          });
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center border bg-white text-left shadow-sm outline-none transition-all duration-200 ${
          compact ? 'gap-1.5 rounded-lg px-2 py-1.5' : 'gap-2 rounded-lg px-2.5 py-2'
        } ${
          open
            ? 'border-harx-400 ring-1 ring-harx-500/15'
            : 'border-slate-200 hover:border-harx-300'
        }`}
      >
        {SelectedIcon ? (
          <span className={`flex shrink-0 items-center justify-center rounded-md bg-harx-50 text-harx-600 ${
            compact ? 'h-6 w-6' : 'h-7 w-7'
          }`}>
            <SelectedIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </span>
        ) : null}
        <span className={`min-w-0 flex-1 whitespace-normal break-words text-left font-semibold leading-snug text-slate-800 ${
          compact ? 'text-xs' : 'text-sm'
        }`}>
          {selected?.label || '—'}
        </span>
        <ChevronDown
          className={`shrink-0 text-harx-500 transition-transform duration-200 ${
            compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
          } ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {typeof document !== 'undefined' && dropdownPanel
        ? createPortal(dropdownPanel, document.body)
        : null}
    </div>
  );
};

const FORMATION_BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-harx px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-harx-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-harx-500/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50';

const FORMATION_BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-harx-200 hover:bg-harx-50/50 hover:text-harx-700 active:scale-[0.98] disabled:opacity-50';

const FORMATION_PANEL =
  'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-4px_rgba(15,23,42,0.07)]';

const RepOnboarding: React.FC<RepOnboardingProps> = () => {
  const { t } = useTranslation();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [legacyCompanyId, setLegacyCompanyId] = useState<string | null>(null);
  const [companyGigs, setCompanyGigs] = useState<any[]>([]);
  const [filterGigId, setFilterGigId] = useState<string>('all');
  const [pageTab, setPageTab] = useState<FormationPageTab>('courses');
  const [participants, setParticipants] = useState<TrainingParticipantRow[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [journeyProgressStats, setJourneyProgressStats] = useState<Map<string, JourneyParticipantStats>>(
    new Map()
  );
  const [statsJourneyId, setStatsJourneyId] = useState<string>('all');
  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcastItem[]>([]);
  const [loadingPodcasts, setLoadingPodcasts] = useState(false);
  const [savedImageSets, setSavedImageSets] = useState<TrainingImageSet[]>([]);
  const [selectedImageSet, setSelectedImageSet] = useState<TrainingImageSet | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedJourneyForContent, setSelectedJourneyForContent] = useState<any | null>(null);
  const [repViewerHtml, setRepViewerHtml] = useState<string | null>(null);
  const [repViewerIframeKey, setRepViewerIframeKey] = useState(0);
  const [previewJourney, setPreviewJourney] = useState<any | null>(null);
  const [showTraining, setShowTraining] = useState<{
    isOpen: boolean;
    journeyId?: string;
    gigId?: string;
    newJourney?: boolean;
    openFormationViewer?: boolean;
  }>({ isOpen: false });
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

  const closeTrainingViewer = useCallback(() => {
    setShowTraining({ isOpen: false });
  }, []);

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

  const formatTrainingJourney = (journey: any, stats?: JourneyParticipantStats) => {
    const presentationUrl = journey.presentationUrl || journey.presentation?.url;
    const duration = computeJourneyDurationLabel(journey);
    const modulesCount = resolveJourneyModulesCount(journey);

    let status = 'not_started';
    let progress = 0;
    if (stats && stats.participantCount > 0) {
      progress = stats.avgProgress;
      if (stats.completionRate >= 100 || stats.completedCount === stats.participantCount) {
        status = 'completed';
      } else if (stats.avgProgress > 0 || stats.inProgressCount > 0) {
        status = 'in_progress';
      }
    } else if (journey.status === 'completed' || journey.journeyStatus === 'completed') {
      status = 'completed';
      progress = clampProgressPercent(journey.progress || 100);
    } else if (
      journey.status === 'in_progress' ||
      journey.journeyStatus === 'in_progress' ||
      journey.status === 'active'
    ) {
      status = 'in_progress';
      progress = clampProgressPercent(journey.progress || 0);
    }

    return {
      id: String(journey._id || journey.id || ''),
      title: asUiString(journey.title ?? journey.name, 'Untitled Training'),
      description: asUiString(journey.description, 'No description provided'),
      duration,
      modulesCount,
      status,
      progress,
      participantCount: stats?.participantCount ?? 0,
      completedCount: stats?.completedCount ?? 0,
      inProgressCount: stats?.inProgressCount ?? 0,
      notStartedCount: stats?.notStartedCount ?? 0,
      completionRate: stats?.completionRate ?? 0,
      presentationUrl,
      trainingLogo: journey.trainingLogo || null,
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

    try {
      setDeletingJourneyId(journeyId);
      const trainingBackendUrl = getTrainingBackendUrl();
      const baseUrl = trainingBackendUrl.endsWith('/api')
        ? trainingBackendUrl
        : `${trainingBackendUrl}/api`;

      await axios.delete(`${baseUrl}/training_journeys/${journeyId}`);

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
    setSelectedJourneyForContent(null);
    // Open journey chat directly on chat step, keeping journey context/history + gig context
    setShowTraining({
      isOpen: true,
      newJourney: true,
      journeyId,
      gigId: resolvedGigId || undefined,
      openFormationViewer: false,
    });
  };

  /**
   * Nouveau parcours : lancer le processus (wizard / setup), pas le chat directement.
   * Le document `training_journeys` est créé plus tard (validation chat ou étapes suivantes).
   */
  const handleCreateNewTrainingJourney = () => {
    DraftService.clearDraft();
    setSelectedJourneyForContent(null);
    setShowTraining({
      isOpen: true,
      newJourney: true,
      gigId: filterGigId !== 'all' ? String(filterGigId).trim() : undefined,
      openFormationViewer: false,
    });
  };

  /** Mark Phase 3 Step 9 (REP Onboarding) complete and notify CompanyOnboarding like other steps. */
  const updateOnboardingProgress = useCallback(async () => {
    if (!companyId) return;

    const apiUrl =
      import.meta.env.VITE_COMPANY_API_URL ||
      "https://v25searchcompanywizardbackend-production.up.railway.app/api";
    const onboardingUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding`;
    const stepUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/8`;

    try {
      await axios.put(stepUrl, { status: "completed" });
    } catch (error) {
      console.error("[RepOnboarding] Failed to mark step 8 completed:", error);
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
      return;
    }

    try {
      const { data: progress } = await axios.get(onboardingUrl);
      const raw = progress as Record<string, unknown>;
      const completedSteps = Array.isArray(raw?.completedSteps)
        ? [...(raw.completedSteps as number[])]
        : [];
      if (!completedSteps.includes(8)) completedSteps.push(8);
      const phaseId = typeof raw?.currentPhase === "number" ? (raw.currentPhase as number) : 3;
      const cookiePayload = { ...raw, completedSteps };
      Cookies.set("companyOnboardingProgress", JSON.stringify(cookiePayload), { expires: 7 });
      window.dispatchEvent(
        new CustomEvent("stepCompleted", {
          detail: {
            stepId: 8,
            phaseId,
            status: "completed",
            completedSteps,
          },
        })
      );
      
    } catch (error) {
      console.error("[RepOnboarding] Failed to reload onboarding after step 8:", error);
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
      // no-op
    }
  }, [companyId, filterGigId]);

  useEffect(() => {
    void fetchSavedPodcasts();
  }, [fetchSavedPodcasts]);

  useEffect(() => {
    void fetchSavedImageSets();
  }, [fetchSavedImageSets]);

  const fetchParticipants = useCallback(async () => {
    if (!companyId) {
      setParticipants([]);
      setJourneyProgressStats(new Map());
      return;
    }

    setLoadingParticipants(true);
    try {
      const activeAgents = await getActiveAgentsForCompany(companyId);
      let filteredAgents = Array.isArray(activeAgents) ? activeAgents : [];

      if (filterGigId !== 'all') {
        filteredAgents = filteredAgents.filter((record: any) => {
          const gigId = record?.gigId?._id || record?.gigId || record?.gig?._id;
          return String(gigId) === String(filterGigId);
        });
      }

      const entries = filteredAgents
        .map((record: any) => {
          const agent = record?.agentId && typeof record.agentId === 'object' ? record.agentId : record;
          const gig = record?.gigId && typeof record.gigId === 'object' ? record.gigId : record?.gig;
          return {
            repId: String(agent?._id || agent?.id || record?.agentId || ''),
            gigId: String(gig?._id || gig?.id || record?.gigId || ''),
          };
        })
        .filter((entry) => entry.repId && entry.gigId);

      const bulkProgress = await ProgressService.getCompanyParticipantsProgress(companyId, {
        gigId: filterGigId !== 'all' ? filterGigId : undefined,
        entries,
      });

      if (bulkProgress?.participants?.length) {
        const progressByKey = new Map(
          bulkProgress.participants.map((row) => [`${row.repId}:${row.gigId}`, row])
        );

        const rows: TrainingParticipantRow[] = filteredAgents.map((record: any, index: number) => {
          const agent = record?.agentId && typeof record.agentId === 'object' ? record.agentId : record;
          const gig = record?.gigId && typeof record.gigId === 'object' ? record.gigId : record?.gig;
          const gigId = String(gig?._id || gig?.id || record?.gigId || '');
          const repId = String(agent?._id || agent?.id || record?.agentId || '');
          const linkedJourney = trainings.find((journey) => resolveJourneyGigId(journey) === gigId);
          const apiRow = progressByKey.get(`${repId}:${gigId}`);

          return {
            id: String(repId || record?._id || index),
            name:
              agent?.personalInfo?.name ||
              agent?.name ||
              apiRow?.name ||
              t('repOnboarding.participants.unnamed'),
            email: agent?.personalInfo?.email || agent?.email || apiRow?.email || '',
            gigTitle: gig?.title || t('repOnboarding.participants.noGig'),
            gigId,
            progress: apiRow?.progress ?? 0,
            status: apiRow?.status ?? 'not_started',
            journeyTitle:
              apiRow?.journeyTitle ||
              (linkedJourney ? asUiString(linkedJourney?.title ?? linkedJourney?.name, '') : undefined),
          };
        });

        const statsMap = new Map<string, JourneyParticipantStats>();
        bulkProgress.journeys.forEach((journeyStats) => {
          const stats: JourneyParticipantStats = {
            participantCount: journeyStats.participantCount,
            avgProgress: journeyStats.avgProgress,
            completionRate: journeyStats.completionRate,
            completedCount: journeyStats.completedCount,
            inProgressCount: journeyStats.inProgressCount,
            notStartedCount: journeyStats.notStartedCount,
          };
          if (journeyStats.journeyId) statsMap.set(journeyStats.journeyId, stats);
          if (journeyStats.gigId) statsMap.set(`gig:${journeyStats.gigId}`, stats);
        });

        setParticipants(rows);
        setJourneyProgressStats(statsMap);
        return;
      }

      const rows: TrainingParticipantRow[] = await Promise.all(
        filteredAgents.map(async (record: any, index: number) => {
          const agent = record?.agentId && typeof record.agentId === 'object' ? record.agentId : record;
          const gig = record?.gigId && typeof record.gigId === 'object' ? record.gigId : record?.gig;
          const gigId = String(gig?._id || gig?.id || record?.gigId || '');
          const repId = String(agent?._id || agent?.id || record?.agentId || '');
          const linkedJourney = trainings.find((journey) => resolveJourneyGigId(journey) === gigId);
          const journeyId = linkedJourney ? extractMongoId(linkedJourney._id || linkedJourney.id) : '';
          const progressData = await resolveParticipantProgress(repId, gigId, journeyId);

          return {
            id: String(repId || record?._id || index),
            name: agent?.personalInfo?.name || agent?.name || t('repOnboarding.participants.unnamed'),
            email: agent?.personalInfo?.email || agent?.email || '',
            gigTitle: gig?.title || t('repOnboarding.participants.noGig'),
            gigId,
            progress: progressData.progress,
            status: progressData.status,
            journeyTitle:
              progressData.journeyTitle ||
              (linkedJourney ? asUiString(linkedJourney?.title ?? linkedJourney?.name, '') : undefined),
          };
        })
      );

      setParticipants(rows);
      setJourneyProgressStats(new Map());
    } catch (error) {
      console.error('[RepOnboarding] Error fetching participants:', error);
      setParticipants([]);
      setJourneyProgressStats(new Map());
    } finally {
      setLoadingParticipants(false);
    }
  }, [companyId, filterGigId, trainings, resolveJourneyGigId, t]);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  const journeyParticipantStats = useMemo(() => {
    if (journeyProgressStats.size > 0) {
      return journeyProgressStats;
    }
    return buildJourneyParticipantStats(participants, trainings, resolveJourneyGigId);
  }, [journeyProgressStats, participants, trainings, resolveJourneyGigId]);

  const gigFilterOptions = useMemo<HarxSelectOption[]>(
    () => [
      {
        value: 'all',
        label: t('repOnboarding.header.allGigs'),
        description: t('repOnboarding.header.allGigsHint'),
        icon: Briefcase,
      },
      ...companyGigs.map((gig: any) => ({
        value: String(gig._id || gig.id),
        label: String(gig.title || gig.name || gig._id || gig.id),
        icon: Briefcase,
      })),
    ],
    [companyGigs, t]
  );

  const journeyFilterOptions = useMemo<HarxSelectOption[]>(
    () => [
      {
        value: 'all',
        label: t('repOnboarding.trackingStats.allTrainings'),
        description: t('repOnboarding.trackingStats.allTrainingsHint'),
        icon: BookOpen,
      },
      ...trainings.map((journey) => ({
        value: String(journey._id || journey.id),
        label: asUiString(journey.title ?? journey.name, t('repOnboarding.trainingSection.title')),
        icon: GraduationCap,
      })),
    ],
    [trainings, t]
  );

  const trackingStats = useMemo(() => {
    const scopedParticipants =
      statsJourneyId === 'all'
        ? participants
        : participants.filter((participant) => {
            const journey = trainings.find((item) => String(item._id || item.id) === statsJourneyId);
            if (!journey) return false;
            const journeyGigId = resolveJourneyGigId(journey);
            return journeyGigId && participant.gigId === journeyGigId;
          });

    const total = scopedParticipants.length;
    const completed = scopedParticipants.filter((p) => p.status === 'completed').length;
    const inProgress = scopedParticipants.filter((p) => p.status === 'in_progress').length;
    const notStarted = scopedParticipants.filter((p) => p.status === 'not_started').length;
    const avgProgress =
      total > 0
        ? Math.round(scopedParticipants.reduce((sum, p) => sum + p.progress, 0) / total)
        : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const scopedTrainings =
      statsJourneyId === 'all'
        ? trainings
        : trainings.filter((journey) => String(journey._id || journey.id) === statsJourneyId);

    const moduleStats = scopedTrainings.map((journey) => {
      const journeyGigId = resolveJourneyGigId(journey);
      const journeyParticipants = journeyGigId
        ? scopedParticipants.filter((participant) => participant.gigId === journeyGigId)
        : [];
      const journeyAvgProgress =
        journeyParticipants.length > 0
          ? Math.round(
              journeyParticipants.reduce((sum, participant) => sum + participant.progress, 0) /
                journeyParticipants.length
            )
          : 0;

      return {
        id: String(journey._id || journey.id || ''),
        title: asUiString(journey.title ?? journey.name, t('repOnboarding.trainingSection.title')),
        modulesCount: Array.isArray(journey.modules) ? journey.modules.length : 0,
        progress: journeyAvgProgress,
      };
    });

    return {
      total,
      completed,
      inProgress,
      notStarted,
      avgProgress,
      completionRate,
      moduleStats,
      trainingCount: scopedTrainings.length,
    };
  }, [participants, trainings, statsJourneyId, resolveJourneyGigId, t]);

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

  /** Start button opens the full REP viewer flow (same as JourneyBuilder viewer mode). */
  const openJourneyStartViewer = (journey: any) => {
    const journeyId = String(journey?._id || journey?.id || '').trim();
    if (!journeyId) {
      window.alert('Training ID not found.');
      return;
    }
    const resolvedGigId = resolveJourneyGigId(journey) || undefined;
    setSelectedJourneyForContent(null);
    setShowTraining({
      isOpen: true,
      newJourney: true,
      journeyId,
      gigId: resolvedGigId || undefined,
      openFormationViewer: true,
    });
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

  useEffect(() => {
    if (!repViewerHtml) return;
    setRepViewerIframeKey((k) => k + 1);
  }, [repViewerHtml]);

  if (showTraining.isOpen && showTraining.newJourney) {
    return (
      <div className="flex h-[calc(100dvh-6.5rem)] w-full min-w-0 flex-col overflow-hidden">
        <div className="flex min-h-0 h-full w-full flex-1 flex-col">
          <header className="mb-2 shrink-0 overflow-hidden rounded-xl border border-harx-100 px-5 py-2">
            <div className="h-0.5 w-full -mx-5 -mt-2 mb-2 rounded-t-xl bg-gradient-harx" aria-hidden />
            <div className="flex items-center justify-between">
              <div className="min-w-0" />
              <button
                type="button"
                onClick={closeTrainingViewer}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:border-harx-200 hover:text-harx-600"
              >
                {t('repOnboarding.viewer.backBtn')}
              </button>
            </div>
          </header>
          <div className="min-h-0 h-full w-full overflow-hidden rounded-xl border border-harx-100 bg-white">
            <div className="h-0.5 w-full shrink-0 bg-gradient-harx" aria-hidden />
            <div className="flex min-h-0 h-full w-full flex-col overflow-hidden">
              <AppContent
                initialJourneyId={showTraining.journeyId}
                initialGigId={showTraining.gigId}
                isEmbedded={true}
                startWithJourneyBuilder={true}
                startJourneyStep={showTraining.journeyId ? 1 : 0}
                startWithRepViewer={Boolean(showTraining.openFormationViewer)}
                repOnboardingLayout={true}
                onExitToTrainingList={closeTrainingViewer}
                onJourneyLaunch={handleEmbeddedJourneyComplete}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_90%_70%_at_50%_-30%,rgba(255,77,77,0.07),transparent_65%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl animate-fade-in px-1 pb-10 sm:px-2">
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
                  {t('repOnboarding.viewer.backToTraining')}
                </button>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                  {selectedImageSet.items.length > 0 ? (
                    <span className="text-xs font-bold tabular-nums text-white/90">
                      {Math.min(selectedImageIndex + 1, selectedImageSet.items.length)} /{' '}
                      {selectedImageSet.items.length}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-white/60">{t('repOnboarding.viewer.noImages')}</span>
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
                        <ImageIcon className="h-7 w-7 text-harx-200" aria-hidden />
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-harx-50/90">
                      {t('repOnboarding.viewer.noImagesDesc')}{' '}
                      <span className="font-semibold text-white">{t('repOnboarding.viewer.presentationAction')}</span> {t('repOnboarding.viewer.generateThem')}
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
                        {t('repOnboarding.viewer.openChatBtn')}
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
                                {t('repOnboarding.viewer.imageUnavailable')}
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
        <header className={`mb-4 ${FORMATION_PANEL} p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-harx text-white shadow-sm shadow-harx-500/20">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">{t('repOnboarding.trainingSection.title')}</h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{t('repOnboarding.trainingSection.subtitle')}</p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[200px]">
                <label htmlFor="gig-filter-dropdown" className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('repOnboarding.header.gigFilter')}
                </label>
                <HarxSelect
                  id="gig-filter-dropdown"
                  value={filterGigId}
                  onChange={setFilterGigId}
                  options={gigFilterOptions}
                  minWidthClass="min-w-full sm:min-w-[200px]"
                  separateFirstOption
                  menuAlign="end"
                  expandMenu
                  compact
                />
              </div>
              <button
                type="button"
                onClick={handleCreateNewTrainingJourney}
                className={`${FORMATION_BTN_PRIMARY} w-full px-3 py-2 text-xs sm:mt-5 sm:w-auto sm:text-sm`}
              >
                <Plus className="h-4 w-4" />
                <span>{t('repOnboarding.header.newJourneyBtn')}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { value: participants.length, label: t('repOnboarding.trackingStats.participants'), tab: 'participants' as FormationPageTab, icon: Users, tone: 'from-indigo-500/10 to-indigo-50 border-indigo-100 text-indigo-700' },
            { value: `${trackingStats.avgProgress}%`, label: t('repOnboarding.trackingStats.avgProgress'), tab: 'tracking' as FormationPageTab, icon: TrendingUp, tone: 'from-sky-500/10 to-sky-50 border-sky-100 text-sky-700' },
            { value: `${trackingStats.completionRate}%`, label: t('repOnboarding.trackingStats.completionRate'), tab: 'tracking' as FormationPageTab, icon: Award, tone: 'from-emerald-500/10 to-emerald-50 border-emerald-100 text-emerald-700' },
            { value: trainings.length, label: t('repOnboarding.trackingStats.trainings'), tab: 'courses' as FormationPageTab, icon: BookOpen, tone: 'from-harx-500/10 to-harx-50 border-harx-100 text-harx-700' },
          ].map((stat, index) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setPageTab(stat.tab)}
              style={{ animationDelay: `${index * 70}ms` }}
              className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-fade-in ${stat.tone} ${
                pageTab === stat.tab
                  ? 'ring-2 ring-harx-400/50 shadow-md'
                  : 'opacity-95 hover:opacity-100'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 shadow-sm ${stat.tone.split(' ').pop()}`}>
                  <stat.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black leading-none tabular-nums text-slate-900">{stat.value}</div>
              <div className="mt-1.5 text-[11px] font-semibold text-slate-600">{stat.label}</div>
            </button>
          ))}
        </div>

        <nav className="mb-4 flex flex-wrap gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100/70 p-0.5">
          {([
            { id: 'courses' as FormationPageTab, label: t('repOnboarding.pageTabs.courses'), icon: BookOpen },
            { id: 'participants' as FormationPageTab, label: t('repOnboarding.pageTabs.participants'), icon: Users, badge: participants.length },
            { id: 'tracking' as FormationPageTab, label: t('repOnboarding.pageTabs.tracking'), icon: BarChart3 },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPageTab(tab.id)}
              className={`inline-flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                pageTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <tab.icon className={`h-4 w-4 transition-colors ${pageTab === tab.id ? 'text-harx-500' : ''}`} />
              <span>{tab.label}</span>
              {'badge' in tab && tab.badge ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                  pageTab === tab.id ? 'bg-harx-100 text-harx-700' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="space-y-5">
          <div>
            {pageTab === 'courses' && (
            <section className={`${FORMATION_PANEL} p-5 sm:p-6 animate-fade-in`}>
              <div className="relative z-10">
                {selectedJourneyForContent ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/30">
                    <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 sm:px-5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-harx-500">{t('repOnboarding.viewer.title')}</p>
                        <h3 className="truncate text-sm font-semibold text-slate-800">
                          {String(selectedJourneyForContent?.title || selectedJourneyForContent?.name || 'Formation')}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJourneyForContent(null);
                          setRepViewerHtml(null);
                        }}
                        className={FORMATION_BTN_SECONDARY}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        {t('repOnboarding.viewer.backList')}
                      </button>
                    </div>
                    {repViewerHtml ? (
                      <iframe
                        key={repViewerIframeKey}
                        title={t('repOnboarding.viewer.title')}
                        srcDoc={repViewerHtml}
                        sandbox="allow-scripts"
                        className="h-[70vh] w-full border-0 bg-white"
                      />
                    ) : (
                      <div className="p-6 text-sm text-slate-600">{t('repOnboarding.viewer.unavailable')}</div>
                    )}
                  </div>
                ) : loadingTrainings ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-harx-500" />
                    <p className="mt-4 text-sm font-medium text-slate-600">{t('repOnboarding.trainingSection.loading')}</p>
                  </div>
                ) : trainings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-harx-200/80 bg-gradient-to-b from-harx-50/30 to-white py-16 px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-harx-100">
                      <Plus className="h-6 w-6 text-harx-500" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{t('repOnboarding.trainingSection.emptyTitle')}</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                      {t('repOnboarding.trainingSection.emptyDesc')}
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateNewTrainingJourney}
                      className={`${FORMATION_BTN_PRIMARY} mt-6`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('repOnboarding.trainingSection.createFirstBtn')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {trainings.filter(Boolean).map((journey, cardIndex) => {
                        const journeyId = extractMongoId(journey._id || journey.id);
                        const gigId = resolveJourneyGigId(journey);
                        const stats =
                          journeyParticipantStats.get(journeyId) ||
                          (gigId ? journeyParticipantStats.get(`gig:${gigId}`) : undefined);
                        const formatted = formatTrainingJourney(journey, stats);
                        const imageSet = findImageSetForJourney(journey);
                        const displayTitle = resolveCardTrainingTitle(journey, formatted, imageSet);
                        const trainingPreviewImage =
                          String(formatted?.trainingLogo?.type || '').toLowerCase() === 'image'
                            ? String(formatted?.trainingLogo?.value || '').trim()
                            : '';
                        return (
                          <div
                          key={formatted.id}
                          style={{ animationDelay: `${cardIndex * 80}ms` }}
                          className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 animate-fade-in hover:-translate-y-1 hover:border-harx-300/50 hover:shadow-[0_16px_40px_-12px_rgba(255,77,77,0.18)]"
                          >
                          <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-harx-500 to-harx-alt-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                          <div className="relative z-10 flex flex-1 flex-col p-4">
                            <div className="flex items-start gap-3">
                              {trainingPreviewImage ? (
                                <img
                                  src={trainingPreviewImage}
                                  alt=""
                                  className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 object-cover shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                                />
                              ) : (
                                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                                  formatted.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                                    : formatted.status === 'in_progress'
                                    ? 'bg-gradient-harx text-white shadow-harx-500/20'
                                    : 'bg-harx-50 text-harx-500 ring-1 ring-harx-100'
                                }`}>
                                  {formatted.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-harx-700">
                                  {displayTitle}
                                </h3>
                                {formatted.description ? (
                                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                                    {formatted.description}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-harx-500" />
                                    {formatted.duration}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5 text-harx-alt-500" />
                                    {formatted.modulesCount} {t('repOnboarding.trainingSection.modules')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  {t('repOnboarding.trainingSection.avgProgress')}
                                </span>
                                <span className="text-xs font-bold tabular-nums text-slate-800">
                                  {formatted.progress}%
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                                <div
                                  className="h-full rounded-full bg-gradient-harx transition-[width] duration-500 ease-out"
                                  style={{ width: `${formatted.progress}%` }}
                                />
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                <span className="rounded-md bg-white px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-100">
                                  {formatted.participantCount} {t('repOnboarding.trainingSection.participantsShort')}
                                </span>
                                {formatted.completedCount > 0 ? (
                                  <span className="rounded-md bg-white px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
                                    {formatted.completedCount} {t('repOnboarding.trainingSection.completedShort')}
                                  </span>
                                ) : null}
                                {formatted.inProgressCount > 0 ? (
                                  <span className="rounded-md bg-white px-2 py-0.5 text-sky-700 ring-1 ring-sky-100">
                                    {formatted.inProgressCount} {t('repOnboarding.trainingSection.inProgressShort')}
                                  </span>
                                ) : null}
                                {formatted.participantCount === 0 ? (
                                  <span className="rounded-md bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                                    {t('repOnboarding.trainingSection.noParticipantsYet')}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openJourneyStartViewer(journey)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-harx px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                  <span>{t('repOnboarding.trainingSection.previewBtn')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openJourneyStartViewer(journey)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-harx-200 hover:bg-harx-50/50 hover:text-harx-700 disabled:opacity-50"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">{t('repOnboarding.trainingSection.contentBtn')}</span>
                                </button>
                              </div>

                              <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTrainingChat(journey)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-600 transition-colors hover:bg-white hover:text-sky-700 disabled:opacity-50"
                                  title="Open training chat"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTrainingSettings(journey)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-harx-700 disabled:opacity-50"
                                  title="Training settings"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJourney(journey)}
                                  disabled={deletingJourneyId === formatted.id}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-white hover:text-rose-600 disabled:opacity-50"
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
                )}
              </div>
            </section>
            )}

            {pageTab === 'participants' && (
            <section className={`${FORMATION_PANEL} p-5 sm:p-6 animate-fade-in`}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 sm:text-xl">{t('repOnboarding.participants.title')}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{t('repOnboarding.participants.subtitle')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchParticipants()}
                    className={FORMATION_BTN_SECONDARY}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingParticipants ? 'animate-spin' : ''}`} />
                    {t('repOnboarding.participants.refresh')}
                  </button>
                </div>

                {loadingParticipants ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-harx-500" />
                    <p className="mt-4 text-sm font-medium text-slate-600">{t('repOnboarding.participants.loading')}</p>
                  </div>
                ) : participants.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 py-16 text-center">
                    <Users className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-base font-bold text-slate-900">{t('repOnboarding.participants.emptyTitle')}</p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t('repOnboarding.participants.emptyDesc')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/90">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.participants.name')}</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.participants.gig')}</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.participants.training')}</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.participants.progress')}</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.participants.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {participants.map((participant) => (
                          <tr key={participant.id} className="transition-colors hover:bg-harx-50/40">
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-slate-900">{participant.name}</div>
                              {participant.email ? (
                                <div className="text-xs text-slate-500">{participant.email}</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-slate-700">{participant.gigTitle}</td>
                            <td className="px-4 py-3.5 text-sm text-slate-700">{participant.journeyTitle || '—'}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-gradient-harx transition-[width] duration-500"
                                    style={{ width: `${participant.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold tabular-nums text-slate-700">{participant.progress}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                participant.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : participant.status === 'in_progress'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {participant.status === 'completed'
                                  ? t('repOnboarding.participants.statusCompleted')
                                  : participant.status === 'in_progress'
                                  ? t('repOnboarding.participants.statusInProgress')
                                  : t('repOnboarding.participants.statusNotStarted')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </section>
            )}

            {pageTab === 'tracking' && (
            <section className={`${FORMATION_PANEL} p-5 sm:p-6 animate-fade-in`}>
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 sm:text-xl">{t('repOnboarding.trackingStats.title')}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{t('repOnboarding.trackingStats.subtitle')}</p>
                  </div>
                  <HarxSelect
                    value={statsJourneyId}
                    onChange={setStatsJourneyId}
                    options={journeyFilterOptions}
                    minWidthClass="min-w-full sm:min-w-[220px]"
                    separateFirstOption
                    menuAlign="end"
                    expandMenu
                    compact
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: t('repOnboarding.trackingStats.participants'), value: trackingStats.total, icon: Users, color: 'text-indigo-600 bg-indigo-50 ring-indigo-100' },
                    { label: t('repOnboarding.trackingStats.inProgress'), value: trackingStats.inProgress, icon: TrendingUp, color: 'text-sky-700 bg-sky-50 ring-sky-100' },
                    { label: t('repOnboarding.trackingStats.completionRate'), value: `${trackingStats.completionRate}%`, icon: Award, color: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
                    { label: t('repOnboarding.trackingStats.avgProgress'), value: `${trackingStats.avgProgress}%`, icon: Target, color: 'text-harx-600 bg-harx-50 ring-harx-100' },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      style={{ animationDelay: `${index * 70}ms` }}
                      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 animate-fade-in hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className={`mb-3 inline-flex rounded-lg p-2 ring-1 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-5">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-600">{t('repOnboarding.trackingStats.progressOverview')}</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
                          <span>{t('repOnboarding.trackingStats.avgProgress')}</span>
                          <span className="tabular-nums">{trackingStats.avgProgress}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                          <div className="h-full rounded-full bg-gradient-harx transition-[width] duration-700 ease-out" style={{ width: `${trackingStats.avgProgress}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-2 py-3">
                          <div className="text-lg font-black tabular-nums text-emerald-700">{trackingStats.completed}</div>
                          <div className="text-[10px] font-semibold uppercase text-emerald-800">{t('repOnboarding.trackingStats.completed')}</div>
                        </div>
                        <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-2 py-3">
                          <div className="text-lg font-black tabular-nums text-sky-700">{trackingStats.inProgress}</div>
                          <div className="text-[10px] font-semibold uppercase text-sky-800">{t('repOnboarding.trackingStats.inProgress')}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-3">
                          <div className="text-lg font-black tabular-nums text-slate-700">{trackingStats.notStarted}</div>
                          <div className="text-[10px] font-semibold uppercase text-slate-600">{t('repOnboarding.trackingStats.notStarted')}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-5">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-600">{t('repOnboarding.trackingStats.byTraining')}</h3>
                    {trackingStats.moduleStats.length === 0 ? (
                      <p className="text-sm text-slate-500">{t('repOnboarding.trackingStats.noTrainingData')}</p>
                    ) : (
                      <div className="space-y-2.5">
                        {trackingStats.moduleStats.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200/80 bg-white p-3 transition-colors hover:border-harx-200/60">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                              <span className="text-xs font-bold tabular-nums text-harx-600">{item.progress}%</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.modulesCount} {t('repOnboarding.trainingSection.modules')}
                            </p>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-gradient-harx transition-[width] duration-500" style={{ width: `${item.progress}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* Saved Podcasts section hidden per product decision — kept for future re-enable. */}
            {false && (
            <section className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-2xl shadow-gray-200/50">
              <div className="h-1 w-full bg-gradient-harx" aria-hidden />
              <div className="relative z-10 p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-2xl bg-gradient-harx p-3 text-white shadow-lg shadow-harx-500/30">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">{t('repOnboarding.podcastSection.title')}</h2>
                      <p className="text-sm font-medium text-gray-500">{t('repOnboarding.podcastSection.subtitle')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchSavedPodcasts()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingPodcasts ? 'animate-spin' : ''}`} />
                    {t('repOnboarding.podcastSection.refreshBtn')}
                  </button>
                </div>

                {loadingPodcasts ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-harx-100 py-10">
                    <RefreshCw className="h-8 w-8 animate-spin text-harx-500" />
                    <p className="mt-4 text-sm font-medium text-gray-600">{t('repOnboarding.podcastSection.loading')}</p>
                  </div>
                ) : savedPodcasts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-harx-200 py-10 p-8 text-center">
                    <h3 className="text-base font-bold text-gray-900">{t('repOnboarding.podcastSection.emptyTitle')}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-gray-600">
                      {t('repOnboarding.podcastSection.emptyDesc')}
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
                          {podcast.title || t('repOnboarding.podcastSection.untitled')}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-600">
                          {podcast.trainingTitle || t('repOnboarding.podcastSection.defaultDesc')}
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                          {podcast.createdAt ? new Date(podcast.createdAt).toLocaleString() : t('repOnboarding.podcastSection.dateUnavailable')}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playPodcastAudio(podcast)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {playingPodcastId === podcast._id ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {playingPodcastId === podcast._id ? t('repOnboarding.podcastSection.stopAudio') : t('repOnboarding.podcastSection.playAudio')}
                          </button>
                        </div>
                        {podcast.audioUrl ? (
                          <div className="mt-2">
                            <PremiumAudioPlayer url={podcast.audioUrl} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            )}
          </div>
        </div>
          </>
        )}
      </div>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-xl ${FORMATION_PANEL} p-5 sm:p-6`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-900">{t('repOnboarding.settings.title')}</h3>
              <button
                type="button"
                onClick={() => {
                  if (isSavingSettings) return;
                  setIsSettingsOpen(false);
                  setSettingsJourney(null);
                }}
                className={FORMATION_BTN_SECONDARY}
              >
                {t('repOnboarding.settings.closeBtn')}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.settings.titleLabel')}</label>
                <input
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-harx-400 focus:ring-2 focus:ring-harx-500/15"
                  placeholder={t('repOnboarding.settings.titlePlaceholder')}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.settings.descLabel')}</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-harx-400 focus:ring-2 focus:ring-harx-500/15"
                  placeholder={t('repOnboarding.settings.descPlaceholder')}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('repOnboarding.settings.logoLabel')}</label>
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
                    {isUploadingLogo ? t('repOnboarding.settings.uploading') : t('repOnboarding.settings.importImageBtn')}
                  </button>
                  {settingsForm.logoUrl ? (
                    <button
                      type="button"
                      onClick={() => setSettingsForm((prev) => ({ ...prev, logoUrl: '' }))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title={t('repOnboarding.settings.removeLogoBtn')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {settingsForm.logoUrl ? (
                  <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <img src={settingsForm.logoUrl} alt="Training logo preview" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="text-xs font-semibold text-gray-600">{t('repOnboarding.settings.logoSuccess')}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">{t('repOnboarding.settings.noLogo')}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (isSavingSettings) return;
                  setIsSettingsOpen(false);
                  setSettingsJourney(null);
                }}
                className={FORMATION_BTN_SECONDARY}
              >
                {t('repOnboarding.settings.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveTrainingSettings()}
                disabled={isSavingSettings}
                className={FORMATION_BTN_PRIMARY}
              >
                {isSavingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                {t('repOnboarding.settings.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepOnboarding;
