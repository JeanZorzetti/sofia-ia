# 🌐 CONFIGURAÇÕES DEPLOY - NOVA ESTRUTURA DNS

## 📊 **ESTRUTURA FINAL:**

| Serviço | URL | Plataforma | Status |
|---------|-----|------------|--------|
| **Backend API** | `https://sofia-api.roilabs.com.br` | EasyPanel | 🔄 Configurar |
| **Dashboard** | `https://sofia-dash.roilabs.com.br` | Vercel | 🔄 Configurar |
| **Landing Page** | `https://sofia-ia.roilabs.com.br` | Vercel | 🔄 Configurar |

---

## 🔧 **1. EASYPANEL (Backend) - sofia-api.roilabs.com.br**

### **Configuração Domain:**
```yaml
Project: sofia-ia-backend
Domain: sofia-api.roilabs.com.br
SSL: Auto (Let's Encrypt)
Port: 8000
```

### **Environment Variables:**
```bash
NODE_ENV=production
PORT=8000
EVOLUTION_API_URL=https://evolutionapi.roilabs.com.br
EVOLUTION_API_KEY=SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz
# + outras vars já configuradas
```

---

## 🌐 **2. VERCEL (Dashboard) - sofia-dash.roilabs.com.br**

### **Project Settings:**
```yaml
Repository: JeanZorzetti/sofia-ia
Framework: Vite
Root Directory: frontend/sofia-ai-lux-dash-main
Build Command: npm run build
Output Directory: dist
```

### **Custom Domain:**
```bash
sofia-dash.roilabs.com.br
```

### **Environment Variables:**
```bash
VITE_API_BASE_URL=https://sofia-api.roilabs.com.br
VITE_APP_TITLE=Sofia IA Dashboard
VITE_ENABLE_WHATSAPP=true
VITE_ENABLE_REAL_TIME=true
VITE_AUTO_REFRESH_INTERVAL=30000
```

---

## 🎯 **3. VERCEL (Landing) - sofia-ia.roilabs.com.br**

### **Project Settings:**
```yaml
Repository: JeanZorzetti/sofia-ia
Framework: Vite
Root Directory: frontend/sofia-ia-landing-premium-80-main
Build Command: npm run build
Output Directory: dist
```

### **Custom Domain:**
```bash
sofia-ia.roilabs.com.br
```

### **Environment Variables:**
```bash
VITE_API_BASE_URL=https://sofia-api.roilabs.com.br
VITE_DASHBOARD_URL=https://sofia-dash.roilabs.com.br
```

---

## 🧪 **4. TESTES PÓS-DEPLOY**

### **Health Checks:**
```bash
# Backend API
curl https://sofia-api.roilabs.com.br/health

# Dashboard (deve carregar interface)
curl -I https://sofia-dash.roilabs.com.br

# Landing Page (deve carregar)
curl -I https://sofia-ia.roilabs.com.br
```

### **API Endpoints:**
```bash
# Métricas Dashboard
curl https://sofia-api.roilabs.com.br/api/dashboard/overview

# QR Code Stats
curl https://sofia-api.roilabs.com.br/api/whatsapp/qrcode-stats

# Lista Instâncias
curl https://sofia-api.roilabs.com.br/api/whatsapp/instances
```

---

## 📋 **5. CHECKLIST DEPLOY**

### **✅ Código Local:**
- [ ] URLs atualizadas no código
- [ ] Environment variables corretas
- [ ] README.md atualizado
- [ ] Commit feito
- [ ] Push para GitHub

### **🔧 EasyPanel:**
- [ ] Domain sofia-api.roilabs.com.br adicionado
- [ ] SSL certificado gerado
- [ ] Build funcionando
- [ ] Health check OK

### **🌐 Vercel Dashboard:**
- [ ] Projeto conectado ao repo sofia-ia
- [ ] Root Directory: frontend/sofia-ai-lux-dash-main
- [ ] Environment variables configuradas
- [ ] Custom domain sofia-dash.roilabs.com.br
- [ ] Deploy funcionando

### **🎯 Vercel Landing:**
- [ ] Projeto conectado ao repo sofia-ia
- [ ] Root Directory: frontend/sofia-ia-landing-premium-80-main
- [ ] Custom domain sofia-ia.roilabs.com.br
- [ ] Deploy funcionando

---

## 🚀 **SEQUÊNCIA DE EXECUÇÃO:**

1. **Código Local** ✅ (executar script)
2. **EasyPanel** → Adicionar domain
3. **Vercel Dashboard** → Configurar projeto
4. **Vercel Landing** → Configurar projeto
5. **Testes** → Validar todos endpoints

---

**Estrutura profissional estabelecida! 🎉**
