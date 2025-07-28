import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';

const ZohoCallback = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const location = urlParams.get('location');
        const accountsServer = urlParams.get('accounts-server');
        
        const userId = Cookies.get('userId');
        
        if (!userId) {
          throw new Error('User ID not found');
        }

        if (!code) {
          throw new Error('Authorization code not found');
        }

        const queryParams = new URLSearchParams({
          code,
          userId,
          ...(location && { location }),
          ...(accountsServer && { accountsServer })
        }).toString();

        const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/auth/callback?${queryParams}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Cookies.get('gigId')}:${userId}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to exchange code for tokens');
        }

        const data = await response.json();
        console.log('Callback response:', data);

        if (!data.access_token || !data.refresh_token || !data.expires_in) {
          throw new Error('Missing required fields in Zoho response');
        }

        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);

        toast.success('Successfully connected to Zoho CRM');

        setTimeout(() => {
          // DISABLED: window.location.href = '/app11?startStep=6';
        console.log('🔄 Zoho callback navigation disabled - would have gone to /app11?startStep=6');
        }, 3000);

      } catch (error: any) {
        console.error('Error handling Zoho callback:', error);
        toast.error(error.message || 'Failed to complete Zoho authentication');
        setTimeout(() => {
          // DISABLED: window.location.href = '/app11';
        console.log('🔄 Zoho callback navigation disabled - would have gone to /app11');
        }, 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">Zoho Authentication Successful!</h2>
        <p className="mt-2 text-sm text-gray-500">You will be redirected to the main application in a few seconds...</p>
        {accessToken && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Access Token:</p>
            <p className="mt-1 text-xs text-gray-500 break-all">{accessToken}</p>
            <p className="mt-4 text-sm font-medium text-gray-700">Refresh Token:</p>
            <p className="mt-1 text-xs text-gray-500 break-all">{refreshToken}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZohoCallback; 