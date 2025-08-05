@echo off
chcp 65001 >nul
echo 🔥 COMMIT FINAL: Layout Horizontal QR Codes
echo ==========================================

echo.
echo ✅ CORREÇÕES IMPLEMENTADAS:
echo - Modal max-w-2xl (mais largo, não sai da tela)
echo - Layout SEMPRE horizontal (grid-cols-2)
echo - QR 180x180 otimizado
echo - 3 APIs QR: QRServer + Google + QuickChart  
echo - Sistema retry 1/3, 2/3, 3/3
echo - Status compacto e organizado
echo - Debug info só em development

echo.
echo 📦 Commitando correção...
git add .
git commit -m "FIX: Modal QR layout horizontal - max-w-2xl + 3 APIs + retry system"

echo.
echo 🚀 Fazendo push...
git push origin main

echo.
echo ✅ DEPLOY FINAL ENVIADO!
echo.
echo 🎯 MELHORIAS NO MODAL:
echo - Largura: max-w-2xl (nunca sai da tela)
echo - Layout: SEMPRE 2 colunas lado a lado
echo - QR APIs: 3 tentativas automáticas
echo - Botão retry se falhar todas
echo - Status organizado e compacto
echo.
echo ⏰ AGUARDE 3-5 MINUTOS PARA DEPLOY
echo.
echo 🔄 TESTE APÓS DEPLOY:
echo 1. https://sofia-dash.roilabs.com.br
echo 2. WhatsApp Tab → Nova Instância
echo 3. Modal deve ficar dentro da tela
echo 4. QR deve aparecer à direita do input
echo 5. Se não aparecer, botão retry disponível
echo.
echo 🎉 SOFIA IA - QR LAYOUT PERFEITO!

pause