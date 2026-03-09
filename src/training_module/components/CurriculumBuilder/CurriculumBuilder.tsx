import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Video, 
  Image, 
  Music, 
  Link, 
  Brain, 
  Wand2, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Plus,
  Trash2,
  Eye,
  Download,
  Share2
} from 'lucide-react';
import { CurriculumBuilder as CurriculumBuilderType, SourceDocument, AIEnhancement } from '../../types';

interface CurriculumBuilderProps {
  curriculum?: CurriculumBuilderType;
  onSave: (curriculum: CurriculumBuilderType) => void;
  onPublish: (curriculum: CurriculumBuilderType) => void;
}

export default function CurriculumBuilder({ curriculum, onSave, onPublish }: CurriculumBuilderProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>(curriculum?.sourceDocuments || []);
  const [aiEnhancements, setAIEnhancements] = useState<AIEnhancement[]>(curriculum?.aiEnhancements || []);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, []);

  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      const documentId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // Simulate upload progress
      setUploadProgress(prev => ({ ...prev, [documentId]: 0 }));
      
      const newDocument: SourceDocument = {
        id: documentId,
        name: file.name,
        type: getFileType(file.type),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'uploading',
      };

      setSourceDocuments(prev => [...prev, newDocument]);

      // Simulate upload and processing
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => ({ ...prev, [documentId]: progress }));
      }

      // Update document status to processing
      setSourceDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'processing' }
            : doc
        )
      );

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update with processed content
      setSourceDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? {
                ...doc,
                status: 'processed',
                processedAt: new Date().toISOString(),
                extractedContent: {
                  text: `Extracted content from ${file.name}`,
                  images: [],
                  metadata: { pages: Math.floor(Math.random() * 50) + 1 },
                  keyTopics: ['Topic 1', 'Topic 2', 'Topic 3'],
                  complexity: Math.floor(Math.random() * 10) + 1,
                },
                aiAnalysis: {
                  readabilityScore: Math.floor(Math.random() * 40) + 60,
                  keyConceptsExtracted: ['Concept A', 'Concept B', 'Concept C'],
                  suggestedLearningObjectives: ['Objective 1', 'Objective 2'],
                  recommendedModuleStructure: ['Introduction', 'Core Content', 'Practice', 'Assessment'],
                  contentGaps: ['Gap 1', 'Gap 2'],
                }
              }
            : doc
        )
      );

      setUploadProgress(prev => {
        const { [documentId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const getFileType = (mimeType: string): SourceDocument['type'] => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx';
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('image')) return 'image';
    return 'text';
  };

  const getFileIcon = (type: SourceDocument['type']) => {
    switch (type) {
      case 'pdf':
      case 'docx':
      case 'text':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'video':
        return <Video className="h-8 w-8 text-blue-500" />;
      case 'audio':
        return <Music className="h-8 w-8 text-green-500" />;
      case 'image':
        return <Image className="h-8 w-8 text-purple-500" />;
      case 'url':
        return <Link className="h-8 w-8 text-indigo-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: SourceDocument['status']) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const generateCurriculum = async () => {
    setIsProcessing(true);
    
    // Simulate AI curriculum generation
    await new Promise(resolve => setTimeout(resolve, 5190));
    
    const newEnhancement: AIEnhancement = {
      id: Date.now().toString(),
      type: 'content_generation',
      status: 'completed',
      input: { documents: sourceDocuments.length },
      output: { modulesGenerated: 5, exercisesCreated: 12, assessmentsBuilt: 3 },
      confidence: 0.92,
      appliedAt: new Date().toISOString(),
      approved: false,
    };

    setAIEnhancements(prev => [...prev, newEnhancement]);
    setIsProcessing(false);
  };

  const tabs = [
    { id: 'upload', label: 'Upload Content', icon: Upload },
    { id: 'analyze', label: 'AI Analysis', icon: Brain },
    { id: 'generate', label: 'Generate Curriculum', icon: Wand2 },
    { id: 'preview', label: 'Preview & Publish', icon: Eye },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Curriculum Builder</h1>
          <p className="text-gray-600">Create training curricula from your existing content with AI enhancement</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Curriculum</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Training Materials</h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here, or click to browse. Supports PDF, Word, PowerPoint, videos, audio, and images.
                </p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Choose Files
                </label>
              </div>

              {/* Uploaded Documents */}
              {sourceDocuments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sourceDocuments.map((doc) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(doc.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                              <p className="text-xs text-gray-500">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(doc.status)}
                            <button className="text-gray-400 hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {uploadProgress[doc.id] !== undefined && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Uploading...</span>
                              <span className="text-xs text-gray-600">{uploadProgress[doc.id]}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[doc.id]}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {doc.status === 'processed' && doc.extractedContent && (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Key Topics:</span>
                              <span className="font-medium">{doc.extractedContent.keyTopics.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Complexity:</span>
                              <span className="font-medium">{doc.extractedContent.complexity}/10</span>
                            </div>
                            {doc.aiAnalysis && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Readability:</span>
                                <span className="font-medium">{doc.aiAnalysis.readabilityScore}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="space-y-6">
              <div className="text-center">
                <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Content Analysis</h3>
                <p className="text-gray-600 mb-6">
                  Our AI has analyzed your uploaded content and identified key learning opportunities.
                </p>
              </div>

              {sourceDocuments.filter(doc => doc.status === 'processed').map((doc) => (
                <div key={doc.id} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    {getFileIcon(doc.type)}
                    <h4 className="text-lg font-semibold text-gray-900">{doc.name}</h4>
                  </div>

                  {doc.aiAnalysis && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Key Concepts Extracted</h5>
                        <div className="flex flex-wrap gap-2">
                          {doc.aiAnalysis.keyConceptsExtracted.map((concept, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Suggested Learning Objectives</h5>
                        <ul className="space-y-1">
                          {doc.aiAnalysis.suggestedLearningObjectives.map((objective, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              {objective}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Recommended Module Structure</h5>
                        <ol className="space-y-1">
                          {doc.aiAnalysis.recommendedModuleStructure.map((module, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start">
                              <span className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                                {index + 1}
                              </span>
                              {module}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Content Quality Metrics</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Readability Score</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${doc.aiAnalysis.readabilityScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{doc.aiAnalysis.readabilityScore}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="space-y-6">
              <div className="text-center">
                <Wand2 className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Training Curriculum</h3>
                <p className="text-gray-600 mb-6">
                  Let AI create a comprehensive training curriculum based on your uploaded content.
                </p>
                
                <button
                  onClick={generateCurriculum}
                  disabled={isProcessing || sourceDocuments.length === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-5 w-5 animate-spin" />
                      <span>Generating Curriculum...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5" />
                      <span>Generate Curriculum</span>
                    </>
                  )}
                </button>
              </div>

              {aiEnhancements.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Enhancements</h4>
                  <div className="space-y-4">
                    {aiEnhancements.map((enhancement) => (
                      <div key={enhancement.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Brain className="h-5 w-5 text-blue-500" />
                            <span className="font-medium text-gray-900">
                              {enhancement.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                              {Math.round(enhancement.confidence * 100)}% confidence
                            </span>
                            {enhancement.status === 'completed' && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </div>
                        
                        {enhancement.output && (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-3 bg-blue-50 rounded">
                              <div className="text-2xl font-bold text-blue-600">
                                {enhancement.output.modulesGenerated || 0}
                              </div>
                              <div className="text-gray-600">Modules</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded">
                              <div className="text-2xl font-bold text-green-600">
                                {enhancement.output.exercisesCreated || 0}
                              </div>
                              <div className="text-gray-600">Exercises</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded">
                              <div className="text-2xl font-bold text-purple-600">
                                {enhancement.output.assessmentsBuilt || 0}
                              </div>
                              <div className="text-gray-600">Assessments</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="text-center">
                <Eye className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Preview & Publish</h3>
                <p className="text-gray-600 mb-6">
                  Review your generated curriculum and publish it for your team.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Curriculum Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">5</div>
                    <div className="text-sm text-gray-600">Training Modules</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">12</div>
                    <div className="text-sm text-gray-600">Interactive Exercises</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">3</div>
                    <div className="text-sm text-gray-600">Assessments</div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Save as Draft
                  </button>
                  <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Publish Curriculum
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}