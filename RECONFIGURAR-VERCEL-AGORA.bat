@echo off
echo 🔧 RECONFIGURAR VERCEL - SOFIA IA DASHBOARD
echo ==========================================

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\dashboard"

echo.
echo 🎯 CONFIGURAÇÃO VERCEL AUTOMÁTICA
echo.
echo ✅ Responda SIM (Y) para setup
echo ✅ Project name: sofia-dash-roilabs
echo ✅ Deploy to: roilabs team (se existir)
echo.

echo 📋 CONFIGURAÇÕES RECOMENDADAS:
echo - Project Name: sofia-dash-roilabs
echo - Framework: React/Vite (auto-detect)
echo - Build Command: npm run build
echo - Output Directory: dist
echo - Install Command: npm install
echo.

echo 🚀 Executando deploy...
call vercel --prod

echo.
echo 🔗 Após deploy bem-sucedido, configurar domínio:
echo 1. Acesse vercel.com/dashboard
echo 2. Vá no projeto sofia-dash-roilabs
echo 3. Settings → Domains
echo 4. Adicione: sofia-dash.roilabs.com.br
echo.

echo ✅ DEPLOY AUTOMÁTICO INICIADO
pause
