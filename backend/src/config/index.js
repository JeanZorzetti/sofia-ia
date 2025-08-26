require('dotenv').config();

module.exports = {
  // Configurações da Evolution API
  evolution: {
    apiUrl:
      process.env.EVOLUTION_API_URL || 'https://evolutionapi.roilabs.com.br',
    apiKey: process.env.EVOLUTION_API_KEY, // Removido valor padrão
    webhookUrl:
      process.env.WEBHOOK_URL ||
      'https://sofiaia.roilabs.com.br/webhook/evolution',
  },

  // Configurações do serviço de QR Code
  qrCode: {
    expiryTime: 45000, // 45 segundos (padrão WhatsApp)
    cacheCheckInterval: 10000, // 10 segundos
    autoRefreshOffset: 5000, // Refresh 5s antes de expirar
  },

  // Configurações da aplicação
  app: {
    port: process.env.PORT || 8000,
    env: process.env.NODE_ENV || 'development',
  },

  // Configurações de segurança
  security: {
    jwtSecret: process.env.JWT_SECRET || 'sofia-ia-secret-key-2024',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};
