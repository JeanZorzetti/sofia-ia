@echo off
echo.
echo ===================================
echo 🔧 CORREÇÃO URGENTE - WEBHOOK URL
echo ===================================
echo.
echo ❌ PROBLEMA IDENTIFICADO:
echo    webhook_url está como localhost na produção
echo    Evolution API não consegue enviar webhooks
echo.
echo ✅ SOLUÇÃO:
echo    Atualizar WEBHOOK_URL no EasyPanel
echo.
echo ============================================
echo 📋 PASSOS PARA CORREÇÃO NO EASYPANEL:
echo ============================================
echo.
echo 1. 🌐 Acesse: https://panel.roilabs.com.br
echo 2. 🔍 Encontre aplicação "Sofia IA"
echo 3. ⚙️ Vá em "Environment Variables" ou "Settings"
echo 4. 🔧 Encontre a variável WEBHOOK_URL
echo 5. ✏️ ALTERE de:
echo    http://localhost:8000/webhook/evolution
echo 6. ✅ PARA:
echo    https://sofia-api.roilabs.com.br/webhook/evolution
echo 7. 💾 Salve as alterações
echo 8. 🔄 Restart a aplicação
echo 9. ⏳ Aguarde 2-3 minutos
echo 10. 🧪 Execute: test-webhook-fixed.bat
echo.
echo ============================================
echo 💡 ALTERNATIVA - VERIFICAR .ENV PRODUÇÃO:
echo ============================================
echo Se não encontrar no EasyPanel, pode ser que
echo a aplicação esteja usando .env do código.
echo Neste caso, já atualizamos o .env local.
echo.
echo ⚠️ IMPORTANTE: Após correção, execute:
echo .\test-webhook-fixed.bat
echo.
pause