@echo off
echo.
echo ===================================
echo 🚀 DEPLOY PRODUCTION - TODAS MUDANÇAS
echo ===================================
echo.
echo 📦 Preparando commit completo...

echo 🔍 1. Verificando arquivos modificados...
git status --porcelain

echo.
echo 📁 2. Adicionando arquivos específicos importantes...
git add backend/src/app-production.js
git add backend/.env.production.public
git add *.bat
git add backend/src/services/
git add backend/src/routes/

echo.
echo 📝 3. Fazendo commit das mudanças...
git commit -m "feat: sistema completo QR codes produção - v4.0.0

✅ Endpoints QR code corrigidos:
- /api/whatsapp/qrcode/:instanceName (principal)
- /api/debug/qr-cache (debug)
- /api/whatsapp/stats (estatísticas)

✅ Configurações produção:
- WEBHOOK_URL=https://sofia-api.roilabs.com.br
- NODE_ENV=production
- CORS origem produção

✅ Fallback systems:
- Cache local QR codes
- Simulação quando Evolution API indisponível
- Error handling robusto

🎯 PRONTO PARA DEPLOY PRODUÇÃO!"

echo.
echo 🚀 4. Fazendo push para GitHub...
git push origin main

echo.
echo ✅ DEPLOY COMPLETO ENVIADO!
echo 💡 Próximo: Restart produção no EasyPanel
echo.
pause