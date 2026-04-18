import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Video, Music, Image, File as FileIcon, CheckCircle, Clock, AlertCircle, AlertTriangle, X, Sparkles, Zap, BarChart3, Wand2, Save, Loader2, Presentation, FileDown, Maximize2, RefreshCw, LayoutGrid, FolderOpen, Briefcase, Plus, Search, RotateCcw, Send, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ContentUpload } from '../../types/core';
import { AIService, normalizePresentationFromApi, type UploadCurriculumContext, type PresentationGenerationContext, type CallRecordingRef, type ChatHistoryItem } from '../../infrastructure/services/AIService';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { DraftService } from '../../infrastructure/services/DraftService';
import { cloudinaryService } from '../../lib/cloudinaryService';
import { getGigsByCompanyId } from '../../../../api/matching';
import type { Gig } from '../../../../types/matching';
import PresentationPreview from '../Training/PresentationPreview';
import { scrollJourneyMainToTop } from './journeyScroll';
import type { TrainingMethodology } from '../../types/methodology';

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

export default function ContentUploader(props: ContentUploaderProps) {
  const { onComplete, onBack, company, gigId, journey, methodology, repOnboardingLayout = false } = props;
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
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; isStreaming?: boolean }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [kbGenerationChoice, setKbGenerationChoice] = useState<KbGenerationMode | null>(null);
  const [chatKbDocuments, setChatKbDocuments] = useState<
    Array<{ _id: string; name: string; fileType?: string; summary?: string; keyTerms?: string[]; createdAt?: string }>
  >([]);
  const [isChatKbLoading, setIsChatKbLoading] = useState(false);
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

  const activeChatGigId = selectedChatGigId || (gigId ? String(gigId) : '');
  const activeChatGigTitle =
    companyGigs.find((g: any) => String(g?._id || g?.id || '') === String(activeChatGigId))?.title ||
    (activeChatGigId ? `Gig ${activeChatGigId.slice(0, 8)}` : 'Aucun gig');

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
    const usesKb =
      kbGenerationChoice === 'kb_only' || kbGenerationChoice === 'kb_and_uploads';
    if (!usesKb || !activeChatGigId) {
      setIsChatKbLoading(false);
      if (!usesKb) setChatKbDocuments([]);
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
  }, [kbGenerationChoice, activeChatGigId]);

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
      };
    },
    [getUploadContext, gigId, getGenerationSourceMode]
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
              console.log(`Upload progress for ${upload.name}: ${progress.percentage}%`);
            }
          );
          cloudinaryUrl = uploadResult.secureUrl;
          publicId = uploadResult.publicId;
          console.log(`✅ File uploaded to Cloudinary: ${upload.name}`, cloudinaryUrl);
        } catch (uploadError) {
          console.warn('⚠️ Cloudinary upload failed, attempting fallback to backend storage:', uploadError);
          try {
            if (!upload.file) throw new Error('File content is missing');
            const backendResult = await AIService.uploadDocumentViaBackend(upload.file, currentAnalysisMetadata);
            cloudinaryUrl = backendResult.url;
            publicId = backendResult.publicId;
            console.log(`✅ File uploaded via fallback to backend: ${upload.name}`, cloudinaryUrl);
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
          console.log(`🧠 Synthesizing ${allAnalyses.length} documents...`);
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
      console.log('[ContentUploader] Generating presentation with source mode:', generationContext.sourceMode, {
        uploads: generationContext.uploadAnalyses?.length || 0,
        kbDocs: generationContext.knowledgeDocuments?.length || 0,
        callRecordings: generationContext.callRecordings?.length || 0,
      });
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


  const handleSavePresentation = async () => {
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
        String(rawText || '').replace(/<harx-style>[\s\S]*?<\/harx-style>/gi, '').trim();

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
      console.log('💾 Saving generated training journey...');
      const fileTrainingUrl: string | undefined = undefined;
      setFileTrainingUrl(undefined);

      const journeyToSave: any = {
        title: generatedCurriculum?.title || presentationToSave?.title || 'AI-generated training',
        description: generatedCurriculum?.description || 'AI-generated description',
        status: 'active',
        industry: company?.industry || 'General',
        company: company?.name || 'My Company',
      };

      const modulesToSave: any[] = Array.isArray(generatedCurriculum?.modules) && generatedCurriculum.modules.length > 0
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

  const generatePresentationFromState = async (regenerate: boolean) => {
    if (uploads.length === 0 && !gigId) return;

    if (!regenerate && generatedPresentation) {
      setIsPreviewOpen(false);
      setWorkspaceTab('artifact');
      return;
    }

    try {
      setIsGeneratingPresentation(true);
      if (regenerate) {
        setGeneratedPresentation(null);
      }
      console.log('🤖 Génération de la présentation en cours...');

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

      setGeneratedPresentation(normalizePresentationFromApi(presentation) || presentation);
      setIsPreviewOpen(false);
      setWorkspaceTab('artifact');

      console.log('✅ Présentation générée avec succès !');
    } catch (error: any) {
      console.error('Failed to generate presentation:', error);
      alert('Error generating presentation: ' + (error.message || 'Unknown error'));
      setIsProcessing(false);
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  const handleGeneratePresentation = () => generatePresentationFromState(false);

  const handleRegeneratePresentation = () => generatePresentationFromState(true);

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
    console.log('🎯 Generating from Gig:', gigId, 'useKnowledgeBase:', includeKbSource);
    return await AIService.generateTrainingFromGig(gigId, {
      useKnowledgeBase: includeKbSource,
      includeCallRecordings: includeKbSource,
      sourceContext: {
        sourceMode: 'gig',
        uploadAnalyses: [],
        knowledgeDocuments: [],
        callRecordings: [],
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
                onClick={handleSavePresentation}
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
                  onClick={handleSavePresentation}
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
    const shouldShowKbQuestionInChat = kbGenerationChoice === null;
    const shouldShowChatThread = hasStartedChat || shouldShowKbQuestionInChat || showPersonalizationCard;
    const kbOptions: Array<{ id: KbGenerationMode; label: string; hint: string }> = [
      { id: 'kb_only', label: 'KB uniquement', hint: 'Utiliser les documents analyses de knowledge base' },
      { id: 'uploads_only', label: 'Fichiers uploades uniquement', hint: 'Utiliser seulement vos fichiers joints' },
      { id: 'kb_and_uploads', label: 'KB + fichiers uploades', hint: 'Combiner knowledge base et fichiers joints' },
      { id: 'none', label: 'Sans documents', hint: 'Generer sans KB ni fichiers analyses' },
    ];
    const personalizationQuestions: Array<{
      key: 'level' | 'objective' | 'format';
      question: string;
      options: string[];
    }> = [
      {
        key: 'level',
        question: 'Quel est votre niveau actuel ?',
        options: ['Debutant complet', 'Quelques notions', 'Intermediaire', 'Avance'],
      },
      {
        key: 'objective',
        question: 'Quel est votre objectif principal ?',
        options: [
          'Comprendre les fondamentaux',
          'Mieux vendre le produit',
          'Traiter des cas pratiques',
          'Se preparer a la certification',
        ],
      },
      {
        key: 'format',
        question: 'Quel format preferez-vous ?',
        options: [
          'Plan de formation structure',
          'Cas pratiques + exercices',
          'Format atelier interactif',
          'Format fiche memo',
        ],
      },
    ];
    const handleSelectKbMode = (mode: KbGenerationMode) => {
      setKbGenerationChoice(mode);
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
            'Quelques questions pour personnaliser votre formation',
            'Q : Quel est votre niveau actuel ?',
            `R : ${nextAnswers.level}`,
            'Q : Quel est votre objectif principal ?',
            `R : ${nextAnswers.objective}`,
            'Q : Quel format preferez-vous ?',
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
      setChatMessages([]);
      setChatInput('');
      setActiveChatSessionId(null);
      setIsHistoryOpen(false);
      setKbGenerationChoice(null);
      setChatKbDocuments([]);
      setShowPersonalizationCard(false);
      setPersonalizationStep(0);
      setPersonalizationAnswers({});
    };

    const openHistorySession = async (sessionId: string) => {
      if (!sessionId || isChatLoading) return;
      setIsHistoryLoading(true);
      try {
        const session = await AIService.getChatSession(sessionId);
        if (!session) return;
        const mappedMessages = (session.messages || []).map((m, idx) => ({
          id: `history-${sessionId}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
          text: m.text || '',
          isStreaming: false,
        }));
        setChatMessages(mappedMessages);
        setActiveChatSessionId(session._id || sessionId);
        setIsHistoryOpen(false);
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

      const titleLine = lines.find((line) => /plan de formation/i.test(line));
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
            !/^plan de formation/i.test(normalized) &&
            !/^module\s*\d+/i.test(normalized)
          ) {
            introLines.push(normalized);
          }
          continue;
        }

        const durationMatch = normalized.match(/^dur[ée]e?\s*[:\-]\s*(.+)$/i);
        if (durationMatch) {
          current.duration = durationMatch[1].trim();
          continue;
        }

        if (/^[-•*]\s+/.test(line) || normalized.includes(':')) {
          const stripped = normalized
            .replace(/^objectifs?\s*:\s*/i, '')
            .replace(/^contenu\s*:\s*/i, '')
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

        let effectiveGenerationMode = kbGenerationChoice;
        // Safety: if user uploaded/analyzed files but mode is "none", auto-switch to uploads.
        if (effectiveGenerationMode === 'none' && analyzedUploads.length > 0) {
          effectiveGenerationMode = 'uploads_only';
          setKbGenerationChoice('uploads_only');
        }

        const usesKbForChat = effectiveGenerationMode === 'kb_only' || effectiveGenerationMode === 'kb_and_uploads';
        const usesUploadsForChat = effectiveGenerationMode === 'uploads_only' || effectiveGenerationMode === 'kb_and_uploads';
        const uploadsForChat = usesUploadsForChat ? analyzedUploads : [];

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

        const chatContext = JSON.stringify({
          app: 'HARX Journey Builder',
          selectedGigId: activeChatGigId || '',
          selectedGigTitle: activeChatGigTitle,
          generationMode: effectiveGenerationMode,
          personalizationProfile: {
            level: personalizationAnswers.level || '',
            objective: personalizationAnswers.objective || '',
            format: personalizationAnswers.format || '',
          },
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
        });

        const streamingAssistantId = options?.replaceAssistantId || appendChatMessage('assistant', '', { isStreaming: true });
        if (options?.replaceAssistantId) {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === options.replaceAssistantId
                ? { ...m, text: '', isStreaming: true }
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
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === streamingAssistantId
              ? {
                ...m,
                text: streamResult.text?.trim() || "Je n'ai pas pu generer une reponse pour le moment.",
                isStreaming: false,
              }
              : m
          )
        );
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

    return (
    <div className={rep ? 'flex w-full min-w-0 flex-col bg-harx-50/30' : 'min-h-[92vh] bg-harx-50/30 p-2'}>
      <div className={rep ? 'mx-auto flex w-full max-w-5xl flex-col px-4 py-6 md:px-6' : 'mx-auto w-full max-w-[1400px]'}>
        <div
          className={
            rep
              ? 'flex w-full flex-col'
              : 'w-full flex-1 rounded-3xl border border-harx-100 bg-harx-50/20 p-2 md:p-3'
          }
        >
          <div className={rep ? 'flex min-h-[72vh] w-full flex-col' : 'grid min-h-[88vh] gap-3 lg:grid-cols-[265px_minmax(0,1fr)]'}>
          {!rep && (
            <aside className="flex flex-col rounded-2xl border border-[#ece8dc] bg-[#f6f4eb] p-3">
              <div className="mb-4 px-2 text-xl font-semibold text-[#1f1f1d]">
                Claude
              </div>
              <button
                type="button"
                onClick={startNewConversation}
                className="mb-2 inline-flex w-full items-center gap-2 rounded-xl border border-[#e6e2d7] bg-white px-3 py-2 text-sm font-medium text-[#3f3a31]"
              >
                <Plus className="h-4 w-4 text-harx-600" />
                Nouvelle conversation
              </button>
              <button
                type="button"
                className="mb-4 inline-flex w-full items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-sm text-[#5f5a4f] hover:bg-white/70"
              >
                <Search className="h-4 w-4 text-harx-500" />
                Rechercher
              </button>
              <div className="mb-3 space-y-1 px-1 text-sm text-[#3f3a31]">
                <div className="rounded-lg px-2 py-1.5 hover:bg-white/70">Discussions</div>
                <div className="rounded-lg px-2 py-1.5 hover:bg-white/70">Projets</div>
                <div className="rounded-lg px-2 py-1.5 hover:bg-white/70">Artefacts</div>
              </div>
              <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-[#7d786b]">Récents</div>
              <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
                {isLoadingCompanyGigs ? (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-[#6c675b]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </div>
                ) : companyGigs.length === 0 ? (
                  <div className="rounded-lg bg-white/60 px-2 py-2 text-xs text-[#6c675b]">
                    Aucun project disponible.
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
                        className={`rounded-lg border px-2.5 py-2 ${
                          active
                            ? 'border-harx-200 bg-harx-50 text-harx-800'
                            : 'border-transparent bg-white/60 text-[#4f4a3f] hover:border-harx-100'
                        }`}
                      >
                        <div className="truncate text-sm font-semibold">{gig?.title || 'Untitled project'}</div>
                        {gig?.category ? (
                          <div className="truncate text-[11px] text-[#7d786b]">{gig.category}</div>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-auto border-t border-[#e7e2d3] px-2 pt-3">
                <div className="text-sm font-semibold text-[#2d2a22]">{displayName}</div>
                <div className="text-xs text-[#7d786b]">Forfait Free</div>
              </div>
            </aside>
          )}
          <div className={rep ? 'flex w-full flex-col rounded-2xl border border-harx-100 bg-harx-50/20 px-4 py-6 md:px-8 md:py-8' : 'rounded-2xl border border-harx-100 bg-harx-50/20 px-4 py-6 md:px-8 md:py-8'}>
          {/* Header */}
          {!hasStartedChat && (
            <div className={rep ? 'mb-10 shrink-0 px-1 text-center' : 'mb-10 text-center'}>
              <h2
                className={
                  rep
                    ? 'mb-2 text-5xl font-serif font-semibold tracking-tight text-harx-700'
                    : 'mb-2 text-6xl font-serif font-semibold tracking-tight text-harx-700'
                }
              >
                {`Bonsoir, ${displayName}.`}
              </h2>
              <p className={rep ? 'mx-auto max-w-xl text-[11px] leading-snug text-harx-600/80' : 'mx-auto max-w-3xl text-sm font-medium text-harx-600/80'}>
                Comment puis-je vous aider ?
              </p>
            </div>
          )}

          <div className={rep ? 'mx-auto mb-2 w-full max-w-[700px]' : 'mx-auto mb-4 w-full max-w-[700px]'}>
            <div className={rep ? 'relative rounded-none border-0 bg-transparent p-0 shadow-none' : 'relative rounded-3xl border border-harx-100 bg-white p-4 shadow-sm'}>
              <div className="mb-2 flex items-center justify-end gap-2">
                <select
                  value={activeChatGigId}
                  onChange={(e) => setSelectedChatGigId(e.target.value)}
                  className="max-w-[200px] rounded-lg border border-harx-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-harx-700 outline-none hover:bg-harx-50"
                  title="Choisir le gig pour le chat"
                >
                  <option value="">Choisir un gig</option>
                  {companyGigs.map((gig: any) => {
                    const id = String(gig?._id || gig?.id || '');
                    return (
                      <option key={id} value={id}>
                        {gig?.title || 'Untitled gig'}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg border border-harx-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-harx-700 hover:bg-harx-50"
                  title="Ouvrir l'historique"
                >
                  <History className="h-3.5 w-3.5" />
                  Historique
                </button>
                <button
                  type="button"
                  onClick={startNewConversation}
                  className="inline-flex items-center gap-1 rounded-lg border border-harx-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-harx-700 hover:bg-harx-50"
                  title="Nouvelle conversation"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle
                </button>
              </div>
              {isHistoryOpen && (
                <div className="absolute right-0 top-10 z-30 w-full max-w-[320px] rounded-xl border border-harx-200 bg-white p-2 shadow-xl">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="text-xs font-bold uppercase tracking-wide text-harx-600">
                      {`Historique — ${activeChatGigTitle}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshChatHistory()}
                      className="rounded p-1 text-harx-600 hover:bg-harx-50"
                      title="Rafraichir"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="max-h-[320px] space-y-1 overflow-y-auto">
                    {isHistoryLoading ? (
                      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-harx-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Chargement...
                      </div>
                    ) : chatHistorySessions.length === 0 ? (
                      <div className="rounded-md px-2 py-2 text-xs text-harx-500">
                        Aucun historique trouve pour ce gig.
                      </div>
                    ) : (
                      chatHistorySessions.map((session) => (
                        <button
                          key={session._id}
                          type="button"
                          onClick={() => void openHistorySession(session._id)}
                          className={`w-full rounded-md border px-2 py-2 text-left transition ${
                            activeChatSessionId === session._id
                              ? 'border-harx-300 bg-harx-50'
                              : 'border-transparent hover:border-harx-100 hover:bg-harx-50/70'
                          }`}
                        >
                          <div className="truncate text-[12px] font-semibold text-harx-800">
                            {session.title || 'Nouvelle conversation'}
                          </div>
                          {session.preview ? (
                            <div className="mt-0.5 line-clamp-2 text-[11px] text-harx-600">{session.preview}</div>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {shouldShowChatThread && (
                <div className={rep ? 'mb-3 space-y-6 rounded-xl bg-transparent p-0' : 'mb-4 space-y-6 rounded-2xl bg-white/70 p-4'}>
                  {shouldShowKbQuestionInChat && (
                    <div className="flex justify-start">
                      <div className="w-full max-w-[92%] rounded-[24px] border border-[#e7e3db] bg-white p-3 shadow-[0_8px_24px_rgba(17,24,39,0.05)]">
                        <div className="mb-2 flex items-center justify-between px-2 pt-1">
                          <p className="text-[28px] font-semibold leading-tight text-[#1f1d18]">
                            Est-ce que vous voulez generer un plan de formation et une formation a partir de knowledge base ?
                          </p>
                          <div className="ml-3 shrink-0 text-sm font-semibold text-[#b7b0a1]">1 sur 1</div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#f0ece3] bg-[#faf9f6]">
                          {kbOptions.map((option, idx) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectKbMode(option.id)}
                              className="flex w-full items-center gap-3 border-b border-[#efebe3] px-4 py-3 text-left transition hover:bg-white last:border-b-0"
                            >
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ece8e1] text-sm font-semibold text-[#777065]">
                                {idx + 1}
                              </span>
                              <span className="flex-1">
                                <span className="block text-base font-semibold text-[#26231c]">{option.label}</span>
                                <span className="block text-xs text-[#8d8678]">{option.hint}</span>
                              </span>
                              <span className="text-lg text-[#b3ac9d]">→</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-2 flex items-center justify-between px-1">
                          <div className="min-h-[16px] text-[11px] text-harx-600">
                            {isChatKbLoading ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Chargement des documents KB...
                              </span>
                            ) : (kbGenerationChoice === 'kb_only' || kbGenerationChoice === 'kb_and_uploads') ? (
                              <span>{chatKbDocuments.length} document(s) KB pret(s) pour la generation.</span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectKbMode('none')}
                            className="rounded-lg border border-[#d8d2c6] bg-white px-3 py-1.5 text-xs font-semibold text-[#4f493f] hover:bg-[#f8f6f1]"
                          >
                            Passer
                          </button>
                        </div>

                      </div>
                    </div>
                  )}
                  {showPersonalizationCard && (
                    <div className="flex justify-start">
                      <div className="w-full max-w-[92%] rounded-[24px] border border-[#e7e3db] bg-white p-3 shadow-[0_8px_24px_rgba(17,24,39,0.05)]">
                        <div className="mb-2 flex items-center justify-between px-2 pt-1">
                          <p className="text-[18px] font-semibold leading-tight text-[#1f1d18]">
                            {personalizationQuestions[personalizationStep]?.question || 'Quelques questions pour personnaliser votre formation'}
                          </p>
                          <div className="ml-3 shrink-0 text-sm font-semibold text-[#b7b0a1]">
                            {`${Math.min(personalizationStep + 1, personalizationQuestions.length)} sur ${personalizationQuestions.length}`}
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#f0ece3] bg-[#faf9f6]">
                          {(personalizationQuestions[personalizationStep]?.options || []).map((option, idx) => (
                            <button
                              key={`${personalizationStep}-${option}`}
                              type="button"
                              onClick={() => handleSelectPersonalizationOption(option)}
                              className="flex w-full items-center gap-3 border-b border-[#efebe3] px-4 py-3 text-left transition hover:bg-white last:border-b-0"
                            >
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ece8e1] text-sm font-semibold text-[#777065]">
                                {idx + 1}
                              </span>
                              <span className="flex-1">
                                <span className="block text-base font-semibold text-[#26231c]">{option}</span>
                              </span>
                              <span className="text-lg text-[#b3ac9d]">→</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-2 flex items-center justify-end px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPersonalizationCard(false);
                              setPersonalizationStep(0);
                              setPersonalizationAnswers({});
                            }}
                            className="rounded-lg border border-[#d8d2c6] bg-white px-3 py-1.5 text-xs font-semibold text-[#4f493f] hover:bg-[#f8f6f1]"
                          >
                            Passer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      {msg.role === 'assistant' ? (
                        <div className="max-w-[88%]">
                          <div className="max-w-none text-[#1f1d18]">
                            {(() => {
                              const textWithoutStyle = stripPromptEcho(stripResourceSections(
                                stripStyleBlueprint(String(msg.text || '').replace(/<harx-html>[\s\S]*?<\/harx-html>/gi, ''))
                              ));
                              const styleBlueprint = extractStyleBlueprint(msg.text);
                              const hasStyleBlueprint = /<harx-style>[\s\S]*?<\/harx-style>/i.test(String(msg.text || ''));
                              const looksLikeTrainingContent =
                                /\b(module|objectifs?|deroulement|d[ée]roulement|[ée]tape|activit[ée]s?|[ée]valuation|programme|parcours|plan)\b/i.test(
                                  textWithoutStyle
                                );
                              if (!hasStyleBlueprint && !looksLikeTrainingContent) {
                                return (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ children }) => <h3 className="mb-3 mt-1 text-[24px] font-semibold text-[#1b1914]">{children}</h3>,
                                      h2: ({ children }) => <h4 className="mb-2 mt-3 text-[20px] font-semibold text-[#1b1914]">{children}</h4>,
                                      h3: ({ children }) => <h5 className="mb-2 mt-2 text-[17px] font-semibold text-[#1b1914]">{children}</h5>,
                                      p: ({ children }) => <p className="my-2 text-[16px] leading-7 text-[#1f1d18]">{children}</p>,
                                      ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6 text-[16px] leading-7 text-[#1f1d18]">{children}</ul>,
                                      ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6 text-[16px] leading-7 text-[#1f1d18]">{children}</ol>,
                                      table: ({ children }) => (
                                        <div className="my-4 overflow-x-auto rounded-xl border border-[#e8e2d2]">
                                          <table className="min-w-full border-collapse bg-white">{children}</table>
                                        </div>
                                      ),
                                      thead: ({ children }) => <thead className="bg-[#f6f3ea]">{children}</thead>,
                                      tbody: ({ children }) => <tbody className="divide-y divide-[#e8e2d2]">{children}</tbody>,
                                      tr: ({ children }) => <tr className="align-top">{children}</tr>,
                                      th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold text-[#1f1d18]">{children}</th>,
                                      td: ({ children }) => <td className="px-3 py-2 text-sm text-[#1f1d18]">{children}</td>,
                                      li: ({ children }) => <li>{children}</li>,
                                      strong: ({ children }) => <strong className="font-semibold text-[#1b1914]">{children}</strong>,
                                      code: ({ children }) => <code className="rounded bg-[#f3f2ec] px-1 py-0.5 text-[14px] text-[#2b271f]">{children}</code>,
                                    }}
                                  >
                                    {textWithoutStyle}
                                  </ReactMarkdown>
                                );
                              }
                              const parsed = parseTrainingPlan(textWithoutStyle);
                              const hasDesignedPlan = parsed.modules.length >= 2;

                              if (!hasDesignedPlan) {
                                const contentTheme = styleBlueprint.contentTheme || {
                                  bodyColor: '#1f1d18',
                                  headingColor: '#181611',
                                  tableBorder: '#e8e2d2',
                                  tableHeaderBg: '#f6f3ea',
                                  tableHeaderText: '#1f1d18',
                                  tableRowBg: '#ffffff',
                                  kpiBg: '#fbfaf6',
                                  kpiBorder: '#e7dfcc',
                                  kpiLabel: '#6e6758',
                                  kpiValue: '#1f1d18',
                                  moduleShape: 'rounded' as const,
                                  panelBg: '#fbfaf6',
                                  panelBorder: '#e7dfcc',
                                  badgeBg: '#f0ecdf',
                                  badgeText: '#655b48',
                                };
                                return (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ children }) => (
                                        <h3 className="mb-3 mt-1 text-[28px] font-semibold tracking-tight" style={{ color: contentTheme.headingColor }}>
                                          {children}
                                        </h3>
                                      ),
                                      h2: ({ children }) => (
                                        <h4 className="mb-2 mt-3 text-[22px] font-semibold" style={{ color: contentTheme.headingColor }}>
                                          {children}
                                        </h4>
                                      ),
                                      h3: ({ children }) => (
                                        <h5 className="mb-2 mt-2 text-[17px] font-semibold" style={{ color: contentTheme.headingColor }}>
                                          {children}
                                        </h5>
                                      ),
                                      p: ({ children }) => (
                                        <p className="my-2 text-[16px] leading-7" style={{ color: contentTheme.bodyColor }}>{children}</p>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="my-2 list-disc space-y-1 pl-6 text-[16px] leading-7" style={{ color: contentTheme.bodyColor }}>
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="my-2 list-decimal space-y-1 pl-6 text-[16px] leading-7" style={{ color: contentTheme.bodyColor }}>
                                          {children}
                                        </ol>
                                      ),
                                      table: ({ children }) => (
                                        <div className="my-4 overflow-x-auto rounded-xl border" style={{ borderColor: contentTheme.tableBorder }}>
                                          <table className="min-w-full border-collapse" style={{ backgroundColor: contentTheme.tableRowBg }}>{children}</table>
                                        </div>
                                      ),
                                      thead: ({ children }) => <thead style={{ backgroundColor: contentTheme.tableHeaderBg }}>{children}</thead>,
                                      tbody: ({ children }) => <tbody className="divide-y" style={{ borderColor: contentTheme.tableBorder }}>{children}</tbody>,
                                      tr: ({ children }) => <tr className="align-top">{children}</tr>,
                                      th: ({ children }) => (
                                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ color: contentTheme.tableHeaderText }}>{children}</th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="px-3 py-2 text-sm" style={{ color: contentTheme.bodyColor }}>{children}</td>
                                      ),
                                      li: ({ children }) => <li>{children}</li>,
                                      strong: ({ children }) => (
                                        <strong className="font-semibold" style={{ color: contentTheme.headingColor }}>{children}</strong>
                                      ),
                                      code: ({ children }) => (
                                        <code className="rounded bg-[#f3f2ec] px-1 py-0.5 text-[14px] text-[#2b271f]">
                                          {children}
                                        </code>
                                      ),
                                    }}
                                  >
                                    {textWithoutStyle}
                                  </ReactMarkdown>
                                );
                              }

                              return (
                                <div className="mt-4 space-y-3">
                                  {parsed.intro && (
                                    <p className="text-[16px] leading-7" style={{ color: styleBlueprint.contentTheme?.bodyColor || '#1f1d18' }}>{parsed.intro}</p>
                                  )}
                                  {parsed.title && (
                                    <div className="text-center text-[15px] font-semibold" style={{ color: styleBlueprint.titleColor || '#1b1914' }}>
                                      {parsed.title}
                                    </div>
                                  )}
                                  {parsed.modules.map((module, idx) => (
                                    (() => {
                                      const theme = styleBlueprint.moduleCardThemes[idx % styleBlueprint.moduleCardThemes.length];
                                      const moduleShapeClass = styleBlueprint.contentTheme?.moduleShape === 'square'
                                        ? 'rounded-none'
                                        : styleBlueprint.contentTheme?.moduleShape === 'soft'
                                          ? 'rounded-2xl'
                                          : 'rounded-xl';
                                      return (
                                    <button
                                      key={`${module.title}-${idx}`}
                                      type="button"
                                      disabled={isChatLoading}
                                      onClick={() => {
                                        const moduleSummary =
                                          module.bullets.length > 0
                                            ? `\nPoints du module:\n- ${module.bullets.slice(0, 4).join('\n- ')}`
                                            : '';
                                        const ask = `Detaille le module "${module.title}" sous forme de reponse de formation normale.
Donne une explication pedagogique claire avec objectifs, contenu, activites pratiques et evaluation.
Conserve la duree totale du module et propose une repartition en etapes simples.
N'utilise pas de format slides (pas de "Slide 1", "Slide 2", etc.).${moduleSummary}`;
                                        void sendChatMessage(ask);
                                      }}
                                      className={`w-full border px-3 py-2 text-left transition-all duration-150 hover:-translate-y-[1px] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${moduleShapeClass}`}
                                      style={{
                                        backgroundColor: theme?.bg || '#f9f9f9',
                                        borderColor: theme?.border || '#ddd',
                                        color: theme?.text || '#1f1d18',
                                      }}
                                      title={`Cliquer pour detailler ${module.title}`}
                                    >
                                      <div className="text-[15px] font-semibold" style={{ color: theme?.text || '#1f1d18' }}>{module.title}</div>
                                      {module.duration && (
                                        <div className="text-[13px]" style={{ color: theme?.text || '#3f3b31' }}>Duree: {module.duration}</div>
                                      )}
                                      {module.bullets.length > 0 && (
                                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-5" style={{ color: theme?.text || '#2d2a22' }}>
                                          {module.bullets.slice(0, 5).map((bullet, bIdx) => (
                                            <li key={`${idx}-${bIdx}`}>{bullet}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </button>
                                      );
                                    })()
                                  ))}
                                </div>
                              );
                            })()}
                            {msg.isStreaming && (
                              <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-harx-400 align-middle" />
                            )}
                          </div>
                          <div className={`mt-2 flex items-center gap-2 text-harx-500 ${msg.isStreaming || !msg.text.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
                            <button
                              type="button"
                              onClick={() => handleRegenerateMessage(msg.id)}
                              className="rounded-md p-1.5 hover:bg-harx-100/70"
                              title="Regenerer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[60%] rounded-xl border border-harx-200 bg-[#f6f5ef] px-3 py-2 text-sm font-medium text-harx-700 shadow-sm">
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatLoading && !chatMessages.some((m) => m.isStreaming) && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-harx-200 bg-white px-3 py-2 text-sm text-harx-700 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Claude reflechit...
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={rep ? 'sticky bottom-2 z-20 bg-[#fcfcf8]/95 pb-1 pt-2 backdrop-blur-sm' : 'sticky bottom-2 z-20 bg-white/95 pb-1 pt-2 backdrop-blur-sm'}>
                <div className={rep ? 'rounded-[20px] border border-harx-200 bg-white px-4 py-3' : 'rounded-[28px] border border-harx-200 bg-white px-5 py-4'}>
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
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
                            ? 'Analyse'
                            : upload.status === 'error'
                              ? 'Erreur'
                              : upload.status === 'uploading'
                                ? 'Upload...'
                                : 'Analyse...';
                        return (
                          <div
                            key={`inline-${upload.id}`}
                            className="inline-flex max-w-full items-center gap-2 rounded-xl border border-harx-200 bg-harx-50/50 px-2.5 py-1.5"
                          >
                            {getFileIcon(upload.type, true)}
                            <div className="min-w-0">
                              <div className="max-w-[210px] truncate text-[11px] font-semibold text-harx-800">
                                {upload.name}
                              </div>
                              <div className="text-[10px] text-harx-600">{statusLabel}</div>
                            </div>
                            {upload.status === 'uploading' || upload.status === 'processing' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-harx-500" />
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removeUpload(upload.id)}
                              className="rounded p-0.5 text-harx-500 hover:bg-harx-100"
                              title="Retirer le fichier"
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
                    placeholder={hasStartedChat ? 'Repondre...' : 'Comment puis-je vous aider ?'}
                    className="mb-3 w-full resize-none bg-transparent text-[15px] text-harx-800 outline-none placeholder:text-harx-600/70"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-harx-200 text-harx-700 hover:bg-harx-50"
                      title="Importer des fichiers"
                    >
                      +
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSavePresentation()}
                        disabled={isSavingCloud}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-50"
                        title="Valider"
                      >
                        {isSavingCloud ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleChatSubmit()}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-harx px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        title="Envoyer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

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

          {/* Navigation */}
          <div
            className={
              rep
                ? 'mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between'
                : 'mt-8 flex flex-col gap-4 border-t border-gray-200 pt-6 md:flex-row md:items-center md:justify-between'
            }
          >
            <button
              type="button"
              onClick={onBack}
              className={
                rep
                  ? 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-harx-200 hover:text-harx-600'
                  : 'rounded-xl border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50'
              }
            >
              Back to setup
            </button>

            <div className={rep ? 'order-3 flex flex-1 justify-center sm:order-none' : 'order-3 flex flex-1 justify-center md:order-none'} />

            <div className={rep ? 'flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center' : 'flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:w-auto'} />
          </div>
          </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return renderSourcesUploadUI();
}
