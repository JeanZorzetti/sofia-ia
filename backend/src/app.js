const express = require('express');
const cors = require('cors');
const config = require('./config');
const evolutionService = require('./services/evolution.service');
const qrCodeService = require('./services/qrcode.service');
const webhookRoutes = require('./routes/webhook.routes');

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://sofia-dash.roilabs.com.br',
      'https://sofia-ai-lux-dash.vercel.app',
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Make services available to routes
app.use((req, _, next) => {
  req.evolutionService = evolutionService;
  req.qrCodeService = qrCodeService;
  next();
});

// --- API Routes ---

// Webhook routes (for Evolution API to call us)
app.use('/webhook', webhookRoutes);

// Health Check
app.get('/health', async (req, res) => {
  const evolutionHealth = await evolutionService.healthCheck();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Sofia IA Backend',
    version: '6.0.0-refactored',
    uptime: process.uptime(),
    evolution_api: evolutionHealth,
  });
});

// --- Instance Management ---
app.get('/api/instances', async (req, res) => {
  const result = await evolutionService.fetchInstances();
  res.status(result.success ? 200 : 500).json(result);
});

app.post('/api/instances', async (req, res) => {
  const { instanceName, settings } = req.body;
  if (!instanceName) {
    return res
      .status(400)
      .json({ success: false, error: 'instanceName is required' });
  }
  const result = await evolutionService.createInstance(instanceName, settings);
  res.status(result.success ? 201 : 500).json(result);
});

app.delete('/api/instances/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  const result = await evolutionService.deleteInstance(instanceName);
  res.status(result.success ? 200 : 500).json(result);
});

app.post('/api/instances/:instanceName/logout', async (req, res) => {
  const { instanceName } = req.params;
  const result = await evolutionService.logoutInstance(instanceName);
  res.status(result.success ? 200 : 500).json(result);
});

// --- QR Code ---
app.get('/api/instances/:instanceName/qrcode', async (req, res) => {
  const { instanceName } = req.params;
  const forceRefresh = req.query.refresh === 'true';
  const result = await qrCodeService.getQRCode(instanceName, forceRefresh);
  res.status(result.success ? 200 : 500).json(result);
});

// --- Messaging ---
app.post('/api/messages/send', async (req, res) => {
  const { instanceName, number, text } = req.body;
  if (!instanceName || !number || !text) {
    return res
      .status(400)
      .json({
        success: false,
        error: 'instanceName, number, and text are required',
      });
  }
  const result = await evolutionService.sendMessage(instanceName, number, text);
  res.status(result.success ? 200 : 500).json(result);
});

// --- Graceful Shutdown ---
const cleanup = () => {
  console.log('👋 Shutting down server...');
  evolutionService.cleanup();
  qrCodeService.cleanup();
  process.exit(0);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// --- Start Server ---
app.listen(config.app.port, () => {
  console.log('==========================================');
  console.log(`🚀 SOFIA IA BACKEND v6.0 (Refactored)`);
  console.log(`✅ Server listening on port ${config.app.port}`);
  console.log(`🔧 Environment: ${config.app.env}`);
  console.log('==========================================');
});

module.exports = app;
