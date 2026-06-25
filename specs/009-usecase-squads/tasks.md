---
description: "Task list — 009 Squads por Case de Uso sobre Empresas"
---

# Tasks: Squads por Case de Uso sobre Empresas

**Input**: Design documents from `specs/009-usecase-squads/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: INCLUÍDOS — o plano (Testing) e a constituição pedem unit nos helpers puros, teste do gate de
fila (single-flight) e testes IDOR/auth nas rotas novas. Escrever os testes ANTES da implementação (falham
primeiro). jest roda no **CI** (não local — OneDrive errno -4094).

**Organização**: agrupado por user story (US1 P1 = MVP, US2/US3 P2, US4 P3). Cada story é entregável e
testável de forma independente.

## Format: `[ID] [P?] [Story] Description`
- **[P]** = pode rodar em paralelo (arquivos diferentes, sem dependência).
- Caminhos exatos nas descrições. **Coordinator (`runTeam`) NUNCA é editado** (Princípio II).

---

## Phase 1: Setup (estrutura compartilhada)

- [ ] T001 Criar os diretórios da feature: `src/components/dashboard/squads/`,
  `src/app/dashboard/empresas/`, `src/app/api/companies/[id]/squads/`,
  `src/app/api/cron/drain-squad-queue/` (scaffolding vazio; `src/lib/companies/` já existe).

---

## Phase 2: Foundational (BLOQUEIA todas as stories)

**⚠️ CRÍTICO**: nenhuma user story começa antes desta fase.

- [ ] T002 Schema: em `prisma/schema.prisma`, adicionar `companyId String? @map("company_id") @db.Uuid` +
  `company Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)` + `@@index([companyId])`
  no model `Team`; adicionar o lado inverso `teams Team[]` no model `Company`.
- [ ] T003 Migração formal `add_team_company_id` via `prisma migrate dev --create-only`; revisar SQL (coluna
  nullable + index + FK; **sem drop**). **Aplicar com `prisma migrate deploy` MANUALMENTE no host real
  `2.24.207.200:5435`** ANTES do push (Princípio III). Rodar `prisma generate`. *(bloqueante, sequencial)*
- [ ] T004 [P] Schemas zod em `src/lib/validation.ts`: `createSquadSchema` (name, useCase, members[{agentId,
  role∈lead|worker|reviewer}]), `patchSquadSchema`, `runSquadSchema` (mission).
- [ ] T005 [P] `src/lib/companies/squad-store.ts` (base): predicado `isSquadWhere` (= `companyId != null AND
  status='active'`), serializador `toSquadDTO`, e helper de escopo por dono (reuso de `ownerId(auth)` +
  `Company.createdBy`). Sem lógica de fila ainda.
- [ ] T006 [P] Unit test `tests/unit/squad-store.test.ts`: predicado de squad e os schemas zod (1 lead
  obrigatório, role inválida rejeitada). *(falha antes do T004/T005)*

**Checkpoint**: coluna + escopo prontos; stories podem começar.

---

## Phase 3: User Story 1 — Rodar um squad enxuto por case de uso (P1) 🎯 MVP

**Goal**: compor um squad referenciando o pool e disparar uma tarefa; só os 2-4 membros executam.

**Independent Test**: `POST …/squads` (3 membros) + `POST …/squads/[id]/run` → confirmar que apenas esses
agentes rodam e a tarefa conclui (verificável via API/timeline do TeamRun), sem outros cargos da empresa.

### Tests (escrever primeiro)
- [ ] T007 [P] [US1] `tests/integration/squads-create-run.route.test.ts`: IDOR/auth de `POST /api/companies/[id]/squads`
  e `POST /api/companies/[id]/squads/[squadId]/run` (empresa de outro dono → 404; sem auth → 401).
- [ ] T008 [P] [US1] `tests/unit/squad-create.test.ts`: validação de composição (exatamente 1 lead; agentes
  pertencem ao dono; tamanho > teto → aviso).

### Implementação
- [ ] T009 [US1] `squad-store.createSquad(companyId, {name, useCase, members}, ownerId)` — reusa
  `createTeamWithRoster` com `status:'active'`, `companyId`, `config:{ useCase }`; membros referenciam o pool
  (sem duplicar Agent). (em `src/lib/companies/squad-store.ts`)
- [ ] T010 [US1] `src/app/api/companies/[id]/squads/route.ts` — `POST` criar squad (valida `createSquadSchema`,
  escopo dono) → 201 `{squadId}`. *(GET fica na US2)*
- [ ] T011 [US1] `src/app/api/companies/[id]/squads/[squadId]/route.ts` — `GET` detalhe + `PATCH`
  (nome/useCase/membros, revalida) + `DELETE`. Todos escopados por dono (IDOR → 404).
- [ ] T012 [US1] `src/lib/companies/squad-queue.ts` (versão inicial, **sem gate**): `enqueueSquadRun(squadId,
  mission)` cria `TeamRun(status:'pending')`; `dispatchSquadQueue()` (naive) pega o `pending` mais antigo e
  chama `runTeamAndWait` via `after()`. *(o gate WIP=1 entra na US3 — mesma assinatura, sem mexer na rota)*
- [ ] T013 [US1] `src/app/api/companies/[id]/squads/[squadId]/run/route.ts` — `POST` valida `runSquadSchema`,
  `enqueueSquadRun` + `after(dispatchSquadQueue)` → 202 `{runId, queued}`.

**Checkpoint**: dá pra criar e rodar um squad enxuto ponta-a-ponta (≤4 agentes). ✅ SC-001, FR-001/003/004/012.

---

## Phase 4: User Story 2 — `/empresas` navegável, separada de `/agentes` (P2)

**Goal**: superfície operacional onde a empresa é guarda-chuva e os squads são cards de "Rodar"; `/agentes`
volta a ser o catálogo do pool.

**Independent Test**: abrir `/dashboard/empresas`, entrar numa empresa, ver squads com useCase e disparar um
em ≤3 cliques; `/dashboard/agents` mostra o pool (não os squads).

### Tests (escrever primeiro)
- [ ] T014 [P] [US2] `tests/integration/squads-list.route.test.ts`: `GET /api/companies/[id]/squads` lista só
  os squads do dono (IDOR → 404).

### Implementação
- [ ] T015 [US2] `squad-store.listSquadsByCompany(companyId, ownerId)` — squads + `lastRun` (status/createdAt).
- [ ] T016 [US2] `GET` em `src/app/api/companies/[id]/squads/route.ts` (lista; complementa o POST do T010).
- [ ] T017 [P] [US2] Componentes em `src/components/dashboard/squads/`: `SquadCard.tsx` (nome+useCase+Rodar),
  `SquadComposer.tsx` (escolher agentes do pool + papéis), `SquadRunButton.tsx`.
- [ ] T018 [US2] `src/app/dashboard/empresas/page.tsx` — galeria de Empresas (porta a galeria que hoje vive em
  `/dashboard/agents`).
- [ ] T019 [US2] `src/app/dashboard/empresas/[companyId]/page.tsx` — porta o detalhe da empresa
  (`/dashboard/agents/empresa/[companyId]`) e adiciona a aba **"Squads"** (cards + composer); mantém a ação
  **opcional** "Executar empresa (fases SDLC)" → `runCompany` (FR runCompany preservado).
- [ ] T020 [US2] `src/app/dashboard/agents/page.tsx` — reverter para **catálogo do pool** (remover a galeria
  de Empresas, que migrou para `/empresas`); atualizar navegação/sidebar (link `/empresas`). Detalhe do
  AGENTE `/dashboard/agents/[id]` permanece intocado.

**Checkpoint**: US1 + US2 funcionam; operar squad pela UI em ≤3 cliques. ✅ SC-004, FR-005/006/007.

---

## Phase 5: User Story 3 — WIP=1 e fila global (proteção do pool) (P2)

**Goal**: no máximo 1 squad-run `running` em toda a plataforma; demais ficam `pending` (fila); integra a
resiliência 008.

**Independent Test**: disparar 2 squads em sequência rápida → o 2º fica `pending` até o 1º concluir; nunca 2
`running`.

### Tests (escrever primeiro)
- [ ] T021 [P] [US3] `tests/unit/squad-queue.test.ts`: invariante single-flight — sob N dispatches
  concorrentes, `count(running squad-runs) ≤ 1` (mock do claim/lock).
- [ ] T022 [P] [US3] `tests/integration/squad-queue-wip.route.test.ts`: 2º `POST …/run` retorna `queued:true`
  enquanto há um `running`; ao concluir o 1º, o 2º é promovido.

### Implementação
- [ ] T023 [US3] **Endurecer** `src/lib/companies/squad-queue.ts`: `dispatchSquadQueue()` em transação com
  `pg_advisory_xact_lock(<chave fixa>)` ($executeRaw); se existe squad-run `running` global → retorna; se
  existe `rate_limited` com `resetAt` futuro → retorna (pausa por pool esgotado, 008); senão *claim* atômico
  do `pending` mais antigo (`status='running'`, `startedAt`) e `after(() => runTeamAndWait(...).finally(dispatchSquadQueue))`.
- [ ] T024 [P] [US3] `src/app/api/squad-runs/queue/route.ts` — `GET` estado global (running + fila ordenada).
- [ ] T025 [P] [US3] `src/app/api/cron/drain-squad-queue/route.ts` — `POST` protegido por `CRON_SECRET`;
  chama `dispatchSquadQueue()` (rede de segurança/pós-conclusão). Registrar agendamento (cron-job.org, padrão 007/008).
- [ ] T026 [US3] `src/components/dashboard/squads/QueuePanel.tsx` — mostra o run em execução + a fila
  (posição); embutir em `/dashboard/empresas/[companyId]`.

**Checkpoint**: concorrência protegida; 0 squad-runs paralelos no pool. ✅ SC-003, FR-008/009/010.

---

## Phase 6: User Story 4 — Decompor a ROI Labs em squads (P3)

**Goal**: gerar ≥3 squads por case de uso reutilizando o roster de 13 agentes (0 duplicação).

**Independent Test**: rodar o seed → ≥3 squads referenciando agentes do pool; reexecutar → 0 novos.

### Tests (escrever primeiro)
- [ ] T027 [P] [US4] `tests/unit/squad-roster.test.ts`: `validateSquadBlueprint` (1 lead, roleKeys ∈ blueprint,
  teto) e `buildSquadRoster` (resolve `roleKey → CompanyRole.agentId`; pula cargo vago).

### Implementação
- [ ] T028 [P] [US4] `src/lib/companies/squad-blueprint.ts` — templates do nicho `software_house`:
  `feature` (architect→backend,frontend→qa), `hotfix` (backend→qa), `discovery` (pm→ba,po→architect),
  `security_audit` (ciso→backend→qa), `data_pipeline` (data→backend→qa). DADO PURO.
- [ ] T029 [US4] `src/lib/companies/squad-roster.ts` — `buildSquadRoster(template, staffing)` →
  `RosterInput[]` + `validateSquadBlueprint` (puros; análogos a `buildPhaseRoster`/`validateRaci`).
- [ ] T030 [US4] `src/app/api/companies/[id]/squads/seed/route.ts` — `POST` idempotente: upsert por
  `config.squadKey`; resolve staffing via `CompanyRole.agentId`; pula squads com cargo vago → 200
  `{created, skipped}`.
- [ ] T031 [US4] `scripts/seed-roi-labs-squads.ts` — idempotente (espelha `seed-roi-labs-agents.ts`).
- [ ] T032 [US4] Botão "Gerar squads do nicho" na aba Squads de `/dashboard/empresas/[companyId]`.

**Checkpoint**: ROI Labs com ≥3 squads operáveis, 0 agentes duplicados. ✅ SC-006, FR-013.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T033 [P] Atualizar contexto de agentes (`.specify/extensions/agent-context` / `CLAUDE.md` se preciso)
  com o conceito de squad + fila WIP=1.
- [ ] T034 [P] Medir SC-002: comparar `tokensUsed`/`turnsUsed` de um squad-run vs `CompanyRun` (fases) na
  mesma tarefa; registrar baseline e o % de redução.
- [ ] T035 Hardening de segurança: revisar IDOR/auth em TODAS as rotas de squad; confirmar pausa por
  rate-limit (008) no dispatcher.
- [ ] T036 Rodar `quickstart.md` E2E **autenticado em produção** (EasyPanel) — gate real de conclusão.
- [ ] T037 Criar `specs/009-usecase-squads/handoff.md` (feito/decisões/próximos/pendências/gotchas).
  Lembrete de pendência recorrente: **rotacionar senha PG**.

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2, bloqueia tudo; T003 é sequencial/host real)** → User Stories.
- **US1 (P1)** depende só do Foundational. **US2 (P2)** consome a base de US1 (store/rotas) mas é testável à
  parte. **US3 (P2)** endurece o `squad-queue.ts` criado em US1 (mesma assinatura → não altera a rota de run).
  **US4 (P3)** depende do Foundational (schema) e reusa createSquad.
- **Polish (P7)** depois das stories desejadas.

### Ordem recomendada (1 dev, pacing sequencial — restrição de pool)
T001 → T002→T003 (migração host real) → T004/T005/T006 → **US1 (MVP, validar)** → US2 → US3 → US4 → Polish.

### Paralelizáveis [P] (após fechar o gate de build — Princípio "loop antes de paralelizar")
- Foundational: T004, T005, T006.
- US1: T007, T008. US2: T017. US3: T021, T022, T024, T025. US4: T027, T028.
- **Não** paralelizar T003 (migração) nem o deploy. 1 task = 1 verde.

## Notes
- Coordinator intocado: squad-run = `runTeamAndWait` (caller); o gate é PRÉ-caller. `companyId=null` →
  legado byte-idêntico.
- Migração: `migrate deploy` manual no host real `2.24.207.200:5435` ANTES do push; `prisma generate` antes
  do `next build`.
- Commit por task/grupo lógico; push ao concluir entrega (preferência do projeto).
