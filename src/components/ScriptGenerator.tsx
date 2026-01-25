import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Cookies from 'js-cookie';
import {
  User, Headphones, Plus, ArrowLeft, Eye, Calendar, Target, Globe, Trash2, ToggleLeft, ToggleRight, Filter,
  FileText, HandHeart, Shield, Search, Star, FileCheck, AlertTriangle, CheckCircle, RefreshCw, Edit2, MessageSquare
} from 'lucide-react';

interface ScriptResponse {
  success: boolean;
  data?: {
    script: string;
    metadata: {
      processedAt: string;
      model: string;
      corpusStatus: {
        exists: boolean;
        documentCount: number;
        callRecordingCount: number;
        totalCount: number;
      };
      gigInfo?: {
        gigId: string;
        gigTitle: string;
        gigCategory: string;
      };
    };
  };
  error?: {
    message: string;
    code?: string;
    details?: string;
  };
}

interface Gig {
  _id: string;
  title: string;
  description: string;
  category: string;
  userId: string;
  companyId: string;
  destination_zone: string;
  seniority: {
    level: string;
    yearsExperience: string;
  };
  skills: {
    professional: Array<{
      skill: string;
      level: number;
      details: string;
    }>;
    technical: Array<{
      skill: string;
      level: number;
      details: string;
    }>;
    soft: Array<{
      skill: string;
      level: number;
      details: string;
    }>;
    languages: Array<{
      language: string;
      proficiency: string;
      iso639_1: string;
    }>;
  };
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZone: string;
    flexibility: string[];
    minimumHours: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  commission: {
    base: string;
    baseAmount: string;
    bonus: string;
    bonusAmount: string;
    structure: string;
    currency: string;
    minimumVolume: {
      amount: string;
      period: string;
      unit: string;
    };
    transactionCommission: {
      type: string;
      amount: string;
    };
  };
  leads: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate: number;
    }>;
    sources: string[];
  };
  team: {
    size: string;
    structure: Array<{
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: string;
      };
    }>;
    territories: string[];
  };
  documentation: {
    product: Array<{
      name: string;
      url: string;
    }>;
    process: Array<{
      name: string;
      url: string;
    }>;
    training: Array<{
      name: string;
      url: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface Script {
  _id: string;
  gigId: string;
  targetClient: string;
  language: string;
  details?: string;
  script: { phase: string; actor: string; replica: string }[];
  isActive: boolean; // Add isActive field
  createdAt: string;
  gig?: Gig;
}

// REPS Call Phases configuration
const REPS_PHASES = [
  {
    name: 'Context & Preparation',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Preparation and context setting'
  },
  {
    name: 'SBAM & Opening',
    icon: HandHeart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Salutation, Bonjour, Accroche, Motif'
  },
  {
    name: 'Legal & Compliance',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Legal aspects and compliance'
  },
  {
    name: 'Need Discovery',
    icon: Search,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Needs discovery and qualification'
  },
  {
    name: 'Value Proposition',
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: 'Value proposition presentation'
  },
  {
    name: 'Documents/Quote',
    icon: FileCheck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'Documentation and quotation'
  },
  {
    name: 'Objection Handling',
    icon: AlertTriangle,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    description: 'Objection handling and resolution'
  },
  {
    name: 'Confirmation & Closing',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Confirmation and closing'
  }
];

// Helper function to get phase configuration
const getPhaseConfig = (phaseName: string) => {
  return REPS_PHASES.find(phase => phase.name === phaseName) || {
    name: phaseName,
    icon: Target,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: phaseName
  };
};

// Helper function to group script steps by phase
const groupScriptByPhase = (script: { phase: string; actor: string; replica: string }[]) => {
  const grouped: { [key: string]: { phase: string; actor: string; replica: string }[] } = {};

  script.forEach(step => {
    if (!grouped[step.phase]) {
      grouped[step.phase] = [];
    }
    grouped[step.phase].push(step);
  });

  // Sort phases according to REPS order
  const sortedPhases = REPS_PHASES.map(phase => phase.name).filter(phaseName => grouped[phaseName]);
  const otherPhases = Object.keys(grouped).filter(phaseName => !REPS_PHASES.some(phase => phase.name === phaseName));

  return [...sortedPhases, ...otherPhases].map(phaseName => ({
    phaseName,
    steps: grouped[phaseName]
  }));
};

const ScriptGenerator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ScriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domaine, setDomaine] = useState('');
  const [typeClient, setTypeClient] = useState('');
  const [contexte, setContexte] = useState('');
  const [langueTon, setLangueTon] = useState('');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [gigsError, setGigsError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [scriptsError, setScriptsError] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'form' | 'script'>('table');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [deletingScriptId, setDeletingScriptId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all'); // Add status filter
  const [updatingScriptId, setUpdatingScriptId] = useState<string | null>(null); // Track which script is being updated
  // Add new state for regeneration loading
  const [regeneratingScriptId, setRegeneratingScriptId] = useState<string | null>(null);
  // Add new state for tracking processing steps
  const [processingSteps, setProcessingSteps] = useState<number[]>([]);

  // Add new state for managing phase additions
  const [addingReplicaToPhase, setAddingReplicaToPhase] = useState<string | null>(null);

  const getCompanyId = () => {
    const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
    if (runMode === 'standalone') {
      // Utilise la variable d'environnement en standalone
      return import.meta.env.VITE_STANDALONE_COMPANY_ID;
    } else {
      // Utilise le cookie en in-app
      return Cookies.get('companyId');
    }
  };

  const isInAppMode = () => {
    return (import.meta.env.VITE_RUN_MODE || 'in-app') === 'in-app';
  };

  const handleBackToOrchestrator = () => {
    const orchestratorUrl = import.meta.env.VITE_COMPANY_ORCHESTRATOR_URL;
    if (orchestratorUrl) {
      window.location.href = orchestratorUrl;
    }
  };

  const fetchGigs = async () => {
    const companyId = getCompanyId();
    console.log('[GIGS] Fetching gigs for companyId:', companyId);
    if (!companyId) {
      setGigsError('Company ID not found');
      return;
    }

    setIsLoadingGigs(true);
    setGigsError(null);

    try {
      const gigsApiUrl = import.meta.env.VITE_GIGS_API_URL;
      if (!gigsApiUrl) {
        throw new Error('Gigs API URL not configured');
      }

      const response = await fetch(`${gigsApiUrl}/gigs/company/${companyId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch gigs: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[GIGS] API response:', data);
      setGigs(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      console.error('[GIGS] Error fetching gigs:', err);
      setGigsError(err.message || 'Failed to fetch gigs');
    } finally {
      setIsLoadingGigs(false);
    }
  };

  const fetchAllScripts = async () => {
    setIsLoadingScripts(true);
    setScriptsError(null);
    try {
      const companyId = getCompanyId();
      if (!companyId) throw new Error('Company ID not found');
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      if (!backendUrl) throw new Error('Backend API URL not configured');

      // Add status filter to URL if not 'all'
      let url = `${backendUrl}/api/scripts/company/${companyId}`;
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }

      console.log('[SCRIPTS] Fetching scripts for companyId:', companyId, 'with filter:', statusFilter, 'URL:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch scripts: ${response.statusText}`);
      const data = await response.json();
      console.log('[SCRIPTS] API response:', data);
      setScripts(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      console.error('[SCRIPTS] Error fetching scripts:', err);
      setScriptsError(err.message || 'Failed to fetch scripts');
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const fetchScriptsForGig = async (gigId: string) => {
    setIsLoadingScripts(true);
    setScriptsError(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      if (!backendUrl) throw new Error('Backend API URL not configured');
      const url = `${backendUrl}/scripts/gig/${gigId}`;
      console.log('[SCRIPTS] Fetching scripts for gigId:', gigId, 'URL:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch scripts: ${response.statusText}`);
      const data = await response.json();
      console.log('[SCRIPTS] API response:', data);
      setScripts(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      console.error('[SCRIPTS] Error fetching scripts for gig:', err);
      setScriptsError(err.message || 'Failed to fetch scripts for this gig');
      setScripts([]);
    } finally {
      setIsLoadingScripts(false);
    }
  };

  useEffect(() => {
    fetchGigs();
    fetchAllScripts();
  }, []);

  // Refetch scripts when status filter changes
  useEffect(() => {
    fetchAllScripts();
  }, [statusFilter]);

  const handleGigSelection = (gig: Gig) => {
    setSelectedGig(gig);
    setDomaine(gig.category || '');
  };

  const updateOnboardingProgress = async () => {
    try {
      const companyId = getCompanyId();
      if (!companyId) throw new Error('Company ID not found');
      const apiUrl = import.meta.env.VITE_API_URL_ONBOARDING;
      const endpoint = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/2/steps/8`;
      const response = await apiClient.put(endpoint, { status: 'completed' });
      console.log('Onboarding progress (script) update response:', response.data);

      // Update the companyOnboardingProgress cookie with the response data
      if (response.data) {
        Cookies.set('companyOnboardingProgress', JSON.stringify(response.data), { expires: 7 });
        console.log('Updated companyOnboardingProgress cookie with new data');
      }

      return response.data;
    } catch (error) {
      console.error('Error updating onboarding progress (script):', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);
    try {
      const companyId = getCompanyId();
      if (!companyId) throw new Error('Company ID not found');
      if (!selectedGig) throw new Error('Vous devez sélectionner un gig pour générer un script.');
      const requestData: any = {
        companyId,
        gig: selectedGig,
        typeClient,
        langueTon,
        contexte
      };
      const apiResponse = await apiClient.post<ScriptResponse>('/rag/generate-script', requestData);
      setResponse(apiResponse.data);
      // Update onboarding progress for script creation (phase 2, step 8)
      try {
        await updateOnboardingProgress();
        console.log('Successfully updated onboarding progress (script)');
      } catch (err) {
        // Log but do not block script creation
        console.error('Failed to update onboarding progress (script):', err);
      }
      // Refresh scripts list and hide form
      await fetchAllScripts();
      setView('table');
      setSelectedGig(null);
      setTypeClient('');
      setLangueTon('');
      setContexte('');
      setDomaine('');
      // Show the newly created script card (if possible)
      const scriptId = (apiResponse.data && (apiResponse.data as any).metadata && (apiResponse.data as any).metadata.scriptId) ? (apiResponse.data as any).metadata.scriptId : null;
      if (scriptId) {
        setTimeout(() => {
          setSelectedScript(
            prev => scripts.find(s => s._id === scriptId) || null
          );
        }, 300);
      } else {
        setSelectedScript(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate script');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGigSelectInForm = (gigId: string) => {
    const gig = gigs.find(g => g._id === gigId) || null;
    setSelectedGig(gig);
    setDomaine(gig?.category || '');
  };

  const handleShowScript = (script: Script) => {
    setSelectedScript(script);
    setView('script');
  };

  const handleShowFormClick = () => {
    setView(view => view === 'form' ? 'table' : 'form');
    setSelectedScript(null);
  };

  const handleBackToTable = () => {
    setView('table');
    setSelectedScript(null);
  };

  const handleUpdateScriptStatus = async (scriptId: string, isActive: boolean) => {
    setUpdatingScriptId(scriptId);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      if (!backendUrl) throw new Error('Backend API URL not configured');

      const response = await fetch(`${backendUrl}/api/scripts/${scriptId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update script status: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[SCRIPTS] Script status updated successfully:', data);

      // Update the script in the local state
      setScripts(prevScripts =>
        prevScripts.map(script =>
          script._id === scriptId
            ? { ...script, isActive }
            : script
        )
      );

      // If the updated script was selected, update the selected script as well
      if (selectedScript?._id === scriptId) {
        setSelectedScript(prev => prev ? { ...prev, isActive } : null);
      }

    } catch (err: any) {
      console.error('[SCRIPTS] Error updating script status:', err);
      alert(`Failed to update script status: ${err.message}`);
    } finally {
      setUpdatingScriptId(null);
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    if (!confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
      return;
    }

    setDeletingScriptId(scriptId);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      if (!backendUrl) throw new Error('Backend API URL not configured');

      const response = await fetch(`${backendUrl}/api/scripts/${scriptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete script: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[SCRIPTS] Script deleted successfully:', data);

      // Remove the script from the local state
      setScripts(prevScripts => prevScripts.filter(script => script._id !== scriptId));

      // If the deleted script was selected, clear the selection and go back to table
      if (selectedScript?._id === scriptId) {
        setSelectedScript(null);
        setView('table');
      }

    } catch (err: any) {
      console.error('[SCRIPTS] Error deleting script:', err);
      alert(`Failed to delete script: ${err.message}`);
    } finally {
      setDeletingScriptId(null);
    }
  };

  // Ajout des nouvelles fonctions de modification
  const handleRegenerateScript = async (scriptId: string) => {
    if (!confirm('Are you sure you want to regenerate this script? The current version will be replaced.')) {
      return;
    }

    setRegeneratingScriptId(scriptId);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      const companyId = getCompanyId();
      if (!backendUrl) throw new Error('Backend API URL not configured');
      if (!companyId) throw new Error('Company ID not found');

      const response = await fetch(`${backendUrl}/api/scripts/${scriptId}/regenerate`, {
        method: 'POST',
        headers: {
          'X-Company-ID': companyId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate script: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[SCRIPTS] Script regenerated successfully:', data);

      // Update the script in the local state
      setScripts(prevScripts =>
        prevScripts.map(script =>
          script._id === scriptId
            ? data.data
            : script
        )
      );

      // Update selected script if it was the one regenerated
      if (selectedScript?._id === scriptId) {
        setSelectedScript(data.data);
      }

    } catch (err: any) {
      console.error('[SCRIPTS] Error regenerating script:', err);
      alert(`Failed to regenerate script: ${err.message}`);
    } finally {
      setRegeneratingScriptId(null);
    }
  };

  const handleRefineScriptPart = async (scriptId: string, stepIndex: number, refinementPrompt: string) => {
    try {
      setProcessingSteps(prev => [...prev, stepIndex]);
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      const companyId = getCompanyId();
      if (!backendUrl) throw new Error('Backend API URL not configured');
      if (!companyId) throw new Error('Company ID not found');

      const response = await fetch(`${backendUrl}/api/scripts/${scriptId}/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-ID': companyId
        },
        body: JSON.stringify({ stepIndex, refinementPrompt }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refine script: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[SCRIPTS] Script part refined successfully:', data);

      // Update the script in the local state
      setScripts(prevScripts =>
        prevScripts.map(script =>
          script._id === scriptId
            ? data.data.fullScript
            : script
        )
      );

      // Update selected script if it was the one refined
      if (selectedScript?._id === scriptId) {
        setSelectedScript(data.data.fullScript);
      }

    } catch (err: any) {
      console.error('[SCRIPTS] Error refining script:', err);
      alert(`Failed to refine script: ${err.message}`);
    } finally {
      setProcessingSteps(prev => prev.filter(id => id !== stepIndex));
    }
  };

  const handleUpdateScriptContent = async (scriptId: string, stepIndex: number, newContent: { replica: string }) => {
    try {
      // Si le texte est vide, utiliser un espace pour satisfaire la validation
      const replicaText = newContent.replica.trim() === '' ? ' ' : newContent.replica;

      // Mettre à jour l'état avant la requête
      setProcessingSteps(prev => [...prev, stepIndex]);

      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      if (!backendUrl) throw new Error('Backend API URL not configured');

      // Petit délai pour assurer que l'état est mis à jour
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await fetch(`${backendUrl}/api/scripts/${scriptId}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepIndex,
          newContent: { replica: replicaText }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update script content: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[SCRIPTS] Script content updated successfully:', data);

      // Update the script in the local state
      setScripts(prevScripts =>
        prevScripts.map(script =>
          script._id === scriptId
            ? data.data.fullScript
            : script
        )
      );

      // Update selected script if it was the one updated
      if (selectedScript?._id === scriptId) {
        setSelectedScript(data.data.fullScript);
      }

    } catch (err: any) {
      console.error('[SCRIPTS] Error updating script content:', err);
      alert(`Failed to update script content: ${err.message}`);
    } finally {
      setProcessingSteps(prev => prev.filter(id => id !== stepIndex));
    }
  };

  // Add new handlers for replica management
  const handleAddReplica = async (scriptId: string, phase: string, actor: string) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      if (!backendUrl) throw new Error('Backend API URL not configured');

      // Find the index where to insert the new replica
      const phaseSteps = selectedScript?.script.filter(s => s.phase === phase) || [];
      const lastPhaseStepIndex = selectedScript?.script.findIndex(s => s.phase === phase && s.replica === phaseSteps[phaseSteps.length - 1].replica);
      const insertIndex = lastPhaseStepIndex !== undefined ? lastPhaseStepIndex + 1 : selectedScript?.script.length || 0;

      // Use the new dedicated endpoint
      const response = await fetch(`${backendUrl}/api/scripts/${scriptId}/replicas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phase,
          actor,
          insertIndex
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add replica: ${response.statusText}`);
      }

      const data = await response.json();

      // Update local state
      setScripts(prevScripts =>
        prevScripts.map(script =>
          script._id === scriptId
            ? data.data.fullScript
            : script
        )
      );

      if (selectedScript?._id === scriptId) {
        setSelectedScript(data.data.fullScript);
      }

      // Start editing the new replica immediately
      setEditingStep({
        index: data.data.insertedIndex,
        text: '' // Start with empty text in the editor
      });

    } catch (err: any) {
      console.error('[SCRIPTS] Error adding replica:', err);
      alert(`Failed to add replica: ${err.message}`);
    }
  };

  const handleDeleteReplica = async (scriptId: string, stepIndex: number) => {
    if (!confirm('Are you sure you want to delete this replica? This action cannot be undone.')) {
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
      if (!backendUrl) throw new Error('Backend API URL not configured');

      // Use the new dedicated endpoint
      const response = await fetch(`${backendUrl}/api/scripts/${scriptId}/replicas/${stepIndex}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete replica: ${response.statusText}`);
      }

      const data = await response.json();

      // Update local state
      setScripts(prevScripts =>
        prevScripts.map(script =>
          script._id === scriptId
            ? data.data.fullScript
            : script
        )
      );

      if (selectedScript?._id === scriptId) {
        setSelectedScript(data.data.fullScript);
      }

    } catch (err: any) {
      console.error('[SCRIPTS] Error deleting replica:', err);
      alert(`Failed to delete replica: ${err.message}`);
    }
  };

  // État pour gérer l'édition
  const [editingStep, setEditingStep] = useState<{ index: number; text: string } | null>(null);
  const [refiningStep, setRefiningStep] = useState<{ index: number; prompt: string } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            {isInAppMode() && (
              <button
                onClick={handleBackToOrchestrator}
                className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group"
                title="Back to Orchestrator"
              >
                <ArrowLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Headphones className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Script Generator
                </h1>
                <p className="text-gray-500 text-sm">Create personalized call scripts for your gigs</p>
              </div>
            </div>
          </div>
          {view !== 'form' && (
            <button
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-medium"
              onClick={handleShowFormClick}
            >
              <Plus className="w-5 h-5" />
              Generate New Script
            </button>
          )}
          {(view === 'form' || view === 'script') && (
            <button
              className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
              onClick={handleBackToTable}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Scripts
            </button>
          )}
        </div>

        {/* Table view */}
        {view === 'table' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    Your Generated Scripts
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Manage and view all your call scripts</p>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="all">All Scripts</option>
                    <option value="active">Active Scripts</option>
                    <option value="inactive">Inactive Scripts</option>
                  </select>
                </div>
              </div>
            </div>

            {isLoadingScripts ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-3 text-gray-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  Loading your scripts...
                </div>
              </div>
            ) : scriptsError ? (
              <div className="p-8 m-6 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-3 text-red-700">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Error loading scripts</p>
                    <p className="text-sm">{scriptsError}</p>
                  </div>
                </div>
              </div>
            ) : scripts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Headphones className="w-8 h-8 text-gray-400" />
                </div>

                {/* Different messages based on the current filter */}
                {statusFilter === 'all' ? (
                  <>
                    <h4 className="text-lg font-medium text-gray-700 mb-2">No scripts yet</h4>
                    <p className="text-gray-500 mb-6">Create your first call script to get started</p>
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-medium mx-auto"
                      onClick={handleShowFormClick}
                    >
                      <Plus className="w-5 h-5" />
                      Generate Your First Script
                    </button>
                  </>
                ) : statusFilter === 'active' ? (
                  <>
                    <h4 className="text-lg font-medium text-gray-700 mb-2">No active scripts</h4>
                    <p className="text-gray-500 mb-6">All your scripts are currently inactive. You can activate them or create new ones.</p>
                    <div className="space-y-3">
                      <button
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-medium mx-auto"
                        onClick={handleShowFormClick}
                      >
                        <Plus className="w-5 h-5" />
                        Create New Script
                      </button>
                      <button
                        className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium mx-auto"
                        onClick={() => setStatusFilter('all')}
                      >
                        <Filter className="w-5 h-5" />
                        View All Scripts
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-lg font-medium text-gray-700 mb-2">No inactive scripts</h4>
                    <p className="text-gray-500 mb-6">All your scripts are currently active. Great job keeping your scripts organized!</p>
                    <div className="space-y-3">
                      <button
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-medium mx-auto"
                        onClick={handleShowFormClick}
                      >
                        <Plus className="w-5 h-5" />
                        Create New Script
                      </button>
                      <button
                        className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium mx-auto"
                        onClick={() => setStatusFilter('all')}
                      >
                        <Filter className="w-5 h-5" />
                        View All Scripts
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Gig</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Target Client</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Language</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scripts.map((script, idx) => {
                      const gig = script.gig || gigs.find(g => g._id === script.gigId);
                      return (
                        <tr
                          key={script._id}
                          className="hover:bg-blue-50 transition-colors duration-150 group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <Target className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800">
                                    {script.gig?.title || 'Untitled Gig'}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {script.gig?.category || 'No category'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              {script.targetClient}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{script.language}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${script.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}>
                                <div className={`w-2 h-2 rounded-full mr-1 ${script.isActive ? 'bg-green-500' : 'bg-gray-500'
                                  }`}></div>
                                {script.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">{new Date(script.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="inline-flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium"
                                onClick={() => handleShowScript(script)}
                                title="View script"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              <button
                                className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${script.isActive
                                    ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                                    : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                  }`}
                                onClick={() => handleUpdateScriptStatus(script._id, !script.isActive)}
                                disabled={updatingScriptId === script._id}
                                title={script.isActive ? 'Deactivate script' : 'Activate script'}
                              >
                                {updatingScriptId === script._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                ) : script.isActive ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                                {updatingScriptId === script._id
                                  ? 'Updating...'
                                  : script.isActive
                                    ? 'Deactivate'
                                    : 'Activate'
                                }
                              </button>
                              <button
                                className="inline-flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleDeleteScript(script._id)}
                                disabled={deletingScriptId === script._id}
                                title="Delete script"
                              >
                                {deletingScriptId === script._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                {deletingScriptId === script._id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Script detail view */}
        {view === 'script' && selectedScript && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Headphones className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold">Call Script</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white/20 text-white border border-white/30">
                        Structured Call
                      </span>
                    </div>
                    <p className="text-blue-100">Ready to use conversation guide with structured phases</p>
                  </div>
                </div>

                {/* Add Regenerate button */}
                <button
                  onClick={() => handleRegenerateScript(selectedScript._id)}
                  disabled={regeneratingScriptId === selectedScript._id}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-all duration-200"
                >
                  {regeneratingScriptId === selectedScript._id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Script
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Gig</p>
                    <p className="font-medium text-gray-800">
                      {selectedScript.gig?.title || 'Untitled Gig'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedScript.gig?.category || 'No category'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Target Client</p>
                    <p className="font-medium text-gray-800">{selectedScript.targetClient}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Language</p>
                    <p className="font-medium text-gray-800">{selectedScript.language}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedScript.isActive ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-gray-600" />
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                    <p className={`font-medium ${selectedScript.isActive ? 'text-green-800' : 'text-gray-800'}`}>
                      {selectedScript.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
                    <p className="font-medium text-gray-800">{new Date(selectedScript.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              {selectedScript.details && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-600"><span className="font-medium">Context:</span> {selectedScript.details}</p>
                </div>
              )}
            </div>

            {/* Script content with edit options */}
            <div className="p-6">
              <div className="space-y-8">
                {regeneratingScriptId === selectedScript?._id ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Regenerating Script...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                  </div>
                ) : Array.isArray(selectedScript?.script) && selectedScript.script.length > 0 ? (
                  groupScriptByPhase(selectedScript.script).map((phaseGroup, phaseIdx) => {
                    const phaseConfig = getPhaseConfig(phaseGroup.phaseName);
                    const PhaseIcon = phaseConfig.icon;

                    return (
                      <div key={phaseIdx} className="relative">
                        {/* Phase Header */}
                        <div className={`mb-6 p-4 rounded-xl border-2 ${phaseConfig.bgColor} ${phaseConfig.borderColor} shadow-sm`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 bg-white rounded-lg shadow-md ${phaseConfig.color}`}>
                                <PhaseIcon className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className={`text-lg font-bold ${phaseConfig.color}`}>
                                  {phaseGroup.phaseName}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {phaseConfig.description}
                                </p>
                              </div>
                            </div>

                            {/* Add Replica Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAddReplica(selectedScript._id, phaseGroup.phaseName, 'agent')}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                                Add Agent Response
                              </button>
                              <button
                                onClick={() => handleAddReplica(selectedScript._id, phaseGroup.phaseName, 'lead')}
                                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                                Add Lead Response
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Phase Steps with edit options */}
                        <div className="space-y-4 ml-4 border-l-2 border-gray-200 pl-6 relative">
                          {phaseGroup.steps.map((step, stepIdx) => {
                            const globalStepIdx = selectedScript.script.findIndex(s =>
                              s.phase === step.phase && s.actor === step.actor && s.replica === step.replica
                            );

                            return (
                              <div key={stepIdx} className="flex items-start gap-4 group relative">
                                {/* Connection line dot */}
                                <div className={`absolute -left-7 top-4 w-3 h-3 rounded-full border-2 border-white shadow-sm ${phaseConfig.bgColor} ${phaseConfig.borderColor}`}></div>

                                <div className="flex-shrink-0">
                                  {step.actor === 'agent' ? (
                                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                                      <Headphones className="w-5 h-5 text-white" />
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                                      <User className="w-5 h-5 text-white" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className={
                                    'rounded-2xl px-6 py-4 shadow-md border-l-4 transition-all duration-200 group-hover:shadow-lg ' +
                                    (step.actor === 'agent'
                                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-500 text-blue-900'
                                      : 'bg-gradient-to-r from-green-50 to-green-100 border-green-500 text-green-900')
                                  }>
                                    <div className="flex flex-col gap-2">
                                      <span className="font-bold text-sm uppercase tracking-wide opacity-75">
                                        {step.actor === 'agent' ? 'Agent' : 'Lead'}:
                                      </span>
                                      <div className="min-h-[24px]"> {/* Hauteur minimale pour éviter les sauts */}
                                        {processingSteps.includes(globalStepIdx) ? (
                                          <div className="flex items-center gap-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                            <span className="text-sm font-medium">Updating response...</span>
                                          </div>
                                        ) : (
                                          <p className="leading-relaxed whitespace-pre-wrap">{step.replica}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Edit options */}
                                <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                  {/* Delete button */}
                                  <button
                                    onClick={() => handleDeleteReplica(selectedScript._id, globalStepIdx)}
                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    title="Delete replica"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>

                                  {/* Direct edit */}
                                  <button
                                    onClick={() => setEditingStep({ index: globalStepIdx, text: step.replica })}
                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                    title="Edit directly"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  {/* Refine with prompt */}
                                  <button
                                    onClick={() => setRefiningStep({ index: globalStepIdx, prompt: '' })}
                                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                                    title="Refine with prompt"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Edit modal */}
                                {editingStep?.index === globalStepIdx && (
                                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
                                      <h3 className="text-lg font-bold mb-4">Edit Response</h3>
                                      <div className="flex-1 min-h-0 overflow-y-auto">
                                        <textarea
                                          value={editingStep.text}
                                          onChange={e => setEditingStep({ ...editingStep, text: e.target.value })}
                                          className="w-full h-full min-h-[200px] p-3 border-2 border-gray-200 rounded-lg mb-4 resize-none"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                          onClick={() => setEditingStep(null)}
                                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleUpdateScriptContent(selectedScript._id, globalStepIdx, { replica: editingStep.text });
                                            setEditingStep(null);
                                          }}
                                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                          Save Changes
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Refine modal */}
                                {refiningStep?.index === globalStepIdx && (
                                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
                                      <h3 className="text-lg font-bold mb-4">Refine Response</h3>
                                      <div className="flex-1 min-h-0 overflow-y-auto">
                                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                          <p className="text-sm text-gray-600 mb-2">Current response:</p>
                                          <p className="text-gray-800">{step.replica}</p>
                                        </div>
                                        <textarea
                                          value={refiningStep.prompt}
                                          onChange={e => setRefiningStep({ ...refiningStep, prompt: e.target.value })}
                                          placeholder="Describe how you want to refine this response..."
                                          className="w-full h-full min-h-[200px] p-3 border-2 border-gray-200 rounded-lg resize-none"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                          onClick={() => setRefiningStep(null)}
                                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleRefineScriptPart(selectedScript._id, globalStepIdx, refiningStep.prompt);
                                            setRefiningStep(null);
                                          }}
                                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                          Refine Response
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Headphones className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No script content available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Script Generation Form */}
        {view === 'form' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
            <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Plus className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Create New Script</h3>
                  <p className="text-purple-100">Generate a personalized call script for your gig</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Script Structure Info */}
              <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
                <h4 className="text-lg font-bold text-purple-800 mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Structured Call Script
                </h4>
                <p className="text-purple-700 mb-4">Your script will be generated following a proven methodology with these key phases:</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {REPS_PHASES.map((phase, idx) => {
                    const PhaseIcon = phase.icon;
                    return (
                      <div key={idx} className={`p-3 rounded-lg border ${phase.bgColor} ${phase.borderColor} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center gap-2">
                          <PhaseIcon className={`w-4 h-4 ${phase.color}`} />
                          <p className={`text-xs font-semibold ${phase.color} leading-tight`}>
                            {phase.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Gig <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedGig?._id || ''}
                    onChange={e => handleGigSelectInForm(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    required
                  >
                    <option value="">Choose a gig to create script for...</option>
                    {gigs.map(gig => (
                      <option key={gig._id} value={gig._id}>{gig.title || gig.category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Domain</label>
                  <input
                    type="text"
                    value={domaine}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                    placeholder="Auto-filled from selected gig"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Client (DISC Profile) <span className="text-red-500">*</span>
                </label>
                <select
                  value={typeClient}
                  onChange={e => setTypeClient(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  required
                >
                  <option value="">Select client personality type...</option>
                  <option value="D">🎯 D: Direct and results-oriented</option>
                  <option value="I">🤝 I: Enthusiastic and relational</option>
                  <option value="S">🛡️ S: Reassuring and stable</option>
                  <option value="C">📊 C: Structured and analytical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Context <span className="text-gray-400">(optional but recommended)</span>
                </label>
                <textarea
                  value={contexte}
                  onChange={e => setContexte(e.target.value)}
                  placeholder="Provide additional context like client history, emotional state, common objections, or specific situation details..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Language & Tone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={langueTon}
                  onChange={e => setLangueTon(e.target.value)}
                  placeholder="e.g., Professional yet warm, Casual and friendly, Formal and authoritative..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !selectedGig ||
                    !domaine.trim() ||
                    !typeClient.trim() ||
                    !langueTon.trim()
                  }
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Generating Your Script...
                    </>
                  ) : (
                    <>
                      <Plus className="w-6 h-6" />
                      Generate Script
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl animate-bounce">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-red-800 font-semibold">Something went wrong</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>


    </div>
  );
};

export default ScriptGenerator; 