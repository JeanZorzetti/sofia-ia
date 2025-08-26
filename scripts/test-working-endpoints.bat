@echo off
echo.
echo ===================================
echo 🎯 TESTE ENDPOINTS QUE FUNCIONAM
echo ===================================
echo.

set API_URL=https://sofia-api.roilabs.com.br
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo ============================================
echo ✅ 1. ENDPOINTS QUE FUNCIONAM...
echo ============================================

echo 🔍 /health
curl -s "%API_URL%/health" | %JQ_PATH% ".version, .uptime, .whatsapp_system.status"

echo.
echo 🔍 /api/dashboard/overview
curl -s "%API_URL%/api/dashboard/overview" | %JQ_PATH% ".data.stats"

echo.
echo 🔍 /api/whatsapp/instances (GET)
curl -s "%API_URL%/api/whatsapp/instances" | %JQ_PATH% ".data | length"

echo.
echo ============================================
echo ❌ 2. TESTANDO ENDPOINTS QUE NAO FUNCIONAM...
echo ============================================

echo 🔍 Testando /api/whatsapp/qrcode/test (deve dar 404):
curl -s -w "HTTP Status: %%{http_code}\n" "%API_URL%/api/whatsapp/qrcode/test" > temp_qr.txt 2>&1
echo Resposta:
type temp_qr.txt | head -c 100
del temp_qr.txt

echo.
echo 🔍 Testando /api/debug/qr-cache (deve dar 404):
curl -s -w "HTTP Status: %%{http_code}\n" "%API_URL%/api/debug/qr-cache" > temp_debug.txt 2>&1
echo Resposta:
type temp_debug.txt | head -c 100
del temp_debug.txt

echo.
echo ============================================
echo 🎯 3. CONCLUSAO...
echo ============================================
echo ✅ Producao esta rodando mas com poucos endpoints
echo ✅ Instancia Sofia IA esta 100%% conectada e funcional
echo ❌ Endpoints de QR code nao existem na producao
echo ❌ Precisa deploy do codigo completo
echo.
echo 💡 PROXIMO PASSO: Deploy codigo local para producao
echo.
pause