// 🔧 CORREÇÃO: Forçar API fallback para QRs grandes
// Adicionar no WhatsAppTab.tsx após linha ~95

// 🚨 DETECTAR QR STRING MUITO LONGA + FALLBACK
const generateQRWithFallback = (qrText: string) => {
  console.log('🔥 GERANDO QR:', {
    length: qrText.length,
    firstChars: qrText.substring(0, 50),
    attempt: generationAttempt + 1
  });

  // 🚨 NOVO: Se string > 5000 chars, forçar API fallback
  if (qrText.length > 5000) {
    console.log('⚠️ QR MUITO GRANDE, forçando API fallback');
    setUseImageFallback(true);
    
    // API externa para QRs grandes
    const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;
    
    const img = document.createElement('img');
    img.src = fallbackUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    img.onload = () => {
      console.log('✅ QR API Fallback carregado');
      setQrCodeReady(true);
      setQrGenerationError(null);
    };
    
    img.onerror = () => {
      console.error('❌ API Fallback falhou');
      setQrGenerationError('API Fallback falhou');
    };
    
    if (qrContainerRef.current) {
      qrContainerRef.current.innerHTML = '';
      qrContainerRef.current.appendChild(img);
    }
    
    return;
  }

  // Resto do código continua igual...
};

console.log('🔧 CORREÇÃO RECOMENDADA:');
console.log('1. Editar WhatsAppTab.tsx');
console.log('2. Modificar generateQRWithFallback()');
console.log('3. Aumentar limite para 5000 chars');
console.log('4. Forçar API fallback para QRs grandes');
