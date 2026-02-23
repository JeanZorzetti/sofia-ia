# Sofia — Roadmap Executável

> Última atualização: 23/02/2026
> Status: Em execução

## Legenda
- ⬜ Não iniciado
- 🔄 Em progresso
- ✅ Concluído
- 🔴 Bloqueado
- 🏷️ Prioridade: P0 (crítico), P1 (importante), P2 (desejável)

---

## Sprint 1 — Estabilização (Semana 1-2)

**Objetivo**: Produto funcional e testável

### Infraestrutura
- ✅ Reorganizar `lib/` em subpastas (`ai/`, barrel re-exports)
- ✅ Limpar dead code (workflow-engine, componentes mortos)
- ✅ Atualizar `.gitignore`
- ✅ Criar documentação técnica (README, architecture, API reference)
- ✅ **P0** — Adicionar error boundaries em todas as páginas
- ✅ **P0** — Implementar loading states consistentes
- ✅ **P1** — Adicionar rate limiting nas rotas de API críticas
- ✅ **P1** — Ativar Sentry para monitoramento de erros

### Multi-tenancy
- ✅ **P0** — Verificar isolamento de dados entre usuários
- ✅ **P0** — Audit de queries Prisma (todas filtram por userId/orgId?) → OK para single-tenant, P0 para SaaS
- ✅ **P1** — Implementar middleware de tenant isolation (para SaaS launch)

### Testes
- ✅ **P1** — Testes unitários para `lib/ai/` (groq, openrouter, embeddings)
- ✅ **P1** — Testes de integração para rotas críticas (auth, agents, conversations)
- ✅ **P2** — E2E com Playwright para fluxos principais

---

## Sprint 2 — Produto Estrela (Semana 3-4)

**Objetivo**: Orquestrações polidas e demonstráveis

### Orquestrações (Estrela)
- ✅ **P0** — UX review do editor de orquestrações (template picker, empty state, badges de execução)
- ✅ **P0** — Templates de orquestração pré-configurados (3 templates)
  - ✅ Marketing: Pesquisador → Copywriter → Revisor
  - ✅ Suporte: Triagem → Atendente → Escalação
  - ✅ Pesquisa: Coletor → Analista → Sintetizador
- ✅ **P0** — Melhorar streaming SSE (feedback visual por agente, events granulares)
- ✅ **P1** — Analytics por orquestração (custo, tempo, tokens) — integrado no live view
- ✅ **P1** — Histórico de execuções com replay
- ✅ **P2** — Export de resultados (PDF, Markdown)

### Knowledge Base
- ✅ **P0** — Upload drag-and-drop funcional (já implementado na auditoria Sprint 1)
- ✅ **P0** — Indicador visual de progresso de vectorização (já implementado)
- ✅ **P1** — Suporte a mais formatos (PDF, DOCX, CSV)
- ✅ **P2** — Interface de preview dos chunks

---

## Sprint 3 — Landing Page + Open Source (Semana 5-6)

**Objetivo**: Presença pública para SEO e GEO

### Landing Page
- ✅ **P0** — Criar landing page (Next.js, SSG)
  - ✅ Hero com demo visual das orquestrações
  - ✅ Features grid (Orquestrações, KB, IDE, Flows, Canais)
  - ✅ Comparativo vs. concorrentes (tabela)
  - ✅ Pricing (Free, Pro, Business)
  - ✅ CTA para signup/waitlist
- ✅ **P0** — SEO técnico (meta tags, OG, sitemap, robots.txt)
- ✅ **P0** — Schema markup (SoftwareApplication, FAQ)
- ✅ **P1** — Página /features/orchestrations/ (deep dive)
- ✅ **P1** — Página /templates/ (orquestrações prontas)

### GitHub (GEO)
- ✅ **P0** — Preparar repositório público
  - ✅ README em inglês com badges, GIFs, quick start
  - ✅ CONTRIBUTING.md
  - ✅ LICENSE (MIT ou AGPL)
  - ✅ .github/ (issue templates, PR template)
- ✅ **P0** — Docker Compose para self-hosted
- ✅ **P1** — GitHub Actions (CI/CD, testes automáticos)

### Diretórios e Listings (GEO)
- ✅ **P1** — ProductHunt launch (assets e copy prontos em docs/listings/)
- ✅ **P1** — Registro em: There's An AI For That, Futurepedia, AlternativeTo (textos prontos em docs/listings/)
- ✅ **P2** — Dev.to article de lançamento (rascunho em docs/listings/directory-descriptions.md)

---

## Sprint 4 — Conteúdo SEO + GEO (Semana 7-8)

**Objetivo**: Primeiros artigos rankando

### Blog (SEO Camada 1 — captura de demanda)
- ✅ **P0** — Setup do blog (Next.js MDX ou CMS headless)
- ✅ **P0** — Artigo pilar: "O que é Orquestração de Agentes IA"
  - Formato GEO: answer-first, tabelas, schema FAQ
- ✅ **P0** — Artigo comparativo: "Sofia vs CrewAI vs AutoGen vs LangFlow"
- ✅ **P1** — "Como Criar uma Equipe de Agentes IA sem Código"
- ✅ **P1** — "Knowledge Base com RAG: O que é e Como Usar"
- ✅ **P2** — "5 Orquestrações Prontas para sua Empresa"

### SEO Técnico
- ✅ **P0** — Internal linking (pilar → clusters)
- ✅ **P0** — Meta descriptions otimizadas (GEO-friendly)
- ✅ **P1** — Core Web Vitals otimizados

---

## Sprint 5 — Monetização (Semana 9-12)

**Objetivo**: Primeiros usuários pagantes

### Billing
- ✅ **P0** — Integração Mercado Pago (checkout PIX/cartão/boleto, webhooks, assinaturas recorrentes) — substituiu AbacatePay
- ✅ **P0** — Planos: Free / Pro (R$ 297) / Business (R$ 997)
- ✅ **P0** — Limites por plano (agentes, msgs, KBs) + helper `checkPlanLimit()`
- ✅ **P1** — Dashboard de uso e consumo em `/dashboard/billing`

### Onboarding
- ✅ **P0** — Wizard funcional full-page `/onboarding` (4 steps: use case → agente → orquestração → concluir)
- ✅ **P0** — Detecção de primeiro login + redirect para `/onboarding`
- ✅ **P1** — Email de boas-vindas com Resend (HTML responsivo)

### Analytics de Produto
- ✅ **P1** — Tracking de eventos (signup, first-orchestration, first-agent)
- ✅ **P1** — Funil de conversão (free → trial → paid)
- ✅ **P2** — NPS / feedback loop

---

## Sprint 6+ — Crescimento (Semana 13+)

### Produto
- ✅ Marketplace de templates de orquestração
- ✅ API pública para integrações externas
- ✅ Multi-language (EN)
- ⬜ Mobile companion app
- ✅ Webhooks de output (Slack, Discord, email)

### Conteúdo (SEO Camada 2 e 3)
- ✅ Conteúdo por vertical (marketing, jurídico, e-commerce)
- ✅ Casos de uso com resultados
- ⬜ YouTube (demos, tutoriais)
- ✅ Newsletter

### Comunidade
- ✅ Discord/Slack para usuários (feito no Sprint 7)
- ✅ Documentação open-source (docs.sofia.ai)
- ✅ Program de early adopters

---

## Sprint 7 — Comunidade + Diferencial Técnico (Semana 17-20)

**Objetivo**: Atingir KPIs de Mês 6-12 — Discord ativo, 50+ artigos, AI-Assisted Orchestration como diferencial técnico central

### Comunidade (Longo Prazo — Mês 4, atrasado)
- ✅ **P0** — Página pública `/comunidade` (Discord, GitHub, Early Access, newsletter)
- ✅ **P0** — Links de comunidade no footer e navbar do site
- ✅ **P1** — Discord server ativo com canais: #avisos, #geral, #ajuda, #showcase, #feedback, #contribute, #bug-reports, #ideias
- ✅ **P1** — Atualizar CONTRIBUTING.md com guia para primeiros contributors

### Produto — Diferencial Técnico (Longuíssimo Prazo Antecipado)
- ✅ **P0** — AI-Assisted Orchestration Creator: UI "Descreva seu processo" → gera orquestração automaticamente via LLM
- ✅ **P1** — Página pública `/whitelabel` (landing para agências e resellers)

### Conteúdo SEO — Camada 2 (criar demanda, 5 artigos)
- ✅ **P0** — "Melhores Ferramentas de IA para Pequenas Empresas em 2026"
- ✅ **P0** — "Como Reduzir Custos Operacionais com Inteligência Artificial"
- ✅ **P0** — "Plataforma Multi-Agente: O que É e Como Escolher a Certa"
- ✅ **P1** — "IA para Agências: Como Escalar Sem Contratar" (vertical)
- ✅ **P1** — "Como Implementar RAG na Sua Empresa (sem código)"

### Cases de Uso Documentados (1/mês — Mês 6+)
- ✅ **P0** — Case: Agência de Marketing (+400% produção conteúdo)
- ✅ **P1** — Case: E-commerce (atendimento 24h, -70% tickets humanos)
- ✅ **P1** — Case: Escritório Jurídico (revisão contratos 15min vs 4h)

---

## Sprint 8 — White-label + Enterprise (Semana 21-24)

**Objetivo**: Abrir canal B2B2C via programa de revendas e formalizar oferta Enterprise

### Modelo Comercial White-label

O white-label permite que agências, consultorias e ISVs distribuam Sofia com sua própria marca para seus clientes, operando como um canal de vendas indireto da ROI Labs.

#### Estrutura de Planos White-label

| Plano | Preço | Sub-tenants | Indicado para |
|---|---|---|---|
| **WL Starter** | R$ 497/mês | Até 5 clientes | Agências pequenas, consultores |
| **WL Agency** | R$ 1.297/mês | Até 25 clientes | Agências médias, integradores |
| **WL Scale** | R$ 2.497/mês | Ilimitado | Agências grandes, ISVs, SaaS |
| **WL Enterprise** | Custom | Ilimitado + self-hosted | Grandes integradores, franquias |

#### O que está incluído em todos os planos WL
- Branding customizado (logo, cores, domínio próprio)
- Painel de gestão de clientes (criar/suspender sub-tenants)
- Cada sub-tenant tem isolamento total de dados
- Billing centralizado (integrador paga ROI Labs, cobra seus clientes como quiser)
- Suporte técnico ao integrador (não aos clientes finais)
- Acesso antecipado a novas features

#### Itens por tier
- **WL Starter**: branding básico (logo + cores), suporte por email, cada cliente no plano Pro equivalente
- **WL Agency**: domínio próprio (sofia.agencia.com.br), onboarding guiado (2h call), painel de gestão, SLA 99.5%
- **WL Scale**: self-hosted opcional, treinamento da equipe, gerente de parceria, SLA 99.9%, co-marketing
- **WL Enterprise**: contrato anual, NDA, integração SSO/SAML, compliance, revenue share negociável

#### Modelo de precificação para clientes finais (recomendado ao integrador)
O integrador tem liberdade total de precificação. Referência de markup sugerido:
- WL Starter → cobrar clientes R$ 297-497/mês → margem bruta ~40-60%
- WL Agency → cobrar clientes R$ 297-697/mês × 10+ clientes → margem bruta 50-70%
- WL Scale → cobrar clientes acima de R$ 197/mês × N clientes → economics escalável

#### Processo comercial
1. Interessado preenche formulário em `/whitelabel` → CTA "Falar com Vendas"
2. Call de qualificação (30min) → entende caso de uso e número de clientes
3. Trial de 14 dias do painel de gestão (sandbox)
4. Contrato + onboarding técnico (setup de domínio, branding, primeiros clientes)
5. Acompanhamento mensal nos primeiros 3 meses

### Tarefas Técnicas — Sprint 8

#### White-label (produto)
- ✅ **P0** — Modelo de dados: tabela `WhitelabelTenant` (organizationId, branding, customDomain, planId, ownerId)
- ✅ **P0** — Painel do integrador: `/dashboard/whitelabel` (criar/listar/suspender sub-tenants)
- ✅ **P1** — Middleware de custom domain (sofia.agencia.com.br → injeta x-custom-domain header no contexto)
- ✅ **P1** — API de provisionamento de sub-tenants (POST /api/whitelabel/tenants)
- ✅ **P2** — Tema customizável (logo URL, primary color, nome da plataforma, custom domain via PATCH /api/whitelabel/account)

#### Enterprise (comercial)
- ✅ **P0** — Plano Enterprise na Home (`/`) — grid 4 colunas com Free/Pro/Business/Enterprise ✅ (feito nesta iteração)
- ✅ **P0** — Página `/contato` com formulário qualificado (segmenta Enterprise vs White-label vs Geral)
- ✅ **P1** — Página `/enterprise` com landing dedicada (SSO, compliance, self-hosted, SLA)
- ✅ **P1** — CRM simples: salvar leads do `/contato` no banco (tabela `SalesLead`)

#### Conteúdo
- ✅ **P1** — Artigo: "Como Criar uma Plataforma de IA White-label para Seus Clientes"
- ✅ **P1** — Artigo: "O que é White-label de IA e Como Funciona"
- ✅ **P2** — Página `/parceiros` (programa de parceiros com tiers: Bronze/Silver/Gold)

---

## Sprint 9 — Distribuição + API Pública (Semana 25-28)

**Objetivo**: Converter produto maduro em tráfego e integrações — conteúdo Camada 3, API REST pública, docs e canais de distribuição ativos

### Conteúdo SEO Camada 3 — Verticais específicas (5 artigos)
- ✅ **P0** — "IA para o Mercado Imobiliário: Como Corretores Estão Usando em 2026"
- ✅ **P0** — "Inteligência Artificial na Saúde: Casos de Uso Reais sem Risco"
- ✅ **P1** — "IA para Finanças e Contabilidade: Automatize sem Substituir o Contador"
- ✅ **P1** — "IA na Educação: Como Escolas e EdTechs Estão Usando Agentes IA"
- ✅ **P1** — "IA para Logística e Supply Chain: Reduza Erros e Ganhe Velocidade"

### API Pública v1 (produto)
- ✅ **P0** — `GET /api/public/orchestrations` — lista orquestrações do usuário (auth: X-API-Key)
- ✅ **P0** — `POST /api/public/orchestrations/:id/run` — executa orquestração via API
- ✅ **P0** — `GET /api/public/agents` — lista agentes do usuário (auth: X-API-Key)
- ✅ **P1** — Página `/docs` — quick start + API reference (MDX, server component)
- ⬜ **P2** — OpenAPI/Swagger spec em `/api/docs/openapi.json`

### Distribuição (não-técnico — tarefas manuais)
- ⬜ **P0** — Newsletter semanal: template HTML + primeiras 2 edições via Resend
- ⬜ **P0** — LinkedIn: estratégia founder brand (3 posts/semana)
- ⬜ **P1** — YouTube: setup canal + 1 vídeo demo (orquestração ao vivo)
- ⬜ **P2** — Submeter para 2 eventos de IA no Brasil (palestras/workshops)
