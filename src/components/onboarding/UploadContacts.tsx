import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
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
  Settings,
  Plus,
  X,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Cookies from 'js-cookie';

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
  const [showZohoModal, setShowZohoModal] = useState(false);
  const [hasZohoConfig, setHasZohoConfig] = useState(false);
  const [zohoConfig, setZohoConfig] = useState({
    clientId: localStorage.getItem('zoho_client_id') || '',
    clientSecret: localStorage.getItem('zoho_client_secret') || '',
    refreshToken: localStorage.getItem('zoho_refresh_token') || '',
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

  const defaultUserId = '680b62682c1ca099fe2b14ff';
  const defaultGigId = '680b62682c1ca099fe2b14ff';

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
                  userId: Cookies.get('userId') || defaultUserId,
                  gigId: Cookies.get('gigId') || defaultGigId,
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
          'Authorization': `Bearer ${Cookies.get('gigId') || defaultGigId}:${Cookies.get('userId') || defaultUserId}`
        }
      });
      console.log('Save response:', response.data);
      if (response.status === 200) {
        setUploadSuccess(true);
        setUploadProgress(100);
        toast.success(`Successfully uploaded ${parsedLeads.length} contacts!`);
        
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

  const checkZohoConfig = async () => {
    try {
      console.log('🔍 Vérification de la configuration Zoho...');
      const userId = Cookies.get('userId') || defaultUserId;
      console.log('👤 UserId utilisé:', userId);
      
      // Vérifier si nous avons déjà un access token valide
      const accessToken = localStorage.getItem('zoho_access_token');
      const tokenExpiry = localStorage.getItem('zoho_token_expiry');
      
      if (accessToken && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const currentTime = Date.now();
        
        // Si le token n'est pas expiré, on l'utilise
        if (currentTime < expiryTime) {
          console.log('✅ Access token valide trouvé');
          setHasZohoConfig(true);
          return;
        }
        
        // Si le token est expiré, on essaie de le rafraîchir
        console.log('🔄 Access token expiré, tentative de rafraîchissement...');
        const refreshToken = localStorage.getItem('zoho_refresh_token');
        if (refreshToken) {
          const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              refreshToken,
              userId,
              companyId: Cookies.get('companyId')
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.accessToken) {
              // Stocker le nouveau token avec son expiration (1 heure)
              localStorage.setItem('zoho_access_token', data.accessToken);
              localStorage.setItem('zoho_token_expiry', (Date.now() + 3600000).toString());
              console.log('✅ Nouveau access token obtenu');
              setHasZohoConfig(true);
              return;
            }
          }
        }
      }

      // Si on arrive ici, on vérifie la configuration de base
      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/config/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Réponse du serveur:', data);
        setHasZohoConfig(data.hasConfig);
        console.log('📝 État de la configuration Zoho:', data.hasConfig ? 'Configuré' : 'Non configuré');
      } else {
        console.error('❌ Erreur lors de la vérification:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de la configuration Zoho:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 Composant monté - Vérification initiale de la configuration Zoho');
    checkZohoConfig();
  }, []);

  useEffect(() => {
    console.log('📊 État actuel de hasZohoConfig:', hasZohoConfig);
    if (!hasZohoConfig) {
      console.log('⚠️ Configuration Zoho non trouvée - Affichage de la modal');
      setShowZohoModal(true);
    } else {
      console.log('✅ Configuration Zoho trouvée - Pas besoin d\'afficher la modal');
    }
  }, [hasZohoConfig]);

  const handleZohoConfig = async () => {
    try {
      const userId = Cookies.get('userId') || defaultUserId;
      const companyId = Cookies.get('companyId');
      console.log('Configuring Zoho with userId:', userId);
      console.log('Zoho config data:', zohoConfig);

      if (!companyId) {
        throw new Error('Company ID not found in cookies');
      }

      // Sauvegarder la configuration dans le localStorage
      localStorage.setItem('zoho_client_id', zohoConfig.clientId);
      localStorage.setItem('zoho_client_secret', zohoConfig.clientSecret);
      localStorage.setItem('zoho_refresh_token', zohoConfig.refreshToken);

      const configResponse = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...zohoConfig,
          userId,
          companyId
        })
      });

      console.log('Config response status:', configResponse.status);
      const data = await configResponse.json();
      console.log('Config response data:', data);

      if (configResponse.status === 200) {
        if (data.accessToken) {
          // Stocker le token avec son expiration (1 heure)
          localStorage.setItem('zoho_access_token', data.accessToken);
          localStorage.setItem('zoho_token_expiry', (Date.now() + 3600000).toString());
          console.log('Zoho access token stored in localStorage:', data.accessToken);
          setHasZohoConfig(true);
        } else {
          console.error('No access token in response:', data);
        }
        toast.success('Zoho CRM configuration saved successfully');
        setShowZohoModal(false);
      } else {
        throw new Error(data.message || 'Error configuring Zoho CRM');
      }
    } catch (error: any) {
      console.error('Error in handleZohoConfig:', error);
      toast.error(error.message || 'Error configuring Zoho CRM');
    }
  };

  const handleImportFromZoho = async () => {
    setIsImportingZoho(true);
    setRealtimeLeads([]);
    try {
      const userId = Cookies.get('userId') || defaultUserId;
      const companyId = Cookies.get('companyId');
      
      if (!companyId) {
        toast.error('Configuration de l\'entreprise non trouvée. Veuillez vous reconnecter.');
        return;
      }

      // Vérifier et rafraîchir le token si nécessaire
      const accessToken = localStorage.getItem('zoho_access_token');
      const tokenExpiry = localStorage.getItem('zoho_token_expiry');
      
      if (!accessToken || !tokenExpiry || Date.now() >= parseInt(tokenExpiry)) {
        const refreshToken = localStorage.getItem('zoho_refresh_token');
        if (!refreshToken) {
          toast.error('Configuration Zoho non trouvée. Veuillez configurer Zoho CRM d\'abord.');
          return;
        }

        // Rafraîchir le token
        const refreshResponse = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refreshToken,
            userId,
            companyId
          })
        });

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh token');
        }

        const refreshData = await refreshResponse.json();
        localStorage.setItem('zoho_access_token', refreshData.accessToken);
        localStorage.setItem('zoho_token_expiry', (Date.now() + 3600000).toString());
      }

      setParsedLeads([]);
      
      try {
        const apiUrl = `${import.meta.env.VITE_DASHBOARD_API}/zoho/leads/sync-all`;
        const checkResponse = await fetch(apiUrl, { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('zoho_access_token')}`,
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: userId,
            companyId: companyId,
            gigId: Cookies.get('gigId') || defaultGigId
          })
        });

        if (!checkResponse.ok) {
          const errorData = await checkResponse.json().catch(() => null);
          throw new Error(errorData?.message || 'Erreur lors de la synchronisation avec Zoho');
        }

        const data = await checkResponse.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Erreur lors de la synchronisation');
        }

        const { leads, sync_info } = data.data;
        setRealtimeLeads(leads);
        setParsedLeads(leads);
        toast.success(`Synchronisation terminée. ${sync_info.total_saved} leads importés avec succès.`);

      } catch (error: any) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          toast.error('Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.');
        } else {
          toast.error(error.message || 'Une erreur est survenue lors de la synchronisation');
        }
      }

    } catch (error: any) {
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
          'Authorization': `Bearer ${Cookies.get('gigId') || defaultGigId}:${Cookies.get('userId') || defaultUserId}`,
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

  const handleCreateGig = () => {
    window.location.href = '/app6';
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
          'Authorization': `Bearer ${Cookies.get('gigId') || defaultGigId}:${Cookies.get('userId') || defaultUserId}`,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Upload Contacts</h2>
          <p className="text-sm text-gray-500">Import and manage your contact list across channels</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <select
              value={selectedGigId}
              onChange={handleGigChange}
              disabled={isLoadingGigs}
              className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              {isLoadingGigs ? (
                <option>Loading gigs...</option>
              ) : gigs.length === 0 ? (
                <option value="">No gigs available</option>
              ) : (
                <>
                  <option value="">Select a gig</option>
                  {gigs.map((gig) => (
                    <option key={gig._id} value={gig._id}>
                      {gig.title}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          {!hasZohoConfig && (
            <button 
              onClick={() => setShowZohoModal(true)}
              className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <Database className="mr-2 h-4 w-4" />
              Configure Zoho CRM
            </button>
          )}
          <button 
            onClick={handleImportFromZoho}
            disabled={isImportingZoho || !hasZohoConfig}
            className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {isImportingZoho ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import from Zoho
              </>
            )}
          </button>
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
          <button 
            onClick={handleCreateGig}
            className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Gig
          </button>
        </div>
      </div>

      {/* Zoho Configuration Modal */}
      {showZohoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setShowZohoModal(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Configure Zoho CRM</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                        Client ID
                      </label>
                      <input
                        type="text"
                        id="clientId"
                        value={zohoConfig.clientId}
                        onChange={(e) => setZohoConfig({...zohoConfig, clientId: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        id="clientSecret"
                        value={zohoConfig.clientSecret}
                        onChange={(e) => setZohoConfig({...zohoConfig, clientSecret: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="refreshToken" className="block text-sm font-medium text-gray-700">
                        Refresh Token
                      </label>
                      <input
                        type="password"
                        id="refreshToken"
                        value={zohoConfig.refreshToken}
                        onChange={(e) => setZohoConfig({...zohoConfig, refreshToken: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleZohoConfig}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Configuration
                </button>
                <button
                  type="button"
                  onClick={() => setShowZohoModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Import Contacts</h3>
            <p className="mt-1 text-sm text-gray-500">Upload your contacts from a CSV or Excel file</p>
          </div>
          <button 
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            onClick={() => {
              // Create a sample CSV template
              const headers = ['Email', 'Phone', 'Deal Name', 'Stage', 'Pipeline', 'Project Tags'];
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
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-indigo-600">
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
                <p className="mt-1 text-xs text-gray-500">CSV, Excel files up to 10MB</p>
              </div>
            </div>
            {selectedFile && showFileName && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => {
                    setSelectedFile(null);
                    setUploadProgress(0);
                    setUploadError(null);
                    setUploadSuccess(false);
                    setParsedLeads([]);
                  }}>
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <div className="mt-2">
                  <div className="relative">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          uploadError ? 'bg-red-600' : uploadSuccess ? 'bg-green-600' : 'bg-indigo-600'
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
                    <div className="mt-2 text-sm text-red-600">
                      {uploadError}
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="mt-2 text-sm text-green-600">
                      File uploaded successfully!
                    </div>
                  )}
                  {parsedLeads.length > 0 && !uploadSuccess && !uploadError && showSaveButton && (
                    <button
                      className="mt-4 w-full rounded bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      onClick={handleSaveLeads}
                      disabled={isProcessing}
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel Filter */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Channel Filter</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);
            
            return (
              <button
                key={channel.id}
                className={`flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Leads List</h3>
              {!selectedGigId ? (
                <p className="mt-1 text-sm text-gray-500">
                  Please select a gig to view leads
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm font-medium text-indigo-600">
                    {gigs.find(gig => gig._id === selectedGigId)?.title || 'Selected Gig'}
                  </p>
                  {leads.length > 0 ? (
                    <p className="mt-1 text-sm text-gray-500">
                      Showing {leads.length} leads (Page {currentPage} of {totalPages})
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">
                      No leads found
                    </p>
                  )}
                </>
              )}
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
                disabled={isLoadingLeads}
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Lead
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Deal Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Stage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Pipeline
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Activity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-red-500">
                    {error}
                  </td>
                </tr>
              ) : isLoadingLeads ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead._id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{lead.Email_1 || 'No Email'}</div>
                          <div className="text-sm text-gray-500">{lead.Phone || 'No Phone'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {lead.Deal_Name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                        {lead.Stage || 'N/A'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {lead.Pipeline || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button className="mr-2 text-indigo-600 hover:text-indigo-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => fetchLeads(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLeads(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => fetchLeads(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                {renderPaginationButtons()}
                <button
                  onClick={() => fetchLeads(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Ajout d'une section pour afficher les leads en temps réel */}
      {realtimeLeads.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900">Leads en temps réel</h3>
          <p className="mt-1 text-sm text-gray-500">Nombre de leads reçus: {realtimeLeads.length}</p>
          <div className="mt-4 max-h-60 overflow-y-auto">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-gray-50">
                <div className="grid grid-cols-4 px-6 py-3">
                  <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</div>
                  <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</div>
                  <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal</div>
                  <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</div>
                </div>
              </div>
              <div className="bg-white divide-y divide-gray-200">
                {realtimeLeads.map((lead, index) => (
                  <div key={index} className="grid grid-cols-4 px-6 py-4">
                    <div className="text-sm text-gray-900">{lead.Email_1 || 'N/A'}</div>
                    <div className="text-sm text-gray-900">{lead.Phone || 'N/A'}</div>
                    <div className="text-sm text-gray-900">{lead.Deal_Name || 'N/A'}</div>
                    <div className="text-sm text-gray-900">{lead.Stage || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadContacts;