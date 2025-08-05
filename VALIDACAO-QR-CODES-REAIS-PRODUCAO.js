/**
 * 🔥 TESTE: Validar QR Codes REAIS em Produção
 * Verifica se os QR codes estão sendo gerados corretamente
 * Conexão: sofia-dash.roilabs.com.br → sofia-api.roilabs.com.br
 */

// 🎯 URLs de produção
const DASHBOARD_URL = 'https://sofia-dash.roilabs.com.br';
const API_URL = 'https://sofia-api.roilabs.com.br';
const EVOLUTION_URL = 'https://evolutionapi.roilabs.com.br';

console.log('🔥 INICIANDO VALIDAÇÃO QR CODES REAIS');
console.log('=====================================');

// ✅ Teste 1: Verificar se dashboard carrega
async function testeDashboardCarrega() {
  console.log('\n📊 TESTE 1: Dashboard carrega?');
  
  try {
    const response = await fetch(DASHBOARD_URL);
    
    if (response.ok) {
      console.log('✅ Dashboard acessível:', response.status);
      return true;
    } else {
      console.log('❌ Dashboard inacessível:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao acessar dashboard:', error.message);
    return false;
  }
}

// ✅ Teste 2: Verificar se API está funcionando
async function testeAPIFuncionando() {
  console.log('\n🔧 TESTE 2: API produção funcionando?');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API saudável:', {
        status: data.success,
        uptime: data.uptime,
        timestamp: data.timestamp
      });
      return true;
    } else {
      console.log('❌ API com problemas:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na API:', error.message);
    return false;
  }
}

// ✅ Teste 3: Verificar endpoint de WhatsApp instances
async function testeWhatsAppEndpoint() {
  console.log('\n📱 TESTE 3: WhatsApp endpoints funcionando?');
  
  try {
    const response = await fetch(`${API_URL}/api/whatsapp/instances`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ WhatsApp endpoint OK:', {
        success: data.success,
        instances: data.data?.length || 0,
        stats: data.stats
      });
      return true;
    } else {
      console.log('❌ WhatsApp endpoint erro:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro WhatsApp endpoint:', error.message);
    return false;
  }
}

// ✅ Teste 4: Testar criação de instância (simulação)
async function testeCriarInstancia() {
  console.log('\n🆕 TESTE 4: Criar instância de teste');
  
  try {
    const response = await fetch(`${API_URL}/api/whatsapp/instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'TesteSofiaValidacao',
        force_production: true,
        evolution_api_url: EVOLUTION_URL
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Instância criada:', {
        success: data.success,
        instanceId: data.data?.id,
        name: data.data?.name
      });
      
      return data.data?.id;
    } else {
      console.log('❌ Erro ao criar instância:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na criação:', error.message);
    return null;
  }
}

// ✅ Teste 5: Obter QR Code da instância
async function testeObterQRCode(instanceId) {
  console.log('\n🔲 TESTE 5: Obter QR Code real');
  
  if (!instanceId) {
    console.log('❌ Sem instanceId para testar QR');
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/whatsapp/instances/${instanceId}/qr`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ QR Code obtido:', {
        success: data.success,
        hasQR: !!data.data?.qr_code,
        source: data.data?.source,
        apiUrl: data.data?.api_url,
        expiresIn: data.data?.expires_in
      });
      
      // Verificar se é QR real (não simulação)
      const isReal = data.data?.source === 'evolution_api';
      console.log(isReal ? '✅ QR REAL (Evolution API)' : '⚠️ QR Simulado');
      
      return isReal;
    } else {
      console.log('❌ Erro ao obter QR:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro QR Code:', error.message);
    return false;
  }
}

// ✅ Teste 6: Limpar instância de teste
async function testeLimparInstancia(instanceId) {
  console.log('\n🧹 TESTE 6: Limpar instância de teste');
  
  if (!instanceId) {
    console.log('⚠️ Sem instanceId para limpar');
    return true;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/whatsapp/instances/${instanceId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      console.log('✅ Instância removida:', instanceId);
      return true;
    } else {
      console.log('⚠️ Erro ao remover instância:', response.status);
      return false;
    }
  } catch (error) {
    console.log('⚠️ Erro na remoção:', error.message);
    return false;
  }
}

// 🚀 Executar todos os testes
async function executarValidacaoCompleta() {
  console.log('🔥 EXECUTANDO BATERIA DE TESTES COMPLETA');
  console.log('=======================================');
  
  const resultados = {};
  
  // Executar testes sequencialmente
  resultados.dashboard = await testeDashboardCarrega();
  resultados.api = await testeAPIFuncionando();
  resultados.whatsapp = await testeWhatsAppEndpoint();
  
  const instanceId = await testeCriarInstancia();
  resultados.criarInstancia = !!instanceId;
  
  resultados.qrReal = await testeObterQRCode(instanceId);
  resultados.limpeza = await testeLimparInstancia(instanceId);
  
  // Resumo final
  console.log('\n🎯 RESUMO FINAL DOS TESTES');
  console.log('=========================');
  
  Object.entries(resultados).forEach(([teste, passou]) => {
    console.log(`${passou ? '✅' : '❌'} ${teste.toUpperCase()}`);
  });
  
  const todosPassed = Object.values(resultados).every(r => r);
  
  console.log('\n🏆 RESULTADO GERAL:');
  if (todosPassed) {
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('🎉 QR Codes REAIS funcionando em produção');
    console.log('🚀 Sofia IA pronta para uso end-to-end');
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM');
    console.log('🔧 Verificar configuração e tentar novamente');
  }
  
  return todosPassed;
}

// ⚡ Executar se chamado diretamente
if (typeof window === 'undefined') {
  // Node.js environment
  executarValidacaoCompleta().then(sucesso => {
    process.exit(sucesso ? 0 : 1);
  });
} else {
  // Browser environment
  console.log('🌐 Execute executarValidacaoCompleta() no console');
}

// Export para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    executarValidacaoCompleta,
    testeDashboardCarrega,
    testeAPIFuncionando,
    testeWhatsAppEndpoint,
    testeCriarInstancia,
    testeObterQRCode,
    testeLimparInstancia
  };
}
