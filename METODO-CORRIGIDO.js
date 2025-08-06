    /**
     * 🎨 Gerar QR Code simulado realístico (CORRIGIDO)
     */
    generateRealisticQRCode(instanceName) {
        // Gerar texto QR válido (formato WhatsApp-like)
        const timestamp = Date.now();
        const randomData = Math.random().toString(36).substring(2, 15);
        const deviceId = Math.random().toString(36).substring(2, 10);
        
        // ✅ QR text válido para WhatsApp (formato simulado)
        const qrText = `2@${randomData}:${deviceId},${instanceName.replace(/[^a-zA-Z0-9]/g, '')},${timestamp}@abcd1234`;
        
        console.log('🔧 QR Text válido gerado:', qrText.substring(0, 50) + '...');
        
        // ✅ CORRIGIDO: Retornar QR text válido em vez de JSON de matriz
        return {
            raw: qrText,
            base64: qrText, // Frontend vai processar como texto QR
            dataUrl: null   // Frontend vai gerar imagem com QRCode.js
        };
    }