import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Video, Music, Image, File as FileIcon, CheckCircle, Clock, AlertCircle, AlertTriangle, X, Sparkles, Zap, BarChart3, Wand2, Save, Loader2, Cloud } from 'lucide-react';
import { ContentUpload } from '../../types/core';
import { AIService } from '../../infrastructure/services/AIService';
import { cloudinaryService } from '../../lib/cloudinaryService';

interface ContentUploaderProps {
  onComplete: (uploads: ContentUpload[]) => void;
  onBack: () => void;
}

export default function ContentUploader({ onComplete, onBack }: ContentUploaderProps) {
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [viewMode, setViewMode] = useState<'upload' | 'curriculum' | 'ppt'>('upload');
  const [generatedCurriculum, setGeneratedCurriculum] = useState<any>(null);
  const [generatedPresentation, setGeneratedPresentation] = useState<any>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSavingCloud, setIsSavingCloud] = useState(false);


  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getFileIcon = (type: ContentUpload['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="h-8 w-8 text-purple-500" />;
      case 'video':
        return <Video className="h-8 w-8 text-red-500" />;
      case 'audio':
        return <Music className="h-8 w-8 text-green-500" />;
      case 'image':
        return <Image className="h-8 w-8 text-purple-500" />;
      case 'presentation':
        return <FileIcon className="h-8 w-8 text-orange-500" />;
      default:
        return <FileIcon className="h-8 w-8 text-gray-500" />;
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

  // ❌ SUPPRIMÉ : simulateAIAnalysis - Remplacé par AIService.analyzeDocument()

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
            const backendResult = await AIService.uploadDocumentViaBackend(upload.file);
            cloudinaryUrl = backendResult.url;
            publicId = backendResult.publicId;
            console.log(`✅ File uploaded via fallback to backend: ${upload.name}`, cloudinaryUrl);
          } catch (fallbackError) {
            console.error('❌ Both Cloudinary and backend fallback failed:', fallbackError);
          }
        }

        // ✅ Vraie analyse avec AI
        if (!upload.file) throw new Error('File content is missing for analysis');
        const analysis = await AIService.analyzeDocument(upload.file);

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
      const analysis = await AIService.analyzeDocument(upload.file);

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
    if (uploads.length === 0) return;
    
    setIsProcessing(true);
    try {
      const mainAnalysis = uploads[0].aiAnalysis;
      if (!mainAnalysis) throw new Error('No analysis found');
      
      const uploadContext = uploads.map(u => ({
        fileName: u.name,
        fileType: u.type,
        keyTopics: u.aiAnalysis?.keyTopics || [],
        learningObjectives: u.aiAnalysis?.learningObjectives || []
      }));
      
      const curriculum = await AIService.generateCurriculum(
        mainAnalysis,
        'General',
        undefined,
        uploadContext as any
      );
      
      setGeneratedCurriculum(curriculum);
      setViewMode('curriculum');
    } catch (error: any) {
      console.error('Failed to generate curriculum:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGeneratePPT = async () => {
    if (!generatedCurriculum) {
      alert("Veuillez d'abord générer le programme (Curriculum).");
      return;
    }
    
    setIsGeneratingPPT(true);
    try {
      console.log('🚀 Generating actual presentation slides...');
      // 1. Generate real presentation slides
      const presentation = await AIService.generatePresentation(generatedCurriculum);
      
      setGeneratedPresentation(presentation);
      setViewMode('ppt');
      setCurrentSlideIndex(0);
      
    } catch (error: any) {
      console.error('Failed to generate Presentation:', error);
      alert('Erreur lors de la génération du PPT: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const downloadPPTX = async () => {
    if (!generatedPresentation) return;
    try {
      console.log('📊 Exporting to PowerPoint...');
      const pptBlob = await AIService.exportToPowerPoint(generatedPresentation);
      
      const url = window.URL.createObjectURL(pptBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${generatedPresentation.title || 'Training_Program'}.pptx`.replace(/\s+/g, '_');
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to export PPT:', error);
      alert('Erreur lors de l\'export: ' + error.message);
    }
  };

  const handleSaveToCloud = async () => {
    if (!generatedPresentation) return;
    try {
      setIsSavingCloud(true);
      console.log('☁️ Sauvegarde dans le cloud...');
      
      // 1. Generate PPTX blob
      const pptBlob = await AIService.exportToPowerPoint(generatedPresentation);
      
      // 2. Convert to File
      const fileName = `${generatedPresentation.title || 'Training_Program'}.pptx`.replace(/\s+/g, '_');
      const file = new File([pptBlob], fileName, { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      
      // 3. Upload to Cloudinary via Backend
      const { url, publicId } = await AIService.uploadDocumentViaBackend(file);
      
      // 4. Update uploads list to include this generated presentation
      const newUpload: ContentUpload = {
        id: Date.now().toString(),
        name: fileName,
        type: 'presentation',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'analyzed',
        file: file,
        cloudinaryUrl: url,
        publicId: publicId,
      };
      
      const finalUploads = [...uploads, newUpload];
      setUploads(finalUploads);
      
      alert('La présentation a été sauvegardée avec succès dans le cloud ! Elle sera ajoutée au programme lors de la validation.');
    } catch (error: any) {
      console.error('Failed to save presentation to cloud:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setIsSavingCloud(false);
    }
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

  const canProceed = uploads.length > 0 && uploads.every(u => u.status === 'analyzed');
  const totalAnalyzed = uploads.filter(u => u.status === 'analyzed').length;

  if (viewMode === 'curriculum' && generatedCurriculum) {
    return (
      <div className="min-h-full p-2 md:p-4">
        <div className="max-w-5xl mx-auto bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
          <button 
            onClick={() => setViewMode('upload')}
            className="flex items-center text-purple-600 font-medium mb-6 hover:text-purple-800 transition-colors"
          >
            <X className="h-5 w-5 mr-1" /> Retour aux fichiers
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
                  {generatedCurriculum.totalDuration / 60} heures total
                </div>
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 opacity-80" />
                  {generatedCurriculum.modules?.length} Modules
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <FileText className="h-6 w-6 mr-2 text-purple-500" /> Structure du Programme
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
                            <Zap className="h-4 w-4 mr-1.5 text-orange-500" /> {module.difficulty}
                          </div>
                        </div>
                        
                        {module.learningObjectives?.length > 0 && (
                          <div className="mt-4 ml-11">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Objectifs d'apprentissage :</h5>
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
              
              <div className="mt-10 flex justify-center">
                <button 
                  onClick={() => onComplete(uploads)}
                  className="px-10 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                >
                  Approuver et Continuer vers l'Amélioration AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'ppt' && generatedPresentation) {
    const slides = generatedPresentation.slides || [];
    const totalSlides = slides.length;
    
    const slide = slides[currentSlideIndex] || {};

    const isCover = slide.type?.toLowerCase() === 'cover';
    const isConclusion = slide.type?.toLowerCase() === 'conclusion';
    let bgClasses = 'bg-white text-slate-800';
    if (isCover) bgClasses = 'bg-[#1e293b] text-white';
    if (isConclusion) bgClasses = 'bg-[#10b981] text-white';

    return (
      <div className="min-h-full bg-[#f1f5f9] p-8 flex flex-col items-center">
        <div className="w-full max-w-6xl flex items-center justify-between mb-6">
          <button 
            onClick={() => setViewMode('upload')}
            className="flex items-center text-slate-600 font-semibold hover:text-slate-900 transition-colors"
          >
            <X className="h-5 w-5 mr-1" /> Retour
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm font-bold text-slate-500">DIAPOSITIVE {currentSlideIndex + 1} / {totalSlides}</span>
            <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
              <button 
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                className="p-2 hover:bg-slate-100 rounded-md disabled:opacity-30"
              >
                ←
              </button>
              <button 
                disabled={currentSlideIndex === totalSlides - 1}
                onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                className="p-2 hover:bg-slate-100 rounded-md disabled:opacity-30"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl aspect-[16/9] shadow-2xl rounded-lg overflow-hidden border-8 border-white bg-white relative">
          <div className={`w-full h-full ${bgClasses} transition-all duration-500 flex flex-col p-16`}>
            
            {/* Title / Cover Slide */}
            {isCover && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h1 className="text-6xl font-extrabold mb-8 tracking-tight">{slide.title}</h1>
                <p className="text-2xl text-purple-100 max-w-3xl mb-12">{slide.subtitle || slide.highlight}</p>
              </div>
            )}
            
            {/* Conclusion Slide */}
            {isConclusion && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="h-32 w-32 rounded-full bg-white/20 flex items-center justify-center mb-10">
                  <Sparkles className="h-16 w-16 text-white" />
                </div>
                <h1 className="text-7xl font-black mb-8">{slide.title}</h1>
                <p className="text-3xl text-green-50 font-medium whitespace-pre-line">{slide.content || slide.subtitle}</p>
              </div>
            )}

            {/* Standard / Content Slides */}
            {!isCover && !isConclusion && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-bold flex items-center w-full">
                    <span className="mr-4">{slide.icon || ''} {slide.title}</span>
                    <div className="flex-1 h-1 bg-slate-100 ml-4 rounded-full"></div>
                  </h2>
                  {slide.highlight && (
                    <div className="ml-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-lg font-bold border border-yellow-200">
                      💡 {slide.highlight}
                    </div>
                  )}
                </div>
                
                {slide.content && (
                  <p className="text-2xl text-slate-600 mb-8 leading-relaxed">
                    {slide.content}
                  </p>
                )}

                <div className="flex-1 space-y-6">
                  {slide.bullets?.map((item: string, i: number) => (
                    <div key={i} className="flex items-start text-xl text-slate-700 animate-in slide-in-from-left duration-300" style={{animationDelay: `${i*100}ms`}}>
                      <span className="h-3 w-3 rounded-full bg-purple-500 mr-4 mt-2.5 flex-shrink-0"></span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
                
                {slide.note && (
                  <div className="mt-8 pt-6 border-t border-slate-100 text-slate-400 font-medium">
                    <span className="font-bold">🎤 Note:</span> {slide.note}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex space-x-4">
           <button 
             onClick={downloadPPTX}
             className="px-8 py-4 bg-white text-slate-800 rounded-2xl font-bold shadow-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center"
           >
             <FileText className="mr-2 h-5 w-5 text-purple-600" />
             Télécharger le fichier .pptx
           </button>
           <button 
             onClick={handleSaveToCloud}
             disabled={isSavingCloud}
             className="px-8 py-4 bg-white text-slate-800 rounded-2xl font-bold shadow-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center"
           >
             {isSavingCloud ? (
               <Loader2 className="mr-2 h-5 w-5 text-purple-600 animate-spin" />
             ) : (
               <Save className="mr-2 h-5 w-5 text-purple-600" />
             )}
             {isSavingCloud ? 'Sauvegarde...' : 'Sauvegarder dans le Cloud'}
           </button>
           <button 
             onClick={() => onComplete(uploads)}
             className="px-8 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:from-rose-600 hover:to-purple-700 transition-all flex items-center"
           >
             <Sparkles className="h-5 w-5 mr-2" /> Valider le programme
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-2 md:p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="w-full flex-1 flex flex-col p-6 md:p-10 bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-purple-50 px-3 py-1.5 rounded-full shadow-inner border border-purple-100 mb-3">
              <Upload className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-purple-700">Step 1: Content Upload & AI Analysis</span>
            </div>
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-pink-500 mb-2">Upload Your Training Materials</h2>
            <p className="text-base text-gray-600 font-medium max-w-3xl mx-auto">
              Upload your existing documents, videos, presentations, and media. Our AI will analyze and transform them into engaging training content.
            </p>
          </div>

          {/* Upload Area */}
          <div className="mb-4">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${dragOver
                ? 'border-purple-500 bg-purple-50 scale-105'
                : 'border-gray-200 hover:border-purple-400 hover:bg-white/50'
                }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <Sparkles className="h-5 w-5 text-purple-500 absolute -top-2 -right-2 animate-pulse" />
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Drop Your Files Here
              </h3>
              <p className="text-gray-600 mb-4 text-base">
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
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl hover:from-rose-600 hover:to-purple-700 cursor-pointer transition-all shadow-lg hover:-translate-y-0.5 font-medium text-lg"
              >
                <Upload className="h-5 w-5 mr-3" />
                Choose Files
              </label>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 text-sm rounded-full font-medium">PDF</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 text-sm rounded-full font-medium">Word</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 text-sm rounded-full font-medium">PowerPoint</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 text-sm rounded-full font-medium">Videos</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 text-sm rounded-full font-medium">Audio</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 text-sm rounded-full font-medium">Images</span>
              </div>
            </div>
          </div>

          {/* URL Input Section */}
          <div className="pt-6 border-t border-gray-100/50 mb-4">
            <div className="flex items-center mb-3">
              <Sparkles className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Or Add Content from URL</h3>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-3">
              Enter a YouTube video URL or a web page URL to analyze and extract content
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="https://www.youtube.com/watch?v=... or https://example.com/article"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-800 text-sm transition-all shadow-sm"
                disabled={isProcessing}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl hover:from-rose-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:-translate-y-0.5"
              >
                <Zap className="h-5 w-5 inline mr-2" />
                Analyze URL
              </button>
            </div>
            <div className="mt-3 flex gap-2 text-sm text-gray-400 font-medium font-medium">
              <Video className="h-4 w-4 text-purple-400" />
              <span>YouTube videos</span>
              <span className="mx-2">•</span>
              <FileText className="h-4 w-4 text-purple-400" />
              <span>Web pages & articles</span>
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-purple-100 p-4 mb-4">
              <div className="flex items-center justify-center space-x-3">
                <Wand2 className="h-6 w-6 text-purple-500 animate-spin" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">AI is Analyzing Your Content</h3>
                  <p className="text-sm text-gray-600">Extracting key concepts, learning objectives, and structure...</p>
                </div>
              </div>
            </div>
          )}

          {/* Uploaded Files */}
          {uploads.length > 0 && (
            <div className="pt-6 border-t border-gray-100/50 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Uploaded Files ({uploads.length})
                </h3>
                {totalAnalyzed > 0 && (
                  <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full border border-green-100">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700 font-bold text-sm">{totalAnalyzed} files analyzed</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {uploads.map((upload) => (
                  <div key={upload.id} className={`border border-gray-100/50 rounded-2xl p-5 hover:border-purple-200 transition-all duration-300 group ${upload.status === 'analyzed' ? 'bg-white/60' :
                    upload.status === 'processing' ? 'bg-purple-50/50' :
                      upload.status === 'error' ? 'bg-red-50/50' :
                        'bg-white/40'
                    }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        {getFileIcon(upload.type)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{upload.name}</h4>
                          <p className="text-sm text-gray-500">
                            {(upload.size / 1024 / 1024).toFixed(2)} MB • {upload.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getStatusIcon(upload.status)}
                        <button
                          onClick={() => removeUpload(upload.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {upload.status === 'error' && upload.error && (
                      <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
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
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                            <BarChart3 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                            <div className="text-lg font-bold text-green-600">{upload.aiAnalysis.difficulty}/10</div>
                            <div className="text-xs text-gray-600">Difficulty</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                            <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
                            <div className="text-lg font-bold text-green-600">{upload.aiAnalysis.estimatedReadTime}m</div>
                            <div className="text-xs text-gray-600">Duration</div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Key Topics Identified:</h5>
                          <div className="flex flex-wrap gap-2">
                            {upload.aiAnalysis.keyTopics.map((topic, index) => (
                              <span key={index} className="px-3 py-1 bg-purple-50 text-purple-600 text-sm font-medium rounded-full border border-purple-100">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">AI will create {upload.aiAnalysis.suggestedModules.length} modules:</h5>
                          <div className="text-sm text-gray-600">
                            {upload.aiAnalysis.suggestedModules.join(' → ')}
                          </div>
                        </div>
                      </div>
                    )}

                    {(upload.status === 'uploading' || upload.status === 'processing') && (
                      <div className="flex items-center justify-center space-x-3 p-3 bg-purple-50/70 rounded-xl border border-purple-100 mt-4">
                        <Wand2 className="h-5 w-5 text-purple-500 animate-spin" />
                        <div className="flex-1">
                          <span className="text-sm text-purple-700 font-medium block">
                            {upload.status === 'uploading' ? 'Uploading document...' : 'AI is analyzing this file...'}
                          </span>
                          <span className="text-xs text-purple-500 block mt-0.5">
                            {upload.status === 'uploading' ? 'Please wait while we upload your file' : 'Extracting key concepts and structure...'}
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
          {totalAnalyzed > 0 && (
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
          )}

          {/* Navigation */}
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onBack}
              className="px-6 py-2 bg-white text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Back to Setup
            </button>

            <div className="flex-1 flex justify-center order-3 md:order-none">
              {uploads.length > 0 && (
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-2">
                    {totalAnalyzed} of {uploads.length} files analyzed
                  </div>
                  <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${(totalAnalyzed / uploads.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleGeneratePPT}
                disabled={!canProceed || isGeneratingPPT}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg flex items-center justify-center space-x-2"
              >
                <div className="flex items-center space-x-2">
                  {isGeneratingPPT ? (
                    <Wand2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileIcon className="h-5 w-5" />
                  )}
                  <span>Aperçu de la présentation PPT</span>
                </div>
              </button>

              <button
                onClick={handleGenerateCurriculum}
                disabled={!canProceed || isProcessing}
                className="px-6 py-3 bg-white text-purple-700 rounded-xl border border-purple-200 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <Wand2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                <span>Aperçu du programme</span>
              </button>

              <button
                onClick={() => onComplete(uploads)}
                disabled={!canProceed}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl hover:from-rose-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Continue to AI Enhancement</span>
                <Wand2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
