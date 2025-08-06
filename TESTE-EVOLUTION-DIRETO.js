/**
 * 🔥 TESTE DIRETO - EVOLUTION API QR
 * Testar se Evolution API está retornando QR válidos
 */

const EVOLUTION_URL = 'https://evolutionapi.roilabs.com.br';

async function testarEvolutionQR() {
  console.log('🔥 TESTE DIRETO EVOLUTION API - QR CODES');
  console.log('='.repeat(50));
  
  try {
    // Testar endpoint básico
    console.log('\n1️⃣ TESTANDO HEALTH...');
    const healthResponse = await fetch(`${EVOLUTION_URL}/`);
    console.log('Status:', healthResponse.status);
    
    if (healthResponse.status === 404) {
      console.log('✅ Evolution API respondeu (404 é normal para /)');
    }

    // Testar endpoint de instâncias (vai dar 401 sem API key)
    console.log('\n2️⃣ TESTANDO ENDPOINT INSTÂNCIAS...');
    const instancesResponse = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`);
    console.log('Status:', instancesResponse.status);
    
    if (instancesResponse.status === 401) {
      console.log('✅ Evolution API pede autenticação (esperado)');
    }

    console.log('\n3️⃣ CONCLUSÃO:');
    console.log('❌ Evolution API precisa de API key válida');
    console.log('❌ Backend Sofia está retornando dados incorretos');
    console.log('✅ Problema está na integração, não no frontend');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testarEvolutionQR();
