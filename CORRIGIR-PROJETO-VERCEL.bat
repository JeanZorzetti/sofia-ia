@echo off
echo 🔧 CORRIGIR CAGADA - USAR PROJETO VERCEL ORIGINAL
echo ===============================================

echo.
echo ❌ ERRO: Criei projeto duplicado desnecessariamente
echo ✅ SOLUÇÃO: Usar projeto original já configurado
echo.

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\dashboard"

echo 🗑️ DELETANDO PROJETO NOVO (sofia-dash-roilabs)...
call vercel rm sofia-dash-roilabs --yes

echo.
echo 🔗 LINKANDO AO PROJETO ORIGINAL...
call vercel link

echo.
echo 🚀 DEPLOY NO PROJETO CORRETO...
call vercel --prod

echo.
echo ✅ CORRIGIDO! Agora usando projeto original
pause
