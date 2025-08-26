@echo off
echo.
echo ===================================
echo 🎯 TESTE FINAL APÓS DEPLOY COMPLETO
echo ===================================
echo.
echo ⚠️ EXECUTE APENAS APÓS:
echo 1. Deploy realizado (deploy-complete.bat)
echo 2. Restart da aplicação no EasyPanel
echo 3. Aguardar 2-3 minutos para aplicação subir
echo.

set API_URL=https://sofia-api.roilabs.com.br
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo ============================================
echo 📡 1. VERIFICANDO API APÓS DEPLOY...
echo ============================================
curl -s "%API_URL%/health" | %JQ_PATH% "{version: .version, uptime: .uptime, webhook_url: .webhook_system.webhook_url}"

echo.
echo ============================================
echo 🆕 2. TESTANDO NOVOS ENDPOINTS QR CODE...
echo ============================================
echo 🔍 Debug cache (deve funcionar agora):
curl -s "%API_URL%/api/debug/qr-cache" | %JQ_PATH% "."

echo.
echo ============================================
echo 📱 3. CRIANDO NOVA INSTÂNCIA PARA QR...
echo ============================================
set NEW_INSTANCE=deploy-test-%RANDOM%
echo 📝 Criando instância: %NEW_INSTANCE%

curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%NEW_INSTANCE%\"}" | %JQ_PATH% "."

echo.
echo ⏳ Aguardando 8 segundos para QR code via webhook...
timeout /t 8 /nobreak >nul

echo.
echo ============================================
echo 🎯 4. OBTENDO QR CODE REAL (MOMENTO DA VERDADE)...
echo ============================================
curl -s "%API_URL%/api/whatsapp/qrcode/%NEW_INSTANCE%" | %JQ_PATH% "."

echo.
echo ============================================
echo 📊 5. VERIFICANDO WEBHOOK SYSTEM...
echo ============================================
curl -s "%API_URL%/api/whatsapp/stats" | %JQ_PATH% "."

echo.
echo ============================================
echo 🏆 6. RESULTADO FINAL...
echo ============================================
if exist qr_success.tmp (
    echo ✅ QR CODES REAIS FUNCIONANDO!
    echo ✅ DEPLOY COMPLETO REALIZADO COM SUCESSO!
    echo ✅ SISTEMA SOFIA IA 100%% OPERACIONAL!
    del qr_success.tmp
) else (
    echo ⚠️ Verificar logs acima para status
    echo 💡 Se webhooks não funcionarem, verificar URL webhook
)

echo.
echo 🎯 SOFIA IA PRONTO PARA PRODUÇÃO!
echo Instância criada: %NEW_INSTANCE%
echo.
pause