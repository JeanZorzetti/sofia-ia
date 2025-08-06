@echo off
echo 🔧 REINICIAR BACKEND COM CORREÇÃO QR
echo ====================================

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\backend"

echo.
echo 🛑 Matando processos Node.js existentes...
taskkill /f /im node.exe 2>nul

echo.
echo ⏳ Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo 🚀 Iniciando backend CORRIGIDO...
echo ✅ Correção aplicada: generateRealisticQRCode() agora retorna QR text válido
echo ❌ Removido: JSON.stringify(pattern) que causava lixo
echo.

start "Sofia IA Backend CORRIGIDO" node src/app.js

echo.
echo ✅ Backend reiniciado com correção aplicada!
echo 🔗 URL: http://localhost:8000
echo 📊 Health: http://localhost:8000/health
echo.
echo 🎯 PRÓXIMO PASSO:
echo 1. Aguarde backend inicializar (5-10s)
echo 2. Teste QR code no frontend
echo 3. Verifique console do browser para QR text válido
echo.
pause
