/**
 * 🏠 SOFIA IA - Backend UNIFICADO v4.0.0
 * ✅ USANDO EVOLUTION SERVICE CONSOLIDADO
 * 
 * Fluxo correto da Evolution API v2:
 * 1. Criar instância com webhook configurado
 * 2. Evolution API envia QR code via webhook QRCODE_UPDATED  
 * 3. Cache local armazena QR code recebido
 * 4. Frontend busca QR code do cache via API
 * 
 * 🎯 ENDPOINTS CORRIGIDOS PARA PRODUÇÃO!
 */

const express = require('express');
const cors = require('cors');

// 🔗 IMPORTAR SERVIÇO UNIFICADO
const EvolutionAPIService = require('./services/evolution.service.UNIFIED.js');

// 🔗 IMPORTAR ROTAS
const webhookRoutes = require('./routes/webhook.routes.js');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://sofia-ai-lux-dash.vercel.app'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔗 INICIALIZAR SERVIÇO UNIFICADO
const evolutionService = new EvolutionAPIService();

// Disponibilizar serviço globalmente no app
app.set('evolutionService', evolutionService);

// 🔗 REGISTRAR ROTAS DE WEBHOOK
app.use('/webhook', webhookRoutes);

// 📱 Manager de instâncias WhatsApp (compatibilidade + híbrido)
class WhatsAppInstanceManager {
    constructor() {
        this.instances = [
            {
                id: 'sofia-principal',
                name: 'sofia-principal',
                phone: '11999999999',
                status: 'disconnected',
                created_at: new Date().toISOString(),
                last_activity: '1 min atrás',
                messagesCount: 42,
                qr_code: null,
                webhook_url: process.env.WEBHOOK_URL || 'http://localhost:8000/webhook/evolution',
                profile_picture: null,
                battery_level: null,
                is_business: false,
                platform: 'web'
            },
            {
                id: 'sofia-backup',
                name: 'sofia-backup',
                phone: '11988888888',
                status: 'disconnected',
                created_at: new Date().toISOString(),
                last_activity: '5 min atrás',
                messagesCount: 23,
                qr_code: null,
                webhook_url: process.env.WEBHOOK_URL || 'http://localhost:8000/webhook/evolution',
                profile_picture: null,
                battery_level: null,
                is_business: false,
                platform: 'web'
            }
        ];
    }

    getAllInstances() {
        return this.instances;
    }

    getInstanceById(id) {
        return this.instances.find(instance => instance.id === id);
    }

    createInstance(name) {
        const newInstance = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            phone: null,
            status: 'pending',
            created_at: new Date().toISOString(),
            last_activity: 'Agora',
            messagesCount: 0,
            qr_code: null,
            webhook_url: process.env.WEBHOOK_URL || 'http://localhost:8000/webhook/evolution',
            profile_picture: null,
            battery_level: null,
            is_business: false,
            platform: 'web'
        };

        this.instances.push(newInstance);
        return newInstance;
    }

    updateInstanceStatus(id, status) {
        const instance = this.getInstanceById(id);
        if (instance) {
            instance.status = status;
            instance.last_activity = 'Agora';
            return instance;
        }
        return null;
    }

    deleteInstance(id) {
        const index = this.instances.findIndex(instance => instance.id === id);
        if (index !== -1) {
            const deletedInstance = this.instances[index];
            this.instances.splice(index, 1);
            return deletedInstance;
        }
        return null;
    }

    getStats() {
        const total = this.instances.length;
        const connected = this.instances.filter(i => i.status === 'connected').length;
        const disconnected = this.instances.filter(i => i.status === 'disconnected').length;
        const pending = this.instances.filter(i => i.status === 'pending').length;
        const connecting = this.instances.filter(i => i.status === 'connecting').length;
        const totalMessages = this.instances.reduce((sum, i) => sum + i.messagesCount, 0);

        return {
            total_instances: total,
            connected,
            disconnected,
            pending,
            connecting,
            total_messages_today: totalMessages,
            avg_response_time: '2.1s',
            uptime_percentage: '99.2%'
        };
    }
}

// Instância global do gerenciador de WhatsApp
const whatsappManager = new WhatsAppInstanceManager();

// 📊 Database de métricas simuladas (MANTÉM COMPATIBILIDADE)
class MetricsDatabase {
    constructor() {
        this.leads = this.generateRealisticLeads();
        this.conversations = this.generateRealisticConversations();
        this.analytics = this.generateRealisticAnalytics();
    }

    generateRealisticLeads() {
        const leads = [];
        const names = ['Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Carla Mendes', 'Lucas Ferreira', 'Juliana Lima', 'Rafael Alves'];
        const sources = ['Instagram', 'Facebook', 'Site', 'WhatsApp', 'Indicação'];
        const temperatures = ['cold', 'warm', 'hot', 'immediate'];
        
        for (let i = 1; i <= 150; i++) {
            const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            const score = Math.floor(Math.random() * 100);
            
            leads.push({
                id: i,
                name: names[Math.floor(Math.random() * names.length)],
                phone: `11999${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
                email: `cliente${i}@email.com`,
                source: sources[Math.floor(Math.random() * sources.length)],
                score: score,
                temperature: temperatures[Math.floor(score / 25)],
                status: Math.random() > 0.7 ? 'qualified' : 'pending',
                created_at: createdAt,
                last_interaction: new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
                budget: Math.floor(Math.random() * 1000000) + 200000,
                preferences: {
                    property_type: Math.random() > 0.5 ? 'apartamento' : 'casa',
                    bedrooms: Math.floor(Math.random() * 4) + 1,
                    location: ['Zona Sul', 'Zona Norte', 'Centro', 'Zona Oeste'][Math.floor(Math.random() * 4)]
                }
            });
        }
        return leads;
    }

    generateRealisticConversations() {
        const conversations = [];
        const today = new Date();
        
        for (let hour = 0; hour < 24; hour++) {
            const conversationCount = Math.floor(Math.random() * 20) + 5;
            conversations.push({
                hour: String(hour).padStart(2, '0') + ':00',
                count: conversationCount,
                qualified: Math.floor(conversationCount * (Math.random() * 0.4 + 0.1)),
                timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour)
            });
        }
        return conversations;
    }

    generateRealisticAnalytics() {
        const totalConversations = this.conversations.reduce((sum, conv) => sum + conv.count, 0);
        const totalQualified = this.conversations.reduce((sum, conv) => sum + conv.qualified, 0);
        
        return {
            today: {
                conversations: totalConversations,
                qualified_leads: totalQualified,
                conversion_rate: ((totalQualified / totalConversations) * 100).toFixed(1),
                growth_rate: Math.floor(Math.random() * 20) + 5,
            },
            week: {
                conversations: totalConversations * 7,
                qualified_leads: totalQualified * 7,
                average_response_time: '2.3m',
                satisfaction_rate: '94.2%'
            },
            month: {
                total_leads: this.leads.length,
                hot_leads: this.leads.filter(l => l.temperature === 'hot').length,
                closed_deals: Math.floor(this.leads.length * 0.12),
                revenue: Math.floor(Math.random() * 5000000) + 2000000
            }
        };
    }

    getTodayMetrics() {
        const now = new Date();
        const todayConversations = this.conversations.filter(c => c.timestamp.toDateString() === now.toDateString());
        const totalToday = todayConversations.reduce((sum, conv) => sum + conv.count, 0);
        const qualifiedToday = todayConversations.reduce((sum, conv) => sum + conv.qualified, 0);
        
        return {
            conversations_today: totalToday,
            conversion_rate: totalToday > 0 ? ((qualifiedToday / totalToday) * 100).toFixed(1) : '0.0',
            qualified_leads: qualifiedToday,
            growth_rate: `+${Math.floor(Math.random() * 15) + 5}%`,
            activity_data: this.conversations.map(conv => ({
                name: conv.hour,
                value: conv.count
            }))
        };
    }

    getRecentConversations() {
        return [
            {
                id: 1,
                user: 'Cliente Potencial',
                message: 'Olá, vi o apartamento no anúncio. Ainda está disponível?',
                time: '14:32',
                type: 'received',
                lead_score: 75
            },
            {
                id: 2,
                user: 'Sofia IA',
                message: 'Olá! Sim, temos várias opções disponíveis. Gostaria de saber mais detalhes sobre suas preferências?',
                time: '14:33',
                type: 'sent',
                automated: true
            },
            {
                id: 3,
                user: 'Maria Santos',
                message: 'Preciso de algo urgente, meu contrato de aluguel vence semana que vem',
                time: '14:35',
                type: 'received',
                lead_score: 95,
                urgency: 'high'
            },
            {
                id: 4,
                user: 'Sofia IA',
                message: 'Entendo a urgência! Tenho 3 opções que podem interessar. Posso agendar uma visita hoje?',
                time: '14:36',
                type: 'sent',
                automated: true
            },
            {
                id: 5,
                user: 'João Silva',
                message: 'Qual o valor do condomínio desse apto de 2 quartos?',
                time: '14:40',
                type: 'received',
                lead_score: 60
            }
        ];
    }

    getLeadsByStatus() {
        const statusCount = this.leads.reduce((acc, lead) => {
            acc[lead.temperature] = (acc[lead.temperature] || 0) + 1;
            return acc;
        }, {});
        
        return {
            cold: statusCount.cold || 0,
            warm: statusCount.warm || 0,
            hot: statusCount.hot || 0,
            immediate: statusCount.immediate || 0
        };
    }
}

// Instância global do banco de dados simulado
const db = new MetricsDatabase();

// 🚀 ENDPOINTS PRINCIPAIS

// Health check
app.get('/health', async (req, res) => {
    console.log('📊 Health check requisitado');
    
    const whatsappStats = whatsappManager.getStats();
    const evolutionHealth = await evolutionService.healthCheck();
    const serviceStats = evolutionService.getServiceStats();
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Sofia IA Backend',
        version: '4.0.0-unified',
        uptime: process.uptime(),
        whatsapp_system: {
            status: 'active',
            stats: whatsappStats
        },
        evolution_api: {
            health: evolutionHealth,
            stats: serviceStats
        }
    });
});

// Demais endpoints mantendo compatibilidade...
app.get('/api/dashboard/overview', (req, res) => {
    const metrics = db.getTodayMetrics();
    const leadsByStatus = db.getLeadsByStatus();
    
    res.json({
        success: true,
        data: {
            stats: {
                conversations_today: metrics.conversations_today,
                conversion_rate: metrics.conversion_rate,
                qualified_leads: metrics.qualified_leads,
                growth_rate: metrics.growth_rate
            },
            activity_chart: metrics.activity_data,
            leads_by_status: leadsByStatus,
            last_updated: new Date().toISOString()
        }
    });
});

app.get('/api/conversations/recent', (req, res) => {
    res.json({ success: true, data: db.getRecentConversations() });
});

app.get('/api/leads', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    
    let leads = db.leads;
    
    if (status) {
        leads = leads.filter(lead => lead.temperature === status);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = leads.slice(startIndex, endIndex);
    
    res.json({
        success: true,
        data: paginatedLeads,
        pagination: {
            current_page: page,
            total_pages: Math.ceil(leads.length / limit),
            total_items: leads.length,
            items_per_page: limit
        }
    });
});

// 🔗 ========== WHATSAPP ENDPOINTS COM EVOLUTION API UNIFICADO ==========

// 📱 Listar instâncias
app.get('/api/whatsapp/instances', async (req, res) => {
    console.log('📱 Instâncias WhatsApp requisitadas');
    
    try {
        const evolutionResult = await evolutionService.listInstances();
        
        if (evolutionResult.success && evolutionResult.data.length > 0) {
            res.json({
                success: true,
                data: evolutionResult.data,
                total: evolutionResult.data.length,
                source: 'evolution_api',
                timestamp: new Date().toISOString()
            });
        } else {
            const instances = whatsappManager.getAllInstances();
            res.json({
                success: true,
                data: instances,
                total: instances.length,
                source: 'local_simulation',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        const instances = whatsappManager.getAllInstances();
        res.json({
            success: true,
            data: instances,
            total: instances.length,
            source: 'local_fallback',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 📱 Criar instância - CORRIGIDO payload esperado
app.post('/api/whatsapp/instances', async (req, res) => {
    const { instanceName, settings = {} } = req.body;
    
    if (!instanceName || !instanceName.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Nome da instância é obrigatório'
        });
    }
    
    try {
        const result = await evolutionService.createInstance(instanceName.trim(), settings);
        
        if (result.success) {
            res.status(201).json({
                success: true,
                data: result.data,
                message: 'Instância criada com sucesso. QR code será enviado via webhook.',
                source: 'evolution_api'
            });
        } else {
            throw new Error(result.error || 'Falha na criação da instância');
        }
    } catch (error) {
        const localInstance = whatsappManager.createInstance(instanceName.trim());
        res.status(201).json({
            success: true,
            data: localInstance,
            message: 'Instância criada localmente (fallback)',
            source: 'local_fallback',
            warning: 'Evolution API não disponível'
        });
    }
});

// 📱 QR CODE ENDPOINTS - CORRIGIDOS URLs que estávamos testando

// Endpoint principal: /api/whatsapp/qrcode/:instanceName
app.get('/api/whatsapp/qrcode/:instanceName', async (req, res) => {
    const { instanceName } = req.params;
    const forceRefresh = req.query.refresh === 'true';
    
    try {
        // 1. Verificar cache de QR codes
        const cachedQR = evolutionService.getCachedQRCode(instanceName);
        
        if (cachedQR && !forceRefresh) {
            return res.json({
                success: true,
                data: {
                    instance_id: instanceName,
                    qr_code: cachedQR,
                    qr_data_url: cachedQR.startsWith('data:') ? cachedQR : `data:image/png;base64,${cachedQR}`,
                    expires_in: 300,
                    source: 'cache',
                    cache_hit: true
                },
                message: 'QR Code obtido do cache'
            });
        }
        
        // 2. Criar/conectar instância
        const createResult = await evolutionService.createInstance(instanceName);
        
        if (createResult.success) {
            // 3. Tentar conectar para gerar QR
            const connectResult = await evolutionService.connectInstance(instanceName);
            
            if (connectResult.success && connectResult.qrcode) {
                return res.json({
                    success: true,
                    data: {
                        instance_id: instanceName,
                        qr_code: connectResult.qrcode,
                        qr_data_url: connectResult.qrcode.startsWith('data:') ? connectResult.qrcode : `data:image/png;base64,${connectResult.qrcode}`,
                        expires_in: 300,
                        source: connectResult.source,
                        cache_hit: false
                    },
                    message: connectResult.message
                });
            }
            
            // 4. QR code virá via webhook - informar cliente
            return res.json({
                success: true,
                data: {
                    instance_id: instanceName,
                    qr_code: null,
                    status: 'pending',
                    message: 'QR code será enviado via webhook em instantes.'
                },
                message: 'Aguardando QR code via webhook'
            });
        } else {
            throw new Error(createResult.error || 'Falha na criação da instância');
        }
        
    } catch (error) {
        console.error(`❌ Erro ao obter QR Code para ${instanceName}:`, error.message);
        
        // Fallback simulado
        const simulatedQRCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hTBrKgAAAABJRU5ErkJggg==';
        
        res.json({
            success: true,
            data: {
                instance_id: instanceName,
                qr_code: simulatedQRCode,
                qr_data_url: simulatedQRCode,
                expires_in: 300,
                source: 'fallback_simulation',
                cache_hit: false
            },
            message: 'QR Code simulado (modo desenvolvimento)',
            warning: 'Evolution API não disponível - usando fallback local'
        });
    }
});

// 📱 Endpoint alternativo: /api/whatsapp/instances/:instanceId/qr (compatibilidade)
app.get('/api/whatsapp/instances/:instanceId/qr', (req, res) => {
    // Redirecionar para o endpoint principal
    const { instanceId } = req.params;
    req.url = `/api/whatsapp/qrcode/${instanceId}`;
    req.params.instanceName = instanceId;
    app._router.handle(req, res);
});

// 📱 Stats e Debug endpoints

// Stats WhatsApp
app.get('/api/whatsapp/stats', (req, res) => {
    const whatsappStats = whatsappManager.getStats();
    const serviceStats = evolutionService.getServiceStats();
    
    res.json({
        success: true,
        data: {
            ...whatsappStats,
            evolution_stats: serviceStats
        },
        timestamp: new Date().toISOString()
    });
});

// Debug QR Cache
app.get('/api/debug/qr-cache', (req, res) => {
    const serviceStats = evolutionService.getServiceStats();
    
    res.json({
        success: true,
        data: serviceStats,
        timestamp: new Date().toISOString()
    });
});

// Envio de mensagens (placeholder - será implementado com Claude IA)
app.post('/api/whatsapp/send', async (req, res) => {
    const { instance, phone, message } = req.body;
    
    if (!instance || !phone || !message) {
        return res.status(400).json({
            success: false,
            error: 'instance, phone e message são obrigatórios'
        });
    }
    
    // TODO: Implementar envio via Evolution API
    res.json({
        success: true,
        data: {
            instance,
            phone,
            message,
            status: 'sent',
            timestamp: new Date().toISOString()
        },
        message: 'Mensagem enviada com sucesso (simulado)'
    });
});

// Demais endpoints WhatsApp...
app.post('/api/whatsapp/instances/:instanceId/connect', async (req, res) => {
    const { instanceId } = req.params;
    
    try {
        const result = await evolutionService.connectInstance(instanceId);
        
        if (result.success) {
            whatsappManager.updateInstanceStatus(instanceId, 'connecting');
            
            res.json({
                success: true,
                data: { instance_id: instanceId, status: 'connecting' },
                message: 'Processo de conexão iniciado via Evolution API'
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        const updatedInstance = whatsappManager.updateInstanceStatus(instanceId, 'connecting');
        res.json({
            success: true,
            data: updatedInstance || { instance_id: instanceId, status: 'connecting' },
            message: 'Processo de conexão iniciado (fallback local)',
            source: 'local_fallback'
        });
    }
});

app.post('/api/whatsapp/instances/:instanceId/disconnect', async (req, res) => {
    const { instanceId } = req.params;
    
    try {
        const result = await evolutionService.disconnectInstance(instanceId);
        
        if (result.success) {
            whatsappManager.updateInstanceStatus(instanceId, 'disconnected');
            res.json({
                success: true,
                data: { instance_id: instanceId, status: 'disconnected' },
                message: result.message
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        const updatedInstance = whatsappManager.updateInstanceStatus(instanceId, 'disconnected');
        res.json({
            success: true,
            data: updatedInstance || { instance_id: instanceId, status: 'disconnected' },
            message: 'Instância desconectada (fallback local)'
        });
    }
});

app.delete('/api/whatsapp/instances/:instanceId', async (req, res) => {
    const { instanceId } = req.params;
    
    try {
        const result = await evolutionService.deleteInstance(instanceId);
        
        if (result.success) {
            whatsappManager.deleteInstance(instanceId);
            res.json({
                success: true,
                data: { instance_id: instanceId },
                message: result.message
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        const deletedInstance = whatsappManager.deleteInstance(instanceId);
        
        if (deletedInstance) {
            res.json({
                success: true,
                data: deletedInstance,
                message: 'Instância deletada localmente (fallback)'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Instância não encontrada'
            });
        }
    }
});

// Error handlers
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Finalizando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 Interrompido pelo usuário...');
    process.exit(0);
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
    console.log('🏠 ==========================================');
    console.log('🚀 SOFIA IA BACKEND v4.0.0 UNIFICADO!');
    console.log('🔔 EVOLUTION API SERVICE CONSOLIDADO!');
    console.log('🏠 ==========================================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📱 WhatsApp: http://localhost:${PORT}/api/whatsapp/instances`);
    console.log(`🔔 Webhook: http://localhost:${PORT}/webhook/evolution`);
    console.log(`📱 QR Code: http://localhost:${PORT}/api/whatsapp/qrcode/:instanceName`);
    console.log(`🔍 Debug: http://localhost:${PORT}/api/debug/qr-cache`);
    console.log('🏠 ==========================================');
    console.log('✅ EVOLUTION SERVICE UNIFICADO ATIVO!');
    console.log('🔔 Webhook configurado para receber eventos!');
    console.log('📱 QR codes via webhook QRCODE_UPDATED!');
    console.log('💾 Cache local implementado!');
    console.log('🎯 TODOS OS SERVICES CONSOLIDADOS!');
    console.log('🏠 ==========================================');
});

module.exports = app;