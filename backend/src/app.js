/**
 * 🏠 SOFIA IA - Backend com Métricas Reais + QR Codes
 * Servidor Express com endpoints para dashboard real e QR codes
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
}

// Instância global do banco de dados simulado
const db = new MetricsDatabase();

// 🚀 ENDPOINTS DA API

// Health check
app.get('/health', (req, res) => {
    console.log('📊 Health check requisitado');
    
    const qrCodeStats = qrCodeService.getQRCodeStats();
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Sofia IA Backend',
        version: '2.1.0',
        uptime: process.uptime(),
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

// 🔗 ========== QR CODES ENDPOINTS BÁSICOS ==========

// 📊 Estatísticas QR Codes
app.get('/api/whatsapp/qrcode-stats', (req, res) => {
    console.log('📊 Estatísticas QR Codes requisitadas');
    
    try {
        const stats = qrCodeService.getQRCodeStats();
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas QR Code:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter estatísticas QR Code',
            details: error.message
        });
    }
});

// 📱 Simular instâncias WhatsApp (para testes sem Evolution API)
app.get('/api/whatsapp/instances', (req, res) => {
    console.log('📱 Instâncias WhatsApp simuladas requisitadas');
    
    const simulatedInstances = [
        {
            id: 'sofia-principal',
            name: 'sofia-principal',
            status: 'close',
            phone: null,
            profileName: null,
            messagesCount: 0,
            contactsCount: 0,
            chatsCount: 0
        },
        {
            id: 'sofia-backup',
            name: 'sofia-backup',
            status: 'close',
            phone: null,
            profileName: null,
            messagesCount: 0,
            contactsCount: 0,
            chatsCount: 0
        }
    ];
    
    res.json({
        success: true,
        data: simulatedInstances,
        total: simulatedInstances.length,
        timestamp: new Date().toISOString(),
        source: 'simulated_for_testing'
    });
});

// 🔗 Gerar QR Code simulado (para testes)
app.post('/api/whatsapp/instances/:instanceName/qrcode', async (req, res) => {
    console.log(`🔗 Gerando QR Code simulado para ${req.params.instanceName}`);
    
    try {
        // Simular QR Code base64
        const simulatedQRCode = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const result = {
            success: true,
            data: {
                instanceName: req.params.instanceName,
                qrcode: simulatedQRCode,
                status: 'generated',
                generated_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minuto
                cache_hit: false,
                simulated: true
            }
        };
        
        res.json({
            success: result.success,
            data: result.data,
            timestamp: new Date().toISOString(),
            source: 'simulated_qrcode'
        });
        
    } catch (error) {
        console.error('❌ Erro ao gerar QR Code simulado:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar QR Code simulado',
            details: error.message
        });
    }
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
    console.log('🏠 ===================================');
    console.log('🚀 SOFIA IA BACKEND INICIADO!');
    console.log('🔗 COM QR CODES HABILITADOS!');
    console.log('🏠 ===================================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📈 Dashboard: http://localhost:${PORT}/api/dashboard/overview`);
    console.log(`💬 Conversas: http://localhost:${PORT}/api/conversations/recent`);
    console.log(`👥 Leads: http://localhost:${PORT}/api/leads`);
    console.log('🏠 ===================================');
    console.log('🔗 === QR CODES ENDPOINTS ===');
    console.log(`📊 QR Stats: http://localhost:${PORT}/api/whatsapp/qrcode-stats`);
    console.log(`📱 Instâncias: http://localhost:${PORT}/api/whatsapp/instances`);
    console.log(`🔗 QR Code: POST http://localhost:${PORT}/api/whatsapp/instances/:name/qrcode`);
    console.log('🏠 ===================================');
    console.log('✅ Pronto para conectar com o frontend!');
    console.log('🔗 Configure o frontend para: http://localhost:8000');
    console.log('🔗 QR Code System: ATIVO (Mode: Simulado)');
    console.log('🏠 ===================================');
    
    // Inicializar limpeza de cache a cada 30 segundos
    setInterval(() => {
        qrCodeService.cleanExpiredQRCodes();
    }, 30000);
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

// 📝 Log das rotas disponíveis
console.log('\n📋 ROTAS DISPONÍVEIS:');
console.log('GET  /health                        - Health check');
console.log('GET  /api/dashboard/overview        - Métricas dashboard');
console.log('GET  /api/conversations/recent      - Conversas recentes');
console.log('GET  /api/leads                     - Lista de leads');
console.log('GET  /api/leads/:id                 - Lead específico');
console.log('GET  /api/analytics/detailed        - Analytics completos');
console.log('GET  /api/analytics/period          - Métricas por período');
console.log('GET  /api/realtime/stats            - Stats em tempo real');
console.log('GET  /api/whatsapp/qrcode-stats     - Estatísticas QR Codes');
console.log('GET  /api/whatsapp/instances        - Lista instâncias');
console.log('POST /api/whatsapp/instances/:name/qrcode - Gerar QR Code');
console.log('');
