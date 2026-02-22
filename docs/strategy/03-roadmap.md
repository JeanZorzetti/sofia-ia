# Sofia — Roadmap Executável

> Última atualização: 22/02/2026
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
- ⬜ Discord/Slack para usuários
- ✅ Documentação open-source (docs.sofia.ai)
- ✅ Program de early adopters

---

## Sprint 7 — Comunidade + Diferencial Técnico (Semana 17-20)

**Objetivo**: Atingir KPIs de Mês 6-12 — Discord ativo, 50+ artigos, AI-Assisted Orchestration como diferencial técnico central

### Comunidade (Longo Prazo — Mês 4, atrasado)
- ✅ **P0** — Página pública `/comunidade` (Discord, GitHub, Early Access, newsletter)
- ✅ **P0** — Links de comunidade no footer e navbar do site
- ⬜ **P1** — Discord server ativo com canais: #geral, #ajuda, #showcase, #feedback
- ⬜ **P1** — Atualizar CONTRIBUTING.md com guia para primeiros contributors

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
