// 🔄 Refresh forçado de QR Code - ENDPOINT CORRIGIDO
app.post('/api/whatsapp/instances/:instanceId/qr/refresh', async (req, res) => {
    console.log(`🔄 Refresh forçado de QR Code para ${req.params.instanceId}`);
    
    const { instanceId } = req.params;
    
    try {
        const qrResult = await qrCodeProductionService.forceRefreshQRCode(instanceId);
        
        if (qrResult && qrResult.success) {
            res.json({
                success: true,
                data: {
                    instance_id: instanceId,
                    qr_code: qrResult.data.qr_base64 || qrResult.data.qrcode,
                    qr_data_url: qrResult.data.qr_data_url,
                    expires_in: Math.floor(qrResult.data.time_remaining / 1000),
                    expires_at: qrResult.data.expires_at,
                    generated_at: qrResult.data.generated_at,
                    source: qrResult.source,
                    cache_hit: false // Sempre false para refresh forçado
                },
                performance: qrResult.performance,
                message: 'QR Code atualizado com sucesso'
            });
        } else {
            throw new Error(qrResult?.error || 'Falha no refresh do QR Code');
        }
        
    } catch (error) {
        console.error(`❌ Erro no refresh do QR Code para ${instanceId}:`, error.message);
        
        // 🔄 Fallback: tentar gerar novo QR code
        try {
            console.log(`🔄 Fallback: gerando novo QR Code para ${instanceId}`);
            const fallbackResult = await qrCodeProductionService.generateProductionQRCode(instanceId, true);
            
            if (fallbackResult && fallbackResult.success) {
                res.json({
                    success: true,
                    data: {
                        instance_id: instanceId,
                        qr_code: fallbackResult.data.qr_base64 || fallbackResult.data.qrcode,
                        qr_data_url: fallbackResult.data.qr_data_url,
                        expires_in: Math.floor(fallbackResult.data.time_remaining / 1000),
                        expires_at: fallbackResult.data.expires_at,
                        generated_at: fallbackResult.data.generated_at,
                        source: fallbackResult.source + '_fallback',
                        cache_hit: false
                    },
                    performance: fallbackResult.performance,
                    message: 'QR Code gerado via fallback',
                    warning: 'Refresh direto falhou, QR Code gerado novamente'
                });
            } else {
                throw new Error('Fallback também falhou');
            }
            
        } catch (fallbackError) {
            console.error(`❌ Fallback também falhou:`, fallbackError.message);
            res.status(500).json({
                success: false,
                error: 'Erro ao fazer refresh do QR Code',
                details: error.message,
                fallback_error: fallbackError.message
            });
        }
    }
});