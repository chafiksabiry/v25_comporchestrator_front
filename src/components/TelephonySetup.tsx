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
  Search
} from 'lucide-react';
import Cookies from 'js-cookie';

import { phoneNumberService } from '../services/api';
import type { AvailablePhoneNumber } from '../services/api';

const gigId = import.meta.env.DEV ? '683083e7af226bea2d459372' : Cookies.get('gigId');
const companyId = Cookies.get('companyId');

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: string[];
}

interface TelephonySetupProps {
  onBackToOnboarding?: () => void;
}

const TelephonySetup = ({ onBackToOnboarding }: TelephonySetupProps) => {
  const [provider, setProvider] = useState('telnyx');
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [destinationZone, setDestinationZone] = useState('');
  const [callRecording, setCallRecording] = useState(true);
  const [voicemail, setVoicemail] = useState(true);
  const [callRouting, setCallRouting] = useState('round-robin');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testMode, setTestMode] = useState(true);
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

    // Load existing numbers and destination zone on startup
    fetchExistingNumbers();
    fetchDestinationZone();
    
    // Vérifier l'état des étapes complétées au chargement
    checkCompletedSteps();
  }, [companyId]);

  const checkCompletedSteps = async () => {
    try {
      if (!companyId) return;
      
      // Vérifier l'état de l'étape 5 (Telephony Setup)
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`
      );

      // Fix: Ensure response.data is typed and has 'status' property
      const stepStatus = (response.data as { status?: string })?.status;
      if (stepStatus === 'completed') {
        setCompletedSteps((prev: number[]) => {
          if (!prev.includes(5)) {
            return [...prev, 5];
          }
          return prev;
        });
      }
      
      // Vérifier aussi le localStorage pour la cohérence
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

  const fetchExistingNumbers = async () => {
    try {
      const data = await phoneNumberService.listPhoneNumbers();
      setPhoneNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
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
      const data = await response.json();
      console.log(data.data.code);
      setDestinationZone(data.data.code);
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
    
    setIsLoading(true);
    try {
      const data = await phoneNumberService.searchPhoneNumbers(destinationZone, provider);
      setAvailableNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching numbers:', error);
      setAvailableNumbers([]);
    }
    setIsLoading(false);
  };

  const purchaseNumber = async (phoneNumber: string) => {
    if (!gigId) {
      console.error('gigId is required to purchase a phone number');
      return;
    }

    try {
      await phoneNumberService.purchasePhoneNumber(phoneNumber, provider, gigId);
      fetchExistingNumbers(); // Refresh the list after purchase
      setIsSearchOpen(false); // Close the search
    } catch (error) {
      console.error('Error purchasing number:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      // Vérifier que companyId est disponible
      if (!companyId) {
        console.error('Company ID not found in cookies');
        throw new Error('Company ID not found. Please refresh the page and try again.');
      }

      const response = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`,
        { status: 'completed' }
      );
      
      console.log('✅ Telephony setup step 5 marked as completed:', response.data);
      
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
                : 'bg-green-100 text-green-800'
            }`}
            onClick={() => setTestMode(!testMode)}
          >
            {testMode ? 'Test Mode' : 'Production Mode'}
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
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700"
          >
            {isSearchOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            <span>{isSearchOpen ? 'Hide Search' : 'Search Numbers'}</span>
          </button>
        </div>

        {/* Search Panel */}
        {isSearchOpen && (
          <div className="mb-6 space-y-4 border-b pb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={searchAvailableNumbers}
                disabled={isLoading || !destinationZone}
                className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Searching...' : 'Search Numbers'}
              </button>
            </div>

            {/* Available Numbers List */}
            {Array.isArray(availableNumbers) && availableNumbers.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Available Numbers</h4>
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
            )}
          </div>
        )}

        {/* Existing Numbers List */}
        <div className="space-y-4">
          {Array.isArray(phoneNumbers) && phoneNumbers.map((number) => (
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
                onChange={(e) => setCallRouting(e.target.value)}
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
                onChange={(e) => setWebhookUrl(e.target.value)}
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
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, encryption: e.target.checked }))}
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
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, monitoring: e.target.checked }))}
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