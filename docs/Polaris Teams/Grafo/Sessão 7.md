# Grafo — Sessão 7 (kickoff): executar G6 (clarificação & escalação — `@CLARIFY` → estado de espera)

> Cole este arquivo como contexto inicial de um chat novo. Ele carrega o estado do programa "Grafo", os invariantes que NÃO podem ser quebrados, e a tarefa da sessão: a fatia **G6** — **roteamento dinâmico de dúvidas**: um Worker que não tem informação suficiente pede esclarecimento (`@CLARIFY`) em vez de adivinhar, a tarefa entra num estado de **espera**, e o **Lead responde** (escalação), liberando o Worker para re-executar com a resposta. É a última fatia do roadmap G0–G6.

**Projeto:** Polaris (sofia-next). Raiz: `C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (caminhos abaixo são relativos a ela). Deploy EasyPanel (Docker) em `polarisia.com.br`. Idioma de resposta: PT; código/commits em EN.

---

## 1. O que é o programa "Grafo"

Dar à orquestração de Teams da Polaris um **grafo de execução agêntica** como o do **Agent Teams AI** (`C:\dev\agent-teams-ai`), em vez do antigo fluxo **linear e fixo** (`runTeam`). Decisão do usuário: trazer **motor + visualização** como **modo "graph" OPT-IN** — o `runTeam` linear fica **INTACTO** e um executor irmão `runTeamGraph` roda quando o time usa `topology: 'graph'`. Roadmap completo (G0–G6) em **`docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md`** — **leia primeiro**. A nota de memória `project_polaris_teams` (auto-carregada) tem o histórico.

O Agent Teams AI combina **duas camadas**: (1) **motor "agenda engine"** (DAG + state-machine + agendas paralelas) e (2) **visualização ao vivo** (`packages/agent-graph`). **AMBAS estão feitas** (motor G1–G3, viz G4–G5). O G6 é a peça que faltava do **motor**: na state-machine do Agent Teams AI, `needsClarification: lead / user` é um **estado de primeira classe** — uma tarefa pode parar e pedir ajuda. O G6 traz isso pra Polaris como **`@CLARIFY` → estado de espera → Lead responde**, fechando o "roteamento dinâmico" (a 3ª robustez que o linear não tem, junto de DAG e paralelismo).

---

## 2. Estado atual (G0–G5 ✅ feitos e na `main`)

- **G0 (`905d8e6`)** — dispatch opt-in. `Team.config.topology: 'linear' | 'graph'` (JSON, sem migração, default `linear`). `team-executor.ts` despacha; 4 sites de invocação chamam o dispatcher.
- **G1 (`2802ddd`)** — DAG de dependências. `TeamTask.dependsOn String[]` (migração `20260617180000_add_team_task_depends_on` aplicada em prod). Protocolo `@TASK [after:#n]` (ids de exibição `#n=position+1`). `depsSatisfied(task, board)` puro em [team-board.ts](../../../src/lib/orchestration/team/team-board.ts).
- **G2 (`31b7568`)** — agenda state-machine. [team-graph-agenda.ts](../../../src/lib/orchestration/team/team-graph-agenda.ts) PURO: `deriveTaskAction(task, board)` → `{ nextAction, actionOwner }` (terminal-first) + `buildAgenda(board)`.
- **G3 (`d55dc0a`)** — agendas paralelas. `team-concurrency.ts` puro (`runWithConcurrency(items, cap, fn)`, teto `config.maxParallel`). Os dois `for` (EXECUTE + REVIEW) viraram fan-out. `runTeam` INTOCADO.
- **G4 (`886f4b0`)** — viz: nós de tarefa + arestas de dependência. SSE carrega `dependsOn`. Builder PURO [team-graph-view.ts](../../../src/lib/orchestration/team/team-graph-view.ts) (`buildTeamGraph(members, tasks, activeId) → {nodes, edges}`, só `import type` de `@xyflow/react`); [TeamGraph.tsx](../../../src/app/dashboard/teams/[id]/TeamGraph.tsx) é renderer fino. Board-driven; cor por status; badge `blocked` 🔒; chip 🛡 reviewer; arestas `owner→task` e `task→task`. `g4-verify.ts` (32 asserts).
- **G4.1 (`4a54b42`)** — toggle Linear/Grafo na UI. `team-config-ui.ts` PURO (`buildTeamConfig`/`topologyOf`/`maxParallelOf`); seletor de topologia + "Máx. paralelo" no `TeamFormModal` de [page.tsx](../../../src/app/dashboard/teams/page.tsx). `g4_1-verify.ts` (20 asserts).
- **G5 (`b01da24`)** — partículas de handoff + estado ao vivo. Pura viz (motor E SSE INTOCADOS). Builder ganhou **4º param OPCIONAL** `opts?: { handoff?, running? }` (assinatura posicional G4 preservada): a aresta member↔member que casa o handoff ganha `animated` + `HANDOFF_EDGE` (cyan `#22d3ee`); membro ativo ganha `data.thinking` + className `rf-thinking` quando `running`. [TeamRunView.tsx](../../../src/app/dashboard/teams/[id]/TeamRunView.tsx) deriva o handoff do último `message` (`kind ∈ {assignment, review}`) enquanto `running`. `g5-verify.ts` (18 asserts).

**🏁 Camada 2 (viz) completa. Motor = G1–G3.** É deste ponto que o G6 forka. **Nada do que o G6 precisa existe ainda:** o output do Worker hoje **não é parseado** (vira `result` direto → `review`/`done`, ver [team-graph-coordinator.ts:204-209](../../../src/lib/orchestration/team/team-graph-coordinator.ts#L204)); não há status `clarify`; não há diretiva do Lead para responder dúvida.

---

## 3. Tarefa desta sessão: G6 — clarificação & escalação (`@CLARIFY`)

**Objetivo:** um **Worker** que não tem informação essencial para executar responde **`@CLARIFY <pergunta>`** em vez de adivinhar; a tarefa entra em **espera** (`status: 'clarify'`, escalada ao **Lead**); o **Lead** responde com **`@CLARIFY [#n] <resposta>`** no turno de planejamento; a tarefa volta a `todo` com a resposta como contexto, e o Worker **re-executa** com ela. **Verificação-alvo:** numa run de grafo, um Worker que pede esclarecimento NÃO produz resultado (a tarefa não vai a review/done); ela aparece como "aguardando esclarecimento"; o Lead responde; o Worker re-executa e a run conclui.

### Escopo (faça só isto)

1. **Protocolo (PURO, [team-protocol.ts](../../../src/lib/orchestration/team/team-protocol.ts)) — 2 parsers, ambos aditivos:**
   - **`parseWorkerOutput(text)`** (NOVO) → `{ kind: 'result' } | { kind: 'clarify'; question: string }`. Detecta uma linha começando com `@CLARIFY` (espelhe `parseReviewVerdict`, que faz `text.match(/(?:^|\n)\s*@REJECT.../i)`). **Sem `@CLARIFY` → `{ kind: 'result' }`** (o caminho de hoje, inalterado). Só o `runTeamGraph` chama isso; o linear continua tratando `out.message` como result.
   - **`parseLeadActions`** estendido: reconhecer `@CLARIFY [#n] <resposta>` como uma ação `{ type: 'clarify', display: number, answer: string }`. O `#n` é o id de exibição do board (mesmo esquema do `[after:#n]`). Reuse `extractDirectives`/a leitura de `#\d+` que já existe.
2. **Tipos (aditivos, [team-types.ts](../../../src/lib/orchestration/team/team-types.ts)):**
   - `TaskStatus` += `'clarify'` (**SEM migração** — a coluna é `String @db.VarChar(20)`, ver §4; `'clarify'` cabe).
   - `TaskAction` += `'clarify'`.
   - `LeadAction` += a variante `{ type: 'clarify'; display: number; answer: string }`.
3. **Agenda (PURA, [team-graph-agenda.ts](../../../src/lib/orchestration/team/team-graph-agenda.ts)):** em `deriveTaskAction`, adicionar — logo após o branch de `review` — `if (task.status === 'clarify') return { nextAction: 'clarify', actionOwner: 'lead' }`. Status são mutuamente exclusivos, então isso NÃO afeta nenhum caso existente (nenhum teste G1–G5 produz status `clarify`). `clarify` é **não-terminal** (como `blocked`): `isBoardSettled` (só conta `done`/`rejected`) já mantém a run viva esperando — **não mexer em `isBoardSettled`**.
4. **Coordinator do grafo (SÓ [team-graph-coordinator.ts](../../../src/lib/orchestration/team/team-graph-coordinator.ts)):**
   - **EXECUTE:** depois do `chat(worker…)`, rode `parseWorkerOutput(out.message)`. Se `clarify`: `updateTask(t.id, { status: 'clarify' })` (NÃO setar `result`, NÃO ir a `review`), e `addMessage(worker→lead, kind:'message', summary: a pergunta)`. Se `result`: o caminho atual (status `review`/`done`, `result`, message). Retorne `{ kind: 'ok' }` nos dois.
   - **PLANNING:** tratar as ações `clarify` do Lead — resolver `#n`→id real (reuse o `displayToId` que já é montado), `updateTask(id, { status: 'todo', reviewNote: answer })`. Isso devolve a tarefa ao caminho de execução com a resposta como "feedback" (o EXECUTE já chama `buildTaskPrompt(t, t.reviewNote)`). **Não incremente `retryCount`** (não é rejeição).
5. **Prompts (PUROS, aditivos, [team-prompts.ts](../../../src/lib/orchestration/team/team-prompts.ts)):**
   - **`buildTaskPrompt`** — adicionar um **param opcional** `opts?: { allowClarify?: boolean }`. Só quando `allowClarify` é true, anexar: *"Se faltar informação ESSENCIAL e você não puder assumir com segurança, responda com `@CLARIFY <pergunta objetiva>` em vez de adivinhar."* **O `runTeamGraph` passa `{ allowClarify: true }`; o `runTeam` linear NÃO** (mantém a chamada `buildTaskPrompt(t, t.reviewNote)` byte-idêntica). ⚠️ Ver §4 — esse param é o que protege o linear.
   - **`buildLeadContext`/`buildBoardSnapshot`/`DIRECTIVE_CONTRACT`** — mostrar tarefas `[CLARIFY]` com a pergunta pendente (a última message da tarefa, ou o `body`) e adicionar ao contrato do Lead a diretiva `@CLARIFY [#n] resposta` (responder uma dúvida pendente). Aditivo — sem `clarify` no board, o snapshot é igual ao de hoje.
6. **Viz (OPCIONAL, aditivo — só se sobrar tempo, em [team-graph-view.ts](../../../src/lib/orchestration/team/team-graph-view.ts)):** cor/badge para `clarify` (ex.: índigo + `❓`) no `TASK_PALETTE`/`taskLabel`. Se fizer, **mantenha o `g4-verify` 32/32** (ele testa 6 cores distintas; uma 7ª cor `clarify` não conflita, mas confira). Se não fizer, a tarefa só não muda de cor no grafo — aceitável no v1.

### NÃO faça nesta fatia (deferido para um G6.1, se um dia)
- **Escalação ao USUÁRIO** (`needsClarification: user`) — exigiria pausar a run + input na UI + resume (novo `RunStatus` tipo `waiting_for_input`, novo endpoint). G6 escala **só ao Lead** (autônomo, sem human-in-the-loop). Decisão a confirmar (§4).
- **Handoff cross-team** (passar tarefa para outro time).
- Sem dependência nova. Sem schema/migração (ver §4). Não tocar `runTeam`/coordinator linear, nem o SSE a menos que prove que falta um campo (provavelmente NÃO falta: a UI já mostra `status` no kanban e o grafo já lê `status` — só não tem a cor de `clarify`; o stream já emite `board`/`message`).

---

## 4. Invariantes e gotchas que NÃO podem ser quebrados

- **`runTeam` linear INTACTO** (invariante de todo o programa). **A armadilha do G6:** `buildTaskPrompt` é **compartilhado** entre o linear e o grafo. Se você adicionar a instrução de `@CLARIFY` direto no corpo de `buildTaskPrompt`, o Worker do **linear** também será instruído a usar `@CLARIFY` — mas o `runTeam` **não parseia** o output do Worker, então o `@CLARIFY` viraria lixo no `result` = **REGRESSÃO do linear**. **Por isso `allowClarify` é param OPT-IN** que só o `runTeamGraph` passa (padrão idêntico ao 4º param opcional do G4/G5). Confirme que [team-coordinator.ts](../../../src/lib/orchestration/team/team-coordinator.ts) **continua chamando `buildTaskPrompt(t, t.reviewNote)` sem o 3º arg**.
- **SEM migração.** `TeamTask.status` é `String @db.VarChar(20)` ([prisma/schema.prisma](../../../prisma/schema.prisma):1304) — aceita `'clarify'` (7 chars) sem tocar o schema. A pergunta do Worker e a resposta do Lead reusam canais existentes: a pergunta vira **message** (`addMessage`); a resposta do Lead vira **`reviewNote`** (o mesmo canal de feedback que o `buildTaskPrompt` já injeta no re-run). **Nenhuma coluna nova.** Se você se pegar editando `schema.prisma` ou escrevendo uma migração, parou de fazer o G6 mínimo — reavalie.
- **Regressão dura G1–G5.** Adicionar `'clarify'` aos unions e o branch na agenda **não pode** mexer em nenhum caso existente (status são exclusivos). Uma run de grafo **sem** nenhum `@CLARIFY` deve se comportar **idêntica ao G5** — garanta que `parseWorkerOutput` num output normal retorna `{ kind: 'result' }` e o fluxo segue igual. Os verifies `g1`16/`g2`22/`g3`18/`g4`32/`g4_1`20/`g5`18 devem seguir **todos verdes**.
- **`reviewNote` reusado para a resposta:** o `buildTaskPrompt` rotula o feedback como *"⚠️ Correção solicitada pelo Reviewer"* — para uma resposta de clarificação esse rótulo fica impreciso. Aceitável no v1 (funciona), mas se quiser, generalize o rótulo (ex.: *"Contexto/correção solicitada"*) **sem** quebrar o caminho de review. Decisão menor.
- **Anti-loop:** um Worker poderia emitir `@CLARIFY` repetidamente. O teto `config.maxTurns` já limita (a run não trava infinito). Se quiser um limite mais explícito, um `config.clarifyCap` (JSON, **sem migração**, como `retryCap`/`maxParallel`) — opcional no v1.
- **Anti-stall:** se o Lead **nunca** responder uma `clarify` (ex.: ele também não sabe), a tarefa fica em `clarify` até `maxTurns` e a run fecha com resumo parcial (caminho de maxTurns já existe). Isso é o comportamento aceitável de v1 (escalação ao usuário = deferido).
- **jest NÃO roda local** (OneDrive errno -4094 — `node.exe` pendura, output vazio; mate e siga). Gate local = **`npm run typecheck`** (pre-commit do husky) + **`scripts/g6-verify.ts`** (tsx + `node:assert`) sobre os módulos puros + um E2E de coordinator com memory-store (o padrão dos `g1`/`g2`/`g3`-verify, que rodam `runTeamGraph` com um store fake). **Gate REAL = E2E autenticado no browser em prod** (com o usuário).
- **Higiene de commit:** a árvore costuma ter mudanças NÃO-relacionadas (SVGs/PNGs em `public/`, docs soltos `Sessão *.md`). **Stage só os arquivos da fatia G6** (`git add <paths explícitos>`), nunca `git add -A`.
- **Bugs recorrentes do Next 16** (params `Promise`+`await`, `auth.id` ≠ `auth.userId`): só importam se tocar rota — e o G6 provavelmente **não toca rota** (é motor + parsers + prompts). Não regrida nada.
- **Antes de codar:** confirme a abordagem em 1-2 frases (regra global #2) — em especial **(A) escalar só ao Lead (autônomo) vs também ao Usuário (pausa/resume)** → recomendação: **só Lead no G6**, usuário fica para G6.1; **(B) novo status `'clarify'` (migration-free, 1ª classe) vs derivar sem status** → recomendação: **novo status string** (a coluna é VarChar, não enum); **(C) resposta do Lead reusa `reviewNote` (sem coluna) vs campo novo** → recomendação: **reusar `reviewNote`**. Não encadeie nada além do G6 sozinho (regra #4).

---

## 5. Verificação (Definition of Done do G6)

1. `npm run typecheck` limpo (arquivos do G6 sem erro novo; o baseline pré-existente não conta — no G5 deu **0 erros**).
2. `scripts/g6-verify.ts` (tsx) provando, sobre os módulos PUROS + um E2E de coordinator com memory-store:
   - `parseWorkerOutput`: `@CLARIFY pergunta` → `{ kind:'clarify', question:'pergunta' }`; output normal → `{ kind:'result' }`; `@CLARIFY` no meio do texto detectado; sem `@CLARIFY` nunca vira clarify (regressão).
   - `parseLeadActions`: `@CLARIFY [#2] resposta` → `{ type:'clarify', display:2, answer:'resposta' }`; convive com `@TASK`/`@MESSAGE`/`@DONE`.
   - `deriveTaskAction`: status `clarify` → `{ nextAction:'clarify', actionOwner:'lead' }`; **todos os casos G2 seguem idênticos**.
   - `buildTaskPrompt` com `{ allowClarify:true }` contém a instrução de `@CLARIFY`; **sem o param (ou false) é byte-idêntico ao de hoje** (proteção do linear).
   - **E2E (memory-store):** Worker emite `@CLARIFY` → tarefa fica `clarify`, sem `result`, NÃO vai a review → Lead responde `@CLARIFY [#n]` → tarefa volta a `todo` com `reviewNote` = resposta → Worker re-executa (vê a resposta no prompt) → review/done → run `completed`.
3. **Sem regressão:** `g5-verify` 18/18, `g4` 32/32, `g4_1` 20/20, `g1` 16/16, `g2` 22/22, `g3` 18/18. Uma run de grafo sem `@CLARIFY` conclui igual ao G5; uma run linear conclui igual a antes.
4. Commit (só arquivos da fatia, **sem migração**) + push na `main`. Mensagem EN, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
5. Atualizar `GRAFO-EXECUCAO.md` (marcar G6 ✅ — e anotar que escalação-ao-usuário/cross-team ficou como G6.1 deferido) e a nota de memória `project_polaris_teams`. Com o G6, **o roadmap G0–G6 fecha**.
6. **E2E autenticado em prod (browser) fica com o usuário** (gate real): rodar um time `topology: 'graph'` com uma missão deliberadamente ambígua (ex.: "crie a landing page" sem dizer o produto) e confirmar ao vivo: o Worker pede esclarecimento (tarefa em espera), o Lead responde, o Worker re-executa, a run conclui.

---

## 6. Prompt de partida sugerido (cole no chat novo)

> Leia `docs/Polaris Teams/Grafo/GRAFO-EXECUCAO.md` e `docs/Polaris Teams/Grafo/Sessão 7.md`. Vamos executar a fatia **G6 (clarificação & escalação — `@CLARIFY`)** do programa Grafo, respeitando os invariantes (**`runTeam` linear INTACTO** — em especial `buildTaskPrompt` é compartilhado, então a instrução de `@CLARIFY` entra via param OPT-IN `allowClarify` que só o `runTeamGraph` passa; **sem migração** — `status` é VarChar, novo valor `'clarify'`, resposta do Lead reusa `reviewNote`; **sem dependência nova**; não quebrar os verifies `g1`–`g5`; higiene de commit; 1 fatia/sessão; escalação ao **usuário** e handoff cross-team ficam para G6.1 deferido). Confirme a abordagem em 1-2 frases antes de codar — em especial **(A) só Lead vs também Usuário**, **(B) novo status `clarify` vs derivar** e **(C) resposta via `reviewNote` vs campo novo**.
