@echo off
echo.
echo ===================================
echo 🌐 TESTE QR CODES PRODUÇÃO SOFIA IA
echo ===================================
echo.
echo 🔍 Testando API em produção...
echo URL: https://sofia-api.roilabs.com.br
echo.

REM Definir variáveis
set API_URL=https://sofia-api.roilabs.com.br
set INSTANCE_NAME=teste-producao-%RANDOM%

echo ============================================
echo 📡 1. VERIFICANDO STATUS DA API...
echo ============================================
curl -s "%API_URL%/health" | jq "."
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao conectar com API de produção!
    pause
    exit /b 1
)

echo.
echo ============================================
echo 📱 2. CRIANDO INSTÂNCIA WHATSAPP...
echo ============================================
curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%INSTANCE_NAME%\",\"settings\":{\"rejectCall\":true,\"groupsIgnore\":true}}" | jq "."

echo.
echo ============================================
echo 📱 3. OBTENDO QR CODE REAL...
echo ============================================
echo ⏳ Aguardando QR code via webhook (pode demorar até 15s)...
timeout /t 5 /nobreak >nul
curl -s "%API_URL%/api/whatsapp/qrcode/%INSTANCE_NAME%" | jq "."

echo.
echo ============================================
echo 📊 4. VERIFICANDO ESTATÍSTICAS...
echo ============================================
curl -s "%API_URL%/api/whatsapp/stats" | jq "."

echo.
echo ============================================
echo 🔍 5. DEBUG QR CODES EM CACHE...
echo ============================================
curl -s "%API_URL%/api/debug/qr-cache" | jq "."

echo.
echo ✅ TESTE CONCLUÍDO COM PRODUÇÃO
echo Instância criada: %INSTANCE_NAME%
echo.
pause