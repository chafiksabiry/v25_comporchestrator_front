import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  // Add other deal properties...
}

export function Deals() {
  const { getValidAccessToken, isLoading: isAuthLoading, error: authError } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get a valid access token
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      // Use the token to fetch deals
      const response = await fetch('https://harxv25dashboardfrontend.netlify.app/api/deals', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      setDeals(data.deals);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch deals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  if (isAuthLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (authError || error) {
    return <div className="text-red-600">{authError || error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Deals</h2>
      <div className="grid gap-4">
        {deals.map((deal) => (
          <div key={deal.id} className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium">{deal.name}</h3>
            <div className="mt-2 space-y-2">
              <p className="text-gray-600">Amount: ${deal.amount.toLocaleString()}</p>
              <p className="text-gray-600">Stage: {deal.stage}</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${deal.probability}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">Probability: {deal.probability}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
