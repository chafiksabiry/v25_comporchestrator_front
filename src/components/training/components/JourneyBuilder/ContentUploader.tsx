import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Video, Music, Image, File as FileIcon, CheckCircle, Clock, AlertCircle, AlertTriangle, X, Sparkles, Zap, BarChart3, Wand2, Save, Loader2, Presentation, FileDown, Maximize2, RefreshCw, LayoutGrid, FolderOpen, BookOpen } from 'lucide-react';
import { ContentUpload } from '../../types/core';
import { AIService, normalizePresentationFromApi } from '../../infrastructure/services/AIService';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { cloudinaryService } from '../../lib/cloudinaryService';
import PresentationPreview from '../Training/PresentationPreview';
import { scrollJourneyMainToTop } from './journeyScroll';

interface ContentUploaderProps {
  onComplete: (uploads: ContentUpload[], fileTrainingUrl?: string) => void;
  onBack: () => void;
  company?: any;
  gigId?: string | null;
  onFinishEarly?: (uploads: ContentUpload[], curriculum?: any, presentationData?: any, filetraining?: string) => void;
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
  const [isLoadingGigKbDocs, setIsLoadingGigKbDocs] = useState(false);

  useEffect(() => {
    scrollJourneyMainToTop();
  }, []);

  useEffect(() => {
    if (!gigId || !useKbForPresentation) {
      setGigKbDocuments([]);
      return;
    }
    let cancelled = false;
    setIsLoadingGigKbDocs(true);
    AIService.listGigKnowledgeDocuments(gigId)
      .then((docs) => {
        if (!cancelled) setGigKbDocuments(docs as any);
      })
      .catch((err) => {
        console.error('[ContentUploader] KB documents list failed:', err);
        if (!cancelled) setGigKbDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGigKbDocs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gigId, useKbForPresentation]);

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

      if (uploads.length > 0) {
        // Collect all successful analyses
        const allAnalyses = uploads
          .filter(u => u.status === 'analyzed' && u.aiAnalysis)
          .map(u => u.aiAnalysis);

        if (allAnalyses.length === 0) throw new Error('No analyzed content available');

        if (allAnalyses.length > 1) {
          console.log(`🧠 Synthesizing ${allAnalyses.length} documents...`);
          curriculum = await AIService.synthesizeAnalyses(allAnalyses as any);
        } else {
          const mainAnalysis = allAnalyses[0];
          const uploadContext = uploads.map(u => ({
            fileName: u.name,
            fileType: u.type,
            keyTopics: u.aiAnalysis?.keyTopics || [],
            learningObjectives: u.aiAnalysis?.learningObjectives || []
          }));

          curriculum = await AIService.generateCurriculum(
            mainAnalysis,
            'General',
            undefined,
            uploadContext as any
          );
        }
      } else {
        // Generate from Gig KB directly
        curriculum = await fetchCurriculumFromGig();
      }

      setGeneratedCurriculum(curriculum);

      let presentation =
        normalizePresentationFromApi(curriculum?.data?.presentation) ||
        normalizePresentationFromApi((curriculum as any)?.presentation) ||
        null;

      const gigOnlyCurriculum = uploads.length === 0 && !!gigId;
      if (gigOnlyCurriculum && useKbForPresentation) {
        try {
          console.warn('[ContentUploader] Rebuilding presentation with Job KB context (generate-presentation)');
          presentation =
            normalizePresentationFromApi(
              await AIService.generatePresentation(curriculum, { gigId: gigId!, useKnowledgeBase: true })
            ) || presentation;
        } catch (fallbackErr) {
          console.error('[ContentUploader] KB presentation generation failed:', fallbackErr);
        }
      } else if (!presentation?.slides?.length) {
        try {
          console.warn('[ContentUploader] Bundled presentation missing or empty slides — fetching via generate-presentation');
          presentation =
            normalizePresentationFromApi(await AIService.generatePresentation(curriculum)) || presentation;
        } catch (fallbackErr) {
          console.error('[ContentUploader] Fallback presentation generation failed:', fallbackErr);
        }
      }

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
      console.log('💾 Sauvegarde du parcours de formation généré par IA...');

      let fileTrainingUrl: string | undefined = undefined;
      // 1. Generate PPTX & Upload (non-blocking - save journey even if Cloudinary fails)
      if (generatedPresentation) {
        try {
          console.log('📦 Génération du PPTX pour sauvegarde...');
          const pptxBlob = await AIService.exportToPowerPoint(generatedPresentation);
          const file = new File([pptxBlob], `${generatedCurriculum.title || 'Training'}.pptx`, { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
          const uploadResult = await cloudinaryService.uploadDocument(file, 'trainings/pptx');
          fileTrainingUrl = uploadResult.secureUrl || uploadResult.url;
          setFileTrainingUrl(fileTrainingUrl);
          console.log('✅ PPTX enregistré dans Cloudinary:', fileTrainingUrl);
        } catch (e: any) {
          // Cloudinary may be disabled or credentials invalid — log warning but don't block save
          console.warn('⚠️ PPTX Cloudinary upload skipped:', e?.message || e);
        }
      }

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

      await JourneyService.saveJourney(
        journeyToSave,
        modulesToSave,
        company?.id || '',
        gigId || '',
        undefined, // finalExam
        undefined, // journeyId
        generatedPresentation, // Pass presentation data to be saved in Cloudinary/DB
        fileTrainingUrl
      );

      // On revient à la liste des formations
      if (props.onFinishEarly) {
        props.onFinishEarly(uploads, generatedCurriculum, generatedPresentation, fileTrainingUrl);
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
      const gigOnly = uploads.length === 0 && !!gigId;

      if (!curriculum) {
        setIsProcessing(true);

        if (uploads.length > 0) {
          const mainAnalysis = uploads[0].aiAnalysis;
          if (!mainAnalysis) throw new Error('No analysis found');

          const uploadContext = uploads.map(u => ({
            fileName: u.name,
            fileType: u.type,
            keyTopics: u.aiAnalysis?.keyTopics || [],
            learningObjectives: u.aiAnalysis?.learningObjectives || []
          }));

          curriculum = await AIService.generateCurriculum(
            mainAnalysis,
            'General',
            undefined,
            uploadContext as any
          );
        } else {
          curriculum = await fetchCurriculumFromGig();
        }

        setGeneratedCurriculum(curriculum);
        setIsProcessing(false);
      } else if (regenerate && gigOnly) {
        setIsProcessing(true);
        curriculum = await fetchCurriculumFromGig();
        setGeneratedCurriculum(curriculum);
        setIsProcessing(false);
      }

      let presentation =
        normalizePresentationFromApi(curriculum?.data?.presentation) ||
        curriculum?.data?.presentation ||
        null;

      if (gigOnly && useKbForPresentation) {
        presentation = await AIService.generatePresentation(curriculum, {
          gigId: gigId!,
          useKnowledgeBase: true
        });
      } else if (!presentation?.slides?.length) {
        presentation = await AIService.generatePresentation(curriculum);
      }

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
  const fetchCurriculumFromGig = async () => {
    if (!gigId) throw new Error('No Gig selected');
    console.log('🎯 Generating from Gig:', gigId, 'useKnowledgeBase:', useKbForPresentation);
    return await AIService.generateTrainingFromGig(gigId, { useKnowledgeBase: useKbForPresentation });
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
          <div className="grid min-h-[52dvh] flex-1 grid-cols-1 gap-3 p-3 sm:p-4 lg:min-h-0 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:gap-5">
            <aside className="flex max-h-[48vh] min-h-0 flex-col overflow-hidden rounded-2xl border border-rose-100/80 bg-white shadow-sm lg:max-h-none lg:h-full">
              <div className="shrink-0 px-4 pb-2 pt-4">
                <div className="mb-2 flex items-center gap-2 text-fuchsia-700">
                  <BookOpen className="h-5 w-5 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Modules</p>
                </div>
                <h2 className="break-words text-base font-bold leading-snug text-gray-900 [overflow-wrap:anywhere] sm:text-lg">
                  {generatedCurriculum?.title || generatedPresentation?.title || 'Training'}
                </h2>
                {generatedCurriculum?.description && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600">{generatedCurriculum.description}</p>
                )}
              </div>
              <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain border-t border-gray-100 px-4 py-3 [scrollbar-color:rgba(192,132,252,0.45)_transparent] [scrollbar-width:thin]">
                {(generatedCurriculum?.modules || []).length === 0 ? (
                  <li className="text-xs text-gray-500">No module list — use the slide navigator on the right.</li>
                ) : (
                  (generatedCurriculum?.modules || []).map((mod: any, idx: number) => (
                    <li
                      key={idx}
                      className="flex gap-2 rounded-xl border border-transparent px-2 py-2 text-sm text-gray-800 hover:border-fuchsia-100 hover:bg-fuchsia-50/40"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-fuchsia-100 text-xs font-bold text-fuchsia-900">
                        {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1 font-medium leading-snug [overflow-wrap:anywhere]">{mod.title || `Module ${idx + 1}`}</span>
                    </li>
                  ))
                )}
              </ol>
              <div className="shrink-0 space-y-2 border-t border-gray-100 bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={handleSavePresentation}
                  disabled={isSavingCloud || !generatedCurriculum}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-3 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
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
                  className="text-center text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Source files
                </button>
                <button type="button" onClick={onBack} className="text-center text-xs font-semibold text-gray-500 hover:text-gray-800">
                  Back to setup
                </button>
              </div>
            </aside>

            <section className="flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-rose-100/80 bg-white shadow-sm lg:min-h-0">
              <PresentationPreview
                presentation={generatedPresentation}
                onClose={() => setWorkspaceTab('sources')}
                fileTrainingUrl={undefined}
                isEmbedded={true}
                showPagination={false}
                hideExportPptx={true}
                embedLightCanvas={true}
                backLabel="Source files"
              />
            </section>
          </div>
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

              {isGigOnly && (
                <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      checked={useKbForPresentation}
                      onChange={(e) => setUseKbForPresentation(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-800">
                      Use knowledge base to generate the presentation
                      <span className="mt-1 block text-xs font-normal text-gray-600">
                        The presentation will be grounded in this job’s knowledge base documents.
                      </span>
                    </span>
                  </label>
                  {useKbForPresentation && (
                    <div className="mt-4 border-t border-rose-100/80 pt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-700">Documents linked to this job</p>
                      {isLoadingGigKbDocs ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      ) : gigKbDocuments.length === 0 ? (
                        <p className="text-sm text-amber-800">
                          No KB documents for this job — generation will rely mainly on the job profile.
                        </p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {gigKbDocuments.map((doc) => (
                            <li
                              key={doc._id}
                              className="flex items-start gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-sm"
                            >
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900">{doc.name}</div>
                                {doc.summary ? (
                                  <p className="line-clamp-2 text-xs text-gray-600">{doc.summary}</p>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

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

    return (
    <div className={rep ? 'flex w-full min-w-0 flex-col' : 'min-h-full p-2 md:p-4'}>
      <div className={rep ? 'mx-auto flex w-full max-w-5xl flex-col px-5 py-3 md:px-7' : 'container mx-auto max-w-6xl'}>
        <div
          className={
            rep
              ? 'flex w-full flex-col'
              : 'w-full flex-1 flex flex-col p-6 md:p-10 bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
          }
        >
          <div className={rep ? 'flex w-full flex-col' : 'contents'}>
          {/* Header */}
          <div className={rep ? 'mb-3 shrink-0 text-center px-1' : 'text-center mb-8'}>
            <div
              className={
                rep
                  ? 'mb-2 inline-flex items-center gap-1.5 rounded-full border border-harx-200 bg-harx-50/90 px-2.5 py-1'
                  : 'inline-flex items-center space-x-2 bg-purple-50 px-3 py-1.5 rounded-full shadow-inner border border-purple-100 mb-3'
              }
            >
              <Upload className={rep ? 'h-3.5 w-3.5 text-harx-500' : 'h-4 w-4 text-purple-500'} />
              <span className={rep ? 'text-[10px] font-bold uppercase tracking-wide text-harx-600' : 'text-xs font-medium text-purple-700'}>
                Step 1: Content Upload & AI Analysis
              </span>
            </div>
            <h2
              className={
                rep
                  ? 'mb-1 text-[17px] font-extrabold tracking-tight text-harx-600 md:text-lg'
                  : 'text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-pink-500 mb-2'
              }
            >
              Upload your training materials
            </h2>
            <p className={rep ? 'mx-auto max-w-xl text-[11px] leading-snug text-gray-500' : 'text-base text-gray-600 font-medium max-w-3xl mx-auto'}>
              Upload documents, videos, presentations, and media. Our AI analyzes and transforms them into training content.
            </p>
          </div>

          {/* Upload Area */}
          <div className={rep ? 'mb-2 shrink-0' : 'mb-4'}>
            <div
              className={`border-2 border-dashed text-center transition-all duration-300 ${rep ? 'rounded-xl p-4' : 'rounded-2xl p-8'} ${dragOver
                ? rep
                  ? 'scale-[1.01] border-harx-400 bg-harx-50/50'
                  : 'border-purple-500 bg-purple-50 scale-105'
                : rep
                  ? 'border-harx-200 hover:border-harx-300 hover:bg-harx-50/40'
                  : 'border-gray-200 hover:border-purple-400 hover:bg-white/50'
                }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className={rep ? 'mb-2 flex justify-center' : 'mb-4 flex justify-center'}>
                <div className="relative">
                  <Upload className={rep ? 'h-9 w-9 text-harx-300' : 'h-12 w-12 text-gray-400'} />
                  <Sparkles className={`absolute animate-pulse ${rep ? '-right-1 -top-1 h-4 w-4 text-harx-500' : '-right-2 -top-2 h-5 w-5 text-purple-500'}`} />
                </div>
              </div>

              <h3 className={rep ? 'mb-1 text-sm font-bold text-gray-900' : 'mb-2 text-xl font-semibold text-gray-900'}>
                Drop your files here
              </h3>
              <p className={rep ? 'mb-3 text-[11px] text-gray-500' : 'mb-4 text-base text-gray-600'}>
                or click to browse and select files from your computer
              </p>

              <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.mp4,.avi,.mov,.wmv,.webm,.mp3,.wav,.aac,.m4a,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
              />
              <label
                htmlFor="file-upload"
                className={
                  rep
                    ? 'inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-harx px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:brightness-105'
                    : 'inline-flex items-center px-8 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl hover:from-rose-600 hover:to-purple-700 cursor-pointer transition-all shadow-lg hover:-translate-y-0.5 font-medium text-lg'
                }
              >
                <Upload className={rep ? 'h-4 w-4' : 'mr-3 h-5 w-5'} />
                Choose files
              </label>

              <div className={rep ? 'mt-3 flex flex-wrap justify-center gap-1.5' : 'mt-6 flex flex-wrap justify-center gap-2'}>
                {(['PDF', 'Word', 'PowerPoint', 'Videos', 'Audio', 'Images'] as const).map((label) => (
                  <span
                    key={label}
                    className={
                      rep
                        ? 'rounded-full border border-harx-100 bg-harx-50/90 px-2 py-0.5 text-[10px] font-semibold text-harx-700'
                        : 'rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-sm font-medium text-purple-600'
                    }
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* URL Input Section */}
          <div className={rep ? 'mb-2 border-t border-harx-100/80 pt-3' : 'mb-4 border-t border-gray-100/50 pt-6'}>
            <div className={rep ? 'mb-1.5 flex items-center gap-1.5' : 'mb-3 flex items-center'}>
              <Sparkles className={rep ? 'h-3.5 w-3.5 text-harx-500' : 'mr-2 h-5 w-5 text-purple-500'} />
              <h3 className={rep ? 'text-xs font-extrabold text-gray-900' : 'text-lg font-bold text-gray-800'}>Or add content from URL</h3>
            </div>
            <p className={rep ? 'mb-2 text-[10px] text-gray-500' : 'mb-3 text-sm font-medium text-gray-500'}>
              YouTube or web page URL — we analyze and extract content
            </p>
            <div className={rep ? 'flex flex-col gap-2 sm:flex-row' : 'flex gap-2'}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="https://youtube.com/... or https://..."
                className={
                  rep
                    ? 'min-w-0 flex-1 rounded-lg border border-harx-100 px-3 py-2 text-xs text-gray-800 outline-none transition-all focus:border-harx-300 focus:ring-2 focus:ring-harx-500/15'
                    : 'flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500'
                }
                disabled={isProcessing}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isProcessing}
                className={
                  rep
                    ? 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-harx px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50'
                    : 'rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-rose-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50'
                }
              >
                <Zap className={rep ? 'h-3.5 w-3.5' : 'mr-2 inline h-5 w-5'} />
                Analyze URL
              </button>
            </div>
            <div className={rep ? 'mt-2 flex flex-wrap items-center gap-1 text-[10px] text-gray-400' : 'mt-3 flex gap-2 text-sm font-medium text-gray-400'}>
              <Video className={rep ? 'h-3 w-3 text-harx-400' : 'h-4 w-4 text-purple-400'} />
              <span>YouTube</span>
              <span className="mx-1">·</span>
              <FileText className={rep ? 'h-3 w-3 text-harx-400' : 'h-4 w-4 text-purple-400'} />
              <span>Web pages</span>
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

          {isGigOnly && (
            <div
              className={
                rep
                  ? 'mt-3 rounded-xl border border-harx-100 bg-harx-50/50 px-3 py-2.5'
                  : 'mt-6 rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-4'
              }
            >
              <label className={rep ? 'flex cursor-pointer items-start gap-2' : 'flex cursor-pointer items-start gap-3'}>
                <input
                  type="checkbox"
                  className={
                    rep
                      ? 'mt-0.5 h-3.5 w-3.5 rounded border-harx-300 text-harx-600 focus:ring-harx-500'
                      : 'mt-1 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500'
                  }
                  checked={useKbForPresentation}
                  onChange={(e) => setUseKbForPresentation(e.target.checked)}
                />
                <span className={rep ? 'text-xs font-semibold text-gray-800' : 'text-sm font-medium text-gray-800'}>
                  Use knowledge base to generate the presentation
                  <span className={rep ? 'mt-0.5 block text-[10px] font-normal text-gray-600' : 'mt-1 block text-xs font-normal text-gray-600'}>
                    The presentation will be grounded in this job’s KB documents when you click Generate.
                  </span>
                </span>
              </label>
              {useKbForPresentation && (
                <div className={rep ? 'mt-2 border-t border-harx-100/80 pt-2' : 'mt-4 border-t border-rose-100/80 pt-4'}>
                  <p className={rep ? 'mb-1 text-[10px] font-bold uppercase tracking-wide text-harx-600' : 'mb-2 text-xs font-bold uppercase tracking-wide text-rose-700'}>
                    Documents linked to this job
                  </p>
                  {isLoadingGigKbDocs ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : gigKbDocuments.length === 0 ? (
                    <p className="text-sm text-amber-800">
                      No KB documents for this job — generation will rely mainly on the job profile.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {gigKbDocuments.map((doc) => (
                        <li
                          key={doc._id}
                          className="flex items-start gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-sm"
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">{doc.name}</div>
                            {doc.summary ? (
                              <p className="line-clamp-2 text-xs text-gray-600">{doc.summary}</p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

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
                onClick={handleGeneratePresentation}
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
                <span>{isGeneratingPresentation ? 'Generating…' : 'Generate presentation'}</span>
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
    );
  }

  return renderSourcesUploadUI();
}
