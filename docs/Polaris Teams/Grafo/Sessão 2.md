# Grafo — Sessão 2 (kickoff): executar G1 (DAG de dependências)

> Cole este arquivo como contexto inicial de um chat novo. Ele carrega o estado do programa "Grafo", os invariantes que NÃO podem ser quebrados, e a tarefa da sessão: a fatia **G1**.

**Projeto:** Polaris (sofia-next). Raiz: `C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (caminhos abaixo são relativos a ela). Deploy EasyPanel (Docker) em `polarisia.com.br`. Idioma de resposta: PT; código/commits em EN.

---

## 1. O que é o programa "Grafo"

Dar à orquestração de Teams da Polaris um **grafo de execução agêntica** como o do **Agent Teams AI** (`C:\dev\agent-teams-ai`), em vez do atual fluxo **linear e fixo** (`runTeam`: planning → execution `for` sequencial → review → settle).

Decisão do usuário: trazer **motor + visualização**, como **modo "graph" OPT-IN** — o `runTeam` linear fica **INTACTO** e um executor irmão `runTeamGraph` roda quando o time usa `topology: 'graph'`. Roadmap completo (G0–G6) em **`docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md`** — **leia primeiro**. A nota de memória `project_polaris_teams` (auto-carregada) tem o histórico.

Referência de design do motor robusto: `C:\dev\agent-teams-ai\agent-teams-controller\src\internal\agenda.js` (tarefas formam DAG via `blockedBy`/`blocks`; state-machine por-tarefa). **G1 só precisa do pedaço de DEPENDÊNCIAS** — a state-machine completa é o G2, o paralelismo é o G3. Não antecipe.

---

## 2. Estado atual (G0 — ✅ feito e na `main`, commit `905d8e6`)

G0 instalou o **seam de dispatch**, com **zero mudança de comportamento**:

- `Team.config.topology: 'linear' | 'graph'` — campo **JSON** (sem migração), default `linear`.
- `src/lib/orchestration/team/team-executor.ts` — `runTeamByTopology(runId, deps)` (dispatcher) + `pickTopology(config)` (puro) + `resolveRunTopology(runId)`.
- `src/lib/orchestration/team/team-graph-coordinator.ts` — `runTeamGraph` **delega ao `runTeam`** (paridade byte-a-byte).
- Os 4 sites de invocação (`start-team-run.ts` chat-`after()` + `runTeamAndWait`; `worker/index.ts` repo + C0) já chamam `runTeamByTopology`.
- Teste `src/__tests__/lib/team/team-graph-coordinator.test.ts` (paridade + `pickTopology`).

**É deste ponto que o G1 forka:** `runTeamGraph` deixa de só delegar e passa a ter o próprio loop com gating por dependência.

---

## 3. Tarefa desta sessão: G1 — DAG de dependências

**Objetivo:** uma tarefa pode declarar dependências; `runTeamGraph` só executa uma tarefa quando todas as suas dependências estão `done`. **Verificação-alvo:** se B depende de A, A roda antes e B **nunca** roda primeiro.

**Escopo (faça só isto):**
1. **Schema** (`prisma/schema.prisma`): `TeamTask.dependsOn String[] @default([])` (lista de IDs de tarefa). Aditivo, nullable-safe.
2. **Store** (`team-store.ts`): persistir/ler `dependsOn` (`CreateTaskInput.dependsOn?`, `TaskRow.dependsOn`); atualizar o tipo `TaskRow` em `team-types.ts`; atualizar o store em memória de teste `src/__tests__/lib/team/helpers/memory-store.ts`.
3. **Protocolo** (`team-protocol.ts`): `parseLeadActions` entende `@TASK [worker:X] [after:#2] Título` e `[after:#1,#3]` → `LeadAction.dependsOn?: number[]` (índices de exibição).
4. **Prompts** (`team-prompts.ts`): `buildLeadContext` numera cada tarefa do board com um **id de exibição estável `#n`** (use `position+1`) e documenta a sintaxe `[after:#n]` nas instruções do Lead.
5. **Executor** (`team-graph-coordinator.ts`): forke o loop do `runTeam` (copie como base — o `runTeam` linear continua INTACTO no arquivo dele) e adicione: ao criar tarefa, resolva os índices `#n` → IDs reais; na fase de execução, só rode tarefas `todo` cujas deps estejam todas `done` (as demais ficam `todo`/`blocked` e são pegas num turno seguinte); o settle não pode declarar a run "concluída" enquanto houver tarefa bloqueada pendente.

**NÃO faça nesta fatia:** state-machine de roteamento `deriveTaskAction` (=G2), `Promise.all`/paralelismo (=G3), nós de tarefa na viz (=G4). Mantenha o `runTeamGraph` ainda sequencial; só adicione o **gating por dependência**.

---

## 4. Invariantes e gotchas que NÃO podem ser quebrados

- **`runTeam` (team-coordinator.ts) INTOCADO.** É a referência de comportamento do modo linear e o invariante de todo o programa. O grafo evolui só no `team-graph-coordinator.ts`.
- **Migração = formal + MANUAL no host de prod ANTES do push.** O standalone do Next **não** aplica `db push`/migração no deploy (lição `sofia_next_db_push_runner_fails`: a coluna nunca é criada → reads 500). Rode `prisma migrate dev` p/ gerar a migration, depois aplique em prod com **`node node_modules/prisma/build/index.js migrate deploy`** (npx dá "prisma não reconhecido"; o módulo `pg` **trava** nesta máquina por corrupção do OneDrive — use o **binário do Prisma**, não scripts com `pg`). **Host de prod dos Teams = `sofia_db@2.24.207.200:5435`** (⚠️ o `.env`/CLAUDE.md citam `bot@31.97.23.166:5499`, que dá timeout — **confirme com o usuário qual é o de produção antes de aplicar**). Aplique a migração **antes** de `git push`.
- **Higiene de commit:** a árvore de trabalho costuma ter mudanças NÃO-relacionadas (SVGs deletados em `public/`, docs soltos). **Stage só os arquivos da fatia G1** (`git add <paths explícitos>`), nunca `git add -A`.
- **Gate local = `npm run typecheck`** (roda no pre-commit do husky). **jest NÃO roda local** (OneDrive errno -4094) → escreva o teste jest mesmo assim (gate de CI) e confie nele + no typecheck. Há erros de baseline pré-existentes no `tsc` (bullmq/e2b/@xterm/Prisma-drift) que somem no EasyPanel — ignore-os; garanta só que os **arquivos do G1** estão limpos.
- **Bugs recorrentes do Next 16:** rotas com `params: Promise<{...}>` + `await params`; auth é `auth.id` (NÃO `auth.userId`); `import { prisma } from '@/lib/prisma'` (nunca `new PrismaClient()`); Groq lazy init.
- **Antes de codar:** confirme a abordagem em 1-2 frases (regra global #2). O programa usa **1 fatia por sessão** com spec+plano por fatia (`docs/superpowers/specs/` e `/plans/`) — siga o hábito se quiser, mas não encadeie pro G2 sozinho.

---

## 5. Verificação (Definition of Done do G1)

1. `npm run typecheck` limpo (arquivos do G1 sem erro novo).
2. Teste jest (em `team-graph-coordinator.test.ts` ou novo) provando: **B depende de A ⇒ A roda antes de B**; tarefa com dep pendente fica bloqueada e roda só quando a dep conclui; parse de `[after:#n]` no protocolo. (Roda no CI.)
3. Migração formal criada **e aplicada manual** no host de prod confirmado, ANTES do push; confirmar a coluna `depends_on` no DB real.
4. **Regressão:** time `linear` continua idêntico (`runTeam` intacto) e time `graph` SEM dependências também roda como antes.
5. Commit (só arquivos da fatia) + push na `main`. Mensagem EN, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
6. Atualizar `GRAFO-EXECUCAO.md` (marcar G1 ✅) e a nota de memória `project_polaris_teams`. **E2E autenticado em prod fica com o usuário** (gate real).

---

## 6. Prompt de partida sugerido (cole no chat novo)

> Leia `docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md` e `docs/Polaris Teams/Grafo/Sessão 2.md`. Vamos executar a fatia **G1 (DAG de dependências)** do programa Grafo, respeitando os invariantes (runTeam intacto, migração manual no host de prod antes do push, higiene de commit, 1 fatia/sessão). Confirme a abordagem em 1-2 frases antes de codar.
