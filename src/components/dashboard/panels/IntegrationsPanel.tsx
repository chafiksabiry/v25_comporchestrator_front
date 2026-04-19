import React, { useState, useEffect } from 'react';
import {
  Plug,
  Search,
  Filter,
  Phone,
  Mail,
  TicketCheck,
  MessagesSquare,
  Users,
  Lock,
  AlertCircle,
  X,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Clock,
  Network,
} from 'lucide-react';
import {
  checkZohoTokenValidity,
  disconnectZoho,
  configureZoho
} from '../services/zohoService';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

const getDashboardApiUrl = () => {
  const envUrl = import.meta.env.VITE_DASHBOARD_API;
  if (!envUrl || envUrl.includes('harxv25dashboardfrontend.netlify.app')) {
    return 'https://api-dashboard.harx.ai/api';
  }
  return envUrl;
};

const FINAL_DASHBOARD_API = getDashboardApiUrl();
const API_BASE_URL_ZOHO = import.meta.env.VITE_ZOHO_API_URL || `${FINAL_DASHBOARD_API}/zoho`;

interface UserConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  validation?: (value: string) => string | undefined;
  isUserToken?: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'error' | 'pending';
  icon_url: string;
  requiresUserToken?: boolean;
  userConfig?: UserConfig;
  config?: {
    fields: ConfigField[];
  };
}

interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface ZohoResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface ZohoDBConfig extends ZohoConfig {
  id?: number;
  organizationId: string;
  portalId: string;
  environment: string;
  createdAt: Date;
  updatedAt: Date;
}

// Créer un service global pour gérer le token Zoho
const ZohoTokenService = {
  getToken: (): string | null => {
    return localStorage.getItem("zoho_access_token");
  },

  setToken: (token: string): void => {
    localStorage.setItem("zoho_access_token", token);
  },

  removeToken: (): void => {
    localStorage.removeItem("zoho_access_token");
  },

  isTokenValid: async (): Promise<boolean> => {
    const token = ZohoTokenService.getToken();
    if (!token) return false;

    return await checkZohoTokenValidity();
  }
};

// Add database integration functions
const saveZohoConfigToDB = async (config: ZohoDBConfig): Promise<ZohoResponse> => {
  try {
    const token = ZohoTokenService.getToken();
    if (!token) {
      return {
        success: false,
        message: 'Zoho token not found. Please connect to Zoho first.'
      };
    }

    let response;
    let data;
    response = await fetch(`${API_BASE_URL_ZOHO}/db/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(config),
    });

    data = await response.json();
    return {
      success: response.ok,
      message: data.message || 'Zoho configuration saved to database successfully',
      data: data
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save Zoho configuration to database'
    };
  }
};

const getZohoConfigFromDB = async (): Promise<ZohoDBConfig | null> => {
  try {
    const token = ZohoTokenService.getToken();
    if (!token) {
      console.warn('Zoho token not found. Please connect to Zoho first.');
      return null;
    }

    const response = await fetch(`${API_BASE_URL_ZOHO}/db/config`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Zoho configuration');
    }

    const data = await response.json();
    return data.config;
  } catch (error) {
    console.error('Error fetching Zoho config:', error);
    return null;
  }
};

const deleteZohoConfigFromDB = async (): Promise<ZohoResponse> => {
  try {
    const token = ZohoTokenService.getToken();
    // Pour la suppression, on permet de continuer même sans token
    // car on veut pouvoir nettoyer même si le token est invalide

    const response = await fetch(`${API_BASE_URL_ZOHO}/db/config`, {
      method: 'DELETE',
      headers: token ? {
        'Authorization': `Bearer ${token}`
      } : {}
    });

    const data = await response.json();
    return {
      success: response.ok,
      message: data.message || 'Zoho configuration deleted successfully',
      data: data
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete Zoho configuration'
    };
  }
};

// Ajouter une fonction pour récupérer des données Zoho (contacts, leads, etc.)
const getZohoData = async (endpoint: string): Promise<ZohoResponse> => {
  try {
    const token = ZohoTokenService.getToken();
    if (!token) {
      return {
        success: false,
        message: 'Zoho token not found. Please connect to Zoho first.'
      };
    }

    const response = await fetch(`${API_BASE_URL_ZOHO}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return {
      success: response.ok,
      message: response.ok ? 'Data retrieved successfully' : 'Failed to retrieve data',
      data: data
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : `Failed to retrieve Zoho ${endpoint}`
    };
  }
};

export function IntegrationsPanel() {
  const integrations: Integration[] = [
    {
      id: 'user-token',
      name: 'User Authentication',
      description: 'Configure your authentication credentials for all integrations',
      category: 'authentication',
      status: 'pending',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=usertoken',
      requiresUserToken: true,
      config: {
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true,
            isUserToken: true,
            placeholder: 'Enter your client ID',
            validation: (value) => {
              if (value.length < 5) {
                return 'Client ID must be at least 5 characters long';
              }
              return undefined;
            }
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'password',
            required: true,
            isUserToken: true,
            placeholder: 'Enter your client secret',
            validation: (value) => {
              if (value.length < 8) {
                return 'Client secret must be at least 8 characters long';
              }
              return undefined;
            }
          },
          {
            key: 'refresh_token',
            label: 'Refresh Token',
            type: 'password',
            required: true,
            isUserToken: true,
            placeholder: 'Enter your refresh token',
            validation: (value) => {
              if (value.length < 8) {
                return 'Refresh token must be at least 8 characters long';
              }
              return undefined;
            }
          }
        ]
      }
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'Cloud communications platform for voice, SMS, and video',
      category: 'phone',
      status: 'pending',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=twilio',
      config: {
        fields: [
          {
            key: 'account_sid',
            label: 'Account SID',
            type: 'text',
            required: true
          },
          {
            key: 'auth_token',
            label: 'Auth Token',
            type: 'password',
            required: true
          },
          {
            key: 'phone_number',
            label: 'Phone Number',
            type: 'text',
            required: true,
            placeholder: '+1234567890'
          }
        ]
      }
    },
    {
      id: 'intercom',
      name: 'Intercom',
      description: 'Customer messaging and engagement platform',
      category: 'chat',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=intercom',
      config: {
        fields: [
          {
            key: 'access_token',
            label: 'Access Token',
            type: 'password',
            required: true
          },
          {
            key: 'workspace_id',
            label: 'Workspace ID',
            type: 'text',
            required: true
          }
        ]
      }
    },
    {
      id: 'livechat',
      name: 'LiveChat',
      description: 'Live chat and customer service platform',
      category: 'chat',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=livechat',
      config: {
        fields: [
          {
            key: 'api_key',
            label: 'API Key',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'zendesk',
      name: 'Zendesk',
      description: 'Customer service and engagement',
      category: 'ticketing',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=zendesk',
      config: {
        fields: [
          {
            key: 'subdomain',
            label: 'Subdomain',
            type: 'text',
            required: true
          },
          {
            key: 'api_token',
            label: 'API Token',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication and collaboration',
      category: 'communication',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=slack',
      config: {
        fields: [
          {
            key: 'bot_token',
            label: 'Bot Token',
            type: 'password',
            required: true
          },
          {
            key: 'signing_secret',
            label: 'Signing Secret',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Team collaboration and meetings',
      category: 'communication',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=msteams',
      config: {
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'zoom',
      name: 'Zoom',
      description: 'Video conferencing and meetings',
      category: 'communication',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=zoom',
      config: {
        fields: [
          {
            key: 'api_key',
            label: 'API Key',
            type: 'text',
            required: true
          },
          {
            key: 'api_secret',
            label: 'API Secret',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'ovh',
      name: 'OVH',
      description: 'Enterprise-grade telephony and cloud communications',
      category: 'phone',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ovh',
      config: {
        fields: [
          {
            key: 'application_key',
            label: 'Application Key',
            type: 'text',
            required: true
          },
          {
            key: 'application_secret',
            label: 'Application Secret',
            type: 'password',
            required: true
          },
          {
            key: 'consumer_key',
            label: 'Consumer Key',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'zoho-crm',
      name: 'Zoho CRM (Disabled)',
      description: 'Customer relationship management and sales automation (Currently unavailable)',
      category: 'crm',
      status: 'pending',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=zohocrm',
      config: {
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true,
            placeholder: 'Enter your Zoho client ID'
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'password',
            required: true,
            placeholder: 'Enter your Zoho client secret',
            validation: (value: string) => {
              if (!value) return 'Client Secret is required';
              if (value.startsWith('[')) {
                try {
                  const parsed = JSON.parse(value);
                  if (!parsed[0]?.value) return 'Invalid Client Secret format';
                } catch (e) {
                  return 'Invalid Client Secret format';
                }
              }
              return undefined;
            }
          },
          {
            key: 'refresh_token',
            label: 'Refresh Token',
            type: 'password',
            required: true,
            placeholder: 'Enter your Zoho refresh token'
          }
        ]
      }
    },
    {
      id: 'zoho-mail',
      name: 'Zoho Mail (Disabled)',
      description: 'Professional email and collaboration platform (Currently unavailable)',
      category: 'email',
      status: 'pending',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=zohomail',
      config: {
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Google email and messaging platform with OAuth2 integration',
      category: 'email',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=gmail',
      config: {
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'azure-ad',
      name: 'Microsoft Azure AD',
      description: 'Enterprise identity and access management',
      category: 'authentication',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=azuread',
      config: {
        fields: [
          {
            key: 'tenant_id',
            label: 'Tenant ID',
            type: 'text',
            required: true
          },
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'password',
            required: true
          }
        ]
      }
    },
    {
      id: 'aws-ses',
      name: 'AWS SES',
      description: 'Amazon Simple Email Service for scalable email communication',
      category: 'email',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=awsses',
      config: {
        fields: [
          {
            key: 'access_key_id',
            label: 'Access Key ID',
            type: 'text',
            required: true
          },
          {
            key: 'secret_access_key',
            label: 'Secret Access Key',
            type: 'password',
            required: true
          },
          {
            key: 'region',
            label: 'Region',
            type: 'text',
            required: true
          }
        ]
      }
    },
    {
      id: 'aws-connect',
      name: 'AWS Connect',
      description: 'Amazon Connect cloud contact center service',
      category: 'phone',
      status: 'connected',
      icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=awsconnect',
      config: {
        fields: [
          {
            key: 'access_key_id',
            label: 'Access Key ID',
            type: 'text',
            required: true
          },
          {
            key: 'secret_access_key',
            label: 'Secret Access Key',
            type: 'password',
            required: true
          },
          {
            key: 'instance_id',
            label: 'Instance ID',
            type: 'text',
            required: true
          }
        ]
      }
    }
  ];

  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<UserConfig | null>(() => {
    // Initialize from localStorage
    const savedConfig = localStorage.getItem('user_config');
    return savedConfig ? JSON.parse(savedConfig) : null;
  });
  const [zohoDBConfig, setZohoDBConfig] = useState<ZohoDBConfig | null>(null);

  const [integrationStates, setIntegrationStates] = useState<Record<string, Integration>>(() => {
    const states: Record<string, Integration> = {};
    const zohoToken = ZohoTokenService.getToken();

    integrations.forEach(integration => {
      states[integration.id] = {
        ...integration,
        status: integration.id === 'zoho-crm' && zohoToken ? 'connected' : 'pending'
      };
    });
    return states;
  });

  // Update localStorage when token changes
  useEffect(() => {
    if (userToken) {
      localStorage.setItem('user_config', JSON.stringify(userToken));
    } else {
      localStorage.removeItem('user_config');
    }
  }, [userToken]);

  // Load Zoho configuration from database on component mount
  useEffect(() => {
    const loadZohoConfig = async () => {
      const config = await getZohoConfigFromDB();
      if (config) {
        setZohoDBConfig(config);
        // Update integration status
        setIntegrationStates(prev => ({
          ...prev,
          'zoho-crm': {
            ...prev['zoho-crm'],
            status: 'connected' as const
          }
        }));
      }
    };
    loadZohoConfig();
  }, []);

  // Vérifier la validité du token au chargement
  useEffect(() => {
    const verifyToken = async () => {
      const isValid = await ZohoTokenService.isTokenValid();

      // Mettre à jour le statut en fonction de la validité
      setIntegrationStates(prev => ({
        ...prev,
        'zoho-crm': {
          ...prev['zoho-crm'],
          status: isValid ? 'connected' : 'error' as const
        }
      }));

      // Si le token n'est pas valide, afficher un message d'erreur
      if (!isValid) {
        setError('Zoho token has expired or is invalid. Please reconnect to Zoho.');
        ZohoTokenService.removeToken();
      }
    };

    // Vérifier uniquement s'il y a un token
    if (ZohoTokenService.getToken()) {
      verifyToken();
    }
  }, []);

  // Améliorer useEffect pour gérer le retour de l'authentification Zoho
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      ZohoTokenService.setToken(token);

      // Nettoyer l'URL (remplacer l'historique sans le paramètre token)
      window.history.replaceState({}, document.title, "/integrations");

      // Mettre à jour le statut de l'intégration
      setIntegrationStates(prev => ({
        ...prev,
        'zoho-crm': {
          ...prev['zoho-crm'],
          status: 'connected' as const
        }
      }));

      setIsZohoTokenValid(true);
      setError(null); // Effacer les erreurs précédentes

      // Afficher un message de succès
      console.log("Zoho successfully connected!");

      // Charger la configuration depuis la base de données après connexion
      getZohoConfigFromDB().then(config => {
        if (config) {
          setZohoDBConfig(config);
        }
      });
    }
  }, []);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'crm', label: 'CRM' },
    { id: 'chat', label: 'Chat' },
    { id: 'communication', label: 'Communication' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'ticketing', label: 'Ticketing' },
    { id: 'authentication', label: 'Authentication' }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'chat':
        return <MessagesSquare className="w-5 h-5" />;
      case 'communication':
        return <Users className="w-5 h-5" />;
      case 'phone':
        return <Phone className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'ticketing':
        return <TicketCheck className="w-5 h-5" />;
      case 'authentication':
        return <Lock className="w-5 h-5" />;
      case 'crm':
        return <Building2 className="w-5 h-5" />;
      default:
        return <Network className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-rose-100 text-rose-500';
    }
  };

  const validateField = (field: ConfigField, value: string): string | undefined => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }
    return field.validation?.(value);
  };

  const validateForm = (): boolean => {
    if (!selectedIntegration?.config?.fields) return false;

    const fields = selectedIntegration.config.fields;
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    fields.forEach(field => {
      const error = validateField(field, configValues[field.key] || '');
      if (error) {
        newErrors[field.key] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleConnect = async (integration: Integration) => {
    try {
      setLoading(integration.id);
      setError(null);

      if (integration.id === 'zoho-crm') {
        // Au lieu de rediriger directement, on affiche d'abord le popup de configuration
        setSelectedIntegration(integration);
        setConfigValues({
          client_id: '',
          client_secret: '',
          refresh_token: ''
        });

        // Si on a déjà une configuration, on la charge
        const existingConfig = await getZohoConfigFromDB();
        if (existingConfig) {
          setConfigValues({
            client_id: existingConfig.clientId,
            client_secret: existingConfig.clientSecret,
            refresh_token: existingConfig.refreshToken
          });
        }
        return;
      }

      setIntegrationStates(prev => ({
        ...prev,
        [integration.id]: {
          ...prev[integration.id],
          status: 'connected' as const
        }
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect integration');
      setIntegrationStates(prev => ({
        ...prev,
        [integration.id]: {
          ...prev[integration.id],
          status: 'error' as const
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    try {
      setLoading(integration.id);
      setError(null);

      if (integration.id === 'zoho-crm') {
        const token = ZohoTokenService.getToken();

        // Check if token exists and is valid
        if (!token) {
          // If no token exists, just clear local state
          ZohoTokenService.removeToken();
          setZohoDBConfig(null);
          setIsZohoTokenValid(false);
          setIntegrationStates(prev => ({
            ...prev,
            'zoho-crm': {
              ...prev['zoho-crm'],
              status: 'pending' as const
            }
          }));
          return;
        }

        // Verify token validity before attempting disconnect
        const isTokenValid = await ZohoTokenService.isTokenValid();
        if (!isTokenValid) {
          // If token is invalid, clear local state
          ZohoTokenService.removeToken();
          setZohoDBConfig(null);
          setIsZohoTokenValid(false);
          setIntegrationStates(prev => ({
            ...prev,
            'zoho-crm': {
              ...prev['zoho-crm'],
              status: 'pending' as const
            }
          }));
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL_ZOHO}/disconnect`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (!response.ok) {
            // If we get a 401, treat it as a successful disconnect
            if (response.status === 401) {
              ZohoTokenService.removeToken();
              setZohoDBConfig(null);
              setIsZohoTokenValid(false);
              setIntegrationStates(prev => ({
                ...prev,
                'zoho-crm': {
                  ...prev['zoho-crm'],
                  status: 'pending' as const
                }
              }));
              return;
            }
            throw new Error(data.message || 'Failed to disconnect from Zoho');
          }

          if (data.success) {
            // Remove local token
            ZohoTokenService.removeToken();
            setZohoDBConfig(null);
            setIsZohoTokenValid(false);

            // Update integration status
            setIntegrationStates(prev => ({
              ...prev,
              'zoho-crm': {
                ...prev['zoho-crm'],
                status: 'pending' as const
              }
            }));

            console.log(`Successfully disconnected ${integration.name}`);
          } else {
            throw new Error(data.message || 'Failed to disconnect from Zoho');
          }
        } catch (error) {
          // If we get a network error or other error, still clear local state
          ZohoTokenService.removeToken();
          setZohoDBConfig(null);
          setIsZohoTokenValid(false);
          setIntegrationStates(prev => ({
            ...prev,
            'zoho-crm': {
              ...prev['zoho-crm'],
              status: 'pending' as const
            }
          }));
          throw error;
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to disconnect integration';
      setError(errorMessage);

      setIntegrationStates(prev => ({
        ...prev,
        [integration.id]: {
          ...prev[integration.id],
          status: 'error' as const
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleConfigure = async (integration: Integration) => {
    if (integration.id === 'zoho-crm') {
      setSelectedIntegration(integration);
      setConfigValues({
        client_id: '',
        client_secret: '',
        refresh_token: ''
      });

      // Si on a déjà une configuration, on la charge
      const existingConfig = await getZohoConfigFromDB();
      if (existingConfig) {
        setConfigValues({
          client_id: existingConfig.clientId,
          client_secret: existingConfig.clientSecret,
          refresh_token: existingConfig.refreshToken
        });
      }
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    let cleanValue = value;

    // Si c'est le client_secret et qu'il est au format JSON
    if (key === 'client_secret' && value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        cleanValue = parsed[0]?.value || value;
      } catch (e) {
        cleanValue = value;
      }
    }

    setConfigValues(prev => ({ ...prev, [key]: cleanValue }));

    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(selectedIntegration.id);
      setError(null);

      if (selectedIntegration.id === 'zoho-crm') {
        try {
          // Nettoyer et valider les valeurs
          let clientSecret = configValues.client_secret;

          // Si le client_secret est un JSON string, essayer de l'extraire
          if (clientSecret.startsWith('[')) {
            try {
              const parsed = JSON.parse(clientSecret);
              clientSecret = parsed[0]?.value || '';
            } catch (e) {
              console.error('Error parsing client secret:', e);
            }
          }

          // Vérifier que toutes les valeurs sont valides
          if (!configValues.refresh_token || !configValues.client_id || !clientSecret) {
            throw new Error('Tous les champs sont requis');
          }

          // Préparation des données dans le format attendu par le backend
          const configData = {
            refreshToken: configValues.refresh_token.trim(),
            clientId: configValues.client_id.trim(),
            clientSecret: clientSecret.trim(),
            userId: Cookies.get("userId") || "67a22959828197bb180caa59"
          };

          console.log('Sending configuration to server:', {
            refreshToken: configData.refreshToken,
            clientId: configData.clientId,
            clientSecret: '***hidden***',
            userId: configData.userId
          });

          // Appel à l'API pour configurer Zoho
          const maxRetries = 3;
          const baseDelay = 2000; // Augmenté à 2 secondes
          let retryCount = 0;
          let lastError = null;

          while (retryCount < maxRetries) {
            try {
              const response = await fetch(`${API_BASE_URL_ZOHO}/configure`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(configData)
              });

              // Vérifier d'abord si la réponse est JSON
              const contentType = response.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Réponse invalide du serveur');
              }

              const data = await response.json();

              if (!response.ok) {
                if (data.error === 'Access Denied' && data.error_description?.includes('too many requests')) {
                  // Rate limit error - wait and retry
                  const delay = baseDelay * Math.pow(2, retryCount);
                  const retryMessage = `Trop de requêtes. Nouvelle tentative dans ${delay / 1000} secondes... (${retryCount + 1}/${maxRetries})`;
                  setError(retryMessage);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  retryCount++;
                  lastError = new Error(`Rate limit exceeded. Retry ${retryCount}/${maxRetries}`);
                  continue;
                }
                throw new Error(data.message || `Erreur ${response.status}: ${data.error || 'Erreur inconnue'}`);
              }

              if (data.success) {
                // Stocker le token d'accès
                if (data.accessToken) {
                  ZohoTokenService.setToken(data.accessToken);
                }

                // Mise à jour du statut de l'intégration
                setIntegrationStates(prev => ({
                  ...prev,
                  'zoho-crm': {
                    ...prev['zoho-crm'],
                    status: 'connected' as const
                  }
                }));

                setIsZohoTokenValid(true);
                setSelectedIntegration(null);
                setConfigValues({});
                setErrors({});

                // Afficher les données des leads après la configuration
                const leadsData = await fetch(`${API_BASE_URL_ZOHO}/leads`);
                const leadsResponse = await leadsData.json();
                console.log('Leads data after configuration:', leadsResponse);

                console.log('Zoho CRM configured successfully');
                return;
              } else {
                throw new Error(data.message || 'La configuration a échoué');
              }
            } catch (error) {
              lastError = error;
              retryCount++;
              if (retryCount >= maxRetries) {
                break;
              }
              const delay = baseDelay * Math.pow(2, retryCount);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          // If we get here, all retries failed
          console.error('Configuration error after retries:', lastError);
          const errorMessage = lastError instanceof Error && lastError.message.includes('Rate limit exceeded')
            ? 'Trop de tentatives de connexion. Veuillez patienter quelques minutes avant de réessayer.'
            : 'Échec de la configuration de Zoho CRM après plusieurs tentatives';
          setError(errorMessage);

          setIntegrationStates(prev => ({
            ...prev,
            'zoho-crm': {
              ...prev['zoho-crm'],
              status: 'error' as const
            }
          }));
        } catch (error) {
          console.error('Configuration error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Échec de la configuration de Zoho CRM';
          setError(errorMessage);

          setIntegrationStates(prev => ({
            ...prev,
            'zoho-crm': {
              ...prev['zoho-crm'],
              status: 'error' as const
            }
          }));
        }
      }
    } finally {
      setLoading(null);
    }
  };

  // Update stats calculation to use integrationStates
  const stats = {
    total: Object.keys(integrationStates).length,
    connected: Object.values(integrationStates).filter(i => i.status === 'connected').length,
    active: Object.values(integrationStates).filter(i => i.status === 'connected').length,
    error: Object.values(integrationStates).filter(i => i.status === 'error').length
  };

  // Update filteredIntegrations to use integrationStates
  const filteredIntegrations = Object.values(integrationStates).filter(integration => {
    if (activeFilter !== 'all' && integration.category !== activeFilter) return false;
    if (searchTerm && !integration.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Ajouter un état pour la validité du token
  const [isZohoTokenValid, setIsZohoTokenValid] = useState<boolean>(() => {
    return ZohoTokenService.getToken() !== null;
  });

  // Ajouter une fonction pour récupérer et afficher les données des leads
  const fetchAndDisplayLeads = async () => {
    try {
      const token = ZohoTokenService.getToken();
      if (!token) {
        console.log('No token available to fetch leads');
        return;
      }

      const response = await fetch(`${API_BASE_URL_ZOHO}/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('Current leads data:', data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  // Appeler fetchAndDisplayLeads au chargement du composant
  useEffect(() => {
    fetchAndDisplayLeads();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Plug className="w-6 h-6 text-cyan-600" />
            </div>
            <h2 className="text-xl font-semibold">Integrations</h2>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-rose-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Plug className="w-5 h-5 text-rose-500" />
              <span className="font-medium">Total Integrations</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-medium">Connected</span>
            </div>
            <div className="text-2xl font-bold">{stats.connected}</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              Active
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">Active</span>
            </div>
            <div className="text-2xl font-bold">{stats.active}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium">Errors</span>
            </div>
            <div className="text-2xl font-bold">{stats.error}</div>
            <div className="text-sm text-red-600 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" />
              Needs attention
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveFilter(category.id)}
                className={`px-4 py-2 rounded-lg ${activeFilter === category.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="border rounded-lg p-4 hover:border-cyan-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={integration.icon_url}
                    alt={integration.name}
                    className="w-8 h-8"
                  />
                  <div>
                    <h3 className="font-semibold">{integration.name}</h3>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                    integration.status
                  )}`}
                >
                  {integration.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                {getCategoryIcon(integration.category)}
                <span className="capitalize">{integration.category}</span>
              </div>
              <div className="flex gap-2">
                {integration.id === 'zoho-crm' ? (
                  isZohoTokenValid ? (
                    <button
                      onClick={() => handleDisconnect(integration)}
                      className="flex-1 px-3 py-1.5 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration)}
                      disabled={loading === integration.id}
                      className="flex-1 px-3 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-cyan-300"
                    >
                      {loading === integration.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )
                ) : integration.status === 'connected' ? (
                  <button
                    onClick={() => handleDisconnect(integration)}
                    className="flex-1 px-3 py-1.5 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(integration)}
                    disabled={loading === integration.id}
                    className="flex-1 px-3 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-cyan-300"
                  >
                    {loading === integration.id ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={selectedIntegration.icon_url}
                  alt={selectedIntegration.name}
                  className="w-8 h-8"
                />
                <h3 className="text-lg font-semibold">{selectedIntegration.name} Settings</h3>
              </div>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {selectedIntegration.config?.fields?.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={configValues[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors[field.key] ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Select...</option>
                      {field.options?.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={configValues[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors[field.key] ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                  )}
                  {errors[field.key] && (
                    <p className="mt-1 text-sm text-red-500">{errors[field.key]}</p>
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedIntegration(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={loading === selectedIntegration.id}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-cyan-300"
                >
                  {loading === selectedIntegration.id ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntegrationsPanel;
