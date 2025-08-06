@echo off
echo.
echo ===================================
echo 🚀 SOFIA IA BACKEND v3.0.0 - PORTA 8001
echo ===================================
echo 🔔 COM EVOLUTION API WEBHOOKS REAIS!
echo.

cd /d "%~dp0backend\src"

echo 📍 Diretório: %CD%
echo ⚡ Usando porta alternativa: 8001
echo.

echo 🧪 Testando configuração...
node test-server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erro na configuração! Verifique os arquivos.
    pause
    exit /b 1
)

echo.
echo 🎯 Configuração OK! Iniciando servidor na porta 8001...
echo.
echo 🌐 URLs disponíveis:
echo    📊 Health: http://localhost:8001/health
echo    📱 WhatsApp: http://localhost:8001/api/whatsapp/instances
echo    🔔 Webhook: http://localhost:8001/webhook/evolution
echo.
echo ⚠️  PRESSIONE CTRL+C PARA PARAR O SERVIDOR
echo.

set PORT=8001
set WEBHOOK_URL=http://localhost:8001/webhook/evolution
node app.js