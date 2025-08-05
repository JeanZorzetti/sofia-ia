@echo off
echo 🔧 FORÇAR NOVA BUILD VERCEL - Eliminar Cache
echo ============================================

echo.
echo 📊 PROBLEMA: Frontend não conecta API produção
echo 🔍 CAUSA: Possível cache browser/build
echo 💡 SOLUÇÃO: Forçar rebuild completo
echo.

echo 📦 Atualizando timestamp para forçar rebuild...
echo // Build timestamp: %date% %time% > dashboard\src\build-timestamp.ts

echo.
echo 🔧 Adicionando mudança de build...
git add dashboard/src/build-timestamp.ts

echo.
echo 💾 Commit para forçar nova build...
git commit -m "FORCE: Nova build Vercel - Eliminar cache frontend

PROBLEMA:
- QR codes reais funcionando no backend ✅
- Frontend ainda mostra QR simulado ❌
- Ctrl+Shift+R não resolve

CAUSA PROVÁVEL:
- Cache do build Vercel
- Build antiga com API localhost

SOLUÇÃO:
🔧 Forçar rebuild completo Vercel
🔄 Eliminar cache browser
📱 Validar API produção conectada

BUILD: %date% %time%
EXPECT: QR codes REAIS no dashboard web"

echo.
if %errorlevel% == 0 (
    echo ✅ Commit realizado com sucesso!
) else (
    echo ❌ Erro no commit
    pause
    exit /b 1
)

echo.
echo 🔄 Push para trigger rebuild Vercel...
git push origin main

if %errorlevel% == 0 (
    echo ✅ Push realizado com sucesso!
    echo.
    echo 🚀 NOVA BUILD VERCEL INICIADA
    echo 📍 Vercel vai rebuildar automaticamente
    echo 🔗 URL: https://sofia-dash.roilabs.com.br
    echo.
    echo ⏰ AGUARDE 3-5 MINUTOS para build completar
    echo.
    echo 🔄 DEPOIS TESTE COM:
    echo 1. Abrir https://sofia-dash.roilabs.com.br
    echo 2. Ctrl+Shift+R (hard refresh)
    echo 3. F12 → Network → Clear
    echo 4. Testar QR code generation
    echo.
    echo 🎯 RESULTADO ESPERADO:
    echo - QR Code Fonte: evolution_api
    echo - NÃO simulation ou fallback
    echo - Conectável no WhatsApp real
    echo.
) else (
    echo ❌ Erro no push
)

echo 📋 AÇÕES TOMADAS:
echo - ✅ Timestamp build atualizado
echo - ✅ Commit forçado
echo - ✅ Push para trigger Vercel
echo - ⏰ Nova build em andamento
echo.

echo 🎯 PRÓXIMOS PASSOS:
echo 1. Aguardar build Vercel (3-5 min)
echo 2. Hard refresh no browser
echo 3. Testar QR codes no dashboard
echo 4. Validar se fonte é evolution_api
echo.

pause
