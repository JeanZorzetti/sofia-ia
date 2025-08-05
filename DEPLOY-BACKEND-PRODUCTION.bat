@echo off
echo 🚀 DEPLOY BACKEND - Endpoint DELETE Para Produção
echo ================================================

echo 📍 Navegando para diretório backend...
cd "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\backend"

echo 📝 Verificando se há mudanças para commit...
git add .
git status

echo 📤 Fazendo commit das mudanças do backend...
git commit -m "🗑️ BACKEND: Endpoint DELETE implementado para produção

✅ Adicionado DELETE /api/whatsapp/instances/:instanceId
✅ WhatsAppInstanceManager com deleteInstance()
✅ Testado localmente e funcionando
✅ Pronto para deploy produção"

echo 🔄 Fazendo push para repositório...
git push

echo ✅ COMMIT COMPLETO!
echo 🔗 Agora precisa fazer deploy no EasyPanel:
echo 📍 1. Acesse sofia-api.roilabs.com.br no EasyPanel
echo 📍 2. Clique em "Deploy" ou "Rebuild"
echo 📍 3. Aguarde deploy finalizar
echo 📍 4. Teste novamente no frontend

pause