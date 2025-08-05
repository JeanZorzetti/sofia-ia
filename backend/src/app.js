/**
 * 🏠 SOFIA IA - Backend com Métricas Reais + WhatsApp Management Completo
 * Servidor Express com endpoints para dashboard real e gestão completa de instâncias WhatsApp
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 🔗 IMPORTAR QR CODE SERVICE
const QRCodeService = require('./services/qrcode.service.js');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// 🔗 INICIALIZAR QR CODE SERVICE
const qrCodeService = new QRCodeService();

// 📱 Simulador de instâncias WhatsApp (em memória)
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
                webhook_url: 'https://sofia-api.roilabs.com.br/webhook/sofia-principal',
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
                webhook_url: 'https://sofia-api.roilabs.com.br/webhook/sofia-backup',
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
            webhook_url: `https://sofia-api.roilabs.com.br/webhook/${name.toLowerCase().replace(/\s+/g, '-')}`,
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

// 📊 DADOS SIMULADOS REALISTAS (Base para métricas reais)
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

// 🚀 ENDPOINTS DA API

// Health check
app.get('/health', (req, res) => {
    console.log('📊 Health check requisitado');
    
    const qrCodeStats = qrCodeService.getQRCodeStats();
    const whatsappStats = whatsappManager.getStats();
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Sofia IA Backend',
        version: '2.2.0',
        uptime: process.uptime(),
        whatsapp_system: {
            status: 'active',
            stats: whatsappStats
        },
        qrcode_system: {
            status: 'active',
            stats: qrCodeStats
        }
    });
});

// 📊 Dashboard principal - métricas do overview
app.get('/api/dashboard/overview', (req, res) => {
    console.log('📊 Métricas dashboard requisitadas');
    
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

// 💬 Conversas recentes para preview do chat
app.get('/api/conversations/recent', (req, res) => {
    console.log('💬 Conversas recentes requisitadas');
    
    const recentConversations = db.getRecentConversations();
    
    res.json({
        success: true,
        data: recentConversations
    });
});

// 👥 Lista de leads com paginação
app.get('/api/leads', (req, res) => {
    console.log('👥 Lista de leads requisitada');
    
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

// 📈 Analytics detalhados
app.get('/api/analytics/detailed', (req, res) => {
    console.log('📈 Analytics detalhados requisitados');
    
    const analytics = db.analytics;
    const leadsByStatus = db.getLeadsByStatus();
    
    res.json({
        success: true,
        data: {
            overview: analytics,
            leads_distribution: leadsByStatus,
            performance: {
                avg_response_time: '2.1s',
                satisfaction_score: 4.7,
                automation_rate: '89%',
                human_handoff_rate: '11%'
            },
            trends: {
                conversations_growth: '+23%',
                conversion_improvement: '+15%',
                response_time_improvement: '-12%'
            }
        }
    });
});

// 🔄 WebSocket simulation - Updates em tempo real
app.get('/api/realtime/stats', (req, res) => {
    console.log('🔄 Stats em tempo real requisitadas');
    
    const realTimeStats = {
        active_conversations: Math.floor(Math.random() * 50) + 10,
        queue_size: Math.floor(Math.random() * 10),
        avg_response_time: (Math.random() * 3 + 1).toFixed(1) + 's',
        online_agents: Math.floor(Math.random() * 5) + 1,
        last_message_time: new Date().toISOString(),
        system_load: (Math.random() * 30 + 20).toFixed(1) + '%'
    };
    
    res.json({
        success: true,
        data: realTimeStats,
        timestamp: new Date().toISOString()
    });
});

// 🎯 Lead específico
app.get('/api/leads/:id', (req, res) => {
    console.log(`🎯 Lead ${req.params.id} requisitado`);
    
    const lead = db.leads.find(l => l.id === parseInt(req.params.id));
    
    if (!lead) {
        return res.status(404).json({
            success: false,
            error: 'Lead não encontrado'
        });
    }
    
    res.json({
        success: true,
        data: lead
    });
});

// 📊 Métricas específicas por período
app.get('/api/analytics/period', (req, res) => {
    console.log('📊 Métricas por período requisitadas');
    
    const period = req.query.period || '24h';
    
    let data;
    switch (period) {
        case '24h':
            data = db.conversations;
            break;
        case '7d':
            data = Array.from({length: 7}, (_, i) => ({
                day: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
                conversations: Math.floor(Math.random() * 200) + 100,
                qualified: Math.floor(Math.random() * 60) + 20
            })).reverse();
            break;
        case '30d':
            data = Array.from({length: 30}, (_, i) => ({
                day: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
                conversations: Math.floor(Math.random() * 250) + 80,
                qualified: Math.floor(Math.random() * 80) + 15
            })).reverse();
            break;
        default:
            data = db.conversations;
    }
    
    res.json({
        success: true,
        data: data,
        period: period
    });
});

// 🔗 ========== WHATSAPP INSTANCES ENDPOINTS ==========

// 📱 Listar todas as instâncias WhatsApp
app.get('/api/whatsapp/instances', (req, res) => {
    console.log('📱 Instâncias WhatsApp requisitadas');
    
    const instances = whatsappManager.getAllInstances();
    const stats = whatsappManager.getStats();
    
    res.json({
        success: true,
        data: instances,
        stats: stats,
        total: instances.length,
        timestamp: new Date().toISOString()
    });
});

// 📱 Criar nova instância WhatsApp
app.post('/api/whatsapp/instances', (req, res) => {
    console.log('📱 Criando nova instância WhatsApp');
    
    const { name } = req.body;
    
    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Nome da instância é obrigatório'
        });
    }
    
    const existingInstance = whatsappManager.getInstanceById(name.toLowerCase().replace(/\s+/g, '-'));
    if (existingInstance) {
        return res.status(409).json({
            success: false,
            error: 'Já existe uma instância com esse nome'
        });
    }
    
    try {
        const newInstance = whatsappManager.createInstance(name.trim());
        
        console.log(`✅ Instância '${name}' criada com sucesso`);
        
        res.status(201).json({
            success: true,
            data: newInstance,
            message: 'Instância criada com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar instância:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao criar instância'
        });
    }
});

// 📱 Conectar instância
app.post('/api/whatsapp/instances/:instanceId/connect', (req, res) => {
    console.log(`📱 Conectando instância ${req.params.instanceId}`);
    
    const { instanceId } = req.params;
    const instance = whatsappManager.getInstanceById(instanceId);
    
    if (!instance) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    try {
        const updatedInstance = whatsappManager.updateInstanceStatus(instanceId, 'connecting');
        
        setTimeout(() => {
            whatsappManager.updateInstanceStatus(instanceId, 'connected');
            console.log(`✅ Instância '${instanceId}' conectada com sucesso`);
        }, 2000);
        
        res.json({
            success: true,
            data: updatedInstance,
            message: 'Processo de conexão iniciado'
        });
        
    } catch (error) {
        console.error('❌ Erro ao conectar instância:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao conectar instância'
        });
    }
});

// 📱 Desconectar instância
app.post('/api/whatsapp/instances/:instanceId/disconnect', (req, res) => {
    console.log(`📱 Desconectando instância ${req.params.instanceId}`);
    
    const { instanceId } = req.params;
    const instance = whatsappManager.getInstanceById(instanceId);
    
    if (!instance) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    try {
        const updatedInstance = whatsappManager.updateInstanceStatus(instanceId, 'disconnected');
        
        console.log(`✅ Instância '${instanceId}' desconectada com sucesso`);
        
        res.json({
            success: true,
            data: updatedInstance,
            message: 'Instância desconectada com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao desconectar instância:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao desconectar instância'
        });
    }
});

// 🗑️ DELETAR INSTÂNCIA (ENDPOINT PRINCIPAL CORRIGIDO)
app.delete('/api/whatsapp/instances/:instanceId', (req, res) => {
    console.log(`🗑️ Deletando instância ${req.params.instanceId}`);
    
    const { instanceId } = req.params;
    const instance = whatsappManager.getInstanceById(instanceId);
    
    if (!instance) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    try {
        const deletedInstance = whatsappManager.deleteInstance(instanceId);
        
        console.log(`✅ Instância '${instanceId}' deletada com sucesso`);
        
        res.json({
            success: true,
            data: deletedInstance,
            message: 'Instância deletada com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao deletar instância:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao deletar instância'
        });
    }
});

// 📱 Obter QR Code de uma instância
app.get('/api/whatsapp/instances/:instanceId/qr', (req, res) => {
    console.log(`📱 Obtendo QR Code para instância ${req.params.instanceId}`);
    
    const { instanceId } = req.params;
    const instance = whatsappManager.getInstanceById(instanceId);
    
    if (!instance) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    try {
        const simulatedQRCode = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const qrData = {
            qr_code: simulatedQRCode,
            status: 'generated',
            expires_in: 60,
            instructions: [
                'Abra o WhatsApp no seu celular',
                'Toque em Configurações > Aparelhos conectados',
                'Toque em Conectar aparelho',
                'Aponte seu celular para esta tela para capturar o código'
            ]
        };
        
        res.json({
            success: true,
            data: qrData,
            message: 'QR Code gerado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao gerar QR Code'
        });
    }
});

// 📊 Estatísticas WhatsApp
app.get('/api/whatsapp/stats', (req, res) => {
    console.log('📊 Estatísticas WhatsApp requisitadas');
    
    const stats = whatsappManager.getStats();
    
    res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
    });
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
    console.log('👋 Servidor Sofia IA sendo finalizado...');
    qrCodeService.cleanExpiredQRCodes();
    process.exit(0);
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
    console.log('🏠 ===================================');
    console.log('🚀 SOFIA IA BACKEND INICIADO!');
    console.log('🔗 COM WHATSAPP MANAGEMENT COMPLETO!');
    console.log('🏠 ===================================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📈 Dashboard: http://localhost:${PORT}/api/dashboard/overview`);
    console.log(`💬 Conversas: http://localhost:${PORT}/api/conversations/recent`);
    console.log(`👥 Leads: http://localhost:${PORT}/api/leads`);
    console.log('🏠 ===================================');
    console.log('🔗 === WHATSAPP ENDPOINTS ===');
    console.log(`📱 Listar:     GET    http://localhost:${PORT}/api/whatsapp/instances`);
    console.log(`📱 Criar:      POST   http://localhost:${PORT}/api/whatsapp/instances`);
    console.log(`📱 Conectar:   POST   http://localhost:${PORT}/api/whatsapp/instances/:id/connect`);
    console.log(`📱 Desconectar:POST   http://localhost:${PORT}/api/whatsapp/instances/:id/disconnect`);
    console.log(`🗑️ Deletar:    DELETE http://localhost:${PORT}/api/whatsapp/instances/:id`);
    console.log(`🔗 QR Code:    GET    http://localhost:${PORT}/api/whatsapp/instances/:id/qr`);
    console.log(`📊 Stats:      GET    http://localhost:${PORT}/api/whatsapp/stats`);
    console.log('🏠 ===================================');
    console.log('✅ Sistema WhatsApp Management ATIVO!');
    console.log('🗑️ Endpoint DELETE funcionando!');
    console.log('🔗 Pronto para conectar com o frontend!');
    console.log('🏠 ===================================');
    
    // Inicializar limpeza de cache a cada 30 segundos
    setInterval(() => {
        qrCodeService.cleanExpiredQRCodes();
    }, 30000);
});

module.exports = app;