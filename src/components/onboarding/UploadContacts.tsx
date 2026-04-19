import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Edit,
  Phone,
  Mail,
  Globe,
  X,
  ChevronUp,
  ChevronDown,
  UserPlus,
  FileSpreadsheet,
  Cloud,
  Settings,
  CheckCircle,
  Info,
  LogOut,
  AlertTriangle,
  MapPin,
  Calendar
} from 'lucide-react';
import zohoLogo from '../../assets/public/images/zoho-logo.png';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import ZohoService from '../../services/zohoService';

interface Lead {
  _id: string;
  gigId: string;
  userId: string;
  companyId: string;
  Email_1?: string;
  Phone?: string;
  Deal_Name?: string;
  Stage?: string;
  Pipeline?: string;
  updatedAt?: string;
  First_Name?: string;
  Last_Name?: string;
  Address?: string;
  Postal_Code?: string;
  City?: string;
  Date_of_Birth?: string;
  __v?: number;
  _isPlaceholder?: boolean; // Mark for invalid/unprocessed leads
}

interface Gig {
  _id: string;
  title: string;
  companyId: string;
  category?: string;
  description?: string;
}

interface ApiResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Lead[];
}

interface UploadContactsProps {
  onCancelProcessing?: () => void;
  companyId?: string | null;
}

const UploadContacts = React.memo(({ onCancelProcessing, companyId: propCompanyId }: UploadContactsProps) => {
  // Component will render normally - no early return needed

  // Function to cancel processing
  const cancelProcessing = () => {

    // Abort any ongoing OpenAI requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop all processing immediately
    setIsProcessing(false);
    processingRef.current = false;
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    // Reset all processing states
    setProcessingProgress({
      current: 0,
      total: 0,
      status: 'Cancelled by user (Back to Onboarding)',
      isProcessing: false
    });

    // Clear all storage items
    localStorage.removeItem('uploadProcessing');
    localStorage.removeItem('parsedLeads');
    localStorage.removeItem('validationResults');
    sessionStorage.removeItem('uploadProcessing');
    sessionStorage.removeItem('parsedLeads');
    sessionStorage.removeItem('validationResults');

    // Remove processing indicators
    document.body.removeAttribute('data-processing');

    // Reset file-related states
    setSelectedFile(null);
    setParsedLeads([]);
    setValidationResults(null);

    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }


    // Call the parent callback if provided
    if (onCancelProcessing) {
      onCancelProcessing();
    }
  };

  // Emergency cancel function that can be called even during processing
  const emergencyCancel = () => {

    // Force abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Force stop all processing
    processingRef.current = false;
    setIsProcessing(false);

    // Clear all storage immediately
    localStorage.clear();
    sessionStorage.clear();

    // Reset all states
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
    setParsedLeads([]);
    setValidationResults(null);
    setSelectedFile(null);

    // Remove all processing indicators
    document.body.removeAttribute('data-processing');

    // Force reset all progress
    setProcessingProgress({
      current: 0,
      total: 0,
      status: 'EMERGENCY CANCELLED',
      isProcessing: false
    });

  };

  // Expose both cancel functions to parent component
  useEffect(() => {
    // Always expose the cancel function to window for parent access
    (window as any).cancelUploadProcessing = cancelProcessing;
    (window as any).emergencyCancelUpload = emergencyCancel;
    return () => {
      delete (window as any).cancelUploadProcessing;
      delete (window as any).emergencyCancelUpload;
    };
  }, []); // Remove onCancelProcessing dependency to always expose

  // Add a ref to track if the component has been initialized
  const componentInitializedRef = useRef(false);

  // Add a ref to track if we should prevent re-mounting
  const preventRemountRef = useRef(false);

  // Add AbortController for cancelling OpenAI requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<Lead[]>([]);
  const [showSaveButton, setShowSaveButton] = useState(true);
  const [showFileName, setShowFileName] = useState(true);
  const [isSavingLeads, setIsSavingLeads] = useState(false);
  const [savedLeadsCount, setSavedLeadsCount] = useState(0);
  const [recentlySavedLeads, setRecentlySavedLeads] = useState<Lead[]>([]);
  const [gigDropdownOpen, setGigDropdownOpen] = useState(false);
  const gigDropdownRef = useRef<HTMLDivElement>(null);
  const [hasZohoConfig, setHasZohoConfig] = useState(false);
  const [zohoConfig, setZohoConfig] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    companyId: propCompanyId || Cookies.get('companyId') || ''
  });
  const [isImportingZoho, setIsImportingZoho] = useState(false);
  const [isDisconnectingZoho, setIsDisconnectingZoho] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeLeads, setRealtimeLeads] = useState<Lead[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>('');
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [hasZohoAccessToken, setHasZohoAccessToken] = useState(false);
  const [showImportChoiceModal, setShowImportChoiceModal] = useState(false);
  const [selectedImportChoice, setSelectedImportChoice] = useState<'zoho' | 'file' | null>(null);
  const [showLeadsPreview, setShowLeadsPreview] = useState(true);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [editingLeadIndex, setEditingLeadIndex] = useState<number | null>(null);
  const [dataTooLarge, setDataTooLarge] = useState(false);
  const urlParamsProcessedRef = useRef(false);
  const processingRef = useRef(false);
  const dataRestoredRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for progress tracking
  const [processingProgress, setProcessingProgress] = useState<{
    current: number;
    total: number;
    status: string;
    isProcessing: boolean;
  }>({
    current: 0,
    total: 0,
    status: '',
    isProcessing: false
  });

  // Function to update progress

  // Function to reset progress
  const resetProgress = () => {
    setProcessingProgress({
      current: 0,
      total: 0,
      status: '',
      isProcessing: false
    });
  };

  // Function to show processing status
  const showProcessingStatus = (status: string) => {
    setProcessingProgress({
      current: 1,
      total: 1,
      status,
      isProcessing: true
    });
  };

  // Utility function to safely store data in localStorage/sessionStorage
  const safeStorageSet = (key: string, data: any, useSessionStorage = false) => {
    try {
      // Limit data size first, then compress
      const limitedData = limitDataSize(data, 50); // Limit to 50 items for storage
      const compressedData = compressData(limitedData);
      const dataString = JSON.stringify(compressedData);

      // Check data size (1MB limit for localStorage, 3MB for sessionStorage)
      const maxSize = useSessionStorage ? 3 * 1024 * 1024 : 1 * 1024 * 1024;

      if (dataString.length > maxSize) {
        if (useSessionStorage) {
          console.warn(`⚠️ Data for ${key} too large for sessionStorage (${Math.round(dataString.length / 1024 / 1024)}MB)`);
          return false;
        } else {
          console.warn(`⚠️ Data for ${key} too large for localStorage, using sessionStorage`);
          return safeStorageSet(key, data, true);
        }
      }

      if (useSessionStorage) {
        sessionStorage.setItem(key, dataString);
      } else {
        localStorage.setItem(key, dataString);
      }
      return true;
    } catch (error) {
      console.warn(`⚠️ Storage full for ${key}, cleaning up and retrying`);

      // Clean up storage and try again
      cleanupLocalStorage();

      try {
        const limitedData = limitDataSize(data, 25); // Further limit to 25 items
        const compressedData = compressData(limitedData);
        const dataString = JSON.stringify(compressedData);

        if (useSessionStorage) {
          sessionStorage.setItem(key, dataString);
        } else {
          localStorage.setItem(key, dataString);
        }
        return true;
      } catch (retryError) {
        if (useSessionStorage) {
          console.error(`❌ Both localStorage and sessionStorage are full for ${key}`);
          return false;
        } else {
          console.warn(`⚠️ Still full after cleanup, trying sessionStorage for ${key}`);
          return safeStorageSet(key, data, true);
        }
      }
    }
  };

  // Utility function to safely get data from localStorage/sessionStorage
  const safeStorageGet = (key: string) => {
    try {
      // Try localStorage first
      let data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }

      // Try sessionStorage if not found in localStorage
      data = sessionStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      console.error(`❌ Error parsing data for ${key}:`, error);
      return null;
    }
  };

  // Function to compress data before storage
  const compressData = (data: any) => {
    try {
      // Remove unnecessary fields to reduce size
      if (Array.isArray(data)) {
        return data.map(lead => ({
          _id: lead._id,
          gigId: lead.gigId,
          userId: lead.userId,
          companyId: lead.companyId,
          Email_1: lead.Email_1,
          Phone: lead.Phone,
          Deal_Name: lead.Deal_Name,
          Stage: lead.Stage,
          Pipeline: lead.Pipeline,
          updatedAt: lead.updatedAt
        }));
      }
      return data;
    } catch (error) {
      console.error('❌ Error compressing data:', error);
      return data;
    }
  };

  // Function to limit data size for storage
  const limitDataSize = (data: any, maxItems: number = 100) => {
    try {
      if (Array.isArray(data)) {
        // If data is too large, keep only the most recent items
        if (data.length > maxItems) {
          console.warn(`⚠️ Limiting data to ${maxItems} items (was ${data.length})`);
          return data.slice(-maxItems); // Keep last 100 items
        }
      }
      return data;
    } catch (error) {
      console.error('❌ Error limiting data size:', error);
      return data;
    }
  };

  // Function to clean up localStorage when it's full
  const cleanupLocalStorage = () => {
    try {
      // Remove old processing data
      localStorage.removeItem('uploadProcessing');
      sessionStorage.removeItem('uploadProcessing');

      // Keep only essential data, remove large datasets
      const keysToKeep = ['companyOnboardingProgress', 'kycVerificationStepCompleted'];
      const allKeys = Object.keys(localStorage);

      allKeys.forEach(key => {
        if (!keysToKeep.includes(key) && (key.includes('leads') || key.includes('parsed'))) {
          localStorage.removeItem(key);
        }
      });

      // Also clean sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('leads') || key.includes('parsed')) {
          sessionStorage.removeItem(key);
        }
      });

      console.log('🧹 Cleaned up localStorage and sessionStorage to free space');
    } catch (error) {
      console.error('❌ Error cleaning up localStorage:', error);
    }
  };

  // Function to update real progress during OpenAI processing
  const updateRealProgress = (progress: number, status: string) => {
    // Check if processing was cancelled
    if (!processingRef.current) {
      return;
    }

    // Update both progress states immediately - no artificial delays
    setUploadProgress(progress);
    setProcessingProgress({
      current: progress,
      total: 100,
      status,
      isProcessing: true
    });
  };

  // Check if we're currently processing on component mount
  useEffect(() => {
    const isCurrentlyProcessing = localStorage.getItem('uploadProcessing') === 'true';
    const hasSelectedFile = selectedFile !== null;
    const hasParsedLeads = parsedLeads.length > 0;

    // If we have processing state but no file and no leads, clean it up
    if (isCurrentlyProcessing && !hasSelectedFile && !hasParsedLeads) {
      setIsProcessing(false);
      processingRef.current = false;
      localStorage.removeItem('uploadProcessing');
      sessionStorage.removeItem('uploadProcessing');
      return;
    }

    if (isCurrentlyProcessing && (hasSelectedFile || hasParsedLeads)) {
      processingRef.current = true;
      setIsProcessing(true);

      // Prevent any other effects from running during processing
      return () => {
        // Cleanup function to prevent interference
      };
    }

    // Restore parsed leads if they exist and we haven't already restored them
    if (!dataRestoredRef.current && !componentInitializedRef.current) {
      const savedParsedLeads = safeStorageGet('parsedLeads');
      const savedValidationResults = safeStorageGet('validationResults');

      if (savedParsedLeads && !parsedLeads.length) {
        setParsedLeads(savedParsedLeads);
      }

      if (savedValidationResults && !validationResults) {
        setValidationResults(savedValidationResults);
      }

      dataRestoredRef.current = true;
      componentInitializedRef.current = true;
    }
  }, []);

  // Add a protection effect that runs on every render to prevent data loss
  useEffect(() => {
    // If we have parsed leads in state but they're about to be lost, save them
    if (parsedLeads.length > 0) {
      // Only save if data is not too large
      const success = safeStorageSet('parsedLeads', parsedLeads);
      if (!success) {
        console.warn('⚠️ Could not save parsed leads to storage - keeping in memory only');
        // Set a flag to indicate data is only in memory
        setParsedLeads(prev => prev.map(lead => ({ ...lead, _memoryOnly: true })));
      }
    }

    // Ensure cancelProcessing function is always available
    if (!(window as any).cancelUploadProcessing) {
      (window as any).cancelUploadProcessing = cancelProcessing;
    }

    // Ensure emergency cancel function is always available
    if (!(window as any).emergencyCancelUpload) {
      (window as any).emergencyCancelUpload = emergencyCancel;
    }
  });

  // Add a protection effect to prevent component re-mounting
  useEffect(() => {
    // If we have parsed leads, prevent re-mounting
    if (parsedLeads.length > 0 || localStorage.getItem('parsedLeads')) {
      preventRemountRef.current = true;
    }
  }, [parsedLeads.length]);

  // Add a cleanup protection to prevent data loss on unmount
  useEffect(() => {
    return () => {
      // Only save leads if we're not intentionally closing the component
      // Check if this is a manual close (onBackToOnboarding was called)
      const isManualClose = !localStorage.getItem('parsedLeads') && !sessionStorage.getItem('parsedLeads');
      if (parsedLeads.length > 0 && !isManualClose) {
        safeStorageSet('parsedLeads', parsedLeads);
      }
    };
  }, [parsedLeads]);

  // Component will handle cleanup normally without complex flags

  // Clean up processing state when component mounts without file
  useEffect(() => {
    // If no file is selected and no leads are parsed, ensure processing state is clean
    if (!selectedFile && parsedLeads.length === 0) {
      const isCurrentlyProcessing = localStorage.getItem('uploadProcessing') === 'true';
      if (isCurrentlyProcessing) {
        setIsProcessing(false);
        processingRef.current = false;
        localStorage.removeItem('uploadProcessing');
        sessionStorage.removeItem('uploadProcessing');
      }
    }
  }, [selectedFile, parsedLeads.length]);


  const channels = [
    { id: 'all', name: 'All Channels', icon: Globe },
    { id: 'voice', name: 'Voice Calls', icon: Phone }
  ];



  const processFileWithBackend = async (file: File): Promise<{ leads: any[], validation: any }> => {
    try {
      // Check if processing was cancelled
      if (!processingRef.current) {
        throw new Error('Processing cancelled by user');
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const userId = Cookies.get('userId');
      const gigId = selectedGigId;
      const companyId = Cookies.get('companyId');

      if (!gigId) {
        throw new Error('Please select a gig first');
      }

      if (!userId || !companyId) {
        throw new Error('Missing user or company information');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Simple progress update
      updateRealProgress(20, 'Sending file to server...');

      // Send file to backend for processing - optimized request
      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/file-processing/process`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
        // Add headers for better performance
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        let errorMessage = `Backend error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Use status text if we can't parse error
        }
        throw new Error(errorMessage);
      }

      // Parse response immediately
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Backend processing failed');
      }

      const result = data.data;

      if (!result || !result.leads || !Array.isArray(result.leads)) {
        throw new Error('Invalid response format from backend');
      }

      // Add IDs to each lead on the frontend
      const leadsWithIds = result.leads.map((lead: any) => ({
        ...lead,
        userId: { $oid: userId },
        companyId: { $oid: companyId },
        gigId: { $oid: gigId }
      }));

      // Final progress update
      updateRealProgress(100, 'Processing completed!');

      return {
        ...result,
        leads: leadsWithIds
      };

    } catch (error) {
      console.error('❌ Error in processFileWithBackend:', error);
      throw error;
    }
  };




  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if a gig is selected before processing
      if (!selectedGigId) {
        toast.error('Please select a gig first before uploading a file');
        return;
      }

      // Cancel any pending post-save cleanup timer so it doesn't wipe the new file's state
      if ((window as any).__leadCleanupTimer) {
        clearTimeout((window as any).__leadCleanupTimer);
        (window as any).__leadCleanupTimer = null;
      }

      // Store current leads before resetting
      const currentLeads = [...leads];
      const currentFilteredLeads = [...filteredLeads];

      // Reset file processing state only (keep existing leads)
      setUploadError(null);
      setUploadSuccess(false);
      setIsProcessing(true);
      setUploadProgress(10);
      setParsedLeads([]);
      setValidationResults(null);
      setShowSaveButton(true);
      setShowFileName(true);
      setSelectedFile(file);

      // Reset OpenAI processing progress
      resetProgress();

      // Clear ALL localStorage and sessionStorage items
      localStorage.removeItem('parsedLeads');
      localStorage.removeItem('validationResults');
      localStorage.removeItem('uploadProcessing');
      localStorage.removeItem('hasSeenImportChoiceModal');
      sessionStorage.removeItem('uploadProcessing');
      sessionStorage.removeItem('parsedLeads');
      sessionStorage.removeItem('validationResults');

      // Add processing indicator to prevent refresh
      document.body.setAttribute('data-processing', 'true');
      processingRef.current = true;
      localStorage.setItem('uploadProcessing', 'true');
      sessionStorage.setItem('uploadProcessing', 'true');

      try {
        // Check if processing was cancelled before starting
        if (!processingRef.current) {
          return;
        }

        // Process with backend - optimized
        const result = await processFileWithBackend(file);

        if (result.leads.length === 0) {
          toast.error('No valid leads found in the file. Please check the file format and content.');
          setUploadError('No valid leads found');
          setIsProcessing(false);
          setUploadProgress(0);
          return;
        }

        // Show validation results
        if (result.validation) {
          setValidationResults(result.validation);
        }

        setParsedLeads(result.leads);

        // Store results safely - only if not too large
        const leadsStored = safeStorageSet('parsedLeads', result.leads);
        const validationStored = safeStorageSet('validationResults', result.validation);

        if (!leadsStored) {
          console.warn('⚠️ Could not save leads to storage - data too large, keeping in memory only');
          setDataTooLarge(true);
        }
        if (!validationStored) {
          console.warn('⚠️ Could not save validation results to storage - data too large');
        }

        // Restore existing leads after processing
        if (currentLeads.length > 0) {
          setLeads(currentLeads);
          setFilteredLeads(currentFilteredLeads);
        }

        setIsProcessing(false);
        setUploadProgress(100);

        // Remove processing indicator
        document.body.removeAttribute('data-processing');
        processingRef.current = false;
        localStorage.removeItem('uploadProcessing');
        sessionStorage.removeItem('uploadProcessing');

        // Reset file input AFTER processing so the same filename can be re-selected
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        const errorMessage = error.message || 'Error uploading file';
        setUploadError(errorMessage);
        toast.error(errorMessage);
        setUploadProgress(0);
        setIsProcessing(false);
      }
    }
  };

  const toggleChannel = (channelId: string) => {
    if (channelId === 'all') {
      setSelectedChannels(['all']);
      return;
    }

    if (selectedChannels.includes('all')) {
      setSelectedChannels([channelId]);
      return;
    }

    if (selectedChannels.includes(channelId)) {
      const newChannels = selectedChannels.filter(id => id !== channelId);
      setSelectedChannels(newChannels.length === 0 ? ['all'] : newChannels);
    } else {
      setSelectedChannels([...selectedChannels.filter(id => id !== 'all'), channelId]);
    }
  };

  /** Same pattern as TelephonySetup: parent listens for `stepCompleted` to merge progress without a full reload. */
  const notifyUploadContactsStepSynced = async () => {
    const companyId = propCompanyId || Cookies.get("companyId");
    if (!companyId) return;
    try {
      const onboardingResponse = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
      );
      const d = onboardingResponse.data as { completedSteps?: number[]; currentPhase?: number };
      const completedSteps = Array.isArray(d?.completedSteps) ? [...d.completedSteps] : [];
      if (!completedSteps.includes(5)) completedSteps.push(5);
      const phaseId = typeof d?.currentPhase === "number" ? d.currentPhase : 2;
      window.dispatchEvent(
        new CustomEvent("stepCompleted", {
          detail: {
            stepId: 5,
            phaseId,
            status: "completed",
            completedSteps,
          },
        })
      );
    } catch (e) {
      console.error("Failed to sync onboarding UI after Upload Contacts:", e);
      window.dispatchEvent(new Event("refreshOnboardingProgress"));
    }
  };

  const handleSaveLeads = async () => {
    if (!parsedLeads || parsedLeads.length === 0) return;

    // Début de la sauvegarde (séparé du processing)
    setIsSavingLeads(true);
    setSavedLeadsCount(0);
    setRecentlySavedLeads([]);
    setShowSaveButton(false);

    // Utiliser la référence pour suivre l'état de traitement de manière fiable
    processingRef.current = true;

    try {
      // Convert leads to API format
      const currentUserId = Cookies.get('userId');
      const currentGigId = selectedGigId;
      const currentCompanyId = Cookies.get('companyId');

      // Debug: Log the IDs being used for lead saving
      console.log('💾 Saving leads with IDs:');
      console.log(`   currentUserId: ${currentUserId}`);
      console.log(`   currentGigId: ${currentGigId}`);
      console.log(`   currentCompanyId: ${currentCompanyId}`);
      console.log(`   Cookie gigId: ${Cookies.get('gigId')}`);
      console.log(`   selectedGigId: ${selectedGigId}`);

      const leadsForAPI = parsedLeads.map((lead: any) => ({
        userId: lead.userId?.$oid || currentUserId,
        companyId: lead.companyId?.$oid || currentCompanyId,
        gigId: lead.gigId?.$oid || currentGigId,
        Last_Activity_Time: lead.Last_Activity_Time || null,
        Deal_Name: lead.Deal_Name || "Unnamed Lead",
        Email_1: lead.Email_1 || "no-email@placeholder.com",
        Phone: (() => {
          const raw = lead.Phone;
          if (!raw) return "no-phone@placeholder.com";
          const str = String(raw).trim();
          return str.startsWith('+') ? str : `+${str}`;
        })(),
        Stage: lead.Stage || "New",
        Pipeline: lead.Pipeline || "Sales Pipeline",
        Activity_Tag: lead.Activity_Tag || '',
        Telephony: lead.Telephony || '',
        Project_Tags: lead.Project_Tags || [],
        First_Name: lead.First_Name || '',
        Last_Name: lead.Last_Name || '',
        Address: lead.Address || '',
        Postal_Code: lead.Postal_Code || '',
        City: lead.City || '',
        Date_of_Birth: lead.Date_of_Birth || ''
      }));

      // Sauvegarde en masse via le nouvel endpoint
      if (!processingRef.current) {
        throw new Error('Processing cancelled by user');
      }

      // Progression fictive pour montrer que ça travaille
      setUploadProgress(30);

      const response = await axios.post(
        `${import.meta.env.VITE_DASHBOARD_API}/leads/bulk`,
        { leads: leadsForAPI },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentGigId}:${currentUserId}`
          },
          timeout: 60000 // 60 secondes pour le bulk
        }
      );

      setUploadProgress(90);

      if (response.status === 201 || response.status === 207) {
        const responseData = response.data as { count?: number; data?: any[] };
        const savedCount = responseData.count || (responseData.data ? responseData.data.length : 0);

        // Tous les leads ont été sauvegardés (ou tentative faite)
        setUploadSuccess(true);
        setUploadProgress(100);
        toast.success(`Successfully saved ${savedCount} contacts!`);

        // Les leads sont maintenant ajoutés, on peut mettre à jour l'état local si nécessaire
        // Pour l'instant, on se fie au rechargement ou à la réponse
        if (responseData.data && Array.isArray(responseData.data)) {
          const savedData: any[] = responseData.data;
          setRecentlySavedLeads(savedData);
          setLeads(prev => [...prev, ...savedData]);
          setFilteredLeads(prev => [...prev, ...savedData]);
          setTotalCount(prev => prev + savedCount);
          setSavedLeadsCount(savedCount);
        }

        // Les leads ont été ajoutés, effacer les leads parsés
        setParsedLeads([]);

        // Clear validation results immediately after save
        setValidationResults(null);
        localStorage.removeItem('validationResults');
        sessionStorage.removeItem('validationResults');


        // Mettre à jour l'onboarding
        try {
          const companyId = Cookies.get('companyId');
          if (companyId) {
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`,
              { status: 'completed' }
            );

            localStorage.setItem('stepCompleted', JSON.stringify({
              stepId: 5,
              phaseId: 2,
              data: { success: true, leadsSaved: savedCount }
            }));
            await notifyUploadContactsStepSynced();
          }
        } catch (error) {
          console.error('Error updating onboarding progress:', error);
        }

      } else {
        throw new Error(response.statusText || 'Bulk save failed');
      }

    } catch (error: any) {
      console.error('Error in handleSaveLeads:', error);
      const errorMessage = error.message || 'Error saving leads';
      setUploadError(errorMessage);
      toast.error(errorMessage);

    } finally {
      // TOUJOURS réinitialiser l'état, même en cas d'erreur
      setIsSavingLeads(false);
      processingRef.current = false;
      setShowSaveButton(true);
      setShowFileName(true);

      // Store timer so a new upload can cancel it before it wipes the new file's state
      (window as any).__leadCleanupTimer = setTimeout(() => {
        (window as any).__leadCleanupTimer = null;
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadSuccess(false);
        setParsedLeads([]);
        setUploadError(null);
        setValidationResults(null);
        setRecentlySavedLeads([]);

        // Clear storage
        localStorage.removeItem('parsedLeads');
        localStorage.removeItem('validationResults');
        localStorage.removeItem('uploadProcessing');
        sessionStorage.removeItem('uploadProcessing');
        sessionStorage.removeItem('parsedLeads');
        sessionStorage.removeItem('validationResults');

        // Remove processing indicators
        document.body.removeAttribute('data-processing');
        processingRef.current = false;

        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }, 2000);
    }
  };

  // Fonction pour forcer la réinitialisation complète

  const handleZohoConnect = async () => {
    try {
      const userId = Cookies.get('userId');

      if (!userId) {
        console.error('No userId found in cookies');
        toast.error('User ID not found. Please log in again.');
        return;
      }

      const redirectUri = `${import.meta.env.VITE_DASHBOARD_API}/zoho/auth/callback`;
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      const encodedState = encodeURIComponent(userId);

      const authUrl = `${import.meta.env.VITE_DASHBOARD_API}/zoho/auth?redirect_uri=${encodedRedirectUri}&state=${encodedState}`;

      const response = await fetch(authUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${userId}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to get Zoho auth URL');
      }

      const data = await response.json();

      const redirectUrl = new URL(data.authUrl);
      redirectUrl.searchParams.set('state', userId);
      window.location.href = redirectUrl.toString();
    } catch (error) {
      console.error('Error in handleZohoConnect:', error);
      toast.error((error as any)?.message || 'Failed to initiate Zoho authentication');
    }
  };

  const handleZohoDisconnect = async () => {
    // Confirmation dialog
    // const confirmed = window.confirm(
    //   'Are you sure you want to disconnect from Zoho CRM? This will remove all your Zoho configuration and you will need to reconnect to use Zoho features again.'
    // );
    // if (!confirmed) {
    //   return;
    // }

    setIsDisconnectingZoho(true);
    try {
      const userId = Cookies.get('userId');
      const gigId = selectedGigId || Cookies.get('gigId');

      if (!userId) {
        console.error('No userId found in cookies');
        toast.error('User ID not found. Please log in again.');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gigId}:${userId}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to disconnect from Zoho');
      }

      const data = await response.json();

      if (data.success) {
        // Reset Zoho service configuration
        const zohoService = ZohoService.getInstance();
        zohoService.resetConfiguration();

        setHasZohoConfig(false);
        setHasZohoAccessToken(false);

        // Clear any cached Zoho data
        setRealtimeLeads([]);
        setParsedLeads([]);
      } else {
        throw new Error(data.message || 'Failed to disconnect from Zoho');
      }
    } catch (error) {
      console.error('Error in handleZohoDisconnect:', error);
      toast.error((error as any)?.message || 'Failed to disconnect from Zoho');
    } finally {
      setIsDisconnectingZoho(false);
    }
  };

  useEffect(() => {
    // Only run this effect once on mount, not on every render
    const runOnce = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const location = urlParams.get('location');
      const accountsServer = urlParams.get('accounts-server');

      const params = new URLSearchParams(window.location.search);
      // Vérifier si l'URL contient le paramètre startStep=5
      if (params.get('session') === 'someGeneratedSessionId') {

        // Nettoyer l'URL pour éviter de relancer à chaque render
        params.delete('session');
        const newSearch = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`);
      }


      if (code) {
        if (!state) {
          console.error('No state parameter found in URL');
          toast.error('Authentication state not found. Please try connecting again.');
          return;
        }

        handleOAuthCallback(code, state, location || undefined, accountsServer || undefined);
      }
    };

    // Use a ref to ensure this only runs once
    if (!urlParamsProcessedRef.current) {
      urlParamsProcessedRef.current = true;
      runOnce();
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string, location?: string, accountsServer?: string) => {

    try {
      const userId = state || Cookies.get('userId');

      if (!userId) {
        throw new Error('User ID not found in state parameter or cookies');
      }

      const queryParams = new URLSearchParams({
        code,
        state: userId,
        ...(location && { location }),
        ...(accountsServer && { accountsServer })
      }).toString();

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/auth/callback?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedGigId || Cookies.get('gigId')}:${userId}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange code for tokens');
      }

      setHasZohoConfig(true);

    } catch (error: any) {
      console.error('Error handling OAuth callback:', error);
      toast.error(error.message || 'Failed to complete Zoho authentication');
    }
  };

  useEffect(() => {
    // Skip this effect if we're currently processing a file
    if (isProcessing || processingRef.current) {
      return;
    }

  }, [hasZohoConfig, isProcessing]);

  // Ajout d'une fonction utilitaire pour fetch Zoho avec refresh automatique
  const fetchZohoWithAutoRefresh = async (url: string, options: RequestInit = {}, customGigId?: string) => {
    const userId = Cookies.get('userId');
    const gigId = customGigId || selectedGigId || Cookies.get('gigId');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gigId}:${userId}`,
      ...options.headers,
    };
    let response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      // Tenter un refresh automatique du token
      const refreshRes = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/config/user/${userId}/refresh-token`, {
        method: 'POST',
        headers,
      });
      if (refreshRes.ok) {
        // Réessayer la requête initiale
        response = await fetch(url, { ...options, headers });
      } else {
        toast.error('Session Zoho expirée. Veuillez vous reconnecter.');
        throw new Error('Zoho token expired');
      }
    }
    return response;
  };

  // Remplacer tous les fetch vers l'API Zoho par fetchZohoWithAutoRefresh
  // Exemple pour handleImportFromZoho :
  const handleImportFromZoho = async () => {
    if (!selectedGigId) {
      toast.error('Please select a gig first');
      return;
    }
    setIsImportingZoho(true);
    setRealtimeLeads([]);
    try {
      const userId = Cookies.get('userId');
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        toast.error('Configuration de l\'entreprise non trouvée. Veuillez vous reconnecter.');
        return;
      }
      const zohoService = ZohoService.getInstance();
      const accessToken = await zohoService.getValidAccessToken();
      if (!accessToken) {
        toast.error('Configuration Zoho non trouvée. Veuillez configurer Zoho CRM d\'abord.');
        return;
      }
      setParsedLeads([]);
      const selectedGig = gigs.find(gig => gig._id === selectedGigId);
      if (!selectedGig) {
        toast.error('Gig sélectionné non trouvé');
        return;
      }
      const apiUrl = `${import.meta.env.VITE_DASHBOARD_API}/zoho/leads/sync-all`;
      const checkResponse = await fetchZohoWithAutoRefresh(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          companyId: companyId,
          gigId: selectedGigId
        })
      }, selectedGigId);
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => null);
        throw new Error(errorData?.message || `Erreur lors de la synchronisation avec Zoho pour le gig ${selectedGig.title}`);
      }
      const data = await checkResponse.json();
      if (!data.success) {
        throw new Error(data.message || `Erreur lors de la synchronisation pour le gig ${selectedGig.title}`);
      }
      if (!data.data || !Array.isArray(data.data.leads)) {
        setRealtimeLeads([]);
        setParsedLeads([]);
        await fetchLeads(1, '');
        return;
      }
      const leadsFromApi = data.data.leads;
      console.log('📥 Leads importés de Zoho:', leadsFromApi.length, 'leads');
      setRealtimeLeads(leadsFromApi);
      setParsedLeads(leadsFromApi);
      console.log('🔄 Appel fetchLeads après import Zoho');
      await fetchLeads(1, '');

      // Déclencher une mise à jour de l'état d'onboarding pour marquer le step 5 comme complété
      if (leadsFromApi.length > 0) {
        try {
          const companyId = Cookies.get('companyId');
          if (companyId) {
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`,
              { status: 'completed' }
            );
            await notifyUploadContactsStepSynced();
          }
        } catch (error) {
          console.error('Error updating onboarding progress after Zoho import:', error);
        }
      }
    } catch (error: any) {
      console.error('Error in handleImportFromZoho:', error);
      toast.error(error.message || 'Une erreur est survenue lors de l\'importation');
    } finally {
      setIsImportingZoho(false);
    }
  };

  const fetchLeads = async (page = 1, searchQuery = '') => {
    // Skip fetching leads if we're currently processing a file
    if (isProcessing || processingRef.current) {
      return;
    }

    // Also check localStorage for processing state
    if (localStorage.getItem('uploadProcessing') === 'true') {
      return;
    }

    if (!selectedGigId) {
      // Don't clear leads if we have parsed leads from file upload
      if (parsedLeads.length > 0 || localStorage.getItem('parsedLeads')) {
        return;
      }
      // Only clear leads if we're not in the middle of file processing
      if (!processingRef.current && localStorage.getItem('uploadProcessing') !== 'true') {
        setLeads([]);
        setTotalPages(0);
        setCurrentPage(1);
        setTotalCount(0);
      }
      return;
    }

    setIsLoadingLeads(true);
    setError(null);
    try {
      let apiUrl: string;

      if (searchQuery.trim()) {
        // Utiliser l'endpoint de recherche dédié
        apiUrl = `${import.meta.env.VITE_DASHBOARD_API}/leads/gig/${selectedGigId}/search?search=${encodeURIComponent(searchQuery.trim())}`;
        console.log('🔍 Recherche leads avec URL:', apiUrl);
      } else {
        // Utiliser l'endpoint normal avec pagination
        apiUrl = `${import.meta.env.VITE_DASHBOARD_API}/leads/gig/${selectedGigId}?page=${page}&limit=50`;
        console.log('📄 Récupération leads avec URL:', apiUrl);
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${selectedGigId}:${Cookies.get('userId')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }

      const responseData: ApiResponse = await response.json();
      console.log('📊 Réponse API leads:', responseData);

      if (!responseData.success) {
        throw new Error('Failed to fetch leads: API returned unsuccessful response');
      }

      if (!Array.isArray(responseData.data)) {
        throw new Error('Invalid response format: expected data to be an array');
      }

      setLeads(responseData.data);
      setFilteredLeads(responseData.data); // Initialiser les leads filtrés

      // Nettoyer realtimeLeads quand on charge des leads depuis l'API
      // Ne pas effacer parsedLeads si un fichier est en cours de traitement
      if (responseData.data.length > 0 && !processingRef.current) {
        setRealtimeLeads([]);
        setParsedLeads([]);
      }

      if (searchQuery.trim()) {
        // Pour la recherche, afficher tous les résultats sur une seule page
        setTotalPages(1);
        setCurrentPage(1);
        setTotalCount(responseData.data.length);
      } else {
        // Pour la pagination normale
        setTotalPages(responseData.totalPages);
        setCurrentPage(responseData.currentPage);
        setTotalCount(responseData.total);
      }
    } catch (error: unknown) {
      console.error('Error fetching leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leads';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // useEffect pour charger les leads normalement
  useEffect(() => {
    console.log('🔍 useEffect principal - selectedGigId:', selectedGigId, 'isProcessing:', isProcessing, 'parsedLeads:', parsedLeads.length);

    // Skip this effect if we're currently processing a file
    if (isProcessing || processingRef.current) {
      console.log('⏸️ Skipping - processing in progress');
      return;
    }

    // Skip fetchLeads if we have parsed leads waiting to be saved — fetchLeads would wipe them
    if (parsedLeads.length > 0) {
      console.log('⏸️ Skipping fetchLeads - parsedLeads waiting to be saved:', parsedLeads.length);
      return;
    }

    if (selectedGigId) {
      console.log('📡 Chargement des leads pour gigId:', selectedGigId);
      fetchLeads(1, '').catch(error => {
        console.error('Error in useEffect:', error);
        setError('Failed to load leads');
      });
    } else {
      console.log('❌ Pas de selectedGigId, clearing leads');
      // Don't clear leads if we're processing or have parsed leads
      if (processingRef.current || localStorage.getItem('uploadProcessing') === 'true' || sessionStorage.getItem('uploadProcessing') === 'true' || parsedLeads.length > 0) {
        return;
      }
      // Only clear leads if we're not in the middle of file processing
      if (!processingRef.current && localStorage.getItem('uploadProcessing') !== 'true') {
        setLeads([]);
        setTotalPages(0);
        setCurrentPage(1);
      }
    }
  }, [selectedGigId, isProcessing]);

  // useEffect pour recharger les leads après l'import Zoho
  useEffect(() => {
    console.log('🔍 useEffect rechargement - realtimeLeads:', realtimeLeads.length, 'selectedGigId:', selectedGigId, 'isProcessing:', isProcessing);
    // Recharger les leads si on vient de finir l'import Zoho et qu'on a des leads
    if (realtimeLeads.length > 0 && selectedGigId && !isProcessing) {
      console.log('🔄 Rechargement des leads après import Zoho');
      fetchLeads(1, '').catch(error => {
        console.error('Error reloading leads after Zoho import:', error);
      });
    }
  }, [realtimeLeads.length, selectedGigId, isProcessing]);

  // useEffect pour charger les leads au montage du composant
  useEffect(() => {
    console.log('🚀 useEffect montage - selectedGigId:', selectedGigId, 'parsedLeads:', parsedLeads.length, 'realtimeLeads:', realtimeLeads.length);

    // Charger les leads si on a un gigId et qu'on n'a pas encore de leads affichés
    if (selectedGigId && leads.length === 0 && realtimeLeads.length === 0 && !isProcessing) {
      console.log('🔄 Chargement initial des leads');
      fetchLeads(1, '').catch(error => {
        console.error('Error in initial load useEffect:', error);
        setError('Failed to load leads');
      });
    }
  }, []); // Se déclenche seulement au montage

  useEffect(() => {
    // Skip this effect if we're currently processing a file
    if (processingRef.current) {
      return;
    }

    // Component will handle leads display normally

    // If we have parsed leads, don't show empty leads list
    if (parsedLeads.length > 0) {
      return;
    }

    // Also check localStorage for parsed leads
    const savedParsedLeads = localStorage.getItem('parsedLeads');
    if (savedParsedLeads) {
      return;
    }

    // If we have leads in localStorage but not in state, restore them
    if (savedParsedLeads && parsedLeads.length === 0) {
      try {
        const leads = JSON.parse(savedParsedLeads);
        setParsedLeads(leads);
        return;
      } catch (error) {
        console.error('Error restoring parsed leads during render:', error);
      }
    }

    // If we have parsed leads, force the display to show them
    if (parsedLeads.length > 0) {
      return;
    }
  }, [leads, parsedLeads.length]);

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5; // Nombre maximum de pages visibles

    // Si le nombre total de pages est inférieur ou égal au maximum visible, afficher toutes les pages
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => fetchLeads(i)}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${i === currentPage
              ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
              }`}
          >
            {i}
          </button>
        );
      }
      return buttons;
    }

    // Toujours afficher la première page
    buttons.push(
      <button
        key={1}
        onClick={() => fetchLeads(1, searchQuery)}
        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${1 === currentPage
          ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
          }`}
      >
        1
      </button>
    );

    // Calculer les pages à afficher autour de la page courante
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Ajuster si on est proche du début ou de la fin
    if (currentPage <= 3) {
      endPage = Math.min(4, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
    }

    // Ajouter les points de suspension au début si nécessaire
    if (startPage > 2) {
      buttons.push(
        <span key="start-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
          ...
        </span>
      );
    }

    // Ajouter les pages du milieu
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => fetchLeads(i, searchQuery)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${i === currentPage
            ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
            }`}
        >
          {i}
        </button>
      );
    }

    // Ajouter les points de suspension à la fin si nécessaire
    if (endPage < totalPages - 1) {
      buttons.push(
        <span key="end-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
          ...
        </span>
      );
    }

    // Toujours afficher la dernière page si elle existe et est différente de la première
    if (totalPages > 1) {
      buttons.push(
        <button
          key={totalPages}
          onClick={() => fetchLeads(totalPages, searchQuery)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-black rounded-xl transition-all duration-300 ${totalPages === currentPage
            ? 'z-10 bg-gradient-harx text-white shadow-lg shadow-harx-500/20'
            : 'text-gray-900 ring-1 ring-inset ring-gray-200 hover:bg-harx-50 hover:text-harx-600'
            }`}
        >
          {totalPages}
        </button>
      );

    }

    return buttons;
  };

  const fetchGigs = async () => {
    setIsLoadingGigs(true);
    try {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        throw new Error('Company ID not found in cookies');
      }

      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${selectedGigId || Cookies.get('gigId')}:${Cookies.get('userId')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gigs');
      }

      const data = await response.json();

      if (data.data) {
        setGigs(data.data);
        // Set the first gig as selected by default if available
        if (data.data.length > 0) {
          setSelectedGigId(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching gigs:', error);
      toast.error('Failed to load gigs');
    } finally {
      setIsLoadingGigs(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, []);


  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.zohoConnected) {
        setHasZohoConfig(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const checkZohoConfig = async () => {
      const zohoService = ZohoService.getInstance();
      const isConfigured = zohoService.isConfigured();
      setHasZohoAccessToken(isConfigured);
      setHasZohoConfig(isConfigured);
    };
    checkZohoConfig();
  }, []);

  // Show import choice modal on first visit - DISABLED
  useEffect(() => {
    // Modal disabled - always mark as seen
    localStorage.setItem('hasSeenImportChoiceModal', 'true');
    setShowImportChoiceModal(false);
  }, []);




  const handleEditLead = (index: number, field: string, value: string) => {
    const newLeads = [...parsedLeads];
    newLeads[index] = { ...newLeads[index], [field]: value };
    setParsedLeads(newLeads);
  };

  // Fonction de filtrage des leads - maintenant déclenche une recherche API
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // Annuler le timeout précédent s'il existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Délai pour éviter trop d'appels API pendant la frappe
    searchTimeoutRef.current = setTimeout(async () => {
      // Si on a une requête de recherche, récupérer tous les résultats
      if (query.trim()) {
        await fetchLeads(1, query); // Récupérer tous les résultats de recherche
      } else {
        // Si pas de recherche, recharger les leads normaux avec pagination
        await fetchLeads(1);
      }
    }, 500); // 500ms de délai
  };

  // Fonction de filtrage par statut (local uniquement)
  const filterLeadsByStatus = (leads: Lead[], status: string) => {
    if (status === 'all') return leads;

    return leads.filter(lead => {
      if (status === 'active') {
        return lead.Stage !== 'Closed';
      } else if (status === 'inactive') {
        return lead.Stage === 'Closed';
      }
      return true;
    });
  };

  // Effet pour filtrer les leads par statut seulement (la recherche est gérée par l'API)
  useEffect(() => {
    const filtered = filterLeadsByStatus(leads, filterStatus);
    setFilteredLeads(filtered);
  }, [leads, filterStatus]);

  const handleCancelModal = () => {
    localStorage.setItem('hasSeenImportChoiceModal', 'true');
    setShowImportChoiceModal(false);
    setSelectedImportChoice(null);
  };



  return (
    <div className="w-full py-2 space-y-4 animate-in fade-in duration-500">
      {/* Header Area - Branded Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-harx p-6 mb-3 shadow-lg shadow-harx-500/20">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  Upload Contacts
                </h2>
                <p className="text-[16px] font-medium text-white/90">Import, manage, and organize your leads efficiently with AI precision.</p>
              </div>
            </div>
          </div>
        </div>
        {/* Abstract background pattern */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
      </div>




      {/* Gigs Selection Dropdown */}
      <div className="bg-white rounded-3xl shadow-xl border border-harx-100 p-6 transition-all duration-300">
        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center tracking-tight">
          <Settings className="mr-3 h-6 w-6 text-harx-500" />
          Select a Gig
        </h4>
        {isLoadingGigs ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-harx-500"></div>
            <span className="ml-4 text-lg text-gray-600 font-semibold">Loading gigs...</span>
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="mx-auto h-20 w-20 text-gray-300 mb-6">
              <Settings className="h-20 w-20" />
            </div>
            <p className="text-xl text-gray-500 font-bold">No gigs available.</p>
          </div>
        ) : (
          <div className="max-w-2xl relative" ref={gigDropdownRef}>
            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setGigDropdownOpen(prev => !prev)}
              className={`w-full flex items-center justify-between gap-4 rounded-2xl border-2 py-5 px-6 text-lg font-bold shadow-lg transition-all duration-300 focus:outline-none ${gigDropdownOpen
                ? 'border-harx-500 bg-harx-50 ring-4 ring-harx-500/10'
                : 'border-harx-100 bg-white hover:border-harx-400 hover:shadow-xl'
                }`}
            >

              <span className="flex items-center gap-4 min-w-0">
                <span className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${selectedGigId ? 'bg-gradient-harx text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                  <Settings className="w-5 h-5" />
                </span>
                <span className={`truncate text-xl ${selectedGigId ? 'text-gray-900' : 'text-gray-400'
                  }`}>

                  {selectedGigId
                    ? gigs.find(g => g._id === selectedGigId)?.title ?? 'Select a gig…'
                    : 'Select a gig…'}
                </span>
              </span>
              <ChevronDown
                className={`flex-shrink-0 w-6 h-6 text-gray-400 transition-transform duration-300 ${gigDropdownOpen ? 'rotate-180 text-harx-500' : ''
                  }`}
              />

            </button>

            {/* Dropdown panel */}
            {gigDropdownOpen && (
              <div
                className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                style={{ animation: 'fadeSlideDown 0.15s ease' }}
              >
                {/* Header row */}
                <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Available Gigs</p>
                </div>


                {/* Options list */}
                <ul className="py-2 max-h-64 overflow-y-auto">
                  {gigs.map((gig, idx) => {
                    const isSelected = gig._id === selectedGigId;
                    return (
                      <li key={gig._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGigId(gig._id);
                            setGigDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-4 px-6 py-4 text-base font-bold transition-all duration-200 ${isSelected
                            ? 'bg-gradient-harx text-white shadow-lg'
                            : 'text-gray-700 hover:bg-harx-50 hover:text-harx-600'
                            }`}
                        >
                          {/* Colored index badge */}
                          <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isSelected ? 'bg-white text-harx-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {idx + 1}
                          </span>


                          {/* Gig info */}
                          <span className="flex-1 text-left truncate">{gig.title}</span>

                          {/* Category badge */}
                          {gig.category && (
                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {gig.category}
                            </span>
                          )}

                          {/* Check mark */}
                          {isSelected && (
                            <span className="flex-shrink-0 text-white">
                              <CheckCircle className="w-5 h-5" />
                            </span>
                          )}

                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Click-outside handler */}
            {gigDropdownOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setGigDropdownOpen(false)}
              />
            )}

            {/* Inline keyframe for the dropdown animation */}
            <style>{`
              @keyframes fadeSlideDown {
                from { opacity: 0; transform: translateY(-6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Import Methods Section */}
      <div className="bg-white rounded-3xl shadow-xl border border-harx-100 p-8">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center tracking-tight">
            <Cloud className="mr-3 h-7 w-7 text-harx-500" />
            Import Leads
          </h3>
          <p className="mt-2 text-lg text-gray-600">Choose your preferred method to import leads into your selected gig.</p>
        </div>

        {/* Import Methods Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Zoho Import Card - DISABLED FOR NOW */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-3xl p-8 flex flex-col h-full grayscale opacity-60 pointer-events-none relative overflow-hidden group">
            {/* Overlay to ensure it's not clickable and shows disabled cursor */}
            <div className="absolute inset-0 z-10 cursor-not-allowed" title="Zoho CRM Integration is currently disabled" />
            {/* Header */}
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mr-6 border-2 border-gray-100 shadow-sm relative z-20">
                <img
                  src={zohoLogo}
                  alt="Zoho CRM"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div className="flex-1 relative z-20">
                <h4 className="text-2xl font-bold text-gray-900">Zoho CRM Integration</h4>
                <p className="text-base text-gray-600 font-medium">Connect and sync with your Zoho CRM</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="mb-6 relative z-20">
              {hasZohoAccessToken ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-base font-bold text-emerald-800 flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" /> Connected to Zoho CRM
                  </span>
                  <button
                    onClick={handleZohoDisconnect}
                    disabled={isDisconnectingZoho}
                    className="px-4 py-2 text-sm font-bold text-red-700 bg-red-100/50 hover:bg-red-200 rounded-xl transition-all duration-300 disabled:opacity-50"
                  >
                    {isDisconnectingZoho ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <span className="text-base font-bold text-amber-800 flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" /> Not connected
                  </span>
                  <button
                    onClick={handleZohoConnect}
                    className="px-4 py-2 text-sm font-bold text-harx-700 bg-harx-100/50 hover:bg-harx-200 rounded-xl transition-all duration-300"
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>

            {/* Action Button - Pushed to bottom */}
            <div className="mt-auto relative z-20">
              <button
                onClick={async () => {
                  if (!selectedGigId) {
                    toast.error('Please select a gig first');
                    return;
                  }
                  await handleImportFromZoho();
                }}
                disabled={!hasZohoAccessToken || isImportingZoho}
                className="w-full bg-gray-200 text-gray-500 font-black py-5 px-8 rounded-2xl transition-all duration-500"
              >
                {isImportingZoho ? (
                  <>
                    <RefreshCw className="mr-3 h-6 w-6 animate-spin" />
                    Importing from Zoho...
                  </>
                ) : !hasZohoAccessToken ? (
                  <>
                    Connect to Zoho CRM First
                  </>
                ) : (
                  <>
                    Sync with Zoho CRM
                  </>
                )}
              </button>
            </div>
          </div>

          {/* File Upload Card */}
          <div className="bg-gradient-to-br from-harx-50/50 to-harx-100/30 border-2 border-harx-100 rounded-3xl p-8 hover:border-harx-300 hover:shadow-2xl hover:shadow-harx-500/10 transition-all duration-500 group relative overflow-hidden" data-file-upload>
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-harx-100/50 rounded-full blur-3xl group-hover:bg-harx-200 transition-colors duration-700"></div>
            {/* Header */}
            <div className="flex items-center mb-6 relative z-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mr-6 border-2 border-harx-100 shadow-sm transition-transform duration-500 group-hover:scale-110">
                <FileSpreadsheet className="h-8 w-8 text-harx-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-gray-900">File Upload</h4>
                <p className="text-base text-gray-600 font-medium">Upload and process contact files</p>
              </div>
            </div>

            {/* File Info */}
            <div className="mb-6 relative z-10">
              <div className="bg-white/80 backdrop-blur-sm border border-harx-100 rounded-xl p-4 flex items-center transition-all duration-300 group-hover:border-harx-200">
                <div className="w-2 h-2 rounded-full bg-harx-500 mr-3 animate-ping"></div>
                <span className="text-base font-bold text-harx-800">Supported: CSV, Excel (XLSX, XLS)</span>
              </div>
            </div>

            {/* Upload Button - Pushed to bottom */}
            <div className="mt-auto relative z-10">
              <div className="w-full bg-gradient-harx text-white font-black py-5 px-8 rounded-2xl hover:brightness-110 transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-harx-500/30 cursor-pointer flex items-center justify-center">
                <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center w-full">
                  <FileSpreadsheet className="h-6 w-6 mr-3 text-white" />
                  <span className="text-lg">
                    {isProcessing ? (
                      <div className="flex items-center font-black">
                        <RefreshCw className="mr-3 h-6 w-6 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Click to upload or drag & drop'
                    )}
                  </span>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>


        {/* File Processing Results */}
        {selectedFile && showFileName && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900">{selectedFile.name}</span>
              </div>
              <button onClick={() => {
                setSelectedFile(null);
                setUploadProgress(0);
                setUploadError(null);
                setUploadSuccess(false);
                setParsedLeads([]);
                setValidationResults(null);
              }}>
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <div className="h-4 rounded-full bg-gray-200 overflow-hidden shadow-inner">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 shadow-lg ${uploadError ? 'bg-gradient-to-r from-red-500 to-red-600' : uploadSuccess ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-harx'
                      }`}
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {isProcessing && !uploadError && !uploadSuccess
                    ? `Analyse en cours... ${uploadProgress}%`
                    : uploadProgress > 0 ? `${uploadProgress}% terminé` : 'Prêt'
                  }
                </span>
                <span>{Math.round(selectedFile.size / 1024)} KB</span>
              </div>

              {/* Real-time Progress Status for OpenAI Processing */}
              {isProcessing && !uploadError && !uploadSuccess && (
                <div className="mt-6 p-6 bg-harx-50/50 border border-harx-100 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-harx-100 rounded-full blur-2xl animate-pulse"></div>
                  <div className="flex items-center justify-between text-base relative z-10">
                    <span className="text-harx-700 font-bold tracking-tight">
                      {processingProgress.status || 'AI Orchestrator at work...'}
                    </span>
                  </div>

                  {/* Animated activity indicator */}
                  <div className="mt-6 flex items-center space-x-3 relative z-10">
                    <div className="flex space-x-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-3 h-3 bg-harx-500 rounded-full animate-bounce"
                          style={{
                            animationDelay: `${i * 0.15}s`,
                            animationDuration: '0.6s'
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-base text-harx-600 font-bold ml-2">Syncing database...</span>
                  </div>
                </div>
              )}
            </div>


            {uploadError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                File uploaded successfully!
              </div>
            )}
            {parsedLeads.length > 0 && !uploadSuccess && !isProcessing && showSaveButton && (
              <div className="mt-4 space-y-4">
                {validationResults && (
                  <div className="bg-gradient-to-r from-harx-50 to-harx-100/50 border border-harx-100 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-harx-900 mb-4 flex items-center tracking-tight">
                      <Info className="mr-3 h-5 w-5 text-harx-500" />
                      AI Processing Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-6 text-base">
                      <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-harx-100">
                        <span className="text-gray-500 font-bold block text-xs uppercase tracking-widest mb-1">Total Found</span> 
                        <span className="text-xl font-black text-gray-900">{validationResults.totalRows}</span>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-harx-100">
                        <span className="text-emerald-600 font-bold block text-xs uppercase tracking-widest mb-1">Verified</span> 
                        <span className="text-xl font-black text-emerald-700">{validationResults.validRows > 0 ? validationResults.validRows : parsedLeads.length}</span>
                      </div>
                      {validationResults.invalidRows > 0 && (
                        <div className="col-span-2 bg-red-50 p-3 rounded-xl border border-red-100">
                          <span className="text-red-500 font-bold block text-xs uppercase tracking-widest mb-1">Requiring Attention</span> 
                          <span className="text-xl font-black text-red-700">{validationResults.invalidRows}</span>
                        </div>
                      )}
                    </div>


                    {validationResults.errors && validationResults.errors.length > 0 && (
                      <div className="mt-4">
                        <details className="text-sm group">
                          <summary className="cursor-pointer text-harx-600 hover:text-harx-800 font-bold flex items-center transition-colors duration-300">
                            <span className="bg-harx-100 px-2 py-0.5 rounded-lg mr-2 group-hover:bg-harx-200">View Details</span>
                            ({validationResults.errors.length} issues identified)
                          </summary>
                          <div className="mt-3 space-y-2">
                            {validationResults.errors.map((error: string, index: number) => (
                              <div key={index} className="text-red-700 bg-red-50/80 backdrop-blur-sm p-3 rounded-xl border border-red-100 text-xs font-semibold">
                                • {error}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>

                )}

                {/* Preview Section */}
                <div className="bg-white border border-harx-100 rounded-3xl p-6 shadow-lg shadow-harx-500/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-harx-50 flex items-center justify-center mr-3">
                        <CheckCircle className="h-5 w-5 text-harx-500" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 tracking-tight">
                        Confirm & Edit Leads <span className="text-harx-500 ml-1">({parsedLeads.length})</span>
                      </h4>
                      {dataTooLarge && (
                        <span className="ml-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-black bg-amber-100 text-amber-800 uppercase tracking-tighter shadow-sm">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Memory Only
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setShowLeadsPreview(!showLeadsPreview)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                      title={showLeadsPreview ? "Hide leads preview" : "Show leads preview"}
                    >
                      {showLeadsPreview ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {showLeadsPreview && (
                    <>
                      <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">Review and edit your leads before saving. Click the edit icon to modify any field to ensure data integrity.</p>
                      <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-4">
                          {(parsedLeads || []).map((lead: any, index: number) => lead && (
                            <div key={lead._id || `parsed-${index}`} className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 hover:border-harx-200 hover:bg-white transition-all duration-300 group">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:border-harx-100">
                                    <span className="text-sm font-black text-harx-600">{index + 1}</span>
                                  </div>
                                  <span className="text-base font-bold text-gray-900 group-hover:text-harx-700 transition-colors duration-300">
                                    {lead.Deal_Name || 'Unnamed Lead'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setEditingLeadIndex(editingLeadIndex === index ? null : index)}
                                    className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-harx-600 hover:border-harx-200 hover:shadow-md transition-all duration-300"
                                    title="Edit lead"
                                  >
                                    <Edit className="h-4.5 w-4.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newLeads = [...parsedLeads];
                                      newLeads.splice(index, 1);
                                      setParsedLeads(newLeads);
                                    }}
                                    className="p-2.5 rounded-xl bg-white border border-gray-100 text-red-300 hover:text-red-500 hover:border-red-100 hover:shadow-md transition-all duration-300"
                                    title="Delete lead"
                                  >
                                    <Trash2 className="h-4.5 w-4.5" />
                                  </button>
                                </div>
                              </div>


                              {editingLeadIndex === index ? (
                                <div className="space-y-3 bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                                    <input
                                      type="text"
                                      value={lead.First_Name || ''}
                                      onChange={(e) => handleEditLead(index, 'First_Name', e.target.value)}
                                      placeholder="Enter first name"
                                      className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Last Name</label>
                                    <input
                                      type="text"
                                      value={lead.Last_Name || ''}
                                      onChange={(e) => handleEditLead(index, 'Last_Name', e.target.value)}
                                      placeholder="Enter last name"
                                      className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                    <input
                                      type="email"
                                      value={lead.Email_1 || ''}
                                      onChange={(e) => handleEditLead(index, 'Email_1', e.target.value)}
                                      placeholder="Enter email address"
                                      className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                                    <input
                                      type="tel"
                                      value={lead.Phone || ''}
                                      onChange={(e) => handleEditLead(index, 'Phone', e.target.value)}
                                      placeholder="Enter phone number"
                                      className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                                    <input
                                      type="text"
                                      value={lead.Address || ''}
                                      onChange={(e) => handleEditLead(index, 'Address', e.target.value)}
                                      placeholder="Enter address"
                                      className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-2">Postal Code</label>
                                      <input
                                        type="text"
                                        value={lead.Postal_Code || ''}
                                        onChange={(e) => handleEditLead(index, 'Postal_Code', e.target.value)}
                                        placeholder="Zip code"
                                        className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                                      <input
                                        type="text"
                                        value={lead.City || ''}
                                        onChange={(e) => handleEditLead(index, 'City', e.target.value)}
                                        placeholder="City"
                                        className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                                    <input
                                      type="text"
                                      value={lead.Date_of_Birth || ''}
                                      onChange={(e) => handleEditLead(index, 'Date_of_Birth', e.target.value)}
                                      placeholder="DD/MM/YYYY"
                                      className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500 transition-all duration-300 bg-white shadow-sm"
                                    />
                                  </div>

                                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                    <button
                                      onClick={() => setEditingLeadIndex(null)}
                                      className="px-6 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 border border-gray-200"
                                    >
                                      Discard
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingLeadIndex(null);
                                      }}
                                      className="px-6 py-2 text-sm font-black text-white bg-gradient-harx rounded-xl hover:brightness-110 transition-all duration-300 shadow-md shadow-harx-500/20"
                                    >
                                      Confirm Changes
                                    </button>
                                  </div>

                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600 truncate">
                                      <span className="font-medium">Email:</span> {lead.Email_1 || 'No email'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      <span className="font-medium">Phone:</span> {lead.Phone || 'No phone'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600 truncate">
                                      <span className="font-medium">Adresse:</span> {lead.City || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      <span className="font-medium">DOB:</span> {lead.Date_of_Birth || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  className="w-full rounded-2xl bg-gradient-harx p-5 text-white font-black text-lg hover:brightness-110 disabled:opacity-50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-harx-500/30 flex items-center justify-center group"
                  onClick={handleSaveLeads}
                  disabled={isSavingLeads}
                >
                  <div className="flex items-center justify-center">
                    <UserPlus className="mr-3 h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
                    Save {parsedLeads.length} Contacts to Database
                  </div>
                </button>


                {/* Bouton de sauvegarde séparé qui apparaît pendant la sauvegarde */}
                {isSavingLeads && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <RefreshCw className="mr-3 h-5 w-5 text-green-600 animate-spin" />
                          <div>
                            <h4 className="text-sm font-semibold text-green-800">Saving Contacts...</h4>
                            <p className="text-xs text-green-600">
                              {savedLeadsCount} of {parsedLeads.length} contacts saved
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-700">{Math.round((savedLeadsCount / parsedLeads.length) * 100)}%</div>
                          <div className="w-16 h-2 bg-green-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                              style={{ width: `${(savedLeadsCount / parsedLeads.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-white font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      disabled
                    >
                      <div className="flex items-center justify-center">
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Saving {savedLeadsCount}/{parsedLeads.length} Contacts...
                      </div>
                    </button>
                  </div>
                )}


              </div>
            )}
          </div>
        )}
      </div>

      {/* Channel Filter */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Globe className="mr-2 h-5 w-5 text-blue-600" />
          Channel Filter
        </h3>
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);

            return (
              <button
                key={channel.id}
                className={`flex items-center space-x-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 transform hover:scale-105 ${isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }`}
                onClick={() => toggleChannel(channel.id)}
              >
                <Icon className="h-4 w-4" />
                <span>{channel.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-600" />
                Leads List
              </h3>
              <div className="mt-2">
                {selectedGigId ? (
                  <div className="text-sm text-gray-600">
                    {parsedLeads.length > 0 ? (
                      <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                        {isSavingLeads
                          ? `Saving ${savedLeadsCount}/${parsedLeads.length + savedLeadsCount} contacts...`
                          : `${parsedLeads.length} leads ready to save`}
                      </span>
                    ) : leads.length > 0 ? (
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                        Showing {filteredLeads.length} of {totalCount} leads {searchQuery && `(filtered by "${searchQuery}")`}
                      </span>
                    ) : (
                      <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                        No leads found
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Please select a gig to view leads</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 pl-10 focus:border-blue-600 focus:ring-blue-600 sm:text-sm shadow-sm"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-600 focus:outline-none focus:ring-blue-600 sm:text-sm shadow-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active (Not Closed)</option>
                <option value="inactive">Inactive (Closed)</option>
              </select>
              <button
                onClick={() => {
                  setSearchQuery('');
                  fetchLeads(1);
                }}
                className="flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                disabled={isLoadingLeads || !selectedGigId}
              >
                {isLoadingLeads ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        {/* Tableau d'affichage des leads */}
        <div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            <div className="relative">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm text-center">
                  <tr>
                    <th scope="col" className="w-[10%] px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 truncate">
                      Nom
                    </th>
                    <th scope="col" className="w-[10%] px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 truncate">
                      Prénom
                    </th>
                    <th scope="col" className="w-[22%] px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 truncate">
                      Email
                    </th>
                    <th scope="col" className="w-[22%] px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 truncate">
                      Adresse
                    </th>
                    <th scope="col" className="w-[14%] px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 truncate">
                      Ville
                    </th>
                    <th scope="col" className="w-[10%] px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 truncate">
                      Code Postal
                    </th>
                    <th scope="col" className="w-[12%] px-2 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 truncate">
                      Mobile
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {error ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-red-500">
                        {error}
                      </td>
                    </tr>
                  ) : isLoadingLeads ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                          Loading leads...
                        </div>
                      </td>
                    </tr>
                  ) : (filteredLeads && filteredLeads.length > 0) ? (
                    filteredLeads.map((lead, index) => lead && (
                      <tr key={lead._id || `filtered-${index}`} className={`hover:bg-gray-50 transition-colors duration-150 text-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${(lead as any)._isPlaceholder ? 'opacity-75 border-l-4 border-orange-400' : ''}`}>
                        <td className="px-2 py-4 text-sm text-gray-900 border-r border-gray-100 truncate max-w-0">
                          {lead.Last_Name || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-900 border-r border-gray-100 truncate max-w-0">
                          {lead.First_Name || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm italic text-blue-600 border-r border-gray-100 truncate max-w-0">
                          {lead.Email_1 || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-600 border-r border-gray-100 truncate max-w-0">
                          {lead.Address || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-600 border-r border-gray-100 truncate max-w-0">
                          {lead.City || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-600 border-r border-gray-100 truncate max-w-0">
                          {lead.Postal_Code || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm font-semibold text-gray-900 truncate max-w-0">
                          {lead.Phone || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (realtimeLeads && realtimeLeads.length > 0) ? (
                    realtimeLeads.map((lead, index) => lead && (
                      <tr key={lead._id || `realtime-${index}`} className={`hover:bg-gray-50 transition-colors duration-150 text-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-2 py-4 text-sm text-gray-900 border-r border-gray-100 truncate max-w-0">
                          {lead.Last_Name || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-900 border-r border-gray-100 truncate max-w-0">
                          {lead.First_Name || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm italic text-blue-600 border-r border-gray-100 truncate max-w-0">
                          {lead.Email_1 || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-600 border-r border-gray-100 truncate max-w-0">
                          {lead.Address || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-600 border-r border-gray-100 truncate max-w-0">
                          {lead.City || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-600 border-r border-gray-100 truncate max-w-0">
                          {lead.Postal_Code || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm font-semibold text-gray-900 truncate max-w-0">
                          {lead.Phone || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center py-8">
                          <FileText className="h-12 w-12 text-gray-300 mb-2" />
                          <p>No leads found</p>
                          <p className="text-xs text-gray-400 mt-1">Try importing some leads or check your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Pagination Controls */}
        {(filteredLeads.length > 0 || realtimeLeads.length > 0) && (
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  {searchQuery ? (
                    // Mode recherche : afficher tous les résultats
                    <>
                      Showing <span className="font-medium">{filteredLeads.length}</span> results for "{searchQuery}"
                    </>
                  ) : (
                    // Mode normal : afficher avec pagination
                    <>
                      Showing <span className="font-medium">{filteredLeads.length > 0 ? filteredLeads.length : realtimeLeads.length}</span> of{' '}
                      <span className="font-medium">{totalCount > 0 ? totalCount : realtimeLeads.length}</span> leads
                    </>
                  )}
                </span>
              </div>

              {/* Pagination Buttons - seulement si pas en mode recherche */}
              {!searchQuery && totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchLeads(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex items-center space-x-1">
                    {renderPaginationButtons()}
                  </div>

                  <button
                    onClick={() => fetchLeads(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ajout d'une section pour afficher les leads en temps réel */}
      {realtimeLeads.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
            <RefreshCw className="mr-2 h-5 w-5 text-blue-600 animate-spin" />
            Leads en temps réel
          </h3>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-blue-700">
              Nombre de leads reçus: <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">{realtimeLeads.length}</span>
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
                <div className="grid grid-cols-3 px-6 py-3">
                  <div className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Email</div>
                  <div className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Téléphone</div>
                  <div className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Lead</div>
                </div>
              </div>
              <div className="bg-white divide-y divide-gray-100">
                {(realtimeLeads || []).map((lead, index) => lead && (
                  <div key={lead._id || index} className="grid grid-cols-3 px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="text-sm font-medium text-gray-900">{lead.Email_1 || 'N/A'}</div>
                    <div className="text-sm text-gray-700">{lead.Phone || 'N/A'}</div>
                    <div className="text-sm text-gray-700">{lead.Deal_Name || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Choice Modal */}
      {showImportChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md transform rounded-lg bg-white p-6 text-left shadow-xl transition-all">
            <div className="absolute right-4 top-4">
              <button
                onClick={handleCancelModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Cloud className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Choose your import method
              </h3>
              <p className="mb-6 text-sm text-gray-600">
                You can import your leads using <b>Zoho CRM</b> or by uploading an <b>Excel/CSV file</b>.<br />
                Click Next to continue.
              </p>
            </div>
            <div className="mt-6 flex justify-between space-x-3">
              <button
                onClick={handleCancelModal}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('hasSeenImportChoiceModal', 'true');
                  setShowImportChoiceModal(false);
                }}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// cooment
export default UploadContacts;