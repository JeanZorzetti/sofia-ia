# SP6 — Teardown da engine de Orquestrações (design detalhado)

> Sub-projeto final do programa **Orquestrações → Teams**. Design-pai: [`2026-06-15-orchestrations-to-teams-migration-design.md`](./2026-06-15-orchestrations-to-teams-migration-design.md). SP1–SP5 entregues → Teams tem paridade de capacidades → este SP **mata a engine de Orquestrações**.
>
> **É o sub-projeto mais arriscado:** dropar os 3 modelos quebra o client Prisma em ~35 arquivos, e há consumidores não-óbvios (Workflows, landing, analytics, Threads) que **não** podem simplesmente sumir. Por isso ele é **decomposto em 5 sub-passos shippáveis (6a–6e), 1 por sessão**.

## Decisões confirmadas com o usuário (2026-06-16)

1. **Decomposição:** dividir em **6a–6e, 1 sub-passo por sessão** (commits limpos, risco isolado).
2. **flow-engine node "Rodar Orquestração":** **repontar pra Team** (lê Team+TeamMembers e roda a mesma sequence inline) — preserva a capacidade no Workflows.
3. **Test-drive público da landing:** **repontar pra Team template** (reusa o sistema de templates do SP5) — preserva a demo de conversão.
4. **Métricas + scripts de Threads:** **repontar pra Team/TeamRun** (contagens) **+ portar os 6 scripts pra 1 Team template** "Planejamento de Campanha Threads".

## Restrições transversais (INTACTAS em todos os sub-passos)

- **Coordinator do Teams (`runTeam`) e `startTeamRun` — NÃO TOCAR.** O teardown não mexe na engine do Teams.
- **PRESERVAR `src/components/orchestrations/*`** (flow-canvas/nodes) — compartilhado com o Workflows builder.
- **PRESERVAR `src/lib/orchestration/output-webhooks.ts`** — o SP2 religou o Teams nele (`team-outputs.ts` chama `dispatchOutputWebhooks`; `TeamOutputsPanel` importa tipos). Realocação cosmética para `team/` é **opcional** e fica fora do escopo crítico (se feita, é em 6e).
- **Sem migração de dados / sem dual-write** — não há orquestrações reais em prod. A migração só **DROPA** tabelas.
- Strategies `parallel`/`consensus` foram descartadas (YAGNI) — não repontar.

## Mapa de consumidores (descoberta 2026-06-16)

29 arquivos em `src` + 6 scripts referenciam os 3 modelos. Classificação:

### A — A engine (DELETA em bloco; nada exclusivo restou no Teams)
Rotas API legadas:
- `app/api/orchestrations/**` — `route`, `[id]/route`, `[id]/execute`, `[id]/stream`, `[id]/analytics`, `[id]/landing`, `[id]/executions/[execId]/share`, `executions/route`, `magic-create/route`.
- `app/api/public/orchestrations/**` — `route`, `[id]/run`.
- `app/api/public/v1/orchestrations/route`, `app/api/v1/orchestrations/{route,[id]/execute}`.
- `app/api/v1/integrations/zapier/{execute,poll}/route` (copy já repontada no SP4).
- Scheduling legado: `app/api/cron/run-scheduled/route`, `app/api/dashboard/scheduled-executions/{route,[id]/route}` (substituído pelo `ScheduledTeamRun` do SP3).
- Stubs de redirect: `app/dashboard/orchestrations/**` (route + `[id]` + `history`, viraram server-redirect no commit `9fd88fa`).

Libs: `src/lib/orchestration/orchestration-templates.ts` + `src/lib/orchestration/task-parser.ts` (importadas **só** por essas rotas legadas → morrem juntas). **NÃO** `output-webhooks.ts`.

### B — Compartilhamento de execução (DELETA)
`app/share/[token]/page.tsx`, `app/api/public/executions/[id]/route`, `app/api/v1/executions/[id]/route` — usam `OrchestrationExecution.shareToken`. **Não há execuções reais em prod** → deletar (sem repoint).

### C — Consumidores não-óbvios (REPONTA, conforme decisões)
- **`src/lib/flow-engine/nodes/actions.ts`** (`actionOrchestration`) — node do **Workflows (PRESERVADO)**. Hoje é um executor sequencial **auto-contido**: lê `orchestration.agents` (JSON) e roda `chatWithAgent` por passo; **não usa `OrchestrationExecution`**. → **Repontar**: trocar `findUnique(agentOrchestration)` por leitura de `Team` + `TeamMembers` (ordenados por `position`) e rodar o **mesmo loop sequencial inline** (mantém comportamento síncrono; **não** chama o coordinator async). Atualizar label/config do node (`teamId` em vez de `orchestrationId`).
- **Landing test-drive** — `app/api/landing/template-run/route.ts` (Path A: `agentOrchestration.findFirst({ isLandingTemplate: true })`), `app/api/orchestrations/[id]/landing/route.ts`, `app/api/templates/[id]/deploy/route.ts`. → **Repontar pra Team template**: a demo pública passa a instanciar/rodar a partir de um **Team** (flag `isLandingTemplate` movida pro modelo `Team`, ou um id de team-template do SP5), reusando o mesmo runner sequencial inline (execução anônima e síncrona, sem `TeamRun` persistido — manter a UX atual da demo).
- **Métricas** — `src/lib/analytics.ts` (evento `first_orchestration_created`/`_executed` + **`prisma.orchestrationExecution.count`** no admin), `app/api/cron/weekly-digest/route.ts`, `app/admin/page.tsx`, `app/(public)/page.tsx`, `src/components/NpsWidget.tsx`. → **Repontar pra Team/TeamRun**: contagens passam a usar `prisma.team.count` / `prisma.teamRun.count`; eventos `first_orchestration_*` → `first_team_*` (renomear no enum + onde são disparados).

### D — Threads (acoplamento FINO; bem menor que o design-pai temia)
`app/dashboard/threads/campaigns/page.tsx` usa **API própria** (`/api/threads/campaigns`, que **não** toca os modelos de orchestration). Acoplamentos reais:
1. Link **"Planejar com IA"** → `/dashboard/orchestrations` (hoje redireciona pra Teams). → **Repontar o link** pra `/dashboard/teams` (idealmente abrindo o team-template de campanha).
2. **6 `scripts/create-threads-*-orchestration.ts`** — criam `AgentOrchestration` (pipelines de planejamento). → **Portar pra 1 Team template** "Planejamento de Campanha Threads" em `team-templates.ts` (reaproveita os prompts verbatim como roster: 1 lead + workers; reviewer só onde há etapa de QA/Editor). Deletar os scripts depois.

### E — Schema (migração que DROPA tabelas)
- `Agent` **NÃO** tem relation Prisma com `AgentOrchestration` (agentes são JSON no campo `agents`) → **dropar não toca `Agent`** ✅.
- `User.scheduledExecutions ScheduledExecution[]` (linha ~37) é a **única back-relation externa** → remover do modelo `User`.
- Modelos a remover: `AgentOrchestration`, `OrchestrationExecution`, `ScheduledExecution` (+ suas relations internas).
- **Ordem de FK** (onDelete Cascade): dropar `orchestration_executions` e `scheduled_executions` antes de `agent_orchestrations`.

### F — Superfície / marketing / docs
`src/app/sitemap.ts`, `openapi.json` remanescente, `(public)/features/orchestrations/*`, páginas integrations Zapier/Make, `docs/getting-started`, strings i18n com "orquestração/orchestration".

## Decomposição em sub-passos (cada um shippável e verificável isolado)

> **⚠️ Revisão pós-descoberta do 6b (2026-06-16):** a descoberta do 6b mostrou que a ordem original (deletar API no 6b → repontar consumidores no 6c) estava **invertida** — há consumidores VIVOS da API (`app/onboarding/page.tsx` e `onboarding-wizard.tsx` criam orchestration via `POST /api/orchestrations`; `components/flows/node-config-panel.tsx` do Workflows lista `/api/orchestrations`). Deletar a API antes de repontá-los quebraria onboarding + Workflows em prod (runtime, não build). **Decisão do usuário: REPOINT-FIRST** — repontar todos os consumidores vivos pra Teams ANTES de deletar. Também descoberto: `components/orchestrations/*` é **misto** (flow-canvas preservado + UI de execução **órfã** após `9fd88fa`: `analytics-dashboard`/`execution-history`/`execution-detail-drawer`/`execution-live-view`/`execution-compare` + hooks `use-execution-*` = código morto). Decomposição corrigida abaixo.

### 6a — Repoint do Threads ✅ ENTREGUE (commit `95f6346`)
- Link "Planejar com IA" → `/dashboard/teams`; pipeline Campanha virou **Team reusando os agentes EXISTENTES** (não template — preservou plugins/skills/MCP) via `scripts/create-threads-campaign-team.ts` + módulo puro `threads-campaign-roster.ts`; 6 scripts `create-threads-*-orchestration.ts` deletados. Seed rodado em prod (Team `80a38c6e`).

### 6b — Repoint do onboarding → Teams + deletar UI de execução órfã (REPOINT-FIRST, fatia atual)
- `app/onboarding/page.tsx`: trocar a criação de orchestration por criação de **Team** (lead sintético + o agente criado como worker), navegar pra `/dashboard/teams/[id]`.
- `onboarding-wizard.tsx`: `handleUseTemplate` deploya um **Team template** do SP5 (mapear os ids `DEMO_TEMPLATES` → ids de `TEAM_TEMPLATES`), navegar pra `/dashboard/teams/[id]`.
- Deletar a **UI de execução órfã** (`components/orchestrations/{analytics-dashboard,execution-history,execution-detail-drawer,execution-live-view,execution-compare}.tsx` + `hooks/use-execution-{stream,notifications}.ts`) — confirmar zero importadores antes. **PRESERVAR** flow-canvas (`flow-canvas`/`flow-nodes`/`flow-edges`/`predictive`/`editable-flow-canvas`).
- **Não toca modelos nem deleta a API ainda** (engine viva). Após 6b: nenhum onboarding chama `/api/orchestrations`.

### 6c — Repoint do node do Workflows + flow-engine `actionOrchestration` → Team
- `node-config-panel.tsx` (lista `/api/orchestrations` → listar Teams) + `lib/flow-engine/nodes/actions.ts` (`actionOrchestration` lê Team+TeamMembers, loop sequencial inline; `teamId` no config). Após 6c: nenhum consumidor da **API** de orchestration vivo.

### 6d — Repoint dos consumidores de MODELO (landing test-drive + métricas) + deletar sharing
- Landing test-drive (`api/landing/template-run`, `api/orchestrations/[id]/landing`, `api/templates/[id]/deploy`) → Team template. Métricas (`analytics first_orchestration_*`/`orchestrationExecution.count`, weekly-digest, admin, home, NPS) → `Team`/`TeamRun`. Deletar sharing de execução (balde B). Após 6d: **nenhum arquivo vivo referencia os 3 modelos nem a API** — `tsc`/`grep` confirmam.

### 6e — Deletar a engine morta (API + libs + redirects) — pura deleção
- Deletar balde **A**: `api/orchestrations/**` (incl. `generate`), `api/public/orchestrations/**`, `api/{public/v1,v1}/orchestrations/**`, `api/v1/integrations/zapier/**`, scheduling legado (`cron/run-scheduled`, `dashboard/scheduled-executions/**`), redirects `dashboard/orchestrations/**`, libs `orchestration-templates.ts`+`task-parser.ts`. **NÃO** `output-webhooks.ts`. Modelos ainda vivos (caem no 6f). `tsc` limpo (zero caller restante).

### 6f — Migração que dropa as 3 tabelas + limpeza do schema
- Migração `drop` (children `orchestration_executions`/`scheduled_executions` → parent `agent_orchestrations`), **MANUAL** no host real antes do push. Remover os 3 `model` + `User.scheduledExecutions` + relations. `tsc` limpo com client regenerado; confirmar tabelas inexistentes via `$queryRawUnsafe`.

### 6g — Limpeza de superfície + realocação opcional de `output-webhooks.ts`
- sitemap, openapi remanescente, marketing `(public)/features/orchestrations` + integrations + docs/getting-started, i18n. (Opcional) mover `output-webhooks.ts` → `lib/orchestration/team/`.

## Verificação e ambiente (vale pra todos os sub-passos)

- **Gate local confiável = `npx tsc --noEmit`** (OneDrive corrompe `node_modules`: `npm install`/`prisma generate`/`jest`/`next build`/`require('pg')` travam). No 6c/6d, `tsc` é o detector de referência órfã. Aceitar só erros de módulo não instalado / drift de client conhecido.
- **Script tsx de verificação por sub-passo** (`scripts/sp6X-verify.ts`) com `node:assert` e imports relativos pra lógica pura (ex.: roster do template de Threads passa em `validateRoster`).
- **Migração drop (6d):** `node node_modules/prisma/build/index.js migrate deploy` com `DATABASE_URL` inline (o Rust engine do Prisma funciona; `npx prisma` dá "não reconhecido"; `db push` do Dockerfile standalone **não** roda → drift).
- **Host real de prod:** `postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta pro `bot@31.97.23.166:5499`, que dá timeout — NÃO usar).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.** Commitar **só** os arquivos da fatia (a árvore tem mudanças não relacionadas).
- 🔐 **Higiene (expostos no chat):** rotacionar senha Postgres, `E2B_API_KEY`, `GITHUB_TOKEN`, `CRON_SECRET`, API key `sk_live_9fb6e1…` (SP4).

## Fora de escopo do SP6

- Tocar no coordinator do Teams ou em `startTeamRun`.
- Deletar/realocar `src/components/orchestrations/*` (flow-canvas).
- Deletar `output-webhooks.ts`.
- Migração de dados (não há).
