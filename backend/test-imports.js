/**
 * 🧪 Teste rápido dos serviços Evolution API
 */

console.log('🧪 Testando imports...');

try {
    const EvolutionWebhookService = require('./services/evolution-webhook.service.js');
    console.log('✅ EvolutionWebhookService importado com sucesso');
    
    const webhookRoutes = require('./routes/webhook.routes.js');
    console.log('✅ webhookRoutes importado com sucesso');
    
    console.log('🚀 Todos os serviços importados corretamente!');
    console.log('✅ Pronto para iniciar servidor Sofia IA v3.0.0');
    
} catch (error) {
    console.error('❌ Erro na importação:', error.message);
    console.error('🔍 Stack:', error.stack);
}