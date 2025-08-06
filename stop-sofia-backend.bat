@echo off
echo.
echo 🛑 PARANDO SERVIDORES SOFIA IA EXISTENTES...
echo.

echo 🔍 Procurando processos Node.js na porta 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo 🛑 Matando processo %%a...
    taskkill /f /pid %%a 2>nul
)

echo.
echo 🔍 Procurando todos os processos node.exe...
tasklist | findstr node.exe
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ⚠️  Matando todos os processos node.exe...
    taskkill /f /im node.exe 2>nul
    echo ✅ Processos node.exe finalizados!
) else (
    echo ✅ Nenhum processo node.exe encontrado.
)

echo.
echo 🎯 Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo 🚀 Agora você pode iniciar o servidor Sofia IA!
echo    Execute: .\start-sofia-backend.bat
echo.
pause