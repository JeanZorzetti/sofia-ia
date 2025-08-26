@echo off
echo.
echo ===================================
echo 🎯 TESTE APÓS CORREÇÃO WEBHOOK URL
echo ===================================
echo.
echo ⚠️ EXECUTE APENAS APÓS:
echo 1. Alterar WEBHOOK_URL no EasyPanel
echo 2. Restart da aplicação
echo 3. Aguardar 2-3 minutos
echo.

set API_URL=https://sofia-api.roilabs.com.br
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo ============================================
echo 🔍 1. VERIFICANDO WEBHOOK URL CORRIGIDA...
echo ============================================
curl -s "%API_URL%/health" | %JQ_PATH% ".webhook_system.webhook_url"

echo.
echo 💡 Deve mostrar: https://sofia-api.roilabs.com.br/webhook/evolution
echo ❌ Se ainda mostrar localhost, repetir correção no EasyPanel
echo.

echo ============================================
echo 📱 2. CRIANDO INSTÂNCIA COM WEBHOOK CORRETO...
echo ============================================
set TEST_INSTANCE=webhook-test-%RANDOM%
echo 🆕 Criando instância: %TEST_INSTANCE%

curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%TEST_INSTANCE%\"}" | %JQ_PATH% ".data.instanceName, .data.status"

echo.
echo ⏳ Aguardando 10 segundos para webhook chegar...
timeout /t 10 /nobreak >nul

echo.
echo ============================================
echo 🎯 3. MOMENTO DA VERDADE - QR CODE REAL...
echo ============================================
curl -s "%API_URL%/api/whatsapp/qrcode/%TEST_INSTANCE%" > final_qr_test.json
echo 📝 Resposta completa:
type final_qr_test.json
echo.
echo 📊 Analisando source:
%JQ_PATH% ".data.source" final_qr_test.json 2>nul

echo.
echo ============================================
echo 📊 4. VERIFICANDO CACHE DE WEBHOOKS...
echo ============================================
curl -s "%API_URL%/api/debug/qr-cache" | %JQ_PATH% ".total, .active"

echo.
echo ============================================
echo 🏆 5. RESULTADO FINAL...
echo ============================================
set /p source=<%JQ_PATH% -r ".data.source" final_qr_test.json 2>nul
if "%source%"=="webhook" (
    echo 🎉 SUCESSO TOTAL!
    echo ✅ QR code recebido via WEBHOOK REAL!
    echo ✅ Evolution API → Sofia IA funcionando!
    echo ✅ Sistema 100%% operacional!
) else (
    echo ⚠️ Ainda usando fallback
    echo 💡 Verificar se webhook URL foi alterado corretamente
    echo 🔧 Pode precisar reiniciar aplicação novamente
)

echo.
echo 🎯 Instância de teste: %TEST_INSTANCE%
echo 📁 Resposta salva em: final_qr_test.json
echo.
pause

del final_qr_test.json 2>nul