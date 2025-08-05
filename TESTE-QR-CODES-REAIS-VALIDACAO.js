/**
 * 🧪 TESTE RÁPIDO: Validar QR Codes REAIS após correção
 * Foco específico na geração de QR codes via Evolution API
 */

const axios = require('axios');

const PRODUCTION_API = 'https://sofia-api.roilabs.com.br';

class QRCodeValidationTest {
    constructor() {
        this.testResults = [];
    }

    async runValidation() {
        console.log('🧪 ===================================');
        console.log('🔥 VALIDAÇÃO: QR Codes REAIS Corrigidos');
        console.log('🔗 Testando: https://sofia-api.roilabs.com.br');
        console.log('🧪 ===================================');
        
        try {
            await this.testHealthCheck();
            await this.testQRCodeGeneration();
            await this.testQRCodeSource();
            await this.testMultipleInstances();
            
            this.printValidationSummary();
            
        } catch (error) {
            console.error('❌ Erro na validação:', error.message);
        }
    }

    async testHealthCheck() {
        console.log('\n🔍 TESTE 1: Health Check Pós-Correção');
        
        try {
            const response = await axios.get(`${PRODUCTION_API}/health`, {
                timeout: 8000
            });
            
            if (response.status === 200) {
                console.log('✅ Backend funcionando');
                console.log(`📊 Versão: ${response.data.version}`);
                
                if (response.data.qrcode_system) {
                    const env = response.data.qrcode_system.production_stats?.environment;
                    console.log(`🌍 Ambiente: ${env}`);
                    
                    if (env === 'PRODUÇÃO') {
                        console.log('✅ Ambiente PRODUÇÃO detectado');
                        this.addResult('Health Check', true, `v${response.data.version} - PRODUÇÃO`);
                    } else {
                        console.log(`⚠️ Ambiente: ${env} (deveria ser PRODUÇÃO)`);
                        this.addResult('Health Check', false, `Ambiente: ${env}`);
                    }
                } else {
                    this.addResult('Health Check', true, 'Básico funcionando');
                }
            }
            
        } catch (error) {
            console.error('❌ Health check falhou:', error.message);
            this.addResult('Health Check', false, error.message);
        }
    }

    async testQRCodeGeneration() {
        console.log('\n🔗 TESTE 2: Geração QR Code com Correções');
        
        try {
            const startTime = Date.now();
            
            // Testar com instância padrão
            const response = await axios.get(`${PRODUCTION_API}/api/whatsapp/instances/sofia-principal/qr`, {
                timeout: 20000 // Mais tempo para processar
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.status === 200 && response.data.success) {
                const data = response.data.data;
                
                console.log('✅ QR Code gerado com sucesso');
                console.log(`⚡ Tempo resposta: ${responseTime}ms`);
                console.log(`🏭 Fonte: ${data.source}`);
                console.log(`🔗 Cache hit: ${data.cache_hit}`);
                console.log(`⏰ Tempo restante: ${data.time_remaining}ms`);
                
                // Verificar se é QR code real
                if (data.source === 'evolution_api') {
                    console.log('🎉 SUCESSO! QR Code REAL via Evolution API!');
                    this.addResult('QR Generation REAL', true, `${responseTime}ms - evolution_api`);
                    
                    // Verificar tamanho do QR code
                    if (data.qr_base64 && data.qr_base64.length > 1000) {
                        console.log(`📏 QR Code válido: ${data.qr_base64.length} chars`);
                    }
                    
                } else if (data.source === 'fallback_simulation' || data.source === 'simulation') {
                    console.log(`⚠️ AINDA SIMULADO: Fonte ${data.source}`);
                    this.addResult('QR Generation REAL', false, `Ainda ${data.source}`);
                    
                } else {
                    console.log(`🔄 Fonte desconhecida: ${data.source}`);
                    this.addResult('QR Generation REAL', false, `Fonte: ${data.source}`);
                }
                
                // Verificar se há warnings
                if (response.data.warning) {
                    console.log(`⚠️ Warning: ${response.data.warning}`);
                }
                
            } else {
                console.log('❌ QR Code generation falhou');
                this.addResult('QR Generation REAL', false, 'Generation failed');
            }
            
        } catch (error) {
            console.error('❌ Erro na geração QR Code:', error.message);
            this.addResult('QR Generation REAL', false, error.message);
        }
    }

    async testQRCodeSource() {
        console.log('\n🏭 TESTE 3: Verificação Específica da Fonte');
        
        try {
            // Testar com nova instância para forçar criação
            const testInstance = `sofia-test-${Date.now()}`;
            
            console.log(`🆕 Testando com nova instância: ${testInstance}`);
            
            const response = await axios.get(`${PRODUCTION_API}/api/whatsapp/instances/${testInstance}/qr`, {
                timeout: 25000 // Tempo extra para criação
            });
            
            if (response.status === 200 && response.data.success) {
                const data = response.data.data;
                
                console.log(`✅ Nova instância QR gerado`);
                console.log(`🏭 Fonte: ${data.source}`);
                
                if (data.source === 'evolution_api') {
                    console.log('🎉 PERFEITO! Nova instância usando Evolution API!');
                    this.addResult('New Instance QR', true, 'evolution_api');
                } else {
                    console.log(`⚠️ Nova instância ainda usando: ${data.source}`);
                    this.addResult('New Instance QR', false, data.source);
                }
                
            } else {
                this.addResult('New Instance QR', false, 'Failed to generate');
            }
            
        } catch (error) {
            console.error('❌ Erro no teste de nova instância:', error.message);
            this.addResult('New Instance QR', false, error.message);
        }
    }

    async testMultipleInstances() {
        console.log('\n📱 TESTE 4: Múltiplas Instâncias');
        
        try {
            const response = await axios.get(`${PRODUCTION_API}/api/whatsapp/instances`, {
                timeout: 8000
            });
            
            if (response.status === 200 && response.data.success) {
                const instances = response.data.data;
                
                console.log(`✅ ${instances.length} instâncias listadas`);
                
                instances.forEach((instance, index) => {
                    console.log(`📱 ${index + 1}. ${instance.name} [${instance.status}]`);
                });
                
                this.addResult('List Instances', true, `${instances.length} instâncias`);
                
                // Verificar se há instâncias conectadas
                const connectedInstances = instances.filter(i => i.status === 'open');
                if (connectedInstances.length > 0) {
                    console.log(`🔗 ${connectedInstances.length} instâncias conectadas`);
                }
                
            } else {
                this.addResult('List Instances', false, 'Failed to list');
            }
            
        } catch (error) {
            console.error('❌ Erro ao listar instâncias:', error.message);
            this.addResult('List Instances', false, error.message);
        }
    }

    addResult(testName, success, details) {
        this.testResults.push({
            name: testName,
            success: success,
            details: details
        });
    }

    printValidationSummary() {
        const successCount = this.testResults.filter(r => r.success).length;
        const totalCount = this.testResults.length;
        
        console.log('\n🧪 ===================================');
        console.log('📊 RESUMO VALIDAÇÃO QR CODES REAIS');
        console.log('🧪 ===================================');
        
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${index + 1}. ${result.name}: ${result.details}`);
        });
        
        console.log('\n📈 RESULTADO FINAL:');
        console.log(`🎯 Sucessos: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
        
        // Verificar se QR codes são reais
        const qrRealTest = this.testResults.find(r => r.name === 'QR Generation REAL');
        if (qrRealTest && qrRealTest.success) {
            console.log('\n🎉 ✅ QR CODES REAIS FUNCIONANDO!');
            console.log('🚀 Evolution API integrada com sucesso!');
            console.log('✅ Sistema pronto para uso em produção!');
            
            console.log('\n🎯 PRÓXIMOS PASSOS:');
            console.log('1. ✅ QR codes REAIS - CONCLUÍDO');
            console.log('2. 🔄 Configurar webhooks bidirecionais');
            console.log('3. 🧠 Integrar Claude 3.5 Sonnet real');
            console.log('4. 👤 Primeiro cliente beta ativo');
            
        } else {
            console.log('\n⚠️ QR CODES AINDA NÃO SÃO REAIS');
            console.log('🔧 Verificar logs do EasyPanel');
            console.log('🔍 Possível causa: Deploy ainda processando');
            console.log('⏰ Aguardar mais alguns minutos e testar novamente');
        }
        
        console.log('\n🔄 RE-TESTAR:');
        console.log('node TESTE-QR-CODES-REAIS-VALIDACAO.js');
        console.log('🧪 ===================================');
    }
}

// 🚀 Executar validação
(async () => {
    console.log('🔥 SOFIA IA - Validação QR Codes REAIS');
    console.log('🎯 Verificando se correções Evolution API funcionaram\n');
    
    const validator = new QRCodeValidationTest();
    await validator.runValidation();
})();
