import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, Video, FileText, Loader2, CheckCircle2, AlertCircle, BarChart3, Clock, Sparkles } from 'lucide-react';
import { cloudinaryService, CloudinaryUploadResult, UploadProgress } from '../../lib/cloudinaryService';
import { AIService, DocumentAnalysis } from '../../infrastructure/services/AIService';

interface FileUploaderProps {
  fileType: 'image' | 'video' | 'document';
  onUploadComplete: (result: CloudinaryUploadResult, analysis?: DocumentAnalysis) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  folder?: string;
  showAnalysis?: boolean; // Show AI analysis for documents
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  fileType,
  onUploadComplete,
  onError,
  accept,
  maxSizeMB,
  folder,
  showAnalysis = true, // Default to true for documents
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptType = (): string => {
    if (accept) return accept;
    
    switch (fileType) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'document':
        return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
      default:
        return '*/*';
    }
  };

  const getIcon = () => {
    switch (fileType) {
      case 'image':
        return <Image className="w-12 h-12 text-blue-500" />;
      case 'video':
        return <Video className="w-12 h-12 text-purple-500" />;
      case 'document':
        return <FileText className="w-12 h-12 text-green-500" />;
      default:
        return <File className="w-12 h-12 text-gray-500" />;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setUploadSuccess(false);
      // ✨ Auto-upload immediately
      uploadFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setUploadSuccess(false);
      // ✨ Auto-upload immediately
      uploadFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const uploadFile = async (fileToUpload: File) => {
    if (!fileToUpload) return;

    setUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      let result: CloudinaryUploadResult;

      const uploadFolder = folder || `trainings/${fileType}s`;

      switch (fileType) {
        case 'image':
          result = await cloudinaryService.uploadImage(fileToUpload, uploadFolder, setProgress);
          break;
        case 'video':
          result = await cloudinaryService.uploadVideo(fileToUpload, uploadFolder, setProgress);
          break;
        case 'document':
          result = await cloudinaryService.uploadDocument(fileToUpload, uploadFolder, setProgress);
          break;
        default:
          throw new Error('Unsupported file type');
      }

      setUploadSuccess(true);
      
      // Analyze document if it's a document type and showAnalysis is enabled
      if (fileType === 'document' && showAnalysis) {
        setAnalyzing(true);
        setAnalysisError(null);
        try {
          const analysisResult = await AIService.analyzeDocument(fileToUpload);
          setAnalysis(analysisResult);
          onUploadComplete(result, analysisResult);
        } catch (analysisErr: any) {
          console.error('AI Analysis failed:', analysisErr);
          setAnalysisError(analysisErr.message || 'Analysis failed');
          // Still call onUploadComplete even if analysis fails
          onUploadComplete(result);
        } finally {
          setAnalyzing(false);
        }
      } else {
        onUploadComplete(result);
      }
      
      // Don't auto-reset if analysis is showing
      if (!showAnalysis || fileType !== 'document') {
        setTimeout(() => {
          setFile(null);
          setProgress(null);
          setUploadSuccess(false);
          setAnalysis(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 2000);
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setError(null);
    setProgress(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      {!file && !uploading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptType()}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-4">
            {getIcon()}
            
            <div>
              <p className="text-lg font-medium text-gray-700">
                Drop {fileType} here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {accept || getAcceptType()}
                {maxSizeMB && ` • Max size: ${maxSizeMB}MB`}
              </p>
            </div>
            
            <button
              type="button"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5 inline-block mr-2" />
              Select File
            </button>
          </div>
        </div>
      )}

      {/* File Preview & Upload */}
      {file && !uploadSuccess && (
        <div className="border border-gray-300 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              {getIcon()}
              
              <div className="flex-1">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {cloudinaryService.formatFileSize(file.size)}
                </p>
                
                {/* Progress Bar */}
                {uploading && progress && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Uploading... {progress.percentage}%
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-3 flex items-center text-red-600">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {!uploading && (
              <button
                onClick={handleRemove}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Uploading Indicator */}
          {uploading && (
            <div className="mt-4 flex items-center justify-center text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Uploading...</span>
            </div>
          )}
          
          {/* Retry Button on Error */}
          {error && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => file && uploadFile(file)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Retry Upload
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success Message with Analysis */}
      {uploadSuccess && (
        <div className="border border-green-300 bg-green-50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium text-lg">Upload Successful!</p>
              <p className="text-sm text-green-700">File uploaded to Cloudinary</p>
            </div>
          </div>

          {/* AI Analysis Results */}
          {fileType === 'document' && showAnalysis && (
            <div className="mt-4 pt-4 border-t border-green-200">
              {analyzing && (
                <div className="flex items-center justify-center space-x-2 text-blue-600 py-4">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="text-sm font-medium">AI is analyzing this document...</span>
                </div>
              )}

              {analysis && !analyzing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                      <BarChart3 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600">{analysis.difficulty}/10</div>
                      <div className="text-xs text-gray-600">Difficulty</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                      <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600">{analysis.estimatedReadTime}m</div>
                      <div className="text-xs text-gray-600">Duration</div>
                    </div>
                  </div>
                  
                  {analysis.keyTopics && analysis.keyTopics.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Key Topics Identified:</h5>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keyTopics.map((topic, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.suggestedModules && analysis.suggestedModules.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">AI will create {analysis.suggestedModules.length} modules:</h5>
                      <div className="text-sm text-gray-600">
                        {analysis.suggestedModules.join(' → ')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {analysisError && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Analysis failed: {analysisError}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

