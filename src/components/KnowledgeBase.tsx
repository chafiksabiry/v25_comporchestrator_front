import React, { useState, useEffect } from 'react';
import { Upload, File, FileText, Video, Link as LinkIcon, Plus, Trash2, Filter, Download, Mic, Play, Clock, Pause, ChevronDown, ChevronUp, X, ExternalLink, Eye, ArrowLeft, Brain, Loader2, RefreshCw, Languages } from 'lucide-react';
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

      const endpoint = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/2/steps/7`;
      console.log('Making request to endpoint:', endpoint);

      const response = await axios.put(endpoint, { status: "completed" });

      console.log('Onboarding progress update response:', response.data);

      // Update the companyOnboardingProgress cookie with the response data
      if (response.data) {
        Cookies.set('companyOnboardingProgress', JSON.stringify(response.data), { expires: 7 });
        console.log('Updated companyOnboardingProgress cookie with new data');
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

      const documents = response.data.documents.map((doc: any) => ({
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
        const calls = response.data.callRecordings.map((call: any) => ({
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

        const newCall: CallRecord = {
          id: response.data.callRecording.id,
          contactId: response.data.callRecording.contactId,
          date: response.data.callRecording.date,
          duration: response.data.callRecording.duration,
          recordingUrl: response.data.callRecording.recordingUrl,
          transcriptUrl: '',
          summary: response.data.callRecording.summary,
          sentiment: response.data.callRecording.sentiment,
          tags: response.data.callRecording.tags,
          aiInsights: response.data.callRecording.aiInsights,
          repId: response.data.callRecording.repId,
          companyId: response.data.callRecording.companyId,
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
                summary: summaryResponse.data.summary
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
                transcription: transcriptionResponse.data.transcription
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
                scoring: scoringResponse.data.scoring
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
        [documentId]: response.data
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
          summary: summaryResponse.data.summary,
          transcription: transcriptionResponse.data.transcription
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
        [documentId]: response.data.translatedAnalysis
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
                    <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg shadow-sm ml-4 mb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          <Mic size={20} className="text-purple-600 mr-2" />
                          <h3 className="text-xl font-semibold text-gray-900">Call Recording Details</h3>
                        </div>
                        <button
                          onClick={() => setSelectedItem(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{selectedItem.contactId}</h2>
                            <p className="text-gray-600 mb-2">{selectedItem.summary}</p>
                            <div className="flex items-center text-gray-500 mb-2">
                              <Clock size={16} className="mr-2" />
                              {formatDate(selectedItem.date)} • {callDurations[selectedItem.id] !== undefined ? formatTime(callDurations[selectedItem.id]) : '...'}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                              onClick={() => handlePlayRecording(selectedItem.recordingUrl, selectedItem.id)}
                              title={playingCallId === selectedItem.id && isPlaying ? "Pause" : "Play"}
                            >
                              {playingCallId === selectedItem.id && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                              <span className="ml-2">{playingCallId === selectedItem.id && isPlaying ? 'Pause' : 'Play'} Audio</span>
                            </button>
                            <span className="text-xs text-gray-500">
                              {playingCallId === selectedItem.id ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '0:00 / 0:00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Call Analysis Section */}
                      <div className="mt-6 w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Call Analysis</h2>
                        {/* Key Points Section */}
                        <details className="mb-4" open>
                          <summary className="cursor-pointer text-gray-700 font-semibold py-2">Key Points</summary>
                          <div className="space-y-4 p-2">
                            {loadingSummary[selectedItem.id] ? (
                              <div className="flex items-center space-x-2 text-blue-600">
                                <Loader2 className="animate-spin" size={20} />
                                <span>Analyzing call, please wait...</span>
                              </div>
                            ) : documentAnalysis[selectedItem.id] && 'summary' in documentAnalysis[selectedItem.id] && (documentAnalysis[selectedItem.id] as CallAnalysis).summary?.keyIdeas?.length > 0 ? (
                              <>
                                {(documentAnalysis[selectedItem.id] as CallAnalysis).summary.keyIdeas.map((idea, idx) => (
                                  <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-gray-900 mb-2">{idea.title}</h5>
                                    <p className="text-gray-700">{idea.description}</p>
                                  </div>
                                ))}
                                <div className="mt-4 text-sm text-gray-500">
                                  Last updated: {format(new Date((documentAnalysis[selectedItem.id] as CallAnalysis).summary.lastUpdated), 'PPpp')}
                                </div>
                              </>
                            ) : (
                              <div className="text-gray-500 italic">No analysis available yet.</div>
                            )}
                          </div>
                        </details>
                        {/* Transcription Section */}
                        <details className="mb-4" open>
                          <summary className="cursor-pointer text-gray-700 font-semibold py-2">Transcription</summary>
                          <div className="p-4">
                            {loadingTranscription[selectedItem.id] ? (
                              <div className="flex items-center space-x-2 text-blue-600">
                                <Loader2 className="animate-spin" size={20} />
                                <span>Generating transcription, please wait...</span>
                              </div>
                            ) : (() => {
                              if (!documentAnalysis || !selectedItem?.id) {
                                return <div className="text-gray-500 italic">No transcription available yet.</div>;
                              }
                              const analysis = documentAnalysis[selectedItem.id];
                              if (!analysis || !('transcription' in analysis)) {
                                return <div className="text-gray-500 italic">No transcription available yet.</div>;
                              }
                              const callAnalysis = analysis as CallAnalysis;
                              if (callAnalysis.transcription?.status !== 'completed' || !callAnalysis.transcription?.segments?.length) {
                                return <div className="text-gray-500 italic">No transcription available yet.</div>;
                              }
                              const showCount = transcriptionShowCount[selectedItem.id] || TRANSCRIPTION_PAGE_SIZE;
                              const segmentsToShow = callAnalysis.transcription.segments.slice(0, showCount);
                              return (
                                <div className="space-y-4">
                                  {segmentsToShow.map((segment: any, idx: number) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                                      <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                                        <span>{typeof segment.start === 'string' ? segment.start : formatTime(segment.start)} - {typeof segment.end === 'string' ? segment.end : formatTime(segment.end)}</span>
                                        {segment.speaker && <span className="font-medium">{segment.speaker}</span>}
                                      </div>
                                      <p className="text-gray-700">{segment.text}</p>
                                    </div>
                                  ))}
                                  {showCount < callAnalysis.transcription.segments.length && (
                                    <button
                                      className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                      onClick={() => setTranscriptionShowCount(prev => ({ ...prev, [selectedItem.id]: showCount + TRANSCRIPTION_PAGE_SIZE }))}
                                    >
                                      Show more
                                    </button>
                                  )}
                                  {showCount > TRANSCRIPTION_PAGE_SIZE && (
                                    <button
                                      className="mt-2 ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                      onClick={() => setTranscriptionShowCount(prev => ({ ...prev, [selectedItem.id]: TRANSCRIPTION_PAGE_SIZE }))}
                                    >
                                      Show less
                                    </button>
                                  )}
                                  {callAnalysis.transcription.lastUpdated && (
                                    <div className="mt-4 text-sm text-gray-500">
                                      Last updated: {format(new Date(callAnalysis.transcription.lastUpdated), 'PPpp')}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </details>
                        {/* Scoring Section */}
                        <details className="mb-4" open>
                          <summary className="cursor-pointer text-gray-700 font-semibold py-2">Scoring</summary>
                          <div className="p-4">
                            {loadingScoring[selectedItem.id] ? (
                              <div className="flex items-center space-x-2 text-blue-600">
                                <Loader2 className="animate-spin" size={20} />
                                <span>Generating scoring, please wait...</span>
                              </div>
                            ) : (() => {
                              if (!documentAnalysis || !selectedItem?.id) {
                                return <div className="text-gray-500 italic">No scoring available yet.</div>;
                              }
                              const analysis = documentAnalysis[selectedItem.id];
                              if (!analysis || !('scoring' in analysis)) {
                                return <div className="text-gray-500 italic">No scoring available yet.</div>;
                              }
                              const scoring = (analysis as any).scoring;
                              if (scoring?.status !== 'completed' || !scoring?.result) {
                                return <div className="text-gray-500 italic">No scoring available yet.</div>;
                              }
                              return (
                                <div className="space-y-4">
                                  {Object.entries(scoring.result).map(([section, value]: [string, any]) => (
                                    <div key={section} className="bg-gray-50 p-4 rounded-lg">
                                      <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                                        <span className="font-medium">{section}</span>
                                        <span>Score: {value.score}</span>
                                      </div>
                                      <p className="text-gray-700">{value.feedback}</p>
                                    </div>
                                  ))}
                                  {scoring.lastUpdated && (
                                    <div className="mt-4 text-sm text-gray-500">
                                      Last updated: {format(new Date(scoring.lastUpdated), 'PPpp')}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            } else {
              // Document item
              return (
                <React.Fragment key={item.id}>
                  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-start">
                      <div className="p-3 rounded-lg bg-gray-100 mr-4 flex-shrink-0">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 mb-1 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500 mb-3 break-words line-clamp-2">{item.description}</p>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.map((tag: string, index: number) => (
                            <span
                              key={`${item.id}-${tag}`}
                              className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 whitespace-nowrap"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${item.type === 'document' ? 'bg-blue-100 text-blue-800' :
                            item.type === 'audio' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </span>

                          <div className="flex space-x-2 flex-shrink-0">
                            <button
                              onClick={() => handleView(item)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="View details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 p-1"
                              onClick={() => handleDelete(item.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline Document Analysis */}
                  {selectedDocumentForAnalysis?.id === item.id && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm ml-4 mb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          <Brain size={20} className="text-blue-600 mr-2" />
                          <h3 className="text-xl font-semibold text-gray-900">Document Analysis</h3>
                        </div>
                        <button
                          onClick={() => setSelectedDocumentForAnalysis(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {analyzingDocument === item.id ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
                          <span className="text-gray-600">Analyzing document...</span>
                        </div>
                      ) : documentAnalysis[item.id] ? (
                        renderAnalysisContent(documentAnalysis[item.id], item.id)
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-600 mb-4">No analysis available yet.</p>
                          <button
                            onClick={() => analyzeDocument(item.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Analyze Document
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            }
          })}

          {/* Panneau de détails pour call recordings */}
          {selectedItem && selectedItem.recordingUrl && (
            <div className="bg-white rounded-lg shadow-lg border border-blue-200 mt-6 p-6 w-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <Mic size={20} className="text-purple-500" />
                  <h3 className="text-xl font-semibold ml-2">Call Recording Details</h3>
                </div>
                <button
                  onClick={handleDetailsModalClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">{selectedItem.contactId}</h2>
                    <p className="text-gray-600 mb-2">{selectedItem.summary}</p>
                    <div className="flex items-center text-gray-500 mb-2">
                      <Clock size={16} className="mr-2" />
                      {formatDate(selectedItem.date)} • {callDurations[selectedItem.id] !== undefined ? formatTime(callDurations[selectedItem.id]) : '...'}
                    </div>
                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedItem.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      onClick={() => handlePlayRecording(selectedItem.recordingUrl, selectedItem.id)}
                      title={playingCallId === selectedItem.id && isPlaying ? "Pause" : "Play"}
                    >
                      {playingCallId === selectedItem.id && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      <span className="ml-2">{playingCallId === selectedItem.id && isPlaying ? 'Pause' : 'Play'} Audio</span>
                    </button>
                    <span className="text-xs text-gray-500">
                      {playingCallId === selectedItem.id ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '0:00 / 0:00'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Call Analysis Section */}
              <div className="mt-6 w-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Call Analysis</h2>
                {/* Key Points Section */}
                <details className="mb-4" open>
                  <summary className="cursor-pointer text-gray-700 font-semibold py-2">Key Points</summary>
                  <div className="space-y-4 p-2">
                    {loadingSummary[selectedItem.id] ? (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Analyzing call, please wait...</span>
                      </div>
                    ) : documentAnalysis[selectedItem.id] && 'summary' in documentAnalysis[selectedItem.id] && (documentAnalysis[selectedItem.id] as CallAnalysis).summary?.keyIdeas?.length > 0 ? (
                      <>
                        {(documentAnalysis[selectedItem.id] as CallAnalysis).summary.keyIdeas.map((idea, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-medium text-gray-900 mb-2">{idea.title}</h5>
                            <p className="text-gray-700">{idea.description}</p>
                          </div>
                        ))}
                        <div className="mt-4 text-sm text-gray-500">
                          Last updated: {format(new Date((documentAnalysis[selectedItem.id] as CallAnalysis).summary.lastUpdated), 'PPpp')}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 italic">No analysis available yet.</div>
                    )}
                  </div>
                </details>
                {/* Transcription Section */}
                <details className="mb-4" open>
                  <summary className="cursor-pointer text-gray-700 font-semibold py-2">Transcription</summary>
                  <div className="p-4">
                    {loadingTranscription[selectedItem.id] ? (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Generating transcription, please wait...</span>
                      </div>
                    ) : (() => {
                      if (!documentAnalysis || !selectedItem?.id) {
                        return <div className="text-gray-500 italic">No transcription available yet.</div>;
                      }
                      const analysis = documentAnalysis[selectedItem.id];
                      if (!analysis || !('transcription' in analysis)) {
                        return <div className="text-gray-500 italic">No transcription available yet.</div>;
                      }
                      const callAnalysis = analysis as CallAnalysis;
                      if (callAnalysis.transcription?.status !== 'completed' || !callAnalysis.transcription?.segments?.length) {
                        return <div className="text-gray-500 italic">No transcription available yet.</div>;
                      }
                      const showCount = transcriptionShowCount[selectedItem.id] || TRANSCRIPTION_PAGE_SIZE;
                      const segmentsToShow = callAnalysis.transcription.segments.slice(0, showCount);
                      return (
                        <div className="space-y-4">
                          {segmentsToShow.map((segment: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                                <span>{typeof segment.start === 'string' ? segment.start : formatTime(segment.start)} - {typeof segment.end === 'string' ? segment.end : formatTime(segment.end)}</span>
                                {segment.speaker && <span className="font-medium">{segment.speaker}</span>}
                              </div>
                              <p className="text-gray-700">{segment.text}</p>
                            </div>
                          ))}
                          {showCount < callAnalysis.transcription.segments.length && (
                            <button
                              className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              onClick={() => setTranscriptionShowCount(prev => ({ ...prev, [selectedItem.id]: showCount + TRANSCRIPTION_PAGE_SIZE }))}
                            >
                              Show more
                            </button>
                          )}
                          {showCount > TRANSCRIPTION_PAGE_SIZE && (
                            <button
                              className="mt-2 ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              onClick={() => setTranscriptionShowCount(prev => ({ ...prev, [selectedItem.id]: TRANSCRIPTION_PAGE_SIZE }))}
                            >
                              Show less
                            </button>
                          )}
                          {callAnalysis.transcription.lastUpdated && (
                            <div className="mt-4 text-sm text-gray-500">
                              Last updated: {format(new Date(callAnalysis.transcription.lastUpdated), 'PPpp')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </details>
                {/* Scoring Section */}
                <details className="mb-4" open>
                  <summary className="cursor-pointer text-gray-700 font-semibold py-2">Scoring</summary>
                  <div className="p-4">
                    {loadingScoring[selectedItem.id] ? (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Generating scoring, please wait...</span>
                      </div>
                    ) : (() => {
                      if (!documentAnalysis || !selectedItem?.id) {
                        return <div className="text-gray-500 italic">No scoring available yet.</div>;
                      }
                      const analysis = documentAnalysis[selectedItem.id];
                      if (!analysis || !('scoring' in analysis)) {
                        return <div className="text-gray-500 italic">No scoring available yet.</div>;
                      }
                      const scoring = (analysis as any).scoring;
                      if (scoring?.status !== 'completed' || !scoring?.result) {
                        return <div className="text-gray-500 italic">No scoring available yet.</div>;
                      }
                      return (
                        <div className="space-y-4">
                          {Object.entries(scoring.result).map(([section, value]: [string, any]) => (
                            <div key={section} className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                                <span className="font-medium">{section}</span>
                                <span>Score: {value.score}</span>
                              </div>
                              <p className="text-gray-700">{value.feedback}</p>
                            </div>
                          ))}
                          {scoring.lastUpdated && (
                            <div className="mt-4 text-sm text-gray-500">
                              Last updated: {format(new Date(scoring.lastUpdated), 'PPpp')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <File size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No resources found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {typeFilter !== 'all'
              ? `No ${typeFilter === 'document' ? 'documents' : 'audio recordings'} found. Try changing the filter or add new resources.`
              : "Your knowledge base is empty. Add documents or call recordings to get started."}
          </p>
          {typeFilter === 'all' && (
            <button
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
              onClick={() => setShowUploadModal(true)}
            >
              <Plus size={18} className="mr-2" />
              Add Your First Resource
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
        <div>
          {/* Translation status and button */}
          {documentId && (
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {hasTranslation && (
                  <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    <Languages size={14} className="mr-1" />
                    Translated to English
                  </div>
                )}
                {showTranslateButton && (
                  <button
                    onClick={() => translateAnalysis(documentId, documentAnalysis)}
                    disabled={translatingDocument === documentId}
                    className="flex items-center text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 disabled:opacity-50"
                  >
                    {translatingDocument === documentId ? (
                      <>
                        <Loader2 size={14} className="mr-1 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages size={14} className="mr-1" />
                        Translate to English
                      </>
                    )}
                  </button>
                )}
              </div>
              {hasTranslation && (
                <button
                  onClick={() => setTranslatedAnalysis(prev => {
                    const newState = { ...prev };
                    delete newState[documentId];
                    return newState;
                  })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Show Original
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Summary</h3>
                <p className="text-gray-700">{displayAnalysis.summary}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Domain</h3>
                <p className="text-gray-700">{displayAnalysis.domain}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Theme</h3>
                <p className="text-gray-700">{displayAnalysis.theme}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Technical Level</h3>
                <p className="text-gray-700">{displayAnalysis.technicalLevel}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Main Points</h3>
                <ul className="list-disc list-inside space-y-2">
                  {displayAnalysis.mainPoints.map((point: string, index: number) => (
                    <li key={index} className="text-gray-700">{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Target Audience</h3>
                <p className="text-gray-700">{displayAnalysis.targetAudience}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Key Terms</h3>
                <ul className="list-disc list-inside space-y-2">
                  {displayAnalysis.keyTerms.map((term: string, index: number) => (
                    <li key={index} className="text-gray-700">{term}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Recommendations</h3>
                <ul className="list-disc list-inside space-y-2">
                  {displayAnalysis.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-gray-700">{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    } else if ('summary' in analysis && analysis.summary && 'keyIdeas' in analysis.summary) {
      // This is a CallAnalysis
      const callAnalysis = analysis as CallAnalysis;
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Call Summary</h3>
            <div className="space-y-4">
              {callAnalysis.summary.keyIdeas.map((idea, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{idea.title}</h4>
                  <p className="text-gray-700">{idea.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Last updated: {format(new Date(callAnalysis.summary.lastUpdated), 'PPpp')}
            </div>
          </div>
        </div>
      );
    } else {
      return <div className="text-gray-500 italic">No analysis available yet.</div>;
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <button
        onClick={handleBackToOrchestrator}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        <span>Back to Onboarding</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Knowledge Base</h1>
        <p className="text-gray-600">
          Upload documents and call recordings to build your company's knowledge base.
          The AI will use this information to provide better insights and assistance when handling contacts.
        </p>
      </div>



      {/* Filter and Add Resource */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Filter size={18} className="text-gray-500" />
            <select
              className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="document">Documents</option>
              <option value="audio">Audio / Call Recordings</option>
            </select>
          </div>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={18} className="mr-2" />
            Add Resource
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