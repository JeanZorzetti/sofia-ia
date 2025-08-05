/**
 * 🔍 DIAGNÓSTICO: Por que QR codes não são reais em produção
 * Verificação completa do sistema produção
 */

const axios = require('axios');

const PRODUCTION_API = 'https://sofia-api.roilabs.com.br';

class ProductionDiagnostic {
    constructor() {
        this.issues = [];
        this.fixes = [];
    }

    async runDiagnostic() {
        console.log('🔍 ===================================');
        console.log('🚨 DIAGNÓSTICO: QR Codes Não Reais');
        console.log('🔗 Analisando: https://sofia-api.roilabs.com.br');
        console.log('🔍 ===================================');
        
        try {
            await this.checkHealthEndpoint();
            await this.checkEnvironmentVariables();
            await this.checkEvolutionAPI();
            await this.checkQRCodeGeneration();
            await this.testDirectEvolutionAPI();
            
            this.printDiagnosticResults();
            this.suggestFixes();
            
        } catch (error) {
            console.error('❌ Erro no diagnóstico:', error.message);
        }
    }

    async checkHealthEndpoint() {
        console.log('\n🔍 TESTE 1: Health Check Detalhado');
        
        try {
            const response = await axios.get(`${PRODUCTION_API}/health`, {
                timeout: 10000
            });
            
            const data = response.data;
            console.log('✅ Health check respondeu');
            console.log(`📊 Versão: ${data.version}`);
            console.log(`🏭 Service: ${data.service}`);
            
            // Verificar ambiente detectado
            if (data.qrcode_system && data.qrcode_system.production_stats) {
                const env = data.qrcode_system.production_stats.environment;
                console.log(`🌍 Ambiente detectado: ${env}`);
                
                if (env !== 'PRODUÇÃO') {
                    this.issues.push(`Ambiente detectado como '${env}' ao invés de 'PRODUÇÃO'`);
                    this.fixes.push('Configurar NODE_ENV=production no EasyPanel');
                }
            } else {
                this.issues.push('QR Code Production Stats não encontradas');
                this.fixes.push('Verificar se QRCodeProductionService está carregando');
            }
            
        } catch (error) {
            this.issues.push(`Health check falhou: ${error.message}`);
            console.error('❌ Health check falhou:', error.message);
        }
    }

    async checkEnvironmentVariables() {
        console.log('\n🔍 TESTE 2: Verificação Indireta de Environment Variables');
        
        try {
            // Não podemos acessar env vars diretamente, mas podemos inferir
            const response = await axios.get(`${PRODUCTION_API}/api/whatsapp/qr/stats`, {
                timeout: 8000
            });
            
            if (response.status === 200 && response.data.success) {
                const stats = response.data.data;
                
                console.log('✅ QR Stats endpoint funcionando');
                console.log(`🌍 Ambiente: ${stats.environment}`);
                console.log(`🔗 Evolution API URL: ${stats.evolution_api_url}`);
                
                if (stats.environment !== 'PRODUÇÃO') {
                    this.issues.push(`Ambiente no QR Service: '${stats.environment}' (deveria ser PRODUÇÃO)`);
                }
                
                if (!stats.evolution_api_url || !stats.evolution_api_url.includes('evolutionapi.roilabs.com.br')) {
                    this.issues.push('Evolution API URL incorreta ou não configurada');
                }
                
            } else {
                this.issues.push('QR Stats endpoint não funcional');
            }
            
        } catch (error) {
            this.issues.push(`QR Stats endpoint falhou: ${error.message}`);
            console.error('❌ QR Stats falhou:', error.message);
        }
    }

    async checkEvolutionAPI() {
        console.log('\n🔍 TESTE 3: Evolution API Disponibilidade');
        
        try {
            // Testar Evolution API diretamente
            const evolutionUrl = 'https://evolutionapi.roilabs.com.br';
            const response = await axios.get(`${evolutionUrl}/`, {
                timeout: 8000,
                validateStatus: () => true // Aceitar qualquer status
            });
            
            console.log(`📡 Evolution API status: ${response.status}`);
            
            if (response.status === 200 || response.status === 404) {
                console.log('✅ Evolution API está online');
            } else {
                console.log('⚠️ Evolution API pode estar offline');
                this.issues.push('Evolution API não está respondendo corretamente');
            }
            
        } catch (error) {
            console.error('❌ Evolution API inacessível:', error.message);
            this.issues.push(`Evolution API inacessível: ${error.message}`);
            this.fixes.push('Verificar se Evolution API está online');
        }
    }

    async checkQRCodeGeneration() {
        console.log('\n🔍 TESTE 4: Geração de QR Code Detalhada');
        
        try {
            const response = await axios.get(`${PRODUCTION_API}/api/whatsapp/instances/sofia-principal/qr`, {
                timeout: 15000
            });
            
            if (response.status === 200 && response.data.success) {
                const data = response.data.data;
                
                console.log('✅ QR Code gerado');
                console.log(`🏭 Fonte: ${data.source}`);
                console.log(`🔗 Cache hit: ${data.cache_hit}`);
                console.log(`⏰ Expira em: ${data.expires_in}s`);
                
                if (response.data.environment) {
                    console.log(`🌍 Environment: ${response.data.environment}`);
                }
                
                if (response.data.warning) {
                    console.log(`⚠️ Warning: ${response.data.warning}`);
                    this.issues.push(`QR Code warning: ${response.data.warning}`);
                }
                
                // Verificar se é fallback
                if (data.source === 'fallback_simulation') {
                    this.issues.push('QR Code sendo gerado via fallback (simulação)');
                    this.fixes.push('Verificar por que Evolution API não está funcionando');
                } else if (data.source === 'simulation') {
                    this.issues.push('QR Code sendo gerado como simulação');
                    this.fixes.push('Configurar NODE_ENV=production');
                } else if (data.source === 'evolution_api') {
                    console.log('🎉 QR Code REAL sendo gerado via Evolution API!');
                }
                
            } else {
                this.issues.push('QR Code generation retornou erro');
            }
            
        } catch (error) {
            this.issues.push(`QR Code generation falhou: ${error.message}`);
            console.error('❌ QR Code generation falhou:', error.message);
        }
    }

    async testDirectEvolutionAPI() {
        console.log('\n🔍 TESTE 5: Teste Direto Evolution API');
        
        try {
            const evolutionUrl = 'https://evolutionapi.roilabs.com.br';
            
            // Tentar algumas rotas comuns da Evolution API
            const routes = [
                '/instance/list',
                '/instance',
                '/manager/status'
            ];
            
            for (const route of routes) {
                try {
                    const response = await axios.get(`${evolutionUrl}${route}`, {
                        timeout: 5000,
                        validateStatus: () => true,
                        headers: {
                            'apikey': 'SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz' // A que está no deploy
                        }
                    });
                    
                    console.log(`📡 ${route}: ${response.status}`);
                    
                    if (response.status === 200) {
                        console.log(`✅ ${route} funcionando`);
                        break;
                    }
                    
                } catch (routeError) {
                    console.log(`❌ ${route}: ${routeError.message}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Teste direto Evolution API falhou:', error.message);
        }
    }

    printDiagnosticResults() {
        console.log('\n🔍 ===================================');
        console.log('📊 RESULTADO DO DIAGNÓSTICO');
        console.log('🔍 ===================================');
        
        if (this.issues.length === 0) {
            console.log('🎉 NENHUM PROBLEMA ENCONTRADO!');
            console.log('✅ Sistema deveria estar gerando QR codes reais');
        } else {
            console.log(`⚠️ ${this.issues.length} PROBLEMAS ENCONTRADOS:`);
            this.issues.forEach((issue, index) => {
                console.log(`❌ ${index + 1}. ${issue}`);
            });
        }
    }

    suggestFixes() {
        if (this.fixes.length > 0) {
            console.log('\n🔧 ===================================');
            console.log('💡 CORREÇÕES SUGERIDAS');
            console.log('🔧 ===================================');
            
            this.fixes.forEach((fix, index) => {
                console.log(`🔧 ${index + 1}. ${fix}`);
            });
            
            console.log('\n🚀 AÇÕES ESPECÍFICAS:');
            
            if (this.fixes.some(f => f.includes('NODE_ENV'))) {
                console.log('🔧 1. CONFIGURAR NODE_ENV=production NO EASYPANEL:');
                console.log('   - Acessar EasyPanel dashboard');
                console.log('   - Ir em Environment Variables');
                console.log('   - Adicionar: NODE_ENV=production');
                console.log('   - Rebuild a aplicação');
            }
            
            if (this.fixes.some(f => f.includes('Evolution API'))) {
                console.log('🔧 2. VERIFICAR EVOLUTION API:');
                console.log('   - Confirmar se https://evolutionapi.roilabs.com.br está online');
                console.log('   - Verificar API key nas environment variables');
                console.log('   - Testar criação de instância manual');
            }
            
            console.log('\n🔧 3. REBUILD APLICAÇÃO:');
            console.log('   - Após corrigir env vars, fazer rebuild no EasyPanel');
            console.log('   - Aguardar 2-3 minutos');
            console.log('   - Testar novamente');
        }
        
        console.log('\n🧪 COMANDO PARA RE-TESTAR:');
        console.log('node TESTE-PRODUCAO-SOFIA-IA.js');
        console.log('🔍 ===================================');
    }
}

// 🚀 Executar diagnóstico
async function runDiagnostic() {
    const diagnostic = new ProductionDiagnostic();
    await diagnostic.runDiagnostic();
}

// Main execution
(async () => {
    console.log('🔍 SOFIA IA - Diagnóstico QR Codes Produção');
    console.log('🎯 Investigando por que QR codes não são reais\n');
    
    await runDiagnostic();
})();

module.exports = ProductionDiagnostic;
