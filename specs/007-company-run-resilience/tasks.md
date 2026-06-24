---
description: "Task list — Company Run Resilience (esgotamento→blocked + retomada + observabilidade)"
---

# Tasks: Resiliência a Esgotamento + Observabilidade de Consumo (CompanyRun)

**Input**: design docs em `specs/007-company-run-resilience/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: 1 teste puro dos helpers (INV-1..8). Demais validação = E2E (quickstart).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Criar `src/lib/companies/company-resilience.ts` (esqueleto puro): assinaturas de
  `isPhaseExhausted`, `parseResetAt`, `computeUsageProxy`, `MODEL_WEIGHT` (ver contract C1). Import de
  `isClaudeRateLimit` de `@/lib/ai/claude-token-pool`.

---

## Phase 2: Foundational (bloqueia US1/US2)

- [ ] T002 **Migração** `add_company_run_resilience`: em `prisma/schema.prisma` adicionar
  `CompanyRun.resetAt DateTime?` + `@@index([status, resetAt])` e `CompanyPhaseRun.usage Json?`; gerar a
  migration; **aplicar `migrate deploy` no host real `2.24.207.200:5435` ANTES do push** (Princípio III).
- [ ] T003 Implementar os helpers puros em `company-resilience.ts` (C1): `isPhaseExhausted` (status
  rate_limited OU completed+`isClaudeRateLimit(output)`), `parseResetAt` (regex "resets …(UTC)" → Date,
  futuro/hoje vs +1d), `computeUsageProxy` (turns × MODEL_WEIGHT por membro → byModel/weightedUnits),
  `MODEL_WEIGHT` (opus 5 / sonnet 1 / default 1).

**Checkpoint**: helpers compilam; migração aplicada no host real.

---

## Phase 3: User Story 1 — Esgotamento vira `blocked` (Priority: P1) 🎯 MVP

**Goal**: fase que esgota o pool fica `blocked` (não completed), run para, `resetAt` exposto.

**Independent Test**: forçar esgotamento → fase `blocked`, run `blocked` com `resetAt`, 0 fases seguintes.

- [ ] T004 [US1] Em `company-run.ts`, após `runTeamAndWait`: se `isPhaseExhausted(result)` → phaseRun
  `status='blocked'` + `usage.blocked=true`; CompanyRun `status='blocked'`, `resetAt=parseResetAt(output)`,
  `currentPhase=phase.key`; `return` (NÃO inicia fases seguintes). Coordinator intocado.
- [ ] T005 [US1] Garantir que erro **não**-limite continua `failed` (ramo atual inalterado) e que o
  **caminho feliz** (sem esgotamento) permanece byte-equivalente ao legado.
- [ ] T006 [US1] Gravar `CompanyPhaseRun.usage = computeUsageProxy(...)` ao finalizar cada fase
  (completed/blocked/failed), lendo `TeamRun.turnsUsed/durationMs` + modelos do roster da fase.

**Checkpoint**: SC-001/SC-002 atendidos (0 fases falsamente completed; 0 fases queimadas após o limite).

---

## Phase 4: User Story 2 — Retomada manual + automática (Priority: P2)

**Goal**: retomar uma run `blocked` da fase parada, reusando artefatos; manual e via cron.

**Independent Test**: resume manual reexecuta só pendentes; cron retoma quando `resetAt<=now`.

- [ ] T007 [US2] Tornar `runCompany` **retomável** (C2/data-model): carregar phaseRuns existentes, pular
  `completed` (reconstruir `prevArtifact` da última completed), recomeçar da 1ª não-completed (reusar a
  linha `blocked`/`pending`, sem duplicar por `position`); guarda: só prossegue se run
  `pending`/`running`/`blocked`, marca `running` + limpa `resetAt`/`error` ao (re)iniciar.
- [ ] T008 [US2] Rota `POST /api/companies/[id]/runs/[runId]/resume` (C3): `withAuth` + ownership; exige
  `status==='blocked'` (senão 409); marca `running`, dispara `runCompany(runId)` via `after()`; 202.
- [ ] T009 [US2] Cron `GET /api/cron/resume-blocked-companies` (C4): `verifyCronAuth`; busca `blocked AND
  resetAt<=now` (`take:50`); resume cada (mesmo caminho); retorna `{processed,results}`. Registrar no
  cron-job.org.

**Checkpoint**: SC-003 (0 reexecução de fases concluídas); ciclo bloquear→retomar repetível.

---

## Phase 5: User Story 3 — Relatório de consumo (Priority: P3)

**Goal**: 1 comando imprime consumo real por fase/modelo/cargo + ponto de parada.

- [ ] T010 [US3] `scripts/report-company-run.ts` permanente (C5): `--run`/`--company`/env; por fase status
  REAL (distingue `blocked` de `completed`), tokens/custo/turns/duração + `usage.weightedUnits`; agregados
  por modelo e por agente/cargo; total; fase/motivo de parada (+`resetAt`). Degrada com "—".

**Checkpoint**: SC-004 (relatório completo em 1 comando) + SC-005 (fase esgotada não aparece "0").

---

## Phase 6: User Story 4 — Base de consumo (Priority: P4)

**Goal**: proxy persistido consultável por fase e missão (fundação para estimativa futura, sem ML).

- [ ] T011 [US4] Validar que `CompanyPhaseRun.usage` (de T006) é consultável por fase e por missão (via
  CompanyRun) e que o relatório (T010) lê o proxy; confirmar SC-005 (a fase que esgotou registra o que
  rodou + `blocked`, não "0"). ML explicitamente fora de escopo (FR-015).

---

## Phase 7: Polish

- [ ] T012 [P] Teste puro `src/__tests__/lib/company-resilience.test.ts` — INV-1..8 do contract.
- [ ] T013 Gate: `npx tsc --noEmit` = 0 erros; **diff vazio** em `src/lib/orchestration/team/*`
  (coordinator intocado, C6).
- [ ] T014 `handoff.md` + commit + push (migração já aplicada no host real em T002).
- [ ] T015 E2E (quickstart): esgotamento→blocked→resume (manual e cron) + relatório. Pós-deploy.

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T003, **bloqueiam tudo**; T002 = migração no host real).
- US1 (T004–T006) depende de Foundational; é o MVP (corrige o dano observado).
- US2 (T007–T009) depende de US1 (precisa do estado `blocked`); T008/T009 dependem de T007.
- US3 (T010) independe de US2 (só lê dados); pode ir em paralelo a US2.
- US4 (T011) depende de T006 + T010.
- Polish (T012–T015) após o código.

### Parallel

- T010 (relatório) ‖ T007–T009 (arquivos distintos).
- T012 (teste) ‖ qualquer task após T003.

## Notes

- **Princípio II**: nenhuma task toca o coordinator (T013 verifica diff vazio). Tudo em `company-run.ts`
  + `company-resilience.ts` + rotas/cron/script.
- **Princípio III**: T002 aplica a migração no host real **antes** do push.
- `'blocked'` reusa o status existente; `resetAt`/`usage` são as únicas colunas novas.
