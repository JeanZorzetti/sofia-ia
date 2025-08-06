/**
 * 🔔 WEBHOOK ROUTES - RECEBER EVENTOS DA EVOLUTION API
 * 
 * Endpoints para receber webhooks da Evolution API:
 * - POST /webhook/evolution - Recebe todos os eventos
 * - GET /webhook/evolution - Health check do webhook
 */

const express = require('express');
const router = express.Router();

/**
 * 🔔 ENDPOINT PRINCIPAL DO WEBHOOK
 * A Evolution API enviará eventos para este endpoint
 */
router.post('/evolution', async (req, res) => {
    try {
        const webhookData = req.body;
        
        // Log detalhado para debug
        console.log('🔔 =================================');
        console.log('📥 WEBHOOK EVOLUTION API RECEBIDO');
        console.log('🔔 =================================');
        console.log('📅 Timestamp:', new Date().toISOString());
        console.log('🎯 Evento:', webhookData.event);
        console.log('📱 Instância:', webhookData.instance);
        
        // Log completo do body apenas em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log('📋 Body completo:', JSON.stringify(webhookData, null, 2));
        }
        
        // Obter instância do serviço webhook da Evolution
        const evolutionWebhookService = req.app.get('evolutionWebhookService');
        
        if (!evolutionWebhookService) {
            console.error('❌ EvolutionWebhookService não encontrado no app');
            return res.status(500).json({
                success: false,
                error: 'Serviço webhook não configurado'
            });
        }
        
        // Processar webhook
        const result = await evolutionWebhookService.processWebhook(webhookData);
        
        if (result.success) {
            console.log(`✅ Webhook processado: ${result.action || 'unknown'}`);
            
            // Resposta de sucesso para Evolution API
            res.status(200).json({
                success: true,
                message: 'Webhook processado com sucesso',
                processed: true,
                event: webhookData.event,
                instance: webhookData.instance,
                action: result.action,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error(`❌ Erro no processamento webhook: ${result.error}`);
            
            // Resposta de erro mas HTTP 200 para não reenvio
            res.status(200).json({
                success: false,
                message: 'Erro no processamento mas webhook recebido',
                error: result.error,
                event: webhookData.event,
                instance: webhookData.instance,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Erro crítico no webhook:', error.message);
        console.error('🔍 Stack:', error.stack);
        
        // Sempre responder 200 para não reenvio
        res.status(200).json({
            success: false,
            error: 'Erro interno do webhook',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * ✅ HEALTH CHECK DO WEBHOOK
 * Para verificar se o webhook está funcionando
 */
router.get('/evolution', (req, res) => {
    console.log('✅ Health check do webhook Evolution');
    
    const evolutionWebhookService = req.app.get('evolutionWebhookService');
    const cacheStats = evolutionWebhookService ? evolutionWebhookService.getCacheStats() : null;
    
    res.json({
        status: 'webhook_active',
        service: 'Evolution API Webhook',
        timestamp: new Date().toISOString(),
        webhook_url: process.env.WEBHOOK_URL || 'http://localhost:8000/webhook/evolution',
        cache_stats: cacheStats,
        message: 'Webhook pronto para receber eventos da Evolution API',
        supported_events: [
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE', 
            'MESSAGES_UPSERT',
            'MESSAGE_STATUS_UPDATE',
            'PRESENCE_UPDATE',
            'CHATS_UPSERT',
            'CONTACTS_UPSERT',
            'GROUPS_UPSERT'
        ]
    });
});

/**
 * 📊 ESTATÍSTICAS DO WEBHOOK
 */
router.get('/evolution/stats', (req, res) => {
    console.log('📊 Estatísticas do webhook requisitadas');
    
    try {
        const evolutionWebhookService = req.app.get('evolutionWebhookService');
        
        if (!evolutionWebhookService) {
            return res.status(404).json({
                success: false,
                error: 'Serviço webhook não encontrado'
            });
        }
        
        const stats = evolutionWebhookService.getCacheStats();
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas webhook:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 🧹 LIMPAR CACHE EXPIRADO
 */
router.post('/evolution/cleanup', (req, res) => {
    console.log('🧹 Limpeza de cache solicitada');
    
    try {
        const evolutionWebhookService = req.app.get('evolutionWebhookService');
        
        if (!evolutionWebhookService) {
            return res.status(404).json({
                success: false,
                error: 'Serviço webhook não encontrado'
            });
        }
        
        const cleaned = evolutionWebhookService.cleanExpiredCache();
        
        res.json({
            success: true,
            message: 'Limpeza concluída',
            cleaned_items: cleaned,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro na limpeza de cache:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 🔍 DEBUG - LISTAR QR CODES EM CACHE
 */
router.get('/evolution/debug/qrcodes', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            error: 'Debug não disponível em produção'
        });
    }
    
    console.log('🔍 Debug QR codes solicitado');
    
    try {
        const evolutionWebhookService = req.app.get('evolutionWebhookService');
        
        if (!evolutionWebhookService) {
            return res.status(404).json({
                success: false,
                error: 'Serviço webhook não encontrado'
            });
        }
        
        // Acessar cache interno para debug
        const qrCodes = Array.from(evolutionWebhookService.qrCodeCache.entries()).map(([instance, data]) => ({
            instance: instance,
            has_qrcode: !!data.qrcode,
            timestamp: new Date(data.timestamp).toISOString(),
            expires_at: new Date(data.expires_at).toISOString(),
            status: data.status,
            source: data.source,
            time_remaining: Math.max(0, data.expires_at - Date.now()),
            expired: Date.now() > data.expires_at
        }));
        
        res.json({
            success: true,
            data: qrCodes,
            total: qrCodes.length,
            active: qrCodes.filter(qr => !qr.expired).length,
            expired: qrCodes.filter(qr => qr.expired).length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro no debug QR codes:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;