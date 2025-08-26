@echo off
echo.
echo ===================================
echo 🌐 EXPONDO SOFIA IA COM NGROK
echo ===================================
echo.

echo 🔍 Verificando se ngrok está instalado...
where ngrok >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ngrok não encontrado!
    echo.
    echo 📥 Para instalar ngrok:
    echo    1. Acesse: https://ngrok.com/download
    echo    2. Baixe ngrok.exe
    echo    3. Coloque ngrok.exe no PATH ou nesta pasta
    echo    4. Execute: ngrok config add-authtoken SEU_TOKEN
    echo.
    pause
    exit /b 1
)

echo ✅ ngrok encontrado!
echo.

echo 🚀 Expondo Sofia IA na porta 8000...
echo.
echo 🌐 Aguarde o URL público aparecer abaixo:
echo    Copie o URL https://xxxxx.ngrok.io
echo.
echo ⚠️  MANTENHA ESTA JANELA ABERTA!
echo    Pressione Ctrl+C para parar o túnel
echo.

ngrok http 8000