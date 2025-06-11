import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ZohoCallback = () => {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Récupérer les tokens du localStorage
        const storedAccessToken = localStorage.getItem('zoho_access_token');
        const storedRefreshToken = localStorage.getItem('zoho_refresh_token');
        const redirectUrl = localStorage.getItem('zoho_redirect_url');

        if (storedAccessToken && storedRefreshToken) {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);

          // Afficher les tokens dans la console
          console.log('Zoho Access Token:', storedAccessToken);
          console.log('Zoho Refresh Token:', storedRefreshToken);

          // Attendre 3 secondes avant de rediriger
          setTimeout(() => {
            // Rediriger vers l'URL précédente ou la page par défaut
            if (redirectUrl) {
              localStorage.removeItem('zoho_redirect_url');
              window.location.href = redirectUrl;
            } else {
              navigate('/contacts');
            }
          }, 3000);
        } else {
          throw new Error('No tokens found');
        }
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