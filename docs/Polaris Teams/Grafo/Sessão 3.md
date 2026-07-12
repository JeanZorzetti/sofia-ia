# Grafo — Sessão 3 (kickoff): executar G2 (agenda state-machine)

> Cole este arquivo como contexto inicial de um chat novo. Ele carrega o estado do programa "Grafo", os invariantes que NÃO podem ser quebrados, e a tarefa da sessão: a fatia **G2**.

**Projeto:** Polaris (sofia-next). Raiz: `C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (caminhos abaixo são relativos a ela). Deploy EasyPanel (Docker) em `polarisia.com.br`. Idioma de resposta: PT; código/commits em EN.

---

## 1. O que é o programa "Grafo"

Dar à orquestração de Teams da Polaris um **grafo de execução agêntica** como o do **Agent Teams AI** (`C:\dev\agent-teams-ai`), em vez do atual fluxo **linear e fixo** (`runTeam`: planning → execution `for` sequencial → review → settle).

Decisão do usuário: trazer **motor + visualização**, como **modo "graph" OPT-IN** — o `runTeam` linear fica **INTACTO** e um executor irmão `runTeamGraph` roda quando o time usa `topology: 'graph'`. Roadmap completo (G0–G6) em **`docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md`** — **leia primeiro**. A nota de memória `project_polaris_teams` (auto-carregada) tem o histórico.

Referência de design do motor robusto: `C:\dev\agent-teams-ai\agent-teams-controller\src\internal\agenda.js` (tarefas formam DAG; **uma state-machine por-tarefa deriva `nextAction` + `actionOwner`**; os membros trabalham em agendas paralelas). **G2 é exatamente o pedaço da STATE-MACHINE** — o DAG de dependências já existe (G1), e o paralelismo é o G3. Não antecipe.

---

## 2. Estado atual (G0 + G1 ✅ feitos e na `main`)

**G0 (commit `905d8e6`) — seam de dispatch, zero mudança de comportamento:**
- `Team.config.topology: 'linear' | 'graph'` — campo **JSON** (sem migração), default `linear`.
- `src/lib/orchestration/team/team-executor.ts` — `runTeamByTopology` (dispatcher) + `pickTopology` (puro) + `resolveRunTopology`.
- Os 4 sites de invocação (`start-team-run.ts` chat-`after()` + `runTeamAndWait`; `worker/index.ts` repo + C0) chamam `runTeamByTopology`.

**G1 (commit `2802ddd`) — DAG de dependências:** `runTeamGraph` **deixou de delegar e forkou o loop do `runTeam`** (linear INTACTO). O loop atual do grafo já tem as 4 fases rígidas (planning → execução com gating → review → settle), mais:
- **Schema:** `TeamTask.dependsOn String[] @default([]) @map("depends_on")` (migração `20260617180000_add_team_task_depends_on` já aplicada em prod). `TaskRow.dependsOn: string[]` é **obrigatório**; store + memory-store já persistem/leem.
- **Protocolo (`team-protocol.ts`):** `extractDirectives` entende `@TASK [worker:X] [after:#2]` / `[after:#1,#3]`, order-independent; `LeadAction.dependsOn?: number[]` (display ids `#n`).
- **Prompts (`team-prompts.ts`):** board numerado com **id de exibição estável `#n = position+1`** + coluna `blocked` no snapshot + sintaxe `[after:]` no contrato do Lead.
- **Executor (`team-graph-coordinator.ts`):** na criação resolve `#n`→ids reais (`displayToId`, backward-refs no turno); na execução, helper puro **`depsSatisfied(task, board)`** (em `team-board.ts`) deixa rodar só tarefas `todo`/`blocked` cujas deps estão todas `done` — as demais viram `blocked`. `isBoardSettled` trata `blocked` como não-terminal → run nunca conclui com bloqueada pendente; deadlock é bounded por `maxTurns`.
- **Gate/verif:** `scripts/g1-verify.ts` (16 asserts via **tsx** — jest **trava local**, OneDrive errno -4094) + testes jest (CI).

**É deste ponto que o G2 forka:** o loop do `runTeamGraph` ainda é **4 fases rígidas em ordem**; o G2 troca isso por um loop **agenda-driven** onde uma state-machine deriva, por-tarefa, *o que fazer* e *quem faz*.

---

## 3. Tarefa desta sessão: G2 — agenda state-machine

**Objetivo:** uma state-machine pura deriva por-tarefa `{ nextAction, actionOwner }`; o loop do `runTeamGraph` passa a ser **dirigido pela agenda** em vez de fases fixas. **Verificação-alvo:** tarefa sem dono é roteada ao Lead (assign_owner); tarefa rejeitada com retry volta ao dono (apply_changes); tarefa em review vai ao reviewer; tarefa com deps pendentes espera (wait_dependency); e **o comportamento do G1 não regride** (gating, blocked, retry, settle continuam idênticos).

**Escopo (faça só isto):**
1. **Novo `src/lib/orchestration/team/team-graph-agenda.ts`** (puro, sem I/O — testável por tsx + jest):
   - `deriveTaskAction(task, board)` → `{ nextAction, actionOwner }`, espelhando o `agenda.js` (ordem de prioridade do GRAFO-EXECUCAO.md §"runTeamGraph — loop agenda-driven"):
     - deps não-concluídas → `wait_dependency` (tarefa fica `blocked`)
     - sem `assigneeId` → `assign_owner` (owner = lead)
     - `status === 'review'` → `review` (owner = reviewer)
     - rejeitada-mas-com-retry-disponível → `apply_changes` (owner = dono) — hoje o review já re-enfileira como `todo` com `reviewNote`; decida se `apply_changes` é um estado derivado disso ou um status novo (prefira **derivar**, sem mudar o enum de status)
     - `todo` / `doing` com deps prontas → `execute` (owner = dono)
     - `done` / `rejected` / sem retry → terminal
   - `buildAgenda(board, members)` → lista de `{ task, nextAction, actionOwner }` (ou um agrupamento por ação) que o loop consome. Reusa `depsSatisfied` (já em `team-board.ts`).
2. **Tipos (`team-types.ts`):** `TaskAction` (`'wait_dependency' | 'assign_owner' | 'review' | 'apply_changes' | 'execute' | 'terminal'`) e o shape de agenda. Aditivo.
3. **Refactor do loop (`team-graph-coordinator.ts`):** substituir as 4 fases rígidas por: a cada turno, `buildAgenda(board)` e rotear cada bucket ao owner certo (Lead consolida/atribui, Workers executam/corrigem, Reviewer revisa). **Mantenha SEQUENCIAL** (sem `Promise.all` — isso é G3). O resultado terminal de qualquer run que o G1 já cobria tem de ser **idêntico** (regressão dura).

**NÃO faça nesta fatia:** `Promise.all`/paralelismo + teto `maxParallel` (=G3), nós de tarefa na viz / `TeamGraph.tsx` (=G4), partículas (=G5), `@CLARIFY`/escalação (=G6). **Não há schema/migração no G2** (diferente do G1).

---

## 4. Invariantes e gotchas que NÃO podem ser quebrados

- **`runTeam` (team-coordinator.ts) INTOCADO.** É a referência do modo linear e o invariante de todo o programa. O grafo evolui só no `team-graph-coordinator.ts` + o novo `team-graph-agenda.ts`.
- **Regressão é o teste mais importante do G2.** O refactor agenda-driven é "mesmo comportamento, estrutura nova". `scripts/g1-verify.ts` (16 asserts) + os testes jest do G0/G1 (`team-graph-coordinator.test.ts`, paridade + gating) **devem continuar passando sem alteração**. Se um deles quebrar, a state-machine divergiu — conserte a máquina, não o teste.
- **Sem migração nesta fatia.** G2 não tem schema. (Se você se pegar mexendo no `schema.prisma`, parou de fazer G2.)
- **Higiene de commit:** a árvore de trabalho costuma ter mudanças NÃO-relacionadas (SVGs/PNGs deletados em `public/`, docs soltos). **Stage só os arquivos da fatia G2** (`git add <paths explícitos>`), nunca `git add -A`.
- **Gate local = `npm run typecheck`** (roda no pre-commit do husky) + um **`scripts/g2-verify.ts`** no padrão do `g1-verify.ts` (tsx + `node:assert`, store in-memory). **jest NÃO roda local** (OneDrive errno -4094 — vários `node.exe` penduram, output vazio; mate e siga). Escreva o teste jest mesmo assim (gate de CI). Rode `node node_modules/prisma/build/index.js generate` se o tsc reclamar de campo de client (resolve drift).
- **Bugs recorrentes do Next 16:** rotas com `params: Promise<{...}>` + `await params`; auth é `auth.id` (NÃO `auth.userId`); `import { prisma } from '@/lib/prisma'`; Groq lazy init. (G2 provavelmente não toca rotas, mas fica o lembrete.)
- **Antes de codar:** confirme a abordagem em 1-2 frases (regra global #2) — em especial **como `apply_changes` se encaixa no fluxo de retry atual** (derivar vs. status novo) e **se `assign_owner` muda a atribuição-na-criação** (hoje `resolveAssignee` já dá worker a toda tarefa nova → `assign_owner` quase nunca dispara; decida se G2 só cobre o caso ou move a atribuição pro Lead). Não encadeie pro G3 sozinho.

---

## 5. Verificação (Definition of Done do G2)

1. `npm run typecheck` limpo (arquivos do G2 sem erro novo).
2. `scripts/g2-verify.ts` (tsx) provando a state-machine: sem dono → `assign_owner`/lead; `review` → `review`/reviewer; rejeitada+retry → `apply_changes`/dono; deps pendentes → `wait_dependency`/blocked; `todo`+deps prontas → `execute`/dono; `done`/`rejected`/sem-retry → terminal. **+ regressão: `g1-verify.ts` segue 16/16.**
3. Teste jest novo para `deriveTaskAction`/`buildAgenda` (roda no CI) + os testes G0/G1 continuam verdes.
4. **Regressão dura:** time `linear` idêntico (`runTeam` intacto) e time `graph` (com e sem deps) produz **estado terminal idêntico** ao do G1.
5. Commit (só arquivos da fatia, **sem migração**) + push na `main`. Mensagem EN, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
6. Atualizar `GRAFO-EXECUCAO.md` (marcar G2 ✅) e a nota de memória `project_polaris_teams`. **E2E autenticado em prod fica com o usuário** (gate real).

---

## 6. Prompt de partida sugerido (cole no chat novo)

> Leia `docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md` e `docs/Polaris Teams/Grafo/Sessão 3.md`. Vamos executar a fatia **G2 (agenda state-machine)** do programa Grafo, respeitando os invariantes (runTeam intacto, refactor agenda-driven com regressão dura via g1-verify, higiene de commit, 1 fatia/sessão, sem migração). Confirme a abordagem em 1-2 frases antes de codar — em especial como `apply_changes` se encaixa no retry atual e se `assign_owner` muda a atribuição-na-criação.
