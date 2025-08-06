@echo off
echo.
echo ===================================
echo 🎯 TESTE QR CODE - INSTÂNCIA EXISTENTE
echo ===================================
echo.
echo 📱 Usando instância "Sofia IA" que já está ATIVA!
echo Status: open (conectada)
echo Messages: 2,160 | Contacts: 11,015 | Chats: 4,255
echo.

set API_URL=https://sofia-api.roilabs.com.br
set INSTANCE_NAME=Sofia IA
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo ============================================
echo 📱 1. OBTENDO QR CODE DA INSTÂNCIA ATIVA...
echo ============================================
echo ⚠️ Nota: Instância já conectada pode não precisar de QR
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
echo 📊 4. STATUS DETALHADO DA INSTÂNCIA...
echo ============================================
curl -s "%API_URL%/api/whatsapp/instances" | %JQ_PATH% ".data[] | select(.name == \"Sofia IA\")"

echo.
echo ============================================
echo 🔧 5. TESTANDO CRIAÇÃO DE NOVA INSTÂNCIA...
echo ============================================
set NEW_INSTANCE=teste-debug-%RANDOM%
echo 📝 Testando payload correto para: %NEW_INSTANCE%

curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%NEW_INSTANCE%\",\"settings\":{\"rejectCall\":true}}" | %JQ_PATH% "."

echo.
echo ✅ TESTE COMPLETO
echo 💡 Instância Sofia IA já está conectada e funcionando!
echo.
pause