@echo off
echo.
echo ===================================
echo 🚀 DEPLOY COMPLETO SOFIA IA - OPCAO 1
echo ===================================
echo.
echo 📋 Executando git workflow para deploy...
echo.

cd /d "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA"

echo ============================================
echo 📊 1. VERIFICANDO STATUS ATUAL...
echo ============================================
git status

echo.
echo ============================================
echo 📁 2. ADICIONANDO TODAS AS MUDANCAS...
echo ============================================
git add .

echo.
echo ============================================
echo 💬 3. FAZENDO COMMIT...
echo ============================================
git commit -m "feat: sistema completo QR codes + webhooks + endpoints produção"

echo.
echo ============================================
echo 🌐 4. FAZENDO PUSH PARA GITHUB...
echo ============================================
git push origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ PUSH REALIZADO COM SUCESSO!
    echo.
    echo 🎯 PRÓXIMOS PASSOS:
    echo 1. Acesse EasyPanel
    echo 2. Restart aplicação Sofia IA
    echo 3. Execute test-sofia-production-final.bat
    echo.
) else (
    echo ❌ ERRO NO PUSH!
    echo Verifique credenciais do GitHub
    echo.
)

pause