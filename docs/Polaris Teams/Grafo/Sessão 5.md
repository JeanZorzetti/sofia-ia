# Grafo — Sessão 5 (kickoff): executar G4 (viz — nós de tarefa + arestas de dependência)

> Cole este arquivo como contexto inicial de um chat novo. Ele carrega o estado do programa "Grafo", os invariantes que NÃO podem ser quebrados, e a tarefa da sessão: a fatia **G4** — a PRIMEIRA da camada de **visualização**.

**Projeto:** Polaris (sofia-next). Raiz: `C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (caminhos abaixo são relativos a ela). Deploy EasyPanel (Docker) em `polarisia.com.br`. Idioma de resposta: PT; código/commits em EN.

---

## 1. O que é o programa "Grafo"

Dar à orquestração de Teams da Polaris um **grafo de execução agêntica** como o do **Agent Teams AI** (`C:\dev\agent-teams-ai`), em vez do antigo fluxo **linear e fixo** (`runTeam`). Decisão do usuário: trazer **motor + visualização** como **modo "graph" OPT-IN** — o `runTeam` linear fica **INTACTO** e um executor irmão `runTeamGraph` roda quando o time usa `topology: 'graph'`. Roadmap completo (G0–G6) em **`docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md`** — **leia primeiro**. A nota de memória `project_polaris_teams` (auto-carregada) tem o histórico.

O Agent Teams AI combina **duas camadas**: (1) **motor "agenda engine"** (DAG + state-machine + agendas paralelas) e (2) **visualização ao vivo** (`packages/agent-graph`: nós de lead/membro/**tarefa**, arestas tipadas, partículas de handoff). **O MOTOR (camada 1) JÁ ESTÁ COMPLETO** (G1–G3). **A partir do G4 começa a CAMADA 2 (viz).** Referência de design da viz: `packages/agent-graph` do Agent Teams AI — mas **a viz da Polaris fica no React Flow (`@xyflow/react`) já existente**, sem d3-force/canvas no v1.

---

## 2. Estado atual (G0 + G1 + G2 + G3 ✅ feitos e na `main`)

- **G0 (commit `905d8e6`)** — dispatch opt-in. `Team.config.topology: 'linear' | 'graph'` (JSON, sem migração, default `linear`). `team-executor.ts` (`runTeamByTopology`/`pickTopology`/`resolveRunTopology`); 4 sites de invocação chamam o dispatcher.
- **G1 (commit `2802ddd`)** — DAG de dependências. `TeamTask.dependsOn String[]` (migração `20260617180000_add_team_task_depends_on` aplicada em prod). Protocolo `@TASK [after:#n]`/`[after:#1,#3]` (ids de exibição estáveis `#n=position+1`). Helper puro `depsSatisfied(task, board)` (em `team-board.ts`).
- **G2 (commit `31b7568`)** — agenda state-machine. `team-graph-agenda.ts` PURO: `deriveTaskAction(task, board)` → `{ nextAction, actionOwner }` (terminal-first) + `buildAgenda(board)`. O loop do `runTeamGraph` virou agenda-driven.
- **G3 (commit `d55dc0a`)** — agendas paralelas. Helper puro `team-concurrency.ts` (`runWithConcurrency(items, cap, fn)` — worker-pool, teto `config.maxParallel`, default `workers.length`). Os dois `for` (EXECUTE + REVIEW) viraram fan-out; protocolo de rate-limit/cancel/erro = tagged union `{kind:'ok'|'rate_limited'|'error'}` + `pickTerminal` pós-batch. `runTeam` INTOCADO.

**É deste ponto que o G4 forka:** o motor produz, a cada turno, um **board** com tarefas (`status`, `assigneeId`, `dependsOn`) que já é transmitido por SSE. O G4 **desenha** esse board: hoje o [TeamGraph.tsx](../../../src/app/dashboard/teams/[id]/TeamGraph.tsx) é um React Flow read-only que mostra **só os membros** (lead/worker/reviewer, posições hardcoded, destaca o membro ativo). Falta mostrar as **tarefas** e as **dependências**.

---

## 3. Tarefa desta sessão: G4 — nós de tarefa + arestas de dependência

**Objetivo:** o modo grafo do `TeamGraph.tsx` ganha **nós de tarefa** coloridos por status (`todo`/`doing`/`review`/`done`/`rejected`/`blocked`), orbitando o **dono** (assignee), com **chip de reviewer** e **badge "blocked"**; e **arestas** `owner→task` (ownership) e `task→task` (dependência, lendo `dependsOn`), além das `member↔member` que já existem. Tudo alimentado pelo **stream SSE já existente** (`GET /api/teams/[id]/runs/[runId]/stream`). **Verificação-alvo:** num run com dependências, o grafo mostra as tarefas migrando `todo→doing→review→done` e as **setas de dependência** entre elas; tarefas `blocked` aparecem com badge.

**Escopo (faça só isto):**
1. **SSE: carregar `dependsOn` no evento `board`.** Hoje a rota [stream/route.ts](../../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts) **NÃO** manda `dependsOn`: o `select` das tasks (≈ L60-63) e o payload do evento `board` (≈ L84-88) precisam **incluir `dependsOn`**. ⚠️ A assinatura de mudança de board (`sig = id:status:retry`, ≈ L81) **não precisa** incluir `dependsOn` (deps são imutáveis pós-criação; já chegam no 1º `board`). Mudança mínima, mas **obrigatória** (o G4 lê isso).
2. **`TeamGraph.tsx` — modo grafo.** Renderizar os nós de tarefa + arestas. **Extraia a lógica de montagem do grafo para um módulo PURO** (ex. `team-graph-view.ts`, `buildTeamGraph(members, tasks, activeId) → { nodes, edges }`) — assim o `g4-verify.ts` (tsx) testa o builder sem precisar de React Flow/DOM. O componente React fica fino (só renderiza `nodes`/`edges`). Cor por status: reusar a paleta do kanban do [TeamRunView.tsx](../../../src/app/dashboard/teams/[id]/TeamRunView.tsx) (`doing`=blue, `review`=purple, `done`=emerald, `rejected`=red, `todo`=white/30; **`blocked`=amber + badge** — decida e justifique).
3. **`TeamRunView.tsx` — fiar o board no grafo.** O `TeamRunView` JÁ mantém `tasks: BoardTask[]` (do evento `board`) e já calcula `activeId`, e já renderiza `<TeamGraph members={...} activeId={activeId} />` (≈ L409). Adicionar **`dependsOn: string[]`** ao tipo `BoardTask` (≈ L26) e **passar `tasks` (com `dependsOn`/`assigneeId`/`status`) para o `TeamGraph`**.

**NÃO faça nesta fatia:** **partículas / dot móvel de handoff** nem **estado "thinking" ao vivo** por evento (=G5 — o destaque do membro ativo via `activeId` já existe e PODE ficar; não adicione animação nova de handoff); `@CLARIFY`/escalação (=G6). **Sem dependência nova** (NÃO instalar dagre/elk/d3-force — layout MANUAL no `@xyflow/react` que já está no projeto). **Sem schema/migração** (a coluna `dependsOn` já existe desde o G1; só o `SELECT` do SSE precisa pedir).

---

## 4. Invariantes e gotchas que NÃO podem ser quebrados

- **Motor INTOCADO.** G4 é **pura visualização**: toca **só** a rota SSE (`stream/route.ts`), o `TeamGraph.tsx` e o `TeamRunView.tsx`. **NÃO** toca `runTeam`/`runTeamGraph`/coordinator/agenda/concurrency. Se você se pegar editando `src/lib/orchestration/team/*`, parou de fazer G4 (exceto criar o novo módulo puro de viz, que NÃO é engine).
- **Sem dependência nova.** `@xyflow/react` já está instalado e é read-only no projeto (sem `hideAttribution`, por licença). A **parte difícil do G4 é o LAYOUT MANUAL**: posicionar um número variável de nós de tarefa por dono sem lib de layout (o member-graph atual usa posições hardcoded). Pense numa disposição determinística (ex.: tarefas empilhadas/orbitando abaixo do worker dono; reviewer/lead como já estão). Não introduza dagre/elk/d3.
- **`TeamGraph` aparece em TODA run (linear E graph), não só graph.** Decisão a confirmar: **(A)** renderizar nós de tarefa sempre que o board tiver tasks (topology-agnostic — num run linear simplesmente não há aresta `task→task` porque `dependsOn` é `[]`); ou **(B)** gate em `topology==='graph'` (exigiria plumbar a topologia para o client, que **hoje não existe** no `TeamRunView` — o `team` só traz `{id,name,members}`). **Recomendação: (A) board-driven** (mais simples, sem plumbing novo; o member-graph já renderiza para todo run mesmo). Confirme.
- **jest NÃO roda local** (OneDrive errno -4094 — `node.exe` pendura, output vazio; mate e siga). Gate local = **`npm run typecheck`** (pre-commit do husky) + **`scripts/g4-verify.ts`** (tsx + `node:assert`) sobre o **builder puro** (sem React Flow). **O gate REAL do G4 é E2E no browser em prod** (é viz — só dá pra confirmar visualmente). Escreva o teste do builder mesmo assim.
- **Higiene de commit:** a árvore costuma ter mudanças NÃO-relacionadas (SVGs/PNGs em `public/`, docs soltos `Sessão *.md`). **Stage só os arquivos da fatia G4** (`git add <paths explícitos>`), nunca `git add -A`.
- **Bugs recorrentes do Next 16:** a rota SSE já usa `params: Promise<{...}>` + `await params` e `auth.id` (NÃO `auth.userId`) e `import { prisma } from '@/lib/prisma'` — **não regrida** isso ao mexer no `select`/payload.
- **Antes de codar:** confirme a abordagem em 1-2 frases (regra global #2) — em especial **o layout manual dos nós de tarefa** e **a decisão (A) vs (B)** (renderizar nós de tarefa para toda run vs só topology graph). Não encadeie pro G5 sozinho.

---

## 5. Verificação (Definition of Done do G4)

1. `npm run typecheck` limpo (arquivos do G4 sem erro novo; o baseline pré-existente de `bullmq`/`e2b`/`@xterm`/Prisma-drift não conta).
2. `scripts/g4-verify.ts` (tsx) provando, sobre o **builder puro** `buildTeamGraph`: **1 nó por tarefa** · **aresta `owner→task`** para cada tarefa com assignee · **aresta `task→task`** para cada id em `dependsOn` · **cor/estilo por status** (os 6 status) · **badge `blocked`** · **chip de reviewer**. (Sem React Flow/DOM no teste — só o builder.)
3. **Sem regressão da viz de membros:** um run linear (sem deps) continua mostrando os membros e agora também os nós de tarefa, **sem** arestas de dependência.
4. Commit (só arquivos da fatia, **sem migração**) + push na `main`. Mensagem EN, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
5. Atualizar `GRAFO-EXECUCAO.md` (marcar G4 ✅) e a nota de memória `project_polaris_teams`.
6. **E2E autenticado em prod (browser) fica com o usuário** (gate real): criar/rodar um time `topology: 'graph'` com dependências entre tarefas e confirmar no grafo ao vivo — tarefas migrando `todo→doing→review→done`, **setas de dependência** `task→task`, badge `blocked` enquanto a dep não conclui.

---

## 6. Prompt de partida sugerido (cole no chat novo)

> Leia `docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md` e `docs/Polaris Teams/Grafo/Sessão 5.md`. Vamos executar a fatia **G4 (viz — nós de tarefa + arestas de dependência)** do programa Grafo, respeitando os invariantes (motor INTOCADO — G4 é pura viz tocando SSE route + TeamGraph + TeamRunView; **sem dependência nova / layout manual no `@xyflow/react`**; sem schema/migração; higiene de commit; 1 fatia/sessão). Confirme a abordagem em 1-2 frases antes de codar — em especial **o layout manual dos nós de tarefa** e se **renderizo nós de tarefa para toda run (board-driven) ou só para `topology: 'graph'`**.
