/**
 * 🔔 WEBHOOK ROUTES - RECEBER EVENTOS DA EVOLUTION API
 * 
 * Endpoints para receber webhooks da Evolution API:
 * - POST /webhook/evolution - Recebe todos os eventos
 * - GET /webhook/evolution - Health check do webhook
 * 
 * ✅ ATUALIZADO PARA USAR EVOLUTION SERVICE UNIFICADO
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
        
        // Obter instância do serviço UNIFICADO
        const evolutionService = req.app.get('evolutionService');
        
        if (!evolutionService) {
            console.error('❌ EvolutionService UNIFICADO não encontrado no app');
            return res.status(500).json({
                success: false,
                error: 'Serviço Evolution API não configurado'
            });
        }
        
        // Processar webhook usando serviço unificado
        const result = await evolutionService.processWebhook(webhookData);
        
        if (result.success) {
            console.log(`✅ Webhook processado: ${result.event} para ${result.instance}`);
            
            // Resposta de sucesso para Evolution API
            res.status(200).json({
                success: true,
                message: 'Webhook processado com sucesso',
                processed: result.processed,
                event: result.event,
                instance: result.instance,
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
router.get('/evolution', async (req, res) => {
    console.log('✅ Health check do webhook Evolution');
    
    const evolutionService = req.app.get('evolutionService');
    const serviceStats = evolutionService ? evolutionService.getServiceStats() : null;
    const healthCheck = evolutionService ? await evolutionService.healthCheck() : null;
    
    res.json({
        status: 'webhook_active',
        service: 'Evolution API Webhook UNIFICADO',
        timestamp: new Date().toISOString(),
        webhook_url: evolutionService?.webhookUrl || process.env.WEBHOOK_URL || 'http://localhost:8000/webhook/evolution',
        service_stats: serviceStats,
        health_check: healthCheck,
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
        const evolutionService = req.app.get('evolutionService');
        
        if (!evolutionService) {
            return res.status(404).json({
                success: false,
                error: 'Serviço Evolution API não encontrado'
            });
        }
        
        const stats = evolutionService.getServiceStats();
        
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
        const evolutionService = req.app.get('evolutionService');
        
        if (!evolutionService) {
            return res.status(404).json({
                success: false,
                error: 'Serviço Evolution API não encontrado'
            });
        }
        
        // Implementar limpeza no service unificado
        let cleaned = 0;
        const now = Date.now();
        
        // Limpar QR codes expirados
        for (const [instance, qrData] of evolutionService.qrCodeCache.entries()) {
            if (now - qrData.timestamp > 300000) { // 5 minutos
                evolutionService.qrCodeCache.delete(instance);
                cleaned++;
            }
        }
        
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
        const evolutionService = req.app.get('evolutionService');
        
        if (!evolutionService) {
            return res.status(404).json({
                success: false,
                error: 'Serviço Evolution API não encontrado'
            });
        }
        
        // Acessar cache interno para debug
        const qrCodes = Array.from(evolutionService.qrCodeCache.entries()).map(([instance, data]) => ({
            instance: instance,
            has_qrcode: !!data.qrcode,
            timestamp: new Date(data.timestamp).toISOString(),
            status: data.status,
            time_remaining: Math.max(0, 300000 - (Date.now() - data.timestamp)),
            expired: (Date.now() - data.timestamp) > 300000
        }));
        
        const instanceStatus = Array.from(evolutionService.instanceStatus.entries()).map(([instance, status]) => ({
            instance: instance,
            status: status.status,
            connected: status.connected,
            instanceId: status.instanceId,
            lastSeen: status.lastSeen ? new Date(status.lastSeen).toISOString() : null
        }));
        
        res.json({
            success: true,
            data: {
                qr_codes: qrCodes,
                instances: instanceStatus,
                service_stats: evolutionService.getServiceStats()
            },
            totals: {
                qr_codes: qrCodes.length,
                active_qr: qrCodes.filter(qr => !qr.expired).length,
                expired_qr: qrCodes.filter(qr => qr.expired).length,
                instances: instanceStatus.length,
                connected_instances: instanceStatus.filter(inst => inst.connected).length
            },
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

/**
 * 🔧 TESTE WEBHOOK (POST de teste)
 */
router.post('/evolution/test', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            error: 'Teste não disponível em produção'
        });
    }
    
    console.log('🔧 Teste webhook solicitado');
    
    // Simular webhook de QR code
    const testWebhook = {
        event: 'QRCODE_UPDATED',
        instance: 'teste-webhook',
        data: {
            qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hTBrKgAAAABJRU5ErkJggg=='
        }
    };
    
    // Processar como se fosse um webhook real
    req.body = testWebhook;
    
    // Redirecionar para o endpoint principal
    router.handle({ ...req, method: 'POST', url: '/evolution' }, res);
});

module.exports = router;