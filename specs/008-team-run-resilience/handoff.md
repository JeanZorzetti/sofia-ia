# Handoff — 008-team-run-resilience

**Data**: 2026-06-24 · **Status**: código entregue, `tsc` 0 erros, **migração no host real aplicada**, coordinator/board **intocados** (diff vazio). Falta E2E + registrar o cron.

## O que foi feito

Paridade com a 007 (Empresas), agora para Teams diretos (`/dashboard/teams`). Fluxo Spec Kit completo.

- **Marcação (causa-raiz)**: `src/lib/ai/groq.ts` engolia o `ClaudeRateLimitError` e o **retornava como `{ message }`** (resposta falsa → run `completed`). Fix: nos catches claude-cli e opencode, **re-lançar** quando rate-limit (`ClaudeRateLimitError`/`isClaudeRateLimit`). O coordinator já trata o throw → `rate_limited`.
- **Captura do reset**: `src/lib/orchestration/team/team-resilience.ts` (NOVO) — `withRateLimitCapture(chat)` grava `TeamRun.resetAt` (`parseResetAt` da 007) e re-lança; injetado no dispatch (start + resume), fora do coordinator.
- **Retomada**: `resetRunForResume(runId)` (atômico: `rate_limited`→`running`, tasks `doing`→`todo`, preserva `done`) + `dispatchTeamRun(runId)` (`team-dispatch.ts`, NOVO — re-dispara o coordinator que relê o board; chat via `runTeamByTopology`/`after`, code via `enqueueCodeRun`).
- **Rotas**: `POST /api/teams/[id]/runs/[runId]/resume` (manual, ownership) + `GET /api/cron/resume-blocked-teams` (auto, `verifyCronAuth`).
- **UI**: `TeamRunView.tsx` — label `rate_limited` → "Bloqueado por limite" + botão **Retomar** (chama o endpoint, re-abre o stream).
- **Schema/migração** `20260624150000_add_team_run_reset_at`: `TeamRun.resetAt` + `@@index([status, resetAt])`. Aplicada via `migrate deploy` no host real `2.24.207.200:5435`.
- Teste puro `team-resilience.test.ts` (passthrough / re-throw+reset / guard atômico).

## Decisões

- **Coordinator INTOCADO**: a correção é em `groq.ts` (ChatFn, dependência), captura num wrapper injetado, retomada read-side + re-dispatch. `team-coordinator`/`team-executor`/`team-graph-coordinator`/`team-board` diff vazio.
- **`start-team-run` minimamente tocado**: 1 wrapper a mais na ChatFn (`withRateLimitCapture`) — não é o coordinator. `team-dispatch.ts` é um helper novo (não refatorei o start para reduzir risco).
- **Retomada = manual + automática** (paridade 007). Code-runs já marcavam `rate_limited` (sandbox-cli-agent) — a correção de marcação é só do modo chat.

## Próximos passos

1. **Deploy** (push dispara EasyPanel; client regenerado com `resetAt`).
2. **Registrar o cron** `GET /api/cron/resume-blocked-teams` no cron-job.org (Bearer `CRON_SECRET`, ~15–30 min) — junto do `resume-blocked-companies`.
3. **E2E** (quickstart): esgotar um chat-run → confirmar `rate_limited` (não completed) + botão Retomar → retomar reusa tasks `done`. Cron auto-resume.
4. CI verde (teste 008 + tsc).

## Gotchas

- `after()` no resume/cron roda fora do request — funciona no EasyPanel (processo persistente), igual ao `run/route.ts`.
- O reset só é gravado se o CLI reportar "resets … (UTC)"; sem isso, run fica `rate_limited` sem `resetAt` e o cron não o religa (retomada manual ainda funciona).
- jest não roda local (OneDrive errno -4094) → CI. `tsc --noEmit` = 0 erros.
- A 007 (Empresas) continua intacta; agora o TeamRun de fase também vem `rate_limited` correto (a 007 já cobre via `isPhaseExhausted`).
