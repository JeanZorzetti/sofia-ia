# Polaris Teams V2.1 — Prompt inicial da Sessão 4

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S2.1 — Persistir eventos de lifecycle por task (Sprint 2 · Tema E).**

---

## Contexto pra continuar (ciclo Polaris Teams V2.1)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.1/`** → **`ROADMAP.md`** (executável; leia a **Sprint 2, fatia S2.1**) + `ANALISE-GAP-V2.1.md` (análise; tese central = **eixo-autonomia**). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅) → **Sprint 2 (S2.1 🔜 → S2.2)** → Sprint 3 (S3.1 → S3.2 → S3.3).

**🏁 Sprint 1 COMPLETO** (execução de tools além do OpenRouter). Agora começa o **Sprint 2 (Tema E — timeline/auditoria por task)**. **Natureza nova:** o Sprint 1 não tocou schema; **a S2.1 É a primeira fatia deste ciclo que MEXE no schema** → migração formal + `migrate deploy` MANUAL no host real **ANTES** do push (lição SP2/SP3 — `db push` do standalone não cria coluna em prod).

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam de comportamento**. Extensões entram por **injeção** (campos em `RunTeamDeps`/`options` do `ChatFn`) ou pelos **callers** ([start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts), [worker/index.ts](../../src/worker/index.ts), cron, rotas API). A S2.1 anexa eventos **no ponto onde o store já persiste a transição** (`updateTask`/`createTask`) — sem alterar a lógica de quem decide a transição.
2. **Migração formal + manual ANTES do push** — `prisma migrate` formal **e** `migrate deploy` manual no host real `sofia_db@2.24.207.200:5435` **antes** do push. O `.env` aponta pra OUTRO host — **não usar pra migração**; rodar `DATABASE_URL` inline.
3. **Script de verificação** `scripts/v21s4-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094). Extrair a decisão em função **pura** (ex.: `task-history.ts` — `appendTaskEvent(history, event)` / construtores de evento) e testá-la direto, no padrão de `team-board.ts`/`model-capabilities.ts`/`cli-tool-flags.ts`.
4. **Defaults preservam o legado** — campo novo opcional/nullable; run sem eventos = byte-idêntico ao atual. **Regressão sempre verificada.**

### O que JÁ foi feito ✅ — Sprint 1 (S1.1 + S1.2 + S1.3) — NÃO refazer

- **S1.1 (commit `3e2f3ed`):** tool loop no path **Groq nativo**. Helpers compartilhados `buildAgentToolDefs`+`executeAgentToolCall` ([agent-tools.ts](../../src/lib/ai/agent-tools.ts)); `modelSupportsTools` reconhece ids Groq. `scripts/v21s1-verify.ts` (12 asserts).
- **S1.2 (commit `e37a4ef`):** tool loop no path **Ollama** ([groq.ts](../../src/lib/ai/groq.ts)). `modelSupportsTools` trata prefixo `ollama/`. `scripts/v21s2-verify.ts` (15 asserts).
- **S1.3 (commit `565d4c8`, 2026-06-19):** `CapabilityPolicy` do membro → **flags do Claude CLI** (não loop — o CLI já executa tools nativas). Helper PURO [cli-tool-flags.ts](../../src/lib/ai/cli-tool-flags.ts) (`buildCliToolFlags`/`renderClaudeCliFlags`/`toCliMcpDescriptor`), ancorado no `claude --help` real. **Chat-run host** ([claude-cli-service.ts](../../src/services/claude-cli-service.ts)): política → read-only + `--permission-mode plan` + `--mcp-config`, **sem `--dangerously-skip-permissions`** (fecha furo de FS). **Code-run E2B** ([sandbox-cli-agent.ts](../../src/lib/orchestration/team/sandbox-cli-agent.ts)): escrita preservada (skip ON), só honra `mcpAllowlist`; `filesystem:false` = opt-out. **Opencode = limitação documentada** (binário não expõe flag de tool/permission no `run`). Threading: `chatWithAgent`→`generate` (chat); `chatOptions.capabilities` + resolver MCP injetado no worker → `runClaudeInSandbox` (code). Sem migração, coordinator intacto. `scripts/v21s3-verify.ts` (6 casos a–e) + `tsc` limpo.
- **Pendente das S1.1/S1.2/S1.3 (com o usuário):** E2E autenticado em prod (rodar time com Worker Groq/Ollama tool-capable + Worker Claude CLI confirmando a política via flags no feed/sandbox). **Não bloqueia a S2.1.**

---

## Onde a S2.1 mexe — o ponto único de persistência de transição

O coordinator **já emite** todas as transições; elas passam por **`store.updateTask`/`store.createTask`** ([team-store.ts:88-211](../../src/lib/orchestration/team/team-store.ts#L88)). Os pontos reais (em [team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)):
- `createTask(..., status:'todo', assigneeId)` (criação/atribuição inicial) — linhas ~92, ~107;
- `updateTask(t.id, { status:'doing' })` (início) — ~117;
- `updateTask(t.id, { status:'review'|'done', result, ... })` (entrega → review/done) — ~128-129;
- `updateTask(t.id, { status:'done' })` (review aprovado) — ~164;
- `updateTask(t.id, { status:'todo'|'rejected' (retry/cap) })` (changes requested / esgotou retry) — ~172-173.

> **A estratégia da S2.1:** NÃO espalhar lógica no coordinator. Anexar o evento **dentro do `updateTask`/`createTask` do store** (ou num wrapper fino do store, mesmo padrão do `withUsageTracking`), derivando o `type` da transição (`status_changed`/`owner_changed`/`review_requested`/`review_approved`/`review_changes_requested`/`task_created`) a partir do `data` recebido. Assim o coordinator fica **byte-idêntico** e a timeline cai "de graça". Confirmar essa abordagem (store-level) com o usuário — é uma decisão de arquitetura (regra global #2).

---

## Foco desta sessão: S2.1 — Persistir eventos de lifecycle por task 🔜

**Objetivo (do ROADMAP, fatia S2.1):** log estruturado **append-only por task** dos eventos de lifecycle, persistido e exposto (a S2.2 renderiza no `TeamRunView`). Hoje só há feed `TeamMessage` + board + painel por membro (V2 S2) — não há histórico por task.

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
0. **Schema: coluna `Json?` vs tabela nova.** O ROADMAP abre as duas:
   - **(A) `TeamTask.historyEvents Json?`** (append-only no próprio task) — 1 migração trivial (add coluna nullable), sem joins, fácil de ler junto com o task. Contra: cresce o row; sem query por tipo.
   - **(B) tabela `TeamTaskEvent`** (`id`, `taskId`, `type`, `actor`, `createdAt`, `detail Json`) — query/index por tipo, mais "correto". Contra: migração maior, join no read, mais plumbing.
   - **Recomendação:** **(A) `historyEvents Json?`** — a timeline é sempre lida **no contexto de UMA task** (a S2.2 abre o detalhe da task), nunca cross-task; YAGNI pra index por tipo. Menos plumbing, mesma entrega. Decidir com o usuário.
1. **Forma do evento** (inspirada no `TaskHistoryEvent` do ATA): `{ type, actor, at, detail? }` com `type ∈ {task_created, status_changed, owner_changed, review_requested, review_approved, review_changes_requested}`. `actor` = id do membro/sistema. Confirmar o enum + se `status_changed` carrega `{from,to}` no `detail`.
2. **Onde anexar:** store-level (wrapper de `updateTask`/`createTask`) vs caller no coordinator. **Recomendação: store-level** (coordinator intacto — ver acima).

**Mudanças concretas (se decidir EXECUTAR, opção A):**
1. **Schema:** `TeamTask.historyEvents Json?` em [schema.prisma](../../prisma/schema.prisma). **Migração formal** `prisma migrate dev --name add_team_task_history` + `migrate deploy` MANUAL no host real ANTES do push.
2. **Helper PURO** `src/lib/orchestration/team/task-history.ts`: `taskEventFromUpdate(prev, data, actor)` → `TaskHistoryEvent | null` (deriva o tipo da transição; retorna null quando o update não é uma transição rastreável) + `appendTaskEvent(history, event)` (append imutável). **PURO** → testável direto.
3. **Plumbing:** no `updateTask`/`createTask` do store (ou wrapper), computar o evento e dar append em `historyEvents`. **Coordinator INTACTO.** Ausência de eventos / coluna nula → run legado idêntico.

**Padrão de teste (sem DB/rede):** `scripts/v21s4-verify.ts` —
- (a) sequência de transições (`todo → doing → review → done`) gera a timeline esperada na ordem certa;
- (b) `review_changes_requested` (review→todo) e `review_approved` (review→done) mapeiam pro tipo certo;
- (c) `owner_changed` quando `assigneeId` muda; `task_created` na criação;
- (d) update que **não** é transição (ex.: só `artifacts`/`result`) **não** gera evento;
- (e) **sem eventos / coluna nula → comportamento idêntico ao atual** (regressão).

---

## ⚠️ Gotchas de ambiente desta máquina (valeram nas S1.x)

- **Verificação confiável:** `npx tsx scripts/v21sN-verify.ts` (lógica pura) + `npx tsc --noEmit` (fechou com **0 erros** nas S1.2/S1.3). **Não rode jest** (`UNKNOWN read`/errno -4094 = corrupção de `node_modules` pelo OneDrive). `tsc` pode acusar erros de deps opcionais (bullmq/e2b/xterm) — ignorar; o que importa são os arquivos da fatia.
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. `groq.ts`/services legados cospem dezenas de `no-explicit-any`/`prefer-const` **pré-existentes** — o commit passa mesmo assim (a S1.3 passou com 44 desses). **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, vários `docs/**` untracked). **`git add` só nos arquivos da S2.1** (migração + schema + `task-history.ts` + store + `scripts/v21s4-verify.ts`).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S2.1 PRECISA de migração** → host real `sofia_db@2.24.207.200:5435` (o `.env` aponta pra OUTRO host — não usar). `migrate deploy` MANUAL com `DATABASE_URL` inline **ANTES** do push (lição: `db push` do standalone falha silencioso em prod → coluna nova nunca criada → client regenerado quebra todas as reads da tabela = 500).
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 2, fatia **S2.1**) + `ANALISE-GAP-V2.1.md` (Tema E) + esta nota. **Confirmar comigo as decisões #0 (schema A vs B), #1 (forma/enum do evento) e #2 (store-level vs caller) ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v21s3-verify.ts` (e v21s1/v21s2) pra confirmar baseline verde.
3. Se EXECUTAR: schema + **migração formal** + helper PURO `task-history.ts` + plumbing no store; **coordinator INTACTO**; **sem eventos = run idêntico**.
4. **`migrate deploy` MANUAL no host real `2.24.207.200:5435` ANTES do push.**
5. `scripts/v21s4-verify.ts` (casos a–e) + `npx tsc --noEmit` limpo.
6. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S2.1** (não emendar a S2.2). Abrir a `Sessão 5.md` apontando pro **S2.2** (timeline no `TeamRunView`).

> Comece confirmando comigo as **3 decisões da S2.1 (schema, forma do evento, onde anexar)** — antes de escrever código.
