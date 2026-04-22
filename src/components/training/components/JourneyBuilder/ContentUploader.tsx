import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileText, Video, Music, Image, File as FileIcon, CheckCircle, Clock, AlertCircle, AlertTriangle, X, Sparkles, Zap, BarChart3, Wand2, Save, Loader2, Presentation, FileDown, Maximize2, RefreshCw, LayoutGrid, FolderOpen, Briefcase, Plus, Search, RotateCcw, Send, History, Bot, Mic, Square, Play, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ContentUpload } from '../../types/core';
import { AIService, normalizePresentationFromApi, type UploadCurriculumContext, type PresentationGenerationContext, type CallRecordingRef, type ChatHistoryItem, type SavedPodcastItem, type TrainingImageSet, type QuizQuestion } from '../../infrastructure/services/AIService';
import { WebSpeechService } from '../../infrastructure/services/CanvasVideoService';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { DraftService } from '../../infrastructure/services/DraftService';
import { cloudinaryService } from '../../lib/cloudinaryService';
import { getGigsByCompanyId } from '../../../../api/matching';
import type { Gig } from '../../../../types/matching';
import PresentationPreview from '../Training/PresentationPreview';
import { scrollJourneyMainToTop } from './journeyScroll';
import type { TrainingMethodology } from '../../types/methodology';
import { buildGigSnapshotForAi } from '../../utils/gigSnapshotForAi';

interface ContentUploaderProps {
  onComplete: (uploads: ContentUpload[], fileTrainingUrl?: string) => void;
  onBack: () => void;
  company?: any;
  gigId?: string | null;
  journey?: any;
  methodology?: TrainingMethodology | null;
  /** `persistedJourneyId` : id Mongo renvoyé après save cloud — évite un 2e POST dans JourneyBuilder. */
  onFinishEarly?: (
    uploads: ContentUpload[],
    curriculum?: any,
    presentationData?: any,
    filetraining?: string,
    persistedJourneyId?: string
  ) => void;
  /** REP company onboarding: modules sidebar + slides only, no PPTX/fullscreen/continue CTA */
  repOnboardingLayout?: boolean;
}

type KbGenerationMode = 'kb_only' | 'uploads_only' | 'kb_and_uploads' | 'none';

/** Bloc JSON renvoyé par le backend (2e passage Claude) — actions hors zone de saisie. */
export type TrainingReadinessPayload = {
  readiness: 'ready' | 'incomplete' | 'not_applicable';
  missingModules: { title: string; reason?: string }[];
  messageFr: string;
  actions: { id: string; label: string }[];
};

const HARX_TRAINING_STATUS_REGEX = /<harx-training-status>\s*([\s\S]*?)\s*<\/harx-training-status>/i;

function stripAssistantTrainingTags(raw: string): string {
  return String(raw || '')
    .replace(/<harx-style>[\s\S]*?<\/harx-style>/gi, '')
    .replace(/<harx-html>[\s\S]*?<\/harx-html>/gi, '')
    .replace(HARX_TRAINING_STATUS_REGEX, '')
    .trim();
}

function extractTrainingReadinessBlock(raw: string): {
  displayText: string;
  trainingReadiness: TrainingReadinessPayload | null;
} {
  const full = String(raw || '');
  const m = full.match(HARX_TRAINING_STATUS_REGEX);
  if (!m?.[1]) {
    return { displayText: full.trim(), trainingReadiness: null };
  }
  const displayText = full.replace(HARX_TRAINING_STATUS_REGEX, '').trim();
  try {
    const parsed = JSON.parse(m[1]);
    let readiness = parsed?.readiness as 'ready' | 'incomplete' | 'not_applicable' | undefined;
    if (readiness !== 'ready' && readiness !== 'incomplete' && readiness !== 'not_applicable') {
      return { displayText, trainingReadiness: null };
    }
    const missingModules = Array.isArray(parsed?.missingModules)
      ? (parsed.missingModules as any[])
          .filter((x) => x && String(x.title || '').trim())
          .map((x) => ({
            title: String(x.title).trim(),
            reason: x.reason ? String(x.reason).trim() : undefined,
          }))
      : [];
    if (readiness === 'ready' && missingModules.length > 0) {
      readiness = 'incomplete';
    }
    let messageFr = String(parsed?.messageFr || '').trim();
    if (readiness === 'incomplete' && missingModules.length > 0 && !messageFr) {
      messageFr = `Il manque encore du contenu pour ${missingModules.length} module(s).`;
    }
    const canShowValidate = readiness === 'ready' && missingModules.length === 0;
    const actions = Array.isArray(parsed?.actions)
      ? (parsed.actions as any[])
          .filter(
            (a) =>
              a &&
              (a.id === 'validate_training' ||
                a.id === 'save_without_missing' ||
                a.id === 'generate_missing_modules')
          )
          .filter((a) => (a.id === 'validate_training' ? canShowValidate : true))
          .map((a) => ({ id: String(a.id), label: String(a.label || '').trim() }))
          .filter((a) => a.label)
      : [];
    if (!actions.length) {
      return { displayText, trainingReadiness: null };
    }
    return {
      displayText,
      trainingReadiness: {
        readiness,
        missingModules,
        messageFr:
          messageFr ||
          (readiness === 'ready'
            ? 'La formation semble prête. Vous pouvez la valider pour l’enregistrer.'
            : `Il manque encore du contenu pour ${missingModules.length} module(s).`),
        actions,
      },
    };
  } catch {
    return { displayText, trainingReadiness: null };
  }
}

/** Lecture TTS gratuite (Web Speech API) — découpe le texte pour éviter les limites du moteur. */
async function speakPlainTextWithWebSpeech(
  service: WebSpeechService,
  text: string,
  lang = 'fr-FR',
  isAborted?: () => boolean
) {
  const normalized = String(text || '')
    .replace(/[#*_`]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!normalized) return;
  const blocks = normalized.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const maxLen = 360;
  for (const block of blocks) {
    if (isAborted?.()) return;
    if (block.length <= maxLen) {
      await service.speak(block, { lang, rate: 0.97 });
    } else {
      let start = 0;
      while (start < block.length) {
        if (isAborted?.()) return;
        let end = Math.min(start + maxLen, block.length);
        if (end < block.length) {
          const space = block.lastIndexOf(' ', end);
          if (space > start + 80) end = space;
        }
        const piece = block.slice(start, end).trim();
        if (piece) await service.speak(piece, { lang, rate: 0.97 });
        start = end;
      }
    }
  }
}

type RepPodcastSidebarPanelProps = {
  hasScript: boolean;
  isGenerating: boolean;
  disableGenerateExtra?: boolean;
  canGenerateFromTraining?: boolean;
  hasSavedVersion?: boolean;
  isSpeaking: boolean;
  error: string | null;
  title: string;
  onTitleChange: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
  savedHint?: string | null;
  onGenerate: () => void;
  onPlay: () => void;
  onStop: () => void;
  savedPodcasts: SavedPodcastItem[];
  isSavedPodcastsLoading: boolean;
  onRefreshSavedPodcasts: () => void;
  onLoadSavedPodcast: (podcast: SavedPodcastItem) => void;
  imagePrompt: string;
  onImagePromptChange: (v: string) => void;
  onGenerateImages: () => void;
  isImagesGenerating: boolean;
  imageGenerationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  imageProgressLabel: string;
  generatedImageSet: TrainingImageSet | null;
  savedImageSets: TrainingImageSet[];
  isSavedImageSetsLoading: boolean;
  onRefreshSavedImageSets: () => void;
  onLoadSavedImageSet: (set: TrainingImageSet) => void;
};

/** REP podcast: generation + player (script hidden). */
function RepPodcastSidebarPanel({
  hasScript,
  isGenerating,
  disableGenerateExtra,
  canGenerateFromTraining = true,
  hasSavedVersion = false,
  isSpeaking,
  error,
  title,
  onTitleChange,
  onSave,
  isSaving,
  savedHint,
  onGenerate,
  onPlay,
  onStop,
  savedPodcasts,
  isSavedPodcastsLoading,
  onRefreshSavedPodcasts,
  onLoadSavedPodcast,
  imagePrompt,
  onImagePromptChange,
  onGenerateImages,
  isImagesGenerating,
  imageGenerationStatus,
  imageProgressLabel,
  generatedImageSet,
  savedImageSets,
  isSavedImageSetsLoading,
  onRefreshSavedImageSets,
  onLoadSavedImageSet,
}: RepPodcastSidebarPanelProps) {
  const generateLocked = isGenerating || !!disableGenerateExtra || !canGenerateFromTraining;
  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">Overview</p>
            <p className="text-[11px] text-slate-600">
              Generated from training context · browser playback enabled
            </p>
            {!canGenerateFromTraining ? (
              <p className="mt-1 text-[10px] font-medium leading-snug text-amber-800">
                Choose a gig or continue the conversation until enough content is available.
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {error ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">{error}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generateLocked}
          title={
            !canGenerateFromTraining
              ? 'Add training content in the conversation to enable generation.'
              : undefined
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? 'Generating audio overview...' : hasSavedVersion ? 'Regenerate audio overview' : 'Generate audio overview'}
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-600">
            {hasScript ? (isSpeaking ? 'Playing...' : 'Ready - press play') : 'No overview audio generated'}
          </span>
          <button
            type="button"
            onClick={onPlay}
            disabled={!hasScript || isGenerating || isSpeaking}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-harx p-2 text-white shadow-sm disabled:opacity-40"
            title="Play"
            aria-label="Play podcast"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={!isSpeaking}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-700 disabled:opacity-30"
            title="Stop"
            aria-label="Stop playback"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 rounded-xl border border-slate-200 bg-white p-2.5">
          <p className="mb-1 text-[11px] font-semibold text-slate-700">Overview title</p>
          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ex: Onboarding REP - version finale"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-800 outline-none ring-harx-500/20 focus:ring-2"
            />
            <button
              type="button"
              onClick={onSave}
              disabled={!hasScript || isSaving || isGenerating}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-800 disabled:opacity-50"
              title="Save to database and Cloudinary"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </button>
          </div>
          {savedHint ? <p className="mt-1 text-[10px] text-emerald-700">{savedHint}</p> : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-700">Saved overviews</p>
            <button
              type="button"
              onClick={onRefreshSavedPodcasts}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3 w-3 ${isSavedPodcastsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-2">
            {isSavedPodcastsLoading ? (
              <p className="text-[11px] text-slate-500">Loading saved overviews...</p>
            ) : savedPodcasts.length === 0 ? (
              <p className="text-[11px] text-slate-500">No saved overview yet for this scope.</p>
            ) : (
              savedPodcasts.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => onLoadSavedPodcast(p)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left hover:bg-fuchsia-50"
                >
                  <p className="truncate text-[11px] font-semibold text-slate-800">{p.title || 'Untitled overview'}</p>
                  <p className="truncate text-[10px] text-slate-500">{p.trainingTitle || 'Training overview'}</p>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <p className="mb-2 text-[11px] font-semibold text-slate-700">Presentation overview (max 20)</p>
          <textarea
            value={imagePrompt}
            onChange={(e) => onImagePromptChange(e.target.value)}
            rows={2}
            placeholder="Optional style guidance for presentation overview visuals."
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-800 outline-none ring-harx-500/20 focus:ring-2"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerateImages}
              disabled={isImagesGenerating}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isImagesGenerating ? 'Generating...' : 'Generate presentation overview'}
            </button>
            <span className="text-[10px] font-medium text-slate-500">
              {imageGenerationStatus}{imageProgressLabel ? ` (${imageProgressLabel})` : ''}
            </span>
          </div>
          {generatedImageSet?.items?.length ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {generatedImageSet.items.slice(0, 20).map((it) => (
                <img
                  key={`${generatedImageSet._id}-${it.index}`}
                  src={it.imageUrl}
                  alt={it.title || `Training image ${it.index}`}
                  className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                />
              ))}
            </div>
          ) : null}
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-700">Saved presentation overviews</p>
              <button
                type="button"
                onClick={onRefreshSavedImageSets}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3 w-3 ${isSavedImageSetsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-2">
              {isSavedImageSetsLoading ? (
                <p className="text-[11px] text-slate-500">Loading saved presentation overviews...</p>
              ) : savedImageSets.length === 0 ? (
                <p className="text-[11px] text-slate-500">No saved presentation overview yet.</p>
              ) : (
                savedImageSets.map((v) => (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => onLoadSavedImageSet(v)}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left hover:bg-fuchsia-50"
                  >
                    <p className="truncate text-[11px] font-semibold text-slate-800">{v.title || 'Untitled image set'}</p>
                    <p className="truncate text-[10px] text-slate-500">{(v.items || []).length} images</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentUploader(props: ContentUploaderProps) {
  const { onComplete, onBack, company, gigId, journey, methodology, repOnboardingLayout = false } = props;
  /** Id Mongo `training_journeys` pour lier podcast / images (journey persisté ou brouillon sauvegardé). */
  const linkedTrainingJourneyMongoId = (): string | undefined => {
    const candidates = [(journey as any)?._id, (journey as any)?.id, DraftService.getDraft()?.draftId];
    for (const c of candidates) {
      const s = c != null ? String(c).trim() : '';
      if (s && /^[a-f\d]{24}$/i.test(s)) return s;
    }
    return undefined;
  };
  const analysisMetadata = {
    gigId: gigId || undefined,
    companyId: company?.id || company?._id || undefined
  };

  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [viewMode, setViewMode] = useState<'upload' | 'curriculum'>('upload');
  const [generatedCurriculum, setGeneratedCurriculum] = useState<any>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  /** When a presentation exists: split workspace — program preview vs upload sources */
  const [workspaceTab, setWorkspaceTab] = useState<'artifact' | 'sources'>('artifact');
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [generatedPresentation, setGeneratedPresentation] = useState<any>(null);
  const [fileTrainingUrl, setFileTrainingUrl] = useState<string | undefined>(undefined);
  /** Gig-only: when checked, generation uses this job’s knowledge base documents */
  const [useKbForPresentation, setUseKbForPresentation] = useState(false);
  const [gigKbDocuments, setGigKbDocuments] = useState<
    Array<{ _id: string; name: string; fileType?: string; summary?: string; createdAt?: string }>
  >([]);
  const [gigCallRecordings, setGigCallRecordings] = useState<CallRecordingRef[]>([]);
  const [isLoadingGigKbDocs, setIsLoadingGigKbDocs] = useState(false);
  const [companyGigs, setCompanyGigs] = useState<Gig[]>([]);
  const [isLoadingCompanyGigs, setIsLoadingCompanyGigs] = useState(false);
  const [selectedChatGigId, setSelectedChatGigId] = useState<string>(gigId ? String(gigId) : '');
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      text: string;
      isStreaming?: boolean;
      trainingReadiness?: TrainingReadinessPayload | null;
    }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [showRepSourcePopup, setShowRepSourcePopup] = useState(repOnboardingLayout);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [kbGenerationChoice, setKbGenerationChoice] = useState<KbGenerationMode | null>(null);
  const [chatKbDocuments, setChatKbDocuments] = useState<
    Array<{ _id: string; name: string; fileType?: string; summary?: string; keyTerms?: string[]; createdAt?: string }>
  >([]);
  const [chatUploadedSources, setChatUploadedSources] = useState<Array<{ keyTopics: string[]; objectives: string[] }>>([]);
  const [isChatKbLoading, setIsChatKbLoading] = useState(false);
  /** KB chargée pour le digest podcast (même si le mode chat n’utilise pas la KB). */
  const [podcastKbDocuments, setPodcastKbDocuments] = useState<
    Array<{ _id: string; name: string; fileType?: string; summary?: string; keyTerms?: string[]; createdAt?: string }>
  >([]);
  const [showPersonalizationCard, setShowPersonalizationCard] = useState(false);
  const [personalizationStep, setPersonalizationStep] = useState(0);
  const [personalizationAnswers, setPersonalizationAnswers] = useState<{
    level?: string;
    objective?: string;
    format?: string;
  }>({});
  const [chatHistorySessions, setChatHistorySessions] = useState<ChatHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [podcastScript, setPodcastScript] = useState('');
  const [isPodcastGenerating, setIsPodcastGenerating] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [isPodcastSpeaking, setIsPodcastSpeaking] = useState(false);
  const [podcastTitle, setPodcastTitle] = useState('');
  const [isPodcastSaving, setIsPodcastSaving] = useState(false);
  const [podcastSavedHint, setPodcastSavedHint] = useState<string | null>(null);
  const [currentSavedPodcastId, setCurrentSavedPodcastId] = useState<string | null>(null);
  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcastItem[]>([]);
  const [isSavedPodcastsLoading, setIsSavedPodcastsLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageGenerationStatus, setImageGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const [isImagesGenerating, setIsImagesGenerating] = useState(false);
  const [imageGenerationJobId, setImageGenerationJobId] = useState<string | null>(null);
  const [imageGenerationTotal, setImageGenerationTotal] = useState(0);
  const [imageGenerationCompleted, setImageGenerationCompleted] = useState(0);
  const [generatedImageSet, setGeneratedImageSet] = useState<TrainingImageSet | null>(null);
  const [savedImageSets, setSavedImageSets] = useState<TrainingImageSet[]>([]);
  const [isSavedImageSetsLoading, setIsSavedImageSetsLoading] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showImagePresentationModal, setShowImagePresentationModal] = useState(false);
  const [activeImageSet, setActiveImageSet] = useState<TrainingImageSet | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizGenerating, setIsQuizGenerating] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const podcastSpeechRef = useRef<WebSpeechService | null>(null);
  const podcastSpeakAbortRef = useRef(false);
  /** After a successful “Regenerate audio overview”, chat length at that moment — View syncs when new messages arrive. */
  const lastPodcastGenChatLengthRef = useRef(0);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    });
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (gigId) {
      setSelectedChatGigId(String(gigId));
    }
  }, [gigId]);

  useEffect(() => {
    setShowRepSourcePopup(repOnboardingLayout && chatMessages.length === 0);
  }, [repOnboardingLayout, chatMessages.length]);

  const activeChatGigId = selectedChatGigId || (gigId ? String(gigId) : '');
  const activeChatGigTitle =
    companyGigs.find((g: any) => String(g?._id || g?.id || '') === String(activeChatGigId))?.title ||
    (activeChatGigId ? `Gig ${activeChatGigId.slice(0, 8)}` : 'No gig');
  const hasActiveGigInOptions = useMemo(
    () =>
      !!activeChatGigId &&
      companyGigs.some((g: any) => String(g?._id || g?.id || '') === String(activeChatGigId)),
    [companyGigs, activeChatGigId]
  );

  const gigSnapshotForBuilder = useMemo(() => {
    const gid = gigId ? String(gigId) : '';
    if (!gid) return null;
    const row = companyGigs.find((g: any) => String(g?._id || g?.id || '') === gid);
    return row ? buildGigSnapshotForAi(row) : null;
  }, [companyGigs, gigId]);

  /** Gig sélectionné dans le chat REP (liste gigs ou gig du journey aligné sur la sélection). */
  const activeGigSnapshotForPodcast = useMemo(() => {
    const gid = String(activeChatGigId || '').trim();
    if (!gid) return null;
    const row = companyGigs.find((g: any) => String(g?._id || g?.id || '') === gid);
    if (row) return buildGigSnapshotForAi(row);
    if (gigId && String(gigId) === gid && gigSnapshotForBuilder) return gigSnapshotForBuilder;
    return null;
  }, [activeChatGigId, companyGigs, gigId, gigSnapshotForBuilder]);

  useEffect(() => {
    if (!repOnboardingLayout || !String(activeChatGigId || '').trim()) {
      setPodcastKbDocuments([]);
      return;
    }
    let cancelled = false;
    AIService.listGigKnowledgeDocuments(String(activeChatGigId))
      .then((docs) => {
        if (!cancelled) setPodcastKbDocuments(Array.isArray(docs) ? docs : []);
      })
      .catch(() => {
        if (!cancelled) setPodcastKbDocuments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [repOnboardingLayout, activeChatGigId]);

  useEffect(() => {
    podcastSpeechRef.current = new WebSpeechService();
    return () => {
      podcastSpeakAbortRef.current = true;
      podcastSpeechRef.current?.stop();
    };
  }, []);

  /** Programme / slides persistés (hors chat). */
  const hasStructuredPodcastSource = useMemo(
    () =>
      (Array.isArray(generatedCurriculum?.modules) && generatedCurriculum.modules.length > 0) ||
      (Array.isArray(generatedPresentation?.slides) && generatedPresentation.slides.length > 0),
    [generatedCurriculum, generatedPresentation]
  );

  /** Flux REP : le plan vit souvent uniquement dans les réponses assistant — on en fait une synthèse pour le podcast. */
  const repChatPodcastDigest = useMemo(() => {
    if (!repOnboardingLayout) return '';
    const chunks = chatMessages
      .filter((m) => m.role === 'assistant' && stripAssistantTrainingTags(String(m.text || '')).length > 120)
      .slice(-10)
      .map((m) => stripAssistantTrainingTags(String(m.text || '')))
      .filter(Boolean);
    return chunks.join('\n\n---\n\n').slice(0, 12000);
  }, [repOnboardingLayout, chatMessages]);

  /** Full user + assistant thread for podcast digest (REP). */
  const repChatTranscriptForPodcast = useMemo(() => {
    if (!repOnboardingLayout) return '';
    const lines: string[] = [];
    for (const m of chatMessages) {
      if (m.role !== 'user' && m.role !== 'assistant') continue;
      let text = String(m.text || '').trim();
      if (m.role === 'assistant') text = stripAssistantTrainingTags(text);
      if (!text) continue;
      lines.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${text}`);
    }
    return lines.join('\n\n').slice(0, 12000);
  }, [repOnboardingLayout, chatMessages]);

  /** Best assistant script visible in chat (after user asked for audio/script), else longest recent reply. */
  const repChatScriptCandidate = useMemo(() => {
    if (!repOnboardingLayout || !chatMessages.length) return '';
    const userWantsAudio = (t: string) =>
      /audio|script|podcast|narration|\boral\b|génère|générer|écouter|micro|voix|spoken/i.test(String(t || '').toLowerCase());
    for (let i = chatMessages.length - 2; i >= 0; i--) {
      const u = chatMessages[i];
      if (u.role !== 'user' || !userWantsAudio(String(u.text || ''))) continue;
      const a = chatMessages[i + 1];
      if (a?.role === 'assistant') {
        const body = stripAssistantTrainingTags(String(a.text || ''));
        if (body.length >= 200) return body.slice(0, 12000);
      }
    }
    let best = '';
    let bestLen = 0;
    for (let i = Math.max(0, chatMessages.length - 15); i < chatMessages.length; i++) {
      const m = chatMessages[i];
      if (m.role !== 'assistant') continue;
      const body = stripAssistantTrainingTags(String(m.text || ''));
      if (body.length > bestLen) {
        bestLen = body.length;
        best = body;
      }
    }
    return bestLen >= 400 ? best.slice(0, 12000) : '';
  }, [repOnboardingLayout, chatMessages]);

  /** Préfère la KB déjà chargée pour le chat ; sinon la liste chargée pour le podcast. */
  const kbDocumentsForPodcast = useMemo(
    () => (chatKbDocuments.length > 0 ? chatKbDocuments : podcastKbDocuments),
    [chatKbDocuments, podcastKbDocuments]
  );

  const showRepPodcastPanel = useMemo(
    () =>
      repOnboardingLayout &&
      (hasStructuredPodcastSource ||
        repChatPodcastDigest.length >= 600 ||
        repChatTranscriptForPodcast.length >= 200 ||
        Boolean(activeGigSnapshotForPodcast) ||
        kbDocumentsForPodcast.length > 0),
    [
      repOnboardingLayout,
      hasStructuredPodcastSource,
      repChatPodcastDigest,
      repChatTranscriptForPodcast,
      activeGigSnapshotForPodcast,
      kbDocumentsForPodcast,
    ]
  );

  const buildTrainingDigestForPodcast = useCallback((): string => {
    const parts: string[] = [];
    if (generatedCurriculum?.title) {
      parts.push(`Titre: ${String(generatedCurriculum.title)}`);
    }
    if (generatedCurriculum?.description) {
      parts.push(`Description: ${String(generatedCurriculum.description).slice(0, 1500)}`);
    }
    const modules = Array.isArray(generatedCurriculum?.modules) ? generatedCurriculum.modules : [];
    modules.slice(0, 24).forEach((m: any, i: number) => {
      const title = m?.title || `Module ${i + 1}`;
      const desc = String(m?.description || '').slice(0, 700);
      const objectives = Array.isArray(m?.learningObjectives)
        ? m.learningObjectives.slice(0, 8).join(' · ')
        : '';
      const sections = Array.isArray(m?.sections) ? m.sections : [];
      const secBits = sections
        .slice(0, 5)
        .map((s: any) => {
          const st = String(s?.title || '').slice(0, 120);
          const sc = String(s?.content || s?.text || s?.body || '').slice(0, 450);
          return st ? `${st}: ${sc}` : sc;
        })
        .filter(Boolean)
        .join('\n');
      parts.push(
        `\n--- Module ${i + 1}: ${title} ---\n${desc}${objectives ? `\nObjectifs: ${objectives}` : ''}${secBits ? `\n${secBits}` : ''}`
      );
    });
    const slides = Array.isArray(generatedPresentation?.slides) ? generatedPresentation.slides : [];
    if (slides.length > 0) {
      parts.push('\n--- Slides (extraits) ---');
      slides.slice(0, 28).forEach((s: any, i: number) => {
        const head = String(s?.title || s?.heading || `Slide ${i + 1}`).slice(0, 140);
        const body = String(s?.content || s?.body || s?.notes || s?.text || '').slice(0, 400);
        parts.push(`${head}\n${body}`);
      });
    }

    if (repOnboardingLayout) {
      if (activeGigSnapshotForPodcast) {
        parts.push(
          '\n--- Gig (mission / contexte poste) ---\n' +
            JSON.stringify(activeGigSnapshotForPodcast).slice(0, 5500)
        );
      }
      if (kbDocumentsForPodcast.length > 0) {
        parts.push('\n--- Base de connaissances (documents) ---');
        kbDocumentsForPodcast.slice(0, 28).forEach((doc) => {
          const terms = Array.isArray(doc.keyTerms) ? doc.keyTerms.slice(0, 14).join(', ') : '';
          parts.push(
            `\n• ${String(doc.name || 'Document').slice(0, 200)}\n${String(doc.summary || '').slice(0, 900)}${
              terms ? `\nTermes: ${terms}` : ''
            }`
          );
        });
      }
    }

    let out = parts.join('\n\n').trim();
    if (repOnboardingLayout) {
      const chatTx = repChatTranscriptForPodcast.trim();
      if (chatTx) {
        out = `--- Training chat (PRIMARY: align the spoken script with this thread) ---\n\n${chatTx}\n\n--- Supporting reference (curriculum, gig, knowledge base — use only if needed) ---\n\n${out}`.trim();
      } else if (out.length < 400 && repChatPodcastDigest.trim()) {
        out = `${out ? `${out}\n\n` : ''}--- Summary from onboarding conversation ---\n\n${repChatPodcastDigest}`;
      }
    } else if (out.length < 400 && repChatPodcastDigest.trim()) {
      out = `${out ? `${out}\n\n` : ''}--- Summary from onboarding conversation ---\n\n${repChatPodcastDigest}`;
    }
    if (out.length > 14000) {
      out = `${out.slice(0, 14000)}\n\n[... content truncated due to technical limit]`;
    }
    return out;
  }, [
    generatedCurriculum,
    generatedPresentation,
    repChatPodcastDigest,
    repChatTranscriptForPodcast,
    repOnboardingLayout,
    activeGigSnapshotForPodcast,
    kbDocumentsForPodcast,
  ]);

  const handleGeneratePodcastScript = useCallback(async () => {
    if (!repOnboardingLayout || isPodcastGenerating) return;
    const digest = buildTrainingDigestForPodcast();
    if (!digest.trim()) {
      setPodcastError('Not enough training content to generate a podcast.');
      setShowPodcastModal(true);
      return;
    }
    setIsPodcastGenerating(true);
    setShowPodcastModal(true);
    setPodcastError(null);
    setPodcastSavedHint(null);
    setPodcastScript('');
    try {
      const trainingTitle = String(
        generatedCurriculum?.title ||
          generatedPresentation?.title ||
          (activeGigSnapshotForPodcast && String((activeGigSnapshotForPodcast as Record<string, unknown>).title || '')) ||
          ''
      );
      const script = await AIService.generatePodcastScript({
        trainingDigest: digest,
        trainingTitle,
        language: 'fr',
      });
      setPodcastScript(script);
      lastPodcastGenChatLengthRef.current = chatMessages.length;
      if (!podcastTitle.trim()) {
        setPodcastTitle(trainingTitle ? `${trainingTitle} - Podcast` : 'Podcast formation');
      }
      if (currentSavedPodcastId) {
        const titleToSave = (podcastTitle.trim() || `${trainingTitle || 'Training podcast'} - Podcast`).slice(0, 240);
        await AIService.savePodcast({
          title: titleToSave,
          script,
          trainingTitle: trainingTitle || 'Training podcast',
          language: 'fr',
          gigId: activeChatGigId ? String(activeChatGigId) : undefined,
          companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
          chatMessages: [],
          trainingJourneyId: linkedTrainingJourneyMongoId(),
        });
        setPodcastSavedHint('Podcast regenerated and saved to MongoDB and Cloudinary.');
        const refreshed = await AIService.listSavedPodcasts({
          gigId: activeChatGigId ? String(activeChatGigId) : undefined,
          companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
          limit: 20,
        });
        setSavedPodcasts(Array.isArray(refreshed) ? refreshed : []);
      }
    } catch (e: any) {
      console.error('[ContentUploader] Podcast script generation failed:', e);
      setPodcastError(e?.message || 'Unable to generate script right now.');
      setShowPodcastModal(true);
    } finally {
      setIsPodcastGenerating(false);
    }
  }, [
    repOnboardingLayout,
    isPodcastGenerating,
    buildTrainingDigestForPodcast,
    generatedCurriculum?.title,
    generatedPresentation?.title,
    activeGigSnapshotForPodcast,
    podcastTitle,
    currentSavedPodcastId,
    activeChatGigId,
    company,
    journey,
    chatMessages.length,
  ]);

  const handleStopPodcastSpeak = useCallback(() => {
    podcastSpeakAbortRef.current = true;
    podcastSpeechRef.current?.stop();
    setIsPodcastSpeaking(false);
  }, []);

  const handlePlayPodcastSpeak = useCallback(async () => {
    const text = podcastScript.trim();
    if (!text) return;
    const svc = podcastSpeechRef.current;
    if (!svc) return;
    if (isPodcastSpeaking) return;
    podcastSpeakAbortRef.current = false;
    setIsPodcastSpeaking(true);
    setPodcastError(null);
    try {
      await speakPlainTextWithWebSpeech(svc, text, 'fr-FR', () => podcastSpeakAbortRef.current);
    } catch (e: any) {
      console.warn('[ContentUploader] Web Speech playback issue:', e);
      const msg = String(e?.message || e?.error || '');
      setPodcastError(
        /not-allowed|interrupted/i.test(msg)
          ? 'Playback blocked or interrupted: click Play again after interacting with the page.'
          : 'Voice playback is unavailable in this browser.'
      );
    } finally {
      setIsPodcastSpeaking(false);
    }
  }, [podcastScript, isPodcastSpeaking]);

  const handleSavePodcast = useCallback(async () => {
    const script = podcastScript.trim();
    if (!script || isPodcastSaving) return;
    const fallbackTitle = String(
      generatedCurriculum?.title ||
        generatedPresentation?.title ||
        (activeGigSnapshotForPodcast && String((activeGigSnapshotForPodcast as Record<string, unknown>).title || '')) ||
        'Training podcast'
    );
    const title = (podcastTitle.trim() || `${fallbackTitle} - Podcast`).slice(0, 240);
    setIsPodcastSaving(true);
    setPodcastError(null);
    setPodcastSavedHint(null);
    try {
      const saved = await AIService.savePodcast({
        title,
        script,
        trainingTitle: fallbackTitle,
        language: 'fr',
        gigId: activeChatGigId ? String(activeChatGigId) : undefined,
        companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
        chatMessages: [],
        trainingJourneyId: linkedTrainingJourneyMongoId(),
      });
      setCurrentSavedPodcastId(String(saved._id || ''));
      setPodcastTitle(saved.title || title);
      setPodcastSavedHint('Podcast saved to MongoDB and Cloudinary.');
      const refreshed = await AIService.listSavedPodcasts({
        gigId: activeChatGigId ? String(activeChatGigId) : undefined,
        companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
        limit: 20,
      });
      setSavedPodcasts(Array.isArray(refreshed) ? refreshed : []);
    } catch (e: any) {
      setPodcastError(e?.message || 'Unable to save podcast.');
    } finally {
      setIsPodcastSaving(false);
    }
  }, [
    podcastScript,
    isPodcastSaving,
    generatedCurriculum?.title,
    generatedPresentation?.title,
    activeGigSnapshotForPodcast,
    podcastTitle,
    activeChatGigId,
    company,
    journey,
  ]);

  const refreshSavedPodcasts = useCallback(async () => {
    setIsSavedPodcastsLoading(true);
    try {
      const rows = await AIService.listSavedPodcasts({
        gigId: activeChatGigId ? String(activeChatGigId) : undefined,
        companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
        limit: 20,
      });
      setSavedPodcasts(Array.isArray(rows) ? rows : []);
    } catch {
      setSavedPodcasts([]);
    } finally {
      setIsSavedPodcastsLoading(false);
    }
  }, [activeChatGigId, company]);

  useEffect(() => {
    if (!repOnboardingLayout) return;
    void refreshSavedPodcasts();
  }, [repOnboardingLayout, refreshSavedPodcasts]);

  const refreshSavedImageSets = useCallback(async () => {
    setIsSavedImageSetsLoading(true);
    try {
      const rows = await AIService.listTrainingImages({
        gigId: activeChatGigId ? String(activeChatGigId) : undefined,
        companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
        limit: 20,
      });
      setSavedImageSets(Array.isArray(rows) ? rows : []);
    } catch {
      setSavedImageSets([]);
    } finally {
      setIsSavedImageSetsLoading(false);
    }
  }, [activeChatGigId, company]);

  useEffect(() => {
    if (!repOnboardingLayout) return;
    void refreshSavedImageSets();
  }, [repOnboardingLayout, refreshSavedImageSets]);

  const handleGenerateTrainingImages = useCallback(async () => {
    if (isImagesGenerating) return;
    const digest = buildTrainingDigestForPodcast();
    if (!digest.trim()) {
      setPodcastError('Not enough training content to generate images.');
      return;
    }
    const trainingTitle = String(
      generatedCurriculum?.title ||
        generatedPresentation?.title ||
        (activeGigSnapshotForPodcast && String((activeGigSnapshotForPodcast as Record<string, unknown>).title || '')) ||
        'Training'
    );
    setIsImagesGenerating(true);
    setImageGenerationStatus('generating');
    setImageGenerationJobId(null);
    setImageGenerationTotal(0);
    setImageGenerationCompleted(0);
    setPodcastError(null);
    setGeneratedImageSet(null);
    try {
      const result = await AIService.generateTrainingImages({
        trainingDigest: digest,
        trainingTitle,
        title: `${trainingTitle} - Images`,
        language: 'fr',
        styleGuidance: imagePrompt.trim() || undefined,
        maxImages: 20,
        gigId: activeChatGigId ? String(activeChatGigId) : undefined,
        companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
        trainingJourneyId: linkedTrainingJourneyMongoId(),
      });
      setImageGenerationJobId(result.jobId);
      setImageGenerationStatus(result.status === 'failed' ? 'failed' : 'generating');
      setImageGenerationTotal(result.total || 0);
      setImageGenerationCompleted(result.completed || 0);
      setGeneratedImageSet({
        _id: result.jobId,
        title: `${trainingTitle} - Images`,
        trainingTitle,
        language: 'fr',
        items: Array.isArray(result.items) ? result.items : [],
      });
    } catch (e: any) {
      setImageGenerationStatus('failed');
      setPodcastError(e?.message || 'Unable to generate training images.');
      setIsImagesGenerating(false);
    }
  }, [
    isImagesGenerating,
    buildTrainingDigestForPodcast,
    generatedCurriculum?.title,
    generatedPresentation?.title,
    activeGigSnapshotForPodcast,
    activeChatGigId,
    company,
    imagePrompt,
    journey,
  ]);

  useEffect(() => {
    if (!imageGenerationJobId || imageGenerationStatus !== 'generating') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const st = await AIService.getTrainingImagesStatus(imageGenerationJobId);
        if (cancelled) return;
        setImageGenerationTotal(st.total || 0);
        setImageGenerationCompleted(st.completed || 0);
        setGeneratedImageSet((prev) => ({
          _id: st.savedImageSetId || prev?._id || st.jobId,
          title: prev?.title || 'Training images',
          trainingTitle: prev?.trainingTitle,
          language: prev?.language || 'fr',
          items: Array.isArray(st.items) ? st.items : [],
          createdAt: prev?.createdAt,
        }));
        if (st.status === 'completed') {
          setImageGenerationStatus('completed');
          setIsImagesGenerating(false);
          setPodcastSavedHint('Training images generated and saved.');
          await refreshSavedImageSets();
          return;
        }
        if (st.status === 'failed') {
          setImageGenerationStatus('failed');
          setPodcastError(st.error || 'Unable to generate training images.');
          setIsImagesGenerating(false);
          return;
        }
        window.setTimeout(() => {
          void tick();
        }, 1800);
      } catch (e: any) {
        if (cancelled) return;
        setImageGenerationStatus('failed');
        setPodcastError(e?.message || 'Unable to fetch image generation status.');
        setIsImagesGenerating(false);
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [imageGenerationJobId, imageGenerationStatus, refreshSavedImageSets]);

  const refreshChatHistory = useCallback(async () => {
    if (!activeChatGigId) {
      setChatHistorySessions([]);
      return;
    }
    setIsHistoryLoading(true);
    try {
      const sessions = await AIService.listChatHistory(String(activeChatGigId));
      setChatHistorySessions(Array.isArray(sessions) ? sessions : []);
    } catch (error) {
      console.error('[ContentUploader] Failed loading chat history:', error);
      setChatHistorySessions([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [activeChatGigId]);

  useEffect(() => {
    if (!activeChatGigId) {
      setActiveChatSessionId(null);
      setChatHistorySessions([]);
      setChatKbDocuments([]);
      return;
    }
    setActiveChatSessionId(null);
    void refreshChatHistory();
  }, [activeChatGigId, refreshChatHistory]);

  useEffect(() => {
    if (!activeChatGigId) {
      setIsChatKbLoading(false);
      setChatKbDocuments([]);
      return;
    }
    let cancelled = false;
    setIsChatKbLoading(true);
    AIService.listGigKnowledgeDocuments(String(activeChatGigId))
      .then((docs) => {
        if (!cancelled) setChatKbDocuments(Array.isArray(docs) ? docs : []);
      })
      .catch((error) => {
        console.error('[ContentUploader] Failed loading KB docs for chat:', error);
        if (!cancelled) setChatKbDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setIsChatKbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeChatGigId]);

  const getAnalyzedUploads = useCallback(
    () => uploads.filter((u) => u.status === 'analyzed' && !!u.aiAnalysis),
    [uploads]
  );

  const getUploadContext = useCallback((): UploadCurriculumContext[] => {
    return getAnalyzedUploads().map((u) => ({
      fileName: u.name,
      fileType: u.type,
      keyTopics: u.aiAnalysis?.keyTopics || [],
      learningObjectives: u.aiAnalysis?.learningObjectives || [],
    }));
  }, [getAnalyzedUploads]);

  const getGenerationSourceMode = useCallback(
    (hasUploadSource: boolean, includeKbSource: boolean): 'uploads' | 'kb' | 'uploads+kb' | 'gig' => {
      if (hasUploadSource && includeKbSource) return 'uploads+kb';
      if (hasUploadSource) return 'uploads';
      if (includeKbSource) return 'kb';
      return 'gig';
    },
    []
  );

  const buildPresentationSourceContext = useCallback(
    async (includeKbSource: boolean): Promise<PresentationGenerationContext> => {
      const uploadContext = getUploadContext();
      const hasUploadSource = uploadContext.length > 0;

      if (!includeKbSource || !gigId) {
        return {
          sourceMode: getGenerationSourceMode(hasUploadSource, false),
          uploadAnalyses: uploadContext,
          knowledgeDocuments: [],
          callRecordings: [],
          gigSnapshot: gigSnapshotForBuilder,
        };
      }

      const [docs, calls] = await Promise.all([
        AIService.listGigKnowledgeDocuments(gigId).catch((error) => {
          console.warn('[ContentUploader] Unable to fetch KB docs for generation context:', error);
          return [];
        }),
        AIService.listGigCallRecordings(gigId).catch((error) => {
          console.warn('[ContentUploader] Unable to fetch call recordings for generation context:', error);
          return [];
        }),
      ]);

      return {
        sourceMode: getGenerationSourceMode(hasUploadSource, true),
        uploadAnalyses: uploadContext,
        knowledgeDocuments: docs,
        callRecordings: calls,
        gigSnapshot: gigSnapshotForBuilder,
      };
    },
    [getUploadContext, gigId, getGenerationSourceMode, gigSnapshotForBuilder]
  );

  useEffect(() => {
    scrollJourneyMainToTop();
  }, []);

  useEffect(() => {
    if (!gigId || !useKbForPresentation) {
      setGigKbDocuments([]);
      setGigCallRecordings([]);
      return;
    }
    let cancelled = false;
    setIsLoadingGigKbDocs(true);
    Promise.all([
      AIService.listGigKnowledgeDocuments(gigId).catch((err) => {
        console.error('[ContentUploader] KB documents list failed:', err);
        return [];
      }),
      AIService.listGigCallRecordings(gigId).catch((err) => {
        console.error('[ContentUploader] Call recordings list failed:', err);
        return [];
      }),
    ])
      .then(([docs, calls]) => {
        if (!cancelled) {
          setGigKbDocuments(docs as any);
          setGigCallRecordings(calls as CallRecordingRef[]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGigKbDocs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gigId, useKbForPresentation]);

  useEffect(() => {
    const companyId = company?.id || company?._id;
    if (!companyId) {
      setCompanyGigs([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCompanyGigs(true);
    getGigsByCompanyId(String(companyId))
      .then((rows) => {
        if (!cancelled) setCompanyGigs(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setCompanyGigs([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCompanyGigs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [company?.id, company?._id]);

  const getFileIcon = (type: ContentUpload['type'], harxLayout?: boolean) => {
    const sz = harxLayout ? 'h-6 w-6' : 'h-8 w-8';
    switch (type) {
      case 'document':
        return <FileText className={`${sz} ${harxLayout ? 'text-harx-500' : 'text-purple-500'}`} />;
      case 'video':
        return <Video className={`${sz} text-red-500`} />;
      case 'audio':
        return <Music className={`${sz} text-green-600`} />;
      case 'image':
        return <Image className={`${sz} ${harxLayout ? 'text-harx-400' : 'text-purple-500'}`} />;
      case 'presentation':
        return <FileIcon className={`${sz} ${harxLayout ? 'text-harx-600' : 'text-orange-500'}`} />;
      default:
        return <FileIcon className={`${sz} text-gray-500`} />;
    }
  };

  const getFileType = (file: File): ContentUpload['type'] => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) return 'document';
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(extension || '')) return 'video';
    if (['mp3', 'wav', 'aac', 'm4a'].includes(extension || '')) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (['ppt', 'pptx'].includes(extension || '')) return 'presentation';

    return 'document';
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    const currentAnalysisMetadata = {
      gigId: gigId || undefined,
      companyId: company?.id || company?._id || undefined
    };
    const newUploads: ContentUpload[] = files.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: getFileType(file),
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
      file: file  // ✅ Stocke le fichier original pour l'analyse AI
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsProcessing(true);

    // Process each file sequentially for better UX
    for (const upload of newUploads) {
      // Simulate upload phase
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUploads(prev => prev.map(u =>
        u.id === upload.id ? { ...u, status: 'processing' } : u
      ));

      try {
        // ✅ Upload file to Cloudinary first
        setUploads(prev => prev.map(u =>
          u.id === upload.id ? { ...u, status: 'uploading' } : u
        ));

        let cloudinaryUrl = '';
        let publicId = '';

        try {
          const uploadFolder = `trainings/documents`;
          if (!upload.file) throw new Error('File content is missing');
          const uploadResult = await cloudinaryService.uploadDocument(
            upload.file,
            uploadFolder,
            (progress) => {
              // Update progress if needed
              
            }
          );
          cloudinaryUrl = uploadResult.secureUrl;
          publicId = uploadResult.publicId;
          
        } catch (uploadError) {
          console.warn('⚠️ Cloudinary upload failed, attempting fallback to backend storage:', uploadError);
          try {
            if (!upload.file) throw new Error('File content is missing');
            const backendResult = await AIService.uploadDocumentViaBackend(upload.file, currentAnalysisMetadata);
            cloudinaryUrl = backendResult.url;
            publicId = backendResult.publicId;
            
          } catch (fallbackError) {
            console.error('❌ Both Cloudinary and backend fallback failed:', fallbackError);
          }
        }

        // ✅ Vraie analyse avec AI
        if (!upload.file) throw new Error('File content is missing for analysis');
        const analysis = await AIService.analyzeDocument(upload.file, currentAnalysisMetadata);

        setUploads(prev => prev.map(u =>
          u.id === upload.id
            ? {
              ...u,
              status: 'analyzed',
              aiAnalysis: analysis,
              cloudinaryUrl: cloudinaryUrl,
              publicId: publicId
            }
            : u
        ));
      } catch (error: any) {
        console.error('AI Analysis failed:', error);
        const errorMessage = error?.message || 'Analysis failed';
        setUploads(prev => prev.map(u =>
          u.id === upload.id ? {
            ...u,
            status: 'error',
            error: errorMessage
          } : u
        ));
      }
    }

    setIsProcessing(false);
  }, [gigId, company?.id, company?._id]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;

    const isYouTube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    const urlUpload: ContentUpload = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: isYouTube ? 'YouTube Video' : 'Web Page',
      type: isYouTube ? 'video' : 'document',
      status: 'uploading',
      size: 0,
      uploadedAt: new Date().toISOString(),
    } as any;

    setUploads(prev => [...prev, urlUpload]);
    setIsProcessing(true);

    try {
      setUploads(prev => prev.map(u =>
        u.id === urlUpload.id ? { ...u, status: 'processing' } : u
      ));

      const analysis = await AIService.analyzeUrl(urlInput);

      setUploads(prev => prev.map(u =>
        u.id === urlUpload.id
          ? { ...u, status: 'analyzed', aiAnalysis: analysis, name: urlInput }
          : u
      ));

      setUrlInput(''); // Clear input after successful analysis
    } catch (error) {
      console.error('URL Analysis failed:', error);
      setUploads(prev => prev.map(u =>
        u.id === urlUpload.id ? { ...u, status: 'error' } : u
      ));
    }

    setIsProcessing(false);
  }, [urlInput]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const analyzeUpload = async (upload: ContentUpload) => {
    if (!upload.file) {
      console.error('Cannot analyze: file is missing');
      return;
    }

    setUploads(prev => prev.map(u =>
      u.id === upload.id ? { ...u, status: 'processing', error: undefined } : u
    ));
    setIsProcessing(true);

    try {
      const analysis = await AIService.analyzeDocument(upload.file, analysisMetadata);

      setUploads(prev => prev.map(u =>
        u.id === upload.id
          ? {
            ...u,
            status: 'analyzed',
            aiAnalysis: analysis,
            error: undefined
          }
          : u
      ));
    } catch (error: any) {
      console.error('AI Analysis failed:', error);
      const errorMessage = error?.message || 'Analysis failed';
      setUploads(prev => prev.map(u =>
        u.id === upload.id ? {
          ...u,
          status: 'error',
          error: errorMessage
        } : u
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateCurriculum = async () => {
    if (uploads.length === 0 && !gigId) return;

    setIsProcessing(true);
    try {
      let curriculum;
      const analyzedUploads = getAnalyzedUploads();
      const hasUploadSource = analyzedUploads.length > 0;
      const includeKbSource = !!gigId && useKbForPresentation;

      if (hasUploadSource) {
        // Collect all successful analyses
        const allAnalyses = analyzedUploads.map((u) => u.aiAnalysis);

        if (allAnalyses.length === 0) throw new Error('No analyzed content available');

        if (allAnalyses.length > 1) {
          
          curriculum = await AIService.synthesizeAnalyses(allAnalyses as any);
        } else {
          const mainAnalysis = allAnalyses[0];
          if (!mainAnalysis) throw new Error('No analysis found');
          const uploadContext = getUploadContext();

          curriculum = await AIService.generateCurriculum(
            mainAnalysis,
            methodology?.name || 'General',
            undefined,
            uploadContext as any,
            {
              selectedDuration: formatDurationForAi(journey?.estimatedDuration ? String(journey.estimatedDuration) : undefined),
              methodologyName: methodology?.name || 'Methodologie 360',
              methodologyDescription: methodology?.description,
              methodologyComponents: Array.isArray(methodology?.components)
                ? methodology.components.map((c) => c.title).slice(0, 8)
                : [],
              trainingTitle: journey?.name,
              trainingDescription: journey?.description,
            }
          );
        }
      } else {
        // Generate from Gig context (optionally grounded with KB docs + call recordings)
        curriculum = await fetchCurriculumFromGig(includeKbSource);
      }

      setGeneratedCurriculum(curriculum);

      const generationContext = await buildPresentationSourceContext(includeKbSource);
      
      const presentation = normalizePresentationFromApi(
        await AIService.generatePresentation(curriculum, {
          gigId: gigId || undefined,
          useKnowledgeBase: includeKbSource,
          includeCallRecordings: includeKbSource,
          sourceMode: generationContext.sourceMode,
          sourceContext: generationContext,
        })
      );

      if (presentation?.slides?.length) {
        setGeneratedPresentation(presentation);
      } else {
        setGeneratedPresentation(null);
        console.warn('[ContentUploader] No slides to preview after curriculum generation');
      }

      setViewMode('curriculum');
    } catch (error: any) {
      console.error('Failed to generate curriculum/synthesis:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleSavePresentation = async (saveOpts?: { omitModuleTitles?: string[] }) => {
    const buildPresentationFromChat = async () => {
      const assistantMessages = chatMessages
        .filter((m) => m.role === 'assistant' && String(m.text || '').trim())
        .slice(-12);
      if (assistantMessages.length === 0) return null;

      const extractHarxStyleBlueprint = (rawText: string): any | null => {
        const match = String(rawText || '').match(/<harx-style>([\s\S]*?)<\/harx-style>/i);
        if (!match?.[1]) return null;
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      };

      const stripHarxStyleTag = (rawText: string): string =>
        String(rawText || '')
          .replace(/<harx-style>[\s\S]*?<\/harx-style>/gi, '')
          .replace(HARX_TRAINING_STATUS_REGEX, '')
          .trim();

      const latestStyleBlueprint =
        assistantMessages
          .slice()
          .reverse()
          .map((m) => extractHarxStyleBlueprint(String(m.text || '')))
          .find(Boolean) || null;

      let claudeTitle = '';
      try {
        const titleSource = chatMessages
          .filter((m) => String(m.text || '').trim())
          .slice(-16)
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
            text: String(m.text || '').trim(),
          }));
        claudeTitle = await AIService.generateChatTitle(titleSource);
      } catch (titleError) {
        console.warn('[ContentUploader] Failed to generate Claude title for chat slides:', titleError);
      }

      const slides = assistantMessages.map((m, idx) => {
        const raw = stripHarxStyleTag(String(m.text || '').trim());
        const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
        const title = (lines[0] || `Slide ${idx + 1}`).replace(/^#+\s*/, '').slice(0, 120);
        const bullets = lines
          .filter((l) => /^[-•*]\s+/.test(l))
          .map((l) => l.replace(/^[-•*]\s+/, '').trim())
          .slice(0, 6);
        const content = lines
          .filter((l) => !/^[-•*]\s+/.test(l))
          .slice(1, 6)
          .join('\n');

        return {
          id: idx + 1,
          type: 'content',
          title,
          subtitle: '',
          content,
          bullets,
          note: '',
          imageDescription: '',
          illustrationUrl: '',
          visualConfig: {
            layout: 'content',
            theme: 'light',
            accentHex:
              latestStyleBlueprint?.accentColor ||
              latestStyleBlueprint?.titleColor ||
              '#F43F5E',
            backgroundHex:
              latestStyleBlueprint?.moduleCardThemes?.[idx % Math.max(1, latestStyleBlueprint?.moduleCardThemes?.length || 1)]?.bg ||
              '#ffffff',
            textHex:
              latestStyleBlueprint?.moduleCardThemes?.[idx % Math.max(1, latestStyleBlueprint?.moduleCardThemes?.length || 1)]?.text ||
              latestStyleBlueprint?.contentTheme?.bodyColor ||
              '#111827',
          },
        };
      });

      return {
        title: generatedCurriculum?.title || claudeTitle || 'Slides generees depuis le chat',
        totalSlides: slides.length,
        slides,
        estimatedTime: `${Math.max(1, slides.length * 2)} minutes`,
        visualTheme: {
          primaryColor: latestStyleBlueprint?.titleColor || '#1f2937',
          secondaryColor: latestStyleBlueprint?.accentColor || '#F43F5E',
          accentColor:
            latestStyleBlueprint?.contentTheme?.badgeBg ||
            latestStyleBlueprint?.accentColor ||
            '#F43F5E',
          layoutStyle: 'creative',
        },
        harxStyleBlueprint: latestStyleBlueprint || undefined,
      };
    };

    const presentationToSave =
      generatedPresentation?.slides?.length > 0 ? generatedPresentation : await buildPresentationFromChat();
    if (!presentationToSave?.slides?.length) return;

    try {
      setIsSavingCloud(true);
      
      const fileTrainingUrl: string | undefined = undefined;
      setFileTrainingUrl(undefined);

      const journeyToSave: any = {
        title: generatedCurriculum?.title || presentationToSave?.title || 'AI-generated training',
        description: generatedCurriculum?.description || 'AI-generated description',
        status: 'active',
        industry: company?.industry || 'General',
        company: company?.name || 'My Company',
      };

      let modulesToSave: any[] =
        Array.isArray(generatedCurriculum?.modules) && generatedCurriculum.modules.length > 0
          ? (generatedCurriculum.modules || []).map((m: any, idx: number) => ({
              title: m.title || `Module ${idx + 1}`,
              description: m.description || '',
              duration: m.duration || 30,
              difficulty: m.difficulty || 'beginner',
              learningObjectives: m.learningObjectives || [],
              content: m.sections || m.content || [],
              sections: m.sections || [],
              order: idx
            }))
          : [
              {
                title: presentationToSave?.title || 'Slides generees depuis le chat',
                description: 'Contenu de formation validé à partir des slides générées.',
                duration: 30,
                difficulty: 'beginner',
                learningObjectives: [],
                content: presentationToSave.slides || [],
                sections: [],
                order: 0
              }
            ];

      const omitTitles = (saveOpts?.omitModuleTitles || []).map((t) => String(t || '').trim()).filter(Boolean);
      if (omitTitles.length > 0 && Array.isArray(generatedCurriculum?.modules) && generatedCurriculum.modules.length > 0) {
        modulesToSave = modulesToSave.filter((mod: any) => {
          const title = String(mod.title || '').trim();
          if (!title) return true;
          const lower = title.toLowerCase();
          const drop = omitTitles.some((o) => {
            const ot = o.toLowerCase();
            return ot && (lower.includes(ot) || ot.includes(lower));
          });
          return !drop;
        });
        if (modulesToSave.length === 0) {
          alert(
            'Aucun module restant après exclusion. Annulez le filtre ou complétez les modules avant d’enregistrer.'
          );
          return;
        }
      }

      const existingJourneyId =
        (generatedCurriculum as any)?.data?.journeyId ||
        (generatedCurriculum as any)?.journeyId ||
        (generatedCurriculum as any)?._id ||
        (generatedCurriculum as any)?.id;

      const saveResult = await JourneyService.saveJourney(
        journeyToSave,
        modulesToSave,
        company?.id || '',
        gigId || '',
        undefined, // finalExam
        existingJourneyId, // journeyId (update existing when available)
        presentationToSave, // Pass presentation data to be saved in Cloudinary/DB
        fileTrainingUrl
      );

      const persistedId =
        (saveResult?.journeyId as string | undefined) ||
        (saveResult?.journey?._id as string | undefined) ||
        (saveResult?.journey?.id as string | undefined);
      if (persistedId && /^[0-9a-fA-F]{24}$/.test(persistedId)) {
        const d = DraftService.getDraft();
        DraftService.saveDraftLocally({ ...d, draftId: persistedId });
      }

      // On revient à la liste des formations
      if (props.onFinishEarly) {
        props.onFinishEarly(uploads, generatedCurriculum, generatedPresentation, fileTrainingUrl, persistedId);
      } else if (onBack) {
        onBack();
      }
    } catch (error: any) {
      console.error('Failed to save journey:', error);
      alert('Error saving: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSavingCloud(false);
    }
  };

  const generatePresentationFromState = async (regenerate: boolean): Promise<any | null> => {
    if (uploads.length === 0 && !gigId) return null;

    const hasExistingSlides =
      Array.isArray(generatedPresentation?.slides) && generatedPresentation.slides.length > 0;
    if (!regenerate && hasExistingSlides) {
      setIsPreviewOpen(false);
      setWorkspaceTab('artifact');
      return generatedPresentation;
    }

    try {
      setIsGeneratingPresentation(true);
      if (regenerate) {
        setGeneratedPresentation(null);
      }
      

      let curriculum = generatedCurriculum;
      const analyzedUploads = getAnalyzedUploads();
      const hasUploadSource = analyzedUploads.length > 0;
      const includeKbSource = !!gigId && useKbForPresentation;
      const gigOnly = !hasUploadSource && !!gigId;

      if (!curriculum) {
        setIsProcessing(true);

        if (hasUploadSource) {
          const mainAnalysis = analyzedUploads[0]?.aiAnalysis;
          if (!mainAnalysis) throw new Error('No analysis found');

          const uploadContext = getUploadContext();

          curriculum = await AIService.generateCurriculum(
            mainAnalysis,
            methodology?.name || 'General',
            undefined,
            uploadContext as any,
            {
              selectedDuration: formatDurationForAi(journey?.estimatedDuration ? String(journey.estimatedDuration) : undefined),
              methodologyName: methodology?.name || 'Methodologie 360',
              methodologyDescription: methodology?.description,
              methodologyComponents: Array.isArray(methodology?.components)
                ? methodology.components.map((c) => c.title).slice(0, 8)
                : [],
              trainingTitle: journey?.name,
              trainingDescription: journey?.description,
            }
          );
        } else {
          curriculum = await fetchCurriculumFromGig(includeKbSource);
        }

        setGeneratedCurriculum(curriculum);
        setIsProcessing(false);
      } else if (regenerate && gigOnly) {
        setIsProcessing(true);
        curriculum = await fetchCurriculumFromGig(includeKbSource);
        setGeneratedCurriculum(curriculum);
        setIsProcessing(false);
      }

      const generationContext = await buildPresentationSourceContext(includeKbSource);
      const presentation = await AIService.generatePresentation(curriculum, {
        gigId: gigId || undefined,
        useKnowledgeBase: includeKbSource,
        includeCallRecordings: includeKbSource,
        sourceMode: generationContext.sourceMode,
        sourceContext: generationContext,
      });

      const normalized = normalizePresentationFromApi(presentation) || presentation;
      setGeneratedPresentation(normalized);
      setIsPreviewOpen(false);
      setWorkspaceTab('artifact');

      return normalized;
    } catch (error: any) {
      console.error('Failed to generate presentation:', error);
      alert('Error generating presentation: ' + (error.message || 'Unknown error'));
      setIsProcessing(false);
      return null;
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  const handleGeneratePresentation = () => void generatePresentationFromState(false);

  const handleRegeneratePresentation = () => void generatePresentationFromState(true);

  const handleDownloadPptx = async () => {
    if (!generatedPresentation) return;
    try {
      setIsExportingPptx(true);
      const blob = await AIService.exportToPowerPoint(generatedPresentation);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedCurriculum?.title || 'Training'}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'PowerPoint export failed');
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleOpenFullscreenPreview = () => setIsPreviewOpen(true);

  /**
   * Helper to fetch curriculum from Gig KB if no uploads are present
   */
  const fetchCurriculumFromGig = async (includeKbSource: boolean) => {
    if (!gigId) throw new Error('No Gig selected');
    
    return await AIService.generateTrainingFromGig(gigId, {
      useKnowledgeBase: includeKbSource,
      includeCallRecordings: includeKbSource,
      sourceContext: {
        sourceMode: 'gig',
        uploadAnalyses: [],
        knowledgeDocuments: [],
        callRecordings: [],
        gigSnapshot: gigSnapshotForBuilder,
        ...(journey?.estimatedDuration || methodology?.name
          ? {
              preferences: {
                selectedDuration: formatDurationForAi(journey?.estimatedDuration ? String(journey.estimatedDuration) : undefined),
                methodologyName: methodology?.name || 'Methodologie 360',
                methodologyDescription: methodology?.description,
                methodologyComponents: Array.isArray(methodology?.components)
                  ? methodology.components.map((c) => c.title).slice(0, 8)
                  : [],
              },
            }
          : {}),
      } as any,
    });
  };

  const getStatusIcon = (status: ContentUpload['status']) => {
    switch (status) {
      case 'analyzed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Wand2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'uploading':
        return <Wand2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Wand2 className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  const formatDurationForAi = useCallback((raw?: string): string | undefined => {
    if (!raw) return undefined;
    const value = String(raw).trim().toLowerCase();
    const minutes = parseInt(value, 10);
    if (!Number.isNaN(minutes) && minutes > 0) {
      if (minutes < 60) return `${minutes} minutes`;
      const hours = minutes / 60;
      if (hours >= 24) {
        const days = Math.round((hours / 24) * 10) / 10;
        return `${days} jours`;
      }
      const roundedHours = Math.round(hours * 10) / 10;
      return `${roundedHours} heures`;
    }
    return raw;
  }, []);

  const canProceed = (uploads.length > 0 && uploads.every(u => u.status === 'analyzed')) || (uploads.length === 0 && !!gigId);
  const totalAnalyzed = uploads.filter(u => u.status === 'analyzed').length;
  const isGigOnly = uploads.length === 0 && !!gigId;

  if (isPreviewOpen && generatedPresentation && !repOnboardingLayout) {
    return (
      <PresentationPreview
        presentation={generatedPresentation}
        onSave={handleSavePresentation}
        isSaving={isSavingCloud}
        onClose={() => setIsPreviewOpen(false)}
        fileTrainingUrl={fileTrainingUrl}
      />
    );
  }

  if (generatedPresentation && !isPreviewOpen) {
    if (repOnboardingLayout) {
      if (workspaceTab === 'sources') {
        return (
          <div className="flex w-full min-w-0 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setWorkspaceTab('artifact')}
                className="text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-900"
              >
                ← Back to program & slides
              </button>
            </div>
            {renderSourcesUploadUI()}
          </div>
        );
      }

      return (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-extrabold text-gray-900 sm:text-base">
                {generatedCurriculum?.title || generatedPresentation?.title || 'Training'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSavePresentation()}
                disabled={isSavingCloud || !generatedCurriculum}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-3 py-2 text-xs font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isSavingCloud ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save training
              </button>
              <button
                type="button"
                onClick={handleRegeneratePresentation}
                disabled={isGeneratingPresentation}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                {isGeneratingPresentation ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Regenerate slides
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab('sources')}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
              >
                Source files
              </button>
            </div>
          </div>

          <section className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden rounded-none border-0 bg-white shadow-none">
            <PresentationPreview
              presentation={generatedPresentation}
              onClose={onBack}
              fileTrainingUrl={undefined}
              isEmbedded={true}
              showPagination={false}
              hideExportPptx={true}
              embedLightCanvas={true}
              backLabel="Back to setup"
            />
          </section>
        </div>
      );
    }

    return (
      <div className="flex min-h-[85dvh] flex-col bg-gradient-to-b from-slate-50 to-white">
        <div className="flex shrink-0 flex-wrap gap-2 border-b border-gray-200 bg-white px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={() => setWorkspaceTab('artifact')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              workspaceTab === 'artifact'
                ? 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 text-white shadow-md'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Program & slide preview
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab('sources')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              workspaceTab === 'sources'
                ? 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 text-white shadow-md'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Source files
          </button>
        </div>

        {workspaceTab === 'artifact' ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:gap-5 lg:p-4">
            <aside className="flex max-h-[85dvh] flex-col overflow-y-auto rounded-2xl border border-rose-100/80 bg-white p-4 shadow-sm lg:max-h-[calc(100dvh-8rem)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-600">Training program</p>
              <h2 className="mt-1 text-lg font-bold leading-snug text-gray-900">
                {generatedCurriculum?.title || generatedPresentation?.title || 'Generated training'}
              </h2>
              {generatedCurriculum?.description && (
                <p className="mt-2 line-clamp-4 text-sm text-gray-600">{generatedCurriculum.description}</p>
              )}
              <ol className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                {(generatedCurriculum?.modules || []).length === 0 ? (
                  <li className="text-sm text-gray-500">
                    Module list will appear here when the curriculum includes modules. Use the slide preview on the right to review content.
                  </li>
                ) : (
                  (generatedCurriculum?.modules || []).slice(0, 12).map((mod: any, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm text-gray-800">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-fuchsia-100 text-xs font-bold text-fuchsia-800">
                        {idx + 1}
                      </span>
                      <span className="line-clamp-2 font-medium">{mod.title || `Module ${idx + 1}`}</span>
                    </li>
                  ))
                )}
              </ol>
              {generatedCurriculum?.modules && generatedCurriculum.modules.length > 12 && (
                <p className="mt-2 text-xs text-gray-500">+{generatedCurriculum.modules.length - 12} more modules</p>
              )}

              <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleRegeneratePresentation}
                  disabled={isGeneratingPresentation}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-rose-200 px-3 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                >
                  {isGeneratingPresentation ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Regenerate presentation
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPptx}
                  disabled={isExportingPptx}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50/80 px-3 py-2.5 text-sm font-bold text-fuchsia-900 transition-colors hover:bg-fuchsia-100 disabled:opacity-50"
                >
                  {isExportingPptx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Download .pptx
                </button>
                <button
                  type="button"
                  onClick={handleOpenFullscreenPreview}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
                >
                  <Maximize2 className="h-4 w-4" />
                  Open fullscreen
                </button>
                {/* <button
                  type="button"
                  onClick={() => onComplete(uploads, fileTrainingUrl)}
                  disabled={!canProceed}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-3 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  Continue to AI enhancement
                  <Wand2 className="h-4 w-4" />
                </button> */}
                <button
                  type="button"
                  onClick={onBack}
                  className="text-center text-sm font-semibold text-gray-500 hover:text-gray-800"
                >
                  Back to setup
                </button>
              </div>
            </aside>

            <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-rose-100/80 bg-slate-100 shadow-inner lg:min-h-[calc(100dvh-8rem)]">
              <PresentationPreview
                presentation={generatedPresentation}
                onSave={handleSavePresentation}
                isSaving={isSavingCloud}
                onClose={() => setWorkspaceTab('sources')}
                fileTrainingUrl={fileTrainingUrl}
                isEmbedded={true}
                showPagination={true}
              />
            </section>
          </div>
        ) : (
          renderSourcesUploadUI()
        )}
      </div>
    );
  }

  if (viewMode === 'curriculum' && generatedCurriculum) {
    return (
      <div className="min-h-full p-2 md:p-4">
        <div className="max-w-5xl mx-auto bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
          <button
            onClick={() => setViewMode('upload')}
            className="flex items-center text-purple-600 font-medium mb-6 hover:text-purple-800 transition-colors"
          >
            <X className="h-5 w-5 mr-1" /> Back to files
          </button>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-rose-500 to-purple-600 p-8 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <Sparkles className="h-8 w-8 text-yellow-300" />
                <h2 className="text-3xl font-extrabold">{generatedCurriculum.title}</h2>
              </div>
              <p className="text-pink-100 text-lg max-w-3xl">{generatedCurriculum.description}</p>
              <div className="mt-6 flex items-center space-x-6 text-sm font-medium">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 opacity-80" />
                  {generatedCurriculum.totalDuration / 60} hours total
                </div>
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 opacity-80" />
                  {generatedCurriculum.modules?.length} Modules
                </div>
                {generatedPresentation && (
                  <div className="flex items-center text-yellow-300">
                    <FileIcon className="h-5 w-5 mr-2" />
                    Presentation available
                  </div>
                )}
              </div>
            </div>

            <div className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <FileText className="h-6 w-6 mr-2 text-purple-500" /> Program structure
              </h3>

              <div className="space-y-6">
                {generatedCurriculum.modules?.map((module: any, idx: number) => (
                  <div key={idx} className="group relative bg-white/40 rounded-2xl p-6 border border-gray-100/50 hover:border-purple-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-600 text-white text-sm font-bold mr-3">
                            {idx + 1}
                          </span>
                          <h4 className="text-lg font-bold text-gray-900">{module.title}</h4>
                        </div>
                        <p className="text-gray-600 mb-4 ml-11">{module.description}</p>

                        <div className="ml-11 flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                            <Clock className="h-4 w-4 mr-1.5 text-purple-500" /> {module.duration} min
                          </div>
                          <div className="flex items-center text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                            <Zap className="h-4 w-4 mr-1.5 text-orange-500" /> {module.difficulty || 'Medium'}
                          </div>
                        </div>

                        {module.learningObjectives?.length > 0 && (
                          <div className="mt-4 ml-11">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Learning objectives</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {module.learningObjectives.map((obj: string, i: number) => (
                                <div key={i} className="flex items-start text-sm text-gray-600">
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                                  {obj}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isGigOnly && null}

              <div className="mt-10 flex flex-col md:flex-row justify-center gap-4">
                <button
                  onClick={handleGeneratePresentation}
                  disabled={isGeneratingPresentation}
                  className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-md transition-all flex items-center justify-center ${generatedPresentation
                    ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 hover:shadow-lg'
                    }`}
                >
                  {isGeneratingPresentation ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating…
                    </>
                  ) : generatedPresentation ? (
                    <>
                      <Presentation className="mr-2 h-5 w-5" />
                      View presentation
                    </>
                  ) : (
                    <>
                      <FileIcon className="mr-2 h-5 w-5" />
                      Generate presentation
                    </>
                  )}
                </button>

                <button
                  onClick={() => void handleSavePresentation()}
                  disabled={isSavingCloud}
                  className="px-10 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center"
                >
                  {isSavingCloud ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Approve program
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSourcesUploadUI() {
    const rep = repOnboardingLayout;
    const displayName = String(company?.name || 'QARA EL HOUCINE').toUpperCase();
    const hasStartedChat = chatMessages.length > 0;
    const repSplitLayout = rep && hasStartedChat;
    const shouldShowKbQuestionInChat = false;
    const shouldShowChatThread = !showRepSourcePopup;
    // In REP split chat mode, keep only the chat workspace visible (actions moved into top toolbar).
    const showRepSplitSidebar = false;
    const kbOptions: Array<{ id: KbGenerationMode; label: string; hint: string }> = [
      { id: 'kb_only', label: 'KB only', hint: 'Use analyzed knowledge base documents only' },
      { id: 'uploads_only', label: 'Uploaded files only', hint: 'Use only your attached files' },
      { id: 'kb_and_uploads', label: 'KB + uploaded files', hint: 'Combine knowledge base and uploaded files' },
      { id: 'none', label: 'No documents', hint: 'Generate without KB or analyzed files' },
    ];
    const personalizationQuestions: Array<{
      key: 'level' | 'objective' | 'format';
      question: string;
      options: string[];
    }> = [
      {
        key: 'level',
        question: 'What is your current level?',
        options: ['Complete beginner', 'Some basics', 'Intermediate', 'Advanced'],
      },
      {
        key: 'objective',
        question: 'What is your main objective?',
        options: [
          'Understand the fundamentals',
          'Sell the product better',
          'Handle practical use cases',
          'Prepare for certification',
        ],
      },
      {
        key: 'format',
        question: 'Which format do you prefer?',
        options: [
          'Structured training plan',
          'Practical cases + exercises',
          'Interactive workshop format',
          'Quick reference sheet format',
        ],
      },
    ];
    const handleSelectKbMode = (mode: KbGenerationMode) => {
      setShowRepSourcePopup(false);
      setKbGenerationChoice(mode);
      if (mode === 'none' || mode === 'uploads_only' || mode === 'kb_and_uploads') {
        // These modes should not trigger any automatic flow.
        // Keep the chat idle and wait for the user's manual prompt.
        setShowPersonalizationCard(false);
        setPersonalizationStep(0);
        setPersonalizationAnswers({});
        window.requestAnimationFrame(() => {
          chatTextareaRef.current?.focus();
        });
        return;
      }
      setShowPersonalizationCard(true);
      setPersonalizationStep(0);
      setPersonalizationAnswers({});
      window.requestAnimationFrame(() => {
        chatTextareaRef.current?.focus();
      });
    };
    const handleSelectPersonalizationOption = (value: string) => {
      const current = personalizationQuestions[personalizationStep];
      if (!current) return;
      const nextAnswers = { ...personalizationAnswers, [current.key]: value };
      setPersonalizationAnswers(nextAnswers);
      if (personalizationStep >= personalizationQuestions.length - 1) {
        if (nextAnswers.level && nextAnswers.objective && nextAnswers.format) {
          const summary = [
            'A few questions to personalize your training',
            'Q: What is your current level?',
            `R : ${nextAnswers.level}`,
            'Q: What is your main objective?',
            `R : ${nextAnswers.objective}`,
            'Q: Which format do you prefer?',
            `R : ${nextAnswers.format}`,
          ].join('\n');
          setShowPersonalizationCard(false);
          setPersonalizationStep(0);
          void sendChatMessage(summary);
        }
        return;
      }
      setPersonalizationStep((prev) => prev + 1);
    };
    const appendChatMessage = (
      role: 'user' | 'assistant',
      text: string,
      extra: Partial<{ isStreaming: boolean }> = {}
    ) => {
      const id = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setChatMessages((prev) => [
        ...prev,
        { id, role, text, ...extra },
      ]);
      return id;
    };

    const startNewConversation = () => {
      // Hard reset chat + generated artifacts so next generations are based only on the new chat.
      setChatMessages([]);
      setChatInput('');
      setUploads([]);
      setChatUploadedSources([]);
      setShowRepSourcePopup(repOnboardingLayout);
      setActiveChatSessionId(null);
      setIsHistoryOpen(false);
      setKbGenerationChoice(null);
      setChatKbDocuments([]);
      setShowPersonalizationCard(false);
      setPersonalizationStep(0);
      setPersonalizationAnswers({});
      setGeneratedCurriculum(null);
      setGeneratedPresentation(null);
      setGeneratedImageSet(null);
      setImageGenerationStatus('idle');
      setImageGenerationJobId(null);
      setImageGenerationCompleted(0);
      setImageGenerationTotal(0);
      setPodcastScript('');
      setPodcastError(null);
      setPodcastSavedHint(null);
      setCurrentSavedPodcastId(null);
      setShowPodcastModal(false);
      lastPodcastGenChatLengthRef.current = 0;
    };

    const openHistorySession = async (sessionId: string) => {
      if (!sessionId || isChatLoading) return;
      setIsHistoryLoading(true);
      try {
        const session = await AIService.getChatSession(sessionId);
        if (!session) return;
        const mappedMessages = (session.messages || []).map((m, idx) => {
          const raw = m.text || '';
          const { displayText, trainingReadiness } = extractTrainingReadinessBlock(raw);
          return {
            id: `history-${sessionId}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
            text: displayText,
            trainingReadiness: trainingReadiness || undefined,
            isStreaming: false,
          };
        });
        setChatMessages(mappedMessages);
        setActiveChatSessionId(session._id || sessionId);
        setIsHistoryOpen(false);
        lastPodcastGenChatLengthRef.current = 0;
      } catch (error) {
        console.error('[ContentUploader] Failed to open history session:', error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    const generationPreferences = {
      selectedDuration: formatDurationForAi(journey?.estimatedDuration ? String(journey.estimatedDuration) : undefined),
      methodologyName: methodology?.name || 'Methodologie 360',
      methodologyDescription: methodology?.description,
      methodologyComponents: Array.isArray(methodology?.components)
        ? methodology.components.map((c) => c.title).slice(0, 8)
        : [],
      trainingTitle: journey?.name,
      trainingDescription: journey?.description,
    };

    const parseTrainingPlan = (rawText: string): {
      title?: string;
      intro?: string;
      modules: Array<{ title: string; duration?: string; bullets: string[] }>;
    } => {
      const lines = String(rawText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const clean = (v: string) =>
        v
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/^\*+|\*+$/g, '')
          .replace(/^#+\s*/, '')
          .replace(/^[-•*]\s*/, '')
          .trim();

      const titleLine = lines.find((line) => /plan de formation|training plan/i.test(line));
      const introLines: string[] = [];
      const modules: Array<{ title: string; duration?: string; bullets: string[] }> = [];
      let current: { title: string; duration?: string; bullets: string[] } | null = null;

      for (const line of lines) {
        const normalized = clean(line);
        const moduleMatch = normalized.match(/^module\s*\d+\s*[—:-]?\s*(.+)$/i);
        if (moduleMatch) {
          if (current) modules.push(current);
          current = {
            title: `Module ${modules.length + 1} - ${moduleMatch[1].trim()}`,
            bullets: [],
          };
          continue;
        }
        if (!current) {
          if (
            normalized &&
            !/^(plan de formation|training plan)/i.test(normalized) &&
            !/^module\s*\d+/i.test(normalized)
          ) {
            introLines.push(normalized);
          }
          continue;
        }

        const durationMatch = normalized.match(/^(dur[ée]e?|duration)\s*[:\-]\s*(.+)$/i);
        if (durationMatch) {
          current.duration = durationMatch[2].trim();
          continue;
        }

        if (/^[-•*]\s+/.test(line) || normalized.includes(':')) {
          const stripped = normalized
            .replace(/^(objectifs?|objectives?)\s*:\s*/i, '')
            .replace(/^(contenu|content)\s*:\s*/i, '')
            .trim();
          const lower = stripped.toLowerCase();
          if (!stripped) continue;
          if (['objectif', 'objectifs', 'contenu', 'content'].includes(lower)) continue;
          current.bullets.push(stripped);
        }
      }

      if (current) modules.push(current);
      return {
        title: titleLine ? clean(titleLine) : undefined,
        intro: introLines.slice(0, 2).join(' '),
        modules,
      };
    };

    const extractStyleBlueprint = (rawText: string): {
      moduleCardThemes: Array<{ bg: string; border: string; text?: string }>;
      titleColor?: string;
      accentColor?: string;
      contentTheme?: {
        bodyColor: string;
        headingColor: string;
        tableBorder: string;
        tableHeaderBg: string;
        tableHeaderText: string;
        tableRowBg: string;
        kpiBg: string;
        kpiBorder: string;
        kpiLabel: string;
        kpiValue: string;
        moduleShape: 'rounded' | 'square' | 'soft';
        panelBg: string;
        panelBorder: string;
        badgeBg: string;
        badgeText: string;
      };
    } => {
      const isHex = (v: unknown) => typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
      const safeHex = (v: unknown, fallback: string) => (isHex(v) ? String(v) : fallback);
      const fallbackPalettes = [
        {
          moduleCardThemes: [
            { bg: '#eafbf5', border: '#9ddfc8', text: '#153427' },
            { bg: '#ecf8ff', border: '#9ecde7', text: '#163043' },
            { bg: '#f3f1ff', border: '#c2b9ef', text: '#2a2352' },
            { bg: '#fff5eb', border: '#efc998', text: '#402a12' },
          ],
          titleColor: '#102033',
          accentColor: '#0ea5a0',
          contentTheme: {
            bodyColor: '#1c2a33',
            headingColor: '#0f2138',
            tableBorder: '#c9e4de',
            tableHeaderBg: '#e6f8f4',
            tableHeaderText: '#10313a',
            tableRowBg: '#f9fffd',
            kpiBg: '#ecfbf7',
            kpiBorder: '#c8ece1',
            kpiLabel: '#2f6f67',
            kpiValue: '#11353b',
            moduleShape: 'soft' as const,
            panelBg: '#f4fffc',
            panelBorder: '#cdece4',
            badgeBg: '#e5f8f2',
            badgeText: '#0f766e',
          },
        },
        {
          moduleCardThemes: [
            { bg: '#f2f5ff', border: '#b8c8f5', text: '#1b2a4a' },
            { bg: '#eef8ff', border: '#b8d8ee', text: '#1a3347' },
            { bg: '#f7f2ff', border: '#d0baf0', text: '#34244f' },
            { bg: '#fff5f7', border: '#efbfd0', text: '#4a2030' },
          ],
          titleColor: '#15233f',
          accentColor: '#6366f1',
          contentTheme: {
            bodyColor: '#1f2d3f',
            headingColor: '#112241',
            tableBorder: '#d1d9ee',
            tableHeaderBg: '#eaf0ff',
            tableHeaderText: '#13274a',
            tableRowBg: '#fbfcff',
            kpiBg: '#eef2ff',
            kpiBorder: '#d4dcf4',
            kpiLabel: '#4d5f95',
            kpiValue: '#1a2d4d',
            moduleShape: 'rounded' as const,
            panelBg: '#f8faff',
            panelBorder: '#d8e0f6',
            badgeBg: '#e8eeff',
            badgeText: '#3949ab',
          },
        },
        {
          moduleCardThemes: [
            { bg: '#fff8ea', border: '#efd7aa', text: '#352814' },
            { bg: '#fff2df', border: '#efc58b', text: '#3c260f' },
            { bg: '#fff9f1', border: '#ebd4b2', text: '#362918' },
            { bg: '#f5f9ed', border: '#cfe2a5', text: '#25341a' },
          ],
          titleColor: '#1b2238',
          accentColor: '#f59e0b',
          contentTheme: {
            bodyColor: '#2d2419',
            headingColor: '#1a2440',
            tableBorder: '#e7d9bd',
            tableHeaderBg: '#fff3de',
            tableHeaderText: '#2a2218',
            tableRowBg: '#fffaf2',
            kpiBg: '#fff6e9',
            kpiBorder: '#ecd8b3',
            kpiLabel: '#8b6a32',
            kpiValue: '#2e2618',
            moduleShape: 'soft' as const,
            panelBg: '#fffbf3',
            panelBorder: '#ecdab8',
            badgeBg: '#fff1da',
            badgeText: '#b86f09',
          },
        },
      ];
      const hash = String(rawText || '')
        .split('')
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const defaults = fallbackPalettes[hash % fallbackPalettes.length];

      const match = String(rawText || '').match(/<harx-style>([\s\S]*?)<\/harx-style>/i);
      if (!match?.[1]) return defaults;
      try {
        const parsed = JSON.parse(match[1]);
        const themes = Array.isArray(parsed?.moduleCardThemes)
          ? parsed.moduleCardThemes
              .filter((t: any) => typeof t?.bg === 'string' && typeof t?.border === 'string')
              .map((t: any) => ({
                bg: safeHex(t.bg, '#f9f9f9'),
                border: safeHex(t.border, '#dddddd'),
                text: isHex(t?.text) ? t.text : '#1f1d18',
              }))
          : [];
        const contentTheme = parsed?.contentTheme && typeof parsed.contentTheme === 'object'
          ? {
              bodyColor: safeHex(parsed.contentTheme.bodyColor, defaults.contentTheme.bodyColor),
              headingColor: safeHex(parsed.contentTheme.headingColor, defaults.contentTheme.headingColor),
              tableBorder: safeHex(parsed.contentTheme.tableBorder, defaults.contentTheme.tableBorder),
              tableHeaderBg: safeHex(parsed.contentTheme.tableHeaderBg, defaults.contentTheme.tableHeaderBg),
              tableHeaderText: safeHex(parsed.contentTheme.tableHeaderText, defaults.contentTheme.tableHeaderText),
              tableRowBg: safeHex(parsed.contentTheme.tableRowBg, defaults.contentTheme.tableRowBg),
              kpiBg: safeHex(parsed.contentTheme.kpiBg, defaults.contentTheme.kpiBg),
              kpiBorder: safeHex(parsed.contentTheme.kpiBorder, defaults.contentTheme.kpiBorder),
              kpiLabel: safeHex(parsed.contentTheme.kpiLabel, defaults.contentTheme.kpiLabel),
              kpiValue: safeHex(parsed.contentTheme.kpiValue, defaults.contentTheme.kpiValue),
              panelBg: safeHex(parsed.contentTheme.panelBg, defaults.contentTheme.panelBg),
              panelBorder: safeHex(parsed.contentTheme.panelBorder, defaults.contentTheme.panelBorder),
              badgeBg: safeHex(parsed.contentTheme.badgeBg, defaults.contentTheme.badgeBg),
              badgeText: safeHex(parsed.contentTheme.badgeText, defaults.contentTheme.badgeText),
              moduleShape:
                parsed.contentTheme.moduleShape === 'square' || parsed.contentTheme.moduleShape === 'soft'
                  ? parsed.contentTheme.moduleShape
                  : 'rounded',
            }
          : defaults.contentTheme;
        return {
          moduleCardThemes: themes.length > 0 ? themes : defaults.moduleCardThemes,
          titleColor: safeHex(parsed?.titleColor, defaults.titleColor),
          accentColor: safeHex(parsed?.accentColor, defaults.accentColor),
          contentTheme,
        };
      } catch {
        return defaults;
      }
    };

    const stripStyleBlueprint = (rawText: string): string =>
      String(rawText || '').replace(/<harx-style>[\s\S]*?<\/harx-style>/gi, '').trim();

    const stripResourceSections = (rawText: string): string => {
      const lines = String(rawText || '').split('\n');
      const blockHeader = /^(supports?\s*(et|&)\s*ressources?|documents?\s+fournis|[ée]quipement\s+n[ée]cessaire)\s*:?\s*$/i;
      const isBulletOrIndented = (line: string) => /^\s*([-•*]|\d+\.)\s+/.test(line) || /^\s{2,}\S+/.test(line);

      const filtered: string[] = [];
      let skipping = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!skipping && blockHeader.test(trimmed)) {
          skipping = true;
          continue;
        }
        if (skipping) {
          if (!trimmed) {
            skipping = false;
          } else if (isBulletOrIndented(line)) {
            continue;
          } else {
            skipping = false;
          }
        }
        if (!skipping) filtered.push(line);
      }
      return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    const stripPromptEcho = (rawText: string): string => {
      const lines = String(rawText || '').split('\n');
      const instructionLine =
        /^(d[ée]taille\s+le\s+module|donne\s+une\s+explication\s+p[ée]dagogique|conserve\s+la\s+dur[ée]e|n['’]utilise\s+pas\s+de\s+format\s+slides|points\s+du\s+module)/i;
      const cleaned = lines.filter((line) => !instructionLine.test(line.trim()));
      return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    const handleChatSubmit = async () => {
      const message = chatInput.trim();
      if (!message || isChatLoading) return;
      setChatInput('');
      setShowRepSourcePopup(false);
      await sendChatMessage(message);
    };

    const sendChatMessage = async (
      message: string,
      options?: {
        appendUser?: boolean;
        replaceAssistantId?: string;
        historyMessages?: Array<{ id: string; role: 'user' | 'assistant'; text: string; isStreaming?: boolean }>;
      }
    ) => {
      const cleanMessage = message.trim();
      if (!cleanMessage || isChatLoading) return;
      const shouldAppendUser = options?.appendUser !== false;
      if (shouldAppendUser) {
        appendChatMessage('user', cleanMessage);
      }
      setIsChatLoading(true);

      try {
        const analyzedUploads = uploads
          .filter((u) => u.status === 'analyzed')
          .map((u) => ({
            keyTopics: u.aiAnalysis?.keyTopics || [],
            objectives: u.aiAnalysis?.learningObjectives || [],
          }));
        const mergeUploadSources = (
          prev: Array<{ keyTopics: string[]; objectives: string[] }>,
          next: Array<{ keyTopics: string[]; objectives: string[] }>
        ) => {
          const fingerprint = (entry: { keyTopics: string[]; objectives: string[] }) =>
            `${(entry.keyTopics || []).join('|')}::${(entry.objectives || []).join('|')}`;
          const out = [...prev];
          const seen = new Set(prev.map(fingerprint));
          next.forEach((entry) => {
            const key = fingerprint(entry);
            if (!seen.has(key)) {
              seen.add(key);
              out.push(entry);
            }
          });
          return out;
        };
        const effectiveAnalyzedUploads = mergeUploadSources(chatUploadedSources, analyzedUploads);
        if (analyzedUploads.length > 0) {
          setChatUploadedSources((prev) => mergeUploadSources(prev, analyzedUploads));
        }

        const hasKbForChat = chatKbDocuments.length > 0;
        const hasUploadsForChat = effectiveAnalyzedUploads.length > 0;
        const effectiveGenerationMode: KbGenerationMode =
          hasKbForChat && hasUploadsForChat
            ? 'kb_and_uploads'
            : hasKbForChat
              ? 'kb_only'
              : hasUploadsForChat
                ? 'uploads_only'
                : 'none';
        const usesKbForChat = hasKbForChat;
        const usesUploadsForChat = hasUploadsForChat;
        const uploadsForChat = usesUploadsForChat ? effectiveAnalyzedUploads : [];

        const sourceHistory = options?.historyMessages || chatMessages;
        const historyForContext = sourceHistory
          .filter((m) => m.id !== options?.replaceAssistantId)
          .filter((m) => m.text?.trim())
          .slice(-8)
          .map((m) => ({
            role: m.role,
            text: m.text,
          }));

        const kbDocsSummary =
          usesKbForChat
            ? chatKbDocuments.slice(0, 20).map((doc) => ({
                id: doc._id,
                name: doc.name,
                summary: doc.summary || '',
                keyTerms: Array.isArray(doc.keyTerms) ? doc.keyTerms.slice(0, 10) : [],
              }))
            : [];

        const chatGigRow = companyGigs.find((g: any) => String(g?._id || g?.id || '') === String(activeChatGigId));
        const chatGigSnapshot = chatGigRow ? buildGigSnapshotForAi(chatGigRow) : null;

        const chatContext = JSON.stringify({
          app: 'HARX Journey Builder',
          selectedGigId: activeChatGigId || '',
          selectedGigTitle: activeChatGigTitle,
          gigSnapshot: chatGigSnapshot,
          gigAnchoringRequired: !!activeChatGigId,
          chatStyle: 'free_chat',
          generationMode: effectiveGenerationMode,
          analyzedUploadsCount: uploadsForChat.length,
          analyzedUploads: uploadsForChat,
          useKnowledgeBase: usesKbForChat,
          useUploadedDocuments: usesUploadsForChat,
          knowledgeBaseDocumentsCount: kbDocsSummary.length,
          knowledgeBaseDocuments: kbDocsSummary,
          selectedDuration: generationPreferences.selectedDuration,
          selectedMethodology: generationPreferences.methodologyName,
          conversationHistory: historyForContext,
          canGenerateTraining: canProceed,
          curriculumOutline: Array.isArray(generatedCurriculum?.modules)
            ? (generatedCurriculum.modules as any[]).map((m) => ({
                title: String(m?.title || '').trim(),
                hasSections: Array.isArray(m?.sections) && m.sections.length > 0,
                sectionCount: Array.isArray(m?.sections) ? m.sections.length : 0,
              }))
            : [],
        });

        const streamingAssistantId = options?.replaceAssistantId || appendChatMessage('assistant', '', { isStreaming: true });
        if (options?.replaceAssistantId) {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === options.replaceAssistantId
                ? { ...m, text: '', isStreaming: true, trainingReadiness: undefined }
                : m
            )
          );
        }
        const companyId = company?.id || company?._id ? String(company?.id || company?._id) : undefined;
        const streamResult = await AIService.chatStream(cleanMessage, chatContext, (chunk) => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === streamingAssistantId
                ? { ...m, text: `${m.text}${chunk}` }
                : m
            )
          );
        }, {
          gigId: activeChatGigId ? String(activeChatGigId) : undefined,
          companyId,
          sessionId: activeChatSessionId || undefined,
        });
        if (streamResult.sessionId && streamResult.sessionId !== activeChatSessionId) {
          setActiveChatSessionId(streamResult.sessionId);
        }
        const rawAssistant = streamResult.text?.trim() || "Je n'ai pas pu generer une reponse pour le moment.";
        const { displayText, trainingReadiness } = extractTrainingReadinessBlock(rawAssistant);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === streamingAssistantId
              ? {
                  ...m,
                  text: displayText,
                  trainingReadiness: trainingReadiness || undefined,
                  isStreaming: false,
                }
              : m
          )
        );
        if (analyzedUploads.length > 0) {
          // Files were already captured for this chat context; keep input clean for next prompts.
          setUploads([]);
        }
        void refreshChatHistory();
      } catch (error: any) {
        console.error('[ContentUploader] Chat backend call failed:', error);
        appendChatMessage(
          'assistant',
          error?.message
            ? `Erreur backend: ${error.message}`
            : "Impossible de contacter le backend Claude pour l'instant."
        );
      } finally {
        setIsChatLoading(false);
      }
    };

    const handleRegenerateMessage = async (assistantId: string) => {
      const assistantIndex = chatMessages.findIndex((m) => m.id === assistantId && m.role === 'assistant');
      if (assistantIndex < 0) return;

      // Keep history only up to the message being regenerated.
      const truncatedHistory = chatMessages.slice(0, assistantIndex + 1);
      setChatMessages(truncatedHistory);

      for (let i = assistantIndex - 1; i >= 0; i -= 1) {
        const candidate = truncatedHistory[i];
        if (candidate.role === 'user' && candidate.text.trim()) {
          await sendChatMessage(candidate.text, {
            appendUser: false,
            replaceAssistantId: assistantId,
            historyMessages: truncatedHistory.slice(0, assistantIndex),
          });
          return;
        }
      }
    };

    const openImagePresentationModal = () => {
      const candidate =
        generatedImageSet?.items?.length ? generatedImageSet : null;
      if (!candidate) return;
      setActiveImageSet(candidate);
      setActiveImageIndex(0);
      setShowImagePresentationModal(true);
    };

    const handleGenerateQuizFromChat = async () => {
      if (isQuizGenerating) return;
      const chatDigest = chatMessages
        .slice(-14)
        .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.text}`)
        .join('\n\n')
        .trim();
      if (!chatDigest) return;
      try {
        setIsQuizGenerating(true);
        const questions = await AIService.generateQuiz(chatDigest, 8);
        setQuizQuestions(Array.isArray(questions) ? questions : []);
        setShowQuizModal(true);
      } catch (e: any) {
        console.error('[ContentUploader] Quiz generation failed:', e);
        alert(e?.message || 'Unable to generate quiz right now.');
      } finally {
        setIsQuizGenerating(false);
      }
    };

    const anchoredChoiceUi = false;

    const renderComposerBody = () => (
      <>
        <input
          ref={chatFileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              setShowRepSourcePopup(false);
              void handleFileUpload(files);
            }
            e.currentTarget.value = '';
          }}
          className="hidden"
        />
        {uploads.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploads.map((upload) => {
              const statusLabel =
                upload.status === 'analyzed'
                  ? 'Analyzed'
                  : upload.status === 'error'
                    ? 'Error'
                    : upload.status === 'uploading'
                      ? 'Uploading...'
                      : 'Analyzing...';
              return (
                <div
                  key={`inline-${upload.id}`}
                  className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5"
                >
                  {getFileIcon(upload.type, true)}
                  <div className="min-w-0">
                    <div className="max-w-[210px] truncate text-[11px] font-semibold text-slate-800">
                      {upload.name}
                    </div>
                    <div className="text-[10px] text-slate-600">{statusLabel}</div>
                  </div>
                  {upload.status === 'uploading' || upload.status === 'processing' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-harx-500" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeUpload(upload.id)}
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200/80"
                    title="Remove file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <textarea
          ref={chatTextareaRef}
          value={chatInput}
          disabled={isChatLoading}
          onChange={(e) => setChatInput(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = '0px';
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleChatSubmit();
            }
          }}
          rows={1}
          placeholder={hasStartedChat ? 'Reply...' : 'How can I help you?'}
          className="mb-3 w-full resize-none bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => chatFileInputRef.current?.click()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            title="Upload files"
          >
            +
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleChatSubmit()}
              disabled={!chatInput.trim() || isChatLoading}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-harx px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              title="Send"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>
      </>
    );

    return (
    <div className={rep ? 'flex w-full min-w-0 flex-col bg-white' : 'min-h-[92vh] bg-white p-2'}>
      <div
        className={
          rep
            ? repSplitLayout
              ? 'mx-auto flex w-full max-w-[min(100%,1680px)] flex-col px-2 py-4 md:px-4'
              : 'mx-auto flex w-full max-w-5xl flex-col px-4 py-6 md:px-6'
            : 'mx-auto w-full max-w-[1400px]'
        }
      >
        <div
          className={
            rep
              ? 'flex w-full flex-col'
              : 'w-full flex-1 rounded-3xl border border-slate-200/90 bg-white p-2 shadow-sm md:p-3'
          }
        >
          <div
            className={
              repSplitLayout
                ? 'flex min-h-[72vh] w-full flex-col-reverse gap-3 lg:h-[calc(100dvh-5.5rem)] lg:flex-row lg:items-stretch lg:gap-4 lg:overflow-hidden'
                : rep
                  ? 'flex min-h-[72vh] w-full flex-col'
                  : 'grid min-h-[88vh] gap-3 lg:grid-cols-[265px_minmax(0,1fr)]'
            }
          >
          {!rep && (
            <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 px-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-harx-600">HARX</div>
                <div className="text-xl font-semibold tracking-tight text-slate-900">Journey chat</div>
              </div>
              <button
                type="button"
                onClick={startNewConversation}
                className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-harx px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-harx-500/20 transition hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
                New conversation
              </button>
              <button
                type="button"
                className="mb-4 inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white"
              >
                <Search className="h-4 w-4 text-slate-500" />
                Search
              </button>
              <div className="mb-3 space-y-0.5 px-1 text-sm text-slate-700">
                <div className="rounded-lg px-2 py-1.5 font-medium hover:bg-slate-100">Chats</div>
                <div className="rounded-lg px-2 py-1.5 font-medium hover:bg-slate-100">Projects</div>
                <div className="rounded-lg px-2 py-1.5 font-medium hover:bg-slate-100">Artefacts</div>
              </div>
              <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Recent</div>
              <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
                {isLoadingCompanyGigs ? (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-harx-500" />
                    Loading...
                  </div>
                ) : companyGigs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">
                    No project available.
                  </div>
                ) : (
                  companyGigs.map((gig: any) => {
                    const id = String(gig?._id || gig?.id || '');
                    const active = !!activeChatGigId && id === String(activeChatGigId);
                    return (
                      <button
                        key={id || gig?.title}
                        type="button"
                        onClick={() => setSelectedChatGigId(id)}
                        className={`rounded-lg border px-2.5 py-2 text-left transition ${
                          active
                            ? 'border-harx-300 bg-harx-50/60 shadow-sm ring-1 ring-harx-200/50'
                            : 'border-transparent bg-slate-50/80 text-slate-800 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="truncate text-sm font-semibold">{gig?.title || 'Untitled project'}</div>
                        {gig?.category ? (
                          <div className="truncate text-[11px] text-slate-500">{gig.category}</div>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-auto border-t border-slate-200 px-2 pt-3">
                <div className="text-sm font-semibold text-slate-900">{displayName}</div>
                <div className="text-xs text-slate-500">HARX Training</div>
              </div>
            </aside>
          )}
          {repSplitLayout && showRepSplitSidebar && (
            <aside className="flex w-full shrink-0 flex-col gap-3 lg:h-full lg:w-[min(420px,38vw)] lg:min-w-[280px] lg:pr-1">
              <div className="rounded-2xl border border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50/90 to-white p-3 shadow-sm">
                <RepPodcastSidebarPanel
                  hasScript={!!podcastScript.trim()}
                  isGenerating={isPodcastGenerating}
                  disableGenerateExtra={isChatLoading}
                  canGenerateFromTraining={showRepPodcastPanel}
                  hasSavedVersion={!!currentSavedPodcastId}
                  isSpeaking={isPodcastSpeaking}
                  error={podcastError}
                  title={podcastTitle}
                  onTitleChange={setPodcastTitle}
                  onSave={() => void handleSavePodcast()}
                  isSaving={isPodcastSaving}
                  savedHint={podcastSavedHint}
                  onGenerate={() => void handleGeneratePodcastScript()}
                  onPlay={() => void handlePlayPodcastSpeak()}
                  onStop={handleStopPodcastSpeak}
                  savedPodcasts={savedPodcasts}
                  isSavedPodcastsLoading={isSavedPodcastsLoading}
                  onRefreshSavedPodcasts={() => void refreshSavedPodcasts()}
                  onLoadSavedPodcast={(podcast) => {
                    setPodcastScript(String(podcast.script || '').trim());
                    setPodcastTitle(String(podcast.title || ''));
                    setCurrentSavedPodcastId(String(podcast._id || ''));
                    setPodcastSavedHint(`Loaded: ${podcast.title || 'Podcast'}`);
                    setPodcastError(null);
                  }}
                  imagePrompt={imagePrompt}
                  onImagePromptChange={setImagePrompt}
                  onGenerateImages={() => void handleGenerateTrainingImages()}
                  isImagesGenerating={isImagesGenerating}
                  imageGenerationStatus={imageGenerationStatus}
                  imageProgressLabel={imageGenerationTotal > 0 ? `${imageGenerationCompleted}/${imageGenerationTotal}` : ''}
                  generatedImageSet={generatedImageSet}
                  savedImageSets={savedImageSets}
                  isSavedImageSetsLoading={isSavedImageSetsLoading}
                  onRefreshSavedImageSets={() => void refreshSavedImageSets()}
                  onLoadSavedImageSet={(imageSet) => {
                    setGeneratedImageSet(imageSet);
                    setImagePrompt('');
                    setImageGenerationStatus('completed');
                    setPodcastSavedHint(`Loaded image set: ${imageSet.title || 'Images'}`);
                    setPodcastError(null);
                  }}
                />
              </div>
              <div className="flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-2xl border border-rose-100/80 bg-white shadow-sm lg:min-h-0">
                <p className="shrink-0 border-b border-rose-100/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-700">
                  Training (slides)
                </p>
                <div className="min-h-[220px] flex-1 overflow-y-auto lg:min-h-[280px]">
                  {generatedPresentation?.slides?.length ? (
                    <div className="h-[min(55vh,520px)] min-h-[240px] lg:h-[min(calc(100dvh-22rem),640px)]">
                      <PresentationPreview
                        presentation={generatedPresentation}
                        isEmbedded
                        showPagination={false}
                        hideExportPptx
                        embedLightCanvas
                      />
                    </div>
                  ) : (
                    <div className="p-4 text-sm leading-relaxed text-slate-600">
                      The slide preview will appear here once the training is generated in chat.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
          <div
            className={
              repSplitLayout
                ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm md:px-5 md:py-5'
                : rep
                  ? 'flex w-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm md:px-8 md:py-8'
                  : 'flex max-h-[90vh] min-h-0 flex-col rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm md:px-8 md:py-8'
            }
          >

          <div
            className={
              repSplitLayout
                ? 'mx-auto mb-2 flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col'
                : rep
                  ? 'mx-auto mb-2 w-full min-w-0 max-w-5xl'
                  : 'mx-auto flex min-h-0 w-full min-w-0 max-w-5xl flex-1 flex-col pb-2'
            }
          >
            <div
              className={
                repSplitLayout
                  ? 'relative flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm'
                  : rep
                    ? 'relative rounded-none border-0 bg-transparent p-0 shadow-none'
                    : 'relative flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm'
              }
            >
              <div
                className={`relative mb-2 flex w-full shrink-0 ${rep ? 'flex-col gap-2 px-0.5 pt-0.5' : 'justify-end px-3 pt-3'}`}
              >
                <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-sm ring-1 ring-slate-900/[0.04] backdrop-blur-sm sm:inline-flex sm:w-auto sm:flex-nowrap sm:gap-1.5">
                  <select
                    value={activeChatGigId}
                    onChange={(e) => setSelectedChatGigId(e.target.value)}
                    className="min-w-0 flex-1 truncate rounded-xl border-0 bg-slate-50/90 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition hover:bg-slate-100/90 focus:bg-white focus:ring-2 focus:ring-harx-500/25 sm:min-w-[12rem] sm:max-w-[min(20rem,50vw)] sm:flex-none sm:shrink-0"
                    title="Choose gig for chat"
                  >
                    <option value="">Choose a gig</option>
                    {!!activeChatGigId && !hasActiveGigInOptions ? (
                      <option value={activeChatGigId}>{activeChatGigTitle}</option>
                    ) : null}
                    {companyGigs.map((gig: any) => {
                      const id = String(gig?._id || gig?.id || '');
                      return (
                        <option key={id} value={id}>
                          {gig?.title || 'Untitled gig'}
                        </option>
                      );
                    })}
                  </select>
                  <span className="hidden h-8 w-px shrink-0 self-center bg-slate-200/90 sm:block" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen((prev) => !prev)}
                    className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-2.5 ${
                      isHistoryOpen
                        ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300/80'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    title="Open history"
                  >
                    <History className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    History
                  </button>
                  <button
                    type="button"
                    onClick={startNewConversation}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-harx px-3 py-2 text-xs font-bold text-white shadow-sm shadow-harx-500/15 transition hover:brightness-105 active:brightness-95"
                    title="New conversation"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    New
                  </button>
                </div>
                {rep && (
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                    <button
                      type="button"
                      onClick={() => void handleGeneratePodcastScript()}
                      disabled={isPodcastGenerating || isChatLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isPodcastGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                      {podcastScript.trim() ? 'Regenerate audio overview' : 'Generate audio overview'}
                    </button>
                    {podcastScript.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          const fromChat = repChatScriptCandidate.trim();
                          const chatGrew = chatMessages.length > lastPodcastGenChatLengthRef.current;
                          if (fromChat && chatGrew) {
                            setPodcastScript(fromChat);
                          }
                          setShowPodcastModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Music className="h-3.5 w-3.5" />
                        View audio overview
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleGenerateTrainingImages()}
                      disabled={isImagesGenerating || isChatLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      title="Generate training images for this conversation"
                    >
                      {isImagesGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : generatedImageSet?.items?.length ? (
                        <RefreshCw className="h-3.5 w-3.5" />
                      ) : (
                        <Presentation className="h-3.5 w-3.5" />
                      )}
                      {generatedImageSet?.items?.length
                        ? 'Regenerate presentation'
                        : 'Presentation'}
                    </button>
                    {generatedImageSet?.items?.length ? (
                      <button
                        type="button"
                        onClick={() => void openImagePresentationModal()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Image className="h-3.5 w-3.5" />
                        View images as presentation
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleGenerateQuizFromChat()}
                      disabled={isQuizGenerating || isChatLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isQuizGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                      Quizzes
                    </button>
                  </div>
                )}
                {isHistoryOpen && (
                  <div className="absolute right-0 top-full z-30 mt-1.5 w-full max-w-[320px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {`History — ${activeChatGigTitle}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshChatHistory()}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      title="Refresh"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="max-h-[320px] space-y-1 overflow-y-auto">
                    {isHistoryLoading ? (
                      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </div>
                    ) : chatHistorySessions.length === 0 ? (
                      <div className="rounded-md px-2 py-2 text-xs text-slate-500">
                        No history found for this gig.
                      </div>
                    ) : (
                      chatHistorySessions.map((session) => (
                        <button
                          key={session._id}
                          type="button"
                          onClick={() => void openHistorySession(session._id)}
                          className={`w-full rounded-md border px-2 py-2 text-left transition ${
                            activeChatSessionId === session._id
                              ? 'border-harx-300 bg-harx-50/70'
                              : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate text-[12px] font-semibold text-slate-900">
                            {session.title || 'New conversation'}
                          </div>
                          {session.preview ? (
                            <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{session.preview}</div>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                )}
              </div>
              {rep &&
                showRepSourcePopup &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rep-source-popup-title"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setShowRepSourcePopup(false);
                    }}
                  >
                    <div
                      className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 pr-2">
                            <p
                              id="rep-source-popup-title"
                              className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                            >
                              Create overview from your sources
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Upload files or write a prompt to start the chat.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowRepSourcePopup(false)}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                            title="Close"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-6 text-center sm:min-h-[240px] sm:p-8">
                          <p className="text-lg font-semibold text-slate-900">Drop your files here</p>
                          <p className="mt-1 text-xs text-slate-500">pdf, images, docs, audio, and text</p>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowRepSourcePopup(false);
                              chatFileInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload files
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRepSourcePopup(false);
                              chatTextareaRef.current?.focus();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            <Search className="h-3.5 w-3.5" />
                            Write prompt
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRepSourcePopup(false)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-harx px-3 py-2 text-xs font-bold text-white shadow-sm shadow-harx-500/20"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              {shouldShowChatThread && (
                <div
                  className={
                    rep
                      ? 'mb-2 min-h-0 flex-1 space-y-6 overflow-y-auto rounded-xl bg-transparent p-0 pr-1'
                      : anchoredChoiceUi
                        ? 'mb-0 min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-2 pt-2'
                        : 'mb-2 min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-3 pt-2'
                  }
                >
                  {!hasStartedChat && (
                    <div className="border-b border-slate-200/90 pb-5 text-center">
                      <h2
                        className={
                          rep
                            ? 'mb-2 text-4xl font-serif font-semibold tracking-tight text-slate-900 sm:text-5xl'
                            : 'mb-2 text-4xl font-serif font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl'
                        }
                      >
                        {`Good evening, ${displayName}.`}
                      </h2>
                      <p className="mx-auto max-w-3xl text-sm font-medium text-slate-500">
                        How can I help you?
                      </p>
                    </div>
                  )}
                  {rep && shouldShowKbQuestionInChat && (
                    <div className="w-full min-w-0">
                      <div className="w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-md shadow-slate-900/5 sm:p-2.5">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-sm shadow-harx-500/20"
                              aria-hidden
                            >
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">HARX</span>
                              <span className="ml-1.5 text-[11px] font-medium text-slate-400">Assistant</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">1 of 1</span>
                        </div>
                        <p className="mb-1.5 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
                          Do you want to generate a training plan and training content from your knowledge base?
                        </p>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
                          {kbOptions.map((option, idx) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectKbMode(option.id)}
                              className="flex w-full items-center gap-2 border-b border-slate-200/90 px-2.5 py-1.5 text-left transition hover:bg-white last:border-b-0 sm:px-3"
                            >
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F43F5E] text-xs font-bold text-white shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold leading-tight text-slate-900">{option.label}</span>
                                <span className="mt-0 block text-[10px] leading-snug text-slate-600">{option.hint}</span>
                              </span>
                              <span className="shrink-0 text-base leading-none text-slate-400">→</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="min-h-[14px] text-[10px] leading-tight text-slate-600">
                            {isChatKbLoading ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin text-harx-500" />
                                Loading KB documents...
                              </span>
                            ) : kbGenerationChoice === 'kb_only' || kbGenerationChoice === 'kb_and_uploads' ? (
                              <span>{chatKbDocuments.length} KB document(s) ready for generation.</span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectKbMode('none')}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {rep && showPersonalizationCard && (
                    <div className="w-full min-w-0">
                      <div className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 shadow-md shadow-slate-900/5 sm:p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-sm shadow-harx-500/20"
                              aria-hidden
                            >
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">HARX</span>
                              <span className="ml-1.5 text-[11px] font-medium text-slate-400">Assistant</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                            {`${Math.min(personalizationStep + 1, personalizationQuestions.length)} of ${personalizationQuestions.length}`}
                          </span>
                        </div>
                        <p className="mb-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
                          {personalizationQuestions[personalizationStep]?.question ||
                            'A few questions to personalize your training'}
                        </p>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
                          {(personalizationQuestions[personalizationStep]?.options || []).map((option, idx) => (
                            <button
                              key={`${personalizationStep}-${option}`}
                              type="button"
                              onClick={() => handleSelectPersonalizationOption(option)}
                              className="flex w-full items-center gap-2 border-b border-slate-200/90 px-2.5 py-2 text-left transition hover:bg-white last:border-b-0 sm:px-3"
                            >
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F43F5E] text-xs font-bold text-white shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold leading-tight text-slate-900">{option}</span>
                              </span>
                              <span className="shrink-0 text-base leading-none text-slate-400">→</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPersonalizationCard(false);
                              setPersonalizationStep(0);
                              setPersonalizationAnswers({});
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      {msg.role === 'assistant' ? (
                        <div className="max-w-[88%]">
                          <div className="max-w-none text-slate-900">
                            {(() => {
                              const textWithoutStyle = stripPromptEcho(stripResourceSections(
                                stripStyleBlueprint(String(msg.text || '').replace(/<harx-html>[\s\S]*?<\/harx-html>/gi, ''))
                              ));
                              return (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({ children }) => <h3 className="mb-2 mt-3 text-[22px] font-semibold text-slate-900">{children}</h3>,
                                    h2: ({ children }) => <h4 className="mb-1.5 mt-3 text-[18px] font-semibold text-slate-900">{children}</h4>,
                                    h3: ({ children }) => <h5 className="mb-1 mt-2 text-[16px] font-semibold text-slate-800">{children}</h5>,
                                    p: ({ children }) => <p className="my-1.5 text-[15px] leading-7 text-slate-700">{children}</p>,
                                    ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5 text-[15px] leading-7 text-slate-700">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5 text-[15px] leading-7 text-slate-700">{children}</ol>,
                                    li: ({ children }) => <li className="text-slate-700">{children}</li>,
                                    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                                    table: ({ children }) => (
                                      <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
                                        <table className="min-w-full border-collapse bg-white">{children}</table>
                                      </div>
                                    ),
                                    thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                                    tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
                                    tr: ({ children }) => <tr className="align-top">{children}</tr>,
                                    th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold text-slate-900">{children}</th>,
                                    td: ({ children }) => <td className="px-3 py-2 text-sm text-slate-700">{children}</td>,
                                    code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px] text-slate-800 ring-1 ring-slate-200">{children}</code>,
                                    blockquote: ({ children }) => <blockquote className="my-2 border-l-4 border-slate-300 pl-3 text-slate-600 italic">{children}</blockquote>,
                                  }}
                                >
                                  {textWithoutStyle}
                                </ReactMarkdown>
                              );
                            })()}
                            {msg.isStreaming && (
                              <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-harx-400 align-middle" />
                            )}
                          </div>
                          <div className={`mt-2 flex items-center gap-2 text-slate-500 ${msg.isStreaming || !msg.text.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
                            <button
                              type="button"
                              onClick={() => handleRegenerateMessage(msg.id)}
                              className="rounded-md p-1.5 hover:bg-slate-100"
                              title="Regenerate"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (() => {
                        const messageText = String(msg.text || '');
                        const isPersonalizationSummary = messageText.startsWith('A few questions to personalize your training');
                        if (isPersonalizationSummary) {
                          const lines = messageText
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean);
                          const title = lines[0] || 'Personalization summary';
                          const detailLines = lines.slice(1);
                          return (
                            <div className="max-w-[72%] rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-900">
                              <p className="mb-2 text-[15px] font-bold leading-tight">{title}</p>
                              <div className="space-y-1.5">
                                {detailLines.map((line, idx) => (
                                  <p key={`${msg.id}-line-${idx}`} className="text-[13px] leading-snug text-slate-700">
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="max-w-[60%] rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900">
                            {msg.text}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                  {isChatLoading && !chatMessages.some((m) => m.isStreaming) && (
                    <div className="flex justify-start gap-3">
                      <div
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-md shadow-harx-500/20"
                        aria-hidden
                      >
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-harx-500" />
                        HARX is thinking…
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!showRepSourcePopup && (anchoredChoiceUi ? (
                <div className="sticky bottom-0 z-20 shrink-0 bg-white/95 px-3 pb-2 pt-1 backdrop-blur-sm">
                  <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    {shouldShowKbQuestionInChat && (
                      <div className="border-b border-slate-100 px-3 pb-2 pt-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-sm">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">HARX</span>
                              <span className="ml-1.5 text-[11px] font-medium text-slate-400">Assistant</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">1 of 1</span>
                        </div>
                        <p className="mb-2 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                          Do you want to generate a training plan and training content from your knowledge base?
                        </p>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
                          {kbOptions.map((option, idx) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectKbMode(option.id)}
                              className="flex w-full items-center gap-2 border-b border-slate-200/90 px-2.5 py-2 text-left transition hover:bg-white last:border-b-0 sm:px-3"
                            >
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F43F5E] text-xs font-bold text-white shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold leading-tight text-slate-900">{option.label}</span>
                                <span className="mt-0.5 block text-[11px] leading-snug text-slate-600">{option.hint}</span>
                              </span>
                              <span className="shrink-0 text-base leading-none text-slate-400">→</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="min-h-[14px] text-[10px] leading-tight text-slate-600">
                            {isChatKbLoading ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin text-harx-500" />
                                Loading KB documents...
                              </span>
                            ) : kbGenerationChoice === 'kb_only' || kbGenerationChoice === 'kb_and_uploads' ? (
                              <span>{chatKbDocuments.length} KB document(s) ready for generation.</span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectKbMode('none')}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-800 transition hover:bg-white"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                    {showPersonalizationCard && (
                      <div
                        className={`px-3 pb-2 pt-3 ${shouldShowKbQuestionInChat ? 'border-b border-slate-100' : ''}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-sm">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">HARX</span>
                              <span className="ml-1.5 text-[11px] font-medium text-slate-400">Assistant</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                            {`${Math.min(personalizationStep + 1, personalizationQuestions.length)} of ${personalizationQuestions.length}`}
                          </span>
                        </div>
                        <p className="mb-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
                          {personalizationQuestions[personalizationStep]?.question ||
                            'A few questions to personalize your training'}
                        </p>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
                          {(personalizationQuestions[personalizationStep]?.options || []).map((option, idx) => (
                            <button
                              key={`${personalizationStep}-${option}`}
                              type="button"
                              onClick={() => handleSelectPersonalizationOption(option)}
                              className="flex w-full items-center gap-2 border-b border-slate-200/90 px-2.5 py-2 text-left transition hover:bg-white last:border-b-0 sm:px-3"
                            >
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F43F5E] text-xs font-bold text-white shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold leading-tight text-slate-900">{option}</span>
                              </span>
                              <span className="shrink-0 text-base leading-none text-slate-400">→</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPersonalizationCard(false);
                              setPersonalizationStep(0);
                              setPersonalizationAnswers({});
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-800 transition hover:bg-white"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="border-t border-slate-100 px-3 pb-3 pt-2.5">{renderComposerBody()}</div>
                  </div>
                </div>
              ) : (
                <div
                  className={`shrink-0 bg-white pb-1 pt-2 ${rep ? 'sticky bottom-2 z-20 border-t border-slate-200/80' : 'sticky bottom-0 z-20 border-t border-slate-200/80 px-3'}`}
                >
                  <div
                    className={
                      rep
                        ? 'rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm'
                        : 'rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm'
                    }
                  >
                    {renderComposerBody()}
                  </div>
                </div>
              ))}

            </div>
          </div>

          {rep && showPresentationModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
              <div className="flex h-[92vh] w-[min(1200px,96vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">Presentation preview</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSavePresentation()}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPresentationModal(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {generatedPresentation?.slides?.length ? (
                    <PresentationPreview
                      presentation={generatedPresentation}
                      isEmbedded
                      showPagination={false}
                      hideExportPptx
                      embedLightCanvas
                    />
                  ) : (
                    <div className="p-4 text-sm text-slate-600">No presentation generated yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {rep && showImagePresentationModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
              <div className="flex h-[90vh] w-[min(1200px,96vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {activeImageSet?.title || 'Presentation overview images'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeImageSet) setGeneratedImageSet(activeImageSet);
                        setPodcastSavedHint('Presentation overview saved in current session.');
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImagePresentationModal(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
                    <span>
                      {activeImageSet?.items?.length
                        ? `Slide ${Math.min(activeImageIndex + 1, activeImageSet.items.length)} / ${activeImageSet.items.length}`
                        : 'No images'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((prev) => Math.max(prev - 1, 0))}
                        disabled={!activeImageSet?.items?.length || activeImageIndex <= 0}
                        className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((prev) => Math.min(prev + 1, Math.max((activeImageSet?.items?.length || 1) - 1, 0)))}
                        disabled={!activeImageSet?.items?.length || activeImageIndex >= ((activeImageSet?.items?.length || 1) - 1)}
                        className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-4">
                    {activeImageSet?.items?.[activeImageIndex]?.imageUrl ? (
                      <img
                        src={activeImageSet.items[activeImageIndex].imageUrl}
                        alt={activeImageSet.items[activeImageIndex].title || `Image ${activeImageIndex + 1}`}
                        className="max-h-full w-full rounded-xl border border-slate-200 bg-white object-contain"
                      />
                    ) : (
                      <div className="text-sm text-slate-500">No image available.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {rep && showPodcastModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
              <div className="flex h-[min(88vh,720px)] w-[min(720px,96vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">Audio overview</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePlayPodcastSpeak()}
                      disabled={!podcastScript.trim() || isPodcastSpeaking || isPodcastGenerating}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStopPodcastSpeak()}
                      disabled={!isPodcastSpeaking}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Stop
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSavePodcast()}
                      disabled={!podcastScript.trim() || isPodcastSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isPodcastSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleStopPodcastSpeak();
                        setShowPodcastModal(false);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                  <label className="block text-xs font-semibold text-slate-600" htmlFor="podcast-modal-title">
                    Title (optional)
                  </label>
                  <input
                    id="podcast-modal-title"
                    type="text"
                    value={podcastTitle}
                    onChange={(e) => setPodcastTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                    placeholder="Audio overview title"
                  />
                  {podcastError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{podcastError}</div>
                  ) : null}
                  {podcastSavedHint ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{podcastSavedHint}</div>
                  ) : null}
                  {isPodcastGenerating ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin text-harx-500" />
                      Generating audio overview script…
                    </div>
                  ) : null}
                  <label className="block text-xs font-semibold text-slate-600" htmlFor="podcast-modal-script">
                    Script
                  </label>
                  <textarea
                    id="podcast-modal-script"
                    readOnly={isPodcastGenerating}
                    value={podcastScript}
                    onChange={(e) => setPodcastScript(e.target.value)}
                    className="min-h-[220px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-slate-300"
                    placeholder="Generated script will appear here."
                  />
                </div>
              </div>
            </div>
          )}

          {rep && showQuizModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
              <div className="flex h-[90vh] w-[min(920px,96vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">Quizzes</div>
                  <button
                    type="button"
                    onClick={() => setShowQuizModal(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {quizQuestions.length === 0 ? (
                    <div className="text-sm text-slate-600">No quiz questions generated yet.</div>
                  ) : (
                    quizQuestions.map((q, idx) => (
                      <div key={`${idx}-${q.text}`} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{idx + 1}. {q.text}</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {(q.options || []).map((opt, optIdx) => (
                            <li key={`${idx}-${optIdx}`} className={q.correctAnswer === optIdx ? 'font-semibold text-emerald-700' : ''}>
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </li>
                          ))}
                        </ul>
                        {q.explanation ? (
                          <p className="mt-2 text-xs text-slate-500">Explanation: {q.explanation}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Claude-like upload experience: attachment chips are displayed inside composer */}

          {/* AI Enhancement Preview */}
          {/* {totalAnalyzed > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mb-6">
              <div className="text-center">
                <Zap className="h-10 w-10 text-purple-500 mx-auto mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-1.5">Ready for AI Enhancement!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your content has been analyzed. Next, we'll transform it into engaging multimedia training materials.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/40 border border-gray-100/50 rounded-xl">
                    <Video className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">AI Videos</div>
                    <div className="text-sm text-gray-600">Animated explanations</div>
                  </div>
                  <div className="text-center p-4 bg-white/40 border border-gray-100/50 rounded-xl">
                    <Music className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">Voice-overs</div>
                    <div className="text-sm text-gray-600">Professional narration</div>
                  </div>
                  <div className="text-center p-4 bg-white/40 border border-gray-100/50 rounded-xl">
                    <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">Infographics</div>
                    <div className="text-sm text-gray-600">Visual summaries</div>
                  </div>
                  <div className="text-center p-4 bg-white/40 border border-gray-100/50 rounded-xl">
                    <Zap className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">Interactive</div>
                    <div className="text-sm text-gray-600">Quizzes & scenarios</div>
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {isGigOnly && null}

          {/* Navigation — hidden while REP source intro modal is open (full-screen overlay replaces it) */}
          {!(rep && showRepSourcePopup) ? (
            <div
              className={
                rep
                  ? 'mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between'
                  : 'mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between'
              }
            >
              <button
                type="button"
                onClick={onBack}
                className={
                  rep
                    ? 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-harx-200 hover:text-harx-600'
                    : 'rounded-xl border border-slate-200 bg-white px-6 py-2 font-medium text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50'
                }
              >
                Back to setup
              </button>

              <div className={rep ? 'order-3 flex flex-1 justify-center sm:order-none' : 'order-3 flex flex-1 justify-center md:order-none'} />

              <div className={rep ? 'flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center' : 'flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:w-auto'} />
            </div>
          ) : null}
          </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return renderSourcesUploadUI();
}
