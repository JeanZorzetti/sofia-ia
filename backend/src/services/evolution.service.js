/**
 * 🚀 SOFIA IA - Evolution API Service CORRIGIDO
 * Integração completa com evolutionapi.roilabs.com.br
 * ✅ ROTAS CORRIGIDAS BASEADAS NO DEBUG REAL
 */

const axios = require('axios');

class EvolutionAPIService {
    constructor() {
        this.apiUrl = process.env.EVOLUTION_API_URL || 'https://evolutionapi.roilabs.com.br';
        this.apiKey = process.env.EVOLUTION_API_KEY || 'SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz';
        this.defaultHeaders = {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
        };
        
        console.log('🔌 Evolution API Service inicializado');
        console.log(`📍 URL: ${this.apiUrl}`);
        console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
    }

    // 🔄 Health check da Evolution API
    async healthCheck() {
        try {
            const response = await axios.get(`${this.apiUrl}/`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            return {
                success: true,
                status: 'online',
                data: response.data,
                version: response.data.version || 'unknown'
            };
        } catch (error) {
            console.error('❌ Evolution API Health Check falhou:', error.message);
            return {
                success: false,
                status: 'offline',
                error: error.message
            };
        }
    }

    // 📱 Listar todas as instâncias WhatsApp ✅ ROTA CORRIGIDA
    async listInstances() {
        try {
            console.log('📱 Buscando instâncias WhatsApp...');
            
            // ✅ CORREÇÃO: Usar /instance/fetchInstances ao invés de /instance/list
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
                profilePicUrl: instance.profilePicUrl || null,
                createdAt: instance.createdAt,
                messagesCount: instance._count?.Message || 0,
                contactsCount: instance._count?.Contact || 0,
                chatsCount: instance._count?.Chat || 0,
                token: instance.token,
                qrCode: instance.connectionStatus === 'close' ? 'pending' : null
            }));
            
            console.log(`✅ ${instances.length} instâncias encontradas`);
            return {
                success: true,
                data: instances,
                total: instances.length
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

    // 🆕 Criar nova instância WhatsApp ✅ ROTA CORRIGIDA
    async createInstance(instanceName, settings = {}) {
        try {
            console.log(`🆕 Criando nova instância: ${instanceName}`);
            
            const instanceData = {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                ...settings
            };
            
            // ✅ CORREÇÃO: Esta rota está funcionando e retorna QR code automaticamente
            const response = await axios.post(`${this.apiUrl}/instance/create`, instanceData, {
                headers: this.defaultHeaders,
                timeout: 20000
            });
            
            console.log(`✅ Instância ${instanceName} criada com sucesso`);
            
            // ✅ CORREÇÃO: QR code vem no response da criação!
            const qrData = response.data.qrcode;
            
            return {
                success: true,
                data: {
                    instanceName: instanceName,
                    instanceId: response.data.instance?.instanceId,
                    status: response.data.instance?.status || 'connecting',
                    qrcode: qrData?.base64 || qrData?.code,
                    hash: response.data.hash,
                    integration: response.data.instance?.integration
                }
            };
            
        } catch (error) {
            console.error(`❌ Erro ao criar instância ${instanceName}:`, error.message);
            
            // Se erro 409 = instância já existe, tentar obter QR code
            if (error.response?.status === 409) {
                console.log(`⚠️ Instância ${instanceName} já existe, tentando obter QR code...`);
                return await this.getInstanceQRCode(instanceName);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🔗 Conectar instância (obter QR Code) ✅ LÓGICA CORRIGIDA
    async connectInstance(instanceName) {
        try {
            console.log(`🔗 Conectando instância: ${instanceName}`);
            
            // ✅ CORREÇÃO: Primeiro verificar se instância existe
            const instances = await this.listInstances();
            if (!instances.success) {
                throw new Error('Não foi possível verificar instâncias existentes');
            }
            
            const existingInstance = instances.data.find(i => 
                i.id === instanceName || i.name === instanceName
            );
            
            if (existingInstance) {
                // Instância existe - tentar obter QR code
                return await this.getInstanceQRCode(instanceName);
            } else {
                // Instância não existe - criar nova (que retorna QR automaticamente)
                console.log(`🆕 Instância ${instanceName} não existe, criando...`);
                return await this.createInstance(instanceName);
            }
            
        } catch (error) {
            console.error(`❌ Erro ao conectar instância ${instanceName}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 📱 Obter QR Code de instância existente ✅ MÉTODO NOVO
    async getInstanceQRCode(instanceName) {
        try {
            console.log(`📱 Obtendo QR code para ${instanceName}...`);
            
            // Tentar várias rotas possíveis para QR code
            const qrRoutes = [
                `/instance/connect/${instanceName}`,
                `/instance/${instanceName}/qrcode`,
                `/instance/qrcode/${instanceName}`,
                `/instance/${instanceName}/connect`
            ];
            
            for (const route of qrRoutes) {
                try {
                    const response = await axios.get(`${this.apiUrl}${route}`, {
                        headers: this.defaultHeaders,
                        timeout: 15000,
                        validateStatus: () => true
                    });
                    
                    if (response.status === 200 && response.data) {
                        console.log(`✅ QR code obtido via ${route}`);
                        
                        return {
                            success: true,
                            data: {
                                instanceName: instanceName,
                                qrcode: response.data.qrcode || response.data.base64 || response.data.code,
                                status: 'connecting',
                                source: route
                            }
                        };
                    }
                    
                } catch (routeError) {
                    console.log(`⚠️ Rota ${route} falhou: ${routeError.message}`);
                    continue;
                }
            }
            
            // Se nenhuma rota funcionou, tentar recriar a instância
            console.log(`🔄 Todas as rotas QR falharam, recriando instância ${instanceName}...`);
            
            // Primeiro deletar se existir
            await this.deleteInstance(instanceName);
            
            // Aguardar um pouco
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Criar nova instância
            return await this.createInstance(instanceName);
            
        } catch (error) {
            console.error(`❌ Erro ao obter QR code para ${instanceName}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ❌ Desconectar instância ✅ ROTA CORRIGIDA
    async disconnectInstance(instanceName) {
        try {
            console.log(`❌ Desconectando instância: ${instanceName}`);
            
            const response = await axios.delete(`${this.apiUrl}/instance/logout/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
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

    // 🗑️ Deletar instância ✅ ROTA CORRIGIDA
    async deleteInstance(instanceName) {
        try {
            console.log(`🗑️ Deletando instância: ${instanceName}`);
            
            const response = await axios.delete(`${this.apiUrl}/instance/delete/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000,
                validateStatus: () => true // Aceitar qualquer status
            });
            
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

    // 📤 Enviar mensagem ✅ ROTA CORRIGIDA
    async sendMessage(instanceName, to, message, type = 'text') {
        try {
            console.log(`📤 Enviando mensagem via ${instanceName} para ${to}`);
            
            const messageData = {
                number: to,
                options: {
                    delay: 1200,
                    presence: 'composing'
                }
            };

            if (type === 'text') {
                messageData.textMessage = {
                    text: message
                };
            }
            
            const response = await axios.post(`${this.apiUrl}/message/sendText/${instanceName}`, messageData, {
                headers: this.defaultHeaders,
                timeout: 15000
            });
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            console.error(`❌ Erro ao enviar mensagem:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🔔 Configurar webhooks ✅ ROTA CORRIGIDA
    async configureWebhook(instanceName, webhookUrl, events = []) {
        try {
            console.log(`🔔 Configurando webhook para ${instanceName}`);
            
            const webhookData = {
                url: webhookUrl,
                events: events.length > 0 ? events : [
                    'MESSAGES_UPSERT',
                    'MESSAGE_STATUS_UPDATE',
                    'PRESENCE_UPDATE',
                    'QRCODE_UPDATED',
                    'CONNECTION_UPDATE'
                ],
                webhook_by_events: false
            };
            
            const response = await axios.post(`${this.apiUrl}/webhook/set/${instanceName}`, webhookData, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            console.error(`❌ Erro ao configurar webhook:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 📊 Obter estatísticas da instância
    async getInstanceStats(instanceName) {
        try {
            const [chats, contacts] = await Promise.all([
                this.getChats(instanceName),
                this.getContacts(instanceName)
            ]);
            
            return {
                success: true,
                data: {
                    chats: chats.success ? chats.data.length : 0,
                    contacts: contacts.success ? contacts.data.length : 0
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { chats: 0, contacts: 0 }
            };
        }
    }

    // 💬 Listar chats
    async getChats(instanceName) {
        try {
            const response = await axios.get(`${this.apiUrl}/chat/findMany/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // 👥 Listar contatos
    async getContacts(instanceName) {
        try {
            const response = await axios.get(`${this.apiUrl}/contact/findMany/${instanceName}`, {
                headers: this.defaultHeaders,
                timeout: 10000
            });
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // 🎯 Processar webhook recebido
    async processWebhook(webhookData) {
        try {
            console.log('🎯 Processando webhook recebido:', webhookData.event);
            
            const { event, instance, data } = webhookData;
            
            switch (event) {
                case 'MESSAGES_UPSERT':
                    return await this.processMessage(instance, data);
                case 'QRCODE_UPDATED':
                    return await this.processQRCode(instance, data);
                case 'CONNECTION_UPDATE':
                    return await this.processConnectionUpdate(instance, data);
                default:
                    console.log(`ℹ️ Evento não processado: ${event}`);
                    return { success: true, processed: false };
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar webhook:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 💬 Processar mensagem recebida
    async processMessage(instance, messageData) {
        console.log(`💬 Nova mensagem em ${instance}:`, messageData.key?.remoteJid);
        
        // Aqui será integrado com Claude IA posteriormente
        return {
            success: true,
            action: 'message_received',
            instance: instance,
            from: messageData.key?.remoteJid,
            message: messageData.message
        };
    }

    // 📱 Processar QR Code atualizado
    async processQRCode(instance, qrData) {
        console.log(`📱 QR Code atualizado para ${instance}`);
        
        return {
            success: true,
            action: 'qr_updated',
            instance: instance,
            qrcode: qrData.qrcode
        };
    }

    // 🔗 Processar atualização de conexão
    async processConnectionUpdate(instance, connectionData) {
        console.log(`🔗 Status de conexão atualizado para ${instance}:`, connectionData.state);
        
        return {
            success: true,
            action: 'connection_updated',
            instance: instance,
            status: connectionData.state
        };
    }
}

module.exports = EvolutionAPIService;
