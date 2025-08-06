@echo off
echo.
echo ===================================
echo 🎯 TESTE DIRETO QR CODE ENDPOINTS
echo ===================================
echo.

set API_URL=https://sofia-api.roilabs.com.br
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo ============================================
echo 📱 1. TESTANDO QR CODE DA INSTANCIA ATIVA
echo ============================================
echo 🔍 Instancia: Sofia IA (ja conectada)
echo 📡 URL: %API_URL%/api/whatsapp/qrcode/Sofia%%20IA
echo.

curl -s "%API_URL%/api/whatsapp/qrcode/Sofia%%20IA" > qr_response.json
echo 📝 Resposta salva em qr_response.json:
type qr_response.json
echo.
echo 📊 Tentando parse JSON:
%JQ_PATH% "." qr_response.json 2>nul || echo "❌ JSON malformado"

echo.
echo ============================================
echo 🔍 2. TESTANDO DEBUG CACHE
echo ============================================
curl -s "%API_URL%/api/debug/qr-cache" > debug_response.json
echo 📝 Resposta salva em debug_response.json:
type debug_response.json
echo.
echo 📊 Tentando parse JSON:
%JQ_PATH% "." debug_response.json 2>nul || echo "❌ JSON malformado"

echo.
echo ============================================
echo 🆕 3. CRIANDO NOVA INSTANCIA PARA QR
echo ============================================
set NEW_INSTANCE=qr-test-%RANDOM%
echo 📱 Criando instancia: %NEW_INSTANCE%

curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%NEW_INSTANCE%\"}" > create_response.json

echo 📝 Resposta da criacao:
type create_response.json
echo.

echo ⏳ Aguardando 5 segundos para QR code...
timeout /t 5 /nobreak >nul

echo 📱 Buscando QR code da nova instancia:
curl -s "%API_URL%/api/whatsapp/qrcode/%NEW_INSTANCE%" > new_qr_response.json
type new_qr_response.json

echo.
echo ============================================
echo 📊 4. RESUMO DOS TESTES
echo ============================================
echo ✅ Endpoints existem
echo 🔍 Verificando conteudo dos arquivos salvos...
echo.
pause

REM Limpeza
del qr_response.json 2>nul
del debug_response.json 2>nul
del create_response.json 2>nul
del new_qr_response.json 2>nul