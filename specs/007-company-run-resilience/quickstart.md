# Quickstart — Company Run Resilience

## 1. Aplicar a migração no host real (ANTES do push — Princípio III)

```bash
DATABASE_URL='postgres://sofia_db:***@2.24.207.200:5435/sofia_db?sslmode=disable' \
npx prisma migrate deploy
```
Confere: `company_runs.reset_at` e `company_phase_runs.usage` existem; índice
`company_runs_status_reset_at_idx` criado. Tabelas/dados existentes preservados.

## 2. Reproduzir o esgotamento (estado blocked)

Com o pool de contas Claude no limite (ou poucas contas), disparar uma execução da empresa ROI Labs.
Esperado agora:
- A fase em que o pool esgota fica **`blocked`** (não `completed`), com `usage.blocked=true`.
- A `CompanyRun` fica **`blocked`**, com `resetAt` = horário reportado pelo CLI e `currentPhase` = a fase.
- **Nenhuma** fase posterior é iniciada (contraste com a run do encurtador, que queimou 3 fases vazias).

Verificar no relatório:
```bash
DATABASE_URL='…@2.24.207.200:5435/…' npx tsx scripts/report-company-run.ts --company 0e7d636a-c7df-4930-8088-a5f97a3402cb
```
→ as fases não executadas aparecem como **bloqueadas** (não "completed"); o relatório mostra a fase de
parada e o `resetAt`.

## 3. Retomar

**Manual** (quando a janela já resetou):
```
POST /api/companies/0e7d636a-.../runs/<runId>/resume   (autenticado, dono da empresa)
→ 202; runCompany retoma da fase blocked, reusando os artefatos das fases completed.
```

**Automática** (cron): registrar no cron-job.org, como os demais crons:
```
GET https://polarisia.com.br/api/cron/resume-blocked-companies
Authorization: Bearer <CRON_SECRET>
```
A varredura retoma sozinha as runs `blocked` cujo `resetAt <= now`. Runs cujo reset ainda não passou ficam
aguardando.

## 4. Validar a base de consumo

Após algumas runs, `CompanyPhaseRun.usage` acumula o proxy por fase (`weightedUnits`, `byModel`). O
relatório agrega por fase/modelo/cargo — base para estimar "esta missão ≈ N unidades" no futuro (sem ML).

## Rollback

- Reverter código (commit). As colunas novas são nullable e inertes para o fluxo legado — podem
  permanecer ou ser removidas (`ALTER TABLE … DROP COLUMN reset_at, usage;` + drop do índice) com precheck.
- Nada toca o engine de Teams, a Company, os agentes ou os Times.

## Gate

- `npx tsc --noEmit` = 0 erros · teste puro `company-resilience.test.ts` (INV-1..8) verde no CI.
- Diff vazio em `src/lib/orchestration/team/*` (coordinator intocado).
- E2E: esgotamento→blocked→resume reexecuta só as fases pendentes (0 reexecução de completed).
