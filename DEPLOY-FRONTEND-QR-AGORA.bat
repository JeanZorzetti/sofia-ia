@echo off
echo 🚀 DEPLOY FRONTEND PRODUÇÃO - QR CODES REAIS
echo ========================================

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\dashboard"

echo.
echo 🔧 Verificando configuração...
if not exist "package.json" (
    echo ❌ Erro: Não encontrou package.json
    pause
    exit /b 1
)

echo ✅ Diretório correto encontrado

echo.
echo 📦 Instalando dependências...
call npm install

echo.
echo 🏗️ Fazendo build para produção...
call npm run build

echo.
echo 🚀 Deploy para Vercel...
call vercel --prod

echo.
echo ✅ DEPLOY CONCLUÍDO!
echo.
echo 🌐 URLs:
echo Frontend: https://sofia-dash.roilabs.com.br
echo Backend:  https://sofia-api.roilabs.com.br
echo.
echo 🔥 PRÓXIMO PASSO: Testar QR codes no frontend de produção
echo.
pause
