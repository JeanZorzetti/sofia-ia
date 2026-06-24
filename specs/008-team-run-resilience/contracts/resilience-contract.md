# Contract — Team Run Resilience (Phase 1)

## C1 — `groq.ts` (correção de marcação)

No `catch` do caminho claude-cli (e opencode, se houver): se o erro é rate-limit
(`error instanceof ClaudeRateLimitError || isClaudeRateLimit(String(error?.message ?? error))`),
**re-lançar** (`throw error`) em vez de `return { message: 'Erro na execução…' }`. Demais erros: caminho
atual inalterado.

**Invariantes**:
- Esgotamento ⇒ a função **lança** (não retorna message com a banner).
- Erro não-limite ⇒ comportamento atual (retorna message de erro) — sem regressão.

## C2 — Helpers (`src/lib/orchestration/team/team-resilience.ts`)

```ts
export function withRateLimitCapture(chat: ChatFn): ChatFn
//   chama chat; no catch de rate-limit: grava TeamRun.resetAt (parseResetAt) via opts.runId, depois re-lança.
export async function resetRunForResume(runId: string): Promise<void>
//   tasks doing→todo; TeamRun rate_limited→pending; resetAt→null. (read-side; idempotente)
export function isResumable(run: { status: string }): boolean   // status === 'rate_limited'
```
- `parseResetAt` é reusado de `@/lib/companies/company-resilience` (007).
- `withRateLimitCapture` NÃO altera o comportamento quando não há rate-limit (passthrough).

## C3 — `dispatchTeamRun(runId)` (`team-dispatch.ts`)

Extraído de `start-team-run`: chat-runs → `runTeamByTopology(runId, { store, chat: withRateLimitCapture(withUsageTracking(...)) })`
via `after()`; code-runs → `enqueueCodeRun(runId)`. Reusado por start (comportamento idêntico) e resume.

## C4 — `POST /api/teams/[id]/runs/[runId]/resume`

- `withAuth` + ownership do Team (404 se não-dono).
- Exige `run.status === 'rate_limited'` (senão 409).
- `resetRunForResume(runId)` → `dispatchTeamRun(runId)` → `202`.
- Concorrência: após reset, status sai de `rate_limited` → 2ª chamada vê ≠ rate_limited → 409.

## C5 — `GET /api/cron/resume-blocked-teams`

- `verifyCronAuth` (401 senão). Busca `status='rate_limited' AND resetAt != null AND resetAt<=now`
  (`take: 50`). Para cada: `resetRunForResume` + `dispatchTeamRun`. Retorna `{processed, results}`.

## C6 — UI (`/dashboard/teams`)

- Run `rate_limited` exibe selo "bloqueado por limite" (distinto de concluído/falha) + `resetAt` quando
  presente + botão "retomar" → chama C4.

## C7 — Coordinator (NON-NEGOTIABLE)

`src/lib/orchestration/team/{team-coordinator,team-executor,team-graph-coordinator,team-board}.ts` **não**
modificados (diff vazio = gate). `runTeam` permanece byte-idêntico.
