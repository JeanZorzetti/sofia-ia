/**
 * 🎯 EVOLUTION API WEBHOOK SERVICE - BASEADO NA DOCUMENTAÇÃO OFICIAL
 * 
 * Implementação correta conforme Evolution API v2:
 * - QR codes vêm via webhook QRCODE_UPDATED
 * - Payload correto de criação com webhook configurado
 * - Cache local de QR codes recebidos via webhook
 * - Fluxo correto: CREATE → WEBHOOK → CACHE → FRONTEND
 */

const axios = require('axios');

class EvolutionWebhookService {
    constructor() {
        this.apiUrl = process.env.EVOLUTION_API_URL || 'https://evolutionapi.roilabs.com.br';
        this.apiKey = process.env.EVOLUTION_API_KEY || 'SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz';
        this.webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:8000/webhook/evolution';
        
        // 📱 Cache para QR codes recebidos via webhook
        this.qrCodeCache = new Map();
        this.instanceStatusCache = new Map();
        
        this.defaultHeaders = {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
        };
        
        console.log('🔔 Evolution Webhook Service inicializado');
        console.log(`📍 API URL: ${this.apiUrl}`);
        console.log(`🔔 Webhook URL: ${this.webhookUrl}`);
    }

    /**
     * 🆕 CRIAR INSTÂNCIA COM WEBHOOK CONFIGURADO
     * Baseado na documentação oficial da Evolution API
     */
    async createInstanceWithWebhook(instanceName) {
        try {
            console.log(`🆕 Criando instância ${instanceName} com webhooks`);
            
            // ✅ PAYLOAD OFICIAL baseado na documentação
            const instanceData = {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                
                // 🔔 CRÍTICO: Webhook configuration
                webhookUrl: this.webhookUrl,
                webhookByEvents: true,
                webhookBase64: true,
                webhookEvents: [
                    'QRCODE_UPDATED',      // 📱 Para receber QR codes
                    'CONNECTION_UPDATE',   // 🔗 Para status de conexão
                    'MESSAGES_UPSERT'      // 💬 Para mensagens
                ],
                
                // ⚙️ Configurações WhatsApp otimizadas
                rejectCall: true,
                msgCall: 'Sofia IA não aceita chamadas. Use mensagens de texto.',
                groupsIgnore: true,
                alwaysOnline: true,
                readMessages: true,
                readStatus: false,
                syncFullHistory: false
            };
            
            const response = await axios.post(`${this.apiUrl}/instance/create`, instanceData, {
                headers: this.defaultHeaders,
                timeout: 30000
            });
            
            // ✅ Response da criação (SEM QR code - virá via webhook)
            const result = {
                success: true,
                data: {
                    instanceName: response.data.instance.instanceName,
                    instanceId: response.data.instance.instanceId,
                    status: response.data.instance.status || 'created',
                    apikey: response.data.hash?.apikey,
                    settings: response.data.settings,
                    message: 'Instância criada. QR code será enviado via webhook.'
                }
            };
            
            // Inicializar status no cache
            this.instanceStatusCache.set(instanceName, {
                status: 'created',
                created_at: new Date().toISOString(),
                last_update: new Date().toISOString()
            });
            
            console.log(`✅ Instância ${instanceName} criada. Aguardando QR via webhook...`);
            return result;
            
        } catch (error) {
            console.error(`❌ Erro ao criar instância ${instanceName}:`, error.message);
            
            if (error.response?.status === 409) {
                console.log(`⚠️ Instância ${instanceName} já existe`);
                return {
                    success: false,
                    error: 'Instance already exists',
                    existing: true
                };
            }
            
            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    /**
     * 🔔 PROCESSAR WEBHOOK DA EVOLUTION API
     * Este método é chamado quando recebemos webhooks
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
                    console.log(`ℹ️ Evento não processado: ${event}`);
                    return { success: true, processed: false, event };
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar webhook:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📱 PROCESSAR QR CODE RECEBIDO VIA WEBHOOK
     */
    async processQRCodeWebhook(instance, qrData) {
        try {
            console.log(`📱 QR code recebido para ${instance}`);
            
            if (qrData.qrcode) {
                // 💾 Salvar QR code no cache
                this.cacheQRCode(instance, qrData.qrcode);
                
                // Atualizar status da instância
                this.updateInstanceStatus(instance, 'qr_ready');
                
                console.log(`✅ QR code cached para ${instance}`);
                
                return {
                    success: true,
                    action: 'qr_code_cached',
                    instance: instance,
                    cached: true
                };
            }
            
            return {
                success: false,
                error: 'QR code não encontrado no webhook',
                data: qrData
            };
            
        } catch (error) {
            console.error(`❌ Erro ao processar QR webhook:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔗 PROCESSAR STATUS DE CONEXÃO
     */
    async processConnectionWebhook(instance, connectionData) {
        try {
            console.log(`🔗 Conexão ${instance}: ${connectionData.state}`);
            
            let status = 'unknown';
            
            switch (connectionData.state) {
                case 'open':
                    status = 'connected';
                    // Limpar QR code do cache quando conectar
                    this.qrCodeCache.delete(instance);
                    console.log(`✅ ${instance} conectado - QR code removido do cache`);
                    break;
                case 'close':
                    status = 'disconnected';
                    break;
                case 'connecting':
                    status = 'connecting';
                    break;
                default:
                    status = connectionData.state;
            }
            
            this.updateInstanceStatus(instance, status);
            
            return {
                success: true,
                action: 'connection_updated',
                instance: instance,
                status: status,
                raw_state: connectionData.state
            };
            
        } catch (error) {
            console.error(`❌ Erro ao processar conexão webhook:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 💬 PROCESSAR MENSAGENS (FUTURO)
     */
    async processMessageWebhook(instance, messageData) {
        try {
            console.log(`💬 Nova mensagem em ${instance}`);
            
            // Futuramente aqui será integrado com Claude IA
            return {
                success: true,
                action: 'message_received',
                instance: instance,
                processed: false // Por enquanto não processar
            };
            
        } catch (error) {
            console.error(`❌ Erro ao processar mensagem webhook:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 💾 CACHE QR CODE RECEBIDO VIA WEBHOOK
     */
    cacheQRCode(instance, qrcode) {
        this.qrCodeCache.set(instance, {
            qrcode: qrcode,
            timestamp: Date.now(),
            expires_at: Date.now() + 300000, // 5 minutos
            status: 'active',
            source: 'webhook'
        });
        
        console.log(`💾 QR code cached para ${instance} (expira em 5min)`);
    }

    /**
     * 📱 OBTER QR CODE DO CACHE
     */
    getCachedQRCode(instance) {
        const cached = this.qrCodeCache.get(instance);
        
        if (!cached) {
            console.log(`❌ QR code não encontrado no cache para ${instance}`);
            return null;
        }
        
        // Verificar se expirou
        if (Date.now() > cached.expires_at) {
            console.log(`⏰ QR code expirado para ${instance} - removendo do cache`);
            this.qrCodeCache.delete(instance);
            return null;
        }
        
        console.log(`✅ QR code encontrado no cache para ${instance}`);
        return cached;
    }

    /**
     * 🔄 ATUALIZAR STATUS DA INSTÂNCIA
     */
    updateInstanceStatus(instance, status) {
        const current = this.instanceStatusCache.get(instance) || {};
        
        this.instanceStatusCache.set(instance, {
            ...current,
            status: status,
            last_update: new Date().toISOString()
        });
    }

    /**
     * 📊 OBTER STATUS DA INSTÂNCIA
     */
    getInstanceStatus(instance) {
        return this.instanceStatusCache.get(instance) || {
            status: 'unknown',
            last_update: null
        };
    }

    /**
     * 📱 LISTAR INSTÂNCIAS (API OFICIAL)
     */
    async fetchInstances() {
        try {
            console.log('📱 Buscando instâncias via Evolution API...');
            
            const response = await axios.get(`${this.apiUrl}/instance/fetchInstances`, {
                headers: this.defaultHeaders,
                timeout: 15000
            });
            
            const instances = response.data.map(instance => ({
                id: instance.name || instance.id,
                name: instance.name || instance.id,
                status: instance.connectionStatus || 'unknown',
                phone: instance.number || null,
                profileName: instance.profileName || null,
                createdAt: instance.createdAt,
                messagesCount: instance._count?.Message || 0,
                contactsCount: instance._count?.Contact || 0,
                chatsCount: instance._count?.Chat || 0
            }));
            
            console.log(`✅ ${instances.length} instâncias encontradas`);
            
            return {
                success: true,
                data: instances,
                total: instances.length
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar instâncias:', error.message);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * 🗑️ DELETAR INSTÂNCIA
     */
    async deleteInstance(instanceName) {
        try {
            console.log(`🗑️ Deletando instância ${instanceName}`);
            
            const response = await axios.delete(`${this.apiUrl}/instance/delete/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000,
                validateStatus: () => true // Aceitar qualquer status
            });
            
            // Limpar caches
            this.qrCodeCache.delete(instanceName);
            this.instanceStatusCache.delete(instanceName);
            
            console.log(`✅ Instância ${instanceName} deletada e cache limpo`);
            
            return {
                success: response.status < 400,
                data: {
                    instanceName: instanceName,
                    status: 'deleted'
                }
            };
            
        } catch (error) {
            console.error(`❌ Erro ao deletar instância ${instanceName}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ❌ DESCONECTAR INSTÂNCIA
     */
    async logoutInstance(instanceName) {
        try {
            console.log(`❌ Desconectando instância ${instanceName}`);
            
            const response = await axios.delete(`${this.apiUrl}/instance/logout/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            // Limpar QR code do cache
            this.qrCodeCache.delete(instanceName);
            this.updateInstanceStatus(instanceName, 'disconnected');
            
            return {
                success: true,
                data: {
                    instanceName: instanceName,
                    status: 'disconnected'
                }
            };
            
        } catch (error) {
            console.error(`❌ Erro ao desconectar instância ${instanceName}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📊 ESTATÍSTICAS DO CACHE
     */
    getCacheStats() {
        const qrCodes = Array.from(this.qrCodeCache.entries());
        const activeQRs = qrCodes.filter(([_, data]) => Date.now() < data.expires_at);
        const expiredQRs = qrCodes.length - activeQRs.length;
        
        const instances = Array.from(this.instanceStatusCache.entries());
        
        return {
            qr_codes: {
                total: qrCodes.length,
                active: activeQRs.length,
                expired: expiredQRs
            },
            instances: {
                total: instances.length,
                by_status: instances.reduce((acc, [name, data]) => {
                    acc[data.status] = (acc[data.status] || 0) + 1;
                    return acc;
                }, {})
            },
            webhook_url: this.webhookUrl,
            last_cleanup: new Date().toISOString()
        };
    }

    /**
     * 🧹 LIMPEZA DE CACHE EXPIRADO
     */
    cleanExpiredCache() {
        let cleaned = 0;
        
        // Limpar QR codes expirados
        for (const [instance, data] of this.qrCodeCache.entries()) {
            if (Date.now() > data.expires_at) {
                this.qrCodeCache.delete(instance);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 ${cleaned} QR codes expirados removidos do cache`);
        }
        
        return cleaned;
    }
}

module.exports = EvolutionWebhookService;