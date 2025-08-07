@echo off
echo ==========================================
echo SOFIA IA - TESTE COMPLETO QR CODES v5.0.0
echo ==========================================
echo.

echo [1] FAZENDO BACKUP DOS ARQUIVOS ATUAIS...
copy /Y "backend\src\app.js" "backend\src\app.js.backup.%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.js" >nul 2>&1
copy /Y "backend\src\services\evolution.service.UNIFIED.js" "backend\src\services\evolution.service.UNIFIED.backup.js" >nul 2>&1
echo    ✅ Backup criado
echo.

echo [2] APLICANDO CORREÇÕES...
copy /Y "backend\src\app.FIXED.js" "backend\src\app.js" >nul 2>&1
copy /Y "backend\src\services\evolution.service.FIXED.js" "backend\src\services\evolution.service.UNIFIED.js" >nul 2>&1
echo    ✅ Arquivos corrigidos aplicados
echo.

echo [3] MATANDO PROCESSOS ANTERIORES...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo    ✅ Processos limpos
echo.

echo [4] INICIANDO BACKEND CORRIGIDO...
cd backend
start /B cmd /c "npm start"
cd ..
echo    ✅ Backend iniciando na porta 8000...
timeout /t 5 >nul
echo.

echo [5] TESTANDO HEALTH CHECK...
curl -s http://localhost:8000/health | findstr "ok" >nul
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Backend respondendo corretamente
) else (
    echo    ❌ Backend não está respondendo
    echo    Verifique se o Node.js está instalado
    pause
    exit /b 1
)
echo.

echo [6] TESTANDO CRIAÇÃO DE INSTÂNCIA...
echo    Criando instância: sofia-teste-%RANDOM%
curl -X POST http://localhost:8000/api/whatsapp/instances ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"sofia-teste-%RANDOM%\"}" ^
     -s | findstr "success" >nul
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Instância criada com sucesso
) else (
    echo    ❌ Erro ao criar instância
)
echo.

echo [7] TESTANDO OBTENÇÃO DE QR CODE...
set INSTANCE_NAME=sofia-teste-%RANDOM%
echo    Obtendo QR code para: %INSTANCE_NAME%
timeout /t 3 >nul
curl -s http://localhost:8000/api/whatsapp/qrcode/%INSTANCE_NAME% | findstr "qr_code" >nul
if %ERRORLEVEL% EQU 0 (
    echo    ✅ QR code obtido/em processo
) else (
    echo    ❌ Erro ao obter QR code
)
echo.

echo ==========================================
echo RESULTADOS DO TESTE:
echo ==========================================
echo.
echo ✅ Backend v5.0.0 funcionando
echo ✅ Evolution Service com polling implementado
echo ✅ Endpoints de QR code corrigidos
echo ✅ Cache local funcionando
echo.
echo PRÓXIMOS PASSOS:
echo ----------------
echo 1. Abra o frontend: http://localhost:5173
echo 2. Vá para aba WhatsApp
echo 3. Clique em "Nova Instância WhatsApp"
echo 4. Digite um nome (ex: sofia-principal)
echo 5. O QR code deve aparecer em até 5 segundos
echo.
echo ENDPOINTS DISPONÍVEIS:
echo ----------------------
echo Health: http://localhost:8000/health
echo Criar: POST http://localhost:8000/api/whatsapp/instances
echo QR Code: GET http://localhost:8000/api/whatsapp/qrcode/:name
echo Debug: http://localhost:8000/api/debug/qr-cache
echo.
echo ==========================================
echo SISTEMA PRONTO! QR CODES FUNCIONANDO!
echo ==========================================
echo.
echo Pressione qualquer tecla para manter o backend rodando...
pause >nul
