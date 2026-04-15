import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Video, Music, Image, File as FileIcon, CheckCircle, Clock, AlertCircle, AlertTriangle, X, Sparkles, Zap, BarChart3, Wand2, Save, Loader2, Presentation, FileDown, Maximize2, RefreshCw, LayoutGrid, FolderOpen, Briefcase, Plus, Search, Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ContentUpload } from '../../types/core';
import { AIService, normalizePresentationFromApi, type UploadCurriculumContext, type PresentationGenerationContext, type CallRecordingRef } from '../../infrastructure/services/AIService';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { DraftService } from '../../infrastructure/services/DraftService';
import { cloudinaryService } from '../../lib/cloudinaryService';
import { getGigsByCompanyId } from '../../../../api/matching';
import type { Gig } from '../../../../types/matching';
import PresentationPreview from '../Training/PresentationPreview';
import { scrollJourneyMainToTop } from './journeyScroll';

interface ContentUploaderProps {
  onComplete: (uploads: ContentUpload[], fileTrainingUrl?: string) => void;
  onBack: () => void;
  company?: any;
  gigId?: string | null;
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

export default function ContentUploader(props: ContentUploaderProps) {
  const { onComplete, onBack, company, gigId, repOnboardingLayout = false } = props;
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
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; isStreaming?: boolean }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages, isChatLoading]);

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
            const backendResult = await AIService.uploadDocumentViaBackend(upload.file, analysisMetadata);
            cloudinaryUrl = backendResult.url;
            publicId = backendResult.publicId;
            console.log(`✅ File uploaded via fallback to backend: ${upload.name}`, cloudinaryUrl);
          } catch (fallbackError) {
            console.error('❌ Both Cloudinary and backend fallback failed:', fallbackError);
          }
        }

        // ✅ Vraie analyse avec AI
        if (!upload.file) throw new Error('File content is missing for analysis');
        const analysis = await AIService.analyzeDocument(upload.file, analysisMetadata);

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
  }, []);

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
            'General',
            undefined,
            uploadContext as any
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
    if (!generatedCurriculum) return;
    try {
      setIsSavingCloud(true);
      console.log('💾 Saving generated training journey...');
      const fileTrainingUrl: string | undefined = undefined;
      setFileTrainingUrl(undefined);

      const journeyToSave: any = {
        title: generatedCurriculum.title || 'AI-generated training',
        description: generatedCurriculum.description || 'AI-generated description',
        status: 'active',
        industry: company?.industry || 'General',
        company: company?.name || 'My Company',
      };

      const modulesToSave: any[] = (generatedCurriculum.modules || []).map((m: any, idx: number) => ({
        title: m.title || `Module ${idx + 1}`,
        description: m.description || '',
        duration: m.duration || 30,
        difficulty: m.difficulty || 'beginner',
        learningObjectives: m.learningObjectives || [],
        content: m.sections || m.content || [],
        sections: m.sections || [],
        order: idx
      }));

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
        generatedPresentation, // Pass presentation data to be saved in Cloudinary/DB
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
            'General',
            undefined,
            uploadContext as any
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
    const hasStartedChat = chatMessages.some((msg) => msg.role === 'user');
    const copyMessage = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        console.warn('[ContentUploader] Unable to copy message:', error);
      }
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
          current.bullets.push(normalized);
        }
      }

      if (current) modules.push(current);
      return {
        title: titleLine ? clean(titleLine) : undefined,
        intro: introLines.slice(0, 2).join(' '),
        modules,
      };
    };

    const handleChatSubmit = async () => {
      const message = chatInput.trim();
      if (!message || isChatLoading) return;
      appendChatMessage('user', message);
      setChatInput('');
      setIsChatLoading(true);

      try {
        const analyzedUploads = uploads
          .filter((u) => u.status === 'analyzed')
          .map((u) => ({
            keyTopics: u.aiAnalysis?.keyTopics || [],
            objectives: u.aiAnalysis?.learningObjectives || [],
          }));

        const chatContext = JSON.stringify({
          app: 'HARX Journey Builder',
          // Intentionally avoid company/gig identity so AI doesn't anchor to gig metadata.
          analyzedUploadsCount: analyzedUploads.length,
          analyzedUploads,
          conversationHistory: chatMessages.slice(-8).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          canGenerateTraining: canProceed,
        });

        const streamingAssistantId = appendChatMessage('assistant', '', { isStreaming: true });
        const fullResponse = await AIService.chatStream(message, chatContext, (chunk) => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === streamingAssistantId
                ? { ...m, text: `${m.text}${chunk}` }
                : m
            )
          );
        });
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === streamingAssistantId
              ? {
                ...m,
                text: fullResponse?.trim() || "Je n'ai pas pu generer une reponse pour le moment.",
                isStreaming: false,
              }
              : m
          )
        );
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
                    const active = !!gigId && id === String(gigId);
                    return (
                      <div
                        key={id || gig?.title}
                        className={`rounded-lg border px-2.5 py-2 ${
                          active
                            ? 'border-harx-200 bg-harx-50 text-harx-800'
                            : 'border-transparent bg-white/60 text-[#4f4a3f]'
                        }`}
                      >
                        <div className="truncate text-sm font-semibold">{gig?.title || 'Untitled project'}</div>
                        {gig?.category ? (
                          <div className="truncate text-[11px] text-[#7d786b]">{gig.category}</div>
                        ) : null}
                      </div>
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
              <div className="mb-8 flex items-center justify-center gap-2">
                <button type="button" className="rounded-md border border-harx-200 bg-harx-100/70 px-2.5 py-1 text-xs font-medium text-harx-700">Forfait Free</button>
                <button type="button" className="rounded-md border border-harx-200 bg-white px-2.5 py-1 text-xs font-medium text-harx-700">Mettre a niveau</button>
              </div>
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
            <div className={rep ? 'rounded-3xl border border-harx-100 bg-white p-4 shadow-sm' : 'rounded-3xl border border-harx-100 bg-white p-4 shadow-sm'}>
              {hasStartedChat && (
                <div ref={chatScrollRef} className="mb-4 max-h-[48vh] min-h-[34vh] space-y-6 overflow-y-auto rounded-2xl bg-white/70 p-4">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      {msg.role === 'assistant' ? (
                        <div className="max-w-[88%]">
                          <div className="max-w-none text-[#1f1d18]">
                            {(() => {
                              const parsed = parseTrainingPlan(msg.text);
                              const hasDesignedPlan = parsed.modules.length >= 2;

                              if (!hasDesignedPlan) {
                                return (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ children }) => (
                                        <h3 className="mb-3 mt-1 text-[28px] font-semibold tracking-tight text-[#13110d]">
                                          {children}
                                        </h3>
                                      ),
                                      h2: ({ children }) => (
                                        <h4 className="mb-2 mt-3 text-[22px] font-semibold text-[#181611]">
                                          {children}
                                        </h4>
                                      ),
                                      h3: ({ children }) => (
                                        <h5 className="mb-2 mt-2 text-[17px] font-semibold text-[#1f1d18]">
                                          {children}
                                        </h5>
                                      ),
                                      p: ({ children }) => (
                                        <p className="my-2 text-[16px] leading-7 text-[#1f1d18]">{children}</p>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="my-2 list-disc space-y-1 pl-6 text-[16px] leading-7 text-[#1f1d18]">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="my-2 list-decimal space-y-1 pl-6 text-[16px] leading-7 text-[#1f1d18]">
                                          {children}
                                        </ol>
                                      ),
                                      li: ({ children }) => <li>{children}</li>,
                                      strong: ({ children }) => (
                                        <strong className="font-semibold text-[#12100c]">{children}</strong>
                                      ),
                                      code: ({ children }) => (
                                        <code className="rounded bg-[#f3f2ec] px-1 py-0.5 text-[14px] text-[#2b271f]">
                                          {children}
                                        </code>
                                      ),
                                    }}
                                  >
                                    {msg.text}
                                  </ReactMarkdown>
                                );
                              }

                              const cardThemes = [
                                'border-[#98b9ea] bg-[#eaf3ff]',
                                'border-[#95d7c8] bg-[#eafbf5]',
                                'border-[#b7b5ea] bg-[#f0efff]',
                                'border-[#e8c79d] bg-[#fff7eb]',
                              ];
                              return (
                                <div className="mt-4 space-y-3">
                                  {parsed.intro && (
                                    <p className="text-[16px] leading-7 text-[#1f1d18]">{parsed.intro}</p>
                                  )}
                                  {parsed.title && (
                                    <div className="text-center text-[15px] font-semibold text-[#1b1914]">{parsed.title}</div>
                                  )}
                                  {parsed.modules.map((module, idx) => (
                                    <div
                                      key={`${module.title}-${idx}`}
                                      className={`rounded-xl border px-3 py-2 ${cardThemes[idx % cardThemes.length]}`}
                                    >
                                      <div className="text-[15px] font-semibold text-[#1f1d18]">{module.title}</div>
                                      {module.duration && (
                                        <div className="text-[13px] text-[#3f3b31]">Duree: {module.duration}</div>
                                      )}
                                      {module.bullets.length > 0 && (
                                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-5 text-[#2d2a22]">
                                          {module.bullets.slice(0, 5).map((bullet, bIdx) => (
                                            <li key={`${idx}-${bIdx}`}>{bullet}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
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
                              onClick={() => copyMessage(msg.text)}
                              className="rounded-md p-1.5 hover:bg-harx-100/70"
                              title="Copier"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="rounded-md p-1.5 hover:bg-harx-100/70" title="Utile">
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="rounded-md p-1.5 hover:bg-harx-100/70" title="Pas utile">
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="rounded-md p-1.5 hover:bg-harx-100/70" title="Regenerer">
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

              <div className="rounded-[28px] border border-harx-200 bg-white px-5 py-4">
                <input
                  type="text"
                  value={chatInput}
                  disabled={isChatLoading}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleChatSubmit();
                  }}
                  placeholder={hasStartedChat ? 'Repondre...' : 'Comment puis-je vous aider ?'}
                  className="mb-3 w-full bg-transparent text-[15px] text-harx-800 outline-none placeholder:text-harx-600/70"
                />
                <div className="flex items-center justify-between">
                  <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-harx-200 text-harx-700 hover:bg-harx-50">+</button>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-harx-200 bg-harx-50/60 px-2.5 py-1.5 text-xs font-medium text-harx-700">
                    Sonnet 4.6
                    <span className="text-[10px]">▼</span>
                  </div>
                </div>
              </div>

              {!hasStartedChat && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {['Code', 'Ecrire', 'Apprendre', 'Vie quotidienne', 'Choix de Claude'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setChatInput(chip)}
                      className="rounded-xl border border-harx-200 bg-harx-50/40 px-3 py-1.5 text-xs font-semibold text-harx-700 hover:border-harx-300 hover:bg-harx-100/60"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div
              className={
                rep
                  ? 'mb-2 rounded-lg border border-harx-100 bg-harx-50/50 p-3'
                  : 'mb-4 rounded-xl border border-purple-100 bg-white/40 p-4 backdrop-blur-sm'
              }
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <Wand2 className={rep ? 'h-5 w-5 animate-spin text-harx-500' : 'h-6 w-6 animate-spin text-purple-500'} />
                <div className="text-left">
                  <h3 className={rep ? 'text-xs font-bold text-gray-900' : 'text-base font-semibold text-gray-900'}>AI is analyzing your content</h3>
                  <p className={rep ? 'text-[10px] text-gray-600' : 'text-sm text-gray-600'}>Extracting concepts, objectives, and structure…</p>
                </div>
              </div>
            </div>
          )}

          {/* Uploaded Files */}
          {uploads.length > 0 && (
            <div className={rep ? 'mb-2 border-t border-harx-100/80 pt-3' : 'mb-4 border-t border-gray-100/50 pt-6'}>
              <div className={rep ? 'mb-2 flex items-center justify-between gap-2' : 'mb-4 flex items-center justify-between'}>
                <h3 className={rep ? 'text-xs font-extrabold text-gray-900' : 'text-xl font-bold text-gray-800'}>
                  Uploaded files ({uploads.length})
                </h3>
                {totalAnalyzed > 0 && (
                  <div
                    className={
                      rep
                        ? 'flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50/90 px-2 py-1'
                        : 'flex items-center space-x-2 rounded-full border border-green-100 bg-green-50 px-4 py-2'
                    }
                  >
                    <CheckCircle className={rep ? 'h-3.5 w-3.5 text-emerald-600' : 'h-5 w-5 text-green-500'} />
                    <span className={rep ? 'text-[10px] font-bold text-emerald-800' : 'text-sm font-bold text-green-700'}>
                      {totalAnalyzed} analyzed
                    </span>
                  </div>
                )}
              </div>

              <div className={rep ? 'grid grid-cols-1 gap-2 lg:grid-cols-2' : 'grid grid-cols-1 gap-6 lg:grid-cols-2'}>
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className={`border transition-all duration-300 group ${rep ? 'rounded-xl p-3' : 'rounded-2xl p-5'} ${
                      upload.status === 'analyzed'
                        ? rep
                          ? 'border-harx-100/80 bg-white hover:border-harx-200'
                          : 'border-gray-100/50 bg-white/60 hover:border-purple-200'
                        : upload.status === 'processing'
                          ? rep
                            ? 'border-harx-100 bg-harx-50/40'
                            : 'border-purple-100/50 bg-purple-50/50'
                          : upload.status === 'error'
                            ? 'border-red-100 bg-red-50/50'
                            : rep
                              ? 'border-gray-100 bg-white'
                              : 'border-gray-100/50 bg-white/40'
                    }`}
                  >
                    <div className={rep ? 'mb-2 flex items-start justify-between' : 'mb-4 flex items-start justify-between'}>
                      <div className={rep ? 'flex items-start gap-2' : 'flex items-start space-x-4'}>
                        {getFileIcon(upload.type, rep)}
                        <div className="min-w-0 flex-1">
                          <h4 className={rep ? 'mb-0.5 truncate text-xs font-bold text-gray-900' : 'mb-1 font-semibold text-gray-900'}>{upload.name}</h4>
                          <p className={rep ? 'text-[10px] text-gray-500' : 'text-sm text-gray-500'}>
                            {(upload.size / 1024 / 1024).toFixed(2)} MB · {upload.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {getStatusIcon(upload.status)}
                        <button
                          type="button"
                          onClick={() => removeUpload(upload.id)}
                          className="text-gray-400 transition-colors hover:text-harx-500"
                        >
                          <X className={rep ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                        </button>
                      </div>
                    </div>

                    {upload.status === 'error' && upload.error && (
                      <div className={rep ? 'mt-2 rounded-lg border border-red-200 bg-red-50 p-2' : 'mt-4 rounded-lg border border-red-300 bg-red-100 p-4'}>
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-medium text-red-900 mb-1">Analysis Failed</h5>
                            <p className="text-sm text-red-700">{upload.error}</p>
                            <button
                              onClick={() => analyzeUpload(upload)}
                              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium underline"
                            >
                              Try again
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {upload.status === 'analyzed' && upload.aiAnalysis && (
                      <div className={rep ? 'space-y-2' : 'space-y-4'}>
                        <div className={rep ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-4'}>
                          <div className={rep ? 'rounded-lg border border-emerald-100 bg-white p-2 text-center' : 'rounded-lg border border-green-200 bg-white p-3 text-center'}>
                            <BarChart3 className={rep ? 'mx-auto mb-0.5 h-4 w-4 text-emerald-600' : 'mx-auto mb-1 h-6 w-6 text-green-600'} />
                            <div className={rep ? 'text-sm font-bold text-emerald-700' : 'text-lg font-bold text-green-600'}>
                              {(upload.aiAnalysis.difficulty as number) || 0}/10
                            </div>
                            <div className={rep ? 'text-[9px] text-gray-500' : 'text-xs text-gray-600'}>Difficulty</div>
                          </div>
                          <div className={rep ? 'rounded-lg border border-emerald-100 bg-white p-2 text-center' : 'rounded-lg border border-green-200 bg-white p-3 text-center'}>
                            <Clock className={rep ? 'mx-auto mb-0.5 h-4 w-4 text-emerald-600' : 'mx-auto mb-1 h-6 w-6 text-green-600'} />
                            <div className={rep ? 'text-sm font-bold text-emerald-700' : 'text-lg font-bold text-green-600'}>
                              {(upload.aiAnalysis.estimatedReadTime as number) || 0}m
                            </div>
                            <div className={rep ? 'text-[9px] text-gray-500' : 'text-xs text-gray-600'}>Duration</div>
                          </div>
                        </div>

                        <div>
                          <h5 className={rep ? 'mb-1 text-[10px] font-bold text-gray-800' : 'mb-2 font-medium text-gray-900'}>Key topics</h5>
                          <div className={rep ? 'flex flex-wrap gap-1' : 'flex flex-wrap gap-2'}>
                            {upload.aiAnalysis.keyTopics?.map((topic: string, index: number) => (
                              <span
                                key={index}
                                className={
                                  rep
                                    ? 'rounded-full border border-harx-100 bg-harx-50/90 px-1.5 py-0.5 text-[9px] font-semibold text-harx-700'
                                    : 'rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-sm font-medium text-purple-600'
                                }
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className={rep ? 'mb-0.5 text-[10px] font-bold text-gray-800' : 'mb-2 font-medium text-gray-900'}>
                            AI modules ({upload.aiAnalysis.suggestedModules?.length || 0})
                          </h5>
                          <div className={rep ? 'line-clamp-2 text-[10px] leading-snug text-gray-600' : 'text-sm text-gray-600'}>
                            {upload.aiAnalysis.suggestedModules?.join(' → ') || 'Modular structure pending'}
                          </div>
                        </div>
                      </div>
                    )}

                    {(upload.status === 'uploading' || upload.status === 'processing') && (
                      <div
                        className={
                          rep
                            ? 'mt-2 flex items-center gap-2 rounded-lg border border-harx-100 bg-harx-50/60 p-2'
                            : 'mt-4 flex items-center justify-center space-x-3 rounded-xl border border-purple-100 bg-purple-50/70 p-3'
                        }
                      >
                        <Wand2 className={rep ? 'h-4 w-4 animate-spin text-harx-500' : 'h-5 w-5 animate-spin text-purple-500'} />
                        <div className="min-w-0 flex-1">
                          <span className={rep ? 'block text-[10px] font-bold text-harx-800' : 'block text-sm font-medium text-purple-700'}>
                            {upload.status === 'uploading' ? 'Uploading…' : 'Analyzing…'}
                          </span>
                          <span className={rep ? 'mt-0.5 block text-[9px] text-harx-600/90' : 'mt-0.5 block text-xs text-purple-500'}>
                            {upload.status === 'uploading' ? 'Sending file' : 'Extracting structure'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

            <div className={rep ? 'order-3 flex flex-1 justify-center sm:order-none' : 'order-3 flex flex-1 justify-center md:order-none'}>
              {uploads.length > 0 && (
                <div className="text-center">
                  <div className={rep ? 'mb-1 text-[10px] font-semibold text-gray-500' : 'mb-2 text-sm text-gray-500'}>
                    {totalAnalyzed} of {uploads.length} files analyzed
                  </div>
                  <div className={rep ? 'mx-auto h-1.5 w-36 overflow-hidden rounded-full bg-gray-200' : 'mx-auto h-2 w-48 overflow-hidden rounded-full bg-gray-200'}>
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(totalAnalyzed / uploads.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={rep ? 'flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center' : 'flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:w-auto'}>

              <button
                type="button"
                onClick={handleGenerateCurriculum}
                disabled={!canProceed || isProcessing}
                className={
                  rep
                    ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-harx px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50'
                    : 'flex items-center justify-center space-x-2 rounded-xl border border-rose-200 bg-white px-6 py-3 font-medium text-rose-600 shadow-sm transition-all hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50'
                }
              >
                {isGeneratingPresentation ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileIcon className="h-5 w-5" />
                )}
                <span>{isGeneratingPresentation ? 'Generating…' : 'Valider et generer la formation'}</span>
              </button>

              {/* <button
                onClick={() => onComplete(uploads, fileTrainingUrl)}
                disabled={!canProceed}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl hover:from-rose-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Continue to AI Enhancement</span>
                <Wand2 className="h-5 w-5" />
              </button> */}
            </div>
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
