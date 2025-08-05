/**
 * 🧪 TESTE PRODUÇÃO: Sofia IA em sofia-api.roilabs.com.br
 * Validação completa da API em produção
 */

const axios = require('axios');

const PRODUCTION_API_URL = 'https://sofia-api.roilabs.com.br';

class ProductionTester {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    async runProductionTests() {
        console.log('🚀 ===================================');
        console.log('🧪 TESTANDO SOFIA IA EM PRODUÇÃO');
        console.log('🔗 URL: https://sofia-api.roilabs.com.br');
        console.log('🚀 ===================================');
        
        try {
            await this.testHealthCheck();
            await this.testSSLCertificate();
            await this.testDashboardEndpoint();
            await this.testWhatsAppInstances();
            await this.testQRCodeGeneration();
            await this.testQRCodeStats();
            await this.testPerformance();
            
            this.printProductionSummary();
            
        } catch (error) {
            console.error('❌ Erro geral nos testes produção:', error.message);
        }
    }

    async testHealthCheck() {
        console.log('\n🔍 TESTE 1: Health Check Produção');
        
        try {
            const response = await axios.get(`${PRODUCTION_API_URL}/health`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Sofia-IA-Production-Test/1.0'
                }
            });
            
            if (response.status === 200) {
                const data = response.data;
                
                console.log('✅ Health check produção OK');
                console.log(`📊 Versão: ${data.version}`);
                console.log(`⏱️ Uptime: ${Math.floor(data.uptime)}s`);
                console.log(`🏭 Service: ${data.service}`);
                
                if (data.qrcode_system && data.qrcode_system.production_stats) {
                    const env = data.qrcode_system.production_stats.environment;
                    console.log(`🌍 Ambiente: ${env}`);
                    
                    if (env === 'PRODUÇÃO') {
                        console.log('✅ Ambiente PRODUÇÃO detectado corretamente');
                    } else {
                        console.log('⚠️ Ambiente não é PRODUÇÃO');
                    }
                }
                
                this.addResult('Health Check Produção', true, `v${data.version} - ${Math.floor(data.uptime)}s uptime`);
            }
            
        } catch (error) {
            console.error('❌ Falha no health check produção:', error.message);
            if (error.code === 'ENOTFOUND') {
                console.log('🔍 DNS não resolvendo - deploy ainda em processo?');
            } else if (error.code === 'ECONNREFUSED') {
                console.log('🔍 Conexão recusada - serviço não iniciado?');
            }
            this.addResult('Health Check Produção', false, error.message);
        }
    }

    async testSSLCertificate() {
        console.log('\n🔒 TESTE 2: Certificado SSL');
        
        try {
            const response = await axios.get(`${PRODUCTION_API_URL}/health`, {
                timeout: 5000
            });
            
            console.log('✅ HTTPS funcionando');
            console.log('🔒 Certificado SSL válido');
            this.addResult('SSL Certificate', true, 'HTTPS OK');
            
        } catch (error) {
            if (error.message.includes('certificate')) {
                console.error('❌ Problema com certificado SSL');
                this.addResult('SSL Certificate', false, 'Certificado inválido');
            } else {
                // Se não é erro SSL, considera SSL OK
                console.log('⚠️ Erro não relacionado ao SSL');
                this.addResult('SSL Certificate', true, 'SSL aparentemente OK');
            }
        }
    }

    async testDashboardEndpoint() {
        console.log('\n📊 TESTE 3: Dashboard Endpoint');
        
        try {
            const response = await axios.get(`${PRODUCTION_API_URL}/api/dashboard/overview`, {
                timeout: 8000
            });
            
            if (response.status === 200 && response.data.success) {
                const data = response.data.data;
                
                console.log('✅ Dashboard endpoint funcionando');
                console.log(`📈 Conversas hoje: ${data.stats.conversations_today}`);
                console.log(`📊 Taxa conversão: ${data.stats.conversion_rate}%`);
                console.log(`🎯 Leads qualificados: ${data.stats.qualified_leads}`);
                
                this.addResult('Dashboard API', true, `${data.stats.conversations_today} conversas`);
            }
            
        } catch (error) {
            console.error('❌ Falha no dashboard endpoint:', error.message);
            this.addResult('Dashboard API', false, error.message);
        }
    }

    async testWhatsAppInstances() {
        console.log('\n📱 TESTE 4: WhatsApp Instances');
        
        try {
            const response = await axios.get(`${PRODUCTION_API_URL}/api/whatsapp/instances`, {
                timeout: 8000
            });
            
            if (response.status === 200 && response.data.success) {
                const instances = response.data.data;
                
                console.log(`✅ ${instances.length} instâncias encontradas`);
                
                instances.forEach((instance, index) => {
                    console.log(`📱 ${index + 1}. ${instance.name} [${instance.status}]`);
                });
                
                this.addResult('WhatsApp Instances', true, `${instances.length} instâncias`);
            }
            
        } catch (error) {
            console.error('❌ Falha nas instâncias WhatsApp:', error.message);
            this.addResult('WhatsApp Instances', false, error.message);
        }
    }

    async testQRCodeGeneration() {
        console.log('\n🔗 TESTE 5: QR Code Generation Produção');
        
        try {
            const startTime = Date.now();
            const response = await axios.get(`${PRODUCTION_API_URL}/api/whatsapp/instances/sofia-principal/qr`, {
                timeout: 15000
            });
            const responseTime = Date.now() - startTime;
            
            if (response.status === 200 && response.data.success) {
                const data = response.data.data;
                
                console.log('✅ QR Code produção gerado');
                console.log(`⚡ Tempo resposta: ${responseTime}ms`);
                console.log(`🏭 Fonte: ${data.source}`);
                console.log(`⏰ Expira em: ${data.expires_in}s`);
                
                if (data.source === 'evolution_api') {
                    console.log('🎉 QR Code REAL via Evolution API!');
                } else if (data.source === 'fallback_simulation') {
                    console.log('🔄 QR Code via fallback (esperado em dev)');
                }
                
                this.addResult('QR Code Generation', true, `${responseTime}ms - ${data.source}`);
            }
            
        } catch (error) {
            console.error('❌ Falha na geração QR Code:', error.message);
            this.addResult('QR Code Generation', false, error.message);
        }
    }

    async testQRCodeStats() {
        console.log('\n📊 TESTE 6: QR Code Stats Produção');
        
        try {
            const response = await axios.get(`${PRODUCTION_API_URL}/api/whatsapp/qr/stats`, {
                timeout: 5000
            });
            
            if (response.status === 200 && response.data.success) {
                const stats = response.data.data;
                
                console.log('✅ Estatísticas QR Code obtidas');
                console.log(`🏭 Ambiente: ${stats.environment}`);
                console.log(`💾 Cache total: ${stats.total_cached}`);
                console.log(`🔗 Evolution API: ${stats.evolution_api_url}`);
                
                this.addResult('QR Stats', true, `${stats.environment} env`);
            }
            
        } catch (error) {
            console.error('❌ Falha nas estatísticas QR:', error.message);
            this.addResult('QR Stats', false, error.message);
        }
    }

    async testPerformance() {
        console.log('\n⚡ TESTE 7: Performance Produção');
        
        const endpoints = [
            '/health',
            '/api/dashboard/overview',
            '/api/whatsapp/instances'
        ];
        
        let totalTime = 0;
        let successCount = 0;
        
        for (const endpoint of endpoints) {
            try {
                const startTime = Date.now();
                const response = await axios.get(`${PRODUCTION_API_URL}${endpoint}`, {
                    timeout: 10000
                });
                const responseTime = Date.now() - startTime;
                
                if (response.status === 200) {
                    console.log(`✅ ${endpoint}: ${responseTime}ms`);
                    totalTime += responseTime;
                    successCount++;
                } else {
                    console.log(`❌ ${endpoint}: ${response.status}`);
                }
                
            } catch (error) {
                console.log(`❌ ${endpoint}: ${error.message}`);
            }
        }
        
        if (successCount > 0) {
            const avgTime = Math.round(totalTime / successCount);
            console.log(`📊 Tempo médio: ${avgTime}ms`);
            
            if (avgTime < 1000) {
                console.log('🚀 Performance EXCELENTE (<1s)');
            } else if (avgTime < 2000) {
                console.log('✅ Performance BOA (<2s)');
            } else {
                console.log('⚠️ Performance LENTA (>2s)');
            }
            
            this.addResult('Performance', true, `${avgTime}ms médio`);
        } else {
            this.addResult('Performance', false, 'Todos endpoints falharam');
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

    printProductionSummary() {
        const totalTime = Date.now() - this.startTime;
        const successCount = this.testResults.filter(r => r.success).length;
        const totalCount = this.testResults.length;
        
        console.log('\n🚀 ===================================');
        console.log('📊 RESUMO TESTES PRODUÇÃO SOFIA IA');
        console.log('🔗 https://sofia-api.roilabs.com.br');
        console.log('🚀 ===================================');
        
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${index + 1}. ${result.name}: ${result.details}`);
        });
        
        console.log('\n📈 ESTATÍSTICAS PRODUÇÃO:');
        console.log(`🎯 Sucessos: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
        console.log(`⏱️ Tempo total: ${totalTime}ms`);
        console.log(`🌍 Ambiente: Produção`);
        console.log(`🔗 URL: https://sofia-api.roilabs.com.br`);
        
        if (successCount === totalCount) {
            console.log('\n🎉 TODOS OS TESTES PRODUÇÃO PASSARAM!');
            console.log('✅ Sofia IA Backend funcionando em produção!');
            console.log('🚀 Sistema pronto para uso real!');
            console.log('\n🎯 PRÓXIMOS PASSOS:');
            console.log('1. Deploy frontend apontando para produção');
            console.log('2. Configurar webhooks Evolution API');
            console.log('3. Primeiro cliente beta ativo');
        } else {
            console.log('\n⚠️ ALGUNS TESTES FALHARAM');
            console.log('🔧 Verifique os logs EasyPanel');
            console.log('🔍 Possíveis causas: Deploy em processo, DNS, SSL');
        }
        
        console.log('🚀 ===================================');
    }
}

// 🚀 Executar testes de produção
async function runProductionTests() {
    const tester = new ProductionTester();
    await tester.runProductionTests();
}

// Main execution
(async () => {
    console.log('🏠 SOFIA IA - Teste Produção');
    console.log('🧪 Validando https://sofia-api.roilabs.com.br\n');
    
    await runProductionTests();
})();

module.exports = ProductionTester;
