# Polaris Teams V2.1 — Prompt inicial da Sessão 6

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S3.1 — `workflow` por membro (Sprint 3 · Tema F1). Esta fatia VOLTA A TER schema → migração formal + manual no host real ANTES do push.**

---

## Contexto pra continuar (ciclo Polaris Teams V2.1)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.1/`** → **`ROADMAP.md`** (executável; leia a **Sprint 3, fatia S3.1**, linhas 76-79) + `ANALISE-GAP-V2.1.md` (análise; tese central = **eixo-autonomia**). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅) → Sprint 2 (S2.1 ✅ → S2.2 ✅) → **Sprint 3 (S3.1 🔜 → S3.2 → S3.3)**.

**🏁 Sprint 1 + 🏁 Sprint 2 COMPLETOS.** Agora o **Sprint 3** abre com a **S3.1**: instrução `workflow` custom por membro-neste-time, concatenada ao system prompt. **Natureza: schema novo (1 coluna nullable) + plumbing por injeção → TEM migração** (diferente da S2.2, que era só UI). Item independente e barato; o coordinator segue **intacto**.

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam de comportamento**. Extensões entram pelo **4º arg (options) do `ChatFn`** — exatamente o padrão de `model`/`effort`/`capabilities` (V2 S1) e `taskId` (C2.1). Adicionar `workflow: <membro>.workflow` aos call-sites é **a injeção sancionada**, não mudança de lógica.
2. **Migração formal + manual** — toda mudança de schema → `prisma migrate` formal **E** `migrate deploy` manual no host real `sofia_db@2.24.207.200:5435` **ANTES** do push (lição SP2/SP3 + S2.1: `db push` do standalone NÃO cria coluna em prod → client regenerado quebra as reads da tabela).
3. **Defaults preservam o legado** — `workflow` ausente/nulo → system prompt = **só** o do `Agent` (byte-idêntico ao atual). Regressão sempre verificada.
4. **Verificação:** `scripts/v21s5-verify.ts` (asserts puros + `tsc` limpo, sem jest). O número `v21s5` estava **reservado pra esta fatia** desde a S2.2 — agora é seu.

### O que JÁ foi feito ✅ — Sprint 1 + Sprint 2 — NÃO refazer

- **S1.1 (commit `3e2f3ed`):** tool loop no path **Groq nativo** (helpers `buildAgentToolDefs`+`executeAgentToolCall` em [agent-tools.ts](../../src/lib/ai/agent-tools.ts)). `scripts/v21s1-verify.ts` (12 asserts).
- **S1.2 (commit `e37a4ef`):** tool loop no path **Ollama** ([groq.ts](../../src/lib/ai/groq.ts)). `scripts/v21s2-verify.ts` (15 asserts).
- **S1.3 (commit `565d4c8`):** `CapabilityPolicy` → **flags do Claude CLI**. Helper PURO [cli-tool-flags.ts](../../src/lib/ai/cli-tool-flags.ts). Chat-run host = read-only + `--permission-mode plan`; code-run E2B = escrita preservada, honra `mcpAllowlist`. `scripts/v21s3-verify.ts` (6 casos).
- **S2.1 (commit `3d4a55a`):** persistência da timeline por task. Coluna `TeamTask.historyEvents Json?` (migração `20260619120000_add_team_task_history` **já aplicada em prod**). Helper PURO [task-history.ts](../../src/lib/orchestration/team/task-history.ts) (`taskEventFromUpdate`/`appendTaskEvent`/`taskCreatedEvent`; evento nulo p/ não-transição). Plumbing **store-level** ([team-store.ts](../../src/lib/orchestration/team/team-store.ts)), coordinator intacto. `scripts/v21s4-verify.ts`.
- **S2.2 (commit `6e23fce`, 2026-06-19) — ✅ TIMELINE NA UI (fechou o Sprint 2):**
  - **Rota SSE** ([stream/route.ts](../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts)): `historyEvents: true` no `select` das tasks + emitido no payload do `board`; **sig de mudança agora inclui `historyEvents.length`** (timeline **ao vivo** — um `owner_changed` que não mexe status/retry re-emite o board mesmo assim).
  - **Helper PURO** [task-event-view.ts](../../src/lib/orchestration/team/task-event-view.ts): `taskEventView(event) → {label, tone, iconKey}` + `taskStatusLabel(status)` (read-side; `event.type → label/ícone`). Testado por `scripts/v21s4-verify.ts` **caso (f)** (agora 6 asserts; **NÃO criei `v21s5`** — fica pra esta sessão).
  - **UI** ([TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx)): **card expandível inline** no kanban (decisão de UX confirmada com o usuário) — botão "Histórico (n)" → `<ol>` com ator + transição + hora, em ordem. `EVENT_ICON` mapeia `iconKey`→lucide; `actorName` resolve membro/sentinela `lead`/`reviewer`. Task **sem eventos = card não-interativo (degrada como antes, sem crash)**.
  - Sem schema/migração (coluna já existia). `tsc --noEmit` **0 erros**. Coordinator + store de escrita **INTACTOS** (S2.2 só lê).
- **Pendente das S1.x/S2.x (com o usuário):** **E2E autenticado em prod**, incl. o **E2E do Sprint 2** (rodar um time real, abrir uma task, confirmar `task_created`/atribuição/`status_changed`/review na ordem certa no card expandido). **Não bloqueia a S3.1.**

---

## O que é a S3.1 (o mapa exato — leia antes de codar)

**Objetivo:** dar a cada membro-de-um-time uma **instrução de workflow custom** que é concatenada ao system prompt do `Agent` só naquele time, sem tocar o `Agent` global. Ausente = comportamento atual.

**Como `model`/`effort`/`capabilities` já fluem hoje (= o caminho que `workflow` segue):**
1. **Schema:** [schema.prisma](../../prisma/schema.prisma) `model TeamMember` (linha 1239) tem `model`/`effort`/`capabilities` (linhas 1244-1248). → **Adicionar `workflow String?` ali** (junto de `capabilities`).
2. **Tipo runtime do membro:** [team-types.ts](../../src/lib/orchestration/team/team-types.ts) — a interface do membro (linhas ~40-47, com `model`/`effort`/`capabilities?`). → **Adicionar `workflow?: string | null`**.
3. **Loader do run:** onde o membro runtime é montado a partir do Prisma (rastreie por `capabilities:` no `select`/`map` do carregamento dos membros — provavelmente em [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts) e/ou [team-store.ts](../../src/lib/orchestration/team/team-store.ts)). → **Selecionar + mapear `workflow`** no mesmo ponto.
4. **`ChatOptions`:** [team-types.ts](../../src/lib/orchestration/team/team-types.ts) `interface ChatOptions` (linha ~170, tem `model`/`effort`/`capabilities`) **e** o tipo inline das `options` em [groq.ts:115](../../src/lib/ai/groq.ts#L115). → **Adicionar `workflow?: string | null` nos dois**.
5. **Call-sites do coordinator** ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts) linhas **69, 122, 156, 190** — lead/worker/reviewer/consolidação): hoje passam `{ model, effort, capabilities, memberId, runId, ... }`. → **Acrescentar `workflow: <membro>.workflow`** (injeção; mesma natureza do `capabilities` que o V2 já adicionou aqui). Confira o grafo também ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) se ele montar options próprias.
6. **Consumo:** em `chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)) o system prompt nasce em **`let systemPrompt = agent.systemPrompt`** (linha ~150) e é aumentado (memória, contexto do lead, plugins, skills, time, conhecimento). → **Concatenar o `workflow`** logo após a base (ex.: bloco `\n\n## Workflow deste time\n${workflow}`). **Extraia a concatenação num helper PURO** (ex.: `appendMemberWorkflow(systemPrompt, workflow)`) pra `v21s5` testar sem jest — `workflow` vazio/nulo retorna o prompt intocado.
7. **UI (decidir com o usuário):** a S3.1 do ROADMAP foca o data-flow (schema→opts→prompt) e não exige UI; mas pra ser usável de fato falta um campo de edição de `workflow` por membro no editor do time. **Confirmar com o usuário se a UI entra nesta fatia** ou fica como follow-up (a coluna e o plumbing já valem por si no E2E via seed/SQL).

**Verificação `scripts/v21s5-verify.ts`** (padrão `task-history.ts`/`task-event-view.ts`): (a) `workflow` presente → aparece concatenado no prompt resultante (via o helper puro); (b) `workflow` nulo/vazio → prompt **byte-idêntico** ao `agent.systemPrompt` base (regressão); (c) se possível, asserir que o membro carrega o campo do tipo runtime. `tsc --noEmit` limpo.

---

## ⚠️ Migração (esta fatia TEM — leia com atenção)
- **Schema:** `TeamMember.workflow String?` (nullable; sem default → membros existentes = `null` = legado). Crie a migração formal (ex.: `20260619140000_add_team_member_workflow`) com `prisma migrate dev --create-only` (ou escreva o SQL `ALTER TABLE team_members ADD COLUMN workflow ...` à mão se o `migrate dev` quiser conectar no host errado).
- **Aplicar MANUAL no host real ANTES do push:** `DATABASE_URL='postgresql://sofia_db:<senha>@2.24.207.200:5435/<db>' npx prisma migrate deploy` (inline). O `.env` aponta pra **OUTRO** host (`bot@31.97.23.166:5499`) — **não usar pra migração**. Senha da família `PAzo18**` (no `.env`, reusável pro user `sofia_db`). **Confirme a coluna existir em prod** (`information_schema.columns`) antes do `git push`.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (em `secrets_to_rotate.md`).

## ⚠️ Gotchas de ambiente desta máquina (valeram nas S1.x/S2.x)
- **Verificação confiável:** `npx tsx scripts/v21s5-verify.ts` (lógica pura) + `npx tsc --noEmit`. **Não rode jest** (`UNKNOWN read`/errno -4094 = corrupção de `node_modules` pelo OneDrive).
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. **Não "conserte" `no-explicit-any`/`set-state-in-effect` pré-existentes de passagem** (TeamRunView tem 4 deles pré-existentes; ignorar).
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, vários `docs/**` untracked). **`git add` só nos arquivos da S3.1** (schema + migração + team-types + loader + coordinator + groq + helper + `v21s5-verify.ts` + eventual UI).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 3, fatia **S3.1**, linhas 76-79) + esta nota + os anchors acima. **Se a UI de edição do `workflow` entra ou não nesta fatia é decisão de UX → confirmar comigo** (regra global #2) **antes de codar**.
2. Rodar `npx tsx scripts/v21s4-verify.ts` (e v21s1/s2/s3) pra confirmar baseline verde.
3. Executar o data-flow `schema → tipo runtime → loader → ChatOptions → call-sites do coordinator → concatenação no system prompt` (helper PURO pra concatenação). **Coordinator INTACTO** (só injeção no 4º arg). Ausente = prompt do Agent puro.
4. **Migração formal + `migrate deploy` MANUAL no host real `2.24.207.200:5435` ANTES do push** (confirmar coluna em prod). `npx tsc --noEmit` limpo + `scripts/v21s5-verify.ts` verde.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S3.1** (não emendar a S3.2). Abrir a `Sessão 7.md` apontando pro **S3.2** (relations de task `blocks`/`related` — **também tem schema/migração**: `TeamTask.blocks String[]` + `related String[]`, host real, `v21s6-verify.ts`).
6. **E2E manual (com o usuário):** criar/editar um membro com `workflow`, rodar o time e confirmar que a instrução afeta o comportamento daquele membro; membro sem `workflow` = idêntico ao atual. (Junto, se ainda não feito, fechar o **E2E do Sprint 2**: timeline por task no card expandido.)

> Comece confirmando comigo a **decisão de UX da S3.1 (a edição de `workflow` por membro entra nesta fatia ou vira follow-up?)** — antes de escrever código. E lembre: **esta fatia tem migração → host real `2.24.207.200:5435` ANTES do push.**
