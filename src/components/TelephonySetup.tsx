import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Phone,
  Globe,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Briefcase
} from 'lucide-react';
import Cookies from 'js-cookie';

import { phoneNumberService } from '../services/api';
import { requirementService, RequirementDetail } from '../services/requirementService';
import { PurchaseModal } from './PurchaseModal';
import { RequirementFormModal } from './RequirementFormModal';
import type { AvailablePhoneNumber } from '../services/api';

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  provider: 'telnyx' | 'twilio';
  success?: boolean;
  error?: string;
  message?: string;
  data?: {
    phoneNumber: string;
    status: string;
    features: any;
    provider: string;
  };
}

interface Gig {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  destination_zone: {
    _id: string;
    name: {
      common: string;
      official: string;
    };
    flags: {
      png: string;
      svg: string;
      alt: string;
    };
    cca2: string;
  };
  documentation: {
    product: any[];
    process: any[];
    training: any[];
  };
  team: {
    size: string | number;
    structure: Array<{
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: string;
      };
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

const TelephonySetup = (): JSX.Element => {
  const [provider, setProvider] = useState<'telnyx' | 'twilio'>('twilio');
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [cookieError, setCookieError] = useState<string | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Effet pour lire le companyId depuis les cookies
  useEffect(() => {
    const readCookies = () => {
      const newCompanyId = Cookies.get('companyId');

      console.log('📝 Reading companyId cookie:', newCompanyId);

      if (newCompanyId) {
        setCompanyId(newCompanyId);
        setCookieError(null);
        return true;
      }
      return false;
    };

    // Première lecture
    if (!readCookies()) {
      console.log('⚠️ CompanyId cookie not found on first read, setting up retry interval');

      // Si le cookie n'est pas trouvé, réessayer toutes les 2 secondes
      const interval = setInterval(() => {
        if (readCookies()) {
          console.log('✅ CompanyId cookie found on retry');
          clearInterval(interval);
        } else {
          console.log('⚠️ CompanyId cookie still not found on retry');
          setCookieError('Required company ID not found. Please refresh the page if this persists.');
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
  const [purchaseResponse, setPurchaseResponse] = useState<{
    phoneNumber: string;
    status: string;
    features: any;
    provider: string;
  } | null>(null);
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

  // Logic for multi-number support
  const selectedGig = gigs.find(g => g._id === selectedGigId);
  const teamSize = selectedGig ? parseInt(selectedGig.team?.size?.toString() || '1') : 1;
  const purchasedNumbersCount = phoneNumbers.length;
  const isQuotaReached = purchasedNumbersCount >= teamSize;


  useEffect(() => {
    if (!companyId) {
      console.log('Waiting for company ID...');
      return;
    }

    console.log('🔄 Company ID available, fetching initial data...');
    fetchGigs();
    checkCompletedSteps();
  }, [companyId]);

  // Effet pour récupérer les numéros existants quand un gig est sélectionné
  useEffect(() => {
    if (selectedGigId) {
      console.log('🔄 Selected gig changed, fetching existing numbers...');
      fetchExistingNumbers();
    }
  }, [selectedGigId]);

  // Mettre à jour la destination zone quand un gig est sélectionné
  useEffect(() => {
    if (selectedGigId && gigs.length > 0) {
      const selectedGig = gigs.find((gig: Gig) => gig._id === selectedGigId);
      if (selectedGig && selectedGig.destination_zone && selectedGig.destination_zone.cca2) {
        console.log('🌍 Setting destination zone from selected gig:', selectedGig.destination_zone.cca2);
        setDestinationZone(selectedGig.destination_zone.cca2);
      }
    } else {
      setDestinationZone('');
    }
  }, [selectedGigId, gigs]);

  // Rafraîchir les numéros toutes les 30 secondes si il y a des numéros en attente
  useEffect(() => {
    const hasPendingNumbers = phoneNumbers.some((number: PhoneNumber) => number.status === 'pending');

    if (hasPendingNumbers) {
      console.log('🔄 Setting up auto-refresh for pending numbers');
      const interval = setInterval(fetchExistingNumbers, 30000);
      return () => clearInterval(interval);
    }
  }, [phoneNumbers]);

  /* New state for Twilio SIDs */
  const [twilioRegulatorySids, setTwilioRegulatorySids] = useState<{ bundleSid?: string; addressSid?: string }>({
    addressSid: 'AD455d66025589029af3156837713cd5c7' // Provided by user
  });

  const checkGigPhoneNumber = async (zoneOverride?: string) => {
    if (!selectedGigId) return false;

    // Resolve zone avoiding react state race conditions
    const selectedGig = gigs.find(g => g._id === selectedGigId);
    const zone = zoneOverride || selectedGig?.destination_zone?.cca2;

    try {
      console.log('🔍 Checking if gig has a phone number:', selectedGigId);
      const result = await phoneNumberService.listPhoneNumbers(selectedGigId);

      if (result?.hasNumber && result.numbers && result.numbers.length > 0) {
        // Case 1.1: Gig already has number(s)
        console.log('✅ Found existing numbers for gig');
        setPhoneNumbers(result.numbers);
        setRequirementStatus({
          isChecking: false,
          hasRequirements: false,
          isComplete: true,
          error: null
        });
        // We still want to search available numbers to buy more as long as quota isn't reached
        if (provider === 'telnyx' || provider === 'twilio') {
          searchAvailableNumbers(zone);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking gig numbers:', error);
      return false;
    }
  };

  const handleTwilioProvider = async (zoneOverride?: string) => {
    if (!selectedGigId || !companyId) return;

    const hasNumber = await checkGigPhoneNumber();
    if (hasNumber) return;

    const selectedGig = gigs.find(g => g._id === selectedGigId);
    if (!selectedGig?.destination_zone?.cca2) {
      console.error('No destination zone found for gig');
      return;
    }

    const destZone = zoneOverride || selectedGig.destination_zone.cca2;
    setDestinationZone(destZone);

    // Search available numbers
    searchAvailableNumbers(destZone);

    try {
      setRequirementStatus((prev: any) => ({ ...prev, isChecking: true }));
      const response = await phoneNumberService.getTwilioRequirements(destZone);

      console.log('Twilio Requirements:', response);

      if (response && response.requirements) {
        // Map Twilio requirements to frontend structure
        const mappedRequirements: Requirement[] = [];

        // Add End User requirement if type is present
        if (response.endUserType) {
          mappedRequirements.push({
            id: 'end_user',
            name: `${response.endUserType} Information`,
            type: 'textual',
            description: `Please provide details for ${response.endUserType}`,
            example: 'Business Name / Individual Name',
            acceptance_criteria: {}
          });
        }

        // Add Document requirements
        // Note: Twilio requirements array logic is simplified here. 
        // In reality, we traverse the graph. For now, assuming direct document requirements.
        if (Array.isArray(response.requirements)) {
          response.requirements.forEach((req: any, index: number) => {
            mappedRequirements.push({
              id: req.sid || `doc_${index}`,
              name: req.friendlyName || req.name || 'Supporting Document',
              type: 'document',
              description: req.description || 'Upload required document',
              example: 'Passport, Utility Bill',
              acceptance_criteria: {}
            });
          });
        }

        setCountryReq({
          hasRequirements: mappedRequirements.length > 0,
          requirements: mappedRequirements
        });

        setRequirementStatus({
          isChecking: false,
          hasRequirements: mappedRequirements.length > 0,
          isComplete: false, // Assume false initially
          error: null,
          // Store regulationSid in groupId for convenience
          groupId: response.regulationSid,
          totalRequirements: mappedRequirements.length,
          pendingRequirements: mappedRequirements.length,
          completedRequirements: []
        });
      } else {
        setRequirementStatus({
          isChecking: false,
          hasRequirements: false,
          isComplete: true,
          error: null
        });
      }

    } catch (error) {
      console.error('Error fetching Twilio requirements:', error);
      setRequirementStatus((prev: any) => ({ ...prev, isChecking: false, error: 'Failed to fetch requirements' }));
    }
  };

  const handleTelnyxProvider = async (zoneOverride?: string) => {
    if (!selectedGigId || !companyId) return;

    // First check if gig has a number
    const hasNumber = await checkGigPhoneNumber();
    if (hasNumber) return; // Case 1.1 handled in checkGigPhoneNumber (including searching available numbers)

    // Case 1.2: No number, first check if there are available numbers
    const selectedGig = gigs.find(g => g._id === selectedGigId);
    if (!selectedGig?.destination_zone?.cca2) {
      console.error('No destination zone found for gig');
      return;
    }

    const destZone = zoneOverride || selectedGig.destination_zone.cca2;
    setDestinationZone(destZone); // Set destination zone for number search

    // Check for available numbers first
    try {
      const numbers = await phoneNumberService.searchPhoneNumbers(destZone, 'telnyx');
      setAvailableNumbers(Array.isArray(numbers) ? numbers : []);

      // If no numbers available, don't proceed with requirements
      if (!Array.isArray(numbers) || numbers.length === 0) {
        console.log('No available numbers for this destination zone, skipping requirements check');
        setRequirementStatus({
          isChecking: false,
          hasRequirements: false,
          isComplete: false,
          error: null
        });
        return;
      }
    } catch (error) {
      console.error('Error checking available numbers:', error);
      // Even if we fail to check numbers, continue with requirements check
      // as this might be a temporary API issue
    }

    const savedGroupId = Cookies.get(`telnyxRequirementGroup_${companyId}_${destZone}`);

    if (savedGroupId) {
      // Case 1.2.1 or 1.2.3: Has existing requirement group
      try {
        // Get the existing group first
        const { group } = await requirementService.getOrCreateGroup(companyId, destZone);

        // Then get the status with a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        const detailedStatus = await requirementService.getDetailedGroupStatus(savedGroupId);

        const completionPercentage = Math.round(
          (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
        );

        if (detailedStatus.isComplete) {
          // Case 1.2.3: Requirements completed, no number yet
          setRequirementStatus({
            isChecking: false,
            hasRequirements: false,
            isComplete: true,
            error: null,
            groupId: savedGroupId,
            telnyxId: group.telnyxId,
            completionPercentage: 100,
            completedRequirements: detailedStatus.completedRequirements,
            totalRequirements: detailedStatus.totalRequirements,
            pendingRequirements: 0
          });
        } else {
          // Case 1.2.1: Incomplete requirements
          setRequirementStatus({
            isChecking: false,
            hasRequirements: true,
            isComplete: false,
            error: null,
            groupId: savedGroupId,
            telnyxId: group.telnyxId,
            completionPercentage,
            completedRequirements: detailedStatus.completedRequirements,
            totalRequirements: detailedStatus.totalRequirements,
            pendingRequirements: detailedStatus.pendingRequirements
          });
        }
        // Always search for available numbers
        searchAvailableNumbers();
      } catch (error) {
        console.error('Failed to load requirement group:', error);
        Cookies.remove(`telnyxRequirementGroup_${companyId}_${destZone}`);
        handleTelnyxProvider(); // Retry without saved group
      }
    } else {
      // Case 1.2.2: Check for existing group first, even without cookie
      try {
        // First check if country has requirements
        const response = await requirementService.checkCountryRequirements(destZone);
        setCountryReq(response);

        if (response.hasRequirements) {
          // Try to get existing group or create new one
          const { group, isNew } = await requirementService.getOrCreateGroup(companyId, destZone);

          if (isNew) {
            // New group created
            setRequirementStatus({
              isChecking: false,
              hasRequirements: true,
              isComplete: false,
              error: null,
              groupId: group._id,
              telnyxId: group.telnyxId,
              completionPercentage: 0,
              completedRequirements: [],
              totalRequirements: response.requirements?.length || 0,
              pendingRequirements: response.requirements?.length || 0
            });
          } else {
            // Existing group found, get its status
            const detailedStatus = await requirementService.getDetailedGroupStatus(group._id);
            const completionPercentage = Math.round(
              (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
            );

            setRequirementStatus({
              isChecking: false,
              hasRequirements: true,
              isComplete: detailedStatus.isComplete,
              error: null,
              groupId: group._id,
              telnyxId: group.telnyxId,
              completionPercentage,
              completedRequirements: detailedStatus.completedRequirements,
              totalRequirements: detailedStatus.totalRequirements,
              pendingRequirements: detailedStatus.pendingRequirements
            });
          }

          // Save group ID in cookie
          Cookies.set(
            `telnyxRequirementGroup_${companyId}_${destZone}`,
            group._id,
            { expires: 30 }
          );
        } else {
          // No requirements needed
          setRequirementStatus({
            isChecking: false,
            hasRequirements: false,
            isComplete: true,
            error: null
          });
        }
        // Always search for available numbers
        searchAvailableNumbers();
      } catch (error) {
        console.error('Failed to check country requirements:', error);
        setRequirementStatus({
          isChecking: false,
          hasRequirements: false,
          isComplete: false,
          error: 'Failed to check requirements'
        });
      }
    }
  };

  // Effect for provider changes
  useEffect(() => {
    // Reset states when provider changes
    setRequirementStatus({
      isChecking: false,
      hasRequirements: false,
      isComplete: false,
      error: null
    });
    setAvailableNumbers([]);
    setPurchaseError(null);
    setPurchaseStatus('idle');
    setSelectedNumber(null);
    setShowPurchaseModal(false);
    setShowRequirementModal(false);

    // Only proceed if we have necessary data
    if (!selectedGigId || !companyId) return;

    // Get destination zone from selected gig to avoid race condition
    const selectedGig = gigs.find((gig: Gig) => gig._id === selectedGigId);
    const zone = selectedGig?.destination_zone?.cca2;

    if (provider === 'telnyx') {
      handleTelnyxProvider(zone);
    } else if (provider === 'twilio') {
      handleTwilioProvider(zone);
    } else {
      // For other providers, just check for existing numbers and search available ones
      checkGigPhoneNumber();
      if (zone) {
        searchAvailableNumbers(zone);
      }
    }
  }, [provider]);

  // Effect for gig changes
  useEffect(() => {
    if (!selectedGigId || !companyId) return;

    // Reset states when gig changes
    setAvailableNumbers([]);
    setPurchaseError(null);
    setPurchaseStatus('idle');
    setSelectedNumber(null);
    setShowPurchaseModal(false);
    setShowRequirementModal(false);

    // Get destination zone from selected gig to avoid race condition
    const selectedGig = gigs.find((gig: Gig) => gig._id === selectedGigId);
    const zone = selectedGig?.destination_zone?.cca2;

    if (provider === 'telnyx') {
      handleTelnyxProvider(zone);
    } else if (provider === 'twilio') {
      handleTwilioProvider(zone);
    } else {
      // For other providers, just check for existing numbers and search available ones
      checkGigPhoneNumber();
      if (zone) {
        searchAvailableNumbers(zone);
      }
    }
  }, [selectedGigId]);


  const checkCompletedSteps = async () => {
    try {
      if (!companyId) return;

      console.log('🔍 Checking step 4 status for company:', companyId);

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
        );

        console.log('📡 API response for onboarding:', response.data);

        if (response.data && (response.data as any).completedSteps && Array.isArray((response.data as any).completedSteps)) {
          const completedSteps = (response.data as any).completedSteps;
          if (completedSteps.includes(4)) {
            console.log('✅ Step 4 is already completed according to API');
            setCompletedSteps(completedSteps);
            return;
          } else {
            console.log('⚠️ Step 4 is not completed according to API');
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

  const fetchGigs = async () => {
    if (!companyId) return;

    try {
      setIsLoadingGigs(true);
      console.log('🔍 Fetching gigs for company:', companyId);

      const response = await axios.get(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`);
      console.log('✅ Gigs response:', response.data);

      const responseData = response.data as { data: Gig[] };
      if (responseData && Array.isArray(responseData.data)) {
        setGigs(responseData.data);
        console.log('📋 Loaded gigs:', responseData.data.length);
      } else {
        setGigs([]);
        console.log('⚠️ No gigs found in response');
      }
    } catch (error) {
      console.error('❌ Error fetching gigs:', error);
      setGigs([]);
    } finally {
      setIsLoadingGigs(false);
    }
  };

  const fetchExistingNumbers = async () => {
    try {
      if (!selectedGigId) {
        console.error('❌ No selectedGigId available');
        setPhoneNumbers([]);
        return;
      }

      console.log('📞 Checking numbers for gig:', selectedGigId);
      const result = await phoneNumberService.listPhoneNumbers(selectedGigId);
      console.log('📞 Check result:', result);

      // Met à jour la liste des numéros (supporte maintenant plusieurs numéros s'ils existent)
      if (result?.hasNumber && result.numbers && Array.isArray(result.numbers)) {
        setPhoneNumbers(result.numbers);
      } else {
        setPhoneNumbers([]);
      }
    } catch (error) {
      console.error('❌ Error checking gig numbers:', error);
      setPhoneNumbers([]);
    }
  };


  const getPhoneNumber = (number: AvailablePhoneNumber): string => {
    return number.phoneNumber || number.phone_number || '';
  };

  const searchAvailableNumbers = async (zoneOverride?: string) => {
    const zone = zoneOverride || destinationZone;
    if (!zone) {
      console.error('Destination zone not available');
      return;
    }

    console.log('🔍 Searching phone numbers with destination zone:', zone);
    console.log('🔍 Using provider:', provider);

    try {
      const data = await phoneNumberService.searchPhoneNumbers(zone, provider);
      console.log('📞 Phone numbers found:', data);
      setAvailableNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching numbers:', error);
      setAvailableNumbers([]);
    }
  };

  const purchaseNumber = async (phoneNumber: string, options?: { bundleSid?: string; addressSid?: string }) => {
    if (!selectedGigId || !companyId) {
      console.error('❌ Required IDs missing:', { selectedGigId, companyId });
      setPurchaseError('Configuration error: Required IDs not found');
      setPurchaseStatus('error');
      return;
    }

    try {
      console.log('🚀 PURE DEBUG - twilioRegulatorySids current state:', twilioRegulatorySids);
      console.log('🛒 Starting purchase process:', {
        phoneNumber,
        provider,
        selectedGigId,
        requirementStatus,
        options
      });

      if (provider === 'telnyx') {
        // 1. Vérifier si les requirements sont en cours de vérification
        if (requirementStatus.isChecking) {
          setPurchaseError('Please wait while we check requirements...');
          setPurchaseStatus('error');
          return;
        }

        // 2. Vérifier s'il y a eu une erreur avec les requirements
        if (requirementStatus.error) {
          setPurchaseError('Cannot proceed: Failed to check requirements');
          setPurchaseStatus('error');
          return;
        }

        // 3. Vérifier si les requirements sont complétés
        if (requirementStatus.hasRequirements && !requirementStatus.isComplete) {
          setPurchaseError('Please complete the requirements before purchasing');
          setPurchaseStatus('error');
          return;
        }

        // 4. Vérifier si nous avons l'ID du groupe de requirements (seulement si des requirements sont nécessaires)
        if (requirementStatus.hasRequirements && !requirementStatus.groupId) {
          setPurchaseError('Missing requirement group ID. Please try again.');
          setPurchaseStatus('error');
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
        gigId: selectedGigId,
        companyId,

        requirementGroupId: provider === 'telnyx' ? requirementStatus.telnyxId : undefined,
        bundleSid: options?.bundleSid,
        addressSid: options?.addressSid
      };

      console.log('📝 Purchase request data:', purchaseData);

      const response = await phoneNumberService.purchasePhoneNumber(purchaseData);
      console.log('📞 Purchase response:', response);

      if (!response || (response as any).error) {
        const errorMessage = (response as any)?.message || (response as any)?.error || 'Failed to purchase number';
        throw new Error(errorMessage);
      }

      console.log('✅ Number purchased successfully!');
      setAvailableNumbers((prev: AvailablePhoneNumber[]) => prev.filter((num: AvailablePhoneNumber) => getPhoneNumber(num) !== phoneNumber));
      await fetchExistingNumbers(); // Wait for numbers to be fetched
      setPurchaseStatus('success');
      // Store the purchased number details for display
      setPurchaseResponse((response as any)?.data || {
        phoneNumber,
        status: provider === 'twilio' ? 'active' : 'pending',
        features: {
          voice: true,
          sms: true,
          mms: true
        },
        provider
      });

      // --- Auto-Complete Onboarding Step 4 Here ---
      console.log('🚀 Completing telephony setup silently...');
      try {
        const onboardingResponse = await axios.get(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
        );

        const currentCompletedSteps = (onboardingResponse.data as any)?.completedSteps || [];
        const newCompletedSteps = currentCompletedSteps.includes(4) ? currentCompletedSteps : [...currentCompletedSteps, 4];

        const updateResponse = await axios.put(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`,
          {
            completedSteps: newCompletedSteps,
            currentPhase: 2
          }
        );
        console.log('✅ Telephony setup step 4 marked as completed via general onboarding:', updateResponse.data);
      } catch (apiError) {
        console.log('⚠️ Could not update via general onboarding API, trying individual step endpoint...');
        try {
          const response = await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/4`,
            { status: 'completed' }
          );
          console.log('✅ Telephony setup step 4 marked as completed via individual endpoint:', response.data);
        } catch (stepError) {
          console.log('⚠️ Individual step endpoint also failed, proceeding with localStorage only');
        }
      }

      const newCompletedSteps = completedSteps.includes(4) ? completedSteps : [...completedSteps, 4];
      setCompletedSteps(newCompletedSteps);

      const currentProgress = {
        currentPhase: 2,
        completedSteps: newCompletedSteps,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

      // Dispatch event to explicitly notify CompanyOnboarding
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: { stepId: 4, phaseId: 2, status: 'completed', completedSteps: newCompletedSteps }
      }));

      Cookies.set('telephonyStepCompleted', 'true', { expires: 7 });

    } catch (error) {
      console.error('❌ Error purchasing number:', error);
      setPurchaseStatus('error');
      setPurchaseError(error instanceof Error ? error.message : 'Failed to purchase number. Please try again.');
    }
  };



  const handleSubmitRequirements = async (values: Record<string, any>) => {
    try {
      console.log('📝 Submitting requirements:', values);
      if (!companyId) throw new Error('Company ID is required');

      if (provider === 'twilio') {
        // Handle Twilio Submission
        const regulationSid = requirementStatus.groupId; // We stored regulationSid here
        if (!regulationSid) throw new Error('Regulation SID missing');

        // 1. Create End User
        const endUserVal = values['end_user'];
        let endUserSid;
        if (endUserVal) {
          // Assuming textual input contains JSON or simple string name
          const endUser = await phoneNumberService.createTwilioEndUser({
            friendlyName: typeof endUserVal === 'string' ? endUserVal : 'End User',
            type: countryReq.requirements?.find(r => r.id === 'end_user')?.name.split(' ')[0].toLowerCase() || 'individual',
            attributes: {
              // business_name: ... if strictly structured input.
              // For simplicity, we create generic end user.
            }
          });
          endUserSid = endUser.sid;
          console.log('✅ Created Twilio End User:', endUserSid);
        }

        // 2. Create Bundle
        const bundle = await phoneNumberService.createTwilioBundle({
          friendlyName: `Bundle for ${destinationZone}`,
          email: 'admin@example.com', // Should be dynamic
          regulationSid: regulationSid,
          isoCountry: destinationZone
        });
        const bundleSid = bundle.sid;
        console.log('✅ Created Twilio Bundle:', bundleSid);

        // 3. Assign End User to Bundle
        if (endUserSid) {
          await phoneNumberService.assignItemToBundle(bundleSid, endUserSid);
        }

        // 4. Upload Documents and Assign
        for (const [field, value] of Object.entries(values)) {
          if (field === 'end_user') continue;

          if (value instanceof File) {
            const docType = 'supporting_document'; // Should map from requirement type
            const doc = await phoneNumberService.createTwilioDocument(
              value,
              value.name,
              docType, // Simplified type
              {} // attributes
            );
            console.log(`✅ Uploaded Document ${field}:`, doc.sid);
            await phoneNumberService.assignItemToBundle(bundleSid, doc.sid);
          }
        }

        // 5. Submit Bundle
        await phoneNumberService.submitTwilioBundle(bundleSid);
        console.log('✅ Submitted Twilio Bundle');

        // 6. Handle Address creation if needed (simplified check)
        let addressSid = twilioRegulatorySids.addressSid;
        if (values['street'] || values['city'] || values['postal_code']) {
          const address = await phoneNumberService.createTwilioAddress({
            customerName: values['customer_name'] || 'Business',
            street: values['street'] || '',
            city: values['city'] || '',
            region: values['region'] || '',
            postalCode: values['postal_code'] || '',
            isoCountry: destinationZone
          });
          addressSid = address.sid;
          console.log('✅ Created Twilio Address:', addressSid);
        }

        // Store SIDs for Purchase
        setTwilioRegulatorySids(prev => ({ ...prev, bundleSid, addressSid }));
        setRequirementStatus(prev => ({ ...prev, isComplete: true }));
        setPurchaseStatus('confirming');

      } else {
        // Handle Telnyx Submission (Existing Logic)
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
      }
    } catch (error) {
      console.error('❌ Error submitting requirements:', error);
      setPurchaseError(error instanceof Error ? error.message : 'Failed to submit requirements');
      setPurchaseStatus('error');
    }
  };

  const handleConfirmPurchase = async (sids?: { bundleSid?: string; addressSid?: string }) => {
    if (!selectedNumber) return;
    console.log('🖱️ handleConfirmPurchase called with sids from modal:', sids);
    setPurchaseStatus('purchasing');
    try {
      // Filter out empty strings and merge with default twilioRegulatorySids
      const purchaseSids = {
        ...twilioRegulatorySids,
        ...(sids?.bundleSid ? { bundleSid: sids.bundleSid } : {}),
        ...(sids?.addressSid ? { addressSid: sids.addressSid } : {})
      };
      console.log('🧩 Merged purchaseSids to be sent:', purchaseSids);
      await purchaseNumber(selectedNumber, purchaseSids);
      // Success state is already set in purchaseNumber function
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
                className={`relative w-full rounded-xl border-2 py-4 pl-5 pr-12 text-left text-base font-medium transition-all duration-300 shadow-md ${selectedGigId
                  ? 'border-blue-400 bg-blue-50 text-blue-900 focus:border-blue-500 focus:ring-blue-500 shadow-blue-200/50'
                  : 'border-blue-200 bg-white text-blue-800 focus:border-blue-400 focus:ring-blue-400 hover:border-blue-300'
                  } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="flex items-center">
                  {selectedGigId ? (
                    (() => {
                      const selectedGig = gigs.find((g: Gig) => g._id === selectedGigId);
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
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {providers.map((p) => {
            const Logo = p.logo;
            const isDisabled = p.id === 'telnyx';
            return (
              <button
                key={p.id}
                disabled={isDisabled}
                className={`flex items-center justify-center rounded-lg border p-4 transition-all duration-200 ${isDisabled
                  ? 'opacity-40 grayscale cursor-not-allowed bg-gray-50 border-gray-200'
                  : provider === p.id
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                onClick={() => setProvider(p.id)}
              >
                <Logo className={`mr-2 h-5 w-5 ${isDisabled ? 'text-gray-400' : 'text-indigo-600'}`} />
                <span className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                  {p.name}
                  {isDisabled && <span className="ml-2 text-[10px] uppercase tracking-tighter">(Soon)</span>}
                </span>
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
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-600">
                  Destination Zone: <span className="font-medium">{selectedGig.destination_zone.name.common}</span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${isQuotaReached ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {purchasedNumbersCount} / {teamSize} Numbers Purchased
                </span>
              </div>
            ) : null;
          })()}
        </div>


        {/* Requirements Warning for Telnyx Numbers - Only show when requirements are needed and incomplete */}
        {provider === 'telnyx' && requirementStatus.hasRequirements && !requirementStatus.isComplete && (
          <div className="mb-4 rounded-lg bg-yellow-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3 flex-grow">
                <h3 className="text-sm font-medium text-yellow-800">Requirements Needed</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>To purchase numbers in this country, you need to complete all required information.</p>

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
                    onClick={async () => {
                      // Make sure we have requirements loaded
                      if (!countryReq.requirements?.length) {
                        const selectedGig = gigs.find(g => g._id === selectedGigId);
                        if (selectedGig?.destination_zone?.cca2) {
                          const response = await requirementService.checkCountryRequirements(selectedGig.destination_zone.cca2);
                          setCountryReq(response);
                          if (response.requirements?.length) {
                            setShowRequirementModal(true);
                          } else {
                            console.warn('No requirements found for country:', selectedGig.destination_zone.cca2);
                          }
                        }
                      } else {
                        setShowRequirementModal(true);
                      }
                    }}
                    className="mt-3 inline-flex items-center rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                  >
                    {requirementStatus.completedRequirements?.length ? 'Continue Requirements' : 'Start Requirements'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchased Numbers Section */}
        {provider === 'telnyx' ? (
          <div className="mb-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Purchased Telnyx Numbers</h4>
            <div className="grid gap-2">
              {Array.isArray(phoneNumbers) && phoneNumbers.filter(number => number.provider === 'telnyx').length > 0 ? (
                // Case 1.1: Show existing number for the gig
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
                        <span className={`px-2 py-1 text-xs rounded-full ${number.status === 'active' ? 'bg-green-100 text-green-800' :
                          number.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {number.status}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                // Case 1.2.3 or initial state
                <div className="rounded-lg border border-gray-200 p-4 text-center text-gray-500">
                  No phone number purchased for this gig yet
                </div>
              )}
            </div>
          </div>
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
                        <span className={`px-2 py-1 text-xs rounded-full ${number.status === 'active' ? 'bg-green-100 text-green-800' :
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

            {/* Available Numbers or Warning */}
            {Array.isArray(availableNumbers) && availableNumbers.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Numbers</h4>
                <div className="grid gap-2">
                  {availableNumbers.map((number) => {
                    const phoneNumber = getPhoneNumber(number);
                    return (
                      <div
                        key={phoneNumber}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{phoneNumber}</span>
                            {number.type && (
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${number.type === 'local' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                {number.type}
                              </span>
                            )}
                          </div>
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
                          disabled={isQuotaReached}
                          className={`rounded-md px-3 py-1 text-sm text-white ${isQuotaReached
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                            }`}
                          title={isQuotaReached ? 'Quota reached for this gig team size' : undefined}
                        >
                          Purchase
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Available Numbers List */}
        {destinationZone && provider === 'telnyx' && (
          <div className="mb-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Available Numbers (Destination: {(() => {
              const selectedGig = gigs.find((g: Gig) => g._id === selectedGigId);
              return selectedGig ? selectedGig.destination_zone.name.common : destinationZone;
            })()})</h4>
            <div className="grid gap-2">
              {Array.isArray(availableNumbers) && availableNumbers.length > 0 ? (
                availableNumbers.map((number) => {
                  const phoneNumber = getPhoneNumber(number);
                  const isDisabled = isQuotaReached || (requirementStatus.hasRequirements && !requirementStatus.isComplete);
                  const tooltipMessage = isQuotaReached
                    ? 'Quota reached for this gig team size'
                    : requirementStatus.hasRequirements && !requirementStatus.isComplete
                      ? 'Please complete the requirements before purchasing'
                      : undefined;

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
                      <div className="flex items-center gap-2">
                        {isDisabled && (
                          <span className="text-xs text-gray-500 italic mr-2">
                            {tooltipMessage}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedNumber(phoneNumber);
                            setPurchaseStatus('confirming');
                            setShowPurchaseModal(true);
                          }}
                          disabled={isQuotaReached}
                          className={`rounded-md px-3 py-1 text-sm text-white ${isQuotaReached
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                            }`}
                          title={isQuotaReached ? 'Quota reached for this gig team size' : undefined}
                        >
                          Purchase
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                    <h3 className="text-sm font-medium text-yellow-800">No Numbers Available</h3>
                  </div>
                  <div className="mt-2 text-sm text-center text-gray-500">
                    <p className="mb-2">No Telnyx phone numbers are currently available for this destination.</p>
                    <p className="text-sm text-gray-400">You can try again later or contact support if you need immediate assistance.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={async () => {
          // If purchase was successful, refresh purchased numbers
          if (purchaseStatus === 'success') {
            await fetchExistingNumbers();
          }
          // Re-fetch available numbers if we were using Telnyx
          if (provider === 'telnyx') {
            await searchAvailableNumbers();
          }
          setShowPurchaseModal(false);
          setPurchaseStatus('idle');
          setSelectedNumber(null);
          setPurchaseResponse(null);
        }}
        purchaseStatus={purchaseStatus}
        purchaseResponse={purchaseResponse}
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
          // Update requirement status before closing
          if (requirementStatus.groupId) {
            try {
              const detailedStatus = await requirementService.getDetailedGroupStatus(requirementStatus.groupId);

              const completionPercentage = Math.round(
                (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
              );

              setRequirementStatus(prev => ({
                ...prev,
                isComplete: detailedStatus.isComplete,
                completionPercentage,
                completedRequirements: detailedStatus.completedRequirements,
                totalRequirements: detailedStatus.totalRequirements,
                pendingRequirements: detailedStatus.pendingRequirements,
                // If requirements are complete, we don't need to show the warning anymore
                hasRequirements: detailedStatus.isComplete ? false : prev.hasRequirements
              }));
            } catch (error) {
              console.error('Error updating requirement status on close:', error);
            }
          }
          setShowRequirementModal(false);
        }}
        countryCode={destinationZone}
        requirements={countryReq.requirements || []}
        existingValues={requirementStatus.completedRequirements?.map((req: RequirementDetail) => ({
          field: req.id,
          value: JSON.stringify(req.value),
          status: req.status,
          submittedAt: req.submittedAt
        }))}
        requirementGroupId={requirementStatus.groupId}
        requirementStatus={requirementStatus}
        onSubmit={async (values: Record<string, any>) => {
          try {
            await handleSubmitRequirements(values);
            // After submitting, update the status
            if (requirementStatus.groupId) {
              const detailedStatus = await requirementService.getDetailedGroupStatus(requirementStatus.groupId);

              const completionPercentage = Math.round(
                (detailedStatus.completedRequirements.length / detailedStatus.totalRequirements) * 100
              );

              setRequirementStatus(prev => ({
                ...prev,
                isComplete: detailedStatus.isComplete,
                completionPercentage,
                completedRequirements: detailedStatus.completedRequirements,
                totalRequirements: detailedStatus.totalRequirements,
                pendingRequirements: detailedStatus.pendingRequirements,
                hasRequirements: detailedStatus.isComplete ? false : prev.hasRequirements
              }));
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
