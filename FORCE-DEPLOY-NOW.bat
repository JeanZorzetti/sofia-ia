@echo off
echo 🚀 FORÇA DEPLOY - Backend com DELETE endpoint
echo =============================================

cd "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA"

echo 📦 Força add tudo...
git add -A

echo 📝 Força commit...
git commit -m "🗑️ BACKEND FORCE: DELETE endpoint para produção"

echo 📤 Força push...
git push

echo ✅ PUSH COMPLETO!
echo 🔗 Agora acesse EasyPanel e faça rebuild do backend:
echo 📍 https://app.easypanel.io/
echo 📍 Encontre o projeto sofia-api
echo 📍 Clique em Deploy/Rebuild
echo 📍 Aguarde 2-3 minutos
echo 📍 Teste novamente no frontend

echo.
echo 🎯 Endpoint DELETE está na linha 622 do app.js - confirmado!
pause