@echo off
echo 🛠️ ========================================
echo 📁 CORRIGINDO ESTRUTURA MONOREPO
echo 🛠️ ========================================

echo.
echo 📋 Problema identificado:
echo - Pasta monorepo-temp/ no repositório principal
echo - Estrutura dupla (frontend/ + monorepo-temp/)
echo - Vercel não encontra arquivos corretos
echo.

echo 🔧 Corrigindo estrutura...
echo.

REM Criar backup da estrutura atual
echo 💾 Fazendo backup...
xcopy frontend backup-frontend /E /I /H /Y
xcopy monorepo-temp backup-monorepo-temp /E /I /H /Y

echo.
echo 📁 Reorganizando pastas...

REM Mover dashboard para raiz
if exist "frontend\sofia-ai-lux-dash-main" (
    echo Movendo dashboard...
    move "frontend\sofia-ai-lux-dash-main" dashboard
)

REM Mover landing para raiz  
if exist "frontend\sofia-ia-landing-premium-80-main" (
    echo Movendo landing...
    move "frontend\sofia-ia-landing-premium-80-main" landing
)

REM Criar pasta shared se não existir
if not exist shared mkdir shared

REM Remover pastas desnecessárias
echo 🧹 Limpando estrutura...
rmdir /s /q monorepo-temp 2>nul
rmdir /s /q frontend 2>nul

echo.
echo ✅ ESTRUTURA CORRIGIDA!
echo.
echo 📂 Nova estrutura:
echo - backend/     (API Express)
echo - dashboard/   (React Dashboard)  
echo - landing/     (Landing Page)
echo - shared/      (Código compartilhado)
echo.

echo 📦 Fazendo commit da correção...
git add .
git commit -m "🛠️ FIX: Reorganizar estrutura monorepo v3.1.0

📁 ESTRUTURA CORRIGIDA:
- Movido frontend/sofia-ai-lux-dash-main → dashboard/
- Movido frontend/sofia-ia-landing-premium-80-main → landing/  
- Removido monorepo-temp/ (limpeza)
- Removido frontend/ (estrutura antiga)

✅ ESTRUTURA FINAL:
- backend/ (Express API)
- dashboard/ (React Dashboard)
- landing/ (Landing Page)  
- shared/ (Tipos compartilhados)

🔧 VERCEL PATHS CORRIGIDOS:
- Dashboard: /dashboard
- Landing: /landing"

echo.
echo 🌐 Fazendo push...
git push origin main

echo.
echo ✅ ESTRUTURA CORRIGIDA E COMMITADA!
echo.
echo 🔧 PRÓXIMOS PASSOS:
echo 1. Atualizar Vercel Dashboard: Root Directory = dashboard
echo 2. Atualizar Vercel Landing: Root Directory = landing
echo 3. Rebuild ambos os projetos
echo 4. Testar URLs novamente
echo.
pause
