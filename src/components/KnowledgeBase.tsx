import React, { useState, useEffect } from 'react';
import { Upload, File, FileText, Video, Link as LinkIcon, Plus, Search, Trash2, Filter, Download, Mic, Play, Clock, Pause, ChevronDown, ChevronUp, X, ExternalLink, Eye, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { KnowledgeItem, CallRecord } from '../types/knowledgeTypes';
import apiClient from '../api/knowledgeClient';

const KnowledgeBase: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadType, setUploadType] = useState<string>('document');
    const [uploadName, setUploadName] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadUrl, setUploadUrl] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<'documents' | 'calls'>('documents');
    const [uploadTags, setUploadTags] = useState<string>('');
    const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
    const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [contactId, setContactId] = useState('');
    const [callDuration, setCallDuration] = useState('');
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

    // Filter knowledge base items based on search and type
    const filteredItems = knowledgeItems.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType = typeFilter === 'all' || item.type === typeFilter;

        return matchesSearch && matchesType;
    });

    // Get icon based on item type
    const getItemIcon = (type: string) => {
        switch (type) {
            case 'document':
                return <FileText size={20} className="text-blue-500" />;
            case 'video':
                return <Video size={20} className="text-red-500" />;
            case 'link':
                return <LinkIcon size={20} className="text-green-500" />;
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

    // Function to get userId from localStorage
    const getUserId = () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            console.log('No userId found in localStorage');
            return null;
        }
        console.log('User ID:', userId);
        return userId;
    };

    // Fetch documents from the backend
    useEffect(() => {
        const fetchDocuments = async () => {
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
                    isPublic: true
                }));
                setKnowledgeItems(documents);

                // Auto-complete onboarding step 7 (Knowledge Base) if documents exist
                if (documents.length > 0) {
                    try {
                        const companyId = localStorage.getItem('companyId');
                        if (companyId) {
                            console.log('🎯 Existing documents found, ensuring onboarding step 7 is completed...');
                            await fetch(
                                `${import.meta.env.VITE_API_URL_ONBOARDING}/onboarding/companies/${companyId}/onboarding/phases/2/steps/7`,
                                {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'completed' })
                                }
                            );
                        }
                    } catch (err) {
                        console.error('Error auto-completing step 7 on mount:', err);
                    }
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
            }
        };

        fetchDocuments();
    }, []);

    // Fetch call records from the backend
    useEffect(() => {
        const fetchCallRecords = async () => {
            try {
                const userId = getUserId();
                if (!userId) {
                    throw new Error('User ID not found');
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

    // Handle form submission
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

            console.log('User ID:', userId);

            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('name', uploadName);
            formData.append('description', uploadDescription);
            formData.append('tags', uploadTags);
            formData.append('uploadedBy', 'Current User');
            formData.append('userId', userId);

            const response = await apiClient.post('/documents/upload', formData);

            console.log('Upload result:', response.data);

            const newItem: KnowledgeItem = {
                id: response.data.document.id,
                name: response.data.document.name,
                description: response.data.document.description,
                type: 'document',
                fileUrl: response.data.document.fileUrl,
                uploadedAt: format(new Date(), 'yyyy-MM-dd'),
                uploadedBy: 'Current User',
                tags: response.data.document.tags,
                usagePercentage: 0,
                isPublic: true
            };

            setKnowledgeItems(prevItems => [...prevItems, newItem]);

            // Auto-complete onboarding step 7 (Knowledge Base) after first document upload
            try {
                const companyId = localStorage.getItem('companyId');
                if (companyId) {
                    console.log('🎯 Auto-completing onboarding step 7 after document upload...');

                    const stepResponse = await fetch(
                        `${import.meta.env.VITE_API_URL_ONBOARDING}/onboarding/companies/${companyId}/onboarding/phases/2/steps/7`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status: 'completed' })
                        }
                    );

                    if (stepResponse.ok) {
                        console.log('✅ Onboarding step 7 marked as completed');

                        // Notify parent component via custom event
                        window.dispatchEvent(new CustomEvent('stepCompleted', {
                            detail: {
                                stepId: 7,
                                phaseId: 2,
                                status: 'completed'
                            }
                        }));
                    } else {
                        console.warn('⚠️ Failed to mark step 7 as completed:', await stepResponse.text());
                    }
                }
            } catch (onboardingError) {
                console.error('❌ Error updating onboarding progress:', onboardingError);
                // Don't fail the upload if onboarding update fails
            }

            // Reset form and close modal
            setUploadName('');
            setUploadDescription('');
            setUploadUrl('');
            setUploadFile(null);
            setUploadTags('');
            setShowUploadModal(false);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('There was an error uploading your file. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle item deletion with improved cleanup
    const handleDelete = async (id: string) => {
        console.log('Attempting to delete item with ID:', id);
        console.log('Active tab:', activeTab);

        try {
            if (activeTab === 'documents') {
                // Log the item being deleted
                const itemToDelete = knowledgeItems.find(item => item.id === id);
                console.log('Document being deleted:', itemToDelete);

                await apiClient.delete(`/documents/${id}`);
                setKnowledgeItems(prevItems => prevItems.filter(item => item.id !== id));
            } else {
                // Log the call being deleted
                const callToDelete = callRecords.find(call => call.id === id);
                console.log('Call recording being deleted:', callToDelete);

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

    // Replace handleDownload with handleView
    const handleView = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
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

    // Handle call recording submission
    const handleCallSubmit = async (e: React.FormEvent) => {
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

            const audioUrl = await createFileUrl(uploadFile);
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

            console.log('Upload result:', response.data);

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

            // Reset form
            setUploadName('');
            setUploadDescription('');
            setUploadFile(null);
            setUploadTags('');
            setShowUploadModal(false);
        } catch (error) {
            console.error('Error uploading call recording:', error);
            alert('There was an error uploading your call recording. Please try again.');
        } finally {
            setIsUploading(false);
        }
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

    // Stop audio playback when switching tabs
    useEffect(() => {
        if (activeTab !== 'calls' && currentAudio) {
            currentAudio.pause();
            setIsPlaying(false);
        }
    }, [activeTab]);

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

    // Ensure the component returns a valid ReactNode
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <button
                    onClick={() => {
                        window.dispatchEvent(
                            new CustomEvent('tabChange', {
                                detail: { tab: 'company-onboarding' },
                            })
                        );
                    }}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    <span>Back to Onboarding</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Knowledge Base</h1>
                <p className="text-gray-600">
                    Upload documentation, videos, links, and call recordings to build your company's knowledge base.
                    The AI will use this information to provide better insights and assistance when handling contacts.
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
                <div className="flex border-b border-gray-100">
                    <button
                        className={`px-6 py-3 text-sm font-medium ${activeTab === 'documents'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('documents')}
                    >
                        <FileText size={16} className="inline mr-2" />
                        Documents & Media
                    </button>
                    <button
                        className={`px-6 py-3 text-sm font-medium ${activeTab === 'calls'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('calls')}
                    >
                        <Mic size={16} className="inline mr-2" />
                        Call Recordings
                    </button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                            placeholder={activeTab === 'documents' ? "Search knowledge base..." : "Search call recordings..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center space-x-4">
                        {activeTab === 'documents' && (
                            <div className="flex items-center space-x-2">
                                <Filter size={18} className="text-gray-500" />
                                <select
                                    className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    <option value="document">Documents</option>
                                    <option value="video">Videos</option>
                                    <option value="link">Links</option>
                                    <option value="audio">Audio</option>
                                </select>
                            </div>
                        )}

                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                            onClick={() => setShowUploadModal(true)}
                        >
                            <Plus size={18} className="mr-2" />
                            {activeTab === 'documents' ? 'Add Resource' : 'Upload Recording'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'documents' ? (
                filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
                            >
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
                                                item.type === 'video' ? 'bg-red-100 text-red-800' :
                                                    item.type === 'audio' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-green-100 text-green-800'
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
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <File size={24} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No resources found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            {searchTerm || typeFilter !== 'all'
                                ? "No resources match your current search or filter. Try adjusting your criteria."
                                : "Your knowledge base is empty. Add documents, videos, or links to get started."}
                        </p>
                        {!searchTerm && typeFilter === 'all' && (
                            <button
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
                                onClick={() => setShowUploadModal(true)}
                            >
                                <Plus size={18} className="mr-2" />
                                Add Your First Resource
                            </button>
                        )}
                    </div>
                )
            ) : (
                <div className="space-y-4">
                    {callRecords.length > 0 ? (
                        callRecords.map((call) => (
                            <div
                                key={call.id}
                                className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
                            >
                                <div className="flex items-start">
                                    <div className="p-3 rounded-lg bg-purple-100 mr-4 flex-shrink-0">
                                        <Mic size={20} className="text-purple-500" />
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                            <h3 className="text-lg font-medium text-gray-900 truncate">{call.contactId}</h3>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
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
                                            {call.date} • {call.duration} minutes
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

                                        {call.processingOptions?.insights && call.aiInsights.length > 0 && (
                                            <div className="bg-gray-50 p-3 rounded-lg mb-3 overflow-hidden">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">AI Insights</h4>
                                                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside overflow-y-auto max-h-40">
                                                    {call.aiInsights.map((insight: string, index: number) => (
                                                        <li key={index} className="break-words">{insight}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 flex-wrap gap-2">
                                                    <button
                                                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                                        onClick={() => togglePlayer(call.id)}
                                                    >
                                                        {showPlayer[call.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        <span className="ml-1">Play Recording</span>
                                                    </button>

                                                    {call.processingOptions?.transcription && (
                                                        <button
                                                            className="flex items-center text-sm text-purple-600 hover:text-purple-800 whitespace-nowrap"
                                                            onClick={() => toggleTranscript(call.id)}
                                                        >
                                                            {showTranscript[call.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                            <span className="ml-1">View Transcript</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {showTranscript[call.id] && (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded-lg overflow-hidden">
                                                        <p className="text-sm text-gray-600 break-words">
                                                            {call.transcriptUrl ? 'Transcript content will appear here...' : 'Generating transcript...'}
                                                        </p>
                                                    </div>
                                                )}

                                                {showPlayer[call.id] && (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <button
                                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors flex-shrink-0"
                                                                onClick={() => handlePlayRecording(call.recordingUrl, call.id)}
                                                                title={playingCallId === call.id && isPlaying ? "Pause" : "Play"}
                                                            >
                                                                {playingCallId === call.id && isPlaying ? (
                                                                    <Pause size={16} />
                                                                ) : (
                                                                    <Play size={16} />
                                                                )}
                                                            </button>

                                                            <div className="flex-1 flex items-center space-x-2 min-w-0">
                                                                <div className="relative flex-1 h-1.5 bg-gray-200 rounded-full">
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max={duration || 100}
                                                                        value={playingCallId === call.id ? currentTime : 0}
                                                                        onChange={(e) => handleTimeChange(Number(e.target.value))}
                                                                        className="absolute w-full h-full opacity-0 cursor-pointer"
                                                                        disabled={!duration}
                                                                        title="Seek"
                                                                    />
                                                                    <div
                                                                        className="absolute h-full bg-blue-600 rounded-full"
                                                                        style={{
                                                                            width: `${duration ?
                                                                                (playingCallId === call.id ? (currentTime / duration) * 100 : 0) : 0}%`
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-gray-500 min-w-[70px] text-right flex-shrink-0">
                                                                    {playingCallId === call.id ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '0:00 / 0:00'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                <Mic size={24} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No call recordings found</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                {searchTerm
                                    ? "No call recordings match your search. Try adjusting your search criteria."
                                    : "Your call recordings library is empty. Upload your first call recording to get started."}
                            </p>
                            {!searchTerm && (
                                <button
                                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
                                    onClick={() => setShowUploadModal(true)}
                                >
                                    <Plus size={18} className="mr-2" />
                                    Upload Your First Recording
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleUploadModalClose}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
                            <form onSubmit={activeTab === 'documents' ? handleSubmit : handleCallSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                                    <div className="flex justify-between items-center mb-5">
                                        <h3 className="text-xl font-semibold text-gray-900" id="modal-title">
                                            {activeTab === 'documents' ? 'Add to Knowledge Base' : 'Upload Call Recording'}
                                        </h3>
                                        <button type="button" onClick={handleUploadModalClose} className="text-gray-400 hover:text-gray-500">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Resource Type Selection */}
                                        {activeTab === 'documents' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {[
                                                        { id: 'document', icon: FileText, label: 'Document' },
                                                        { id: 'video', icon: Video, label: 'Video' },
                                                        { id: 'link', icon: LinkIcon, label: 'Link' },
                                                        { id: 'audio', icon: Mic, label: 'Audio' }
                                                    ].map((type) => (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            onClick={() => setUploadType(type.id)}
                                                            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${uploadType === type.id
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                                                                }`}
                                                        >
                                                            <type.icon size={20} className="mb-2" />
                                                            <span className="text-xs font-medium">{type.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                                placeholder={activeTab === 'documents' ? "Enter a name for this resource" : "Ex: John Doe - Initial Consultation"}
                                                value={uploadName}
                                                onChange={(e) => setUploadName(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                                placeholder="Describe what this resource contains"
                                                rows={3}
                                                value={uploadDescription}
                                                onChange={(e) => setUploadDescription(e.target.value)}
                                                required
                                            />
                                        </div>

                                        {/* Dynamic Input based on Type */}
                                        {uploadType === 'link' && activeTab === 'documents' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                        <LinkIcon size={16} className="text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="url"
                                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                                                        placeholder="https://example.com/resource"
                                                        value={uploadUrl}
                                                        onChange={(e) => setUploadUrl(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                                                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group bg-white"
                                                    onClick={() => document.getElementById('file-upload')?.click()}
                                                >
                                                    <div className="space-y-1 text-center">
                                                        <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                        <div className="flex text-sm text-gray-600 justify-center">
                                                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                                <span>Click to upload</span>
                                                                {/* Hidden input needs to be accessible but custom styled */}
                                                            </label>
                                                            <span className="pl-1">or drag and drop</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {activeTab === 'documents'
                                                                ? (uploadType === 'video' ? "MP4, WebM (max 50MB)" : "PDF, DOCX, TXT, Images")
                                                                : "MP3, WAV, M4A"
                                                            }
                                                        </p>
                                                        {uploadFile && (
                                                            <p className="text-sm font-medium text-green-600 mt-2">
                                                                Selected: {uploadFile.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="file-upload"
                                                        name="file-upload"
                                                        type="file"
                                                        className="sr-only"
                                                        onChange={handleFileChange}
                                                        accept={activeTab === 'documents' ?
                                                            uploadType === 'image' ? "image/*" :
                                                                uploadType === 'video' ? "video/*" : ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" :
                                                            "audio/*"
                                                        }
                                                        required={!uploadFile}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                            <input
                                                type="text"
                                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                                placeholder="sales, technical, product..."
                                                value={uploadTags}
                                                onChange={(e) => setUploadTags(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        <Plus size={18} className="mr-2" />
                                        {isUploading ? 'Uploading...' : 'Add Resource'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={handleUploadModalClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details/Preview Modal */}
            {isModalOpen && selectedItem && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleDetailsModalClose}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-medium text-gray-900" id="modal-title">
                                        {'name' in selectedItem ? selectedItem.name : selectedItem.contactId}
                                    </h3>
                                    <button
                                        onClick={handleDetailsModalClose}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="mt-2">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {'type' in selectedItem ? (
                                            <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${selectedItem.type === 'document' ? 'bg-blue-100 text-blue-800' :
                                                selectedItem.type === 'video' ? 'bg-red-100 text-red-800' :
                                                    selectedItem.type === 'audio' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-green-100 text-green-800'
                                                }`}>
                                                {selectedItem.type.toUpperCase()}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs rounded-full whitespace-nowrap bg-purple-100 text-purple-800">
                                                CALL RECORDING
                                            </span>
                                        )}

                                        {selectedItem.tags.map((tag: string) => (
                                            <span key={tag} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <p className="text-gray-600 mb-6">
                                        {'description' in selectedItem ? selectedItem.description : selectedItem.summary}
                                    </p>

                                    {/* Content Preview area */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 min-h-[200px] flex items-center justify-center">
                                        {'fileUrl' in selectedItem ? (
                                            selectedItem.type === 'image' || selectedItem.fileUrl.match(/\.(jpeg|jpg|gif|png)$/) ? (
                                                <div className="text-center">
                                                    <img src={selectedItem.fileUrl} alt={selectedItem.name} className="max-h-96 mx-auto mb-4" />
                                                    <button
                                                        onClick={() => openInNewTab(selectedItem.fileUrl)}
                                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                                    >
                                                        <ExternalLink size={16} className="mr-2" />
                                                        Open Original
                                                    </button>
                                                </div>
                                            ) : selectedItem.type === 'video' || selectedItem.fileUrl.match(/\.(mp4|webm|ogg)$/) ? (
                                                <div className="w-full">
                                                    <video controls className="w-full max-h-96 rounded-lg">
                                                        <source src={selectedItem.fileUrl} type="video/mp4" />
                                                        Your browser does not support the video tag.
                                                    </video>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                                                    <p className="text-gray-500 mb-4">Preview not available for this file type</p>
                                                    <button
                                                        onClick={() => openInNewTab(selectedItem.fileUrl)}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                                                    >
                                                        <Download size={16} className="mr-2" />
                                                        Download / View
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            // Audio player for call recordings
                                            <div className="w-full" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center p-8 bg-white rounded-full shadow-sm w-24 h-24 mx-auto mb-6">
                                                    <Mic size={40} className="text-purple-600" />
                                                </div>

                                                <div className="max-w-md mx-auto bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <button
                                                            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
                                                            onClick={() => {
                                                                console.log('Playing audio from modal');
                                                                handlePlayRecording(selectedItem.recordingUrl, selectedItem.id);
                                                            }}
                                                        >
                                                            {playingCallId === selectedItem.id && isPlaying ? (
                                                                <Pause size={20} />
                                                            ) : (
                                                                <Play size={20} />
                                                            )}
                                                        </button>

                                                        <div className="flex-1">
                                                            <div className="relative h-2 bg-gray-200 rounded-full cursor-pointer">
                                                                {/* Invisible range input for seeking */}
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max={duration || 100}
                                                                    value={playingCallId === selectedItem.id ? currentTime : 0}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        handleTimeChange(Number(e.target.value));
                                                                    }}
                                                                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                                                                    disabled={!duration || playingCallId !== selectedItem.id}
                                                                />
                                                                {/* Progress Bar */}
                                                                <div
                                                                    className="absolute h-full bg-blue-600 rounded-full"
                                                                    style={{
                                                                        width: `${duration && playingCallId === selectedItem.id
                                                                            ? (currentTime / duration) * 100
                                                                            : 0}%`
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                                                                <span>{playingCallId === selectedItem.id ? formatTime(currentTime) : '0:00'}</span>
                                                                <span>{playingCallId === selectedItem.id ? formatTime(duration) : formatTime(selectedItem.duration * 60)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Insights Section for Calls */}
                                                    {selectedItem.aiInsights && selectedItem.aiInsights.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Key Insights</h4>
                                                            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                                                                {selectedItem.aiInsights.map((insight: string, idx: number) => (
                                                                    <li key={idx} className="break-words">{insight}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 items-center">
                                        <div className="flex items-center">
                                            <Clock size={16} className="mr-2" />
                                            Uploaded {('uploadedAt' in selectedItem) ? selectedItem.uploadedAt : selectedItem.date}
                                        </div>
                                        {/* Add other details as needed */}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={handleDetailsModalClose}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeBase;

