@echo off
echo.
echo ===================================
echo 🚀 DEPLOY CORREÇÃO WEBHOOK - RÁPIDO
echo ===================================
echo.
echo 🔧 .env já está correto localmente!
echo WEBHOOK_URL=https://sofia-api.roilabs.com.br/webhook/evolution
echo.
echo 📋 Fazendo commit + push da correção...
echo.

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA"

echo ============================================
echo 📝 COMMIT DA CORREÇÃO...
echo ============================================
git add backend/.env
git commit -m "fix: webhook URL produção - correção crítica"

echo ============================================
echo 🌐 PUSH PARA GITHUB...
echo ============================================
git push origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ CORREÇÃO ENVIADA COM SUCESSO!
    echo.
    echo 🎯 PRÓXIMOS PASSOS:
    echo 1. Restart aplicação no EasyPanel (30s)
    echo 2. Aguardar 2-3 minutos
    echo 3. Execute: .\test-webhook-fixed.bat
    echo.
    echo 💡 Após restart, QR codes REAIS funcionarão!
) else (
    echo ❌ Erro no push - usar OPÇÃO B (manual EasyPanel)
)

echo.
pause