# Polaris Teams V2.1 — Prompt inicial da Sessão 7

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S3.2 — relations de task `blocks`/`related` (Sprint 3 · Tema F2). Esta fatia TEM schema → migração formal + manual no host real ANTES do push** (como a S3.1).

---

## Contexto pra continuar (ciclo Polaris Teams V2.1)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.1/`** → **`ROADMAP.md`** (executável; leia a **Sprint 3, fatia S3.2**, linhas 81-84) + `ANALISE-GAP-V2.1.md` (análise; tese central = **eixo-autonomia**). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅) → Sprint 2 (S2.1 ✅ → S2.2 ✅) → **Sprint 3 (S3.1 ✅ → S3.2 🔜 → S3.3)**.

**🏁 Sprint 1 + 🏁 Sprint 2 + 🏁 S3.1 COMPLETOS.** Agora o **Sprint 3** segue com a **S3.2**: enriquecer `TeamTask` com relações `blocks` (inverso de `dependsOn`) e `related` (cross-link livre), pra navegação entre tasks relacionadas no board. **Natureza: schema novo (2 colunas array) + plumbing no store + UI no board → TEM migração** (igual S3.1; diferente da S2.2 que era só UI). Item independente e barato; o coordinator/agenda do DAG segue **intacto** (só enriquece, não muda agendamento).

**Invariantes (valem pra toda fatia):**
1. **Coordinator + agenda do DAG INTACTOS** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)), `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) e `buildAgenda`/`deriveTaskAction` **não mudam de comportamento**. `blocks`/`related` são **metadados de exibição/navegação**, NÃO entram no gate de execução (só `dependsOn` gate, e ele não muda). Se `blocks` for derivado de `dependsOn` (inverso), é derivação read-side; se persistido, é coluna adicional que ninguém lê no agendamento.
2. **Migração formal + manual** — schema → `prisma migrate` formal **E** `migrate deploy` manual no host real `sofia_db@2.24.207.200:5435` **ANTES** do push (lição SP2/SP3/S2.1/S3.1: `db push` do standalone NÃO cria coluna em prod → client regenerado quebra as reads da tabela).
3. **Defaults preservam o legado** — colunas array com `@default([])`; task existente = `[]` = sem relações = board renderiza como hoje. Regressão sempre verificada.
4. **Verificação:** `scripts/v21s6-verify.ts` (asserts puros + `tsc` limpo, sem jest). O número `v21s6` é desta fatia.

### O que JÁ foi feito ✅ — Sprint 1 + Sprint 2 + S3.1 — NÃO refazer

- **S1.1 (commit `3e2f3ed`):** tool loop no path **Groq nativo** (helpers `buildAgentToolDefs`+`executeAgentToolCall` em [agent-tools.ts](../../src/lib/ai/agent-tools.ts)). `scripts/v21s1-verify.ts` (12 asserts).
- **S1.2 (commit `e37a4ef`):** tool loop no path **Ollama** ([groq.ts](../../src/lib/ai/groq.ts)). `scripts/v21s2-verify.ts` (15 asserts).
- **S1.3 (commit `565d4c8`):** `CapabilityPolicy` → **flags do Claude CLI**. Helper PURO [cli-tool-flags.ts](../../src/lib/ai/cli-tool-flags.ts). `scripts/v21s3-verify.ts` (6 casos).
- **S2.1 (commit `3d4a55a`):** persistência da timeline por task. Coluna `TeamTask.historyEvents Json?`. Helper PURO [task-history.ts](../../src/lib/orchestration/team/task-history.ts). `scripts/v21s4-verify.ts`.
- **S2.2 (commit `6e23fce`):** timeline na UI (card expandível inline no kanban). Helper PURO [task-event-view.ts](../../src/lib/orchestration/team/task-event-view.ts). Rota SSE re-emite o board quando `historyEvents.length` muda (timeline ao vivo). Sem schema.
- **S3.1 (commit `021c713`, 2026-06-19) — ✅ WORKFLOW POR MEMBRO (Tema F1):**
  - **Schema:** `TeamMember.workflow String? @db.Text` (migração `20260619140000_add_team_member_workflow` **aplicada manual em prod** no host `2.24.207.200:5435` ANTES do push; coluna confirmada em `information_schema` = `text`, nullable).
  - **Data-flow espelha `capabilities` 1:1:** `TeamMember.workflow` → `MemberCtx.workflow` ([team-types.ts](../../src/lib/orchestration/team/team-types.ts)) → `loadRun` ([team-store.ts](../../src/lib/orchestration/team/team-store.ts) `members.map`) → `ChatOptions.workflow` (+ tipo inline em [groq.ts](../../src/lib/ai/groq.ts) `chatWithAgent`) → **8 call-sites do coordinator** (4 linear [team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts) + 4 grafo [team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts), cada um `workflow: <membro>.workflow`) → **helper PURO** [member-workflow.ts](../../src/lib/orchestration/team/member-workflow.ts) `appendMemberWorkflow(systemPrompt, workflow)` consumido em `chatWithAgent` logo após `let systemPrompt = agent.systemPrompt`. **Coordinator INTACTO** (injeção no 4º arg). **Code-runs carregam de graça** via o spread `{ ...chatOptions }` no [code-agent.ts](../../src/lib/orchestration/team/code-agent.ts) (caveat: o path **CLI-nativo-no-sandbox** monta o próprio prompt e NÃO injeta workflow — limitação aceita, fora de escopo).
  - **UI entregue nesta fatia (decisão de UX confirmada com o usuário):** textarea **"Workflow neste time"** por membro em [RosterEditor.tsx](../../src/app/dashboard/teams/RosterEditor.tsx) → `roster-mapping` ([roster-mapping.ts](../../src/app/dashboard/teams/roster-mapping.ts) `RosterRow.workflow`/`RosterMemberPayload.workflow`/`rosterToMembers`, emite só quando não-vazio/trimado) → persistido por `POST/PATCH /api/teams` ([create-team.ts](../../src/lib/orchestration/team/create-team.ts) + [route.ts](../../src/app/api/teams/[id]/route.ts) `createMany`) → validado em `teamMemberSchema` ([validation.ts](../../src/lib/validation.ts)) → hidratado no editar ([page.tsx](../../src/app/dashboard/teams/page.tsx) `openEdit`).
  - **Regressão:** workflow ausente/vazio/whitespace → `appendMemberWorkflow` retorna o prompt **byte-idêntico**. `scripts/v21s5-verify.ts` (4 casos: concat / regressão / roundtrip de tipos / serialização front-end) + `tsc --noEmit` **0 erros**. v21s1-s4 inalterados.
- **Pendente das S1.x/S2.x/S3.1 (com o usuário):** **E2E autenticado em prod** — incl. (S3.1) criar/editar membro com `workflow`, rodar o time e confirmar que a instrução afeta o comportamento daquele membro; membro sem workflow = idêntico ao atual. (Junto: E2E do Sprint 2 = timeline por task no card expandido.) **Não bloqueia a S3.2.**

---

## O que é a S3.2 (o mapa exato — leia antes de codar)

**Objetivo:** dar a cada `TeamTask` duas listas de relações pra navegação no board: `blocks` (tasks que ESTA bloqueia = inverso de `dependsOn`) e `related` (cross-link livre, sem semântica de agendamento). **Não muda o DAG/agenda** — é enriquecimento de exibição. Vazio = board como hoje.

**Como `dependsOn` (G1) já flui hoje (= o caminho que `blocks`/`related` seguem):**
1. **Schema:** [schema.prisma](../../prisma/schema.prisma) `model TeamTask` (linha 1309) tem `dependsOn String[] @default([]) @map("depends_on")` (**linha 1320**). → **Adicionar `blocks String[] @default([]) @map("blocks")` e `related String[] @default([]) @map("related")`** ali do lado.
2. **Tipo runtime da task:** [team-types.ts](../../src/lib/orchestration/team/team-types.ts) `interface TaskRow` (linha ~50, tem `dependsOn: string[]` na linha ~63). → **Adicionar `blocks: string[]` e `related: string[]`**.
3. **Store:** [team-store.ts](../../src/lib/orchestration/team/team-store.ts) — `listTasks` (`rows.map`, linha ~189) e `createTask` (linha ~225) mapeiam `dependsOn: t.dependsOn`. → **Mapear `blocks`/`related` nos dois retornos** (e em `CreateTaskInput` se quiser permitir criar já com relações; default `[]`). **Decisão de design (confirmar):** `blocks` **derivado** de `dependsOn` (read-side: A.blocks = ids das tasks cujo `dependsOn` inclui A) **ou persistido** como coluna própria. O ROADMAP (linha 83) diz "derivável ou persistido" — **derivar é mais barato e não pode dessincronizar**, mas exige varrer o board no read. Persistir é simétrico mas precisa escrever nos dois lados. **Levar a decisão ao usuário** (regra global #2).
4. **UI:** [TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx) — no card da task, mostrar chips/links pras tasks de `blocks`/`related`/`dependsOn` (navegação: clicar rola/destaca a task alvo). **Confirmar com o usuário** o escopo de UX (só exibir vs navegar/scrollar).
5. **Agenda/DAG INTACTOS:** `buildAgenda`/`deriveTaskAction` (em [team-agenda.ts](../../src/lib/orchestration/team/team-agenda.ts) ou no grafo) leem **só `dependsOn`** pro gate `wait_dependency`. **NÃO** acrescentar `blocks`/`related` a nenhuma decisão de execução. Regressão: time em modo grafo agenda idêntico ao atual.

**Verificação `scripts/v21s6-verify.ts`:** (a) `blocks`/`related` persistem/derivam e aparecem no `TaskRow`; (b) task sem relações = `[]` = render legado (regressão); (c) se `blocks` for derivado, asserir que o inverso de um conjunto de `dependsOn` está correto (helper puro); (d) agenda/DAG inalterados (nenhuma relação nova entra no gate). `tsc --noEmit` limpo.

---

## ⚠️ Migração (esta fatia TEM — leia com atenção)
- **Schema:** `TeamTask.blocks String[] @default([])` + `TeamTask.related String[] @default([])` (Postgres `text[]`; default `'{}'` → tasks existentes = vazio = legado). **Se decidir derivar `blocks`, NÃO crie a coluna `blocks`** — só `related` precisa de coluna (ajuste a migração conforme a decisão #3).
- **Migração formal:** ex.: `20260619150000_add_team_task_relations`. Escreva o SQL `ALTER TABLE team_tasks ADD COLUMN ... TEXT[] NOT NULL DEFAULT '{}'` à mão (o `migrate dev` quer conectar no host errado do `.env`).
- **Aplicar MANUAL no host real ANTES do push** (receita exata que funcionou na S3.1):
  ```
  DATABASE_URL='postgresql://sofia_db:PAzo18**@2.24.207.200:5435/sofia_db' npx prisma migrate status   # confirma 1 pendente
  DATABASE_URL='postgresql://sofia_db:PAzo18**@2.24.207.200:5435/sofia_db' npx prisma migrate deploy
  ```
  O `.env` aponta pra **OUTRO** host (`bot@31.97.23.166:5499/bot`) — o inline sobrepõe (Prisma não sobrescreve env já setado). **Confirme a coluna em `information_schema.columns`** + um `teamTask.count()` com o client regenerado ANTES do `git push`. **Rode `npx prisma generate` localmente** depois de editar o schema, senão o `tsc` não enxerga as colunas novas.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (em `secrets_to_rotate.md`).

## ⚠️ Gotchas de ambiente desta máquina (valeram nas S1.x/S2.x/S3.1)
- **Verificação confiável:** `npx tsx scripts/v21s6-verify.ts` (lógica pura) + `npx tsc --noEmit`. **Não rode jest** (`UNKNOWN read`/errno -4094 = corrupção de `node_modules` pelo OneDrive).
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. groq.ts tem ~34 `no-explicit-any`/`prefer-const` **pré-existentes** (linhas 720-893, do tool-loop) que o hook lista mas NÃO bloqueia — **ignorar, não consertar de passagem**.
- **Commit SELETIVO:** a árvore tem coisa não relacionada (logos deletados `public/logo*.svg`, vários `docs/**` untracked). **`git add` só nos arquivos da S3.2** (schema + migração + team-types + team-store + TeamRunView + helper de derivação + `v21s6-verify.ts`).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 3, fatia **S3.2**, linhas 81-84) + esta nota + os anchors acima. **Decisões de UX/design → confirmar comigo** (regra global #2) **antes de codar**: (a) `blocks` **derivado vs persistido**; (b) escopo da navegação no board (só exibir relações vs clicar-e-rolar).
2. Rodar `npx tsx scripts/v21s5-verify.ts` (e v21s1-s4) pra confirmar baseline verde.
3. Executar o data-flow `schema → TaskRow → store → UI do board`, com **agenda/DAG INTACTOS** (nenhuma relação nova no gate de execução). Vazio = board legado.
4. **Migração formal + `migrate deploy` MANUAL no host real `2.24.207.200:5435` ANTES do push** (confirmar coluna em prod + `prisma generate` local). `npx tsc --noEmit` limpo + `scripts/v21s6-verify.ts` verde.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S3.2** (não emendar a S3.3). Abrir a `Sessão 8.md` apontando pro **S3.3** (advisory por membro `quota_exhausted`/`rate_limited`/`provider_overloaded` — **SÓ UI, sem schema/migração**: surface do erro que o `chat()` já levanta, chip no painel por membro do V2 S2; `v21s7`-verify ou E2E manual).
6. **E2E manual (com o usuário):** rodar um time grafo com dependências, abrir uma task e confirmar que `blocks`/`related`/`dependsOn` aparecem e navegam; task sem relações = board idêntico ao atual. (Junto, se ainda não feito, fechar o **E2E da S3.1** = workflow por membro afetando o comportamento, e o **E2E do Sprint 2** = timeline por task.)

> Comece confirmando comigo as **decisões de design da S3.2 (`blocks` derivado ou persistido? escopo da navegação no board?)** — antes de escrever código. E lembre: **esta fatia tem migração → host real `2.24.207.200:5435` ANTES do push.**
