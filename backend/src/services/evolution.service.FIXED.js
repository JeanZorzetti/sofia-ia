/**
 * 🚀 SOFIA IA - Evolution API Service CORRIGIDO v2
 * Baseado na documentação oficial Evolution API v2
 * https://doc.evolution-api.com/v2/api-reference/instance-controller/create-instance-basic
 * 
 * ✅ CORREÇÕES IMPLEMENTADAS:
 * 1. Payload correto baseado na documentação oficial
 * 2. Webhook configuration para receber QR codes
 * 3. Response structure correta
 * 4. Endpoint de conexão implementado
 * 5. Fluxo QR code via webhook
 */

const axios = require('axios');

class EvolutionAPIServiceFixed {
    constructor() {
        this.apiUrl = process.env.EVOLUTION_API_URL || 'https://evolutionapi.roilabs.com.br';
        this.apiKey = process.env.EVOLUTION_API_KEY || 'SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz';
        this.webhookUrl = process.env.WEBHOOK_URL || 'https://sofia-ia-api.roilabs.com.br/webhook/evolution';
        
        this.defaultHeaders = {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
        };
        
        // 📱 Storage temporário para QR codes (em produção usar Redis)
        this.qrCodeCache = new Map();
        
        console.log('🔌 Evolution API Service v2 inicializado');
        console.log(`📍 URL: ${this.apiUrl}`);
        console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
        console.log(`🔔 Webhook: ${this.webhookUrl}`);
    }

    /**
     * 🆕 Criar nova instância WhatsApp - CORRIGIDO
     * Baseado na documentação oficial Evolution API v2
     */
    async createInstance(instanceName, customSettings = {}) {
        try {
            console.log(`🆕 Criando instância ${instanceName} com payload correto...`);
            
            // ✅ PAYLOAD CORRETO baseado na documentação oficial
            const instanceData = {
                // ✅ Campos obrigatórios
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                
                // ✅ Webhook configuration (CRÍTICO para QR codes)
                webhookUrl: this.webhookUrl,
                webhookByEvents: true,
                webhookBase64: true,
                webhookEvents: [
                    'QRCODE_UPDATED',
                    'CONNECTION_UPDATE',
                    'MESSAGES_UPSERT',
                    'MESSAGE_STATUS_UPDATE',
                    'PRESENCE_UPDATE'
                ],
                
                // ✅ Configurações WhatsApp otimizadas
                rejectCall: true,
                msgCall: 'Sofia IA não aceita chamadas de voz. Use mensagens de texto.',
                groupsIgnore: true,
                alwaysOnline: true,
                readMessages: true,
                readStatus: false,
                syncFullHistory: false,
                
                // ✅ Merge com configurações customizadas
                ...customSettings
            };
            
            console.log('📤 Enviando payload:', JSON.stringify(instanceData, null, 2));
            
            const response = await axios.post(`${this.apiUrl}/instance/create`, instanceData, {
                headers: this.defaultHeaders,
                timeout: 30000 // Aumentado para 30s
            });
            
            console.log('✅ Response da criação:', JSON.stringify(response.data, null, 2));
            
            // ✅ STRUCTURE CORRETA do response
            const { instance, hash, settings } = response.data;
            
            // ✅ QR code virá via webhook, não no response inicial
            console.log(`🔔 Aguardando QR code via webhook para ${instanceName}...`);
            
            return {
                success: true,
                data: {
                    instanceName: instance.instanceName,
                    instanceId: instance.instanceId,
                    status: instance.status,
                    apikey: hash.apikey,
                    settings: settings,
                    
                    // ✅ QR code será atualizado via webhook
                    qrcode: null,
                    qrcodeStatus: 'waiting_webhook',
                    webhookConfigured: true,
                    
                    message: 'Instância criada. QR code será enviado via webhook.'
                }
            };
            
        } catch (error) {
            console.error(`❌ Erro ao criar instância ${instanceName}:`, error.response?.data || error.message);
            
            // ✅ Se instância já existe (409), tentar obter QR
            if (error.response?.status === 409) {
                console.log(`⚠️ Instância ${instanceName} já existe, obtendo QR code...`);
                return await this.connectInstance(instanceName);
            }
            
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                statusCode: error.response?.status
            };
        }
    }

    /**
     * 🔗 Conectar instância (obter QR Code) - IMPLEMENTADO
     * Nova rota baseada na documentação Evolution API v2
     */
    async connectInstance(instanceName) {
        try {
            console.log(`🔗 Conectando instância ${instanceName}...`);
            
            // ✅ ROTA CORRETA para conexão (gera novo QR)
            const response = await axios.get(`${this.apiUrl}/instance/connect/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 20000
            });
            
            console.log('✅ Response da conexão:', JSON.stringify(response.data, null, 2));
            
            // ✅ Se QR code vier no response direto
            if (response.data.qrcode) {
                return {
                    success: true,
                    data: {
                        instanceName: instanceName,
                        qrcode: response.data.qrcode,
                        status: 'connecting',
                        source: 'direct_connect'
                    }
                };
            }
            
            // ✅ Senão, aguardar via webhook
            return {
                success: true,
                data: {
                    instanceName: instanceName,
                    qrcode: null,
                    qrcodeStatus: 'waiting_webhook',
                    status: 'connecting',
                    message: 'QR code será enviado via webhook em breve...'
                }
            };
            
        } catch (error) {
            console.error(`❌ Erro ao conectar ${instanceName}:`, error.response?.data || error.message);
            
            // ✅ Se 404, instância não existe - criar primeiro
            if (error.response?.status === 404) {
                console.log(`🆕 Instância ${instanceName} não encontrada, criando...`);
                return await this.createInstance(instanceName);
            }
            
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                statusCode: error.response?.status
            };
        }
    }

    /**
     * 📱 Obter QR Code de instância (consulta cache + API) - NOVO
     */
    async getQRCode(instanceName) {
        try {
            console.log(`📱 Obtendo QR code para ${instanceName}...`);
            
            // ✅ Primeiro verificar cache local
            if (this.qrCodeCache.has(instanceName)) {
                const cached = this.qrCodeCache.get(instanceName);
                
                // ✅ Se cache não expirou (5 min)
                if (Date.now() - cached.timestamp < 300000) {
                    console.log(`💾 QR code em cache para ${instanceName}`);
                    return {
                        success: true,
                        data: {
                            instanceName: instanceName,
                            qrcode: cached.qrcode,
                            status: cached.status,
                            source: 'cache',
                            cachedAt: new Date(cached.timestamp).toISOString()
                        }
                    };
                } else {
                    // ✅ Cache expirado, remover
                    this.qrCodeCache.delete(instanceName);
                }
            }
            
            // ✅ Tentar obter via API direta
            const routes = [
                `/instance/connect/${instanceName}`,
                `/instance/${instanceName}/qrcode`,
                `/instance/qrcode/${instanceName}`
            ];
            
            for (const route of routes) {
                try {
                    const response = await axios.get(`${this.apiUrl}${route}`, {
                        headers: this.defaultHeaders,
                        timeout: 15000
                    });
                    
                    if (response.data.qrcode || response.data.base64) {
                        const qrcode = response.data.qrcode || response.data.base64;
                        
                        // ✅ Salvar em cache
                        this.qrCodeCache.set(instanceName, {
                            qrcode: qrcode,
                            status: 'active',
                            timestamp: Date.now()
                        });
                        
                        console.log(`✅ QR code obtido via ${route}`);
                        return {
                            success: true,
                            data: {
                                instanceName: instanceName,
                                qrcode: qrcode,
                                status: 'active',
                                source: `api_${route.replace('/', '_')}`
                            }
                        };
                    }
                    
                } catch (routeError) {
                    console.log(`⚠️ Rota ${route} falhou: ${routeError.message}`);
                    continue;
                }
            }
            
            // ✅ Se nenhuma rota funcionou, forçar nova conexão
            console.log(`🔄 Forçando nova conexão para ${instanceName}...`);
            return await this.connectInstance(instanceName);
            
        } catch (error) {
            console.error(`❌ Erro ao obter QR code:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📋 Listar instâncias - MANTIDO
     */
    async listInstances() {
        try {
            const response = await axios.get(`${this.apiUrl}/instance/fetchInstances`, {
                headers: this.defaultHeaders,
                timeout: 15000
            });
            
            const instances = response.data.map(instance => ({
                id: instance.name || instance.instanceName,
                name: instance.name || instance.instanceName,
                status: this.normalizeStatus(instance.connectionStatus),
                phone: instance.number || null,
                profileName: instance.profileName || null,
                profilePicUrl: instance.profilePicUrl || null,
                createdAt: instance.createdAt,
                messagesCount: instance._count?.Message || 0,
                contactsCount: instance._count?.Contact || 0,
                chatsCount: instance._count?.Chat || 0,
                
                // ✅ Adicionar info de QR cache
                hasQRCache: this.qrCodeCache.has(instance.name || instance.instanceName),
                lastQRUpdate: this.qrCodeCache.has(instance.name || instance.instanceName) 
                    ? new Date(this.qrCodeCache.get(instance.name || instance.instanceName).timestamp).toISOString()
                    : null
            }));
            
            return {
                success: true,
                data: instances,
                total: instances.length,
                cached_qrcodes: this.qrCodeCache.size
            };
            
        } catch (error) {
            console.error('❌ Erro ao listar instâncias:', error.message);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * 🔔 Processar webhook recebido - IMPLEMENTADO PARA QR CODES
     */
    async processWebhook(webhookData) {
        try {
            const { event, instance, data } = webhookData;
            
            console.log(`🔔 Webhook recebido: ${event} para ${instance}`);
            
            switch (event) {
                case 'QRCODE_UPDATED':
                    return await this.processQRCodeWebhook(instance, data);
                    
                case 'CONNECTION_UPDATE':
                    return await this.processConnectionWebhook(instance, data);
                    
                case 'MESSAGES_UPSERT':
                    return await this.processMessageWebhook(instance, data);
                    
                default:
                    console.log(`ℹ️ Evento webhook não processado: ${event}`);
                    return { success: true, processed: false };
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar webhook:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📱 Processar webhook de QR Code - CRÍTICO PARA FUNCIONAR
     */
    async processQRCodeWebhook(instance, qrData) {
        console.log(`📱 QR Code atualizado para ${instance}:`, qrData.qrcode ? 'presente' : 'ausente');
        
        if (qrData.qrcode) {
            // ✅ Salvar QR code em cache
            this.qrCodeCache.set(instance, {
                qrcode: qrData.qrcode,
                status: 'active',
                timestamp: Date.now()
            });
            
            console.log(`💾 QR code salvo em cache para ${instance}`);
        }
        
        return {
            success: true,
            action: 'qr_updated',
            instance: instance,
            hasQRCode: !!qrData.qrcode
        };
    }

    /**
     * 🔗 Processar webhook de conexão
     */
    async processConnectionWebhook(instance, connectionData) {
        const state = connectionData.state;
        console.log(`🔗 Conexão atualizada para ${instance}: ${state}`);
        
        // ✅ Se conectou, remover QR code do cache
        if (state === 'open' || state === 'connected') {
            this.qrCodeCache.delete(instance);
            console.log(`🗑️ QR code removido do cache para ${instance} (conectado)`);
        }
        
        return {
            success: true,
            action: 'connection_updated',
            instance: instance,
            status: state
        };
    }

    /**
     * 💬 Processar webhook de mensagem
     */
    async processMessageWebhook(instance, messageData) {
        // Implementar integração com Claude IA futuramente
        return {
            success: true,
            action: 'message_received',
            instance: instance,
            from: messageData.key?.remoteJid
        };
    }

    /**
     * ⚙️ Utilitários
     */
    normalizeStatus(status) {
        const statusMap = {
            'open': 'connected',
            'close': 'disconnected', 
            'connecting': 'connecting',
            'qr': 'waiting_qr'
        };
        return statusMap[status] || status || 'unknown';
    }

    /**
     * 📊 Obter estatísticas do cache QR
     */
    getQRCacheStats() {
        const stats = {
            total: this.qrCodeCache.size,
            instances: [],
            oldestCache: null,
            newestCache: null
        };
        
        let oldest = Infinity;
        let newest = 0;
        
        for (const [instance, data] of this.qrCodeCache.entries()) {
            stats.instances.push({
                instance: instance,
                cachedAt: new Date(data.timestamp).toISOString(),
                ageMinutes: Math.floor((Date.now() - data.timestamp) / 60000)
            });
            
            if (data.timestamp < oldest) {
                oldest = data.timestamp;
                stats.oldestCache = new Date(data.timestamp).toISOString();
            }
            
            if (data.timestamp > newest) {
                newest = data.timestamp;
                stats.newestCache = new Date(data.timestamp).toISOString();
            }
        }
        
        return stats;
    }

    /**
     * 🧹 Limpar cache QR expirado
     */
    cleanExpiredQRCache(maxAgeMinutes = 5) {
        const expireTime = Date.now() - (maxAgeMinutes * 60000);
        let cleaned = 0;
        
        for (const [instance, data] of this.qrCodeCache.entries()) {
            if (data.timestamp < expireTime) {
                this.qrCodeCache.delete(instance);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 ${cleaned} QR codes expirados removidos do cache`);
        }
        
        return cleaned;
    }

    // ✅ Manter métodos existentes (disconnect, delete, send, etc.)
    async disconnectInstance(instanceName) {
        try {
            const response = await axios.delete(`${this.apiUrl}/instance/logout/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            // ✅ Limpar cache QR quando desconectar
            this.qrCodeCache.delete(instanceName);
            
            return {
                success: true,
                data: { instanceName, status: 'disconnected' }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteInstance(instanceName) {
        try {
            const response = await axios.delete(`${this.apiUrl}/instance/delete/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            // ✅ Limpar cache QR quando deletar
            this.qrCodeCache.delete(instanceName);
            
            return {
                success: true,
                data: { instanceName, status: 'deleted' }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = EvolutionAPIServiceFixed;
