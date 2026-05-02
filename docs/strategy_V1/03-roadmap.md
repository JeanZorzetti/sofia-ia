# Polaris IA — Roadmap Executável

> Última atualização: 25/02/2026
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
- ✅ **P0** — Artigo comparativo: "Polaris IA vs CrewAI vs AutoGen vs LangFlow"
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

O white-label permite que agências, consultorias e ISVs distribuam Polaris IA com sua própria marca para seus clientes, operando como um canal de vendas indireto da ROI Labs.

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

---

## Sprint 10 — Retenção + Visibilidade (Semana 29-32)

**Objetivo**: Desbloquear adoção da API, dar visibilidade interna de KPIs e alcançar 50+ artigos publicados

### Produto (desbloqueia Sprint 9)
- ✅ **P0** — Página `/dashboard/api-keys` — criar, listar, revogar API Keys (sem isso a API pública é inutilizável)
- ✅ **P0** — APIs de suporte: `GET/POST /api/user/api-keys`, `DELETE /api/user/api-keys/:id`

### Painel Admin (KPIs do fundador)
- ✅ **P0** — `/admin/metrics` — signups/dia, plano de cada usuário, MRR estimado, últimos logins

### Newsletter
- ✅ **P1** — Template HTML responsivo Polaris IA (pronto para Resend)
- ✅ **P1** — `POST /api/admin/newsletter/send` — envio para lista de assinantes (admin only)

### Conteúdo SEO (atingir 50+ artigos)
- ✅ **P1** — 11 artigos SEO novos (verticais: varejo, turismo, agro, construção, RH avançado, e mais)

---

## Sprint 11 — Launch + Integrações Externas (Semana 33-36)

**Objetivo**: Converter produto maduro em tração real — ProductHunt launch, página de integrações, OpenAPI spec e posicionamento nos canais de distribuição

### Produto
- ✅ **P2** — OpenAPI 3.0 spec em `GET /api/docs/openapi.json` (documentação da API pública v1)
- ✅ **P1** — Página pública `/integrations` (Zapier, n8n, Make, API direta — guia de como conectar)

### Distribuição
- ✅ **P0** — Assets ProductHunt: copy completo, tagline, descrição, FAQ, imagens-guia em `docs/listings/producthunt-launch.md`
- ✅ **P0** — Submeter e lançar no ProductHunt (tarefa manual)
- ⬜ **P0** — Newsletter: enviar 2 primeiras edições reais via Resend (tarefa manual)
- ⬜ **P1** — LinkedIn: estratégia founder brand — 3 posts/semana (tarefa manual)
- ⬜ **P2** — YouTube: setup canal + 1 vídeo demo (tarefa manual)

---

## Sprint 12 — Crescimento Orgânico + Conversão (Semana 37-40)

**Objetivo**: Transformar produto maduro em crescimento mensurável — analytics real, onboarding mais eficaz, novos templates de orquestração e cadência de distribuição ativa

### Produto (desbloqueadores de conversão)
- ✅ **P0** — Google Analytics 4 no site público (medir tráfego orgânico real)
- ✅ **P0** — Barra de uso de plano visível no dashboard (agentes, msgs, KBs usados vs limite)
- ✅ **P1** — Melhoria no onboarding: step "Experimente agora" com orquestração de demo pré-carregada
- ✅ **P1** — 5 novos templates de orquestração (verticais: jurídico, RH, e-commerce, saúde, finanças)
- ✅ **P2** — Página `/changelog` pública (histórico de features — gera conteúdo SEO e credibilidade)

### SEO — Camada 2 (criar demanda, intenção comercial)
- ✅ **P0** — "Como Automatizar Atendimento ao Cliente com IA em 2026"
- ✅ **P0** — "Multi-agente vs Single-agente: Quando Usar Cada Abordagem"
- ✅ **P1** — "Como Criar Workflows de IA sem Programar"
- ✅ **P1** — "Polaris IA vs n8n vs Zapier: Qual Usar para Automação com IA?"
- ✅ **P2** — "10 Prompts de Sistema para Agentes IA de Alta Performance"

### Distribuição (manual)
- ⬜ **P0** — Newsletter: enviar edições 1 e 2 reais (Resend + lista de assinantes)
- ⬜ **P0** — LinkedIn: primeiros 10 posts do founder brand (estratégia + execução)
- ⬜ **P1** — YouTube: setup canal + 1 vídeo demo de orquestração ao vivo
- ✅ **P2** — Google Search Console + Bing Webmaster Tools configurados

---

## Sprint 13 — Auth + Webhooks + Afiliados (Semana 41-44)

**Objetivo**: Aumentar conversão reduzindo fricção de entrada (Google OAuth), aumentar retenção com integrações de output (webhooks) e abrir canal viral de aquisição (afiliados)

### Produto — Auth (conversão de signup)
- ✅ **P0** — Google OAuth via next-auth: "Entrar com Google" nas páginas de login e cadastro
- ✅ **P0** — Bridge OAuth → JWT existente (login social cria/encontra user no DB e emite cookie JWT)
- ✅ **P1** — Botão "Continuar com Google" no onboarding wizard (step 1)

### Produto — Webhooks de Output (retenção + integração)
- ✅ **P0** — Config de output em orquestrações: webhook URL, email, Slack webhook
- ✅ **P0** — Disparar webhook/email/Slack ao final de cada execução bem-sucedida
- ✅ **P1** — UI de configuração de outputs no editor de orquestração
- ✅ **P1** — Histórico de disparos (enviado, falhou, retry)

### Produto — Afiliados (aquisição viral)
- ✅ **P1** — Página pública `/afiliados` (landing com benefícios, comissão e CTA para se inscrever)
- ✅ **P1** — Link rastreável por usuário (ref=USER_ID nos CTAs do dashboard e sidebar)
- ✅ **P2** — Contador de indicações no perfil do usuário

### SEO — Camada 2/3 (cadência mensal)
- ✅ **P0** — "Como Integrar Agentes IA com Slack, Email e Webhooks"
- ✅ **P0** — "Programa de Afiliados de IA: Como Ganhar Indicando Polaris IA"
- ✅ **P1** — "Google Login vs Email/Senha: Por que Login Social Aumenta Conversão"
- ✅ **P1** — "Como Usar a API do Polaris IA: Guia para Desenvolvedores"
- ✅ **P2** — "Automação com Slack e IA: Notificações Inteligentes para Times"

---

## Sprint 14 — OG Images (Semana 45-48)

**Objetivo**: Maximizar CTR em redes sociais e IA generativa com OG images dinâmicas e visualmente ricas — cada página pública e artigo do blog gera uma imagem de preview única, com branding consistente

### SEO / GEO técnico — OG Images

#### Infraestrutura
- ✅ **P0** — Setup `next/og` (`ImageResponse`) via `opengraph-image.tsx` por rota — base de toda geração dinâmica
- ✅ **P0** — OG image padrão do site (`/opengraph-image.tsx`) — 1200×630, branding + tagline + planos

#### Páginas públicas
- ✅ **P0** — OG dinâmica para a Home (`/`) — título, tagline e branding Polaris IA
- ✅ **P0** — OG dinâmica para artigos do blog (`/blog/[slug]`) — título do artigo + autor + data + logo
- ✅ **P1** — OG dinâmica para páginas de feature (`/features/orchestrations`, `/templates`) — ícone + título da feature
- ✅ **P1** — OG dinâmica para `/afiliados`, `/whitelabel`, `/enterprise` — headline + benefício principal

#### Validação e distribuição
- ✅ **P1** — Testar todas as OGs com og:debugger do Facebook e Twitter Card Validator (manual pós-deploy)
- ✅ **P1** — Garantir `twitter:card=summary_large_image` em todas as páginas públicas (`layout.tsx` global + páginas individuais)
- ✅ **P2** — OG personalizada para o `og:image` do `/changelog` (versão + features destaque)

### SEO — Camada 2/3 (cadência mensal, 5 artigos)
- ✅ **P0** — "O que é Open Graph e Por que Importa para SEO e IA Generativa"
- ✅ **P0** — "Como o ChatGPT e Perplexity Escolhem Fontes: Guia GEO para Fundadores"
- ✅ **P1** — "Checklist de SEO Técnico para SaaS em 2026: do sitemap ao OG"
- ✅ **P1** — "Multi-agente vs RAG: Quando Usar Cada Abordagem de IA"
- ✅ **P2** — "Como Construir um Pipeline de Geração de Conteúdo com Agentes IA"

---

## Sprint 15 — Developer Platform + Execuções Agendadas + Agent Memory (Semana 49-52)

**Objetivo**: Transformar Polaris IA de web app em plataforma — API pública real com auth por API key, SDK npm, agendamento de orquestrações (cron), e memória persistente de agentes entre sessões. Estes são os três desbloqueadores de enterprise, integrações nativas e retenção de longo prazo.

### Produto — API Pública v1 (developer platform)

#### API Keys
- ✅ **P0** — Tela `/dashboard/api-keys`: criar, listar, revogar API keys (com scope: read/execute)
- ✅ **P0** — Middleware de auth por `Authorization: Bearer sk-xxx` nas rotas `/api/v1/*`
- ✅ **P0** — Rate limiting por API key (plano Free: 100 req/dia, Pro: 1000/dia, Business: 10k/dia)
- ✅ **P1** — Log de uso por API key (timestamp, endpoint, status) no dashboard

#### Endpoints v1
- ✅ **P0** — `POST /api/v1/orchestrations/:id/execute` — executar orquestração via API, retorna `{ executionId }`
- ✅ **P0** — `GET /api/v1/executions/:id` — consultar status/resultado de execução (`pending | running | done | failed`)
- ✅ **P0** — `POST /api/v1/agents/:id/chat` — enviar mensagem a um agente, retorna resposta completa
- ✅ **P1** — `GET /api/v1/orchestrations` — listar orquestrações do tenant (para integradores)
- ✅ **P1** — `GET /api/v1/agents` — listar agentes do tenant

#### HMAC de Webhooks
- ✅ **P1** — Assinar todos os payloads de webhook de output com `X-Polaris IA-Signature: sha256=xxx`
- ✅ **P1** — Documentar verificação de assinatura na página `/docs/api`

### Produto — Execuções Agendadas (cron)

- ✅ **P0** — Campo "Agendar execução" no editor de orquestração (cron expression ou preset: diário/semanal/mensal)
- ✅ **P0** — Schema Prisma: `ScheduledExecution` (orchestrationId, cronExpr, nextRunAt, lastRunAt, status)
- ✅ **P0** — API route `POST /api/cron/scheduled-executions` protegida por `CRON_SECRET` (chamada pelo Vercel Cron)
- ✅ **P0** — `vercel.json` com cron job `0 * * * *` (a cada hora, dispara execuções pendentes)
- ✅ **P1** — Histórico de execuções agendadas no dashboard (data, status, output snippet)
- ✅ **P2** — Notificação por email ao término de execução agendada (Resend)

### Produto — Agent Memory (contexto persistente entre sessões)

- ✅ **P0** — Schema Prisma: `AgentMemory` (agentId, userId, key, value, updatedAt) — armazena fatos sobre o usuário
- ✅ **P0** — Tool `save_memory(key, value)` disponível para agentes: salva no `AgentMemory` durante a conversa
- ✅ **P0** — Tool `recall_memory(key?)` disponível para agentes: busca fatos salvos anteriormente
- ✅ **P0** — Injetar memórias relevantes no system prompt do agente a cada nova conversa (top-5 por recência)
- ✅ **P1** — Tela `/dashboard/agents/:id/memory` — visualizar e editar memórias do agente por usuário
- ✅ **P1** — Opção "Habilitar Memory" no editor de agente (on/off por agente)
- ✅ **P2** — Limite de memórias por plano (Free: 20 fatos, Pro: 200, Business: ilimitado)

### Developer Experience

- ✅ **P0** — Página pública `/docs/api` com exemplos cURL + JavaScript de todos os endpoints v1
- ✅ **P1** — npm package `sofia-ai`: SDK TypeScript com `SofiaClient.execute()`, `.chat()`, `.getExecution()`
- ✅ **P1** — Publicar `sofia-ai` no npm (versão 0.1.0) — README com quickstart
- ✅ **P2** — Snippet de code no dashboard: "Use sua orquestração via API" (copia direto da UI)

### SEO — Camada 2/3 (cadência mensal, 5 artigos)
- ✅ **P0** — "Como Agendar Execuções de IA: Automatize Relatórios e Conteúdo com Cron Jobs"
- ✅ **P0** — "Agent Memory: Como Dar Memória Persistente ao Seu Agente IA"
- ✅ **P1** — "Como Usar a API REST do Polaris IA: Guia Completo com Exemplos"
- ✅ **P1** — "SDK JavaScript para Agentes IA: Integrando Polaris IA em Qualquer Aplicação"
- ✅ **P2** — "Webhook Seguro com HMAC: Verificando Assinaturas de Notificações IA"

---

## Sprint 16 — Teams & Organizations + Audit Log + Integrações Nativas (Semana 53-56)

**Objetivo**: Desbloquear enterprise e B2B real — workspaces multi-membro com RBAC, audit log para compliance, e conectores nativos para Zapier/Make/n8n. Estes são os três desbloqueadores do plano macro "Longuíssimo Prazo": enterprise features, integration marketplace e expansão de ticket médio via seats.

### Produto — Organizations & Teams

#### Schema e infraestrutura
- ✅ **P0** — Model `Organization` (id, name, slug, plan, createdAt) + `OrganizationMember` (orgId, userId, role: ADMIN | MEMBER | VIEWER, invitedAt, joinedAt)
- ✅ **P0** — Todos os resources existentes (agents, orchestrations, knowledgeBases, conversations) recebem campo `organizationId` opcional — backward-compat: recursos sem org pertencem ao usuário pessoal
- ✅ **P0** — Middleware `getOrgContext()`: resolve workspace ativo da requisição (header ou cookie `x-org-id`)
- ✅ **P0** — Todas as queries de listagem passam a filtrar por `organizationId` quando workspace org está ativo

#### Invite & onboarding
- ✅ **P0** — `POST /api/organizations` — criar nova org
- ✅ **P0** — `POST /api/organizations/[slug]/invites` — convidar membro por email (envia email via Resend com link de aceite)
- ✅ **P0** — `GET /api/organizations/invites/accept?token=xxx` — aceitar convite, cria OrganizationMember
- ✅ **P1** — `PATCH /api/organizations/[slug]/members/[userId]` — alterar role (só ADMIN)
- ✅ **P1** — `DELETE /api/organizations/[slug]/members/[userId]` — remover membro

#### Dashboard de equipe
- ✅ **P0** — Página `/dashboard/settings/team` — listar membros, pendentes, botão convidar, alterar role, remover
- ✅ **P0** — Seletor de workspace na sidebar (pessoal ↔ organizações) — persiste em localStorage
- ✅ **P1** — Página `/dashboard/settings/organization` — nome, slug, plano da org, danger zone (deletar org)
- ✅ **P2** — Badge de role visível no perfil do usuário dentro do contexto da org

#### RBAC enforcement
- ✅ **P1** — ADMIN: tudo. MEMBER: criar/editar/usar recursos. VIEWER: apenas leitura (GET), sem criar/editar/deletar
- ✅ **P1** — Helper `checkOrgPermission(userId, orgId, action)` reutilizado em todas as rotas sensíveis

### Produto — Audit Log

- ✅ **P0** — Model `UserAuditLog` (id, userId, orgId?, action, resource, resourceId, metadata JSON, ip, userAgent, createdAt)
- ✅ **P0** — Helper `logAudit(action, resource, resourceId, metadata)` chamado nos eventos críticos:
  - agent: created, updated, deleted
  - orchestration: executed, scheduled, deleted
  - knowledgeBase: created, uploaded, deleted
  - member: invited, joined, removed, role_changed
  - apiKey: created, revoked
  - billing: plan_changed
- ✅ **P1** — Página `/dashboard/audit-log` — tabela com filtros por ação, resource, usuário, período
- ✅ **P2** — Export CSV do audit log (últimos 90 dias)

### Produto — Integrações Nativas

#### Zapier & Make
- ✅ **P0** — Endpoint de trigger para Zapier: `GET /api/v1/integrations/zapier/poll` — retorna execuções recentes (polling trigger)
- ✅ **P0** — Endpoint de action para Zapier: `POST /api/v1/integrations/zapier/execute` — executa orquestração (action)
- ✅ **P0** — Página pública `/integrations/zapier` — guia de setup passo-a-passo com screenshots descritivos
- ✅ **P1** — Página pública `/integrations/make` — guia de setup para Make (Integromat) com webhook
- ✅ **P1** — Página pública `/integrations/n8n` — guia de setup para n8n com HTTP Request node

#### Página hub de integrações
- ✅ **P1** — Atualizar `/integrations` existente com cards visuais para Zapier, Make, n8n, API direta, Slack, Email
- ⬜ **P2** — Página `/integrations/slack` — como configurar bot Slack recebendo outputs de orquestrações

### SEO — Camada 2/3 (cadência mensal, 5 artigos)
- ✅ **P0** — "Como Criar Workspace de IA para seu Time: Guia de Multi-usuário em Polaris IA"
- ✅ **P0** — "Zapier + IA: Como Automatizar Workflows com Agentes de IA sem Código"
- ✅ **P1** — "RBAC em SaaS: Por que Controle de Acesso por Papel é Essencial para Enterprise"
- ✅ **P1** — "Audit Log em Aplicações IA: Compliance, Segurança e Rastreabilidade"
- ✅ **P2** — "Make vs Zapier vs n8n: Qual Plataforma de Automação Usar com IA em 2026"

---

## Sprint 17 — Plugin Ecosystem + Agent-to-Agent + CRM Integrations (Semana 57-60)

**Objetivo**: Três moats técnicos do macro executados em paralelo — plugin ecosystem (extensibilidade para power users e devs), agent-to-agent protocol (diferencial técnico único no mercado BR) e conectores nativos para HubSpot e Salesforce (integration marketplace, stickiness enterprise). Completa a visão "Longuíssimo Prazo" de plataforma extensível.

### Produto — Plugin Ecosystem (custom tools/nodes)

#### Infraestrutura
- ✅ **P0** — Schema Prisma: `AgentPlugin` (id, agentId, name, description, code: String, inputSchema: Json, enabled: Boolean)
- ✅ **P0** — Execução sandboxed de plugins via `vm2` ou edge function com timeout de 5s e acesso restrito (sem fs, sem net)
- ✅ **P0** — Tool `run_plugin(pluginName, input)` injetada automaticamente em agentes com plugins habilitados
- ✅ **P0** — Validação de schema do plugin antes de salvar (código sintaxe JS válida)

#### UI no editor de agente
- ✅ **P0** — Aba "Plugins" no editor de agente — lista plugins, botão "Novo Plugin"
- ✅ **P0** — Editor de plugin: nome, descrição, input schema (JSON Schema), código JavaScript da função
- ✅ **P0** — Botão "Testar Plugin" — executa com input de exemplo, exibe output/erro em tempo real
- ✅ **P1** — Templates de plugins prontos: calculadora, buscador de CEP, formatter de data, gerador de slug
- ✅ **P1** — Limite de plugins por plano (Free: 2, Pro: 10, Business: ilimitado)

#### Rotas de API
- ✅ **P0** — `GET/POST /api/agents/[id]/plugins` — listar e criar plugins
- ✅ **P0** — `PATCH/DELETE /api/agents/[id]/plugins/[pluginId]` — editar e remover
- ✅ **P1** — `POST /api/agents/[id]/plugins/[pluginId]/test` — testar com input JSON

### Produto — Agent-to-Agent Protocol

#### Conceito e schema
- ✅ **P0** — Tool `delegate_to_agent(agentId, message, context?)` disponível em todos os agentes — chama outro agente e retorna resposta
- ✅ **P0** — Schema Prisma: `AgentDelegation` (id, fromAgentId, toAgentId, message, response, status, createdAt) — rastreia todas as delegações
- ✅ **P0** — Proteção anti-loop: máximo 3 níveis de delegação aninhada por execução (evitar loops infinitos)
- ✅ **P0** — A delegação respeita o system prompt e memória do agente chamado

#### Orquestração melhorada
- ✅ **P1** — No editor de orquestração, cada nó de agente pode configurar "Sub-agentes disponíveis para delegação"
- ✅ **P1** — Histórico de delegações visível no painel de execução (quem delegou para quem, input/output)
- ✅ **P1** — Logs de delegação no audit log (`agent.delegated`)

#### Página de docs
- ✅ **P2** — Seção em `/docs/api` explicando agent-to-agent: como configurar, exemplos de uso, limites

### Produto — CRM Integrations (HubSpot + Salesforce)

#### HubSpot
- ✅ **P0** — `GET/POST /api/integrations/hubspot/connect` — OAuth flow para conectar conta HubSpot
- ✅ **P0** — Tool `hubspot_create_contact(email, name, properties?)` injetável em agentes conectados ao HubSpot
- ✅ **P0** — Tool `hubspot_get_contact(email)` — busca contato no HubSpot
- ✅ **P1** — Tool `hubspot_create_deal(name, stage, amount, contactId)` — cria deal no CRM
- ✅ **P1** — Página `/dashboard/integrations/hubspot` — conectar OAuth, status da conexão, testar tools

#### Salesforce
- ✅ **P1** — `GET/POST /api/integrations/salesforce/connect` — OAuth 2.0 flow (Connected App)
- ✅ **P1** — Tool `salesforce_create_lead(firstName, lastName, email, company)` injetável em agentes
- ✅ **P1** — Tool `salesforce_query(soql)` — executa SOQL query (read-only) e retorna resultados
- ✅ **P2** — Página `/dashboard/integrations/salesforce` — conectar OAuth, status, testar tools

#### Infraestrutura OAuth shared
- ✅ **P0** — Schema Prisma: `OAuthConnection` (id, userId, provider, accessToken, refreshToken, expiresAt, metadata Json)
- ✅ **P0** — Helper `getOAuthConnection(userId, provider)` — busca e auto-renova token se expirado

### Produto — Docs & Guides

- ✅ **P0** — Página `/docs` — hub central com links para todas as seções de documentação
- ✅ **P0** — Página `/docs/getting-started` — guia de início rápido: criar agente → orquestração → executar via API
- ✅ **P1** — Página `/docs/plugins` — como criar e usar plugins em agentes
- ✅ **P1** — Página `/docs/agent-to-agent` — como usar delegação entre agentes
- ✅ **P2** — Link "Docs" no menu de navegação público (entre Blog e API)

### SEO — Camada 2/3 (cadência mensal, 5 artigos)
- ✅ **P0** — "Plugin Ecosystem: Como Estender Agentes IA com Funções JavaScript Personalizadas"
- ✅ **P0** — "Agent-to-Agent: Como Agentes IA se Comunicam e Delegam Tarefas Entre Si"
- ✅ **P1** — "HubSpot + IA: Como Automatizar seu CRM com Agentes Inteligentes"
- ✅ **P1** — "Salesforce + Agentes IA: Qualificação de Leads e Criação de Leads Automáticos"
- ✅ **P2** — "O que é Integration Marketplace: Como Plataformas de IA se Tornam Ecosistemas"

---

## Sprint 18 — SSO + AI Magic Create + PWA + i18n ES (Semana 61-64)

**Objetivo**: Fechar o roadmap macro completo — SSO fecha o ciclo enterprise (RBAC+Audit+SSO), "Magic Create" é o diferencial explícito do macro ("descreva seu processo → Polaris IA cria a orquestração"), PWA entrega o mobile companion app, e i18n ES abre o mercado Latam (3x Brasil).

### Produto — SSO (Enterprise Sign-On)

#### Google Workspace SSO
- ✅ **P0** — Configuração OAuth 2.0 para Google Workspace: callback `/api/auth/sso/google/callback`
- ✅ **P0** — Tela `/dashboard/settings/sso` — ativar SSO por domínio (ex: @empresa.com.br), colar Client ID + Secret
- ✅ **P0** — Schema: campo `ssoProvider String?` + `ssoDomain String?` + `ssoClientId/Secret` no model `Organization`
- ✅ **P0** — Middleware: se usuário tenta login com email do domínio SSO → redireciona para IdP automaticamente
- ✅ **P1** — Forçar SSO por org (toggle "Exigir SSO — bloquear login email/senha para membros")

#### Microsoft Entra ID (Azure AD)
- ✅ **P1** — OAuth 2.0 flow para Microsoft: callback `/api/auth/sso/microsoft/callback`
- ✅ **P1** — Mesmo modelo de configuração por domínio + toggle obrigatório
- ⬜ **P2** — Página `/docs/sso` — guia de configuração passo-a-passo para Google Workspace e Azure AD

### Produto — AI Magic Create (Diferencial do Macro)

> "AI-assisted orchestration creation: descreva seu processo" — explicitamente listado como **Diferencial** no planejamento macro.

#### Core
- ✅ **P0** — Endpoint `POST /api/orchestrations/magic-create` — recebe `{ description: string }`, usa LLM para gerar estrutura completa da orquestração: nome, lista de agentes (nome, systemPrompt, modelo), conexões entre eles
- ✅ **P0** — Prompt de sistema especializado em criar orquestrações: extrai etapas do processo, define papéis dos agentes, nomeia cada um, gera system prompts iniciais
- ✅ **P0** — Salva automaticamente a orquestração + agentes gerados no banco, retorna ID da orquestração criada
- ⬜ **P0** — Streaming SSE: envia eventos de progresso ("Criando agente Pesquisador...", "Configurando conexões...") para feedback visual

#### UI
- ✅ **P0** — Botão "✨ Criar com IA" na página `/dashboard/orchestrations` — abre modal (já existia, novo modal criado)
- ✅ **P0** — Modal `MagicCreateModal`: textarea "Descreva o processo que você quer automatizar" + exemplos de prompt
- ✅ **P0** — Loading com steps visíveis durante geração (animação de mensagens)
- ✅ **P1** — Preview da orquestração gerada antes de salvar (lista agentes + botão "Abrir Orquestração")
- ✅ **P1** — Botão "Tentar outro" para nova versão com o mesmo prompt
- ⬜ **P2** — Galeria de prompts de exemplo ("Qualificação de leads", "Pipeline de conteúdo", "Suporte ao cliente")

### Produto — PWA (Mobile Companion App)

- ✅ **P0** — `public/manifest.json` — nome, ícones 192x192 + 512x512, theme_color, display: standalone
- ✅ **P0** — Meta tags PWA no `layout.tsx`: `apple-mobile-web-app-capable`, `theme-color`, `viewport`
- ✅ **P0** — Service worker `public/sw.js` manual — cache de assets estáticos + offline fallback
- ✅ **P0** — Ícone "Instalar App" no header do dashboard (detecta `beforeinstallprompt`, exibe botão)
- ✅ **P1** — Página offline (`/offline`) — exibe quando sem conexão
- ⬜ **P1** — Push notifications via Web Push API para execuções agendadas concluídas
- ⬜ **P2** — Página `/dashboard/mobile` — QR code para instalar + instruções iOS/Android

### Produto — i18n ES (Expansão Latam)

- ✅ **P0** — Arquivos de tradução `src/lib/i18n/` — pt.ts, es.ts, en.ts (sem dependência next-intl)
- ✅ **P0** — Arquivo de tradução ES — todas as strings da landing page, pricing, features, nav, footer
- ✅ **P0** — Arquivo EN — tradução completa
- ✅ **P0** — Seletor de idioma no footer do site público (bandeiras 🇧🇷/🇪🇸/🇺🇸)
- ✅ **P1** — Rota `/es` — landing page completa em espanhol
- ✅ **P1** — Meta tags `hreflang` em `/es` e `/es/precios` para SEO multilíngue
- ✅ **P2** — Landing page `/es` otimizada para "plataforma de orquestación de agentes IA" (Latam SEO)

### SEO — Camada 2/3 (cadência mensal, 5 artigos)
- ✅ **P0** — "SSO para SaaS: Como Implementar Single Sign-On com Google Workspace e Azure AD"
- ✅ **P0** — "Como Criar Workflows de IA Descrevendo em Linguagem Natural (AI Magic Create)"
- ✅ **P1** — "PWA vs App Nativo: Por que Progressive Web Apps são o Futuro do SaaS Mobile"
- ✅ **P1** — "Expansão Latam para SaaS: Por que Espanhol é a Próxima Fronteira da IA no Brasil"
- ✅ **P2** — "Polaris IA en Español: La Plataforma de Orquestación de Agentes IA para Latinoamérica"

---

## Sprint 19 — ERP Integrations + Beta Program + Open-Source Governance + GEO Avançado (Semana 65-68)

**Objetivo**: Sprint de encerramento do planejamento macro original (24 meses). Cobre os últimos 4 itens buildáveis restantes: ERP fecha o trio do integration marketplace (HubSpot ✅, Salesforce ✅, ERP ⬜), beta program formaliza o canal de early adopters, open-source governance cria o moat de comunidade, e GEO avançado persegue o KPI "Polaris IA em 5+ respostas de LLMs".

### Produto — ERP Integrations (Google Sheets + Notion + Totvs)

#### Google Sheets
- ✅ **P0** — OAuth Google (`google.com`) reutilizando `OAuthConnection` já existente — scope: `spreadsheets`
- ✅ **P0** — `src/app/api/integrations/google-sheets/connect/route.ts` — inicia OAuth (Google Sheets scope)
- ✅ **P0** — `src/app/api/integrations/google-sheets/callback/route.ts` — troca code, salva em `OAuthConnection`
- ✅ **P0** — Tool `sheets_read(spreadsheetId, range)` — lê células da planilha via Google Sheets API v4
- ✅ **P0** — Tool `sheets_write(spreadsheetId, range, values)` — escreve/atualiza células
- ✅ **P0** — Tool `sheets_append(spreadsheetId, sheetName, row)` — adiciona nova linha
- ✅ **P1** — Página `/dashboard/integrations/google-sheets` — conectar OAuth, status, testar tools, casos de uso

#### Notion
- ✅ **P0** — Integração via Notion API (OAuth ou Integration Token — sem Google OAuth, usa própria auth do Notion)
- ✅ **P0** — `src/app/api/integrations/notion/connect/route.ts` — OAuth Notion (`notion.com`)
- ✅ **P0** — Tool `notion_create_page(databaseId, properties)` — cria página em database do Notion
- ✅ **P0** — Tool `notion_query_database(databaseId, filter?)` — busca páginas com filtro opcional
- ✅ **P1** — Tool `notion_update_page(pageId, properties)` — atualiza página existente
- ✅ **P1** — Página `/dashboard/integrations/notion` — conectar, status, testar tools

#### Totvs (ERP BR)
- ✅ **P1** — Integração via Totvs Fluig/TOTVS Protheus API REST
- ✅ **P1** — Tool `totvs_get_customer(code)` — busca cliente no Protheus
- ✅ **P1** — Tool `totvs_create_order(customerId, items)` — cria pedido de venda
- ✅ **P2** — Página `/dashboard/integrations/totvs` — configurar URL da API + credenciais, testar conexão

#### Atualizar hub de integrações
- ✅ **P0** — Adicionar cards Google Sheets, Notion, Totvs na seção "Plataformas de Automação" de `/dashboard/integrations`

### Produto — Beta Program (Early Adopters)

- ✅ **P0** — Schema Prisma: `BetaApplication` (id, userId?, name, email, company, useCase, plan, status: pending|approved|rejected, createdAt)
- ✅ **P0** — Página pública `/beta` — landing de candidatura: headline "Seja um Early Adopter", formulário (nome, empresa, caso de uso, plano desejado), CTA "Candidatar-se"
- ✅ **P0** — `POST /api/beta/apply` — salva candidatura, envia email de confirmação via Resend
- ✅ **P1** — Página admin `/dashboard/admin/beta` — lista candidaturas, botões aprovar/rejeitar, email automático ao aprovar (com link de acesso)
- ✅ **P1** — Badge "Beta Tester" no perfil de usuários aprovados (campo `isBetaTester Boolean` no model `User`)
- ✅ **P1** — Canal privado de feedback: link para Discord #beta no email de aprovação
- ✅ **P2** — Widget de feedback flutuante no dashboard para beta testers (botão "Enviar Feedback" com modal textarea → salva em tabela `BetaFeedback`)

### Open-Source Governance

- ✅ **P0** — `GOVERNANCE.md` na raiz do repo — estrutura de decisão (Benevolent Dictator, como propor RFCs, processo de merge)
- ✅ **P0** — `.github/ISSUE_TEMPLATE/bug_report.yml` — template de bug report com campos: descrição, passos para reproduzir, comportamento esperado, ambiente
- ✅ **P0** — `.github/ISSUE_TEMPLATE/feature_request.yml` — template de feature request com campos: problema, solução proposta, alternativas, contexto
- ✅ **P0** — `.github/PULL_REQUEST_TEMPLATE.md` — checklist: descrição, tipo de mudança, testes, screenshots
- ✅ **P1** — `.github/ISSUE_TEMPLATE/config.yml` — configurar templates + link para Discord para suporte
- ✅ **P1** — `SECURITY.md` — política de disclosure responsável (vulnerabilidades: email direto, SLA de resposta)
- ✅ **P1** — `docs/RFC-PROCESS.md` — como propor grandes mudanças via RFC (Request for Comments)
- ✅ **P2** — Atualizar `README.md` com badge "Good First Issues" + link para `GOVERNANCE.md`

### GEO Avançado (Generative Engine Optimization)

> Objetivo do macro: "Polaris IA aparecendo em 5+ respostas de LLMs sobre multi-agent platforms"

- ✅ **P0** — `public/llms.txt` — arquivo de contexto para LLMs seguindo o padrão llms.txt: descrição da plataforma, features principais, links canônicos, FAQ
- ✅ **P0** — JSON-LD structured data em todas as páginas públicas — `SoftwareApplication`, `WebSite`, `BreadcrumbList`
- ✅ **P0** — FAQ schema (`FAQPage` JSON-LD) nas páginas `/`, `/features/orchestrations`, `/templates`, `/enterprise` — perguntas reais sobre multi-agent AI
- ✅ **P1** — `public/robots.txt` atualizado — `Allow` para todos os crawlers de LLMs conhecidos (GPTBot, ClaudeBot, PerplexityBot, etc.)
- ✅ **P1** — Página `/sobre` (About) com schema `Organization` + fundador + missão — aumenta autoridade para LLMs
- ✅ **P1** — Seção "Como funciona" com schema `HowTo` na landing page — descrição passo-a-passo que LLMs citam
- ✅ **P2** — `sitemap.xml` incluindo todas as novas páginas ES (`/es/*`) e docs (`/docs/*`)

### SEO — Camada 2/3 (cadência mensal, 5 artigos)
- ✅ **P0** — "Google Sheets + IA: Como Ler e Escrever Planilhas com Agentes Inteligentes"
- ✅ **P0** — "Notion + Agentes IA: Automatize sua Base de Conhecimento com Polaris IA"
- ✅ **P1** — "O que é llms.txt: O Novo Padrão para Otimizar Sites para IA Generativa"
- ✅ **P1** — "Como Criar um Programa de Beta Testers para seu SaaS: Guia Completo"
- ✅ **P2** — "Open Source Governance: Como Estruturar Contribuição em Projetos de IA"
