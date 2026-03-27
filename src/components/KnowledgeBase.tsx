import React, { useState, useEffect } from 'react';
import { Upload, File, FileText, Plus, Trash2, Mic, Play, Clock, Pause, X, ExternalLink, Eye, Brain, Loader2, RefreshCw, Languages, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { KnowledgeItem, CallRecord } from '../types';
import apiClient from '../api/knowledgeClient';
import Cookies from 'js-cookie';
import axios from 'axios';
import { OnboardingService } from './training/infrastructure/services/OnboardingService';

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

// Add custom styles for the dropdown
const dropdownStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(234, 48, 149, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(234, 48, 149, 0.2);
  }
  
  @keyframes ripple-ping {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  .ripple-ping {
    position: relative;
  }
  .ripple-ping::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: currentColor;
    animation: ripple-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
`;

const KnowledgeBase: React.FC = () => {
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
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [analyzingDocument, setAnalyzingDocument] = useState<string | null>(null);
  const [documentAnalysis, setDocumentAnalysis] = useState<{ [key: string]: AnalysisResult }>({});
  const [selectedDocumentForAnalysis, setSelectedDocumentForAnalysis] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState<{ [key: string]: boolean }>({});
  const [loadingTranscription, setLoadingTranscription] = useState<{ [key: string]: boolean }>({});
  const [loadingScoring, setLoadingScoring] = useState<{ [key: string]: boolean }>({});
  const [callDurations, setCallDurations] = useState<{ [id: string]: number }>({});
  const [translatedAnalysis, setTranslatedAnalysis] = useState<{ [key: string]: DocumentAnalysis }>({});
  const [translatingDocument, setTranslatingDocument] = useState<string | null>(null);
  const [gigs, setGigs] = useState<any[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>('all');
  const [isGigDropdownOpen, setIsGigDropdownOpen] = useState(false);
  const [transcriptionShowCount, setTranscriptionShowCount] = useState<{ [key: string]: number }>({});
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

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText size={20} className="text-blue-500" />;
      case 'audio':
        return <Mic size={20} className="text-purple-500" />;
      case 'video':
        return <Play size={20} className="text-red-500" />;
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

  const getGigTitle = (gigId?: string) => {
    if (!gigId || gigId === 'all') return null;
    const gig = gigs.find(g => (g._id || g.id) === gigId);
    return gig ? gig.title : null;
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
      if (error.response) {
        console.error('API error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      // Don't throw to avoid crashing the whole component for a background update
    }
  };

  // Separate function to fetch documents and update state
  const fetchAndUpdateDocuments = async (gigId?: string) => {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await apiClient.get('/documents', {
        params: { 
          userId,
          gigId: gigId || selectedGigId
        }
      });

      const docsArray = (response.data as any).documents || [];
      const documents = docsArray.map((doc: any) => ({
        id: doc._id,
        name: doc.name || 'Untitled Document',
        description: doc.description || '',
        type: 'document',
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt,
        uploadedBy: doc.uploadedBy || 'Unknown',
        tags: doc.tags || '',
        usagePercentage: 0,
        isPublic: true,
        analysis: doc.analysis,
        gigId: doc.gigId,
        fileType: doc.fileType
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
      if (error.response) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error('API specific error:', errorMessage);
      }
      return false;
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchAndUpdateDocuments().catch(err => console.error('Error on doc fetch:', err));
  }, [selectedGigId]); // Refetch when gig filter changes

  // Fetch call records from the backend
  const fetchCallRecords = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await apiClient.get('/call-recordings', {
        params: { 
          userId,
          gigId: selectedGigId
        }
      });
      const callsArray = (response.data as any).callRecordings || [];
      const calls = callsArray.map((call: any) => ({
        id: call.id,
        contactId: call.contactId || 'Unknown Contact',
        date: call.date,
        duration: call.duration || 0,
        recordingUrl: call.recordingUrl,
        transcriptUrl: '',
        summary: call.summary || '',
        sentiment: call.sentiment || 'neutral',
        tags: call.tags || '',
        aiInsights: call.aiInsights || '',
        repId: call.repId || 'unknown-rep',
        companyId: call.companyId,
        gigId: call.gigId,
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
  }, [selectedGigId]); // Refetch when gig filter changes

  // Fetch gigs on mount
  useEffect(() => {
    const fetchGigs = async () => {
      try {
        const response = await OnboardingService.fetchGigsByCompany();
        if (response && response.data) {
          setGigs(response.data);
        }
      } catch (error) {
        console.error('Error fetching gigs:', error);
      }
    };
    fetchGigs();
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
        const isVideo = file.type.startsWith('video/') ||
                       /\.(mp4|mpeg|mov|avi|webm)$/i.test(file.name);
        
        if (!isAudio && !isVideo) {
          // Upload as document
          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', file.name);
          formData.append('description', '');
          formData.append('tags', uploadTags);
          formData.append('uploadedBy', 'Current User');
          formData.append('userId', userId);
          if (selectedGigId && selectedGigId !== 'all') {
            formData.append('gigId', selectedGigId);
          }

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
          if (selectedGigId && selectedGigId !== 'all') {
            formData.append('gigId', selectedGigId);
          }

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
    } else if (item.itemType === 'video' || (item.fileType && item.fileType.startsWith('video/')) || item.type === 'video') {
      // Handle Video view
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      } else {
        setSelectedItem(item);
        if (!documentAnalysis[item.id] || !documentAnalysis[item.id].summary) {
          await analyzeDocument(item.id);
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

  const handleBackToOrchestrator = () => {
    window.dispatchEvent(new CustomEvent('tabChange', {
      detail: { tab: 'company-onboarding' }
    }));
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
      .map(item => ({
        ...item,
        itemType: 'document' as const,
        date: item.uploadedAt,
        isCallRecording: false,
        gigId: item.gigId
      }));

    const callItems = callRecords
      .map(call => {
        const isVideo = call.contactId?.match(/\.(mp4|webm|mov|avi)$/i) || 
                       call.recordingUrl?.match(/\.(mp4|webm|mov|avi|m4v)$/i);
        return {
          id: call.id,
          name: call.contactId || 'Unknown Contact',
          description: call.summary || '',
          type: (isVideo ? 'video' : 'audio') as 'video' | 'audio',
          itemType: 'callRecording' as const,
          tags: call.tags || '',
          date: call.date,
          fileUrl: call.recordingUrl, // Use recordingUrl as fileUrl for consistent UI 
          isCallRecording: true,
          gigId: call.gigId,
          callData: call
        };
      });

    const videoItems = knowledgeItems
      .filter(item => item.fileType && item.fileType.startsWith('video/'))
      .map(item => ({
        ...item,
        itemType: 'video' as const,
        date: item.uploadedAt,
        isCallRecording: false,
        gigId: item.gigId
      }));

    // Filter out videos from documentItems if they are already in videoItems
    const filteredDocumentItems = documentItems.filter(item => !item.fileType || !item.fileType.startsWith('video/'));

    return [...filteredDocumentItems, ...callItems, ...videoItems].sort((a, b) =>
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
    const unifiedItems: any[] = getUnifiedItems();
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
          const isMedia = item.type === 'video' || item.type === 'audio';
          const isCallRecording = item.isCallRecording;
          const call = isCallRecording ? item.callData : null;
          
          if (isCallRecording && call) {
            fetchAudioDuration(call.recordingUrl, call.id);
          }

          return (
            <React.Fragment key={item.id}>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-harx-100 transition-all group/card mb-4">
                <div className="flex items-start">
                  <div className={`p-4 rounded-xl mr-5 flex-shrink-0 group-hover/card:scale-110 transition-transform shadow-inner ${
                    item.type === 'document' ? 'bg-blue-50 text-blue-500' : 
                    item.type === 'video' ? 'bg-red-50 text-red-500' : 
                    'bg-purple-50 text-purple-500'
                  }`}>
                    {getItemIcon(item.type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="text-lg font-black text-gray-900 truncate tracking-tight uppercase">{item.name}</h3>
                        <div className="flex space-x-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <a 
                            href={item.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-harx-500 hover:bg-harx-50 p-2 rounded-lg" 
                            title="View File"
                          >
                            <Eye size={18} />
                          </a>
                          <button onClick={() => handleView(item)} className="text-harx-500 hover:bg-harx-50 p-2 rounded-lg" title="AI Analysis"><Brain size={18} /></button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg" title="Delete"><Trash2 size={18} /></button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 font-medium italic leading-relaxed line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-300 uppercase">
                          <Clock size={12} className="text-gray-200" />
                          {formatDate(item.date)}
                          {isMedia && call && (
                            <>
                              <span className="text-gray-200 mx-1">•</span>
                              <span className="text-harx-400/80">
                                {callDurations[call.id] !== undefined ? formatTime(callDurations[call.id]) : '...'}
                              </span>
                            </>
                          )}
                        </div>
                        {item.gigId && (
                          <span className="px-2 py-0.5 bg-harx-50 text-harx-600 text-[10px] font-black uppercase rounded-full border border-harx-100 flex items-center gap-1">
                            <Sparkles size={8} />
                            {getGigTitle(item.gigId)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black text-harx-500 uppercase">
                        <a 
                          href={item.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline"
                        >
                          View File
                        </a>
                        <div className="w-1 h-1 bg-gray-200 rounded-full" />
                        <button onClick={() => handleView(item)} className="hover:underline">AI Analysis</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expansion Area for Analysis */}
              {isCallRecording ? (
                selectedItem?.id === item.id && (
                  <div className="bg-harx-50/10 backdrop-blur-md border border-harx-100/50 p-8 rounded-[2.5rem] shadow-xl ml-4 mb-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-harx-50">
                          <Brain size={24} className="text-harx-500" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Intelligence Dashboard</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic leading-none mt-1">
                            Multimodal analysis for {item.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a 
                          href={item.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 px-4 py-2 bg-white text-harx-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-harx-50 border border-harx-100 transition-all shadow-sm"
                        >
                          <Eye size={14} />
                          View File
                        </a>
                        <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-harx-500"><X size={24} /></button>
                      </div>
                    </div>
                    {/* Media Player (Audio or Video) */}
                    <div className="mb-10 group/player relative">
                      {item.callData?.fileType?.startsWith('video/') || item.fileUrl?.match(/\.(mp4|webm|mov|avi)$/i) ? (
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/50 shadow-2xl bg-black/5 aspect-video group/video">
                          <video 
                            src={item.fileUrl} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                          {/* Premium Overlay for Video */}
                          <div className="absolute top-4 left-4 pointer-events-none transition-opacity duration-300">
                             <div className="bg-harx-500/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/20 shadow-lg">
                               <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                               <span className="text-[10px] font-black text-white uppercase tracking-widest">Master Video Stream</span>
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-6 bg-white/60 p-4 rounded-[2rem] border border-white shadow-inner">
                          <button 
                            className="flex items-center justify-center w-14 h-14 bg-gradient-harx text-white rounded-2xl font-black shadow-lg shadow-harx-500/30 hover:scale-105 active:scale-95 transition-all"
                            onClick={() => handlePlayRecording(item.fileUrl, item.id)}
                          >
                            {playingCallId === item.id && isPlaying ? <Pause size={24} /> : <Play size={24} />}
                          </button>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-2 px-1">
                               <span className="text-[10px] font-black text-harx-500 uppercase tracking-widest italic flex items-center gap-2">
                                 <div className="w-2 h-2 bg-harx-500 rounded-full animate-pulse" />
                                 Live Content Stream
                               </span>
                               <span className="text-[10px] font-black text-gray-400 tabular-nums">
                                {playingCallId === item.id ? formatTime(currentTime) : '0:00'} / {playingCallId === item.id ? formatTime(duration) : '0:00'}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden cursor-pointer group/progress"
                                 onClick={(e) => {
                                   if (playingCallId !== item.id) return;
                                   const rect = e.currentTarget.getBoundingClientRect();
                                   const pos = (e.clientX - rect.left) / rect.width;
                                   // Logic for seeking handled by handlePlayRecording or specialized seek function
                                 }}>
                              <div 
                                className="h-full bg-gradient-harx transition-all duration-150 relative"
                                style={{ width: playingCallId === item.id ? `${(currentTime / duration) * 100}%` : '0%' }}
                              >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-harx-500 rounded-full shadow-md" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {documentAnalysis[item.id] ? (
                      renderAnalysisContent(documentAnalysis[item.id], item.id)
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/40 rounded-3xl border border-white shadow-inner">
                        <Loader2 className="animate-spin text-harx-500 mb-4" size={32} />
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest animate-pulse">
                          Generating Strategic Insights...
                        </p>
                      </div>
                    )}
                  </div>
                )
              ) : (
                selectedDocumentForAnalysis?.id === item.id && (
                  <div className="bg-white border border-harx-100 p-8 rounded-3xl shadow-2xl ml-4 mb-8">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Analysis Output</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic leading-none mt-1">
                          Enterprise Intelligence Extract
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                         <a 
                            href={item.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 px-4 py-2 bg-harx-50 text-harx-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-harx-100 transition-all"
                          >
                            <Eye size={14} />
                            View Source File
                          </a>
                        <button onClick={() => setSelectedDocumentForAnalysis(null)} className="text-gray-400 hover:text-harx-500 transition-colors"><X size={24} /></button>
                      </div>
                    </div>
                    {analyzingDocument === item.id ? (
                      <div className="text-center py-16"><Loader2 className="animate-spin text-harx-500 mx-auto" size={48} /><p className="mt-4 font-black text-gray-900 uppercase tracking-widest">Processing Intelligence...</p></div>
                    ) : documentAnalysis[item.id] ? (
                      renderAnalysisContent(documentAnalysis[item.id], item.id)
                    ) : (
                      <div className="text-center py-16"><button onClick={() => analyzeDocument(item.id)} className="px-8 py-4 bg-gradient-harx text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Analyze Now</button></div>
                    )}
                  </div>
                )
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
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} multiple accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,audio/*,video/*" />
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
                        {file.type.startsWith('audio/') ? <Mic size={14} /> : file.type.startsWith('video/') ? <Play size={14} /> : <FileText size={14} />}
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
    <div className="relative min-h-screen font-inter overflow-hidden">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 bg-slate-50/50 -z-10" />
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-harx-500/10 blur-[120px] rounded-full -z-10 animate-float" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-harx-alt-500/10 blur-[120px] rounded-full -z-10 animate-float" style={{ animationDelay: '-3s' }} />
      
      <div className="relative z-10 p-8">
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
        <h1 className="text-4xl font-black bg-gradient-harx bg-clip-text text-transparent mb-3 tracking-tight uppercase">Knowledge Base</h1>
        <p className="text-gray-500 max-w-2xl font-medium leading-relaxed italic">
          Power your AI with enterprise intelligence. Synchronize documents and call recordings 
          to build a high-fidelity knowledge graph for your HARX REPS.
        </p>
      </div>

      <div className="relative z-20 bg-white/60 backdrop-blur-md p-5 rounded-[2rem] border border-white/20 shadow-xl shadow-gray-200/20 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Custom Gig Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsGigDropdownOpen(!isGigDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 bg-white/80 backdrop-blur-xl rounded-2xl border border-harx-100 shadow-sm hover:border-harx-300 transition-all group/gig"
                >
                  <div className="p-2 bg-harx-50 rounded-xl group-hover/gig:scale-110 transition-transform">
                    <Sparkles size={18} className="text-harx-500" />
                  </div>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1 pr-2 max-w-[150px] md:max-w-[250px] truncate">
                    {selectedGigId === 'all' 
                      ? 'Select a Gig' 
                      : `Gig: ${gigs.find(g => (g._id || g.id) === selectedGigId)?.title || 'Selected Gig'}`}
                  </span>
                  <ChevronRight size={16} className={`text-gray-400 mr-2 transition-transform duration-300 ${isGigDropdownOpen ? 'rotate-90' : ''}`} />
                </button>

                {isGigDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsGigDropdownOpen(false)} 
                    />
                    <div className="absolute top-full left-0 mt-2 w-max min-w-[280px] max-w-[400px] bg-white/90 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] p-2 z-50 animate-in fade-in slide-in-from-top-2 zoom-in duration-300 origin-top-left">
                      <div className="max-h-80 overflow-y-auto custom-scrollbar px-1">
                        <button
                          onClick={() => {
                            setSelectedGigId('all');
                            setIsGigDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all mb-1 ${
                            selectedGigId === 'all' 
                              ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' 
                              : 'text-gray-600 hover:bg-harx-50 hover:text-harx-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-colors ${selectedGigId === 'all' ? 'bg-white/20' : 'bg-harx-50 group-hover:bg-harx-100'}`}>
                              <Sparkles size={14} className={selectedGigId === 'all' ? 'text-white' : 'text-harx-500'} />
                            </div>
                            <span>All Gigs</span>
                          </div>
                          {selectedGigId === 'all' && <CheckCircle size={14} className="text-white animate-in zoom-in" />}
                        </button>

                        <div className="px-3 py-1.5">
                          <div className="h-px bg-harx-100/30 w-full" />
                        </div>

                        {gigs.map(gig => {
                          const id = gig._id || gig.id;
                          const isSelected = selectedGigId === id;
                          return (
                            <button
                              key={id}
                              onClick={() => {
                                setSelectedGigId(id);
                                setIsGigDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all mb-1 group/item ${
                                isSelected 
                                  ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' 
                                  : 'text-gray-600 hover:bg-harx-50 hover:text-harx-600'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-white/20' : 'bg-harx-50 group-hover/item:bg-harx-100'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white ripple-ping' : 'bg-harx-500'}`} />
                                </div>
                                <span className="whitespace-nowrap">{gig.title}</span>
                              </div>
                              {isSelected && <CheckCircle size={14} className="text-white animate-in zoom-in" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
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
      <style>{dropdownStyles}</style>
      </div>
    </div>
  );
};

export default KnowledgeBase;
