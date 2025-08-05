@echo off
echo 🔧 CORREÇÃO DOCKERFILE - Novo Deploy Produção
echo ===============================================

echo.
echo 📊 Status: Corrigindo Dockerfile para deploy EasyPanel...

echo.
echo 📦 Adicionando correções...
git add backend/Dockerfile backend/package.json

echo.
echo 💾 Commit da correção Dockerfile...
git commit -m "🔧 FIX: Dockerfile corrigido para EasyPanel deploy

PROBLEMA RESOLVIDO:
- Dockerfile estava em formato Markdown (inválido)
- Corrigido para instruções Docker válidas
- Package.json atualizado para v2.3.0

DOCKERFILE CORRIGIDO:
✅ FROM node:18-alpine (base image)
✅ WORKDIR /app (diretório trabalho)
✅ COPY package*.json (dependências)
✅ RUN npm ci --only=production (install)
✅ COPY src/ ./src/ (código aplicação)
✅ EXPOSE 8000 (porta)
✅ HEALTHCHECK configurado
✅ CMD node src/app.js (start)

DEPLOY TARGET:
🎯 EasyPanel: sofia-api.roilabs.com.br
🚀 Build deve funcionar agora
✅ Sofia IA Backend v2.3.0 pronto

NEXT: Rebuild automático no EasyPanel"

echo.
if %errorlevel% == 0 (
    echo ✅ Commit realizado com sucesso!
) else (
    echo ❌ Erro no commit
    pause
    exit /b 1
)

echo.
echo 🔄 Fazendo push para trigger novo deploy...
git push origin main

if %errorlevel% == 0 (
    echo ✅ Push realizado com sucesso!
    echo.
    echo 🚀 DEPLOY AUTOMÁTICO INICIADO
    echo 📍 EasyPanel deve rebuildar automaticamente
    echo 🔗 URL: https://sofia-api.roilabs.com.br
    echo.
    echo ⏰ Aguarde ~2-3 minutos para build completar
    echo 🔍 Verifique logs no EasyPanel dashboard
    echo.
) else (
    echo ❌ Erro no push
)

echo 📋 CORREÇÕES APLICADAS:
echo - ✅ Dockerfile Node.js válido criado
echo - ✅ package.json v2.3.0 atualizado
echo - ✅ Build instructions corretas
echo - ✅ Health check configurado
echo - ✅ Production ready
echo.

echo 🎯 PRÓXIMOS PASSOS:
echo 1. Aguardar build EasyPanel completar
echo 2. Testar https://sofia-api.roilabs.com.br/health
echo 3. Validar QR codes em produção
echo 4. Deploy frontend apontando para produção
echo.

pause
