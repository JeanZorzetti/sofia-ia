@echo off
echo 🔧 CORRIGIR SETTINGS VERCEL - PROJETO ORIGINAL
echo =============================================

echo.
echo ❌ PROBLEMA: Path configurado como "dashboard\dashboard"
echo ✅ SOLUÇÃO: Alterar para path correto
echo.

echo 🌐 ABRIR CONFIGURAÇÕES VERCEL...
start https://vercel.com/jean-zorzettis-projects/sofia-ia-dashboard/settings

echo.
echo 📋 CONFIGURAÇÕES PARA ALTERAR:
echo.
echo ┌─ General Settings ─┐
echo │ Root Directory     │
echo │ ✅ ALTERAR DE:     │
echo │    dashboard       │
echo │ ✅ ALTERAR PARA:   │
echo │    ./              │
echo │    (ou deixar      │
echo │     em branco)     │
echo └───────────────────┘
echo.

echo ┌─ Build Settings ───┐
echo │ Framework: React   │
echo │ Build: npm run build
echo │ Output: dist       │
echo │ Install: npm install
echo └───────────────────┘
echo.

echo 🚀 APÓS ALTERAR AS CONFIGURAÇÕES:
echo 1. Salvar no Vercel
echo 2. Voltar aqui e pressionar ENTER
echo 3. Fazer deploy

pause

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\dashboard"

echo.
echo 🚀 Deploy com configurações corrigidas...
call vercel --prod

echo.
echo ✅ DEPLOY CONCLUÍDO COM CONFIGURAÇÕES CORRETAS!
pause
