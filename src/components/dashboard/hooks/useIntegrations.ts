import { useState, useEffect } from 'react';
import { integrationsApi, Integration, IntegrationConnection } from '../services/api/integrations';
import { toast } from 'react-toastify';

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [integrationsData, connectionsData] = await Promise.all([
        integrationsApi.getAll(),
        integrationsApi.getConnections()
      ]);
      setIntegrations(integrationsData);
      setConnections(connectionsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch integrations';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnect = async (id: string) => {
    try {
      await integrationsApi.connect(id);
      await fetchData();
      toast.success('Integration connected successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect integration';
      toast.error(message);
      throw err;
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await integrationsApi.disconnect(id);
      await fetchData();
      toast.success('Integration disconnected successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect integration';
      toast.error(message);
      throw err;
    }
  };

  const handleConfigure = async (id: string, config: Record<string, any>) => {
    try {
      await integrationsApi.configure(id, config);
      await fetchData();
      toast.success('Integration configured successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to configure integration';
      toast.error(message);
      throw err;
    }
  };

  return {
    integrations,
    connections,
    loading,
    error,
    handleConnect,
    handleDisconnect,
    handleConfigure,
    refresh: fetchData
  };
}
