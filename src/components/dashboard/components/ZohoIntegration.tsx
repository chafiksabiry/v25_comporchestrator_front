import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Key, 
  RefreshCw,
  Settings2
} from 'lucide-react';
import { 
  checkZohoTokenValidity, 
  disconnectZoho,
  configureZoho,
  getZohoConfigFromDB
} from '../services/zohoService';
import { toast } from 'react-hot-toast';

interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  lastUpdated: Date;
}

export const ZohoIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ZohoConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<ZohoConfig>({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    lastUpdated: new Date()
  });

  useEffect(() => {
    checkConnection();
    loadConfig();
  }, []);

  const checkConnection = async () => {
    try {
      const isValid = await checkZohoTokenValidity();
      setIsConnected(isValid);
    } catch (error) {
      console.error('Connection check error:', error);
      setIsConnected(false);
    }
  };

  const loadConfig = async () => {
    try {
      const savedConfig = await getZohoConfigFromDB();
      if (savedConfig) {
        setConfig(savedConfig);
        setFormData(savedConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await configureZoho(formData);
      
      if (response.success) {
        setIsConnected(true);
        setConfig(formData);
        toast.success('Successfully connected to Zoho CRM');
        setShowConfigModal(false);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect to Zoho CRM');
      toast.error('Failed to connect to Zoho CRM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await disconnectZoho();
      
      if (response.success) {
        setIsConnected(false);
        setConfig(null);
        toast.success('Successfully disconnected from Zoho CRM');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to disconnect from Zoho CRM');
      toast.error('Failed to disconnect from Zoho CRM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-100 rounded-lg">
            <Building2 className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Zoho CRM Integration</h2>
            <p className="text-sm text-gray-500">Connect and manage your Zoho CRM data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              <AlertCircle className="w-4 h-4" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Client ID</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{config?.clientId}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Last Updated</span>
                </div>
                <p className="text-sm text-gray-500">
                  {config?.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Disconnect
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 flex items-center justify-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Configure Zoho CRM
          </button>
        )}
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Configure Zoho CRM</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="Enter your Zoho Client ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  name="clientSecret"
                  value={formData.clientSecret}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="Enter your Zoho Client Secret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refresh Token
                </label>
                <input
                  type="password"
                  name="refreshToken"
                  value={formData.refreshToken}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="Enter your Zoho Refresh Token"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:bg-rose-300 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZohoIntegration; 
