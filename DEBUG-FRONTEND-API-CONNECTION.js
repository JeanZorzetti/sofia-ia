/**
 * 🔍 TESTE DEBUG: Verificar qual API o frontend está usando
 * Executar no DevTools do browser para debugar conexão
 */

console.log('🔍 SOFIA IA - Debug Frontend API Connection');
console.log('==========================================');

// 1. Verificar hostname atual
console.log('🌍 Hostname atual:', window.location.hostname);
console.log('🔗 URL completa:', window.location.href);

// 2. Simular lógica do getApiBaseUrl
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      return 'http://localhost:8000';
    }
  }
  
  return 'https://sofia-api.roilabs.com.br';
};

const apiUrl = getApiBaseUrl();
console.log('🎯 API URL detectada:', apiUrl);

// 3. Testar conexão com API
console.log('🧪 Testando conexão com API...');

fetch(`${apiUrl}/health`)
  .then(response => {
    console.log('📡 Status da resposta API:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('✅ API respondeu:', data);
    console.log('📊 Versão backend:', data.version);
    console.log('🌍 Ambiente backend:', data.qrcode_system?.production_stats?.environment);
  })
  .catch(error => {
    console.error('❌ Erro na API:', error);
  });

// 4. Testar endpoint QR Code específico
console.log('🔗 Testando endpoint QR Code...');

fetch(`${apiUrl}/api/whatsapp/instances/sofia-principal/qr`)
  .then(response => {
    console.log('📱 Status QR Code:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📱 QR Code data:', data);
    if (data.success && data.data) {
      console.log('🏭 Fonte QR Code:', data.data.source);
      console.log('⏰ Cache hit:', data.data.cache_hit);
      
      if (data.data.source === 'evolution_api') {
        console.log('🎉 SUCESSO! QR Code REAL via Evolution API!');
      } else {
        console.log('⚠️ PROBLEMA: QR Code ainda simulado:', data.data.source);
      }
    }
  })
  .catch(error => {
    console.error('❌ Erro no QR Code:', error);
  });

// 5. Verificar variáveis de ambiente (se disponíveis)
console.log('🔧 Variáveis de ambiente disponíveis:');
console.log('VITE_API_BASE_URL:', import.meta?.env?.VITE_API_BASE_URL || 'NÃO DISPONÍVEL');
console.log('VITE_API_URL:', import.meta?.env?.VITE_API_URL || 'NÃO DISPONÍVEL');

// 6. Informações do browser
console.log('🌐 Info do browser:');
console.log('User Agent:', navigator.userAgent);
console.log('Timestamp:', new Date().toISOString());

console.log('==========================================');
console.log('🎯 ANÁLISE:');
console.log('- Se API URL = localhost:8000 → Você está em desenvolvimento');
console.log('- Se API URL = sofia-api.roilabs.com.br → Você está em produção');
console.log('- Se Fonte QR = evolution_api → QR codes REAIS funcionando');
console.log('- Se Fonte QR = simulation → Ainda simulado, precisa investigar');
console.log('==========================================');
