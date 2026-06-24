---
description: "Task list for Empresas Agênticas (Agentic Companies)"
---

# Tasks: Empresas Agênticas (Agentic Companies)

**Input**: Design documents from `specs/005-agentic-companies/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md)

**Tests**: INCLUÍDOS — a constituição exige testes de IDOR/auth nas rotas sensíveis e unit dos helpers
puros (`validateRaci`, `buildPhaseRoster`). jest roda no **CI** (não local — OneDrive errno -4094).

**Organization**: Tarefas agrupadas por user story (US1–US4) para entrega incremental. Escopo do ciclo:
P1+P2+P3 (US1–US3) + refinamento P4 (US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1–US4 (fases de user story); Setup/Foundational/Polish sem label

## Restrições NON-NEGOTIABLE (valem para todas as tarefas)

- **Coordinator INTOCADO**: nada em `src/lib/orchestration/team/team-coordinator.ts`,
  `team-executor.ts`, `team-graph-coordinator.ts` pode ser editado. A execução só **chama**
  `runTeamAndWait`.
- **Next.js 16**: route params são `Promise<…>` + `await`; auth via `auth.id`; `prisma` singleton; Groq
  lazy. `prisma generate` antes do `next build`.
- **Migração formal no host real** `2.24.207.200:5435` (`migrate deploy`) ANTES do push.
- **Multi-tenant**: toda rota `withAuth` + `ownerId(auth)`; staffing valida ownership do agente.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema, migração e dados estáticos que tudo depende.

- [ ] T001 Adicionar os 4 models (`Company`, `CompanyRole`, `CompanyRun`, `CompanyPhaseRun`) + back-relation opcional `companyRole CompanyRole?` em `Agent` no `prisma/schema.prisma` conforme [data-model.md](./data-model.md) (PK uuid, `@@map` snake_case, `@unique` em `CompanyRole.agentId`, `@@unique([companyId, key])`)
- [ ] T002 Criar a migração formal `prisma/migrations/<ts>_add_agentic_companies/` e aplicá-la com `prisma migrate deploy` **MANUAL no host real `2.24.207.200:5435`** ANTES de qualquer deploy (Princípio III); rodar `prisma generate` (depende de T001)
- [ ] T003 [P] Criar `src/lib/companies/sdlc.ts` — as 7 fases canônicas (`key`, `label`, `objective`, `outputArtifacts[]`, `essential: boolean`) na ordem planning→requirements→design→implementation→testing→deployment→maintenance. `essential` resolve A1 (fase essencial vaga → `blocked`; não-essencial vaga → `skipped`); default essenciais = requirements, design, implementation, testing
- [ ] T004 [P] Criar `src/lib/companies/company-blueprint.ts` — nicho "Software House": camadas/departamentos/cargos (CEO; CTO, CISO; PM, BA, PO, Architect, Scrum Master; Backend, Frontend, QA, DevOps, Data) + **RACI semente normalizada** (1 A/fase — normalizar a linha de 2 "A" do blueprint, ver [research.md](./research.md) R5)

**Checkpoint**: Schema migrado no host real; constantes SDLC + blueprint disponíveis.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Helpers de leitura/escopo + seeding de nicho + schemas zod — base de TODAS as rotas.

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase.

- [ ] T005 Criar `src/lib/companies/company-store.ts` — helpers escopados por dono: `listCompanies(userId)`, `getCompanyForOwner(id, userId)` (`ownerId` scope), e `createCompanyFromNiche({ name, niche, typology, userId })` que semeia `CompanyRole[]` + RACI a partir do `company-blueprint.ts`
- [ ] T006 [P] Adicionar schemas zod de Empresa em `src/lib/validation.ts` (`createCompanySchema`, `patchCompanySchema`, `staffRoleSchema`, `putRaciSchema`, `runCompanySchema`)

**Checkpoint**: Foundation pronta — user stories podem começar.

---

## Phase 3: User Story 1 - Criar empresa e montar o organograma (Priority: P1) 🎯 MVP

**Goal**: Transformar `/dashboard/agents` na galeria de Empresas; criar empresa de nicho; ver o
organograma em 3 camadas; encaixar agentes nos cargos (1:1).

**Independent Test**: Criar "Software House", ver as 3 camadas + cargos vagos, encaixar um agente no
Backend, e ver o 1:1 barrar o mesmo agente em outro cargo.

### Tests for User Story 1 (CI)

- [ ] T007 [P] [US1] Teste de rota IDOR/auth para `/api/companies` (lista só do dono; admin vê todas; não-dono → 404) em `tests/routes/companies.list-create.test.ts`
- [ ] T008 [P] [US1] Teste de rota para staffing 1:1 — encaixar agente já alocado retorna 409, e agente de outro dono retorna 404 — em `tests/routes/companies.staff.test.ts`

### Implementation for User Story 1

- [ ] T009 [P] [US1] `GET /api/companies/niches` em `src/app/api/companies/niches/route.ts` (lista nichos semente do blueprint)
- [ ] T010 [US1] `GET` + `POST` em `src/app/api/companies/route.ts` (listar via `listCompanies`; criar via `createCompanyFromNiche`; `withAuth` + zod)
- [ ] T011 [US1] `GET` + `PATCH` (nome/tipologia/descrição) + `DELETE` em `src/app/api/companies/[id]/route.ts` (params `Promise`, `getCompanyForOwner`)
- [ ] T012 [US1] `GET` + `PUT` (add/remove cargo, FR-005) em `src/app/api/companies/[id]/roles/route.ts`
- [ ] T013 [US1] `POST` (encaixar) + `DELETE` (desencaixar) em `src/app/api/companies/[id]/roles/[roleKey]/staff/route.ts` — impõe 1:1 (FR-003a) e valida ownership do agente
- [ ] T014 [P] [US1] Componente `OrgChart` (árvore 3 camadas, vagas vazias sinalizadas, encaixar/desencaixar) em `src/components/dashboard/companies/OrgChart.tsx`
- [ ] T015 [P] [US1] Componente `CompanyCard` (card por nicho) em `src/components/dashboard/companies/CompanyCard.tsx`
- [ ] T016 [US1] **Transformar** `src/app/dashboard/agents/page.tsx` → galeria de Empresas + view secundária "Todos os agentes" (reusa o grid `AgentCard` atual; FR-006)
- [ ] T017 [US1] Página de detalhe `src/app/dashboard/agents/empresa/[companyId]/page.tsx` com aba **Organograma** (default) usando `OrgChart` + diálogo de criação de empresa (depends on T010–T015)

**Checkpoint**: US1 funcional e testável — organização navegável sobre os agentes (MVP).

---

## Phase 4: User Story 2 - Governança (RACI) e SDLC (Priority: P2)

**Goal**: Editar a Matriz RACI (regra de ouro: 1 A/fase) e ver o pipeline de 7 fases com os cargos
atuantes derivados.

**Independent Test**: Abrir Governança (RACI pré-preenchida), tentar salvar fase com 0/2 "A" → bloqueia;
salvar válida; ver na aba SDLC os cargos atuantes por fase.

### Tests for User Story 2 (CI)

- [ ] T018 [P] [US2] Unit de `validateRaci` — regra de ouro (rejeita 0 e ≥2 "A"/fase; valores ∈ {R,A,C,I}) em `tests/unit/raci.test.ts`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Helper puro `validateRaci(raci, roleKeys)` em `src/lib/companies/raci.ts`
- [ ] T020 [US2] `GET` + `PUT` em `src/app/api/companies/[id]/raci/route.ts` (valida com `validateRaci`; 409 na violação, FR-010)
- [ ] T021 [US2] `PUT` SOPs por cargo em `src/app/api/companies/[id]/sops/route.ts` (persiste em `Company.config.sops`)
- [ ] T022 [P] [US2] Componente `RaciMatrix` (editável, célula R/A/C/I, destaca violação) em `src/components/dashboard/companies/RaciMatrix.tsx`
- [ ] T023 [P] [US2] Componente `SdlcPipeline` (7 fases: objetivo, artefatos, cargos atuantes derivados da RACI) em `src/components/dashboard/companies/SdlcPipeline.tsx`
- [ ] T024 [US2] Adicionar abas **Governança** (`RaciMatrix` + **editor de SOP por cargo** ligado ao `PUT .../sops` de T021 — resolve **C1**, Acceptance US2.4) e **SDLC** (`SdlcPipeline`) à página `empresa/[companyId]` (depends on T020, T021, T022, T023)

**Checkpoint**: US1 + US2 funcionam independentes — empresa governável e com processo visível.

---

## Phase 5: User Story 3 - Operar a empresa (executar) (Priority: P3)

**Goal**: Rodar a empresa instanciando 1 Time por fase do SDLC (sequencial), via meta-orquestrador
caller de `runTeamAndWait`; acompanhar status/artefatos fase-a-fase.

**Independent Test**: Com cargos R/A ocupados e RACI válida, disparar execução; ver as 7 fases
progredirem (cada uma um `TeamRun` `internal`); QA fazendo o loop revisor; cargo R vago → run `blocked`.

### Tests for User Story 3 (CI)

- [ ] T025 [P] [US3] Unit de `buildPhaseRoster` — A→lead, R→worker(s), QA/C→reviewer (≤1); erro quando A ou todos R da fase estão vagos — em `tests/unit/phase-roster.test.ts`
- [ ] T026 [P] [US3] Teste de rota `/api/companies/[id]/run` — auth/IDOR + 409 `blocked` quando cargo R/A vago — em `tests/routes/companies.run.test.ts`

### Implementation for User Story 3

- [ ] T027 [P] [US3] Helpers puros `buildPhaseRoster(raci, phaseKey, staffing)` + `phaseMission(phase, mission, prevArtifact)` em `src/lib/companies/phase-roster.ts`
- [ ] T028a [US3] **(resolve I1)** Estender `createTeamWithRoster` (`src/lib/orchestration/team/create-team.ts`) com `status?: string` opcional em `CreateTeamInput` (ausente = default `'active'`, byte-idêntico ao legado). Caller-only, **coordinator intocado** (Princípio II) — habilita Times de fase `internal`
- [ ] T028 [US3] Meta-orquestrador `runCompany(companyRunId)` em `src/lib/companies/company-run.ts` — loop sequencial das 7 fases: por fase monta roster (`buildPhaseRoster`), cria Time via `createTeamWithRoster({ ..., status: 'internal' })` (reusa agentes encaixados; T028a), chama `runTeamAndWait`, persiste `CompanyPhaseRun` (input/output), encadeia N→N+1; fase essencial com cargo R/A vago → `blocked`, não-essencial → `skipped` (A1); **(U1)** registra o status terminal da fase de QA (`completed` na convergência vs `failed`/flag ao atingir o teto de iterações do reviewer nativo); nunca importa o coordinator (depends on T027, T028a)
- [ ] T029 [US3] `POST /api/companies/[id]/run` em `src/app/api/companies/[id]/run/route.ts` — pré-valida RACI + cargos R/A preenchidos (senão 409 `blocked`), cria `CompanyRun`, dispara `runCompany` via `after()`
- [ ] T030 [US3] `GET /api/companies/[id]/runs/route.ts` (lista) + `GET /api/company-runs/[id]/route.ts` (status fase-a-fase com `teamRunId`, FR-016)
- [ ] T031 [P] [US3] Componente `RunTimeline` (progressão das fases + artefatos + link p/ o `TeamRun`) em `src/components/dashboard/companies/RunTimeline.tsx`
- [ ] T032 [US3] Adicionar aba **Execuções** + botão "Executar" (modal de missão) à página `empresa/[companyId]` (depends on T029, T030, T031)

**Checkpoint**: US1–US3 funcionam — empresa estruturada, governada e **operável**.

---

## Phase 6: User Story 4 - Tipologia, Infraestrutura e Clonagem (Priority: P4)

**Goal**: Faceta Tipologia (UI), faceta Infraestrutura (MCP/sandbox por cargo, reuso), e clonagem por
nicho.

**Independent Test**: Trocar tipologia e ver refletido; vincular MCP/sandbox a um cargo; clonar empresa
→ estrutura reproduzida com cargos vagos.

### Tests for User Story 4 (CI)

- [ ] T033 [P] [US4] Teste de rota `/api/companies/[id]/clone` — clona estrutura+RACI, cargos nascem vagos, sem vazar agentes entre tenants — em `tests/routes/companies.clone.test.ts`

### Implementation for User Story 4

- [ ] T034 [US4] `POST /api/companies/[id]/clone` em `src/app/api/companies/[id]/clone/route.ts` (FR-019; reusa `createCompanyFromNiche` + copia RACI; cargos vagos)
- [ ] T035 [US4] `GET` + `PUT` em `src/app/api/companies/[id]/infrastructure/route.ts` — **GET** lê vínculos `AgentMcpServer` por cargo (somente leitura: o write de MCP fica na config MCP do próprio agente, deep-link; **C2**); **PUT** persiste apenas a flag `sandbox` por cargo em `Company.config.infrastructure`
- [ ] T036 [P] [US4] Componente `InfraPanel` (MCP servers + toggle sandbox por cargo) em `src/components/dashboard/companies/InfraPanel.tsx`
- [ ] T037 [P] [US4] Componente `TypologyControl` (generalist|specialist|hybrid; usa o `PATCH` de T011) em `src/components/dashboard/companies/TypologyControl.tsx`
- [ ] T038 [US4] Adicionar abas **Tipologia** (`TypologyControl`) e **Infraestrutura** (`InfraPanel`) + ação "Clonar" à página `empresa/[companyId]` (depends on T034–T037)

**Checkpoint**: As 4 facetas completas + clonagem por nicho.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T039 [P] Atualizar o item de navegação do dashboard para "Empresas" apontando a `/dashboard/agents` (sidebar/nav config)
- [ ] T040 Verificar **diff vazio** do coordinator (`git diff src/lib/orchestration/team/team-coordinator.ts team-executor.ts team-graph-coordinator.ts` = vazio) e `tsc --noEmit` limpo (Princípio II + build)
- [ ] T041 Rodar a validação E2E de [quickstart.md](./quickstart.md) autenticado em produção (EasyPanel + login) — gate real
- [ ] T042 [P] Criar `specs/005-agentic-companies/handoff.md` (feito, decisões, próximos passos, gotchas)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002 (migração depende do schema); T003/T004 [P] independentes.
- **Foundational (Phase 2)**: depende do Setup; T005 depende de T004 (blueprint); BLOQUEIA todas as US.
- **US1 (Phase 3)**: depende do Foundational. **MVP.**
- **US2 (Phase 4)**: depende do Foundational; consome a empresa criada na US1 (testável com a RACI semente).
- **US3 (Phase 5)**: depende do Foundational; usa a RACI (semente ou editada na US2) e os cargos da US1.
- **US4 (Phase 6)**: depende do Foundational; clone/infra/tipologia sobre a empresa da US1.
- **Polish (Phase 7)**: após as US desejadas.

### User Story Dependencies

- **US1 (P1)**: independente (após Foundational).
- **US2 (P2)**: independente; integra a página de detalhe da US1, mas testável sozinha.
- **US3 (P3)**: soft-dependência da RACI (usa a semente se US2 não rodou); independentemente testável.
- **US4 (P4)**: independente; refina facetas/ações da empresa.

### Within Each User Story

- Testes (CI) escritos antes da implementação (devem falhar primeiro).
- Helpers puros → rotas → UI. Componentes [P] antes de fiar na página.

### Parallel Opportunities

- Setup: T003 ∥ T004.
- US1: T007 ∥ T008 (testes); T014 ∥ T015 (componentes); T009 ∥ (rotas em arquivos distintos).
- US2: T022 ∥ T023 (componentes).
- US3: T025 ∥ T026 (testes); T031 [P].
- US4: T036 ∥ T037.
- Após o Foundational, US1–US4 podem ser tocadas em paralelo por devs distintos (cuidado só na página
  `empresa/[companyId]`, editada por T017/T024/T032/T038 — sequencializar essas edições).

---

## Parallel Example: User Story 1

```bash
# Testes da US1 juntos (CI):
Task: "Teste IDOR/auth /api/companies em tests/routes/companies.list-create.test.ts"
Task: "Teste staffing 1:1 em tests/routes/companies.staff.test.ts"

# Componentes da US1 juntos:
Task: "OrgChart em src/components/dashboard/companies/OrgChart.tsx"
Task: "CompanyCard em src/components/dashboard/companies/CompanyCard.tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 Setup (schema + migração no host real + estáticos).
2. Phase 2 Foundational (store/seeding + zod).
3. Phase 3 US1.
4. **PARAR e VALIDAR**: criar empresa + organograma + staffing 1:1. Deploy/demo.

### Incremental Delivery

US1 (MVP) → US2 (governança) → US3 (execução) → US4 (facetas/clonagem). Cada US faz commit+push e E2E
autenticado antes da próxima (CLAUDE.md: 1 entrega → push → próxima).

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- A página `empresa/[companyId]` é tocada por T017/T024/T032/T038 — **não** paralelizar essas 4.
- Verificar testes falhando antes de implementar; commit após cada task ou grupo lógico.
- Provider de execução: **Claude CLI** no worker, nunca `:free` (rate-limit quebra runs).
- Gate real = E2E autenticado em produção; jest só no CI.
