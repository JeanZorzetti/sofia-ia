# Polaris Teams V2 — Prompt inicial da Sessão 5

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S2.2 — Atribuição de tokens/custo por membro (fecha a Sprint 2).**
>
> ℹ️ **Nota de numeração:** S1.1→S1.2→S1.3 (Sprint 1) fecharam nas Sessões 1–3; **S2.1** (painel por-membro, abre a Sprint 2) fechou na **Sessão 4** (`Sessão 4.md`). Esta é a **Sessão 5** = **S2.2**, a segunda e última fatia da Sprint 2.
>
> ℹ️ **Nota de convenção do verify:** o ROADMAP cita `scripts/v2s2b-verify.ts`, mas isso é PRÉ-convenção. A convenção real que se firmou é **incremental `v2s{n}`**: S1.1=v2s1, S1.2=v2s2, S1.3=v2s3, S2.1=v2s4 → **S2.2 = `scripts/v2s5-verify.ts`**. Use `v2s5`.
>
> ⚠️ **A S2.2 é OPCIONAL no ROADMAP** ("só executar se o painel S2.1 mostrar que custo por membro é demanda real"). O usuário JÁ deu o go pra executá-la nesta sessão.

---

## Contexto pra continuar (ciclo Polaris Teams V2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2/`** → **`ROADMAP.md`** (executável; leia a **Sprint 2, fatia S2.2**) + `ANALISE-GAP-AGENT-TEAMS-AI.md` (análise). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅ — FECHADA) → **Sprint 2 (S2.1 ✅ → S2.2 🔜 — fecha a Sprint 2)** → Sprint 3 (S3.1 → S3.2 — gitMode PR vs direto).

**Invariantes (valem pra toda fatia):**
1. **Coordinator quase-INTACTO — com UMA exceção sancionada nesta fatia.** `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam de comportamento/lógica**. A S2.2 precisa de UM toque: **adicionar `memberId` (e `runId` onde falta) ao objeto `options` (4º param do `chat`) em cada call-site** — isso é o mecanismo de extensão EXPLICITAMENTE permitido pelo invariante (mesma natureza de `model`/`effort` do B, `taskId`/`runId` do C2.1 e `capabilities` do S1.1). É **passthrough puro**: nenhum branch novo, nenhuma decisão de coordenação muda. (Contraste: a S2.1 não tocou o coordinator em nada — a S2.2 toca, mas só os literais de opts.)
2. **`chatWithAgent` (groq.ts) INTACTO.** A atribuição de usage acontece no **caller** (o wrapper que injeta o `chat`), NÃO dentro de `chatWithAgent` nem do `code-agent.ts`. Não tocar groq.ts.
3. **Schema: tem migração nesta fatia.** A S2.2 cria uma **tabela nova** → `prisma migrate` formal **E** `migrate deploy` MANUAL no host real `sofia_db@2.24.207.200:5435` **ANTES** do push (lição SP2/SP3: `db push` do standalone NÃO cria tabela em prod). Esta é a diferença grande vs S2.1 (que era puro UI sem schema).
4. **Defaults preservam o legado.** Run sem linhas de usage (legado/teste) → painel mostra `0 tok`/sem custo graciosamente; as métricas de run-level (`tokensUsed`/`estimatedCost` agregados) **continuam idênticas** (não mexer no `track()`/`finishRun` do coordinator).
5. **Script de verificação** `scripts/v2s5-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094). O painel valida por **E2E manual**; o que dá pra cobrir em script puro é a **agregação por membro + cálculo de custo** (helper puro `member-usage.ts`).

### O que JÁ foi feito ✅ (NÃO refazer)

- **S1.1 (`ca612d0`)** — `TeamMember.capabilities Json?` + `CapabilityPolicy` plumbado member→`MemberCtx`→`ChatOptions`→`chatWithAgent` (inerte). Migração aplicada no host real.
- **S1.2 (`390a693`)** — enforcement do gate só em `chatWithAgent` (groq.ts). Helper puro [model-capabilities.ts](../../src/lib/ai/model-capabilities.ts). Sem schema.
- **S1.3 (`33d7088`)** — UI no RosterEditor grava `capabilities`. Módulo puro [roster-mapping.ts](../../src/app/dashboard/teams/roster-mapping.ts). 🏁 fecha Sprint 1.
- **S2.1 (`48a391c`)** — painel "Por membro" no TeamRunView, **puro UI**. Helper puro [member-stats.ts](../../src/app/dashboard/teams/[id]/member-stats.ts) (`computeMemberStats(members, messages, tasks)`) + componente [MemberActivityPanel.tsx](../../src/app/dashboard/teams/[id]/MemberActivityPanel.tsx) (card por membro, seção aditiva abaixo do feed). Agrega mensagens/tasks por `TeamMember.id`, robusto a `null`. **A S2.2 estende ESTE painel** com tokens/custo por membro. v2s4-verify=14.
- **Pendente (com o usuário):** E2E autenticado de S1.1–S2.1 em prod. **Não bloqueia a S2.2.**

---

## Onde a S2.2 mexe — recap do código real (LEIA antes de codar)

### 1. Como as métricas funcionam HOJE (run-level agregado, sem por-membro)
Em **ambos** os coordinators (`runTeam` e `runTeamGraph`):
- `let tokensUsed = 0` + `const track = (r: ChatResult) => { tokensUsed += r.usage?.total_tokens ?? 0 }` — chamado APÓS cada `chat()` que resolve com sucesso.
- `const COST_PER_1M_TOKENS = 0.5` → no `finish(...)`: `estimatedCost: (tokensUsed / 1_000_000) * COST_PER_1M_TOKENS`.
- Persistido via `store.finishRun(runId, { turnsUsed, tokensUsed, estimatedCost, durationMs, ... })` → grava em `TeamRun.tokensUsed`/`estimatedCost` ([team-store.ts](../../src/lib/orchestration/team/team-store.ts) `finishRun`).
- `ChatResult.usage` = `{ total_tokens?: number } | null` ([team-types.ts](../../src/lib/orchestration/team/team-types.ts)). Para code-runs, `code-agent.ts` já agrega `totalTokens` e devolve `usage: { total_tokens }` por task.

⇒ **Hoje só há agregado do run inteiro. Nada por membro.** (Foi por isso que a S2.1 deixou custo/tokens-por-membro explicitamente pra cá.)

### 2. Os call-sites do `chat()` no coordinator (onde entra o passthrough)
`chat(agentId, messages, leadContext?, options?)`. Os literais de `options` por papel (idênticos em `runTeam` e `runTeamGraph`):
- **lead (planning):** `{ model: lead.model, effort: lead.effort, capabilities: lead.capabilities }` → **sem `runId`, sem `memberId`**
- **worker (execução):** `{ model, effort, taskId: t.id, runId, capabilities }` → **tem `runId`, falta `memberId`**
- **reviewer:** `{ model: reviewer.model, effort: reviewer.effort, capabilities: reviewer.capabilities }` → **sem `runId`, sem `memberId`**
- **lead (consolidação):** `{ model: lead.model, effort: lead.effort, capabilities: lead.capabilities }` → **sem `runId`, sem `memberId`**

Linhas aprox.: `runTeam` lead L67-69 / worker L122 / reviewer L156 / consolidação L190. `runTeamGraph` lead L107-109 / worker L211 / reviewer L272 / consolidação L317. **Adicionar `memberId: <member>.id` (e `runId` onde falta) a CADA um.** Nada mais muda no coordinator.

### 3. Os 3 callers que injetam o `chat` (onde entra o wrapper de atribuição)
Todos passam um `chat` fino pra `runTeamByTopology(runId, { store, chat })`:
- [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts) **L91** (chat-run em `after()`): `chat: (agentId, messages, ctx, opts) => chatWithAgent(...)`
- [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts) **L161** (`runTeamAndWait`, Workflows inline): mesmo wrapper
- [worker/index.ts](../../src/worker/index.ts) **L96/L160-161** (code-runs): `chat: codeChat` onde `codeChat = createCodeChatFn(sandbox, baseChat, ...)` e `baseChat` envolve `chatWithAgent`. **Envolver o `codeChat`/o chat final** (não o `baseChat`) — `codeChat` é o ChatFn que o coordinator chama e que devolve `ChatResult.usage` (agregado por task no code-agent).

⇒ **Estratégia:** um único helper `withUsageTracking(inner: ChatFn): ChatFn` aplicado nos 3 pontos. Ele chama `inner(...)`, e **depois** que resolve, lê `opts.runId`/`opts.memberId` + `result.model`/`result.usage.total_tokens` e grava uma linha de usage (**best-effort: nunca lança** — espelhar a tolerância FK do `addMessage`). Se `runId`/`memberId` ausentes (legado/teste) → não grava, sem crash.

### 4. Schema atual relevante ([schema.prisma](../../prisma/schema.prisma))
- `TeamMember` (`team_members`): `id`, `teamId`, `agentId`, `role`, `model`, `effort`, `capabilities Json?`, `position`.
- `TeamRun` (`team_runs`): tem `tokensUsed Int?`, `estimatedCost Float?` (run-level, **não mexer**).
- **Padrão de FK de membro:** refs de membro são `onDelete: SetNull` + retry-com-null via `isMemberFkViolation` no store (roster editado/agent deletado mid-run não pode derrubar o run). A tabela nova deve seguir o MESMO padrão.

### 5. Como o cliente recebe (rota SSE — [stream/route.ts](../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts))
SSE por **polling** (setInterval 1s). Hoje emite eventos `board` / `terminal` / `message` (delta) / `status` (run-level métricas: `tokensUsed`, `estimatedCost`, etc.). **A S2.2 precisa expor usage POR MEMBRO** — opções no item 6 das decisões. O `TeamRunView` assina o SSE e passa `members`/`messages`/`tasks` ao `MemberActivityPanel`; basta acrescentar um `usageByMember` ao fluxo.

---

## Foco desta sessão: S2.2 — tokens/custo por membro 🔜

**Objetivo (ROADMAP, fatia S2.2):** capturar `usage` por chamada `chat()` e **atribuir por membro**; somar por membro; exibir no painel S2.1. Opcionalmente, custo real por modelo (tabela de preços) em vez do flat $0.5/1M — **só pra exibição por-membro** (run-level fica flat, coordinator intacto).

**Mudanças concretas (arquivo a arquivo):**
1. **Schema — nova tabela `TeamMemberUsage`** (nome a confirmar — decisão #1) em [schema.prisma](../../prisma/schema.prisma):
   ```prisma
   model TeamMemberUsage {
     id        String   @id @default(uuid()) @db.Uuid
     runId     String   @map("run_id") @db.Uuid
     memberId  String?  @map("member_id") @db.Uuid   // SetNull, igual refs de TeamMessage
     model     String?  @db.VarChar(100)
     tokens    Int      @default(0)
     createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()
     run    TeamRun     @relation(fields: [runId], references: [id], onDelete: Cascade)
     member TeamMember? @relation(fields: [memberId], references: [id], onDelete: SetNull)
     @@index([runId])
     @@index([memberId])
     @@map("team_member_usage")
   }
   ```
   + back-relations em `TeamRun` e `TeamMember`. Migração `2026..._add_team_member_usage` (formal + **`migrate deploy` MANUAL no host real ANTES do push**).
2. **Tipo** — `memberId?: string` em `ChatOptions` ([team-types.ts](../../src/lib/orchestration/team/team-types.ts)) ao lado de `taskId`/`runId`/`capabilities` (passthrough; `chatWithAgent` ignora chaves desconhecidas).
3. **Coordinator (passthrough sancionado)** — adicionar `memberId: <member>.id` (e `runId` onde falta) aos 4 literais de opts em `runTeam` **e** os 4 em `runTeamGraph`. **Só isso.** Nada de `track()`/`finish()` muda.
4. **Caller — helper impuro `src/lib/orchestration/team/member-usage-recorder.ts`** (importa prisma): `withUsageTracking(inner: ChatFn): ChatFn` que grava `TeamMemberUsage` best-effort após cada call. Aplicar nos 3 injetores (start-team-run ×2 + worker). Tolerância FK como no `addMessage` (P2003 de membro → grava `memberId: null`).
5. **Helper PURO `src/app/dashboard/teams/[id]/member-usage.ts`** (sem React/DB/prisma): `aggregateUsageByMember(records) → Map/array {memberId, tokens}` (null → bucket "sem membro", NÃO vaza pra membro — igual S2.1) + `costForModel(model, tokens)` com `MODEL_PRICE_PER_1M` (mapa pequeno) e fallback `FLAT_COST_PER_1M = 0.5` (**fonte única** — idealmente reexportar/alinhar com `COST_PER_1M_TOKENS` do coordinator). Usado pelo painel + verify.
6. **SSE + UI** — emitir usage por membro (decisão #6: novo evento `usage` vs dobrar no `status`; recomendado: agregar `groupBy({ by: ['memberId'], where:{runId}, _sum:{tokens} })` e mandar `usageByMember: [{memberId, tokens}]` no tick do `status`). `TeamRunView` guarda em estado e passa ao `MemberActivityPanel`; o card ganha `X tok · $Y` (custo via `costForModel` do helper puro). **member-stats.ts da S2.1 fica INTACTO** — o painel só MESCLA o usage por `memberId` (menor risco).

**Padrão de teste — `scripts/v2s5-verify.ts`** (sobre o helper PURO `member-usage.ts`):
- (a) **conservação:** dada uma lista de records `{memberId, model, tokens}`, Σ tokens por membro = Σ total dos records com `memberId` não-null;
- (b) **null não vaza:** records com `memberId: null` (membro deletado mid-run / sem atribuição) caem no bucket "sem membro" e em NENHUM membro;
- (c) **custo:** `costForModel` usa o preço do modelo quando conhecido, e cai no `FLAT_COST_PER_1M` (0.5/1M) pra modelo desconhecido/null, sem crash; custo por membro = Σ por modelo;
- (d) **robustez:** record sem `usage`/tokens = 0 não quebra; lista vazia → agregação vazia.
- Mais o **E2E manual:** rodar time de 3 membros e conferir que tokens/custo por membro batem com o total do run (`Σ por membro ≈ tokensUsed` do run).

### Decisões pra confirmar com o usuário ANTES de codar
1. **Modelo de persistência:** **append-only** (1 linha por call `chat()` — simples, "tabela leve de uso", agrega no read) **ou** upsert agregado por `(runId, memberId)` (menos linhas, escrita mais complexa)? (Recomendado: **append-only `TeamMemberUsage`** — bounded por turnos×membros, conserva naturalmente, escrita trivial e tolerante a FK.)
2. **Custo run-level:** manter o `estimatedCost` agregado do run **flat (0.5/1M)** como está (coordinator intacto) e calcular custo-real-por-modelo **só por membro** (exibição), **ou** também trocar o run-level por custo-por-modelo (mexeria no `track`/`finish` do coordinator)? (Recomendado: **manter run-level flat**; custo-por-modelo só no painel por-membro via helper puro — mantém o coordinator intacto e a fatia enxuta.)
3. **Entrega do usage no SSE:** **dobrar no evento `status`** (`usageByMember` no payload que já vai a cada tick) **ou** novo evento `usage`? (Recomendado: **no `status`** — sem novo tipo de evento, o cliente já trata `status`.)

---

## ⚠️ Gotchas de ambiente / implementação
- **Atribuição é por `TeamMember.id`, NÃO `agentId`** — dois membros podem usar o mesmo agente, então só `memberId` (que vem no `opts`) é chave confiável. (Mesma chave da S2.1.)
- **Por que tabela nova e não campo em `TeamMessage`:** as calls de **planning e consolidação NÃO geram mensagem** — atribuir usage em mensagens perderia esses tokens e **quebraria a conservação** (Σ membro ≠ tokensUsed). A tabela captura TODA call.
- **Conservação depende de gravar em TODA call bem-sucedida** — o `withUsageTracking` grava no MESMO ponto lógico em que o coordinator faz `track()` (depois do `chat` resolver). Call que lança (rate limit) → nem `track` nem usage gravam = consistente.
- **`withUsageTracking` é best-effort: NUNCA lança.** Uma falha de gravação de usage não pode derrubar o run. `try/catch` + tolerância FK (P2003 de membro → `memberId: null`), espelhando `addMessage`.
- **Não tocar `code-agent.ts`/`groq.ts`.** O code-agent já devolve `usage.total_tokens` agregado por task; envolver o `codeChat` (chat final do worker), não o `baseChat`.
- **Helper puro = testável sem React/DB:** `member-usage.ts` só (opcionalmente) `import type` de team-types. O recorder (com prisma) e o `MemberActivityPanel.tsx` (com React) NÃO entram no verify.
- **Import com colchetes funciona:** o verify importa `../src/app/dashboard/teams/[id]/member-usage` (tsx resolve o path literal com `[id]`, igual fez o v2s4 com member-stats).
- **Verificação confiável:** `npx tsx scripts/v2s5-verify.ts` + `npx tsc --noEmit` (**0 erros**). Rodar antes os baselines verdes: `v2s4`/`v2s3`/`v2s2`/`v2s1`. **Não rodar jest.**
- **Pre-commit hook:** typecheck = gate (bloqueia) + eslint = informativo (NÃO bloqueia). O TeamRunView já acusa eslint PRÉ-EXISTENTE (loadTeam effect L95, `(team as any)` do TeamOutputsPanel) — ignorar, não introduzir NOVOS.
- **Commit SELETIVO:** a árvore tem muitas mudanças não relacionadas (logos, `docs/**` untracked). `git add` só nos arquivos da S2.2. Pathspec literal pro caminho com colchetes: `git add ':(literal)src/app/dashboard/teams/[id]/member-usage.ts'` (e idem pro `MemberActivityPanel.tsx`/`TeamRunView.tsx` se editados). **`prisma/schema.prisma` + a pasta da migração `prisma/migrations/2026..._add_team_member_usage/` também entram no commit.**
- **Commit message:** preferir `git commit -F <arquivo>` (here-string do PowerShell quebra no passthrough).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S2.2 TEM migração.** Host real: `postgres://sofia_db:<senha família PAzo18**>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta pra OUTRO host `bot@31.97...` — **NÃO usar pra migração**). Fluxo: `prisma migrate dev`/`migrate diff` p/ gerar a migração formal → **`prisma migrate deploy` MANUAL apontando pro host real ANTES do push** (senão o standalone do Docker não cria a tabela e TODA read da tabela quebra — lição `sofia_next_db_push_runner_fails`). Verificar a tabela existindo no host antes de push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 2, fatia **S2.2**) + esta nota + o recap do código real acima. **Confirmar comigo as 3 decisões ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v2s4-verify.ts` + `v2s3`/`v2s2`/`v2s1` pra confirmar baseline verde.
3. **Migração primeiro:** criar `TeamMemberUsage` no schema + migração formal + **`migrate deploy` MANUAL no host real** + verificar a tabela existindo.
4. Implementar: `ChatOptions.memberId` (type); passthrough `memberId`+`runId` nos 8 call-sites (runTeam ×4 + runTeamGraph ×4 — **só os literais de opts**); `member-usage-recorder.ts` (`withUsageTracking`, best-effort) aplicado nos 3 injetores; helper puro `member-usage.ts`; SSE `usageByMember` + `TeamRunView`/`MemberActivityPanel` exibindo tokens/custo por card. **Coordinator (lógica), `groq.ts`, `code-agent.ts`, `member-stats.ts` da S2.1 INTOCADOS.**
5. `scripts/v2s5-verify.ts` (casos a–d, com conservação) + `npx tsc --noEmit` limpo.
6. **Commit limpo só da fatia (inclui schema + pasta de migração) + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S2.2 — fecha a Sprint 2.** Próxima fatia (Sprint 3 / S3.1 `TeamRun.gitMode`) só com instrução explícita.

> Comece confirmando comigo as **3 decisões da S2.2** antes de escrever código.
