# ROI Labs Platform - Roadmap

> De SDR Imobiliario para Plataforma Completa de IA e Automacao para Empresas

---

## Estado Atual

O webapp hoje e um dashboard com base solida e dados reais:
- Autenticacao JWT funcional validando contra banco PostgreSQL
- Gerenciamento de instancias WhatsApp (Evolution API)
- Chat IA com Groq (Llama 3.3 70B) usando prompt customizado do banco
- Dashboard com dados REAIS do banco (mensagens, leads, conversas)
- Persistencia completa: mensagens, leads e conversas salvos automaticamente
- API de Settings funcional (CRUD completo)
- SDR Config salvando/carregando prompt customizado via banco
- Seed script com dados iniciais (admin, sofia, settings)
- Webhook Evolution API persistindo mensagens no banco
- Landing page reposicionada para "IA e Automacao para Empresas"

**Fase 1 concluida.** Gap atual: A landing page promete uma plataforma completa de IA e Automacao multi-vertical, mas o webapp so entrega um SDR imobiliario (agora com dados reais).

---

## Visao da Plataforma

```
ROI Labs Platform
|
|-- Dashboard Home (Hub Central)
|-- Agentes de IA (multi-canal, multi-proposito)
|-- Automacoes (workflow builder)
|-- Conversas (inbox unificado)
|-- Knowledge Base (documentos + RAG)
|-- Analytics & BI
|-- Integracoes (catalogo de conectores)
|-- Templates (biblioteca por vertical)
|-- Configuracoes & Admin
```

---

## FASE 1 - Fundacao e Persistencia (Semana 1-2)

**Objetivo:** Sair de dados mockados para dados reais. Base solida para tudo que vem depois.

### 1.1 Banco de Dados Real
- [x] Executar `prisma db push` para sincronizar schema com PostgreSQL
- [x] Criar seed script com dados iniciais (admin user, settings default)
- [x] Migrar endpoint `/api/auth/login` para validar contra tabela User (sair de hardcoded)
- [x] Migrar endpoint `/api/auth/profile` para buscar User real do banco

### 1.2 Persistencia de Conversas e Mensagens
- [x] Endpoint `/api/conversations/recent` buscar do banco (sair de mock generator)
- [x] Webhook Evolution API salvar mensagens recebidas na tabela Message
- [x] Endpoint `/api/messages/send` salvar mensagem enviada na tabela Message
- [x] Criar/atualizar Conversation automaticamente ao receber/enviar mensagem
- [x] Criar/atualizar Lead automaticamente a partir do numero de telefone

### 1.3 Dashboard com Dados Reais
- [x] Endpoint `/api/dashboard/overview` calcular metricas do banco (count de mensagens, leads, conversas)
- [x] Activity chart baseado em AnalyticsDaily (criar cron job ou calcular on-the-fly)
- [x] Leads by status baseado em query real

### 1.4 Configuracoes Persistentes
- [x] Endpoint POST `/api/settings` para salvar configuracoes na tabela Setting
- [x] Endpoint GET `/api/settings` para carregar configuracoes
- [x] SDR Config page salvar/carregar prompt customizado via Settings
- [x] Endpoint `/api/ai/chat` usar prompt customizado salvo (se existir)

---

## FASE 2 - Agentes de IA Generalizados (Semana 3-4)

**Objetivo:** Expandir de "Sofia SDR" para plataforma de criacao de agentes multi-proposito.

### 2.1 Modelo de Agente
- [x] Criar tabela Prisma `Agent` (id, name, description, systemPrompt, model, temperature, channels, knowledgeBaseId, status, createdBy, config JSON)
- [x] Criar tabela `AgentChannel` (agentId, channel: whatsapp|webchat|email, config JSON)
- [x] CRUD API `/api/agents` (GET, POST)
- [x] CRUD API `/api/agents/[id]` (GET, PUT, DELETE)
- [x] Migrar Sofia SDR como agente default na seed

### 2.2 Pagina de Agentes
- [x] Nova pagina `/dashboard/agents` - lista de agentes com status (ativo/inativo/teste)
- [x] Card de agente: nome, descricao, canais, metricas basicas (conversas, resolucao)
- [x] Dialogo de criacao: wizard com nome, descricao, personalidade, canal, instrucoes
- [x] Pagina de edicao: `/dashboard/agents/[id]` com configuracao completa
- [x] Toggle ativar/desativar agente

### 2.3 Roteamento de Mensagens por Agente
- [x] Webhook Evolution API rotear mensagem para o agente correto (por instancia WhatsApp)
- [x] Endpoint `/api/ai/chat` aceitar `agentId` e usar prompt do agente
- [x] Historico de conversa: carregar ultimas N mensagens do banco como contexto

### 2.4 Teste Integrado
- [x] Componente de chat inline na pagina do agente ("Testar agente")
- [x] Enviar mensagens de teste via `/api/ai/chat` com agentId
- [x] Exibir resposta em tempo real

---

## FASE 3 - Inbox Unificado (Semana 5-6)

**Objetivo:** Centralizar todas as conversas em um inbox profissional.

### 3.1 Inbox Backend
- [x] Endpoint `/api/conversations` com filtros (status, canal, agente, periodo, busca)
- [x] Endpoint `/api/conversations/[id]` com mensagens paginadas
- [x] Endpoint `/api/conversations/[id]/messages` (GET paginado, POST para enviar)
- [x] Endpoint `/api/conversations/[id]/takeover` (humano assume conversa)
- [x] Endpoint `/api/conversations/[id]/close` (encerrar conversa)
- [x] Endpoint `/api/conversations/[id]/tags` (adicionar/remover tags)

### 3.2 Inbox Frontend
- [x] Nova pagina `/dashboard/conversations` - layout 3 colunas (lista | chat | detalhes)
- [x] Lista de conversas com avatar, nome, ultima mensagem, timestamp, status badge, unread count
- [x] Filtros: canal (WhatsApp, webchat), status (ativa, aguardando, encerrada), agente
- [x] Area de chat: historico de mensagens, input de resposta, botao takeover
- [x] Painel lateral: dados do lead/contato, tags, notas internas, score
- [x] Indicador de quem respondeu (IA vs humano) em cada mensagem

### 3.3 Takeover Humano
- [x] Flag na conversa: `handledBy` (ai | human)
- [x] Quando humano assume: pausar agente IA nessa conversa
- [x] Botao "Devolver para IA" para reativar agente

---

## FASE 4 - Knowledge Base (Semana 7-8)

**Objetivo:** Permitir que agentes tenham base de conhecimento para respostas mais precisas.

### 4.1 Modelo de Knowledge Base
- [x] Criar tabela `KnowledgeBase` (id, name, agentId, type, config)
- [x] Criar tabela `KnowledgeDocument` (id, knowledgeBaseId, title, content, sourceUrl, fileType, chunks JSON, status)
- [x] CRUD API `/api/knowledge` e `/api/knowledge/[id]/documents`

### 4.2 Upload e Processamento
- [x] Upload de documentos (PDF, DOC, TXT) via form multipart
- [x] Importacao de URL (fetch + extract text)
- [x] Entrada de texto manual
- [x] Chunking de documentos (split em pedacos de ~500 tokens)

### 4.3 Busca e Contexto
- [x] Busca por similaridade nos chunks (keyword match como v1, embeddings como v2)
- [x] Injetar chunks relevantes no system prompt do agente antes de responder
- [x] Endpoint `/api/ai/chat` buscar contexto da knowledge base do agente

### 4.4 Frontend
- [x] Pagina `/dashboard/knowledge` - lista de bases de conhecimento
- [x] Upload drag-and-drop de documentos
- [x] Preview de documentos processados
- [x] Associar base de conhecimento a agentes

---

## FASE 5 - Automacoes e Workflows (Semana 9-10)

**Objetivo:** Builder visual de automacoes que conectam triggers a acoes.

### 5.1 Modelo de Workflow
- [x] Criar tabela `Workflow` (id, name, description, trigger, conditions JSON, actions JSON, status, lastRun, runCount, successCount)
- [x] Criar tabela `WorkflowExecution` (id, workflowId, status, input JSON, output JSON, error, duration, startedAt, completedAt)
- [x] CRUD API `/api/workflows` e `/api/workflows/[id]`
- [x] API `/api/workflows/[id]/executions` (historico)
- [x] API `/api/workflows/[id]/run` (executar manualmente)

### 5.2 Engine de Execucao
- [x] Trigger types: webhook, schedule (cron), evento de agente (nova conversa, lead qualificado, score > X), manual
- [x] Action types: enviar mensagem WhatsApp, chamar API externa, atualizar lead, notificar (email/webhook), chamar agente IA
- [x] Condition types: if/else baseado em dados do lead, horario, status
- [x] Executor sequencial: trigger -> condicao -> acao1 -> acao2
- [x] Logging de cada execucao com status e duracao

### 5.3 Workflows Pre-configurados
- [x] Template: Qualificacao de Leads (nova mensagem -> IA analisa -> atualiza score)
- [x] Template: Follow-up Automatico (lead inativo 24h -> envia mensagem)
- [x] Template: Alerta Lead Quente (score > 80 -> notifica via webhook)
- [x] Template: Resposta Automatica (mensagem recebida -> IA responde com contexto)

### 5.4 Frontend
- [x] Refatorar pagina `/dashboard/workflows` para usar dados reais
- [x] Lista de workflows com status, ultima execucao, taxa de sucesso
- [x] Dialogo de criacao: selecionar trigger, configurar condicoes, adicionar acoes
- [x] Pagina de detalhes do workflow com historico de execucoes
- [x] Toggle ativar/desativar

---

## FASE 6 - Analytics e BI (Semana 11-12)

**Objetivo:** Dashboards inteligentes com dados reais e insights.

### 6.1 Coleta de Dados
- [x] Cron job (ou on-demand) para popular tabela AnalyticsDaily
- [x] Metricas por agente: conversas, resolucao, tempo medio de resposta
- [x] Metricas por workflow: execucoes, sucesso, falha
- [x] Metricas de leads: criados, qualificados, convertidos por periodo

### 6.2 API de Analytics
- [x] Endpoint `/api/analytics/overview` (metricas gerais com filtro de periodo)
- [x] Endpoint `/api/analytics/agents` (metricas por agente)
- [x] Endpoint `/api/analytics/workflows` (metricas por workflow)
- [x] Endpoint `/api/analytics/leads` (funil de leads)
- [x] Suporte a filtros: periodo, agente, canal, status

### 6.3 Frontend
- [x] Refatorar dashboard principal com dados reais
- [x] Nova pagina `/dashboard/analytics` com dashboards detalhados
- [x] Graficos: linha (tendencias), barra (comparativos), pizza (distribuicao), funil (leads)
- [x] Filtros de periodo (7d, 30d, 90d, custom)
- [x] Exportacao CSV

---

## FASE 7 - Integracoes e Multi-canal (Semana 13-14)

**Objetivo:** Expandir canais e conectar com sistemas externos.

### 7.1 Catalogo de Integracoes
- [x] Criar tabela `Integration` (id, name, type, config JSON, credentials JSON encrypted, status)
- [x] Pagina `/dashboard/integrations` com catalogo visual (cards)
- [x] Configuracao de credenciais por integracao
- [x] Teste de conexao

### 7.2 Integracoes MVP
- [x] WhatsApp (ja existente - mover para formato padrao de Integration)
- [x] Webhook generico (receber e enviar webhooks)
- [x] API REST generico (fazer chamadas HTTP em workflows)
- [x] E-mail SMTP (enviar emails em workflows e como canal de agente)

### 7.3 Web Chat Widget
- [x] Componente React embeddable para sites de clientes
- [x] Endpoint `/api/chat/widget` para comunicacao
- [x] Roteamento para agente configurado
- [x] Customizacao visual (cores, logo, posicao)

---

## FASE 8 - Templates e Polimento (Semana 15-16)

**Objetivo:** Biblioteca de templates e refinamento da experiencia.

### 8.1 Templates
- [x] Pagina `/dashboard/templates` com biblioteca categorizada
- [x] Templates de agentes por vertical (Imobiliario, Atendimento, Vendas, RH, Financeiro, Juridico)
- [x] Templates de workflows por caso de uso
- [x] Deploy com 1 click (criar agente/workflow a partir do template)

### 8.2 Onboarding
- [x] Wizard de primeiro acesso: "Crie seu primeiro agente em 3 passos"
- [x] Empty states uteis com CTAs (quando nao ha agentes, workflows, etc.)
- [x] Tooltips e guias contextuais

### 8.3 UX/UI Polish
- [x] Command palette (Ctrl+K) para busca global
- [x] Breadcrumbs em todas as paginas
- [x] Skeleton loading em vez de spinners
- [x] Toast notifications para todas as acoes
- [x] Sidebar colapsavel com icones
- [x] Responsivo para tablet

### 8.4 Admin e Configuracoes
- [x] Gestao de usuarios (convite, roles: admin, editor, viewer)
- [x] Perfil da empresa
- [x] API Keys para integracao externa
- [x] Logs de auditoria

---

## FASE 9 - Enterprise e Escala (Futuro)

### 9.1 Avancado
- [x] Canvas visual drag-and-drop para workflows (estilo n8n/Make)
- [x] Multi-agent orchestration (agentes que colaboram)
- [x] Knowledge Base com embeddings vetoriais (pgvector)
- [x] Natural Language Queries no Analytics ("quantos leads qualificamos essa semana?")
- [x] A/B testing de agentes

### 9.2 Canais Adicionais
- [x] Instagram DM
- [x] Telegram
- [x] Voice (telefone)

### 9.3 Enterprise
- [x] Multi-tenancy (workspaces separados)
- [x] SSO/SAML
- [x] Compliance dashboard (LGPD)
- [x] Whitelabel
- [x] API publica com documentacao OpenAPI
- [x] Marketplace de templates da comunidade

### 9.4 Infraestrutura
- [x] Testes automatizados (Jest + Playwright)
- [x] CI/CD (GitHub Actions)
- [x] Monitoramento (Sentry, Datadog)
- [x] Performance: caching Redis, connection pooling, CDN
- [x] Backup automatico do banco

---

## SPRINT 5 - Monetizacao (Semana 9-12)

### 5.1 Billing com AbacatePay
- [x] Integracao AbacatePay (checkout PIX/Cartao, webhooks) - substituiu Stripe
- [x] Planos: Free / Pro (R$ 297/mes) / Business (R$ 997/mes)
- [x] Tabela `Subscription` no schema Prisma (plano, status, datas, usage)
- [x] Webhook handler `/api/webhooks/abacatepay` para confirmacao de pagamento
- [x] Dashboard `/dashboard/billing` com plano atual, uso real, botao upgrade

### 5.2 Limites por plano
- [x] Free: 2 agentes, 100 msgs/mes, 1 KB
- [x] Pro: 20 agentes, 5.000 msgs/mes, 10 KBs
- [x] Business: ilimitado
- [x] Helper `checkPlanLimit()` em `src/lib/plan-limits.ts`
- [x] Enforcement na rota POST `/api/agents`

### 5.3 Onboarding wizard
- [x] Pagina `/onboarding` com wizard 4-steps full-page
- [x] Steps: caso de uso → criar agente → criar orquestracao → concluir
- [x] Campo `onboardingCompleted` no modelo User
- [x] Detecção de primeiro login e redirect para `/onboarding`
- [x] Endpoint `/api/onboarding/complete` (marca completo + envia email)

### 5.4 Email de boas-vindas
- [x] Servico de email via Resend API em `src/lib/email.ts`
- [x] Template HTML responsivo com primeiros passos
- [x] Disparado no final do onboarding

---

## Navegacao Final da Sidebar

```
[Logo ROI Labs]

-- Dashboard           (grid icon)
-- Agentes de IA       (bot icon)
-- Conversas           (message-circle, badge unread)
-- Automacoes          (workflow icon)
-- Knowledge Base      (book icon)
-- Analytics           (bar-chart icon)
-- Integracoes         (plug icon)
-- Templates           (layout-template icon)

[separator]
-- Configuracoes       (settings icon)
-- Ajuda               (help-circle icon)

[Avatar + Nome]
[Empresa]
[Plano]
```

---

## Prioridade de Impacto

| Fase | Impacto para o Usuario | Complexidade | Tempo |
|------|----------------------|-------------|-------|
| 1. Fundacao | Alto (sair de mock) | Media | 2 sem |
| 2. Agentes | Muito Alto (core value) | Alta | 2 sem |
| 3. Inbox | Alto (gestao conversas) | Media | 2 sem |
| 4. Knowledge Base | Alto (qualidade IA) | Media | 2 sem |
| 5. Automacoes | Alto (diferencial) | Alta | 2 sem |
| 6. Analytics | Medio (visibilidade) | Media | 2 sem |
| 7. Integracoes | Medio (extensibilidade) | Media | 2 sem |
| 8. Templates | Medio (onboarding) | Baixa | 2 sem |
| 9. Enterprise | Alto (escala) | Muito Alta | ongoing |

---

## Metricas de Sucesso

- **Fase 1:** Zero dados mockados no dashboard. Todas as conversas e mensagens salvas no banco.
- **Fase 2:** Pelo menos 3 agentes de IA configurados e funcionando (SDR, Atendimento, Vendas).
- **Fase 3:** Inbox unificado com takeover humano funcionando em tempo real.
- **Fase 4:** Agentes respondendo com base em documentos carregados na Knowledge Base.
- **Fase 5:** Pelo menos 4 workflows automatizados rodando em producao.
- **Fase 6:** Dashboard com metricas reais e exportacao CSV.
- **Fase 7:** Pelo menos 2 canais alem do WhatsApp (webchat + email).
- **Fase 8:** Biblioteca com pelo menos 6 templates por vertical.
