# Migração Orquestrações → Teams — Prompt inicial da Sessão 4

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: SP3 — Scheduling/cron → Teams.**

---

## Contexto pra continuar (programa "Orquestrações → Teams")

Programa de **aposentar a engine de Orquestrações** da Polaris (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`), levando suas capacidades exclusivas para o sistema **Teams** (o sucessor). **Design (brainstorming aprovado):** `docs/superpowers/specs/2026-06-15-orchestrations-to-teams-migration-design.md` — leia antes de começar (em especial a seção **"SP3 — Scheduling / cron → Teams"**). Cadência: **um sub-projeto (SP) por sessão**; confirmar abordagem antes de executar (regra global).

Decomposição (do design): **SP1** Magic Create · **SP2** Output webhooks · **SP3** Scheduling/cron · **SP4** API pública/v1 · **SP5** Templates de time · **SP6** Teardown (deletar a engine). Sequência SP1→SP6. A engine fica viva (já desplugada da UI desde commit `9fd88fa`) até o Teams ter paridade.

### Restrições transversais do programa (do design — não óbvias, valem p/ todos os SPs)
- **NÃO deletar `src/components/orchestrations/*`** (flow-canvas/nodes) — é compartilhado com o **Workflows builder** (`dashboard/workflows/builder`, `predictive-workflow-builder.tsx`).
- **SP6 (teardown) precisa repontar o Threads** antes de matar a engine: `app/dashboard/threads/campaigns` ("Planejar com IA") e `scripts/create-threads-*-orchestration.ts` usam a engine de Orquestração como motor de planejamento.
- Strategies `parallel`/`consensus` foram **descartadas** (YAGNI) — só o modelo Lead-coordenado do Teams segue em frente.
- **Não há orquestrações reais em produção** → **sem migração de dados, sem dual-write** em nenhum SP.

### O que JÁ foi feito ✅

**SP1 — Magic Create → Teams (2026-06-15, ENTREGUE e validado).** Plano: `docs/superpowers/plans/2026-06-15-sp1-magic-create-teams.md`.
- `magic-roster.ts` (parser puro `parseMagicRoster`) + helper compartilhado `create-team.ts` (`createTeamWithRoster`) + rota `POST /api/teams/magic-create`; `MagicCreateModal` religado no header de `/dashboard/teams`.

**SP2 — Output webhooks → Teams (2026-06-15, ENTREGUE e VALIDADO E2E em prod).** Spec `docs/superpowers/specs/2026-06-15-sp2-output-webhooks-teams-design.md`, plano `docs/superpowers/plans/2026-06-15-sp2-output-webhooks-teams.md`. Commits de código `877d568..250afc7` + migração `7fb6e10`.
- Reuso: `dispatchOutputWebhooks` (`src/lib/orchestration/output-webhooks.ts`) ganhou 4º arg `opts:{completedLabel,event}` (defaults preservam o caller de orchestration); fix do header HMAC `X-Polaris-Signature`; rename `OrchestrationSummary`→`EntitySummary`.
- Disparo (coordinator INTACTO): módulo `src/lib/orchestration/team/team-outputs.ts` = `buildTeamDispatchArgs` (puro, gate `status==='completed'` + algum `enabled`, prisma **lazy** p/ ser tsx-testável) + `dispatchTeamOutputs(runId)` (borda no-throw). Chamado no **caller**: run route `after()` (chat) + worker (code, 1 call cobre repo+C0).
- Config em `Team.config.outputWebhooks`; **PATCH `/api/teams/[id]` corrigido p/ merge raso** de config (antes substituía e apagava `repoUrl`/`maxTurns`). Persistência em `TeamRun.outputDispatches` (Json). UI `TeamOutputsPanel.tsx` na sala (3 tipos + status de entrega; `import type` p/ não bundlar `node:crypto`).
- **🔥 LIÇÃO DO SP2 (crítica p/ o SP3 — leia "Gotchas de ambiente" abaixo):** adicionei a coluna no schema achando que o `db push` do deploy a criaria. **NÃO criou** → o GET quebrou (team null, sala sem nome/membros/painel). Só funcionou após **migração formal aplicada MANUALMENTE** no host real de prod. **SP3 cria modelo novo → o mesmo passo é obrigatório.**

### Infra de Teams que você vai tocar (recap)
- Engine em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam`, loop Lead-orquestrado), `team-store.ts` (`TeamStore` = porta injetada), `team-types.ts`, `team-roster.ts` (`validateRoster`).
- **Invariante do programa:** manter o **coordinator (`runTeam`) o mais INTACTO possível** — estender via injeção (`RunTeamDeps`) ou no caller (run route / worker / cron), não dentro do loop.
- Modelos: `Team` (tem `config Json`), `TeamMember`, `TeamRun`, `TeamTask`, `TeamMessage`.
- Run trigger: **`POST /api/teams/[id]/run`** (`src/app/api/teams/[id]/run/route.ts`) cria um `TeamRun` e dispara `runTeam` via `after()` (chat) **ou** fila BullMQ + worker (code). É esse disparo que o cron do SP3 precisa reusar (NÃO reimplementar executor inline).

### ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Dep nova sem instalar: **`npm install --package-lock-only`** (+ fixar versão via `npm view <pkg> version`).
- Verificação confiável local: **`npx tsc --noEmit`** (só LÊ; aceitar só erros de módulo não instalado / client Prisma stale — `bullmq`/`e2b`/`@xterm/*`/`diff2html` e campos novos do schema aparecem e somem no build do EasyPanel) + **`npx tsx scripts/*.ts`** com `node:assert` e imports **relativos** pra lógica pura.
- **🔥 MIGRAÇÃO DE SCHEMA (a lição do SP2 — SP3 cria modelo `ScheduledTeamRun`):** o `CMD` do `Dockerfile` (`npx prisma db push ... || echo skipped`) **NÃO roda no runner standalone** (sem CLI Prisma) → **a coluna/tabela nova NUNCA é criada em prod** e o client (regenerado no build) **quebra todas as reads** da tabela. Portanto, ao mexer no schema:
  1. **Criar arquivo de migração formal** em `prisma/migrations/<YYYYMMDDHHMMSS>_<nome>/migration.sql` (aditivo; modelo novo = `CREATE TABLE`), commitar.
  2. **Aplicar MANUALMENTE** no host real (o `migrate deploy` do passo abaixo). Não confiar no deploy.
- **Gate real = deploy no EasyPanel** (push na `main` → redeploya **app + worker**, 2 serviços). **E2E autenticado fica com o usuário.** **Commitar só os arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs — que NÃO entram). Caminhos com `[id]` no git: pathspec `:(literal)`. Commit multi-linha: heredoc no Bash tool, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

### Banco de produção / segredos
- **Host real de prod (aplicar migração aqui):** `postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env`/`.env.local` apontam p/ `bot@31.97.23.166:5499`, que **dá timeout** — NÃO usar).
- Comando de migração (do dir `sofia-next`, com o `DATABASE_URL` inline acima): **`node node_modules/prisma/build/index.js migrate deploy`** (`npx prisma` dá "não reconhecido"; o binário direto funciona — o schema-engine roda mesmo com OneDrive). Validado no SP2.
- `CRON_SECRET` no EasyPanel protege o endpoint de cron (header `Authorization: Bearer <CRON_SECRET>`; default no código `sofia-cron-secret-2026`). cron-job.org bate no endpoint.
- 🔐 **Rotacionar (higiene — expostos no chat):** senha Postgres (`PAzo18**`), `E2B_API_KEY`, `GITHUB_TOKEN`, `CRON_SECRET`.

---

## Foco desta sessão: SP3 — Scheduling/cron → Teams 🔜

> Gancho: ler a tabela do programa + a seção **SP3** no design (`...migration-design.md`).

**Objetivo (do design):** permitir **agendar** execuções de um Team (ex.: "rode esta missão toda segunda 8h"), re-homando o scheduling no Teams. Como **não há dado a preservar**, redesenhar limpo: o cron acha os agendamentos vencidos e **dispara o Team run que já existe** (`POST /api/teams/[id]/run` via `after()`/fila), em vez do **executor sequencial inline** que a engine de Orquestração usa hoje.

**Estado atual (a substituir / referência):**
- Modelo `ScheduledExecution` (`prisma/schema.prisma` ~linha 939): FK→`AgentOrchestration`, `userId`, `cronExpr`, `label`, `inputTemplate` (JSON string), `nextRunAt`, `lastRunAt`, `lastStatus`, `isActive`. `@@map("scheduled_executions")`.
- Cron: `src/app/api/cron/run-scheduled/route.ts` — `GET` autenticado por `Bearer CRON_SECRET`; busca `scheduledExecution` vencidos (`isActive`, `nextRunAt<=now`) e **roda um executor sequencial inline próprio** (cria `OrchestrationExecution`, chama `chatWithAgent` agente-a-agente). Contém **`getNextRunAt(cronExpr, from)` inline** (parser cron simples de 5 campos — `min hour dayOfMonth * dayOfWeek`).
- CRUD de agendamentos: `src/app/api/dashboard/scheduled-executions/route.ts`.

**A boa notícia (reuso):** o **disparo de Team run já existe e é assíncrono** (`POST /api/teams/[id]/run`); o cron só precisa achar o que está vencido e chamar esse disparo. O `getNextRunAt` é lógica **pura** → extrair p/ módulo testável (padrão SP1/SP2).

### Decisões pra confirmar com o usuário ANTES de spec/código
1. **Modelo:** criar **`ScheduledTeamRun`** novo e limpo (`teamId`, `userId`, `cronExpr`, `label?`, `mission` (texto — o que o Team run consome), `mode` ('chat'|'code'), `nextRunAt`, `lastRunAt`, `lastStatus`, `lastRunId?`, `isActive`) — **recomendado** (sem dado a preservar) — vs. re-homar `ScheduledExecution` no `Team`. → confirmar. **(cria tabela → migração formal + aplicar manual, ver gotcha).**
2. **Disparo:** extrair a lógica de "iniciar um Team run" hoje embutida em `POST /api/teams/[id]/run` para um **helper compartilhado** (ex.: `startTeamRun(teamId,{mission,mode,userId})` → cria `TeamRun` + dispara `after()`/fila) reusado por (a) a rota de sessão, (b) o cron do SP3, e depois (c) a rota API-key do SP4 — **recomendado** (DRY, alinhado ao SP4) — vs. o cron chamar a rota HTTP internamente. → confirmar.
3. **Endpoint de cron:** um **novo** `GET /api/cron/run-scheduled-teams` (ou similar), `Bearer CRON_SECRET`, que varre `ScheduledTeamRun` vencidos, dispara via helper e recalcula `nextRunAt` — deixando o `run-scheduled` legado intacto (morre no SP6). → confirmar (recomendado: endpoint novo separado).
4. **Parser cron:** extrair `getNextRunAt` p/ módulo puro (`src/lib/orchestration/team/schedule.ts` ou similar) + `scripts/sp3-verify.ts` (tsx, `node:assert`); manter o comportamento simples atual (5 campos) ou só o subconjunto que a UI expõe (diário/semanal/mensal). → confirmar escopo do parser.
5. **UI:** dialog de agendamento na sala do time (`src/app/dashboard/teams/[id]/`, padrão do `TeamOutputsPanel`) — criar/listar/ativar-desativar/excluir agendamentos do time + CRUD API `/api/teams/[id]/schedules` (ou `/api/dashboard/team-schedules`). → confirmar escopo (campos expostos: cronExpr amigável? missão? modo?).
6. **Legado:** **não** tocar `ScheduledExecution`/`run-scheduled`/`scheduled-executions` (deletados no SP6). → confirmar.
7. **cron-job.org:** o usuário cadastra o novo endpoint no cron-job.org (como no Compass) + garante `CRON_SECRET` no EasyPanel. → alinhar no fim (E2E).

### O que fazer nesta sessão
1. **Brainstorm + spec + plano do SP3** (skills superpowers: brainstorming → writing-plans). **Confirmar as decisões acima comigo PRIMEIRO.**
2. Seguir o **padrão SP1/SP2:** lógica pura num módulo testável + `scripts/sp3-verify.ts` (tsx, `node:assert`, imports relativos, fakes — ex.: testar `getNextRunAt` p/ vários cronExpr + a seleção de "vencidos" + o cálculo do próximo `nextRunAt`); bordas (DB/cron/UI) via `tsc` + E2E. **Reuso máximo**; **coordinator INTACTO** (o cron é um caller).
3. **Migração:** criar arquivo de migração formal p/ `ScheduledTeamRun` e **aplicá-la manualmente** no host real (`migrate deploy`) — não confiar no `db push` do deploy (lição do SP2).
4. **Um sprint por sessão; commit limpo por fatia; push ao concluir** (push na `main` = deploy app+worker). **E2E com o usuário** (cadastrar um agendamento, bater no endpoint de cron com o `CRON_SECRET`, confirmar que um `TeamRun` foi disparado e `nextRunAt` avançou).

> Comece confirmando comigo o **escopo e as decisões do SP3** antes de escrever spec ou código.
