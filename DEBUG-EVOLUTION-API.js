/**
 * 🔍 TESTE ESPECÍFICO: Evolution API Integration Debug
 * Descobrir exatamente por que as instâncias não funcionam
 */

const axios = require('axios');

const EVOLUTION_API_URL = 'https://evolutionapi.roilabs.com.br';
const API_KEY = 'SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz';

class EvolutionAPIDebug {
    constructor() {
        this.results = [];
    }

    async runEvolutionDebug() {
        console.log('🔍 ===================================');
        console.log('🚨 DEBUG ESPECÍFICO: Evolution API');
        console.log('🔗 URL: https://evolutionapi.roilabs.com.br');
        console.log('🔑 API Key: SuOOmamlmX... (parcial)');
        console.log('🔍 ===================================');
        
        try {
            await this.testBasicConnection();
            await this.testAPIRoutes();
            await this.testInstanceCreation();
            await this.testInstanceConnection();
            await this.testAlternativeRoutes();
            
            this.printSolution();
            
        } catch (error) {
            console.error('❌ Erro no debug Evolution API:', error.message);
        }
    }

    async testBasicConnection() {
        console.log('\n🔍 TESTE 1: Conexão Básica Evolution API');
        
        const testUrls = [
            '/',
            '/health',
            '/status',
            '/manager/status'
        ];
        
        for (const url of testUrls) {
            try {
                const response = await axios.get(`${EVOLUTION_API_URL}${url}`, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                console.log(`📡 ${url}: ${response.status}`);
                
                if (response.status === 200 && response.data) {
                    console.log(`✅ ${url} funcionando`);
                    if (typeof response.data === 'object') {
                        console.log(`📄 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
                    }
                }
                
            } catch (error) {
                console.log(`❌ ${url}: ${error.message}`);
            }
        }
    }

    async testAPIRoutes() {
        console.log('\n🔍 TESTE 2: Rotas da API com Autenticação');
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'x-api-key': API_KEY
        };
        
        const routes = [
            { method: 'GET', path: '/instance/fetchInstances' },
            { method: 'GET', path: '/instance' },
            { method: 'GET', path: '/instances' },
            { method: 'GET', path: '/manager/instances' },
            { method: 'POST', path: '/manager/instance' }
        ];
        
        for (const route of routes) {
            try {
                const config = {
                    method: route.method.toLowerCase(),
                    url: `${EVOLUTION_API_URL}${route.path}`,
                    headers: headers,
                    timeout: 8000,
                    validateStatus: () => true
                };
                
                if (route.method === 'POST') {
                    config.data = {
                        instanceName: 'sofia-test',
                        qrcode: true
                    };
                }
                
                const response = await axios(config);
                
                console.log(`📡 ${route.method} ${route.path}: ${response.status}`);
                
                if (response.status === 200) {
                    console.log(`✅ ${route.path} funcionando`);
                    if (response.data) {
                        console.log(`📄 Data: ${JSON.stringify(response.data).substring(0, 200)}...`);
                    }
                } else if (response.status === 401) {
                    console.log(`🔐 ${route.path}: Erro de autenticação`);
                } else if (response.status === 404) {
                    console.log(`🚫 ${route.path}: Rota não encontrada`);
                }
                
            } catch (error) {
                console.log(`❌ ${route.method} ${route.path}: ${error.message}`);
            }
        }
    }

    async testInstanceCreation() {
        console.log('\n🔍 TESTE 3: Criação de Instância Específica');
        
        const instanceData = {
            instanceName: 'sofia-debug-test',
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
        };
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': API_KEY
        };
        
        try {
            console.log('🆕 Tentando criar instância "sofia-debug-test"...');
            
            const response = await axios.post(`${EVOLUTION_API_URL}/instance/create`, instanceData, {
                headers: headers,
                timeout: 15000,
                validateStatus: () => true
            });
            
            console.log(`📡 Create Instance: ${response.status}`);
            
            if (response.status === 201 || response.status === 200) {
                console.log('✅ Instância criada com sucesso!');
                console.log(`📄 Response: ${JSON.stringify(response.data, null, 2)}`);
                
                // Tentar conectar a instância criada
                await this.testInstanceConnect('sofia-debug-test');
                
            } else if (response.status === 409) {
                console.log('⚠️ Instância já existe - tentando conectar...');
                await this.testInstanceConnect('sofia-debug-test');
            } else {
                console.log(`❌ Erro ao criar instância: ${response.status}`);
                if (response.data) {
                    console.log(`📄 Error: ${JSON.stringify(response.data, null, 2)}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro na criação de instância:', error.message);
            
            // Tentar rota alternativa
            console.log('🔄 Tentando rota alternativa...');
            try {
                const altResponse = await axios.post(`${EVOLUTION_API_URL}/manager/instance`, instanceData, {
                    headers: headers,
                    timeout: 15000,
                    validateStatus: () => true
                });
                
                console.log(`📡 Manager Create: ${altResponse.status}`);
                if (altResponse.data) {
                    console.log(`📄 Alt Response: ${JSON.stringify(altResponse.data, null, 2)}`);
                }
                
            } catch (altError) {
                console.error('❌ Rota alternativa também falhou:', altError.message);
            }
        }
    }

    async testInstanceConnect(instanceName) {
        console.log(`\n🔍 TESTE 4: Conectar Instância "${instanceName}"`);
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': API_KEY
        };
        
        const connectRoutes = [
            `/instance/connect/${instanceName}`,
            `/instance/${instanceName}/connect`,
            `/manager/instance/${instanceName}/connect`,
            `/instance/qrcode/${instanceName}`
        ];
        
        for (const route of connectRoutes) {
            try {
                console.log(`🔗 Tentando: ${route}`);
                
                const response = await axios.post(`${EVOLUTION_API_URL}${route}`, {}, {
                    headers: headers,
                    timeout: 15000,
                    validateStatus: () => true
                });
                
                console.log(`📡 ${route}: ${response.status}`);
                
                if (response.status === 200 && response.data) {
                    console.log(`✅ ${route} funcionando!`);
                    console.log(`📄 Response: ${JSON.stringify(response.data, null, 2)}`);
                    
                    if (response.data.qrcode || response.data.qr) {
                        console.log('🎉 QR CODE REAL ENCONTRADO!');
                        console.log(`📱 QR: ${(response.data.qrcode || response.data.qr).substring(0, 50)}...`);
                        return true;
                    }
                }
                
            } catch (error) {
                console.log(`❌ ${route}: ${error.message}`);
            }
        }
        
        return false;
    }

    async testAlternativeRoutes() {
        console.log('\n🔍 TESTE 5: Rotas Alternativas Documentação');
        
        // Testar rotas baseadas na documentação Evolution API
        const docRoutes = [
            'GET /instance/fetchInstances',
            'POST /instance/create',
            'GET /instance/connect/{instance}',
            'POST /instance/logout/{instance}',
            'DELETE /instance/delete/{instance}',
            'GET /instance/connectionState/{instance}',
            'POST /chat/sendText/{instance}',
            'GET /chat/findMessages/{instance}'
        ];
        
        console.log('📚 Rotas da documentação oficial:');
        docRoutes.forEach(route => {
            console.log(`📋 ${route}`);
        });
        
        console.log('\n🔍 Testando rotas mais prováveis...');
        
        const headers = { 'apikey': API_KEY };
        
        try {
            // Testar rota fetchInstances (mais comum)
            const response = await axios.get(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
                headers: headers,
                timeout: 8000,
                validateStatus: () => true
            });
            
            console.log(`📡 /instance/fetchInstances: ${response.status}`);
            
            if (response.status === 200) {
                console.log('✅ fetchInstances funcionando!');
                if (response.data) {
                    console.log(`📄 Instances: ${JSON.stringify(response.data, null, 2)}`);
                }
            }
            
        } catch (error) {
            console.error('❌ fetchInstances falhou:', error.message);
        }
    }

    printSolution() {
        console.log('\n🔧 ===================================');
        console.log('💡 SOLUÇÃO BASEADA NO DEBUG');
        console.log('🔧 ===================================');
        
        console.log('🎯 PASSOS PARA CORRIGIR:');
        
        console.log('\n1️⃣ VERIFICAR DOCUMENTAÇÃO EVOLUTION API:');
        console.log('   - Acessar documentação oficial da Evolution API');
        console.log('   - Verificar rotas corretas para criar/conectar instâncias');
        console.log('   - Confirmar formato correto da API key');
        
        console.log('\n2️⃣ ATUALIZAR CÓDIGO SOFIA IA:');
        console.log('   - Corrigir rotas no EvolutionAPIService');
        console.log('   - Usar rotas que funcionaram no teste acima');
        console.log('   - Atualizar headers de autenticação');
        
        console.log('\n3️⃣ TESTAR INTEGRAÇÃO:');
        console.log('   - Fazer novo deploy com correções');
        console.log('   - Testar criação de instância manual');
        console.log('   - Validar QR code real sendo gerado');
        
        console.log('\n🔄 COMANDOS PARA CONTINUAR:');
        console.log('1. Corrigir EvolutionAPIService com rotas corretas');
        console.log('2. git add . && git commit -m "FIX: Evolution API routes"');
        console.log('3. git push origin main');
        console.log('4. Aguardar rebuild EasyPanel');
        console.log('5. node TESTE-PRODUCAO-SOFIA-IA.js');
        
        console.log('\n📚 DOCUMENTAÇÃO EVOLUTION API:');
        console.log('https://doc.evolution-api.com/');
        console.log('🔧 ===================================');
    }
}

// 🚀 Executar debug Evolution API
async function runEvolutionDebug() {
    const debug = new EvolutionAPIDebug();
    await debug.runEvolutionDebug();
}

// Main execution
(async () => {
    console.log('🔍 SOFIA IA - Debug Evolution API Integration');
    console.log('🎯 Descobrindo rotas corretas para QR codes reais\n');
    
    await runEvolutionDebug();
})();

module.exports = EvolutionAPIDebug;
