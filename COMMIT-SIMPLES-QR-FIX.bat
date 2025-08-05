@echo off
chcp 65001 >nul
echo ✅ CORREÇÃO SIMPLES: QR Code Display Fix
echo ====================================

echo.
echo 📦 Staging arquivos modificados...
git add .

echo.
echo 💾 Commit simples da correção...
git commit -m "FIX: QR Code display renderização corrigida"

if %errorlevel% == 0 (
    echo.
    echo ✅ Commit realizado!
    
    echo.
    echo 🚀 Push para produção...
    git push origin main
    
    if %errorlevel% == 0 (
        echo.
        echo ✅ PUSH REALIZADO COM SUCESSO!
        echo.
        echo 🎯 DEPLOY VERCEL INICIADO
        echo 📍 URL: https://sofia-dash.roilabs.com.br
        echo.
        echo ⏰ AGUARDE 3-5 MINUTOS
        echo.
        echo 🔄 TESTE APÓS DEPLOY:
        echo 1. Abrir dashboard produção
        echo 2. WhatsApp Tab - Nova Instância  
        echo 3. Verificar QR code visível
        echo 4. Testar conexão WhatsApp
        echo.
        echo 🎉 Sofia IA com QR codes REAIS funcionando!
        echo.
    ) else (
        echo ❌ Erro no push
    )
) else (
    echo ❌ Erro no commit
)

pause
