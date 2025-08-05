# 🚀 DEPLOY PRODUÇÃO: Sofia IA → sofia-api.roilabs.com.br

## 📋 **CHECKLIST PRÉ-DEPLOY**

### ✅ **Status Atual (CONCLUÍDO):**
- [x] Backend v2.3.0 funcionando local (100%)
- [x] QR Code Production Service implementado
- [x] 6/6 testes passando (100%)
- [x] Sistema enterprise com fallback
- [x] Código commitado no Git

---

## 🔧 **DEPLOY VIA EASYPANEL**

### **1. Acessar EasyPanel**
```
URL: https://panel.roilabs.com.br
Login: [suas credenciais]
```

### **2. Criar/Atualizar Aplicação Sofia IA**
```yaml
Nome: sofia-ia-backend
Domínio: sofia-api.roilabs.com.br
Tipo: Node.js Application
Runtime: Node.js 18+
```

### **3. Configuração de Deploy**
```yaml
Repository: 
  Branch: main
  Dockerfile: backend/Dockerfile (se existir)
  Build Command: npm install
  Start Command: node src/app.js
  Working Directory: backend/

Port: 8000
Health Check: /health
```

### **4. Variáveis de Ambiente Produção**
```env
NODE_ENV=production
PORT=8000
EVOLUTION_API_URL=https://evolutionapi.roilabs.com.br
EVOLUTION_API_KEY=SuOOmamlmX...
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_ANON_KEY=[sua-chave]
```

---

## 🐳 **DOCKERFILE PARA EASYPANEL**

<function_calls>
<invoke name="system-lite:write_file">
<parameter name="content"># Sofia IA Backend - Production Dockerfile
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY src/ ./src/

# Expor porta da aplicação
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Comando de inicialização
CMD ["node", "src/app.js"]
