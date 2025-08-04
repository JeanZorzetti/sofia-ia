@echo off
echo 🌐 ========================================
echo 📝 ATUALIZANDO URLs PARA NOVA ESTRUTURA
echo 🌐 ========================================
echo.
echo ✅ URLs Atualizadas:
echo 🔧 Backend API: https://sofia-api.roilabs.com.br
echo 📊 Dashboard:   https://sofia-dash.roilabs.com.br  
echo 🌐 Landing:     https://sofia-ia.roilabs.com.br
echo.

echo 📝 Arquivos atualizados:
echo - README.md (URLs corrigidas)
echo - frontend/sofia-ai-lux-dash-main/.env.production (API URL)
echo - Documentação atualizada
echo.

echo 📦 Fazendo commit das alterações...
git add README.md
git add "frontend/sofia-ai-lux-dash-main/.env.production"
git commit -m "🌐 ATUALIZAR URLs v3.1.0 - Nova estrutura DNS

🔧 NOVA ESTRUTURA:
- Backend API: https://sofia-api.roilabs.com.br
- Dashboard: https://sofia-dash.roilabs.com.br  
- Landing: https://sofia-ia.roilabs.com.br

📝 ARQUIVOS ATUALIZADOS:
- README.md (URLs + badges corrigidos)
- .env.production (VITE_API_BASE_URL)
- Documentação health checks

✅ READY FOR DEPLOY:
- EasyPanel: sofia-api.roilabs.com.br
- Vercel Dashboard: sofia-dash.roilabs.com.br
- Vercel Landing: sofia-ia.roilabs.com.br"

echo.
echo 🌐 Fazendo push...
git push origin main

echo.
echo ✅ CODIGO ATUALIZADO COM SUCESSO!
echo.
echo 🚀 PRÓXIMOS PASSOS:
echo 1. EasyPanel: Adicionar domínio sofia-api.roilabs.com.br
echo 2. Vercel Dashboard: Configurar sofia-dash.roilabs.com.br
echo 3. Vercel Landing: Configurar sofia-ia.roilabs.com.br
echo 4. Testar endpoints: curl https://sofia-api.roilabs.com.br/health
echo.
pause
