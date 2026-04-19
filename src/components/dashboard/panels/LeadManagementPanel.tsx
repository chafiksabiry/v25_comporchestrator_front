import React, { useState, useEffect, useRef } from "react";
import { LeadsTableSkeleton } from "../components/common/Skeleton";
import {
  Users,
  Search,
  TicketCheck,
  Edit,
  Upload,
  Phone,
  Mail,
  Settings,
  FileSpreadsheet,
  Globe,
  RefreshCw,
  UserPlus,
  FileText,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  CheckCircle,
  Info,
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import axios from 'axios';

const dashboardApiUrl = import.meta.env.VITE_DASHBOARD_API || 'https://api-dashboard.harx.ai/api';
// Fallback if the environment variable incorrectly points to the frontend itself
const getDashboardApiUrl = () => {
  const envUrl = import.meta.env.VITE_DASHBOARD_API;
  if (!envUrl || envUrl.includes('harxv25dashboardfrontend.netlify.app')) {
    return 'https://api-dashboard.harx.ai/api';
  }
  return envUrl;
};

const FINAL_DASHBOARD_API = getDashboardApiUrl();
const zohoApiUrl = import.meta.env.VITE_ZOHO_API_URL || `${FINAL_DASHBOARD_API}/zoho`;

// Add this custom hook at the top of the file, after imports
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Update the Lead interface at the top of the file, after imports
interface Lead {
  _id: string;
  userId: string;
  gigId: string;
  refreshToken: string;
  id: string; // Zoho CRM ID
  Last_Activity_Time: string | null;
  Deal_Name: string;
  First_Name?: string;
  Last_Name?: string;
  Address?: string;
  City?: string;
  Postal_Code?: string;
  Stage: string;
  Email_1: string;
  Phone?: string;
  updatedAt: string;
  // Champs optionnels pour compatibilité
  Owner?: {
    name: string;
    id: string;
    email: string;
  };
  Created_By?: {
    name: string;
    id: string;
    email: string;
  };
  Modified_By?: {
    name: string;
    id: string;
    email: string;
  };
  Contact_Name?: {
    name: string;
    id: string;
  };
  Telephony?: string | null;
  Pipeline?: {
    name: string;
    id: string;
  } | string;
  Created_Time?: string;
  Modified_Time?: string;
  Description?: string | null;
  Tag?: string[];
  Amount?: number;
  Probability?: number;
  Type?: string;
  $currency_symbol?: string;
  metadata?: {
    ai_analysis?: {
      score?: string;
    };
  };
}

function LeadManagementPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zoho CRM states (DISABLED for now as requested)
  const [hasZohoConfig, setHasZohoConfig] = useState(false);
  const [hasZohoAccessToken, setHasZohoAccessToken] = useState(false);
  const [isDisconnectingZoho, setIsDisconnectingZoho] = useState(false);
  const urlParamsProcessedRef = useRef(false);

  interface Stage {
    display_value: string;
    sequence_number: number;
    forecast_category: {
      name: string;
      id: string;
    };
    actual_value: string;
    id: string;
    forecast_type: string;
  }

  interface Pipeline {
    display_value: string;
    default: boolean;
    maps: Stage[];
    actual_value: string;
    id: string;
  }

  interface PipelinesResponse {
    success: boolean;
    data: {
      layoutId: string;
      pipelines: {
        pipeline: Pipeline[];
      };
    };
  }

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [hasMoreRecords] = useState(false);
  const LEADS_PER_PAGE = 20; // Réduire à 20 leads par page pour une meilleure performance
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [displayedLeads, setDisplayedLeads] = useState<Lead[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // États pour la gestion des gigs
  const [gigs, setGigs] = useState<any[]>([]);
  const [selectedGig, setSelectedGig] = useState<any>(null);
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modify these new states to handle advanced filters
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [showSaveButton, setShowSaveButton] = useState(true);
  const [showFileName, setShowFileName] = useState(true);
  const [isSavingLeads, setIsSavingLeads] = useState(false);
  const [savedLeadsCount, setSavedLeadsCount] = useState(0);
  const [editingLeadIndex, setEditingLeadIndex] = useState<number | null>(null);
  const [showLeadsPreview, setShowLeadsPreview] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);

  // Update displayed leads when allLeads changes
  useEffect(() => {
    setDisplayedLeads(allLeads);
  }, [allLeads]);

  const fetchGigs = async () => {
    try {
      setIsLoadingGigs(true);

      const userId: string = Cookies.get('userId') || '680a27ffefa3d29d628d0016';
      console.log('Stored userId:', userId);

      if (!userId) {
        console.error("No user ID found");
        setGigs([]);
        setIsLoadingGigs(false);
        return;
      }

      console.log("Fetching gigs for user:", userId);
      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/user/${userId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Server response:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received data:", data);

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid data format");
      }

      const validGigs = data.data;
      setGigs(validGigs);

      // Sélectionner le premier gig par défaut
      if (validGigs.length > 0) {
        setSelectedGig(validGigs[0]);
      }
    } catch (error) {
      console.error("Detailed error:", error);
      setGigs([]);
    } finally {
      setIsLoadingGigs(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      const token = localStorage.getItem('zoho_access_token');
      if (!token) {
        console.log('No Zoho token found, skipping pipelines fetch');
        return;
      }

      const response = await fetch(`${zohoApiUrl}/pipelines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pipelines');
      }

      const data: PipelinesResponse = await response.json();
      if (data.success && data.data?.pipelines?.pipeline) {
        setPipelines(data.data.pipelines.pipeline);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch pipelines');
    }
  };

  const fetchLeads = async (page: number = 1, searchQuery: string = '') => {
    try {
      setIsLoadingMore(true);

      // Vérifier qu'un gig est sélectionné
      if (!selectedGig) {
        console.log("No gig selected, skipping leads fetch");
        setAllLeads([]);
        setTotalLeads(0);
        return;
      }

      let apiUrl: string;

      if (searchQuery.trim()) {
        // Utiliser l'endpoint de recherche dédié
        apiUrl = `${FINAL_DASHBOARD_API}/leads/gig/${selectedGig._id}/search?search=${encodeURIComponent(searchQuery.trim())}`;
        console.log('🔍 Recherche leads avec URL:', apiUrl);
      } else {
        // Utiliser l'endpoint normal avec pagination
        apiUrl = `${FINAL_DASHBOARD_API}/leads/gig/${selectedGig._id}?page=${page}&limit=${LEADS_PER_PAGE}`;
        console.log('📄 Récupération leads avec URL:', apiUrl);
      }

      const userId = Cookies.get('userId');
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${selectedGig._id}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('📊 Réponse API leads:', responseData);

      if (!responseData.success) {
        throw new Error('Failed to fetch leads: API returned unsuccessful response');
      }

      if (!Array.isArray(responseData.data)) {
        throw new Error('Invalid response format: expected data to be an array');
      }

      let filteredData = responseData.data;

      // Appliquer les filtres côté client si nécessaire
      if (selectedStage !== 'all') {
        filteredData = filteredData.filter((lead: Lead) => lead.Stage === selectedStage);
      }

      setAllLeads(filteredData);

      if (searchQuery.trim()) {
        // Pour la recherche, afficher tous les résultats sur une seule page
        setTotalPages(1);
        setCurrentPage(1);
        setTotalLeads(filteredData.length);
      } else {
        // Pour la pagination normale
        setTotalPages(responseData.totalPages);
        setCurrentPage(responseData.currentPage);
        setTotalLeads(responseData.total);
      }
    } catch (error) {
      console.error("Error retrieving leads:", error);
      setAllLeads([]);
      setTotalLeads(0);
      setTotalPages(1);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Charger les gigs et pipelines directement au démarrage
  useEffect(() => {
    fetchGigs();
    fetchPipelines();
    setIsLoading(false);
  }, []);

  // Détecter le callback OAuth de Zoho
  useEffect(() => {
    const runOnce = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const location = urlParams.get('location');
      const accountsServer = urlParams.get('accounts-server');

      if (code && state) {
        handleOAuthCallback(code, state, location || undefined, accountsServer || undefined);

        // Nettoyer l'URL après traitement
        const params = new URLSearchParams(window.location.search);
        params.delete('code');
        params.delete('state');
        params.delete('location');
        params.delete('accounts-server');
        const newSearch = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`);
      }
    };

    // Utiliser une ref pour s'assurer que ça ne s'exécute qu'une fois
    if (!urlParamsProcessedRef.current) {
      urlParamsProcessedRef.current = true;
      runOnce();
    }
  }, []);

  // Vérifier la configuration Zoho au montage (DISABLED)
  /*
  useEffect(() => {
    const checkZohoConfig = async () => {
      try {
        const userId = Cookies.get('userId');
        if (!userId) {
          console.log('No userId found, cannot check Zoho config');
          return;
        }

        const apiUrl = `${FINAL_DASHBOARD_API}/zoho/config/user/${userId}`;
        console.log('Checking Zoho config for user:', userId);
        console.log('API URL:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${selectedGig?._id || Cookies.get('gigId')}:${userId}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        console.log('Zoho config check response status:', response.status);
        console.log('Zoho config check response content-type:', response.headers.get('content-type'));

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('Zoho config data:', data);

            // L'API retourne directement l'objet config OU { success: true, data: {...} }
            // Vérifier si on a un access_token (config directe) ou si data.success est true
            const hasConfig = (data.access_token && data.userId) || (data.success && data.data);

            if (hasConfig) {
              console.log('✅ Zoho config found for user');
              setHasZohoConfig(true);
              setHasZohoAccessToken(true);
            } else {
              console.log('❌ No Zoho config found for user');
              setHasZohoConfig(false);
              setHasZohoAccessToken(false);
            }
          } else {
            console.error('Expected JSON response but got:', contentType);
            setHasZohoConfig(false);
            setHasZohoAccessToken(false);
          }
        } else {
          console.log(`Zoho config check failed with status ${response.status}`);
          setHasZohoConfig(false);
          setHasZohoAccessToken(false);
        }
      } catch (error) {
        console.error('Error checking Zoho config:', error);
        setHasZohoConfig(false);
        setHasZohoAccessToken(false);
      }
    };

    checkZohoConfig();
  }, [selectedGig]);
  */

  // Effet pour récupérer les leads quand un gig est sélectionné
  useEffect(() => {
    if (selectedGig) {
      fetchLeads(1);
    }
  }, [selectedGig]);

  // Gestionnaire pour le changement de gig
  const handleGigChange = async (gig: any) => {
    console.log('Gig sélectionné:', gig);
    setSelectedGig(gig);
    setSelectedPipeline('all');
    setSelectedStage('all');
    setCurrentPage(1);
  };

  // Optimize pipeline change handler
  const handlePipelineChange = async (pipelineName: string) => {
    console.log('Pipeline sélectionné:', pipelineName);
    const selectedPipelineData = pipelines.find(p => p.display_value === pipelineName);
    console.log('Données du pipeline sélectionné:', selectedPipelineData);
    setSelectedPipeline(pipelineName);
    setSelectedStage('all');
    setCurrentPage(1);
    await fetchLeads(1);
  };

  console.log("Leads:", leads);

  // Fonction de connexion Zoho supprimée - non nécessaire

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  const closeLeadDetails = () => {
    setShowLeadDetails(false);
    setSelectedLead(null);
  };

  // Add a new state to track selected stage
  const [selectedStageInModal, setSelectedStageInModal] = useState<string>("Analyze Needs");

  const refreshLeads = () => {
    // Don't reset the page, but retrieve data from the current page
    fetchLeads(currentPage);
  };

  // Add a new state for tracking updates
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStageClick = async (stage: string) => {
    if (!selectedLead || stage === selectedLead.Stage) return;

    // Zoho integration disabled for now
    toast.error("Zoho integration is currently disabled.");
    return;

    setIsUpdating(true);
    setSelectedStageInModal(stage);

    try {
      const accessToken = localStorage.getItem('zoho_access_token');
      if (!accessToken) {
        throw new Error("Access token not found");
      }

      const updateData = {
        Stage: stage
      };

      const response = await fetch(`${zohoApiUrl}/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error("Failed to update lead stage");
      }

      // Update local lead data to reflect the change
      const updatedLead = { ...selectedLead, Stage: stage };
      setSelectedLead(updatedLead);

      // Update leads list
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === selectedLead.id ? updatedLead : lead
        )
      );

      // Refresh leads from the server to get the latest data
      refreshLeads();

      // Show success notification
      console.log("Lead updated successfully");

    } catch (error: unknown) {
      console.error("Error updating lead:", error);
      // Gérer l'erreur si nécessaire
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, _lead: Lead) => {
    e.stopPropagation();  // Prevent click triggering on the line
    // TODO: Implement lead editing functionality
  };

  // Fonction de déconnexion Zoho supprimée - non nécessaire

  // Pas besoin de vérifier la connexion Zoho


  // Get stages of the selected pipeline
  const getSelectedPipelineStages = () => {
    if (selectedPipeline === 'all' || !pipelines) {
      return [];
    }
    const selectedPipelineData = pipelines.find(p => p.display_value === selectedPipeline);
    console.log('Pipeline Stages:', selectedPipelineData?.maps); // Debug log
    return selectedPipelineData?.maps || [];
  };

  // Optimize stage change handler
  const handleStageChange = async (stageName: string) => {
    setSelectedStage(stageName);
    setCurrentPage(1);
    await fetchLeads(1);
  };

  const [isImporting, setIsImporting] = useState(false);

  // Fonction pour refresh automatique du token Zoho
  const fetchZohoWithAutoRefresh = async (url: string, options: RequestInit = {}) => {
    const userId = Cookies.get('userId');
    const gigId = selectedGig?._id || Cookies.get('gigId');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gigId}:${userId}`,
      ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    // Si le token est expiré (401)
    if (response.status === 401) {
      // Refresh automatique du token
      const refreshRes = await fetch(
        `${FINAL_DASHBOARD_API}/zoho/config/user/${userId}/refresh-token`,
        {
          method: 'POST',
          headers,
        }
      );

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

  // Connexion à Zoho CRM
  const handleZohoConnect = async () => {
    try {
      const userId = Cookies.get('userId');

      if (!userId) {
        console.error('No userId found in cookies');
        toast.error('User ID not found. Please log in again.');
        return;
      }

      // Construire l'URL complète actuelle pour y revenir après l'authentification
      const currentUrl = window.location.href;
      console.log('💾 Current URL for return after auth:', currentUrl);

      // Construire le callback URI avec l'URL de redirection
      const redirectUri = `${FINAL_DASHBOARD_API}/zoho/auth/callback`;
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      const encodedState = encodeURIComponent(userId);
      const encodedReturnUrl = encodeURIComponent(currentUrl);

      const authUrl = `${FINAL_DASHBOARD_API}/zoho/auth?redirect_uri=${encodedRedirectUri}&state=${encodedState}&redirect_url=${encodedReturnUrl}`;

      console.log('Calling Zoho auth URL:', authUrl);

      const response = await fetch(authUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${userId}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        // Vérifier si c'est du JSON avant de parser
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to get Zoho auth URL`);
        } else {
          // Si ce n'est pas du JSON, c'est probablement une erreur HTML
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText.substring(0, 200));
          throw new Error(`Server error (${response.status}): The endpoint may not exist or returned HTML instead of JSON`);
        }
      }

      // Vérifier le content-type avant de parser
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Expected JSON but got:', responseText.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. The API endpoint may not be correctly configured.');
      }

      const data = await response.json();

      if (!data.authUrl) {
        throw new Error('No auth URL received from server');
      }

      const redirectUrl = new URL(data.authUrl);
      redirectUrl.searchParams.set('state', userId);

      console.log('Redirecting to Zoho:', redirectUrl.toString());
      window.location.href = redirectUrl.toString();
    } catch (error) {
      console.error('Error in handleZohoConnect:', error);
      toast.error((error as any)?.message || 'Failed to initiate Zoho authentication');
    }
  };

  // Déconnexion de Zoho CRM
  const handleZohoDisconnect = async () => {
    setIsDisconnectingZoho(true);
    try {
      const userId = Cookies.get('userId');
      const gigId = selectedGig?._id || Cookies.get('gigId');

      if (!userId) {
        console.error('No userId found in cookies');
        toast.error('User ID not found. Please log in again.');
        return;
      }

      console.log('Disconnecting from Zoho for user:', userId);

      const response = await fetch(`${FINAL_DASHBOARD_API}/zoho/disconnect`, {
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
        console.log('✅ Successfully disconnected from Zoho, updating status');
        setHasZohoConfig(false);
        setHasZohoAccessToken(false);
        toast.success('Disconnected from Zoho CRM successfully');
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

  // Traitement du callback OAuth
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

      console.log('Processing OAuth callback with params:', queryParams);

      const response = await fetch(
        `${FINAL_DASHBOARD_API}/zoho/auth/callback?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${selectedGig?._id || Cookies.get('gigId')}:${userId}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange code for tokens');
      }

      console.log('✅ OAuth callback successful, updating Zoho config status');
      setHasZohoConfig(true);
      setHasZohoAccessToken(true);
      toast.success('Connected to Zoho CRM successfully!');

    } catch (error: any) {
      console.error('Error handling OAuth callback:', error);
      toast.error(error.message || 'Failed to complete Zoho authentication');
    }
  };

  // Import des leads depuis Zoho
  const handleImportFromZoho = async () => {
    if (!selectedGig) {
      toast.error('Please select a gig first');
      return;
    }

    setIsImporting(true);
    try {
      const userId = Cookies.get('userId');
      const companyId = Cookies.get('companyId');

      if (!companyId) {
        toast.error('Configuration de l\'entreprise non trouvée. Veuillez vous reconnecter.');
        return;
      }

      if (!hasZohoAccessToken) {
        toast.error('Configuration Zoho non trouvée. Veuillez configurer Zoho CRM d\'abord.');
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
          gigId: selectedGig._id
        })
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => null);
        throw new Error(errorData?.message || `Erreur lors de la synchronisation avec Zoho`);
      }

      const data = await checkResponse.json();

      if (!data.success) {
        throw new Error(data.message || `Erreur lors de la synchronisation`);
      }

      if (data.data && Array.isArray(data.data.leads) && data.data.leads.length > 0) {
        toast.success(`Successfully imported ${data.data.leads.length} leads from Zoho CRM`);
        // Rafraîchir la liste des leads
        await fetchLeads(1);

        // Mettre à jour l'onboarding si des leads ont été importés
        try {
          const companyId = Cookies.get('companyId');
          if (companyId) {
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`,
              { status: 'completed' }
            );
          }
        } catch (error) {
          console.error('Error updating onboarding progress after Zoho import:', error);
        }
      } else {
        toast.success('No new leads to import from Zoho CRM');
        await fetchLeads(1);
      }
    } catch (error: any) {
      console.error('Error in handleImportFromZoho:', error);
      toast.error(error.message || 'Une erreur est survenue lors de l\'importation');
    } finally {
      setIsImporting(false);
    }
  };

  // File upload functions
  const updateRealProgress = (progress: number, status: string) => {
    if (!processingRef.current) {
      return;
    }
    setUploadProgress(progress);
  };

  const processFileWithBackend = async (file: File): Promise<{ leads: any[], validation: any }> => {
    try {
      if (!processingRef.current) {
        throw new Error('Processing cancelled by user');
      }

      abortControllerRef.current = new AbortController();

      const userId = Cookies.get('userId');
      const gigId = selectedGig?._id;
      const companyId = Cookies.get('companyId');

      if (!gigId) {
        throw new Error('Please select a gig first');
      }

      if (!userId || !companyId) {
        throw new Error('Missing user or company information');
      }

      const formData = new FormData();
      formData.append('file', file);

      updateRealProgress(20, 'Sending file to server...');

      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/file-processing/process`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
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

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Backend processing failed');
      }

      const result = data.data;

      if (!result || !result.leads || !Array.isArray(result.leads)) {
        throw new Error('Invalid response format from backend');
      }

      const leadsWithIds = result.leads.map((lead: any) => ({
        ...lead,
        userId: { $oid: userId },
        companyId: { $oid: companyId },
        gigId: { $oid: gigId }
      }));

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
      if (!selectedGig) {
        toast.error('Please select a gig first before uploading a file');
        return;
      }

      // Cancel any pending cleanup timer from a previous save so it doesn't wipe this new file
      if ((window as any).__leadCleanupTimer) {
        clearTimeout((window as any).__leadCleanupTimer);
        (window as any).__leadCleanupTimer = null;
      }

      // Reset state for the new file
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(false);
      setIsProcessing(true);
      setUploadProgress(10);
      setParsedLeads([]);
      setValidationResults(null);
      setShowSaveButton(true);
      setShowFileName(true);

      processingRef.current = true;

      try {
        if (!processingRef.current) {
          return;
        }

        const result = await processFileWithBackend(file);

        if (result.leads.length === 0) {
          toast.error('No valid leads found in the file. Please check the file format and content.');
          setUploadError('No valid leads found');
          setIsProcessing(false);
          setUploadProgress(0);
          return;
        }

        if (result.validation) {
          setValidationResults(result.validation);
        }

        setParsedLeads(result.leads);
        setIsProcessing(false);
        setUploadProgress(100);
        processingRef.current = false;

        // Reset input value AFTER processing so the same filename can be re-selected
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

  const handleSaveLeads = async () => {
    if (!parsedLeads || parsedLeads.length === 0) return;

    setIsSavingLeads(true);
    setSavedLeadsCount(0);
    setShowSaveButton(false);
    processingRef.current = true;

    try {
      const currentUserId = Cookies.get('userId');
      const currentGigId = selectedGig?._id;
      const currentCompanyId = Cookies.get('companyId');

      const leadsForAPI = parsedLeads.map((lead: any) => ({
        userId: lead.userId?.$oid || currentUserId,
        companyId: lead.companyId?.$oid || currentCompanyId,
        gigId: lead.gigId?.$oid || currentGigId,
        Last_Activity_Time: lead.Last_Activity_Time || null,
        Deal_Name: lead.Deal_Name || "Unnamed Lead",
        Email_1: lead.Email_1 || "no-email@placeholder.com",
        Phone: lead.Phone || "no-phone@placeholder.com",
        Stage: lead.Stage || "New",
        Pipeline: lead.Pipeline || "Sales Pipeline",
        Activity_Tag: lead.Activity_Tag || '',
        Telephony: lead.Telephony || '',
        Project_Tags: lead.Project_Tags || []
      }));

      const savedLeads: any[] = [];
      const failedLeads: { index: number; error: string }[] = [];

      for (let i = 0; i < leadsForAPI.length; i++) {
        if (!processingRef.current) {
          throw new Error('Processing cancelled by user');
        }

        const lead = leadsForAPI[i];

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_DASHBOARD_API}/leads`,
            lead,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentGigId}:${currentUserId}`
              },
              timeout: 10000
            }
          );

          if (response.status === 200 || response.status === 201) {
            savedLeads.push(response.data);
            const progress = Math.round(((i + 1) / leadsForAPI.length) * 100);
            setUploadProgress(progress);
            setSavedLeadsCount(savedLeads.length);
          } else {
            failedLeads.push({ index: i, error: response.statusText });
          }
        } catch (error: any) {
          failedLeads.push({
            index: i,
            error: error.message || 'Network error'
          });
        }

        if (i < leadsForAPI.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const savedCount = savedLeads.length;
      const totalCount = leadsForAPI.length;

      if (savedCount === totalCount) {
        setUploadSuccess(true);
        setUploadProgress(100);
        toast.success(`Successfully saved ${savedCount} contacts!`);
        setParsedLeads([]);
        await fetchLeads(1);
      } else if (savedCount > 0) {
        setUploadError(`${savedCount} leads saved, ${failedLeads.length} failed`);
        console.warn('Failed leads:', failedLeads);
        const failedParsedLeads = parsedLeads.filter((_, index) =>
          failedLeads.some(failed => failed.index === index)
        );
        setParsedLeads(failedParsedLeads);
      } else {
        setUploadError('Failed to save any leads');
        toast.error('Failed to save any leads. Check console for details.');
        console.error('All leads failed to save:', failedLeads);
      }

    } catch (error: any) {
      console.error('Error in handleSaveLeads:', error);
      const errorMessage = error.message || 'Error saving leads';
      setUploadError(errorMessage);
      toast.error(errorMessage);

    } finally {
      setIsSavingLeads(false);
      processingRef.current = false;
      setShowSaveButton(true);
      setShowFileName(true);

      // Store the timer so a new upload can cancel it before it wipes the new file's state
      (window as any).__leadCleanupTimer = setTimeout(() => {
        (window as any).__leadCleanupTimer = null;
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadSuccess(false);
        setParsedLeads([]);
        setUploadError(null);
        setValidationResults(null);
        processingRef.current = false;

        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }, 2000);
    }
  };

  const handleEditLead = (index: number, field: string, value: string) => {
    const newLeads = [...parsedLeads];
    newLeads[index] = { ...newLeads[index], [field]: value };
    setParsedLeads(newLeads);
  };

  // Fonction de recherche avec délai
  const handleSearch = async (query: string) => {
    setSearchText(query);

    // Annuler le timeout précédent s'il existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Délai pour éviter trop d'appels API pendant la frappe
    searchTimeoutRef.current = setTimeout(async () => {
      // Si on a une requête de recherche, récupérer tous les résultats
      if (query.trim()) {
        await fetchLeads(1, query);
      } else {
        // Si pas de recherche, recharger les leads normaux avec pagination
        await fetchLeads(1);
      }
    }, 500); // 500ms de délai
  };

  // Render pagination buttons
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => fetchLeads(i, searchText)}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${i === currentPage
              ? 'z-10 bg-rose-500 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500'
              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
              }`}
          >
            {i}
          </button>
        );
      }
      return buttons;
    }

    // Always show first page
    buttons.push(
      <button
        key={1}
        onClick={() => fetchLeads(1, searchText)}
        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${1 === currentPage
          ? 'z-10 bg-rose-500 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500'
          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
          }`}
      >
        1
      </button>
    );

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      endPage = Math.min(4, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
    }

    if (startPage > 2) {
      buttons.push(
        <span key="start-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
          ...
        </span>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => fetchLeads(i, searchText)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${i === currentPage
            ? 'z-10 bg-rose-500 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500'
            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
            }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages - 1) {
      buttons.push(
        <span key="end-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
          ...
        </span>
      );
    }

    if (totalPages > 1) {
      buttons.push(
        <button
          key={totalPages}
          onClick={() => fetchLeads(totalPages, searchText)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${totalPages === currentPage
            ? 'z-10 bg-rose-500 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500'
            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
            }`}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center mb-4 animate-pulse">
            <div className="p-3 bg-rose-100 rounded-lg mr-3 h-12 w-12" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-gray-200 rounded-lg" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <LeadsTableSkeleton rows={7} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center mb-2">
          <div className="p-3 bg-rose-100 rounded-lg mr-3">
            <UserPlus className="w-6 h-6 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
        </div>
        <p className="text-gray-600 ml-16">
          Import, manage, and organize your leads efficiently. Choose between connecting with your CRM system or uploading contact files directly.
        </p>
      </div>

      {/* Select a Gig Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-gray-700 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">Select a Gig</h3>
        </div>
        <select
          value={selectedGig?._id || ''}
          onChange={(e) => {
            const gig = gigs.find(g => g._id === e.target.value);
            if (gig) handleGigChange(gig);
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-gray-900 font-medium"
          disabled={isLoadingGigs}
        >
          <option value="">Select a Gig</option>
          {gigs.map((gig) => (
            <option key={gig._id} value={gig._id}>
              {gig.title || gig.name || `Gig ${gig._id}`}
            </option>
          ))}
        </select>
      </div>

      {/* Import Leads Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center mb-2">
          <Upload className="w-5 h-5 text-rose-500 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">Import Leads</h3>
        </div>
        <p className="text-gray-600 mb-6">
          Choose your preferred method to import leads into your selected gig.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Zoho CRM Integration Card - Disabled */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 opacity-70 flex flex-col h-full pointer-events-none">
            {/* Header */}
            <div className="flex items-center mb-4 grayscale">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 border-2 border-gray-200 shadow-sm">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%236b7280' d='M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z'/%3E%3C/svg%3E"
                  alt="Zoho"
                  className="h-6 w-6 opacity-60"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-700">Zoho CRM Integration</h4>
                <p className="text-sm text-gray-500">Connect and sync with your Zoho CRM (Disabled)</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="mb-4">
              <div className="flex items-center justify-between bg-gray-100 border border-gray-200 rounded-lg p-3">
                <span className="text-sm font-medium text-gray-500">⚠ Not connected</span>
                <button
                  disabled
                  className="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-lg"
                >
                  Connect
                </button>
              </div>
            </div>

            {/* Action Button - Pushed to bottom */}
            <div className="mt-auto">
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 font-bold py-4 px-6 rounded-xl flex items-center justify-center"
              >
                Connect to Zoho CRM First
              </button>
            </div>
          </div>

          {/* File Upload Card */}
          <div className="bg-gradient-to-br from-rose-50 to-rose-50 border-2 border-rose-200 rounded-2xl p-6 hover:border-rose-300 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 border-2 border-rose-200 shadow-sm">
                <FileSpreadsheet className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-rose-500">File Upload</h4>
                <p className="text-sm text-rose-600">Upload and process contact files</p>
              </div>
            </div>

            {/* File Info */}
            <div className="mb-4">
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                <span className="text-sm font-medium text-rose-500">📁 Supported: CSV, Excel</span>
              </div>
            </div>

            {/* Upload Button - Pushed to bottom */}
            <div className="mt-auto">
              <div className="w-full bg-gradient-to-r from-rose-500 to-rose-500 text-white font-bold py-4 px-6 rounded-xl hover:from-rose-600 hover:to-rose-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center">
                <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center w-full">
                  <FileSpreadsheet className="h-5 w-5 mr-3 text-white" />
                  <span className="text-base font-semibold text-white">
                    {isProcessing ? (
                      <div className="flex items-center">
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Click to upload or drag and drop'
                    )}
                  </span>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="*"
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
                <FileText className="mr-2 h-4 w-4 text-rose-500" />
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
            <div className="mt-3">
              <div className="relative">
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${uploadError ? 'bg-red-500' : uploadSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-rose-400 to-rose-400'
                      }`}
                    style={{
                      width: `${uploadProgress}%`,
                      background: isProcessing && !uploadError && !uploadSuccess ? 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' : undefined
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {isProcessing && !uploadError && !uploadSuccess
                    ? `Analysing... ${uploadProgress}%`
                    : uploadProgress > 0 ? `${uploadProgress}% completed` : 'Ready'
                  }
                </span>
                <span>{Math.round(selectedFile.size / 1024)} KB</span>
              </div>
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
                  <div className="bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-rose-500 mb-2 flex items-center">
                      <Info className="mr-2 h-4 w-4" />
                      AI Processing Results
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-rose-500 font-medium">Total Rows:</span> {validationResults.totalRows}
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Valid Rows:</span> {validationResults.validRows > 0 ? validationResults.validRows : parsedLeads.length}
                      </div>
                      {validationResults.invalidRows > 0 && (
                        <div className="col-span-2">
                          <span className="text-red-600 font-medium">Invalid Rows:</span> {validationResults.invalidRows}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      <h4 className="text-sm font-semibold text-gray-800">
                        Confirm & Edit Leads ({parsedLeads.length})
                      </h4>
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
                      <p className="text-xs text-gray-600 mb-3">Review and edit your leads before saving. Click the edit icon to modify any field.</p>
                      <div className="max-h-60 overflow-y-auto">
                        <div className="space-y-2">
                          {parsedLeads.map((lead: any, index: number) => (
                            <div key={index} className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 hover:border-slate-300 transition-all duration-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-slate-600">{index + 1}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {lead.Deal_Name || 'Unnamed Lead'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setEditingLeadIndex(editingLeadIndex === index ? null : index)}
                                    className="text-slate-600 hover:text-slate-800 p-2 rounded-md hover:bg-slate-50 transition-colors duration-200"
                                    title="Edit lead"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newLeads = [...parsedLeads];
                                      newLeads.splice(index, 1);
                                      setParsedLeads(newLeads);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors duration-200"
                                    title="Delete lead"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {editingLeadIndex === index ? (
                                <div className="space-y-3 bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                                  <div className="grid grid-cols-1 gap-3">
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                                      <input
                                        type="text"
                                        value={lead.Deal_Name || ''}
                                        onChange={(e) => handleEditLead(index, 'Deal_Name', e.target.value)}
                                        placeholder="Enter lead name"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition-all duration-200 bg-white shadow-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                      <input
                                        type="email"
                                        value={lead.Email_1 || ''}
                                        onChange={(e) => handleEditLead(index, 'Email_1', e.target.value)}
                                        placeholder="Enter email address"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition-all duration-200 bg-white shadow-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                                      <input
                                        type="tel"
                                        value={lead.Phone || ''}
                                        onChange={(e) => handleEditLead(index, 'Phone', e.target.value)}
                                        placeholder="Enter phone number"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition-all duration-200 bg-white shadow-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                                    <button
                                      onClick={() => setEditingLeadIndex(null)}
                                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-300"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingLeadIndex(null);
                                      }}
                                      className="px-3 py-1 text-sm font-medium text-white bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg hover:from-slate-800 hover:to-slate-950 transition-all duration-200 shadow-sm"
                                    >
                                      Save Changes
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      <span className="font-medium">Email:</span> {lead.Email_1 || 'No email'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      <span className="font-medium">Phone:</span> {lead.Phone || 'No phone'}
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
                  className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-rose-500 px-4 py-3 text-white font-bold hover:from-rose-600 hover:to-rose-600 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  onClick={handleSaveLeads}
                  disabled={isSavingLeads}
                >
                  <div className="flex items-center justify-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Save {parsedLeads.length} Contacts
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Channel Filter Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <Globe className="w-5 h-5 text-rose-500 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">Channel Filter</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-rose-500 to-rose-500 text-white shadow-lg"
          >
            <Globe className="h-4 w-4" />
            <span>All Channels</span>
          </button>
          <button
            className="flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 transform hover:scale-105 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
          >
            <Phone className="h-4 w-4" />
            <span>Voice Calls</span>
          </button>
        </div>
      </div>

      {/* Leads List Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center">
                <Users className="w-5 h-5 text-rose-500 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Leads List</h3>
              </div>
              <div className="mt-2">
                {selectedGig ? (
                  <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-medium">
                    Showing {displayedLeads.length} of {totalLeads} leads
                  </span>
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
                  className="block w-64 rounded-lg border-gray-300 pl-10 focus:border-rose-500 focus:ring-rose-500 sm:text-sm shadow-sm"
                  placeholder="Search leads..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border-gray-300 py-2 pl-3 pr-10 text-base focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm shadow-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={() => {
                  setSearchText('');
                  fetchLeads(1);
                }}
                className="flex items-center rounded-lg bg-gradient-to-r from-rose-500 to-rose-500 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-rose-600 hover:to-rose-600 transition-all duration-200 transform hover:scale-105"
                disabled={isLoadingMore || !selectedGig}
              >
                {isLoadingMore ? (
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

        {/* Leads Table */}
        <div className="overflow-x-auto">
          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                    Prénom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                    Adresse
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                    Ville
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                    Code Postal
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                    MOBILE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoadingMore ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500 mr-3"></div>
                        Loading leads...
                      </div>
                    </td>
                  </tr>
                ) : displayedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center justify-center py-8">
                        <UserPlus className="h-12 w-12 text-gray-300 mb-2" />
                        <p>No leads found</p>
                        <p className="text-xs text-gray-400 mt-1">Try importing some leads or check your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map((lead, index) => (
                    <tr
                      key={`${lead._id}-${lead.id}-${index}`}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      onClick={() => handleLeadClick(lead)}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-medium">
                        {lead.Last_Name || (lead.Deal_Name ? lead.Deal_Name.split(' ').slice(1).join(' ') : 'N/A')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {lead.First_Name || (lead.Deal_Name ? lead.Deal_Name.split(' ')[0] : 'N/A')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {lead.Email_1 || 'No Email'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {lead.Address || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {lead.City || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {lead.Postal_Code || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-medium">
                        {(() => {
                          const phone = lead.Phone || '';
                          if (!phone) return 'N/A';
                          return phone.startsWith('+') ? phone : `+${phone}`;
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {displayedLeads.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing <span className="font-medium">{displayedLeads.length}</span> of{' '}
                  <span className="font-medium">{totalLeads > 0 ? totalLeads : displayedLeads.length}</span> leads
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchLeads(currentPage - 1, searchText)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex items-center space-x-1">
                    {renderPaginationButtons()}
                  </div>

                  <button
                    onClick={() => fetchLeads(currentPage + 1, searchText)}
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

      {showLeadDetails && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex mb-4">
                <div className="flex space-x-4">
                  <button className="px-6 py-2 bg-white text-gray-800 border-b-2 border-rose-500 font-medium">Overview</button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="text-gray-500 text-sm">
                    Last Update : 09:20 AM
                  </div>
                  <button
                    onClick={closeLeadDetails}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="text-gray-500 text-sm uppercase">START</h3>
                    <p className="font-medium">11/02/2025</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-gray-500 text-sm uppercase">CLOSING</h3>
                    <p className="font-medium">14/02/2025</p>
                  </div>
                </div>

                <div className="flex">
                  <div
                    className={`${selectedStageInModal === "Qualification" ? "bg-rose-400 text-white" : "bg-rose-100 text-gray-800"} py-1 px-4 rounded-l-md flex items-center cursor-pointer ${isUpdating ? "opacity-50 cursor-wait" : ""}`}
                    onClick={() => !isUpdating && handleStageClick("Qualification")}
                  >
                    <span className="text-sm">
                      {isUpdating && selectedStageInModal === "Qualification" ? "Updating..." : "Qualification"}
                    </span>
                  </div>
                  <div
                    className={`${selectedStageInModal === "Analyze Needs" ? "bg-rose-400 text-white" : "bg-gray-100 text-gray-800"} py-1 px-4 flex items-center relative cursor-pointer`}
                    onClick={() => !isUpdating && handleStageClick("Analyze Needs")}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Qualification" ? "border-t-rose-400 border-b-rose-400" : "border-t-rose-100 border-b-rose-100"} -ml-[12px]`}></div>
                    <span className="text-sm">Analyze Needs</span>
                    <div className={`absolute right-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Analyze Needs" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} ml-[12px] z-10 rotate-180 -mr-[12px]`}></div>
                  </div>
                  <div
                    className={`${selectedStageInModal === "Negotiation" ? "bg-rose-400 text-white" : "bg-gray-100 text-gray-800"} py-1 px-4 flex items-center relative cursor-pointer`}
                    onClick={() => !isUpdating && handleStageClick("Negotiation")}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Analyze Needs" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} -ml-[12px]`}></div>
                    <span className="text-sm">Negotiation</span>
                    <div className={`absolute right-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Negotiation" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} ml-[12px] z-10 rotate-180 -mr-[12px]`}></div>
                  </div>
                  <div
                    className={`${selectedStageInModal === "Proposal/Pricing" ? "bg-rose-400 text-white" : "bg-gray-100 text-gray-800"} py-1 px-4 flex items-center relative cursor-pointer`}
                    onClick={() => !isUpdating && handleStageClick("Proposal/Pricing")}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Negotiation" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} -ml-[12px]`}></div>
                    <span className="text-sm">Proposal/Pricing</span>
                    <div className={`absolute right-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Proposal/Pricing" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} ml-[12px] z-10 rotate-180 -mr-[12px]`}></div>
                  </div>
                  <div
                    className={`${selectedStageInModal === "Proposal Commercial" ? "bg-rose-400 text-white" : "bg-gray-100 text-gray-800"} py-1 px-4 flex items-center relative cursor-pointer`}
                    onClick={() => !isUpdating && handleStageClick("Proposal Commercial")}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Proposal/Pricing" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} -ml-[12px]`}></div>
                    <span className="text-sm">Proposal Commercial</span>
                    <div className={`absolute right-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Proposal Commercial" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} ml-[12px] z-10 rotate-180 -mr-[12px]`}></div>
                  </div>
                  <div
                    className={`${selectedStageInModal === "Identify Decision Makers" ? "bg-rose-400 text-white" : "bg-gray-100 text-gray-800"} py-1 px-4 rounded-r-md flex items-center relative cursor-pointer`}
                    onClick={() => !isUpdating && handleStageClick("Identify Decision Makers")}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 border-l-[12px] border-l-transparent border-t-[15px] border-b-[15px] ${selectedStageInModal === "Proposal Commercial" ? "border-t-rose-400 border-b-rose-400" : "border-t-gray-100 border-b-gray-100"} -ml-[12px]`}></div>
                    <span className="text-sm">Identify Decision Makers</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center text-sm py-3 border-b">
                  <span className="text-gray-500">Lead Owner</span>
                  <span className="font-medium">{selectedLead.Owner?.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-3 border-b">
                  <span className="text-gray-500">Stage</span>
                  <span className="font-medium">{selectedStageInModal}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-3 border-b">
                  <span className="text-gray-500">Probability (%)</span>
                  <span className="font-medium">20</span>
                </div>
                <div className="flex justify-between items-center text-sm py-3 border-b">
                  <span className="text-gray-500">Expected Revenue</span>
                  <span className="font-medium">MAD 12,000</span>
                </div>
                <div className="flex justify-between items-center text-sm py-3 border-b">
                  <span className="text-gray-500">Closing Date</span>
                  <span className="font-medium">14/02/2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default LeadManagementPanel;
