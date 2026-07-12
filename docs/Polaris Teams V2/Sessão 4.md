# Polaris Teams V2 — Prompt inicial da Sessão 4

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S2.1 — Painel "por membro" no TeamRunView (abre a Sprint 2).**
>
> ℹ️ **Nota de numeração:** a Sprint 1 (S1.1→S1.2→S1.3) foi fechada na **Sessão 3** (`Sessão 3.md` = S1.3). Esta é a **Sessão 4** = primeira fatia da **Sprint 2**.

---

## Contexto pra continuar (ciclo Polaris Teams V2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2/`** → **`ROADMAP.md`** (executável; leia a **Sprint 2, fatia S2.1**) + `ANALISE-GAP-AGENT-TEAMS-AI.md` (análise). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅ — **FECHADA**) → **Sprint 2 (S2.1 🔜 → S2.2 opcional)** → Sprint 3 (S3.1 → S3.2).

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` não mudam. **A S2.1 é puro UI**: NÃO toca coordinators, NÃO toca `groq.ts`, NÃO toca a rota SSE — só **deriva e renderiza** dados que o cliente já recebe.
2. **Migração formal + `migrate deploy` manual no host real ANTES do push** (lição SP2/SP3) — **mas a S2.1 NÃO mexe no schema** (ROADMAP: "puro UI, sem schema") → **sem migração nesta fatia.** (Custo/tokens por membro = S2.2, que aí sim pede schema — fora desta fatia.)
3. **Script de verificação** `scripts/v2s4-verify.ts` (convenção `v2s{n}` incremental: S1.1=v2s1, S1.2=v2s2, S1.3=v2s3, **S2.1=v2s4**) — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094). O painel em si valida por **E2E manual** (ROADMAP); o que dá pra cobrir em script puro é a **agregação por membro** (extrair um helper puro `member-stats.ts` e testá-lo).
4. **Defaults preservam o legado** — a tela atual do `TeamRunView` continua funcionando idêntica; o painel por-membro é **aditivo** (não remove board/feed/topologia/entrega).

### O que JÁ foi feito ✅ (NÃO refazer) — Sprint 1 COMPLETA

- **S1.1 (commit `ca612d0`)** — `TeamMember.capabilities Json?` + tipo `CapabilityPolicy` (`{ tools?, mcpAllowlist?, toolSkills?, filesystem? }`) plumbado member → `MemberCtx` → `ChatOptions` → `chatWithAgent` (inerte). Migração aplicada no host real.
- **S1.2 (commit `390a693`)** — enforcement do gate **só em `chatWithAgent` (groq.ts)**. Helper puro [model-capabilities.ts](../../src/lib/ai/model-capabilities.ts) (`modelSupportsTools`/`resolveToolGate`/`selectApiTools`). Sem schema.
- **S1.3 (commit `33d7088`)** — UI no RosterEditor grava `TeamMember.capabilities` via o CRUD. Módulo **puro** [roster-mapping.ts](../../src/app/dashboard/teams/roster-mapping.ts) (`rosterToMembers`, `mcpConnectionToOption`), tri-estado Herdar/Ligar/Desligar + multiselect MCP (por `AgentMcpServer.id`). Sem schema, coordinator/groq.ts intocados. v2s3-verify=11.
- **Pendente (com o usuário):** E2E autenticado de S1.1+S1.2+S1.3 em prod (criar time, habilitar MCP só no Worker, conferir no feed que o Worker invocou a tool e o Reviewer não). **Não bloqueia a S2.1.**

---

## Onde a S2.1 mexe — a fonte de dados (recap do código real)

⚠️ **Descoberta-chave:** os dados de "por membro" **já estão no cliente** — a S2.1 NÃO precisa de rota, evento SSE ou query nova. É derivação + render.

1. **UI — [TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx):** é uma **página de scroll vertical (sem abas)** que assina o SSE e guarda no estado:
   - `team.members` (de `GET /api/teams/[id]`): `Member { id, role, model, effort, agent: { id, name } }`. **A chave de agrupamento é `TeamMember.id`** (não `agentId`). O helper `memberOf(id)`/`nameFor(id)` (linha ~112) já mapeia `id → member`.
   - `messages: Msg[]` (evento SSE `message`, **acumulado por append** — o cliente já tem o log inteiro do run selecionado): `{ id, fromMemberId, toMemberId, kind, summary, content, taskId }`. `kind ∈ { message, assignment, review, system }`. `fromMemberId`/`toMemberId` **podem ser null** (mensagens de sistema / lead sintético) — tratar como "sem membro".
   - `tasks: BoardTask[]` (evento SSE `board`, **snapshot atual** — o array é substituído a cada tick): `{ id, title, status, assigneeId, retryCount, reviewNote, dependsOn, resultPreview }`. `status ∈ { todo, doing, review, done, rejected, blocked, clarify }`. `assigneeId` pode ser **null**.
   - `metrics` (evento SSE `status`): `turnsUsed/tokensUsed/estimatedCost/durationMs` são **AGREGADOS do run inteiro**, NÃO por membro. ⇒ **não há tokens/custo por membro hoje** (isso é a S2.2, que precisa de schema). Não tentar derivar custo por membro nesta fatia.
2. **Rota SSE — [runs/[runId]/stream/route.ts](../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts) (NÃO MEXER):** confirma os payloads acima. `message` manda `fromMemberId/toMemberId/kind/summary/content(≤500)/taskId`; `board` manda `assigneeId/status/retryCount/...`. **A S2.1 só consome o que já chega** — nenhuma mudança aqui.
3. **Análise (Tema D2):** o ATA tem `MemberStatsComputer` + `taskLogs/*`. O análogo barato na Polaris é **agregar o que já temos** (mensagens + board) por membro — sem novo storage.

---

## Foco desta sessão: S2.1 — Painel "por membro" no TeamRunView 🔜

**Objetivo (ROADMAP, fatia S2.1):** uma visão que **agrupa por membro** os dados que o SSE já entrega — mensagens enviadas/recebidas (`fromMemberId/toMemberId/kind`), tasks atribuídas e seus status (`assigneeId/status`), contadores e uma timeline de atividade. **Reusa os eventos SSE atuais (board/message), sem nova rota.**

**Mudanças concretas (arquivo a arquivo):**
1. **Novo helper PURO `src/app/dashboard/teams/[id]/member-stats.ts`** — `computeMemberStats(members, messages, tasks) → MemberStat[]`. Sem React, sem DB: só agrega. `MemberStat` por membro:
   - identidade: `memberId`, `name`, `role`;
   - mensagens: `sent` (`fromMemberId === id`), `received` (`toMemberId === id`), e breakdown por `kind`;
   - tasks: lista das atribuídas (`assigneeId === id`) + contagem por status (`todo/doing/review/done/rejected/…`) + `retries` (soma de `retryCount`);
   - timeline: as mensagens do membro (enviadas+recebidas) em ordem de chegada, com `kind`, contraparte e `summary || content`.
   - **Tratar `null`:** mensagens/tasks sem membro não entram em nenhum bucket de membro (ou um bucket "Sistema/—" separado, se quiser exibir — decisão #2).
2. **Novo componente `src/app/dashboard/teams/[id]/MemberActivityPanel.tsx`** (`'use client'`) — recebe `members/messages/tasks`, chama `computeMemberStats`, renderiza **um card por membro** (ícone/chip de papel reusando `ROLE_ICON`/`ROLE_CHIP`, contadores, mini-board de status das tasks, timeline curta). Estilo idêntico ao resto do `TeamRunView` (cards `rounded-xl border-white/10 bg-white/5`).
3. **`TeamRunView.tsx`** — renderizar o `MemberActivityPanel` (passando `team.members`, `messages`, `tasks`). **Aditivo** — não remove board/feed/topologia. (Como expor: aba vs seção — decisão #1.)

**Padrão de teste — `scripts/v2s4-verify.ts`:** o painel é E2E manual, mas a **agregação pura `computeMemberStats`** é testável. Casos:
- (a) 3 membros (lead/worker/reviewer) + mensagens variadas → `sent`/`received`/breakdown por kind corretos por membro;
- (b) tasks com `assigneeId` distribuídos → cada membro lista só as suas + contagem por status + soma de `retries`;
- (c) **conservação:** Σ `sent` por membro = nº de mensagens com `fromMemberId` não-null; Σ tasks por membro = nº de tasks com `assigneeId` não-null;
- (d) membro sem atividade → zeros (não some da lista); `fromMemberId/assigneeId = null` não vaza pra nenhum membro.
- Mais o **E2E manual do ROADMAP:** rodar time de 3 membros e confirmar que cada membro mostra suas mensagens/tasks/contadores corretos.

### Decisões pra confirmar com o usuário ANTES de codar
1. **Como expor a visão:** (a) **aba/toggle** "Visão geral ↔ Por membro" sobre o bloco board+feed (default "Visão geral", preserva a tela atual) **ou** (b) **seção sempre-visível** "Por membro" adicionada abaixo do feed de atividade? (Recomendado: **(b) seção aditiva** — mais barato, sem reorganizar a página, coerente com o layout de scroll atual; vira aba depois se a tela ficar densa.)
2. **Granularidade da timeline + bucket "Sistema":** timeline = só mensagens do membro (recomendado), e mensagens com `fromMemberId/toMemberId = null` (kind `system`) → **ignorar** ou mostrar num card "Sistema" à parte? (Recomendado: **timeline = mensagens; null → ignorar** no MVP, sem card Sistema — mantém o painel focado nos membros reais.)
3. **Escopo dos contadores:** básico (enviadas/recebidas/por-kind, tasks por status, retries) é suficiente, **ou** incluir derivados como "% de tasks concluídas" / "última atividade"? (Recomendado: **básico + retries**; deixar custo/tokens por membro explicitamente para a **S2.2** — hoje as métricas SSE são agregadas do run, não dá pra ratear por membro sem schema.)

---

## ⚠️ Gotchas de ambiente / implementação

- **NÃO criar rota/evento SSE/query:** tudo que a S2.1 precisa já está em `messages`/`tasks`/`team.members` no `TeamRunView`. Inventar uma rota nova é fora de escopo e quebra o invariante "puro UI".
- **Chave de agrupamento = `TeamMember.id`** (o que vem em `fromMemberId/toMemberId/assigneeId`), **não** `agentId`. O nome vem de `member.agent.name`.
- **`messages` é o log acumulado; `tasks` é o snapshot atual.** A agregação roda sobre o que está no estado no momento (re-deriva a cada render, barato). Não precisa persistir nada.
- **`null` em todo lugar:** `fromMemberId`/`toMemberId`/`assigneeId` podem ser null. O helper tem que ser robusto a isso (caso (d) do verify cobre).
- **`content` chega truncado a 500 / `summary` é o resumo curto** — na timeline usar `summary || content`.
- **Helper puro = testável sem React:** `member-stats.ts` não importa React/DOM, só (opcionalmente) `import type` de [team-types.ts](../../src/lib/orchestration/team/team-types.ts). O `MemberActivityPanel.tsx` (com React) NÃO é importado pelo verify. Mesmo padrão de `model-capabilities.ts` (S1.2) e `roster-mapping.ts` (S1.3).
- **Verificação confiável:** `npx tsx scripts/v2s4-verify.ts` (lógica pura) + `npx tsc --noEmit` (**0 erros**). Rodar antes os baselines verdes: `npx tsx scripts/v2s3-verify.ts` + `v2s2` + `v2s1`. **Não rodar jest.**
- **Pre-commit hook:** typecheck (gate real — bloqueia) + eslint (informativo — NÃO bloqueia). Arquivos novos são TSX/TS limpos; manter sem `any` desnecessário.
- **Commit SELETIVO:** a árvore tem MUITAS mudanças não relacionadas (logos `public/logo*.svg` deletados, dezenas de `docs/**` untracked, `public/logos/kit/**`). `git add` **só** nos arquivos da S2.1 (`member-stats.ts`, `MemberActivityPanel.tsx`, `TeamRunView.tsx`, `scripts/v2s4-verify.ts`). Use pathspec literal pro caminho com colchetes: `git add ':(literal)src/app/dashboard/teams/[id]/TeamRunView.tsx'`.
- **Commit message:** o here-string do PowerShell pode quebrar no passthrough — preferir `git commit -F <arquivo>` (escrever a mensagem num arquivo temp e apontar com `-F`).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S2.1 NÃO precisa de migração** (puro UI, sem schema). Se a S2.2 for adiante depois: host real `postgres://sofia_db:<senha PAzo18**>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta pra OUTRO host — não usar pra migração); `migrate deploy` MANUAL **antes** do push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 2, fatia **S2.1**) + esta nota. **Confirmar comigo as 3 decisões acima ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v2s3-verify.ts` + `v2s2` + `v2s1` pra confirmar baseline verde.
3. Implementar a S2.1 **só em UI** (coordinator/`groq.ts`/rota SSE INTOCADOS): helper puro `member-stats.ts` (`computeMemberStats`), componente `MemberActivityPanel.tsx`, e plugá-lo no `TeamRunView.tsx` (aditivo). Tratar `null` e preservar a tela atual.
4. `scripts/v2s4-verify.ts` (casos a–d, com a asserção de conservação) + `npx tsc --noEmit` limpo. Sem migração.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Parar na S2.1 (não emendar a S2.2 — ela é condicional/opcional e pede schema).

> Comece confirmando comigo as **decisões da S2.1** antes de escrever código.
