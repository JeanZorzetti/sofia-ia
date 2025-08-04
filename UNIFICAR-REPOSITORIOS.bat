@echo off
echo 🚀 ========================================
echo 📦 SOFIA IA - UNIFICACAO MONOREPO
echo 🚀 ========================================

echo.
echo 📤 1. Fazendo push do repositorio atual...
git push --force origin main

echo.
echo 💾 2. Criando backup...
cd ..
xcopy "Sofia IA" "Sofia IA - BACKUP-%date:~0,10%" /E /I /H /Y

echo.
echo 🏗️ 3. Criando estrutura monorepo...
cd "Sofia IA"

REM Criar diretórios da nova estrutura
mkdir monorepo-temp\backend 2>nul
mkdir monorepo-temp\dashboard 2>nul
mkdir monorepo-temp\landing 2>nul
mkdir monorepo-temp\shared 2>nul
mkdir monorepo-temp\docs 2>nul
mkdir monorepo-temp\.github\workflows 2>nul

echo.
echo 📁 4. Movendo backend atual...
xcopy backend monorepo-temp\backend /E /I /H /Y
xcopy *.js monorepo-temp\backend\ /Y 2>nul
xcopy *.bat monorepo-temp\backend\ /Y 2>nul
xcopy *.md monorepo-temp\backend\ /Y 2>nul

echo.
echo 📥 5. Baixando dashboard e landing...
cd monorepo-temp

echo Clonando dashboard...
git clone https://github.com/JeanZorzetti/sofia-ia-lux-dash.git temp-dashboard
xcopy temp-dashboard dashboard /E /I /H /Y
rmdir /s /q temp-dashboard

echo Clonando landing...
git clone https://github.com/JeanZorzetti/sofia-ia-landing-premium-80.git temp-landing
xcopy temp-landing landing /E /I /H /Y
rmdir /s /q temp-landing

echo.
echo ✅ Estrutura monorepo criada!
echo 📁 Verifique: monorepo-temp\
echo.
echo 🎯 PRÓXIMOS PASSOS:
echo 1. Verificar estrutura em monorepo-temp\
echo 2. Criar package.json raiz
echo 3. Configurar workspaces
echo 4. Configurar deploys
echo 5. Testar builds
echo.
pause
