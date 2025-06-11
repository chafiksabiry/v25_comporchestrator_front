import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ZohoCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Récupérer le code d'autorisation de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Envoyer le code au serveur
        const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/callback?code=${code}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for tokens');
        }

        const data = await response.json();

        // Stocker les tokens
        localStorage.setItem('zoho_access_token', data.accessToken);
        localStorage.setItem('zoho_refresh_token', data.refreshToken);
        localStorage.setItem('zoho_token_expiry', (Date.now() + 3600000).toString()); // 1 heure

        toast.success('Successfully connected to Zoho CRM');
        
        // Rediriger vers la page des contacts
        navigate('/contacts');
      } catch (error) {
        console.error('Error handling Zoho callback:', error);
        toast.error('Failed to complete Zoho authentication');
        navigate('/contacts');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">Completing Zoho Authentication...</h2>
        <p className="mt-2 text-sm text-gray-500">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default ZohoCallback; 