/**
 * UploadContacts Component
 * 
 * Ce composant permet de gérer l'importation et la gestion des contacts/leads pour une entreprise.
 * Il offre deux méthodes principales d'importation :
 * 
 * 1. Import depuis un fichier (CSV, Excel, PDF, TXT) :
 *    - Utilise OpenAI pour analyser et extraire les données
 *    - Validation automatique des données
 *    - Prévisualisation avant sauvegarde
 *    - Support de multiples formats de fichiers
 * 
 * 2. Import depuis Zoho CRM :
 *    - Connexion OAuth avec Zoho
 *    - Synchronisation automatique des leads
 *    - Gestion des tokens d'accès
 * 
 * Fonctionnalités principales :
 * - Gestion des gigs (projets) associés aux leads
 * - Filtrage et recherche des contacts
 * - Pagination des résultats
 * - Édition en ligne des données
 * - Validation des données avant import
 * - Interface utilisateur responsive
 * 
 * @component
 * @returns {JSX.Element} Le composant UploadContacts
 */
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
  ChevronDown,
  UserPlus,
  FileSpreadsheet,
  Cloud,
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  LogOut
} from 'lucide-react';
import zohoLogo from '../../assets/public/images/zoho-logo.png';
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

    const processFileWithOpenAI = async (fileContent: string, fileType: string) => {
    try {
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const userId = Cookies.get('userId');
      const gigId = selectedGigId; // Use selected gig ID instead of cookie
      const companyId = Cookies.get('companyId');

      if (!gigId) {
        throw new Error('Please select a gig first');
      }

      const prompt = `
You are a data processing expert. Analyze the following ${fileType} file content and extract lead information.

File content:
${fileContent}

Please process this data and return a JSON array of lead objects with the following MongoDB format:
{
  "leads": [
    {
      "userId": {
        "$oid": "${userId}"
      },
      "companyId": {
        "$oid": "${companyId}"
      },
      "gigId": {
        "$oid": "${gigId}"
      },
      "Last_Activity_Time": null,
      "Deal_Name": "Lead Name",
      "Email_1": "email@example.com",
      "Phone": "+1234567890",
      "Stage": "New",
      "Pipeline": "Sales Pipeline",
      "Project_Tags": ["tag1", "tag2"]
    }
  ],
      "validation": {
        "totalRows": 10,
        "validRows": 8,
        "invalidRows": 2,
        "errors": [
          "Row 3: Invalid email format",
          "Row 7: Missing required fields"
        ]
      }
    }

Rules:
1. Extract email addresses and validate their format
2. Extract phone numbers and standardize them (always include Phone field)
3. Use Deal_Name if available, otherwise use email as Deal_Name
4. Set default Stage to "New" if not provided
5. Set default Pipeline to "Sales Pipeline" if not provided
6. Split Project_Tags by semicolon if multiple tags
7. Only include leads that have at least email OR phone
8. Always include Phone field (use "no-phone@placeholder.com" if no phone provided)
9. Always include Email_1 field (use "no-email@placeholder.com" if no email provided)
10. Use the exact MongoDB ObjectId format with "$oid" for userId, companyId, and gigId
11. Set Last_Activity_Time to null
12. Provide detailed validation feedback
13. IMPORTANT: Use the provided userId, companyId, and gigId values exactly as shown above

Return only the JSON response, no additional text.
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a data processing expert that returns only valid JSON responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const parsedData = JSON.parse(content);
      
      if (!parsedData.leads || !Array.isArray(parsedData.leads)) {
        throw new Error('Invalid response format from OpenAI');
      }

      // Add required fields to each lead with MongoDB ObjectId format
      const processedLeads = parsedData.leads.map((lead: any) => {
        const userId = Cookies.get('userId');
        const gigId = selectedGigId; // Use selected gig ID instead of cookie
        const companyId = Cookies.get('companyId');
        
        return {
          ...lead,
          // Use the MongoDB ObjectId format from OpenAI response, or create it if not present
          userId: lead.userId || { "$oid": userId },
          companyId: lead.companyId || { "$oid": companyId },
          gigId: lead.gigId || { "$oid": gigId },
          // Ensure these fields are always present
          Last_Activity_Time: lead.Last_Activity_Time || null,
          Email_1: lead.Email_1 || "no-email@placeholder.com",
          Phone: lead.Phone || "no-phone@placeholder.com",
          Deal_Name: lead.Deal_Name || "Unnamed Lead",
          Stage: lead.Stage || "New",
          Pipeline: lead.Pipeline || "Sales Pipeline",
          Activity_Tag: lead.Activity_Tag || '',
          Telephony: lead.Telephony || '',
          Project_Tags: lead.Project_Tags || []
        };
      });

      return {
        leads: processedLeads,
        validation: parsedData.validation
      };
    } catch (error) {
      console.error('Error processing with OpenAI:', error);
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
            let fileContent = '';
            let fileType = '';

            // Determine file type based on extension
            const fileExtension = file.name.toLowerCase().split('.').pop();
            
            if (fileExtension === 'xlsx' || fileExtension === 'xls') {
              fileType = 'Excel';
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json: unknown[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              const rows = (json as any[]).map((row: any) => Array.isArray(row) ? row.join(',') : Object.values(row).join(','));
              fileContent = rows.join('\n');
            } else if (fileExtension === 'csv') {
              fileType = 'CSV';
              fileContent = e.target?.result as string;
            } else if (fileExtension === 'json') {
              fileType = 'JSON';
              fileContent = e.target?.result as string;
            } else if (fileExtension === 'txt') {
              fileType = 'Text';
              fileContent = e.target?.result as string;
            } else if (fileExtension === 'pdf') {
              fileType = 'PDF';
              // For PDF files, we'll send the raw content and let OpenAI extract text
              fileContent = e.target?.result as string;
            } else {
              // For any other file type, treat as text
              fileType = 'Unknown';
              fileContent = e.target?.result as string;
            }

            setUploadProgress(30);
            
            // Process with OpenAI
            console.log('Processing file with OpenAI...');
            const result = await processFileWithOpenAI(fileContent, fileType);
            
            setUploadProgress(80);

            if (result.leads.length === 0) {
              toast.error('No valid leads found in the file. Please check the file format and content.');
              setUploadError('No valid leads found');
              setIsProcessing(false);
              setUploadProgress(0);
              return;
            }

            // Show validation results
            if (result.validation) {
              const { totalRows, validRows, invalidRows, errors } = result.validation;
              setValidationResults(result.validation);
              
              if (invalidRows > 0) {
                toast.error(`${invalidRows} rows had validation errors. Check the console for details.`);
                console.log('Validation errors:', errors);
              }
              
              toast.success(`Successfully processed ${validRows} out of ${totalRows} rows`);
            }

            console.log('Leads processed with OpenAI:', result.leads);
            setParsedLeads(result.leads);
            setIsProcessing(false);
            setUploadProgress(100);
            
          } catch (error: any) {
            console.error('Error processing file:', error);
            let errorMessage = 'Error processing file';
            
            if (error.message.includes('OpenAI API key not configured')) {
              errorMessage = 'OpenAI API key not configured. Please check your environment variables.';
            } else if (error.message.includes('OpenAI API error')) {
              errorMessage = 'OpenAI API error. Please check your API key and try again.';
            } else if (error.message.includes('Invalid response format')) {
              errorMessage = 'AI processing returned invalid format. Please check your file structure.';
            } else {
              errorMessage = error.response?.data?.message || error.message || 'Error processing file';
            }
            
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

        // Read file based on type
        const fileExtension = file.name.toLowerCase().split('.').pop();
        
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          reader.readAsArrayBuffer(file);
        } else if (fileExtension === 'pdf') {
          // For PDF files, we'll try to read as text first, then as array buffer if needed
          reader.readAsText(file);
        } else {
          // For all other file types, read as text
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
      // Convert leads to API format (try both MongoDB ObjectId and string formats)
      const currentUserId = Cookies.get('userId');
      const currentGigId = selectedGigId; // Use selected gig ID instead of cookie
      const currentCompanyId = Cookies.get('companyId');
      
      console.log('Current IDs for API:', {
        userId: currentUserId,
        gigId: currentGigId,
        companyId: currentCompanyId
      });
      
      const leadsForAPI = parsedLeads.map((lead: any) => {
        // Use the selected gigId
        const finalGigId = selectedGigId;
        
        // Try string format first (more common for APIs)
        return {
          userId: lead.userId?.$oid || currentUserId,
          companyId: lead.companyId?.$oid || currentCompanyId,
          gigId: lead.gigId?.$oid || finalGigId,
          Last_Activity_Time: lead.Last_Activity_Time || null,
          Deal_Name: lead.Deal_Name || "Unnamed Lead",
          Email_1: lead.Email_1 || "no-email@placeholder.com",
          Phone: lead.Phone || "no-phone@placeholder.com",
          Stage: lead.Stage || "New",
          Pipeline: lead.Pipeline || "Sales Pipeline",
          Activity_Tag: lead.Activity_Tag || '',
          Telephony: lead.Telephony || '',
          Project_Tags: lead.Project_Tags || []
        };
      });

      console.log('Saving leads with MongoDB format:', leadsForAPI);
      console.log('Number of leads to save:', leadsForAPI.length);
      console.log('API URL:', `${import.meta.env.VITE_DASHBOARD_API}/leads`);
      
      // Envoyer chaque lead individuellement pour s'assurer qu'ils sont tous sauvegardés
      const savedLeads = [];
      for (let i = 0; i < leadsForAPI.length; i++) {
        const lead = leadsForAPI[i];
        console.log(`Saving lead ${i + 1}/${leadsForAPI.length}:`, lead);
        
        // Mettre à jour la progression
        const progress = Math.round(((i + 1) / leadsForAPI.length) * 100);
        setUploadProgress(progress);
        
        try {
          const response = await axios.post(`${import.meta.env.VITE_DASHBOARD_API}/leads`, lead, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('gigId')}:${Cookies.get('userId')}`
        }
      });
          
          console.log(`Lead ${i + 1} response status:`, response.status);
          console.log(`Lead ${i + 1} response data:`, response.data);
          
          if (response.status === 200 || response.status === 201) {
            savedLeads.push(response.data);
            console.log(`Lead ${i + 1} saved successfully:`, response.data);
          } else {
            console.error(`Failed to save lead ${i + 1}:`, response.statusText);
          }
        } catch (error) {
          console.error(`Error saving lead ${i + 1}:`, error);
        }
      }
      
      const response = { status: 200, data: savedLeads };
      console.log('Save response:', response.data);
      if (response.status === 200) {
        const savedCount = savedLeads.length;
        const totalCount = leadsForAPI.length;
        
        if (savedCount === totalCount) {
        setUploadSuccess(true);
        setUploadProgress(100);
          toast.success(`Successfully saved all ${savedCount} leads!`);
        } else {
          setUploadError(`Only ${savedCount} out of ${totalCount} leads were saved. Check console for details.`);
          toast.error(`Only ${savedCount} out of ${totalCount} leads were saved.`);
        }
        
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
          setValidationResults(null);
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

  const handleZohoDisconnect = async () => {
    // Confirmation dialog
    // const confirmed = window.confirm(
    //   'Are you sure you want to disconnect from Zoho CRM? This will remove all your Zoho configuration and you will need to reconnect to use Zoho features again.'
    // );
    // if (!confirmed) {
    //   return;
    // }
    
    console.log('Starting Zoho disconnection process...');
    setIsDisconnectingZoho(true);
    try {
      const userId = Cookies.get('userId');
      const gigId = Cookies.get('gigId');
      
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
      console.log('Disconnect response:', data);

      if (data.success) {
        // Reset Zoho service configuration
        const zohoService = ZohoService.getInstance();
        zohoService.resetConfiguration();
        
        setHasZohoConfig(false);
        setHasZohoAccessToken(false);
        toast.success('Successfully disconnected from Zoho CRM');
        
        // Clear any cached Zoho data
        setRealtimeLeads([]);
        setParsedLeads([]);
        // (plus de rafraîchissement ni d'alerte)
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

  // Ajout d'une fonction utilitaire pour fetch Zoho avec refresh automatique
  const fetchZohoWithAutoRefresh = async (url: string, options: RequestInit = {}) => {
    const userId = Cookies.get('userId');
    const gigId = Cookies.get('gigId');
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
          'Authorization': `Bearer ${Cookies.get('gigId')}:${Cookies.get('userId')}`,
          'Accept': 'application/json',
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
      if (!data.success) {
        throw new Error(data.message || `Erreur lors de la synchronisation pour le gig ${selectedGig.title}`);
      }
      if (!data.data || !Array.isArray(data.data.leads)) {
        setRealtimeLeads([]);
        setParsedLeads([]);
        await fetchLeads();
        return;
      }
      const leadsFromApi = data.data.leads;
      setRealtimeLeads(leadsFromApi);
      setParsedLeads(leadsFromApi);
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
      setTotalCount(0);
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
      setFilteredLeads(responseData.data); // Initialiser les leads filtrés
      setTotalPages(responseData.totalPages);
      setCurrentPage(responseData.currentPage);
      setTotalCount(responseData.total);
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
    const maxVisiblePages = 5; // Nombre maximum de pages visibles

    // Si le nombre total de pages est inférieur ou égal au maximum visible, afficher toutes les pages
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
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
      return buttons;
    }

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
    
    // Update gigId in all parsed leads (keep as string for interface compatibility)
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

    // Update the cookie with the new gigId for consistency
    Cookies.set('gigId', newGigId);
    
    // Log the change for debugging
    console.log('Gig changed to:', newGigId);
    console.log('Updated parsedLeads with new gigId');
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.zohoConnected) {
        console.log('Received zohoConnected message');
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

  const testOpenAIConnection = async () => {
    try {
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!openaiApiKey) {
        toast.error('OpenAI API key not configured');
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message. Please respond with "Connection successful" if you can read this.'
            }
          ],
          max_tokens: 10
        })
      });

      if (response.ok) {
        toast.success('OpenAI connection successful!');
      } else {
        toast.error('OpenAI connection failed. Please check your API key.');
      }
    } catch (error) {
      console.error('OpenAI test error:', error);
      toast.error('OpenAI connection test failed');
    }
  };

  const handleEditLead = (index: number, field: string, value: string) => {
    const newLeads = [...parsedLeads];
    newLeads[index] = { ...newLeads[index], [field]: value };
    setParsedLeads(newLeads);
  };

  // Fonction de filtrage des leads
  const filterLeads = (leads: Lead[], query: string, status: string) => {
    return leads.filter(lead => {
      // Filtre par recherche textuelle
      const searchMatch = query === '' || 
        lead.Deal_Name?.toLowerCase().includes(query.toLowerCase()) ||
        lead.Email_1?.toLowerCase().includes(query.toLowerCase()) ||
        lead.Phone?.toLowerCase().includes(query.toLowerCase()) ||
        lead.Stage?.toLowerCase().includes(query.toLowerCase()) ||
        lead.Pipeline?.toLowerCase().includes(query.toLowerCase());

      // Filtre par statut
      const statusMatch = status === 'all' || 
        (status === 'active' && lead.Stage !== 'Closed') ||
        (status === 'inactive' && lead.Stage === 'Closed');

      return searchMatch && statusMatch;
    });
  };

  // Effet pour filtrer les leads quand la recherche ou le statut change
  useEffect(() => {
    const filtered = filterLeads(leads, searchQuery, filterStatus);
    setFilteredLeads(filtered);
  }, [leads, searchQuery, filterStatus]);

  const handleCancelModal = () => {
    localStorage.setItem('hasSeenImportChoiceModal', 'true');
    setShowImportChoiceModal(false);
    setSelectedImportChoice(null);
  };

  return (
    <div className="space-y-4 bg-gradient-to-br from-blue-50 to-white min-h-screen p-4">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-start space-x-6 mb-6">
          <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 mb-3 flex items-center">
            <UserPlus className="mr-3 h-8 w-8 text-blue-600" />
            Upload Contacts
          </h1>
            <p className="text-lg text-gray-600">
              Import, manage, and organize your leads efficiently. Choose between connecting with your CRM system or uploading contact files directly.
            </p>
          </div>
        </div>
      </div>



      {/* Gigs Selection Dropdown */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 transition-all duration-300 ease-in-out">
        <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
          <Settings className="mr-3 h-6 w-6 text-slate-600" />
          Select a Gig
        </h4>
        {isLoadingGigs ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            <span className="ml-4 text-base text-slate-600 font-medium">Loading gigs...</span>
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 text-slate-300 mb-4">
              <Settings className="h-16 w-16" />
            </div>
            <p className="text-base text-slate-500 font-medium">No gigs available.</p>
          </div>
        ) : (
          <div className="max-w-lg">
            <select
              value={selectedGigId}
              onChange={(e) => setSelectedGigId(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 py-4 px-5 text-base font-medium focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 bg-white shadow-sm hover:border-slate-400 transition-all duration-200"
            >
              <option value="" className="text-slate-500">Select a gig...</option>
              {gigs.map((gig) => (
                <option key={gig._id} value={gig._id} className="text-slate-900">
                  {gig.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Import Methods Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Cloud className="mr-2 h-5 w-5 text-blue-600" />
            Import Leads
          </h3>
          <p className="mt-1 text-sm text-gray-600">Choose your preferred method to import leads into your selected gig.</p>
        </div>

        {/* Import Methods Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
          {/* Zoho Import Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 border-2 border-blue-200 shadow-sm">
                  <img 
                    src={zohoLogo} 
                    alt="Zoho CRM" 
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-blue-900">Zoho CRM Integration</h4>
                  <p className="text-sm text-blue-700">Connect and sync with your Zoho CRM</p>
                  {hasZohoAccessToken && (
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-green-700 font-medium">Connected</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                {hasZohoAccessToken ? (
                  <button
                    onClick={handleZohoDisconnect}
                    disabled={isDisconnectingZoho}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-200 hover:bg-red-300 rounded-xl transition-colors duration-200 shadow-sm disabled:opacity-50"
                  >
                    {isDisconnectingZoho ? (
                      <div className="flex items-center">
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleZohoConnect}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-200 hover:bg-blue-300 rounded-xl transition-colors duration-200 shadow-sm"
                  >
                    <div className="flex items-center">
                      <img 
                        src={zohoLogo} 
                        alt="Zoho" 
                        className="h-4 w-4 mr-2 object-contain"
                      />
                      Connect to Zoho
                    </div>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={async () => {
                if (!selectedGigId) {
                  toast.error('Please select a gig first');
                  return;
                }
                await handleImportFromZoho();
              }}
              disabled={!hasZohoAccessToken || isImportingZoho}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {isImportingZoho ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
                  Importing from Zoho...
                </div>
              ) : !hasZohoAccessToken ? (
                <div className="flex items-center justify-center">
                  <img 
                    src={zohoLogo} 
                    alt="Zoho" 
                    className="h-6 w-6 mr-3 object-contain"
                  />
                  Connect to Zoho CRM First
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <img 
                    src={zohoLogo} 
                    alt="Zoho" 
                    className="h-6 w-6 mr-3 object-contain"
                  />
                  Sync with Zoho CRM
                </div>
              )}
            </button>
          </div>

          {/* File Upload Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]" data-file-upload>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 border-2 border-blue-200 shadow-sm">
                  <FileSpreadsheet className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-blue-900">File Upload</h4>
                  <p className="text-sm text-blue-700">Upload and process contact files</p>
                </div>
              </div>
            </div>
            
            {/* File Upload Area */}
            <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer">
              <label htmlFor="file-upload" className="cursor-pointer group block">
                <div className="flex items-center justify-center space-x-3">
                  <FileSpreadsheet className="h-6 w-6 text-white" />
                  <span className="text-base font-semibold text-white group-hover:text-blue-100 transition-colors duration-200">
                    {isProcessing ? (
                      <div className="flex items-center">
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Click to upload or drag and drop'
                    )}
                  </span>
                </div>
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
            <div className="mt-3">
              <div className="relative">
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      uploadError ? 'bg-red-500' : uploadSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'
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
                <div className="mt-4 space-y-4">
                  {validationResults && (
                                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                      <Info className="mr-2 h-4 w-4" />
                      AI Processing Results
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600 font-medium">Total Rows:</span> {validationResults.totalRows}
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Valid Rows:</span> {validationResults.validRows}
                      </div>
                      {validationResults.invalidRows > 0 && (
                        <div className="col-span-2">
                          <span className="text-red-600 font-medium">Invalid Rows:</span> {validationResults.invalidRows}
                        </div>
                      )}
                    </div>
                    {validationResults.errors && validationResults.errors.length > 0 && (
                      <div className="mt-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            View validation errors ({validationResults.errors.length})
                          </summary>
                            <div className="mt-2 space-y-1">
                              {validationResults.errors.map((error: string, index: number) => (
                                <div key={index} className="text-red-600 bg-red-50 p-2 rounded">
                                  {error}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
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
                                        toast.success('Lead removed');
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
                                          toast.success('Lead updated');
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
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    onClick={handleSaveLeads}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Saving Contacts...
                      </div>
                    ) : (
                                              <div className="flex items-center justify-center">
                          <UserPlus className="mr-2 h-5 w-5" />
                          Save {parsedLeads.length} Contacts
                        </div>
                    )}
                  </button>
                </div>
              )}
            </div>
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
                className={`flex items-center space-x-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  isSelected
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
                    {leads.length > 0 ? (
                                          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                      Showing {filteredLeads.length} of {leads.length} leads {searchQuery && `(filtered by "${searchQuery}")`}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                onClick={() => fetchLeads()}
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
        <div className="overflow-x-auto">
          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            <div className="relative">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                      Lead
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                      Lead Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                      Stage
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                      Pipeline
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                      Last Activity
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
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                          Loading leads...
                        </div>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center py-8">
                          <FileText className="h-12 w-12 text-gray-300 mb-2" />
                          <p>No leads found</p>
                          <p className="text-xs text-gray-400 mt-1">Try importing some leads or check your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center py-8">
                          <Search className="h-12 w-12 text-gray-300 mb-2" />
                          <p>No leads match your search</p>
                          <p className="text-xs text-gray-400 mt-1">Try adjusting your search terms or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead, index) => (
                      <tr key={lead._id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserPlus className="h-6 w-6 text-blue-700" />
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
                                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
                  {lead.Stage || 'N/A'}
                </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {lead.Pipeline || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Pagination Controls */}
        {filteredLeads.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
                              <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Showing <span className="font-medium">{filteredLeads.length}</span> of{' '}
                    <span className="font-medium">{leads.length}</span> leads
                    {searchQuery && (
                      <span className="text-indigo-600"> (filtered by "{searchQuery}")</span>
                    )}
                  </span>
                </div>
                              <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSearchQuery('')}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Search
                  </button>
                </div>
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
            <div className="grid grid-cols-4 px-6 py-3">
              <div className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Email</div>
              <div className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Téléphone</div>
              <div className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Lead</div>
              <div className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Stage</div>
            </div>
          </div>
              <div className="bg-white divide-y divide-gray-100">
                {realtimeLeads.map((lead, index) => (
                  <div key={index} className="grid grid-cols-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="text-sm font-medium text-gray-900">{lead.Email_1 || 'N/A'}</div>
                    <div className="text-sm text-gray-700">{lead.Phone || 'N/A'}</div>
                    <div className="text-sm text-gray-700">{lead.Deal_Name || 'N/A'}</div>
                    <div className="text-sm">
                                        <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-800 px-2.5 py-0.5 text-xs font-medium">
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
};

export default UploadContacts;