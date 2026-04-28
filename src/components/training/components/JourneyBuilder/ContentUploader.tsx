import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileText, Video, Music, Image, File as FileIcon, CheckCircle, Clock, AlertCircle, AlertTriangle, X, Sparkles, Zap, BarChart3, Wand2, Save, Loader2, Presentation, FileDown, Maximize2, RefreshCw, LayoutGrid, FolderOpen, Briefcase, Plus, Search, RotateCcw, Send, History, Bot, Mic, Square, Play, Target, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ContentUpload } from '../../types/core';
import { AIService, normalizePresentationFromApi, type UploadCurriculumContext, type PresentationGenerationContext, type CallRecordingRef, type ChatHistoryItem, type SavedPodcastItem, type TrainingImageSet, type QuizQuestion, type StructuredTrainingSlidesPayload, type ChatWorkflowStatus } from '../../infrastructure/services/AIService';
import { WebSpeechService } from '../../infrastructure/services/CanvasVideoService';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { DraftService } from '../../infrastructure/services/DraftService';
import { cloudinaryService } from '../../lib/cloudinaryService';
import { getGigsByCompanyId } from '../../../../api/matching';
import type { Gig } from '../../../../types/matching';
import { scrollJourneyMainToTop } from './journeyScroll';
import type { TrainingMethodology } from '../../types/methodology';
import { buildGigSnapshotForAi } from '../../utils/gigSnapshotForAi';
import { buildRepInteractivePresentationHtml } from '../../utils/buildRepInteractivePresentationHtml';

interface ContentUploaderProps {
  onComplete: (uploads: ContentUpload[], fileTrainingUrl?: string) => void;
  onBack: () => void;
  company?: any;
  gigId?: string | null;
  journey?: any;
  methodology?: TrainingMethodology | null;
  autoOpenFormationViewer?: boolean;
  onExitToTrainingList?: () => void;
  /**
   * Créer un nouveau `training_journeys` + vider le fil (nouveau chat au prochain message).
   * Sans cela, « New » effaçait l’UI puis un effet rouvrait la dernière session du gig.
   */
  onForkNewJourneyTraining?: () => Promise<{ trainingJourneyId: string }>;
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
const HIDDEN_CHAT_COMMAND_REGEX = /^__(?:VALIDATE_PLAN__|VALIDATE_MODULE_CONTENT__|VALIDATE_ALL_MODULES_CONTENT__)/i;

function stripAssistantTrainingTags(raw: string): string {
  return stripHarxStyleBlocks(String(raw || ''))
    .replace(/<harx-html>[\s\S]*?<\/harx-html>/gi, '')
    .replace(HARX_TRAINING_STATUS_REGEX, '')
    .replace(/<harx-plan-confirm>[\s\S]*?<\/harx-plan-confirm>/gi, '')
    .trim();
}

/** Remove `<harx-style>…</harx-style>` including unclosed blocks (streaming) up to `<harx-training-status` or EOF. */
function stripHarxStyleBlocks(rawText: string): string {
  let s = String(rawText || '');
  for (;;) {
    const m = s.match(/<harx-style\b[^>]*>/i);
    if (!m || m.index == null) break;
    const start = m.index;
    const tail = s.slice(start + m[0].length);
    const closeMatch = tail.match(/<\/harx-style>/i);
    if (closeMatch && closeMatch.index != null) {
      const end = start + m[0].length + closeMatch.index + closeMatch[0].length;
      s = s.slice(0, start) + s.slice(end);
      continue;
    }
    const nextStatus = tail.search(/<harx-training-status\b/i);
    const cut = nextStatus >= 0 ? start + m[0].length + nextStatus : s.length;
    s = s.slice(0, start) + s.slice(cut);
    break;
  }
  return s.replace(/<\/harx-style>/gi, '').trim();
}

function isHiddenSystemCommandMessage(raw: string): boolean {
  return HIDDEN_CHAT_COMMAND_REGEX.test(String(raw || '').trim());
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
              (a.id === 'validate_plan' ||
                a.id === 'validate_module_content' ||
                a.id === 'validate_all_modules_content' ||
                a.id === 'generate_current_module' ||
                a.id === 'generate_interactive_presentation' ||
                a.id === 'view_interactive_presentation' ||
                a.id === 'validate_training' ||
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

/**
 * Anciennes sessions (ou réponses modèle) sans `<harx-training-status>` : déduit une carte
 * « Valider le module N » quand le markdown correspond au premier module non terminé du workflow.
 */
function inferSyntheticTrainingReadiness(
  displayText: string,
  opts: {
    workflow: ChatWorkflowStatus | null | undefined;
    planIsValid: boolean;
  }
): TrainingReadinessPayload | null {
  const { workflow, planIsValid } = opts;
  if (!planIsValid && workflow?.plan !== 'completed') return null;
  const modules = workflow?.modules;
  if (!Array.isArray(modules) || modules.length === 0) return null;
  const stripped = stripHarxStyleBlocks(String(displayText || '')).trim();
  const head = stripped.match(/^#\s*Module\s+(\d+)\s*[:\s—–-]/im) ?? stripped.match(/^#\s*Module\s+(\d+)\b/im);
  if (!head?.[1]) return null;
  const moduleNum = Number(head[1]);
  if (!Number.isFinite(moduleNum) || moduleNum < 1) return null;
  const firstOpen = modules.findIndex((mod) => mod.status !== 'completed');
  if (firstOpen < 0) return null;
  if (moduleNum !== firstOpen + 1) return null;
  if (stripped.length < 800) return null;
  const title = String(modules[firstOpen]?.title || `Module ${moduleNum}`).trim();
  return {
    readiness: 'incomplete',
    missingModules: [],
    messageFr: `${title} — validez ce contenu pour enregistrer l’avancement et passer au module suivant.`,
    actions: [{ id: 'validate_module_content', label: `Valider le contenu du module ${moduleNum}` }],
  };
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
  imageRenderMode: 'ai_images' | 'template_slides';
  onImageRenderModeChange: (v: 'ai_images' | 'template_slides') => void;
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
  imageRenderMode,
  onImageRenderModeChange,
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
          <div className="mb-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Rendering mode
            </label>
            <select
              value={imageRenderMode}
              onChange={(e) => onImageRenderModeChange(e.target.value === 'template_slides' ? 'template_slides' : 'ai_images')}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none ring-harx-500/20 focus:ring-2"
            >
              <option value="ai_images">AI images (visual generation)</option>
              <option value="template_slides">Template slides (no AI image generation)</option>
            </select>
          </div>
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
                    <p className="truncate text-[10px] text-slate-500">
                      {(v.items || []).length} slides · {v.renderMode === 'template_slides' ? 'template' : 'ai'}
                    </p>
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
  const {
    onComplete,
    onBack,
    company,
    gigId,
    journey,
    methodology,
    autoOpenFormationViewer = false,
    onExitToTrainingList,
    repOnboardingLayout = false,
    onForkNewJourneyTraining,
  } = props;
  const rep = Boolean(repOnboardingLayout);
  /** Après validation du plan dans le chat, le backend renvoie l’id — on le réinjecte dans le contexte des appels suivants. */
  const chatConfirmedJourneyIdRef = useRef<string | null>(null);
  /** Plan structuré issu de `training_chat_sessions.contextSnapshot.modulePlan` (aligné sur TrainingJourney). */
  const chatSessionModulePlanRef = useRef<Array<Record<string, unknown>>>([]);
  /** Workflow status persisted on `training_chat_sessions.workflowStatus`. */
  const chatWorkflowStatusRef = useRef<ChatWorkflowStatus | null>(null);
  /** Id Mongo `training_journeys` du parcours courant uniquement (pas de fallback sur anciens drafts). */
  const linkedTrainingJourneyMongoId = (): string | undefined => {
    const fromChat = chatConfirmedJourneyIdRef.current?.trim();
    if (fromChat && /^[a-f\d]{24}$/i.test(fromChat)) return fromChat;
    const candidates = [(journey as any)?._id, (journey as any)?.id];
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
      /** Masque le texte de confirmation après clic sur le bouton. */
      suppressText?: boolean;
      /** Après « oui » / validation : le plan n’est plus affiché en cartes cliquables. */
      planInteractiveDisabled?: boolean;
      /** Fichiers attachés à ce message user (snapshot au moment de l'envoi). */
      attachments?: Array<{
        id: string;
        name: string;
        type: ContentUpload['type'];
        size?: number;
      }>;
    }>
  >([]);
  const [isPlanSavedForChat, setIsPlanSavedForChat] = useState<boolean>(() => {
    const frozen = Boolean((journey as any)?.methodologyData?.planFrozenFromChat);
    const hasModulePlan = Array.isArray((journey as any)?.modulePlan) && (journey as any).modulePlan.length > 0;
    return frozen || hasModulePlan;
  });
  const [chatInput, setChatInput] = useState('');
  const [showRepSourcePopup, setShowRepSourcePopup] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPlanValidationSubmitting, setIsPlanValidationSubmitting] = useState(false);
  const [planValidationHint, setPlanValidationHint] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  /** Rotates while the assistant request is in flight (including first-token wait on an empty streaming bubble). */
  const [assistantWaitPhase, setAssistantWaitPhase] = useState(0);
  const [kbGenerationChoice, setKbGenerationChoice] = useState<KbGenerationMode | null>(null);
  const [chatKbDocuments, setChatKbDocuments] = useState<
    Array<{ _id: string; name: string; fileType?: string; summary?: string; keyTerms?: string[]; createdAt?: string }>
  >([]);
  const [chatUploadedSources, setChatUploadedSources] = useState<Array<{ keyTopics: string[]; objectives: string[] }>>([]);
  /** Fichiers déjà envoyés au chat REP (les `uploads` sont vidés après envoi — on garde les noms pour titres podcast/images). */
  const [repSessionAnalyzedFileNames, setRepSessionAnalyzedFileNames] = useState<string[]>([]);
  const [isChatKbLoading, setIsChatKbLoading] = useState(false);
  /** KB chargée pour le digest podcast (même si le mode chat n’utilise pas la KB). */
  const [podcastKbDocuments, setPodcastKbDocuments] = useState<
    Array<{ _id: string; name: string; fileType?: string; summary?: string; keyTerms?: string[]; createdAt?: string }>
  >([]);
  const [showPersonalizationCard, setShowPersonalizationCard] = useState(false);
  const [personalizationStep, setPersonalizationStep] = useState(0);
  const [personalizationAnswers, setPersonalizationAnswers] = useState<{
    source?: string;
    level?: string;
    objective?: string;
    format?: string;
  }>({});
  const [chatHistorySessions, setChatHistorySessions] = useState<ChatHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatWorkflowStatus, setChatWorkflowStatus] = useState<ChatWorkflowStatus | null>(null);
  const activeChatAbortRef = useRef<AbortController | null>(null);
  /** REP empty-chat: after first auto-open, do not force the 4-step card again on hide (Skip / dismiss). Reset on new conversation or leaving REP. */
  const repPersonalizationBootstrapRef = useRef(false);
  const autoOpenedHistoryForJourneyRef = useRef<string | null>(null);
  const historyFetchSeqRef = useRef(0);
  const [gigSwitchHint, setGigSwitchHint] = useState<string | null>(null);
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
  const [imageRenderMode, setImageRenderMode] = useState<'ai_images' | 'template_slides'>('ai_images');
  const [imageGenerationStatus, setImageGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const [isImagesGenerating, setIsImagesGenerating] = useState(false);
  const [imageGenerationJobId, setImageGenerationJobId] = useState<string | null>(null);
  const [imageGenerationTotal, setImageGenerationTotal] = useState(0);
  const [imageGenerationCompleted, setImageGenerationCompleted] = useState(0);
  const [generatedImageSet, setGeneratedImageSet] = useState<TrainingImageSet | null>(null);
  const [savedImageSets, setSavedImageSets] = useState<TrainingImageSet[]>([]);
  const [isSavedImageSetsLoading, setIsSavedImageSetsLoading] = useState(false);
  const [showImagePresentationModal, setShowImagePresentationModal] = useState(false);
  const [activeImageSet, setActiveImageSet] = useState<TrainingImageSet | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isStructuredSlidesGenerating, setIsStructuredSlidesGenerating] = useState(false);
  const [showStructuredSlidesModal, setShowStructuredSlidesModal] = useState(false);
  const [structuredSlides, setStructuredSlides] = useState<StructuredTrainingSlidesPayload | null>(null);
  const [structuredSlideIndex, setStructuredSlideIndex] = useState(0);
  const [mediaEditHint, setMediaEditHint] = useState<string | null>(null);
  const [isMediaSaving, setIsMediaSaving] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [editableQuizQuestions, setEditableQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizGenerating, setIsQuizGenerating] = useState(false);
  const [isQuizSaving, setIsQuizSaving] = useState(false);
  const [quizSavedHint, setQuizSavedHint] = useState<string | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [interactiveQuestionAnswers, setInteractiveQuestionAnswers] = useState<Record<string, Record<number, string>>>({});
  const podcastSpeechRef = useRef<WebSpeechService | null>(null);
  const podcastSpeakAbortRef = useRef(false);
  /** After a successful “Regenerate audio overview”, chat length at that moment — View syncs when new messages arrive. */
  const lastPodcastGenChatLengthRef = useRef(0);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatThreadRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const repFormationModalHydratedRef = useRef(false);
  /** Parcours Mongo complet (modules / sections / quiz) pour aperçu REP — rechargé après sauvegardes chat. */
  const savedJourneyHydrateSeqRef = useRef(0);
  const [savedJourneyHydrated, setSavedJourneyHydrated] = useState<any | null>(null);
  const [isSavedJourneyHydrating, setIsSavedJourneyHydrating] = useState(false);
  const [showGeneratedFormationModal, setShowGeneratedFormationModal] = useState(false);
  const [repFormationDeckHtml, setRepFormationDeckHtml] = useState<string | null>(null);
  const [isBuildingRepFormationDeck, setIsBuildingRepFormationDeck] = useState(false);
  const [isSavingRepFormationDeck, setIsSavingRepFormationDeck] = useState(false);
  const [repFormationDeckHint, setRepFormationDeckHint] = useState<string | null>(null);
  /** Une seule vue « slides » à la fois : HTML généré vs lecteur intégré (évite deux compteurs de slides différents). */
  const [formationDeckModalTab, setFormationDeckModalTab] = useState<'html' | 'parcours'>('parcours');
  const [repFormationIframeKey, setRepFormationIframeKey] = useState(0);
  const [formationViewerSlideIndex, setFormationViewerSlideIndex] = useState(0);
  const [formationViewerQuizState, setFormationViewerQuizState] = useState<
    Record<string, { selected: number | null; revealed: boolean }>
  >({});

  const formationPreviewForViewer = useMemo(() => savedJourneyHydrated || journey, [savedJourneyHydrated, journey]);

  type FormationViewerSlide =
    | {
        key: 'overview';
        kind: 'overview';
        totalModules: number;
        modules: Array<{
          title: string;
          moduleIndex: number;
          sectionCount: number;
          sections: Array<{ title: string; sectionIndex: number }>;
        }>;
      }
    | { key: string; kind: 'module_intro'; moduleIndex: number; totalModules: number; mod: any }
    | {
        key: string;
        kind: 'section';
        moduleIndex: number;
        totalModules: number;
        section: any;
        modTitle: string;
      }
    | {
        key: string;
        kind: 'quiz_question';
        moduleIndex: number;
        totalModules: number;
        quizTitle: string;
        question: any;
        correctAnswer: number;
      };

  const formationViewerSlides = useMemo((): FormationViewerSlide[] => {
    const src = formationPreviewForViewer as any;
    const modules = Array.isArray(src?.modules) ? (src.modules as any[]) : [];
    const totalModules = modules.length;
    const slides: FormationViewerSlide[] = [];
    slides.push({
      key: 'overview',
      kind: 'overview',
      totalModules,
      modules: modules.map((mod, mi) => {
        const sections = Array.isArray(mod?.sections) ? mod.sections : [];
        return {
          title: String(mod?.title || `Module ${mi + 1}`),
          moduleIndex: mi,
          sectionCount: sections.length,
          sections: sections.map((sec: any, si: number) => ({
            title: String(sec?.title || `Section ${si + 1}`),
            sectionIndex: si,
          })),
        };
      }),
    });
    modules.forEach((mod, mi) => {
      slides.push({
        key: `m${mi}-intro`,
        kind: 'module_intro',
        moduleIndex: mi,
        totalModules,
        mod,
      });
      const sections = Array.isArray(mod?.sections) ? mod.sections : [];
      sections.forEach((sec: any, si: number) => {
        slides.push({
          key: `m${mi}-s${si}`,
          kind: 'section',
          moduleIndex: mi,
          totalModules,
          section: sec,
          modTitle: String(mod?.title || `Module ${mi + 1}`),
        });
      });
      const quizzes = Array.isArray(mod?.quizzes) ? mod.quizzes : [];
      quizzes.forEach((qz: any, qi: number) => {
        const quizTitle = String(qz?.title || `Quiz ${qi + 1}`);
        const questions = Array.isArray(qz?.questions) ? qz.questions : [];
        questions.forEach((q: any, qix: number) => {
          const correct = typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0;
          slides.push({
            key: `m${mi}-qz${qi}-q${qix}`,
            kind: 'quiz_question',
            moduleIndex: mi,
            totalModules,
            quizTitle,
            question: q,
            correctAnswer: correct,
          });
        });
      });
    });
    return slides;
  }, [formationPreviewForViewer]);

  const formationViewerSlideIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    formationViewerSlides.forEach((slide, idx) => {
      map.set(slide.key, idx);
    });
    return map;
  }, [formationViewerSlides]);

  const jumpToFormationSlide = useCallback(
    (key: string) => {
      const idx = formationViewerSlideIndexByKey.get(key);
      if (typeof idx === 'number') setFormationViewerSlideIndex(idx);
    },
    [formationViewerSlideIndexByKey]
  );

  useEffect(() => {
    if (!showGeneratedFormationModal) return;
    setFormationViewerSlideIndex(0);
    setFormationViewerQuizState({});
    setFormationDeckModalTab('parcours');
  }, [showGeneratedFormationModal]);

  useEffect(() => {
    if (!repFormationDeckHtml) return;
    setRepFormationIframeKey((k) => k + 1);
  }, [repFormationDeckHtml]);

  useEffect(() => {
    if (!showGeneratedFormationModal) return;
    setFormationViewerSlideIndex((i) => {
      const max = Math.max(0, formationViewerSlides.length - 1);
      return Math.min(i, max);
    });
  }, [formationViewerSlides, showGeneratedFormationModal]);

  useEffect(() => {
    if (!showGeneratedFormationModal) {
      repFormationModalHydratedRef.current = false;
      return;
    }
    if (repFormationModalHydratedRef.current) return;
    repFormationModalHydratedRef.current = true;
    setRepFormationDeckHint(null);
    const src = (savedJourneyHydrated || journey) as any;
    const fromMeta = src?.methodologyData?.repInteractivePresentationHtml;
    if (typeof fromMeta === 'string' && fromMeta.length > 200) {
      setRepFormationDeckHtml(fromMeta);
      return;
    }
    const jid = linkedTrainingJourneyMongoId();
    if (jid) {
      try {
        const ls = localStorage.getItem(`harx_rep_deck_${jid}`);
        if (typeof ls === 'string' && ls.length > 200) setRepFormationDeckHtml(ls);
      } catch {
        /* ignore */
      }
    }
  }, [showGeneratedFormationModal, savedJourneyHydrated, journey]);

  const hydrateSavedJourneyFromApi = useCallback(async () => {
    if (!repOnboardingLayout) return;
    const id = linkedTrainingJourneyMongoId();
    if (!id) return;
    const seq = ++savedJourneyHydrateSeqRef.current;
    setIsSavedJourneyHydrating(true);
    try {
      const data = await JourneyService.getJourneyById(id);
      if (seq !== savedJourneyHydrateSeqRef.current) return;
      setSavedJourneyHydrated(data || null);
    } catch {
      if (seq === savedJourneyHydrateSeqRef.current) setSavedJourneyHydrated(null);
    } finally {
      if (seq === savedJourneyHydrateSeqRef.current) setIsSavedJourneyHydrating(false);
    }
  }, [repOnboardingLayout, journey]);

  useEffect(() => {
    if (!repOnboardingLayout || !autoOpenFormationViewer) return;
    setFormationDeckModalTab('parcours');
    setFormationViewerSlideIndex(0);
    setShowGeneratedFormationModal(true);
    void hydrateSavedJourneyFromApi();
  }, [repOnboardingLayout, autoOpenFormationViewer, hydrateSavedJourneyFromApi]);

  useEffect(() => {
    if (!repOnboardingLayout) {
      savedJourneyHydrateSeqRef.current += 1;
      setSavedJourneyHydrated(null);
      setIsSavedJourneyHydrating(false);
      setShowGeneratedFormationModal(false);
      return;
    }
    void hydrateSavedJourneyFromApi();
  }, [repOnboardingLayout, journey, isPlanSavedForChat, hydrateSavedJourneyFromApi]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const container = chatThreadRef.current;
      if (!container || !shouldStickToBottomRef.current) return;
      chatEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (gigId) {
      setSelectedChatGigId(String(gigId));
    }
  }, [gigId]);

  useEffect(() => {
    // Questions now live directly in chat; keep popup disabled.
    setShowRepSourcePopup(false);
  }, [repOnboardingLayout, chatMessages.length]);

  useEffect(() => {
    setEditableQuizQuestions(Array.isArray(quizQuestions) ? quizQuestions : []);
  }, [quizQuestions, showQuizModal]);

  useEffect(() => {
    // REP onboarding: start directly with the 4-question flow (no KB 1/1 card).
    if (!repOnboardingLayout) {
      repPersonalizationBootstrapRef.current = false;
      return;
    }
    if (chatMessages.length > 0) return;
    if (showPersonalizationCard) return;
    if (repPersonalizationBootstrapRef.current) return;
    setShowPersonalizationCard(true);
    setPersonalizationStep(0);
    setPersonalizationAnswers({});
    repPersonalizationBootstrapRef.current = true;
  }, [repOnboardingLayout, chatMessages.length, showPersonalizationCard]);

  useEffect(() => {
    if (!isChatLoading) {
      setAssistantWaitPhase(0);
      return;
    }
    const id = window.setInterval(() => {
      setAssistantWaitPhase((p) => (p + 1) % 3);
    }, 1800);
    return () => window.clearInterval(id);
  }, [isChatLoading]);

  const assistantWaitLabels = ['Thinking…', 'Generating…', 'Analyzing…'];
  const assistantWaitLabel = assistantWaitLabels[assistantWaitPhase % assistantWaitLabels.length];

  const activeChatGigId = selectedChatGigId || (gigId ? String(gigId) : '');

  useEffect(() => {
    setRepSessionAnalyzedFileNames([]);
  }, [activeChatGigId]);

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
    const joined = chunks.join('\n\n---\n\n');
    // Keep the **end** of the thread so a new request (e.g. 30‑min formation) is not dropped after a long podcast exchange.
    return joined.length <= 12000 ? joined : joined.slice(-12000);
  }, [repOnboardingLayout, chatMessages]);

  /** Full user + assistant thread for podcast / images digest (REP). Long threads: keep the tail (latest intent). */
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
    const joined = lines.join('\n\n');
    const max = 16000;
    if (joined.length <= max) return joined;
    return (
      '…(earlier messages omitted)\n\n' +
      '--- Most recent conversation (follow this — supersedes older turns) ---\n\n' +
      joined.slice(-max)
    );
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

  /**
   * Titre matériel pour podcast / images / sauvegardes : aligné sur le contenu réellement digéré
   * (curriculum, présentation, fichiers uploadés, docs KB), pas seulement sur le gig sélectionné.
   */
  const resolvedTrainingMaterialTitle = useMemo(() => {
    const curriculumTitle = String(generatedCurriculum?.title || '').trim();
    if (curriculumTitle) return curriculumTitle.slice(0, 200);
    const presentationTitle = String(generatedPresentation?.title || '').trim();
    if (presentationTitle) return presentationTitle.slice(0, 200);

    const stripExt = (n: string) => String(n || '').replace(/\.[^.]+$/, '').trim();
    const uploadNames = uploads
      .filter((u) => u.status === 'analyzed' && !!u.aiAnalysis)
      .map((u) => String(u.name || '').trim())
      .filter(Boolean);
    const sessionNames = repSessionAnalyzedFileNames.map((n) => String(n || '').trim()).filter(Boolean);
    const effectiveUploadNames = uploadNames.length > 0 ? uploadNames : sessionNames;
    if (effectiveUploadNames.length === 1) return stripExt(effectiveUploadNames[0]).slice(0, 200) || effectiveUploadNames[0].slice(0, 200);
    if (effectiveUploadNames.length > 1) {
      const joined = effectiveUploadNames
        .slice(0, 3)
        .map((n) => stripExt(n) || n)
        .join(' · ');
      return (effectiveUploadNames.length > 3 ? `${joined}…` : joined).slice(0, 200);
    }

    const kbNames = kbDocumentsForPodcast.map((d) => String(d.name || '').trim()).filter(Boolean);
    if (kbNames.length === 1) return stripExt(kbNames[0]).slice(0, 200) || kbNames[0].slice(0, 200);
    if (kbNames.length > 1) {
      const joined = kbNames.slice(0, 3).join(' · ');
      return (kbNames.length > 3 ? `${joined}…` : joined).slice(0, 200);
    }

    const gigTitle =
      activeGigSnapshotForPodcast && String((activeGigSnapshotForPodcast as Record<string, unknown>).title || '').trim();
    if (gigTitle) return gigTitle.slice(0, 200);
    return 'Training';
  }, [
    generatedCurriculum?.title,
    generatedPresentation?.title,
    uploads,
    repSessionAnalyzedFileNames,
    kbDocumentsForPodcast,
    activeGigSnapshotForPodcast,
  ]);

  /** En-tête modal images : corrige les jeux sauvegardés quand le titre stocké = gig alors que la source réelle est KB/upload. */
  const trainingImageModalPrimaryTitle = useMemo(() => {
    if (!activeImageSet) return 'Presentation overview images';
    const gigT = String((activeGigSnapshotForPodcast as Record<string, unknown>)?.title || '').trim();
    const storedTT = String(activeImageSet.trainingTitle || '').trim();
    const storedFull = String(activeImageSet.title || '').trim();
    const live = resolvedTrainingMaterialTitle;
    if (
      repOnboardingLayout &&
      gigT &&
      storedTT === gigT &&
      live &&
      live !== gigT &&
      (uploads.some((u) => u.status === 'analyzed' && !!u.aiAnalysis) ||
        repSessionAnalyzedFileNames.length > 0 ||
        kbDocumentsForPodcast.length > 0)
    ) {
      return `${live} - Images`.slice(0, 240);
    }
    return storedFull || `${live} - Images`.slice(0, 240);
  }, [
    activeImageSet,
    repOnboardingLayout,
    activeGigSnapshotForPodcast,
    resolvedTrainingMaterialTitle,
    uploads,
    repSessionAnalyzedFileNames,
    kbDocumentsForPodcast,
  ]);

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
        out = `--- Training chat (PRIMARY: align outputs with this thread; latest messages override earlier ones) ---\n\n${chatTx}\n\n--- Supporting reference (curriculum, gig, knowledge base — use only if needed) ---\n\n${out}`.trim();
      } else if (out.length < 400 && repChatPodcastDigest.trim()) {
        out = `${out ? `${out}\n\n` : ''}--- Summary from onboarding conversation ---\n\n${repChatPodcastDigest}`;
      }
    } else if (out.length < 400 && repChatPodcastDigest.trim()) {
      out = `${out ? `${out}\n\n` : ''}--- Summary from onboarding conversation ---\n\n${repChatPodcastDigest}`;
    }
    const digestMax = 36000;
    if (out.length > digestMax) {
      const primaryMark = '--- Training chat (PRIMARY';
      const supMark = '\n\n--- Supporting reference';
      const p = out.indexOf(primaryMark);
      const s = out.indexOf(supMark);
      if (p !== -1 && s !== -1 && s > p) {
        let primary = out.slice(p, s).trimEnd();
        let supporting = out.slice(s);
        if (primary.length > digestMax - 400) {
          primary =
            primary.slice(-(digestMax - 400)) +
            '\n\n[... older PRIMARY chat truncated — tail kept for latest learner instructions ...]';
        }
        const budget = Math.max(200, digestMax - primary.length - 120);
        if (supporting.length > budget) {
          supporting =
            supporting.slice(0, budget) +
            '\n\n[... supporting reference truncated — chat PRIMARY above is authoritative ...]';
        }
        out = `${primary}\n\n${supporting}`.trim();
      } else {
        out = `${out.slice(-digestMax)}\n\n[... digest truncated — tail kept for latest context ...]`;
      }
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
      const trainingTitle = resolvedTrainingMaterialTitle;
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
    resolvedTrainingMaterialTitle,
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
    const fallbackTitle = resolvedTrainingMaterialTitle || 'Training podcast';
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
      setPodcastSavedHint('Podcast saved');
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
    resolvedTrainingMaterialTitle,
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
    const trainingTitle = resolvedTrainingMaterialTitle;
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
        title: `${trainingTitle} - ${imageRenderMode === 'template_slides' ? 'Slides' : 'Images'}`,
        language: 'fr',
        renderMode: imageRenderMode,
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
        title: `${trainingTitle} - ${imageRenderMode === 'template_slides' ? 'Slides' : 'Images'}`,
        trainingTitle,
        renderMode: result.renderMode || imageRenderMode,
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
    resolvedTrainingMaterialTitle,
    activeChatGigId,
    company,
    imageRenderMode,
    imagePrompt,
    journey,
  ]);

  const handleGenerateStructuredSlides = useCallback(async () => {
    if (isStructuredSlidesGenerating) return;
    const digest = buildTrainingDigestForPodcast();
    if (!digest.trim()) {
      setPodcastError('Not enough training content to generate slides.');
      return;
    }
    const trainingTitle = resolvedTrainingMaterialTitle;
    setIsStructuredSlidesGenerating(true);
    setPodcastError(null);
    try {
      const data = await AIService.generateTrainingSlidesJson({
        trainingDigest: digest,
        trainingTitle,
        language: 'fr',
        maxSlides: 16,
        generator: 'ai',
        withCoverImage: true,
      });
      setStructuredSlides(data);
      setStructuredSlideIndex(0);
      setShowStructuredSlidesModal(true);
      setPodcastSavedHint('Structured HTML slides generated.');
    } catch (e: any) {
      setPodcastError(e?.message || 'Unable to generate structured slides.');
    } finally {
      setIsStructuredSlidesGenerating(false);
    }
  }, [isStructuredSlidesGenerating, buildTrainingDigestForPodcast, resolvedTrainingMaterialTitle]);

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
          renderMode: st.renderMode || prev?.renderMode || imageRenderMode,
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
  }, [imageGenerationJobId, imageGenerationStatus, imageRenderMode, refreshSavedImageSets]);

  const refreshChatHistory = useCallback(async () => {
    if (!activeChatGigId) {
      setChatHistorySessions([]);
      return;
    }
    const requestedGigId = String(activeChatGigId).trim();
    const seq = ++historyFetchSeqRef.current;
    setIsHistoryLoading(true);
    try {
      const sessions = await AIService.listChatHistory(requestedGigId);
      // Ignore stale responses when user switches gig quickly.
      if (seq !== historyFetchSeqRef.current) return;
      setChatHistorySessions(Array.isArray(sessions) ? sessions : []);
    } catch (error) {
      console.error('[ContentUploader] Failed loading chat history:', error);
      if (seq !== historyFetchSeqRef.current) return;
      setChatHistorySessions([]);
    } finally {
      if (seq === historyFetchSeqRef.current) setIsHistoryLoading(false);
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
    setChatHistorySessions([]);
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
    const fallbackGigId = String(gigId || (journey as any)?.gigId || '').trim();
    const sid = String(activeChatSessionId || '').trim();
    if (uploads.length === 0 && !fallbackGigId && !sid) return null;

    const hasExistingSlides =
      Array.isArray(generatedPresentation?.slides) && generatedPresentation.slides.length > 0;
    if (!regenerate && hasExistingSlides) {
      setWorkspaceTab('artifact');
      return generatedPresentation;
    }

    try {
      setIsGeneratingPresentation(true);
      if (regenerate) {
        setGeneratedPresentation(null);
      }
      

      let curriculum = generatedCurriculum;
      const buildCurriculumFromGeneratedModules = async (): Promise<any | null> => {
        const sid = String(activeChatSessionId || '').trim();
        if (!sid) return null;
        try {
          const session = await AIService.getChatSession(sid);
          const modulePlan = Array.isArray((session as any)?.modulePlan)
            ? ((session as any).modulePlan as Array<Record<string, any>>)
            : [];
          if (modulePlan.length === 0) return null;

          const normalizedModules = modulePlan
            .map((m, idx) => {
              const title = String(m?.title || `Module ${idx + 1}`).trim();
              const sections = Array.isArray(m?.sections)
                ? m.sections
                    .map((s: any) => ({
                      title: String(s?.title || '').trim(),
                      bullets: Array.isArray(s?.bullets)
                        ? s.bullets.map((b: any) => String(b || '').trim()).filter(Boolean).slice(0, 8)
                        : [],
                    }))
                    .filter((s: any) => s.title || s.bullets.length > 0)
                : [];
              const quizzes = Array.isArray(m?.quizzes)
                ? m.quizzes
                    .map((q: any) => ({
                      question: String(q?.question || '').trim(),
                      options: Array.isArray(q?.options)
                        ? q.options.map((o: any) => String(o || '').trim()).filter(Boolean).slice(0, 6)
                        : [],
                      answer: String(q?.answer || '').trim(),
                    }))
                    .filter((q: any) => q.question && q.options.length > 0)
                : [];
              const markdown = String(m?.detailedContentMarkdown || '').trim();

              if (!title && sections.length === 0 && quizzes.length === 0 && !markdown) return null;
              return {
                title,
                sections,
                quizzes,
                content:
                  markdown ||
                  [
                    ...sections.map((s: any) => `Section: ${s.title}\n${s.bullets.map((b: string) => `- ${b}`).join('\n')}`),
                    quizzes.length
                      ? `Quiz:\n${quizzes
                          .map(
                            (q: any) =>
                              `Q: ${q.question}\n${q.options
                                .map((opt: string, i: number) => `${String.fromCharCode(97 + i)}) ${opt}`)
                                .join('\n')}\nRéponse: ${q.answer || ''}`
                          )
                          .join('\n\n')}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('\n\n'),
              };
            })
            .filter(Boolean) as Array<Record<string, any>>;

          if (normalizedModules.length === 0) return null;

          return {
            title: String((journey as any)?.name || 'Présentation interactive').trim(),
            description: String((journey as any)?.description || '').trim(),
            methodology: String(methodology?.name || 'Methodologie 360').trim(),
            source: 'generated_modules',
            modules: normalizedModules,
          };
        } catch (e) {
          console.warn('[ContentUploader] Unable to build curriculum from generated modules:', e);
          return null;
        }
      };
      const analyzedUploads = getAnalyzedUploads();
      const hasUploadSource = analyzedUploads.length > 0;
      const includeKbSource = !!fallbackGigId && useKbForPresentation;
      const gigOnly = !hasUploadSource && !!fallbackGigId;

      const modulesBasedCurriculum = await buildCurriculumFromGeneratedModules();
      if (modulesBasedCurriculum) {
        curriculum = modulesBasedCurriculum;
        setGeneratedCurriculum(modulesBasedCurriculum);
      } else if (!curriculum) {
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
          curriculum = await fetchCurriculumFromGig(includeKbSource, fallbackGigId);
        }

        setGeneratedCurriculum(curriculum);
        setIsProcessing(false);
      } else if (regenerate && gigOnly) {
        setIsProcessing(true);
        curriculum = await fetchCurriculumFromGig(includeKbSource, fallbackGigId);
        setGeneratedCurriculum(curriculum);
        setIsProcessing(false);
      }

      const generationContext = await buildPresentationSourceContext(includeKbSource);
      const presentation = await AIService.generatePresentation(curriculum, {
        gigId: fallbackGigId || undefined,
        useKnowledgeBase: includeKbSource,
        includeCallRecordings: includeKbSource,
        sourceMode: generationContext.sourceMode,
        sourceContext: generationContext,
      });

      const normalized = normalizePresentationFromApi(presentation) || presentation;
      setGeneratedPresentation(normalized);
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

  /**
   * Helper to fetch curriculum from Gig KB if no uploads are present
   */
  const fetchCurriculumFromGig = async (includeKbSource: boolean, targetGigId?: string) => {
    const effectiveGigId = String(targetGigId || gigId || (journey as any)?.gigId || '').trim();
    if (!effectiveGigId) throw new Error('No Gig selected');
    
    return await AIService.generateTrainingFromGig(effectiveGigId, {
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
  let openHistorySession: (sessionId: string) => Promise<void>;

  useEffect(() => {
    if (!repOnboardingLayout) return;
    const journeyId = linkedTrainingJourneyMongoId();
    if (!journeyId) return;
    if (activeChatSessionId) return;
    if (!Array.isArray(chatHistorySessions) || chatHistorySessions.length === 0) return;
    if (autoOpenedHistoryForJourneyRef.current === journeyId) return;

    const match = chatHistorySessions.find(
      (s) => String((s as any)?.trainingJourneyId || '').trim() === journeyId
    );
    if (!match?._id) return;
    autoOpenedHistoryForJourneyRef.current = journeyId;
    void openHistorySession(match._id);
  }, [repOnboardingLayout, chatHistorySessions, activeChatSessionId, journey]);

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
    const displayName = String(company?.name || 'QARA EL HOUCINE').toUpperCase();
    const hasStartedChat = chatMessages.length > 0;
    const showChatModuleSidebar =
      hasStartedChat ||
      Boolean(chatWorkflowStatus || chatWorkflowStatusRef.current) ||
      (Array.isArray(chatSessionModulePlanRef.current) && chatSessionModulePlanRef.current.length >= 2) ||
      (Array.isArray((journey as any)?.modulePlan) && (journey as any).modulePlan.length >= 2);
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
      key: 'source' | 'level' | 'objective' | 'format';
      question: string;
      options: string[];
    }> = [
      {
        key: 'source',
        question: 'What source should we use for this training?',
        options: [
          'KB only',
          'KB + uploaded files',
          'Uploaded files only',
          'No KB, no documents',
        ],
      },
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
    const currentPersonalizationQuestion = personalizationQuestions[personalizationStep];
    const handleSelectKbMode = (mode: KbGenerationMode) => {
      setShowRepSourcePopup(false);
      setKbGenerationChoice(mode);
      setShowPersonalizationCard(true);
      setPersonalizationStep(0);
      setPersonalizationAnswers({
        source:
          mode === 'kb_only'
            ? 'KB only'
            : mode === 'kb_and_uploads'
              ? 'KB + uploaded files'
              : mode === 'uploads_only'
                ? 'Uploaded files only'
                : 'No KB, no documents',
      });
      window.requestAnimationFrame(() => {
        chatTextareaRef.current?.focus();
      });
    };
    const handleSelectPersonalizationOption = (value: string) => {
      const current = personalizationQuestions[personalizationStep];
      if (!current) return;
      const nextAnswers = { ...personalizationAnswers, [current.key]: value };
      setPersonalizationAnswers(nextAnswers);
      if (current.key === 'source') {
        const selectedSource = String(value || '').toLowerCase();
        if (selectedSource.includes('kb +')) setKbGenerationChoice('kb_and_uploads');
        else if (selectedSource.includes('uploaded')) setKbGenerationChoice('uploads_only');
        else if (selectedSource.includes('no kb')) setKbGenerationChoice('none');
        else setKbGenerationChoice('kb_only');
      }
      if (personalizationStep >= personalizationQuestions.length - 1) {
        if (nextAnswers.source && nextAnswers.level && nextAnswers.objective && nextAnswers.format) {
          const summary = [
            'A few questions to personalize your training',
            'Q: What source should we use for this training?',
            `R : ${nextAnswers.source}`,
            'Q: What is your current level?',
            `R : ${nextAnswers.level}`,
            'Q: What is your main objective?',
            `R : ${nextAnswers.objective}`,
            'Q: Which format do you prefer?',
            `R : ${nextAnswers.format}`,
          ].join('\n');
          setShowPersonalizationCard(false);
          setPersonalizationStep(0);
          void sendChatMessage(summary, { personalizationProfileSnapshot: nextAnswers });
        }
        return;
      }
      const nextStep = personalizationStep + 1;
      setPersonalizationStep(nextStep);
    };
    const appendChatMessage = (
      role: 'user' | 'assistant',
      text: string,
      extra: Partial<{
        isStreaming: boolean;
        planInteractiveDisabled?: boolean;
        attachments?: Array<{ id: string; name: string; type: ContentUpload['type']; size?: number }>;
      }> = {}
    ) => {
      const id = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setChatMessages((prev) => [
        ...prev,
        { id, role, text, ...extra },
      ]);
      return id;
    };

    const startNewConversation = async () => {
      if (onForkNewJourneyTraining) {
        try {
          const { trainingJourneyId } = await onForkNewJourneyTraining();
          if (trainingJourneyId && /^[a-f\d]{24}$/i.test(trainingJourneyId)) {
            chatConfirmedJourneyIdRef.current = trainingJourneyId;
          }
        } catch (e) {
          console.error('[ContentUploader] onForkNewJourneyTraining failed', e);
          window.alert('Impossible de créer un nouveau parcours formation. Réessayez.');
          return;
        }
      } else {
        chatConfirmedJourneyIdRef.current = null;
      }
      // Hard reset chat + generated artifacts so next generations are based only on the new chat.
      chatSessionModulePlanRef.current = [];
      chatWorkflowStatusRef.current = null;
      setChatWorkflowStatus(null);
      setIsPlanSavedForChat(false);
      setGigSwitchHint(null);
      setChatMessages([]);
      setChatInput('');
      setUploads([]);
      setChatUploadedSources([]);
      setShowRepSourcePopup(false);
      setShowGeneratedFormationModal(false);
      setRepFormationDeckHtml(null);
      setRepFormationDeckHint(null);
      setFormationDeckModalTab('parcours');
      repFormationModalHydratedRef.current = false;
      setActiveChatSessionId(null);
      autoOpenedHistoryForJourneyRef.current = null;
      void refreshChatHistory();
      setIsHistoryOpen(false);
      setKbGenerationChoice(null);
      setChatKbDocuments([]);
      setShowPersonalizationCard(false);
      repPersonalizationBootstrapRef.current = false;
      setPersonalizationStep(0);
      setPersonalizationAnswers({});
      savedJourneyHydrateSeqRef.current += 1;
      setSavedJourneyHydrated(null);
      setIsSavedJourneyHydrating(false);
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

    openHistorySession = async (sessionId: string) => {
      if (!sessionId || isChatLoading) return;
      setIsHistoryLoading(true);
      try {
        const session = await AIService.getChatSession(sessionId);
        if (!session) return;
        const activeGig = String(activeChatGigId || '').trim();
        const sessionGig = String((session as any)?.gigId || '').trim();
        if (activeGig && sessionGig && activeGig !== sessionGig) {
          setGigSwitchHint('Cette conversation appartient à un autre gig. Rechargez la liste History du gig courant.');
          return;
        }
        setGigSwitchHint(null);
        const mappedMessages = (session.messages || [])
          .filter((m) => !isHiddenSystemCommandMessage(String(m?.text || '')))
          .map((m, idx) => {
          const raw = m.text || '';
          const readinessParsed = extractTrainingReadinessBlock(raw);
          return {
            id: `history-${sessionId}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
            text: readinessParsed.displayText,
            trainingReadiness: readinessParsed.trainingReadiness || undefined,
            isStreaming: false,
          };
          });
        setChatMessages(mappedMessages);
        const hasSavedPlanAck = mappedMessages.some(
          (m) => m.role === 'assistant' && /\bplan\s+enregistr[eé]\b/i.test(String(m.text || ''))
        );
        if (hasSavedPlanAck) setIsPlanSavedForChat(true);
        setActiveChatSessionId(session._id || sessionId);
        const sidPlan = (session as { modulePlan?: unknown[] })?.modulePlan;
        chatSessionModulePlanRef.current =
          Array.isArray(sidPlan) && sidPlan.length > 0 ? (sidPlan as Array<Record<string, unknown>>) : [];
        const sessionWorkflow = (session as { workflowStatus?: ChatWorkflowStatus })?.workflowStatus || null;
        chatWorkflowStatusRef.current = sessionWorkflow;
        setChatWorkflowStatus(sessionWorkflow);
        autoOpenedHistoryForJourneyRef.current =
          (session as any)?.trainingJourneyId || linkedTrainingJourneyMongoId() || null;
        setIsHistoryOpen(false);
        lastPodcastGenChatLengthRef.current = 0;
      } catch (error) {
        console.error('[ContentUploader] Failed to open history session:', error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    const handleChatGigChange = (nextGigId: string) => {
      const prevGigId = String(activeChatGigId || '').trim();
      setSelectedChatGigId(nextGigId);
      const changed = prevGigId && nextGigId && prevGigId !== nextGigId;
      if (!changed) return;
      autoOpenedHistoryForJourneyRef.current = null;
      const nextGigTitle =
        companyGigs.find((g: any) => String(g?._id || g?.id || '') === String(nextGigId))?.title ||
        `Gig ${String(nextGigId).slice(0, 8)}`;
      setGigSwitchHint(
        `Gig changé vers "${nextGigTitle}". La conversation la plus récente sera chargée automatiquement.`
      );
    };

    const generationPreferences = {
      selectedDuration: formatDurationForAi(journey?.estimatedDuration ? String(journey.estimatedDuration) : undefined),
      methodologyName: methodology?.name || 'Methodologie 360',
      methodologyDescription: methodology?.description,
      methodologyComponents: Array.isArray(methodology?.components)
        ? methodology.components.map((c) => String(c?.title || '').trim()).filter(Boolean)
        : [],
      trainingTitle: journey?.name,
      trainingDescription: journey?.description,
    };

    type TimelinePlanModule = {
      title: string;
      duration?: string;
      bullets: string[];
      sections: {
        objectives: string[];
        keyTopics: string[];
        activities: string[];
        evaluation: string[];
        deliverables: string[];
      };
    };

    const getStructuredModulePlanForUi = (): TimelinePlanModule[] => {
      const fromJourney = Array.isArray((journey as any)?.modulePlan) ? ((journey as any).modulePlan as any[]) : [];
      const fromSession = Array.isArray(chatSessionModulePlanRef.current) ? chatSessionModulePlanRef.current : [];
      const source = fromJourney.length >= 2 ? fromJourney : fromSession;
      if (!Array.isArray(source) || source.length < 2) return [];

      const normalizeDuration = (v: any): string | undefined => {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) return undefined;
        return `${Math.round(n)} min`;
      };

      return source
        .map((m: any): TimelinePlanModule => ({
          title: String(m?.title || '').trim(),
          duration: normalizeDuration(m?.durationMinutes),
          bullets: [],
          sections: {
            objectives: Array.isArray(m?.objectifs) ? m.objectifs.map((x: any) => String(x || '').trim()).filter(Boolean) : [],
            keyTopics: Array.isArray(m?.keyTopics) ? m.keyTopics.map((x: any) => String(x || '').trim()).filter(Boolean) : [],
            activities: [],
            evaluation: [],
            deliverables: [],
          },
        }))
        .filter((m) => m.title);
    };

    const parseTrainingPlan = (rawText: string): {
      title?: string;
      intro?: string;
      modules: TimelinePlanModule[];
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

      const titleLine = lines.find((line) => {
        const normalized = clean(line);
        // Keep only explicit heading-like titles, not conversational sentences.
        if (!/(plan de formation|training plan)/i.test(normalized)) return false;
        if (/^#+\s*/.test(line)) return true;
        if (/^(plan de formation|training plan)\s*[:\-]?\s*$/i.test(normalized)) return true;
        if (/^(plan de formation|training plan)\s*[:\-]\s+.+$/i.test(normalized)) return true;
        return false;
      });
      const introLines: string[] = [];
      const modules: TimelinePlanModule[] = [];
      let current: TimelinePlanModule | null = null;
      let activeSection: 'objectives' | 'keyTopics' | 'activities' | 'evaluation' | 'deliverables' | null = null;
      let activeNestedTitle: string | null = null;

      const splitMdRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.replace(/\*\*/g, '').replace(/`/g, '').trim());

      const parseModulesFromMarkdownTable = (): typeof modules => {
        const out: typeof modules = [];
        let header: string[] | null = null;
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('|') || !line.includes('|')) continue;
          if (/^\|[\s:-]+\|/.test(line)) continue;
          const cells = splitMdRow(line);
          if (!cells.length) continue;
          const joined = cells.join(' ').toLowerCase();
          if (!header) {
            if (/\bmodule\b/.test(joined) && (/\btitre\b/.test(joined) || /\btitle\b/.test(joined))) {
              header = cells.map((c) => c.toLowerCase());
              continue;
            }
            continue;
          }
          const idxMod = header.findIndex((h) => /\bmodule\b/.test(h));
          const idxTitle = header.findIndex((h) => /\btitre\b/.test(h) || /\btitle\b/.test(h));
          const idxDur = header.findIndex((h) => /\bdur[eé]e\b/.test(h) || /\bduration\b/.test(h));
          const idxObj = header.findIndex((h) => /objectif/.test(h));
          if (idxMod < 0 || idxTitle < 0) continue;
          const modCell = cells[idxMod] || '';
          const titleCell = cells[idxTitle] || '';
          const durCell = idxDur >= 0 ? cells[idxDur] || '' : '';
          const objCell = idxObj >= 0 ? cells[idxObj] || '' : '';
          const modNum = modCell.replace(/[^0-9]/g, '');
          if (!modNum || !titleCell) continue;
          out.push({
            title: `Module ${modNum} - ${titleCell}`,
            duration: durCell || undefined,
            bullets: [],
            sections: {
              objectives: objCell ? [objCell] : [],
              keyTopics: titleCell ? [`Parcours: ${titleCell}`] : [],
              activities: [],
              evaluation: [],
              deliverables: [],
            },
          });
        }
        return out;
      };

      /** Accepts e.g. "📚 Module 1 : …", "🖥️ Module 2 – …", "## Module 3" (hash stripped earlier), not "Voici Module 1". */
      const tryParseModuleHeadingLine = (n: string): { tail: string } | null => {
        const m = n.match(/\bmodule\s*\d+\s*[—:–-]?\s*(.+)$/i);
        if (!m?.[1]) return null;
        const i = n.search(/\bmodule\s*\d+/i);
        if (i < 0 || i > 24) return null;
        const prefix = n.slice(0, i);
        if (/[a-zà-ÿæœ]/i.test(prefix)) return null;
        let tail = String(m[1])
          .trim()
          .replace(/^[:\s–-]+/u, '')
          .trim();
        // Guard against malformed headings like "Module 5 - -> Module 2 -> Module 3".
        if ((tail.match(/\bmodule\s*\d+\b/gi) || []).length >= 2) return null;
        if (/^[→>-]*\s*module\s*\d+\b/i.test(tail)) return null;
        if (/^souhaitez[-\s]*vous/i.test(tail)) return null;
        tail = tail.replace(/\s*[→>-]+\s*module\s*\d+[\s\S]*$/i, '').trim();
        if (!tail) return null;
        return { tail };
      };

      for (const line of lines) {
        const normalized = clean(line);
        const moduleHeading = tryParseModuleHeadingLine(normalized);
        if (moduleHeading) {
          if (current) modules.push(current);
          const tail = moduleHeading.tail;
          const idx = modules.length + 1;
          current = {
            title: tail ? `Module ${idx} - ${tail}` : `Module ${idx}`,
            bullets: [],
            sections: {
              objectives: [],
              keyTopics: [],
              activities: [],
              evaluation: [],
              deliverables: [],
            },
          };
          activeSection = null;
          activeNestedTitle = null;
          continue;
        }
        if (!current) {
          if (
            normalized &&
            !/^(plan de formation|training plan)/i.test(normalized) &&
            !/^module\s*\d+/i.test(normalized) &&
            !tryParseModuleHeadingLine(normalized)
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

        if (/^(🎯\s*)?(objectifs?|learning\s+objectives?)(\b|[\s:–-]|$)/i.test(normalized)) {
          activeSection = 'objectives';
          activeNestedTitle = null;
          continue;
        }
        if (
          /^(📌\s*)?(key\s*topics|topics|th[eè]mes?\s*cl[eé]s?|points?\s*cl[eé]s?|sujets?\s*cl[eé]s?)(\b|[\s:–-]|$)/i.test(
            normalized
          )
        ) {
          activeSection = 'keyTopics';
          activeNestedTitle = null;
          continue;
        }
        if (/^(🧩\s*)?activit[eé]s?(\b|[\s:–-]|$)/i.test(normalized)) {
          activeSection = 'activities';
          activeNestedTitle = null;
          continue;
        }
        if (/^(📦|📋)?\s*livrables?(\b|[\s:–-]|$)/i.test(normalized) || /^(📦|📋)?\s*deliverables?(\b|[\s:–-]|$)/i.test(normalized)) {
          activeSection = 'deliverables';
          activeNestedTitle = null;
          continue;
        }
        if (/^(📊\s*)?(indicateur d['’]?[eé]valuation|evaluations?|évaluations?)(\b|[\s:–-]|$)/i.test(normalized)) {
          activeSection = 'evaluation';
          activeNestedTitle = null;
          continue;
        }

        // Plan LMS : "### 📌 1.1 …" souvent sans ligne "Key topics" explicite
        if (/^📌\s*(livrables?|deliverables?)(\b|[\s:–-]|$)/i.test(normalized)) {
          activeSection = 'deliverables';
          activeNestedTitle = null;
          continue;
        }
        if (/^📌\s*\d+(?:\.\d+)+\s+.+$/i.test(normalized)) {
          activeSection = 'keyTopics';
          activeNestedTitle = normalized.replace(/^📌\s*/i, '').trim();
          continue;
        }
        if (/^📌\s+.+/i.test(normalized) && !/key\s*topics/i.test(normalized)) {
          activeSection = 'keyTopics';
          activeNestedTitle = normalized.replace(/^📌\s*/i, '').trim();
          continue;
        }

        if (activeSection === 'objectives' && !/^[-•*]/.test(line)) {
          const lower = normalized.toLowerCase();
          if (/^(contenu|notions|definitions?|pr[eé]requis|parcours|th[eè]matiques?)$/i.test(lower)) {
            activeNestedTitle = normalized;
            continue;
          }
          if (/^livrables?$|^deliverables?$/i.test(lower)) {
            activeNestedTitle = null;
            activeSection = 'deliverables';
            continue;
          }
          if (/^activit[eé]s?$/i.test(lower)) {
            activeNestedTitle = null;
            activeSection = 'activities';
            continue;
          }
        }

        const isNestedTitle = activeSection && /^[-•*]?\s*[^:]{3,}:\s*$/.test(line);
        const isNestedNumberedTitle =
          !!activeSection && /^[-•*]\s*(?:[📌🎯🧩📊]\s*)?\d+(\.\d+)+\s+.+$/i.test(line);
        if (isNestedTitle) {
          activeNestedTitle = normalized.replace(/:\s*$/, '').trim();
          continue;
        }
        if (isNestedNumberedTitle) {
          activeNestedTitle = normalized.replace(/^[-•*]\s*/, '').trim();
          continue;
        }

        // Puces avant tout titre de section : les ranger sous "sujets clés" pour garder des blocs structurés
        if (current && !activeSection && (/^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line))) {
          activeSection = 'keyTopics';
        }

        if (/^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line) || normalized.includes(':')) {
          const stripped = normalized
            .replace(/^(objectifs?|objectives?)\s*:\s*/i, '')
            .replace(/^(contenu|content)\s*:\s*/i, '')
            .replace(/^\d+[.)]\s+/, '')
            .trim();
          const lower = stripped.toLowerCase();
          if (!stripped) continue;
          if (['objectif', 'objectifs', 'contenu', 'content'].includes(lower)) continue;
          current.bullets.push(stripped);
          if (activeSection) {
            current.sections[activeSection].push(
              activeNestedTitle ? `${activeNestedTitle} > ${stripped}` : stripped
            );
          }
        }
      }

      if (current) modules.push(current);
      let effectiveModules = modules;
      if (effectiveModules.length < 2) {
        const fromTable = parseModulesFromMarkdownTable();
        if (fromTable.length >= 2) {
          effectiveModules = fromTable;
        }
      }
      const finalizedModules = effectiveModules.map((m) => {
        let title = String(m.title || '').trim();
        let duration = m.duration;
        const durationFromTitle = title.match(/⏱️\s*([^\n]+)$/i);
        if (durationFromTitle?.[1]) {
          duration = String(durationFromTitle[1]).trim();
          title = title.replace(/\s*⏱️\s*[^\n]+$/i, '').trim();
        }
        const durationFromParen = title.match(
          /\(\s*(\d+\s*(?:min|minutes?|h(?:eures?)?))\s*\)\s*$/i
        );
        if (durationFromParen?.[1]) {
          duration = duration || String(durationFromParen[1]).trim();
          title = title.replace(/\s*\(\s*\d+\s*(?:min|minutes?|h(?:eures?)?)\s*\)\s*$/i, '').trim();
        }
        title = title.replace(/^[🟢🟡🟠🔵🟣🟤]\s*/u, '').trim();
        return { ...m, title, duration };
      });
      const resolvedTitle = titleLine ? clean(titleLine) : undefined;
      const resolvedIntro = introLines.slice(0, 2).join(' ');
      return {
        title: resolvedTitle,
        intro: resolvedTitle && resolvedIntro === resolvedTitle ? '' : resolvedIntro,
        modules: finalizedModules,
      };
    };

    const extractStyleBlueprint = (rawText: string): {
      moduleCardThemes: Array<{ bg: string; border: string; text?: string }>;
      titleColor?: string;
      accentColor?: string;
      typography?: {
        bodyFont: string;
        headingFont: string;
      };
      layoutPreset?: 'cards' | 'editorial' | 'minimal';
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
        canvasBg: string;
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
            canvasBg: '#ffffff',
          },
          typography: {
            bodyFont: 'Inter, system-ui, sans-serif',
            headingFont: 'Inter, system-ui, sans-serif',
          },
          layoutPreset: 'cards' as const,
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
            canvasBg: '#ffffff',
          },
          typography: {
            bodyFont: '"Segoe UI", Inter, system-ui, sans-serif',
            headingFont: '"Segoe UI", Inter, system-ui, sans-serif',
          },
          layoutPreset: 'editorial' as const,
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
            canvasBg: '#fffdf8',
          },
          typography: {
            bodyFont: '"Trebuchet MS", "Segoe UI", sans-serif',
            headingFont: '"Trebuchet MS", "Segoe UI", sans-serif',
          },
          layoutPreset: 'minimal' as const,
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
              canvasBg: safeHex(parsed.contentTheme.canvasBg, defaults.contentTheme.canvasBg),
              moduleShape:
                parsed.contentTheme.moduleShape === 'square' || parsed.contentTheme.moduleShape === 'soft'
                  ? parsed.contentTheme.moduleShape
                  : 'rounded',
            }
          : defaults.contentTheme;
        const typography = parsed?.typography && typeof parsed.typography === 'object'
          ? {
              bodyFont:
                typeof parsed.typography.bodyFont === 'string' && parsed.typography.bodyFont.trim()
                  ? parsed.typography.bodyFont.trim()
                  : defaults.typography.bodyFont,
              headingFont:
                typeof parsed.typography.headingFont === 'string' && parsed.typography.headingFont.trim()
                  ? parsed.typography.headingFont.trim()
                  : defaults.typography.headingFont,
            }
          : defaults.typography;
        const layoutPreset =
          parsed?.layoutPreset === 'cards' || parsed?.layoutPreset === 'editorial' || parsed?.layoutPreset === 'minimal'
            ? parsed.layoutPreset
            : defaults.layoutPreset;
        return {
          moduleCardThemes: themes.length > 0 ? themes : defaults.moduleCardThemes,
          titleColor: safeHex(parsed?.titleColor, defaults.titleColor),
          accentColor: safeHex(parsed?.accentColor, defaults.accentColor),
          typography,
          layoutPreset,
          contentTheme,
        };
      } catch {
        return defaults;
      }
    };

    const stripStyleBlueprint = (rawText: string): string => stripHarxStyleBlocks(rawText);

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
      const pendingUpload = uploads.some(
        (u) => u.status === 'uploading' || u.status === 'processing'
      );
      if (pendingUpload) return;
      setChatInput('');
      setShowRepSourcePopup(false);
      // If user starts typing freely, do not keep onboarding source card visible.
      if (showPersonalizationCard) {
        setShowPersonalizationCard(false);
        setKbGenerationChoice((prev) => prev || 'none');
        setPersonalizationAnswers((prev) => ({
          ...prev,
          source: prev.source || 'No KB, no documents',
        }));
      }
      // Snapshot analyzed uploads so they appear attached to the user bubble,
      // then clear the composer so they don't keep showing below the input.
      const attachmentsForMessage = uploads
        .filter((u) => u.status === 'analyzed')
        .map((u) => ({
          id: u.id,
          name: u.name,
          type: u.type,
          size: (u as any).size,
        }));
      await sendChatMessage(message, {
        attachments: attachmentsForMessage.length > 0 ? attachmentsForMessage : undefined,
      });
    };

    const sendChatMessage = async (
      message: string,
      options?: {
        appendUser?: boolean;
        replaceAssistantId?: string;
        historyMessages?: Array<{ id: string; role: 'user' | 'assistant'; text: string; isStreaming?: boolean }>;
        attachments?: Array<{ id: string; name: string; type: ContentUpload['type']; size?: number }>;
        /** Last-step questionnaire answers (React state can lag one tick behind). */
        personalizationProfileSnapshot?: Partial<{
          source: string;
          level: string;
          objective: string;
          format: string;
        }>;
      }
    ): Promise<{ ok: boolean; planSaved?: boolean; error?: string }> => {
      const cleanMessage = message.trim();
      if (!cleanMessage || isChatLoading) return { ok: false, error: 'busy_or_empty' };
      let streamingAssistantId: string | null = null;
      const getHiddenCommandUserLabel = (msg: string): string | null => {
        if (msg === '__VALIDATE_MODULE_CONTENT__') return 'Je valide le contenu du module.';
        if (msg === '__VALIDATE_PLAN__') return 'Je valide le plan.';
        if (msg === '__VALIDATE_ALL_MODULES_CONTENT__') return 'Je valide le contenu de tous les modules.';
        return null;
      };
      const shouldAppendUser = options?.appendUser !== false;
      if (shouldAppendUser) {
        appendChatMessage(
          'user',
          cleanMessage,
          options?.attachments && options.attachments.length > 0
            ? { attachments: options.attachments }
            : {}
        );
      } else {
        const hiddenCommandLabel = getHiddenCommandUserLabel(cleanMessage);
        if (hiddenCommandLabel) {
          appendChatMessage('user', hiddenCommandLabel);
        }
      }
      // After the attachments are snapshotted on the user bubble, clear the composer tray
      // so the same files don't linger under the input.
      if (options?.attachments && options.attachments.length > 0) {
        const attachedIds = new Set(options.attachments.map((a) => a.id));
        setUploads((prev) => prev.filter((u) => !attachedIds.has(u.id)));
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
        const personalizationForContext = options?.personalizationProfileSnapshot || personalizationAnswers;
        const sourcePreference = String(personalizationForContext.source || '').toLowerCase();
        const sourceChoiceFromQuestions: KbGenerationMode | null =
          sourcePreference.includes('kb +') || sourcePreference.includes('kb et')
            ? 'kb_and_uploads'
            : sourcePreference.includes('uploaded') || sourcePreference.includes('docs only')
              ? 'uploads_only'
              : sourcePreference.includes('no kb') || sourcePreference.includes('no documents')
                ? 'none'
                : sourcePreference.includes('kb')
                  ? 'kb_only'
                  : null;
        const requestedMode = kbGenerationChoice || sourceChoiceFromQuestions;
        const autoMode: KbGenerationMode =
          hasKbForChat && hasUploadsForChat
            ? 'kb_and_uploads'
            : hasKbForChat
              ? 'kb_only'
              : hasUploadsForChat
                ? 'uploads_only'
                : 'none';
        const effectiveGenerationMode: KbGenerationMode = requestedMode || autoMode;
        const usesKbForChat = effectiveGenerationMode === 'kb_only' || effectiveGenerationMode === 'kb_and_uploads';
        const usesUploadsForChat = effectiveGenerationMode === 'uploads_only' || effectiveGenerationMode === 'kb_and_uploads';
        const uploadsForChat = usesUploadsForChat ? effectiveAnalyzedUploads : [];

        const sourceHistory = (options?.historyMessages || chatMessages).filter(
          (m) => !isHiddenSystemCommandMessage(String(m?.text || ''))
        );
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
        const isPostPersonalizationSummary = cleanMessage.startsWith(
          'A few questions to personalize your training'
        );
        const isPlanEditIntent =
          /(modifi|modifier|change|changer|ajuste|ajouter|supprim|retir|update|edit|corrig|restructur|reorganis|adapt)/i.test(cleanMessage) &&
          (/\bmodule\s*\d+\b/i.test(cleanMessage) || /\bmodule\b/i.test(cleanMessage));
        const isFullTrainingIntentByText =
          /(contenu\s+de\s+formation|formation\s+compl[eè]te|g[ée]n[ée]rer\s+une\s+formation|creer\s+une\s+formation)/i.test(cleanMessage) ||
          /(je\s+veux|donne|g[ée]n[ée]r\w*|cr[ée]e\w*|produi\w*|pr[ée]par\w*|lance\w*)[\s\S]{0,40}(la\s+)?formation/i.test(cleanMessage) ||
          /(tout\s+le\s+contenu|tous\s+les\s+modules|formation\s+enti[eè]re)/i.test(cleanMessage);
        const requestedOutput: 'training_plan' | 'full_training_content' | 'module_content' | 'general_chat' =
          isPostPersonalizationSummary
            ? 'training_plan'
            : isPlanEditIntent
            ? 'training_plan'
            : /(contenu\s+d[’']?un\s+module|contenu\s+du\s+module|module\s+\d+|d[ée]taille\s+le\s+module|detaille\s+le\s+module)/i.test(cleanMessage)
            ? 'module_content'
            : isFullTrainingIntentByText
              ? 'full_training_content'
              : /(plan\s+de\s+formation|g[ée]n[ée]rer\s+un\s+plan|cr[ée]er\s+un\s+plan)/i.test(cleanMessage)
                ? 'training_plan'
                : 'general_chat';
        const requestedModuleReference =
          requestedOutput === 'module_content'
            ? (cleanMessage.match(/module\s+\d+/i)?.[0] || cleanMessage.match(/module\s*[:\-]\s*([^\n]+)/i)?.[1] || '').trim()
            : '';

        const journeyModulePlanRaw = Array.isArray((journey as any)?.modulePlan) ? ((journey as any).modulePlan as any[]) : [];
        const sessionPlanRaw = chatSessionModulePlanRef.current || [];
        const normalizePlanItem = (m: any) => ({
          title: String(m?.title || '').trim(),
          objectifs: Array.isArray(m?.objectifs) ? m.objectifs : [],
          keyTopics: Array.isArray(m?.keyTopics) ? m.keyTopics : [],
          durationMinutes: Number(m?.durationMinutes || 0) || undefined,
        });
        // Prefer latest chat-session plan while user iterates in chat (add/remove/modify modules).
        // Journey plan can be older until explicit save/validation.
        const effectiveModulePlanSource =
          sessionPlanRaw.length >= 2 ? sessionPlanRaw : journeyModulePlanRaw;
        const journeyModulePlanForContext = effectiveModulePlanSource.map(normalizePlanItem).filter((x) => x.title);
        const curriculumOutlineFromSessionPlan =
          journeyModulePlanForContext.length >= 2
            ? journeyModulePlanForContext.map((m) => ({
                title: String(m?.title || '').trim(),
                hasSections: false,
                sectionCount: 0,
              }))
            : [];
        const curriculumOutlineForContext =
          Array.isArray(generatedCurriculum?.modules) && (generatedCurriculum.modules as any[]).length > 0
            ? (generatedCurriculum.modules as any[]).map((m) => ({
                title: String(m?.title || '').trim(),
                hasSections: Array.isArray(m?.sections) && m.sections.length > 0,
                sectionCount: Array.isArray(m?.sections) ? m.sections.length : 0,
              }))
            : curriculumOutlineFromSessionPlan;

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
          methodologyDescription: generationPreferences.methodologyDescription || null,
          methodologyComponents: generationPreferences.methodologyComponents,
          personalizationProfile: {
            source: personalizationForContext.source || null,
            level: personalizationForContext.level || null,
            objective: personalizationForContext.objective || null,
            format: personalizationForContext.format || null,
          },
          bootstrapTrainingPlanFromGig: isPostPersonalizationSummary,
          sourceModeRequested: requestedMode || null,
          requestedOutput,
          requestedModuleReference: requestedModuleReference || null,
          trainingJourneyId: linkedTrainingJourneyMongoId() || null,
          conversationHistory: historyForContext,
          canGenerateTraining: canProceed,
          curriculumOutline: curriculumOutlineForContext,
          journeyModulePlan: journeyModulePlanForContext,
          modulePlan: journeyModulePlanForContext.length >= 2 ? journeyModulePlanForContext : [],
        });

        streamingAssistantId = options?.replaceAssistantId || appendChatMessage('assistant', '', { isStreaming: true });
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
        const abortController = new AbortController();
        activeChatAbortRef.current = abortController;
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
          signal: abortController.signal,
        });
        if (streamResult.sessionId && streamResult.sessionId !== activeChatSessionId) {
          setActiveChatSessionId(streamResult.sessionId);
        }
        if (streamResult.planSaved && streamResult.journeyId && /^[a-f\d]{24}$/i.test(streamResult.journeyId)) {
          chatConfirmedJourneyIdRef.current = streamResult.journeyId;
          setIsPlanSavedForChat(true);
        }
        const rawAssistant = streamResult.text?.trim() || "Je n'ai pas pu generer une reponse pour le moment.";
        const readinessParsed = extractTrainingReadinessBlock(rawAssistant);
        const finalDisplayText = String(readinessParsed.displayText || '').trim();
        const hasReadinessCard = !!readinessParsed.trainingReadiness;
        setChatMessages((prev) => {
          const next = prev
            .map((m) =>
              m.id === streamingAssistantId
                ? {
                    ...m,
                    text: readinessParsed.displayText,
                    trainingReadiness: readinessParsed.trainingReadiness || undefined,
                    isStreaming: false,
                    // Masque la bulle de texte vide quand la réponse ne contient qu'une carte
                    // (ex: réponse à __VALIDATE_PLAN__ qui ne renvoie qu'un bloc readiness).
                    suppressText: !finalDisplayText && hasReadinessCard ? true : m.suppressText,
                  }
                : { ...m }
            )
            // Supprime complètement l'éventuelle bulle assistant qui n'a ni texte ni carte
            // (sinon une bulle vide persiste dans le thread).
            .filter(
              (m) =>
                !(
                  m.id === streamingAssistantId &&
                  !String(m.text || '').trim() &&
                  !m.trainingReadiness
                )
            );
          if (streamResult.planSaved) {
            const ackIdx = next.findIndex((m) => m.id === streamingAssistantId);
            if (ackIdx >= 2) {
              const planMsg = next[ackIdx - 2];
              if (planMsg?.role === 'assistant') {
                planMsg.planInteractiveDisabled = true;
              }
            }
          }
          return next;
        });
        const sessionIdForRefresh = streamResult.sessionId || activeChatSessionId;
        if (sessionIdForRefresh) {
          try {
            const refreshed = await AIService.getChatSession(sessionIdForRefresh);
            const mp = (refreshed as { modulePlan?: unknown[] })?.modulePlan;
            if (Array.isArray(mp) && mp.length >= 2) {
              chatSessionModulePlanRef.current = mp as Array<Record<string, unknown>>;
            }
            const refreshedWorkflow = (refreshed as { workflowStatus?: ChatWorkflowStatus })?.workflowStatus || null;
            chatWorkflowStatusRef.current = refreshedWorkflow;
            setChatWorkflowStatus(refreshedWorkflow);
          } catch {
            /* ignore refresh errors */
          }
        }
        if (analyzedUploads.length > 0) {
          const namesThisRound = uploads
            .filter((u) => u.status === 'analyzed' && !!u.aiAnalysis)
            .map((u) => String(u.name || '').trim())
            .filter(Boolean);
          if (namesThisRound.length > 0) {
            setRepSessionAnalyzedFileNames((prev) => {
              const next = [...prev];
              for (const n of namesThisRound) {
                if (n && !next.includes(n)) next.push(n);
              }
              return next.slice(0, 20);
            });
          }
          // Files were already captured for this chat context; keep input clean for next prompts.
          setUploads([]);
        }
        void refreshChatHistory();
        return { ok: true, planSaved: !!streamResult.planSaved };
      } catch (error: any) {
        const isAbort =
          error?.name === 'AbortError' ||
          /aborted|aborterror/i.test(String(error?.message || ''));
        if (isAbort) {
          if (streamingAssistantId) {
            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === streamingAssistantId
                  ? { ...m, isStreaming: false }
                  : m.isStreaming
                    ? { ...m, isStreaming: false }
                    : m
              )
            );
          }
          return { ok: false, error: 'aborted' };
        }
        console.error('[ContentUploader] Chat backend call failed:', error);
        const errorMessage = error?.message
          ? `Erreur backend: ${error.message}`
          : "Impossible de contacter le backend Claude pour l'instant.";
        if (streamingAssistantId) {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === streamingAssistantId
                ? {
                    ...m,
                    text: errorMessage,
                    isStreaming: false,
                    trainingReadiness: undefined,
                    suppressText: false,
                  }
                : m.isStreaming
                  ? { ...m, isStreaming: false }
                  : m
            )
          );
        } else {
          appendChatMessage('assistant', errorMessage);
        }
        return { ok: false, error: errorMessage };
      } finally {
        activeChatAbortRef.current = null;
        setIsChatLoading(false);
        if (repOnboardingLayout) {
          void hydrateSavedJourneyFromApi();
        }
      }
    };

    const handleStopChatGeneration = () => {
      if (!isChatLoading) return;
      const workflow = chatWorkflowStatus || chatWorkflowStatusRef.current;
      const modules = Array.isArray(workflow?.modules) ? workflow.modules : [];
      const currentIdx = modules.findIndex((m) => m.status !== 'completed');
      const canSuggestGenerateCurrentModule =
        (isPlanSavedForChat || workflow?.plan === 'completed') &&
        currentIdx >= 0 &&
        currentIdx < modules.length;
      const stopReadiness: TrainingReadinessPayload | undefined = canSuggestGenerateCurrentModule
        ? {
            readiness: 'incomplete',
            missingModules: [],
            messageFr: `Génération arrêtée. Cliquez sur "Générer le contenu du module ${currentIdx + 1}" pour reprendre.`,
            actions: [
              {
                id: 'generate_current_module',
                label: `Générer le contenu du module ${currentIdx + 1}`,
              },
            ],
          }
        : undefined;
      activeChatAbortRef.current?.abort();
      activeChatAbortRef.current = null;
      setIsChatLoading(false);
      setChatMessages((prev) =>
        prev.map((m) => {
          if (!m.isStreaming) return m;
          if (m.role !== 'assistant') return { ...m, isStreaming: false };
          return {
            ...m,
            isStreaming: false,
            trainingReadiness: stopReadiness || m.trainingReadiness,
            suppressText: false,
          };
        })
      );
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
      if (repOnboardingLayout) {
        setShowImagePresentationModal(false);
        setFormationDeckModalTab('parcours');
        setFormationViewerSlideIndex(0);
        setShowGeneratedFormationModal(true);
        void hydrateSavedJourneyFromApi();
        setRepFormationDeckHint('Mode REP: affichage images désactivé ici, ouverture du viewer formation.');
        return;
      }
      const candidate =
        generatedImageSet?.items?.length ? generatedImageSet : null;
      if (!candidate) {
        setFormationDeckModalTab('parcours');
        setFormationViewerSlideIndex(0);
        setShowGeneratedFormationModal(true);
        void hydrateSavedJourneyFromApi();
        setRepFormationDeckHint(
          'Aucune image générée. Ouverture du viewer de formation (modules/sections) à la place.'
        );
        return;
      }
      setActiveImageSet(candidate);
      setActiveImageIndex(0);
      setShowImagePresentationModal(true);
    };

    const openStructuredSlidesExportPptx = async () => {
      if (!structuredSlides?.slides?.length) return;
      const presentation = {
        title: structuredSlides.title || 'Training slides',
        slides: structuredSlides.slides.map((s: any) => ({
          title: s.title,
          content: Array.isArray(s.bullets) ? s.bullets.map((b: string) => `• ${b}`).join('\n') : '',
          notes: s.notes || '',
        })),
      };
      await AIService.exportPresentationToPPTX(presentation);
    };

    const openStructuredSlidesExportPdf = () => {
      if (!structuredSlides?.slides?.length) return;
      const html = `
        <html><head><title>${String(structuredSlides.title || 'Slides')}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:20px;background:#f8fafc}
          .slide{page-break-after:always;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:20px;margin:0 0 20px}
          h2{margin:0 0 10px;color:#0f172a} ul{margin:0;padding-left:20px} li{margin:8px 0}
        </style></head><body>
        ${structuredSlides.slides
          .map(
            (s: any) =>
              `<section class="slide"><h2>${String(s.title || '').replace(/</g, '&lt;')}</h2><ul>${
                (s.bullets || [])
                  .map((b: string) => `<li>${String(b || '').replace(/</g, '&lt;')}</li>`)
                  .join('')
              }</ul></section>`
          )
          .join('')}
        </body></html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
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

    const handleQuizQuestionFieldChange = (
      questionIndex: number,
      field: 'text' | 'explanation' | 'correctAnswer',
      value: string | number
    ) => {
      setEditableQuizQuestions((prev) =>
        prev.map((q, idx) => {
          if (idx !== questionIndex) return q;
          if (field === 'correctAnswer') {
            return { ...q, correctAnswer: Number(value) };
          }
          return { ...q, [field]: String(value) } as QuizQuestion;
        })
      );
      setQuizSavedHint(null);
    };

    const handleQuizOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
      setEditableQuizQuestions((prev) =>
        prev.map((q, idx) => {
          if (idx !== questionIndex) return q;
          const nextOptions = Array.isArray(q.options) ? [...q.options] : [];
          nextOptions[optionIndex] = value;
          return { ...q, options: nextOptions };
        })
      );
      setQuizSavedHint(null);
    };

    const handleDeleteQuizQuestion = (questionIndex: number) => {
      setEditableQuizQuestions((prev) => prev.filter((_, idx) => idx !== questionIndex));
      setQuizSavedHint(null);
    };

    const handleSaveAllQuizzes = async () => {
      if (isQuizSaving) return;
      try {
        setIsQuizSaving(true);
        const cleaned = editableQuizQuestions
          .map((q) => {
            const options = Array.isArray(q.options)
              ? q.options.map((opt) => String(opt || '').trim()).filter(Boolean)
              : [];
            const boundedCorrectAnswer = Math.min(Math.max(Number(q.correctAnswer) || 0, 0), Math.max(options.length - 1, 0));
            return {
              ...q,
              text: String(q.text || '').trim(),
              explanation: String(q.explanation || '').trim(),
              options,
              correctAnswer: boundedCorrectAnswer,
            };
          })
          .filter((q) => q.text && q.options.length >= 2);
        setQuizQuestions(cleaned);
        setEditableQuizQuestions(cleaned);
        setQuizSavedHint(`${cleaned.length} question(s) saved.`);
      } finally {
        setIsQuizSaving(false);
      }
    };

    const updateActiveImageItemField = (field: 'title' | 'prompt', value: string) => {
      if (!activeImageSet?.items?.length) return;
      const idx = Math.max(0, Math.min(activeImageIndex, activeImageSet.items.length - 1));
      const nextItems = activeImageSet.items.map((item, itemIdx) =>
        itemIdx === idx
          ? { ...item, [field]: value }
          : item
      );
      const nextSet = { ...activeImageSet, items: nextItems };
      setActiveImageSet(nextSet);
      setGeneratedImageSet(nextSet);
      setMediaEditHint(null);
    };

    const handleSaveImageSet = async () => {
      if (!activeImageSet || isMediaSaving) return;
      try {
        setIsMediaSaving(true);
        const saved = await AIService.saveTrainingImageSet({
          imageSetId: activeImageSet._id,
          title: String(activeImageSet.title || 'Training images').trim() || 'Training images',
          trainingTitle: activeImageSet.trainingTitle || resolvedTrainingMaterialTitle || undefined,
          language: activeImageSet.language || 'fr',
          renderMode: activeImageSet.renderMode || imageRenderMode,
          gigId: activeChatGigId ? String(activeChatGigId) : undefined,
          companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
          trainingJourneyId: linkedTrainingJourneyMongoId(),
          items: Array.isArray(activeImageSet.items) ? activeImageSet.items : [],
        });
        setActiveImageSet(saved);
        setGeneratedImageSet(saved);
        setMediaEditHint('Image changes saved to backend.');
        await refreshSavedImageSets();
      } catch (e: any) {
        setPodcastError(e?.message || 'Unable to save image set.');
      } finally {
        setIsMediaSaving(false);
      }
    };

    const handleDeleteActiveImage = () => {
      if (!activeImageSet?.items?.length) return;
      const idx = Math.max(0, Math.min(activeImageIndex, activeImageSet.items.length - 1));
      const nextItems = activeImageSet.items.filter((_, itemIdx) => itemIdx !== idx);
      const nextSet = { ...activeImageSet, items: nextItems };
      setActiveImageSet(nextSet);
      setGeneratedImageSet(nextSet);
      setActiveImageIndex((prev) => Math.max(0, Math.min(prev, Math.max(nextItems.length - 1, 0))));
      setMediaEditHint('Image removed from current presentation.');
    };

    const updateStructuredSlideField = (slideIdx: number, field: 'title' | 'notes' | 'bullets', value: string) => {
      if (!structuredSlides?.slides?.length) return;
      const nextSlides = structuredSlides.slides.map((slide, idx) => {
        if (idx !== slideIdx) return slide;
        if (field === 'bullets') {
          const parsedBullets = String(value || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
          return { ...slide, bullets: parsedBullets };
        }
        return { ...slide, [field]: value } as any;
      });
      setStructuredSlides({ ...structuredSlides, slides: nextSlides });
      setMediaEditHint(null);
    };

    const handleDeleteStructuredSlide = (slideIdx: number) => {
      if (!structuredSlides?.slides?.length) return;
      const nextSlides = structuredSlides.slides.filter((_, idx) => idx !== slideIdx);
      setStructuredSlides({ ...structuredSlides, slides: nextSlides });
      setStructuredSlideIndex((prev) => Math.max(0, Math.min(prev, Math.max(nextSlides.length - 1, 0))));
      setMediaEditHint('HTML slide removed.');
    };

    const handleSaveStructuredSlides = async () => {
      if (!structuredSlides || isMediaSaving) return;
      try {
        setIsMediaSaving(true);
        const saved = await AIService.saveStructuredSlides({
          slidesSetId: structuredSlides._id,
          title: String(structuredSlides.title || resolvedTrainingMaterialTitle || 'Structured slides').trim(),
          language: structuredSlides.language || 'fr',
          theme: structuredSlides.theme,
          slides: Array.isArray(structuredSlides.slides) ? structuredSlides.slides : [],
          gigId: activeChatGigId ? String(activeChatGigId) : undefined,
          companyId: company?.id || company?._id ? String(company.id || company._id) : undefined,
          trainingJourneyId: linkedTrainingJourneyMongoId(),
        });
        setStructuredSlides(saved);
        setMediaEditHint('HTML slides saved to backend.');
      } catch (e: any) {
        setPodcastError(e?.message || 'Unable to save HTML slides.');
      } finally {
        setIsMediaSaving(false);
      }
    };

    const renderInteractiveTrainingTimeline = (
      messageId: string,
      rawText: string,
      canGenerateFromPlan: boolean
    ): React.ReactNode | null => {
      const text = String(rawText || '').trim();
      if (!text) return null;
      const looksLikeModuleContent =
        /###\s*(📚|🧪|✅|📝)\s*|explication\s+d[ée]taill[ée]e|mini\s+quiz|auto[-\s]?[eé]valuation|hands-on\s+exercise/i.test(
          text
        );
      if (looksLikeModuleContent) return null;
      const likelyPlanMessage =
        /(plan\s+de\s+formation|training\s+plan|^\s*##\s*module\s*\d+|^\s*module\s*\d+\s*[-:])/im.test(text);
      // Ne réaffiche le timeline du plan QUE sur un message qui contient effectivement un plan.
      // Sur un simple accusé de validation (module / plan) ou toute autre réponse courte,
      // ne pas ré-injecter le plan sauvegardé (sinon l'UI semble répondre « en affichant le plan »
      // alors que la demande était une simple validation).
      if (!likelyPlanMessage) return null;
      const parsedPlan = parseTrainingPlan(text);
      const structuredModules = getStructuredModulePlanForUi();
      const timelineModules =
        parsedPlan.modules.length >= 2 ? parsedPlan.modules : structuredModules;
      if (timelineModules.length >= 2) {
        const usingParsedForCurrentMessage = parsedPlan.modules.length >= 2;
        const usingStructuredPlan = !usingParsedForCurrentMessage && structuredModules.length >= 2;
        const timelineTitle = usingStructuredPlan
          ? 'Plan de formation (sauvegardé)'
          : parsedPlan.title || 'Plan de formation';
        const timelineIntro = usingParsedForCurrentMessage ? parsedPlan.intro : '';
        return (
          <div className="mb-3 rounded-2xl border border-harx-100 bg-white p-3 shadow-sm">
            <div className="mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-harx-600">Plan</p>
              <p className="text-sm font-semibold text-slate-900">
                {timelineTitle}
              </p>
              {timelineIntro ? <p className="mt-1 text-xs text-slate-600">{timelineIntro}</p> : null}
            </div>
            <div className="flex flex-col gap-3">
              {timelineModules.map((module, idx) => {
                const renderSectionWithIndent = (items: string[], label: string, emoji: string, sectionKey: string) => {
                  if (!items.length) return null;
                  const groups: Array<{ title: string | null; values: string[] }> = [];
                  items.forEach((raw) => {
                    const parts = raw.split(' > ');
                    if (parts.length >= 2) {
                      const title = parts[0].trim();
                      const value = parts.slice(1).join(' > ').trim();
                      const last = groups[groups.length - 1];
                      if (last && last.title === title) {
                        last.values.push(value);
                      } else {
                        groups.push({ title, values: [value] });
                      }
                    } else {
                      groups.push({ title: null, values: [raw] });
                    }
                  });
                  const cleanBold = (s: string) =>
                    s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
                  return (
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        <span>{emoji}</span>
                        <span>{label}</span>
                      </span>
                      <div className="mt-1 space-y-1">
                        {groups.map((g, gIdx) =>
                          g.title ? (
                            <div key={`plan-sec-${messageId}-${idx}-${sectionKey}-${gIdx}`} className="ml-1">
                              <p className="text-[11px] font-semibold text-slate-700">{cleanBold(g.title)}</p>
                              <ul className="ml-4 space-y-0.5 pl-4 text-xs text-slate-700">
                                {g.values.map((v, vIdx) => (
                                  <li key={`plan-sec-item-${messageId}-${idx}-${sectionKey}-${gIdx}-${vIdx}`} className="list-disc">
                                    {cleanBold(v)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <ul key={`plan-flat-${messageId}-${idx}-${sectionKey}-${gIdx}`} className="space-y-0.5 pl-4 text-xs text-slate-700">
                              {g.values.map((v, vIdx) => (
                                <li key={`plan-flat-item-${messageId}-${idx}-${sectionKey}-${gIdx}-${vIdx}`} className="list-disc">
                                  {cleanBold(v)}
                                </li>
                              ))}
                            </ul>
                          )
                        )}
                      </div>
                    </div>
                  );
                };
                return (
                  <button
                    key={`plan-card-${messageId}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (isChatLoading || !canGenerateFromPlan) return;
                      const modulePrompt = `Donne le contenu du ${module.title}.`;
                      void sendChatMessage(modulePrompt);
                    }}
                    disabled={!canGenerateFromPlan}
                    className={`w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition ${
                      canGenerateFromPlan ? 'hover:border-slate-300 hover:bg-slate-50/80' : 'cursor-not-allowed opacity-65'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      {module.duration ? (
                        <span className="text-[10px] font-semibold text-slate-500">{module.duration}</span>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                    <div className="mt-2 space-y-3">
                      {renderSectionWithIndent(module.sections.objectives.slice(0, 10), 'Objectifs', '🎯', 'objectives')}
                      {module.sections.objectives.length > 0 && module.sections.keyTopics.length > 0 ? (
                        <div className="h-px w-full bg-slate-200/70" />
                      ) : null}
                      {renderSectionWithIndent(module.sections.keyTopics.slice(0, 14), 'Sujets clés', '📌', 'topics')}
                      {module.sections.objectives.length === 0 &&
                      module.sections.keyTopics.length === 0 ? (
                        <ul className="space-y-0.5 pl-4 text-xs text-slate-700">
                          {(module.bullets || []).slice(0, 8).map((item, itemIdx) => (
                            <li key={`plan-card-item-${messageId}-${idx}-${itemIdx}`} className="list-disc">
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length < 8) return null;

      const blockHeaderRegex = /^(bloc|module)\s*\d+[\s:.-]*/i;
      const timeRangeRegex = /(\d{1,2}[:h]\d{0,2}\s*[-–]\s*\d{1,2}[:h]\d{0,2})/i;
      const sectionHeaderRegex = /^(contenu|format|objectif)s?\s*:?\s*$/i;

      const titleCandidate =
        lines.find((line) => /formation|programme|initiation|atelier|cours/i.test(line)) || 'Plan de formation';

      const blocks: Array<{
        title: string;
        time?: string;
        sections: Array<{ label: string; items: string[] }>;
      }> = [];

      let current: { title: string; time?: string; sections: Array<{ label: string; items: string[] }> } | null = null;
      let activeSection: { label: string; items: string[] } | null = null;

      const pushSection = () => {
        if (!current || !activeSection) return;
        if (activeSection.items.length > 0) current.sections.push(activeSection);
        activeSection = null;
      };

      const pushBlock = () => {
        if (!current) return;
        pushSection();
        if (current.sections.length > 0) blocks.push(current);
        current = null;
      };

      for (const line of lines) {
        if (blockHeaderRegex.test(line)) {
          pushBlock();
          const title = line.replace(blockHeaderRegex, '').replace(/^[:.\-]\s*/, '').trim() || line;
          const timeMatch = line.match(timeRangeRegex);
          current = { title, time: timeMatch ? timeMatch[1] : undefined, sections: [] };
          continue;
        }
        if (!current) continue;
        if (sectionHeaderRegex.test(line)) {
          pushSection();
          activeSection = { label: line.replace(':', '').trim(), items: [] };
          continue;
        }
        if (!activeSection) {
          activeSection = { label: 'Points clés', items: [] };
        }
        const cleaned = line.replace(/^[-*•]\s*/, '').trim();
        if (cleaned) activeSection.items.push(cleaned);
      }
      pushBlock();

      if (blocks.length < 2) return null;

      return (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
            <p className="text-sm font-bold text-slate-900">{titleCandidate}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {blocks.slice(0, 3).map((block, idx) => (
              <div key={`plan-block-${idx}`} className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center">
                  <p className="text-xs font-extrabold text-slate-800">{`Bloc ${idx + 1}`}</p>
                  {block.time ? <p className="text-[10px] font-semibold text-slate-500">{block.time}</p> : null}
                </div>
                <p className="mb-1.5 text-sm font-semibold text-slate-900">{block.title}</p>
                <div className="space-y-1.5">
                  {block.sections.slice(0, 3).map((section, sIdx) => (
                    <div key={`plan-sec-${idx}-${sIdx}`}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{section.label}</p>
                      <ul className="mt-0.5 space-y-0.5 pl-4 text-[11px] text-slate-700">
                        {section.items.slice(0, 4).map((item, iIdx) => (
                          <li key={`plan-item-${idx}-${sIdx}-${iIdx}`} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const extractPresentationArtifactFromText = (rawText: string): {
      title: string;
      slides: Array<{ title: string; bullets: string[] }>;
    } | null => {
      const txt = String(rawText || '').trim();
      if (!txt) return null;
      const candidates: string[] = [];
      const fenced = txt.match(/```(?:json)?\s*([\s\S]*?)```/gi);
      if (Array.isArray(fenced)) {
        fenced.forEach((block) => {
          const cleaned = block.replace(/```(?:json)?/i, '').replace(/```$/, '').trim();
          if (cleaned) candidates.push(cleaned);
        });
      }
      if (txt.startsWith('{') || txt.startsWith('[')) candidates.push(txt);
      for (const candidate of candidates) {
        try {
          const parsed = JSON.parse(candidate);
          const payload = parsed?.slides ? parsed : parsed?.presentation || parsed?.data;
          const slidesRaw = Array.isArray(payload?.slides) ? payload.slides : [];
          const slides = slidesRaw
            .map((s: any) => {
              const title = String(s?.title || '').trim();
              const bullets = Array.isArray(s?.bullets)
                ? s.bullets.map((b: any) => String(b || '').trim()).filter(Boolean)
                : String(s?.content || '')
                    .split('\n')
                    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
                    .filter(Boolean);
              return { title, bullets: bullets.slice(0, 8) };
            })
            .filter((s: any) => s.title || s.bullets.length > 0)
            .slice(0, 20);
          if (slides.length >= 3) {
            return {
              title: String(payload?.title || 'Presentation').trim() || 'Presentation',
              slides,
            };
          }
        } catch {
          // Ignore invalid JSON snippets.
        }
      }
      return null;
    };

    const renderPresentationArtifact = (rawText: string): React.ReactNode | null => {
      const artifact = extractPresentationArtifactFromText(rawText);
      if (!artifact) return null;
      const animatedSlides = artifact.slides.slice(0, 6);
      const cycleSeconds = Math.max(12, animatedSlides.length * 4);
      return (
        <div className="mb-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <style>{`
            @keyframes harxDeckSlideCycle {
              0% { opacity: 0; transform: translateX(24px) scale(0.98); }
              8% { opacity: 1; transform: translateX(0) scale(1); }
              26% { opacity: 1; transform: translateX(0) scale(1); }
              34% { opacity: 0; transform: translateX(-24px) scale(0.98); }
              100% { opacity: 0; transform: translateX(-24px) scale(0.98); }
            }
          `}</style>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Presentation Artifact</p>
              <p className="text-sm font-semibold text-slate-900">{artifact.title}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  void AIService.exportPresentationToPPTX({
                    title: artifact.title,
                    slides: artifact.slides.map((s, idx) => ({
                      title: s.title || `Slide ${idx + 1}`,
                      content: s.bullets.map((b) => `• ${b}`).join('\n'),
                    })),
                  })
                }
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Export PPTX
              </button>
            </div>
          </div>
          {animatedSlides.length > 0 ? (
            <div className="mb-3 overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Animated preview</p>
              <div className="relative h-44 rounded-lg border border-white/70 bg-white/80 shadow-inner">
                {animatedSlides.map((slide, idx) => (
                  <div
                    key={`animated-slide-${idx}`}
                    className="absolute inset-0 rounded-lg p-3"
                    style={{
                      opacity: idx === 0 ? 1 : 0,
                      animation: `harxDeckSlideCycle ${cycleSeconds}s linear infinite`,
                      animationDelay: `${idx * 4}s`,
                    }}
                  >
                    <p className="mb-1 text-xs font-bold text-slate-900">{slide.title || `Slide ${idx + 1}`}</p>
                    <ul className="space-y-0.5 pl-4 text-[11px] leading-4 text-slate-700">
                      {slide.bullets.slice(0, 4).map((b, bi) => (
                        <li key={`animated-slide-b-${idx}-${bi}`} className="list-disc">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-3">
            {artifact.slides.slice(0, 6).map((slide, idx) => (
              <div key={`artifact-slide-${idx}`} className="rounded-xl border border-slate-200 bg-white p-2">
                <p className="mb-1 text-xs font-semibold text-slate-900">{slide.title || `Slide ${idx + 1}`}</p>
                <ul className="space-y-0.5 pl-4 text-[11px] text-slate-600">
                  {slide.bullets.slice(0, 3).map((b, bi) => (
                    <li key={`artifact-b-${idx}-${bi}`} className="list-disc">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const parseInteractiveQuestionsFromText = (
      rawText: string
    ): Array<{ question: string; options: string[] }> => {
      const source = String(rawText || '').trim();
      if (!source) return [];
      // Guardrails: never treat module/course content as a questionnaire.
      if (
        /module\s*\d+/i.test(source) ||
        /##?\s*module/i.test(source) ||
        /(contenu|objectif|objectifs|kpi|indicateur|campagne|performance|exemple)s?/i.test(source)
      ) {
        return [];
      }

      const lines = source
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const result: Array<{ question: string; options: string[] }> = [];
      let current: { question: string; options: string[] } | null = null;
      for (const line of lines) {
        const isQuestionHeader =
          /^\d+[.)]\s+/.test(line) ||
          /^\s*quel(le)?\s+/i.test(line) ||
          /^q\s*[:\-]\s+/i.test(line) ||
          /\?\s*$/.test(line);
        if (isQuestionHeader) {
          if (current && current.options.length >= 2) result.push(current);
          current = {
            question: line
              .replace(/^\d+[.)]\s+/, '')
              .replace(/^q\s*[:\-]\s+/i, '')
              .trim(),
            options: [],
          };
          continue;
        }
        if (/^([a-d]\)|[a-d]\.|[-*•])\s+/i.test(line) && current) {
          const opt = line.replace(/^([a-d]\)|[a-d]\.|[-*•])\s+/i, '').trim();
          if (opt) current.options.push(opt);
        }
      }
      if (current && current.options.length >= 2) result.push(current);
      const normalized = result
        .map((entry) => ({
          question: entry.question,
          options: entry.options
            .map((opt) => opt.replace(/^["'`]+|["'`]+$/g, '').trim())
            .filter(Boolean)
            .slice(0, 6),
        }))
        .filter((entry) => entry.question.length >= 8 && entry.options.length >= 2);
      // Require at least one explicit question mark to avoid false positives.
      const hasQuestionMark = normalized.some((entry) => /\?/.test(entry.question));
      if (!hasQuestionMark) return [];
      return normalized.slice(0, 4);
    };

    const renderInteractiveQuestionnaire = (
      messageId: string,
      rawText: string,
      styleSourceText?: string
    ): React.ReactNode | null => {
      const questions = parseInteractiveQuestionsFromText(rawText);
      if (questions.length === 0) return null;
      const answers = interactiveQuestionAnswers[messageId] || {};
      const styleBlueprint = extractStyleBlueprint(String(styleSourceText || rawText || ''));
      const contentTheme = styleBlueprint.contentTheme;
      const shapeClass =
        contentTheme?.moduleShape === 'square'
          ? 'rounded-none'
          : contentTheme?.moduleShape === 'soft'
            ? 'rounded-3xl'
            : 'rounded-2xl';
      return (
        <div
          className={`mb-2 ${shapeClass} border p-3 shadow-sm`}
          style={{
            borderColor: contentTheme?.panelBorder || '#e2e8f0',
            backgroundColor: contentTheme?.panelBg || '#ffffff',
          }}
        >
          <p
            className="mb-2 text-xs font-bold uppercase tracking-wide"
            style={{ color: styleBlueprint.accentColor || '#be123c' }}
          >
            Questions
          </p>
          <div className="space-y-2.5">
            {questions.map((q, qIdx) => (
              <div
                key={`iq-${messageId}-${qIdx}`}
                className={`${shapeClass} border p-2.5`}
                style={{
                  borderColor: contentTheme?.tableBorder || '#e2e8f0',
                  backgroundColor: contentTheme?.tableRowBg || '#ffffff',
                }}
              >
                <p
                  className="mb-1.5 text-sm font-semibold"
                  style={{ color: contentTheme?.headingColor || '#0f172a' }}
                >
                  {q.question}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {q.options.map((opt, oIdx) => {
                    const selected = answers[qIdx] === opt;
                    return (
                      <button
                        key={`iqo-${messageId}-${qIdx}-${oIdx}`}
                        type="button"
                        onClick={() =>
                          setInteractiveQuestionAnswers((prev) => ({
                            ...prev,
                            [messageId]: { ...(prev[messageId] || {}), [qIdx]: opt },
                          }))
                        }
                        className={`${shapeClass} border px-2.5 py-1 text-xs font-medium transition`}
                        style={
                          selected
                            ? {
                                borderColor: styleBlueprint.accentColor || '#be123c',
                                backgroundColor: contentTheme?.badgeBg || '#fdf2f8',
                                color: contentTheme?.headingColor || '#0f172a',
                              }
                            : {
                                borderColor: contentTheme?.panelBorder || '#e2e8f0',
                                backgroundColor: '#ffffff',
                                color: contentTheme?.bodyColor || '#334155',
                              }
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const composed = questions
                  .map((q, idx) => {
                    const selected = (interactiveQuestionAnswers[messageId] || {})[idx];
                    return selected ? `${q.question}\n${selected}` : '';
                  })
                  .filter(Boolean)
                  .join('\n\n');
                if (!composed) return;
                setChatInput(composed);
                window.setTimeout(() => chatTextareaRef.current?.focus(), 0);
              }}
              className={`${shapeClass} border bg-white px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-95`}
              style={{
                borderColor: contentTheme?.panelBorder || '#e2e8f0',
                color: contentTheme?.bodyColor || '#334155',
              }}
            >
              Utiliser mes reponses
            </button>
          </div>
        </div>
      );
    };

    const parseChoiceOptionsFromText = (
      rawText: string
    ): Array<{ title: string; details: string[] }> => {
      const lines = String(rawText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const options: Array<{ title: string; details: string[] }> = [];
      let current: { title: string; details: string[] } | null = null;

      for (const line of lines) {
        const optionMatch = line.match(/^option\s*(\d+)\s*[:\-]\s*(.+)$/i);
        if (optionMatch) {
          if (current) options.push(current);
          current = { title: `Option ${optionMatch[1]}: ${optionMatch[2]}`, details: [] };
          continue;
        }
        if (!current) continue;
        if (/^option\s*\d+/i.test(line)) {
          if (current) options.push(current);
          current = null;
          continue;
        }
        current.details.push(line.replace(/^[-*•]\s*/, '').trim());
      }
      if (current) options.push(current);
      return options
        .map((o) => ({ ...o, details: o.details.filter(Boolean).slice(0, 3) }))
        .filter((o) => o.title.length > 8)
        .slice(0, 6);
    };

    const renderInteractiveChoiceCards = (
      messageId: string,
      rawText: string,
      styleSourceText?: string
    ): React.ReactNode | null => {
      const options = parseChoiceOptionsFromText(rawText);
      if (options.length < 2) return null;
      const styleBlueprint = extractStyleBlueprint(String(styleSourceText || rawText || ''));
      const contentTheme = styleBlueprint.contentTheme;
      const shapeClass =
        contentTheme?.moduleShape === 'square'
          ? 'rounded-none'
          : contentTheme?.moduleShape === 'soft'
            ? 'rounded-3xl'
            : 'rounded-2xl';
      return (
        <div
          className={`mb-2 ${shapeClass} border p-3`}
          style={{
            borderColor: contentTheme?.panelBorder || '#e2e8f0',
            backgroundColor: contentTheme?.panelBg || '#ffffff',
          }}
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: styleBlueprint.accentColor || '#be123c' }}>
            Options
          </p>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <button
                key={`choice-${messageId}-${idx}`}
                type="button"
                onClick={() => {
                  if (isChatLoading) return;
                  void sendChatMessage(`Je choisis ${opt.title}.`);
                }}
                className={`${shapeClass} w-full border px-3 py-2 text-left transition hover:-translate-y-0.5`}
                style={{
                  borderColor: contentTheme?.tableBorder || '#cbd5e1',
                  backgroundColor: contentTheme?.tableRowBg || '#ffffff',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: contentTheme?.headingColor || '#0f172a' }}>
                  {opt.title}
                </p>
                {opt.details.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 pl-4 text-xs" style={{ color: contentTheme?.bodyColor || '#334155' }}>
                    {opt.details.map((d, dIdx) => (
                      <li key={`choice-d-${messageId}-${idx}-${dIdx}`} className="list-disc">
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      );
    };

    const renderTrainingReadinessCard = (
      messageId: string,
      readiness?: TrainingReadinessPayload | null
    ): React.ReactNode | null => {
      if (!readiness || !Array.isArray(readiness.actions)) return null;
      const visibleActions = readiness.actions.filter(
        (action) => !(action.id === 'validate_plan' && isPlanSavedForChat)
      );
      if (visibleActions.length === 0 && !planValidationHint) return null;
      return (
        <div className="mb-2 rounded-2xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800">Validation contenu</p>
          {readiness.messageFr ? (
            <p className="mt-1 text-xs text-violet-900">{readiness.messageFr}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleActions.map((action, idx) => (
              <button
                key={`readiness-action-${messageId}-${idx}-${action.id}`}
                type="button"
                disabled={isChatLoading || (action.id === 'validate_plan' && isPlanValidationSubmitting)}
                onClick={async () => {
                  if (isChatLoading) return;
                  if (action.id === 'validate_module_content') {
                    void sendChatMessage('__VALIDATE_MODULE_CONTENT__', { appendUser: false });
                    return;
                  }
                  if (action.id === 'validate_plan') {
                    if (isPlanSavedForChat) {
                      setPlanValidationHint({
                        type: 'success',
                        text: 'Plan déjà validé et enregistré.',
                      });
                      return;
                    }
                    setIsPlanValidationSubmitting(true);
                    setPlanValidationHint(null);
                    const result = await sendChatMessage('__VALIDATE_PLAN__', { appendUser: false });
                    if (result.ok && result.planSaved) {
                      setIsPlanSavedForChat(true);
                      setPlanValidationHint(null);
                    } else {
                      setPlanValidationHint({
                        type: 'error',
                        text: result.error || 'La validation du plan a échoué.',
                      });
                    }
                    setIsPlanValidationSubmitting(false);
                    return;
                  }
                  if (action.id === 'validate_all_modules_content') {
                    void sendChatMessage('__VALIDATE_ALL_MODULES_CONTENT__', { appendUser: false });
                    return;
                  }
                  if (action.id === 'generate_missing_modules') {
                    void sendChatMessage('Génère le contenu des modules manquants en suivant le plan sauvegardé.');
                    return;
                  }
                  if (action.id === 'generate_current_module') {
                    const moduleRef =
                      String(action.label || '').match(/module\s+\d+/i)?.[0] || 'Module 1';
                    void sendChatMessage(`Génère-moi le contenu du ${moduleRef}.`);
                    return;
                  }
                  if (action.id === 'generate_interactive_presentation') {
                    setFormationDeckModalTab('parcours');
                    setFormationViewerSlideIndex(0);
                    setShowGeneratedFormationModal(true);
                    void hydrateSavedJourneyFromApi();
                    appendChatMessage(
                      'assistant',
                      'Viewer de formation ouvert en plein écran (design HARX local, modules/sections cliquables).'
                    );
                    return;
                  }
                  if (action.id === 'view_interactive_presentation') {
                    setFormationDeckModalTab('parcours');
                    setShowGeneratedFormationModal(true);
                    void hydrateSavedJourneyFromApi();
                    return;
                  }
                  if (action.id === 'save_without_missing' || action.id === 'validate_training') {
                    void sendChatMessage('Je valide et j’enregistre.');
                    return;
                  }
                  void sendChatMessage(String(action.label || '').trim());
                }}
                className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {action.id === 'validate_plan' && isPlanValidationSubmitting ? 'Validation...' : action.label}
              </button>
            ))}
          </div>
          {planValidationHint ? (
            <p
              className={`mt-2 text-xs ${
                planValidationHint.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {planValidationHint.text}
            </p>
          ) : null}
        </div>
      );
    };

    const renderChatWorkflowSidebar = (): React.ReactNode | null => {
      const status = chatWorkflowStatus || chatWorkflowStatusRef.current;
      const fallbackPlanRaw =
        chatSessionModulePlanRef.current.length > 0
          ? chatSessionModulePlanRef.current
          : Array.isArray((journey as any)?.modulePlan)
            ? ((journey as any).modulePlan as Array<Record<string, any>>)
            : [];
      const fallbackModules = fallbackPlanRaw
        .map((m, idx) => ({
          index: idx,
          title: String(m?.title || `Module ${idx + 1}`).trim(),
          status: Boolean(m?.isValid) ? 'completed' : ('pending' as const),
        }))
        .filter((m) => m.title);
      const resolvedModules = Array.isArray(status?.modules) && status.modules.length > 0
        ? status.modules
        : fallbackModules;
      if (!status && resolvedModules.length === 0) return null;
      const planStatus = String(
        status?.plan || (resolvedModules.length >= 2 ? 'in_progress' : 'pending')
      ) as 'pending' | 'in_progress' | 'completed';
      const modules = resolvedModules;
      const chipClass = (s: 'pending' | 'in_progress' | 'completed'): string =>
        s === 'completed'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : s === 'in_progress'
            ? 'border-amber-300 bg-amber-50 text-amber-700'
            : 'border-slate-300 bg-slate-50 text-slate-600';
      const formatStatus = (s: 'pending' | 'in_progress' | 'completed') =>
        s === 'in_progress' ? 'in_progress' : s;

      return (
        <aside className="mt-2 hidden w-full shrink-0 flex-col gap-3 lg:mt-0 lg:flex lg:w-[260px] lg:pl-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Chat status</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Plan</span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chipClass(planStatus)}`}>
                {formatStatus(planStatus)}
              </span>
            </div>
          </div>
          <div className="max-h-[56vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Modules</p>
            <div className="mt-2 space-y-2">
              {modules.length === 0 ? (
                <p className="text-xs text-slate-500">No module status yet.</p>
              ) : (
                modules.map((m, idx) => {
                  const statusValue = String(m?.status || 'pending') as 'pending' | 'in_progress' | 'completed';
                  const title = String(m?.title || `Module ${idx + 1}`);
                  const resolvedIndex =
                    Number.isFinite(Number(m?.index)) && Number(m?.index) >= 0
                      ? Number(m.index)
                      : idx;
                  return (
                    <div
                      key={`wf-module-${idx}`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-left"
                    >
                      <div className="mb-1 text-xs font-semibold text-slate-800">
                        {`Module ${resolvedIndex + 1}`}
                      </div>
                      <div className="line-clamp-2 text-[11px] text-slate-600">{title}</div>
                      <div className="mt-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${chipClass(statusValue)}`}>
                          {formatStatus(statusValue)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      );
    };

    const lastAssistantMessageId = [...chatMessages]
      .filter((m) => !isHiddenSystemCommandMessage(String(m?.text || '')))
      .reverse()
      .find((m) => m.role === 'assistant')?.id;


    const anchoredChoiceUi = false;

    const hasPendingUpload = uploads.some(
      (u) => u.status === 'uploading' || u.status === 'processing'
    );
    const composerInputDisabled = isChatLoading;
    const composerSendDisabled = isChatLoading || hasPendingUpload;
    const composerPlaceholder = hasPendingUpload
      ? 'Analyse des documents en cours…'
      : hasStartedChat
        ? 'Reply...'
        : 'How can I help you?';

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
        {!repOnboardingLayout ? (
          <p className="mb-2 text-[11px] leading-snug text-slate-500">
            <span className="font-semibold text-slate-600">Plan (Journey Builder) :</span> chaque module doit
            utiliser{' '}
            <code className="rounded bg-slate-100 px-1 text-[10px] text-slate-800">## Module N: titre</code> puis{' '}
            <code className="rounded bg-slate-100 px-1 text-[10px] text-slate-800">### 🎯 Objectifs</code>,{' '}
            <code className="rounded bg-slate-100 px-1 text-[10px] text-slate-800">### 📌 Contenu clé</code>
            , chacun suivi de puces <code className="rounded bg-slate-100 px-1 text-[10px]">- </code> (enregistrement
            structuré en base).
          </p>
        ) : null}
        <textarea
          ref={chatTextareaRef}
          value={chatInput}
          disabled={composerInputDisabled}
          onChange={(e) => setChatInput(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = '0px';
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (composerSendDisabled) return;
              void handleChatSubmit();
            }
          }}
          rows={1}
          placeholder={composerPlaceholder}
          className="mb-3 w-full resize-none bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
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
            {isChatLoading ? (
              <button
                type="button"
                onClick={handleStopChatGeneration}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                title="Stop generation"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleChatSubmit()}
                disabled={!chatInput.trim() || composerSendDisabled}
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-harx px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                title={hasPendingUpload ? 'Analyse des documents en cours…' : 'Send'}
              >
                {hasPendingUpload ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </button>
            )}
          </div>
        </div>
      </>
    );

    const handleChatThreadScroll = () => {
      const container = chatThreadRef.current;
      if (!container) return;
      const thresholdPx = 24;
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldStickToBottomRef.current = distanceToBottom <= thresholdPx;
    };

    const currentFormationViewerSlide = formationViewerSlides[formationViewerSlideIndex];
    const hasFormationContentSlides = formationViewerSlides.some((s) => s.kind !== 'overview');

    return (
    <div className={rep ? 'flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white' : 'min-h-[92vh] bg-white p-2'}>
      <div
        className={
          rep
            ? repSplitLayout
                ? 'mx-auto flex h-full min-h-0 w-full max-w-[min(100%,1760px)] flex-col overflow-hidden px-2 py-4 md:px-4'
                : 'mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-4 py-6 md:px-6'
            : 'mx-auto w-full max-w-[1400px]'
        }
      >
        <div
          className={
            rep
              ? 'flex h-full min-h-0 w-full flex-col overflow-hidden'
              : 'w-full flex-1 rounded-3xl border border-slate-200/90 bg-white p-2 shadow-sm md:p-3'
          }
        >
          <div
            className={
              repSplitLayout
                ? 'flex h-full min-h-0 w-full flex-col-reverse gap-3 overflow-hidden lg:flex-row lg:items-stretch lg:gap-4'
                : rep
                  ? 'flex h-full min-h-0 w-full flex-col overflow-hidden'
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
                onClick={() => void startNewConversation()}
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
                  imageRenderMode={imageRenderMode}
                  onImageRenderModeChange={setImageRenderMode}
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
            </aside>
          )}
          <div
            className={
              repSplitLayout
                ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent px-0 py-0 shadow-none'
                : rep
                  ? 'flex w-full flex-col bg-white px-0 py-0 shadow-none'
                  : 'flex max-h-[90vh] min-h-0 flex-col rounded-2xl border border-harx-100 bg-white px-4 py-6 shadow-[0_10px_30px_rgba(20,20,40,0.08)] md:px-8 md:py-8'
            }
          >

          <div
            className={
              repSplitLayout
                ? 'mx-auto mb-2 flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col lg:flex-row lg:items-stretch'
                : rep
                  ? 'mx-auto mb-0 flex h-full min-h-0 w-full min-w-0 max-w-5xl flex-1 flex-col overflow-hidden'
                  : `mx-auto flex min-h-0 w-full min-w-0 max-w-5xl flex-1 flex-col pb-2${
                      showChatModuleSidebar ? ' lg:flex-row lg:items-stretch lg:gap-4' : ''
                    }`
            }
          >
            <div
              className={
                repSplitLayout
                  ? 'relative flex min-h-0 flex-1 flex-col rounded-none border-0 bg-transparent p-0 shadow-none'
                  : rep
                    ? 'relative flex min-h-0 flex-1 flex-col rounded-none border-0 bg-transparent p-0 shadow-none'
                    : 'relative flex min-h-0 flex-1 flex-col rounded-3xl border border-harx-100 bg-white shadow-[0_12px_36px_rgba(25,25,50,0.08)]'
              }
            >
              <div
                className={`relative mb-2 flex w-full shrink-0 ${rep ? 'flex-col gap-2 px-0.5 pt-0.5' : 'justify-end px-3 pt-3'}`}
              >
                <div className={`flex w-full max-w-full items-center justify-end gap-2 overflow-x-auto whitespace-nowrap transition-all duration-300 sm:inline-flex sm:w-auto sm:flex-nowrap sm:gap-1.5 ${
                  rep ? 'rounded-none border-0 bg-transparent p-0 shadow-none' : 'rounded-2xl border border-harx-100/90 bg-white p-1.5 shadow-sm'
                }`}>
                  <select
                    value={activeChatGigId}
                    onChange={(e) => handleChatGigChange(e.target.value)}
                    className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all duration-200 hover:bg-white focus:bg-white focus:ring-2 focus:ring-harx-500/30 sm:min-w-[12rem] sm:max-w-[min(20rem,50vw)] sm:flex-none sm:shrink-0"
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
                    className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 sm:px-2.5 ${
                      isHistoryOpen
                        ? 'bg-white text-harx-700 ring-1 ring-harx-300/80'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-harx-700'
                    }`}
                    title="Open history"
                  >
                    <History className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => void startNewConversation()}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-harx px-3 py-2 text-xs font-bold text-white shadow-sm shadow-harx-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95"
                    title="New conversation"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    New
                  </button>
                </div>
                {gigSwitchHint ? (
                  <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                    {gigSwitchHint}
                  </div>
                ) : null}
                {rep && (
                  <div className="flex w-full items-center justify-end gap-1.5 overflow-x-auto rounded-2xl border border-harx-100 bg-white p-2 shadow-sm ring-1 ring-harx-500/5">
                    <select
                      value={imageRenderMode}
                      onChange={(e) => setImageRenderMode(e.target.value === 'template_slides' ? 'template_slides' : 'ai_images')}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                      title="Presentation rendering mode"
                    >
                      <option value="ai_images">AI images</option>
                      <option value="template_slides">Template slides</option>
                    </select>
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
                      onClick={() => void handleGenerateStructuredSlides()}
                      disabled={isStructuredSlidesGenerating || isChatLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      title="Generate HTML/CSS slides from chat"
                    >
                      {isStructuredSlidesGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                      {structuredSlides?.slides?.length ? 'Regenerate HTML slides' : 'HTML slides'}
                    </button>
                    {structuredSlides?.slides?.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStructuredSlideIndex(0);
                          setShowStructuredSlidesModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View HTML slides
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleGenerateTrainingImages()}
                      disabled={isImagesGenerating || isChatLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      title={
                        imageRenderMode === 'template_slides'
                          ? 'Generate deterministic template slides (no AI image generation)'
                          : 'Generate training images for this conversation'
                      }
                    >
                      {isImagesGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : generatedImageSet?.items?.length ? (
                        <RefreshCw className="h-3.5 w-3.5" />
                      ) : (
                        <Presentation className="h-3.5 w-3.5" />
                      )}
                      {generatedImageSet?.items?.length
                        ? imageRenderMode === 'template_slides'
                          ? 'Regenerate template slides'
                          : 'Regenerate presentation'
                        : imageRenderMode === 'template_slides'
                          ? 'Template slides'
                          : 'Presentation'}
                    </button>
                    {generatedImageSet?.items?.length ? (
                      <button
                        type="button"
                        onClick={() => void openImagePresentationModal()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Image className="h-3.5 w-3.5" />
                        {generatedImageSet?.renderMode === 'template_slides' ? 'View template slides' : 'View images as presentation'}
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
                    <button
                      type="button"
                      onClick={() => {
                        setFormationDeckModalTab('parcours');
                        setFormationViewerSlideIndex(0);
                        setShowGeneratedFormationModal(true);
                        void hydrateSavedJourneyFromApi();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-harx-200 bg-harx-50/80 px-3 py-1.5 text-xs font-semibold text-harx-900 hover:bg-harx-100/90"
                      title="Ouvrir Start en plein écran"
                    >
                      <Play className="h-3.5 w-3.5 shrink-0" />
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormationDeckModalTab('parcours');
                        setShowGeneratedFormationModal(true);
                        void hydrateSavedJourneyFromApi();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/90"
                      title="Voir le contenu modules/sections"
                    >
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      Content
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
              {rep &&
                showGeneratedFormationModal &&
                (
                  <div
                    className="relative z-20 flex min-h-0 h-full w-full flex-col bg-white"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="generated-formation-modal-title"
                  >
                    <div
                      className="flex h-full w-full flex-col overflow-hidden border-t-4 border-harx-500 bg-white"
                    >
                      <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                            <div className="min-w-0">
                              <p
                                id="generated-formation-modal-title"
                                className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
                              >
                                HARX Training Viewer
                              </p>
                              <p className="mt-0.5 truncate text-sm font-medium text-slate-600">
                                {String(
                                  (formationPreviewForViewer as any)?.title ||
                                    (formationPreviewForViewer as any)?.name ||
                                    'Parcours'
                                ).trim()}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void hydrateSavedJourneyFromApi()}
                              disabled={isSavedJourneyHydrating}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              title="Recharger depuis la base"
                            >
                              {isSavedJourneyHydrating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              Actualiser
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (repOnboardingLayout && autoOpenFormationViewer && onExitToTrainingList) {
                                  onExitToTrainingList();
                                  return;
                                }
                                setShowGeneratedFormationModal(false);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                              title="Fermer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-4 py-2.5 sm:px-6">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Présentation interactive HARX (design local, plein écran)
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isBuildingRepFormationDeck || formationViewerSlides.length === 0}
                            onClick={async () => {
                              setRepFormationDeckHint(null);
                              setIsBuildingRepFormationDeck(true);
                              try {
                                setRepFormationDeckHint('Construction du design HARX local…');
                                setFormationDeckModalTab('html');
                                const html = buildRepInteractivePresentationHtml(formationPreviewForViewer);
                                const hint =
                                  'Présentation locale générée (sans design Claude). Enregistrez pour la lier au parcours.';
                                setRepFormationDeckHtml(html);
                                setRepFormationDeckHint(hint);
                              } catch {
                                setRepFormationDeckHint('La génération a échoué. Réessayez.');
                              } finally {
                                setIsBuildingRepFormationDeck(false);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100/80 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBuildingRepFormationDeck ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LayoutGrid className="h-3.5 w-3.5" />
                            )}
                            Générer design local
                          </button>
                          <button
                            type="button"
                            disabled={!repFormationDeckHtml || isSavingRepFormationDeck}
                            onClick={async () => {
                              if (!repFormationDeckHtml) return;
                              const jid = linkedTrainingJourneyMongoId();
                              if (jid) {
                                try {
                                  localStorage.setItem(`harx_rep_deck_${jid}`, repFormationDeckHtml);
                                } catch {
                                  /* ignore */
                                }
                              }
                              setIsSavingRepFormationDeck(true);
                              setRepFormationDeckHint(null);
                              if (!jid) {
                                setRepFormationDeckHint('Copie locale uniquement (aucun parcours Mongo lié).');
                                setIsSavingRepFormationDeck(false);
                                return;
                              }
                              const r = await JourneyService.saveJourneyRepInteractiveHtml(jid, repFormationDeckHtml);
                              if (r.ok) {
                                setRepFormationDeckHint('Enregistré sur le parcours et en copie locale.');
                                setSavedJourneyHydrated((prev: any) => {
                                  const base = prev && typeof prev === 'object' ? prev : journey;
                                  if (!base || typeof base !== 'object') return prev;
                                  return {
                                    ...base,
                                    methodologyData: {
                                      ...(base.methodologyData && typeof base.methodologyData === 'object'
                                        ? base.methodologyData
                                        : {}),
                                      repInteractivePresentationHtml: repFormationDeckHtml,
                                    },
                                  };
                                });
                              } else {
                                setRepFormationDeckHint(
                                  `Copie locale OK. Enregistrement serveur : ${r.error || 'indisponible'}.`
                                );
                              }
                              setIsSavingRepFormationDeck(false);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSavingRepFormationDeck ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            disabled={!repFormationDeckHtml}
                            onClick={() => {
                              if (!repFormationDeckHtml) return;
                              const name = String(
                                (formationPreviewForViewer as any)?.title ||
                                  (formationPreviewForViewer as any)?.name ||
                                  'formation'
                              )
                                .replace(/[^\w\s-]/g, '')
                                .trim()
                                .slice(0, 60);
                              const blob = new Blob([repFormationDeckHtml], { type: 'text/html;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${name || 'formation'}-presentation.html`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Télécharger .html
                          </button>
                        </div>
                        {repFormationDeckHint ? (
                          <p className="mt-2 text-[11px] text-slate-600">{repFormationDeckHint}</p>
                        ) : null}
                        {repFormationDeckHtml ? (
                          <div
                            className="mt-3 flex rounded-lg border border-slate-200 bg-slate-200/60 p-0.5"
                            role="tablist"
                            aria-label="Mode d’affichage de la formation"
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={formationDeckModalTab === 'html'}
                              onClick={() => setFormationDeckModalTab('html')}
                              className={`flex-1 rounded-md px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                                formationDeckModalTab === 'html'
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Start (HTML)
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={formationDeckModalTab === 'parcours'}
                              onClick={() => setFormationDeckModalTab('parcours')}
                              className={`flex-1 rounded-md px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                                formationDeckModalTab === 'parcours'
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Content (modules)
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
                          {repFormationDeckHtml && formationDeckModalTab === 'html' ? (
                            <div className="flex h-full min-h-[min(52vh,520px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900/5 shadow-inner">
                              <p className="shrink-0 bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Aperçu — navigation dans le cadre (indépendant de l’onglet feuille de route)
                              </p>
                              <iframe
                                key={repFormationIframeKey}
                                title="Présentation interactive HTML"
                                srcDoc={repFormationDeckHtml}
                                sandbox="allow-scripts"
                                className="min-h-0 w-full flex-1 border-0 bg-white"
                              />
                            </div>
                          ) : !hasFormationContentSlides && isSavedJourneyHydrating ? (
                            <div className="flex items-center gap-2 py-8 text-sm text-slate-600">
                              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                              Chargement du programme…
                            </div>
                          ) : !hasFormationContentSlides ? (
                            <p className="py-8 text-center text-sm text-slate-500">
                              Aucun module enregistré pour l’instant. Validez le plan ou enregistrez des modules, puis
                              actualisez.
                            </p>
                          ) : currentFormationViewerSlide ? (
                            <div className="mx-auto max-w-2xl">
                              <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-widest text-emerald-800/90">
                                Feuille de route · slide {formationViewerSlideIndex + 1} /{' '}
                                {formationViewerSlides.length}
                              </p>
                              {currentFormationViewerSlide.kind === 'overview' ? (
                                <div className="rounded-2xl border border-harx-100 bg-gradient-to-br from-white via-harx-50/40 to-harx-alt-50/30 p-4 shadow-sm sm:p-6">
                                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-harx-700">
                                    HARX Training
                                  </p>
                                  <h3 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                                    {String(
                                      (formationPreviewForViewer as any)?.title ||
                                        (formationPreviewForViewer as any)?.name ||
                                        'Formation'
                                    ).trim()}
                                  </h3>
                                  <p className="mt-2 text-sm text-slate-600">
                                    Choisissez un module ou une section pour ouvrir directement son contenu.
                                  </p>
                                  <div className="mt-5 space-y-3">
                                    {currentFormationViewerSlide.modules.map((mod) => (
                                      <div key={`overview-mod-${mod.moduleIndex}`} className="rounded-xl border border-slate-200 bg-white/85 p-3">
                                        <button
                                          type="button"
                                          onClick={() => jumpToFormationSlide(`m${mod.moduleIndex}-intro`)}
                                          className="flex w-full items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-harx-600 to-harx-alt-500 px-3 py-2 text-left text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                                        >
                                          <span>{`Module ${mod.moduleIndex + 1} · ${mod.title}`}</span>
                                          <span className="text-[11px] font-bold uppercase tracking-wide opacity-90">
                                            Ouvrir
                                          </span>
                                        </button>
                                        {mod.sections.length > 0 ? (
                                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                            {mod.sections.map((sec) => (
                                              <button
                                                key={`overview-sec-${mod.moduleIndex}-${sec.sectionIndex}`}
                                                type="button"
                                                onClick={() =>
                                                  jumpToFormationSlide(`m${mod.moduleIndex}-s${sec.sectionIndex}`)
                                                }
                                                className="rounded-lg border border-harx-100 bg-harx-50/50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-harx-300 hover:bg-harx-100/50"
                                              >
                                                {sec.title}
                                              </button>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="mt-2 text-xs text-slate-500">Aucune section structurée.</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : currentFormationViewerSlide.kind === 'module_intro' ? (
                                (() => {
                                  const mod = currentFormationViewerSlide.mod;
                                  const sectionCount = Array.isArray(mod?.sections) ? mod.sections.length : 0;
                                  const desc = String(mod?.description || '').trim();
                                  /** `description` côté API recopie souvent tout le module (sections + quiz) : on évite de la réafficher si des sections structurées existent. */
                                  const showFullDescription = sectionCount === 0 && !!desc;
                                  return (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-6">
                                      <p className="mb-2 text-xs font-semibold text-slate-500">
                                        Module {currentFormationViewerSlide.moduleIndex + 1} /{' '}
                                        {currentFormationViewerSlide.totalModules}
                                      </p>
                                      <h3 className="mb-3 text-lg font-bold text-slate-900 sm:text-xl">
                                        {String(mod?.title || 'Module')}
                                      </h3>
                                      {showFullDescription ? (
                                        <div className="prose prose-sm max-w-none text-slate-800">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{desc}</ReactMarkdown>
                                        </div>
                                      ) : sectionCount > 0 ? (
                                        <p className="text-sm leading-relaxed text-slate-600">
                                          Le détail du cours est découpé slide par slide dans les sections suivantes (puis
                                          les quiz).
                                        </p>
                                      ) : (
                                        <p className="text-sm text-slate-500">Pas de description pour ce module.</p>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : currentFormationViewerSlide.kind === 'section' ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                                  <p className="mb-1 text-xs font-semibold text-emerald-800">
                                    {currentFormationViewerSlide.modTitle}
                                  </p>
                                  <h3 className="mb-3 text-base font-bold text-slate-900 sm:text-lg">
                                    {String(currentFormationViewerSlide.section?.title || 'Section')}
                                  </h3>
                                  {String(currentFormationViewerSlide.section?.content || '').trim() ? (
                                    <div className="prose prose-sm max-w-none text-slate-700">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {String(currentFormationViewerSlide.section.content)}
                                      </ReactMarkdown>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500">Contenu vide.</p>
                                  )}
                                </div>
                              ) : (
                                (() => {
                                  const slide = currentFormationViewerSlide;
                                  const q = slide.question;
                                  const opts = Array.isArray(q?.options) ? q.options : [];
                                  const qKey = slide.key;
                                  const qState = formationViewerQuizState[qKey] || {
                                    selected: null as number | null,
                                    revealed: false,
                                  };
                                  const correctIdx = slide.correctAnswer;
                                  const isCorrect =
                                    qState.revealed && qState.selected !== null && qState.selected === correctIdx;
                                  const isWrong =
                                    qState.revealed && qState.selected !== null && qState.selected !== correctIdx;
                                  return (
                                    <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4 sm:p-6">
                                      <p className="mb-2 text-xs font-semibold text-violet-900">{slide.quizTitle}</p>
                                      <p className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">
                                        {String(q?.question || '')}
                                      </p>
                                      <div className="space-y-2" role="radiogroup" aria-label="Réponses">
                                        {opts.map((op: string, oi: number) => {
                                          const selected = qState.selected === oi;
                                          const showAsCorrect = qState.revealed && oi === correctIdx;
                                          const wrongSelected =
                                            qState.revealed &&
                                            qState.selected === oi &&
                                            oi !== correctIdx;
                                          return (
                                            <button
                                              key={oi}
                                              type="button"
                                              disabled={qState.revealed}
                                              onClick={() => {
                                                if (qState.revealed) return;
                                                setFormationViewerQuizState((prev) => ({
                                                  ...prev,
                                                  [qKey]: {
                                                    selected: oi,
                                                    revealed: prev[qKey]?.revealed ?? false,
                                                  },
                                                }));
                                              }}
                                              className={`flex w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                                                showAsCorrect
                                                  ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-950'
                                                  : wrongSelected
                                                    ? 'border-rose-400 bg-rose-50 text-rose-950'
                                                    : selected && !qState.revealed
                                                      ? 'border-violet-500 bg-violet-100/80 text-slate-900'
                                                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                                              }`}
                                            >
                                              <span className="mr-2 font-mono text-xs text-slate-400">{oi + 1}.</span>
                                              <span className="flex-1">{String(op)}</span>
                                              {showAsCorrect ? <CheckCircle className="ml-2 h-4 w-4 shrink-0 text-emerald-600" /> : null}
                                              {wrongSelected ? <X className="ml-2 h-4 w-4 shrink-0 text-rose-600" /> : null}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {!qState.revealed ? (
                                        <button
                                          type="button"
                                          disabled={qState.selected === null}
                                          onClick={() =>
                                            setFormationViewerQuizState((prev) => ({
                                              ...prev,
                                              [qKey]: {
                                                selected: prev[qKey]?.selected ?? null,
                                                revealed: true,
                                              },
                                            }))
                                          }
                                          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          Valider ma réponse
                                        </button>
                                      ) : (
                                        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                                          <p
                                            className={`text-sm font-semibold ${
                                              isCorrect ? 'text-emerald-800' : isWrong ? 'text-rose-800' : 'text-slate-700'
                                            }`}
                                          >
                                            {isCorrect
                                              ? 'Bonne réponse !'
                                              : isWrong
                                                ? 'Ce n’était pas la bonne réponse.'
                                                : 'Réponse affichée.'}
                                          </p>
                                          {String(q?.explanation || '').trim() ? (
                                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                              {String(q.explanation)}
                                            </p>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          ) : null}
                        </div>
                        {hasFormationContentSlides &&
                        (!repFormationDeckHtml || formationDeckModalTab === 'parcours') ? (
                          <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
                            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                                style={{
                                  width: `${((formationViewerSlideIndex + 1) / formationViewerSlides.length) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setFormationViewerSlideIndex((i) => Math.max(0, i - 1))}
                                disabled={formationViewerSlideIndex <= 0}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Précédent
                              </button>
                              <span className="text-xs font-medium text-slate-600">
                                {formationViewerSlideIndex + 1} / {formationViewerSlides.length}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormationViewerSlideIndex((i) =>
                                    Math.min(formationViewerSlides.length - 1, i + 1)
                                  )
                                }
                                disabled={formationViewerSlideIndex >= formationViewerSlides.length - 1}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Suivant
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              {!showGeneratedFormationModal && shouldShowChatThread && (
                <div
                  ref={chatThreadRef}
                  onScroll={handleChatThreadScroll}
                  style={{ scrollBehavior: 'smooth' }}
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
                        <div className="overflow-hidden rounded-lg border border-harx-100 bg-white">
                          {kbOptions.map((option, idx) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectKbMode(option.id)}
                              className="flex w-full items-center gap-2 border-b border-harx-100/90 px-2.5 py-1.5 text-left transition-all duration-200 hover:bg-slate-50 last:border-b-0 sm:px-3"
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
                            className="rounded-md border border-harx-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {chatMessages
                    .filter((msg) => !isHiddenSystemCommandMessage(String(msg?.text || '')))
                    .map((msg) => (
                    <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      {msg.role === 'assistant' ? (
                        <div className="max-w-[88%]">
                          <div className="max-w-none text-slate-900">
                            {(() => {
                              const textWithoutStyle = stripPromptEcho(stripResourceSections(
                                stripStyleBlueprint(String(msg.text || '').replace(/<harx-html>[\s\S]*?<\/harx-html>/gi, ''))
                              ));
                              const styleBlueprint = extractStyleBlueprint(String(msg.text || ''));
                              const contentTheme = styleBlueprint.contentTheme;
                              const typography = styleBlueprint.typography || {
                                bodyFont: 'Inter, system-ui, sans-serif',
                                headingFont: 'Inter, system-ui, sans-serif',
                              };
                              const pendingStream = Boolean(msg.isStreaming && !String(textWithoutStyle || '').trim());
                              if (pendingStream) {
                                return (
                                  <div
                                    className="flex min-h-[3.5rem] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                                    role="status"
                                    aria-live="polite"
                                    aria-label={assistantWaitLabel}
                                  >
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-harx-500" />
                                      {assistantWaitLabel}
                                    </div>
                                    <p className="text-xs text-slate-500">HARX assistant is preparing your answer.</p>
                                  </div>
                                );
                              }
                              const isTrainingGenerationMessage =
                                /(plan de formation|formation\s+compl[eè]te|module\s*\d+|🎯|📌|🧩|📊|learning objectives|mini quiz|self-assessment)/i.test(
                                  String(textWithoutStyle || '')
                                );
                              const parsedPlanPreview = parseTrainingPlan(textWithoutStyle);
                              const hasParsedPlanModules = parsedPlanPreview.modules.length >= 2;
                              // Ne pas supprimer le rendu "timeline/cards" quand le texte ressemble à un plan structuré :
                              // les emojis 🎯/📌/… sont justement des marqueurs du plan.
                              const disableDecorativeTrainingUi =
                                isTrainingGenerationMessage && !hasParsedPlanModules;
                              const interactiveTimeline =
                                msg.planInteractiveDisabled || disableDecorativeTrainingUi
                                  ? null
                                  : renderInteractiveTrainingTimeline(msg.id, textWithoutStyle, isPlanSavedForChat);
                              const presentationArtifact = renderPresentationArtifact(textWithoutStyle);
                              const interactiveQuestionnaire = renderInteractiveQuestionnaire(msg.id, textWithoutStyle, String(msg.text || ''));
                              const interactiveChoiceCards = renderInteractiveChoiceCards(msg.id, textWithoutStyle, String(msg.text || ''));
                              const mergedReadiness =
                                msg.trainingReadiness ||
                                inferSyntheticTrainingReadiness(
                                  String(msg.text || ''),
                                  {
                                    workflow: chatWorkflowStatus,
                                    planIsValid:
                                      isPlanSavedForChat || chatWorkflowStatus?.plan === 'completed',
                                  }
                                );
                              const trainingReadinessCard =
                                msg.role === 'assistant' && msg.id === lastAssistantMessageId
                                  ? renderTrainingReadinessCard(msg.id, mergedReadiness)
                                  : null;
                              const hideMarkdownForInteractivePlan = !!interactiveTimeline;
                              const shouldShowMarkdownBody = !hideMarkdownForInteractivePlan && !msg.suppressText;
                              const markdownComponents: Partial<Components> = {
                                h1: ({ children }) => (
                                  <h3
                                    className="mb-2 mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[22px] font-bold text-slate-900"
                                    style={{ fontFamily: typography.headingFont }}
                                  >
                                    {children}
                                  </h3>
                                ),
                                h2: ({ children }) => (
                                  <h4
                                    className="mb-2 mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[18px] font-semibold text-slate-900"
                                    style={{ fontFamily: typography.headingFont }}
                                  >
                                    {children}
                                  </h4>
                                ),
                                h3: ({ children }) => (
                                  <h5
                                    className="mb-1.5 mt-2 text-[16px] font-semibold text-slate-900"
                                    style={{ fontFamily: typography.headingFont }}
                                  >
                                    {children}
                                  </h5>
                                ),
                                p: ({ children }) => (
                                  <p
                                    className="my-1.5 text-[15px] leading-7 text-slate-700"
                                    style={{ color: contentTheme?.bodyColor || '#334155' }}
                                  >
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul
                                    className="my-2 space-y-1 pl-4 text-[15px] leading-7"
                                    style={{ color: contentTheme?.bodyColor || '#334155' }}
                                  >
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol
                                    className="my-2 space-y-1 pl-5 text-[15px] leading-7 marker:font-semibold"
                                    style={{ color: contentTheme?.bodyColor || '#334155' }}
                                  >
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li
                                    className="py-0.5 text-slate-700"
                                    style={{ color: contentTheme?.bodyColor || '#334155' }}
                                  >
                                    {children}
                                  </li>
                                ),
                                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                                table: ({ children }) => (
                                  <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                    <table className="min-w-full border-collapse">{children}</table>
                                  </div>
                                ),
                                thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                                tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
                                tr: ({ children }) => <tr className="align-top">{children}</tr>,
                                th: ({ children }) => (
                                  <th
                                    className="px-3 py-2 text-left text-sm font-semibold"
                                    style={{ color: contentTheme?.tableHeaderText || contentTheme?.headingColor || '#0f172a' }}
                                  >
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td className="px-3 py-2 text-sm" style={{ color: contentTheme?.bodyColor || '#334155' }}>
                                    {children}
                                  </td>
                                ),
                                code: ({ children }) => (
                                  <code className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[13px] text-slate-800">
                                    {children}
                                  </code>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="my-2 border-l-4 border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 italic">
                                    {children}
                                  </blockquote>
                                ),
                              };
                              return (
                                <>
                                  {presentationArtifact ? (
                                    <div className="mb-2">{presentationArtifact}</div>
                                  ) : null}
                                  {interactiveTimeline ? (
                                    <div className="mb-2">{interactiveTimeline}</div>
                                  ) : null}
                                  {interactiveQuestionnaire ? (
                                    <div className="mb-2">{interactiveQuestionnaire}</div>
                                  ) : null}
                                  {interactiveChoiceCards ? (
                                    <div className="mb-2">{interactiveChoiceCards}</div>
                                  ) : null}
                                  {shouldShowMarkdownBody ? (
                                    <div
                                      className="text-sm leading-7 text-slate-800"
                                      style={{ fontFamily: typography.bodyFont }}
                                    >
                                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                        {textWithoutStyle}
                                      </ReactMarkdown>
                                    </div>
                                  ) : null}
                                  {msg.isStreaming && !!textWithoutStyle.trim() ? (
                                    <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-harx-400 align-middle" />
                                  ) : null}
                                  {trainingReadinessCard ? (
                                    <div className="mt-2">{trainingReadinessCard}</div>
                                  ) : null}
                                </>
                              );
                            })()}
                          </div>
                          {msg.text.trim() &&
                          !msg.suppressText &&
                          !extractTrainingReadinessBlock(String(msg.text || '')).trainingReadiness ? (
                            <div className={`mt-2 flex items-center gap-2 text-slate-500 ${msg.isStreaming ? 'opacity-40 pointer-events-none' : ''}`}>
                              <button
                                type="button"
                                onClick={() => handleRegenerateMessage(msg.id)}
                                className="rounded-md p-1.5 hover:bg-slate-100"
                                title="Regenerate"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : (() => {
                        const messageText = String(msg.text || '');
                        const isPersonalizationSummary = messageText.startsWith('A few questions to personalize your training');
                        const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
                        const renderAttachments = () =>
                          attachments.length > 0 ? (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {attachments.map((att) => (
                                <div
                                  key={`${msg.id}-att-${att.id}`}
                                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 shadow-sm"
                                  title={att.name}
                                >
                                  <span className="shrink-0">{getFileIcon(att.type, true)}</span>
                                  <span className="max-w-[160px] truncate text-[11px] font-semibold text-slate-800">
                                    {att.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null;
                        if (isPersonalizationSummary) {
                          const lines = messageText
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean);
                          const title = lines[0] || 'Personalization summary';
                          const detailLines = lines.slice(1);
                          return (
                            <div className="max-w-[72%] rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-900">
                              {renderAttachments()}
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
                            {renderAttachments()}
                            {msg.text ? <div className="whitespace-pre-wrap">{msg.text}</div> : null}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                  {rep && showPersonalizationCard && currentPersonalizationQuestion && (
                    <div className="flex justify-start">
                      <div className="w-full rounded-2xl border border-harx-100 bg-white p-2.5 shadow-md shadow-harx-500/10 sm:p-3">
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
                          {currentPersonalizationQuestion.question}
                        </p>
                        <div className="overflow-hidden rounded-lg border border-harx-100 bg-white">
                          {currentPersonalizationQuestion.options.map((option, idx) => (
                            <button
                              key={`chat-question-${personalizationStep}-${option}`}
                              type="button"
                              onClick={() => handleSelectPersonalizationOption(option)}
                              className="flex w-full items-center gap-2 border-b border-harx-100/90 px-2.5 py-2 text-left transition-all duration-200 hover:bg-slate-50 last:border-b-0 sm:px-3"
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
                            className="rounded-md border border-harx-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {isChatLoading && !chatMessages.some((m) => m.isStreaming) && (
                    <div className="flex justify-start gap-3">
                      <div
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-md shadow-harx-500/20"
                        aria-hidden
                      >
                        <Bot className="h-4 w-4" />
                      </div>
                      <div
                        className="inline-flex min-w-[12rem] flex-col gap-0.5 rounded-xl border border-harx-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
                        role="status"
                        aria-live="polite"
                        aria-label={assistantWaitLabel}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-harx-500" />
                          {assistantWaitLabel}
                        </span>
                        <span className="text-[11px] font-normal text-slate-500">Please wait — response will appear below.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!showRepSourcePopup && (anchoredChoiceUi ? (
                <div className="sticky bottom-0 z-20 shrink-0 bg-white px-3 pb-2 pt-1">
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
                    <div className="border-t border-slate-100 px-3 pb-3 pt-2.5">{renderComposerBody()}</div>
                  </div>
                </div>
              ) : (
                <div
                  className={`shrink-0 bg-white pb-1 pt-2 ${rep ? 'sticky bottom-0 z-20 border-t border-harx-100/80 backdrop-blur supports-[backdrop-filter]:bg-white/95' : 'sticky bottom-0 z-20 border-t border-harx-100/80 px-3'}`}
                >
                  <div
                    className={
                      rep
                        ? 'rounded-[20px] border border-harx-100 bg-white px-4 py-3 shadow-sm ring-1 ring-harx-500/5'
                        : 'rounded-[28px] border border-harx-100 bg-white px-5 py-4 shadow-sm ring-1 ring-harx-500/5'
                    }
                  >
                    {renderComposerBody()}
                  </div>
                </div>
              ))}

            </div>
            {showChatModuleSidebar ? renderChatWorkflowSidebar() : null}
          </div>

          {!rep && showImagePresentationModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
              <div className="flex h-[90vh] w-[min(1200px,96vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">{trainingImageModalPrimaryTitle}</div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {activeImageSet?.renderMode === 'template_slides' ? 'Template slides' : 'AI images'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveImageSet()}
                      disabled={isMediaSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isMediaSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
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
                  {mediaEditHint ? (
                    <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
                      {mediaEditHint}
                    </div>
                  ) : null}
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
                  {activeImageSet?.items?.[activeImageIndex] ? (
                    <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Image title
                      </label>
                      <input
                        value={String(activeImageSet.items[activeImageIndex]?.title || '')}
                        onChange={(e) => updateActiveImageItemField('title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                        placeholder="Slide title"
                      />
                      <label className="block pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Image prompt
                      </label>
                      <textarea
                        value={String(activeImageSet.items[activeImageIndex]?.prompt || '')}
                        onChange={(e) => updateActiveImageItemField('prompt', e.target.value)}
                        className="min-h-[84px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                        placeholder="Prompt used for this image"
                      />
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const prompt = String(activeImageSet.items[activeImageIndex]?.prompt || '').trim();
                            if (prompt) setImagePrompt(prompt);
                            void handleGenerateTrainingImages();
                          }}
                          disabled={isImagesGenerating || isChatLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-harx-200 bg-harx-50/70 px-3 py-1.5 text-xs font-semibold text-harx-700 hover:bg-harx-100 disabled:opacity-50"
                        >
                          {isImagesGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Regenerate from this prompt
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteActiveImage}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <X className="h-3.5 w-3.5" />
                          Delete image
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {rep && showStructuredSlidesModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
              <div className="flex h-[90vh] w-[min(1200px,96vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {structuredSlides?.title || 'Structured slides'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveStructuredSlides()}
                      disabled={isMediaSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isMediaSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void openStructuredSlidesExportPptx()}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Export PPTX
                    </button>
                    <button
                      type="button"
                      onClick={() => openStructuredSlidesExportPdf()}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowStructuredSlidesModal(false);
                        setStructuredSlideIndex(0);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col bg-slate-50 p-4">
                  {(structuredSlides?.slides || []).length ? (() => {
                    const total = structuredSlides?.slides?.length || 0;
                    const idx = Math.max(0, Math.min(structuredSlideIndex, Math.max(0, total - 1)));
                    const s = structuredSlides?.slides?.[idx];
                    if (!s) return null;
                    const kindLabel = String(s.kind || 'content').toUpperCase();
                    const theme = structuredSlides?.theme;
                    const template = theme?.template || 'corporate';
                    const accent = /^#[0-9a-f]{6}$/i.test(String(theme?.accentColor || '')) ? String(theme?.accentColor) : '#be123c';
                    const coverImageUrl = String(theme?.coverImageUrl || '').trim();
                    const isDark = template === 'dark' || theme?.backgroundStyle === 'dark';
                    const sectionBg =
                      template === 'minimal'
                        ? 'bg-white'
                        : template === 'learning'
                          ? 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50'
                          : template === 'executive'
                            ? 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
                            : isDark
                              ? 'bg-slate-900'
                              : 'bg-white';
                    const bodyText = isDark ? 'text-slate-100' : 'text-slate-800';
                    const noteClass = isDark
                      ? 'mt-6 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300'
                      : 'mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600';
                    const headerStyle: React.CSSProperties = theme?.backgroundStyle === 'gradient'
                      ? { background: `linear-gradient(90deg, ${accent}, #7c3aed)` }
                      : { background: accent };
                    const useSplit = s.layout === 'split' && (s.bullets || []).length >= 4;
                    const useCoverHero = s.kind === 'cover' && !!coverImageUrl;
                    return (
                      <>
                        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="text-xs font-semibold text-slate-600">{`Slide ${idx + 1} / ${total}`}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStructuredSlideIndex((prev) => Math.max(prev - 1, 0))}
                              disabled={idx <= 0}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              onClick={() => setStructuredSlideIndex((prev) => Math.min(prev + 1, Math.max(total - 1, 0)))}
                              disabled={idx >= total - 1}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                            >
                              Next
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStructuredSlide(idx)}
                              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Delete slide
                            </button>
                          </div>
                        </div>
                        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
                          {mediaEditHint ? (
                            <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                              {mediaEditHint}
                            </div>
                          ) : null}
                          <div className="grid gap-2 md:grid-cols-2">
                            <label className="text-xs font-semibold text-slate-600">
                              Slide title
                              <input
                                value={String(s.title || '')}
                                onChange={(e) => updateStructuredSlideField(idx, 'title', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                                placeholder="Slide title"
                              />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                              Notes
                              <input
                                value={String(s.notes || '')}
                                onChange={(e) => updateStructuredSlideField(idx, 'notes', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                                placeholder="Optional presenter note"
                              />
                            </label>
                          </div>
                          <label className="mt-2 block text-xs font-semibold text-slate-600">
                            Slide content (one bullet per line)
                            <textarea
                              value={Array.isArray(s.bullets) ? s.bullets.join('\n') : ''}
                              onChange={(e) => updateStructuredSlideField(idx, 'bullets', e.target.value)}
                              className="mt-1 min-h-[88px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                              placeholder="Write slide bullets here..."
                            />
                          </label>
                        </div>

                        {/* HTML/CSS slide template: premium dynamic layout; chat-based content injected here */}
                        <section className={`mx-auto flex h-full w-full max-w-[1100px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 ${sectionBg} shadow-sm`}>
                          {useCoverHero ? (
                            <div className="relative min-h-0 flex-1 overflow-hidden">
                              <img src={coverImageUrl} alt={s.title} className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/60" />
                              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4 text-white">
                                <h3 className="truncate text-2xl font-extrabold">{s.title}</h3>
                                <span className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-semibold tracking-wide">{kindLabel}</span>
                              </div>
                              <div className="absolute inset-x-0 bottom-0 p-6">
                                <div className="rounded-xl border border-white/30 bg-black/35 p-4 backdrop-blur-sm">
                                  <ul className="list-disc space-y-2 pl-5 text-[19px] leading-7 text-white">
                                    {(s.bullets || []).slice(0, 4).map((b, i) => (
                                      <li key={`hero-b-${s.index}-${i}`}>{b}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <header className="flex items-center justify-between px-6 py-4 text-white" style={headerStyle}>
                                <h3 className="truncate text-xl font-bold">{s.title}</h3>
                                <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold tracking-wide">{kindLabel}</span>
                              </header>
                              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                                {(() => {
                                  const blocks = Array.isArray(s.blocks) ? s.blocks : [];
                                  const bullets = Array.isArray(s.bullets) ? s.bullets : [];
                                  const agendaMode = s.kind === 'agenda' || s.layout === 'timeline';
                                  const conclusionMode = s.kind === 'conclusion';
                                  const rightBlocks = blocks.filter((b) => {
                                    const t = String(b?.type || '');
                                    return t === 'kpi' || t === 'stat' || t === 'quote' || t === 'table' || t === 'image_prompt';
                                  });
                                  const leftBlocks = blocks.filter((b) => String(b?.type || '') === 'paragraph' || String(b?.type || '') === 'bullets');

                                  if (agendaMode) {
                                    return (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                          {bullets.slice(0, 8).map((item, i) => (
                                            <div key={`ag-${s.index}-${i}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                              <div className="mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: accent }}>
                                                {i + 1}
                                              </div>
                                              <p className="text-sm font-semibold text-slate-800">{item}</p>
                                            </div>
                                          ))}
                                        </div>
                                        {s.notes ? <div className={noteClass}>{s.notes}</div> : null}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="grid grid-cols-12 gap-5">
                                      <div className={useSplit ? 'col-span-12 md:col-span-7' : 'col-span-12 md:col-span-8'}>
                                        <ul className={`list-disc space-y-3 pl-6 text-[20px] leading-8 ${bodyText}`}>
                                          {bullets.slice(0, 8).map((b, i) => (
                                            <li key={`b-${s.index}-${i}`}>{b}</li>
                                          ))}
                                        </ul>
                                        {leftBlocks.map((block, bi) => (
                                          <div key={`left-${s.index}-${bi}`} className="mt-3">
                                            {block.title ? <p className="mb-1 text-sm font-bold text-slate-800">{block.title}</p> : null}
                                            {block.text ? <p className={`text-sm leading-6 ${bodyText}`}>{block.text}</p> : null}
                                            {Array.isArray(block.items) && block.items.length > 0 ? (
                                              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                                {block.items.slice(0, 6).map((it, ii) => (
                                                  <li key={`left-it-${s.index}-${bi}-${ii}`}>{it}</li>
                                                ))}
                                              </ul>
                                            ) : null}
                                          </div>
                                        ))}
                                        {s.notes ? <div className={noteClass}>{s.notes}</div> : null}
                                      </div>

                                      <div className={useSplit ? 'col-span-12 md:col-span-5 space-y-3' : 'col-span-12 md:col-span-4 space-y-3'}>
                                        {rightBlocks.length === 0 && !conclusionMode ? (
                                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">A retenir</p>
                                            <p className="mt-1 text-sm text-slate-700">{bullets[0] || s.title}</p>
                                          </div>
                                        ) : null}
                                        {rightBlocks.map((block, bi) => {
                                          const t = String(block?.type || '');
                                          if ((t === 'kpi' || t === 'stat') && (block.value || block.label || block.source)) {
                                            return (
                                              <div key={`rb-${s.index}-${bi}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                                <p className="text-2xl font-extrabold text-slate-900">{block.value || '--'}</p>
                                                <p className="text-xs font-medium text-slate-600">{block.label || block.source || 'Indicateur'}</p>
                                              </div>
                                            );
                                          }
                                          if (t === 'quote' && block.text) {
                                            return (
                                              <blockquote key={`rb-${s.index}-${bi}`} className="rounded-xl border-l-4 border-slate-300 bg-slate-50 px-3 py-2 text-sm italic text-slate-700">
                                                {block.text}
                                              </blockquote>
                                            );
                                          }
                                          if (t === 'table' && Array.isArray(block.rows) && block.rows.length > 0) {
                                            return (
                                              <div key={`rb-${s.index}-${bi}`} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                                <table className="min-w-full text-xs">
                                                  {Array.isArray(block.headers) && block.headers.length > 0 ? (
                                                    <thead className="bg-slate-100">
                                                      <tr>
                                                        {block.headers.slice(0, 4).map((h, hi) => (
                                                          <th key={`h-${hi}`} className="px-2 py-1 text-left font-semibold text-slate-700">{h}</th>
                                                        ))}
                                                      </tr>
                                                    </thead>
                                                  ) : null}
                                                  <tbody>
                                                    {block.rows.slice(0, 5).map((row, ri) => (
                                                      <tr key={`r-${ri}`} className="border-t border-slate-200">
                                                        {row.slice(0, 4).map((c, ci) => (
                                                          <td key={`c-${ri}-${ci}`} className="px-2 py-1 text-slate-700">{c}</td>
                                                        ))}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            );
                                          }
                                          if (t === 'image_prompt' && block.text) {
                                            return (
                                              <div key={`rb-${s.index}-${bi}`} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
                                                <p className="mb-1 font-semibold">Visual idea</p>
                                                <p>{block.text}</p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })}
                                        {conclusionMode ? (
                                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                                            Objectif: finir avec des actions claires et mesurables.
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </>
                          )}
                          <footer className={`border-t border-slate-200 px-6 py-2 text-center text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                            {structuredSlides?.title || 'Training'} • {`Slide ${idx + 1}/${total}`}
                          </footer>
                        </section>
                      </>
                    );
                  })() : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      No structured slides generated yet.
                    </div>
                  )}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleGenerateQuizFromChat()}
                      disabled={isQuizGenerating}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-harx-200 bg-harx-50/70 px-3 py-1.5 text-xs font-semibold text-harx-700 transition hover:bg-harx-100 disabled:opacity-50"
                    >
                      {isQuizGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Regenerate quizzes
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveAllQuizzes()}
                      disabled={isQuizSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-harx px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-harx-500/20 transition hover:brightness-105 disabled:opacity-50"
                    >
                      {isQuizSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save all
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuizModal(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {quizSavedHint ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{quizSavedHint}</div>
                  ) : null}
                  {editableQuizQuestions.length === 0 ? (
                    <div className="text-sm text-slate-600">No quiz questions generated yet.</div>
                  ) : (
                    editableQuizQuestions.map((q, idx) => (
                      <div key={`${idx}-${q.text}`} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-harx-600">{`Question ${idx + 1}`}</div>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuizQuestion(idx)}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                        <textarea
                          value={q.text}
                          onChange={(e) => handleQuizQuestionFieldChange(idx, 'text', e.target.value)}
                          className="min-h-[64px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                          placeholder="Question text..."
                        />
                        <div className="mt-2 space-y-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={`${idx}-${optIdx}`} className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                value={opt}
                                onChange={(e) => handleQuizOptionChange(idx, optIdx, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                                placeholder={`Option ${optIdx + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                            Correct answer
                            <select
                              value={String(Math.min(Math.max(Number(q.correctAnswer) || 0, 0), Math.max((q.options?.length || 1) - 1, 0)))}
                              onChange={(e) => handleQuizQuestionFieldChange(idx, 'correctAnswer', Number(e.target.value))}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                            >
                              {(q.options || []).map((_, optIdx) => (
                                <option key={`correct-${idx}-${optIdx}`} value={optIdx}>
                                  {`Option ${String.fromCharCode(65 + optIdx)}`}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                            Explanation
                            <input
                              value={q.explanation || ''}
                              onChange={(e) => handleQuizQuestionFieldChange(idx, 'explanation', e.target.value)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-harx-300 focus:ring-2 focus:ring-harx-500/20"
                              placeholder="Why this answer is correct..."
                            />
                          </label>
                        </div>
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

          {/* Bottom navigation intentionally hidden to keep REP chat UI clean. */}
          </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return renderSourcesUploadUI();
}
