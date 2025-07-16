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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Simple Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Contacts</h1>
        <p className="text-gray-600">Import your leads from files or Zoho CRM</p>
      </div>



      {/* Gig Selection */}
      <div className="bg-white border rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Gig</label>
        {isLoadingGigs ? (
          <div className="flex items-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">Loading gigs...</span>
          </div>
        ) : (
          <select
            value={selectedGigId}
            onChange={(e) => setSelectedGigId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Choose a gig...</option>
            {gigs.map((gig) => (
              <option key={gig._id} value={gig._id}>
                {gig.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Import Methods */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Import Methods</h3>
        
        <div className="space-y-4">
          {/* Zoho Import */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <img src={zohoLogo} alt="Zoho" className="h-6 w-6 mr-2" />
                <span className="font-medium">Zoho CRM</span>
              </div>
              <button
                onClick={handleZohoConnect}
                disabled={hasZohoAccessToken}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded disabled:opacity-50"
              >
                {hasZohoAccessToken ? 'Connected' : 'Connect'}
              </button>
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
              className="w-full bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
            >
              {isImportingZoho ? 'Importing...' : 'Import from Zoho'}
            </button>
          </div>

          {/* File Upload */}
          <div className="border rounded-lg p-4" data-file-upload>
            <div className="flex items-center mb-3">
              <Upload className="h-5 w-5 mr-2 text-gray-600" />
              <span className="font-medium">File Upload</span>
            </div>
            
            <label htmlFor="file-upload" className="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="*"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              {isProcessing ? 'Processing...' : 'Click to upload file'}
            </label>
          </div>
        </div>

                {/* File Processing Results */}
        {selectedFile && showFileName && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">{selectedFile.name}</span>
              <button onClick={() => {
                setSelectedFile(null);
                setUploadProgress(0);
                setUploadError(null);
                setUploadSuccess(false);
                setParsedLeads([]);
                setValidationResults(null);
              }}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${
                  uploadError ? 'bg-red-500' : uploadSuccess ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            
            {uploadError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {uploadError}
              </div>
            )}
            
            {uploadSuccess && (
              <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                File uploaded successfully!
              </div>
            )}
            
            {parsedLeads.length > 0 && !uploadSuccess && !uploadError && showSaveButton && (
              <div className="mt-4">
                {validationResults && (
                  <div className="bg-blue-50 p-3 rounded mb-3">
                    <div className="text-sm">
                      <div>Total: {validationResults.totalRows}</div>
                      <div>Valid: {validationResults.validRows}</div>
                      {validationResults.invalidRows > 0 && (
                        <div>Invalid: {validationResults.invalidRows}</div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mb-3">
                  <h4 className="font-medium mb-2">Preview ({parsedLeads.length} leads)</h4>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {parsedLeads.slice(0, 5).map((lead: any, index: number) => (
                      <div key={index} className="text-sm py-1 border-b last:border-b-0">
                        <div className="font-medium">{lead.Deal_Name || 'Unnamed'}</div>
                        <div className="text-gray-600">{lead.Email_1 || 'No email'}</div>
                      </div>
                    ))}
                    {parsedLeads.length > 5 && (
                      <div className="text-sm text-gray-500 py-1">
                        ... and {parsedLeads.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
                  onClick={handleSaveLeads}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Saving...' : `Save ${parsedLeads.length} Contacts`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Channel Filter */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Channel Filter</h3>
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);
            
            return (
              <button
                key={channel.id}
                className={`px-3 py-1 text-sm rounded ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => toggleChannel(channel.id)}
              >
                <Icon className="h-4 w-4 inline mr-1" />
                {channel.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact List */}
      <div className="bg-white border rounded-lg">
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Leads List</h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={() => fetchLeads()}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                disabled={isLoadingLeads || !selectedGigId}
              >
                {isLoadingLeads ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {selectedGigId && (
            <div className="text-sm text-gray-600">
              {leads.length > 0 ? (
                <span>Showing {filteredLeads.length} of {leads.length} leads</span>
              ) : (
                <span>No leads found</span>
              )}
            </div>
          )}
        </div>
        {/* Leads Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Stage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {error ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-red-500">
                    {error}
                  </td>
                </tr>
              ) : isLoadingLeads ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                    No leads found
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                    No leads match your search
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{lead.Email_1 || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{lead.Phone || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{lead.Deal_Name || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {lead.Stage || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {filteredLeads.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {filteredLeads.length} of {leads.length} leads
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Leads */}
      {realtimeLeads.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Real-time Leads ({realtimeLeads.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Stage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {realtimeLeads.map((lead, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{lead.Email_1 || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{lead.Phone || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{lead.Deal_Name || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {lead.Stage || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Choice Modal */}
      {showImportChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Choose your import method
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Import leads from Zoho CRM or upload a file
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCancelModal}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('hasSeenImportChoiceModal', 'true');
                  setShowImportChoiceModal(false);
                }}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded"
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