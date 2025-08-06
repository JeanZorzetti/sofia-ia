/**
 * 🧪 Teste de inicialização do servidor (rápido)
 */

console.log('🧪 Testando inicialização do servidor Sofia IA...');

try {
    // Importar dependências principais
    const express = require('express');
    const cors = require('cors');
    console.log('✅ Express e CORS importados');
    
    // Importar serviços customizados
    const EvolutionWebhookService = require('./services/evolution-webhook.service.js');
    const webhookRoutes = require('./routes/webhook.routes.js');
    console.log('✅ Serviços customizados importados');
    
    // Testar inicialização básica
    const app = express();
    const evolutionWebhookService = new EvolutionWebhookService();
    console.log('✅ App Express e EvolutionWebhookService inicializados');
    
    // Testar configurações
    app.use(cors());
    app.use(express.json());
    app.set('evolutionWebhookService', evolutionWebhookService);
    app.use('/webhook', webhookRoutes);
    console.log('✅ Middleware e rotas configurados');
    
    // Testar endpoint simples
    app.get('/test', (req, res) => {
        res.json({ status: 'ok', message: 'Sofia IA funcionando!' });
    });
    console.log('✅ Endpoint de teste adicionado');
    
    console.log('🚀 TESTE DE INICIALIZAÇÃO CONCLUÍDO COM SUCESSO!');
    console.log('✅ Servidor Sofia IA v3.0.0 está pronto para rodar!');
    
    // Mostrar resumo da configuração
    console.log('📋 RESUMO DA CONFIGURAÇÃO:');
    console.log(`🌐 Evolution API URL: ${evolutionWebhookService.apiUrl}`);
    console.log(`🔑 API Key: ${evolutionWebhookService.apiKey.substring(0, 10)}...`);
    console.log(`🔔 Webhook URL: ${evolutionWebhookService.webhookUrl}`);
    
    process.exit(0);
    
} catch (error) {
    console.error('❌ Erro na inicialização:', error.message);
    console.error('🔍 Stack:', error.stack);
    process.exit(1);
}