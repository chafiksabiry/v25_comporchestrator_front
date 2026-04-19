// Service pour gérer les intégrations Zoho à travers l'application

// Configuration de l'URL de base depuis les variables d'environnement
export const API_BASE_URL = import.meta.env.VITE_ZOHO_API_URL;

// Créer le service global pour gérer le token Zoho
export const ZohoTokenService = {
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
    
    try {
      const response = await fetch(`${API_BASE_URL}/validate-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
};

// Vérifier si l'utilisateur est connecté à Zoho
export const isConnectedToZoho = (): boolean => {
  return !!ZohoTokenService.getToken();
};

// Vérifier la validité du token Zoho
export const checkZohoTokenValidity = async (): Promise<boolean> => {
  return await ZohoTokenService.isTokenValid();
};

// Fonction générique pour les appels API à Zoho
export const zohoApiCall = async <T,>(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const token = ZohoTokenService.getToken();
    if (!token) {
      return {
        success: false,
        error: 'Zoho token not found. Please connect to Zoho first.'
      };
    }

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || 'Failed to make Zoho API call',
        data: responseData
      };
    }

    return {
      success: true,
      data: responseData
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// API spécifiques pour SalesInbox
export const getSalesInboxMessages = async (): Promise<any> => {
  return zohoApiCall<any>('salesinbox/messages');
};

export const sendSalesInboxMessage = async (message: any): Promise<any> => {
  return zohoApiCall<any>('salesinbox/send', 'POST', message);
};

export const getSalesInboxContacts = async (): Promise<any> => {
  return zohoApiCall<any>('salesinbox/contacts');
};

export const getSalesInboxChannels = async (): Promise<any> => {
  return zohoApiCall<any>('salesinbox/channels');
};

// API spécifiques pour CRM
export const getCRMContacts = async (): Promise<any> => {
  return zohoApiCall<any>('crm/contacts');
};

export const getCRMLeads = async (): Promise<any> => {
  return zohoApiCall<any>('crm/leads');
};

export const getCRMDeals = async (): Promise<any> => {
  return zohoApiCall<any>('crm/deals');
};

// Ajout des nouvelles fonctions pour configurer Zoho
export const configureZoho = async (config: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/configure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    const data = await response.json();
    if (data.success && data.accessToken) {
      ZohoTokenService.setToken(data.accessToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Configuration error:', error);
    return false;
  }
};

// Mise à jour de la fonction de déconnexion
export const disconnectZoho = async (): Promise<boolean> => {
  try {
    const token = ZohoTokenService.getToken();
    if (!token) return true;

    const response = await fetch(`${API_BASE_URL}/disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      ZohoTokenService.removeToken();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Disconnect error:', error);
    return false;
  }
}; 
