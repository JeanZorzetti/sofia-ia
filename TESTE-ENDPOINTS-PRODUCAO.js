/**
 * 🔍 TESTE ENDPOINTS PRODUÇÃO - sofia-api.roilabs.com.br
 * Verificar se todos endpoints estão funcionando em produção
 */

const PROD_API = 'https://sofia-api.roilabs.com.br';

async function testarEndpointsProdução() {
  console.log('🔍 TESTANDO ENDPOINTS PRODUÇÃO');
  console.log('='.repeat(50));
  
  const endpoints = [
    `${PROD_API}/health`,
    `${PROD_API}/api/dashboard/overview`,
    `${PROD_API}/api/whatsapp/instances`,
    `${PROD_API}/api/whatsapp/stats`,
    `${PROD_API}/api/whatsapp/qr/stats`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔗 Testando: ${endpoint}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Data keys: ${Object.keys(data).join(', ')}`);
      } else {
        console.log(`❌ Status: ${response.status}`);
        console.log(`Error: ${data.error || 'Unknown'}`);
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
  }
  
  // Teste específico de criação de instância
  console.log('\n🎯 TESTANDO CRIAÇÃO DE INSTÂNCIA...');
  try {
    const createResponse = await fetch(`${PROD_API}/api/whatsapp/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'teste-producao-' + Date.now() })
    });
    
    const createData = await createResponse.json();
    
    if (createResponse.ok && createData.success) {
      const instanceId = createData.data.id;
      console.log(`✅ Instância criada: ${instanceId}`);
      
      // Teste QR Code
      console.log('\n🔗 TESTANDO QR CODE PRODUÇÃO...');
      const qrResponse = await fetch(`${PROD_API}/api/whatsapp/instances/${instanceId}/qr`);
      const qrData = await qrResponse.json();
      
      if (qrResponse.ok && qrData.success) {
        console.log(`✅ QR Code obtido!`);
        console.log(`📏 Tamanho: ${qrData.data.qr_code?.length || 'N/A'} chars`);
        console.log(`🔗 Fonte: ${qrData.data.source || 'N/A'}`);
        console.log(`⏰ Expira em: ${qrData.data.expires_in || 'N/A'}s`);
      } else {
        console.log(`❌ QR falhou: ${qrData.error || 'Unknown'}`);
      }
    } else {
      console.log(`❌ Criação falhou: ${createData.error || 'Unknown'}`);
    }
  } catch (error) {
    console.log(`❌ Erro na criação: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 TESTE CONCLUÍDO');
}

testarEndpointsProdução().catch(console.error);
