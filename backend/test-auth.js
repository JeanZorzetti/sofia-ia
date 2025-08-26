/**
 * 🧪 Teste rápido do sistema de autenticação
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000';

async function testAuth() {
  console.log('🧪 Testando sistema de autenticação Sofia IA\n');

  try {
    // 1. Teste de health check (sem auth)
    console.log('1. 🏥 Testando health check...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check OK:', health.data.status);
    
    // 2. Teste de login
    console.log('\n2. 🔐 Testando login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'secret123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login bem-sucedido!');
      console.log('   Token:', loginResponse.data.data.token.substring(0, 20) + '...');
      console.log('   Usuário:', loginResponse.data.data.user.username);
      console.log('   Role:', loginResponse.data.data.user.role);
    } else {
      throw new Error('Login falhou');
    }
    
    const token = loginResponse.data.data.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 3. Teste de endpoint protegido (instances)
    console.log('\n3. 📱 Testando endpoint protegido /api/instances...');
    const instances = await axios.get(`${API_BASE}/api/instances`, {
      headers: authHeaders
    });
    console.log('✅ Instâncias obtidas:', instances.data);
    
    // 4. Teste de endpoint protegido (dashboard)
    console.log('\n4. 📊 Testando endpoint protegido /api/dashboard/overview...');
    const dashboard = await axios.get(`${API_BASE}/api/dashboard/overview`, {
      headers: authHeaders
    });
    console.log('✅ Dashboard data obtido:', Object.keys(dashboard.data.data));
    
    // 5. Teste de endpoint sem auth (deve falhar)
    console.log('\n5. 🚫 Testando acesso sem token (deve falhar)...');
    try {
      await axios.get(`${API_BASE}/api/instances`);
      console.log('❌ ERRO: Endpoint deveria estar protegido!');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ Proteção funcionando - 401 Unauthorized');
      } else {
        console.log('⚠️ Erro inesperado:', err.response?.status);
      }
    }
    
    // 6. Teste de refresh token
    console.log('\n6. 🔄 Testando refresh do token...');
    const refresh = await axios.post(`${API_BASE}/auth/refresh`, {}, {
      headers: authHeaders
    });
    
    if (refresh.data.success) {
      console.log('✅ Token renovado com sucesso!');
      console.log('   Novo token:', refresh.data.data.token.substring(0, 20) + '...');
    }
    
    // 7. Teste de perfil do usuário
    console.log('\n7. 👤 Testando endpoint de perfil...');
    const profile = await axios.get(`${API_BASE}/auth/profile`, {
      headers: authHeaders
    });
    console.log('✅ Perfil obtido:', profile.data.data);
    
    // 8. Teste de rate limiting (fazer muitas requisições)
    console.log('\n8. ⚡ Testando rate limiting...');
    let rateLimitHit = false;
    for (let i = 0; i < 10; i++) {
      try {
        await axios.get(`${API_BASE}/health`);
      } catch (err) {
        if (err.response?.status === 429) {
          console.log('✅ Rate limiting ativo - requisição', i + 1);
          rateLimitHit = true;
          break;
        }
      }
    }
    
    if (!rateLimitHit) {
      console.log('⚠️ Rate limiting não foi ativado (normal para poucos requests)');
    }
    
    console.log('\n🎉 Todos os testes concluídos!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Executar teste se for chamado diretamente
if (require.main === module) {
  testAuth();
}

module.exports = { testAuth };