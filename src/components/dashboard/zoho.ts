import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

interface ZohoTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

// Add token management
const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.com';
const ZOHO_API_URL = 'https://www.zohoapis.com';

// Function to refresh access token
async function refreshAccessToken(refreshToken: string): Promise<ZohoTokens> {
  try {
    const response = await axios.post(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, null, {
      params: {
        refresh_token: refreshToken,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

// Function to check if access token is expired and refresh if needed
async function getValidAccessToken(): Promise<string> {
  try {
    const config = await prisma.zohoConfig.findFirst();
    if (!config) {
      throw new Error('No Zoho configuration found');
    }

    // Check if access token exists and is not expired
    if (config.accessToken && config.tokenExpiresAt && new Date() < config.tokenExpiresAt) {
      return config.accessToken;
    }

    // If token is expired or doesn't exist, refresh it
    const tokens = await refreshAccessToken(config.refreshToken);
    
    // Calculate token expiration time (subtract 5 minutes for safety margin)
    const expiresAt = new Date(Date.now() + (tokens.expires_in - 300) * 1000);

    // Update configuration with new tokens
    await prisma.zohoConfig.update({
      where: { id: config.id },
      data: {
        accessToken: tokens.access_token,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date()
      }
    });

    return tokens.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw new Error('Failed to get valid access token');
  }
}

// Middleware to handle token refresh
const withValidToken = async (req: any, res: any, next: any) => {
  try {
    const accessToken = await getValidAccessToken();
    req.zohoAccessToken = accessToken;
    next();
  } catch (error) {
    console.error('Token refresh middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Failed to authenticate with Zoho'
    });
  }
};

// Save or update Zoho configuration
router.post('/db/save', async (req, res) => {
  try {
    const {
      clientId,
      clientSecret,
      refreshToken,
      organizationId,
      portalId,
      environment
    } = req.body;

    // Validate required fields
    if (!clientId || !clientSecret || !refreshToken || !organizationId || !portalId || !environment) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Try to get initial access token
    const tokens = await refreshAccessToken(refreshToken);
    const expiresAt = new Date(Date.now() + (tokens.expires_in - 300) * 1000);

    // Check if configuration already exists
    const existingConfig = await prisma.zohoConfig.findFirst();

    let config;
    if (existingConfig) {
      // Update existing configuration
      config = await prisma.zohoConfig.update({
        where: { id: existingConfig.id },
        data: {
          clientId,
          clientSecret,
          refreshToken,
          organizationId,
          portalId,
          environment,
          accessToken: tokens.access_token,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new configuration
      config = await prisma.zohoConfig.create({
        data: {
          clientId,
          clientSecret,
          refreshToken,
          organizationId,
          portalId,
          environment,
          accessToken: tokens.access_token,
          tokenExpiresAt: expiresAt,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    return res.json({
      success: true,
      message: 'Zoho configuration saved successfully',
      config
    });
  } catch (error) {
    console.error('Error saving Zoho config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save Zoho configuration'
    });
  }
});

// Example of using the middleware for a protected Zoho API route
router.get('/crm/v2/contacts', withValidToken, async (req, res) => {
  try {
    const response = await axios.get(`${ZOHO_API_URL}/crm/v2/contacts`, {
      headers: {
        'Authorization': `Bearer ${req.zohoAccessToken}`
      }
    });

    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching Zoho contacts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Zoho contacts'
    });
  }
});

// Get Zoho configuration
router.get('/db/config', async (req, res) => {
  try {
    const config = await prisma.zohoConfig.findFirst();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No Zoho configuration found'
      });
    }

    return res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching Zoho config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Zoho configuration'
    });
  }
});

// Delete Zoho configuration
router.delete('/db/config', async (req, res) => {
  try {
    const config = await prisma.zohoConfig.findFirst();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No Zoho configuration found'
      });
    }

    await prisma.zohoConfig.delete({
      where: { id: config.id }
    });

    return res.json({
      success: true,
      message: 'Zoho configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Zoho config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete Zoho configuration'
    });
  }
});

export default router; 
