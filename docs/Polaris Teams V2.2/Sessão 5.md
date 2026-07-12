# Polaris Teams V2.2 — Prompt inicial da Sessão 5

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S5 — vista "Visualizar" (item 5a): botão que abre uma vista grafo/canvas EXPANDIDA do time/run (`@xyflow/react`), com nós enriquecidos, reusando o que já existe no `TeamGraph.tsx` compacto da sidebar. Coordinator INTACTO, sem schema.**

---

## Contexto pra continuar (ciclo Polaris Teams V2.2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.2/`** → **`ROADMAP.md`** (executável; leia a fatia **S5**). Plano espelhado em `~/.claude/plans/c-users-jeanz-onedrive-desktop-roi-labs-buzzing-penguin.md`. Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**As 5 lacunas do ciclo (do usuário):** (1) modelos só iam até Opus 4.6, queria Opus 4.8; (2) efforts correspondendo exatamente ao que a Claude oferece; (3) system prompt do TIME (além do por-agente); (4) enviar mensagens DURANTE a execução; (5) **vista "Visualizar" (grafo) ← S5 (item 5a)** + suporte a imagens (S6 = item 5b).

**Sequência do ciclo:** **S1 ✅ → S2 ✅ → S3 ✅ → S4 ✅ → S5 🔜 → S6.**

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam**. S5 é puramente UI/leitura. `flow-canvas` e `output-webhooks` preservados.
2. **Migração só onde indicado** — a S5 é **sem migração / sem schema** (vista deriva do estado já no cliente). Se um dia precisar migrar: host real `sofia_db@2.24.207.200:5435`, `migrate deploy` MANUAL **antes** do push (o `.env` aponta pra OUTRO host; lição [[sofia_next_db_push_runner_fails]]).
3. **Script de verificação** `scripts/v22s5-verify.ts` — asserts puros (`node:assert`) sobre o **builder PURO** (`team-graph-view.ts`, a criar) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — o grafo compacto da sidebar (`TeamGraph.tsx`) continua funcionando idêntico; a vista expandida é ADITIVA (um botão/modal a mais).

### O que JÁ foi feito ✅ — NÃO refazer

- **S1 (commit `16bca9d`, main):** Opus 4.8/4.7 add ao caminho Claude Code CLI.
- **S2 (commit `b861938`, main):** efforts por modelo (helper PURO `model-efforts.ts` + dropdown derivado + `--effort` no CLI + clamp xhigh/max→high no OpenRouter).
- **S3 (commit `c2152af`, main):** system prompt do TIME (helper PURO `team-system-prompt.ts`, ordem agente→time→workflow, injeção via wrapper `chat` em `start-team-run.ts`, campo na UI). Coordinator INTACTO.
- **S4 (commit `8325850`, main):** mensagens DURANTE a execução. `MessageKind` ganhou `'user'` (sem migração — coluna `String`). Surfacing PURO `buildUserSteeringBlock` no `buildLeadContext` (bloco `## Mensagens do usuário durante a execução` ENTRE board e protocolo; `[]` se nenhuma → byte-idêntico). Rota `POST /api/teams/[id]/runs/[runId]/messages` (`kind:'user'`, guard `running|pending`, `from/toMemberId` null). Composer ao vivo no `TeamRunView` (só quando `running`) + render distinto no feed ("Você → Lead", emerald). SSE intocado. `scripts/v22s4-verify.ts` (a–c) + tsc 0. **E2E live pendente.** Detalhes em `ROADMAP.md` → "## S4".

---

## Foco desta sessão: S5 — vista "Visualizar" (grafo expandido) 🔜

**Objetivo:** hoje o `TeamRunView` mostra só um grafo COMPACTO na sidebar ("Topologia", via `TeamGraph.tsx` — `@xyflow/react`, client-only via `dynamic(ssr:false)`, recebe `members`/`tasks`/`activeId`/`handoff`/`running`). A S5 adiciona um **botão "Visualizar"** que abre uma **vista expandida** (modal/painel fullscreen) do mesmo grafo, com **nós enriquecidos** (ex.: status/owner/tokens por nó, tarefas como nós, dependências/relações como arestas). A sidebar compacta continua idêntica.

### Onde mexer (mapeado no ROADMAP — confirmar no código antes de codar)
- **Builder PURO novo** `src/lib/orchestration/team/team-graph-view.ts` — transforma `members + tasks + (usageByMember?) + relations` em `{ nodes, edges }` enriquecidos pro `@xyflow/react` (mesma lib já no projeto). Puro → testável no `v22s5-verify.ts` sem DOM.
- **UI** (`TeamRunView.tsx`): botão "Visualizar" (perto da "Topologia") → estado `graphOpen` → componente client-only `TeamGraphView` (dynamic, ssr:false) que consome o builder. Reusar `@xyflow/react`, `deriveTaskRelations` (já existe) e o estado já no cliente (`team`, `tasks`, `messages`, `usageByMember`) — **sem rota/query nova**.
- **`TeamGraph.tsx` (compacto) preservado** — a vista expandida é um componente novo OU o mesmo com prop `expanded`; decidir sem regredir o compacto.

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
1. **Conteúdo dos nós da vista expandida:** membros (roster) + handoff ativo, OU também as **tarefas como nós** (board completo com arestas de dependência/relação `dependsOn`/`related`)? (recomendado: time + tarefas, já que `deriveTaskRelations` e o board já estão no cliente).
2. **Forma da UI:** **modal fullscreen** sobreposto (recomendado — não empurra layout) ou painel expansível inline na página?
3. **Enriquecimento por nó:** quais campos mostrar (status, owner, retry, tokens por membro do `usageByMember`)? Confirmar o conjunto mínimo.

---

## ⚠️ Gotchas de ambiente desta máquina
- **Verificação confiável:** `npx tsx scripts/v22sN-verify.ts` (lógica pura) + `npx tsc --noEmit` (S1–S4 fecharam **0 erros**). **Não rode jest** (errno -4094, OneDrive).
- **Pre-commit hook:** typecheck (gate real — bloqueia) + eslint (informativo — NÃO bloqueia). `TeamRunView.tsx` já cospe 3 `no-explicit-any` **pré-existentes** (linhas ~299-300, casts `(team as any).config` da SP2) — o commit passa. **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, docs untracked de outras sessões — incl. as `Sessão N.md`, que NÃO são commitadas). **`git add` só nos arquivos da S5.**
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (fatia **S5**) + esta nota + a nota de memória `project_polaris_teams_v2_2`. **Confirmar comigo as decisões 1–3 ANTES de codar** (regra global #2).
2. Implementar S5: builder PURO `team-graph-view.ts` + botão "Visualizar" + vista expandida (`@xyflow/react`, client-only) reusando estado/relations já no cliente (**coordinator INTACTO; grafo compacto da sidebar intocado; sem rota/schema**).
3. `scripts/v22s5-verify.ts` + `npx tsc --noEmit` limpo. Sem migração.
4. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Marcar **S5 ✅** no `ROADMAP.md` e na nota de memória. **Parar na S5** (não emendar a S6). Abrir a `Sessão 6.md` apontando pro **S6** (imagens/visão — **tem migração manual no host**).

> Comece confirmando comigo as **decisões 1–3** e validando no código o `TeamGraph.tsx` atual (props, como é montado o grafo compacto) e se `@xyflow/react` já está nas deps — antes de escrever código.
