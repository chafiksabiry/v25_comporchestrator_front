import React, { useState, useEffect } from 'react';
import { Upload, File, Image, Video, Loader2, CheckCircle2, AlertCircle, Sparkles, ArrowRight, X, BarChart3, Clock, RefreshCw, Edit2, BookOpen, FileText, Play, Youtube, Layers, GripVertical, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { cloudinaryService, CloudinaryUploadResult } from '../../lib/cloudinaryService';
import { AIService, DocumentAnalysis } from '../../infrastructure/services/AIService';
import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
};

const API_BASE = getApiBaseUrl();

interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  url: string;
  publicId: string;
  size: number;
  cloudinaryResult: CloudinaryUploadResult;
  analysis?: DocumentAnalysis;
  analyzing?: boolean;
  analysisError?: string;
  file?: File; // Store original file for analysis
}

interface AIContentOrganizerProps {
  trainingId: string;
  trainingTitle: string;
  onComplete: () => void;
  onSkip: () => void;
  onBack?: () => void;
  existingUploads?: any[]; // Files already uploaded from previous step
}

export const AIContentOrganizer: React.FC<AIContentOrganizerProps> = ({
  trainingId,
  trainingTitle,
  onComplete,
  onSkip,
  onBack,
  existingUploads = [],
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Initialize with existing uploads if provided
  useEffect(() => {
    if (existingUploads && existingUploads.length > 0) {
      console.log('[AIContentOrganizer] Using existing uploads:', existingUploads);
      // Convert existing uploads to UploadedFile format if needed
      // For now, we'll let user upload again or use the uploaded files
    }
  }, [existingUploads]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [checkingAI, setCheckingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedMetadata, setGeneratedMetadata] = useState<{ title: string; description: string } | null>(null);
  const [generatingMetadata, setGeneratingMetadata] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [trainingOrganization, setTrainingOrganization] = useState<any[]>([]);
  const [loadingOrganization, setLoadingOrganization] = useState(false);
  const [organizationInstructions, setOrganizationInstructions] = useState('');
  const [initialOrganization, setInitialOrganization] = useState<string>('');
  const [generatingInitialOrganization, setGeneratingInitialOrganization] = useState(false);
  const [showOrganizationInput, setShowOrganizationInput] = useState(false);
  const [generationOptions, setGenerationOptions] = useState({
    generateModuleQuizzes: false,
    generateFinalExam: false,
  });
  const [organizationComplete, setOrganizationComplete] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [editedModules, setEditedModules] = useState<Map<string, { title: string; description: string }>>(new Map());

  // Check if OpenAI is available
  const checkAIAvailability = async () => {
    setCheckingAI(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/ai/check-availability`);
      setAiAvailable(response.data.available);
      if (!response.data.available) {
        setError('OpenAI is not available. You can continue with manual creation.');
      }
    } catch (err) {
      setAiAvailable(false);
      setError('Cannot connect to AI service. Continuing with manual mode.');
    } finally {
      setCheckingAI(false);
    }
  };

  React.useEffect(() => {
    checkAIAvailability();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      try {
        let result: CloudinaryUploadResult;
        const fileType = getFileType(file);

        switch (fileType) {
          case 'image':
            result = await cloudinaryService.uploadImage(file, 'trainings/ai-content');
            break;
          case 'video':
            result = await cloudinaryService.uploadVideo(file, 'trainings/ai-content');
            break;
          case 'document':
            result = await cloudinaryService.uploadDocument(file, 'trainings/ai-content');
            break;
          default:
            throw new Error('Unsupported file type');
        }

        const uploadedFile: UploadedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: fileType,
          url: result.secureUrl,
          publicId: result.publicId,
          size: file.size,
          cloudinaryResult: result,
          file: file, // Store original file for analysis
          analyzing: fileType === 'document', // Auto-analyze documents
        };

        newFiles.push(uploadedFile);
        setUploadedFiles(prev => [...prev, uploadedFile]);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setUploading(false);

    // Auto-analyze documents after upload
    for (const uploadedFile of newFiles) {
      if (uploadedFile.type === 'document' && uploadedFile.file) {
        analyzeFile(uploadedFile.id, uploadedFile.file);
      }
    }

    // Auto-generate metadata after all documents are analyzed
    if (newFiles.some(f => f.type === 'document')) {
      // Wait a bit for analyses to complete, then generate metadata
      setTimeout(() => {
        generateTrainingMetadata();
        // Also generate initial organization
        generateInitialOrganization();
      }, 2000);
    }
  };

  const generateInitialOrganization = async () => {
    if (uploadedFiles.length === 0) return;

    setGeneratingInitialOrganization(true);
    try {
      // Generate initial organization suggestion based on uploaded files
      const response = await axios.post(`${API_BASE}/api/ai/generate-initial-organization`, {
        files: uploadedFiles.map(f => ({
          name: f.name,
          type: f.type,
          url: f.url,
          publicId: f.publicId,
        })),
        analyses: uploadedFiles
          .filter(f => f.analysis)
          .map(f => ({
            fileName: f.name,
            keyTopics: f.analysis?.keyTopics || [],
            difficulty: f.analysis?.difficulty || 5,
            estimatedReadTime: f.analysis?.estimatedReadTime || 30,
          })),
      });

      if (response.data.success && response.data.organization) {
        setInitialOrganization(response.data.organization);
      }
    } catch (err: any) {
      console.error('Error generating initial organization:', err);
      // Don't show error to user - just continue without initial organization
    } finally {
      setGeneratingInitialOrganization(false);
    }
  };

  const analyzeFile = async (fileId: string, file: File) => {
    setUploadedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, analyzing: true, analysisError: undefined } : f
    ));

    try {
      const analysis = await AIService.analyzeDocument(file);
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, analysis, analyzing: false } : f
      ));
    } catch (err: any) {
      console.error('Analysis error:', err);
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          analyzing: false,
          analysisError: err.message || 'Analysis failed'
        } : f
      ));
    }
  };

  const generateTrainingMetadata = async () => {
    if (uploadedFiles.length === 0) return;

    setGeneratingMetadata(true);
    setError(null);

    try {
      // Get all document analyses
      const documentFiles = uploadedFiles.filter(f => f.type === 'document' && f.analysis);

      const response = await axios.post(`${API_BASE}/api/ai/generate-training-metadata`, {
        companyName: '', // Can be empty for AIContentOrganizer
        industry: '',
        gig: '',
        files: uploadedFiles.map(f => ({
          name: f.name,
          type: f.type,
          url: f.url,
          publicId: f.publicId,
        })),
      });

      if (response.data.success) {
        const metadata = {
          title: response.data.title,
          description: response.data.description,
        };
        setGeneratedMetadata(metadata);
        setEditedTitle(metadata.title);
        setEditedDescription(metadata.description);
      } else {
        setError('Failed to generate training metadata');
      }
    } catch (err: any) {
      console.error('Metadata generation error:', err);
      setError(`Failed to generate metadata: ${err.message}`);
    } finally {
      setGeneratingMetadata(false);
    }
  };

  const regenerateMetadata = async () => {
    await generateTrainingMetadata();
  };

  const getFileType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const loadTrainingOrganization = async () => {
    setLoadingOrganization(true);
    try {
      const response = await axios.get(`${API_BASE}/manual-trainings/${trainingId}/modules`);
      if (response.data.success) {
        const modules = response.data.data || [];
        // Sort by orderIndex
        const sortedModules = modules.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setTrainingOrganization(sortedModules);
      }
    } catch (err) {
      console.error('Error loading training organization:', err);
    } finally {
      setLoadingOrganization(false);
    }
  };

  const handleEditModule = (moduleId: string, currentTitle: string, currentDescription: string) => {
    setEditingModuleId(moduleId);
    const newMap = new Map(editedModules);
    newMap.set(moduleId, { title: currentTitle, description: currentDescription || '' });
    setEditedModules(newMap);
  };

  const handleSaveModule = async (moduleId: string) => {
    const edited = editedModules.get(moduleId);
    if (!edited) return;

    try {
      const response = await axios.put(`${API_BASE}/manual-trainings/modules/${moduleId}`, {
        title: edited.title,
        description: edited.description,
      });

      if (response.data.success) {
        await loadTrainingOrganization();
        setEditingModuleId(null);
      }
    } catch (err) {
      console.error('Error updating module:', err);
      setError('Failed to update module');
    }
  };

  const handleCancelEdit = (moduleId: string) => {
    setEditingModuleId(null);
    const newMap = new Map(editedModules);
    newMap.delete(moduleId);
    setEditedModules(newMap);
  };

  const handleMoveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const currentIndex = trainingOrganization.findIndex(m => m.id === moduleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= trainingOrganization.length) return;

    try {
      // Swap orderIndex values
      const currentModule = trainingOrganization[currentIndex];
      const targetModule = trainingOrganization[newIndex];

      const currentOrder = currentModule.orderIndex || currentIndex;
      const targetOrder = targetModule.orderIndex || newIndex;

      // Update both modules
      await Promise.all([
        axios.put(`${API_BASE}/manual-trainings/modules/${moduleId}`, { orderIndex: targetOrder }),
        axios.put(`${API_BASE}/manual-trainings/modules/${targetModule.id}`, { orderIndex: currentOrder }),
      ]);

      await loadTrainingOrganization();
    } catch (err) {
      console.error('Error moving module:', err);
      setError('Failed to move module');
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const handleProcessWithAI = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Update training with generated metadata if available
      if (generatedMetadata) {
        try {
          await axios.put(`${API_BASE}/manual-trainings/${trainingId}`, {
            title: generatedMetadata.title,
            description: generatedMetadata.description,
          });
        } catch (updateErr) {
          console.error('Failed to update training metadata:', updateErr);
          // Continue even if update fails
        }
      }

      // Use custom instructions if provided, otherwise use initial organization
      const finalInstructions = organizationInstructions.trim() || initialOrganization || undefined;

      const response = await axios.post(`${API_BASE}/api/ai/organize-training`, {
        trainingId,
        files: uploadedFiles.map(f => ({
          url: f.url,
          type: f.type,
          name: f.name,
          publicId: f.publicId,
        })),
        organizationInstructions: finalInstructions,
        generationOptions: {
          generateModuleQuizzes: generationOptions.generateModuleQuizzes,
          generateFinalExam: generationOptions.generateFinalExam,
        },
      });

      if (response.data.success) {
        // Load organization after successful organization
        await loadTrainingOrganization();
        // Mark organization as complete - user can now view it and continue manually
        setOrganizationComplete(true);
        setProcessing(false);
      } else {
        setError('Failed to organize content with AI');
        setProcessing(false);
      }
    } catch (err: any) {
      console.error('AI processing error:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message
        || err.response?.data?.error
        || err.message
        || 'Failed to process content with AI';
      setError(`Error organizing training content: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'document':
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'powerpoint':
        return <FileText className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-8 h-8 text-blue-500" />;
      case 'video':
        return <Video className="w-8 h-8 text-purple-500" />;
      default:
        return <File className="w-8 h-8 text-green-500" />;
    }
  };

  if (checkingAI) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Checking AI Availability...</h2>
          <p className="text-gray-600">Please wait while we connect to the AI service</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI-Powered Content Organization</h1>
          <p className="text-gray-600">Upload your content and let AI organize your training automatically</p>
          <p className="text-sm text-purple-600 font-medium mt-2">Training: {trainingTitle}</p>
        </div>

        {/* AI Status */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${aiAvailable === false
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
          }`}>
          <div className="flex items-center">
            {aiAvailable === false ? (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 font-medium">
                  OpenAI is not available. Click "Skip AI" to continue with manual creation.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium">
                  AI service is ready! Upload your files to get started.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Upload Area */}
        {aiAvailable !== false && (
          <>
            <div className="mb-6">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading || processing}
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Support for images, videos, PDFs, Word, Excel, PowerPoint
                  </p>
                </div>
              </label>
            </div>

            {/* Uploaded Files List with Analysis */}
            {uploadedFiles.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Uploaded Files ({uploadedFiles.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {getFileIcon(file.type)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          disabled={processing}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Analysis Results for Documents */}
                      {file.type === 'document' && (
                        <div className="pt-3 border-t border-gray-200">
                          {file.analyzing && (
                            <div className="flex items-center space-x-2 text-blue-600 py-2">
                              <Sparkles className="w-4 h-4 animate-pulse" />
                              <span className="text-sm font-medium">Analyzing document...</span>
                            </div>
                          )}

                          {file.analysis && !file.analyzing && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                                  <BarChart3 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                  <div className="text-base font-bold text-green-600">{file.analysis.difficulty}/10</div>
                                  <div className="text-xs text-gray-600">Difficulty</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                                  <Clock className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                  <div className="text-base font-bold text-green-600">{file.analysis.estimatedReadTime}m</div>
                                  <div className="text-xs text-gray-600">Duration</div>
                                </div>
                              </div>

                              {file.analysis.keyTopics && file.analysis.keyTopics.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2 text-sm">Key Topics:</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {file.analysis.keyTopics.slice(0, 5).map((topic, index) => (
                                      <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {file.analysisError && (
                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-xs text-yellow-800">⚠️ {file.analysisError}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="mb-6 flex items-center justify-center text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Uploading files...</span>
              </div>
            )}
          </>
        )}

        {/* Training Organization */}
        {trainingOrganization.length > 0 && (
          <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border-2 border-indigo-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Layers className="w-6 h-6 text-indigo-600 mr-2" />
                Training Organization
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPromptInput(!showPromptInput)}
                  className="px-3 py-2 text-sm bg-white border-2 border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors font-medium flex items-center space-x-2"
                  title={showPromptInput ? 'Hide prompt input' : 'Show prompt input'}
                >
                  {showPromptInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPromptInput ? 'Hide' : 'Show'} Prompt</span>
                </button>
                {loadingOrganization && (
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                )}
              </div>
            </div>

            {/* Prompt Input Display */}
            {showPromptInput && (
              <div className="mb-4 p-4 bg-white rounded-lg border-2 border-indigo-200">
                <div className="flex items-center mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 mr-2" />
                  <span className="text-sm font-semibold text-gray-700">Organization Instructions:</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {organizationInstructions || initialOrganization || 'No custom instructions provided. AI used default organization.'}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {trainingOrganization.map((module, moduleIndex) => {
                const moduleId = module.id || `module-${moduleIndex}`;
                const sections = module.sections || [];
                const sortedSections = sections.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
                const isExpanded = expandedModules.has(moduleId);
                const isEditing = editingModuleId === moduleId;
                const edited = editedModules.get(moduleId);
                const currentTitle = edited?.title || module.title || `Module ${moduleIndex + 1}`;
                const currentDescription = edited?.description || module.description || '';

                return (
                  <div
                    key={moduleId}
                    className="bg-white rounded-lg border-2 border-indigo-200 p-4 shadow-md hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Drag Handle & Move Buttons */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                        <button
                          onClick={() => handleMoveModule(moduleId, 'up')}
                          disabled={moduleIndex === 0}
                          className="p-1 text-indigo-600 hover:bg-indigo-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveModule(moduleId, 'down')}
                          disabled={moduleIndex === trainingOrganization.length - 1}
                          className="p-1 text-indigo-600 hover:bg-indigo-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Module Number */}
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {moduleIndex + 1}
                      </div>

                      {/* Module Content */}
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Module Title</label>
                              <input
                                type="text"
                                value={edited?.title || ''}
                                onChange={(e) => {
                                  const newMap = new Map(editedModules);
                                  const current = newMap.get(moduleId) || { title: currentTitle, description: currentDescription };
                                  newMap.set(moduleId, { ...current, title: e.target.value });
                                  setEditedModules(newMap);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Enter module title"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                              <textarea
                                value={edited?.description || ''}
                                onChange={(e) => {
                                  const newMap = new Map(editedModules);
                                  const current = newMap.get(moduleId) || { title: currentTitle, description: currentDescription };
                                  newMap.set(moduleId, { ...current, description: e.target.value });
                                  setEditedModules(newMap);
                                }}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Enter module description"
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleCancelEdit(moduleId)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveModule(moduleId)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-900 mb-1">
                                  {currentTitle}
                                </h4>
                                {currentDescription && (
                                  <p className="text-sm text-gray-600">{currentDescription}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() => handleEditModule(moduleId, currentTitle, currentDescription)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                  title="Edit module"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                                  {sortedSections.length} {sortedSections.length === 1 ? 'Section' : 'Sections'}
                                </span>
                              </div>
                            </div>

                            {/* Sections Preview */}
                            {sortedSections.length > 0 && (
                              <div className="mt-3">
                                <button
                                  onClick={() => toggleModuleExpansion(moduleId)}
                                  className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium mb-2"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      <span>Hide Documents</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      <span>Show Documents ({sortedSections.length})</span>
                                    </>
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="pt-3 border-t border-gray-200 space-y-2">
                                    {sortedSections.map((section: any, sectionIndex: number) => (
                                      <div
                                        key={section.id || sectionIndex}
                                        className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                                      >
                                        <div className="text-blue-600 flex-shrink-0">
                                          {getSectionIcon(section.type || 'document')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-800 text-sm">
                                            {section.title || `Section ${sectionIndex + 1}`}
                                          </div>
                                          {section.description && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                              {section.description}
                                            </p>
                                          )}
                                          {section.contentUrl && (
                                            <a
                                              href={section.contentUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                                            >
                                              View Document →
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-200">
              <div className="flex items-center justify-center space-x-2 text-indigo-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">
                  {trainingOrganization.length} {trainingOrganization.length === 1 ? 'Module' : 'Modules'} • {' '}
                  {trainingOrganization.reduce((total, module) => total + (module.sections?.length || 0), 0)} {' '}
                  {trainingOrganization.reduce((total, module) => total + (module.sections?.length || 0), 0) === 1 ? 'Section' : 'Sections'} Total
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Generated Training Metadata */}
        {generatedMetadata && (
          <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                Generated Training Details
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingMetadata(!editingMetadata)}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={regenerateMetadata}
                  disabled={generatingMetadata}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1"
                  title="Regenerate"
                >
                  <RefreshCw className={`w-4 h-4 ${generatingMetadata ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {editingMetadata ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Title</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter training title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter training description"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditingMetadata(false);
                      setEditedTitle(generatedMetadata.title);
                      setEditedDescription(generatedMetadata.description);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedMetadata({
                        title: editedTitle,
                        description: editedDescription,
                      });
                      setEditingMetadata(false);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{generatedMetadata.title}</h4>
                  <p className="text-sm text-gray-600">{generatedMetadata.description}</p>
                </div>
              </div>
            )}

            {generatingMetadata && (
              <div className="mt-4 flex items-center space-x-2 text-purple-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Regenerating training details...</span>
              </div>
            )}
          </div>
        )}

        {/* Initial Organization Suggestion */}
        {uploadedFiles.length > 0 && aiAvailable !== false && (
          <div className="mb-6">
            {generatingInitialOrganization ? (
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-md">
                <div className="flex items-center justify-center space-x-3 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Generating initial organization suggestion...</span>
                </div>
              </div>
            ) : initialOrganization ? (
              <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Sparkles className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-bold text-gray-900">AI Suggested Organization</h3>
                  </div>
                  <button
                    onClick={() => setShowOrganizationInput(!showOrganizationInput)}
                    className="px-4 py-2 text-sm bg-white border-2 border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center space-x-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>{showOrganizationInput ? 'Hide' : 'Customize'} Instructions</span>
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200 mb-3">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{initialOrganization}</p>
                </div>
                {!showOrganizationInput && (
                  <p className="text-xs text-green-700 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    This organization will be used. Click "Customize Instructions" to modify it.
                  </p>
                )}
              </div>
            ) : null}

            {/* Organization Instructions Input (shown when button clicked or if no initial organization) */}
            {showOrganizationInput && (
              <div className="mt-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-md">
                <div className="flex items-center mb-3">
                  <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-bold text-gray-900">Customize Organization Instructions</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Modify the AI suggestion or provide your own organization structure:
                </p>
                <textarea
                  value={organizationInstructions || initialOrganization}
                  onChange={(e) => setOrganizationInstructions(e.target.value)}
                  placeholder="Example: Create 4 modules focusing on basics, intermediate, and advanced topics. Organize by topic: Introduction, Core Concepts, Practical Applications, and Case Studies..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-gray-800 placeholder-gray-400"
                  disabled={processing || uploading}
                />
                {organizationInstructions.trim() && (
                  <p className="text-xs text-blue-600 mt-2 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Your custom instructions will override the AI suggestion
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generation Options */}
        {uploadedFiles.length > 0 && aiAvailable !== false && (
          <div className="mb-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-md">
            <div className="flex items-center mb-4">
              <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">Generation Options</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Choose what should be automatically generated during organization:
            </p>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={generationOptions.generateModuleQuizzes}
                  onChange={(e) => setGenerationOptions({
                    ...generationOptions,
                    generateModuleQuizzes: e.target.checked,
                  })}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  disabled={processing}
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Generate Module Quizzes</span>
                  <p className="text-xs text-gray-600">Automatically create quizzes for each module (5-15 questions based on content)</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={generationOptions.generateFinalExam}
                  onChange={(e) => setGenerationOptions({
                    ...generationOptions,
                    generateFinalExam: e.target.checked,
                  })}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  disabled={processing}
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Generate Final Exam</span>
                  <p className="text-xs text-gray-600">Create a comprehensive final exam with 20 questions covering all modules</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          {organizationComplete ? (
            // Show "Continue to Modules" button after organization is complete
            <div className="flex items-center justify-end w-full">
              <button
                onClick={onComplete}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center font-semibold shadow-lg transform hover:scale-105"
              >
                <span>Continue to Modules</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                disabled={processing}
              >
                {aiAvailable === false ? 'Continue Manual Creation' : 'Skip AI & Create Manually'}
              </button>

              {aiAvailable !== false && (
                <button
                  onClick={handleProcessWithAI}
                  disabled={uploadedFiles.length === 0 || uploading || processing}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold shadow-lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Organizing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Organize with AI
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

