/**
 * Model Routes
 * API endpoints for model/provider status and selection
 */

const express = require('express');
const router = express.Router();
const modelConfig = require('../services/modelConfig');

/**
 * GET /api/models/status
 * Get status of all configured providers
 * Returns: { activeProvider, providers: { name: { status, model, ... } } }
 */
router.get('/status', async (req, res) => {
  try {
    const statuses = await modelConfig.getAllProviderStatuses();
    const activeProvider = modelConfig.getActiveProvider();

    res.json({
      activeProvider,
      activeModel: modelConfig.getModelForProvider(activeProvider),
      providers: statuses,
    });
  } catch (error) {
    console.error('Model status error:', error);
    res.status(500).json({
      error: 'Failed to get model status',
      code: 'MODEL_STATUS_ERROR',
    });
  }
});

/**
 * POST /api/models/validate/:provider
 * Force re-validation of a specific provider
 */
router.post('/validate/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    modelConfig.clearCache(provider);
    const result = await modelConfig.validateProvider(provider);
    res.json(result);
  } catch (error) {
    console.error('Model validation error:', error);
    res.status(500).json({
      error: 'Failed to validate provider',
      code: 'MODEL_VALIDATION_ERROR',
    });
  }
});

/**
 * GET /api/models/config
 * Get current configuration summary (safe — no keys exposed)
 */
router.get('/config', (req, res) => {
  try {
    const config = modelConfig.getConfigSummary();
    res.json(config);
  } catch (error) {
    console.error('Model config error:', error);
    res.status(500).json({
      error: 'Failed to get config',
      code: 'MODEL_CONFIG_ERROR',
    });
  }
});

module.exports = router;
