import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Video, Music, Image, File as FileIcon, CheckCircle, Clock, AlertCircle, X, Sparkles, Wand2, Rocket, BarChart3, Zap } from 'lucide-react';
import { ContentUpload } from '../../types/core';
import { AIService } from '../../infrastructure/services/AIService';
import { cloudinaryService } from '../../lib/cloudinaryService';

interface ContentUploaderProps {
  onComplete: (uploads: ContentUpload[]) => void;
  onFinishEarly?: (uploads: ContentUpload[], curriculum: any) => void;
  onBack: () => void;
  company?: any;
  gigId?: string | null;
}

export default function ContentUploader({ onComplete, onFinishEarly, onBack, company, gigId }: ContentUploaderProps) {
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [viewMode, setViewMode] = useState<'upload' | 'curriculum'>('upload');
  const [generatedCurriculum, setGeneratedCurriculum] = useState<any>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getFileIcon = (type: ContentUpload['type']) => {
    switch (type) {
      case 'document': return <FileText className="h-8 w-8 text-purple-500" />;
      case 'video': return <Video className="h-8 w-8 text-red-500" />;
      case 'audio': return <Music className="h-8 w-8 text-green-500" />;
      case 'image': return <Image className="h-8 w-8 text-purple-500" />;
      case 'presentation': return <FileIcon className="h-8 w-8 text-orange-500" />;
      default: return <FileIcon className="h-8 w-8 text-gray-500" />;
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
      file: file
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsProcessing(true);

    for (const upload of newUploads) {
      setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'processing' } : u));
      try {
        let cloudinaryUrl = '';
        let publicId = '';
        try {
          const uploadFolder = `trainings/documents`;
          if (!upload.file) throw new Error('File content is missing');
          const uploadResult = await cloudinaryService.uploadDocument(upload.file, uploadFolder);
          cloudinaryUrl = uploadResult.secureUrl;
          publicId = uploadResult.publicId;
        } catch (uploadError) {
          if (!upload.file) throw new Error('File content is missing');
          const backendResult = await AIService.uploadDocumentViaBackend(upload.file);
          cloudinaryUrl = backendResult.url;
          publicId = backendResult.publicId;
        }
        const analysis = await AIService.analyzeDocument(upload.file);
        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'analyzed', aiAnalysis: analysis, cloudinaryUrl, publicId } : u));
      } catch (error: any) {
        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'error', error: error?.message || 'Analysis failed' } : u));
      }
    }
    setIsProcessing(false);
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;
    const isYouTube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    const urlUpload: any = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: isYouTube ? 'YouTube Video' : 'Web Page',
      type: isYouTube ? 'video' : 'document',
      status: 'uploading',
      size: 0,
      uploadedAt: new Date().toISOString(),
    };
    setUploads(prev => [...prev, urlUpload]);
    setIsProcessing(true);
    try {
      const analysis = await AIService.analyzeUrl(urlInput);
      setUploads(prev => prev.map(u => u.id === urlUpload.id ? { ...u, status: 'analyzed', aiAnalysis: analysis, name: urlInput } : u));
      setUrlInput('');
    } catch (error) {
      setUploads(prev => prev.map(u => u.id === urlUpload.id ? { ...u, status: 'error' } : u));
    }
    setIsProcessing(false);
  }, [urlInput]);

  const handleGenerateCurriculum = async () => {
    if (uploads.length === 0) return;
    setIsProcessing(true);
    try {
      const mainAnalysis = uploads[0].aiAnalysis;
      if (!mainAnalysis) throw new Error('No analysis found');
      const curriculum = await AIService.generateCurriculum(mainAnalysis, 'General', undefined, uploads.map(u => ({ fileName: u.name, fileType: u.type, keyTopics: u.aiAnalysis?.keyTopics || [], learningObjectives: u.aiAnalysis?.learningObjectives || [] })) as any);
      setGeneratedCurriculum(curriculum);
      setViewMode('curriculum');
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (viewMode === 'curriculum' && generatedCurriculum) {
    return (
      <div className="min-h-full p-2 md:p-4">
        <div className="max-w-5xl mx-auto bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-sm p-6 md:p-10">
          <button onClick={() => setViewMode('upload')} className="flex items-center text-purple-600 font-medium mb-6"><X className="h-5 w-5 mr-1" /> Back</button>
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-rose-500 to-purple-600 p-8 text-white">
              <h2 className="text-3xl font-extrabold mb-2">{generatedCurriculum.title}</h2>
              <p className="opacity-90">{generatedCurriculum.description}</p>
              <div className="mt-4 flex space-x-6 text-sm">
                <div className="flex items-center"><Clock className="h-4 w-4 mr-2" /> {Math.round(generatedCurriculum.totalDuration / 60)} hours total</div>
                <div className="flex items-center"><BarChart3 className="h-4 w-4 mr-2" /> {generatedCurriculum.modules?.length} Modules</div>
              </div>
            </div>
            <div className="p-8 space-y-6">
              {generatedCurriculum.modules?.map((module: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center mb-2">
                    <span className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold mr-3">{idx + 1}</span>
                    <h4 className="text-lg font-bold">{module.title}</h4>
                  </div>
                  <p className="text-gray-600 ml-11">{module.description}</p>
                </div>
              ))}
              <div className="mt-10 flex justify-center">
                <button onClick={() => onComplete(uploads)} className="px-10 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-all flex items-center">
                  <Rocket className="mr-2 h-5 w-5" /> Approve & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-2 md:p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-sm p-6 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Upload Training Materials</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Upload documents or videos. AI will transform them into training content.</p>
          </div>

          <div 
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(Array.from(e.dataTransfer.files)); }} 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} 
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <input type="file" multiple className="hidden" id="file-upload" onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))} />
            <label htmlFor="file-upload" className="inline-flex items-center px-8 py-4 bg-purple-600 text-white rounded-xl cursor-pointer font-bold shadow-lg">Choose Files</label>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <h3 className="font-bold mb-4">Add from URL</h3>
            <div className="flex gap-2">
              <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="YouTube or Web URL" className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none" />
              <button onClick={handleUrlSubmit} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold">Add URL</button>
            </div>
          </div>

          {uploads.length > 0 && (
            <div className="mt-8 space-y-3">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-4">
                    {getFileIcon(upload.type)}
                    <div>
                      <div className="font-bold text-gray-900">{upload.name}</div>
                      <div className="text-sm text-gray-500">{upload.status}</div>
                    </div>
                  </div>
                  <X className="h-5 w-5 text-gray-400 cursor-pointer hover:text-red-500" onClick={() => setUploads(prev => prev.filter(u => u.id !== upload.id))} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex justify-between">
            <button onClick={onBack} className="px-8 py-3 text-gray-600 font-bold">Back</button>
            <button 
              onClick={handleGenerateCurriculum} 
              disabled={!uploads.every(u => u.status === 'analyzed') || isProcessing}
              className="px-10 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Analyze & Generate Program'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
