@echo off
echo 🛑 FORÇAR PARADA E REINICIAR BACKEND SOFIA IA
echo ================================================

echo.
echo 🔍 Procurando processos Node.js na porta 8000...
netstat -ano | findstr ":8000"

echo.
echo 🛑 Forçando parada de TODOS os processos Node.js...
taskkill /f /im node.exe 2>nul
if %errorlevel% == 0 (
    echo ✅ Processos Node.js finalizados
) else (
    echo ℹ️ Nenhum processo Node.js encontrado
)

echo.
echo ⏳ Aguardando 3 segundos para liberação da porta...
timeout /t 3 /nobreak >nul

echo.
echo 🔍 Verificando se porta 8000 foi liberada...
netstat -ano | findstr ":8000"
if %errorlevel% == 0 (
    echo ⚠️ Porta ainda em uso - tentando novamente...
    timeout /t 2 /nobreak >nul
) else (
    echo ✅ Porta 8000 liberada
)

echo.
echo 📁 Navegando para diretório backend...
cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\backend"

echo.
echo 🚀 Iniciando Sofia IA Backend v2.3.0...
echo 🎯 Aguarde: QR Code Production Service carregando...
echo.

node src\app.js

echo.
echo ❌ Backend finalizado
pause
