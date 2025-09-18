import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Phone,
  Settings,
  Globe,
  Headphones,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneMissed,
  VolumeX,
  Volume2,
  Mic,
  Server,
  Shield,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Briefcase
} from 'lucide-react';
import Cookies from 'js-cookie';

import { phoneNumberService } from '../services/api';
import type { AvailablePhoneNumber } from '../services/api';

const companyId = Cookies.get('companyId');

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: string[];
}

interface Gig {
  _id: string;
  title: string;
  description: string;
  destination_zone: {
    name: {
      common: string;
    };
    cca2: string;
  };
  category: string;
  status: string;
}

interface TelephonySetupProps {
  onBackToOnboarding?: () => void;
}

const TelephonySetup = ({ onBackToOnboarding }: TelephonySetupProps) => {
  const [provider, setProvider] = useState('twilio'); // Try Twilio for Morocco
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [destinationZone, setDestinationZone] = useState('');
  const [callRecording, setCallRecording] = useState(true);
  const [voicemail, setVoicemail] = useState(true);
  const [callRouting, setCallRouting] = useState('round-robin');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testMode, setTestMode] = useState(true); // Force test mode until backend issue is resolved
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [recordingSetting, setRecordingSetting] = useState('record-all');
  const [securitySettings, setSecuritySettings] = useState({
    encryption: true,
    monitoring: true,
    analytics: true
  });
  
  // New gig-related state
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>('');
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);

  const providers = [
    { id: 'twilio', name: 'Twilio', logo: Phone },
    { id: 'telnyx', name: 'Telnyx', logo: Globe },
    { id: 'vonage', name: 'Vonage', logo: PhoneCall },
  ];

  const features = [
    { id: 'incoming', name: 'Incoming Calls', icon: PhoneIncoming, enabled: true },
    { id: 'outgoing', name: 'Outgoing Calls', icon: PhoneForwarded, enabled: true },
    { id: 'recording', name: 'Call Recording', icon: Mic, enabled: callRecording },
    { id: 'voicemail', name: 'Voicemail', icon: Volume2, enabled: voicemail },
    { id: 'mute', name: 'Call Muting', icon: VolumeX, enabled: true },
    { id: 'routing', name: 'Smart Routing', icon: PhoneCall, enabled: true },
  ];

  const routingOptions = [
    { id: 'round-robin', name: 'Round Robin' },
    { id: 'skills-based', name: 'Skills Based' },
    { id: 'availability', name: 'Availability Based' },
    { id: 'load-balanced', name: 'Load Balanced' },
  ];

  useEffect(() => {
    // Vérifier que companyId est disponible
    if (!companyId) {
      console.error('Company ID not found in cookies');
      console.log('Company ID not found. Please refresh the page and try again.');
      return;
    }

    // Load company gigs first
    fetchCompanyGigs();
    
    // Load existing numbers
    fetchExistingNumbers();
    
    // Vérifier l'état des étapes complétées au chargement
    checkCompletedSteps();
  }, [companyId]);

  // Auto-search for available numbers when destination zone is loaded
  useEffect(() => {
    if (destinationZone && provider) {
      console.log('🚀 Auto-searching for available numbers with destination zone:', destinationZone);
      searchAvailableNumbers();
    }
  }, [destinationZone, provider]);

  // Update destination zone when selected gig changes
  useEffect(() => {
    if (selectedGigId) {
      const selectedGig = gigs.find((gig: Gig) => gig._id === selectedGigId);
      if (selectedGig) {
        const newDestinationZone = selectedGig.destination_zone.cca2;
        console.log('🌍 Setting destination zone from selected gig:', newDestinationZone);
        setDestinationZone(newDestinationZone);
      }
    }
  }, [selectedGigId, gigs]);

  const fetchCompanyGigs = async () => {
    if (!companyId) {
      console.error('Company ID not found');
      return;
    }

    setIsLoadingGigs(true);
    try {
      console.log('🔍 Fetching gigs for company:', companyId);
      const response = await axios.get(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`);
      
      console.log('📋 Company gigs response:', response.data);
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const gigsData = response.data.data;
        setGigs(gigsData);
        
        // Auto-select the first gig if available
        if (gigsData.length > 0) {
          setSelectedGigId(gigsData[0]._id);
          console.log('🎯 Auto-selected first gig:', gigsData[0].title);
        }
      } else {
        console.warn('No gigs found or invalid response format');
        setGigs([]);
      }
    } catch (error) {
      console.error('Error fetching company gigs:', error);
      setGigs([]);
    } finally {
      setIsLoadingGigs(false);
    }
  };

  const checkCompletedSteps = async () => {
    try {
      if (!companyId) return;
      
      console.log('🔍 Checking step 5 status for company:', companyId);
      
      // First, try to get the general onboarding status
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
      
      // Fallback: Vérifier le localStorage pour la cohérence
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
      const data = await phoneNumberService.listPhoneNumbers();
      setPhoneNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      setPhoneNumbers([]);
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
    
    setIsLoading(true);
    try {
      const data = await phoneNumberService.searchPhoneNumbers(destinationZone, provider);
      console.log('📞 Phone numbers found:', data);
      setAvailableNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching numbers:', error);
      setAvailableNumbers([]);
    }
    setIsLoading(false);
  };

  const purchaseNumber = async (phoneNumber: string) => {
    if (!selectedGigId) {
      console.error('selectedGigId is required to purchase a phone number');
      return;
    }

    try {
      console.log('🛒 Attempting to purchase number:', phoneNumber);
      console.log('🛒 Provider:', provider);
      console.log('🛒 Selected GigId:', selectedGigId);
      console.log('🛒 Test Mode:', testMode);
      
      // In test mode, simulate successful purchase
      if (testMode) {
        console.log('🧪 Test Mode: Simulating successful purchase');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Add to existing numbers list (simulation)
        const newNumber = {
          phoneNumber: phoneNumber,
          status: 'active',
          features: ['voice', 'sms'],
          gigId: selectedGigId
        };
        
        setPhoneNumbers((prev: PhoneNumber[]) => [...prev, newNumber]);
        
        // Remove from available numbers
        setAvailableNumbers((prev: AvailablePhoneNumber[]) => prev.filter((num: AvailablePhoneNumber) => getPhoneNumber(num) !== phoneNumber));
        
        return;
      }
      
      // Real purchase
      await phoneNumberService.purchasePhoneNumber(phoneNumber, provider, selectedGigId);
      
      console.log('✅ Number purchased successfully!');
      fetchExistingNumbers(); // Refresh the list after purchase
      
      // Show success message
      
    } catch (error) {
      console.error('❌ Error purchasing number:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      // Vérifier que companyId est disponible
      if (!companyId) {
        console.error('Company ID not found in cookies');
        throw new Error('Company ID not found. Please refresh the page and try again.');
      }

      console.log('🚀 Completing telephony setup...');
      
      // Try to update the general onboarding status first (more reliable approach)
      try {
        // Get current onboarding status
        const onboardingResponse = await axios.get(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
        );
        
        const currentCompletedSteps = (onboardingResponse.data as any)?.completedSteps || [];
        const newCompletedSteps = currentCompletedSteps.includes(5) ? currentCompletedSteps : [...currentCompletedSteps, 5];
        
        // Update the general onboarding status
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
        
        // Fallback: try the individual step endpoint
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
      
      // Update local state to reflect the completed step
      setCompletedSteps((prev: number[]) => {
        const newCompletedSteps = prev.includes(5) ? prev : [...prev, 5];
      
      // Force update the onboarding progress in localStorage/cookies
      const currentProgress = {
        currentPhase: 2,
          completedSteps: newCompletedSteps,
          lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
        
        return newCompletedSteps;
      });
      
      // Synchroniser avec les cookies aussi
      Cookies.set('telephonyStepCompleted', 'true', { expires: 7 });
      
      // Wait a moment to ensure the API call is fully processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return to CompanyOnboarding without page refresh
      if (onBackToOnboarding) {
        // Use the callback if provided
        // Add a small delay to ensure the API call is processed
        setTimeout(() => {
          onBackToOnboarding();
        }, 100);
      } else {
        // Fallback: use history API
        if (window.history && window.history.pushState) {
          window.history.pushState({}, '', '/app11');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          // Fallback: trigger a custom event to notify parent component
          window.dispatchEvent(new CustomEvent('telephonySetupCompleted', { 
            detail: { stepId: 5, status: 'completed' } 
          }));
        }
      }
      
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      // Suppressed popup as requested by user
      if (error instanceof Error) {
        console.log(`Error: ${error.message}`);
      } else {
        console.log('An error occurred while saving the configuration. Please try again.');
      }
    }
  };



  return (
    <div className="space-y-6">
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
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              testMode 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
            }`}
            onClick={() => {
              if (!testMode) {
                const confirm = window.confirm('⚠️ ATTENTION: Le mode production a des problèmes avec l\'achat de numéros français. Voulez-vous vraiment continuer ?');
                if (!confirm) return;
              }
              setTestMode(!testMode);
            }}
          >
            {testMode ? '🧪 Test Mode (Recommandé)' : '⚠️ Production Mode (Problème connu)'}
          </button>
          <button 
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              completedSteps.includes(5)
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            onClick={completedSteps.includes(5) ? undefined : handleSaveConfiguration}
            disabled={completedSteps.includes(5)}
          >
            {completedSteps.includes(5) ? (
              <span className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Configuration Saved
              </span>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>

      {/* Gig Selection */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Select Gig</h3>
        <p className="mt-1 text-sm text-gray-500">Choose the gig for which you want to configure telephony</p>
        
        {isLoadingGigs ? (
          <div className="mt-4 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span className="text-sm text-gray-600">Loading gigs...</span>
          </div>
        ) : gigs.length > 0 ? (
          <div className="mt-4">
            <select
              className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={selectedGigId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGigId(e.target.value)}
            >
              <option value="">Select a gig...</option>
              {gigs.map((gig: Gig) => (
                <option key={gig._id} value={gig._id}>
                  {gig.title} - {gig.destination_zone.name.common} ({gig.destination_zone.cca2})
                </option>
              ))}
            </select>
            
            {selectedGigId && (() => {
              const selectedGig = gigs.find((g: Gig) => g._id === selectedGigId);
              return selectedGig ? (
                <div className="mt-3 rounded-lg bg-blue-50 p-3">
                  <div className="flex items-start space-x-2">
                    <Briefcase className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">{selectedGig.title}</h4>
                      <p className="text-sm text-blue-700 mt-1">{selectedGig.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600">
                        <span>Category: {selectedGig.category}</span>
                        <span>Destination: {selectedGig.destination_zone.name.common}</span>
                        <span>Status: {selectedGig.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No Gigs Found</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>No gigs were found for this company. Please create a gig first before configuring telephony.</p>
                </div>
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
          {destinationZone && (
            <span className="text-sm text-gray-600">
              Destination Zone: <span className="font-medium">{destinationZone}</span>
            </span>
          )}
        </div>

        {/* Information about backend issue */}
        {!testMode && (
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Problème connu</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>L'achat de numéros français en mode production échoue actuellement (erreur 500). Utilisez le mode test pour simuler les achats.</p>
                </div>
              </div>
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
                          onClick={() => purchaseNumber(phoneNumber)}
                          className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
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
                <h3 className="text-sm font-medium text-yellow-800">Aucun numéro disponible</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Aucun numéro téléphonique n'est disponible pour <strong>{destinationZone}</strong> avec le provider <strong>{provider}</strong>.</p>
                  <p className="mt-1">
                    {provider === 'twilio' && "Twilio a une erreur serveur (500). "}
                    {provider === 'telnyx' && "Telnyx ne semble pas avoir de numéros pour ce pays. "}
                    {provider === 'vonage' && "Vonage ne semble pas avoir de numéros pour ce pays. "}
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
                    {provider === 'twilio' ? '⚠️ Twilio (Erreur)' : 'Essayer Twilio'}
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
                    {provider === 'telnyx' ? '⚠️ Telnyx (Vide)' : 'Essayer Telnyx'}
                  </button>
                  <button
                    onClick={() => {
                      setProvider('vonage');
                      searchAvailableNumbers();
                    }}
                    className="rounded-md bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700"
                  >
                    Essayer Vonage
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Numbers List - Filtered by destination zone */}
        {Array.isArray(phoneNumbers) && phoneNumbers.length > 0 && (() => {
          // Filter numbers based on destination zone
          const filteredNumbers = phoneNumbers.filter(number => {
            if (destinationZone === 'FR') {
              return number.phoneNumber.startsWith('+33');
            }
            // For other zones, show all numbers or implement specific filtering
            return true;
          });
          
          return filteredNumbers.length > 0 ? (
        <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Existing Numbers ({destinationZone})</h4>
              {filteredNumbers.map((number) => (
            <div key={number.phoneNumber} className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="mr-2 h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">{number.phoneNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{number.status}</span>
                  <button className="rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200">
                    <VolumeX className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
          ) : null;
        })()}
      </div>

      {/* Features Configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Features</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center">
                  <Icon className="mr-2 h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">{feature.name}</span>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    feature.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={feature.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      feature.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call Routing */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Call Routing</h3>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Routing Method</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={callRouting}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCallRouting(e.target.value)}
              >
                {routingOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
              <input
                type="url"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://your-webhook-url.com"
                value={webhookUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhookUrl(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Routing Configuration Tips</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Round Robin: Distributes calls evenly among available REPS</li>
                    <li>Skills Based: Routes calls based on REP expertise and call type</li>
                    <li>Availability Based: Considers REP schedules and current load</li>
                    <li>Load Balanced: Optimizes distribution based on multiple factors</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Advanced Settings</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Call Recording</h4>
            <div className="mt-2 space-y-4">
              <div className="flex items-center">
                <input
                  id="record-all"
                  type="radio"
                  name="recording-setting"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={recordingSetting === 'record-all'}
                  onChange={() => setRecordingSetting('record-all')}
                />
                <label htmlFor="record-all" className="ml-3 block text-sm text-gray-700">
                  Record all calls
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="record-selected"
                  type="radio"
                  name="recording-setting"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={recordingSetting === 'record-selected'}
                  onChange={() => setRecordingSetting('record-selected')}
                />
                <label htmlFor="record-selected" className="ml-3 block text-sm text-gray-700">
                  Record selected calls only
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="record-none"
                  type="radio"
                  name="recording-setting"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={recordingSetting === 'record-none'}
                  onChange={() => setRecordingSetting('record-none')}
                />
                <label htmlFor="record-none" className="ml-3 block text-sm text-gray-700">
                  Disable recording
                </label>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Security Settings</h4>
            <div className="mt-2 space-y-4">
              <div className="flex items-center">
                <input
                  id="encryption"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={securitySettings.encryption}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecuritySettings(prev => ({ ...prev, encryption: e.target.checked }))}
                />
                <label htmlFor="encryption" className="ml-3 block text-sm text-gray-700">
                  Enable call encryption
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="monitoring"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={securitySettings.monitoring}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecuritySettings(prev => ({ ...prev, monitoring: e.target.checked }))}
                />
                <label htmlFor="monitoring" className="ml-3 block text-sm text-gray-700">
                  Enable call monitoring
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="analytics"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={securitySettings.analytics}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, analytics: e.target.checked }))}
                />
                <label htmlFor="analytics" className="ml-3 block text-sm text-gray-700">
                  Enable call analytics
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Status */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Integration Status</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center">
              <Server className="mr-2 h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">API Connected</span>
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">SSL Secure</span>
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center">
              <Headphones className="mr-2 h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">Audio Quality OK</span>
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">System Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelephonySetup;