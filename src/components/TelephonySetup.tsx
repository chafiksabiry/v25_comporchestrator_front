import { useState, useEffect } from 'react';
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
import twilioIcon from '../assets/twilio-icon.svg';

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

const TelephonySetup = ({ companyId: propCompanyId }: { companyId?: string | null }): JSX.Element => {
  const [provider, setProvider] = useState<'telnyx' | 'twilio'>('twilio');
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(propCompanyId || null);
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

    // Sync with prop if provided
    if (propCompanyId) {
      setCompanyId(propCompanyId);
      setCookieError(null);
      return;
    }

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
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [purchaseType, setPurchaseType] = useState<string | undefined>(undefined);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'confirming' | 'requirements' | 'purchasing' | 'success' | 'error'>('idle');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
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
  const selectedGig = Array.isArray(gigs) ? gigs.find(g => g._id === selectedGigId) : null;
  const teamSize = selectedGig ? parseInt(selectedGig.team?.size?.toString() || '1') : 1;
  const purchasedNumbersCount = Array.isArray(phoneNumbers) ? phoneNumbers.length : 0;
  const isQuotaReached = purchasedNumbersCount >= teamSize;
  
  // Helper to convert country names to flag emojis
  const getFlagEmoji = (countryName: string) => {
    if (!countryName) return '';
    try {
      const codePoints = countryName
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch (e) {
      return '';
    }
  };

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
    if (selectedGigId && Array.isArray(gigs) && gigs.length > 0) {
      const selectedGig = gigs.find((gig: Gig) => gig._id === selectedGigId);
      if (selectedGig?.destination_zone?.cca2) {
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
    addressSid: 'ADfa022505e9b0433a23c8b4f6e56cf15a', // From Screenshot
    bundleSid: 'BUF007aeefc1a71ad9ac096a4d205563b0'  // From Screenshot for FR
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

  const purchaseNumber = async (phoneNumber: string, options?: { bundleSid?: string; addressSid?: string; type?: string }) => {
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
        addressSid: options?.addressSid,
        type: options?.type
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
          friendlyName: `France: Local - Business`,
          email: 'chafik.sabiry@aiagentsco.tech',
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

  const handleConfirmPurchase = async (sids?: { bundleSid?: string; addressSid?: string }, phoneNumberOverride?: string, type?: string) => {
    const numberToPurchase = phoneNumberOverride || selectedNumber;
    if (!numberToPurchase) return;
    
    console.log('🖱️ handleConfirmPurchase called with:', { sids, numberToPurchase, type });
    setPurchaseStatus('purchasing');
    try {
      // Filter out empty strings and merge with default twilioRegulatorySids
      const purchaseSids = {
        ...twilioRegulatorySids,
        ...(sids?.bundleSid ? { bundleSid: sids.bundleSid } : {}),
        ...(sids?.addressSid ? { addressSid: sids.addressSid } : {}),
        type: type // Include the type
      };
      console.log('🧩 Merged purchaseSids to be sent:', purchaseSids);
      await purchaseNumber(numberToPurchase, purchaseSids);
      // Success state is already set in purchaseNumber function
    } catch (error) {
      setPurchaseStatus('error');
      setPurchaseError(error instanceof Error ? error.message : 'Failed to purchase number');
    }
  };

  return (
    <div className="w-full py-2 space-y-4 animate-in fade-in duration-500">
      {/* Header Area - Subtle Gradient Accent */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-harx p-6 mb-3 shadow-lg shadow-harx-500/20">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Telephony Setup</h1>
            <p className="text-[14px] font-medium text-white/90">Manage and configure your global network entry points</p>
          </div>
          {completedSteps.includes(5) && (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl self-start">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        {/* Abstract background pattern */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
      </div>

      {cookieError && (
        <div className="rounded-lg bg-red-50 border-[0.5px] border-red-100 p-4 mx-1">
          <div className="flex text-[14px]">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div className="ml-3">
              <h3 className="font-bold text-red-800 uppercase tracking-widest">Configuration Error</h3>
              <p className="mt-1 text-red-700 font-medium">{cookieError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section: Select Gig */}
      <div className="relative bg-white rounded-lg border-[0.5px] border-gray-200 p-4 shadow-sm pl-8">
        {/* Huawei-style Blue Side Acceleration Bar */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 rounded-l-lg shadow-[2px_0_8px_rgba(37,99,235,0.2)]"></div>
        
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-[13px] font-medium text-gray-400 uppercase tracking-[0.08em]">Select Gig Profile</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
              Required
            </span>
          </div>
        </div>
        <p className="text-[14px] text-gray-500 mb-5">Associate a primary intelligence gig with your global telephony entry points</p>

        {isLoadingGigs ? (
          <div className="w-full h-12 bg-gray-50 rounded-lg flex items-center justify-center border-[0.5px] border-gray-100">
            <div className="animate-spin h-4 w-4 border-2 border-blue-200 border-t-blue-600 rounded-full mr-3" />
            <span className="text-[13px] font-medium text-gray-500 uppercase tracking-widest">Hydrating profiles...</span>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center justify-between w-full px-5 py-3.5 bg-gray-50/50 rounded-lg border-[0.5px] transition-all duration-300 ${
                isDropdownOpen ? 'border-blue-400 ring-4 ring-blue-900/5 bg-white' : 'border-gray-200 hover:border-blue-200 hover:bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Briefcase className={`h-5 w-5 ${selectedGigId ? 'text-blue-600' : 'text-gray-400'}`} />
                {selectedGigId ? (
                   (() => {
                    const selectedGig = gigs.find((g: Gig) => g._id === selectedGigId);
                    return selectedGig ? (
                      <div className="flex items-center space-x-3">
                        <span className="text-[16px] font-black text-gray-900 leading-none tracking-tight">{selectedGig.title}</span>
                        <span className="text-gray-300 font-light">|</span>
                        <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.15em] leading-none">
                          {selectedGig.destination_zone?.name?.common || 'Global Zone'}
                        </span>
                      </div>
                    ) : <span className="text-[15px] text-gray-400 font-black uppercase tracking-widest">Select Intelligence Profile</span>;
                  })()
                ) : (
                  <span className="text-[15px] text-gray-400 font-bold italic">Choose an active gig profile...</span>
                )}
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-white border-[0.5px] border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(37,99,235,0.15)] max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-500 ring-1 ring-black/5">
                {gigs.length > 0 ? (
                  gigs.map((g: Gig) => (
                    <button
                      key={g._id}
                      onClick={() => {
                        setSelectedGigId(g._id);
                        setIsDropdownOpen(false);
                      }}
                      className={`relative flex items-center justify-between w-full px-7 py-5.5 text-left transition-all duration-300 group border-b-[0.5px] border-gray-50 last:border-0 ${
                        selectedGigId === g._id ? 'bg-blue-50/70 shadow-inner' : 'hover:bg-blue-50/40'
                      }`}
                    >
                      <div className={`absolute left-0 w-2 transition-all duration-500 ${
                        selectedGigId === g._id ? 'h-full bg-blue-600 opacity-100' : 'h-0 bg-blue-400 opacity-0 group-hover:h-12 group-hover:opacity-60'
                      }`} />
                      
                      <div className="flex flex-col items-start pl-4">
                        <span className={`text-[17px] font-black tracking-tighter transition-all duration-300 ${
                          selectedGigId === g._id ? 'text-blue-700 translate-x-1' : 'text-gray-900 group-hover:text-blue-600'
                        }`}>
                          {g.title}
                        </span>
                        <div className="flex items-center space-x-2 mt-1.5">
                          <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] bg-blue-50 px-2 py-0.5 rounded">
                            {g.destination_zone?.name?.common || 'Unknown Region'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-5">
                        {g.destination_zone?.name?.common && getFlagEmoji(g.destination_zone.name.common) && (
                          <span className="text-2xl drop-shadow-sm transition-all group-hover:scale-125 duration-500">
                            {getFlagEmoji(g.destination_zone.name.common)}
                          </span>
                        )}
                        {selectedGigId === g._id && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-in zoom-in spin-in-90 duration-700">
                             <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-8 py-16 text-center">
                    <Globe className="h-10 w-10 text-gray-200 mx-auto mb-4 animate-pulse" />
                    <p className="text-[15px] text-gray-400 font-black uppercase tracking-widest italic">No Global Profiles found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Main Content (Provider + Numbers) - Only show when gigs are loaded */}
      {!isLoadingGigs && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150 fill-mode-both">
          {/* Section: Select Provider */}
          <div className="relative bg-white rounded-lg border-[0.5px] border-gray-200 p-4 shadow-sm pl-8">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 rounded-l-lg shadow-[2px_0_8px_rgba(37,99,235,0.2)]"></div>
            
            <span className="text-[13px] font-medium text-gray-400 uppercase tracking-[0.08em] block mb-1.5">Network Provider</span>
            <p className="text-[14px] text-gray-500 mb-6">Choose a carrier-grade partner for stable low-latency routing</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {providers.map((p) => {
                const isSelected = provider === p.id;
                const isDisabled = p.id === 'telnyx';
                
                return (
                  <button
                    key={p.id}
                    disabled={isDisabled}
                    onClick={() => setProvider(p.id)}
                    className={`relative flex items-center justify-between px-6 py-5 rounded-xl border-[0.5px] transition-all duration-500 h-24 ${
                      isDisabled 
                        ? 'opacity-40 bg-gray-50 border-gray-100 cursor-not-allowed' 
                        : isSelected
                          ? 'bg-blue-50/40 border-blue-500 shadow-md ring-4 ring-blue-500/5'
                          : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-6">
                      {p.id === 'twilio' ? (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isSelected ? 'bg-white shadow-md' : 'bg-gray-50'}`}>
                          <img src={twilioIcon} className={`h-8 w-8 ${isSelected ? '' : 'opacity-40 grayscale'}`} alt="Twilio" />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isSelected ? 'bg-blue-600 shadow-lg' : 'bg-gray-50'}`}>
                          <Globe className={`h-8 w-8 ${isSelected ? 'text-white' : 'text-gray-300'}`} />
                        </div>
                      )}
                      <div className="flex flex-col items-start">
                        <span className={`text-[16px] font-black uppercase tracking-[0.1em] ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                          {p.name}
                        </span>
                        {isDisabled && (
                          <span className="bg-gray-200 text-gray-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] tracking-widest mt-1">
                            Pending
                          </span>
                        )}
                        {!isDisabled && isSelected && (
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Active Partner</span>
                        )}
                      </div>
                    </div>
                    {isSelected && !isDisabled && (
                       <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                         <CheckCircle className="h-4 w-4 text-white" />
                       </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Phone Nodes */}
          <div className="relative bg-white rounded-lg border-[0.5px] border-gray-200 p-4 shadow-sm pl-8">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 rounded-l-lg shadow-[2px_0_8px_rgba(37,99,235,0.2)]"></div>
            
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-gray-400 uppercase tracking-[0.08em]">Network Entries</span>
              {destinationZone && selectedGigId && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-[4px] bg-blue-50 border-[0.5px] border-blue-200 shadow-sm transition-all duration-300 hover:bg-blue-100">
                  <div className={`w-2.5 h-2.5 rounded-full ${isQuotaReached ? 'bg-emerald-500' : 'bg-blue-600 pulse'}`} />
                  <span className="text-[12px] font-black text-blue-700 uppercase tracking-widest">
                    {purchasedNumbersCount} / {teamSize} Active
                  </span>
                </div>
              )}
            </div>
            <p className="text-[14px] text-gray-500 mb-6">Provision and manage secure access points for your global intelligence nodes</p>

            {/* Combined Active & Available List */}
            <div className="space-y-4">
              {/* Active Numbers */}
              {Array.isArray(phoneNumbers) && phoneNumbers.filter(n => n.provider === provider).map((number: any) => (
                <div key={number.phoneNumber} className="flex items-center justify-between p-5 rounded-xl border-[0.5px] border-gray-100 bg-gray-50/20 hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all duration-500 group">
                  <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 shadow-sm">
                      <Phone className="h-6 w-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[18px] font-black text-gray-900 group-hover:text-blue-700 transition-colors tracking-tight">{number.phoneNumber}</span>
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] italic">{number.metadata?.type || 'STATIC'} INFRASTRUCTURE</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-1.5 text-[11px] font-black uppercase rounded-lg border-[0.5px] shadow-sm transition-all ${
                      number.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white' 
                        : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                    }`}>
                      {number.status === 'active' ? 'Operational' : 'Syncing'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Available Numbers (If searched) */}
              {Array.isArray(availableNumbers) && availableNumbers.length > 0 && (
                 <div className="space-y-3 mt-6">
                   <div className="flex items-center space-x-3 text-[11px] uppercase font-black tracking-widest text-gray-300">
                     <div className="h-[1px] flex-1 bg-gray-100" />
                     <span className="flex items-center space-x-2">
                       <Globe className="h-3 w-3 text-blue-400" />
                       <span>Regional Nodes Available</span>
                     </span>
                     <div className="h-[1px] flex-1 bg-gray-100" />
                   </div>
                   {availableNumbers.map((number) => {
                      const phoneNumber = getPhoneNumber(number);
                      const isDisabled = isQuotaReached;
                      return (
                        <div key={phoneNumber} className="flex items-center justify-between p-4 rounded-xl border-[0.5px] border-gray-100 bg-white hover:border-blue-500 hover:shadow-xl transition-all group animate-in slide-in-from-right-4 duration-300">
                          <div className="flex flex-col">
                             <div className="flex items-center space-x-3">
                               <span className="text-[18px] font-black text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">{phoneNumber}</span>
                               <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{number.type}</span>
                             </div>
                             <span className="text-[12px] font-bold text-gray-400 uppercase italic mt-1 leading-none">{number.locality || 'Regional'} Global Gateway</span>
                          </div>
                          <button
                            disabled={isDisabled}
                            onClick={() => {
                              setSelectedNumber(phoneNumber);
                              setPurchaseStatus('confirming');
                              setPurchaseType(number.type);
                              setShowPurchaseModal(true);
                            }}
                            className={`px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                              isDisabled 
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-[0.5px] border-gray-200' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95'
                            }`}
                          >
                            Purchase
                          </button>
                        </div>
                      );
                   })}
                 </div>
              )}

              {/* Centered Empty State */}
              {(!phoneNumbers || phoneNumbers.filter(n => n.provider === provider).length === 0) && (!availableNumbers || availableNumbers.length === 0) && (
                <div className="py-16 flex flex-col items-center text-center animate-in fade-in duration-700">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6 shadow-sm border-[0.5px] border-blue-100">
                    <Phone className="h-7 w-7 text-blue-300" />
                  </div>
                  <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 leading-none">Infrastructure Offline</h4>
                  <p className="text-[14px] text-gray-300 font-medium mb-8 max-w-[280px]">Begin by prioritizing regional entry points for your intelligence network</p>
                  <button 
                    onClick={() => searchAvailableNumbers()}
                    className="flex items-center space-x-3 px-8 py-3 rounded-xl bg-white border-[0.5px] border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:shadow-xl text-[12px] font-black uppercase tracking-widest transition-all group"
                  >
                    <Globe className="h-4 w-4 text-blue-400 transition-transform group-hover:rotate-180 duration-1000" />
                    <span>Scan Regional Gateways</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={async () => {
          if (purchaseStatus === 'success') {
            await fetchExistingNumbers();
          }
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
        onConfirmPurchase={async (sids) => await handleConfirmPurchase(sids, selectedNumber || undefined, purchaseType)}
        onSetPurchaseStatus={setPurchaseStatus}
        onSetSelectedNumber={setSelectedNumber}
        onSetShowPurchaseModal={setShowPurchaseModal}
      />

      {/* Requirements Modal */}
      <RequirementFormModal
        isOpen={showRequirementModal}
        onClose={async () => {
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
