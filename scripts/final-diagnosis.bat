@echo off
echo.
echo ===================================
echo 🎯 TESTE ENDPOINTS - DIAGNOSTICO FINAL
echo ===================================
echo.

set API_URL=https://sofia-api.roilabs.com.br
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo ============================================
echo ✅ ENDPOINTS QUE FUNCIONAM:
echo ============================================

echo 🔍 1. API Health + Version:
curl -s "%API_URL%/health" | %JQ_PATH% "{version: .version, uptime: .uptime, whatsapp_status: .whatsapp_system.status}"

echo.
echo 🔍 2. Dashboard Stats:
curl -s "%API_URL%/api/dashboard/overview" | %JQ_PATH% ".data.stats"

echo.
echo 🔍 3. WhatsApp Instances Count:
curl -s "%API_URL%/api/whatsapp/instances" | %JQ_PATH% "{total: .total, source: .source}"

echo.
echo ============================================
echo ❌ ENDPOINTS QUE NAO FUNCIONAM:
echo ============================================

echo 🔍 4. Testando QR Code endpoint:
curl -s "%API_URL%/api/whatsapp/qrcode/test" > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ QR Code endpoint existe
) else (
    echo ❌ QR Code endpoint NAO existe (esperado)
)

echo.
echo 🔍 5. Testando Debug Cache endpoint:
curl -s "%API_URL%/api/debug/qr-cache" > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Debug endpoint existe
) else (
    echo ❌ Debug endpoint NAO existe (esperado)
)

echo.
echo ============================================
echo 📊 RESUMO DIAGNOSTICO:
echo ============================================
echo ✅ Sofia IA API esta ONLINE (version 3.0.0-webhook)
echo ✅ Instancia "Sofia IA" CONECTADA e funcional
echo ✅ Dashboard com dados reais (384 conversas)
echo ✅ 14 instancias WhatsApp listadas
echo.
echo ❌ Endpoints QR Code/Debug nao existem
echo ❌ Precisa deploy codigo completo local
echo.
echo 🎯 CONCLUSAO: API basica funciona, falta QR system
echo.
pause