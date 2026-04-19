import express from 'express';
import { IntegrationService } from '../../services/integrationService';

const router = express.Router();

// Get all integrations
router.get('/', async (req, res) => {
  try {
    const integrations = await IntegrationService.getAllIntegrations();
    res.json(integrations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch integrations' });
  }
});

// Get integration by ID
router.get('/:id', async (req, res) => {
  try {
    const integration = await IntegrationService.getIntegrationById(req.params.id);
    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }
    res.json(integration);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch integration' });
  }
});

// Connect integration
router.post('/:id/connect', async (req, res) => {
  try {
    const { credentials } = req.body;
    const success = await IntegrationService.connectIntegration(req.params.id, credentials);
    if (!success) {
      return res.status(404).json({ message: 'Integration not found' });
    }
    res.json({ message: 'Integration connected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to connect integration' });
  }
});

// Disconnect integration
router.post('/:id/disconnect', async (req, res) => {
  try {
    const success = await IntegrationService.disconnectIntegration(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Integration not found' });
    }
    res.json({ message: 'Integration disconnected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to disconnect integration' });
  }
});

// Update integration config
router.put('/:id/config', async (req, res) => {
  try {
    const { config } = req.body;
    const success = await IntegrationService.updateIntegrationConfig(req.params.id, config);
    if (!success) {
      return res.status(404).json({ message: 'Integration not found' });
    }
    res.json({ message: 'Integration config updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update integration config' });
  }
});

export default router; 
