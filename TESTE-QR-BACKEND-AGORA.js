/**
 * 🔥 TESTE DEFINITIVO: QR CODES REAIS BACKEND
 * Verifica se sofia-api.roilabs.com.br está servindo QR codes da Evolution API
 * USO: node TESTE-QR-BACKEND-AGORA.js
 */

const BASE_URL = 'https://sofia-api.roilabs.com.br';
const EVOLUTION_URL = 'https://evolutionapi.roilabs.com.br';

async function testarQRBackend() {
  console.log('🔥 TESTE QR CODES REAIS - BACKEND SOFIA IA');
  console.log('='.repeat(50));
  
  try {
    // 1. Health check básico
    console.log('\n1️⃣ TESTANDO HEALTH CHECK...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ Backend online:', healthData);
    } else {
      console.log('❌ Backend offline:', healthResponse.status);
      return;
    }

    // 2. Testar endpoint de instâncias WhatsApp
    console.log('\n2️⃣ TESTANDO ENDPOINT WHATSAPP...');
    const instancesResponse = await fetch(`${BASE_URL}/api/whatsapp/instances`);
    
    if (instancesResponse.ok) {
      const instancesData = await instancesResponse.json();
      console.log('✅ Endpoint WhatsApp:', instancesData);
    } else {
      console.log('❌ Endpoint WhatsApp falhou:', instancesResponse.status);
    }

    // 3. Tentar criar instância de teste
    console.log('\n3️⃣ CRIANDO INSTÂNCIA DE TESTE...');
    const createResponse = await fetch(`${BASE_URL}/api/whatsapp/instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'teste-qr-' + Date.now(),
        force_production: true
      })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Instância criada:', createData);
      
      if (createData.success && createData.data?.id) {
        const instanceId = createData.data.id;
        
        // 4. Tentar obter QR Code
        console.log('\n4️⃣ OBTENDO QR CODE REAL...');
        const qrResponse = await fetch(`${BASE_URL}/api/whatsapp/instances/${instanceId}/qr`);
        
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          console.log('✅ QR CODE OBTIDO:', {
            success: qrData.success,
            qr_length: qrData.data?.qr_code?.length,
            source: qrData.data?.source,
            api_url: qrData.data?.api_url,
            expires_in: qrData.data?.expires_in
          });
          
          if (qrData.data?.qr_code) {
            console.log('\n🎯 QR CODE PREVIEW:', qrData.data.qr_code.substring(0, 100) + '...');
            console.log('\n🔥 SUCESSO! QR CODES REAIS ESTÃO FUNCIONANDO!');
          } else {
            console.log('\n❌ QR CODE VAZIO ou MALFORMADO');
          }
        } else {
          console.log('❌ Erro ao obter QR:', qrResponse.status);
          const errorText = await qrResponse.text();
          console.log('Error details:', errorText);
        }
      }
    } else {
      console.log('❌ Erro ao criar instância:', createResponse.status);
      const errorText = await createResponse.text();
      console.log('Error details:', errorText);
    }

    // 5. Testar Evolution API diretamente
    console.log('\n5️⃣ TESTANDO EVOLUTION API DIRETAMENTE...');
    try {
      const evolutionResponse = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
        headers: {
          'apikey': 'sua-api-key-aqui' // ← PRECISA DA API KEY REAL
        }
      });
      
      if (evolutionResponse.ok) {
        const evolutionData = await evolutionResponse.json();
        console.log('✅ Evolution API responde:', evolutionData);
      } else {
        console.log('❌ Evolution API erro:', evolutionResponse.status);
      }
    } catch (err) {
      console.log('❌ Evolution API inacessível:', err.message);
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 TESTE CONCLUÍDO');
}

// 🚀 EXECUTAR TESTE
testarQRBackend().catch(console.error);
