import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';

const ZohoCallback = () => {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const location = urlParams.get('location');
        const accountsServer = urlParams.get('accounts-server');
        
        // Récupérer le userId du localStorage ou des cookies
        const userId = localStorage.getItem('zoho_user_id') || Cookies.get('userId');
        
        if (!userId) {
          throw new Error('User ID not found');
        }

        if (!code) {
          throw new Error('Authorization code not found');
        }

        // Construire les paramètres de la requête
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

        // Stocker les tokens
        localStorage.setItem('zoho_access_token', data.access_token);
        localStorage.setItem('zoho_refresh_token', data.refresh_token);
        localStorage.setItem('zoho_token_expiry', (Date.now() + (data.expires_in * 1000)).toString());

        // Nettoyer le userId stocké
        localStorage.removeItem('zoho_user_id');

        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);

        toast.success('Successfully connected to Zoho CRM');

        // Attendre 3 secondes avant de rediriger
        setTimeout(() => {
          navigate('/contacts');
        }, 3000);

      } catch (error: any) {
        console.error('Error handling Zoho callback:', error);
        toast.error(error.message || 'Failed to complete Zoho authentication');
        navigate('/contacts');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">Zoho Authentication Successful!</h2>
        <p className="mt-2 text-sm text-gray-500">You will be redirected in a few seconds...</p>
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