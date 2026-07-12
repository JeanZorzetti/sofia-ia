# Grafo — Sessão 6 (kickoff): executar G5 (viz — partículas de handoff + estado ao vivo)

> Cole este arquivo como contexto inicial de um chat novo. Ele carrega o estado do programa "Grafo", os invariantes que NÃO podem ser quebrados, e a tarefa da sessão: a fatia **G5** — a SEGUNDA (e última obrigatória) da camada de **visualização**.

**Projeto:** Polaris (sofia-next). Raiz: `C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (caminhos abaixo são relativos a ela). Deploy EasyPanel (Docker) em `polarisia.com.br`. Idioma de resposta: PT; código/commits em EN.

---

## 1. O que é o programa "Grafo"

Dar à orquestração de Teams da Polaris um **grafo de execução agêntica** como o do **Agent Teams AI** (`C:\dev\agent-teams-ai`), em vez do antigo fluxo **linear e fixo** (`runTeam`). Decisão do usuário: trazer **motor + visualização** como **modo "graph" OPT-IN** — o `runTeam` linear fica **INTACTO** e um executor irmão `runTeamGraph` roda quando o time usa `topology: 'graph'`. Roadmap completo (G0–G6) em **`docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md`** — **leia primeiro**. A nota de memória `project_polaris_teams` (auto-carregada) tem o histórico.

O Agent Teams AI combina **duas camadas**: (1) **motor "agenda engine"** (DAG + state-machine + agendas paralelas) e (2) **visualização ao vivo** (`packages/agent-graph`: nós de lead/membro/tarefa, arestas tipadas, **partículas animadas de handoff**, estado por-nó idle/thinking/tool_calling/waiting). **O MOTOR (camada 1) ESTÁ COMPLETO** (G1–G3). **A CAMADA 2 (viz) começou no G4** (nós de tarefa + arestas de dependência) e o **G5 a fecha** com o movimento/estado ao vivo. Referência de design da viz: `packages/agent-graph` do Agent Teams AI — mas **a viz da Polaris fica no React Flow (`@xyflow/react`) já existente**, sem d3-force/canvas/framer-motion no v1.

---

## 2. Estado atual (G0–G4.1 ✅ feitos e na `main`)

- **G0 (commit `905d8e6`)** — dispatch opt-in. `Team.config.topology: 'linear' | 'graph'` (JSON, sem migração, default `linear`). `team-executor.ts` (`runTeamByTopology`/`pickTopology`/`resolveRunTopology`); 4 sites de invocação chamam o dispatcher.
- **G1 (commit `2802ddd`)** — DAG de dependências. `TeamTask.dependsOn String[]` (migração `20260617180000_add_team_task_depends_on` aplicada em prod). Protocolo `@TASK [after:#n]`/`[after:#1,#3]` (ids de exibição estáveis `#n=position+1`). Helper puro `depsSatisfied(task, board)` (em `team-board.ts`).
- **G2 (commit `31b7568`)** — agenda state-machine. `team-graph-agenda.ts` PURO: `deriveTaskAction(task, board)` → `{ nextAction, actionOwner }` (terminal-first) + `buildAgenda(board)`.
- **G3 (commit `d55dc0a`)** — agendas paralelas. Helper puro `team-concurrency.ts` (`runWithConcurrency(items, cap, fn)` — worker-pool, teto `config.maxParallel`). Os dois `for` (EXECUTE + REVIEW) viraram fan-out. `runTeam` INTOCADO.
- **G4 (commit `886f4b0`)** — viz: nós de tarefa + arestas de dependência. SSE passou a carregar `dependsOn`. Builder PURO novo [team-graph-view.ts](../../../src/lib/orchestration/team/team-graph-view.ts) (`buildTeamGraph(members, tasks, activeId) → {nodes, edges}`, **sem React/DOM e sem runtime de `@xyflow/react`** — só `import type`); [TeamGraph.tsx](../../../src/app/dashboard/teams/[id]/TeamGraph.tsx) virou renderer fino. **Board-driven** (nós de tarefa em todo run); layout MANUAL (tarefas empilhadas sob o dono); cor por status, badge `blocked` 🔒, chip 🛡 reviewer, arestas `owner→task` e `task→task`. `g4-verify.ts` (32 asserts).
- **G4.1 (commit `4a54b42`)** — toggle Linear/Grafo na UI (fora do roadmap original). Módulo PURO `team-config-ui.ts` (`buildTeamConfig`/`topologyOf`/`maxParallelOf`); seletor de topologia + "Máx. paralelo" no `TeamFormModal` de [page.tsx](../../../src/app/dashboard/teams/page.tsx). Sem schema/migração. `g4_1-verify.ts` (20 asserts).

**É deste ponto que o G5 forka:** o grafo já desenha **membros + tarefas + arestas** e já destaca o **membro ativo** via `activeId` (o `TeamRunView` calcula `activeId` = dono da task `doing`, senão o último remetente, só enquanto a run está viva — ≈ [TeamRunView.tsx:176-178](../../../src/app/dashboard/teams/[id]/TeamRunView.tsx#L176)). E o **stream SSE já emite eventos `message`** com `{ id, fromMemberId, toMemberId, kind, summary, content, taskId }` (≈ [stream/route.ts:108-116](../../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts#L108)), onde `kind ∈ {assignment, review, message}`. **Falta o MOVIMENTO/estado ao vivo:** animar o handoff (Lead→Worker na atribuição, Worker→Reviewer no review) e marcar o estado "thinking" do membro ativo.

---

## 3. Tarefa desta sessão: G5 — partículas de handoff + estado ao vivo

**Objetivo:** quando uma tarefa é **atribuída** (evento `message` `kind:'assignment'`, `fromMemberId`→`toMemberId`), a aresta **Lead→Worker** correspondente **anima** (partícula/dot ou edge animada); quando vai pra **review** (`kind:'review'`), anima **Worker→Reviewer**; e o **membro ativo** ganha um estado visual de **"thinking"** (pulso/indicador) enquanto a run está viva. **Verificação-alvo:** numa run ao vivo, atribuir uma tarefa anima a aresta Lead→Worker; mandar pra review anima Worker→Reviewer; o membro que está agindo pulsa como "thinking".

**Escopo (faça só isto):**
1. **`TeamRunView.tsx` — derivar o handoff do último `message`.** O componente JÁ acumula `messages: Msg[]` e calcula `activeId`. Derive o **handoff corrente** a partir da última mensagem relevante (`kind === 'assignment' | 'review'`): `{ fromMemberId, toMemberId } | null` (só enquanto `running`; some quando a run termina). Passe isso (e o `running`) ao `<TeamGraph>`. **NÃO precisa mexer no SSE** — o evento `message` já carrega `fromMemberId`/`toMemberId`/`kind` (diferente do G4, que precisou adicionar `dependsOn` ao SSE).
2. **`team-graph-view.ts` (builder PURO) — animar a aresta do handoff + estado thinking.** Estenda `buildTeamGraph` para receber o handoff e o `running` **sem quebrar a assinatura atual** (o `g4-verify.ts` chama `buildTeamGraph(members, tasks, 'WA')` / `null` posicional) — **recomendado: 4º parâmetro opcional** `opts?: { handoff?: { fromMemberId: string; toMemberId: string } | null; running?: boolean }`. A aresta **membro↔membro** que casa com o handoff (`l-${workerId}` p/ Lead→Worker; `${workerId}-r` p/ Worker→Reviewer) ganha `animated: true` + estilo de destaque (cor/strokeWidth distintos da animação genérica do `activeId` que já existe). O **nó do membro ativo** ganha `data.thinking = true` (e/ou indicador no label/estilo) quando `running`. Mantenha o destaque de `activeId` que já existe.
3. **`TeamGraph.tsx` — repassar os novos campos.** O componente fica fino: aceita o handoff/running e os repassa ao builder. Se optar por **dot móvel** (em vez de só `animated`), pode exigir um **custom edge type** com `<animateMotion>` SVG nativo (sem dep nova) — decida e justifique (ver §4).

**NÃO faça nesta fatia:** `@CLARIFY`/escalação/handoff cross-team (=G6, deferido). **Sem dependência nova** (NÃO instalar framer-motion/d3/anime.js — animação via `animated` do React Flow ou SVG `<animateMotion>` nativo). **Sem schema/migração** (nada de DB). **Sem mexer no SSE** a menos que prove que falta um campo (não falta: `message` já traz from/to/kind; `status` já traz o status da run).

---

## 4. Invariantes e gotchas que NÃO podem ser quebrados

- **Motor INTOCADO.** G5 é **pura visualização**: toca **só** `TeamGraph.tsx`, o builder puro `team-graph-view.ts` e o `TeamRunView.tsx`. **NÃO** toca `runTeam`/`runTeamGraph`/coordinator/agenda/concurrency, **nem o SSE** (o `message` já basta). Se você se pegar editando `src/lib/orchestration/team/team-{coordinator,graph-*,concurrency,agenda}.ts` ou a rota `stream/route.ts`, parou de fazer G5.
- **Não quebrar o G4.** O `g4-verify.ts` (32 asserts) chama `buildTeamGraph(members, tasks, activeId)` **posicional** — preserve essa assinatura (adicione o handoff/running como **4º parâmetro opcional**, não reordene). O G4-verify deve seguir **32/32** após o G5.
- **Builder continua PURO.** `team-graph-view.ts` não importa React/DOM nem runtime de `@xyflow/react` (só `import type { Node, Edge }`). O `g5-verify.ts` (tsx) testa o builder **sem** React Flow. NÃO introduza `Position` (enum runtime) nem componentes React no módulo puro — se precisar de custom edge (dot móvel), o **componente** do custom edge mora no `TeamGraph.tsx` (client), e o builder só referencia o `type` da aresta por string.
- **Sem dependência nova.** `@xyflow/react` já está no projeto (read-only, sem `hideAttribution` por licença). Animação: ou `edge.animated = true` (tracejado em movimento, **mais simples, v1**) ou **custom edge** com `<animateMotion>` SVG (dot deslizando, mais fiel ao Agent Teams AI, mas exige registrar `edgeTypes` no `<ReactFlow>`). **Não** d3/framer/anime.
- **`TeamGraph` aparece em TODA run (linear E graph).** Decisão do G4 mantida: **board-driven**. Num run linear também há handoffs (atribuição/review acontecem), então as animações de handoff valem para os dois modos — não gate em `topology`.
- **jest NÃO roda local** (OneDrive errno -4094 — `node.exe` pendura, output vazio; mate e siga). Gate local = **`npm run typecheck`** (pre-commit do husky) + **`scripts/g5-verify.ts`** (tsx + `node:assert`) sobre o **builder puro**. **O gate REAL do G5 é E2E no browser em prod** (é movimento — só dá pra confirmar visualmente). Escreva o teste do builder mesmo assim.
- **Higiene de commit:** a árvore costuma ter mudanças NÃO-relacionadas (SVGs/PNGs em `public/`, docs soltos `Sessão *.md`). **Stage só os arquivos da fatia G5** (`git add <paths explícitos>`), nunca `git add -A`.
- **Bugs recorrentes do Next 16** (params `Promise`+`await`, `auth.id` ≠ `auth.userId`): só importam se você tocar rota — e o G5 **não toca rota**. Não regrida nada.
- **Antes de codar:** confirme a abordagem em 1-2 frases (regra global #2) — em especial **(A) dot móvel via custom edge `<animateMotion>` vs (B) só `edge.animated` do React Flow** (recomendação: B no v1, dot como upgrade de fidelidade), e **a janela do handoff** (animar só o último handoff, que se atualiza a cada `message`, vs decair com o tempo — recomendação: último handoff enquanto `running`). Não encadeie pro G6 sozinho.

---

## 5. Verificação (Definition of Done do G5)

1. `npm run typecheck` limpo (arquivos do G5 sem erro novo; o baseline pré-existente de `bullmq`/`e2b`/`@xterm`/Prisma-drift não conta).
2. `scripts/g5-verify.ts` (tsx) provando, sobre o **builder puro** `buildTeamGraph` com o 4º param de handoff/running: **handoff Lead→Worker** anima a aresta `l-<worker>` (e só ela, com o estilo de destaque) · **handoff Worker→Reviewer** anima `<worker>-r` · **sem handoff** → nenhuma aresta com estilo de handoff (regressão) · **membro ativo** com `running` carrega `data.thinking === true`; sem `running` não. (Sem React Flow/DOM no teste — só o builder.)
3. **Sem regressão do G4:** `g4-verify.ts` segue **32/32** (e `g1`16/`g2`22/`g3`18/`g4_1`20 idem); um run continua mostrando membros + nós de tarefa + arestas de dependência.
4. Commit (só arquivos da fatia, **sem migração**) + push na `main`. Mensagem EN, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
5. Atualizar `GRAFO-EXECUCAO.md` (marcar G5 ✅) e a nota de memória `project_polaris_teams`.
6. **E2E autenticado em prod (browser) fica com o usuário** (gate real): rodar um time (`topology: 'graph'` de preferência, com deps) e confirmar ao vivo — **atribuição anima Lead→Worker**, **review anima Worker→Reviewer**, e o **membro ativo pulsa como "thinking"** enquanto trabalha.

---

## 6. Prompt de partida sugerido (cole no chat novo)

> Leia `docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md` e `docs/Polaris Teams/Grafo/Sessão 6.md`. Vamos executar a fatia **G5 (viz — partículas de handoff + estado ao vivo)** do programa Grafo, respeitando os invariantes (motor E SSE INTOCADOS — G5 é pura viz tocando só `TeamGraph.tsx` + builder puro `team-graph-view.ts` + `TeamRunView.tsx`; **sem dependência nova / animação via `@xyflow/react`**; sem schema/migração; **não quebrar o `g4-verify.ts` — handoff/running como 4º parâmetro opcional do `buildTeamGraph`**; higiene de commit; 1 fatia/sessão). Confirme a abordagem em 1-2 frases antes de codar — em especial **(A) dot móvel via custom edge `<animateMotion>` vs (B) só `edge.animated`** e **a janela do handoff (só o último, enquanto `running`)**.
