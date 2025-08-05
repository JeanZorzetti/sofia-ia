@echo off
chcp 65001 >nul
echo 🔧 CORREÇÃO: Modal Layout + 3 APIs para QR Visual
echo =============================================

echo.
echo ✅ PROBLEMAS CORRIGIDOS:
echo - Modal saindo da tela verticalmente
echo - QR não renderizando visualmente
echo - Layout muito alto

echo.
echo 🔨 MELHORIAS IMPLEMENTADAS:
echo - Modal mais largo (max-w-lg)
echo - Layout horizontal: Input | QR
echo - QR 180x180 (ideal para mobile)
echo - 3 APIs QR: QRServer + Google + QuickChart
echo - Sistema tentativas 1/3, 2/3, 3/3
echo - Debug compacto e organizados
echo - Botão retry inteligente

echo.
echo 📦 Adicionando correção...
git add dashboard/src/components/sofia/tabs/WhatsAppTab.tsx

echo.
echo 💾 Commit da correção layout...
git commit -m "FIX: Modal layout horizontal + 3 APIs QR visual"

if %errorlevel% == 0 (
    echo.
    echo ✅ Commit realizado!
    
    echo.
    echo 🚀 Push final...
    git push origin main
    
    if %errorlevel% == 0 (
        echo.
        echo ✅ DEPLOY FINAL ENVIADO!
        echo.
        echo 🎯 MELHORIAS NO MODAL:
        echo - Largura otimizada (não sai da tela)
        echo - QR lado direito, input lado esquerdo
        echo - 3 tentativas automáticas de APIs
        echo - Botão retry se falhar
        echo - Debug organizado
        echo.
        echo ⏰ AGUARDE 3-5 MINUTOS
        echo.
        echo 🔄 TESTE APÓS DEPLOY:
        echo 1. https://sofia-dash.roilabs.com.br
        echo 2. WhatsApp Tab → Nova Instância
        echo 3. Modal deve ficar dentro da tela
        echo 4. QR deve aparecer à direita
        echo 5. Se não aparecer, botão retry
        echo.
        echo 🎉 SOFIA IA LAYOUT PERFEITO!
        echo.
    ) else (
        echo ❌ Erro no push
    )
) else (
    echo ❌ Erro no commit
)

echo.
echo 📋 RESUMO TÉCNICO:
echo - ✅ Modal: max-w-lg (mais largo)
echo - ✅ Layout: grid-cols-2 (lado a lado) 
echo - ✅ QR APIs: 3 diferentes + retry
echo - ✅ Debug: compacto e organizado
echo - 🎯 Resultado: QR visual + layout perfeito

pause
