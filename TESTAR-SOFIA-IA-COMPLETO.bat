@echo off
echo 🧪 ========================================
echo 📊 TESTANDO SOFIA IA - ESTRUTURA COMPLETA
echo 🧪 ========================================
echo.

echo 🔧 1. TESTANDO BACKEND API...
echo.
echo 📊 Health Check:
curl -s https://sofia-api.roilabs.com.br/health
echo.
echo.

echo 📈 Dashboard Overview:
curl -s https://sofia-api.roilabs.com.br/api/dashboard/overview
echo.
echo.

echo 📱 QR Code Stats:
curl -s https://sofia-api.roilabs.com.br/api/whatsapp/qrcode-stats
echo.
echo.

echo 🌐 2. TESTANDO FRONTEND URLS...
echo.
echo 📊 Dashboard Response:
curl -I https://sofia-dash.roilabs.com.br
echo.

echo 🎯 Landing Response:
curl -I https://sofia-ia.roilabs.com.br
echo.

echo ✅ ========================================
echo 🎉 TESTES CONCLUIDOS!
echo ✅ ========================================
echo.
echo 📋 VERIFICAR:
echo - Backend API retornando JSON válido
echo - Dashboard retornando status 200
echo - Landing retornando status 200
echo - Integração funcionando
echo.
echo 🚀 SE TUDO OK: SOFIA IA v3.0.0 ONLINE!
echo.
pause
