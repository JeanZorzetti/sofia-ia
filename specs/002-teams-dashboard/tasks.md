# Tasks: Dashboard Teams-first (Analytics de Teams)

**Input**: Design documents from `specs/002-teams-dashboard/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/teams-overview.md](./contracts/teams-overview.md)

**Tests**: NÃO solicitados. Feature de leitura/apresentação; jest roda só no CI (OneDrive corrompe node_modules local). Validação via [quickstart.md](./quickstart.md) (manual/E2E).

**Organization**: Tarefas agrupadas por user story (US1–US3) para entrega/validação incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1–US3
- **[HUMAN]**: parada dura para o loop Ralph (exige browser/login/deploy — não autônomo)
- Caminhos de arquivo exatos nas descrições

## Path Conventions

Web app (Next.js App Router). Arquivos-alvo:
- `src/app/api/teams/overview/route.ts` (endpoint de leitura novo)
- `src/app/dashboard/page.tsx` (home reescrita)
- `src/app/dashboard/TeamsActivityChart.tsx` (gráfico — US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ancorar o refactor no comportamento atual.

- [ ] T001 Revisar baseline (sem mudança de código): mapear na home atual `src/app/dashboard/page.tsx` os widgets de atendimento a remover (Conversas Ativas, Taxa de Conversão, Leads Qualificados, Tempo Médio Resposta, Total Mensagens, Conversas Recentes; `useRecentConversations`, fetch de `/api/analytics/overview`) e o que preservar (seletor 7/30/90, badge de saúde, onboarding); confirmar o padrão de `src/app/api/analytics/overview/route.ts` (`withAll` + `parsePeriod` + `getAuthFromRequest`) e o code-split de `src/app/dashboard/DashboardActivityChart.tsx`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Endpoint de leitura compartilhado que alimenta a home. **Bloqueia US1–US3.**

- [ ] T002 Criar `GET /api/teams/overview` em `src/app/api/teams/overview/route.ts`: `withAll(handler, { ttl: TTL.MEDIUM, limiter: rateLimiters.analytics })` + `getAuthFromRequest`→`auth.id` (401 sem auth) + `parsePeriod(period,startDate?,endDate?)` (mesma semântica 7d/30d/90d/custom do analytics). Retornar o bloco `overview` (FR-003): `teams` (count `status='active'` do usuário), `runsTotal/runsCompleted/runsFailed/runsRunning`, `successRate` (completed ÷ finalizados), `tasksExecuted` (TeamTask `status='done'`), agregando `team_runs` com `where: { team: { createdBy: auth.id }, startedAt: { gte, lte } }`. Converter `estimatedCost` com `Number()`. Conforme [contracts/teams-overview.md](./contracts/teams-overview.md).

**Checkpoint**: endpoint responde os KPIs essenciais escopados ao usuário.

---

## Phase 3: User Story 1 - Overview Teams-first (Priority: P1) 🎯 MVP

**Goal**: A home deixa de ser de atendimento e passa a mostrar o estado da operação de Teams + CTA.

**Independent Test**: `/dashboard` com Teams/execuções mostra KPIs de Teams e nenhum widget de atendimento; conta sem Teams mostra estado vazio com CTA "Criar Team".

- [ ] T003 [US1] Reescrever `src/app/dashboard/page.tsx`: REMOVER todos os widgets de atendimento e o `useRecentConversations`/fetch de atendimento (FR-002); PRESERVAR o seletor de período (7/30/90), o badge de saúde (`useApiHealth`) e a lógica de onboarding (redirect `/onboarding` + wizard). Trocar a fonte de dados por `fetch('/api/teams/overview?period=...')`.
- [ ] T004 [US1] Em `src/app/dashboard/page.tsx`, renderizar os KPIs essenciais de Teams a partir do `overview` (Teams, Execuções no período, Taxa de sucesso, Tasks executadas) (FR-003), com skeleton de loading e estado de erro tolerante (FR-011).
- [ ] T005 [US1] Em `src/app/dashboard/page.tsx`, adicionar o CTA primário "Criar Team" (link para a criação de Team) e o estado vazio (conta sem Teams) convidando a criar o primeiro Team em 1 clique (FR-004, SC-005).

**Checkpoint**: US1 funcional e testável (MVP) — home Teams-first sem atendimento.

---

## Phase 4: User Story 2 - Execuções Recentes (Priority: P2)

**Goal**: Lista de execuções recentes (TeamRuns) na home, com navegação ao detalhe.

**Independent Test**: com execuções, a home lista as mais recentes (time/status/início/duração) e clicar abre `/dashboard/teams/[id]`; sem execuções → estado vazio.

- [ ] T006 [US2] Estender `src/app/api/teams/overview/route.ts` para incluir `recentRuns[]` (ordenado `startedAt desc`, limite ~6–8): `{ id, teamId, teamName, status, startedAt, durationMs }`, escopado por `team.createdBy = auth.id` (FR-007). Conforme contrato.
- [ ] T007 [US2] Em `src/app/dashboard/page.tsx`, renderizar a seção "Execuções Recentes" (time, status, início, duração; `durationMs` null → "em andamento"), com link por item para `/dashboard/teams/[teamId]` e estado vazio coerente (FR-007, FR-011).

**Checkpoint**: US1 + US2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Métricas ricas de Teams (Priority: P3)

**Goal**: Duração média, sucesso/falha, custo/tokens (incl. por membro) e gráfico de atividade no período.

**Independent Test**: no período, a home mostra duração média, sucesso/falha e (se houver dados) custo/tokens; o gráfico reflete o período e recalcula ao trocar 7/30/90.

- [ ] T008 [US3] Estender `src/app/api/teams/overview/route.ts` para incluir `timeline[]` (`{date,runs,tasks,cost}` por dia), os agregados ricos (`avgDurationMs` ignorando nulos, `totalTokens`, `totalCost`) e `byMember[]` (Σ `tokens` de `team_member_usage` por membro, nome via `member.agent.name`), conforme [data-model.md](./data-model.md) e contrato.
- [ ] T009 [P] [US3] Criar `src/app/dashboard/TeamsActivityChart.tsx` (recharts, `dynamic` `ssr:false`, skeleton no loading) espelhando o padrão de `DashboardActivityChart.tsx`; série diária `{ date, execuções, tasks, custo }`.
- [ ] T010 [US3] Em `src/app/dashboard/page.tsx`, renderizar os cards de métricas ricas (duração média, distribuição sucesso/falha, custo/tokens — e por-membro quando houver) com omissão graciosa quando os dados forem ausentes (FR-008), e montar o `TeamsActivityChart` a partir do `timeline` (FR-009).

**Checkpoint**: US1, US2 e US3 funcionam de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Não-regressão, build e validação ponta a ponta.

- [ ] T011 Não-regressão em `src/app/dashboard/page.tsx`: onboarding (redirect/wizard) intacto, seletor 7/30/90 recalcula os KPIs sensíveis a período, badge de saúde funcionando, e **zero** widget de atendimento remanescente (SC-001/SC-006); confirmar `src/app/dashboard/layout.tsx` como NO-OP.
- [ ] T012 Gate de build: `npm run typecheck` + `npm run build` — exigir `Compiled successfully` (ignorar a falha de cópia do `standalone`, OneDrive errno -4094, ambiental).
- [ ] T013 [HUMAN] Executar os cenários 1–3 + multi-tenant de [quickstart.md](./quickstart.md) em dev (`next dev --webpack`) — exige browser/login.
- [ ] T014 [HUMAN] Validação E2E autenticada em produção (`polarisia.com.br`) após deploy — gate da constituição (V); exige deploy + login.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; **bloqueia US1–US3** (todas consomem o endpoint).
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da Foundational + da reescrita da page (US1/T003).
- **US3 (Phase 5)**: depende da Foundational + da reescrita da page (US1/T003).
- **Polish (Phase 6)**: depende das stories desejadas concluídas.

### User Story Dependencies

- US1 (P1): após Foundational. É a base estrutural da page.
- US2 (P2): após Foundational; adiciona seção à page reescrita na US1 (independentemente testável).
- US3 (P3): após Foundational; adiciona seção à page reescrita na US1 (independentemente testável).

### Parallel Opportunities

- T009 [P] (novo arquivo `TeamsActivityChart.tsx`) é autocontido e pode ser feito em paralelo ao endpoint (T008), antes de ser montado em T010.
- Como `route.ts` e `page.tsx` são tocados por várias stories, o paralelismo real é limitado; priorize ordem sequencial por story.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup (T001) → Foundational (T002) → US1 (T003–T005).
2. **PARAR e VALIDAR** US1 (home Teams-first sem atendimento + CTA).
3. Deploy/demo do MVP se desejado.

### Incremental Delivery

1. Foundational → endpoint pronto.
2. + US1 → validar → MVP (home deixa de ser "Sofia").
3. + US2 (Execuções Recentes) → validar.
4. + US3 (métricas ricas + gráfico) → validar.
5. Polish (build + quickstart + E2E prod).

### Notas

- Sem tarefas de teste (não solicitadas); validação = `quickstart.md` + E2E prod.
- Coordinator `runTeam` intocado; sem schema/migração; endpoint é read-side escopado por `createdBy`.
- **Ralph**: T013 e T014 são `[HUMAN]` — o loop deve escrever `RALPH_HALT` e parar nelas (browser/login/deploy). T012 (gate) o loop executa.
- Commit por tarefa ou grupo lógico; parar em qualquer checkpoint para validar a story.
