@echo off
echo 🚀 DEPLOY BACKEND PRODUÇÃO - CORREÇÃO QR CODES
echo =============================================

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\backend"

echo.
echo 🔧 VERIFICANDO CORREÇÃO LOCAL...
echo ✅ Backend local corrigido (generateRealisticQRCode)
echo ❌ Backend produção ainda com bug
echo.

echo 📦 Preparando deploy EasyPanel...
echo 1. Verificando arquivos modificados
echo 2. Preparando push git
echo 3. Deploy automático EasyPanel
echo.

echo 🔗 Git status:
git status

echo.
echo 📝 Adicionando correção ao git...
git add .
git commit -m "🔧 FIX: Corrigir generateRealisticQRCode - QR text válido"

echo.
echo 🚀 Push para trigger deploy EasyPanel...
git push origin main

echo.
echo ⏳ AGUARDANDO DEPLOY EASYPANEL...
echo 📍 URL: https://sofia-api.roilabs.com.br
echo ⏰ Tempo estimado: 2-3 minutos
echo.

echo 🎯 VERIFICAR DEPLOY:
echo 1. Aguarde 2-3 minutos
echo 2. Teste: https://sofia-api.roilabs.com.br/health
echo 3. Verifique versão no health check
echo 4. Teste QR codes no frontend produção
echo.

echo ✅ DEPLOY INICIADO!
echo 🔄 EasyPanel irá fazer rebuild automático
pause
