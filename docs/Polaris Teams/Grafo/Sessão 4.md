# Grafo — Sessão 4 (kickoff): executar G3 (agendas paralelas)

> Cole este arquivo como contexto inicial de um chat novo. Ele carrega o estado do programa "Grafo", os invariantes que NÃO podem ser quebrados, e a tarefa da sessão: a fatia **G3**.

**Projeto:** Polaris (sofia-next). Raiz: `C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (caminhos abaixo são relativos a ela). Deploy EasyPanel (Docker) em `polarisia.com.br`. Idioma de resposta: PT; código/commits em EN.

---

## 1. O que é o programa "Grafo"

Dar à orquestração de Teams da Polaris um **grafo de execução agêntica** como o do **Agent Teams AI** (`C:\dev\agent-teams-ai`), em vez do atual fluxo **linear e fixo** (`runTeam`). Decisão do usuário: trazer **motor + visualização** como **modo "graph" OPT-IN** — o `runTeam` linear fica **INTACTO** e um executor irmão `runTeamGraph` roda quando o time usa `topology: 'graph'`. Roadmap completo (G0–G6) em **`docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md`** — **leia primeiro**. A nota de memória `project_polaris_teams` (auto-carregada) tem o histórico.

Referência de design do motor: `C:\dev\agent-teams-ai\agent-teams-controller\src\internal\agenda.js` (tarefas formam DAG; state-machine por-tarefa deriva `nextAction`/`actionOwner`; **os membros trabalham em agendas paralelas**). **G3 é exatamente o pedaço do PARALELISMO** — o DAG (G1) e a state-machine (G2) já existem. Não antecipe viz (G4+).

---

## 2. Estado atual (G0 + G1 + G2 ✅ feitos e na `main`)

- **G0 (commit `905d8e6`)** — seam de dispatch, zero mudança de comportamento. `Team.config.topology: 'linear' | 'graph'` (campo **JSON**, sem migração, default `linear`). `team-executor.ts` (`runTeamByTopology`/`pickTopology`/`resolveRunTopology`); os 4 sites de invocação chamam o dispatcher.
- **G1 (commit `2802ddd`)** — DAG de dependências. `TeamTask.dependsOn String[]` (migração `20260617180000_add_team_task_depends_on` aplicada em prod). Protocolo `@TASK [after:#n]`/`[after:#1,#3]` (order-independent), ids de exibição estáveis `#n=position+1`. `runTeamGraph` **forkou o loop do `runTeam`** (linear INTACTO): resolve `#n`→ids reais na criação; helper puro `depsSatisfied(task, board)` (em `team-board.ts`) gateia execução; `isBoardSettled` trata `blocked` como não-terminal.
- **G2 (commit `31b7568`)** — agenda state-machine. Novo `team-graph-agenda.ts` PURO: `deriveTaskAction(task, board)` → `{ nextAction, actionOwner }` (prioridade **terminal-first**: `done`/`rejected`→`terminal`; `review`→review/reviewer; deps não-`done`→`wait_dependency`/none→`blocked`; sem `assigneeId`→`assign_owner`/lead; `todo`+`reviewNote`+`retryCount>0`→`apply_changes`/owner; resto→`execute`/owner) + `buildAgenda(board)`. O loop do `runTeamGraph` passou a ser **agenda-driven**: 1 snapshot dirige PARK (`wait_dependency`→`blocked`) + EXECUTE (`execute`/`apply_changes`→worker), e REVIEW re-deriva de board fresco. `TaskAction`/`TaskActionOwner`/`AgendaItem` aditivos em `team-types.ts`. **Tudo ainda SEQUENCIAL** (`for` nos workers e no reviewer).

**É deste ponto que o G3 forka:** os `for` de EXECUTE e REVIEW no [team-graph-coordinator.ts](../../../src/lib/orchestration/team/team-graph-coordinator.ts) ainda rodam **uma tarefa por vez**; o G3 paraleliza com teto de concorrência.

---

## 3. Tarefa desta sessão: G3 — agendas paralelas

**Objetivo:** dentro de um turno, as tarefas do bucket `execute`/`apply_changes` rodam **concorrentes** (fan-out), com **teto `config.maxParallel`**, e o review roda concorrente nas tarefas `review`. O **fan-in de dependências já está garantido pela agenda**: só entram no bucket `runnable` as tarefas com deps satisfeitas (as dependentes ficam `blocked` e rodam num turno posterior), então as tarefas runnable de um mesmo turno são, por construção, **independentes entre si** — seguro paralelizar. **Verificação-alvo:** duas tarefas independentes rodam concorrentes (prova por latch/timing); com `maxParallel=1` serializam; dependentes serializam (turnos distintos); e **G1/G2 não regridem**.

**Escopo (faça só isto):**
1. **Helper puro de concorrência limitada** (novo módulo puro, sem I/O — testável por tsx + jest), ex. `runWithConcurrency(items, cap, fn)`: roda `fn` sobre `items` com no máximo `cap` em voo, preservando a coleta de resultados/erros. Mantém ordem de resultado por índice (não por término).
2. **`config.maxParallel` — JSON, SEM migração.** Adicionar ao tipo `LoadedRun.config` em [team-store.ts:16](../../../src/lib/orchestration/team/team-store.ts#L16) e ao default em `parseConfig` [team-store.ts:73](../../../src/lib/orchestration/team/team-store.ts#L73). **⚠️ Mantenha `maxParallel?` OPCIONAL no tipo** — os memory-stores dos testes (`g1-verify.ts`, `g2-verify.ts`, `helpers/memory-store.ts`) constroem `config` como `{ maxTurns, retryCap }` literal; se `maxParallel` virar obrigatório, o typecheck deles quebra (e a regra é **não tocar os testes de regressão**). O coordinator lê `config.maxParallel ?? <default>` (sugestão de default: `workers.length` ou um teto fixo pequeno, ex. 4 — **decida e justifique**).
3. **Refactor do loop (`team-graph-coordinator.ts`):** trocar os dois `for` (EXECUTE workers + REVIEW reviewer) pelo helper de concorrência. A **parte difícil é o handling de rate-limit / cancel / erro sob fan-out** — hoje cada iteração do `for` faz `finish(...)`/`return` no meio; com `Promise.all` não dá pra `return` de dentro do map. Decida o protocolo: coletar resultados/erros, e **depois** do fan-out decidir (ex.: se alguma tarefa acusou rate-limit → `finish('rate_limited')`; se cancelado → `finish('cancelled')`; senão re-throw o 1º erro). O resultado terminal com **≤1 tarefa runnable por turno (ou `maxParallel=1`) tem de ser idêntico ao G2** (regressão dura).

**NÃO faça nesta fatia:** nós de tarefa na viz / `TeamGraph.tsx` (=G4), partículas (=G5), `@CLARIFY`/escalação (=G6). **Não há schema/migração no G3** (`maxParallel` é config JSON, como `topology`).

---

## 4. Invariantes e gotchas que NÃO podem ser quebrados

- **`runTeam` (team-coordinator.ts) INTOCADO.** É a referência do modo linear e o invariante de todo o programa. O grafo evolui só no `team-graph-coordinator.ts` + o novo helper puro de concorrência.
- **Regressão é o teste mais importante do G3.** `scripts/g1-verify.ts` (16 asserts) + `scripts/g2-verify.ts` (22 asserts) + os testes jest (`team-graph-coordinator.test.ts`, `team-graph-agenda.test.ts`) **devem continuar passando sem alteração**. Os cenários existentes nunca têm 2 tarefas runnable no mesmo turno (B depende de A → A roda no turno 0, B no turno 1), então a ordem de `executed` continua determinística e `Promise.all` não a quebra. **Não edite os memory-stores dos testes** (por isso `maxParallel` opcional — ver §3.2).
- **Concorrência real, JS single-thread:** acumuladores compartilhados (`tokensUsed += ...`, `track`) são seguros entre `await`s; o que muda é a ORDEM de término. Cada tarefa atualiza **a própria row** no store (sem contenção de row). Garanta que a coleta de `usage`/artifacts não se perca no fan-out.
- **Sem migração nesta fatia.** Se você se pegar mexendo no `schema.prisma`, parou de fazer G3.
- **Higiene de commit:** a árvore costuma ter mudanças NÃO-relacionadas (SVGs/PNGs deletados em `public/`, docs soltos como `Sessão *.md`). **Stage só os arquivos da fatia G3** (`git add <paths explícitos>`), nunca `git add -A`.
- **Gate local = `npm run typecheck`** (roda no pre-commit do husky) + um **`scripts/g3-verify.ts`** no padrão do `g2-verify.ts` (tsx + `node:assert`, store in-memory). **jest NÃO roda local** (OneDrive errno -4094 — vários `node.exe` penduram, output vazio; mate e siga). Escreva o teste jest mesmo assim (gate de CI). Rode `node node_modules/prisma/build/index.js generate` se o tsc reclamar de campo de client.
- **Bugs recorrentes do Next 16:** rotas com `params: Promise<{...}>` + `await params`; `auth.id` (NÃO `auth.userId`); `import { prisma } from '@/lib/prisma'`; Groq lazy init. (G3 provavelmente não toca rotas.)
- **Antes de codar:** confirme a abordagem em 1-2 frases (regra global #2) — em especial **como tratar rate-limit / cancel / erro sob `Promise.all`** (a parte difícil) e **o default de `maxParallel`**. Não encadeie pro G4 sozinho.

---

## 5. Verificação (Definition of Done do G3)

1. `npm run typecheck` limpo (arquivos do G3 sem erro novo; memory-stores dos testes intocados ainda compilam → `maxParallel` opcional).
2. `scripts/g3-verify.ts` (tsx) provando: **duas tarefas independentes rodam concorrentes** (latch/barreira: ambas iniciam antes de qualquer uma terminar) · **`maxParallel=1` serializa** (no máx. 1 em voo) · **dependentes serializam** (fan-in, turnos distintos) · o helper `runWithConcurrency` respeita o teto. **+ regressão: `g1-verify.ts` 16/16 e `g2-verify.ts` 22/22.**
3. Teste jest novo para o helper de concorrência + `team-graph-coordinator` (roda no CI) + os testes G0/G1/G2 continuam verdes.
4. **Regressão dura:** time `linear` idêntico (`runTeam` intacto) e time `graph` (com e sem deps, `maxParallel` variado incluindo 1) produz **estado terminal idêntico** ao do G2.
5. Commit (só arquivos da fatia, **sem migração**) + push na `main`. Mensagem EN, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
6. Atualizar `GRAFO-EXECUCAO.md` (marcar G3 ✅) e a nota de memória `project_polaris_teams`. **E2E autenticado em prod fica com o usuário** (gate real: time `graph` com 2 tarefas independentes → confirmar que rodam concorrentes).

---

## 6. Prompt de partida sugerido (cole no chat novo)

> Leia `docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md` e `docs/Polaris Teams/Grafo/Sessão 4.md`. Vamos executar a fatia **G3 (agendas paralelas)** do programa Grafo, respeitando os invariantes (runTeam intacto, refactor com regressão dura via g1-verify 16/16 + g2-verify 22/22, higiene de commit, 1 fatia/sessão, sem migração). Confirme a abordagem em 1-2 frases antes de codar — em especial como tratar rate-limit/cancel/erro sob `Promise.all` e qual o default de `maxParallel`.
