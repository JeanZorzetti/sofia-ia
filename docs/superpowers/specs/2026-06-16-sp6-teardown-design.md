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

### 6a — Repoint do Threads (mais leve e seguro → primeiro)
- Repontar link "Planejar com IA" (`threads/campaigns/page.tsx`) pra Teams.
- Portar os 6 pipelines de Threads → 1 Team template "Planejamento de Campanha Threads" em `team-templates.ts` (prompts verbatim, roster válido por `validateRoster`).
- Deletar os 6 `scripts/create-threads-*-orchestration.ts`.
- **Não toca os modelos ainda** (a engine segue viva). Zero risco de quebrar prod.
- Verificação: `tsc` limpo; `instantiateRoster` aceita o novo template; link aponta pra `/dashboard/teams`.

### 6b — Deletar API legada + scheduling + redirects
- Deletar todo o balde **A** (16 rotas + 3 scheduling + stubs de redirect + `orchestration-templates.ts` + `task-parser.ts`).
- **Não** deletar `output-webhooks.ts`.
- Os modelos seguem no schema (ainda referenciados por C/B até 6c) → client Prisma intacto.
- Verificação: `tsc` limpo (as rotas deletadas eram as únicas que importavam as 2 libs); nenhuma rota viva importando `task-parser`/`orchestration-templates`.

### 6c — Repontar/remover consumidores não-óbvios (balde C + B)
- flow-engine node → Team (loop inline).
- Landing test-drive → Team template (+ flag `isLandingTemplate` no `Team`, se for o caminho escolhido — decidir no plano).
- Métricas (analytics/admin/digest/home/NPS) → `Team`/`TeamRun`.
- Deletar compartilhamento de execução (balde B).
- **Objetivo:** ao fim do 6c, **nenhum arquivo vivo referencia os 3 modelos** exceto o próprio schema. `tsc` vira o detector: zero `Property 'agentOrchestration' does not exist` fora de arquivos já deletados.
- Verificação: `grep` dos 3 accessors retorna só o schema; `tsc` limpo.

### 6d — Migração que dropa as tabelas + limpeza do schema
- Migração formal `drop` (children → parent), aplicada **MANUAL** no host real **antes** do push.
- Remover os 3 `model` + `User.scheduledExecutions` + relations internas do `schema.prisma`.
- Verificação: `tsc` limpo com o client regenerado; migração aplicada no banco real confirmada por `$queryRawUnsafe` (tabelas não existem mais).

### 6e — Limpeza de superfície (balde F) + realocação opcional de `output-webhooks.ts`
- sitemap, openapi remanescente, marketing `(public)/features/orchestrations`, integrations Zapier/Make, docs/getting-started, i18n.
- (Opcional) mover `output-webhooks.ts` → `lib/orchestration/team/`.
- Verificação: `tsc` limpo; sitemap/openapi sem rotas mortas; grep "orchestration" só em código preservado (flow-canvas) e histórico.

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
