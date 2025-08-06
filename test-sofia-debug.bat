@echo off
echo.
echo ===================================
echo 🌐 TESTE QR CODES PRODUÇÃO SOFIA IA - CORRIGIDO
echo ===================================
echo.

REM Definir variáveis
set API_URL=https://sofia-api.roilabs.com.br
set INSTANCE_NAME=teste-prod-%RANDOM%
set JQ_PATH="%LOCALAPPDATA%\Microsoft\WinGet\Packages\jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe\jq.exe"

echo 🔍 Testando API: %API_URL%
echo 📱 Instância: %INSTANCE_NAME%
echo.

echo ============================================
echo 📡 1. VERIFICANDO STATUS DA API...
echo ============================================
curl -s "%API_URL%/health" | %JQ_PATH% "."

echo.
echo ============================================
echo 📱 2. TESTANDO ENDPOINTS DISPONÍVEIS...
echo ============================================
echo 🔍 Testando /api/dashboard/overview...
curl -s "%API_URL%/api/dashboard/overview" > temp_response.json 2>&1
if exist temp_response.json (
    echo Resposta recebida:
    type temp_response.json
    del temp_response.json
) else (
    echo ❌ Sem resposta
)

echo.
echo 🔍 Testando /api/whatsapp/instances (GET)...
curl -s "%API_URL%/api/whatsapp/instances" > temp_response2.json 2>&1
if exist temp_response2.json (
    echo Resposta recebida:
    type temp_response2.json
    del temp_response2.json
) else (
    echo ❌ Sem resposta
)

echo.
echo ============================================
echo 📱 3. CRIANDO INSTÂNCIA COM JSON CORRIGIDO...
echo ============================================
echo 📝 Payload: {\"instanceName\":\"%INSTANCE_NAME%\"}

curl -s -X POST "%API_URL%/api/whatsapp/instances" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%INSTANCE_NAME%\"}" > temp_create.json 2>&1

if exist temp_create.json (
    echo Resposta da criação:
    type temp_create.json
    del temp_create.json
)

echo.
echo ============================================
echo 🔍 4. VERIFICANDO ROTAS DISPONÍVEIS...
echo ============================================
echo 🌐 Testando rota base...
curl -s "%API_URL%/" | head -c 200

echo.
echo.
echo ✅ DIAGNÓSTICO COMPLETO
echo Instância testada: %INSTANCE_NAME%
echo.
pause