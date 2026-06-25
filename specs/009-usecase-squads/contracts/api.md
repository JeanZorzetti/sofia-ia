# API Contracts — Squads por Case de Uso (Phase 1)

Convenções (iguais à 005): todas `withAuth`; escopo `ownerId(auth)` via `Company.createdBy`; respostas
`apiOk`/`apiError`/`apiNotFound`; params `Promise<…>` + `await`; validação com schemas zod em
`@/lib/validation`. IDOR: empresa/squad de outro dono → `404` (não `403`).

## Squads de uma empresa

### `GET /api/companies/[id]/squads`
Lista os squads da empresa (`Team` com `companyId=id`, `status='active'`).
- **200** `{ squads: [{ id, name, useCase, members: [{ agentId, name, role }], lastRun?: { id, status, createdAt } }] }`
- **404** empresa não pertence ao dono.

### `POST /api/companies/[id]/squads`
Cria um squad (compor manualmente — US1). Body:
```jsonc
{ "name": "Feature nova", "useCase": "Implementar uma feature ponta-a-ponta",
  "members": [ { "agentId": "uuid", "role": "lead" }, { "agentId": "uuid", "role": "worker" },
               { "agentId": "uuid", "role": "reviewer" } ] }
```
- Valida: 1 `lead`; agentes pertencem ao dono; tamanho ≤ teto (aviso acima). Cria `Team(status='active',
  companyId=id, config.useCase)` + `TeamMember[]` (reusa `createTeamWithRoster`).
- **201** `{ squadId }` · **400** validação · **404** empresa.

### `POST /api/companies/[id]/squads/seed`
Decompõe a empresa nos squads do blueprint do nicho (US4). **Idempotente** (upsert por
`config.squadKey`). Resolve `roleKey → CompanyRole.agentId`; pula squads cujos cargos não estão encaixados.
- **200** `{ created: n, skipped: [{ key, reason }] }` · **404** empresa.

### `GET /api/companies/[id]/squads/[squadId]`
Detalhe do squad (membros, useCase, histórico de runs). **200**/**404**.

### `PATCH /api/companies/[id]/squads/[squadId]`
Edita nome/useCase/membros. Revalida (1 lead etc.). **200**/**400**/**404**.

### `DELETE /api/companies/[id]/squads/[squadId]`
Remove o squad (Team). Runs históricos seguem a cascata existente de `Team`. **200**/**404**.

## Execução & fila (WIP=1 global)

### `POST /api/companies/[id]/squads/[squadId]/run`
Dispara o squad. Body: `{ "mission": "texto da tarefa" }`.
- Cria `TeamRun(teamId=squadId, status='pending')` (= **enfileirado**) e chama `dispatchSquadQueue()` via
  `after()`. O dispatcher só promove a `running` se não houver squad-run `running` global.
- **202** `{ runId, queued: boolean, position?: number }` — `queued=true` se ficou na fila.
- **404** empresa/squad · **400** mission ausente.

### `GET /api/companies/[id]/squads/[squadId]/runs`  (ou reuso de `team-runs`)
Runs do squad com status (`pending|running|completed|failed|rate_limited`) + `resetAt`. **200**/**404**.

### `GET /api/squad-runs/queue`
Estado **global** da fila (read-only, escopado ao dono na exibição): o que está `running` e a lista de
`pending` ordenada por `createdAt`.
- **200** `{ running?: { runId, squadId, companyId, startedAt }, queue: [{ runId, squadId, companyId, position, createdAt }] }`

### `POST /api/cron/drain-squad-queue`  (cron / rede de segurança)
Protegido por `CRON_SECRET` (padrão dos crons 007/008). Chama `dispatchSquadQueue()`: se nenhum squad-run
`running` e há `pending`, promove o mais antigo. Não inicia nada se houver run aguardando reset de cota
(008). **200** `{ started?: runId, skipped?: reason }`.

## Gate `dispatchSquadQueue()` — contrato interno (não-HTTP)
```
em transação:
  pg_advisory_xact_lock(SQUAD_QUEUE_LOCK_KEY)         // serializa o claim
  if exists(TeamRun running where team.companyId!=null and team.status='active'): return  // WIP=1
  if exists(TeamRun rate_limited com resetAt no futuro): return                            // pool esgotado (008)
  next = TeamRun pending (squad) order by createdAt asc limit 1
  if none: return
  marca next.status='running', startedAt=now
após a transação (fora do lock):
  after(() => runTeamAndWait(next.teamId, { mission: next.mission }).finally(dispatchSquadQueue))
```
Invariante verificável (teste): sob disparos concorrentes, `count(running squad-runs) ≤ 1` sempre.
