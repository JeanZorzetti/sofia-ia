# Migração Orquestrações → Teams — Prompt inicial da Sessão 7

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: SP6 — Teardown (deletar a engine de Orquestrações). É o ÚLTIMO sub-projeto e o mais arriscado.**

---

## Contexto pra continuar (programa "Orquestrações → Teams")

Programa de **aposentar a engine de Orquestrações** da Polaris (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`), levando suas capacidades exclusivas para o sistema **Teams** (o sucessor). **Design (brainstorming aprovado):** `docs/superpowers/specs/2026-06-15-orchestrations-to-teams-migration-design.md` — leia antes de começar (em especial a seção **"SP6 — Teardown"**). Cadência: **um sub-projeto (SP) por sessão**; confirmar abordagem antes de executar (regra global).

Decomposição (do design): **SP1** Magic Create · **SP2** Output webhooks · **SP3** Scheduling/cron · **SP4** API pública/v1 · **SP5** Templates de time · **SP6** Teardown. **SP1–SP5 estão TODOS ENTREGUES** (Teams tem paridade de capacidades). Agora SP6 mata a engine.

### ✅ O que já está no Teams (capacidades portadas — a engine não tem mais nada exclusivo)
- **SP1 Magic Create** → `POST /api/teams/magic-create` + `magic-roster.ts` + `MagicCreateModal` no header de `/dashboard/teams`.
- **SP2 Output webhooks** → `Team.config.outputWebhooks` + `team-outputs.ts` (dispara via caller) + `TeamOutputsPanel.tsx`. **Reusa `dispatchOutputWebhooks` de `src/lib/orchestration/output-webhooks.ts`** (⚠️ ver gotcha abaixo).
- **SP3 Scheduling/cron** → modelo novo `ScheduledTeamRun` + `GET /api/cron/run-scheduled-teams` + CRUD `/api/teams/[id]/schedules` + `TeamSchedulesPanel.tsx`. Helper central `start-team-run.ts` (`startTeamRun`).
- **SP4 API pública/v1** → `POST /api/{v1,public}/teams/[id]/run` + `GET` listagem, reusando `startTeamRun`; openapi/api-reference/Zapier/Make/n8n já repontados pra Teams.
- **SP5 Templates** → `team-templates.ts` (8 templates) + `instantiateRoster` + `GET /api/teams/templates` + `POST /api/teams/templates/[id]/deploy` + `TeamTemplatesDialog` + botão "Templates" no header.

### A UI de Orquestrações JÁ saiu (commit `9fd88fa`, 2026-06-15)
Sidebar sem "Orquestrações"; `/dashboard/orchestrations`, `[id]` e `history` viraram **server-redirect** pra `/dashboard/teams`; `src/components/dashboard/orchestrations/*` apagado; onboarding repontado. A **engine** (rotas API + lib + modelos) segue 100% viva — é o que o SP6 deleta.

---

## ⚠️ Restrições transversais do programa (do design — valem pra todos os SPs)
- **NÃO deletar `src/components/orchestrations/*`** (flow-canvas/nodes) — compartilhado com o **Workflows builder** (`dashboard/workflows/builder`, `predictive-workflow-builder.tsx`). Avaliar realocar p/ namespace do Workflows.
- Strategies `parallel`/`consensus` foram **descartadas** (YAGNI).
- **Não há orquestrações reais em produção** → **sem migração de dados, sem dual-write**. A migração do SP6 só **DROPA** tabelas.

---

## Foco desta sessão: SP6 — Teardown 🔜 (o mais arriscado — NÃO sair deletando)

**Objetivo (do design):** deletar a engine de Orquestrações de vez, agora que o Teams tem paridade. **Mas o teardown é mais largo e perigoso do que o bullet do design sugere** — há consumidores não-óbvios dos modelos e um arquivo de lib que o Teams agora REUSA. **Esta sessão deve começar por DESCOBERTA + brainstorming + decompor o SP6 em passos, e confirmar a abordagem com o usuário ANTES de deletar/migrar.**

### 🔴 Gotchas CRÍTICOS já levantados (não repetir o erro de confiar cego no design)

1. **`src/lib/orchestration/output-webhooks.ts` NÃO pode ser deletado.** O design lista ele em "deletar", mas o **SP2 religou o Teams nele** — `src/app/dashboard/teams/[id]/TeamOutputsPanel.tsx` importa tipos dele e `src/lib/orchestration/team/team-outputs.ts` chama `dispatchOutputWebhooks`. **PRESERVAR** (ou realocar p/ `team/`). Só `orchestration-templates.ts` e `task-parser.ts` são realmente deletáveis (confirmado: importados **só** pelas rotas legadas `api/orchestrations/{route,[id]/execute,templates/route}.ts`, que morrem juntas).

2. **Os 3 modelos têm ~31 arquivos referenciando** `AgentOrchestration`/`OrchestrationExecution`/`ScheduledExecution`. Dropar as tabelas quebra o client Prisma em TODOS eles. Muitos são as próprias rotas de orchestration (que você deleta), mas há **consumidores NÃO-óbvios que precisam ser repontados ou removidos com cuidado** — mapeie TODOS antes (grep dos 3 nomes de modelo) e decida repoint-vs-remove caso a caso:
   - **`src/lib/flow-engine/nodes/actions.ts`** — o **Workflows/flow-engine** (que é PRESERVADO!) referencia os modelos de orchestration. Dropar quebra Workflows. ⚠️ resolver (repontar node pra Teams ou remover o node).
   - **`src/app/api/landing/template-run/route.ts`** + **`src/app/api/templates/[id]/deploy/route.ts`** — o test-drive/landing (templates de `data/templates.ts`, **outro sistema**, NÃO os orchestration-templates) parece criar `OrchestrationExecution` pra rodar a demo. Dropar quebra o test-drive da landing.
   - **`share/[token]/page.tsx`**, **`api/public/executions/[id]`**, **`api/v1/executions/[id]`**, **`api/orchestrations/[id]/executions/[execId]/share`** — compartilhamento de resultado de execução.
   - **`lib/analytics.ts`** (eventos `first_orchestration_created`/`_executed`), **`api/cron/weekly-digest`**, **`admin/page.tsx`**, **`(public)/page.tsx`**, **`NpsWidget.tsx`** — métricas/contagem de orquestrações.
   - **`api/dashboard/scheduled-executions/*`** + **`api/cron/run-scheduled`** — o scheduling LEGADO (substituído pelo `ScheduledTeamRun` do SP3) → deletar.
   - **`api/v1/integrations/zapier/{execute,poll}`** + **`api/public/orchestrations/*`** + **`api/public/v1/orchestrations`** + **`api/v1/orchestrations/*`** — a API legada (copy já repontada no SP4, mas os endpoints seguem vivos) → deletar.
   - **`api/orchestrations/magic-create`** — a rota legada do Magic Create (SP1 já religou a UI no Teams) → deletar.

3. **REPONTAR O THREADS é a maior incógnita — investigação própria no INÍCIO do SP6.** `src/app/dashboard/threads/campaigns` ("Planejar com IA") + os ~6 `scripts/create-threads-*-orchestration.ts` usam a **engine de Orquestração como motor de planejamento**. Matar a engine exige migrar o Threads pra Teams (ou pra um planner próprio do Threads) ANTES. Sem isso, "Planejar com IA" quebra. Decidir a estratégia de repoint logo de cara.

4. **`Agent` (modelo) é COMPARTILHADO pelo app todo — NÃO deletar.** Conferir se `Agent` tem relação Prisma com `AgentOrchestration` que precise ser removida do schema (provável `agentOrchestrations AgentOrchestration[]` ou similar) antes de dropar.

### Decisões a confirmar com o usuário ANTES de spec/código
1. **Decompor o SP6?** Recomendado: SP6 é grande demais p/ um commit limpo só. Sugestão de sub-passos (cada um shippável): **(6a)** repontar Threads → Teams/planner próprio; **(6b)** deletar rotas API priv/pub/v1 + integrations + magic-create legado + redirects de dashboard; **(6c)** repontar/remover consumidores dos modelos (flow-engine, landing/test-drive, share, analytics/admin/digest/NPS); **(6d)** migração que dropa as 3 tabelas + limpar schema/relations; **(6e)** limpeza de superfície (sitemap, openapi remanescente, páginas marketing `(public)/features/orchestrations` + integrations Zapier/Make + docs/getting-started, i18n). → confirmar se faz tudo numa sessão ou 1 sub-passo/sessão (recomendado o 2º, dado o risco).
2. **Threads:** migrar "Planejar com IA" pra **Teams** (reusa `createTeamWithRoster`/`startTeamRun`?) ou dar ao Threads um **planner próprio** desacoplado? → precisa investigar `threads/campaigns` + os scripts primeiro.
3. **Consumidores que contam execuções (analytics/admin/digest/NPS/landing):** repontar pra `TeamRun` ou simplesmente **remover** a métrica/feature legada? → caso a caso.
4. **flow-engine node de orchestration:** repontar pra disparar Team run ou **remover** o node do Workflows? → confirmar (afeta Workflows, que é preservado).
5. **`output-webhooks.ts`:** deixar em `lib/orchestration/` (preservado) ou **realocar** p/ `lib/orchestration/team/`? (cosmético; o design sugere realocar p/ namespace do Workflows/Teams.) → confirmar.

### O que fazer nesta sessão
1. **DESCOBERTA primeiro** (não confie no design — ele subestima o alcance): grep os 3 modelos + `orchestration` em rotas/lib/components/scripts/i18n/sitemap/openapi; ler `threads/campaigns` + `scripts/create-threads-*-orchestration.ts`; mapear todos os consumidores e classificar **deletar vs repontar vs preservar**.
2. **Brainstorm + spec + plano do SP6** (skills superpowers: brainstorming → writing-plans). **Confirmar a decomposição + as decisões acima comigo PRIMEIRO.** Provavelmente vira vários sub-passos (6a–6e), 1 por sessão.
3. **Coordinator (`runTeam`) e `startTeamRun` INTACTOS** — o teardown não toca a engine do Teams. **PRESERVAR `src/components/orchestrations/*`** (flow-canvas) e **`output-webhooks.ts`**.
4. **Migração formal que DROPA tabelas** (`AgentOrchestration`/`OrchestrationExecution`/`ScheduledExecution` legado) — aplicar **MANUAL** no host real ANTES do push (lição SP2/SP3: `db push`/standalone do Dockerfile não roda migração → drift). Limpar as `model`/relations do `schema.prisma` junto. Conferir ordem de FK (executions/scheduled → orchestration).

---

## ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Verificação confiável local: **`npx tsc --noEmit`** (só LÊ; aceitar só erros de módulo não instalado / client Prisma stale — `bullmq`/`e2b`/`@xterm/*`/`diff2html` e drift do schema aparecem e somem no build do EasyPanel) + **`npx tsx scripts/*.ts`** com `node:assert` e imports **relativos** pra lógica pura. **No SP6, `tsc` é especialmente útil**: depois de dropar os modelos do schema, ele acha CADA referência órfã aos modelos (objetivo = zero `Property 'agentOrchestration' does not exist` fora dos arquivos deletados).
- **Migração que dropa tabelas:** `node node_modules/prisma/build/index.js migrate deploy` com `DATABASE_URL` inline (`npx prisma` dá "não reconhecido"). O Rust engine do Prisma FUNCIONA (não usa `pg`).
- **Gate real = deploy no EasyPanel** (push na `main` → redeploya **app + worker**, 2 serviços; 502 "Service is not reachable" por ~1-2min durante o rebuild). **E2E autenticado fica com o usuário.** **Commitar só os arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs — que NÃO entram). Caminhos com `[id]` no git: pathspec `:(literal)` ou aspas. Commit multi-linha: heredoc no Bash tool, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Query no banco p/ diagnóstico:** `prisma.$queryRawUnsafe(...)` num script tsx com `DATABASE_URL` inline (bypassa o client stale).

## Banco de produção / segredos
- **Host real de prod:** `postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta p/ `bot@31.97.23.166:5499`, que **dá timeout** — NÃO usar). Mesmo VPS do Compass.
- 🔐 **Rotacionar (higiene — expostos no chat ao longo do programa):** senha Postgres (`PAzo18**`), `E2B_API_KEY`, `GITHUB_TOKEN`, `CRON_SECRET`, **API key `sk_live_9fb6e1...` (SP4)**.

---

> Comece confirmando comigo a **decomposição do SP6 e as decisões** (Threads, consumidores, flow-engine, migração) — e SÓ DEPOIS de uma rodada de DESCOBERTA — antes de escrever spec ou deletar qualquer coisa. É o sub-projeto que mata a engine: melhor 5 sub-passos limpos que 1 deleção que quebra Workflows/Threads/landing em prod.
