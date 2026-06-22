# Phase 0 — Research: Dashboard Teams-first

Decisões técnicas resolvidas a partir da leitura do schema (`prisma/schema.prisma`),
de `src/app/api/analytics/overview/route.ts`, `src/app/api/teams/route.ts` e da home atual
(`src/app/dashboard/page.tsx`). Nenhum NEEDS CLARIFICATION pendente.

## D1 — Escopo multi-tenant: por criador, NÃO por organização

- **Decisão**: escopar todas as métricas por `team.createdBy = auth.id`.
- **Rationale**: o modelo `Team` **não** tem `organizationId` — só `createdBy` (FK User). A rota
  existente `GET /api/teams` já lista por `where: { createdBy: auth.id, status: 'active' }`. O
  seletor de "workspace" na sidebar (`sofia_active_workspace`) não particiona Teams hoje.
- **Impacto no spec**: a premissa "usuário/Organização" vira **usuário (`createdBy`)**. Org-scoping
  exigiria mudança de schema — fora do escopo (constituição III, sem migração).
- **Alternativa rejeitada**: filtrar por organização → exige coluna nova + migração.

## D2 — Custo/duração/tokens JÁ EXISTEM (US3 entrega de verdade)

- **Decisão**: a seção de métricas ricas (US3) é implementada, não omitida.
- **Dados disponíveis** em `TeamRun`: `durationMs`, `tokensUsed`, `estimatedCost` (Float),
  `turnsUsed`, `startedAt`, `completedAt`. Por **membro**: `TeamMemberUsage` (V2 S2.2) —
  `runId`, `memberId`, `model`, `tokens` (append-only por chamada; agrega no read).
- **Fallback (FR-008)**: runs/linhas antigas com campo nulo → tratados como `0`/indisponível,
  sem distorcer médias (ex.: média de duração só sobre runs com `durationMs != null`).
- **Decimais**: `estimatedCost` é `Float` no Prisma — converter com `Number()` ao agregar.

## D3 — Semântica de status (base de "taxa de sucesso" e "tasks executadas")

- **TeamRun.status** (do coordinator): `pending`, `running` (em andamento) · `completed`,
  `failed`, `rate_limited`, `cancelled` (terminais — ver `start-team-run.ts`).
- **Decisão**:
  - **Em andamento** = `{pending, running}` → não entram no denominador de sucesso; duração = "em andamento".
  - **Finalizados** = `{completed, failed, rate_limited, cancelled}`.
  - **Taxa de sucesso** = `completed` ÷ finalizados (no período).
- **TeamTask.status**: default `todo`; concluída = `done`. **"Tasks executadas"** = tasks com `status='done'`.

## D4 — Endpoint: espelhar /api/analytics/overview

- **Decisão**: criar `GET /api/teams/overview` reaproveitando o padrão existente:
  - `withAll(handler, { ttl: TTL.MEDIUM, limiter: rateLimiters.analytics })` (cache 5min + rate-limit).
  - `getAuthFromRequest(request)` → 401 se ausente; usar `auth.id`.
  - `parsePeriod(period, startDate?, endDate?)` (copiar a mesma função/semântica 7d/30d/90d/custom).
  - Query única em `team_runs` com `where: { team: { createdBy: auth.id }, startedAt: { gte, lte } }`,
    `include`/`select` mínimo + `team: { select: { name: true } }`; agregação em JS (volume baixo).
  - Contagens de inventário (`teams`) via `prisma.team.count({ where: { createdBy: auth.id, status: 'active' } })`.
- **Diferença vs analytics legado**: o legado lê a tabela agregada `AnalyticsDaily` **sem** escopo de
  usuário (dado global de atendimento). O novo lê `TeamRun` **escopado** (D1) — não reutilizar a
  AnalyticsDaily.
- **Alternativa rejeitada**: estender `/api/analytics/overview` → mistura domínios (atendimento vs Teams)
  e o legado não é escopado; mais limpo um endpoint dedicado.

## D5 — Gráfico: reusar o padrão recharts code-split

- **Decisão**: novo `TeamsActivityChart.tsx` espelhando `DashboardActivityChart` (dynamic import,
  `ssr:false`, skeleton no loading). Série diária = `{ date, execuções, tasks, custo }`.
- **Rationale**: recharts é pesado e DOM-only; a home já usa esse padrão de code-split.

## D6 — Link "detalhe da execução" (US2)

- **Decisão**: a lista "Execuções Recentes" linka para `/dashboard/teams/[id]` (página de detalhe do
  time, onde as runs já são exibidas). **Não** existe rota de UI dedicada por run
  (`/dashboard/teams/[id]/runs/[runId]` é só API).
- **A confirmar em tasks**: se a página do time aceita um parâmetro para focar a run específica
  (ex.: `?run=<id>`). Aceitável para v1 linkar ao time.

## D7 — "Teams" (contagem de inventário)

- **Decisão**: KPI "Teams" = total de times ativos do usuário (`status='active'`, `createdBy=auth.id`),
  **não** sensível ao período. Os demais KPIs de execução (runs, tasks, sucesso, duração, custo) são
  sensíveis ao período selecionado.

## Itens herdados / não-funcionais

- **Onboarding**: preservar a lógica atual da page (checa `/api/auth/profile` → redirect `/onboarding`,
  fallback wizard). Não tocar.
- **Badge de saúde + seletor 7/30/90**: preservar.
- **Estados**: loading (skeleton), vazio (CTA criar Team / "sem execuções"), em andamento — sem erro
  nem spinner infinito (FR-011).
