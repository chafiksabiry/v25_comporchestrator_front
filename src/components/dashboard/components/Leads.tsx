import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Lead {
  id: string;
  name: string;
  email: string;
  status: string;
  // Add other lead properties...
}

export function Leads() {
  const { getValidAccessToken, isLoading: isAuthLoading, error: authError } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get a valid access token
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      // Use the token to fetch leads
      const response = await fetch('https://harxv25dashboardfrontend.netlify.app/api/leads', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  if (isAuthLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (authError || error) {
    return <div className="text-red-600">{authError || error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Leads</h2>
      <div className="grid gap-4">
        {leads.map((lead) => (
          <div key={lead.id} className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium">{lead.name}</h3>
            <p className="text-gray-600">{lead.email}</p>
            <span className="inline-block px-2 py-1 text-sm bg-rose-100 text-rose-500 rounded">
              {lead.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 
