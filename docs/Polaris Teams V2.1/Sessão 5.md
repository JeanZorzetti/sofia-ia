# Polaris Teams V2.1 — Prompt inicial da Sessão 5

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S2.2 — Timeline por task no `TeamRunView` (Sprint 2 · Tema E, fecha o sprint).**

---

## Contexto pra continuar (ciclo Polaris Teams V2.1)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.1/`** → **`ROADMAP.md`** (executável; leia a **Sprint 2, fatia S2.2**) + `ANALISE-GAP-V2.1.md` (análise; tese central = **eixo-autonomia**). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅) → **Sprint 2 (S2.1 ✅ → S2.2 🔜)** → Sprint 3 (S3.1 → S3.2 → S3.3).

**🏁 Sprint 1 COMPLETO** (execução de tools além do OpenRouter). **S2.1 ✅ FEITA** (persistência da timeline por task). Agora a **S2.2 fecha o Sprint 2**: renderizar a timeline no `TeamRunView`. **Natureza: SÓ UI + serialização — NÃO mexe no schema → NÃO tem migração.** (A coluna já existe em prod desde a S2.1.)

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam de comportamento**. A S2.2 só **lê/exibe** o que a S2.1 já persiste; não toca coordinator nem store de escrita.
2. **Defaults preservam o legado** — task sem `historyEvents` (coluna nula / run legado) → a UI degrada graciosamente (sem aba "Histórico" ou aba vazia, nunca crash).
3. **Verificação:** a S2.2 é **E2E manual** (ROADMAP linha 66) — rodar time, abrir task, confirmar a ordem dos eventos. **Não há `v21sN`-verify novo pra S2.2** (o próximo número, `v21s5-verify.ts`, é reservado pra **S3.1** — ROADMAP linha 79). Se surgir lógica PURA de formatação (ex.: `event.type → label/ícone`), extraia num helper puro e teste com asserts inline no padrão `task-history.ts`, mas **mantenha `v21s5` pra S3.1**.

### O que JÁ foi feito ✅ — Sprint 1 + S2.1 — NÃO refazer

- **S1.1 (commit `3e2f3ed`):** tool loop no path **Groq nativo** (helpers `buildAgentToolDefs`+`executeAgentToolCall` em [agent-tools.ts](../../src/lib/ai/agent-tools.ts)). `scripts/v21s1-verify.ts` (12 asserts).
- **S1.2 (commit `e37a4ef`):** tool loop no path **Ollama** ([groq.ts](../../src/lib/ai/groq.ts)). `scripts/v21s2-verify.ts` (15 asserts).
- **S1.3 (commit `565d4c8`):** `CapabilityPolicy` → **flags do Claude CLI**. Helper PURO [cli-tool-flags.ts](../../src/lib/ai/cli-tool-flags.ts). Chat-run host = read-only + `--permission-mode plan` (sem `--dangerously-skip-permissions`); code-run E2B = escrita preservada, honra `mcpAllowlist`. `scripts/v21s3-verify.ts` (6 casos).
- **S2.1 (commit `3d4a55a`, 2026-06-19) — ✅ PERSISTÊNCIA DA TIMELINE:**
  - **Schema:** `TeamTask.historyEvents Json?` ([schema.prisma](../../prisma/schema.prisma)) + migração `20260619120000_add_team_task_history` (add coluna `history_events` JSONB nullable). **APLICADA MANUAL no host real `sofia_db@2.24.207.200:5435` ANTES do push** (coluna confirmada `jsonb` em prod via `information_schema`).
  - **Helper PURO** [task-history.ts](../../src/lib/orchestration/team/task-history.ts): `taskEventFromUpdate(prev, data, at)` deriva o tipo da transição (`task_created`/`status_changed`/`owner_changed`/`review_requested`/`review_approved`/`review_changes_requested`) e retorna `null` quando o update NÃO é transição (reviewDiff/result/retry-only); `appendTaskEvent(history, ev)` (append imutável, coerce de coluna nula); `taskCreatedEvent(...)`. **Forma do evento:** `{ type, actor, at, detail? }`. `actor` = id do membro OU sentinela (`ACTOR_LEAD`/`ACTOR_REVIEWER`) quando o id não está na row da task (o store só conhece o `assigneeId`, não os ids de lead/reviewer). `status_changed`/verdicts carregam `{from,to}` no `detail`. Verdicts de review desambiguados por `prev.status === 'review'` (→done = approved; →todo/rejected = changes_requested).
  - **Plumbing store-level** ([team-store.ts](../../src/lib/orchestration/team/team-store.ts), **coordinator INTACTO**): `createTask` semeia `task_created`; `updateTask` lê a row anterior UMA vez (reusa a leitura que o merge raso do `reviewDiff`/C3 já fazia) e dá append do evento derivado. **Evento nulo = coluna intocada = run legado byte-idêntico.**
  - **Read path:** `TaskRow.historyEvents?` exposto em [team-types.ts](../../src/lib/orchestration/team/team-types.ts) + mapeado em `listTasks`/`createTask`. ⚠️ **Mas a UI NÃO consome via `store.listTasks`** (ver gotcha abaixo).
  - `scripts/v21s4-verify.ts` (5 casos a–e, incl. regressão) + `tsc --noEmit` **0 erros no projeto inteiro**.
- **Pendente das S1.x/S2.1 (com o usuário):** E2E autenticado em prod. **Não bloqueia a S2.2** (a S2.2 É justamente parte desse E2E: rodar um time e ver a timeline aparecer).

---

## ⚠️ Gotcha #1 da S2.2 (o pulo do gato) — a rota SSE tem `select` PRÓPRIO

A S2.1 expôs `TaskRow.historyEvents`, mas **o `TeamRunView` NÃO lê tasks via `store.listTasks`** — ele consome o **SSE** de [api/teams/[id]/runs/[runId]/stream/route.ts](../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts), que monta um **`select` narrow próprio** (~linhas 55-76) e um **payload de delta próprio** (~linhas 88-99). Então, pra a timeline chegar na UI, a S2.2 precisa:
1. **Adicionar `historyEvents: true`** ao `select` das tasks na rota SSE (~linha 61-64, junto de `status/retryCount/reviewNote/result/artifacts`).
2. **Emitir `historyEvents`** no payload do delta de tasks (~linha 91-99, junto dos campos já mapeados). Cuidado com o **sig de mudança** (`current.tasks.map(t => \`${t.id}:${t.status}:${t.retryCount}\`)`, ~linha 88): hoje um novo evento sem mudar status/retry **não dispara** re-emissão de delta — avalie incluir o tamanho/hash de `historyEvents` no sig se quiser timeline ao vivo, ou aceite que ela chega no próximo delta natural (decisão de UX a confirmar).
3. **Renderizar** em [TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx) — aba/seção "Histórico" no detalhe da task (actor + timestamp + transição, em ordem). Reusar o que o SSE já entrega.

> Confirmar com o usuário (regra global #2): **(a)** timeline ao vivo (mexer no sig) vs no próximo delta natural; **(b)** onde abre o detalhe da task hoje (drawer? card expandido?) — alinhar com o padrão de UI que o C2/C2.1 usou pra mostrar `artifacts`/diff (xterm.js/diff2html), pra a aba "Histórico" ficar consistente.

## ⚠️ Gotchas de ambiente desta máquina (valeram nas S1.x/S2.1)

- **Verificação confiável:** `npx tsx scripts/v21sN-verify.ts` (lógica pura) + `npx tsc --noEmit`. **Não rode jest** (`UNKNOWN read`/errno -4094 = corrupção de `node_modules` pelo OneDrive). A S2.2 é majoritariamente UI → o gate real é **E2E manual + typecheck**.
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. Não "conserte" `no-explicit-any` pré-existentes de passagem.
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, vários `docs/**` untracked). **`git add` só nos arquivos da S2.2** (rota SSE + `TeamRunView.tsx` + eventual helper de label).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S2.2 NÃO precisa de migração** (sem mudança de schema). A coluna `history_events` já está em prod desde a S2.1. Se algum dia precisar: host real `sofia_db@2.24.207.200:5435` (o `.env` aponta pra OUTRO host `bot@31.97.23.166:5499` — **não usar pra migração**; a senha real da família `PAzo18**` está no `.env`, reusável pro user `sofia_db`); `migrate deploy` MANUAL com `DATABASE_URL` inline **antes** do push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 2, fatia **S2.2**, linhas 64-66) + esta nota + a forma do evento em [task-history.ts](../../src/lib/orchestration/team/task-history.ts). **Confirmar comigo as decisões de UX** (timeline ao vivo vs delta natural; onde renderizar o detalhe da task) **ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v21s4-verify.ts` (e v21s1/s2/s3) pra confirmar baseline verde.
3. Executar: `historyEvents` no `select` + payload da rota SSE → render da aba "Histórico" no `TeamRunView`. **Coordinator + store de escrita INTACTOS** (a S2.2 só lê). Task sem eventos = aba ausente/vazia (sem crash).
4. **Sem migração.** `npx tsc --noEmit` limpo.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S2.2** (não emendar a S3.1). Abrir a `Sessão 6.md` apontando pro **S3.1** (`workflow` por membro — **volta a TER schema/migração**: `TeamMember.workflow String?`, host real `2.24.207.200:5435`, `v21s5-verify.ts`).
6. **E2E manual do Sprint 2 (com o usuário):** rodar um time real, abrir uma task e confirmar que `task_created`/atribuição/`status_changed`/review aparecem na ordem certa. Fecha o Sprint 2.

> Comece confirmando comigo as **decisões de UX da S2.2 (live vs delta natural; onde abre o detalhe da task)** — antes de escrever código.
