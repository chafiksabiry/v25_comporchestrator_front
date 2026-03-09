import React, { useState } from 'react';
import { Sparkles, Upload, Loader2, CheckCircle2, AlertCircle, ArrowRight, FileText, Video, Image as ImageIcon } from 'lucide-react';
import { cloudinaryService, CloudinaryUploadResult } from '../../lib/cloudinaryService';
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
}

interface AIGeneratedTrainingCreatorProps {
  onComplete: (trainingId: string) => void;
  onBack: () => void;
}

export const AIGeneratedTrainingCreator: React.FC<AIGeneratedTrainingCreatorProps> = ({ onComplete, onBack }) => {
  const [step, setStep] = useState<'context' | 'upload' | 'generate' | 'result'>('context');
  const [contextData, setContextData] = useState({
    companyName: '',
    industry: '',
    gig: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<{ title: string; description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        let result: CloudinaryUploadResult;
        let fileType: 'image' | 'video' | 'document';

        if (file.type.startsWith('image/')) {
          result = await cloudinaryService.uploadImage(file);
          fileType = 'image';
        } else if (file.type.startsWith('video/')) {
          result = await cloudinaryService.uploadVideo(file);
          fileType = 'video';
        } else {
          result = await cloudinaryService.uploadDocument(file);
          fileType = 'document';
        }

        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: fileType,
          url: result.secureUrl || result.url,
          publicId: result.publicId,
          size: file.size,
        };

        setUploadedFiles(prev => [...prev, uploadedFile]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Step 1: Generate training metadata (title + description)
      const metadataResponse = await axios.post(`${API_BASE}/api/ai/generate-training-metadata`, {
        companyName: contextData.companyName,
        industry: contextData.industry,
        gig: contextData.gig,
        files: uploadedFiles.map(f => ({
          name: f.name,
          type: f.type,
          url: f.url,
          publicId: f.publicId,
        })),
      });

      if (!metadataResponse.data.success) {
        throw new Error(metadataResponse.data.message || 'Failed to generate metadata');
      }

      setGeneratedMetadata({
        title: metadataResponse.data.title,
        description: metadataResponse.data.description,
      });

      // Step 2: Create the training
      const trainingResponse = await axios.post(`${API_BASE}/manual-trainings`, {
        title: metadataResponse.data.title,
        description: metadataResponse.data.description,
        metadata: {
          industry: contextData.industry,
          gig: contextData.gig,
          estimatedDuration: 2400, // Default 1 week
          tags: [],
        },
      });

      if (!trainingResponse.data.success) {
        throw new Error('Failed to create training');
      }

      const trainingId = trainingResponse.data.data.id;

      // Step 3: Organize content with AI
      await axios.post(`${API_BASE}/api/ai/organize-training`, {
        trainingId,
        files: uploadedFiles.map(f => ({
          name: f.name,
          type: f.type,
          url: f.url,
          publicId: f.publicId,
        })),
      });

      setStep('result');

      // Navigate to module editor after 2 seconds
      setTimeout(() => {
        onComplete(trainingId);
      }, 2000);

    } catch (err: any) {
      console.error('AI generation error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate training with AI');
    } finally {
      setGenerating(false);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-purple-600" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-blue-600" />;
      case 'document': return <FileText className="w-5 h-5 text-red-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI-Powered Training Creator
          </h1>
          <p className="text-lg text-gray-600">
            Upload your files and let AI generate everything automatically
          </p>
        </div>

        {/* Step 1: Context */}
        {step === 'context' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Tell us about your context</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={contextData.companyName}
                  onChange={(e) => setContextData({ ...contextData, companyName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., TechCorp Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <input
                  type="text"
                  value={contextData.industry}
                  onChange={(e) => setContextData({ ...contextData, industry: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Technology, Healthcare, Finance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Role/Gig</label>
                <input
                  type="text"
                  value={contextData.gig}
                  onChange={(e) => setContextData({ ...contextData, gig: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., DevOps Engineer, Data Analyst"
                />
              </div>

              <button
                onClick={() => setStep('upload')}
                disabled={!contextData.companyName || !contextData.industry || !contextData.gig}
                className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                Continue to Upload Files
                <ArrowRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload Files */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 2: Upload Your Training Files</h2>

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors bg-purple-50">
              <Upload className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Support for videos, images, PDFs, Word, Excel, PowerPoint
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium cursor-pointer transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Select Files
                  </>
                )}
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                <div className="space-y-2">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => setStep('context')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleGenerateWithAI}
                disabled={uploadedFiles.length === 0 || generating}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 inline mr-2" />
                    Generate Training with AI
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && generatedMetadata && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Training Generated Successfully! 🎉
            </h2>
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 text-left mb-6">
              <h3 className="text-xl font-bold text-purple-900 mb-2">{generatedMetadata.title}</h3>
              <p className="text-gray-700">{generatedMetadata.description}</p>
            </div>
            <p className="text-gray-600 mb-4">
              AI has created your training with modules and sections based on your uploaded files.
            </p>
            <div className="flex items-center justify-center space-x-2 text-purple-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Redirecting to module editor...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

