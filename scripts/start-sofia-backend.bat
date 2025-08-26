@echo off
echo.
echo ===================================
echo 🚀 INICIANDO SOFIA IA BACKEND v3.0.0
echo ===================================
echo 🔔 COM EVOLUTION API WEBHOOKS REAIS!
echo.

cd /d "%~dp0backend\src"

echo 📍 Diretório: %CD%
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
echo 🎯 Configuração OK! Iniciando servidor...
echo.
echo ⚠️  PRESSIONE CTRL+C PARA PARAR O SERVIDOR
echo.

node app.js