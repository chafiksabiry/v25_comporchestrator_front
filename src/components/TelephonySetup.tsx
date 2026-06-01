import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Phone,
  Globe,
  CheckCircle,
  AlertCircle,
  Briefcase,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { phoneNumberService, BASE_URL } from '../services/api';
import { markGigStepDone } from '../services/gigSetupSync';
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

/** Normalize Mongo ObjectId shapes from API/cookies to a plain hex string. */
function normalizeGigId(id: unknown): string {
  if (id == null) return '';
  if (typeof id === 'string') return id.trim();
  if (typeof id === 'object') {
    const o = id as Record<string, unknown>;
    if (typeof o.$oid === 'string') return o.$oid;
    if (o._id != null) return normalizeGigId(o._id);
  }
  return String(id).trim();
}

const TelephonySetup = ({
  companyId: propCompanyId,
  onNextStepReadyChange,
}: {
  companyId?: string | null;
  /** Reports whether the sticky "Next step" CTA can proceed (≥1 purchased line). */
  onNextStepReadyChange?: (ready: boolean) => void;
}): JSX.Element => {
  const { t } = useTranslation();
  // Provider is enforced to Twilio (UI selector intentionally hidden).
  const [provider] = useState<'telnyx' | 'twilio'>('twilio');
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(propCompanyId || null);
  const [cookieError, setCookieError] = useState<string | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fetchingGigsRef = useRef(false);
  const providerRunForGigRef = useRef<string | null>(null);

  // Resolve companyId from prop or cookie (no overlapping intervals).
  useEffect(() => {
    const resolved = (propCompanyId || Cookies.get('companyId') || '').trim();
    if (resolved) {
      setCompanyId(resolved);
      setCookieError(null);
      return;
    }

    setCookieError(
      'Required company ID not found. Please refresh the page if this persists.'
    );
    const interval = setInterval(() => {
      const fromCookie = (Cookies.get('companyId') || '').trim();
      if (fromCookie) {
        setCompanyId(fromCookie);
        setCookieError(null);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [propCompanyId]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [destinationZone, setDestinationZone] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [isSearchingNumbers, setIsSearchingNumbers] = useState(false);
  const [trialInfo, setTrialInfo] = useState<{
    eligible: boolean;
    trialDurationDays: number;
    existingNumbers: number;
  } | null>(null);
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
  // Logic for multi-number support
  const selectedGig = Array.isArray(gigs)
    ? gigs.find((g) => normalizeGigId(g._id) === normalizeGigId(selectedGigId))
    : null;
  const teamSize = selectedGig ? parseInt(selectedGig.team?.size?.toString() || '1') : 1;
  const purchasedNumbersCount = Array.isArray(phoneNumbers) ? phoneNumbers.length : 0;
  const isQuotaReached = purchasedNumbersCount >= teamSize;

  useEffect(() => {
    onNextStepReadyChange?.(purchasedNumbersCount > 0);
  }, [purchasedNumbersCount, onNextStepReadyChange]);

  // Tiny presentational helper: shows the real country flag image when the gig
  // exposes one, otherwise falls back to the ISO code letters in a neutral
  // tile. This is the only flag renderer used by the gig dropdown.
  const FlagBadge: React.FC<{
    flags?: { svg?: string; png?: string; alt?: string } | null;
    iso?: string | null;
    name?: string | null;
    size?: 'sm' | 'md';
    className?: string;
  }> = ({ flags, iso, name, size = 'md', className = '' }) => {
    const src = flags?.svg || flags?.png;
    const dim = size === 'sm' ? 'w-10 h-10' : 'w-11 h-11';
    const label = (iso || '').toUpperCase() || (name || '').slice(0, 2).toUpperCase();

    if (src) {
      return (
        <div
          className={`relative shrink-0 ${dim} rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm ${className}`}
          aria-label={flags?.alt || name || 'flag'}
        >
          <img src={src} alt={flags?.alt || name || 'flag'} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      );
    }

    return (
      <div
        className={`shrink-0 flex items-center justify-center ${dim} rounded-xl bg-gradient-to-br from-harx-50 to-harx-alt-50 border border-harx-100 shadow-inner ${className}`}
        aria-label={name || iso || 'flag'}
      >
        <span className="text-[11px] font-extrabold tracking-[0.12em] bg-gradient-harx bg-clip-text text-transparent">{label || '—'}</span>
      </div>
    );
  };

  useEffect(() => {
    if (!companyId) return;
    providerRunForGigRef.current = null;
    fetchGigs();
    checkCompletedSteps();
  }, [companyId]);

  // Auto-select first gig when none selected (ids normalized).
  useEffect(() => {
    if (selectedGigId || !Array.isArray(gigs) || gigs.length === 0) return;
    const firstId = normalizeGigId(gigs[0]?._id);
    if (firstId) setSelectedGigId(firstId);
  }, [gigs, selectedGigId]);

  // Vérifier l'éligibilité au trial gratuit 15 jours pour la company.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const info = await phoneNumberService.getTrialEligibility(companyId);
        if (!cancelled) {
          setTrialInfo({
            eligible: info.eligible,
            trialDurationDays: info.trialDurationDays,
            existingNumbers: info.existingNumbers,
          });
        }
      } catch (e) {
        if (!cancelled) setTrialInfo(null);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, phoneNumbers.length]);

  // Effet pour récupérer les numéros existants quand un gig est sélectionné
  useEffect(() => {
    if (selectedGigId) {

      fetchExistingNumbers();
    }
  }, [selectedGigId]);

  // Mettre à jour la destination zone quand un gig est sélectionné
  useEffect(() => {
    if (selectedGigId && Array.isArray(gigs) && gigs.length > 0) {
      const selectedGig = gigs.find((gig: Gig) => gig._id === selectedGigId);
      if (selectedGig?.destination_zone?.cca2) {

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

      const interval = setInterval(fetchExistingNumbers, 30000);
      return () => clearInterval(interval);
    }
  }, [phoneNumbers]);

  /* New state for Twilio SIDs */
  const [twilioRegulatorySids, setTwilioRegulatorySids] = useState<{ bundleSid?: string; addressSid?: string }>({
    addressSid: 'ADfa022505e9b0433a23c8b4f6e56cf15a', // From Screenshot
    bundleSid: 'BUf007aeefc1a71ad9ac096a4d205563b0'  // From Screenshot for FR
  });

  const checkGigPhoneNumber = async (zoneOverride?: string) => {
    if (!selectedGigId) return false;

    // Resolve zone avoiding react state race conditions
    const selectedGig = gigs.find(g => g._id === selectedGigId);
    const zone = zoneOverride || selectedGig?.destination_zone?.cca2;

    try {

      const result = await phoneNumberService.listPhoneNumbers(selectedGigId);

      if (result?.hasNumber && result.numbers && result.numbers.length > 0) {
        // Case 1.1: Gig already has number(s)

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

  // Provider setup when gig + gig list are ready (avoid running before gigs hydrate).
  useEffect(() => {
    if (!selectedGigId || !companyId || gigs.length === 0) return;

    const runKey = `${selectedGigId}:${gigs.length}`;
    if (providerRunForGigRef.current === runKey) return;
    providerRunForGigRef.current = runKey;

    setAvailableNumbers([]);
    setPurchaseError(null);
    setPurchaseStatus('idle');
    setSelectedNumber(null);
    setShowPurchaseModal(false);
    setShowRequirementModal(false);

    const selectedGig = gigs.find(
      (gig: Gig) => normalizeGigId(gig._id) === selectedGigId
    );
    const zone = selectedGig?.destination_zone?.cca2;

    if (provider === 'telnyx') {
      void handleTelnyxProvider(zone);
    } else if (provider === 'twilio') {
      void handleTwilioProvider(zone);
    } else {
      void checkGigPhoneNumber();
      if (zone) void searchAvailableNumbers(zone);
    }
  }, [selectedGigId, companyId, gigs]);


  const checkCompletedSteps = async () => {
    try {
      if (!companyId) return;



      try {
        const response = await axios.get(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
        );



        if (response.data && (response.data as any).completedSteps && Array.isArray((response.data as any).completedSteps)) {
          const completedSteps = (response.data as any).completedSteps;
          if (completedSteps.includes(4)) {

            setCompletedSteps(completedSteps);
            return;
          } else {

          }
        }
      } catch (apiError) {

      }

      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps)) {

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

  const applyPhoneNumbersForGig = useCallback(
    (gigId: string, numbers: PhoneNumber[]) => {
      const normalizedGigId = normalizeGigId(gigId);
      if (!normalizedGigId || numbers.length === 0) return;
      setSelectedGigId(normalizedGigId);
      setPhoneNumbers(numbers);
      markGigStepDone(normalizedGigId, 'telephony', true);
      onNextStepReadyChange?.(true);
    },
    [onNextStepReadyChange]
  );

  const syncCompanyPhoneNumbers = useCallback(async () => {
    if (!companyId) return;
    try {
      const result = await phoneNumberService.listPhoneNumbersByCompany(companyId);
      if (result?.hasNumber && Array.isArray(result.numbers) && result.numbers.length > 0) {
        const first = result.numbers[0] as PhoneNumber & { gigId?: string };
        const gigId = normalizeGigId(result.gigId) || normalizeGigId(first?.gigId);
        if (gigId) {
          applyPhoneNumbersForGig(gigId, result.numbers as PhoneNumber[]);
        }
      }
    } catch (error) {
      console.warn('Company phone sync skipped:', error);
    }
  }, [companyId, applyPhoneNumbersForGig]);

  const fetchGigs = async () => {
    if (!companyId || fetchingGigsRef.current) return;

    fetchingGigsRef.current = true;
    try {
      setIsLoadingGigs(true);

      const response = await axios.get(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`);

      const responseData = response.data as { data: Gig[] };
      if (responseData && Array.isArray(responseData.data)) {
        const normalizedGigs = responseData.data.map((gig) => ({
          ...gig,
          _id: normalizeGigId(gig._id),
        }));
        setGigs(normalizedGigs);
      } else {
        setGigs([]);
      }

      await syncCompanyPhoneNumbers();
    } catch (error) {
      console.error('❌ Error fetching gigs:', error);
      setGigs([]);
    } finally {
      setIsLoadingGigs(false);
      fetchingGigsRef.current = false;
    }
  };

  const fetchExistingNumbers = async () => {
    try {
      const gigId = normalizeGigId(selectedGigId);
      if (!gigId) {
        setPhoneNumbers([]);
        return;
      }

      const result = await phoneNumberService.listPhoneNumbers(gigId);

      if (result?.hasNumber && result.numbers && Array.isArray(result.numbers)) {
        setPhoneNumbers(result.numbers);
        if (result.numbers.length > 0) {
          markGigStepDone(gigId, 'telephony', true);
          onNextStepReadyChange?.(true);
        }
      } else if (companyId) {
        await syncCompanyPhoneNumbers();
      } else {
        setPhoneNumbers([]);
        onNextStepReadyChange?.(false);
      }
    } catch (error) {
      console.error('❌ Error checking gig numbers:', error);
      setPhoneNumbers([]);
      onNextStepReadyChange?.(false);
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

    setIsSearchingNumbers(true);
    try {
      const data = await phoneNumberService.searchPhoneNumbers(zone, provider);
      setAvailableNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching numbers:', error);
      setAvailableNumbers([]);
    } finally {
      setIsSearchingNumbers(false);
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
        type: options?.type,
        paymentId: (options as any)?.paymentId,
      };



      const response = await phoneNumberService.purchasePhoneNumber(purchaseData);


      if (!response || (response as any).error) {
        const errorMessage = (response as any)?.message || (response as any)?.error || 'Failed to purchase number';
        throw new Error(errorMessage);
      }


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

      if (selectedGigId) {
        markGigStepDone(selectedGigId, 'telephony', true);
      }

      // --- Auto-Complete Onboarding Step 4 Here ---

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

      } catch (apiError) {

        try {
          const response = await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/4`,
            { status: 'completed' }
          );

        } catch (stepError) {

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

        }

        // 2. Create Bundle
        const bundle = await phoneNumberService.createTwilioBundle({
          friendlyName: `France: Local - Business`,
          email: 'chafik.sabiry@aiagentsco.tech',
          regulationSid: regulationSid,
          isoCountry: destinationZone
        });
        const bundleSid = bundle.sid;


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

            await phoneNumberService.assignItemToBundle(bundleSid, doc.sid);
          }
        }

        // 5. Submit Bundle
        await phoneNumberService.submitTwilioBundle(bundleSid);


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

        } else {

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

  const handleConfirmPurchase = async (
    sids?: { bundleSid?: string; addressSid?: string; paymentId?: string },
    phoneNumberOverride?: string,
    type?: string
  ) => {
    const numberToPurchase = phoneNumberOverride || selectedNumber;
    if (!numberToPurchase) return;


    setPurchaseStatus('purchasing');
    try {
      // Filter out empty strings and merge with default twilioRegulatorySids
      const purchaseSids: any = {
        ...twilioRegulatorySids,
        ...(sids?.bundleSid ? { bundleSid: sids.bundleSid } : {}),
        ...(sids?.addressSid ? { addressSid: sids.addressSid } : {}),
        ...(sids?.paymentId ? { paymentId: sids.paymentId } : {}),
        type: type // Include the type
      };

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
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{t('telephonySetup.title')}</h1>
            <p className="text-[14px] font-medium text-white/90">{t('telephonySetup.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 self-start">
            {completedSteps.includes(4) && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
        </div>
        {/* Abstract background pattern */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
      </div>

      {cookieError && (
        <div className="rounded-xl bg-red-50/70 border border-red-100 p-4 mx-1 shadow-sm">
          <div className="flex text-[14px]">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div className="ml-3">
              <h3 className="font-bold text-red-800 uppercase tracking-widest text-[12px]">{t('telephonySetup.errors.configurationTitle')}</h3>
              <p className="mt-1 text-red-700 font-medium">{t('telephonySetup.errors.companyIdMissing')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section: Select Gig — HARX premium card */}
      <div className="group/card relative overflow-hidden bg-white rounded-2xl border border-harx-100/70 p-6 pl-9 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(255,77,77,0.12)] hover:shadow-[0_1px_3px_rgba(15,23,42,0.05),0_22px_44px_-14px_rgba(255,77,77,0.28)] transition-shadow duration-500">
        {/* Vertical HARX accent bar */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-harx-500 via-harx-alt-500 to-harx-600 rounded-l-2xl" />
        {/* Soft decorative HARX glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-harx-500/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em]">{t('telephonySetup.selectGigProfile')}</span>
              <span className="inline-flex items-center px-2 py-[3px] rounded-md bg-gradient-to-r from-harx-50 to-harx-alt-50 text-harx-700 text-[10px] font-extrabold uppercase tracking-[0.12em] border border-harx-100 shadow-sm">
                {t('telephonySetup.required')}
              </span>
            </div>
          </div>
          <p className="text-[13.5px] text-gray-500 mb-5 leading-relaxed">{t('telephonySetup.associateGig')}</p>

          {isLoadingGigs ? (
            <div
              className="w-full h-14 rounded-2xl flex items-center justify-center border border-harx-900/40"
              style={{ background: 'linear-gradient(135deg, #1a0c10 0%, #2b0f17 50%, #3a0f1f 100%)' }}
            >
              <div className="animate-spin h-4 w-4 border-2 border-harx-300/40 border-t-harx-400 rounded-full mr-3" />
              <span className="text-[12px] font-bold text-white/70 uppercase tracking-[0.15em]">{t('telephonySetup.hydratingProfiles')}</span>
            </div>
          ) : (
            <div className="relative">
              {/* Trigger — HARX-tinted dark pill with gradient border accent */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ background: 'linear-gradient(135deg, #1a0c10 0%, #2b0f17 55%, #3a0f1f 100%)' }}
                className={`group/trigger relative flex items-center justify-between w-full px-4 py-3.5 rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isDropdownOpen
                    ? 'border-harx-500/70 shadow-[0_20px_50px_-20px_rgba(255,77,77,0.6)] ring-4 ring-harx-500/15'
                    : 'border-harx-900/60 hover:border-harx-500/50 hover:shadow-[0_18px_40px_-20px_rgba(236,72,153,0.5)]'
                }`}
              >
                {/* Subtle HARX glow trailing the right side */}
                <span className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-harx-500/20 rounded-full blur-3xl" />
                <span className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 bg-harx-alt-500/15 rounded-full blur-3xl" />

                <div className="relative flex items-center gap-3 min-w-0">
                  {selectedGigId ? (
                    (() => {
                      const sel = gigs.find((g: Gig) => g._id === selectedGigId);
                      if (!sel) {
                        return (
                          <>
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10">
                              <Briefcase className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[14px] text-white/50 font-semibold">
                              {t('telephonySetup.selectIntelligenceProfile')}
                            </span>
                          </>
                        );
                      }
                      return (
                        <>
                          <div className="relative shrink-0">
                            <FlagBadge
                              flags={sel.destination_zone?.flags}
                              iso={sel.destination_zone?.cca2}
                              name={sel.destination_zone?.name?.common}
                              size="sm"
                              className="ring-1 ring-white/20"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#2b0f17] shadow" />
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="text-[15px] font-extrabold text-white leading-tight tracking-tight truncate max-w-[280px]">
                              {sel.title}
                            </span>
                            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] leading-none mt-1 bg-gradient-harx bg-clip-text text-transparent">
                              {sel.destination_zone?.name?.common || t('telephonySetup.globalZone')}
                            </span>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10">
                        <Briefcase className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-[14px] text-white/50 font-semibold">
                        {t('telephonySetup.chooseActiveGigProfile')}
                      </span>
                    </>
                  )}
                </div>

                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                    isDropdownOpen
                      ? 'bg-gradient-harx text-white shadow-[0_8px_20px_-6px_rgba(255,77,77,0.6)]'
                      : 'bg-white/5 text-white/60 group-hover/trigger:bg-harx-500/20 group-hover/trigger:text-harx-200'
                  }`}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown menu — matching HARX-tinted dark panel, items as rounded cells */}
              {isDropdownOpen && (
                <>
                  <button
                    type="button"
                    aria-label="close"
                    onClick={() => setIsDropdownOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div
                    style={{ background: 'linear-gradient(180deg, #1a0c10 0%, #220d14 50%, #2b0f17 100%)' }}
                    className="absolute z-50 top-full left-0 right-0 mt-2 border border-harx-900/60 rounded-2xl shadow-[0_30px_80px_-20px_rgba(255,77,77,0.35),0_0_0_1px_rgba(255,77,77,0.08)] max-h-96 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    {/* Soft HARX glows */}
                    <div className="pointer-events-none absolute -top-20 right-0 w-72 h-40 bg-harx-500/25 rounded-full blur-3xl" />
                    <div className="pointer-events-none absolute -top-20 left-0 w-72 h-40 bg-harx-alt-500/20 rounded-full blur-3xl" />

                    {/* Header with HARX gradient underline */}
                    <div className="relative px-4 py-2.5 border-b border-harx-900/60 flex items-center justify-between">
                      <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] bg-gradient-harx bg-clip-text text-transparent">
                        {t('telephonySetup.chooseActiveGigProfile')}
                      </span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest tabular-nums">
                        {gigs.length} {gigs.length > 1 ? 'profils' : 'profil'}
                      </span>
                      <span className="pointer-events-none absolute left-4 right-4 -bottom-px h-px bg-gradient-to-r from-transparent via-harx-500/60 to-transparent" />
                    </div>

                    <div className="relative overflow-y-auto max-h-[20rem] p-2 space-y-1">
                      {gigs.length > 0 ? (
                        gigs.map((g: Gig) => {
                          const isActive = selectedGigId === g._id;
                          return (
                            <button
                              key={g._id}
                              onClick={() => {
                                setSelectedGigId(g._id);
                                setIsDropdownOpen(false);
                              }}
                              className={`relative flex items-center justify-between w-full px-3 py-2.5 text-left rounded-xl transition-all duration-200 group overflow-hidden ${
                                isActive
                                  ? 'bg-gradient-harx shadow-[0_10px_30px_-10px_rgba(255,77,77,0.7)]'
                                  : 'hover:bg-white/[0.05]'
                              }`}
                            >
                              <div className="relative flex items-center gap-3 min-w-0">
                                <FlagBadge
                                  flags={g.destination_zone?.flags}
                                  iso={g.destination_zone?.cca2}
                                  name={g.destination_zone?.name?.common}
                                  className={isActive ? 'ring-2 ring-white/60 shadow-md' : 'ring-1 ring-white/10'}
                                />

                                <div className="flex flex-col min-w-0">
                                  <span
                                    className={`text-[14px] font-bold tracking-tight truncate transition-colors duration-200 ${
                                      isActive ? 'text-white' : 'text-white/90 group-hover:text-white'
                                    }`}
                                  >
                                    {g.title}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                      className={`text-[9.5px] font-extrabold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded transition-colors ${
                                        isActive
                                          ? 'bg-white/25 text-white'
                                          : 'bg-white/5 text-white/55 group-hover:bg-harx-500/20 group-hover:text-harx-200'
                                      }`}
                                    >
                                      {g.destination_zone?.name?.common || t('telephonySetup.unknownRegion')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="relative flex items-center pl-3 shrink-0">
                                {isActive ? (
                                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.25)] animate-in zoom-in duration-300">
                                    <CheckCircle className="h-3.5 w-3.5 text-harx-500" />
                                  </div>
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-harx-300 group-hover:translate-x-0.5 transition-all" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-8 py-14 text-center">
                          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <Globe className="h-6 w-6 text-white/30" />
                          </div>
                          <p className="text-[12px] text-white/40 font-bold uppercase tracking-[0.15em]">
                            {t('telephonySetup.noGlobalProfilesFound')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Main Content (Provider + Numbers) - Only show when gigs are loaded */}
      {!isLoadingGigs && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150 fill-mode-both">
          {/* Section: Select Provider — hidden: Twilio is enforced as the only carrier */}

          {/* Section: Phone Nodes — matching HARX premium card */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-harx-100/70 p-6 pl-9 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(255,77,77,0.12)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-harx-500 via-harx-alt-500 to-harx-600 rounded-l-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-12 w-48 h-48 bg-harx-alt-500/10 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em]">{t('telephonySetup.networkEntries')}</span>
                {destinationZone && selectedGigId && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-harx-50 to-harx-alt-50 border border-harx-100 shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${isQuotaReached ? 'bg-emerald-500' : 'bg-harx-500 animate-pulse'}`} />
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] tabular-nums bg-gradient-harx bg-clip-text text-transparent">
                      {purchasedNumbersCount} / {teamSize} {t('telephonySetup.active')}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[13.5px] text-gray-500 mb-6 leading-relaxed">{t('telephonySetup.provisionNodes')}</p>

            {/* Combined Active & Available List */}
            <div className="space-y-4">
              {/* Active Numbers */}
              {Array.isArray(phoneNumbers) && phoneNumbers.filter(n => n.provider === provider).map((number: any) => (
                <div key={number.phoneNumber} className="flex items-center justify-between p-5 rounded-xl border border-harx-100/60 bg-gradient-to-br from-white to-harx-50/30 hover:from-white hover:to-harx-50/60 hover:border-harx-300/60 hover:shadow-[0_18px_40px_-18px_rgba(255,77,77,0.35)] transition-all duration-500 group">
                  <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-harx-50 to-harx-alt-50 border border-harx-100 flex items-center justify-center group-hover:bg-gradient-harx group-hover:border-transparent transition-all duration-500 shadow-sm">
                      <Phone className="h-6 w-6 text-harx-500 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[18px] font-black text-gray-900 group-hover:text-harx-700 transition-colors tracking-tight">{number.phoneNumber}</span>
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] italic">{number.metadata?.type || t('telephonySetup.static')} {t('telephonySetup.infrastructure')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-1.5 text-[11px] font-black uppercase rounded-lg border shadow-sm transition-all ${number.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white'
                        : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                      }`}>
                      {number.status === 'active' ? t('telephonySetup.operational') : t('telephonySetup.syncing')}
                    </span>
                  </div>
                </div>
              ))}

              {/* Available Numbers (If searched) */}
              {Array.isArray(availableNumbers) && availableNumbers.length > 0 && (
                <div className="space-y-3 mt-6">
                  <div className="flex items-center space-x-3 text-[11px] uppercase font-black tracking-widest text-gray-300">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-harx-200/60 to-transparent" />
                    <span className="flex items-center space-x-2 bg-gradient-harx bg-clip-text text-transparent">
                      <Globe className="h-3 w-3 text-harx-400" />
                      <span>{t('telephonySetup.regionalNodesAvailable')}</span>
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-harx-200/60 to-transparent" />
                  </div>
                  {availableNumbers.map((number) => {
                    const phoneNumber = getPhoneNumber(number);
                    const isDisabled = isQuotaReached;
                    return (
                      <div key={phoneNumber} className="flex items-center justify-between p-4 rounded-xl border border-harx-100/50 bg-white hover:border-harx-400 hover:shadow-[0_18px_40px_-18px_rgba(255,77,77,0.35)] transition-all group animate-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-3">
                            <span className="text-[18px] font-black text-gray-900 group-hover:text-harx-600 transition-colors tracking-tight">{phoneNumber}</span>
                            <span className="text-[10px] font-black text-harx-600 bg-harx-50 border border-harx-100 px-2 py-0.5 rounded uppercase tracking-widest">{number.type}</span>
                          </div>
                          <span className="text-[12px] font-bold text-gray-400 uppercase italic mt-1 leading-none">{number.locality || t('telephonySetup.regional')} {t('telephonySetup.globalGateway')}</span>
                        </div>
                        <button
                          disabled={isDisabled}
                          onClick={() => {
                            setPurchaseResponse(null);
                            setPurchaseError(null);
                            setSelectedNumber(phoneNumber);
                            setPurchaseStatus('confirming');
                            setPurchaseType(number.type);
                            setShowPurchaseModal(true);
                          }}
                          className={`px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${isDisabled
                              ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-200'
                              : 'bg-gradient-harx text-white hover:shadow-[0_12px_30px_-8px_rgba(255,77,77,0.6)] active:scale-95'
                            }`}
                        >
                          {t('telephonySetup.purchase')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Centered Empty State */}
              {(!phoneNumbers || phoneNumbers.filter(n => n.provider === provider).length === 0) && (!availableNumbers || availableNumbers.length === 0) && (
                <div className="py-16 flex flex-col items-center text-center animate-in fade-in duration-700">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-harx-50 to-harx-alt-50 border border-harx-100 shadow-sm" />
                    <div className="absolute -inset-1 rounded-full bg-gradient-harx opacity-15 blur-md animate-pulse" />
                    <div className="relative w-full h-full flex items-center justify-center">
                      <Phone className="h-7 w-7 text-harx-400" />
                    </div>
                  </div>
                  <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 leading-none">{t('telephonySetup.empty.title')}</h4>
                  <p className="text-[14px] text-gray-400 font-medium mb-8 max-w-[320px]">{t('telephonySetup.empty.subtitle')}</p>
                  <button
                    onClick={() => searchAvailableNumbers()}
                    disabled={!destinationZone || isSearchingNumbers}
                    title={!destinationZone ? t('telephonySetup.empty.noZone') : undefined}
                    className="group relative inline-flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-harx text-white text-[12px] font-black uppercase tracking-widest shadow-[0_12px_30px_-8px_rgba(255,77,77,0.45)] hover:shadow-[0_18px_44px_-8px_rgba(255,77,77,0.65)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-300"
                  >
                    {isSearchingNumbers ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                        <span>{t('telephonySetup.empty.scanning')}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 text-white transition-transform group-hover:rotate-180 duration-1000" />
                        <span>{t('telephonySetup.empty.scan')}</span>
                      </>
                    )}
                  </button>
                  {!destinationZone && (
                    <p className="mt-3 text-[11px] font-medium text-amber-500 uppercase tracking-widest">
                      {t('telephonySetup.empty.noZone')}
                    </p>
                  )}
                </div>
              )}
            </div>
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
        trialEligible={trialInfo?.eligible ?? false}
        trialDurationDays={trialInfo?.trialDurationDays ?? 15}
        companyId={companyId || ''}
        gigId={selectedGigId || ''}
        apiBaseUrl={BASE_URL}
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
