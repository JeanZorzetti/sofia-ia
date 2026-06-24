# Quickstart — Team Run Resilience

## 1. Migração no host real (antes do push — Princípio III)

```bash
DATABASE_URL='postgres://sofia_db:***@2.24.207.200:5435/sofia_db?sslmode=disable' npx prisma migrate deploy
```
Confere: `team_runs.reset_at` + índice `team_runs_status_reset_at_idx`. Dados preservados.

## 2. Reproduzir esgotamento (chat-run)

Com o pool esgotado, rodar um Team em `/dashboard/teams` (modo chat). Esperado agora:
- O run termina **`rate_limited`** (não `completed` falso); a banner de limite **não** aparece como
  resposta do agente.
- `resetAt` capturado (quando o CLI reporta).
- UI mostra "bloqueado por limite" + reset + botão retomar.

## 3. Retomar

**Manual**: botão "retomar" na UI → `POST /api/teams/[id]/runs/[runId]/resume`. O coordinator relê o
board; tarefas `done` não rodam de novo; a `doing` interrompida re-executa.

**Automática** (cron, registrar no cron-job.org):
```
GET https://polarisia.com.br/api/cron/resume-blocked-teams
Authorization: Bearer <CRON_SECRET>
```
Religa runs `rate_limited` com `resetAt<=now`.

## 4. Verificações de não-regressão

- **Coordinator intocado**: `git diff` vazio em `src/lib/orchestration/team/{team-coordinator,team-executor,team-graph-coordinator,team-board}.ts`.
- **Code-runs**: continuam marcando `rate_limited` (já funcionavam).
- **Empresas (007)**: fases continuam marcando `blocked`/retomáveis; agora o TeamRun de fase também vem
  `rate_limited` corretamente (a 007 já cobre via `isPhaseExhausted`).
- **Caminho feliz**: runs que concluem sem esgotar — idênticos.

## Gate

- `npx tsc --noEmit` = 0 erros · teste puro `team-resilience.test.ts` verde no CI.
- Diff vazio no coordinator/board.
