# 🔧 CORREÇÃO RÁPIDA: QR Codes Reais em Produção

## 🚨 **PROBLEMA IDENTIFICADO**
O deploy foi bem-sucedido, mas QR codes ainda são **simulados** ao invés de **reais**.

---

## 🔍 **CAUSA MAIS PROVÁVEL**
**NODE_ENV não está configurado como 'production'** no EasyPanel.

### **Como Verificar:**
1. Acesse EasyPanel dashboard
2. Vá na aplicação Sofia IA
3. Verifique Environment Variables
4. Procure por `NODE_ENV`

---

## 🔧 **CORREÇÃO STEP-BY-STEP**

### **1. Configurar Environment Variables no EasyPanel**
```yaml
Variáveis Obrigatórias:
NODE_ENV=production
PORT=8000
EVOLUTION_API_URL=https://evolutionapi.roilabs.com.br
EVOLUTION_API_KEY=SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz
```

### **2. Rebuild a Aplicação**
- No EasyPanel, clique em "Rebuild"
- Aguarde 2-3 minutos
- Verifique logs de build

### **3. Testar Novamente**
```bash
# Execute para verificar correção
node DIAGNOSTICO-QR-REAL-PRODUCAO.js
```

---

## 🎯 **OUTRAS POSSÍVEIS CAUSAS**

### **Evolution API Offline**
- Verificar se https://evolutionapi.roilabs.com.br está online
- Testar criação manual de instância

### **Frontend Conectando no Local**
- Verificar se frontend está apontando para sofia-api.roilabs.com.br
- Não para localhost:8000

### **API Key Incorreta**
- Confirmar API key da Evolution API nas env vars
- Testar com API key atualizada

---

## 🚀 **AÇÃO IMEDIATA**

**Execute o diagnóstico primeiro:**
```bash
node DIAGNOSTICO-QR-REAL-PRODUCAO.js
```

**Resultado esperado:**
- Identificará exatamente qual é o problema
- Dará correções específicas
- Mostrará como configurar EasyPanel

---

## ✅ **RESULTADO FINAL ESPERADO**

Após correção, QR code deve mostrar:
- 🏭 **Fonte: evolution_api** (não fallback_simulation)
- 🌍 **Ambiente: PRODUÇÃO** 
- 🎉 **QR Code REAL gerado!**
