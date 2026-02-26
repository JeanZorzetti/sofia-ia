# Roadmap V3 — Sprints de Growth & Revenue

> Formato: Sprints de ~2 semanas. Cada sprint tem hipotese, acoes e metricas.
> Prioridade: Revenue > Distribution > Product > Tech Debt

---

## Sprint 1 — Security + Analytics Foundation ✅ CONCLUIDO

**Hipotese:** Sem tracking, todas as decisoes sao no escuro. Sem security fix, o repo publico e um risco.
**Bloqueia:** Tudo (nao da para medir growth sem analytics, nao da para escalar com credenciais expostas).

### Tarefas Tecnicas
| # | Tarefa | Prioridade | Esforco | Status |
|---|--------|------------|---------|--------|
| 1.1 | Remover credenciais hardcoded de `auth.ts` (fallback users) | P0 | 1h | ✅ FEITO — array USERS removido, auth DB-only |
| 1.2 | Verificar API key storage (hash vs plaintext no DB) | P0 | 2h | ✅ FEITO — plaintext confirmado, risco documentado, migration adiada |
| 1.3 | Implementar tracking de eventos expandido em `analytics.ts` | P0 | 4h | ✅ FEITO — 25 eventos AARRR, Events const, isFirstEvent helper |
| 1.4 | Configurar GA4 com funnels (visit→signup→active→paid) | P0 | 2h | ⏭️ SKIP — GA4 requer frontend snippet; priorizar após primeiro signup |
| 1.5 | Configurar alertas Sentry (error rate, billing webhook failed) | P1 | 2h | ⏭️ PENDENTE — sprint 2 |
| 1.6 | Expandir `/admin/metrics` com graficos de signups e funil | P1 | 4h | ✅ FEITO — sparkline 30d, funil 4 steps, engagement grid |
| 1.7 | Verificar rankings SEO reais no Search Console | P1 | 1h | ⏭️ MANUAL — fazer via browser |
| 1.8 | Verificar GitHub stars e repo health | P2 | 30min | ⏭️ MANUAL — fazer via browser |

### Distribuicao (manual)
| # | Tarefa | Prioridade |
|---|--------|------------|
| 1.9 | Primeiro post LinkedIn (launch, building in public) | P1 |
| 1.10 | Primeiro envio de newsletter (lista existente) | P1 |

**Entrega:** Analytics ativo, security corrigida, baseline de metricas estabelecida.
**Metricas de sucesso:** Events tracked > 0, signups visíveis no admin, zero credenciais expostas.

---

## Sprint 2 — Conversion Infrastructure ✅ CONCLUIDO

**Hipotese:** Trial Pro + email drip + checklist = primeiro pagante em 30 dias.
**Bloqueia:** Revenue (sem trial, o salto Free→R$297 e muito grande).

### Tarefas Tecnicas
| # | Tarefa | Prioridade | Esforco | Status |
|---|--------|------------|---------|--------|
| 2.1 | Trial Pro 7 dias automatico no signup (`trialEndsAt` + schema) | P0 | 4h | ✅ FEITO — schema + getUserPlan trialing logic |
| 2.2 | Banner no dashboard: "Trial Pro: X dias restantes" com CTA upgrade | P0 | 2h | ✅ FEITO — TrialBanner component + urgency state |
| 2.3 | Downgrade automatico apos trial | P0 | 2h | ✅ FEITO — auto-downgrade em getUserPlan() |
| 2.4 | In-app onboarding checklist (5 steps) | P0 | 4h | ✅ FEITO — widget fixo bottom-right, localStorage |
| 2.5 | Email drip D+0 (boas-vindas) | P1 | 2h | ✅ FEITO — fire-and-forget no register route |
| 2.6 | Email drip D+1 (primeiro agente) | P1 | 1h | ✅ FEITO — cron /api/cron/email-drip + buildDrip1Email |
| 2.7 | Email drip D+3 (Magic Create) | P1 | 1h | ✅ FEITO — cron + buildDrip3Email |
| 2.8 | Email drip D+7 (NPS inline) | P1 | 2h | ✅ FEITO — cron + buildDrip7Email com links de score |
| 2.9 | Plan limit visibility bar no sidebar | P1 | 3h | ✅ FEITO — KBs adicionadas, upgrade prompt a 80% |

### Testes (desbloqueiam confianca para cobrar)
| # | Tarefa | Prioridade | Esforco | Status |
|---|--------|------------|---------|--------|
| 2.10 | Teste E2E: signup → checkout MercadoPago → verify subscription | P0 | 4h | ⏭️ PENDENTE — Sprint 3 |
| 2.11 | Teste E2E: MercadoPago webhook → atualiza plano no DB | P0 | 3h | ⏭️ PENDENTE — Sprint 3 |
| 2.12 | Teste integracao: plan-limits enforcement | P1 | 2h | ⏭️ PENDENTE — Sprint 3 |

### Distribuicao (manual)
| # | Tarefa | Prioridade |
|---|--------|------------|
| 2.13 | 6 posts LinkedIn (3/semana) | P1 |
| 2.14 | Newsletter #2 | P1 |
| 2.15 | Post Reddit r/SaaS (building in public) | P2 |

**Entrega:** Trial ativo, email drip rodando, plan limits visíveis no sidebar.
**Metricas de sucesso:** Trial start rate > 90%, email open rate > 30%, billing test passing.

---

## Sprint 3 — Activation & Retention (Semana 5-6) ✅ CONCLUIDO

**Hipotese:** Social proof + upgrade prompts + weekly digest = 2x activation rate.

### Tarefas Tecnicas
| # | Tarefa | Prioridade | Esforco | Status |
|---|--------|------------|---------|--------|
| 3.1 | Social proof hero: "X orquestracoes executadas" (DB query + ISR) | P0 | 2h | ⏭️ SKIP — sem usuarios reais ainda |
| 3.2 | Upgrade prompt contextual quando atinge 80% do limite | P0 | 3h | ✅ FEITO — sidebar 80% amber button |
| 3.3 | Upgrade prompt modal quando atinge 100% (soft block, nao hard) | P0 | 2h | ✅ FEITO — UpgradeModal + event dispatch |
| 3.4 | Email drip D+5 (templates) + D+14 (upgrade offer) | P1 | 2h | ✅ FEITO — buildDrip5Email + buildDrip14Email |
| 3.5 | Email D+30 (re-engagement para inativos) | P1 | 1h | ✅ FEITO — buildDrip30Email |
| 3.6 | Weekly digest email (cron job, so para usuarios ativos) | P1 | 4h | ✅ FEITO — /api/cron/weekly-digest, cron toda segunda |
| 3.7 | Resultado de orquestracao compartilhavel (link publico) | P2 | 4h | ✅ FEITO — shareToken + /share/[token] + share button no drawer |

### Testes
| # | Tarefa | Prioridade | Esforco |
|---|--------|------------|---------|
| 3.8 | Teste integracao: auth flow (login, register, refresh, SSO) | P1 | 3h |
| 3.9 | Teste integracao: orchestration execution end-to-end | P1 | 3h |

### Distribuicao (manual)
| # | Tarefa | Prioridade |
|---|--------|------------|
| 3.10 | 6 posts LinkedIn | P1 |
| 3.11 | Newsletter #3 | P1 |
| 3.12 | Primeiro video demo (Loom, 3 min) | P1 |
| 3.13 | IndieHackers post (milestone update) | P2 |

**Entrega:** Conversion funnel completo, retention emails rodando, primeiro conteudo video.
**Metricas de sucesso:** Activation rate > 50%, upgrade prompt click rate > 5%.

---

## Sprint 4 — First Revenue + Optimization (Semana 7-8)

**Hipotese:** Com trial, drip, prompts e 30 dias de distribuicao, primeiro pagante aparece.

### Tarefas Tecnicas
| # | Tarefa | Prioridade | Esforco |
|---|--------|------------|---------|
| 4.1 | Dashboard de revenue no admin (MRR, churn, LTV) | P0 | 4h |
| 4.2 | Cohort analysis no admin (retention heatmap) | P1 | 4h |
| 4.3 | A/B test framework basico (feature flags simples) | P1 | 3h |
| 4.4 | Otimizar landing page baseado em dados GA4 (CTA, copy, layout) | P1 | 4h |
| 4.5 | Template marketplace: permitir publicacao de templates por usuarios | P2 | 6h |

### Testes
| # | Tarefa | Prioridade | Esforco |
|---|--------|------------|---------|
| 4.6 | Teste E2E: complete user journey (signup → agent → orch → execute) | P1 | 3h |
| 4.7 | Teste: knowledge RAG quality (sample queries) | P2 | 3h |

### Distribuicao (manual)
| # | Tarefa | Prioridade |
|---|--------|------------|
| 4.8 | 6 posts LinkedIn | P1 |
| 4.9 | Newsletter #4 | P1 |
| 4.10 | HackerNews Show HN post | P1 |
| 4.11 | 2 videos demo (YouTube) | P2 |
| 4.12 | Outreach para 5 potenciais parceiros (agencias) | P2 |

**Entrega:** Revenue dashboard, primeiro revenue, dados de cohort.
**Metricas de sucesso:** MRR > R$0, 50+ signups acumulados, 5+ usuarios ativos semanais.

---

## Sprint 5 — Scale What Works (Semana 9-10)

**Hipotese:** Com dados de 2 meses, sabemos o que funciona. Dobrar no que funciona, cortar o que nao.

### Decisoes baseadas em dados
```
SE signup rate < 3%:
  → Reescrever hero da landing (copy + CTA)
  → Testar exit-intent popup

SE trial → paid < 2%:
  → Estender trial para 14 dias
  → Ou introduzir Plano Starter R$97

SE retention semana 1 < 30%:
  → Melhorar onboarding (mais guiado, menos friction)
  → Adicionar in-app tour com tooltips

SE LinkedIn tem > 5x mais engajamento que Reddit:
  → Dobrar LinkedIn, pausar Reddit
  → Investir em video content (melhor engagement)
```

### Tarefas possiveis (decidir com dados)
| # | Tarefa | Condicao |
|---|--------|----------|
| 5.1 | Plano Starter R$97 | Se trial→paid < 2% |
| 5.2 | Exit-intent popup | Se signup rate < 3% |
| 5.3 | In-app product tour | Se activation < 40% |
| 5.4 | Custom model selection (Pro/Business) | Se churn > 10% |
| 5.5 | Referral program ativado | Se NPS > 40 |
| 5.6 | Performance optimization (bundle, cache) | Se > 100 DAU |

### Distribuicao (manual)
| # | Tarefa | Prioridade |
|---|--------|------------|
| 5.7 | 6 posts LinkedIn | P1 |
| 5.8 | Newsletter #5 | P1 |
| 5.9 | Segundo video YouTube | P2 |
| 5.10 | Primeiro webinar/live demo | P2 |

**Entrega:** Decisoes informadas por dados, otimizacoes baseadas em metricas reais.
**Metricas de sucesso:** Improvement em pelo menos 1 metrica-chave vs Sprint 4.

---

## Sprint 6-8 — Growth Loop (Semana 11-16)

**Hipotese:** Com fundacao solida, focar em loops de crescimento sustentavel.

### Temas por sprint
| Sprint | Foco | Acoes principais |
|--------|------|-----------------|
| 6 | Partnerships | Fechar 2-3 parceiros (agencias, consultores). White-label trial. |
| 7 | Content scaling | 5 novos artigos SEO baseados em keywords que rankearam. Video semanal. |
| 8 | Product stickiness | Model selection, template marketplace ativo, webhooks como diferencial. |

### KPIs target Semana 16
| Metrica | Target |
|---------|--------|
| MRR | R$ 3.000-5.000 |
| Pagantes | 10-15 |
| Signups acumulados | 200+ |
| DAU | 30+ |
| LinkedIn followers | 1.000+ |
| Newsletter subscribers | 500+ |
| YouTube subscribers | 100+ |
| Artigos top 10 Google | 15+ |

---

## Sprint 9-12 — Scale (Semana 17-24)

### Se traction comprovada (MRR > R$5K)
- Contratar primeiro dev (part-time ou freelancer)
- Enterprise outbound (sales direto para empresas > 50 funcionarios)
- White-label self-service
- Considerar Seed round ou bootstrap com revenue

### Se traction fraca (MRR < R$1K)
- Pivotar para vertical especifica (ex: agencias de marketing, escritorios juridicos)
- Reduzir scope: focar em 1 caso de uso em vez de plataforma generica
- Considerar consulting model: Sofia como servico (implementar para clientes)
- Reavaliar pricing: talvez cobrar menos mas por uso

---

## Resumo de Cadencia

```
Semana:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
         ├──┤  ├──┤  ├──┤  ├──┤  ├──┤  ├──────┤  ├──────┤
Sprint:  │S1│  │S2│  │S3│  │S4│  │S5│  │  S6  │  │  S7  │
         │  │  │  │  │  │  │  │  │  │  │      │  │      │
Focus:   SEC  CONV  RETNT  $$$   OPT   PARTNR   CONTENT
         ANA  TRIAL EMAIL  REV   DATA  GROW     SCALE

LinkedIn: ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■  (3/semana)
Newslttr: □     □     □     □     □     □     □  (bi-semanal)
Video:              □           □     □     □     (quinzenal)
```

---

## Checkpoints de Go/No-Go

| Checkpoint | Quando | Criterio GO | Criterio PIVOT |
|-----------|--------|-------------|----------------|
| Analytics | Sprint 1 | Tracking funciona, dados fluem | — |
| First signup (real) | Sprint 2 | 1+ signup organico | Algo esta quebrado |
| First payment | Sprint 4 | 1+ pagante | Reavaliar pricing/trial |
| Product-market fit signal | Sprint 5 | NPS > 30, retention S1 > 30% | Focar em vertical |
| Sustainable growth | Sprint 8 | MRR crescendo mes a mes | Pivotar ou consulting |
