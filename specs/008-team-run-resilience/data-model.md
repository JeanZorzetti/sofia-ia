# Data Model — Team Run Resilience (Phase 1)

## Mudança de schema (migração `add_team_run_reset_at`)

```prisma
model TeamRun {
  // ... existentes ...
  resetAt DateTime? @map("reset_at") @db.Timestamptz()  // NOVO: reset (UTC) quando status='rate_limited'
  @@index([status, resetAt])   // NOVO: cron resume-blocked-teams filtra rate_limited + resetAt<=now
}
```
SQL (host real, antes do push):
```sql
ALTER TABLE "team_runs" ADD COLUMN "reset_at" TIMESTAMPTZ;
CREATE INDEX "team_runs_status_reset_at_idx" ON "team_runs"("status", "reset_at");
```
`rate_limited` já é status terminal (sem coluna). `tokensUsed`/`estimatedCost`/`turnsUsed` inalterados.

## Máquina de estados — TeamRun

```
pending ─dispatch→ running ─(coordinator ok)→ completed
                      │
                      ├─(pool esgota)→ rate_limited  (resetAt setado pelo wrapper de captura)
                      │                     │
                      │     resume manual   │  cron (resetAt ≤ now)
                      │                     ▼
                      └──────────────────→ running  (resetRunForResume + re-dispatch; lead relê board)
                      │
                      └─(erro não-limite)→ failed   (inalterado)
```

## Regra de retomada (`resetRunForResume`, read-side)

| Estado na retomada | Ação |
|---|---|
| TeamTask `done` | preserva (não reexecuta) |
| TeamTask `doing` | → `todo` (re-executa a interrompida) |
| TeamTask `review`/`todo` | mantém (coordinator processa) |
| TeamRun `rate_limited` | → `pending`; `resetAt` → null |
| TeamRun ≠ `rate_limited` | rejeita o resume (guarda) |

O coordinator (`setRunRunning` + relê board) assume após o re-dispatch — **não** é editado.

## Entidades / helpers (todos por injeção, fora do coordinator)

- `withRateLimitCapture(chat)`: ChatFn wrapper — no throw de rate-limit, grava `TeamRun.resetAt`
  (`parseResetAt`) e re-lança.
- `resetRunForResume(runId)`: read-side (tasks + status).
- `isResumable(run)`: `run.status === 'rate_limited'`.
- `dispatchTeamRun(runId)`: re-dispara (chat via `runTeamByTopology`/`after`; code via `enqueueCodeRun`).

## Invariantes verificáveis

1. Run de Team em modo chat que esgota ⇒ `status='rate_limited'`, e a saída/`output` **não** é a banner de
   limite.
2. `resetAt != null` quando o CLI reportou o horário; o cron só religa esses.
3. Retomar ⇒ tarefas `done` intactas (sem reexecução); `doing` viraram `todo`.
4. `runTeam`/`team-coordinator`/`team-board` diff vazio.
