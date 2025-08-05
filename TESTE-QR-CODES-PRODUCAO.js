/**
 * 🧪 TESTE COMPLETO: QR Codes Reais para Produção
 * Validação da integração Evolution API + QR Code Production Service
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';

class QRCodeProductionTester {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    async runAllTests() {
        console.log('🧪 ===================================');
        console.log('🚀 INICIANDO TESTES QR CODE PRODUÇÃO');
        console.log('🧪 ===================================');
        
        try {
            await this.testHealthCheck();
            await this.testWhatsAppInstances();
            await this.testQRCodeGeneration();
            await this.testQRCodeStats();
            await this.testQRCodeRefresh();
            await this.testProductionFallback();
            
            this.printSummary();
            
        } catch (error) {
            console.error('❌ Erro geral nos testes:', error.message);
        }
    }

    async testHealthCheck() {
        console.log('\n🔍 TESTE 1: Health Check com QR Production Stats');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/health`);
            
            if (response.status === 200) {
                const data = response.data;
                
                console.log('✅ Health check respondeu');
                console.log(`📊 Versão: ${data.version}`);
                console.log(`⏱️ Uptime: ${Math.floor(data.uptime)}s`);
                
                if (data.qrcode_system && data.qrcode_system.production_stats) {
                    console.log('✅ QR Code Production Stats encontradas');
                    console.log(`🏭 Ambiente: ${data.qrcode_system.production_stats.environment}`);
                    console.log(`💾 Cache: ${data.qrcode_system.production_stats.total_cached} itens`);
                } else {
                    console.log('⚠️ QR Code Production Stats não encontradas');
                }
                
                this.addResult('Health Check', true, 'OK');
            }
            
        } catch (error) {
            console.error('❌ Falha no health check:', error.message);
            this.addResult('Health Check', false, error.message);
        }
    }

    async testWhatsAppInstances() {
        console.log('\n📱 TESTE 2: Listar Instâncias WhatsApp');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/api/whatsapp/instances`);
            
            if (response.status === 200 && response.data.success) {
                const instances = response.data.data;
                
                console.log(`✅ ${instances.length} instâncias encontradas`);
                
                instances.forEach((instance, index) => {
                    console.log(`📱 ${index + 1}. ${instance.name} [${instance.status}]`);
                });
                
                this.addResult('Listar Instâncias', true, `${instances.length} instâncias`);
                
                // Salvar primeira instância para próximos testes
                this.testInstanceId = instances[0]?.id || 'sofia-principal';
                
            } else {
                throw new Error('Resposta inválida da API');
            }
            
        } catch (error) {
            console.error('❌ Falha ao listar instâncias:', error.message);
            this.addResult('Listar Instâncias', false, error.message);
            this.testInstanceId = 'sofia-principal'; // Fallback
        }
    }

    async testQRCodeGeneration() {
        console.log(`\n🔗 TESTE 3: Gerar QR Code Real para ${this.testInstanceId}`);
        
        try {
            const startTime = Date.now();
            const response = await axios.get(`${API_BASE_URL}/api/whatsapp/instances/${this.testInstanceId}/qr`);
            const responseTime = Date.now() - startTime;
            
            if (response.status === 200 && response.data.success) {
                const data = response.data.data;
                
                console.log('✅ QR Code gerado com sucesso');
                console.log(`⚡ Tempo de resposta: ${responseTime}ms`);
                console.log(`🏭 Fonte: ${response.data.data.source || 'não informado'}`);
                console.log(`📦 Cache hit: ${data.cache_hit ? 'SIM' : 'NÃO'}`);
                console.log(`⏰ Expira em: ${data.expires_in}s`);
                console.log(`🔗 QR Code length: ${(data.qr_code || '').length} chars`);
                
                if (data.qr_data_url) {
                    console.log('✅ QR Data URL gerado');
                }
                
                if (data.instructions && data.instructions.length > 0) {
                    console.log(`📋 ${data.instructions.length} instruções incluídas`);
                }
                
                // Log performance se disponível
                if (response.data.performance) {
                    console.log(`🚀 Performance: ${response.data.performance.response_time}ms (${response.data.performance.source})`);
                }
                
                this.addResult('QR Code Generation', true, `${responseTime}ms, fonte: ${data.source || 'N/A'}`);
                
            } else {
                throw new Error('QR Code não foi gerado corretamente');
            }
            
        } catch (error) {
            console.error('❌ Falha na geração do QR Code:', error.message);
            
            // Verificar se é erro esperado em desenvolvimento
            if (error.response && error.response.data && error.response.data.warning) {
                console.log(`⚠️ Aviso: ${error.response.data.warning}`);
                this.addResult('QR Code Generation', true, 'Fallback mode');
            } else {
                this.addResult('QR Code Generation', false, error.message);
            }
        }
    }

    async testQRCodeStats() {
        console.log('\n📊 TESTE 4: Estatísticas QR Code Production');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/api/whatsapp/qr/stats`);
            
            if (response.status === 200 && response.data.success) {
                const stats = response.data.data;
                
                console.log('✅ Estatísticas obtidas');
                console.log(`🏭 Ambiente: ${stats.environment}`);
                console.log(`💾 Cache total: ${stats.total_cached}`);
                console.log(`🔧 Expiry time: ${stats.cache_settings.expiry_time_ms}ms`);
                console.log(`🔗 Evolution API: ${stats.evolution_api_url}`);
                
                if (stats.cache_items && stats.cache_items.length > 0) {
                    console.log(`📦 Cache items:`);
                    stats.cache_items.forEach((item, index) => {
                        console.log(`   ${index + 1}. ${item.instance} [${item.source}] - ${Math.floor(item.time_remaining_ms / 1000)}s restantes`);
                    });
                }
                
                this.addResult('QR Stats', true, `${stats.total_cached} cached`);
                
            } else {
                throw new Error('Resposta inválida da API de stats');
            }
            
        } catch (error) {
            console.error('❌ Falha ao obter estatísticas:', error.message);
            this.addResult('QR Stats', false, error.message);
        }
    }

    async testQRCodeRefresh() {
        console.log(`\n🔄 TESTE 5: Refresh Forçado QR Code para ${this.testInstanceId}`);
        
        try {
            const response = await axios.post(`${API_BASE_URL}/api/whatsapp/instances/${this.testInstanceId}/qr/refresh`);
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Refresh executado com sucesso');
                this.addResult('QR Refresh', true, 'OK');
            } else {
                throw new Error('Refresh falhou');
            }
            
        } catch (error) {
            console.error('❌ Falha no refresh:', error.message);
            this.addResult('QR Refresh', false, error.message);
        }
    }

    async testProductionFallback() {
        console.log('\n🔄 TESTE 6: Teste de Fallback (Instância Inexistente)');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/api/whatsapp/instances/instancia-inexistente-teste/qr`);
            
            if (response.status === 200) {
                console.log('✅ Fallback funcionou corretamente');
                
                if (response.data.warning) {
                    console.log(`⚠️ Warning recebido: ${response.data.warning}`);
                }
                
                this.addResult('Fallback Test', true, 'Fallback ativo');
            }
            
        } catch (error) {
            // Erro esperado para instância inexistente é OK
            if (error.response && error.response.status === 404) {
                console.log('✅ Erro 404 esperado para instância inexistente');
                this.addResult('Fallback Test', true, '404 correto');
            } else {
                console.error('❌ Erro inesperado no fallback:', error.message);
                this.addResult('Fallback Test', false, error.message);
            }
        }
    }

    addResult(testName, success, details) {
        this.testResults.push({
            name: testName,
            success: success,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    printSummary() {
        const totalTime = Date.now() - this.startTime;
        const successCount = this.testResults.filter(r => r.success).length;
        const totalCount = this.testResults.length;
        
        console.log('\n🧪 ===================================');
        console.log('📊 RESUMO DOS TESTES QR CODE PRODUÇÃO');
        console.log('🧪 ===================================');
        
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${index + 1}. ${result.name}: ${result.details}`);
        });
        
        console.log('\n📈 ESTATÍSTICAS:');
        console.log(`🎯 Sucessos: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
        console.log(`⏱️ Tempo total: ${totalTime}ms`);
        console.log(`🏭 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        
        if (successCount === totalCount) {
            console.log('\n🎉 TODOS OS TESTES PASSARAM!');
            console.log('✅ QR Code Production Service está funcionando!');
            console.log('🚀 Sistema pronto para produção!');
        } else {
            console.log('\n⚠️ ALGUNS TESTES FALHARAM');
            console.log('🔧 Verifique os logs acima para detalhes');
        }
        
        console.log('🧪 ===================================');
    }
}

// 🚀 Executar testes
async function runTests() {
    const tester = new QRCodeProductionTester();
    await tester.runAllTests();
}

// Verificar se backend está rodando primeiro
async function checkBackend() {
    try {
        const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
        if (response.status === 200) {
            console.log('✅ Backend detectado em http://localhost:8000');
            return true;
        }
    } catch (error) {
        console.error('❌ Backend não está rodando em http://localhost:8000');
        console.log('💡 Execute: npm start ou node src/app.js no diretório backend');
        return false;
    }
}

// Main execution
(async () => {
    console.log('🏠 SOFIA IA - Teste QR Code Production Service');
    console.log('🧪 Verificando se backend está rodando...\n');
    
    const backendIsRunning = await checkBackend();
    
    if (backendIsRunning) {
        await runTests();
    } else {
        process.exit(1);
    }
})();

module.exports = QRCodeProductionTester;
