@echo off
setlocal enabledelayedexpansion

echo.
echo ===================================
echo 🧪 TESTE COMPLETO SOFIA IA QR CODES
echo ===================================
echo.

:: Verificar qual porta o servidor está usando
echo 🔍 Verificando servidor Sofia IA...
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set SOFIA_PORT=8000
    echo ✅ Servidor encontrado na porta 8000
) else (
    curl -s http://localhost:8001/health >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set SOFIA_PORT=8001
        echo ✅ Servidor encontrado na porta 8001
    ) else (
        echo ❌ Nenhum servidor Sofia IA encontrado!
        echo    Execute: .\start-sofia-backend.bat ou .\start-sofia-port-8001.bat
        pause
        exit /b 1
    )
)

echo.
echo 🚀 Testando com servidor na porta !SOFIA_PORT!
echo.

echo ============================================
echo 📱 1. CRIANDO INSTÂNCIA WHATSAPP...
echo ============================================
curl -X POST http://localhost:!SOFIA_PORT!/api/whatsapp/instances ^
     -H "Content-Type: application/json" ^
     -d "{\"name\": \"teste-qr-real\"}"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao criar instância
    goto :powershell_fallback
)

echo.
echo ============================================
echo 📱 2. OBTENDO QR CODE REAL...
echo ============================================
echo ⏳ Aguardando QR code via webhook (pode demorar até 15s)...
curl -X GET http://localhost:!SOFIA_PORT!/api/whatsapp/instances/teste-qr-real/qr

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao obter QR code
    goto :powershell_fallback
)

echo.
echo ============================================
echo 📊 3. VERIFICANDO ESTATÍSTICAS...
echo ============================================
curl -X GET http://localhost:!SOFIA_PORT!/webhook/evolution/stats

echo.
echo ============================================
echo 🔍 4. DEBUG QR CODES EM CACHE...
echo ============================================
curl -X GET http://localhost:!SOFIA_PORT!/webhook/evolution/debug/qrcodes

echo.
echo ✅ TESTE CONCLUÍDO COM SUCESSO!
echo.
pause
exit /b 0

:powershell_fallback
echo.
echo ⚠️ CURL falhou, tentando com PowerShell...
echo.
powershell -ExecutionPolicy Bypass -File ".\test-sofia-powershell.ps1"
pause