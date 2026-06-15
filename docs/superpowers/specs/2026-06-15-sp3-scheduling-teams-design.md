# Design — SP3: Scheduling/cron → Teams

**Data:** 2026-06-15
**Status:** aprovado (brainstorming) — pronto para writing-plans
**Programa:** Migração Orquestrações → Teams (ver `2026-06-15-orchestrations-to-teams-migration-design.md`, seção "SP3")

## Contexto

Terceira capacidade a portar da engine de Orquestrações para Teams: **agendamento** ("rode esta missão toda segunda 8h"). Como **não há dado em produção a preservar** (decisão do programa), o SP3 redesenha limpo: cria um modelo novo apontando para `Team`, e o cron **dispara o Team run que já existe** em vez de reimplementar um executor sequencial inline.

### Estado atual (referência — a substituir, não a tocar)

- **Modelo** `ScheduledExecution` (`prisma/schema.prisma:939`): FK → `AgentOrchestration`, `userId`, `cronExpr`, `label`, `inputTemplate` (JSON string), `nextRunAt`, `lastRunAt`, `lastStatus`, `isActive`. `@@map("scheduled_executions")`.
- **Cron** `src/app/api/cron/run-scheduled/route.ts`: `GET` autenticado por `Bearer CRON_SECRET`; busca `scheduledExecution` vencidos e **roda um executor sequencial inline próprio** (cria `OrchestrationExecution`, chama `chatWithAgent` agente-a-agente). Contém `getNextRunAt(cronExpr, from)` inline (parser cron simples de 5 campos).
- **CRUD** `src/app/api/dashboard/scheduled-executions/route.ts`: GET/POST; contém uma **segunda cópia** de `getNextRunAt`.
- **Run trigger de Teams que vamos reusar** `src/app/api/teams/[id]/run/route.ts:45-84`: cria `TeamRun` + dispara `runTeam` via `after()` (chat) **ou** fila BullMQ + worker (code). Hoje a lógica está **inline na rota** e exige `getAuthFromRequest`.

Estes três arquivos legados (`ScheduledExecution`, `run-scheduled`, `scheduled-executions`) **NÃO são tocados no SP3** — são deletados no SP6.

## Decisões (confirmadas com o usuário)

1. **Arquitetura recomendada:** modelo novo `ScheduledTeamRun` + helper compartilhado `startTeamRun` + endpoint de cron novo; legado intacto.
2. **UX do cron:** presets amigáveis (diário / semanal+dia / mensal+dia + horário). O parser só precisa cobrir o que os presets geram.
3. **Modo do run:** chat **e** code. O dialog deixa escolher; code reusa o repo default do `Team.config`.

## Arquitetura

Quatro unidades, cada uma com um propósito e testável isoladamente. **Invariante do programa:** o coordinator (`runTeam`) fica INTACTO — o cron é apenas mais um *caller* do disparo.

```
[UI: TeamSchedulesPanel] ──HTTP──> [/api/teams/[id]/schedules CRUD]
                                          │ usa cronFromPreset + getNextRunAt (puros)
                                          ▼
                                   [ScheduledTeamRun] (DB)
                                          ▲
[cron-job.org] ──Bearer CRON_SECRET──> [/api/cron/run-scheduled-teams]
                                          │ busca vencidos, recalcula nextRunAt
                                          ▼
                                   [startTeamRun()] (helper compartilhado)
                                          │ cria TeamRun + dispara
                                          ▼
                          after(runTeam) (chat)  |  enqueueCodeRun (code)
                                          ▲
[/api/teams/[id]/run] (rota de sessão) ───┘ (mesmo helper)
```

### 1. Modelo de dados — `ScheduledTeamRun`

```prisma
model ScheduledTeamRun {
  id         String    @id @default(uuid()) @db.Uuid
  teamId     String    @map("team_id") @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  cronExpr   String    @map("cron_expr") @db.VarChar(100)   // gerado do preset, ex. "0 8 * * 1"
  label      String?   @db.VarChar(255)
  mission    String    @db.Text                              // o que o Team run consome
  mode       String    @default("chat") @db.VarChar(20)      // 'chat' | 'code'
  nextRunAt  DateTime  @map("next_run_at") @db.Timestamptz()
  lastRunAt  DateTime? @map("last_run_at") @db.Timestamptz()
  lastStatus String?   @map("last_status") @db.VarChar(20)   // 'dispatched' | 'failed'
  lastRunId  String?   @map("last_run_id") @db.Uuid          // ponteiro p/ o TeamRun gerado (não-FK)
  isActive   Boolean   @default(true) @map("is_active")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt  DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@index([userId])
  @@index([isActive])
  @@index([nextRunAt])
  @@map("scheduled_team_runs")
}
```

Back-relations a adicionar: `scheduledTeamRuns ScheduledTeamRun[]` em `Team` e em `User`.

**Semântica de `lastStatus` (decisão de design não-óbvia):** o Team run é **assíncrono** (`after()`/fila) — o cron só sabe se **disparou**, não o resultado final. Por isso `lastStatus ∈ {'dispatched','failed'}` reflete o **disparo**, e `lastRunId` aponta pro `TeamRun` gerado. A UI mostra o status real **do run** (clicando no link); o `TeamRun.status` é a fonte da verdade do resultado. Isso evita acoplar scheduling no lifecycle do coordinator. `lastRunId` é um ponteiro simples (não-FK) pra não exigir back-relation em `TeamRun`.

### 2. Helper compartilhado — `startTeamRun()`

Novo módulo `src/lib/orchestration/team/start-team-run.ts`. Extrai o disparo hoje inline em `run/route.ts:45-84`:

```ts
type StartTeamRunInput = { mission: string; mode: 'chat' | 'code'; userId: string; repoUrl?: string; base?: string }
type StartTeamRunResult = { runId: string; mode: 'chat' | 'code' }

async function startTeamRun(teamId: string, input: StartTeamRunInput): Promise<StartTeamRunResult>
```

Responsabilidades (idênticas ao que a rota faz hoje, sem regressão):
1. Carrega `team` + `members` por `id` **e** `createdBy === userId` (ownership). Não achado → lança `TeamRunError('not_found')`.
2. Valida roster: precisa de ≥1 `lead` e ≥1 `worker`. Inválido → `TeamRunError('invalid_roster')`.
3. `mission` vazia → `TeamRunError('missing_mission')`.
4. Para `mode==='code'`: resolve `repoUrl`/`baseBranch` do `input` ou do `Team.config` (mesma lógica `pick(...)` da rota). Token git **nunca** é tocado aqui.
5. Cria `TeamRun` (`status:'pending'`, `mode`, `repoUrl`, `baseBranch`).
6. Dispara:
   - `code` → `import('@/lib/queue/code-run-queue').enqueueCodeRun(run.id)`; falha → marca run `failed` + lança `TeamRunError('queue_unavailable')`.
   - `chat` → `after(async () => { runTeam(...); dispatchTeamOutputs(run.id) })` (cópia exata do bloco atual).
7. Retorna `{ runId, mode }`.

**`after()` funciona dentro de qualquer request handler** — tanto a rota de run quanto o endpoint de cron são handlers, então ambos podem chamar o helper. `TeamRunError` carrega um `code` que o caller mapeia para o status HTTP correto.

**Refactor da rota:** `POST /api/teams/[id]/run` passa a fazer `getAuthFromRequest` + ler body → `startTeamRun(id, { mission, mode, userId: auth.id, repoUrl, base })`, traduzindo `TeamRunError.code` → 404/400/503 (preservando as respostas atuais). Comportamento externo idêntico.

### 3. Módulo puro — `src/lib/orchestration/team/schedule.ts`

Consolida a lógica de cron hoje **duplicada** em dois arquivos, mais a conversão preset→cron. Sem imports de DB (tsx-testável, imports relativos no teste).

```ts
type SchedulePreset =
  | { frequency: 'daily';   hour: number; minute: number }
  | { frequency: 'weekly';  hour: number; minute: number; dayOfWeek: number }   // 0=Dom..6=Sáb
  | { frequency: 'monthly'; hour: number; minute: number; dayOfMonth: number }  // 1..31

function cronFromPreset(p: SchedulePreset): string   // → "m h dom * dow"
function getNextRunAt(cronExpr: string, from?: Date): Date
function isDue(nextRunAt: Date, now?: Date): boolean // nextRunAt <= now
```

- `cronFromPreset`: `daily` → `"m h * * *"`; `weekly` → `"m h * * dow"`; `monthly` → `"m h dom * *"`.
- `getNextRunAt`: porta o comportamento existente (5 campos), consolidando as duas cópias na versão mais correta. Cobre os 3 formatos que `cronFromPreset` gera; fallback para "próxima hora redonda" se a expressão não tiver 5 campos. Sempre retorna uma data **estritamente futura** em relação a `from`.

### 4. Endpoint de cron — `GET /api/cron/run-scheduled-teams`

`src/app/api/cron/run-scheduled-teams/route.ts`. Mesmo padrão de auth do `run-scheduled` legado:
- `Authorization: Bearer ${CRON_SECRET}` (default código `sofia-cron-secret-2026`); mismatch → 401.
- Busca `prisma.scheduledTeamRun.findMany({ where:{ isActive:true, nextRunAt:{ lte:now } }, take:50 })`.
- Para cada agendamento vencido:
  - `try`: `startTeamRun(teamId, { mission, mode, userId })` → grava `lastRunId=runId`, `lastStatus='dispatched'`.
  - `catch`: `lastStatus='failed'` (log do erro).
  - Em ambos: `lastRunAt=now`, `nextRunAt=getNextRunAt(cronExpr, now)` (o relógio sempre avança, espelhando o legado).
- Retorna `{ processed, results:[{scheduleId,status,error?}], timestamp }`.
- `export const dynamic = 'force-dynamic'`, `maxDuration = 300`.

Legado `run-scheduled` permanece intocado.

### 5. CRUD API — agendamentos do time

- `src/app/api/teams/[id]/schedules/route.ts`
  - `GET`: lista `ScheduledTeamRun` do time (ownership: `team.createdBy === auth.id`), ordenado por `createdAt desc`.
  - `POST`: body `{ preset: SchedulePreset, label?, mission, mode }`. Valida posse do time + roster mínimo + `mission` não-vazia + `mode ∈ {chat,code}`. Calcula `cronExpr = cronFromPreset(preset)` e `nextRunAt = getNextRunAt(cronExpr)`. Cria com `userId = auth.id`. → 201.
- `src/app/api/teams/[id]/schedules/[scheduleId]/route.ts`
  - `PATCH`: alterna `isActive` e/ou edita `label`/`mission`/`mode`/`preset` (recalcula `cronExpr`+`nextRunAt` se o preset mudar). Ownership via team.
  - `DELETE`: remove o agendamento (ownership via team).

Rotas Next.js 16: `params: Promise<{...}>`, `await params`. Auth via `getAuthFromRequest` → `auth.id`.

### 6. UI — `TeamSchedulesPanel.tsx`

`src/app/dashboard/teams/[id]/TeamSchedulesPanel.tsx`, recriando o padrão de `TeamOutputsPanel.tsx` (client component, fetch das rotas acima), montado na sala do time.

- **Lista:** cada agendamento mostra `label` (ou a recorrência amigável derivada do preset), modo (chat/code), `nextRunAt`, último run (`lastRunAt` + link pra `/dashboard/teams/[id]` no run `lastRunId` quando houver), toggle `isActive`, botão excluir.
- **Form "novo agendamento":** textarea `mission`; toggle modo chat/code; selector de frequência (diário / semanal / mensal); time picker (hora:minuto); selector de dia condicional (dia-da-semana p/ semanal, dia-do-mês p/ mensal); `label` opcional. Envia `{ preset, label, mission, mode }`.
- A recorrência amigável é derivada do `preset`/`cronExpr` no client (helper de label simples) — sem coluna extra no banco.

## Migração

Lição do SP2: o `db push` do `CMD` do Dockerfile **não roda no runner standalone** → a tabela nova nunca seria criada em prod e o client (regenerado no build) quebraria as reads. Portanto:

1. **Criar arquivo de migração formal** `prisma/migrations/<YYYYMMDDHHMMSS>_add_scheduled_team_runs/migration.sql` — aditivo: `CREATE TABLE scheduled_team_runs (...)` + 4 índices + 2 FKs (`team_id`→`teams`, `user_id`→`users`, ambas `ON DELETE CASCADE`). Commitar.
2. **Aplicar MANUALMENTE** no host real de prod `postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable` via `node node_modules/prisma/build/index.js migrate deploy` (o `.env` aponta pro `bot@31.97.23.166:5499` que dá timeout — NÃO usar). Não confiar no deploy.

## Testes

- **`scripts/sp3-verify.ts`** (tsx, `node:assert`, imports **relativos** para a lógica pura de `schedule.ts`):
  - `cronFromPreset`: daily/weekly/monthly geram a string esperada.
  - `getNextRunAt`: rollover diário (passou da hora → amanhã), semanal (próximo dia-da-semana alvo; mesma-dia → +7), mensal (dia-do-mês; passou → mês seguinte), fallback de expressão malformada. Resultado sempre estritamente futuro.
  - `isDue`: vencido vs. futuro.
- **Bordas** (helper `startTeamRun`, cron, CRUD, UI): `npx tsc --noEmit` (aceitar só os erros pré-existentes de módulos não instalados / client Prisma stale — campos novos do schema aparecem/somem no build do EasyPanel).
- **E2E com o usuário (gate real = deploy EasyPanel):** cadastrar um agendamento na sala do time → bater em `/api/cron/run-scheduled-teams` com `Bearer CRON_SECRET` → confirmar que um `TeamRun` foi criado/disparado e que `nextRunAt` avançou. Depois, cadastrar a URL no cron-job.org + garantir `CRON_SECRET` no EasyPanel.

## Reuso e invariantes

- **Coordinator `runTeam` INTACTO** — o cron e a rota são *callers* do helper.
- **Helper `startTeamRun` é o ponto de reuso do SP4** (variante API-key chama o mesmo helper).
- **`getNextRunAt` deixa de estar duplicado** — fonte única em `schedule.ts`.
- Commit limpo por fatia (a árvore tem mudanças não-relacionadas que NÃO entram); caminhos com `[id]` via pathspec `:(literal)`.

## Fora de escopo

- Tocar `ScheduledExecution` / `run-scheduled` / `scheduled-executions` — deletados no **SP6**.
- Variante API-key do disparo — **SP4** (mas o helper já é desenhado pra ela).
- Migração de dados — não há.
- Parser cron completo (campos avançados, ranges, listas) — YAGNI; só o subconjunto que os presets geram.
