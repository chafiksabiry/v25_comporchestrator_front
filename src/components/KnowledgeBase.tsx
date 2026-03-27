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
  const [uploadType, setUploadType] = useState<string>('document');
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [uploadTags, setUploadTags] = useState<string>('');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFirstUpload, setIsFirstUpload] = useState(true);
  const [contactId, setContactId] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState<{ [key: string]: boolean }>({});
  const [showTranscript, setShowTranscript] = useState<{ [key: string]: boolean }>({});
  const [processingOptions, setProcessingOptions] = useState({
    transcription: true,
    sentiment: true,
    insights: true
  });
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!uploadName) {
        setUploadName(file.name);
      }
    }
  };

  // Create a blob URL for a file
  const createFileUrl = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  // Function to get companyId from JWT
  const getUserId = () => {
    const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
    let userId;
    // Determine userId based on run mode
    if (runMode === 'standalone') {
      console.log("Running in standalone mode");
      // Use static userId from environment variable in standalone mode
      userId = import.meta.env.VITE_STANDALONE_USER_ID;
      console.log("Using static userID from env:", userId);
    } else {
      console.log("Running in in-app mode");
      // Use userId from cookies in in-app mode
      userId = Cookies.get('userId');
      console.log("userId cookie:", userId);
      console.log("Verified saved user ID from cookie:", userId);
    }
    return userId;
  };

  // Function to update onboarding progress
  const updateOnboardingProgress = async () => {
    try {
      const companyId = Cookies.get('companyId');
      console.log('Attempting to update onboarding progress for company:', companyId);

      if (!companyId) {
        throw new Error('Company ID not found in cookies');
      }

      const apiUrl = import.meta.env.VITE_API_URL_ONBOARDING;
      console.log('Using API URL:', apiUrl);

      const endpoint = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/8`;
      console.log('Making request to endpoint:', endpoint);

      const response = await axios.put(endpoint, { status: "completed" });

      console.log('Onboarding progress update response:', response.data);

      // Update the companyOnboardingProgress cookie with the response data
      if (response.data) {
        Cookies.set('companyOnboardingProgress', JSON.stringify(response.data), { expires: 7 });
        console.log('Updated companyOnboardingProgress cookie with new data');

        // Notify parent component
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
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error; // Re-throw to handle in the upload function
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
      console.log('Response fetching documents:', response);

      const documents = (response.data as any).documents.map((doc: any) => ({
        id: doc._id,
        name: doc.name,
        description: doc.description,
        type: 'document',
        fileUrl: doc.fileUrl,
        uploadedAt: format(new Date(doc.uploadedAt), 'yyyy-MM-dd'),
        uploadedBy: doc.uploadedBy,
        tags: doc.tags,
        usagePercentage: 0,
        isPublic: true,
        analysis: doc.analysis
      }));

      // Check if there's more than one document (not first upload)
      const hasMultipleDocuments = documents.length > 1;
      console.log('Documents count:', documents.length);
      console.log('Has multiple documents:', hasMultipleDocuments);

      setIsFirstUpload(!hasMultipleDocuments);
      setKnowledgeItems(documents);

      // Auto-complete if at least one document exists
      if (documents.length > 0) {
        console.log('✅ Auto-completing step 8 because documents exist');
        updateOnboardingProgress().catch(err => console.error('Failed auto-completion on fetch:', err));
      }

      // Mettre à jour documentAnalysis avec les analyses existantes
      const existingAnalyses = documents.reduce((acc: any, doc: any) => {
        if (doc.analysis) {
          acc[doc.id] = doc.analysis;
        }
        return acc;
      }, {});
      setDocumentAnalysis(existingAnalyses);

      // Return true if we have more than one document
      return hasMultipleDocuments;
    } catch (error) {
      console.error('Error fetching documents:', error);
      setIsFirstUpload(true);
      return false;
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchAndUpdateDocuments();
  }, []);

  // Fetch call records from the backend
  useEffect(() => {
    const fetchCallRecords = async () => {
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('userId ID not found');
        }

        const response = await apiClient.get('/call-recordings', {
          params: { userId }
        });
        console.log('Response fetching call records:', response);
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

        // Auto-complete if at least one call record exists
        if (calls.length > 0) {
          console.log('✅ Auto-completing step 8 because call records exist');
          updateOnboardingProgress().catch(err => console.error('Failed auto-completion on fetch:', err));
        }
      } catch (error) {
        console.error('Error fetching call records:', error);
      }
    };

    fetchCallRecords();
  }, []);

  // Unified form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      if (!uploadFile) {
        throw new Error('No file selected');
      }

      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      if (uploadType === 'document') {
        // Handle document upload
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('name', uploadName);
        formData.append('description', uploadDescription);
        formData.append('tags', uploadTags);
        formData.append('uploadedBy', 'Current User');
        formData.append('userId', userId);

        const response = await apiClient.post('/documents/upload', formData);
        console.log('Document upload successful:', response.data);

        // Fetch latest documents
        await fetchAndUpdateDocuments();

        // Update onboarding progress for every document upload
        console.log('Updating onboarding progress for document upload');
        try {
          await updateOnboardingProgress();
          console.log('Successfully updated onboarding progress');
        } catch (error) {
          console.error('Failed to update onboarding progress:', error);
        }
      } else if (uploadType === 'audio') {
        // Handle call recording upload
        const duration = await getAudioDuration(uploadFile);

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('contactId', uploadName);
        formData.append('date', format(new Date(), 'yyyy-MM-dd'));
        formData.append('duration', duration.toString());
        formData.append('summary', uploadDescription);
        formData.append('sentiment', 'neutral');
        formData.append('tags', uploadTags);
        formData.append('aiInsights', '');
        formData.append('repId', 'current-user');
        formData.append('userId', userId);

        const response = await apiClient.post('/call-recordings/upload', formData);
        console.log('Call recording upload successful:', response.data);

        // Update onboarding progress for call recording upload
        console.log('Updating onboarding progress for call recording upload');
        try {
          await updateOnboardingProgress();
          console.log('Successfully updated onboarding progress for call recording');
        } catch (error) {
          console.error('Failed to update onboarding progress for call recording:', error);
        }

        const newCall: CallRecord = {
          id: (response.data as any).callRecording.id,
          contactId: (response.data as any).callRecording.contactId,
          date: (response.data as any).callRecording.date,
          duration: (response.data as any).callRecording.duration,
          recordingUrl: (response.data as any).callRecording.recordingUrl,
          transcriptUrl: '',
          summary: (response.data as any).callRecording.summary,
          sentiment: (response.data as any).callRecording.sentiment,
          tags: (response.data as any).callRecording.tags,
          aiInsights: (response.data as any).callRecording.aiInsights,
          repId: (response.data as any).callRecording.repId,
          companyId: (response.data as any).callRecording.companyId,
          processingOptions: { transcription: true, sentiment: true, insights: true },
          audioState: {
            isPlaying: false,
            currentTime: 0,
            duration: duration || 0,
            audioInstance: null,
            showPlayer: false,
            showTranscript: false
          }
        };

        setCallRecords(prevCalls => [...prevCalls, newCall]);
      }

      // Reset form and close modal
      setUploadName('');
      setUploadDescription('');
      setUploadUrl('');
      setUploadFile(null);
      setUploadTags('');
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('There was an error uploading your file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle item deletion with improved cleanup
  const handleDelete = async (id: string) => {
    console.log('Attempting to delete item with ID:', id);

    try {
      // Check if it's a document or call recording
      const document = knowledgeItems.find(item => item.id === id);
      const callRecording = callRecords.find(call => call.id === id);

      if (document) {
        // Log the document being deleted
        console.log('Document being deleted:', document);

        await apiClient.delete(`/documents/${id}`);
        setKnowledgeItems(prevItems => prevItems.filter(item => item.id !== id));
      } else if (callRecording) {
        // Log the call being deleted
        console.log('Call recording being deleted:', callRecording);

        // Delete call recording from the backend
        await apiClient.delete(`/call-recordings/${id}`);

        // Clean up audio resources and update state
        setCallRecords(prevCalls => {
          const call = prevCalls.find(call => call.id === id);
          if (call) {
            cleanupAudioResources(call);
          }
          return prevCalls.filter(call => call.id !== id);
        });

        // If this call was playing, stop it and reset audio state
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
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('There was an error deleting the item. Please try again.');
    }
  };

  // Helper function to clean up audio resources
  const cleanupAudioResources = (call: CallRecord) => {
    if (call.audioState.audioInstance) {
      try {
        // Stop playback
        call.audioState.audioInstance.pause();

        // Remove event listeners
        call.audioState.audioInstance.onloadedmetadata = null;
        call.audioState.audioInstance.ontimeupdate = null;
        call.audioState.audioInstance.onended = null;
        call.audioState.audioInstance.onerror = null;

        // Release object URL
        if (call.audioState.audioInstance.src) {
          URL.revokeObjectURL(call.audioState.audioInstance.src);
        }
      } catch (error) {
        console.error('Error cleaning up audio instance:', error);
      }
    }

    // Release recording URL
    if (call.recordingUrl) {
      try {
        URL.revokeObjectURL(call.recordingUrl);
      } catch (error) {
        console.error('Error revoking recording URL:', error);
      }
    }
  };

  // Unified handleView for both documents and call recordings
  const handleView = async (item: any) => {
    if (item.isCallRecording || item.recordingUrl) {
      // Handle call recording view - toggle inline display
      if (selectedItem?.id === item.id) {
        // If clicking the same item, close it
        setSelectedItem(null);
      } else {
        setSelectedItem(item);
        // Fetch summary
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
          } catch (error) {
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                summary: { keyIdeas: [], lastUpdated: null, error: 'Failed to load summary.' }
              }
            }));
          } finally {
            setLoadingSummary(prev => ({ ...prev, [item.id]: false }));
          }
        }
        // Fetch transcription
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
          } catch (error) {
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                transcription: { status: 'failed', segments: [], lastUpdated: null, error: 'Failed to load transcription.' }
              }
            }));
          } finally {
            setLoadingTranscription(prev => ({ ...prev, [item.id]: false }));
          }
        }
        // Fetch scoring
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
          } catch (error) {
            setDocumentAnalysis(prev => ({
              ...prev,
              [item.id]: {
                ...(prev[item.id] || {}),
                scoring: { status: 'failed', result: null, lastUpdated: null, error: 'Failed to load scoring.' }
              }
            }));
          } finally {
            setLoadingScoring(prev => ({ ...prev, [item.id]: false }));
          }
        }
      }
    } else {
      // Handle document view - toggle inline display
      if (selectedDocumentForAnalysis?.id === item.id) {
        // If clicking the same document, close it
        setSelectedDocumentForAnalysis(null);
      } else {
        setSelectedDocumentForAnalysis(item);
        // Always trigger analysis if it doesn't exist or is incomplete
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
      console.log('Analysis response:', response.data);
      setDocumentAnalysis(prev => ({
        ...prev,
        [documentId]: response.data as any
      }));
    } catch (error) {
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
      setUploadName('');
      setUploadDescription('');
      setUploadUrl('');
      setUploadFile(null);
      setUploadTags('');
    }
  };

  // Handle details modal close
  const handleDetailsModalClose = () => {
    // Stop audio playback if it's playing
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setPlayingCallId(null);
    }
    setIsModalOpen(false);
    setSelectedItem(null);
  };



  // Handle audio playback
  const handlePlayRecording = (recordingUrl: string, callId: string) => {
    console.log('Attempting to play audio:', recordingUrl); // Debugging log
    // First pause any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }

    // If we're clicking the same audio that's currently loaded
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

    // Create new audio instance
    const audio = new Audio(recordingUrl);

    // Set up event listeners
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

    // Try to play the audio
    audio.play().then(() => {
      setIsPlaying(true);
      setCurrentAudio(audio);
      setPlayingCallId(callId);
    }).catch(error => {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    });
  };

  // Handle audio position change
  const handleTimeChange = (newTime: number) => {
    if (currentAudio) {
      currentAudio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Toggle player visibility
  const togglePlayer = (callId: string) => {
    setShowPlayer(prev => ({
      ...prev,
      [callId]: !prev[callId]
    }));
  };

  // Toggle transcript visibility
  const toggleTranscript = (callId: string) => {
    setShowTranscript(prev => ({
      ...prev,
      [callId]: !prev[callId]
    }));
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

  // Nouvelle fonction pour formater la date (jour, mois, année)
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
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
    const event = new CustomEvent('tabChange', {
      detail: { tab: 'company-onboarding' }
    });
    window.dispatchEvent(event);
  };

  // Ajouter une fonction pour retourner à la liste
  const handleBackToList = () => {
    setShowAnalysisPage(false);
    setSelectedDocumentForAnalysis(null);
  };

  // Fonction pour analyser un enregistrement d'appel
  const analyzeCallRecording = async (recordingId: string) => {
    try {
      setAnalyzingDocument(recordingId);

      // Get summary analysis
      const summaryResponse = await apiClient.post(`/call-recordings/${recordingId}/analyze/summary`);
      console.log('Summary analysis response:', summaryResponse.data);

      // Get transcription analysis
      const transcriptionResponse = await apiClient.post(`/call-recordings/${recordingId}/analyze/transcription`);
      console.log('Transcription analysis response:', transcriptionResponse.data);

      setDocumentAnalysis(prev => ({
        ...prev,
        [recordingId]: {
          summary: (summaryResponse.data as any).summary,
          transcription: (transcriptionResponse.data as any).transcription
        } as CallAnalysis
      }));
    } catch (error) {
      console.error('Error analyzing call recording:', error);
      alert('Failed to analyze call recording. Please try again.');
    } finally {
      setAnalyzingDocument(null);
    }
  };



  // Fonction utilitaire pour charger la durée d'un audio à partir de son URL
  const fetchAudioDuration = (recordingUrl: string, callId: string) => {
    if (!recordingUrl || callDurations[callId]) return;
    const audio = new Audio(recordingUrl);
    audio.addEventListener('loadedmetadata', () => {
      setCallDurations(prev => ({ ...prev, [callId]: audio.duration }));
    });
  };

  // Function to detect if text is likely in English
  const isTextInEnglish = (text: string): boolean => {
    if (!text) return true;

    // Simple heuristic: check for common English words and patterns
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    const englishRatio = englishWordCount / Math.min(words.length, 20); // Check first 20 words

    return englishRatio > 0.2; // If more than 20% are common English words
  };

  // Function to check if analysis needs translation
  const needsTranslation = (analysis: DocumentAnalysis): boolean => {
    const textSample = `${analysis.summary} ${analysis.domain} ${analysis.theme}`.substring(0, 200);
    return !isTextInEnglish(textSample);
  };

  // Function to translate document analysis to English
  const translateAnalysis = async (documentId: string, analysis: DocumentAnalysis) => {
    try {
      setTranslatingDocument(documentId);

      // Create a comprehensive text for translation
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

      // Call backend translation service
      const response = await apiClient.post('/rag/translate-analysis', {
        analysis: textToTranslate,
        targetLanguage: 'English'
      });

      console.log('Translation response:', response.data);

      // Store translated analysis
      setTranslatedAnalysis(prev => ({
        ...prev,
        [documentId]: (response.data as any).translatedAnalysis
      }));

    } catch (error) {
      console.error('Error translating analysis:', error);
      alert('Failed to translate analysis. Please try again.');
    } finally {
      setTranslatingDocument(null);
    }
  };

  // Create unified items list combining documents and call recordings
  const getUnifiedItems = () => {
    // Convert documents to unified format
    const documentItems = knowledgeItems
      .filter(item => typeFilter === 'all' || item.type === typeFilter)
      .map(item => ({
        ...item,
        itemType: 'document' as const,
        date: item.uploadedAt,
        isCallRecording: false
      }));

    // Convert call recordings to unified format  
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

    // Combine and sort by date (most recent first)
    return [...documentItems, ...callItems].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const renderContent = () => {
    const unifiedItems = getUnifiedItems();

    if (unifiedItems.length > 0) {
      return (
        <div className="space-y-4">
          {unifiedItems.map((item) => {
            if (item.isCallRecording && 'callData' in item && item.callData) {
              const call = item.callData;
              // Charger la durée si pas déjà chargée
              fetchAudioDuration(call.recordingUrl, call.id);
              return (
                <React.Fragment key={call.id}>
                  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-start">
                      <div className="p-3 rounded-lg bg-purple-100 mr-4 flex-shrink-0">
                        <Mic size={20} className="text-purple-500" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">{call.contactId}</h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                              Call Recording
                            </span>
                            {call.processingOptions?.sentiment && call.sentiment && (
                              <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${call.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                call.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1)} Sentiment
                              </span>
                            )}
                            <button
                              onClick={() => handleView(call)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="View details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 p-1"
                              onClick={() => handleDelete(call.id)}
                              title="Delete call recording"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-3 whitespace-nowrap">
                          <Clock size={14} className="mr-1 flex-shrink-0" />
                          {formatDate(call.date)} • {callDurations[call.id] !== undefined ? formatTime(callDurations[call.id]) : '...'}
                        </div>
                        <p className="text-sm text-gray-700 mb-3 break-words overflow-hidden">{call.summary}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {call.tags.map((tag: string, index: number) => (
                            <span
                              key={`${call.id}-${tag}`}
                              className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 whitespace-nowrap"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline Call Recording Analysis */}
                  {selectedItem?.id === call.id && (
                    <div className="bg-harx-50/50 border-l-4 border-harx-500 p-6 rounded-2xl shadow-sm ml-4 mb-6 backdrop-blur-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm">
                            <Mic size={20} className="text-harx-500" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Call Recording Details</h3>
                          {/* Transaction Status Badge */}
                          <div className="flex items-center px-3 py-1 bg-green-50 border border-green-100 rounded-full text-green-700 text-xs font-black uppercase tracking-wider shadow-sm">
                            <CheckCircle size={14} className="mr-1.5" />
                            Transaction Aboutie
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedItem(null)}
                          className="p-2 text-gray-400 hover:text-harx-500 hover:bg-white rounded-xl transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2">
                          <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tighter">{selectedItem.contactId}</h2>
                          <p className="text-gray-600 leading-relaxed mb-4">{selectedItem.summary}</p>
                          <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                            <div className="flex items-center">
                              <Clock size={16} className="mr-1.5 text-harx-500" />
                              {formatDate(selectedItem.date)}
                            </div>
                            <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                            <div className="flex items-center">
                              {callDurations[selectedItem.id] !== undefined ? formatTime(callDurations[selectedItem.id]) : '...'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-end gap-3">
                          <button
                            className="flex items-center px-6 py-3 bg-gradient-harx text-white rounded-2xl font-black text-sm shadow-xl shadow-harx-500/25 hover:scale-105 active:scale-95 transition-all"
                            onClick={() => handlePlayRecording(selectedItem.recordingUrl, selectedItem.id)}
                          >
                            {playingCallId === selectedItem.id && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            <span className="ml-2 uppercase tracking-widest">{playingCallId === selectedItem.id && isPlaying ? 'Pause' : 'Play'} Call</span>
                          </button>
                          <div className="flex items-center gap-3 w-full max-w-[200px]">
                            <span className="text-[10px] font-black text-harx-500 tabular-nums">
                              {playingCallId === selectedItem.id ? formatTime(currentTime) : '0:00'}
                            </span>
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-harx transition-all duration-150"
                                style={{ width: playingCallId === selectedItem.id ? `${(currentTime / duration) * 100}%` : '0%' }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 tabular-nums">
                              {playingCallId === selectedItem.id ? formatTime(duration) : '0:00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Call Analysis Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-harx-100">
                          <Sparkles size={20} className="text-harx-500" />
                          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">AI Call Analysis</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Key Points Section */}
                          <div className="bg-white p-6 rounded-2xl border border-harx-100 shadow-sm">
                            <h4 className="text-sm font-black text-harx-500 uppercase tracking-widest mb-4">Core Insights</h4>
                            <div className="space-y-4">
                              {loadingSummary[selectedItem.id] ? (
                                <div className="flex items-center space-x-3 text-harx-500 py-4">
                                  <Loader2 className="animate-spin" size={20} />
                                  <span className="text-xs font-bold font-black">Distilling call essence...</span>
                                </div>
                              ) : documentAnalysis[selectedItem.id] && 'summary' in documentAnalysis[selectedItem.id] && (documentAnalysis[selectedItem.id] as CallAnalysis).summary?.keyIdeas?.length > 0 ? (
                                <>
                                  {(documentAnalysis[selectedItem.id] as CallAnalysis).summary.keyIdeas.map((idea, idx) => (
                                    <div key={idx} className="group">
                                      <h5 className="font-bold text-gray-900 border-l-2 border-harx-500 pl-3 mb-1">{idea.title}</h5>
                                      <p className="text-sm text-gray-600 pl-3">{idea.description}</p>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <div className="text-gray-400 italic text-sm">Waiting for AI distillation...</div>
                              )}
                            </div>
                          </div>

                          {/* Scoring Section */}
                          <div className="bg-white p-6 rounded-2xl border border-harx-100 shadow-sm">
                            <h4 className="text-sm font-black text-harx-500 uppercase tracking-widest mb-4">Performance Score</h4>
                            <div className="space-y-4">
                              {loadingScoring[selectedItem.id] ? (
                                <div className="flex items-center space-x-3 text-harx-500 py-4">
                                  <Loader2 className="animate-spin" size={20} />
                                  <span className="text-xs font-bold uppercase">Evaluating metrics...</span>
                                </div>
                              ) : (() => {
                                const analysis = documentAnalysis[selectedItem.id];
                                if (!analysis || !('scoring' in analysis)) return <div className="text-gray-400 italic text-sm">No score data yet.</div>;
                                const scoring = (analysis as any).scoring;
                                if (scoring?.status !== 'completed' || !scoring?.result) return <div className="text-gray-400 italic text-sm">Analysis in progress...</div>;
                                
                                return (
                                  <div className="space-y-4">
                                    {Object.entries(scoring.result).map(([section, value]: [string, any]) => (
                                      <div key={section} className="relative">
                                        <div className="flex justify-between items-center mb-1.5">
                                          <span className="text-xs font-black text-gray-700 uppercase">{section}</span>
                                          <span className="text-xs font-black text-harx-600">{value.score}/100</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-gradient-harx" style={{ width: `${value.score}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Transcription Section */}
                        <div className="bg-white p-6 rounded-2xl border border-harx-100 shadow-sm">
                          <h4 className="text-sm font-black text-harx-500 uppercase tracking-widest mb-4">Word-for-Word Transcript</h4>
                          {loadingTranscription[selectedItem.id] ? (
                            <div className="flex items-center space-x-3 text-harx-500 py-4">
                              <Loader2 className="animate-spin" size={20} />
                              <span className="text-xs font-bold uppercase">Transcribing audio stream...</span>
                            </div>
                          ) : (() => {
                            const analysis = documentAnalysis[selectedItem.id];
                            if (!analysis || !('transcription' in analysis)) return <div className="text-gray-500 italic">Transcription pending...</div>;
                            const callAnalysis = analysis as CallAnalysis;
                            if (callAnalysis.transcription?.status !== 'completed' || !callAnalysis.transcription?.segments?.length) return <div className="text-gray-500 italic">No segments found.</div>;
                            
                            const showCount = transcriptionShowCount[selectedItem.id] || TRANSCRIPTION_PAGE_SIZE;
                            const segmentsToShow = callAnalysis.transcription.segments.slice(0, showCount);
                            
                            return (
                              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                                {segmentsToShow.map((segment: any, idx: number) => (
                                  <div key={idx} className="p-3 rounded-xl hover:bg-harx-50/30 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black text-harx-400 tabular-nums">
                                        {typeof segment.start === 'string' ? segment.start : formatTime(segment.start)}
                                      </span>
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{segment.speaker || 'AGENT'}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">{segment.text}</p>
                                  </div>
                                ))}
                                <div className="flex justify-center gap-4 mt-6">
                                  {showCount < callAnalysis.transcription.segments.length && (
                                    <button
                                      className="px-4 py-2 bg-harx-50 text-harx-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-harx-100 transition-colors"
                                      onClick={() => setTranscriptionShowCount(prev => ({ ...prev, [selectedItem.id]: showCount + TRANSCRIPTION_PAGE_SIZE }))}
                                    >
                                      Load More
                                    </button>
                                  )}
                                  {showCount > TRANSCRIPTION_PAGE_SIZE && (
                                    <button
                                      className="px-4 py-2 text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest hover:text-gray-600 transition-colors"
                                      onClick={() => setTranscriptionShowCount(prev => ({ ...prev, [selectedItem.id]: TRANSCRIPTION_PAGE_SIZE }))}
                                    >
                                      Collapse
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            }
            // Document item
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
                          <div className="flex space-x-1 flex-shrink-0 ml-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleView(item)}
                              className="text-harx-500 hover:bg-harx-50 p-2 rounded-lg transition-all"
                              title="Deep Intelligence Analysis"
                            >
                              <Brain size={18} />
                            </button>
                            <button
                              className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-all"
                              onClick={() => handleDelete(item.id)}
                              title="Purge Resource"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-4 font-medium italic leading-relaxed line-clamp-2">{item.description}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.tags.map((tag: string, index: number) => (
                            <span
                              key={`${item.id}-${tag}`}
                              className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-gray-50 text-gray-400 border border-gray-100 transition-colors hover:border-harx-100/30 hover:text-harx-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                          <div className="flex items-center gap-3">
                             <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${item.type === 'document' ? 'bg-harx-50 text-harx-600 border border-harx-100/50' :
                              item.type === 'audio' ? 'bg-harx-alt-50 text-harx-alt-600 border border-harx-alt-100/50' :
                                'bg-gray-50 text-gray-500'
                              }`}>
                              {item.type === 'document' ? 'Raw Data' : 'Voice Flux'}
                            </span>
                            <div className="w-1 h-1 bg-gray-200 rounded-full" />
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter tabular-nums">
                               {format(new Date(item.date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleView(item)} 
                            className="text-[10px] font-black text-harx-500 uppercase tracking-widest hover:underline flex items-center gap-1 group/btn"
                          >
                             View Analysis
                             <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Inline Document Analysis */}
                  {selectedDocumentForAnalysis?.id === item.id && (
                    <div className="bg-white border border-harx-100 p-8 rounded-3xl shadow-2xl ml-4 mb-8 relative overflow-hidden group/analysis">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-harx opacity-5 rounded-bl-[100px]" />
                      
                      <div className="flex justify-between items-start mb-8 relative">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-harx rounded-2xl text-white shadow-lg shadow-harx-500/30">
                            <Brain size={24} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Document Analysis</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-harx-500">Smart Engine</span>
                              <div className="w-1 h-1 bg-gray-300 rounded-full" />
                              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-400">Deep Insights</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedDocumentForAnalysis(null)}
                          className="p-2 text-gray-400 hover:text-harx-500 hover:bg-harx-50 rounded-xl transition-all"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      {analyzingDocument === item.id ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                          <div className="relative">
                            <Loader2 className="animate-spin text-harx-500" size={48} />
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-harx-400 animate-pulse" size={20} />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-gray-900 uppercase tracking-widest">Processing Intelligence</p>
                            <p className="text-sm text-gray-500 mt-1 italic font-medium">Extracting key concepts from your content...</p>
                          </div>
                        </div>
                      ) : documentAnalysis[item.id] ? (
                        <div className="relative animate-fade-in">
                           {renderAnalysisContent(documentAnalysis[item.id], item.id)}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-harx-50/50 rounded-3xl border-2 border-dashed border-harx-200">
                          <div className="inline-flex p-4 bg-white rounded-2xl shadow-sm mb-4">
                            <Brain size={32} className="text-harx-400" />
                          </div>
                          <h4 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">Analysis Needed</h4>
                          <p className="text-gray-500 max-w-sm mx-auto mb-8 font-medium italic">
                            Let the HARX Smart Engine explore this document to extract meaningful insights.
                          </p>
                          <button
                            onClick={() => analyzeDocument(item.id)}
                            className="inline-flex items-center px-8 py-4 bg-gradient-harx text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-harx-500/25 hover:scale-105 active:scale-95 transition-all"
                          >
                            <Brain size={20} className="mr-3" />
                            Analyze Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            }
          })

        </div>
      );
    } else {
      return (
        <div className="bg-white/50 backdrop-blur-sm p-16 rounded-[3rem] border border-gray-100 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gray-50 mb-6 text-gray-300 shadow-inner">
            <Brain size={48} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Intelligence Stream Empty</h3>
          <p className="text-gray-500 max-w-sm mx-auto font-medium italic mb-10 leading-relaxed">
            {typeFilter !== 'all'
              ? `No ${typeFilter === 'document' ? 'documents' : 'voice recordings'} synchronized. Transition your data into the HARX eco-system.`
              : "Your enterprise knowledge has not been synchronized yet. Initiate data ingestion to empower your REPS."}
          </p>
          {typeFilter === 'all' && (
            <button
              className="mt-4 bg-gradient-harx text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-harx-500/30 hover:scale-105 active:scale-95 transition-all flex items-center mx-auto"
              onClick={() => setShowUploadModal(true)}
            >
              <Plus size={18} className="mr-3" />
              Ingest First Resource
            </button>
          )}
        </div>
      );
    }
  };

  const renderUploadModal = () => {
    if (!showUploadModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h3 className="text-xl font-semibold text-gray-900">
              Add to Knowledge Base
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none text-xl font-semibold"
              onClick={handleUploadModalClose}
              disabled={isUploading}
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto flex-grow">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      className={`p-4 rounded-lg border ${uploadType === 'document'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                        } flex flex-col items-center justify-center`}
                      onClick={() => setUploadType('document')}
                    >
                      <FileText size={24} className={uploadType === 'document' ? 'text-blue-500' : 'text-gray-500'} />
                      <span className="mt-2 text-sm">Document</span>
                    </button>

                    <button
                      type="button"
                      className={`p-4 rounded-lg border ${uploadType === 'audio'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                        } flex flex-col items-center justify-center`}
                      onClick={() => setUploadType('audio')}
                    >
                      <Mic size={24} className={uploadType === 'audio' ? 'text-blue-500' : 'text-gray-500'} />
                      <span className="mt-2 text-sm">Call Recording</span>
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder={uploadType === 'document' ? 'Enter a name for this resource' : 'Enter a name for this recording'}
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder={uploadType === 'document' ? 'Describe what this resource contains' : 'Describe what this recording contains'}
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload size={24} className="text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          {uploadType === 'document'
                            ? 'PDF, DOCX, TXT, or other document formats'
                            : 'MP3, WAV, or other audio formats'
                          }
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept={
                          uploadType === 'document'
                            ? ".pdf,.docx,.txt,.md,.csv,.xlsx"
                            : ".mp3,.wav,.ogg,.m4a"
                        }
                        required
                      />
                    </label>
                  </div>
                  {uploadFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected file: {uploadFile.name}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Enter tags separated by commas"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Example: {uploadType === 'document' ? 'product, api, technical' : 'follow-up, sales, support'}
                  </p>
                </div>

                {uploadType === 'audio' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Processing Options
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="transcription"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={processingOptions.transcription}
                          onChange={(e) => setProcessingOptions(prev => ({
                            ...prev,
                            transcription: e.target.checked
                          }))}
                        />
                        <label htmlFor="transcription" className="ml-2 text-sm text-gray-700">
                          Generate transcription
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="sentiment"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={processingOptions.sentiment}
                          onChange={(e) => setProcessingOptions(prev => ({
                            ...prev,
                            sentiment: e.target.checked
                          }))}
                        />
                        <label htmlFor="sentiment" className="ml-2 text-sm text-gray-700">
                          Analyze sentiment
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="insights"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={processingOptions.insights}
                          onChange={(e) => setProcessingOptions(prev => ({
                            ...prev,
                            insights: e.target.checked
                          }))}
                        />
                        <label htmlFor="insights" className="ml-2 text-sm text-gray-700">
                          Generate AI insights
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
                  onClick={handleUploadModalClose}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin mr-2">⌛</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="mr-2" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalysisContent = (analysis: AnalysisResult, documentId?: string) => {
    if ('domain' in analysis) {
      // This is a DocumentAnalysis
      const documentAnalysis = analysis as DocumentAnalysis;
      const hasTranslation = documentId && translatedAnalysis[documentId];
      const displayAnalysis = hasTranslation ? translatedAnalysis[documentId] : documentAnalysis;
      const showTranslateButton = documentId && needsTranslation(documentAnalysis) && !hasTranslation;

      return (
        <div className="space-y-10">
          {/* Translation Controls - Premium Floating Bar */}
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
                    onClick={() => translateAnalysis(documentId, documentAnalysis)}
                    disabled={translatingDocument === documentId}
                    className="flex items-center px-4 py-2 bg-harx-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-harx-600 shadow-lg shadow-harx-500/20 transition-all disabled:opacity-50"
                  >
                    {translatingDocument === documentId ? (
                      <>
                        <RefreshCw size={14} className="mr-2 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages size={14} className="mr-2" />
                        Translate to English
                      </>
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
                <div className="group/item">
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-2">Subject Domain</h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-800 shadow-sm group-hover/item:shadow-md transition-all">
                    {displayAnalysis.domain}
                  </div>
                </div>
                <div className="group/item">
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-2">Target Audience</h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-800 shadow-sm group-hover/item:shadow-md transition-all">
                    {displayAnalysis.targetAudience}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="group/item">
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-2">Expertise Level</h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-800 shadow-sm flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`w-1 h-3 rounded-full ${i <= 2 ? 'bg-harx-500' : 'bg-gray-100'}`} />
                      ))}
                    </span>
                    {displayAnalysis.technicalLevel}
                  </div>
                </div>
                <div className="group/item">
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-2">Primary Theme</h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-800 shadow-sm">
                    {displayAnalysis.theme}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="group/item bg-gradient-to-br from-white to-harx-50/30 p-6 rounded-3xl border border-harx-100 shadow-inner">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-harx-500 rounded-full" />
                  Main Strategic Points
                </h3>
                <ul className="space-y-3">
                  {displayAnalysis.mainPoints.map((point: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 group/li">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-harx-500 group-hover/li:scale-150 transition-transform flex-shrink-0" />
                      <span className="text-sm text-gray-700 font-medium leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="group/item">
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-3">Key Terms</h3>
                  <div className="flex flex-wrap gap-2">
                    {displayAnalysis.keyTerms.map((term: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-xs font-black text-gray-600 shadow-sm hover:border-harx-200 hover:text-harx-500 transition-all">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="group/item">
                  <h3 className="text-[10px] font-black text-harx-400 uppercase tracking-widest mb-3">Recommendations</h3>
                   <div className="space-y-2">
                    {displayAnalysis.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="p-2 bg-white/50 border border-gray-50 rounded-xl flex items-center gap-2 group/rec">
                        <Plus size={10} className="text-harx-400 group-hover/rec:text-harx-500 transition-colors" />
                        <span className="text-[11px] font-bold text-gray-600 line-clamp-1">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if ('summary' in analysis && analysis.summary && 'keyIdeas' in analysis.summary) {
      // This is a CallAnalysis - used in modal view
      const callAnalysis = analysis as CallAnalysis;
      return (
        <div className="space-y-6">
           <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-harx-500" />
            Executive Call Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {callAnalysis.summary.keyIdeas.map((idea, index) => (
              <div key={index} className="bg-white p-5 rounded-2xl border border-harx-100 shadow-sm hover:shadow-md transition-all">
                <h4 className="font-bold text-harx-600 mb-2 truncate">{idea.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">{idea.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <Clock size={14} />
              AI DISTILLED ON {format(new Date(callAnalysis.summary.lastUpdated), 'PPpp')}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-1 h-3 rounded-full bg-harx-500 opacity-20" />
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Brain size={48} className="text-gray-200 mb-4" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic">Intelligence stream offline</p>
        </div>
      );
    }
  };

  const renderAnalysisPage = () => {
    if (!showAnalysisPage || !selectedDocumentForAnalysis) return null;

    const analysis = documentAnalysis[selectedDocumentForAnalysis.id];
    if (!analysis) return null;

    return (
      <div className="p-6 relative">
        {/* Bouton de fermeture en haut à droite */}
        <button
          onClick={handleBackToList}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold focus:outline-none"
          title="Close details"
        >
          ×
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          {/* En-tête du document */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  {getItemIcon(selectedDocumentForAnalysis.type)}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    {selectedDocumentForAnalysis.name}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {selectedDocumentForAnalysis.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedDocumentForAnalysis.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => openInNewTab(selectedDocumentForAnalysis.fileUrl)}
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={18} className="mr-2" />
                      Open Document
                    </button>
                    <span className="text-sm text-gray-500">
                      Uploaded on {format(new Date(selectedDocumentForAnalysis.uploadedAt), 'MMMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              {analyzingDocument === selectedDocumentForAnalysis.id ? (
                <div className="flex items-center text-blue-600">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Analyzing... This may take a few minutes
                </div>
              ) : !documentAnalysis[selectedDocumentForAnalysis.id] ? (
                <button
                  onClick={() => analyzeDocument(selectedDocumentForAnalysis.id)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Brain size={20} className="mr-2" />
                  Start Analysis
                </button>
              ) : (
                <button
                  onClick={() => analyzeDocument(selectedDocumentForAnalysis.id)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw size={20} className="mr-2" />
                  Refresh Analysis
                </button>
              )}
            </div>
          </div>

          {/* Contenu de l'analyse */}
          {documentAnalysis[selectedDocumentForAnalysis.id] ? (
            renderAnalysisContent(documentAnalysis[selectedDocumentForAnalysis.id], selectedDocumentForAnalysis.id)
          ) : (
            <div className="text-center py-12">
              <Brain size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                Click "Start Analysis" to get AI-powered insights about this document.
                <br />
                <span className="text-sm text-gray-400 mt-2 block">
                  This process may take a few minutes as it analyzes the document in detail.
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-transparent min-h-full">
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

      {/* Filter and Add Resource Bar */}
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
      {renderAnalysisPage()}
    </div>
  );
};

export default KnowledgeBase;