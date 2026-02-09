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
- [ ] Webhook Evolution API rotear mensagem para o agente correto (por instancia WhatsApp)
- [ ] Endpoint `/api/ai/chat` aceitar `agentId` e usar prompt do agente
- [ ] Historico de conversa: carregar ultimas N mensagens do banco como contexto

### 2.4 Teste Integrado
- [ ] Componente de chat inline na pagina do agente ("Testar agente")
- [ ] Enviar mensagens de teste via `/api/ai/chat` com agentId
- [ ] Exibir resposta em tempo real

---

## FASE 3 - Inbox Unificado (Semana 5-6)

**Objetivo:** Centralizar todas as conversas em um inbox profissional.

### 3.1 Inbox Backend
- [ ] Endpoint `/api/conversations` com filtros (status, canal, agente, periodo, busca)
- [ ] Endpoint `/api/conversations/[id]` com mensagens paginadas
- [ ] Endpoint `/api/conversations/[id]/messages` (GET paginado, POST para enviar)
- [ ] Endpoint `/api/conversations/[id]/takeover` (humano assume conversa)
- [ ] Endpoint `/api/conversations/[id]/close` (encerrar conversa)
- [ ] Endpoint `/api/conversations/[id]/tags` (adicionar/remover tags)

### 3.2 Inbox Frontend
- [ ] Nova pagina `/dashboard/conversations` - layout 3 colunas (lista | chat | detalhes)
- [ ] Lista de conversas com avatar, nome, ultima mensagem, timestamp, status badge, unread count
- [ ] Filtros: canal (WhatsApp, webchat), status (ativa, aguardando, encerrada), agente
- [ ] Area de chat: historico de mensagens, input de resposta, botao takeover
- [ ] Painel lateral: dados do lead/contato, tags, notas internas, score
- [ ] Indicador de quem respondeu (IA vs humano) em cada mensagem

### 3.3 Takeover Humano
- [ ] Flag na conversa: `handledBy` (ai | human)
- [ ] Quando humano assume: pausar agente IA nessa conversa
- [ ] Botao "Devolver para IA" para reativar agente

---

## FASE 4 - Knowledge Base (Semana 7-8)

**Objetivo:** Permitir que agentes tenham base de conhecimento para respostas mais precisas.

### 4.1 Modelo de Knowledge Base
- [ ] Criar tabela `KnowledgeBase` (id, name, agentId, type, config)
- [ ] Criar tabela `KnowledgeDocument` (id, knowledgeBaseId, title, content, sourceUrl, fileType, chunks JSON, status)
- [ ] CRUD API `/api/knowledge` e `/api/knowledge/[id]/documents`

### 4.2 Upload e Processamento
- [ ] Upload de documentos (PDF, DOC, TXT) via form multipart
- [ ] Importacao de URL (fetch + extract text)
- [ ] Entrada de texto manual
- [ ] Chunking de documentos (split em pedacos de ~500 tokens)

### 4.3 Busca e Contexto
- [ ] Busca por similaridade nos chunks (keyword match como v1, embeddings como v2)
- [ ] Injetar chunks relevantes no system prompt do agente antes de responder
- [ ] Endpoint `/api/ai/chat` buscar contexto da knowledge base do agente

### 4.4 Frontend
- [ ] Pagina `/dashboard/knowledge` - lista de bases de conhecimento
- [ ] Upload drag-and-drop de documentos
- [ ] Preview de documentos processados
- [ ] Associar base de conhecimento a agentes

---

## FASE 5 - Automacoes e Workflows (Semana 9-10)

**Objetivo:** Builder visual de automacoes que conectam triggers a acoes.

### 5.1 Modelo de Workflow
- [ ] Criar tabela `Workflow` (id, name, description, trigger, conditions JSON, actions JSON, status, lastRun, runCount, successCount)
- [ ] Criar tabela `WorkflowExecution` (id, workflowId, status, input JSON, output JSON, error, duration, startedAt, completedAt)
- [ ] CRUD API `/api/workflows` e `/api/workflows/[id]`
- [ ] API `/api/workflows/[id]/executions` (historico)
- [ ] API `/api/workflows/[id]/run` (executar manualmente)

### 5.2 Engine de Execucao
- [ ] Trigger types: webhook, schedule (cron), evento de agente (nova conversa, lead qualificado, score > X), manual
- [ ] Action types: enviar mensagem WhatsApp, chamar API externa, atualizar lead, notificar (email/webhook), chamar agente IA
- [ ] Condition types: if/else baseado em dados do lead, horario, status
- [ ] Executor sequencial: trigger -> condicao -> acao1 -> acao2
- [ ] Logging de cada execucao com status e duracao

### 5.3 Workflows Pre-configurados
- [ ] Template: Qualificacao de Leads (nova mensagem -> IA analisa -> atualiza score)
- [ ] Template: Follow-up Automatico (lead inativo 24h -> envia mensagem)
- [ ] Template: Alerta Lead Quente (score > 80 -> notifica via webhook)
- [ ] Template: Resposta Automatica (mensagem recebida -> IA responde com contexto)

### 5.4 Frontend
- [ ] Refatorar pagina `/dashboard/workflows` para usar dados reais
- [ ] Lista de workflows com status, ultima execucao, taxa de sucesso
- [ ] Dialogo de criacao: selecionar trigger, configurar condicoes, adicionar acoes
- [ ] Pagina de detalhes do workflow com historico de execucoes
- [ ] Toggle ativar/desativar

---

## FASE 6 - Analytics e BI (Semana 11-12)

**Objetivo:** Dashboards inteligentes com dados reais e insights.

### 6.1 Coleta de Dados
- [ ] Cron job (ou on-demand) para popular tabela AnalyticsDaily
- [ ] Metricas por agente: conversas, resolucao, tempo medio de resposta
- [ ] Metricas por workflow: execucoes, sucesso, falha
- [ ] Metricas de leads: criados, qualificados, convertidos por periodo

### 6.2 API de Analytics
- [ ] Endpoint `/api/analytics/overview` (metricas gerais com filtro de periodo)
- [ ] Endpoint `/api/analytics/agents` (metricas por agente)
- [ ] Endpoint `/api/analytics/workflows` (metricas por workflow)
- [ ] Endpoint `/api/analytics/leads` (funil de leads)
- [ ] Suporte a filtros: periodo, agente, canal, status

### 6.3 Frontend
- [ ] Refatorar dashboard principal com dados reais
- [ ] Nova pagina `/dashboard/analytics` com dashboards detalhados
- [ ] Graficos: linha (tendencias), barra (comparativos), pizza (distribuicao), funil (leads)
- [ ] Filtros de periodo (7d, 30d, 90d, custom)
- [ ] Exportacao CSV

---

## FASE 7 - Integracoes e Multi-canal (Semana 13-14)

**Objetivo:** Expandir canais e conectar com sistemas externos.

### 7.1 Catalogo de Integracoes
- [ ] Criar tabela `Integration` (id, name, type, config JSON, credentials JSON encrypted, status)
- [ ] Pagina `/dashboard/integrations` com catalogo visual (cards)
- [ ] Configuracao de credenciais por integracao
- [ ] Teste de conexao

### 7.2 Integracoes MVP
- [ ] WhatsApp (ja existente - mover para formato padrao de Integration)
- [ ] Webhook generico (receber e enviar webhooks)
- [ ] API REST generico (fazer chamadas HTTP em workflows)
- [ ] E-mail SMTP (enviar emails em workflows e como canal de agente)

### 7.3 Web Chat Widget
- [ ] Componente React embeddable para sites de clientes
- [ ] Endpoint `/api/chat/widget` para comunicacao
- [ ] Roteamento para agente configurado
- [ ] Customizacao visual (cores, logo, posicao)

---

## FASE 8 - Templates e Polimento (Semana 15-16)

**Objetivo:** Biblioteca de templates e refinamento da experiencia.

### 8.1 Templates
- [ ] Pagina `/dashboard/templates` com biblioteca categorizada
- [ ] Templates de agentes por vertical (Imobiliario, Atendimento, Vendas, RH, Financeiro, Juridico)
- [ ] Templates de workflows por caso de uso
- [ ] Deploy com 1 click (criar agente/workflow a partir do template)

### 8.2 Onboarding
- [ ] Wizard de primeiro acesso: "Crie seu primeiro agente em 3 passos"
- [ ] Empty states uteis com CTAs (quando nao ha agentes, workflows, etc.)
- [ ] Tooltips e guias contextuais

### 8.3 UX/UI Polish
- [ ] Command palette (Ctrl+K) para busca global
- [ ] Breadcrumbs em todas as paginas
- [ ] Skeleton loading em vez de spinners
- [ ] Toast notifications para todas as acoes
- [ ] Sidebar colapsavel com icones
- [ ] Responsivo para tablet

### 8.4 Admin e Configuracoes
- [ ] Gestao de usuarios (convite, roles: admin, editor, viewer)
- [ ] Perfil da empresa
- [ ] API Keys para integracao externa
- [ ] Logs de auditoria

---

## FASE 9 - Enterprise e Escala (Futuro)

### 9.1 Avancado
- [ ] Canvas visual drag-and-drop para workflows (estilo n8n/Make)
- [ ] Multi-agent orchestration (agentes que colaboram)
- [ ] Knowledge Base com embeddings vetoriais (pgvector)
- [ ] Natural Language Queries no Analytics ("quantos leads qualificamos essa semana?")
- [ ] A/B testing de agentes

### 9.2 Canais Adicionais
- [ ] Instagram DM
- [ ] Telegram
- [ ] Voice (telefone)

### 9.3 Enterprise
- [ ] Multi-tenancy (workspaces separados)
- [ ] SSO/SAML
- [ ] Compliance dashboard (LGPD)
- [ ] Whitelabel
- [ ] API publica com documentacao OpenAPI
- [ ] Marketplace de templates da comunidade

### 9.4 Infraestrutura
- [ ] Testes automatizados (Jest + Playwright)
- [ ] CI/CD (GitHub Actions)
- [ ] Monitoramento (Sentry, Datadog)
- [ ] Performance: caching Redis, connection pooling, CDN
- [ ] Backup automatico do banco

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
