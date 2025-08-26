@echo off
echo.
echo ===================================
echo 🎯 TESTE QR CODE - INSTANCIA EXISTENTE
echo ===================================
echo.
echo 📱 Usando instancia "Sofia IA" que ja esta ATIVA!
echo Status: open (conectada)
echo.

set API_URL=https://sofia-api.roilabs.com.br
set INSTANCE_NAME=Sofia IA
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo ============================================
echo 📱 1. OBTENDO QR CODE DA INSTANCIA ATIVA...
echo ============================================
echo ⚠️ Nota: Instancia ja conectada pode nao precisar de QR
curl -s "%API_URL%/api/whatsapp/qrcode/Sofia%%20IA" | %JQ_PATH% "."

echo.
echo ============================================
echo 📊 2. TESTANDO ENVIO DE MENSAGEM...
echo ============================================
echo 💬 Testando endpoint de mensagens...
curl -s "%API_URL%/api/whatsapp/send" ^
     -X POST ^
     -H "Content-Type: application/json" ^
     -d "{\"instance\":\"Sofia IA\",\"phone\":\"5511999999999\",\"message\":\"Teste Sofia IA\"}" | %JQ_PATH% "."

echo.
echo ============================================
echo 🔍 3. VERIFICANDO WEBHOOKS RECEBIDOS...
echo ============================================
curl -s "%API_URL%/api/debug/qr-cache" | %JQ_PATH% "."

echo.
echo ============================================
echo 📊 4. STATUS DETALHADO DA INSTANCIA...
echo ============================================
curl -s "%API_URL%/api/whatsapp/instances" | %JQ_PATH% ".data[] | select(.name == \"Sofia IA\")"

echo.
echo ============================================
echo 🔧 5. TESTANDO CRIACAO DE NOVA INSTANCIA...
echo ============================================
set NEW_INSTANCE=teste-debug-%RANDOM%
echo 📝 Testando payload correto para: %NEW_INSTANCE%

curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%NEW_INSTANCE%\",\"settings\":{\"rejectCall\":true}}" | %JQ_PATH% "."

echo.
echo ✅ TESTE COMPLETO
echo 💡 Instancia Sofia IA ja esta conectada e funcionando!
echo.
pause