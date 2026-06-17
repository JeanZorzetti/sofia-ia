# Grafo de Execução Agêntica — modo "graph" opt-in para Polaris Teams

> Roadmap de design. Inspirado no motor + visualização do **Agent Teams AI**. Implementação **1 fatia por sessão** (G0–G6), `runTeam` linear **INTOCADO**.

## Context

Hoje a orquestração de Teams na Polaris é **linear e fixa**: o coordinator `runTeam` ([team-coordinator.ts:25](../../../src/lib/orchestration/team/team-coordinator.ts#L25)) roda fases rígidas por turno — *planning (Lead) → execution (Workers, em `for` sequencial) → review (Reviewer) → settle*. Os papéis são `lead | worker | reviewer` ([team-types.ts:4](../../../src/lib/orchestration/team/team-types.ts#L4)) e a "Topologia" visual ([TeamGraph.tsx](../../../src/app/dashboard/teams/[id]/TeamGraph.tsx)) é um React Flow **read-only** de posições hardcoded que só pisca o membro ativo. **Não há dependências entre tarefas, paralelismo real, nem roteamento dinâmico.**

O **Agent Teams AI** (`C:\dev\agent-teams-ai`) é mais robusto porque combina **duas camadas**:

1. **Motor "agenda engine"** (`agent-teams-controller/src/internal/agenda.js`): as tarefas formam um **DAG** (`blockedBy` / `blocks` / `related`); uma *state machine* por-tarefa deriva `nextAction` + `actionOwner`; os membros trabalham em **agendas paralelas**; e review / clarificação / handoff são estados de primeira classe.
2. **Visualização ao vivo** (`packages/agent-graph`): grafo força-direcionado com nós de **lead / membro / tarefa / processo**, arestas tipadas (ownership / blocking / message) e **partículas animadas** nos handoffs, com estado por-nó em tempo real (idle / thinking / tool_calling / waiting).

**Decisão:** trazer **as duas camadas** para a Polaris como um **modo "graph" opt-in**. O `runTeam` linear permanece **INTACTO** (invariante de todo o programa SP6/Harness) e um novo executor irmão `runTeamGraph` roda quando o time usa topologia de grafo. **Zero regressão**; os dois modos convivem.

---

## Princípios de design (herdados do programa)

- **Reuso > código novo.** O modo grafo reaproveita o mesmo `TeamStore`, `ChatFn` (`chatWithAgent`), parsers ([team-protocol.ts](../../../src/lib/orchestration/team/team-protocol.ts)), prompts ([team-prompts.ts](../../../src/lib/orchestration/team/team-prompts.ts)) e o router `startTeamRun` ([start-team-run.ts:31](../../../src/lib/orchestration/team/start-team-run.ts#L31)). A diferença vive só no **executor** e no **renderer**.
- **`runTeam` intocado.** O grafo é um executor irmão (`runTeamGraph`), selecionado por flag. Nada de mexer no coordinator linear.
- **Migração formal + manual no host de prod.** O standalone do Next **não** aplica `db push` no deploy (lição registrada). A única fatia com schema (G1) exige `prisma migrate` + `migrate deploy` **manual no host de produção ANTES do push** — host das migrações recentes de Teams = `sofia_db@2.24.207.200:5435` (⚠️ confirmar qual é o de prod atual antes de aplicar).
- **1 fatia/sessão**, `tsc`/`build` limpos, commit+push ao concluir. Gate real = E2E autenticado em prod (jest não roda local — OneDrive errno -4094).
- **Viz fica no React Flow (`@xyflow/react`)** já existente. Não introduzir d3-force/canvas no v1 (é o que o Agent Teams AI usa para as partículas, mas é um lift bem maior; fica como upgrade de fidelidade futuro).

---

## Mapa de conceitos: Agent Teams AI → Polaris

| Agent Teams AI | Polaris (alvo do modo grafo) |
|---|---|
| `task.blockedBy[]` / `blocks[]` (DAG runtime) | `TeamTask.dependsOn String[]` (G1) |
| `agenda.js` deriva `nextAction` / `actionOwner` | `deriveTaskAction(task, board)` em `team-graph-agenda.ts` (G2) |
| Membros executam agendas em paralelo | `Promise.all` com teto de concorrência (G3) |
| `reviewState: none→review→needsFix→approved` | reusa `TaskStatus` + `reviewNote` / `retryCount` já existentes; `needsFix` ≈ retry |
| `needsClarification: lead / user` (escalação) | `@CLARIFY` → estado de espera (G6, opcional) |
| GraphNode kinds: lead / member / **task** / process | nós de membro (já existem) + **nós de tarefa** (G4) |
| GraphEdge: ownership / blocking / message | arestas owner→task, task→task (dep), handoff (G4/G5) |
| GraphParticle (handoff animado) | edges animadas / dot móvel no React Flow (G5) |
| Persistência em JSON files + atomic write | Prisma/Postgres (store já existe); flag em `Team.config` JSON |

---

## Arquitetura do modo grafo

### Seleção do executor (sem tocar no coordinator)

`Team.config.topology: 'linear' | 'graph'` (campo **JSON**, sem migração). Em `startTeamRun`, despachar:

```ts
topology === 'graph' ? runTeamGraph(runId, deps) : runTeam(runId, deps)   // default = linear
```

`RunTeamDeps` é reaproveitado as-is (`store`, `chat`, `getTaskDiff`, `now`).

### `runTeamGraph` — loop agenda-driven (substitui as fases rígidas)

A cada turno (até `config.maxTurns`):

1. **Agenda:** `buildAgenda(board)` deriva, por tarefa, `{ nextAction, actionOwner }`:
   - deps não-concluídas → `wait_dependency` (tarefa fica `blocked`)
   - sem `assigneeId` → `assign_owner` (owner = lead)
   - `status === 'review'` → `review` (owner = reviewer)
   - rejeitada com retry disponível → `apply_changes` (owner = dono)
   - `todo` / `doing` com deps prontas → `execute` (owner = dono)
   - `done` / `rejected` / sem retry → terminal
2. **Lead** age só quando há bucket dele (assign_owner, board vazio, ou consolidar) — protocolo estendido permite declarar dependências (`@TASK [worker:X] [after:#2] Título`).
3. **Workers** executam **em paralelo** (fan-out, teto de concorrência) todas as tarefas `execute` / `apply_changes` com deps prontas (fan-in).
4. **Review** roda em paralelo nas tarefas em `review` (diff capturado uma vez, como hoje).
5. **Settle:** `isBoardSettled` → consolidação pelo Lead → `finish('completed')`.

A robustez vem de **3 coisas que o linear não tem**: gating por dependência (DAG), paralelismo real, e roteamento dinâmico pela state machine (em vez de ordem fixa de fases).

### Visualização (modo grafo do `TeamGraph.tsx`)

Alimentada pelo **stream SSE já existente** (`GET /api/teams/[id]/runs/[runId]/stream`, eventos `board` / `message` / `status` / `terminal`):

- **Nós de tarefa** orbitando o dono, cor por status (todo / doing / review / done / rejected / blocked), chip de reviewer e badge de "blocked".
- **Arestas:** owner→task (ownership) e task→task (dependência), além das member↔member.
- **Handoff:** edges animadas / dot móvel disparadas nos eventos `message` / `assignment` / `review`.
- **Estado por-nó:** membro ativo / thinking a partir do evento `status` (já carrega membro ativo + métricas).

---

## Roadmap (G0–G6, 1 fatia por sessão)

- **G0 — Topologia opt-in + dispatch.** `Team.config.topology` (JSON, sem migração) + router em `startTeamRun`. `runTeamGraph` nasce como cópia paritária do linear (comportamento idêntico). Backward-compat total. *Verif.:* time linear roda igual; time `graph` roda idêntico ao linear.
- **G1 — DAG de dependências. ✅ FEITO (2026-06-17).** Migração aditiva `TeamTask.dependsOn String[]` (migração `20260617180000_add_team_task_depends_on` aplicada manual via `migrate deploy` no host de prod `sofia_db@2.24.207.200:5435` ANTES do push; coluna `depends_on` confirmada no DB real). Protocolo `@TASK [after:#n]`/`[after:#1,#3]` (`extractDirectives` em [team-protocol.ts](../../../src/lib/orchestration/team/team-protocol.ts), order-independent com `[worker:]`) + ids de exibição estáveis `#n=position+1` e contrato `[after:]` no `buildLeadContext`/`buildBoardSnapshot` (coluna `blocked` adicionada ao snapshot) ([team-prompts.ts](../../../src/lib/orchestration/team/team-prompts.ts)). `runTeamGraph` **forkou o loop do `runTeam`** (linear INTACTO): resolve `#n`→ids reais na criação (`displayToId`, backward refs), e na execução só roda tarefas cujas deps estão todas `done`; as demais ficam `blocked` (helper puro `depsSatisfied` em [team-board.ts](../../../src/lib/orchestration/team/team-board.ts)) e o settle (`isBoardSettled`) nunca conclui com tarefa bloqueada pendente. *Verif.:* 16 asserts em `scripts/g1-verify.ts` (jest trava local → tsx) + testes jest (gate CI); typecheck limpo. **E2E autenticado em prod pendente com o usuário.**
- **G2 — Agenda state machine. ✅ FEITO (2026-06-17).** Novo `team-graph-agenda.ts` puro: `deriveTaskAction(task, board)` → `{ nextAction, actionOwner }` com prioridade **terminal-first** (`done`/`rejected` → `terminal` antes de tudo, pois o G1 nunca toca essas e uma tarefa `done` pode carregar `reviewNote` velho → evita re-rodar): `review`→`review`/reviewer; deps não-`done`→`wait_dependency`/none (vira `blocked`); sem `assigneeId`→`assign_owner`/lead; `todo`+`reviewNote`+`retryCount>0`→`apply_changes`/owner (DERIVADO do re-enfileiramento do review, **sem status novo**); resto→`execute`/owner. `buildAgenda(board)` classifica o board em ordem. **Refactor do loop** ([team-graph-coordinator.ts](../../../src/lib/orchestration/team/team-graph-coordinator.ts)): as fases fixas viram roteamento agenda-driven — 1 snapshot dirige PARK (`wait_dependency`→`blocked`) + EXECUTE (`execute`/`apply_changes`→worker), REVIEW re-deriva de board fresco (workers acabaram de produzir `review` no mesmo turno). **SEQUENCIAL** (paralelismo = G3). **Decisões:** `apply_changes` derivado (enum intocado); `assign_owner` NÃO muda atribuição-na-criação (`resolveAssignee` segue dando worker → bucket vazio em runs reais = regressão dura preservada). `runTeam` INTOCADO, sem schema/migração. *Verif.:* `scripts/g2-verify.ts` (22 asserts via tsx: state-machine + regressão de loop parity/gating + apply_changes E2E) + `team-graph-agenda.test.ts` (jest, gate CI) + **`g1-verify.ts` segue 16/16** + typecheck limpo. **E2E autenticado em prod pendente com o usuário.**
- **G3 — Agendas paralelas. ✅ FEITO (2026-06-17).** Helper puro novo `team-concurrency.ts` (`runWithConcurrency(items, cap, fn)` — worker-pool: spawna `min(cap, n)` runners, cada um puxa o próximo índice; teto real ≤ `cap`, resultados **por índice** não por término, `cap` clampado a ≥1). Os dois `for` (EXECUTE workers + REVIEW reviewer) em [team-graph-coordinator.ts](../../../src/lib/orchestration/team/team-graph-coordinator.ts) viraram fan-out via o helper, com teto `config.maxParallel` (**JSON opcional, sem migração**; default = `workers.length` = largura do time, clamp ≥1; `maxParallel?` adicionado ao tipo `LoadedRun.config` e ao `parseConfig` **opcional** p/ não quebrar os memory-stores de teste). **Protocolo de rate-limit/cancel/erro sob fan-out:** cada `fn` NUNCA dá throw — faz o próprio bookkeeping e retorna uma tagged union `{kind:'ok'|'rate_limited'|'error'}`; **depois** do fan-out `pickTerminal` decide (rate-limit short-circuita → `finish('rate_limited')`; senão 1º erro → re-throw → `finish('failed')`); cancel checado 1× antes/depois do batch. O fan-in já é garantido pela agenda (runnable de um turno são independentes por construção; dependentes ficam `blocked`). Com **≤1 runnable/turno** (todos os cenários de regressão) o estado terminal é byte-idêntico ao G2. `runTeam` INTOCADO. *Verif.:* `scripts/g3-verify.ts` (18 asserts via tsx: helper cap/ordem/clamp + 2 tarefas independentes concorrem por barreira + `maxParallel=1` serializa + dependentes serializam por turno) + jest novos (`team-concurrency.test.ts` + `team-graph-coordinator-parallel.test.ts`, gate CI) + **`g1-verify` 16/16 e `g2-verify` 22/22** + typecheck limpo. **E2E autenticado em prod pendente com o usuário** (time `graph` com 2 tarefas independentes → confirmar concorrência ao vivo).
- **G4 — Viz: nós de tarefa + arestas de dependência.** Modo grafo do `TeamGraph.tsx`: nós de tarefa coloridos por status, badges, arestas owner→task e task→task. Lê `board` + `dependsOn` do SSE. *Verif.:* grafo mostra tarefas migrando todo→doing→review→done e setas de dependência.
- **G5 — Partículas de handoff + estado ao vivo.** Edges animadas nos eventos `message` / `assignment` / `review`; estado do membro (ativo / thinking) a partir do `status`. *Verif.:* atribuir tarefa anima Lead→Worker; review anima Worker→Reviewer.
- **G6 — (opcional/depois) Clarificação & escalação.** `@CLARIFY` → estado de espera (`needsClarification` lead/user); possível handoff cross-team. Deferido.

---

## Arquivos críticos

**Reuso (não alterar a lógica central):**

- [start-team-run.ts](../../../src/lib/orchestration/team/start-team-run.ts) — adicionar o dispatch linear vs grafo (G0).
- [team-coordinator.ts](../../../src/lib/orchestration/team/team-coordinator.ts) — **INTOCADO** (referência de comportamento).
- [team-store.ts](../../../src/lib/orchestration/team/team-store.ts), [team-protocol.ts](../../../src/lib/orchestration/team/team-protocol.ts), [team-prompts.ts](../../../src/lib/orchestration/team/team-prompts.ts), [team-board.ts](../../../src/lib/orchestration/team/team-board.ts) — estendidos (deps, `@after`, ids de exibição), nunca quebrando o caminho linear.

**Novos:**

- `src/lib/orchestration/team/team-graph-coordinator.ts` — `runTeamGraph` (G0+).
- `src/lib/orchestration/team/team-graph-agenda.ts` — `deriveTaskAction` / `buildAgenda` (G2).

**Schema/UI:**

- [prisma/schema.prisma](../../../prisma/schema.prisma) — `TeamTask.dependsOn String[]` (G1, migração manual no host de prod).
- [TeamGraph.tsx](../../../src/app/dashboard/teams/[id]/TeamGraph.tsx) — modo grafo (G4/G5).
- Rota SSE `GET /api/teams/[id]/runs/[runId]/stream` — confirmar que `board` carrega `dependsOn` (G4).

---

## Verificação

- **Por fatia:** `npm run typecheck` / `npm run build` limpos (checar bugs recorrentes: params `Promise`+`await`; `auth.id` ≠ `auth.userId`).
- **G1 (schema):** migração formal + `migrate deploy` manual no host de prod **antes do push**; confirmar a coluna no DB real.
- **E2E em prod (EasyPanel):** criar um time com `topology: 'graph'`, rodar uma missão com dependências entre tarefas, e confirmar no grafo ao vivo: gating de dependência, paralelismo, roteamento de review e as partículas de handoff.
- **Regressão:** um time `linear` continua rodando idêntico (mesmo `runTeam`, mesmo output).
- **Commit + push** ao concluir cada fatia (não encadear sessões automaticamente — regra #4).
