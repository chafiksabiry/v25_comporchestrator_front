import { useState, useCallback } from 'react';
import axios from 'axios';
import { Upload, FileText, Video, Image, Wand2, Sparkles, Eye, Download, CheckCircle, AlertCircle, Clock, Zap, Palette, Volume2, BarChart3 } from 'lucide-react';
import { SourceDocument, ContentTransformation, EnhancedTrainingModule } from '../../types';

interface DocumentTransformerProps {
  onComplete: (modules: EnhancedTrainingModule[]) => void;
}

export default function DocumentTransformer({ onComplete }: DocumentTransformerProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [transformations, setTransformations] = useState<ContentTransformation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(null);
  const [previewMode, setPreviewMode] = useState<'original' | 'enhanced'>('enhanced');
  const [generatedProgram, setGeneratedProgram] = useState<any>(null);

  console.log('[DocumentTransformer] Current Program:', generatedProgram);
  console.log('[DocumentTransformer] onComplete available:', !!onComplete);

  const tabs = [
    { id: 'upload', label: 'Upload Documents', icon: Upload },
    { id: 'analyze', label: 'AI Analysis', icon: Sparkles },
    { id: 'transform', label: 'Transform Content', icon: Wand2 },
    { id: 'design', label: 'Visual Design', icon: Palette },
    { id: 'preview', label: 'Preview & Export', icon: Eye },
  ];

  const getApiUrl = (): string => {
    const customUrl = import.meta.env.VITE_TRAINING_BACKEND_URL;
    const baseUrl = customUrl || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5010'
      : 'https://v25platformtrainingbackend-production.up.railway.app');
    
    return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      const docId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newDoc: SourceDocument = {
        id: docId,
        name: file.name,
        type: getFileType(file.type),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'uploading'
      };

      setDocuments(prev => [...prev, newDoc]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'processing' } : d));

        const response = await axios.post<any>(`${getApiUrl()}/ai/analyze-document`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          const analysis = response.data.data;
          setDocuments(prev => prev.map(d => 
            d.id === docId 
              ? { 
                  ...d, 
                  status: 'processed',
                  processedAt: new Date().toISOString(),
                  extractedContent: analysis.extractedContent,
                  aiAnalysis: analysis.aiAnalysis
                }
              : d
          ));
          // Auto-select the first processed document
          if (!selectedDocument) setSelectedDocument(newDoc);
        }
      } catch (error) {
        console.error('Error analyzing document:', error);
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'error' } : d));
      }
    }
  }, [selectedDocument]);

  const getFileType = (mimeType: string): SourceDocument['type'] => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx';
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('image')) return 'image';
    return 'text';
  };

  const startTransformation = async (document: SourceDocument) => {
    if (!document.aiAnalysis) return;
    
    setIsProcessing(true);
    try {
      // Step 1: Generate Program and Presentation from Analysis
      const response = await axios.post<any>(`${getApiUrl()}/ai/generate-program`, {
        analysis: {
          ...document.extractedContent,
          aiAnalysis: document.aiAnalysis
        }
      });

      if (response.data.success) {
        const { program, presentation } = response.data.data;
        setGeneratedProgram({ program, presentation });

        // Populate transformations display
        const transformationTypes: ContentTransformation['type'][] = ['text-to-video', 'text-to-audio', 'text-to-infographic', 'text-to-interactive'];
        
        const newTransformations = transformationTypes.map(type => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type,
          originalContent: document.extractedContent?.text || '',
          transformedContent: generateTransformedContent(type, program, presentation),
          aiGenerated: true,
          status: 'completed' as const,
          quality: 92
        }));

        setTransformations(newTransformations);
      }
    } catch (error) {
      console.error('Transformation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTransformedContent = (type: string, program: any, presentation: any) => {
    switch (type) {
      case 'text-to-video':
        return {
          videoUrl: 'https://example.com/generated-video.mp4',
          duration: 180,
          thumbnail: 'https://example.com/thumbnail.jpg',
          script: presentation.slides.map((s: any) => s.speakerNotes).join('\n'),
          scenes: presentation.slides.map((s: any) => s.title)
        };
      case 'text-to-audio':
        return {
          audioUrl: 'https://example.com/generated-audio.mp3',
          duration: 120,
          transcript: program.description,
          voice: 'professional-female'
        };
      case 'text-to-infographic':
        return {
          imageUrl: 'https://example.com/infographic.png',
          elements: program.modules.map((m: any) => m.title),
          style: 'modern-corporate'
        };
      case 'text-to-interactive':
        return {
          type: 'scenario',
          title: 'Knowledge Check Scenario',
          steps: program.modules[0]?.quizzes[0]?.questions.map((q: any) => q.question) || [],
          branches: 3
        };
      default:
        return {};
    }
  };

  const renderUploadTab = () => (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Your Documents
        </h3>
        <p className="text-gray-600 mb-4">
          Drop your boring documents here and watch AI transform them into engaging training materials
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
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose Files
        </label>
      </div>

      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Uploaded Documents</h3>
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-gray-900">{doc.name}</h4>
                    <p className="text-sm text-gray-500">
                      {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {doc.status === 'processed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {doc.status === 'processing' && <Clock className="h-5 w-5 text-blue-500 animate-spin" />}
                  {doc.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                </div>
              </div>
              
              {doc.status === 'processed' && doc.aiAnalysis && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {doc.aiAnalysis.readabilityScore}%
                    </div>
                    <div className="text-gray-600">Readability</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {doc.aiAnalysis.engagementScore}%
                    </div>
                    <div className="text-gray-600">Engagement</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {doc.aiAnalysis.keyConceptsExtracted.length}
                    </div>
                    <div className="text-gray-600">Key Concepts</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {doc.aiAnalysis.improvementSuggestions.length}
                    </div>
                    <div className="text-gray-600">Improvements</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="h-16 w-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Content Analysis</h3>
        <p className="text-gray-600">
          Our AI has analyzed your documents and identified opportunities for improvement
        </p>
      </div>

      {documents.filter(d => d.status === 'processed').map((doc) => (
        <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{doc.name}</h4>
          
          {doc.aiAnalysis && (
            <div className="space-y-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Improvement Suggestions</h5>
                <div className="space-y-3">
                  {doc.aiAnalysis.improvementSuggestions.map((suggestion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h6 className="font-medium text-gray-900">{suggestion.suggestion}</h6>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          suggestion.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {suggestion.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{suggestion.implementation}</p>
                      <p className="text-sm text-green-600 font-medium">{suggestion.expectedImpact}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-3">Media Recommendations</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doc.aiAnalysis.mediaRecommendations.map((rec, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        {rec.type === 'video' && <Video className="h-4 w-4 text-red-500" />}
                        {rec.type === 'audio' && <Volume2 className="h-4 w-4 text-green-500" />}
                        {rec.type === 'image' && <Image className="h-4 w-4 text-blue-500" />}
                        {rec.type === 'infographic' && <BarChart3 className="h-4 w-4 text-purple-500" />}
                        <span className="font-medium text-gray-900">{rec.type}</span>
                        <span className="text-xs text-gray-500">Priority: {rec.priority}/10</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{rec.purpose}</p>
                      <p className="text-xs text-gray-500">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTransformTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Content Transformation</h3>
        <button
          onClick={() => {
            const processedDoc = documents.find(d => d.status === 'processed');
            if (processedDoc) startTransformation(processedDoc);
          }}
          disabled={isProcessing || !documents.some(d => d.status === 'processed')}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <Wand2 className="h-4 w-4" />
          <span>{isProcessing ? 'Transforming...' : 'Start AI Transformation'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { type: 'text-to-video', icon: Video, title: 'AI Video Generation', desc: 'Convert text to engaging video content' },
          { type: 'text-to-audio', icon: Volume2, title: 'AI Audio Narration', desc: 'Generate professional voice-overs' },
          { type: 'text-to-infographic', icon: BarChart3, title: 'Smart Infographics', desc: 'Create visual data representations' },
          { type: 'text-to-interactive', icon: Zap, title: 'Interactive Elements', desc: 'Build engaging interactive content' }
        ].map((transform) => {
          const Icon = transform.icon;
          const transformation = transformations.find(t => t.type === transform.type);
          
          return (
            <div key={transform.type} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Icon className="h-6 w-6 text-blue-500" />
                <h4 className="font-semibold text-gray-900">{transform.title}</h4>
              </div>
              <p className="text-gray-600 mb-4">{transform.desc}</p>
              
              {transformation && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transformation.status === 'completed' ? 'bg-green-100 text-green-800' :
                      transformation.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transformation.status}
                    </span>
                  </div>
                  
                  {transformation.status === 'completed' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Quality:</span>
                      <span className="text-sm font-medium text-green-600">{transformation.quality}%</span>
                    </div>
                  )}
                  
                  {transformation.status === 'processing' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDesignTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Visual Design & Branding</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Theme Selection</h4>
          <div className="grid grid-cols-2 gap-3">
            {['modern', 'corporate', 'creative', 'minimal'].map((theme) => (
              <button
                key={theme}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
              >
                <div className="w-full h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded mb-2"></div>
                <span className="text-sm font-medium capitalize">{theme}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Layout Options</h4>
          <div className="space-y-3">
            {[
              { id: 'single', name: 'Single Column', desc: 'Clean, focused layout' },
              { id: 'two', name: 'Two Column', desc: 'Balanced content distribution' },
              { id: 'grid', name: 'Grid Layout', desc: 'Modern, flexible design' },
              { id: 'magazine', name: 'Magazine Style', desc: 'Rich, editorial layout' }
            ].map((layout) => (
              <label key={layout.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="radio" name="layout" className="mr-3" />
                <div>
                  <div className="font-medium text-gray-900">{layout.name}</div>
                  <div className="text-sm text-gray-600">{layout.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Preview & Export</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode('original')}
              className={`px-3 py-1 rounded-lg text-sm ${
                previewMode === 'original' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setPreviewMode('enhanced')}
              className={`px-3 py-1 rounded-lg text-sm ${
                previewMode === 'enhanced' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Enhanced
            </button>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Training Module</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
          <div className="text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">
              {previewMode === 'enhanced' ? 'Enhanced Training Module Preview' : 'Original Document Preview'}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">85%</div>
            <div className="text-sm text-gray-600">Engagement Score</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">12</div>
            <div className="text-sm text-gray-600">Media Elements</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">8</div>
            <div className="text-sm text-gray-600">Interactive Elements</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Transformer</h1>
          <p className="text-gray-600">Transform boring documents into engaging training materials with AI</p>
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
          {activeTab === 'upload' && renderUploadTab()}
          {activeTab === 'analyze' && renderAnalysisTab()}
          {activeTab === 'transform' && renderTransformTab()}
          {activeTab === 'design' && renderDesignTab()}
          {activeTab === 'preview' && renderPreviewTab()}
        </div>
      </div>
    </div>
  );
}