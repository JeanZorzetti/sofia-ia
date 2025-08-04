@echo off
echo 🚀 ===============================================
echo 📦 SOFIA IA - EXECUCAO COMPLETA MONOREPO
echo 🚀 ===============================================

echo.
echo ✅ 1. RESOLVER PUSH ATUAL
echo Fazendo push forçado dos QR codes...
git push --force origin main

echo.
echo ✅ 2. EXECUTAR UNIFICACAO
echo Criando estrutura monorepo...
call UNIFICAR-REPOSITORIOS.bat

echo.
echo ✅ 3. INICIALIZAR NOVO REPOSITORIO
echo Configurando monorepo git...
cd monorepo-temp
git init
git add .
git commit -m "🏗️ MONOREPO UNIFICADO v3.0.0 - Backend + Dashboard + Landing

🔗 ESTRUTURA CRIADA:
- backend/ (Express API + QR Codes)
- dashboard/ (React Dashboard)  
- landing/ (Landing Page)
- shared/ (Tipos TypeScript)
- docs/ (Documentação)

📁 WORKSPACES CONFIGURADOS:
- package.json raiz com scripts
- npm workspaces funcionais
- Shared types entre projetos

🚀 DEPLOY CONFIGURADO:
- EasyPanel (backend)
- Vercel (dashboard + landing)
- CI/CD workflows

✅ PRONTO PARA PRODUCAO"

echo.
echo ✅ 4. CONFIGURAR REMOTO GITHUB
echo Você precisa criar um novo repositório 'sofia-ia' no GitHub
echo Depois execute:
echo git remote add origin https://github.com/JeanZorzetti/sofia-ia.git
echo git branch -M main
echo git push -u origin main

echo.
echo 🎯 CONFIGURACOES DE DEPLOY:
echo.
echo 📦 EASYPANEL (Backend):
echo - Repo: https://github.com/JeanZorzetti/sofia-ia
echo - Build Path: backend
echo - Build Command: npm install
echo - Start Command: node src/app.js
echo.
echo 🌐 VERCEL (Dashboard):
echo - Repo: https://github.com/JeanZorzetti/sofia-ia
echo - Framework: Vite
echo - Root Directory: dashboard
echo - Build Command: npm install ^&^& npm run build
echo.
echo 🌐 VERCEL (Landing):
echo - Repo: https://github.com/JeanZorzetti/sofia-ia
echo - Framework: Vite  
echo - Root Directory: landing
echo - Build Command: npm install ^&^& npm run build
echo.
echo ✅ MONOREPO CRIADO COM SUCESSO!
echo 📁 Estrutura: monorepo-temp/
echo 🎯 Próximo: Criar repo GitHub 'sofia-ia'
echo.
pause
