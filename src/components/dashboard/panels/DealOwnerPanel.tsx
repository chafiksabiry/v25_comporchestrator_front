import React, { useState, useEffect } from 'react';
import { ZohoTokenService } from '../services/zohoService';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, User, Filter, Calendar, Phone, Mail, Building } from 'lucide-react';

interface Pipeline {
  id: string;
  display_value: string;
  maps: Array<{
    display_value: string;
    id: string;
  }>;
}

interface PipelinesResponse {
  success: boolean;
  data: {
    layoutId: string;
    pipelines: Pipeline[];
  };
}

interface Lead {
  Deal_Name: string;
  Stage: {
    id: string;
    name: string;
  };
  Pipeline: {
    id: string;
    name: string;
  };
  Amount: number;
  Closing_Date: string;
  Account_Name: {
    name: string;
    id: string;
  };
  Contact_Name: {
    name: string;
    id: string;
  };
  Email: string;
  Phone: string;
  Owner: {
    name: string;
    id: string;
    email: string;
  };
  Created_Time: string;
  Modified_Time: string;
}

const DealOwnerPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [leads, setLeads] = useState<Lead[]>([]);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const token = ZohoTokenService.getToken();
      if (!token) throw new Error('No Zoho token found');

      const response = await fetch('https://harxv25dashboardfrontend.netlify.app/api/zoho/pipelines', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pipelines');
      }

      const data: PipelinesResponse = await response.json();
      console.log('Pipelines data:', data); // Pour déboguer

      if (data.success && data.data && data.data.pipelines) {
        setPipelines(data.data.pipelines);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch pipelines');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsByPipeline = async (pipelineId?: string) => {
    try {
      setLoading(true);
      const token = ZohoTokenService.getToken();
      if (!token) throw new Error('No Zoho token found');

      const url = new URL('https://harxv25dashboardfrontend.netlify.app/api/zoho/leads-by-pipeline');
      if (pipelineId && pipelineId !== 'all') {
        url.searchParams.append('pipeline', pipelineId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch leads');

      const data = await response.json();
      if (data.data) {
        setLeads(data.data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    fetchLeadsByPipeline(selectedPipeline);
  }, [selectedPipeline]);

  // Grouper les leads par propriétaire
  const getOwnerStats = () => {
    const ownerStats = new Map<string, {
      owner: Lead['Owner'];
      leadCount: number;
      totalAmount: number;
      stages: Set<string>;
      leads: Lead[];
    }>();

    leads.forEach(lead => {
      if (!lead.Owner) return;

      const ownerId = lead.Owner.id;
      if (!ownerStats.has(ownerId)) {
        ownerStats.set(ownerId, {
          owner: lead.Owner,
          leadCount: 0,
          totalAmount: 0,
          stages: new Set(),
          leads: []
        });
      }

      const stats = ownerStats.get(ownerId)!;
      stats.leadCount++;
      stats.totalAmount += lead.Amount || 0;
      if (lead.Stage?.name) stats.stages.add(lead.Stage.name);
      stats.leads.push(lead);
    });

    return Array.from(ownerStats.values());
  };

  const ownerStats = getOwnerStats();

  if (!ZohoTokenService.getToken()) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Connexion requise</h2>
            </div>
            <p className="text-gray-600">
              Vous devez vous connecter à Zoho CRM pour accéder aux propriétaires des deals.
            </p>
            <button
              onClick={() => navigate('/integrations')}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              Se connecter à Zoho CRM
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Pipelines</h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Pipelines</option>
              {pipelines && pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.display_value}
                </option>
              ))}
            </select>
            <button
              onClick={fetchPipelines}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-cyan-300"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            <p>{error}</p>
          </div>
        )}

        {/* Affichage des détails du pipeline sélectionné */}
        {selectedPipeline !== 'all' && pipelines.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-3">Pipeline Stages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pipelines
                .find(p => p.id === selectedPipeline)
                ?.maps.map(stage => (
                  <div
                    key={stage.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm font-medium">{stage.display_value}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealOwnerPanel; 
