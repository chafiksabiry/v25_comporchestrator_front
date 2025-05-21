import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CompanyOnboarding from './CompanyOnboarding';
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
const gigId = import.meta.env.DEV ? '681b2b9297864fa3b948311f' : Cookies.get('gigId');
const companyId = Cookies.get('companyId');

interface PhoneNumber {
  phoneNumber: string;
  status: string;
  features: string[];
}

const TelephonySetup = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState('telnyx');
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [destinationZone, setDestinationZone] = useState('');
  const [callRecording, setCallRecording] = useState(true);
  const [voicemail, setVoicemail] = useState(true);
  const [callRouting, setCallRouting] = useState('round-robin');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showCompanyOnboarding, setShowCompanyOnboarding] = useState(false);

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
    // Load existing numbers and destination zone on startup
    fetchExistingNumbers();
    fetchDestinationZone();
  }, []);

  const fetchExistingNumbers = async () => {
    try {
      const data = await phoneNumberService.listPhoneNumbers();
      setPhoneNumbers(data);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const fetchDestinationZone = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${gigId}/destination-zone`);
      const data = await response.json();
      console.log(data.data.code);
      setDestinationZone(data.data.code);
    } catch (error) {
      console.error('Error fetching destination zone:', error);
    }
  };

  const searchAvailableNumbers = async () => {
    if (!destinationZone) {
      console.error('Destination zone not available');
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await phoneNumberService.searchPhoneNumbers(destinationZone);
      setAvailableNumbers(data);
    } catch (error) {
      console.error('Error searching numbers:', error);
    }
    setIsLoading(false);
  };

  const purchaseNumber = async (phoneNumber: string) => {
    try {
      await phoneNumberService.purchasePhoneNumber(phoneNumber);
      fetchExistingNumbers(); // Refresh the list after purchase
      setIsSearchOpen(false); // Close the search
    } catch (error) {
      console.error('Error purchasing number:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`,
        { status: 'completed' }
      );
      // Update local state to reflect the completed step
      setCompletedSteps(prev => [...prev, 5]);
      // Show CompanyOnboarding component
      setShowCompanyOnboarding(true);
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
    }
  };

  if (showCompanyOnboarding) {
    return <CompanyOnboarding />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Telephony Setup</h2>
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={handleSaveConfiguration}
          >
            Save Configuration
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
            {availableNumbers.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Available Numbers</h4>
                <div className="grid gap-2">
                  {availableNumbers.map((number: any) => (
                    <div key={number.phone_number} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="font-medium">{number.phone_number}</span>
                      <button
                        onClick={() => purchaseNumber(number.phone_number)}
                        className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                      >
                        Purchase
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Numbers List */}
        <div className="space-y-4">
          {phoneNumbers.map((number) => (
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
                  checked
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
                  checked
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
                  checked
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
                  checked
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