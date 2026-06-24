# Implementation Plan: Resiliência a Esgotamento nos Teams (TeamRun)

**Branch**: `008-team-run-resilience` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-team-run-resilience/spec.md`

## Summary

Levar o "esgotamento não perde trabalho" da 007 (Empresas) aos **Teams diretos**, em três frentes, **sem
tocar o coordinator** (`runTeam`/`team-coordinator`/`team-board`): (1) **marcação** — corrigir o ponto
exato onde o erro de limite vira "resposta" (`groq.ts` engole o `ClaudeRateLimitError` e o retorna como
`message`); a correção é **re-lançar** o erro de rate-limit, que o coordinator já classifica como
`rate_limited`; (2) **retomada** — re-disparar o coordinator no mesmo `runId` (ele relê o board e executa
só o pendente), resetando `doing→todo` e o status (read-side), manual (UI/endpoint) e automática (cron);
(3) **UI** — badge "bloqueado por limite" + reset + ação de retomar em `/dashboard/teams`. Schema ganha
`TeamRun.resetAt` (migração formal no host real).

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16 (App Router, RSC) + worker Node.

**Primary Dependencies**: `@/lib/ai/claude-token-pool` (`isClaudeRateLimit`, `ClaudeRateLimitError`),
`@/lib/companies/company-resilience` (`parseResetAt` da 007, reusado), `runTeamByTopology`/`enqueueCodeRun`
(dispatch — reusados), coordinator `runTeam` (intocado), `verifyCronAuth`/`after()` (padrões).

**Storage**: PostgreSQL/Prisma. Schema: `TeamRun.resetAt DateTime?` + `@@index([status, resetAt])`.
`rate_limited` já é status terminal (sem coluna nova). Migração formal no host real `2.24.207.200:5435`.

**Testing**: jest no CI. Teste puro do helper de resume-reset (decisão doing→todo, guarda de status).
Gate real: E2E (esgotar chat-run → rate_limited → retomar).

**Target Platform**: EasyPanel; worker vps-local.

**Project Type**: Web service (Next.js) + worker.

**Constraints**: Coordinator INTOCADO (II); claude-cli only; migração no host real (III); multi-tenant
(resume valida ownership; cron via CRON_SECRET).

**Scale/Scope**: runs individuais; varredura `take` limitado.

## Constitution Check

| Princípio | Conformidade |
|---|---|
| **I. Ação > Análise** | Causa-raiz localizada no código (groq.ts catch); design confirmado viável por injeção. ✅ |
| **II. Coordinator Intocado (NON-NEGOTIABLE)** | A marcação é em `groq.ts` (ChatFn/dependência, NÃO o coordinator); a captura de reset é num **wrapper de chat injetado**; a retomada é read-side + re-dispatch. `runTeam`/`team-coordinator`/`team-board` ficam **byte-idênticos** (diff vazio = gate). ✅ |
| **III. Migração Formal no Host Real (NON-NEGOTIABLE)** | `TeamRun.resetAt` → migração formal aplicada no host real antes do push. ✅ |
| **IV. Next.js 16 + Type Safety** | Rotas novas com `params: Promise<…>`; `auth.id`; prisma singleton. `tsc` 0 erros. ✅ |
| **V. Multi-tenant** | `resume` valida ownership do Team; cron via `verifyCronAuth`. ✅ |

**Resultado**: PASS. A correção mais sensível (groq.ts) é numa dependência injetada, não no coordinator.

## Project Structure

```text
prisma/
├── schema.prisma                                  # +TeamRun.resetAt + @@index([status, resetAt])
└── migrations/20260624150000_add_team_run_reset_at/migration.sql   # NOVO

src/lib/ai/groq.ts                                 # MOD: re-lançar rate-limit (não retornar como message)
src/lib/orchestration/team/
├── team-resilience.ts                             # NOVO (injeção): withRateLimitCapture (grava resetAt + re-throw),
│                                                  #   resetRunForResume (doing→todo + status), isResumable
└── team-dispatch.ts                               # NOVO: dispatchTeamRun(runId) — extrai o after()/enqueue do start-team-run; reusado por start + resume
src/lib/orchestration/team/start-team-run.ts       # MOD: usa dispatchTeamRun (sem mudar comportamento)

src/app/api/teams/[id]/runs/[runId]/resume/route.ts        # NOVO: retomada manual (ownership)
src/app/api/cron/resume-blocked-teams/route.ts             # NOVO: varredura (verifyCronAuth)

src/components/.../teams/<runs UI>                  # MOD: badge "bloqueado por limite" + reset + botão retomar (arquivo localizado no implement)
src/__tests__/lib/team-resilience.test.ts          # NOVO: helper puro (reset/guard)
```

**Structure Decision**: Single project + worker. A correção de marcação fica em `groq.ts` (ChatFn). A
retomada usa um `team-dispatch.ts` extraído do `start-team-run` (centraliza o re-dispatch sem duplicar; e
`start-team-run` NÃO é o coordinator). Coordinator e seus helpers de board ficam intocados.

## Phase 0 — Research

Ver [research.md](./research.md). Decisões:

- **R1 — Ponto do bug (marcação)**: `groq.ts` (caminho claude-cli) faz `catch (error) { return { message: 'Erro na execução do Claude CLI: …' } }`, engolindo o `ClaudeRateLimitError` lançado por `withClaudeTokenFailover`. **Fix**: no catch, se `error` é rate-limit (`isClaudeRateLimit` / `ClaudeRateLimitError`), **re-lançar**. O coordinator já trata (`isRateLimit(e)` reconhece `name==='ClaudeRateLimitError'`) → `finish('rate_limited')`. Aplicar o mesmo no ramo opencode se existir.
- **R2 — Captura do reset (sem tocar o coordinator)**: o coordinator grava `error='Rate limit durante <fase>'` (sem o horário). Um **wrapper de chat injetado** `withRateLimitCapture(chat)` intercepta o throw, faz `parseResetAt(err.message)` e grava `TeamRun.resetAt` (via `opts.runId`), depois **re-lança**. Injetado no dispatch (junto de `withUsageTracking`); `finishRun` do coordinator não toca `resetAt` → sobrevive.
- **R3 — Retomada por re-dispatch**: o coordinator relê o board a cada turno e só executa `todo` (não recria). Retomar = `resetRunForResume(runId)` (tasks `doing`→`todo`; run `rate_limited`→`pending`; limpa `resetAt`) + `dispatchTeamRun(runId)` (chat → `runTeamByTopology` via `after()`; code → `enqueueCodeRun`). `setRunRunning` do coordinator assume daí.
- **R4 — Dispatch centralizado**: extrair o corpo do `after()` + o `enqueueCodeRun` do `start-team-run` para `dispatchTeamRun(runId)`, reusado por start e resume. Sem mudança de comportamento do start (refator puro).
- **R5 — Schema**: `TeamRun.resetAt DateTime?` + `@@index([status, resetAt])` (cron filtra). `rate_limited` já existe.
- **R6 — Cron**: replica `cron/resume-blocked-companies` (007) — `verifyCronAuth`, `status='rate_limited' AND resetAt<=now`, take limitado, re-dispatch cada.

## Phase 1 — Design

- **Data model**: [data-model.md](./data-model.md) — `TeamRun.resetAt`; máquina de estados (running →
  rate_limited → running → completed); regra de reset de tasks.
- **Contracts**: [contracts/resilience-contract.md](./contracts/resilience-contract.md) — assinatura dos
  helpers, contrato do `groq.ts` (re-throw), do resume e do cron, invariantes.
- **Quickstart**: [quickstart.md](./quickstart.md) — migração no host real; reproduzir esgotamento de
  chat-run; retomar (manual/cron); verificar coordinator intocado.

### Re-check Constitution após design

PASS. `runTeam`/board byte-idênticos; correção e captura por injeção; migração formal planejada.

## Complexity Tracking

> Sem violações. O `team-dispatch.ts` é refator de centralização (não toca o coordinator); o cron e o
> wrapper de captura são exigências das decisões (auto-resume + reset), reusando padrões da 007.
