@echo off
echo 🔧 CORREÇÃO DOCKERFILE - Deploy Produção
echo =======================================

echo.
echo 📦 Adicionando correções...
git add .

echo.
echo 💾 Fazendo commit da correção...
git commit -m "FIX: Dockerfile corrigido para EasyPanel deploy"

echo.
echo 🔄 Fazendo push para produção...
git push origin main

echo.
echo ✅ Correção enviada com sucesso!
echo 🚀 EasyPanel deve rebuildar automaticamente
echo 📍 URL: https://sofia-api.roilabs.com.br
echo.
echo ⏰ Aguarde 2-3 minutos para build completar
echo.

pause
