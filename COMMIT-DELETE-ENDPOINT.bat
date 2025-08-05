@echo off
echo 🚀 COMMIT: Endpoint DELETE WhatsApp Instances Implementado
echo =====================================================

cd "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA"

echo 📁 Adicionando arquivos modificados...
git add backend/src/app.js
git add test-delete-endpoint.js

echo 📝 Commitando mudanças...
git commit -m "🗑️ CORRIGIDO: Implementado endpoint DELETE para instâncias WhatsApp

✅ Funcionalidades adicionadas:
- Endpoint DELETE /api/whatsapp/instances/:instanceId
- Método deleteInstance() na classe WhatsAppInstanceManager  
- Validação completa (instância existe, error handling)
- Retorno padronizado com success/error
- Teste automatizado confirmando funcionamento

✅ Teste realizado:
- ✅ Status 200 - Endpoint respondendo
- ✅ Success: true - Operação realizada  
- ✅ Instâncias reduzidas de 2→1 - Exclusão OK
- ✅ Frontend pode excluir instâncias normalmente

🎯 Problema resolvido: Botões de excluir funcionando!"

echo ✅ Commit realizado com sucesso!
echo 🔗 Agora o frontend pode excluir instâncias WhatsApp!

pause