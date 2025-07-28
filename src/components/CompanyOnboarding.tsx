import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  FileText,
  Phone,
  Users,
  BookOpen,
  MessageSquare,
  BarChart,
  CheckCircle,
  ChevronRight,
  AlertCircle,
  Upload,
  Globe,
  Calendar,
  Settings,
  Rocket
} from 'lucide-react';
import TelephonySetup from './TelephonySetup';
import CompanyProfile from './onboarding/CompanyProfile';
import KYCVerification from './onboarding/KYCVerification';
import SubscriptionPlan from './onboarding/SubscriptionPlan';
import CallScript from './onboarding/CallScript';
import ReportingSetup from './onboarding/ReportingSetup';
import CreateGig from './onboarding/CreateGig';
import UploadContacts from './onboarding/UploadContacts';
import MatchHarxReps from './onboarding/MatchHarxReps';
import RepOnboarding from './onboarding/RepOnboarding';
import SessionPlanning from './onboarding/SessionPlanning';
import Cookies from 'js-cookie';
import axios from 'axios';
import GigDetails from './onboarding/GigDetails';
import KnowledgeBase from './onboarding/KnowledgeBase';
import ApprovalPublishing from './ApprovalPublishing';
import ZohoService from '../services/zohoService';

interface BaseStep {
  id: number;
  title: string;
  description: string;
  status: string;
  disabled?: boolean;
}

interface ComponentStep extends BaseStep {
  component: React.ComponentType;
}

interface NonComponentStep extends BaseStep {
  component?: never;
}

type Step = ComponentStep | NonComponentStep;

interface Phase {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  steps: Step[];
}

interface OnboardingProgressResponse {
  currentPhase: number;
  completedSteps: number[];
  phases: {
    id: number;
    status: 'pending' | 'in_progress' | 'completed';
    steps: {
      id: number;
      status: 'pending' | 'in_progress' | 'completed';
      completedAt?: Date;
    }[];
  }[];
}

interface HasGigsResponse {
  message: string;
  data: {
    hasGigs: boolean;
  };
}

interface HasLeadsResponse {
  success: boolean;
  hasLeads: boolean;
  count: number;
}

interface CompanyResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    // Add other company fields as needed
  };
}

interface GigResponse {
  success: boolean;
  message: string;
  data: Array<{
    _id: string;
    title: string;
    status: string;
    // Add other gig fields as needed
  }>;
}

const CompanyOnboarding = () => {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [displayedPhase, setDisplayedPhase] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showTelephonySetup, setShowTelephonySetup] = useState(false);
  const [showUploadContacts, setShowUploadContacts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGigs, setHasGigs] = useState(false);
  const [hasLeads, setHasLeads] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showGigDetails, setShowGigDetails] = useState(false);
  const userId = Cookies.get('userId') || '68308337cf52e87c3ad15982';

  // Fetch company ID using user ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (import.meta.env.VITE_NODE_ENV === 'development') {
        const devCompanyId = '6830839c641398dc582eb897';
        setCompanyId(devCompanyId);
        Cookies.set('companyId', devCompanyId);
        return;
      }

      if (!userId) {
        console.error('User ID not found in cookies');
        window.location.href = '/auth';
        return;
      }

      try {
        const response = await axios.get<CompanyResponse>(`${import.meta.env.VITE_COMPANY_API_URL}/companies/user/${userId}`);
        if (response.data.success && response.data.data) {
          setCompanyId(response.data.data._id);
          // Store company ID in cookie for backward compatibility
          Cookies.set('companyId', response.data.data._id);
        } else {
          // Redirect to /auth if no company data is found
          window.location.href = '/auth';
        }
      } catch (error) {
        console.error('Error fetching company ID:', error);
        // Redirect to /auth on error
        window.location.href = '/auth';
      }
    };

    fetchCompanyId();
  }, [userId]);

  // Load company progress and check gigs when company ID is available
  useEffect(() => {
    if (companyId) {
      console.log('🔄 Company ID available, loading progress and checking gigs...');
      loadCompanyProgress();
      checkCompanyGigs();
      
      // Vérifier si l'utilisateur vient de se connecter à Zoho
      checkZohoConnection();
    }
  }, [companyId]);

  // Recharger les données périodiquement pour détecter les changements
  // Désactivé car cause trop de rafraîchissements
  // useEffect(() => {
  //   if (!companyId) return;

  //   const interval = setInterval(() => {
  //     loadCompanyProgress();
  //   }, 5000); // Recharger toutes les 5 secondes

  //   return () => clearInterval(interval);
  // }, [companyId]);

  // Si l'URL contient ?startStep=6 ou si on est sur l'URL spécifique avec session, on lance handleStartStep(6)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Vérifier si l'URL contient le paramètre startStep=6
    if (params.get('session') === 'someGeneratedSessionId' && companyId) {
      handleStartStep(6);
    }
  }, [companyId]);

  const checkCompanyGigs = async () => {
    try {
      const response = await axios.get<HasGigsResponse>(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}/has-gigs`);
      const hasGigs = response.data.data.hasGigs;
      setHasGigs(hasGigs);
      
      // If company has gigs, update the onboarding progress for step 4
      if (hasGigs) {
        try {
          await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/4`,
            { status: 'completed' }
          );
          // Update local state to reflect the completed step
          setCompletedSteps(prev => [...prev, 4]);
        } catch (error) {
          console.error('Error updating onboarding progress:', error);
        }
      }
    } catch (error) {
      console.error('Error checking company gigs:', error);
    }
  };

  const checkCompanyLeads = async () => {
    try {
      const response = await axios.get<HasLeadsResponse>(`${import.meta.env.VITE_DASHBOARD_API}/leads/company/${companyId}/has-leads`);
      const hasLeads = response.data.hasLeads;
      setHasLeads(hasLeads);
      
      // If company has leads, update the onboarding progress for step 6
      if (hasLeads) {
        try {
          await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`,
            { status: 'completed' }
          );
          // Update local state to reflect the completed step
          setCompletedSteps(prev => [...prev, 6]);
        } catch (error) {
          console.error('Error updating onboarding progress:', error);
        }
      }
    } catch (error) {
      console.error('Error checking company leads:', error);
    }
  };

  const checkActiveGigs = async () => {
    try {
      console.log('🔍 Checking for active gigs...');
      const response = await axios.get<GigResponse>(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`);
      
      if (response.data && response.data.data) {
        const gigs = response.data.data;
        const hasActiveGig = gigs.some((gig: any) => 
          gig.status === 'active' || gig.status === 'approved' || gig.status === 'published'
        );
        
        console.log('🔍 Active gigs check:', { 
          totalGigs: gigs.length, 
          hasActiveGig, 
          gigStatuses: gigs.map((g: any) => g.status) 
        });
        
        // If at least one gig is active, complete the last phase and step
        if (hasActiveGig) {
          try {
            console.log('✅ Found active gig - completing last phase and step');
            const completeResponse = await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/complete-last`
            );
            
            if (completeResponse.data) {
              console.log('✅ Last phase and step completed successfully:', completeResponse.data);
              // Reload progress to reflect the changes
              await loadCompanyProgress();
            }
          } catch (error) {
            console.error('Error completing last phase and step:', error);
          }
        }
        
        // If no gigs are active and step 13 was previously completed, mark it as in_progress
        else {
          try {
            console.log('⚠️ No active gigs found - updating step 13 status');
            
            // Mark step 13 as in_progress
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/4/steps/13`,
              { status: 'in_progress' }
            );
            
            // Update local state to remove the completed step
            setCompletedSteps(prev => prev.filter(step => step !== 13));
            console.log('⚠️ Step 13 removed from completed steps and marked as in_progress');
            
            // Reload progress to get the correct phase from the API
            await loadCompanyProgress();
          } catch (error) {
            console.error('Error updating onboarding progress for step 13:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error checking active gigs:', error);
    }
  };

  // Real-time leads checking
  useEffect(() => {
    if (!companyId) return;

    // Initial check
    checkCompanyLeads();
    checkActiveGigs();

    // Set up real-time checking every 30 seconds
    const intervalId = setInterval(() => {
      checkCompanyLeads();
      checkActiveGigs();
    }, 30000); // Check every 30 seconds

    // Cleanup interval on component unmount or when companyId changes
    return () => {
      clearInterval(intervalId);
    };
  }, [companyId]);

  const loadCompanyProgress = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<OnboardingProgressResponse>(`${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`);
      const progress = response.data;
      console.log('🔄 API Response:', response.data);
      console.log('🔄 currentPhase from API:', progress.currentPhase);
      console.log('🔄 completedSteps from API:', progress.completedSteps);
      
      // Store the progress in cookies
      Cookies.set('companyOnboardingProgress', JSON.stringify(progress));
      
      // Check if step 7 is completed and automatically advance to phase 3
      // BUT only if we're not already in phase 4 or beyond
      if (progress.completedSteps.includes(7) && progress.currentPhase < 4) {
        const validPhase = 3;
        console.log('🔄 Forcing phase to 3 because step 7 is completed and currentPhase < 4');
        setCurrentPhase(validPhase);
        setDisplayedPhase(validPhase);
      } else {
        // Vérifier que la phase est valide (entre 1 et 4)
        let validPhase = Math.max(1, Math.min(4, progress.currentPhase));
        
        // Si l'API retourne phase 1 mais que step 13 est complété, 
        // cela signifie qu'on devrait être en phase 4
        if (progress.currentPhase === 1 && progress.completedSteps.includes(13)) {
          console.log('🔄 API returned phase 1 but step 13 is completed - setting phase to 4');
          validPhase = 4;
        }
        
        // Si l'API retourne phase 1 mais qu'on a des étapes complétées des phases 2 et 3,
        // on détermine la phase appropriée
        if (progress.currentPhase === 1) {
          if (progress.completedSteps.includes(10)) {
            // Si step 10 (Match HARX REPS) est complété, on devrait être en phase 3
            console.log('🔄 API returned phase 1 but step 10 is completed - setting phase to 3');
            validPhase = 3;
          } else if (progress.completedSteps.includes(7)) {
            // Si step 7 (Knowledge Base) est complété, on devrait être en phase 2
            console.log('🔄 API returned phase 1 but step 7 is completed - setting phase to 2');
            validPhase = 2;
          }
        }
        
        console.log('🔄 Setting phase to:', validPhase, 'from API currentPhase:', progress.currentPhase);
        setCurrentPhase(validPhase);
        setDisplayedPhase(validPhase);
      }
      
      setCompletedSteps(progress.completedSteps);
    } catch (error) {
      console.error('Error loading company progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier si l'utilisateur vient de se connecter à Zoho
  const checkZohoConnection = async () => {
    try {
      // Vérifier si Zoho est configuré pour cet utilisateur
      const zohoService = ZohoService.getInstance();
      const isConfigured = zohoService.isConfigured();
      
      // Si Zoho est configuré et que l'utilisateur vient de revenir de la connexion,
      // afficher automatiquement le composant UploadContacts
      if (isConfigured) {
        console.log('✅ Zoho est configuré - Affichage automatique du composant UploadContacts');
        setShowUploadContacts(true);
        setActiveStep(6); // Step 6 est Upload Contacts
      }
    } catch (error) {
      console.error('Error checking Zoho connection:', error);
    }
  };

  const handleStartStep = async (stepId: number) => {
    if (!companyId) {
      console.error('Company ID not available for starting step');
      return;
    }

    try {
      // Mettre à jour le statut de l'étape à "in_progress"
      const phaseId = phases.findIndex(phase => 
        phase.steps.some(step => step.id === stepId)
      ) + 1;

      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
        { status: 'in_progress' }
      );

      const allSteps = phases.flatMap(phase => phase.steps);
      const step = allSteps.find(s => s.id === stepId);
      
      // Special handling for Knowledge Base step
      if (stepId === 7) {
          window.location.replace(import.meta.env.VITE_KNOWLEDGE_BASE_URL);
        return;
      }
      
      // Special handling for Call Script step
      if (stepId === 8) {
          window.location.replace(import.meta.env.VITE_SCRIPT_GENERATION_BASE_URL);
        return;
      }
      
      // Special handling for Gig Activation step (step 13) - redirect to Approval & Publishing
      if (stepId === 13) {
        // Set the active tab to approval-publishing in the parent App component
        if (window.parent && window.parent !== window) {
          // If we're in an iframe, communicate with parent
          window.parent.postMessage({ type: 'SET_ACTIVE_TAB', tab: 'approval-publishing' }, '*');
        } else {
          // If we're in the main window, use localStorage to communicate with App component
          localStorage.setItem('activeTab', 'approval-publishing');
          // Trigger a custom event to notify the App component
          window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: 'approval-publishing' } }));
        }
        return;
      }
      
      if (step?.component) {
        if (stepId === 4 && completedSteps.includes(stepId)) {
          setShowGigDetails(true);
        } else if (stepId === 5) {
          setShowTelephonySetup(true);
        } else {
          setActiveStep(stepId);
        }
      }
    } catch (error) {
      console.error('Error updating step status:', error);
      // Afficher un message d'erreur plus informatif
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };


  const handleStepComplete = async (stepId: number) => {
    if (!companyId) {
      console.error('Company ID not available for step completion');
      return;
    }

    try {
      const phaseId = phases.findIndex(phase => 
        phase.steps.some(step => step.id === stepId)
      ) + 1;

      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
        { status: 'completed' }
      );

      setCompletedSteps(prev => [...prev, stepId]);
    } catch (error) {
      console.error('Error completing step:', error);
      // Afficher un message d'erreur plus informatif
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };

  const handlePhaseChange = async (newPhase: number) => {
    if (!companyId) return;

    // Mettre à jour seulement la phase affichée
    setDisplayedPhase(newPhase);

    // On ne met à jour l'API que si:
    // 1. La nouvelle phase est accessible
    // 2. La nouvelle phase est inférieure à la phase actuelle
    // 3. La phase n'est pas déjà complétée (currentPhase > newPhase)
    if (isPhaseAccessible(newPhase) && newPhase <= currentPhase && !isPhaseCompleted(newPhase)) {
      try {
        await axios.put(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/current-phase`,
          { phase: newPhase }
        );
        setCurrentPhase(newPhase);
      } catch (error) {
        console.error('Error updating phase:', error);
      }
    }
  };

  const isPhaseCompleted = (phaseId: number) => {
    const phase = phases[phaseId - 1];
    return phase.steps
      .filter(step => !step.disabled)
      .every(step => completedSteps.includes(step.id));
  };

  const handlePreviousPhase = () => {
    const newPhase = Math.max(1, displayedPhase - 1);
    // Pour Previous, on met juste à jour la phase affichée
    setDisplayedPhase(newPhase);
  };

  const handleNextPhase = () => {
    const newPhase = Math.min(4, displayedPhase + 1);
    // Rediriger seulement si on est déjà en phase 4
    if (displayedPhase === 4) {
      window.location.href = '/company';
    } else {
      handlePhaseChange(newPhase);
    }
  };

  const isPhaseAccessible = (phaseId: number) => {
    if (phaseId === 1) return true;
    
    const previousPhase = phases[phaseId - 2];
    return previousPhase.steps
      .filter(step => !step.disabled)
      .every(step => completedSteps.includes(step.id));
  };

  const phases: Phase[] = [
    {
      id: 1,
      title: 'Company Account Setup & Identity',
      icon: Building2,
      color: 'blue',
      steps: [
        {
          id: 1,
          title: 'Create Company Profile',
          description: 'Legal and commercial details, key contacts, terms agreement',
          status: 'completed',
          component: CompanyProfile
        },
        {
          id: 2,
          title: 'KYC / KYB Verification',
          description: 'Identity verification through Stripe Identity or Sumsub',
          status: 'current',
          component: KYCVerification,
          disabled: true
        },
        {
          id: 3,
          title: 'Subscription Plan',
          description: 'Select plan: Free, Standard, or Premium',
          status: 'pending',
          component: SubscriptionPlan
        }
      ]
    },
    {
      id: 2,
      title: 'Operational Setup',
      icon: Settings,
      color: 'yellow',
      steps: [
        {
          id: 4,
          title: 'Create Gigs',
          description: 'Define multi-channel gigs and requirements',
          status: 'pending',
          component: CreateGig
        },
        {
          id: 5,
          title: 'Telephony Setup',
          description: 'Phone numbers, call tracking, and dialer configuration',
          status: 'pending',
          component: TelephonySetup
        },
        {
          id: 6,
          title: 'Upload Contacts',
          description: 'Import contacts for multi-channel engagement',
          status: 'pending',
          component: UploadContacts,
        },
        {
          id: 7,
          title: 'Knowledge Base',
          description: 'Create training materials and FAQs',
          status: 'pending',
          component: KnowledgeBase
        },
        {
          id: 8,
          title: 'Call Script',
          description: 'Define script and conversation flows',
          status: 'pending',
          component: CallScript
        },
        {
          id: 9,
          title: 'Reporting Setup',
          description: 'Configure KPIs and reporting preferences',
          status: 'pending',
          component: ReportingSetup,
          disabled: true
        }
      ]
    },
    {
      id: 3,
      title: 'REPS Engagement',
      icon: Users,
      color: 'green',
      steps: [
        {
          id: 10,
          title: 'Match HARX REPS',
          description: 'Connect with qualified REPS based on requirements',
          status: 'pending',
          component: MatchHarxReps
        },
        {
          id: 11,
          title: 'REP Onboarding',
          description: 'Training, validation, and contract acceptance',
          status: 'pending',
          component: RepOnboarding,
          disabled: true
        },
        // {
        //   id: 12,
        //   title: 'Session Planning',
        //   description: 'Schedule call slots and prioritize leads',
        //   status: 'pending',
        //   component: SessionPlanning,
        //   disabled: true
        // }
      ]
    },
    {
      id: 4,
      title: 'Activation',
      icon: Rocket,
      color: 'red',
      steps: [
        {
          id: 13,
          title: 'Gig Activation',
          description: 'Launch multi-channel operations',
          status: 'pending',
          component: ApprovalPublishing
        }
      ]
    }
  ];

  const getStepIcon = (step: any) => {
    switch (step.id) {
      case 1: return Building2;
      case 2: return Shield;
      case 3: return FileText;
      case 4: return MessageSquare;
      case 5: return Phone;
      case 6: return Upload;
      case 7: return BookOpen;
      case 8: return FileText;
      case 9: return BarChart;
      case 10: return Users;
      case 11: return BookOpen;
      case 12: return Calendar;
      case 13: return Rocket;
      default: return CheckCircle;
    }
  };

  const handleBackToOnboarding = () => {
    setActiveStep(null);
  };

  const handleStepClick = (stepId: number) => {
    const allSteps = phases.flatMap(phase => phase.steps);
    const step = allSteps.find(s => s.id === stepId);
    const currentPhaseSteps = phases[currentPhase - 1].steps;
    
    // Trouver l'index du step cliqué dans la phase courante
    const stepIndex = currentPhaseSteps.findIndex(s => s.id === stepId);
    const previousSteps = currentPhaseSteps.slice(0, stepIndex);
    
    // Vérifier si tous les steps précédents sont complétés
    const allPreviousCompleted = previousSteps.every(s => 
      s.disabled || completedSteps.includes(s.id)
    );
    
    // Redirection spéciale pour Create Gigs
    if (stepId === 4) {
      if (completedSteps.includes(stepId)) {
        setShowGigDetails(true);
      } else if (hasGigs) {
        window.location.href = '/app11';
      } else {
        window.location.href = '/app6';
      }
      return;
    }

    // Redirection spéciale pour Match HARX REPS
    if (stepId === 10) {
      window.location.href = '/app12';
      return;
    }

    // Pour Knowledge Base
    if (stepId === 7) {
      console.log('Knowledge Base step clicked');
      console.log('All previous completed:', allPreviousCompleted);
      console.log('Step completed:', completedSteps.includes(stepId));
      console.log('Knowledge Base URL:', import.meta.env.VITE_KNOWLEDGE_BASE_URL);
      
      if (allPreviousCompleted) {
        const baseUrl = import.meta.env.VITE_KNOWLEDGE_BASE_URL;
        if (completedSteps.includes(stepId)) {
          console.log('Redirecting to review page:', baseUrl);
          window.location.replace(baseUrl);
        } else {
          console.log('Redirecting to upload page:', `${baseUrl}`);
          window.location.replace(`${baseUrl}`);
        }
      }
      return;
    }

    // Pour Call Script
    if (stepId === 8) {
      console.log('Call Script step clicked');
      console.log('All previous completed:', allPreviousCompleted);
      console.log('Step completed:', completedSteps.includes(stepId));
      console.log('Script Generation URL:', import.meta.env.VITE_SCRIPT_GENERATION_BASE_URL);
      
      if (allPreviousCompleted) {
        const baseUrl = import.meta.env.VITE_SCRIPT_GENERATION_BASE_URL;
        console.log('Redirecting to script generation:', baseUrl);
        window.location.replace(baseUrl);
      }
      return;
    }

    // Pour Telephony Setup
    if (stepId === 5) {
      if (allPreviousCompleted) {
        setShowTelephonySetup(true);
      }
      return;
    }

    // Pour Upload Contacts
    if (stepId === 6) {
      if (allPreviousCompleted) {
        setShowUploadContacts(true);
      }
      return;
    }
    
    // Pour les autres steps, vérifier la complétion des étapes précédentes
    if (step?.component && allPreviousCompleted && !step.disabled) {
      setActiveStep(stepId);
    }
  };

  // Find the active step component
  const ActiveStepComponent = activeStep 
    ? phases.flatMap(phase => phase.steps).find(step => step.id === activeStep)?.component 
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Déterminer quel composant afficher
  let activeComponent = null;
  let onBack: () => void = () => {};

  if (showGigDetails) {
    activeComponent = <GigDetails />;
    onBack = () => setShowGigDetails(false);
  } else if (showTelephonySetup) {
    activeComponent = <TelephonySetup />;
    onBack = () => setShowTelephonySetup(false);
  } else if (ActiveStepComponent) {
    activeComponent = <ActiveStepComponent />;
    onBack = handleBackToOnboarding;
  }

  if (activeComponent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
            <span>Back to Onboarding</span>
          </button>
        </div>
        {activeComponent}
      </div>
    );
  }

  // Utiliser displayedPhase au lieu de currentPhase pour afficher les steps
  const displayedPhaseData = phases[displayedPhase - 1];
  if (!displayedPhaseData) {
    return (
      <div className="text-center text-red-600">
        Error: Phase data not found. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Company Onboarding</h1>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Save Progress
        </button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-5 gap-4">
        {phases.map((phase) => {
          const PhaseIcon = phase.icon;
          const isActive = displayedPhase === phase.id;
          const isCompleted = isPhaseCompleted(phase.id);
          const isAccessible = isPhaseAccessible(phase.id);
          
          // Debug pour la Phase 3
          if (phase.id === 3) {
            console.log('Phase 3 Debug:', {
              isActive,
              isCompleted,
              isAccessible,
              currentPhase,
              displayedPhase,
              completedSteps
            });
          }
          
          return (
            <div
              key={phase.id}
              className={`relative rounded-lg p-4 ${
                isActive ? 'bg-indigo-50 border-2 border-indigo-500' :
                isCompleted ? 'bg-green-50 border border-green-500' :
                !isAccessible ? 'bg-gray-50 border border-gray-300' :
                'bg-white border border-gray-200'
              } cursor-pointer`}
              onClick={() => handlePhaseChange(phase.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`rounded-full p-2 ${
                  isActive ? 'bg-indigo-100 text-indigo-600' :
                  isCompleted ? 'bg-green-100 text-green-600' :
                  !isAccessible ? 'bg-gray-200 text-gray-500' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  <PhaseIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Phase {phase.id}</p>
                  <p className="text-xs text-gray-500">{phase.title}</p>
                  {!isAccessible && phase.id > 1 && (
                    <p className="text-xs text-gray-500 mt-1">Complete previous phase first</p>
                  )}
                </div>
              </div>
              {phase.id < 4 && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Phase Details */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Phase {displayedPhaseData.id}: {displayedPhaseData.title}
          </h2>
          <p className="text-sm text-gray-500">
            {isPhaseAccessible(displayedPhaseData.id) 
              ? "Complete the following steps to proceed to the next phase"
              : "Complete all steps in the previous phase to unlock this phase"}
          </p>
        </div>

        <div className="space-y-4">
          {displayedPhaseData.steps.map((step) => {
            const StepIcon = getStepIcon(step);
            const isClickable = !!step.component;
            const isCompleted = completedSteps.includes(step.id);
            const isCurrentStep = !isCompleted && !step.disabled && 
              displayedPhaseData.steps
                .slice(0, displayedPhaseData.steps.findIndex(s => s.id === step.id))
                .every(s => s.disabled || completedSteps.includes(s.id));
            const canAccessStep = isPhaseAccessible(displayedPhaseData.id);

            // Debug pour l'étape 13
            if (step.id === 13) {
              console.log('Step 13 Debug:', {
                isClickable,
                isCompleted,
                isCurrentStep,
                canAccessStep,
                stepDisabled: step.disabled,
                completedSteps,
                displayedPhaseData: displayedPhaseData.id
              });
            }


            return (
              <div
                key={step.id}
                className={`rounded-lg border p-4 ${
                  !canAccessStep ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' :
                  step.disabled ? 'opacity-50 cursor-not-allowed' :
                  isCompleted ? 'border-green-200 bg-green-50' :
                  isCurrentStep ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500' :
                  'border-gray-200 bg-white'
                } ${(isClickable && !step.disabled && canAccessStep) ? 'cursor-pointer hover:border-indigo-300' : ''}`}
                onClick={() => isClickable && !step.disabled && canAccessStep && handleStepClick(step.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`rounded-full p-2 ${
                    !canAccessStep ? 'bg-gray-200 text-gray-400' :
                    step.disabled ? 'bg-gray-200 text-gray-400' :
                    isCompleted ? 'bg-green-100 text-green-600' :
                    isCurrentStep ? 'bg-indigo-100 text-indigo-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">{step.title}</h3>
                      {!canAccessStep ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Locked
                        </span>
                      ) : step.disabled ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Coming Soon
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </span>
                      ) : isCurrentStep ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Current Step
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{step.description}</p>
                    {isClickable && !step.disabled && canAccessStep && (
                      <button 
                        className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={() => handleStartStep(step.id)}
                      >
                        {isCompleted ? 'Review Step' : 'Start Step'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            disabled={displayedPhase === 1}
            onClick={handlePreviousPhase}
          >
            Previous Phase
          </button>
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            disabled={false}
            onClick={handleNextPhase}
          >
            Next Phase
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Need Help?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <MessageSquare className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Chat with Support</span>
          </button>
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <BookOpen className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">View Documentation</span>
          </button>
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <Calendar className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Schedule a Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboarding;