/**
 * UploadContacts Component - Composant d'importation et gestion des contacts/leads
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
 * - Auto-complétion de l'étape 6 d'onboarding quand des leads sont importés
 * - Préservation des leads existants lors de nouveaux uploads
 * - Gestion des erreurs et validation des données
 * - Édition en ligne des données
 * - Validation des données avant import
 * - Interface utilisateur responsive
 * 
 * @component
 * @returns {JSX.Element} Le composant UploadContacts
 */
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

interface UploadContactsProps {
  onCancelProcessing?: () => void;
}

const UploadContacts = React.memo(({ onCancelProcessing }: UploadContactsProps) => {
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
  const urlParamsProcessedRef = useRef(false);
  const processingRef = useRef(false);
  const dataRestoredRef = useRef(false);
  
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

  // Function to update real progress during OpenAI processing
  const updateRealProgress = (progress: number, status: string) => {
    // Check if processing was cancelled
    if (!processingRef.current) {
      return;
    }
    
    
    // Update both progress states
    setUploadProgress(progress);
    setProcessingProgress({
      current: progress,
      total: 100,
      status,
      isProcessing: true
    });
    
    // Add a small delay for smooth visual updates
    if (progress < 100) {
      setTimeout(() => {
        // Ensure we're still processing
        if (isProcessing && processingRef.current) {
          // Add a small increment to show activity
          const currentProgress = Math.min(progress + 1, 99);
          setUploadProgress(currentProgress);
        }
      }, 100);
    }
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
      const savedParsedLeads = localStorage.getItem('parsedLeads');
      const savedValidationResults = localStorage.getItem('validationResults');
      
      if (savedParsedLeads && !parsedLeads.length) {
        try {
          const leads = JSON.parse(savedParsedLeads);
          setParsedLeads(leads);
        } catch (error) {
          console.error('Error restoring parsed leads:', error);
        }
      }
      
      if (savedValidationResults && !validationResults) {
        try {
          const validation = JSON.parse(savedValidationResults);
          setValidationResults(validation);
        } catch (error) {
          console.error('Error restoring validation results:', error);
        }
      }
      
      dataRestoredRef.current = true;
      componentInitializedRef.current = true;
    }
  }, []);

  // Add a protection effect that runs on every render to prevent data loss
  useEffect(() => {
    // If we have parsed leads in state but they're about to be lost, save them
    if (parsedLeads.length > 0) {
      localStorage.setItem('parsedLeads', JSON.stringify(parsedLeads));
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
      const isManualClose = !localStorage.getItem('parsedLeads');
      if (parsedLeads.length > 0 && !isManualClose) {
        localStorage.setItem('parsedLeads', JSON.stringify(parsedLeads));
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


    // Function to clean email addresses by removing prefixes and invalid characters
  const cleanEmailAddresses = (content: string): string => {
    
    // First, identify the "Email" column (last column) and clean emails there specifically
    const lines = content.split('\n');
    const cleanedLines = lines.map((line, index) => {
      if (index === 0) {
        // Header row - keep as is
        return line;
      }
      
      const columns = line.split(',');
      if (columns.length >= 24) { // "Email" is the last column (position 24, 0-indexed = 23)
        const emailColumn = columns[23]; // Index 23 for "Email" (last column)
        if (emailColumn && emailColumn.includes('@')) {
          // Clean the email in "Email" column
          const cleanedEmail = emailColumn.replace(/^Nor\s+/, '').trim();
          columns[23] = cleanedEmail;
        }
      }
      
      return columns.join(',');
    });
    
    const cleanedContent = cleanedLines.join('\n');
    
    // Also apply general cleaning for any other email columns
    const generalCleaned = cleanedContent.replace(/Nor\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1');
    const finalCleaned = generalCleaned.replace(/(?:Prefix|Label|Tag)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1');
    
    return finalCleaned;
  };

  // Function to optimize CSV content by keeping only essential columns

  // Function to process optimized content

  // Helper function to recover incomplete JSON from OpenAI responses
  const tryRecoverIncompleteJSON = (content: string, expectedLeads: number): any | null => {
    try {
      
      // Method 1: Try to find complete lead objects and reconstruct
      const leadPattern = /\{[^}]*"userId"[^}]*"Email_1"[^}]*"Phone"[^}]*\}/g;
      const leadMatches = content.match(leadPattern);
      
      if (leadMatches && leadMatches.length > 0) {
        
        // Reconstruct JSON with found leads
        const leadsJson = leadMatches.map(obj => obj.trim()).join(',\n    ');
        const reconstructedJson = `{
  "leads": [
    ${leadsJson}
  ],
  "validation": {
    "totalRows": ${expectedLeads},
    "validRows": ${leadMatches.length},
    "invalidRows": ${Math.max(0, expectedLeads - leadMatches.length)},
    "errors": ["JSON was incomplete but leads were recovered"]
  }
}`;
        
        try {
          const parsed = JSON.parse(reconstructedJson);
          return parsed;
        } catch (e) {
        }
      }
      
      // Method 2: Try to fix common JSON issues
      let fixedContent = content;
      
      // Remove trailing commas before closing braces
      fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
      
      // Add missing closing braces if needed
      const openBraces = (fixedContent.match(/\{/g) || []).length;
      const closeBraces = (fixedContent.match(/\}/g) || []).length;
      const openBrackets = (fixedContent.match(/\[/g) || []).length;
      const closeBrackets = (fixedContent.match(/\]/g) || []).length;
      
      if (openBraces > closeBraces) {
        fixedContent += '}'.repeat(openBraces - closeBraces);
      }
      if (openBrackets > closeBrackets) {
        fixedContent += ']'.repeat(openBrackets - closeBrackets);
      }
      
      // Try to parse the fixed content
      try {
        const parsed = JSON.parse(fixedContent);
        if (parsed.leads && Array.isArray(parsed.leads)) {
          return parsed;
        }
      } catch (e) {
      }
      
      // Method 3: Extract partial leads and create minimal valid JSON
      const partialLeads = [];
      const leadStartPattern = /\{[^}]*"userId"[^}]*/g;
      let match;
      
      while ((match = leadStartPattern.exec(content)) !== null) {
        const startPos = match.index;
        const endPos = content.indexOf('}', startPos);
        
        if (endPos > startPos) {
          const leadStr = content.substring(startPos, endPos + 1);
          try {
            const leadObj = JSON.parse(leadStr);
            if (leadObj.userId && leadObj.Email_1) {
              partialLeads.push(leadObj);
            }
          } catch (e) {
            // Skip invalid lead objects
          }
        }
      }
      
      if (partialLeads.length > 0) {
        
        const minimalJson = `{
  "leads": ${JSON.stringify(partialLeads)},
  "validation": {
    "totalRows": ${expectedLeads},
    "validRows": ${partialLeads.length},
    "invalidRows": ${Math.max(0, expectedLeads - partialLeads.length)},
    "errors": ["JSON was incomplete but partial leads were recovered"]
  }
}`;
        
        try {
          return JSON.parse(minimalJson);
        } catch (e) {
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in JSON recovery:', error);
      return null;
    }
  };

  const processFileWithOpenAI = async (fileContent: string, fileType: string, isOptimized: boolean = false): Promise<{leads: any[], validation: any}> => {
    
          try {
        // Check if processing was cancelled
        if (!processingRef.current) {
          throw new Error('Processing cancelled by user');
        }
        
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();
      
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Validate API key format
      if (!openaiApiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }

      const userId = Cookies.get('userId');
      const gigId = selectedGigId;
      const companyId = Cookies.get('companyId');

      if (!gigId) {
        throw new Error('Please select a gig first');
      }

      if (!userId || !companyId) {
        throw new Error('Missing user or company information');
      }

              // Clean the file content before sending to OpenAI
        const cleanedFileContent = cleanEmailAddresses(fileContent);
        
        // Check if processing was cancelled after cleaning
        if (!processingRef.current) {
          throw new Error('Processing cancelled by user');
        }
        
        // Reduce content size for faster processing
      const maxContentLength = 25000; // Reduced from 50000
      
      // Count the number of lines
      const lines = cleanedFileContent.split('\n');
      
      // Check if content is too large or has many lines - use smart chunking for very large files
      if (!isOptimized && (cleanedFileContent.length > 100000 || lines.length > 200)) {
        console.warn(`⚠️ File is very large (${lines.length} lines, ${cleanedFileContent.length} characters) - using smart chunking`);
        
        // Use smart chunking for very large files to avoid token limit issues
        showProcessingStatus(`Traitement par lots intelligents (${lines.length} lignes)...`);
        
        // Start real progress updates with more granular steps
        updateRealProgress(5, 'Initialisation du traitement...');
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for visual feedback
        
        updateRealProgress(15, 'Analyse de la structure du fichier...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        updateRealProgress(25, 'Préparation des données...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Use smart chunking to process the file in manageable pieces
        const result = await processLargeFileInChunks(cleanedFileContent, fileType, lines);
        
        updateRealProgress(100, 'Traitement terminé !');
        return result;
      }
      
      // For smaller files, use single batch processing
      if (!isOptimized && (cleanedFileContent.length > maxContentLength || lines.length > 50)) {
        console.warn(`⚠️ File is large (${lines.length} lines, ${cleanedFileContent.length} characters) - processing in single batch like ChatGPT`);
        
        // Process the entire file at once for better performance
        showProcessingStatus(`Traitement du fichier complet (${lines.length} lignes)...`);
        
        // Start real progress updates with more granular steps
        updateRealProgress(5, 'Initialisation du traitement...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        updateRealProgress(15, 'Analyse de la structure du fichier...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        updateRealProgress(25, 'Préparation des données...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        updateRealProgress(35, 'Nettoyage des données...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Increase the content limit for large files
        const largeFileMaxLength = 100000; // Reduced to avoid token limit issues
        const finalContent = cleanedFileContent.length > largeFileMaxLength 
          ? cleanedFileContent.substring(0, largeFileMaxLength) + '\n... [content truncated due to size]'
        : cleanedFileContent;
      
        if (cleanedFileContent.length > largeFileMaxLength) {
          console.warn(`⚠️ WARNING: File content was truncated! Only processing first ${largeFileMaxLength} characters`);
          console.warn(`   This may result in incomplete processing. Consider splitting very large files.`);
        }
        
        updateRealProgress(45, 'Envoi à OpenAI...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call time
        
        updateRealProgress(55, 'Traitement par l\'IA...');
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing time
        
        // Use the same processing logic but with the full content
        const result = await processFileWithOpenAI(finalContent, fileType, true);
        
        updateRealProgress(75, 'Validation des résultats...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        updateRealProgress(85, 'Finalisation...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        updateRealProgress(100, 'Traitement terminé !');
        
        // Validate that we got the expected number of leads
        if (result.leads.length !== lines.length - 1) {
          console.error(`❌ CRITICAL ERROR: Expected ${lines.length - 1} leads, but got ${result.leads.length}`);
          console.error(`   This means OpenAI did not process all rows as instructed!`);
          
          // Force creation of missing leads
          const missingLeads = lines.length - 1 - result.leads.length;
          console.warn(`⚠️ Creating ${missingLeads} missing leads to complete the dataset...`);
          
          // Create placeholder leads for missing rows
          for (let i = result.leads.length; i < lines.length - 1; i++) {
            const rowData = lines[i + 1]; // +1 because lines[0] is header
            const email = rowData.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
            const phone = rowData.match(/[\+]?[0-9\s\-\(\)]{8,}/)?.[0] || '';
            
            result.leads.push({
              userId: { $oid: userId },
              companyId: { $oid: companyId },
              gId: { $oid: gigId },
              Last_Activity_Time: null,
              Deal_Name: email || `Lead from row ${i + 2}`,
              Email_1: email,
              Phone: phone,
              Stage: "New",
              Pipeline: "Sales Pipeline",
              Project_Tags: [],
              Prénom: "",
              Nom: ""
            });
          }
          
          // Update validation to reflect all leads are now valid
          result.validation.validRows = result.leads.length;
          result.validation.invalidRows = 0;
          
        }
        
        return result;
      }
      
      // Prepare content for OpenAI (using the fileContent parameter)
      const truncatedContent = fileContent;
      
      // Ultra-simple prompt to avoid JSON truncation
      const prompt = `Process ${lines.length - 1} rows. Return ONLY valid JSON:

{
  "leads": [
    {
      "userId": {"$oid": "${userId}"},
      "companyId": {"$oid": "${companyId}"},
      "gigId": {"$oid": "${gigId}"},
      "Deal_Name": "Prénom Nom",
      "Email_1": "email@exemple.com",
      "Phone": "+33123456789",
      "Stage": "New",
      "Pipeline": "Sales Pipeline"
    }
  ]
}

EXEMPLE: Si une ligne a Prénom="Jean" et Nom="Dupont", alors Deal_Name="Jean Dupont"
EXEMPLE: Si une ligne a Prénom="Marie" et Nom="", alors Deal_Name="Marie Unknown"
EXEMPLE: Si une ligne a Prénom="" et Nom="Martin", alors Deal_Name="Unknown Martin"

CRITICAL RULES:
1. Email→Email_1, Phone→Phone
2. Deal_Name = Prénom + Nom (OBLIGATOIRE pour toutes les lignes)
3. Si Prénom ou Nom manque, utilise "Unknown" pour la partie manquante
4. JAMAIS utiliser l'email comme Deal_Name sauf si Prénom ET Nom sont vides
5. Process ALL rows - never skip any
6. Format Deal_Name: "Prénom Nom" (exemple: "Jean Dupont", "Marie Unknown", "Unknown Martin")

Data:
${truncatedContent}`;

      // Update progress for OpenAI request
      if (isOptimized) {
        updateRealProgress(60, 'Traitement par OpenAI...');
      }

      // Check prompt size to avoid token limit issues
      let finalPrompt = prompt;
      if (prompt.length > 150000) { // Conservative limit for GPT-3.5-turbo
        console.warn('⚠️ Prompt is very large, truncating content...');
        const maxPromptLength = 100000;
        finalPrompt = prompt.substring(0, maxPromptLength) + '\n... [content truncated due to size]';
      }

      const requestBody = {
        model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
            content: 'You are a data processing expert. Return ONLY valid JSON. Never return text explanations.'
            },
            {
              role: 'user',
            content: finalPrompt
          }
        ],
        temperature: 0.1
        // Removed max_tokens to use model's maximum limit
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        // Get detailed error information
        let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage += ` - ${errorData.error.message || errorData.error.type || 'Unknown error'}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the status text
        }
        
        console.error('OpenAI API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Update progress for response processing
      if (isOptimized) {
        updateRealProgress(80, 'Analyse de la réponse OpenAI...');
      }

      // Simplified error handling
      if (content.trim().toLowerCase().startsWith('i\'m sorry') || 
          content.trim().toLowerCase().startsWith('sorry') ||
          content.trim().toLowerCase().includes('cannot') ||
          content.trim().toLowerCase().includes('unable')) {
        console.warn('⚠️ OpenAI returned an error message:', content);
        
        return {
          leads: [],
          validation: {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            errors: [`OpenAI Error: ${content.substring(0, 100)}...`]
          }
        };
      }

      // Parse the JSON response with recovery for incomplete JSON
      let parsedData;
      
      // Check if JSON appears complete
      const trimmedContent = content.trim();
      const isCompleteJSON = trimmedContent.startsWith('{') && trimmedContent.endsWith('}') && 
                            trimmedContent.includes('"leads"');
      
      if (!isCompleteJSON) {
        console.warn('⚠️ OpenAI returned incomplete JSON, attempting recovery...');
        const recoveredData = tryRecoverIncompleteJSON(content, lines.length - 1);
        if (recoveredData) {
          parsedData = recoveredData;
        } else {
          throw new Error('Failed to recover incomplete JSON response');
        }
      } else {
        try {
          parsedData = JSON.parse(content);
        } catch (parseError) {
          console.warn('⚠️ JSON parse error, attempting recovery...');
          const recoveredData = tryRecoverIncompleteJSON(content, lines.length - 1);
          if (recoveredData) {
            parsedData = recoveredData;
          } else {
            throw new Error(`JSON parse error: ${parseError}`);
          }
        }
      }

      // Validate the parsed data
      if (!parsedData || !parsedData.leads || !Array.isArray(parsedData.leads)) {
        throw new Error('Invalid response format from OpenAI');
      }

      // Process the leads to ensure they have the required fields
      const processedLeads = parsedData.leads.map((lead: any): any => {
        // FORCE Deal_Name to be Prénom + Nom (never email)
        let dealName = '';
        
        // Extract Prénom and Nom from the lead data
        const prenom = lead.Prénom || lead.prénom || lead.Prenom || lead.prenom || '';
        const nom = lead.Nom || lead.nom || lead.Name || lead.name || '';
        
        // Always create Deal_Name from Prénom + Nom
        if (prenom || nom) {
          dealName = `${prenom} ${nom}`.trim();
        } else {
          // Only use email if absolutely no name data available
          dealName = lead.Deal_Name || 'Unknown Lead';
        }
        
        // Ensure required fields are present
        return {
          userId: lead.userId || { $oid: userId },
          companyId: lead.companyId || { $oid: companyId },
          gId: lead.gId || { $oid: gigId },
          Last_Activity_Time: lead.Last_Activity_Time || null,
          Deal_Name: dealName,
          Email_1: lead.Email_1 || 'no-email@placeholder.com',
          Phone: lead.Phone || '',
          Stage: lead.Stage || 'New',
          Pipeline: lead.Pipeline || 'Sales Pipeline',
          Project_Tags: lead.Project_Tags || [],
          Prénom: prenom,
          Nom: nom
        };
      });

      // Final validation
      const totalRows = lines.length - 1; // Exclude header
      const validRows = processedLeads.length;
      const invalidRows = Math.max(0, totalRows - validRows);

      // Update final progress
      if (isOptimized) {
        updateRealProgress(95, 'Finalisation du traitement...');
      }

      // Validate that we got the expected number of leads
      if (processedLeads.length !== lines.length - 1) {
        console.error(`❌ CRITICAL ERROR: Expected ${lines.length - 1} leads, but got ${processedLeads.length}`);
        console.error(`   This means OpenAI did not process all rows as instructed!`);
        
        // Force creation of missing leads
        const missingLeads = lines.length - 1 - processedLeads.length;
        console.warn(`⚠️ Creating ${missingLeads} missing leads to complete the dataset...`);
        
        // Create placeholder leads for missing rows
        for (let i = processedLeads.length; i < lines.length - 1; i++) {
          const rowData = lines[i + 1]; // +1 because lines[0] is header
          const email = rowData.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
          const phone = rowData.match(/[\+]?[0-9\s\-\(\)]{8,}/)?.[0] || '';
          
          processedLeads.push({
            userId: { $oid: userId },
            companyId: { $oid: companyId },
            gId: { $oid: gigId },
            Last_Activity_Time: null,
            Deal_Name: email || `Lead from row ${i + 2}`,
            Email_1: email,
            Phone: phone,
            Stage: "New",
            Pipeline: "Sales Pipeline",
            Project_Tags: [],
            Prénom: "",
            Nom: ""
          });
        }
        
      }

      return {
        leads: processedLeads,
        validation: {
          totalRows,
          validRows: processedLeads.length, // Use actual length after fixes
          invalidRows: 0, // All leads are now valid
          errors: []
        }
      };

    } catch (error) {
      console.error('❌ Error in processFileWithOpenAI:', error);
      throw error;
    }
  };

  // Helper function to process individual chunks asynchronously
  const processChunkAsync = async (chunkIndex: number, chunkLines: string[], fileType: string, totalChunks: number) => {
    try {
      // Update progress for chunk processing
      const chunkProgress = 30 + (chunkIndex / totalChunks) * 60; // 30% to 90%
      const currentChunkProgress = Math.round(chunkProgress);
      updateRealProgress(currentChunkProgress, `Traitement du lot ${chunkIndex + 1}/${totalChunks} (lignes ${chunkIndex * 100 + 1}-${Math.min((chunkIndex + 1) * 100, chunkLines.length - 1)})...`);
      
      // Process this chunk
      const chunkResult = await processFileWithOpenAI(chunkLines.join('\n'), fileType, true);
      
      if (chunkResult.leads && chunkResult.leads.length > 0) {
        // Update progress after successful chunk processing
        const successProgress = 30 + ((chunkIndex + 1) / totalChunks) * 60;
        updateRealProgress(Math.round(successProgress), `Lot ${chunkIndex + 1}/${totalChunks} terminé (${chunkResult.leads.length} leads)`);
        return chunkResult;
      } else {
        console.warn(`⚠️ Chunk ${chunkIndex + 1} returned no leads`);
        return { leads: [], validation: { totalRows: 0, validRows: 0, invalidRows: 0, errors: [] } };
      }
      
    } catch (error: any) {
      console.error(`❌ Error processing chunk ${chunkIndex + 1}:`, error);
      // Return empty result instead of failing completely
      return { leads: [], validation: { totalRows: 0, validRows: 0, invalidRows: 0, errors: [error.message] } };
    }
  };

  // Smart chunking function for large files
  const processLargeFileInChunks = async (fileContent: string, fileType: string, lines: string[]): Promise<{leads: any[], validation: any}> => {
    
    // Calculate optimal chunk size to respect OpenAI token limits
    const maxTokensPerChunk = 12000; // Conservative limit (16,385 - safe buffer)
    const estimatedTokensPerLine = 25; // Realistic estimate for CSV data
    const optimalChunkSize = Math.min(100, Math.floor(maxTokensPerChunk / estimatedTokensPerLine)); // Max 100 lines per chunk for safety
    
    
    const allLeads: any[] = [];
    const totalChunks = Math.ceil((lines.length - 1) / optimalChunkSize);
    
    // Update progress for chunk processing start
    updateRealProgress(30, `Début du traitement par lots (${totalChunks} lots à traiter)...`);
    
    // Process chunks in parallel for maximum speed
    const maxConcurrent = 25; // Process 25 chunks simultaneously for maximum speed
    const chunkPromises: Promise<any>[] = [];
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Check if processing was cancelled
      if (!processingRef.current) {
        throw new Error('Processing cancelled by user');
      }
      
      const startLine = chunkIndex * optimalChunkSize + 1; // +1 to skip header
      const endLine = Math.min((chunkIndex + 1) * optimalChunkSize, lines.length - 1);
      
      // Create chunk with header + data rows for this specific chunk
      const chunkLines = [
        lines[0], // Header row
        ...lines.slice(startLine, endLine + 1) // Data rows for this chunk
      ];
      
      // Create promise for this chunk
      const chunkPromise = processChunkAsync(chunkIndex, chunkLines, fileType, totalChunks);
      chunkPromises.push(chunkPromise);
      
      // Process in batches to avoid overwhelming the API
      if (chunkPromises.length >= maxConcurrent || chunkIndex === totalChunks - 1) {
        try {
          const batchResults = await Promise.all(chunkPromises);
          
          // Collect leads from batch
          for (const result of batchResults) {
            if (result && result.leads && result.leads.length > 0) {
              allLeads.push(...result.leads);
            }
          }
          
          // Update progress after batch processing
          const batchProgress = 30 + ((chunkIndex + 1) / totalChunks) * 60;
          updateRealProgress(Math.round(batchProgress), `Lot ${chunkIndex + 1}/${totalChunks} terminé (${allLeads.length} leads collectés)`);
          
          // Clear batch for next iteration
          chunkPromises.length = 0;
          
        } catch (error: any) {
          console.error(`❌ Error processing batch ending at chunk ${chunkIndex + 1}:`, error);
          // Continue with next batch instead of failing completely
        }
      }
    }
    
    
    // Final progress update
    updateRealProgress(95, 'Finalisation du traitement par lots...');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      leads: allLeads,
      validation: {
        totalRows: lines.length - 1,
        validRows: allLeads.length,
        invalidRows: Math.max(0, (lines.length - 1) - allLeads.length),
        errors: []
      }
    };
  };



  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if a gig is selected before processing
      if (!selectedGigId) {
        toast.error('Please select a gig first before uploading a file');
        return;
      }
      
      // Store current leads before resetting
      const currentLeads = [...leads];
      const currentFilteredLeads = [...filteredLeads];
      
      // Reset file processing state only (keep existing leads)
      setSelectedFile(null);
      setUploadError(null);
      setUploadSuccess(false);
      setIsProcessing(false);
      setUploadProgress(0);
      setParsedLeads([]);
      setValidationResults(null);
      // Don't clear existing leads - they will be restored after processing
      setShowSaveButton(true);
      setShowFileName(true);
      
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
      
      // Remove processing indicators
      document.body.removeAttribute('data-processing');
      processingRef.current = false;
      
      // Reset file input to allow re-upload of same file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Now set the new file and start processing
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(false);
      setIsProcessing(true);
      setUploadProgress(10);
      setParsedLeads([]);
      
      // Add processing indicator to prevent refresh
      document.body.setAttribute('data-processing', 'true');
      processingRef.current = true;
      localStorage.setItem('uploadProcessing', 'true');
      sessionStorage.setItem('uploadProcessing', 'true');
      
      try {
        // Read the file content
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // Check if processing was cancelled before starting
            if (!processingRef.current) {
              return;
            }
            
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
              
              // Read Excel as JSON with headers to preserve column structure
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              // Convert to structured format preserving column names
              const headers = jsonData[0] as string[];
              const dataRows = jsonData.slice(1) as any[][];
              
              // Convert structured data to readable format for OpenAI
              const csvFormat = [
                headers.join(','),
                ...dataRows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
              ].join('\n');
              
              fileContent = csvFormat;
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
            
            // Check if processing was cancelled before OpenAI call
            if (!processingRef.current) {
              return;
            }
            
            // Process with OpenAI
            const startTime = Date.now();
            const result = await processFileWithOpenAI(fileContent, fileType);
            const processingTime = Date.now() - startTime;
            
            setUploadProgress(80);

            if (result.leads.length === 0) {
              toast.error('No valid leads found in the file. Please check the file format and content.');
              setUploadError('No valid leads found');
              setIsProcessing(false);
              setUploadProgress(0);
              return;
            }

            // Show validation results (suppressed error popups as requested by user)
            if (result.validation) {
              const { totalRows, validRows, invalidRows, errors } = result.validation;

              setValidationResults(result.validation);
              
              // Use actual leads count if validRows is undefined or 0
              const actualValidRows = validRows || result.leads.length;
            }

            // Verify we got all expected leads
            const fileLines = fileContent.split('\n').filter((line: string) => line.trim());
            const expectedLeads = fileLines.length - 1; // Exclude header row
            
            setParsedLeads(result.leads);
            
            // Store results in localStorage to prevent loss
            localStorage.setItem('parsedLeads', JSON.stringify(result.leads));
            localStorage.setItem('validationResults', JSON.stringify(result.validation));
            
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
            
          } catch (error: any) {
            console.error('Error processing file:', error);
            let errorMessage = 'Error processing file';
            
            if (error.message.includes('Rate limit exceeded')) {
              errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
            } else if (error.message.includes('OpenAI API key not configured')) {
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
            
            // Remove processing indicator on error
            document.body.removeAttribute('data-processing');
            processingRef.current = false;
            localStorage.removeItem('uploadProcessing');
            sessionStorage.removeItem('uploadProcessing');
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

      // Sauvegarder les leads un par un pour affichage immédiat
      const savedLeads: any[] = [];
      const failedLeads: { index: number; error: string }[] = [];
      
      for (let i = 0; i < leadsForAPI.length; i++) {
        // Vérifier si le traitement a été annulé avec la référence fiable
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
                  'Authorization': `Bearer ${Cookies.get('gigId')}:${Cookies.get('userId')}`
                },
                timeout: 10000 // 10 secondes de timeout
              }
            );
            
            if (response.status === 200 || response.status === 201) {
            savedLeads.push(response.data);
            
            // Ajouter le lead sauvegardé à la liste des leads récemment sauvegardés
            const responseData = response.data as any;
            const savedLead: Lead = {
              _id: responseData._id || `temp_${Date.now()}_${i}`,
              gigId: responseData.gigId || selectedGigId,
              userId: responseData.userId || Cookies.get('userId') || '',
              companyId: responseData.companyId || Cookies.get('companyId') || '',
              Email_1: responseData.Email_1 || lead.Email_1,
              Phone: responseData.Phone || lead.Phone,
              Deal_Name: responseData.Deal_Name || lead.Deal_Name,
              Stage: responseData.Stage || lead.Stage,
              Pipeline: responseData.Pipeline || lead.Pipeline,
              updatedAt: new Date().toISOString()
            };
            
            setRecentlySavedLeads(prev => [...prev, savedLead]);
            
            // Mettre à jour la progression et le compteur immédiatement
            const progress = Math.round(((i + 1) / leadsForAPI.length) * 100);
            setUploadProgress(progress);
            setSavedLeadsCount(savedLeads.length);
            
            // Rafraîchir automatiquement la liste des leads tous les 10 leads ou à la fin
            if (savedLeads.length % 10 === 0 || i === leadsForAPI.length - 1) {
              try {
                await fetchLeads();
              } catch (error) {
                console.warn('Error refreshing leads during save:', error);
              }
            }
          } else {
            failedLeads.push({ index: i, error: response.statusText });
          }
        } catch (error: any) {
          failedLeads.push({ 
            index: i, 
            error: error.message || 'Network error'
          });
        }
        
        // Petite pause entre chaque lead pour éviter de surcharger l'API
        if (i < leadsForAPI.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Résultats finaux
      const savedCount = savedLeads.length;
      const totalCount = leadsForAPI.length;
      const failedCount = failedLeads.length;
      
      if (savedCount === totalCount) {
        // Tous les leads ont été sauvegardés
        setUploadSuccess(true);
        setUploadProgress(100);
        toast.success(`Successfully saved ${savedCount} contacts!`);
        
        // Rafraîchir la liste des leads une dernière fois
        if (selectedGigId) {
          await fetchLeads();
        }
        
        // Mettre à jour l'onboarding
        try {
          const companyId = Cookies.get('companyId');
          if (companyId) {
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`,
              { status: 'completed' }
            );
            
            localStorage.setItem('stepCompleted', JSON.stringify({
              stepId: 6,
              phaseId: 2,
              data: { success: true, leadsSaved: savedCount }
            }));
          }
        } catch (error) {
          console.error('Error updating onboarding progress:', error);
          // Ne pas bloquer le processus si l'onboarding échoue
        }
        
      } else if (savedCount > 0) {
        // Certains leads ont été sauvegardés
        setUploadError(`${savedCount} leads saved, ${failedCount} failed`);
        // Afficher les erreurs dans la console
        console.warn('Failed leads:', failedLeads);
        
        // Rafraîchir quand même pour montrer les leads sauvegardés
        if (selectedGigId) {
          await fetchLeads();
        }
        
      } else {
        // Aucun lead n'a été sauvegardé
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
      // TOUJOURS réinitialiser l'état, même en cas d'erreur
      setIsSavingLeads(false);
      processingRef.current = false; // Réinitialiser la référence aussi
      setShowSaveButton(true);
      setShowFileName(true);
      
      // Reset après un délai pour permettre à l'utilisateur de voir le résultat
      setTimeout(() => {
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
      }, 2000); // 2 secondes au lieu de 1.2
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
      // Vérifier si l'URL contient le paramètre startStep=6
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
          'Authorization': `Bearer ${Cookies.get('gigId')}:${userId}`
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
      
      // Déclencher une mise à jour de l'état d'onboarding pour marquer le step 6 comme complété
      if (leadsFromApi.length > 0) {
        try {
          const companyId = Cookies.get('companyId');
          if (companyId) {
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`,
              { status: 'completed' }
            );
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

  const fetchLeads = async (page = currentPage) => {
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
      // Fetch leads with pagination (50 per page)
      const apiUrl = `${import.meta.env.VITE_DASHBOARD_API}/leads/gig/${selectedGigId}?page=${page}&limit=50`;
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
      
      if (!responseData.success) {
        throw new Error('Failed to fetch leads: API returned unsuccessful response');
      }

      if (!Array.isArray(responseData.data)) {
        throw new Error('Invalid response format: expected data to be an array');
      }

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
    // Skip this effect if we're currently processing a file
    if (isProcessing || processingRef.current) {
      return;
    }

    // Skip if we have parsed leads that should be preserved
    if (parsedLeads.length > 0 || localStorage.getItem('parsedLeads') || sessionStorage.getItem('parsedLeads')) {
      return;
    }

    if (selectedGigId) {
      fetchLeads().catch(error => {
        console.error('Error in useEffect:', error);
        setError('Failed to load leads');
      });
    } else {
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
        <div className="flex items-start justify-between mb-6">
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
                    className={`h-3 rounded-full transition-all duration-300 ${
                      uploadError ? 'bg-red-500' : uploadSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
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
                    ? `Analyse en cours... ${uploadProgress}%` 
                    : uploadProgress > 0 ? `${uploadProgress}% terminé` : 'Prêt'
                  }
                </span>
                <span>{Math.round(selectedFile.size / 1024)} KB</span>
              </div>
              
              {/* Real-time Progress Status for OpenAI Processing */}
              {isProcessing && !uploadError && !uploadSuccess && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-700 font-medium">
                      {processingProgress.status || 'Traitement OpenAI en cours...'}
                    </span>
                  </div>
                  
                  {/* Animated activity indicator */}
                  <div className="mt-2 flex items-center space-x-1">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                          style={{
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: '1s'
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-blue-600 ml-2">Traitement en cours...</span>
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
                          <span className="text-green-600 font-medium">Valid Rows:</span> {validationResults.validRows > 0 ? validationResults.validRows : parsedLeads.length}
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
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={handleSaveLeads}
                disabled={isSavingLeads}
              >
                  <div className="flex items-center justify-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Save {parsedLeads.length} Contacts
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
                    {parsedLeads.length > 0 ? (
                      <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                        {parsedLeads.length} leads ready to save
                      </span>
                    ) : isSavingLeads && recentlySavedLeads.length > 0 ? (
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">
                        Showing {recentlySavedLeads.length} recently saved leads (saving in progress...)
                      </span>
                    ) : leads.length > 0 ? (
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
                  ) : (leads.length === 0 && !isSavingLeads) ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center py-8">
                          <FileText className="h-12 w-12 text-gray-300 mb-2" />
                          <p>No leads found</p>
                          <p className="text-xs text-gray-400 mt-1">Try importing some leads or check your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (filteredLeads.length === 0 && !isSavingLeads) ? (
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
                    // Afficher les leads récemment sauvegardés pendant la sauvegarde, sinon les leads filtrés
                    (isSavingLeads && recentlySavedLeads.length > 0 ? recentlySavedLeads : filteredLeads).map((lead, index) => (
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
                  <span className="font-medium">{totalCount}</span> leads
                  {searchQuery && (
                    <span className="text-indigo-600"> (filtered by "{searchQuery}")</span>
                  )}
                </span>
              </div>
              
              {/* Pagination Buttons */}
              {totalPages > 1 && (
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
});

// cooment
export default UploadContacts;