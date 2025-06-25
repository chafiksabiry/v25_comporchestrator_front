import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Download,
  RefreshCw,
  Search,
  Trash2,
  Edit,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
  X,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
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
  __v?: number;
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

const UploadContacts = () => {
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
  const [hasZohoConfig, setHasZohoConfig] = useState(false);
  const [zohoConfig, setZohoConfig] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    companyId: Cookies.get('companyId') || ''
  });
  const [isImportingZoho, setIsImportingZoho] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeLeads, setRealtimeLeads] = useState<Lead[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(50);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>('');
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [hasZohoAccessToken, setHasZohoAccessToken] = useState(false);
  const [showImportChoiceModal, setShowImportChoiceModal] = useState(false);
  const [selectedImportChoice, setSelectedImportChoice] = useState<'zoho' | 'file' | null>(null);
  const [showGigsSection, setShowGigsSection] = useState(true);

  const channels = [
    { id: 'all', name: 'All Channels', icon: Globe },
    { id: 'voice', name: 'Voice Calls', icon: Phone },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'chat', name: 'Live Chat', icon: MessageSquare },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'youtube', name: 'YouTube', icon: Youtube }
  ];

  const contacts = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1 (555) 123-4567',
      channels: ['voice', 'email'],
      status: 'active',
      lastContact: '2 hours ago'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      phone: '+1 (555) 234-5678',
      channels: ['chat', 'email', 'facebook'],
      status: 'inactive',
      lastContact: '1 day ago'
    },
    {
      id: 3,
      name: 'Michael Brown',
      email: 'michael.b@example.com',
      phone: '+1 (555) 345-6789',
      channels: ['voice', 'email', 'twitter'],
      status: 'active',
      lastContact: '3 hours ago'
    }
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(false);
      setIsProcessing(true);
      setUploadProgress(10);
      setParsedLeads([]);
      
      try {
        // Read the file content
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            let rows: string[] = [];
            let headers: string[] = [];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json: unknown[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              rows = (json as any[]).map((row: any) => Array.isArray(row) ? row.join(',') : Object.values(row).join(','));
            } else {
              // CSV
              const content = e.target?.result as string;
              // Détection du séparateur (virgule ou point-virgule)
              const sep = content.includes(';') && !content.includes(',') ? ';' : ',';
              rows = content.split('\n');
              rows = rows.map(row => row.trim()).filter(row => row.length > 0);
              if (sep !== ',') {
                rows = rows.map(row => row.replace(/;/g, ','));
              }
            }
            headers = rows[0].split(',').map(header => header.trim());
            console.log('Headers lus:', headers);
            
            // Process each row and create lead objects
            const totalRows = rows.length - 1;
            const leads = rows.slice(1)
              .filter(row => row.trim() !== '') // Filter out empty rows
              .map((row, index) => {
                const values = row.split(',').map(value => value.trim());
                console.log(`Ligne ${index + 2} valeurs:`, values);
                const lead: any = {
                  userId: Cookies.get('userId'),
                  gigId: Cookies.get('gigId'),
                  companyId: Cookies.get('companyId'),
                  Last_Activity_Time: new Date(),
                  Activity_Tag: '',
                  Deal_Name: '',
                  Stage: '',
                  Email_1: '',
                  Phone: '',
                  Telephony: '',
                  Pipeline: '',
                };

                console.log('🔍 Lead créé avec userId et gigId:', {
                  userId: lead.userId,
                  gigId: lead.gigId
                });

                headers.forEach((header, index) => {
                  const value = values[index]?.trim();
                  if (value) { // Only set values that are not empty
                    switch(header.toLowerCase().replace(/[_ ]/g, '')) { // Normalise: retire espaces et underscores
                      case 'email':
                        lead.Email_1 = value;
                        break;
                      case 'email1':
                        lead.Email_1 = value;
                        break;
                      case 'phone':
                        lead.Phone = value;
                        break;
                      case 'stage':
                        lead.Stage = value;
                        break;
                      case 'dealname':
                        lead.Deal_Name = value;
                        break;
                      case 'pipeline':
                        lead.Pipeline = value;
                        break;
                      case 'projecttags':
                        lead.Project_Tags = value.split(';').filter(tag => tag.trim() !== '');
                        break;
                    }
                  }
                });

                // Validate required fields
                if (!lead.Email_1 && !lead.Phone) {
                  toast.error(`Row ${index + 2}: Missing email and phone number. At least one is required.`);
                  return null;
                }

                // If Deal_Name is empty but Email_1 exists, use Email_1 as Deal_Name
                if (!lead.Deal_Name && lead.Email_1) {
                  lead.Deal_Name = lead.Email_1;
                }

                // Simulation de progression : avance en fonction du nombre de lignes
                setUploadProgress(10 + Math.round(((index + 1) / totalRows) * 80));

                return lead;
              })
              .filter(lead => lead !== null); // Remove invalid leads

            if (leads.length === 0) {
              toast.error('No valid leads found in the file. Please check the file format and content.');
              setUploadError('No valid leads found');
              setIsProcessing(false);
              setUploadProgress(0);
              return;
            }

            console.log('Leads à envoyer:', leads);

            setParsedLeads(leads);
            setIsProcessing(false);
            setUploadProgress(100);
            return;
          } catch (error: any) {
            console.error('Error processing file:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error processing file';
            setUploadError(errorMessage);
            toast.error(errorMessage);
            setUploadProgress(0);
            setIsProcessing(false);
          }
        };

        reader.onerror = () => {
          setUploadError('Error reading file');
          toast.error('Error reading file');
          setUploadProgress(0);
          setIsProcessing(false);
        };

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
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

  const handleSaveLeads = async () => {
    if (!parsedLeads || parsedLeads.length === 0) return;
    setIsProcessing(true);
    setUploadProgress(0);
    setShowSaveButton(false);
    setShowFileName(false);

    try {
      console.log('Saving leads:', parsedLeads);
      console.log('API URL:', `${import.meta.env.VITE_DASHBOARD_API}/leads`);
      const response = await axios.post(`${import.meta.env.VITE_DASHBOARD_API}/leads`, parsedLeads, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('gigId')}:${Cookies.get('userId')}`
        }
      });
      console.log('Save response:', response.data);
      if (response.status === 200) {
        setUploadSuccess(true);
        setUploadProgress(100);
        toast.success(`Successfully uploaded ${parsedLeads.length} contacts!`);
        
        // Rafraîchir la liste des leads après l'importation
        if (selectedGigId) {
          await fetchLeads();
        }
        
        // Reset all states after a short delay
        setTimeout(() => {
          setSelectedFile(null);
          setUploadProgress(0);
          setUploadSuccess(false);
          setParsedLeads([]);
          setUploadError(null);
          setIsProcessing(false);
          setShowSaveButton(true);
          setShowFileName(true);
          toast('File has been reset. You can upload a new file.', {
            icon: '🔄',
            duration: 2000
          });
        }, 1200);
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error processing file';
      setUploadError(errorMessage);
      toast.error(errorMessage);
      setUploadProgress(0);
      setShowSaveButton(true);
      setShowFileName(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleZohoConnect = async () => {
    console.log('Starting Zoho connection process...');
    try {
      const userId = Cookies.get('userId');
      console.log('Retrieved userId from cookies:', userId);
  
      if (!userId) {
        console.error('No userId found in cookies');
        toast.error('User ID not found. Please log in again.');
        return;
      }
  
      const redirectUri = `${import.meta.env.VITE_DASHBOARD_API}/zoho/auth/callback`;
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      const encodedState = encodeURIComponent(userId);
  
      const authUrl = `${import.meta.env.VITE_DASHBOARD_API}/zoho/auth?redirect_uri=${encodedRedirectUri}&state=${encodedState}`;
      console.log('Auth URL:', authUrl);
  
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
      console.log('Auth URL response:', data);
  
      const redirectUrl = new URL(data.authUrl);
      redirectUrl.searchParams.set('state', userId);
      window.location.href = redirectUrl.toString();
    } catch (error) {
      console.error('Error in handleZohoConnect:', error);
      toast.error((error as any)?.message || 'Failed to initiate Zoho authentication');
    }
  };
  
  

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const location = urlParams.get('location');
    const accountsServer = urlParams.get('accounts-server');
    
    const params = new URLSearchParams(window.location.search);
    // Vérifier si l'URL contient le paramètre startStep=6
    if (params.get('session') === 'someGeneratedSessionId') {

      // Nettoyer l'URL pour éviter de relancer à chaque render
      params.delete('session');
      const newSearch = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`);
    }

    console.log('URL Params:', {
      code,
      state,
      location,
      accountsServer
    });
    
    if (code) {
      if (!state) {
        console.error('No state parameter found in URL');
        toast.error('Authentication state not found. Please try connecting again.');
        return;
      }
  
      handleOAuthCallback(code, state, location || undefined, accountsServer || undefined);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string, location?: string, accountsServer?: string) => {
    console.log('handleOAuthCallback called with:', {
      code,
      state,
      location,
      accountsServer
    });
    
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
          'Authorization': `Bearer ${Cookies.get('gigId')}:${userId}`
        }
      });
  
      const data = await response.json();
      console.log('Callback response:', data);
  
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
    console.log('📊 État actuel de hasZohoConfig:', hasZohoConfig);
    if (!hasZohoConfig) {
      console.log('⚠️ Configuration Zoho non trouvée - Affichage de la modal');
    } else {
      console.log('✅ Configuration Zoho trouvée - Pas besoin d\'afficher la modal');
    }
  }, [hasZohoConfig]);

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
      
      // Trouver le gig sélectionné
      const selectedGig = gigs.find(gig => gig._id === selectedGigId);
      if (!selectedGig) {
        toast.error('Gig sélectionné non trouvé');
        return;
      }

      console.log('Importing leads for selected gig:', selectedGig.title);
      
      const apiUrl = `${import.meta.env.VITE_DASHBOARD_API}/zoho/leads/sync-all`;
      const checkResponse = await fetch(apiUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          companyId: companyId,
          gigId: selectedGigId
        })
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => null);
        throw new Error(errorData?.message || `Erreur lors de la synchronisation avec Zoho pour le gig ${selectedGig.title}`);
      }

      const data = await checkResponse.json();
      console.log('Import response for gig:', selectedGig.title, data);
      
      if (!data.success) {
        throw new Error(data.message || `Erreur lors de la synchronisation pour le gig ${selectedGig.title}`);
      }

      // Vérifier si data.data et data.data.leads existent
      if (!data.data || !Array.isArray(data.data.leads)) {
        console.warn(`No leads found for gig ${selectedGig.title}`);
        toast.success(`Aucun lead trouvé pour le gig ${selectedGig.title}`);
        setRealtimeLeads([]);
        setParsedLeads([]);
        // Refresh automatique même si aucun lead trouvé
        await fetchLeads();
        return;
      }

      const leads = data.data.leads;
      const syncInfo = data.data.sync_info || { total_saved: 0 };

      // Mettre à jour l'état avec les leads du gig sélectionné
      setRealtimeLeads(leads);
      setParsedLeads(leads);

      // Afficher le succès
      toast.success(`Importation réussie pour ${selectedGig.title}: ${leads.length} leads importés`);
      
      // Refresh automatique de la liste des leads après l'importation
      await fetchLeads();

    } catch (error: any) {
      console.error('Error in handleImportFromZoho:', error);
      toast.error(error.message || 'Une erreur est survenue lors de l\'importation');
    } finally {
      setIsImportingZoho(false);
    }
  };

  const fetchLeads = async (page = currentPage) => {
    if (!selectedGigId) {
      console.log('No gig selected, clearing leads');
      setLeads([]);
      setTotalPages(0);
      setCurrentPage(1);
      return;
    }

    setIsLoadingLeads(true);
    setError(null);
    try {
      const apiUrl = `${import.meta.env.VITE_DASHBOARD_API}/leads/gig/${selectedGigId}?page=${page}&limit=${pageSize}`;
      console.log('API URL:', apiUrl);
      console.log('Fetching leads for gig:', selectedGigId);
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('gigId')}:${Cookies.get('userId')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }

      const responseData: ApiResponse = await response.json();
      console.log('API Response:', responseData);
      
      if (!responseData.success) {
        throw new Error('Failed to fetch leads: API returned unsuccessful response');
      }

      if (!Array.isArray(responseData.data)) {
        throw new Error('Invalid response format: expected data to be an array');
      }

      console.log('Setting leads:', responseData.data);
      setLeads(responseData.data);
      setTotalPages(responseData.totalPages);
      setCurrentPage(responseData.currentPage);
    } catch (error: unknown) {
      console.error('Error fetching leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leads';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (selectedGigId) {
      console.log('Selected gig changed, fetching leads for:', selectedGigId);
      fetchLeads().catch(error => {
        console.error('Error in useEffect:', error);
        setError('Failed to load leads');
      });
    } else {
      console.log('No gig selected, clearing leads');
      setLeads([]);
      setTotalPages(0);
      setCurrentPage(1);
    }
  }, [selectedGigId]);

  useEffect(() => {
    if (leads.length === 0) {
      console.log('No leads to display');
    } else {
      console.log('Rendering leads:', leads);
    }
  }, [leads]);

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 4; // Nombre maximum de pages visibles

    // Toujours afficher la première page
    buttons.push(
      <button
        key={1}
        onClick={() => fetchLeads(1)}
        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
          1 === currentPage
            ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
        }`}
      >
        1
      </button>
    );

    // Calculer les pages à afficher
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Ajuster si on est proche du début ou de la fin
    if (currentPage <= 2) {
      endPage = Math.min(4, totalPages - 1);
    } else if (currentPage >= totalPages - 1) {
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
          onClick={() => fetchLeads(i)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
            i === currentPage
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
          onClick={() => fetchLeads(totalPages)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
            totalPages === currentPage
              ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
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
          'Authorization': `Bearer ${Cookies.get('gigId')}:${Cookies.get('userId')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gigs');
      }

      const data = await response.json();

      console.log('data gigs', data);
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

  const handleGigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGigId = e.target.value;
    setSelectedGigId(newGigId);
    
    // Update gigId in all parsed leads
    setParsedLeads(prevLeads => 
      prevLeads.map(lead => ({
        ...lead,
        gigId: newGigId
      }))
    );

    // Update gigId in existing leads
    setLeads(prevLeads =>
      prevLeads.map(lead => ({
        ...lead,
        gigId: newGigId
      }))
    );

    // Update gigId in realtime leads
    setRealtimeLeads(prevLeads =>
      prevLeads.map(lead => ({
        ...lead,
        gigId: newGigId
      }))
    );

    // Update the cookie with the new gigId
    Cookies.set('gigId', newGigId);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.zohoConnected) {
        console.log('Received zohoConnected message');
        toast.success('Zoho connection successful');
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
      if (isConfigured) {
        console.log('✅ Zoho est configuré - Affichage du composant UploadContacts');
      }
    };
    checkZohoConfig();
  }, []);

  // Show import choice modal on first visit
  useEffect(() => {
    const hasSeenModal = localStorage.getItem('hasSeenImportChoiceModal');
    if (!hasSeenModal) {
      setShowImportChoiceModal(true);
    }
  }, []);

  const handleImportChoice = (choice: 'zoho' | 'file') => {
    setSelectedImportChoice(choice);
  };

  const handleConfirmChoice = () => {
    if (selectedImportChoice) {
      localStorage.setItem('hasSeenImportChoiceModal', 'true');
      setShowImportChoiceModal(false);
      
      if (selectedImportChoice === 'zoho') {
        // Focus on Zoho import section
        const zohoButton = document.querySelector('[data-zoho-import]');
        if (zohoButton) {
          zohoButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Focus on file upload section
        const uploadSection = document.querySelector('[data-file-upload]');
        if (uploadSection) {
          uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const handleCancelModal = () => {
    localStorage.setItem('hasSeenImportChoiceModal', 'true');
    setShowImportChoiceModal(false);
    setSelectedImportChoice(null);
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen p-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Upload Contacts
            </h2>
            <p className="text-sm text-gray-600 mt-1">Import and manage your contact list across channels</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleZohoConnect}
              disabled={hasZohoAccessToken}
              className="flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              <Database className="mr-2 h-4 w-4" />
              {hasZohoAccessToken ? 'Connected to Zoho CRM' : 'Connect to Zoho CRM'}
            </button>
            <button
              onClick={async () => {
                if (!selectedGigId) {
                  toast.error('Please select a gig first');
                  return;
                }
                await handleImportFromZoho();
              }}
              className="flex items-center rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
              data-zoho-import
            >
              <Download className="mr-2 h-4 w-4" />
              Import from Zoho
            </button>
            <button
              onClick={() => setShowGigsSection(!showGigsSection)}
              className="flex items-center rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              {showGigsSection ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide Gigs
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show Gigs
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Gigs Selection Cards */}
      {showGigsSection && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 transition-all duration-300 ease-in-out">
          <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Users className="mr-2 h-5 w-5 text-indigo-600" />
            Select a Gig
          </h4>
          {isLoadingGigs ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-sm text-gray-600">Loading gigs...</span>
            </div>
          ) : gigs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <Users className="h-12 w-12" />
              </div>
              <p className="text-sm text-gray-500">No gigs available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {gigs.map((gig) => (
                <div
                  key={gig._id}
                  className={`cursor-pointer rounded-xl border-2 p-6 shadow-sm flex flex-col transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    selectedGigId === gig._id 
                      ? 'border-indigo-500 ring-4 ring-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50' 
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                  onClick={() => setSelectedGigId(gig._id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-bold text-lg ${
                      selectedGigId === gig._id ? 'text-indigo-700' : 'text-gray-900'
                    }`}>
                      {gig.title}
                    </span>
                    {selectedGigId === gig._id && (
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className="inline-block rounded-full bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 px-3 py-1 text-xs font-semibold">
                      {gig.category || 'No category'}
                    </span>
                  </div>
                  <div 
                    className="text-sm text-gray-600 line-clamp-3 flex-grow" 
                    style={{
                      display: '-webkit-box', 
                      WebkitLineClamp: 3, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden'
                    }}
                  >
                    {gig.description || 'No description available'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6" data-file-upload>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Upload className="mr-2 h-5 w-5 text-indigo-600" />
              Import Contacts
            </h3>
            <p className="mt-1 text-sm text-gray-600">Upload your contacts from a CSV or Excel file</p>
          </div>
          <button 
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors duration-200"
            onClick={() => {
              // Create a sample CSV template
              const headers = ['Email', 'Phone', 'Lead Name', 'Stage', 'Pipeline', 'Project Tags'];
              const csvContent = headers.join(',') + '\n';
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'contacts_template.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
          >
            Download Template
          </button>
        </div>

        <div className="mt-4">
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 hover:border-indigo-400 transition-colors duration-200">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-lg font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
                    {isProcessing ? 'Processing...' : 'Click to upload'}
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
                <p className="mt-2 text-sm text-gray-500">CSV, Excel files up to 10MB</p>
              </div>
            </div>
            {selectedFile && showFileName && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-indigo-500" />
                    <span className="font-medium text-gray-900">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => {
                    setSelectedFile(null);
                    setUploadProgress(0);
                    setUploadError(null);
                    setUploadSuccess(false);
                    setParsedLeads([]);
                  }}>
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <div className="mt-3">
                  <div className="relative">
                    <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          uploadError ? 'bg-red-500' : uploadSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{uploadProgress}% complete</span>
                    <span>{Math.round(selectedFile.size / 1024)} KB</span>
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
                  {parsedLeads.length > 0 && !uploadSuccess && !uploadError && showSaveButton && (
                    <button
                      className="mt-4 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                      onClick={handleSaveLeads}
                      disabled={isProcessing}
                    >
                      Save {parsedLeads.length} Contacts
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gigs Selection Cards */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Leads List</h3>
            <div className="mt-2">
              {selectedGigId ? (
                <div className="text-sm text-gray-500">
                  {leads.length > 0 ? (
                    <span>Showing {leads.length} leads (Page {currentPage} of {totalPages})</span>
                  ) : (
                    <span>No leads found</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Please select a gig to view leads</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => fetchLeads()}
              className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
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
      {/* Channel Filter */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Globe className="mr-2 h-5 w-5 text-indigo-600" />
          Channel Filter
        </h3>
        <div className="flex flex-wrap gap-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);
            
            return (
              <button
                key={channel.id}
                className={`flex items-center space-x-2 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
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
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Users className="mr-2 h-5 w-5 text-indigo-600" />
                Leads List
              </h3>
              <div className="mt-2">
                {selectedGigId ? (
                  <div className="text-sm text-gray-600">
                    {leads.length > 0 ? (
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                        Showing {leads.length} leads (Page {currentPage} of {totalPages})
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
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm shadow-sm"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm shadow-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={() => fetchLeads()}
                className="flex items-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
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
      </div>

      {/* Ajout d'une section pour afficher les leads en temps réel */}
      {realtimeLeads.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <RefreshCw className="mr-2 h-5 w-5 text-green-600 animate-spin" />
            Leads en temps réel
          </h3>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-green-700">
              Nombre de leads reçus: <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">{realtimeLeads.length}</span>
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0">
                <div className="grid grid-cols-4 px-6 py-3">
                  <div className="text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Email</div>
                  <div className="text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Téléphone</div>
                  <div className="text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Lead</div>
                  <div className="text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Stage</div>
                </div>
              </div>
              <div className="bg-white divide-y divide-gray-100">
                {realtimeLeads.map((lead, index) => (
                  <div key={index} className="grid grid-cols-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="text-sm font-medium text-gray-900">{lead.Email_1 || 'N/A'}</div>
                    <div className="text-sm text-gray-700">{lead.Phone || 'N/A'}</div>
                    <div className="text-sm text-gray-700">{lead.Deal_Name || 'N/A'}</div>
                    <div className="text-sm">
                      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium">
                        {lead.Stage || 'N/A'}
                      </span>
                    </div>
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
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <Upload className="h-6 w-6 text-indigo-600" />
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
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('hasSeenImportChoiceModal', 'true');
                  setShowImportChoiceModal(false);
                }}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadContacts;