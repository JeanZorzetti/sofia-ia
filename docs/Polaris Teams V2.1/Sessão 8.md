# Polaris Teams V2.1 — Prompt inicial da Sessão 8

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S3.3 — advisory por membro (`quota_exhausted` / `rate_limited` / `provider_overloaded`) no painel "Por membro" (Sprint 3 · Tema F3). Esta fatia é SÓ UI — NÃO tem schema/migração.** É a **última fatia do ciclo V2.1** (fecha o Sprint 3).

---

## Contexto pra continuar (ciclo Polaris Teams V2.1)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.1/`** → **`ROADMAP.md`** (executável; leia a **Sprint 3, fatia S3.3**, linhas 86-88) + `ANALISE-GAP-V2.1.md` (análise; tese central = **eixo-autonomia**). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅) → Sprint 2 (S2.1 ✅ → S2.2 ✅) → **Sprint 3 (S3.1 ✅ → S3.2 ✅ → S3.3 🔜 = ÚLTIMA)**.

**🏁 Sprint 1 + 🏁 Sprint 2 + 🏁 S3.1 + 🏁 S3.2 COMPLETOS.** A S3.3 **fecha o Sprint 3 e o ciclo V2.1 inteiro**: chip de advisory por membro no painel "Por membro" derivado do erro de provider que o `chat()` já levanta (rate-limit / quota / overload). **Natureza: SÓ UI — sem schema, sem migração, sem engine nova.** É surface do que já existe.

**Invariantes (valem pra toda fatia):**
1. **Coordinator + agenda do DAG INTACTOS** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)), `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) e `buildAgenda`/`deriveTaskAction` **não mudam de comportamento**. O advisory é leitura/derivação de um erro que JÁ é levantado e JÁ termina o run como `rate_limited`; nada novo é injetado no fluxo de execução.
2. **SEM migração** — esta fatia não toca o schema. (Contraste com S3.1/S3.2, que tinham coluna nova + `migrate deploy` manual.) Se a abordagem escolhida exigir persistir atribuição por-membro, isso vira schema → **pare e reconfirme comigo**: o desenho do ROADMAP é explicitamente "sem nova engine, surface do que já existe".
3. **Defaults preservam o legado** — run sem erro de provider = **nenhum chip** = painel idêntico ao de hoje. Regressão sempre verificada.
4. **Verificação:** `scripts/v21s7-verify.ts` (classificador PURO de erro → categoria, asserts + `tsc` limpo, sem jest) **e/ou** E2E manual (forçar 429 num membro e confirmar o chip). O número `v21s7` é desta fatia.

### O que JÁ foi feito ✅ — Sprint 1 + Sprint 2 + S3.1 + S3.2 — NÃO refazer

- **S1.1 (commit `3e2f3ed`):** tool loop no path **Groq nativo** (helpers `buildAgentToolDefs`+`executeAgentToolCall` em [agent-tools.ts](../../src/lib/ai/agent-tools.ts)). `scripts/v21s1-verify.ts` (12 asserts).
- **S1.2 (commit `e37a4ef`):** tool loop no path **Ollama** ([groq.ts](../../src/lib/ai/groq.ts)). `scripts/v21s2-verify.ts` (15 asserts).
- **S1.3 (commit `565d4c8`):** `CapabilityPolicy` → **flags do Claude CLI**. Helper PURO [cli-tool-flags.ts](../../src/lib/ai/cli-tool-flags.ts). `scripts/v21s3-verify.ts` (6 casos).
- **S2.1 (commit `3d4a55a`):** persistência da timeline por task. Coluna `TeamTask.historyEvents Json?`. Helper PURO [task-history.ts](../../src/lib/orchestration/team/task-history.ts). `scripts/v21s4-verify.ts`.
- **S2.2 (commit `6e23fce`):** timeline na UI (card expandível inline no kanban). Helper PURO [task-event-view.ts](../../src/lib/orchestration/team/task-event-view.ts). Rota SSE re-emite o board quando `historyEvents.length` muda. Sem schema.
- **S3.1 (commit `021c713`):** **workflow por membro** (`TeamMember.workflow`, migração `20260619140000` manual em prod). Helper PURO [member-workflow.ts](../../src/lib/orchestration/team/member-workflow.ts) `appendMemberWorkflow`. UI textarea no RosterEditor. `scripts/v21s5-verify.ts` (4 casos).
- **S3.2 (commit `2063f1b`, 2026-06-19) — ✅ RELATIONS DE TASK `blocks`/`related` (Tema F2):**
  - **Decisões de design (confirmadas com o usuário):** (a) `blocks` = **DERIVADO read-side** (inverso de `dependsOn`, sem coluna, não pode dessincronizar); (b) `related` = **coluna nova `team_tasks.related` text[]** + **diretiva `@TASK [related:#n]`** (espelha `[after:#n]`); (c) navegação = **clicar no chip rola até o card alvo + flash**.
  - **Schema:** `TeamTask.related String[] @default([]) @map("related")` (migração `20260619150000_add_team_task_relations` **aplicada manual em prod** no host `2.24.207.200:5435` ANTES do push; coluna confirmada `text[]` NOT NULL default `'{}'`, `teamTask.count()`=60 OK, task legada = `related:[]`). **`blocks` NÃO tem coluna.**
  - **Data-flow do `related` (espelha `dependsOn` ponta-a-ponta):** parser [team-protocol.ts](../../src/lib/orchestration/team/team-protocol.ts) (`extractDirectives` aceita `[after:]` **e** `[related:]`) → `LeadAction.related?: number[]` ([team-types.ts](../../src/lib/orchestration/team/team-types.ts)) → graph-executor resolve display-id→real-id ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts), ao lado de `dependsOn`) → `CreateTaskInput.related` + `TaskRow.related?` no store ([team-store.ts](../../src/lib/orchestration/team/team-store.ts) `createTask`/`listTasks`) → SSE seleciona+envia `related` ([stream/route.ts](../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts)) → board.
  - **Helper PURO** [task-relations.ts](../../src/lib/orchestration/team/task-relations.ts) `deriveTaskRelations(tasks)` → `Map<id,{blocks,related}>`: `blocks` = inverso de `dependsOn`; `related` = **união simétrica** (declarado ∪ apontado de volta); self-ref + dangling descartados. Consumido client-side no [TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx) (chips clicáveis "depende de"/"bloqueia"/"relacionada" → `gotoTask` faz `scrollIntoView` + ring transitório 1.5s).
  - **DAG/agenda INTACTOS:** `depsSatisfied` ([team-board.ts](../../src/lib/orchestration/team/team-board.ts)) gateia **só por `dependsOn`** — `related`/`blocks` são DISPLAY-only e nunca entram no gate. Prompt do Lead ganhou doc do `[related:#n]` ([team-prompts.ts](../../src/lib/orchestration/team/team-prompts.ts)).
  - **Regressão:** board sem relações → zero chips = card legado. `TaskRow.related` é **opcional** (coluna NOT NULL → store real sempre popula; literais de teste in-memory seguem válidos, lidos como `related ?? []`). `scripts/v21s6-verify.ts` (5 casos: inverso de blocks / simetria de related / regressão / parser `[related:#n]` / `depsSatisfied` ignora related) + `tsc --noEmit` **0 erros**. v21s1-s5 inalterados.
- **Pendente das S1.x/S2.x/S3.1/S3.2 (com o usuário):** **E2E autenticado em prod** acumulado — (S1.x) Groq/Claude tool-capable; (S2.x) timeline por task no card; (S3.1) workflow por membro afetando comportamento; (S3.2) rodar time grafo com `@TASK [after:]`/`[related:]`, abrir task e confirmar que chips de dependência/bloqueio/relação aparecem e **navegam** (clicar rola+flash), task sem relações = board idêntico. **Não bloqueia a S3.3.**

---

## O que é a S3.3 (o mapa exato — leia antes de codar)

**Objetivo:** quando um membro do time bate num erro de provider (limite/quota/overload), mostrar um **chip de advisory naquele membro** no painel "Por membro" — uma das categorias `quota_exhausted` / `rate_limited` / `provider_overloaded`. Run sem erro = nenhum chip (legado). **SÓ UI, sem engine nova.**

**O que JÁ existe hoje (= a matéria-prima):**
1. **O erro é levantado e classificado:** `isRateLimit(err)` ([team-board.ts:48](../../src/lib/orchestration/team/team-board.ts#L48)) reconhece `ClaudeRateLimitError` (do failover [claude-token-pool.ts](../../src/lib/ai/claude-token-pool.ts)) + regex `hit your limit|rate limit|too many requests|429`. Os dois coordinators capturam e **terminam o run como `rate_limited`** (`RunStatus`), gravando a string `error`.
2. **O erro aflora no SSE:** a rota seleciona `status`/`error` e os entrega ([stream/route.ts](../../src/app/api/teams/[id]/runs/[runId]/stream/route.ts)); o [TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx) já guarda `runError`/`status` em estado.
3. **O painel por-membro existe:** [MemberActivityPanel.tsx](../../src/app/dashboard/teams/[id]/MemberActivityPanel.tsx) (V2 S2.1) renderiza um card por membro a partir de `members`/`messages`/`tasks`/`usageByMember`; agregação PURA em [member-stats.ts](../../src/app/dashboard/teams/[id]/member-stats.ts). **É aqui que o chip entra.**

**⚠️ A decisão de design central a confirmar comigo (regra global #2) — ATRIBUIÇÃO por membro SEM schema:** o erro hoje é **run-level** (`TeamRun.error`/`status`), não por-membro. Pra virar "chip NAQUELE membro" sem coluna nova, há candidatos — leve ao usuário antes de codar:
- **(A) Membro provável = último a agir** quando o run terminou `rate_limited` (último `TeamMessage.fromMemberId`, ou membro com task em `doing`/`review` não-terminal). Heurística read-side, zero schema.
- **(B) Advisory run-level espelhado no cabeçalho do painel** (não por card) — mais honesto (não inventa atribuição), menos granular. Também zero schema.
- **(C) Persistir o membro culpado** (ex.: `TeamRun.errorMemberId` ou campo no `error` Json) — **isso é schema → fora do escopo "só UI"; só com reconfirmação explícita.**
- **Classificação:** um **helper PURO** novo (ex.: `provider-advisory.ts` `classifyProviderError(error, status) → 'quota_exhausted' | 'rate_limited' | 'provider_overloaded' | null`) que refina a string/erro nas 3 categorias (quota/limite esgotado vs rate-limit temporário vs overload do provider). `null` = sem advisory = sem chip (regressão). Isso é o coração testável da fatia (v21s7).

**Escopo de UX a confirmar:** texto/tom do chip (ícone + label curto, ex.: ⚠ "limite atingido"), e se há ação (ex.: tooltip explicando) ou é puramente informativo.

**Verificação `scripts/v21s7-verify.ts`:** (a) `classifyProviderError` mapeia amostras reais de erro (mensagens do `claude-token-pool`/regex do `isRateLimit`) → a categoria certa; (b) erro desconhecido / run OK → `null` (sem chip = regressão); (c) se a atribuição for read-side (opção A), asserir o helper que escolhe o membro a partir de mensagens/tasks. `tsc --noEmit` limpo. **Alternativa/complemento:** E2E manual forçando 429.

---

## ⚠️ Sem migração (esta fatia NÃO tem)
- Nada de schema/`prisma migrate`/`migrate deploy`. Se a abordagem escolhida pedir persistência (opção C acima), **pare e reconfirme** — o ROADMAP pede surface do que já existe.
- **Rode `npx prisma generate`** só se mexer em algo que dependa do client (não deve precisar nesta fatia).

## ⚠️ Gotchas de ambiente desta máquina (valeram nas S1.x/S2.x/S3.1/S3.2)
- **Verificação confiável:** `npx tsx scripts/v21s7-verify.ts` (lógica pura) + `npx tsc --noEmit`. **Não rode jest** (`UNKNOWN read`/errno -4094 = corrupção de `node_modules` pelo OneDrive).
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. Há `no-explicit-any` **pré-existentes** (groq.ts ~34; TeamRunView linhas ~279-280 nos casts do `TeamOutputsPanel`; `set-state-in-effect` no `loadTeam`) que o hook lista mas NÃO bloqueia — **ignorar, não consertar de passagem**.
- **Commit SELETIVO:** a árvore tem coisa não relacionada (logos deletados `public/logo*.svg`, `public/logos/kit/*.png` novos, vários `docs/**` untracked incl. as próprias `Sessão N.md`). **`git add` só nos arquivos da S3.3** (helper `provider-advisory.ts` + MemberActivityPanel/TeamRunView + `v21s7-verify.ts` + eventual `member-stats.ts` se a atribuição morar lá).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 3, fatia **S3.3**, linhas 86-88) + esta nota + os anchors acima. **Decisões de design → confirmar comigo** (regra global #2) **antes de codar**: (a) **atribuição** do erro a um membro (opção A heurística read-side / B advisory run-level no cabeçalho / C persistir = fora de escopo); (b) UX do chip (label/ícone/tooltip).
2. Rodar `npx tsx scripts/v21s6-verify.ts` (e v21s1-s5) pra confirmar baseline verde.
3. Implementar o **helper PURO** de classificação (`classifyProviderError`) + a derivação de atribuição escolhida (se read-side) + o **chip no `MemberActivityPanel`** (e/ou cabeçalho). Run sem erro = sem chip (regressão). **Coordinator/agenda INTACTOS; sem schema.**
4. `npx tsc --noEmit` limpo + `scripts/v21s7-verify.ts` verde.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **🏁 Isto FECHA o Sprint 3 e o ciclo V2.1** — não há S3.4. Atualizar o `ROADMAP.md` (marcar S3.3 ✅) e, se quiser, escrever uma nota de fechamento do ciclo (não uma "Sessão 9", já que o ciclo encerra). Se surgir novo escopo, ele entra do **Backlog explícito** do ROADMAP (resume/tool-approval, cross-team `@HANDOFF`, comments por task, drag-drop, multi-reviewer) — **só com instrução**.
6. **E2E manual (com o usuário):** forçar um 429/limite num membro (ex.: OpenRouter `:free` sob rajada, ou Claude sem token no pool) e confirmar o chip de advisory na categoria certa; run sem erro = painel idêntico ao atual. (Junto, se ainda não feito, fechar o E2E acumulado das S1.x/S2.x/S3.1/S3.2.)

> Comece confirmando comigo a **decisão de atribuição da S3.3 (heurística read-side por membro vs advisory run-level no cabeçalho?)** e a UX do chip — antes de escrever código. E lembre: **esta fatia é SÓ UI — sem schema/migração. É a última do ciclo V2.1.**
