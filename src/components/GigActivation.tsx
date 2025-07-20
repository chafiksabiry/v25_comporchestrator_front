import React, { useState } from 'react';
import { Rocket, CheckCircle, AlertCircle, Play, Pause, Settings } from 'lucide-react';

const GigActivation = () => {
  const [isActivating, setIsActivating] = useState(false);
  const [activationStatus, setActivationStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');

  const handleActivateGigs = async () => {
    setIsActivating(true);
    setActivationStatus('in_progress');
    
    // Simuler le processus d'activation
    setTimeout(() => {
      setActivationStatus('completed');
      setIsActivating(false);
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gig Activation</h1>
        <p className="text-gray-600">
          Launch your multi-channel operations and start engaging with your leads
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activation Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Rocket className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Activation Status</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">System Check</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Configuration Validation</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">REP Assignment</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Lead Distribution</span>
              {activationStatus === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : activationStatus === 'in_progress' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Activation Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Activation Controls</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Ready to Launch</h3>
              <p className="text-sm text-blue-700">
                All systems are configured and ready for activation. Click the button below to start your multi-channel operations.
              </p>
            </div>
            
            <button
              onClick={handleActivateGigs}
              disabled={isActivating || activationStatus === 'completed'}
              className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                activationStatus === 'completed'
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : isActivating
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {activationStatus === 'completed' ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Activation Complete
                </>
              ) : isActivating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Activating...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Activate Gigs
                </>
              )}
            </button>
            
            {activationStatus === 'completed' && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Gigs successfully activated! Your operations are now live.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Activation Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">3</div>
            <div className="text-sm text-gray-600">Active Gigs</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">5</div>
            <div className="text-sm text-gray-600">Assigned REPS</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">150</div>
            <div className="text-sm text-gray-600">Leads Ready</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigActivation; 