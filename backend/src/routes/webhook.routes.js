const express = require('express');
const router = express.Router();

/**
 * Main webhook endpoint to receive all events from Evolution API.
 */
router.post('/evolution', async (req, res) => {
  const { evolutionService } = req;
  try {
    // Asynchronously process the webhook without waiting for the full result
    evolutionService.processWebhook(req.body);
    // Immediately respond to the Evolution API to prevent timeouts/retries
    res
      .status(200)
      .json({
        success: true,
        message: 'Webhook received and is being processed.',
      });
  } catch (error) {
    console.error(
      '[WebhookRoute] Critical error on webhook reception:',
      error.message
    );
    // Still respond 200 so the API doesn't retry
    res
      .status(200)
      .json({
        success: false,
        error: 'Internal server error on webhook processing.',
      });
  }
});

/**
 * Health check for the webhook endpoint.
 */
router.get('/evolution', (req, res) => {
  const { evolutionService } = req;
  res.json({
    status: 'webhook_listener_active',
    timestamp: new Date().toISOString(),
    webhook_url: evolutionService.webhookUrl,
  });
});

/**
 * Endpoint to get current service statistics for debugging.
 */
router.get('/evolution/stats', (req, res) => {
  const { evolutionService } = req;
  try {
    const stats = evolutionService.getCacheStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
