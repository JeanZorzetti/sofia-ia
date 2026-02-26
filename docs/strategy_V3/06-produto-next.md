# Produto Next — Features que Desbloqueiam Crescimento

> Regra V3: So construir features que diretamente aumentam signups, ativacao ou revenue.
> Nao construir features porque "seria legal ter".

---

## Criterio de Inclusao

Cada feature proposta deve responder SIM a pelo menos uma:
1. Isso converte mais visitantes em signups?
2. Isso ativa mais signups em usuarios ativos?
3. Isso converte mais ativos em pagantes?
4. Isso reduz churn de pagantes?
5. Isso gera viral loop (usuario traz usuario)?

---

## 1. Conversion Boosters (P0 — Desbloqueiam Revenue)

### 1.1 Trial Pro 7 Dias (Sem Cartao)
**Impacto:** Ativacao + Conversao
**Hipotese:** Usuarios que experimentam features Pro por 7 dias convertem 3x mais que Free-only.

**Implementacao:**
- No signup, usuario recebe automaticamente plano Pro por 7 dias
- Contador regressivo visivel no dashboard: "Trial Pro: 5 dias restantes"
- Email D+5: "Seu trial Pro acaba em 2 dias — upgrade agora com 20% off"
- Ao expirar: downgrade automatico para Free (nao bloquear)
- Tabela/campo: `trialEndsAt DateTime?` no model `User`

**Esforco:** 1-2 dias
**Metricas:** Trial → Paid conversion rate

---

### 1.2 In-App Onboarding Checklist
**Impacto:** Ativacao
**Hipotese:** Checklist visivel no dashboard aumenta completion de 1a orquestracao em 50%.

**Implementacao:**
- Widget fixo no canto do dashboard (primeiras 2 semanas)
- Steps:
  1. ✅ Criar conta (auto-complete)
  2. ⬜ Criar primeiro agente
  3. ⬜ Executar primeira orquestracao
  4. ⬜ Conectar Knowledge Base
  5. ⬜ Convidar um colega
- Cada step completado mostra confetti/animacao
- Ao completar 5/5: badge "Power User" no perfil
- Dismiss permanente disponivel

**Esforco:** 1 dia
**Metricas:** Steps completed per user, time to first orchestration

---

### 1.3 Plan Limit Visibility + Upgrade Prompts
**Impacto:** Conversao
**Hipotese:** Usuarios que veem claramente seus limites fazem upgrade 2x mais que quem nao ve.

**Implementacao:**
- Barra de uso no topo do dashboard sidebar:
  ```
  Agentes: 2/2 ████████░░ 100%
  Msgs:  87/100 ███████░░░ 87%
  KBs:    1/1 ██████████ 100%
  ```
- Quando atinge 80%: badge amarelo "Quase no limite"
- Quando atinge 100%: nao bloquear, mas mostrar modal:
  "Voce atingiu o limite do plano Free. Faca upgrade para continuar criando."
  Botao: "Upgrade para Pro — R$ 297/mes" + "Continuar no Free (limitado)"
- Pagina `/dashboard/billing` ja existe — adicionar grafico de uso historico

**Esforco:** 1 dia
**Metricas:** Upgrade prompt view → click → purchase rate

---

### 1.4 Email Drip Sequence (Lifecycle)
**Impacto:** Ativacao + Retencao
**Hipotese:** Usuarios que recebem emails de onboarding ativam 40% mais.

**Implementacao via Resend (ja configurado):**

| Dia | Trigger | Assunto | Conteudo |
|-----|---------|---------|----------|
| D+0 | Signup | "Bem-vindo a Sofia AI!" | Link dashboard + 3 proximos passos |
| D+1 | !first_agent | "Crie seu primeiro agente em 2 min" | Video + template sugerido |
| D+3 | !first_orch | "Experimente o Magic Create" | CTA para criar orquestracao com IA |
| D+5 | any | "3 templates prontos para testar" | Links para templates populares |
| D+7 | any | "Como esta sua experiencia?" | NPS inline (1-10) |
| D+14 | !paying | "Desbloqueie o poder completo" | Trial Pro CTA ou features Pro |
| D+30 | inactive_7d | "Sentimos sua falta" | Novidade recente + CTA voltar |

**Esforco:** 2-3 dias (criar templates, implementar triggers)
**Metricas:** Email open rate, click rate, activation rate per cohort

---

### 1.5 Social Proof na Landing Page
**Impacto:** Conversao de visitante
**Hipotese:** Social proof aumenta signup rate em 30%.

**Implementacao:**
- Contador animado no hero: "X orquestracoes executadas" (query real do DB)
- Logos de "integracao com" (Zapier, Make, n8n, HubSpot, Salesforce)
- Secao "Usado por" com logos de empresas (quando disponivel)
- Testimonials section (coletar via NPS e email)

**Esforco:** 0.5 dia (counter real) + ongoing (testimonials)
**Metricas:** Signup rate antes/depois

---

## 2. Retention Features (P1 — Reduzem Churn)

### 2.1 Weekly Digest Email
**Impacto:** Retencao
**Hipotese:** Usuarios que recebem digest semanal retornam 25% mais.

**Implementacao:**
- Email semanal automatizado:
  ```
  Sua semana na Sofia AI:
  - 12 orquestracoes executadas
  - 45 mensagens processadas
  - Agente mais ativo: "Pesquisador"
  - Sugestao: "Experimente conectar um webhook de output"
  ```
- So enviar se houve atividade (nao spam inativo)
- Cron job semanal (domingo a noite)

**Esforco:** 1 dia
**Metricas:** Open rate, return-to-app rate

---

### 2.2 Orchestration Sharing ("Powered by Sofia AI")
**Impacto:** Viral + Retencao
**Hipotese:** 5% dos usuarios compartilham resultados, gerando 10 signups/mes.

**Implementacao:**
- Botao "Compartilhar resultado" no final de cada execucao
- Gera link publico: `sofiaia.roilabs.com.br/shared/[executionId]`
- Pagina publica mostra: input, agentes que rodaram, output final
- Footer: "Crie sua propria orquestracao gratis → [Signup CTA]"
- Badge: "Powered by Sofia AI" com link

**Esforco:** 2 dias
**Metricas:** Shares, shared page views, signups via shared link

---

### 2.3 Template Marketplace (Ja Existe — Ativar)
**Impacto:** Retencao + Viral
**Hipotese:** Marketplace com templates reais de outros usuarios aumenta engagement.

**Estado atual:** Pagina `/marketplace` existe, `/dashboard/marketplace` existe.
**Gap:** So tem templates estaticos. Precisa de templates reais de usuarios.

**Acoes:**
- Permitir que usuarios publiquem suas orquestracoes como templates
- Review/moderacao antes de publicar (admin approve)
- Ranking por popularidade (clones, execucoes)
- "Featured templates" na home

**Esforco:** 3 dias
**Metricas:** Templates published, clones, executions from cloned templates

---

## 3. Enterprise Enablers (P2 — Quando Tiver Traction)

### 3.1 Usage-Based Billing (Credit System)
Em vez de hard limits (2 agentes, 100 msgs), creditos mensais:
- Free: 500 creditos/mes
- Pro: 10.000 creditos/mes
- Business: 50.000 creditos/mes
- 1 mensagem = 1 credito, 1 execucao = 5 creditos, 1 upload = 10 creditos

**Vantagem:** Mais flexivel, menos "trava" na experiencia.
**Esforco:** 3-5 dias (requer mudanca no enforcement)

### 3.2 Custom AI Model Selection
Permitir que Pro/Business escolham modelo por agente:
- Groq Llama 3.3 (rapido, gratis)
- OpenRouter Claude Sonnet (qualidade, pago)
- OpenRouter GPT-4o (alternativa)

**Ja parcialmente implementado** via `lib/ai/openrouter.ts`. Falta:
- UI de selecao de modelo no editor de agente
- Tracking de custo por modelo
- Limites de uso de modelos pagos por plano

**Esforco:** 2 dias

### 3.3 White-label Self-Service
Atual: White-label requer contato comercial.
Futuro: Self-service para agencias no plano Business+:
- Ativar white-label em 1 click
- Configurar branding (logo, cores, dominio) via UI
- Provisionar sub-tenants automaticamente

**Esforco:** 5 dias
**Prerequisito:** Ter pelo menos 3 agencias interessadas (validar demanda)

---

## 4. O que NAO Construir (Backlog Frozen)

| Feature proposta | Por que NAO agora |
|-----------------|-------------------|
| Novos canais (Slack bot, Discord bot) | WhatsApp/Telegram/Instagram ja suficientes |
| Novas integracoes CRM | HubSpot + Salesforce + Sheets + Notion ja suficientes |
| Mobile app nativo | PWA ja funciona como companion |
| i18n novos idiomas (FR, DE) | PT/ES/EN cobre mercado alvo |
| Electron desktop app | Zero demanda comprovada |
| Visual flow builder v2 | Flow builder v1 funciona, orquestracoes sao a estrela |
| AI model fine-tuning | Complexidade altissima, demanda incerta |
| Voice channels | Complexidade alta, mercado nichado |
| Blockchain/web3 anything | Nao |

---

## 5. Ordem de Implementacao

```
Mes 1: Trial Pro + Checklist + Plan Limits + Email Drip
        (4 features que custam ~5 dias e desbloqueiam conversao)

Mes 2: Social Proof + Weekly Digest + Sharing
        (3 features que custam ~4 dias e criam retention/viral)

Mes 3: Template Marketplace ativado + Model Selection
        (2 features que custam ~5 dias e criam stickiness)

Mes 4+: Avaliar dados e decidir proximo bloco
```
