---
description: "Task list — Team Run Resilience (marcação rate_limited + retomada de TeamRun)"
---

# Tasks: Resiliência a Esgotamento nos Teams (TeamRun)

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: 1 teste puro do helper de reset/guard. Demais = E2E.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup
- [ ] T001 Esqueleto `src/lib/orchestration/team/team-resilience.ts` (assinaturas C2) + import de `parseResetAt` de `@/lib/companies/company-resilience` e `isClaudeRateLimit`/`ClaudeRateLimitError` do token-pool.

## Phase 2: Foundational (bloqueia US1/US2)
- [ ] T002 **Migração** `add_team_run_reset_at`: `TeamRun.resetAt DateTime?` + `@@index([status, resetAt])`; gerar migration; **`migrate deploy` no host real `2.24.207.200:5435` ANTES do push** (III). `prisma generate`.
- [ ] T003 Implementar helpers (C2): `withRateLimitCapture(chat)` (no throw de rate-limit → grava `TeamRun.resetAt` via `opts.runId` + re-throw; passthrough caso contrário), `resetRunForResume(runId)` (tasks doing→todo; run rate_limited→pending; resetAt→null), `isResumable`.

**Checkpoint**: helpers compilam; migração aplicada.

## Phase 3: User Story 1 — Marcação correta (Priority: P1) 🎯 MVP
**Goal**: chat-run que esgota termina `rate_limited` (não completed falso), sem entregar a banner.
- [ ] T004 [US1] `src/lib/ai/groq.ts`: no `catch` do caminho claude-cli (e opencode se houver), se rate-limit (`ClaudeRateLimitError` ou `isClaudeRateLimit`) → **re-lançar** em vez de `return { message: 'Erro na execução…' }`. Demais erros inalterados.
- [ ] T005 [US1] `src/lib/orchestration/team/team-dispatch.ts`: extrair `dispatchTeamRun(runId)` do `start-team-run` (chat via `runTeamByTopology`+`after`; code via `enqueueCodeRun`), compondo `withRateLimitCapture(withUsageTracking(...))` na ChatFn; `start-team-run.ts` passa a chamar o helper (refator puro, comportamento idêntico). Coordinator intocado.

**Checkpoint**: SC-001 (0 completed falso) + coordinator diff vazio.

## Phase 4: User Story 2 — Retomada (Priority: P2)
**Goal**: retomar TeamRun esgotado reusando tasks done; manual + automática.
- [ ] T006 [US2] `POST /api/teams/[id]/runs/[runId]/resume` (C4): ownership + status `rate_limited` (senão 409) → `resetRunForResume` → `dispatchTeamRun` → 202.
- [ ] T007 [US2] `GET /api/cron/resume-blocked-teams` (C5): `verifyCronAuth`; `rate_limited AND resetAt<=now` (`take:50`); `resetRunForResume`+`dispatchTeamRun` cada. Registrar no cron-job.org.

**Checkpoint**: SC-002 (0 reexecução de done) + ciclo repetível.

## Phase 5: User Story 3 — UI (Priority: P3)
- [ ] T008 [US3] Localizar a UI de runs de `/dashboard/teams` (lista/detalhe) e exibir selo "bloqueado por limite" (status `rate_limited`) + `resetAt` + botão "retomar" → chama T006. (Arquivo a localizar no implement.)

**Checkpoint**: SC-003 (retomar em 1 ação).

## Phase 6: Polish
- [ ] T009 [P] Teste puro `src/__tests__/lib/team-resilience.test.ts` (resetForResume decisão doing→todo; isResumable; guard).
- [ ] T010 Gate: `tsc --noEmit` 0 erros + **diff vazio** em `team-coordinator/team-executor/team-graph-coordinator/team-board`. Handoff + commit + push (migração já no host real).
- [ ] T011 E2E (quickstart): esgotar chat-run → rate_limited → retomar (manual + cron). Pós-deploy.

---

## Dependencies
- Setup (T001) → Foundational (T002–T003, bloqueiam; T002 migra no host real).
- US1 (T004–T005): MVP. T005 depende de T003 (wrapper).
- US2 (T006–T007) depende de US1 (estado) + T003/T005 (reset + dispatch).
- US3 (T008) depende de US1/US2.
- Polish após código.

## Notes
- **Princípio II**: coordinator/board intocados (T010 verifica diff vazio). Correção em `groq.ts` (ChatFn) + wrapper + read-side.
- **Princípio III**: T002 migra no host real antes do push.
- Reusa `parseResetAt`/`isClaudeRateLimit` (fontes únicas).
