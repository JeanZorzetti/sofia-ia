/**
 * 🧪 Teste rápido dos serviços Evolution API (corrigido para src)
 */

console.log('🧪 Testando imports do diretório src...');

try {
    const EvolutionWebhookService = require('./services/evolution-webhook.service.js');
    console.log('✅ EvolutionWebhookService importado com sucesso');
    
    const webhookRoutes = require('./routes/webhook.routes.js');
    console.log('✅ webhookRoutes importado com sucesso');
    
    console.log('🚀 Todos os serviços importados corretamente!');
    console.log('✅ Pronto para iniciar servidor Sofia IA v3.0.0');
    
    // Teste básico de inicialização
    const service = new EvolutionWebhookService();
    console.log('✅ EvolutionWebhookService inicializado com sucesso');
    console.log(`🌐 API URL: ${service.apiUrl}`);
    console.log(`🔔 Webhook URL: ${service.webhookUrl}`);
    
} catch (error) {
    console.error('❌ Erro na importação:', error.message);
    console.error('🔍 Stack:', error.stack);
}