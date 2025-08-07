/**
 * 🚀 SOFIA IA - Evolution API Service SIMPLIFICADO
 * Versão: v3.1.0 - Janeiro 2025
 * 
 * SEGUINDO EXATAMENTE A DOCUMENTAÇÃO OFICIAL
 */

const axios = require('axios');
const EventEmitter = require('events');

class EvolutionAPIService extends EventEmitter {
    constructor() {
        super();
        
        this.baseURL = process.env.EVOLUTION_API_URL || 'https://evolutionapi.roilabs.com.br';
        this.apiKey = process.env.EVOLUTION_API_KEY || 'SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz';
        this.webhookUrl = process.env.WEBHOOK_URL || 'https://sofiaia.roilabs.com.br/webhook/evolution';
        
        this.qrCodeCache = new Map();
        this.instanceStatus = new Map();
        
        this.defaultHeaders = {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
        };
        
        console.log('🚀 Evolution API Service inicializado');
        console.log(`📡 Base URL: ${this.baseURL}`);
        console.log(`🔗 Webhook URL: ${this.webhookUrl}`);
    }

    /**
     * 📱 CRIAR NOVA INSTÂNCIA - SEGUINDO EXATAMENTE A DOCUMENTAÇÃO OFICIAL
     */
    async createInstance(instanceName, settings = {}) {
        try {
            console.log(`🏗️ Criando instância: ${instanceName}`);
            
            // ✅ PAYLOAD EXATAMENTE COMO NA DOCUMENTAÇÃO OFICIAL
            const instanceData = {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                rejectCall: true,
                msgCall: 'Sofia IA não aceita chamadas. Use mensagens de texto.',
                groupsIgnore: true,
                alwaysOnline: true,
                readMessages: true,
                readStatus: false,
                syncFullHistory: false,
                
                // ✅ WEBHOOK COMO OBJETO (DOCUMENTAÇÃO OFICIAL)
                webhook: {
                    url: this.webhookUrl,
                    byEvents: true,
                    base64: true,
                    events: [
                        'QRCODE_UPDATED',
                        'CONNECTION_UPDATE',
                        'MESSAGES_UPSERT',
                        'MESSAGE_STATUS_UPDATE'
                    ]
                },
                
                ...settings
            };
            
            console.log('📋 Payload sendo enviado:', JSON.stringify(instanceData, null, 2));
            
            const response = await axios.post(`${this.baseURL}/instance/create`, instanceData, {
                headers: this.defaultHeaders,
                timeout: 30000
            });
            
            console.log('✅ Response da Evolution API:', JSON.stringify(response.data, null, 2));
            
            if (response.data && response.data.instance) {
                this.instanceStatus.set(instanceName, {
                    status: 'created',
                    instanceId: response.data.instance.instanceId,
                    createdAt: new Date(),
                    connected: false
                });
                
                console.log(`✅ Instância ${instanceName} criada com sucesso`);
                
                return {
                    success: true,
                    data: {
                        instanceName: instanceName,
                        instanceId: response.data.instance.instanceId,
                        status: 'created',
                        message: 'Instância criada. QR code será enviado via webhook.'
                    }
                };
            }
            
            throw new Error('Response inválido da Evolution API');
            
        } catch (error) {
            console.error(`❌ Erro ao criar instância ${instanceName}:`, error.message);
            console.error('📋 Error details:', error.response?.data || 'Sem detalhes');
            
            return {
                success: false,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }

    async listInstances() {
        try {
            const response = await axios.get(`${this.baseURL}/instance/fetchInstances`, {
                headers: this.defaultHeaders,
                timeout: 15000
            });
            
            if (response.data && Array.isArray(response.data)) {
                response.data.forEach(instance => {
                    this.instanceStatus.set(instance.instanceName, {
                        status: instance.status,
                        instanceId: instance.instanceId,
                        connected: instance.status === 'open',
                        lastSeen: new Date()
                    });
                });
                
                return {
                    success: true,
                    data: response.data,
                    count: response.data.length
                };
            }
            
            return {
                success: true,
                data: [],
                count: 0
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

    async connectInstance(instanceName) {
        try {
            console.log(`🔗 Conectando instância: ${instanceName}`);
            
            const cachedQR = this.getCachedQRCode(instanceName);
            if (cachedQR) {
                return {
                    success: true,
                    qrcode: cachedQR,
                    source: 'cache',
                    message: 'QR code do cache (ainda válido)'
                };
            }
            
            const response = await axios.get(`${this.baseURL}/instance/connect/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 30000
            });
            
            return {
                success: true,
                qrcode: null,
                source: 'webhook_pending',
                message: 'QR code será enviado via webhook em instantes.'
            };
            
        } catch (error) {
            console.error(`❌ Erro ao conectar ${instanceName}:`, error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async deleteInstance(instanceName) {
        try {
            console.log(`🗑️ Deletando instância: ${instanceName}`);
            
            const response = await axios.delete(`${this.baseURL}/instance/delete/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 15000
            });
            
            this.qrCodeCache.delete(instanceName);
            this.instanceStatus.delete(instanceName);
            
            return {
                success: true,
                message: `Instância ${instanceName} deletada`
            };
            
        } catch (error) {
            console.error(`❌ Erro ao deletar ${instanceName}:`, error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async processWebhook(webhookData) {
        try {
            const { event, instance, data } = webhookData;
            
            console.log(`🔔 Webhook recebido: ${event} para ${instance}`);
            console.log(`📋 Data:`, JSON.stringify(data, null, 2));
            
            switch (event) {
                case 'QRCODE_UPDATED':
                    if (data && data.qrcode) {
                        this.cacheQRCode(instance, data.qrcode);
                        this.emit('qrcode_updated', { instance, qrcode: data.qrcode });
                        console.log(`📱 QR code atualizado para ${instance}`);
                    }
                    break;
                    
                case 'CONNECTION_UPDATE':
                    console.log(`🔗 Conexão ${instance}: ${data.state}`);
                    
                    const currentStatus = this.instanceStatus.get(instance) || {};
                    currentStatus.connected = data.state === 'open';
                    currentStatus.status = data.state;
                    currentStatus.lastSeen = new Date();
                    this.instanceStatus.set(instance, currentStatus);
                    
                    if (data.state === 'open') {
                        this.qrCodeCache.delete(instance);
                        this.emit('instance_connected', { instance });
                        console.log(`✅ ${instance} conectado com sucesso!`);
                    } else if (data.state === 'close') {
                        this.emit('instance_disconnected', { instance });
                    }
                    break;
                    
                case 'MESSAGES_UPSERT':
                    if (data && data.messages) {
                        for (const message of data.messages) {
                            this.emit('message_received', { instance, message });
                        }
                        console.log(`💬 ${data.messages.length} mensagens recebidas em ${instance}`);
                    }
                    break;
                    
                case 'MESSAGE_STATUS_UPDATE':
                    this.emit('message_status', { instance, status: data });
                    break;
            }
            
            return { 
                success: true, 
                event, 
                instance,
                processed: true 
            };
            
        } catch (error) {
            console.error('❌ Erro ao processar webhook:', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    cacheQRCode(instance, qrcode) {
        this.qrCodeCache.set(instance, {
            qrcode: qrcode,
            timestamp: Date.now(),
            status: 'active'
        });
        console.log(`💾 QR code cached para ${instance}`);
    }

    getCachedQRCode(instance) {
        const cached = this.qrCodeCache.get(instance);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > 300000) {
            this.qrCodeCache.delete(instance);
            return null;
        }
        
        return cached.qrcode;
    }

    getServiceStats() {
        return {
            totalInstances: this.instanceStatus.size,
            connectedInstances: Array.from(this.instanceStatus.values())
                .filter(status => status.connected).length,
            cachedQRCodes: this.qrCodeCache.size,
            baseURL: this.baseURL,
            webhookURL: this.webhookUrl,
            uptime: process.uptime()
        };
    }

    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseURL}/instance/fetchInstances`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            return {
                success: true,
                status: 'healthy',
                responseTime: response.headers['x-response-time'] || 'unknown',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = EvolutionAPIService;