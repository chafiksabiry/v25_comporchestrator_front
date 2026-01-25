import React, { useState, useEffect } from 'react';
import apiClient from '../api/knowledgeClient';
import Cookies from 'js-cookie';
import {
    User, Headphones, Plus, ArrowLeft, Eye, Calendar, Target, Globe, Trash2, ToggleLeft, ToggleRight, Filter, X,
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
            // Check localStorage first (more reliable in our micro-frontend setup)
            const localCompanyId = localStorage.getItem('companyId');
            if (localCompanyId) return localCompanyId;

            // Fallback to cookie
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
            const gigsApiUrl = import.meta.env.VITE_GIGS_API_URL || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
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
            const backendUrl = import.meta.env.VITE_BACKEND_API;
            if (!backendUrl) throw new Error('Backend API URL not configured');

            // Use the new dedicated endpoint
            const response = await fetch(`${backendUrl}/api/scripts/${scriptId}/replicas/${stepIndex}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
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

    // State to track which step is being edited
    const [editingStep, setEditingStep] = useState<{ index: number, text: string } | null>(null);

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
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
                        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
                            <Headphones className="mr-3 text-blue-600" size={28} />
                            Script Generator
                        </h1>
                        <p className="text-gray-500 text-sm">Create and manage call scripts powered by AI</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                        <button
                            onClick={handleBackToOrchestrator}
                            className="group flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </button>
                        {view === 'table' && (
                            <button
                                onClick={handleShowFormClick}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                            >
                                <Plus size={16} className="mr-2" />
                                New Script
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Messages */}
                {(gigsError || scriptsError) && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-fade-in">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">
                                    {gigsError && <span className="block">{gigsError}</span>}
                                    {scriptsError && <span className="block">{scriptsError}</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Switching Logic */}
                {view === 'table' ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                <FileText className="mr-2 text-gray-400" size={20} />
                                Your Scripts
                            </h2>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                <Filter size={14} className="text-gray-400 ml-2" />
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'all'
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'active'
                                        ? 'bg-white text-green-700 shadow-sm border border-green-100'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setStatusFilter('inactive')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'inactive'
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Inactive
                                </button>
                            </div>
                        </div>

                        {isLoadingScripts ? (
                            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                                <p>Loading scripts...</p>
                            </div>
                        ) : scripts.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                    <FileText className="text-gray-400" size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No scripts found</h3>
                                <p className="text-gray-500 mb-6">Get started by generating your first call script.</p>
                                <button
                                    onClick={handleShowFormClick}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    <Plus size={16} className="mr-2" />
                                    Generate Script
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                            <th className="p-4 font-medium sticky left-0 bg-gray-50">Gig / Campaign</th>
                                            <th className="p-4 font-medium">Target / Language</th>
                                            <th className="p-4 font-medium">Steps</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium">Created</th>
                                            <th className="p-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {scripts.map((script) => (
                                            <tr key={script._id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="p-4 sticky left-0 bg-white group-hover:bg-gray-50">
                                                    <div className="font-medium text-gray-900">{script.gig?.title || 'Unknown Gig'}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{script.gig?.category || 'No Category'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-gray-800">{script.targetClient || 'N/A'}</div>
                                                    <div className="flex items-center mt-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                            <Globe size={10} className="mr-1" />
                                                            {script.language || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {script.script.length} steps
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateScriptStatus(script._id, !script.isActive);
                                                        }}
                                                        disabled={updatingScriptId === script._id}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${script.isActive ? 'bg-green-600' : 'bg-gray-200'
                                                            }`}
                                                        title={script.isActive ? "Deactivate script" : "Activate script"}
                                                    >
                                                        <span className="sr-only">Use setting</span>
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${script.isActive ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="p-4 text-sm text-gray-500">
                                                    {new Date(script.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleShowScript(script)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="View Script"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteScript(script._id);
                                                            }}
                                                            disabled={deletingScriptId === script.script}
                                                            className={`p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${deletingScriptId === script._id ? 'opacity-50 cursor-not-allowed' : ''
                                                                }`}
                                                            title="Delete Script"
                                                        >
                                                            {deletingScriptId === script._id ? (
                                                                <RefreshCw size={18} className="animate-spin" />
                                                            ) : (
                                                                <Trash2 size={18} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : view === 'script' && selectedScript ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Script View Header */}
                        <div className="border-b border-gray-200 bg-white p-6 sticky top-0 z-10">
                            <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-start md:space-y-0">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-xl font-bold text-gray-900">{selectedScript.gig?.title}</h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${selectedScript.isActive
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                            {selectedScript.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <Target size={16} className="mr-2 text-indigo-500" />
                                            <span>{selectedScript.targetClient}</span>
                                        </div>
                                        <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <Globe size={16} className="mr-2 text-blue-500" />
                                            <span>{selectedScript.language}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleRegenerateScript(selectedScript._id)}
                                        disabled={regeneratingScriptId === selectedScript._id}
                                        className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                                        title="Regenerate entire script"
                                    >
                                        <RefreshCw size={16} className={`mr-2 ${regeneratingScriptId === selectedScript._id ? 'animate-spin' : ''}`} />
                                        {regeneratingScriptId === selectedScript._id ? 'Regenerating...' : 'Regenerate'}
                                    </button>
                                    <button
                                        onClick={handleBackToTable}
                                        className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <ArrowLeft size={16} className="mr-2" />
                                        Back to List
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Script Content */}
                        <div className="p-6 bg-gray-50 min-h-[500px]">
                            <div className="max-w-4xl mx-auto space-y-8">
                                {groupScriptByPhase(selectedScript.script).map((group, groupIdx) => {
                                    const phaseConfig = getPhaseConfig(group.phaseName);
                                    const Icon = phaseConfig.icon;

                                    return (
                                        <div key={groupIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div className={`px-6 py-4 border-b ${phaseConfig.borderColor} ${phaseConfig.bgColor} flex items-center justify-between`}>
                                                <div className="flex items-center">
                                                    <div className={`p-2 rounded-lg bg-white bg-opacity-60 mr-4 shadow-sm`}>
                                                        <Icon size={20} className={phaseConfig.color} />
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-semibold ${phaseConfig.color} text-lg`}>
                                                            {phaseConfig.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 mt-0.5">{phaseConfig.description}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddReplica(selectedScript._id, group.phaseName, 'agent')}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                                                    title="Add new replica to this phase"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>

                                            <div className="divide-y divide-gray-100">
                                                {group.steps.map((step, stepIdx) => {
                                                    const absoluteIndex = selectedScript.script.findIndex(s => s === step);
                                                    const isProcessing = processingSteps.includes(absoluteIndex);
                                                    const isEditing = editingStep?.index === absoluteIndex;

                                                    return (
                                                        <div key={stepIdx} className={`p-6 hover:bg-gray-50 transition-colors ${step.actor === 'agent' ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                            <div className="flex items-start gap-4">
                                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${step.actor === 'agent'
                                                                    ? 'bg-blue-100 text-blue-700 ring-4 ring-blue-50'
                                                                    : 'bg-amber-100 text-amber-700 ring-4 ring-amber-50'
                                                                    }`}>
                                                                    {step.actor === 'agent' ? 'AG' : 'CL'}
                                                                </div>

                                                                <div className="flex-grow min-w-0 space-y-3">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className={`text-xs font-semibold uppercase tracking-wider ${step.actor === 'agent' ? 'text-blue-600' : 'text-amber-600'
                                                                            }`}>
                                                                            {step.actor === 'agent' ? 'Agent / Sales Rep' : 'Client / Prospect'}
                                                                        </span>

                                                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {!isEditing && (
                                                                                <button
                                                                                    onClick={() => setEditingStep({ index: absoluteIndex, text: step.replica })}
                                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                                                                                    title="Edit text"
                                                                                >
                                                                                    <Edit2 size={14} />
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleDeleteReplica(selectedScript._id, absoluteIndex)}
                                                                                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                                                                title="Delete replica"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {isEditing ? (
                                                                        <div className="space-y-3">
                                                                            <textarea
                                                                                value={editingStep.text}
                                                                                onChange={(e) => setEditingStep({ ...editingStep, text: e.target.value })}
                                                                                className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none text-gray-800 text-base"
                                                                                rows={3}
                                                                                autoFocus
                                                                            />
                                                                            <div className="flex justify-end gap-2">
                                                                                <button
                                                                                    onClick={() => setEditingStep(null)}
                                                                                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        handleUpdateScriptContent(selectedScript._id, absoluteIndex, { replica: editingStep.text });
                                                                                        setEditingStep(null);
                                                                                    }}
                                                                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm"
                                                                                >
                                                                                    Save Changes
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap">
                                                                            {step.replica}
                                                                        </p>
                                                                    )}

                                                                    {/* AI Refinement Tool */}
                                                                    {!isEditing && (
                                                                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center">
                                                                            <div className="relative flex-grow">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Ask AI to refine this part (e.g., 'make it more persuasive', 'shorter', 'more formal')"
                                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-full py-1.5 pl-4 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all hover:bg-white"
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            handleRefineScriptPart(selectedScript._id, absoluteIndex, e.currentTarget.value);
                                                                                            e.currentTarget.value = '';
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400">
                                                                                    {isProcessing ? (
                                                                                        <RefreshCw size={12} className="animate-spin" />
                                                                                    ) : (
                                                                                        <MessageSquare size={12} />
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">New Call Script</h2>
                                <p className="text-gray-500">Configure parameters to generate a tailored script</p>
                            </div>
                            <button
                                onClick={handleShowFormClick}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
                                {/* 1. Select Gig */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-900">
                                        Select Gig / Campaign <span className="text-red-500">*</span>
                                    </label>

                                    {isLoadingGigs ? (
                                        <div className="h-12 bg-gray-50 animate-pulse rounded-lg border border-gray-100"></div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {gigs.map(gig => (
                                                <div
                                                    key={gig._id}
                                                    className={`
                            relative rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md
                            ${selectedGig?._id === gig._id
                                                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                                        }
                          `}
                                                    onClick={() => handleGigSelectInForm(gig._id)}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-gray-900 line-clamp-1">{gig.title}</h3>
                                                        {selectedGig?._id === gig._id && (
                                                            <CheckCircle size={18} className="text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mb-3">{gig.category}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(gig.skills?.professional || []).slice(0, 2).map((s, idx) => (
                                                            <span key={idx} className="inline-flex text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                                                {s.skill}
                                                            </span>
                                                        ))}
                                                        {(gig.skills?.professional?.length || 0) > 2 && (
                                                            <span className="inline-flex text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                                                +{(gig.skills?.professional?.length || 0) - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedGig && (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* 2. Target Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                                    placeholder="e.g. CMOs of SaaS companies, Homeowners"
                                                    value={typeClient}
                                                    onChange={(e) => setTypeClient(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Language & Tone</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                                    placeholder="e.g. French, Professional but friendly"
                                                    value={langueTon}
                                                    onChange={(e) => setLangueTon(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* 3. Context */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Campaign Context</label>
                                            <textarea
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                                placeholder="Additional context: campaign goals, specific offers, key selling points..."
                                                rows={4}
                                                value={contexte}
                                                onChange={(e) => setContexte(e.target.value)}
                                                required
                                            />
                                        </div>

                                        {/* Submit Button */}
                                        <div className="pt-4 flex items-center justify-end">
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className={`
                          flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0
                          ${isLoading ? 'opacity-75 cursor-wait' : ''}
                        `}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <RefreshCw className="animate-spin mr-3" size={20} />
                                                        Generating Script...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Star className="mr-2" size={20} />
                                                        Generate with AI
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScriptGenerator;

