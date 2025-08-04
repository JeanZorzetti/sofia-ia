# 🚀 SOFIA IA MONOREPO - CONFIGURAÇÕES DE DEPLOY

## 📁 ESTRUTURA UNIFICADA

```
sofia-ia/
├── backend/           # Express.js API (EasyPanel)
├── dashboard/         # React Dashboard (Vercel)  
├── landing/           # Landing Page (Vercel)
├── shared/            # Código compartilhado
├── docs/              # Documentação
├── .github/workflows/ # CI/CD
└── package.json       # Workspace raiz
```

## 🔧 CONFIGURAÇÕES DE DEPLOY

### 1. EasyPanel (Backend)
**Configuração no EasyPanel:**
```yaml
name: sofia-ia-backend
source:
  type: github
  repo: JeanZorzetti/sofia-ia
  branch: main
build:
  type: nodejs
  buildPath: backend
  buildCommand: npm install
  startCommand: node src/app.js
  port: 8000
env:
  NODE_ENV: production
  EVOLUTION_API_URL: https://evolutionapi.roilabs.com.br
  EVOLUTION_API_KEY: SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz
```

### 2. Vercel (Dashboard) 
**Arquivo: dashboard/vercel.json**
```json
{
  "name": "sofia-ai-lux-dash",
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "installCommand": "cd .. && npm install",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "https://lais-ia-api.roilabs.com.br"
  }
}
```

### 3. Vercel (Landing)
**Arquivo: landing/vercel.json** 
```json
{
  "name": "sofia-ia-landing-premium-80",
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist", 
  "installCommand": "cd .. && npm install",
  "framework": "vite"
}
```

## 🔄 WORKFLOW CI/CD

**Arquivo: .github/workflows/deploy.yml**
```yaml
name: Deploy Sofia IA
on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EasyPanel
        # Auto-deploy via webhook
        
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest  
    steps:
      - name: Deploy to Vercel
        # Auto-deploy via Vercel integration
```

## 📦 COMANDOS DE DESENVOLVIMENTO

```bash
# Instalar dependências de todos os workspaces
npm run install:all

# Desenvolver backend + dashboard simultaneamente
npm run dev

# Desenvolver apenas um projeto
npm run dev:backend
npm run dev:dashboard  
npm run dev:landing

# Build de produção (todos)
npm run build

# Testar todos os projetos
npm run test
```

## 🎯 BENEFÍCIOS

### ✅ Vantagens:
- **Gerenciamento único** - Um só repo para tudo
- **Versionamento coordenado** - Features completas em um commit
- **Dependências compartilhadas** - Tipos, utils, configs
- **Deploy coordenado** - Mudanças cross-sistema sincronizadas
- **Onboarding simples** - Clone único para desenvolvimento

### 🔄 Processo de Deploy:
1. **Commit** → Mudanças no backend + frontend juntas
2. **CI/CD** → Testa tudo junto automaticamente
3. **Deploy** → EasyPanel (backend) + Vercel (dashboard/landing) 
4. **Sync** → Todas as partes atualizadas simultaneamente

## 🚀 MIGRAÇÃO

1. ✅ Estrutura criada
2. ✅ Configurações definidas  
3. 🔄 Executar script unificação
4. 🔄 Configurar deploys
5. 🔄 Testar builds
6. 🔄 Fazer primeiro deploy unificado
