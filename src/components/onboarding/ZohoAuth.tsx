import React, { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ZohoAuth = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initiateAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/auth`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Rediriger vers l'URL d'autorisation Zoho
          window.location.href = data.authUrl;
        } else {
          throw new Error('Failed to get Zoho auth URL');
        }
      } catch (error) {
        console.error('Error initiating Zoho auth:', error);
        toast.error('Failed to initiate Zoho authentication');
        setIsLoading(false);
      }
    };

    initiateAuth();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Database className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-900">Connecting to Zoho CRM</h2>
        <p className="mt-2 text-sm text-gray-500">
          {isLoading ? (
            "Please wait while we redirect you to Zoho's authentication page..."
          ) : (
            "There was an error connecting to Zoho. Please try again."
          )}
        </p>
        {!isLoading && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ZohoAuth; 