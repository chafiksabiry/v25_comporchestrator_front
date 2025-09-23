import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Phone,
  Globe,
  VolumeX,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Briefcase
  AlertCircle
} from 'lucide-react';
import Cookies from 'js-cookie';

import { phoneNumberService } from '../services/api';
import { requirementService, RequirementDetail } from '../services/requirementService';
import { PurchaseModal } from './PurchaseModal';
import { RequirementFormModal } from './RequirementFormModal';
import type { AvailablePhoneNumber } from '../services/api';

const companyId = Cookies.get('companyId');

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  provider: 'telnyx' | 'twilio';
}

interface TelephonySetupProps {
  onBackToOnboarding?: () => void;
}

const TelephonySetup = ({ onBackToOnboarding }: TelephonySetupProps): JSX.Element => {
  const [provider, setProvider] = useState<'telnyx' | 'twilio'>('twilio');
  const [gigId, setGigId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [cookieError, setCookieError] = useState<string | null>(null);

  // Effet pour lire les cookies au montage du composant et à chaque 2 secondes si non trouvés
  useEffect(() => {
    const readCookies = () => {
      const newGigId = Cookies.get('lastGigId');
      const newCompanyId = Cookies.get('companyId');
      
      console.log('📝 Reading cookies:', { newGigId, newCompanyId });
      
      if (newGigId && newCompanyId) {
        setGigId(newGigId);
        setCompanyId(newCompanyId);
        setCookieError(null);
        return true;
      }
      return false;
    };

    // Première lecture
    if (!readCookies()) {
      console.log('⚠️ Cookies not found on first read, setting up retry interval');
      
      // Si les cookies ne sont pas trouvés, réessayer toutes les 2 secondes
      const interval = setInterval(() => {
        if (readCookies()) {
          console.log('✅ Cookies found on retry');
          clearInterval(interval);
        } else {
          console.log('⚠️ Cookies still not found on retry');
          setCookieError('Required cookies not found. Please refresh the page if this persists.');
        }
      }, 2000);

      // Nettoyer l'intervalle si le composant est démonté
      return () => clearInterval(interval);
    }
  }, []);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [destinationZone, setDestinationZone] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'confirming' | 'requirements' | 'purchasing' | 'success' | 'error'>('idle');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  type Requirement = {
    id: string;
    name: string;
    type: 'document' | 'textual' | 'address';
    description: string;
    example: string;
    acceptance_criteria: {
      max_length?: number;
      min_length?: number;
      time_limit?: string;
      locality_limit?: string;
      acceptable_values?: string[];
    };
  };

  const [countryReq, setCountryReq] = useState<{
    hasRequirements: boolean;
    requirements?: Requirement[];
  }>({ hasRequirements: false });

  const [requirementStatus, setRequirementStatus] = useState<{
    isChecking: boolean;
    hasRequirements: boolean;
    isComplete: boolean;
    error: string | null;
    incompleteRequirements?: { field: string; status: string; rejectionReason?: string }[];
    groupStatus?: string;
    groupId?: string;
    telnyxId?: string;
    validUntil?: string;
    completionPercentage?: number;
    completedRequirements?: RequirementDetail[];
    totalRequirements?: number;
    pendingRequirements?: number;
  }>({
    isChecking: false,
    hasRequirements: false,
    isComplete: false,
    error: null
  });
  const providers = [
    { id: 'twilio' as const, name: 'Twilio', logo: Phone },
    { id: 'telnyx' as const, name: 'Telnyx', logo: Globe }
  ];


  useEffect(() => {
    if (!companyId) {
      console.log('Waiting for company ID...');
      return;
    }

    console.log('🔄 Company ID available, fetching initial data...');
    fetchExistingNumbers();
    fetchDestinationZone();
    checkCompletedSteps();
  }, [companyId]);

  // Rafraîchir les numéros toutes les 30 secondes si il y a des numéros en attente
  useEffect(() => {
    const hasPendingNumbers = phoneNumbers.some(number => number.status === 'pending');
    
    if (hasPendingNumbers) {
      console.log('🔄 Setting up auto-refresh for pending numbers');
      const interval = setInterval(fetchExistingNumbers, 30000);
      return () => clearInterval(interval);
    }
  }, [phoneNumbers]);

  useEffect(() => {
    if (destinationZone && provider) {
      if (provider === 'telnyx') {
        // Vérifier si on a déjà un groupe de requirements dans les cookies
        const savedGroupId = Cookies.get(`telnyxRequirementGroup_${companyId}_${destinationZone}`);
        console.log('📝 Saved requirement group ID:', savedGroupId);

        const loadGroupStatus = async (groupId: string) => {
          try {
            const detailedStatus = await requirementService.getDetailedGroupStatus(groupId);
            console.log('✅ Loaded detailed status for group:', detailedStatus);
            
            const completionPercentage = Math.round(
              (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
            );

            // Obtenir le groupe pour avoir le telnyxId
            if (!companyId || !destinationZone) {
              throw new Error('Company ID and destination zone are required');
            }
            const { group } = await requirementService.getOrCreateGroup(companyId, destinationZone);
            
            setRequirementStatus(prev => ({
              ...prev,
              groupId: groupId,
              telnyxId: group.telnyxId, // Ajouter le telnyxId
              hasRequirements: true,
              isComplete: detailedStatus.isComplete,
              completionPercentage,
              completedRequirements: detailedStatus.completedRequirements,
              totalRequirements: detailedStatus.totalRequirements,
              pendingRequirements: detailedStatus.pendingRequirements
            }));

            // Si tous les requirements sont complétés, activer les boutons
            if (detailedStatus.isComplete) {
              setRequirementStatus(prev => ({
                ...prev,
                isComplete: true,
                hasRequirements: false // Pour cacher le warning
              }));
            }

            return detailedStatus.isComplete;
          } catch (error) {
            console.error('Failed to load group status:', error);
            return false;
          }
        };

        if (savedGroupId) {
          // Vérifier immédiatement le statut détaillé du groupe
          loadGroupStatus(savedGroupId)
            .then(() => {
              // Chercher les numéros après avoir vérifié le statut
              searchAvailableNumbers();
            })
            .catch(error => {
              console.error('Failed to load saved group status:', error);
              // En cas d'erreur, on supprime l'ID sauvegardé et on vérifie les requirements
              Cookies.remove(`telnyxRequirementGroup_${companyId}_${destinationZone}`);
              checkRequirements().then(() => {
                searchAvailableNumbers();
              });
            });
        } else {
          // Si pas de groupe sauvegardé, vérifier les requirements
          checkRequirements().then(() => {
            searchAvailableNumbers();
          });
        }
      } else {
        // Pour les autres providers, chercher directement les numéros
      console.log('🚀 Auto-searching for available numbers with destination zone:', destinationZone);
      searchAvailableNumbers();
      }
    }
  }, [destinationZone, provider]);

  const checkRequirements = async () => {
    if (!companyId || !destinationZone) return;

    try {
      console.log('🔍 Checking requirements for:', { companyId, destinationZone });

      // 1. Check if country has requirements first
      const response = await requirementService.checkCountryRequirements(destinationZone);
      console.log('✅ Country requirements:', response);
      
      // Sauvegarder les requirements pour le modal
      setCountryReq(response);

      // Si pas de requirements, on peut s'arrêter là
      if (!response.hasRequirements) {
        setRequirementStatus({
          isChecking: false,
          hasRequirements: false,
          isComplete: true,
          error: null
        });
        return;
      }

      // 2. Get or create requirement group for this company and country
      // SEULEMENT si le pays a des requirements
      const { group } = await requirementService.getOrCreateGroup(companyId, destinationZone);
      console.log('✅ Requirement group:', group);

      // 3. Get detailed status if group exists
      if (group._id) {
        const detailedStatus = await requirementService.getDetailedGroupStatus(group._id);
        console.log('✅ Detailed status:', detailedStatus);

        // Calculer le pourcentage de complétion
        const completionPercentage = Math.round(
          (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
        );

        // Mettre à jour le status avec les détails
        const newStatus = {
          isChecking: false,
          hasRequirements: true,
          isComplete: detailedStatus.isComplete,
          error: null,
          groupId: group._id,
          telnyxId: group.telnyxId,
          groupStatus: 'pending',
          completionPercentage,
          completedRequirements: detailedStatus.completedRequirements,
          totalRequirements: detailedStatus.totalRequirements,
          pendingRequirements: detailedStatus.pendingRequirements
        };
        setRequirementStatus(newStatus);

        // Si le groupe est complet, on peut activer les boutons d'achat
        if (detailedStatus.isComplete) {
          setRequirementStatus(prev => ({
            ...prev,
            isComplete: true
          }));
        }
      }

      // Stocker l'ID du groupe dans localStorage
      localStorage.setItem(`telnyxRequirementGroup_${companyId}_${destinationZone}`, group._id);
      
      // Stocker aussi dans un cookie pour la persistance cross-domain
      Cookies.set(
        `telnyxRequirementGroup_${companyId}_${destinationZone}`,
        group._id,
        { expires: 30 } // expire dans 30 jours
      );

    } catch (error) {
      console.error('❌ Error checking requirements:', error);
      setRequirementStatus({
        isChecking: false,
        hasRequirements: false,
        isComplete: false,
        error: error instanceof Error ? error.message : 'Failed to check requirements'
      });
    }
  };

  const checkCompletedSteps = async () => {
    try {
      if (!companyId) return;
      
      console.log('🔍 Checking step 5 status for company:', companyId);
      
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
        );
        
        console.log('📡 API response for onboarding:', response.data);
        
        if (response.data && (response.data as any).completedSteps && Array.isArray((response.data as any).completedSteps)) {
          const completedSteps = (response.data as any).completedSteps;
          if (completedSteps.includes(5)) {
            console.log('✅ Step 5 is already completed according to API');
            setCompletedSteps(completedSteps);
            return;
          } else {
            console.log('⚠️ Step 5 is not completed according to API');
          }
        }
      } catch (apiError) {
        console.log('⚠️ Could not fetch onboarding status from API, falling back to localStorage');
      }
      
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps)) {
            console.log('📱 Found completed steps in localStorage:', progress.completedSteps);
            setCompletedSteps(progress.completedSteps);
          }
        } catch (e) {
          console.error('Error parsing stored progress:', e);
        }
      }
      
    } catch (error) {
      console.error('Error checking completed steps:', error);
    }
  };

  const fetchExistingNumbers = async () => {
    try {
      if (!gigId) {
        console.error('❌ No gigId available');
        setPhoneNumbers([]);
        return;
      }

      console.log('📞 Checking numbers for gig:', gigId);
      const result = await phoneNumberService.listPhoneNumbers(gigId);
      console.log('📞 Check result:', result);
      
      // Si un numéro est trouvé, le mettre dans le tableau
      if (result?.hasNumber && result.number) {
        setPhoneNumbers([result.number]);
      } else {
        setPhoneNumbers([]);
      }
    } catch (error) {
      console.error('❌ Error checking gig numbers:', error);
      setPhoneNumbers([]);
    }
  };

  const fetchDestinationZone = async () => {
    try {
      if (!gigId) {
        console.error('Gig ID not found');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${gigId}/destination-zone`);
      const res = await response.json();
      console.log('🌍 Destination zone data from API:', res.data);
      console.log('🌍 Destination zone code:', res.data.code);
      setDestinationZone(res.data.code);
    } catch (error) {
      console.error('Error fetching destination zone:', error);
    }
  };

  const getPhoneNumber = (number: AvailablePhoneNumber): string => {
    return number.phoneNumber || number.phone_number || '';
  };

  const searchAvailableNumbers = async () => {
    if (!destinationZone) {
      console.error('Destination zone not available');
      return;
    }
    
    console.log('🔍 Searching phone numbers with destination zone:', destinationZone);
    console.log('🔍 Using provider:', provider);
    
    try {
      const data = await phoneNumberService.searchPhoneNumbers(destinationZone, provider);
      console.log('📞 Phone numbers found:', data);
      setAvailableNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching numbers:', error);
      setAvailableNumbers([]);
    }
  };

  const purchaseNumber = async (phoneNumber: string) => {
    if (!gigId || !companyId) {
      console.error('❌ Required IDs missing:', { gigId, companyId });
      setPurchaseError('Configuration error: Required IDs not found');
      return;
    }

    try {
      console.log('🛒 Starting purchase process:', {
        phoneNumber,
        provider,
        gigId,
        requirementStatus
      });

      if (provider === 'telnyx') {
        // 1. Vérifier si les requirements sont en cours de vérification
        if (requirementStatus.isChecking) {
          setPurchaseError('Please wait while we check requirements...');
          return;
        }

        // 2. Vérifier s'il y a eu une erreur avec les requirements
        if (requirementStatus.error) {
          setPurchaseError('Cannot proceed: Failed to check requirements');
          return;
        }

        // 3. Vérifier si les requirements sont complétés
        if (requirementStatus.hasRequirements && !requirementStatus.isComplete) {
          setPurchaseError('Please complete the requirements before purchasing');
          return;
        }

        // 4. Vérifier si nous avons l'ID du groupe de requirements
        if (!requirementStatus.groupId) {
          setPurchaseError('Missing requirement group ID. Please try again.');
          return;
        }
      }

      setPurchaseError(null);
      setPurchaseStatus('purchasing');
      
      // Préparer les données pour l'achat
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const purchaseData = {
        phoneNumber,
        provider,
        gigId,
        companyId,
        requirementGroupId: provider === 'telnyx' ? requirementStatus.telnyxId : undefined
      };

      console.log('📝 Purchase request data:', purchaseData);
      
      const response = await phoneNumberService.purchasePhoneNumber(purchaseData);
      console.log('📞 Purchase response:', response);

      console.log('✅ Number purchased successfully!');
      setAvailableNumbers(prev => prev.filter(num => getPhoneNumber(num) !== phoneNumber));
      fetchExistingNumbers();
      setPurchaseStatus('success');
      
    } catch (error) {
      console.error('❌ Error purchasing number:', error);
      setPurchaseStatus('error');
      setPurchaseError(error instanceof Error ? error.message : 'Failed to purchase number');
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      if (!companyId) {
        console.error('Company ID not found in cookies');
        throw new Error('Company ID not found. Please refresh the page and try again.');
      }

      // Vérifier qu'un gig est sélectionné
      if (!selectedGigId) {
        alert('⚠️ Please select a gig before saving the configuration.');
        return;
      }

      console.log('🚀 Completing telephony setup...');
      
      try {
        const onboardingResponse = await axios.get(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
        );
        
        const currentCompletedSteps = (onboardingResponse.data as any)?.completedSteps || [];
        const newCompletedSteps = currentCompletedSteps.includes(5) ? currentCompletedSteps : [...currentCompletedSteps, 5];
        
        const updateResponse = await axios.put(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`,
          { 
            completedSteps: newCompletedSteps,
            currentPhase: 2
          }
        );
        
        console.log('✅ Telephony setup step 5 marked as completed via general onboarding:', updateResponse.data);
        
      } catch (apiError) {
        console.log('⚠️ Could not update via general onboarding API, trying individual step endpoint...');
        
        try {
          const response = await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`,
            { status: 'completed' }
          );
          console.log('✅ Telephony setup step 5 marked as completed via individual endpoint:', response.data);
        } catch (stepError) {
          console.log('⚠️ Individual step endpoint also failed, proceeding with localStorage only');
        }
      }
      
      setCompletedSteps((prev: number[]) => {
        const newCompletedSteps = prev.includes(5) ? prev : [...prev, 5];
      
        const currentProgress = {
          currentPhase: 2,
          completedSteps: newCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
        
        return newCompletedSteps;
      });
      
      Cookies.set('telephonyStepCompleted', 'true', { expires: 7 });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (onBackToOnboarding) {
        setTimeout(() => {
          onBackToOnboarding();
        }, 100);
      } else {
        if (window.history && window.history.pushState) {
          window.history.pushState({}, '', '/app11');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          window.dispatchEvent(new CustomEvent('telephonySetupCompleted', { 
            detail: { stepId: 5, status: 'completed' } 
          }));
        }
      }
      
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      if (error instanceof Error) {
        console.log(`Error: ${error.message}`);
      } else {
        console.log('An error occurred while saving the configuration. Please try again.');
      }
    }
  };

  const handleSubmitRequirements = async (values: Record<string, any>) => {
    try {
      console.log('📝 Submitting requirements:', values);
      
      // 1. Utiliser le groupe existant ou en créer un nouveau
      if (!companyId) throw new Error('Company ID is required');
      
      let groupId = requirementStatus.groupId;
      
      if (!groupId) {
      const { group } = await requirementService.getOrCreateGroup(companyId, destinationZone);
        groupId = group._id;
        console.log('✅ Created new requirement group:', group);
      } else {
        console.log('✅ Using existing requirement group:', groupId);
      }

      // 2. Soumettre chaque requirement
      for (const [field, value] of Object.entries(values)) {
        if (value instanceof File) {
          await requirementService.submitDocument(groupId, field, value);
        } else {
          await requirementService.submitTextValue(groupId, field, value as string);
        }
      }

      // 3. Valider les requirements
      const validation = await requirementService.validateRequirements(groupId);
      console.log('✅ Validation result:', validation);

      if (validation.isValid) {
        setRequirementStatus(prev => ({
          ...prev,
          isComplete: true
        }));
        setPurchaseStatus('confirming');
      } else {
        throw new Error('Some requirements are still missing or invalid');
      }
    } catch (error) {
      console.error('❌ Error submitting requirements:', error);
      setPurchaseError(error instanceof Error ? error.message : 'Failed to submit requirements');
      setPurchaseStatus('error');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedNumber) return;
    setPurchaseStatus('purchasing');
    try {
      await purchaseNumber(selectedNumber);
      setPurchaseStatus('success');
      setTimeout(() => {
        setShowPurchaseModal(false);
        setPurchaseStatus('idle');
        setSelectedNumber(null);
      }, 2000);
    } catch (error) {
      setPurchaseStatus('error');
      setPurchaseError(error instanceof Error ? error.message : 'Failed to purchase number');
    }
  };

  return (
    <div className="space-y-6">
      {cookieError && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Configuration Error</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{cookieError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-900">Telephony Setup</h2>
            {completedSteps.includes(5) && (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-500">Configure your call center infrastructure</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              completedSteps.includes(5)
                ? 'bg-green-600 text-white cursor-not-allowed'
                : !selectedGigId
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
            }`}
            onClick={completedSteps.includes(5) || !selectedGigId ? undefined : handleSaveConfiguration}
            disabled={completedSteps.includes(5) || !selectedGigId}
            title={!selectedGigId ? 'Please select a gig first' : ''}
          >
            {completedSteps.includes(5) ? (
              <span className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Configuration Saved
              </span>
            ) : !selectedGigId ? (
              <span className="flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                Select Gig First
              </span>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>

      {/* Gig Selection */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-6 shadow-lg border border-blue-200">
        <div className="flex items-center space-x-3 mb-2">
          <div className="flex-shrink-0">
            <div className="rounded-full bg-blue-500 p-2">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-semibold text-blue-900">Select Gig</h3>
              <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Required
              </span>
            </div>
            <p className="mt-1 text-sm text-blue-700">Choose the gig for which you want to configure telephony <span className="text-blue-600 font-medium">*</span></p>
          </div>
        </div>
        
        {isLoadingGigs ? (
          <div className="mt-6 flex items-center justify-center space-x-3 p-4 rounded-lg bg-white/50 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
            <span className="text-sm font-medium text-blue-700">Loading gigs...</span>
          </div>
        ) : gigs.length > 0 ? (
          <div className="mt-6">
            <div className="relative gig-dropdown">
              {/* Custom Dropdown */}
              <button
                type="button"
                className={`relative w-full rounded-xl border-2 py-4 pl-5 pr-12 text-left text-base font-medium transition-all duration-300 shadow-md ${
                  selectedGigId 
                    ? 'border-blue-400 bg-blue-50 text-blue-900 focus:border-blue-500 focus:ring-blue-500 shadow-blue-200/50' 
                    : 'border-blue-200 bg-white text-blue-800 focus:border-blue-400 focus:ring-blue-400 hover:border-blue-300'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="flex items-center">
                  {selectedGigId ? (
                    (() => {
                      const selectedGig = gigs.find(g => g._id === selectedGigId);
                      return selectedGig ? (
                        <>
                           {selectedGig.title} - {selectedGig.destination_zone.name.common}
                          <img 
                            src={selectedGig.destination_zone.flags?.png} 
                            alt={selectedGig.destination_zone.flags?.alt}
                            className="inline-block w-6 h-4 ml-2 rounded-sm border border-gray-200 object-cover"
                          />
                        </>
                      ) : 'Select a gig...';
                    })()
                  ) : (
                    '🎯 Select a gig (required)...'
                  )}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <ChevronDown className={`h-5 w-5 text-blue-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border-2 border-blue-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {gigs.map((gig: Gig) => (
                    <button
                      key={gig._id}
                      type="button"
                      className="relative w-full px-5 py-4 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl"
                      onClick={() => {
                        setSelectedGigId(gig._id);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <span className="text-blue-800 font-medium">
                          📋 {gig.title} - {gig.destination_zone.name.common}
                        </span>
                        <img 
                          src={gig.destination_zone.flags?.png} 
                          alt={gig.destination_zone.flags?.alt}
                          className="inline-block w-6 h-4 ml-2 rounded-sm border border-gray-200 object-cover"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedGigId && (
                <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none">
                  <CheckCircle className="h-6 w-6 text-blue-500 drop-shadow-sm" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-2 border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-blue-100 p-2">
                  <AlertCircle className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">No Gigs Found</h3>
                <p className="text-sm text-blue-700 leading-relaxed">No gigs were found for this company. Please create a gig first before configuring telephony.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provider Selection */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Select Provider</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {providers.map((p) => {
            const Logo = p.logo;
            return (
              <button
                key={p.id}
                className={`flex items-center justify-center rounded-lg border p-4 ${
                  provider === p.id 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setProvider(p.id)}
              >
                <Logo className="mr-2 h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-900">{p.name}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Phone Numbers */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Phone Numbers</h3>
          {destinationZone && selectedGigId && (() => {
            const selectedGig = gigs.find((g: Gig) => g._id === selectedGigId);
            return selectedGig ? (
              <span className="text-sm text-gray-600">
                Destination Zone: <span className="font-medium">{selectedGig.destination_zone.name.common}</span>
              </span>
            ) : null;
          })()}
        </div>


        {/* Requirements Warning for Telnyx Numbers */}
        {provider === 'telnyx' && requirementStatus.hasRequirements && !requirementStatus.isComplete && (
          <div className="mb-4 rounded-lg bg-yellow-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3 flex-grow">
                <h3 className="text-sm font-medium text-yellow-800">Requirements Needed</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>To purchase numbers in {destinationZone}, you need to complete all required information.</p>
                  
                  {/* Progress bar */}
                  {requirementStatus.completionPercentage !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-yellow-800">
                          Progress: {requirementStatus.completionPercentage}%
                        </span>
                        <span className="text-xs font-medium text-yellow-800">
                          {requirementStatus.completedRequirements?.length || 0} / {requirementStatus.totalRequirements || 0}
                        </span>
                      </div>
                      <div className="w-full bg-yellow-200 rounded-full h-2">
                        <div
                          className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${requirementStatus.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowRequirementModal(true)}
                    className="mt-3 inline-flex items-center rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                  >
                    {requirementStatus.completedRequirements?.length ? 'Continue Requirements' : 'Start Requirements'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Purchased Numbers Section - Visible for Telnyx only when requirements are met */}
      {provider === 'telnyx' ? (
        // Pour Telnyx, vérifier si les requirements sont satisfaits
        (!requirementStatus.hasRequirements || requirementStatus.isComplete) && (
          <div className="mb-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Purchased Telnyx Numbers</h4>
            <div className="grid gap-2">
              {Array.isArray(phoneNumbers) && phoneNumbers.filter(number => number.provider === 'telnyx').length > 0 ? (
                phoneNumbers
                  .filter(number => number.provider === 'telnyx')
                  .map((number) => (
                    <div 
                      key={number.phoneNumber}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{number.phoneNumber}</span>
                        <span className="text-sm text-gray-500">
                          Status: {number.status}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          number.status === 'active' ? 'bg-green-100 text-green-800' :
                          number.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {number.status}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="rounded-lg border border-gray-200 p-4 text-center text-gray-500">
                  No Telnyx numbers purchased yet
                </div>
              )}
            </div>
          </div>
        )
      ) : provider === 'twilio' && (
        // Pour Twilio, toujours afficher
        <div className="mb-6 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Purchased Twilio Numbers</h4>
          <div className="grid gap-2">
            {Array.isArray(phoneNumbers) && phoneNumbers.filter(number => number.provider === 'twilio').length > 0 ? (
              phoneNumbers
                .filter(number => number.provider === 'twilio')
                .map((number) => (
                  <div 
                    key={number.phoneNumber}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{number.phoneNumber}</span>
                      <span className="text-sm text-gray-500">
                        Status: {number.status}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        number.status === 'active' ? 'bg-green-100 text-green-800' :
                        number.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {number.status}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-lg border border-gray-200 p-4 text-center text-gray-500">
                No Twilio numbers purchased yet
              </div>
            )}
          </div>
        </div>
      )}

        {/* Available Numbers List - Auto-displayed */}
        {Array.isArray(availableNumbers) && availableNumbers.length > 0 ? (
          <div className="mb-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Available Numbers (Destination: {destinationZone})</h4>
            <div className="grid gap-2">
              {availableNumbers.map((number) => {
                const phoneNumber = getPhoneNumber(number);
                return (
                  <div 
                    key={phoneNumber}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{phoneNumber}</span>
                      {number.locality && (
                        <span className="text-sm text-gray-500">
                          {number.locality}, {number.region}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedNumber(phoneNumber);
                        setPurchaseStatus('confirming');
                        setShowPurchaseModal(true);
                      }}
                      disabled={provider === 'telnyx' && requirementStatus.hasRequirements}
                      className={`rounded-md px-3 py-1 text-sm text-white ${
                        provider === 'telnyx' && requirementStatus.hasRequirements
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      title={
                        provider === 'telnyx' && requirementStatus.hasRequirements
                          ? 'Please complete the requirements before purchasing'
                          : undefined
                      }
                    >
                      Purchase
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : destinationZone && availableNumbers.length === 0 && (
          <div className="mb-6 rounded-lg bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">No Numbers Available</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>No phone numbers are available for <strong>{(() => {
                    const selectedGig = gigs.find((g: Gig) => g._id === selectedGigId);
                    return selectedGig ? selectedGig.destination_zone.name.common : destinationZone;
                  })()}</strong> with provider <strong>{provider}</strong>.</p>
                  <p className="mt-1">
                    {provider === 'twilio' && "Twilio a une erreur serveur (500). "}
                    {provider === 'telnyx' && "Telnyx ne semble pas avoir de numéros pour ce pays. "}
                    Essayez un autre provider ou contactez le support.
                  </p>
                </div>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => {
                      setProvider('twilio');
                      searchAvailableNumbers();
                    }}
                    className={`rounded-md px-3 py-1 text-xs text-white ${
                      provider === 'twilio' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {provider === 'twilio' ? '⚠️ Twilio (Error)' : 'Try Twilio'}
                  </button>
                  <button
                    onClick={() => {
                      setProvider('telnyx');
                      searchAvailableNumbers();
                    }}
                    className={`rounded-md px-3 py-1 text-xs text-white ${
                      provider === 'telnyx' 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {provider === 'telnyx' ? '⚠️ Telnyx (Empty)' : 'Try Telnyx'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={async () => {
          // Re-fetch available numbers if we were using Telnyx
          if (provider === 'telnyx') {
            await searchAvailableNumbers();
          }
          setShowPurchaseModal(false);
          setPurchaseStatus('idle');
          setSelectedNumber(null);
        }}
        purchaseStatus={purchaseStatus}
        selectedNumber={selectedNumber}
        countryReq={countryReq}
        requirementStatus={requirementStatus}
        provider={provider}
        purchaseError={purchaseError}
        onSubmitRequirements={handleSubmitRequirements}
        onConfirmPurchase={handleConfirmPurchase}
        onSetPurchaseStatus={setPurchaseStatus}
        onSetSelectedNumber={setSelectedNumber}
        onSetShowPurchaseModal={setShowPurchaseModal}
      />

      {/* Requirements Modal */}
      <RequirementFormModal
        isOpen={showRequirementModal}
        onClose={async () => {
          // Récupérer le statut détaillé avant de fermer
          if (requirementStatus.groupId) {
            try {
              const detailedStatus = await requirementService.getDetailedGroupStatus(requirementStatus.groupId);
              console.log('✅ Detailed status on close:', detailedStatus);
              
              const completionPercentage = Math.round(
                (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
              );

              // Mettre à jour le statut avec les détails
              const newStatus = {
                ...requirementStatus,
                isComplete: detailedStatus.isComplete,
                completionPercentage,
                completedRequirements: detailedStatus.completedRequirements,
                totalRequirements: detailedStatus.totalRequirements,
                pendingRequirements: detailedStatus.pendingRequirements
              };

              // Si tout est complété, désactiver le warning et activer les boutons
              if (detailedStatus.isComplete) {
                newStatus.hasRequirements = false;
              }

              console.log('🔄 Setting new status:', newStatus);
              setRequirementStatus(newStatus);
            } catch (error) {
              console.error('Error updating status on close:', error);
            }
          }
          setShowRequirementModal(false);
        }}
        countryCode={destinationZone}
        requirements={countryReq.requirements || []}
        existingValues={requirementStatus.completedRequirements?.map(req => ({
          field: req.id,
          value: JSON.stringify(req.value),
          status: req.status,
          submittedAt: req.submittedAt
        }))}
        requirementGroupId={requirementStatus.groupId}
        onSubmit={async (values) => {
          try {
            await handleSubmitRequirements(values);
            // Récupérer le statut détaillé immédiatement
            if (requirementStatus.groupId) {
              const detailedStatus = await requirementService.getDetailedGroupStatus(requirementStatus.groupId);
              const completionPercentage = Math.round(
                (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
              );

              // Mettre à jour le statut avec les détails
              const newStatus = {
                ...requirementStatus,
                isComplete: detailedStatus.isComplete,
                completionPercentage,
                completedRequirements: detailedStatus.completedRequirements,
                totalRequirements: detailedStatus.totalRequirements,
                pendingRequirements: detailedStatus.pendingRequirements
              };

              // Si tout est complété, désactiver le warning et activer les boutons
              if (detailedStatus.isComplete) {
                newStatus.hasRequirements = false;
              }

              console.log('🔄 Setting new status after submit:', newStatus);
              setRequirementStatus(newStatus);
            }
            setShowRequirementModal(false);
          } catch (error) {
            console.error('Error submitting requirements:', error);
          }
        }}
      />
    </div>
  );
};

export default TelephonySetup;
