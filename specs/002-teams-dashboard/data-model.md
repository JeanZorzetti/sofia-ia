# Phase 1 — Data Model (read-side): Dashboard Teams-first

**Sem novas entidades persistidas e sem migração.** Esta feature define apenas **view-models**
de leitura, agregados a partir de tabelas existentes. Fonte: `prisma/schema.prisma`
(`Team`, `TeamRun`, `TeamTask`, `TeamMemberUsage`, `TeamMember`).

## Entidades de origem (existentes — referência)

- **Team** (`teams`): `id`, `name`, `status` ('active'…), `createdBy` (FK User), `createdAt`. Scoping: `createdBy`.
- **TeamRun** (`team_runs`): `id`, `teamId`, `status` (`pending|running|completed|failed|rate_limited|cancelled`), `startedAt`, `completedAt`, `durationMs?`, `tokensUsed?`, `estimatedCost?` (Float), `turnsUsed?`.
- **TeamTask** (`team_tasks`): `id`, `runId`, `status` (`todo|done|…`), `assigneeId?`.
- **TeamMemberUsage** (`team_member_usage`): `id`, `runId`, `memberId?`, `model?`, `tokens` (append-only por chamada).
- **TeamMember** (`team_members`): `id`, `teamId`, `agentId`, `role`; nome via `agent.name`.

## View-models (saída do endpoint / consumo da page)

### TeamsOverview (período-sensível, exceto `teams`)
| Campo | Tipo | Derivação |
|-------|------|-----------|
| `teams` | int | `team.count({ createdBy: auth.id, status:'active' })` — inventário (D7) |
| `runsTotal` | int | runs no período (por `startedAt`) |
| `runsCompleted` | int | runs `completed` no período |
| `runsFailed` | int | runs `failed` no período |
| `runsRunning` | int | runs `{pending,running}` no período |
| `successRate` | number (%) | `runsCompleted ÷ finalizados` (finalizados = completed+failed+rate_limited+cancelled); 0 se denominador 0 |
| `tasksExecuted` | int | `teamTask.count` com `status='done'` em runs do período |
| `avgDurationMs` | int | média de `durationMs` sobre runs com `durationMs != null` no período |
| `totalTokens` | int | Σ `tokensUsed` (nulos = 0) |
| `totalCost` | number | Σ `Number(estimatedCost)` (nulos = 0) |

### RecentRun[] (US2 — últimas N, ex.: 6–8, ordenado `startedAt desc`)
| Campo | Tipo | Origem |
|-------|------|--------|
| `id` | string | `TeamRun.id` |
| `teamId` | string | `TeamRun.teamId` (link → `/dashboard/teams/[teamId]`) |
| `teamName` | string | `team.name` |
| `status` | string | `TeamRun.status` |
| `startedAt` | ISO string | `TeamRun.startedAt` |
| `durationMs` | int \| null | `TeamRun.durationMs` (null → "em andamento") |

### TeamsTimelinePoint[] (US3 — agrupado por dia no período)
| Campo | Tipo | Derivação |
|-------|------|-----------|
| `date` | `YYYY-MM-DD` | dia de `startedAt` |
| `runs` | int | runs iniciadas no dia |
| `tasks` | int | tasks `done` no dia |
| `cost` | number | Σ `estimatedCost` no dia |

### MemberUsage[] (US3 — por membro, opcional/condicional aos dados)
| Campo | Tipo | Derivação |
|-------|------|-----------|
| `memberId` | string \| null | `TeamMemberUsage.memberId` |
| `memberName` | string | via `member.agent.name` (fallback "—") |
| `tokens` | int | Σ `tokens` no período |
| `model` | string \| null | modelo predominante (opcional) |

## Regras de validação / invariantes

- **Isolamento**: toda agregação parte de `team: { createdBy: auth.id }` (FR-010). Nenhuma query
  global (≠ do legado AnalyticsDaily).
- **Em andamento ≠ falha**: `{pending,running}` nunca contam como sucesso nem falha (D3).
- **Nulos não distorcem médias**: `avgDurationMs` ignora `durationMs=null`; somas tratam nulo como 0.
- **Período**: `teams` é inventário (absoluto); o resto respeita `[startDate,endDate]` de `parsePeriod` (FR-006).
- **Somente leitura**: nenhuma escrita; coordinator intocado (FR-012).
