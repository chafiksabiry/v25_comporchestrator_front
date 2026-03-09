import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Video, Music, Image, File, CheckCircle, Clock, AlertCircle, AlertTriangle, X, Sparkles, Zap, BarChart3, Eye, Wand2 } from 'lucide-react';
import { ContentUpload, ContentAnalysis } from '../../types/core';
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
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getFileIcon = (type: ContentUpload['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <Video className="h-8 w-8 text-red-500" />;
      case 'audio':
        return <Music className="h-8 w-8 text-green-500" />;
      case 'image':
        return <Image className="h-8 w-8 text-purple-500" />;
      case 'presentation':
        return <File className="h-8 w-8 text-orange-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
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
      setCurrentProcessing(upload.id);
      
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
          console.warn('⚠️ Cloudinary upload failed, continuing with local file:', uploadError);
          // Continue even if upload fails - we'll use blob URL as fallback
        }

        // ✅ Vraie analyse avec OpenAI au lieu de simulation
        const analysis = await AIService.analyzeDocument(upload.file);
        
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { 
                ...u, 
                status: 'analyzed', 
                aiAnalysis: analysis,
                cloudinaryUrl: cloudinaryUrl, // Store Cloudinary URL
                publicId: publicId // Store public ID
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
    
    setCurrentProcessing(null);
    setIsProcessing(false);
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;

    const isYouTube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    const urlUpload: ContentUpload = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: isYouTube ? 'YouTube Video' : 'Web Page',
      type: isYouTube ? 'video' : 'document',
      size: 0,
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
    };

    setUploads(prev => [...prev, urlUpload]);
    setIsProcessing(true);
    setCurrentProcessing(urlUpload.id);

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

    setCurrentProcessing(null);
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
    setCurrentProcessing(upload.id);
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
      setCurrentProcessing(null);
      setIsProcessing(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 mb-4">
              <Upload className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Step 1: Content Upload & AI Analysis</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Training Materials</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Upload your existing documents, videos, presentations, and media. Our AI will analyze and transform them into engaging training content.
            </p>
          </div>

          {/* Upload Area */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
            <div
              className={`border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50 scale-105' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Upload className="h-16 w-16 text-gray-400" />
                  <Sparkles className="h-6 w-6 text-blue-500 absolute -top-2 -right-2 animate-pulse" />
                </div>
              </div>
              
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Drop Your Files Here
              </h3>
              <p className="text-gray-600 mb-6 text-lg">
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
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 cursor-pointer transition-all shadow-lg hover:shadow-xl font-medium text-lg"
              >
                <Upload className="h-5 w-5 mr-3" />
                Choose Files
              </label>
              
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">PDF</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Word</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">PowerPoint</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">Videos</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">Audio</span>
                <span className="px-3 py-1 bg-pink-100 text-pink-800 text-sm rounded-full">Images</span>
              </div>
            </div>
          </div>

          {/* URL Input Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
            <div className="flex items-center mb-4">
              <Sparkles className="h-6 w-6 text-blue-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Or Add Content from URL</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Enter a YouTube video URL or a web page URL to analyze and extract content
            </p>
            <div className="flex gap-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="https://www.youtube.com/watch?v=... or https://example.com/article"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                disabled={isProcessing}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl"
              >
                <Zap className="h-5 w-5 inline mr-2" />
                Analyze URL
              </button>
            </div>
            <div className="mt-3 flex gap-2 text-sm text-gray-500">
              <Video className="h-4 w-4 text-red-500" />
              <span>YouTube videos</span>
              <span className="mx-2">•</span>
              <FileText className="h-4 w-4 text-blue-500" />
              <span>Web pages & articles</span>
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-center space-x-4">
                <Wand2 className="h-8 w-8 text-blue-500 animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI is Analyzing Your Content</h3>
                  <p className="text-gray-600">Extracting key concepts, learning objectives, and structure...</p>
                </div>
              </div>
            </div>
          )}

          {/* Uploaded Files */}
          {uploads.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900">
                  Uploaded Files ({uploads.length})
                </h3>
                {totalAnalyzed > 0 && (
                  <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700 font-medium">{totalAnalyzed} files analyzed</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {uploads.map((upload) => (
                  <div key={upload.id} className={`border-2 rounded-xl p-6 transition-all duration-300 ${
                    upload.status === 'analyzed' ? 'border-green-200 bg-green-50' :
                    upload.status === 'processing' ? 'border-blue-200 bg-blue-50' :
                    upload.status === 'error' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-white'
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
                              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
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
                      <div className="flex items-center justify-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                        <Wand2 className="h-6 w-6 text-blue-500 animate-spin" />
                        <div className="flex-1">
                          <span className="text-sm text-blue-700 font-medium block">
                            {upload.status === 'uploading' ? 'Uploading document...' : 'AI is analyzing this file...'}
                          </span>
                          <span className="text-xs text-blue-600 block mt-1">
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
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-8 mb-8">
              <div className="text-center">
                <Zap className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Ready for AI Enhancement!</h3>
                <p className="text-gray-600 mb-6">
                  Your content has been analyzed. Next, we'll transform it into engaging multimedia training materials.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                    <Video className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">AI Videos</div>
                    <div className="text-sm text-gray-600">Animated explanations</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                    <Music className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">Voice-overs</div>
                    <div className="text-sm text-gray-600">Professional narration</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                    <BarChart3 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">Infographics</div>
                    <div className="text-sm text-gray-600">Visual summaries</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                    <Zap className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">Interactive</div>
                    <div className="text-sm text-gray-600">Quizzes & scenarios</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={onBack}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Back to Setup
            </button>
            
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">
                {totalAnalyzed} of {uploads.length} files analyzed
              </div>
              {uploads.length > 0 && (
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${uploads.length > 0 ? (totalAnalyzed / uploads.length) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
            
            <button
              onClick={() => onComplete(uploads)}
              disabled={!canProceed}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg flex items-center space-x-2"
            >
              <span>Continue to AI Enhancement</span>
              <Wand2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}