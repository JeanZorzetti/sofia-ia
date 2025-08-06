@echo off
echo 🔧 CORRIGIR PATH VERCEL - PROJETO ORIGINAL
echo ========================================

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\dashboard"

echo.
echo 🗑️ Removendo configuração com path incorreto...
if exist ".vercel" (
    rmdir /s /q ".vercel"
    echo ✅ Pasta .vercel removida
)

echo.
echo 🔗 Relinkando ao projeto original...
echo ✅ Projeto: sofia-ia-dashboard
echo ✅ URL: https://vercel.com/jean-zorzettis-projects/sofia-ia-dashboard
echo.

call vercel link

echo.
echo 🚀 Deploy no projeto correto...
call vercel --prod

echo.
echo ✅ CORRIGIDO! Deploy usando projeto original
pause
