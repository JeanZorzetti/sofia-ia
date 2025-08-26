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
curl -s "%API_URL%/health"
echo.
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao conectar com API de produção!
    pause
    exit /b 1
)
echo ✅ API respondeu com sucesso!

echo.
echo ============================================
echo 📱 2. CRIANDO INSTÂNCIA WHATSAPP...
echo ============================================
echo Criando instância: %INSTANCE_NAME%
curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%INSTANCE_NAME%\",\"settings\":{\"rejectCall\":true,\"groupsIgnore\":true}}"
echo.

echo.
echo ============================================
echo 📱 3. OBTENDO QR CODE REAL...
echo ============================================
echo ⏳ Aguardando QR code via webhook (pode demorar até 15s)...
timeout /t 8 /nobreak >nul
echo.
curl -s "%API_URL%/api/whatsapp/qrcode/%INSTANCE_NAME%"
echo.

echo.
echo ============================================
echo 📊 4. VERIFICANDO ESTATÍSTICAS...
echo ============================================
curl -s "%API_URL%/api/whatsapp/stats"
echo.

echo.
echo ============================================
echo 🔍 5. DEBUG QR CODES EM CACHE...
echo ============================================
curl -s "%API_URL%/api/debug/qr-cache"
echo.

echo.
echo ✅ TESTE CONCLUÍDO COM PRODUÇÃO
echo Instância criada: %INSTANCE_NAME%
echo.
echo 💡 Dica: Para formatar JSON bonito instale jq:
echo    choco install jq
echo    ou baixe em: https://jqlang.github.io/jq/download/
echo.
pause