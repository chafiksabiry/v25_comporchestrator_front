import React, { useState, useEffect } from 'react';
import { Upload, File, FileText, Video, Link as LinkIcon, Plus, Trash2, Filter, Download, Mic, Play, Clock, Pause, ChevronDown, ChevronUp, X, ExternalLink, Eye, ArrowLeft, Brain, Loader2, RefreshCw, Languages, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { KnowledgeItem, CallRecord } from '../types';
import apiClient from '../api/knowledgeClient';
import Cookies from 'js-cookie';
import axios from 'axios';

interface DocumentAnalysis {
  summary: string;
  domain: string;
  theme: string;
  technicalLevel: string;
  mainPoints: string[];
  targetAudience: string;
  keyTerms: string[];
  recommendations: string[];
}

interface KeyIdea {
  title: string;
  description: string;
}

interface CallSummary {
  keyIdeas: KeyIdea[];
  lastUpdated: string;
}

interface TranscriptionSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface Transcription {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  segments: TranscriptionSegment[];
  lastUpdated: string;
  error: string | null;
}

interface CallAnalysis {
  summary: CallSummary;
  transcription?: Transcription;
}

type AnalysisResult = DocumentAnalysis | CallAnalysis;

const KnowledgeBase: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTags, setUploadTags] = useState<string>('');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [processingOptions, setProcessingOptions] = useState({
    transcription: true,
    sentiment: true,
    insights: true
  });
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [analyzingDocument, setAnalyzingDocument] = useState<string | null>(null);
  const [documentAnalysis, setDocumentAnalysis] = useState<{ [key: string]: AnalysisResult }>({});
  const [showAnalysisPage, setShowAnalysisPage] = useState(false);
  const [selectedDocumentForAnalysis, setSelectedDocumentForAnalysis] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState<{ [key: string]: boolean }>({});
  const [loadingTranscription, setLoadingTranscription] = useState<{ [key: string]: boolean }>({});
  const [transcriptionShowCount, setTranscriptionShowCount] = useState<{ [key: string]: number }>({});
  const [loadingScoring, setLoadingScoring] = useState<{ [key: string]: boolean }>({});
  const [callDurations, setCallDurations] = useState<{ [id: string]: number }>({});
  const [translatedAnalysis, setTranslatedAnalysis] = useState<{ [key: string]: DocumentAnalysis }>({});
  const [translatingDocument, setTranslatingDocument] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState<{ [key: string]: boolean }>({});
  const [showTranscript, setShowTranscript] = useState<{ [key: string]: boolean }>({});
  const TRANSCRIPTION_PAGE_SIZE = 5;

  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('knowledgeItems');
    if (savedItems) {
      setKnowledgeItems(JSON.parse(savedItems));
    }
  }, []);

  // Save items to localStorage when they change
  useEffect(() => {
    localStorage.setItem('knowledgeItems', JSON.stringify(knowledgeItems));
  }, [knowledgeItems]);

  // Get icon based on item type
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText size={20} className="text-blue-500" />;
      case 'audio':
        return <Mic size={20} className="text-purple-500" />;
      default:
        return <File size={20} className="text-gray-500" />;
    }
  };

  // Get audio duration from file
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(audio.src);
        resolve(Math.round(audio.duration / 60)); // Convert to minutes and round
      });
    });
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadFiles(prev => {
        const combined = [...prev, ...newFiles];
        // Ensure uniqueness by name and size to avoid duplicates
        return combined.filter((file, index, self) =>
          index === self.findIndex((f) => f.name === file.name && f.size === file.size)
        );
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Function to get companyId from JWT
  const getUserId = () => {
    const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
    let userId;
    if (runMode === 'standalone') {
      userId = import.meta.env.VITE_STANDALONE_USER_ID;
    } else {
      userId = Cookies.get('userId');
    }
    return userId;
  };

  // Function to update onboarding progress
  const updateOnboardingProgress = async () => {
    try {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        throw new Error('Company ID not found in cookies');
      }

      const apiUrl = import.meta.env.VITE_API_URL_ONBOARDING;
      const endpoint = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/8`;
      const response = await axios.put(endpoint, { status: "completed" });

      if (response.data) {
        Cookies.set('companyOnboardingProgress', JSON.stringify(response.data), { expires: 7 });
        window.dispatchEvent(new CustomEvent('stepCompleted', {
          detail: {
            stepId: 8,
            phaseId: 3,
            status: 'completed',
            completedSteps: (response.data as any).completedSteps || []
          }
        }));
      }

      return response.data;
    } catch (error: any) {
      console.error('Error updating onboarding progress:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  };

  // Separate function to fetch documents and update state
  const fetchAndUpdateDocuments = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await apiClient.get('/documents', {
        params: { userId }
      });

      const documents = (response.data as any).documents.map((doc: any) => ({
        id: doc._id,
        name: doc.name,
        description: doc.description,
        type: 'document',
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt,
        uploadedBy: doc.uploadedBy,
        tags: doc.tags,
        usagePercentage: 0,
        isPublic: true,
        analysis: doc.analysis
      }));

      setKnowledgeItems(documents);

      if (documents.length > 0) {
        updateOnboardingProgress().catch(err => console.error('Failed auto-completion on fetch:', err));
      }

      const existingAnalyses = documents.reduce((acc: any, doc: any) => {
        if (doc.analysis) {
          acc[doc.id] = doc.analysis;
        }
        return acc;
      }, {});
      setDocumentAnalysis(existingAnalyses);

      return documents.length > 1;
    } catch (error: any) {
      console.error('Error fetching knowledge items:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = (error as any).response?.data?.message || error.message;
        console.error('API specific error:', errorMessage);
      }
      return false;
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchAndUpdateDocuments();
  }, []);

  // Fetch call records from the backend
  const fetchCallRecords = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('userId ID not found');
      }

      const response = await apiClient.get('/call-recordings', {
        params: { userId }
      });
      const calls = (response.data as any).callRecordings.map((call: any) => ({
        id: call.id,
        contactId: call.contactId,
        date: call.date,
        duration: call.duration,
        recordingUrl: call.recordingUrl,
        transcriptUrl: '',
        summary: call.summary,
        sentiment: call.sentiment,
        tags: call.tags,
        aiInsights: call.aiInsights,
        repId: call.repId,
        companyId: call.companyId,
        processingOptions: { transcription: true, sentiment: true, insights: true },
        audioState: {
          isPlaying: false,
          currentTime: 0,
          duration: call.duration || 0,
          audioInstance: null,
          showPlayer: false,
          showTranscript: false
        }
      }));
      setCallRecords(calls);

      if (calls.length > 0) {
        updateOnboardingProgress().catch(err => console.error('Failed auto-completion on fetch:', err));
      }
    } catch (error: any) {
      console.error('Error fetching call records:', error);
    }
  };

  useEffect(() => {
    fetchCallRecords();
  }, []);

  // Unified form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      if (uploadFiles.length === 0) {
        throw new Error('No files selected');
      }

      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Process each file
      for (const file of uploadFiles) {
        // Determine type based on file extension or mime type
        const isAudio = file.type.startsWith('audio/') || 
                       /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name);
        
        if (!isAudio) {
          // Upload as document
          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', file.name);
          formData.append('description', '');
          formData.append('tags', uploadTags);
          formData.append('uploadedBy', 'Current User');
          formData.append('userId', userId);

          await apiClient.post('/documents/upload', formData);
        } else {
          // Upload as audio
          const duration = await getAudioDuration(file);
          const formData = new FormData();
          formData.append('file', file);
          formData.append('contactId', file.name);
          formData.append('date', format(new Date(), 'yyyy-MM-dd'));
          formData.append('duration', duration.toString());
          formData.append('summary', '');
          formData.append('sentiment', 'neutral');
          formData.append('tags', uploadTags);
          formData.append('aiInsights', '');
          formData.append('repId', 'current-user');
          formData.append('userId', userId);

          const response = await apiClient.post('/call-recordings/upload', formData);
          
          // No need to manually add to callRecords here as we refresh below,
          // but if we want immediate UI update without refetching everything:
          /*
          const newCall: CallRecord = {
            id: (response.data as any).callRecording.id,
            // ... (populate from response)
          };
          setCallRecords(prev => [...prev, newCall]);
          */
        }
      }

      // Refresh both lists to be sure everything is in sync
      await Promise.all([
        fetchAndUpdateDocuments(),
        fetchCallRecords(),
        updateOnboardingProgress().catch(err => console.error('Onboarding update failed:', err))
      ]);

      setUploadFiles([]);
      setUploadTags('');
      setShowUploadModal(false);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      alert('There was an error uploading your files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle item deletion
  const handleDelete = async (id: string) => {
    try {
      const document = knowledgeItems.find(item => item.id === id);
      const callRecording = callRecords.find(call => call.id === id);

      if (document) {
        await apiClient.delete(`/documents/${id}`);
        setKnowledgeItems(prevItems => prevItems.filter(item => item.id !== id));
      } else if (callRecording) {
        await apiClient.delete(`/call-recordings/${id}`);
        setCallRecords(prevCalls => {
          const call = prevCalls.find(call => call.id === id);
          if (call) {
            cleanupAudioResources(call);
          }
          return prevCalls.filter(call => call.id !== id);
        });

        if (playingCallId === id) {
          if (currentAudio) {
            currentAudio.pause();
          }
          setCurrentAudio(null);
          setIsPlaying(false);
          setPlayingCallId(null);
          setCurrentTime(0);
          setDuration(0);
        }
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert('There was an error deleting the item. Please try again.');
    }
  };

  // Helper function to clean up audio resources
  const cleanupAudioResources = (call: CallRecord) => {
    if (call.audioState.audioInstance) {
      try {
        call.audioState.audioInstance.pause();
        call.audioState.audioInstance.onloadedmetadata = null;
        call.audioState.audioInstance.ontimeupdate = null;
        call.audioState.audioInstance.onended = null;
        call.audioState.audioInstance.onerror = null;
        if (call.audioState.audioInstance.src) {
          URL.revokeObjectURL(call.audioState.audioInstance.src);
        }
      } catch (error: any) {
        console.error('Error cleaning up audio instance:', error);
      }
    }
    if (call.recordingUrl) {
      try {
        URL.revokeObjectURL(call.recordingUrl);
      } catch (error: any) {
        console.error('Error revoking recording URL:', error);
      }
    }
  };

  // Unified handleView
  const handleView = async (item: any) => {
    if (item.isCallRecording || item.recordingUrl) {
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      } else {
        setSelectedItem(item);
        if (!documentAnalysis[item.id] || !(documentAnalysis[item.id] as CallAnalysis).summary) {
          setLoadingSummary(prev => ({ ...prev, [item.id]: true }));
          try {
            const summaryResponse = await apiClient.post(`/call-recordings/${item.id}/analyze/summary`);
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                summary: (summaryResponse.data as any).summary
              }
            }));
          } catch (error: any) {
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                summary: { keyIdeas: [], lastUpdated: '', error: 'Failed to load summary.' }
              }
            }));
          } finally {
            setLoadingSummary(prev => ({ ...prev, [item.id]: false }));
          }
        }
        if (!documentAnalysis[item.id] || !(documentAnalysis[item.id] as CallAnalysis).transcription) {
          setLoadingTranscription(prev => ({ ...prev, [item.id]: true }));
          try {
            const transcriptionResponse = await apiClient.post(`/call-recordings/${item.id}/analyze/transcription`);
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                transcription: (transcriptionResponse.data as any).transcription
              }
            }));
            setTranscriptionShowCount(prev => ({ ...prev, [item.id]: TRANSCRIPTION_PAGE_SIZE }));
          } catch (error: any) {
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                transcription: { status: 'failed', segments: [], lastUpdated: '', error: 'Failed to load transcription.' }
              }
            }));
          } finally {
            setLoadingTranscription(prev => ({ ...prev, [item.id]: false }));
          }
        }
        if (!documentAnalysis[item.id] || !(documentAnalysis[item.id] as any).scoring) {
          setLoadingScoring(prev => ({ ...prev, [item.id]: true }));
          try {
            const scoringResponse = await apiClient.post(`/call-recordings/${item.id}/analyze/scoring`);
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                scoring: (scoringResponse.data as any).scoring
              }
            }));
          } catch (error: any) {
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                scoring: { status: 'failed', result: null, lastUpdated: '', error: 'Failed to load scoring.' }
              }
            }));
          } finally {
            setLoadingScoring(prev => ({ ...prev, [item.id]: false }));
          }
        }
      }
    } else {
      if (selectedDocumentForAnalysis?.id === item.id) {
        setSelectedDocumentForAnalysis(null);
      } else {
        setSelectedDocumentForAnalysis(item);
        if (!documentAnalysis[item.id] || !documentAnalysis[item.id].summary) {
          await analyzeDocument(item.id);
        }
      }
    }
  };

  // Fonction pour analyser un document
  const analyzeDocument = async (documentId: string) => {
    try {
      setAnalyzingDocument(documentId);
      const response = await apiClient.post(`/rag/analyze/${documentId}`);
      setDocumentAnalysis(prev => ({
        ...prev,
        [documentId]: response.data as any
      }));
    } catch (error: any) {
      console.error('Error analyzing document:', error);
      alert('Failed to analyze document. Please try again.');
    } finally {
      setAnalyzingDocument(null);
    }
  };

  // Add function to open document/recording in new tab
  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  // Handle upload modal close
  const handleUploadModalClose = () => {
    if (!isUploading) {
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadTags('');
    }
  };

  // Handle audio playback
  const handlePlayRecording = (recordingUrl: string, callId: string) => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }

    if (playingCallId === callId && currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
        setIsPlaying(false);
      } else {
        currentAudio.play();
        setIsPlaying(true);
      }
      return;
    }

    const audio = new Audio(recordingUrl);
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.play().then(() => {
      setIsPlaying(true);
      setCurrentAudio(audio);
      setPlayingCallId(callId);
    }).catch((error: any) => {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    });
  };

  // Format time for audio player
  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd MMM yyyy - HH:mm');
    } catch {
      return dateString;
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setIsPlaying(false);
      }
    };
  }, []);

  const handleBackToOrchestrator = () => {
    window.dispatchEvent(new CustomEvent('tabChange', {
      detail: { tab: 'company-onboarding' }
    }));
  };

  const handleBackToList = () => {
    setShowAnalysisPage(false);
    setSelectedDocumentForAnalysis(null);
  };

  // Fonction utilitaire pour charger la durée d'un audio
  const fetchAudioDuration = (recordingUrl: string, callId: string) => {
    if (!recordingUrl || callDurations[callId]) return;
    const audio = new Audio(recordingUrl);
    audio.addEventListener('loadedmetadata', () => {
      setCallDurations(prev => ({ ...prev, [callId]: audio.duration }));
    });
  };

  // Translation helpers
  const isTextInEnglish = (text: string): boolean => {
    if (!text) return true;
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    const englishRatio = englishWordCount / Math.min(words.length, 20);
    return englishRatio > 0.2;
  };

  const needsTranslation = (analysis: DocumentAnalysis): boolean => {
    const textSample = `${analysis.summary} ${analysis.domain} ${analysis.theme}`.substring(0, 200);
    return !isTextInEnglish(textSample);
  };

  const translateAnalysis = async (documentId: string, analysis: DocumentAnalysis) => {
    try {
      setTranslatingDocument(documentId);
      const textToTranslate = {
        summary: analysis.summary,
        domain: analysis.domain,
        theme: analysis.theme,
        technicalLevel: analysis.technicalLevel,
        mainPoints: analysis.mainPoints,
        targetAudience: analysis.targetAudience,
        keyTerms: analysis.keyTerms,
        recommendations: analysis.recommendations
      };
      const response = await apiClient.post('/rag/translate-analysis', {
        analysis: textToTranslate,
        targetLanguage: 'English'
      });
      setTranslatedAnalysis(prev => ({
        ...prev,
        [documentId]: (response.data as any).translatedAnalysis
      }));
    } catch (error: any) {
      console.error('Error translating analysis:', error);
      alert('Failed to translate analysis. Please try again.');
    } finally {
      setTranslatingDocument(null);
    }
  };

  // Create unified items list
  const getUnifiedItems = () => {
    const documentItems = knowledgeItems
      .filter(item => typeFilter === 'all' || item.type === typeFilter)
      .map(item => ({
        ...item,
        itemType: 'document' as const,
        date: item.uploadedAt,
        isCallRecording: false
      }));

    const callItems = callRecords
      .filter(call => typeFilter === 'all' || typeFilter === 'audio')
      .map(call => ({
        id: call.id,
        name: call.contactId,
        description: call.summary,
        type: 'audio' as const,
        itemType: 'callRecording' as const,
        tags: call.tags,
        date: call.date,
        isCallRecording: true,
        callData: call
      }));

    return [...documentItems, ...callItems].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const renderAnalysisContent = (analysis: AnalysisResult, documentId?: string) => {
    if ('domain' in analysis) {
      const docAnalysis = analysis as DocumentAnalysis;
      const hasTranslation = documentId && translatedAnalysis[documentId];
      const displayAnalysis = hasTranslation ? translatedAnalysis[documentId] : docAnalysis;
      const showTranslateButton = documentId && needsTranslation(docAnalysis) && !hasTranslation;

      return (
        <div className="space-y-10">
          {documentId && (hasTranslation || showTranslateButton) && (
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-harx-100 shadow-sm sticky top-0 z-10 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-harx-50 rounded-lg">
                  <Languages size={18} className="text-harx-500" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Language Hub</h4>
                  <p className="text-[10px] text-gray-500 font-bold italic">
                    {hasTranslation ? 'View in English' : 'Need translation?'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {showTranslateButton && (
                  <button
                    onClick={() => translateAnalysis(documentId, docAnalysis)}
                    disabled={translatingDocument === documentId}
                    className="flex items-center px-4 py-2 bg-harx-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-harx-600 shadow-lg shadow-harx-500/20 transition-all disabled:opacity-50"
                  >
                    {translatingDocument === documentId ? (
                      <><RefreshCw size={14} className="mr-2 animate-spin" />Translating...</>
                    ) : (
                      <><Languages size={14} className="mr-2" />Translate to English</>
                    )}
                  </button>
                )}
                {hasTranslation && (
                  <button
                    onClick={() => setTranslatedAnalysis(prev => {
                      const newState = { ...prev };
                      delete newState[documentId];
                      return newState;
                    })}
                    className="text-[10px] font-black text-harx-500 uppercase tracking-widest hover:underline px-2"
                  >
                    Show Original
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="group/item">
                <h3 className="text-xs font-black text-harx-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-harx-500 rounded-full" />
                  Executive Summary
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium bg-harx-50/30 p-4 rounded-2xl border border-harx-50/50 group-hover/item:border-harx-100 transition-colors">
                  {displayAnalysis.summary}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-2">Domain</h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-800 shadow-sm">{displayAnalysis.domain}</div>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-2">Audience</h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-800 shadow-sm">{displayAnalysis.targetAudience}</div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="group/item bg-gradient-to-br from-white to-harx-50/30 p-6 rounded-3xl border border-harx-100 shadow-inner">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-harx-500 rounded-full" />
                  Key Strategic Points
                </h3>
                <ul className="space-y-3">
                  {displayAnalysis.mainPoints.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-harx-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 font-medium leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    } else if ('summary' in analysis && analysis.summary && 'keyIdeas' in (analysis as CallAnalysis).summary) {
      const callAnalysis = analysis as CallAnalysis;
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-harx-500" />
            Executive Call Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {callAnalysis.summary.keyIdeas.map((idea, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-harx-100 shadow-sm hover:shadow-md transition-all">
                <h4 className="font-bold text-harx-600 mb-2 truncate">{idea.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">{idea.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    const unifiedItems = getUnifiedItems();
    if (unifiedItems.length === 0) {
      return (
        <div className="bg-white/50 backdrop-blur-sm p-16 rounded-[3rem] border border-gray-100 text-center shadow-sm">
          <Brain size={48} className="mx-auto text-gray-300 mb-6" />
          <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Intelligence Stream Empty</h3>
          <p className="text-gray-500 max-w-sm mx-auto font-medium italic mb-10 leading-relaxed">
            Your enterprise knowledge has not been synchronized yet. Initiate data ingestion to empower your REPS.
          </p>
          <button
            className="mt-4 bg-gradient-harx text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-harx-500/30 hover:scale-105 active:scale-95 transition-all"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={18} className="mr-3 inline-block" />
            Ingest First Resource
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {unifiedItems.map((item) => {
          if (item.isCallRecording && 'callData' in item && item.callData) {
            const call = item.callData;
            fetchAudioDuration(call.recordingUrl, call.id);
            return (
              <React.Fragment key={call.id}>
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-start">
                    <div className="p-3 rounded-lg bg-purple-100 mr-4 flex-shrink-0">
                      <Mic size={20} className="text-purple-500" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{call.contactId}</h3>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => handleView(call)} className="text-blue-600 hover:text-blue-800 p-1"><Eye size={16} /></button>
                          <button onClick={() => handleDelete(call.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Clock size={14} className="mr-1" />
                        {formatDate(call.date)} • {callDurations[call.id] !== undefined ? formatTime(callDurations[call.id]) : '...'}
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{call.summary}</p>
                    </div>
                  </div>
                </div>
                {selectedItem?.id === call.id && (
                  <div className="bg-harx-50/50 border-l-4 border-harx-500 p-6 rounded-2xl shadow-sm ml-4 mb-6">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Call Recording Details</h3>
                      <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-harx-500"><X size={20} /></button>
                    </div>
                    {/* Audio Player */}
                    <div className="flex items-center gap-4 mb-8">
                       <button
                          className="flex items-center px-6 py-3 bg-gradient-harx text-white rounded-2xl font-black text-sm"
                          onClick={() => handlePlayRecording(selectedItem.recordingUrl, selectedItem.id)}
                        >
                          {playingCallId === selectedItem.id && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                          <span className="ml-2 uppercase tracking-widest">{playingCallId === selectedItem.id && isPlaying ? 'Pause' : 'Play'}</span>
                        </button>
                        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-harx transition-all duration-150"
                            style={{ width: playingCallId === selectedItem.id ? `${(currentTime / duration) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 tabular-nums">
                          {playingCallId === selectedItem.id ? formatTime(currentTime) : '0:00'} / {playingCallId === selectedItem.id ? formatTime(duration) : '0:00'}
                        </span>
                    </div>
                    {renderAnalysisContent(documentAnalysis[selectedItem.id], selectedItem.id)}
                  </div>
                )}
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={item.id}>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-harx-100 transition-all group/card mb-4">
                <div className="flex items-start">
                  <div className="p-4 rounded-xl bg-harx-50 mr-5 flex-shrink-0 group-hover/card:scale-110 transition-transform text-harx-500 shadow-inner">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="text-lg font-black text-gray-900 truncate tracking-tight uppercase">{item.name}</h3>
                       <div className="flex space-x-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                         <button onClick={() => handleView(item)} className="text-harx-500 hover:bg-harx-50 p-2 rounded-lg"><Brain size={18} /></button>
                         <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>
                       </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 font-medium italic leading-relaxed line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <span className="text-[10px] font-black text-gray-300 uppercase">{formatDate(item.date)}</span>
                      <button onClick={() => handleView(item)} className="text-[10px] font-black text-harx-500 uppercase hover:underline">View Analysis</button>
                    </div>
                  </div>
                </div>
              </div>
              {selectedDocumentForAnalysis?.id === item.id && (
                <div className="bg-white border border-harx-100 p-8 rounded-3xl shadow-2xl ml-4 mb-8">
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Analysis Output</h3>
                    <button onClick={() => setSelectedDocumentForAnalysis(null)} className="text-gray-400 hover:text-harx-500"><X size={24} /></button>
                  </div>
                  {analyzingDocument === item.id ? (
                    <div className="text-center py-16"><Loader2 className="animate-spin text-harx-500 mx-auto" size={48} /><p className="mt-4 font-black text-gray-900 uppercase tracking-widest">Processing Intelligence...</p></div>
                  ) : documentAnalysis[item.id] ? (
                    renderAnalysisContent(documentAnalysis[item.id], item.id)
                  ) : (
                    <div className="text-center py-16"><button onClick={() => analyzeDocument(item.id)} className="px-8 py-4 bg-gradient-harx text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Analyze Now</button></div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderUploadModal = () => {
    if (!showUploadModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Integrate Intelligence</h3>
            <button onClick={handleUploadModalClose} className="text-gray-400 hover:text-gray-600 focus:outline-none text-2xl font-bold">×</button>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Removed Title and Brief fields per user request */}
            <div className="border-2 border-dashed border-gray-100 rounded-2xl p-6 text-center hover:border-harx-200 transition-colors cursor-pointer group relative bg-gray-50/30">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} multiple />
              <div className="flex flex-col items-center">
                <Upload size={24} className="text-gray-300 group-hover:text-harx-500 transition-colors mb-2" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Click or drag to add items</p>
              </div>
            </div>

            {uploadFiles.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-harx-500 uppercase tracking-widest">{uploadFiles.length} item(s) staged</span>
                  <button type="button" onClick={() => setUploadFiles([])} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600">Clear All</button>
                </div>
                {uploadFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm group/file">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-harx-50 rounded-lg text-harx-500 flex-shrink-0">
                        {file.type.startsWith('audio/') ? <Mic size={14} /> : <FileText size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={handleUploadModalClose} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
              <button type="submit" disabled={isUploading} className="flex-1 bg-gradient-harx py-4 rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-harx-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
                {isUploading ? <Loader2 className="animate-spin" size={18} /> : 'Synchronize'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-transparent min-h-full font-inter">
      <button
        onClick={handleBackToOrchestrator}
        className="mb-8 flex items-center transition-all text-gray-400 hover:text-harx-500 group"
      >
        <div className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 mr-3 group-hover:scale-110 transition-transform">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </div>
        <span className="text-xs font-black uppercase tracking-widest leading-none">Back to Orchestrator</span>
      </button>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px w-8 bg-harx-500" />
          <span className="text-[10px] font-black text-harx-500 uppercase tracking-[0.3em]">Knowledge System</span>
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight uppercase">Knowledge Base</h1>
        <p className="text-gray-500 max-w-2xl font-medium leading-relaxed italic">
          Power your AI with enterprise intelligence. Synchronize documents and call recordings 
          to build a high-fidelity knowledge graph for your HARX REPS.
        </p>
      </div>

      <div className="bg-white/60 backdrop-blur-md p-5 rounded-[2rem] border border-white/20 shadow-xl shadow-gray-200/20 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="p-3 bg-harx-50 rounded-2xl text-harx-500 flex-shrink-0">
               <Filter size={20} />
             </div>
             <div className="relative w-full">
               <select
                 className="appearance-none w-full bg-white border border-gray-100 text-gray-900 text-xs font-black uppercase tracking-widest rounded-xl focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 outline-none block p-3.5 pr-10 transition-all cursor-pointer shadow-sm shadow-inner"
                 value={typeFilter}
                 onChange={(e) => setTypeFilter(e.target.value)}
               >
                 <option value="all">Intelligence: All Sources</option>
                 <option value="document">Intelligence: Raw Documents</option>
                 <option value="audio">Intelligence: Voice Streams</option>
               </select>
               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
             </div>
          </div>
          <button
            className="w-full md:w-auto bg-gradient-harx hover:scale-105 active:scale-95 text-white px-8 py-4 rounded-xl flex items-center justify-center font-black text-xs uppercase tracking-widest shadow-xl shadow-harx-500/30 transition-all group"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={18} className="mr-3 group-hover:rotate-90 transition-transform" />
            Integrate Resource
          </button>
        </div>
      </div>

      {renderContent()}
      {renderUploadModal()}
    </div>
  );
};

export default KnowledgeBase;
