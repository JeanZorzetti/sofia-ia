// Force QR refresh: 05/08/2025 11:15:30 
export const FORCE_QR_REFRESH = Date.now(); 

// 🔥 PRODUÇÃO: QR Codes REAIS configurados
export const PRODUCTION_CONFIG = {
  API_URL: 'https://sofia-api.roilabs.com.br',
  EVOLUTION_URL: 'https://evolutionapi.roilabs.com.br',
  FORCE_REAL_QR: true,
  TIMESTAMP: '2025-08-05T11:15:30.000Z'
};

// 🎯 Este arquivo força o rebuild do Vercel com nova configuração
// Toda vez que este arquivo muda, Vercel rebuilda com os QR codes REAIS
