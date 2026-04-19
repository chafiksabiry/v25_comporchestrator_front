// Ajout d'un simple système de rate limiting
const rateLimiter = {
  lastRequest: 0,
  minInterval: 2000, // 2 secondes entre les requêtes
  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();
  }
};

// Cache pour le token
let tokenCache = {
  access_token: null,
  refresh_token: null,
  expires_at: null
};

const refreshToken = async (req) => {
  console.log("Rafraîchissement du token en cours...");

  // Vérifier si le token actuel est encore valide
  if (tokenCache.access_token && tokenCache.expires_at && Date.now() < tokenCache.expires_at) {
    console.log("Token existant encore valide");
    return tokenCache.access_token;
  }

  try {
    await rateLimiter.wait(); // Attendre avant de faire la requête

    const config = await ZohoConfig.findOne();
    if (!config || !config.refresh_token) {
      throw new Error("Configuration_Required");
    }

    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: config.refresh_token,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    });

    if (response.data && response.data.access_token) {
      // Mettre à jour le cache
      tokenCache = {
        access_token: response.data.access_token,
        refresh_token: config.refresh_token,
        expires_at: Date.now() + (response.data.expires_in * 1000 - 30000) // 5 minutes before expiration
      };

      return response.data.access_token;
    }
    throw new Error("Token_Refresh_Failed");
  } catch (error) {
    console.error("Erreur détaillée lors du rafraîchissement du token:", error.response?.data);
    throw new Error("Token_Refresh_Failed");
  }
};

const executeWithTokenRefresh = async (req, res, apiCall) => {
  try {
    // Vérifier si nous avons un token en cache valide
    if (tokenCache.access_token && tokenCache.expires_at && Date.now() < tokenCache.expires_at) {
      try {
        await rateLimiter.wait(); // Attendre avant de faire la requête
        return await apiCall(tokenCache.access_token);
      } catch (error) {
        if (error.response?.status === 401) {
          // Token expiré ou invalide, forcer le rafraîchissement
          tokenCache.expires_at = null;
        } else {
          throw error;
        }
      }
    }

    // Rafraîchir le token si nécessaire
    const token = await refreshToken(req);
    await rateLimiter.wait(); // Attendre avant de faire la requête
    return await apiCall(token);
  } catch (error) {
    if (error.message === "Token_Refresh_Failed") {
      throw new Error("Token_Refresh_Failed");
    }
    throw error;
  }
};

// Modification de getLeadsByPipeline pour utiliser le rate limiting
const getLeadsByPipeline = async (req, res) => {
  console.log("Début de getLeadsByPipeline");
  try {
    checkAuth(req);
    const { pipeline } = req.query;

    const result = await executeWithTokenRefresh(req, res, async (token) => {
      await rateLimiter.wait(); // Attendre avant de faire la requête

      const baseURL = "https://www.zohoapis.com/crm/v2.1/Deals";
      let params = {
        fields: "Deal_Name,Stage,Pipeline,Amount,Closing_Date,Account_Name,Contact_Name,Description,Email,Phone,Owner,Created_Time,Modified_Time,Last_Activity_Time,Next_Step,Probability,Lead_Source,Type,Expected_Revenue,Overall_Sales_Duration,Stage_Duration"
      };

      if (pipeline) {
        params.criteria = `(Pipeline:equals:${pipeline})`;
      }

      const response = await axios.get(baseURL, {
        params: params,
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json"
        },
      });

      return response.data;
    });

    res.json(result);
  } catch (error) {
    console.error("Erreur getLeadsByPipeline:", error.message);
    handleError(res, error);
  }
};

// Fonction utilitaire pour gérer les erreurs de manière cohérente
const handleError = (res, error) => {
  if (error.message === "Configuration_Required") {
    return res.status(401).json({
      success: false,
      message: "Configuration Zoho CRM requise. Veuillez configurer via /api/zoho/configure",
      requiresConfiguration: true
    });
  }

  if (error.message === "Token_Refresh_Failed") {
    return res.status(401).json({
      success: false,
      message: "Échec du rafraîchissement du token. Veuillez reconfigurer.",
      requiresConfiguration: true
    });
  }

  res.status(500).json({
    success: false,
    message: "Une erreur est survenue",
    error: error.message,
    details: error.response?.data
  });
};

const getPipelines = async (req, res) => {
  console.log("Début de getPipelines");
  try {
    checkAuth(req);

    // D'abord, récupérer le layout ID
    const layoutData = await executeWithTokenRefresh(req, res, async (token) => {
      console.log("Fetching layout data...");
      const response = await axios.get(
        `https://www.zohoapis.com/crm/v2.1/settings/layouts`,
        {
          params: {
            module: "Deals"
          },
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json"
          },
        }
      );
      console.log("Layout data received:", response.data);
      return response.data;
    });

    let layoutId;
    if (layoutData.layouts && layoutData.layouts.length > 0) {
      layoutId = layoutData.layouts[0].id;
      console.log("Layout ID found:", layoutId);
    } else {
      throw new Error("No layout found in response");
    }

    // Récupérer les pipelines avec le layout ID
    const pipelinesData = await executeWithTokenRefresh(req, res, async (token) => {
      console.log("Fetching pipelines with layout ID:", layoutId);
      const response = await axios.get(
        `https://www.zohoapis.com/crm/v2.1/settings/pipeline`,
        {
          params: {
            layout_id: layoutId
          },
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json"
          },
        }
      );
      console.log("Pipelines data received:", response.data);
      return response.data;
    });

    const responseData = {
      success: true,
      data: {
        layoutId: layoutId,
        pipelines: pipelinesData.pipeline || []
      }
    };

    console.log("Sending response:", responseData);
    res.json(responseData);

  } catch (error) {
    console.error("Erreur dans getPipelines:", error);
    if (error.response) {
      console.error("Réponse d'erreur:", error.response.data);
    }

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des pipelines",
      error: error.message
    });
  }
}; 