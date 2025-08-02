/**
 * 🏠 SOFIA IA - Backend com Métricas Reais + WhatsApp Management
 * Servidor Express com endpoints para dashboard real e WhatsApp
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// 📊 DADOS SIMULADOS REALISTAS (Base para métricas reais)
class MetricsDatabase {
    constructor() {
        this.leads = this.generateRealisticLeads();
        this.conversations = this.generateRealisticConversations();
        this.analytics = this.generateRealisticAnalytics();
        this.whatsappInstances = this.generateWhatsAppInstances(); // 📱 NOVO!
    }

    generateRealisticLeads() {
        const leads = [];
        const names = ['Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Carla Mendes', 'Lucas Ferreira', 'Juliana Lima', 'Rafael Alves'];
        const sources = ['Instagram', 'Facebook', 'Site', 'WhatsApp', 'Indicação'];
        const temperatures = ['cold', 'warm', 'hot', 'immediate'];
        
        for (let i = 1; i <= 150; i++) {
            const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Últimos 30 dias
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
        
        // Gerar conversas das últimas 24h por hora
        for (let hour = 0; hour < 24; hour++) {
            const conversationCount = Math.floor(Math.random() * 20) + 5; // 5-25 conversas por hora
            conversations.push({
                hour: String(hour).padStart(2, '0') + ':00',
                count: conversationCount,
                qualified: Math.floor(conversationCount * (Math.random() * 0.4 + 0.1)), // 10-50% qualificados
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
                growth_rate: Math.floor(Math.random() * 20) + 5, // 5-25%
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
                closed_deals: Math.floor(this.leads.length * 0.12), // 12% conversion
                revenue: Math.floor(Math.random() * 5000000) + 2000000
            }
        };
    }

    // 📱 NOVO: Gerar instâncias WhatsApp realísticas
    generateWhatsAppInstances() {
        return [
            {
                id: 'sofia-principal',
                name: 'Sofia Principal',
                phone: '+55 11 98765-4321',
                status: 'connected',
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                last_activity: '2 min atrás',
                messagesCount: Math.floor(Math.random() * 300) + 100,
                qr_code: null, // Conectado = sem QR
                webhook_url: 'https://sofia-ia.com/webhook/whatsapp',
                profile_picture: 'https://avatars.githubusercontent.com/u/1234567',
                battery_level: Math.floor(Math.random() * 100),
                is_business: true,
                platform: 'android'
            },
            {
                id: 'sofia-backup',
                name: 'Sofia Backup',
                phone: '+55 11 91234-5678',
                status: 'disconnected',
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                last_activity: '1 hora atrás',
                messagesCount: Math.floor(Math.random() * 100) + 50,
                qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                webhook_url: 'https://sofia-ia.com/webhook/whatsapp-backup',
                profile_picture: null,
                battery_level: null,
                is_business: false,
                platform: 'web'
            }
        ];
    }

    // Métricas em tempo real
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

    // Conversas recentes para preview
    getRecentConversations() {
        const recentMessages = [
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
        return recentMessages;
    }

    // Leads por status/temperatura
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

    // 📱 NOVO: Métodos para WhatsApp
    getWhatsAppInstances() {
        return this.whatsappInstances;
    }

    createWhatsAppInstance(name) {
        const newInstance = {
            id: `sofia-${Date.now()}`,
            name: name,
            phone: `+55 11 9${Math.floor(Math.random() * 100000000)}`,
            status: 'pending',
            created_at: new Date().toISOString(),
            last_activity: 'Nunca',
            messagesCount: 0,
            qr_code: this.generateQRCode(),
            webhook_url: `https://sofia-ia.com/webhook/${name.toLowerCase().replace(/\s+/g, '-')}`,
            profile_picture: null,
            battery_level: null,
            is_business: false,
            platform: 'web'
        };
        
        this.whatsappInstances.push(newInstance);
        
        // Simular transição de estados
        setTimeout(() => {
            const instance = this.whatsappInstances.find(i => i.id === newInstance.id);
            if (instance) {
                instance.status = 'connecting';
            }
        }, 2000);
        
        return newInstance;
    }

    disconnectWhatsAppInstance(instanceId) {
        const instance = this.whatsappInstances.find(i => i.id === instanceId);
        if (instance) {
            instance.status = 'disconnected';
            instance.qr_code = this.generateQRCode();
            instance.last_activity = 'Agora';
            return true;
        }
        return false;
    }

    connectWhatsAppInstance(instanceId) {
        const instance = this.whatsappInstances.find(i => i.id === instanceId);
        if (instance) {
            instance.status = 'connected';
            instance.qr_code = null;
            instance.last_activity = 'Agora';
            instance.phone = `+55 11 9${Math.floor(Math.random() * 100000000)}`;
            return true;
        }
        return false;
    }

    deleteWhatsAppInstance(instanceId) {
        const index = this.whatsappInstances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            this.whatsappInstances.splice(index, 1);
            return true;
        }
        return false;
    }

    generateQRCode() {
        // Simular QR code base64
        const qrMatrix = [];
        for (let i = 0; i < 25; i++) {
            const row = [];
            for (let j = 0; j < 25; j++) {
                row.push(Math.random() > 0.5 ? 1 : 0);
            }
            qrMatrix.push(row);
        }
        return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getWhatsAppStats() {
        const connectedCount = this.whatsappInstances.filter(i => i.status === 'connected').length;
        const disconnectedCount = this.whatsappInstances.filter(i => i.status === 'disconnected').length;
        const totalMessages = this.whatsappInstances.reduce((sum, i) => sum + i.messagesCount, 0);
        
        return {
            total_instances: this.whatsappInstances.length,
            connected: connectedCount,
            disconnected: disconnectedCount,
            pending: this.whatsappInstances.filter(i => i.status === 'pending').length,
            connecting: this.whatsappInstances.filter(i => i.status === 'connecting').length,
            total_messages_today: totalMessages,
            avg_response_time: '1.2s',
            uptime_percentage: connectedCount > 0 ? ((connectedCount / this.whatsappInstances.length) * 100).toFixed(1) : '0.0'
        };
    }
}

// Instância global do banco de dados simulado
const db = new MetricsDatabase();

// 🚀 ENDPOINTS DA API

// 🏠 Rota raiz - Página inicial da API
app.get('/', (req, res) => {
    console.log('🏠 Página inicial da API acessada');
    res.json({
        service: 'Sofia IA Backend',
        version: '2.1.0', // ✨ VERSÃO ATUALIZADA COM WHATSAPP
        status: 'online',
        description: 'Sistema SDR Inteligente para Imobiliárias',
        documentation: {
            health: '/health',
            dashboard: '/api/dashboard/overview',
            conversations: '/api/conversations/recent',
            leads: '/api/leads',
            analytics: '/api/analytics/detailed',
            realtime: '/api/realtime/stats',
            whatsapp: '/api/whatsapp/instances', // 📱 NOVO!
            whatsapp_stats: '/api/whatsapp/stats' // 📱 NOVO!
        },
        features: [
            'Dashboard Analytics em tempo real',
            'Gestão de leads com IA',
            'Conversas WhatsApp automatizadas',
            'Múltiplas instâncias WhatsApp', // 📱 NOVO!
            'QR codes dinâmicos', // 📱 NOVO!
            'Webhooks bidirecionais', // 📱 NOVO!
            'Relatórios avançados',
            'API RESTful completa'
        ],
        developer: {
            company: 'ROI Labs',
            contact: 'contato@roilabs.com.br',
            repository: 'https://github.com/JeanZorzetti/sofia-ia-backend'
        },
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    console.log('📊 Health check requisitado');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Sofia IA Backend',
        version: '2.1.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        whatsapp_status: 'ready' // 📱 NOVO!
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
    const status = req.query.status; // cold, warm, hot, immediate
    
    let leads = db.leads;
    
    // Filtrar por status se especificado
    if (status) {
        leads = leads.filter(lead => lead.temperature === status);
    }
    
    // Paginação
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
    
    // Simular dados que mudam em tempo real
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
    
    const period = req.query.period || '24h'; // 24h, 7d, 30d
    
    let data;
    switch (period) {
        case '24h':
            data = db.conversations;
            break;
        case '7d':
            // Simular dados de 7 dias
            data = Array.from({length: 7}, (_, i) => ({
                day: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
                conversations: Math.floor(Math.random() * 200) + 100,
                qualified: Math.floor(Math.random() * 60) + 20
            })).reverse();
            break;
        case '30d':
            // Simular dados de 30 dias
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

// 📱 ========== WHATSAPP ENDPOINTS (NOVOS!) ==========

// 📱 Listar todas as instâncias WhatsApp
app.get('/api/whatsapp/instances', (req, res) => {
    console.log('📱 Instâncias WhatsApp requisitadas');
    
    const instances = db.getWhatsAppInstances();
    const stats = db.getWhatsAppStats();
    
    res.json({
        success: true,
        data: instances,
        stats: stats,
        timestamp: new Date().toISOString()
    });
});

// 📱 Criar nova instância WhatsApp
app.post('/api/whatsapp/instances', (req, res) => {
    console.log('📱 Criando nova instância WhatsApp');
    
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Nome da instância é obrigatório'
        });
    }
    
    try {
        const newInstance = db.createWhatsAppInstance(name.trim());
        
        res.status(201).json({
            success: true,
            data: newInstance,
            message: 'Instância criada com sucesso. Escaneie o QR Code para conectar.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro interno ao criar instância'
        });
    }
});

// 📱 Obter instância específica
app.get('/api/whatsapp/instances/:id', (req, res) => {
    console.log(`📱 Instância ${req.params.id} requisitada`);
    
    const instance = db.getWhatsAppInstances().find(i => i.id === req.params.id);
    
    if (!instance) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    res.json({
        success: true,
        data: instance
    });
});

// 📱 Desconectar instância WhatsApp
app.post('/api/whatsapp/instances/:id/disconnect', (req, res) => {
    console.log(`📱 Desconectando instância ${req.params.id}`);
    
    const success = db.disconnectWhatsAppInstance(req.params.id);
    
    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    res.json({
        success: true,
        message: 'Instância desconectada com sucesso'
    });
});

// 📱 Conectar instância WhatsApp
app.post('/api/whatsapp/instances/:id/connect', (req, res) => {
    console.log(`📱 Conectando instância ${req.params.id}`);
    
    const success = db.connectWhatsAppInstance(req.params.id);
    
    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    res.json({
        success: true,
        message: 'Instância conectada com sucesso'
    });
});

// 📱 Deletar instância WhatsApp
app.delete('/api/whatsapp/instances/:id', (req, res) => {
    console.log(`📱 Deletando instância ${req.params.id}`);
    
    const success = db.deleteWhatsAppInstance(req.params.id);
    
    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    res.json({
        success: true,
        message: 'Instância deletada com sucesso'
    });
});

// 📱 Obter QR Code de uma instância
app.get('/api/whatsapp/instances/:id/qr', (req, res) => {
    console.log(`📱 QR Code da instância ${req.params.id} requisitado`);
    
    const instance = db.getWhatsAppInstances().find(i => i.id === req.params.id);
    
    if (!instance) {
        return res.status(404).json({
            success: false,
            error: 'Instância não encontrada'
        });
    }
    
    if (instance.status === 'connected') {
        return res.status(400).json({
            success: false,
            error: 'Instância já está conectada'
        });
    }
    
    // Gerar novo QR code se necessário
    if (!instance.qr_code) {
        instance.qr_code = db.generateQRCode();
    }
    
    res.json({
        success: true,
        data: {
            qr_code: instance.qr_code,
            status: instance.status,
            expires_in: 45, // segundos
            instructions: [
                'Abra o WhatsApp no seu celular',
                'Vá em Configurações → Aparelhos conectados',
                'Toque em "Conectar um aparelho"',
                'Escaneie este código QR'
            ]
        }
    });
});

// 📱 Estatísticas gerais WhatsApp
app.get('/api/whatsapp/stats', (req, res) => {
    console.log('📱 Estatísticas WhatsApp requisitadas');
    
    const stats = db.getWhatsAppStats();
    
    res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
    });
});

// 📱 Webhook para receber mensagens (simulado)
app.post('/api/whatsapp/webhook/:instanceId', (req, res) => {
    console.log(`📱 Webhook recebido para instância ${req.params.instanceId}`);
    console.log('Dados recebidos:', req.body);
    
    // Aqui seria processado com Claude AI, mas por ora só logamos
    const { message, from, type } = req.body;
    
    // Simular processamento
    setTimeout(() => {
        console.log(`📱 Mensagem processada: ${message}`);
        // Aqui seria enviada resposta automática via Evolution API
    }, 1000);
    
    res.json({
        success: true,
        message: 'Webhook processado com sucesso'
    });
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
    console.log('🏠 ===================================');
    console.log('🚀 SOFIA IA BACKEND v2.1.0 INICIADO!');
    console.log('🏠 ===================================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📈 Dashboard: http://localhost:${PORT}/api/dashboard/overview`);
    console.log(`💬 Conversas: http://localhost:${PORT}/api/conversations/recent`);
    console.log(`👥 Leads: http://localhost:${PORT}/api/leads`);
    console.log(`📱 WhatsApp: http://localhost:${PORT}/api/whatsapp/instances`); // 📱 NOVO!
    console.log('🏠 ===================================');
    console.log('✅ Pronto para conectar com o frontend!');
    console.log(`🔗 Configure o frontend para: http://localhost:${PORT}`);
    console.log('📱 WhatsApp Management: ATIVO');
    console.log('🏠 ===================================');
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
    process.exit(0);
});

// 📝 Log das rotas disponíveis
console.log('\n📋 ROTAS DISPONÍVEIS:');
console.log('GET  /                               - Página inicial da API');
console.log('GET  /health                         - Health check');
console.log('GET  /api/dashboard/overview         - Métricas dashboard');
console.log('GET  /api/conversations/recent       - Conversas recentes');
console.log('GET  /api/leads                      - Lista de leads');
console.log('GET  /api/leads/:id                  - Lead específico');
console.log('GET  /api/analytics/detailed         - Analytics completos');
console.log('GET  /api/analytics/period           - Métricas por período');
console.log('GET  /api/realtime/stats             - Stats em tempo real');
console.log('📱 === WHATSAPP ENDPOINTS (NOVOS!) ===');
console.log('GET  /api/whatsapp/instances         - Listar instâncias WhatsApp');
console.log('POST /api/whatsapp/instances         - Criar nova instância');
console.log('GET  /api/whatsapp/instances/:id     - Instância específica');
console.log('POST /api/whatsapp/instances/:id/disconnect - Desconectar');
console.log('POST /api/whatsapp/instances/:id/connect    - Conectar');
console.log('DELETE /api/whatsapp/instances/:id   - Deletar instância');
console.log('GET  /api/whatsapp/instances/:id/qr  - Obter QR Code');
console.log('GET  /api/whatsapp/stats             - Estatísticas WhatsApp');
console.log('POST /api/whatsapp/webhook/:id       - Webhook mensagens');
console.log('');

// Exportar app para testes
module.exports = app;