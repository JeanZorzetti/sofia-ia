@echo off
echo 🔄 REINICIAR BACKEND SOFIA IA com QR Codes de Produção
echo ======================================================

echo.
echo 🛑 Parando processo Node.js anterior...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 📁 Navegando para diretório backend...
cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\backend"

echo.
echo 🔍 Verificando arquivos atualizados...
if exist "src\app.js" (
    echo ✅ app.js encontrado
) else (
    echo ❌ app.js não encontrado
    pause
    exit /b 1
)

if exist "src\services\qrcode-production.service.js" (
    echo ✅ qrcode-production.service.js encontrado
) else (
    echo ❌ qrcode-production.service.js não encontrado
    pause
    exit /b 1
)

echo.
echo 🚀 Iniciando backend com QR Code Production Service...
echo.
echo 📍 URL: http://localhost:8000
echo 🔗 Version: 2.3.0 (com QR codes reais)
echo.

node src\app.js

pause
