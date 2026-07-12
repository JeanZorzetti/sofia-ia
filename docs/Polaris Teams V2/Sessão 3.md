# Polaris Teams V2 — Prompt inicial da Sessão 3

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S1.3 — UI no RosterEditor + persistência de `capabilities` (fecha a Sprint 1).**

---

## Contexto pra continuar (ciclo Polaris Teams V2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2/`** → **`ROADMAP.md`** (executável; leia a **Sprint 1, fatia S1.3**) + `ANALISE-GAP-AGENT-TEAMS-AI.md` (análise). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → **S1.3 🔜**) → Sprint 2 (S2.1) → Sprint 3 (S3.1 → S3.2). **A S1.3 FECHA a Sprint 1.**

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` não mudam. **A S1.3 NÃO toca coordinators NEM `groq.ts`** — é puramente **UI + CRUD de time** (escrever a coluna que a S1.1/S1.2 já leem/usam).
2. **Migração formal + `migrate deploy` manual no host real ANTES do push** (lição SP2/SP3) — **mas a S1.3 NÃO mexe no schema** (a coluna `TeamMember.capabilities Json?` já existe desde a S1.1) → **sem migração nesta fatia.**
3. **Script de verificação** `scripts/v2s3-verify.ts` (convenção `v2s{n}` por fatia incremental: S1.1=v2s1, S1.2=v2s2, **S1.3=v2s3**) — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094). A UI em si valida por **E2E manual** (ROADMAP); o que dá pra cobrir em script puro é o `rosterToMembers` carregando `capabilities`.
4. **Defaults preservam o legado** — membro sem política → `capabilities` ausente/null → comportamento atual. **Não tocar nos toggles = não gravar política.**

### O que JÁ foi feito ✅ (NÃO refazer)

- **S1.1 (commit `ca612d0`, 2026-06-18)** — dados + plumbing. `TeamMember.capabilities Json?` + tipo `CapabilityPolicy` (`{ tools?: boolean; mcpAllowlist?: string[]; toolSkills?: boolean; filesystem?: boolean }`) em [team-types.ts](../../src/lib/orchestration/team/team-types.ts). Flui member → `MemberCtx.capabilities` (carregado no `loadRun` de [team-store.ts](../../src/lib/orchestration/team/team-store.ts), ~linha 141) → `ChatOptions.capabilities` → `chatWithAgent`. Migração `20260618120000_add_team_member_capabilities` **aplicada no host real** `sofia_db@2.24.207.200:5435`.
- **S1.2 (commit `390a693`, 2026-06-18)** — enforcement do gate. Helper **puro** [model-capabilities.ts](../../src/lib/ai/model-capabilities.ts): `modelSupportsTools(model)` (allowlist conservadora + coder/qwen p/ paridade; desconhecido→false=fallback texto), `resolveToolGate(...)` (3-way: `tools:true` liga em qualquer modelo suportado / `tools:false` desliga TUDO mesmo coder / ausente→gate coder legado; sempre `&& !rawText && modelSupportsTools`), `selectApiTools(...)` (filesystem/toolSkills ausente=herda, `false`=exclui; **`mcpAllowlist` filtra por `AgentMcpServer.id`**; sem política→array byte-idêntico ao legado). [groq.ts](../../src/lib/ai/groq.ts) (path OpenRouter) já consome tudo isso. v2s2-verify=16 asserts.
- **Decisão fechada e relevante p/ a S1.3:** a `mcpAllowlist` guarda **`AgentMcpServer.id`** (a junção), NÃO `McpServer.id`. **A UI da S1.3 TEM que gravar `AgentMcpServer.id`** senão o filtro da S1.2 não casa.
- **Pendente (com o usuário):** E2E autenticado de S1.1+S1.2 em prod. Não bloqueia a S1.3.

---

## Onde a S1.3 mexe — a cadeia de persistência (recap do código real)

⚠️ **Descoberta-chave:** hoje **NENHUM** caller do CRUD de time persiste `capabilities` — `create-team.ts` e o PATCH foram escritos **antes** da S1.1. Então a S1.3 precisa **adicionar a escrita** em toda a cadeia, ponta a ponta:

1. **UI — [RosterEditor.tsx](../../src/app/dashboard/teams/RosterEditor.tsx):** o tipo `RosterRow` (`{ agentId, role, model, effort }`) e a função `rosterToMembers(rows)` (linha ~44) montam o payload. Hoje **não há campo de capability**. Cada membro selecionado renderiza um bloco com selects de role/model/effort (linha ~134) — é aí que entram os controles novos.
2. **UI — [page.tsx](../../src/app/dashboard/teams/page.tsx):** dona do estado. `roster`/`editRoster` (`RosterRow[]`), `createTeam` (POST `/api/teams`) e `saveEdit` (PATCH `/api/teams/[id]`) chamam `rosterToMembers(...)`. **`openEdit` (linha ~239) hidrata `editRoster` a partir de `json.data.members` mas HOJE descarta `capabilities`** → precisa incluir. `agents` vem de `/api/agents` (só `{id,name}` = `AgentLite`).
3. **Validação — [validation.ts](../../src/lib/validation.ts):** `teamMemberSchema` (linha ~89) tem `agentId/role/model/effort/position`. **Adicionar `capabilities`** (zod nullish do shape de 4 campos opcionais). `z.object` por padrão **remove chaves desconhecidas** → sem isso o campo é silenciosamente dropado no parse.
4. **Tipo de domínio — [team-roster.ts](../../src/lib/orchestration/team/team-roster.ts):** `RosterInput` — adicionar `capabilities?: CapabilityPolicy | null`. `validateRoster` é permissivo (só roles/lead/worker); **não precisa de regra nova** (opcional: validar que `mcpAllowlist` é `string[]`).
5. **Persistência (create) — [create-team.ts](../../src/lib/orchestration/team/create-team.ts):** o `members.create.map` (linha ~42) — adicionar `capabilities: m.capabilities ?? undefined`.
6. **Persistência (update) — [api/teams/[id]/route.ts](../../src/app/api/teams/[id]/route.ts):** o PATCH **substitui** o roster via `deleteMany + createMany` (linha ~51). O `createMany.data.map` (linha ~54) — adicionar `capabilities: m.capabilities ?? undefined`.
7. **Fonte do multiselect MCP — [api/agents/[id]/mcp/route.ts](../../src/app/api/agents/[id]/mcp/route.ts) `GET` (JÁ EXISTE):** retorna `{ success, data: connections }` onde cada `connection` é um `AgentMcpServer` row com `{ id (= o amsId que vai pra allowlist), mcpServerId, enabled, mcpServer: { id, name, tools[] } }`. A UI faz fetch disso **por agente** (lazy, ao expandir o membro) pra listar os servers; os `connection.id` marcados viram `mcpAllowlist`.

**Por que o runtime "só funciona" depois disso:** `team-store.ts` já lê `m.capabilities` no `loadRun` e a S1.2 já enforça o gate. Ou seja: **assim que a coluna for gravada, o comportamento liga sozinho** — a S1.3 é o último elo (a escrita).

---

## Foco desta sessão: S1.3 — UI no RosterEditor 🔜

**Objetivo (ROADMAP, fatia S1.3):** por membro no RosterEditor, um toggle "habilitar ferramentas" + multiselect dos MCP servers configurados naquele `Agent` (→ `mcpAllowlist`) + toggles tool-skills/filesystem; persistir em `TeamMember.capabilities` via o CRUD existente.

**Mudanças concretas (arquivo a arquivo):**
1. **`RosterEditor.tsx`** — estender `RosterRow` com a política; renderizar os controles por membro selecionado; `rosterToMembers` inclui `capabilities` (omitindo quando "herdar" = sem política, pra preservar o legado). Buscar os MCP servers do agente via `GET /api/agents/[id]/mcp` (lazy, cacheado por `agentId`).
2. **`page.tsx`** — `openEdit` hidrata `capabilities` de volta no `editRoster` (`GET /api/teams/[id]` já retorna `members[].capabilities`, pois `include: { members }` traz os escalares).
3. **`validation.ts`** — `capabilities` no `teamMemberSchema`.
4. **`team-roster.ts`** — `capabilities?` em `RosterInput`.
5. **`create-team.ts`** + **`api/teams/[id]/route.ts`** — gravar `capabilities` no create e no createMany do PATCH.

**Padrão de teste — `scripts/v2s3-verify.ts`:** a UI é E2E manual, mas o **mapeamento puro `rosterToMembers`** é testável. Casos:
- (a) membro com toggle de tools + `mcpAllowlist` de ams-ids + toolSkills/filesystem → `rosterToMembers` produz o `capabilities` correto no payload;
- (b) membro "herdar" (sem tocar toggles) → `capabilities` ausente/undefined (legado preservado — sem chave no payload);
- (c) `tools:false` explícito serializa como `{ tools:false }` (gate da S1.2 desliga tudo);
- (d) (se extrair um helper de mapeamento connection→option) assert que o id usado é `AgentMcpServer.id`, não `McpServer.id`.
Mais o **E2E manual do ROADMAP:** criar time, habilitar MCP só no Worker, rodar e confirmar no feed que o Worker invocou a tool e o Reviewer não.

### Decisões pra confirmar com o usuário ANTES de codar
1. **Shape no `RosterRow`:** carregar a política como objeto aninhado `caps?: CapabilityPolicy` (1:1 com o que persiste, mapeamento mínimo) **ou** campos planos (`toolsEnabled`, `mcpAllowlist`, …) no estado da UI? (Recomendado: **aninhado `caps?: CapabilityPolicy`** — espelha o DB e o `rosterToMembers` fica trivial.)
2. **UX do controle de ferramentas (como expor "herdar vs ligar vs desligar"):** um seletor por membro com 3 estados — **Herdar** (default, não grava política = legado) / **Ligar** (`tools:true`, revela sub-toggles MCP/tool-skills/filesystem) / **Desligar** (`tools:false`, mata tudo mesmo em coder)? (Recomendado: **sim, tri-estado**, default "Herdar"; sub-controles só aparecem em "Ligar".)
3. **Fetch dos MCP servers do agente:** lazy por-agente em `RosterEditor` (fetch ao expandir/ligar tools, cacheado por `agentId`) **ou** pré-carregar todos em `page.tsx`? (Recomendado: **lazy + cache por agentId** — agentes podem ter 0..N servers; evita N fetches ao abrir o modal.)

---

## ⚠️ Gotchas de ambiente / implementação

- **Prisma Json + null (create/createMany):** pra "sem política" preferir **`capabilities: m.capabilities ?? undefined`** (omite o campo → coluna fica NULL = legado). Passar `null` cru num campo `Json?` pode exigir `Prisma.DbNull`/`Prisma.JsonNull` e dar atrito de tipo — `undefined` evita isso. **Não** usar `JsonNull` (gravaria o JSON `'null'`, não SQL NULL).
- **`z.object` dropa chaves desconhecidas:** se esquecer de adicionar `capabilities` ao `teamMemberSchema`, o `parseJson` remove o campo **silenciosamente** e nada persiste (sintoma: toggles não "pegam"). Adicionar o campo no zod é obrigatório.
- **`AgentMcpServer.id` vs `McpServer.id`:** a allowlist e o filtro da S1.2 usam **AgentMcpServer.id**. O `GET /api/agents/[id]/mcp` retorna `connection.id` = AgentMcpServer.id (use ESSE). O `connection.mcpServer.id` é outro id (entra só no NOME da tool) — **não** usar na allowlist.
- **Verificação confiável:** `npx tsx scripts/v2s3-verify.ts` (lógica pura) + `npx tsc --noEmit` (deve dar **0 erros** — na S1.2 o projeto inteiro tipou limpo). **Não rodar jest.**
- **Pre-commit hook:** typecheck (gate real — bloqueia) + eslint (informativo — NÃO bloqueia). `RosterEditor.tsx`/`page.tsx` são TSX limpos; garanta que suas linhas novas não somem erros de eslint (ao contrário do `groq.ts` legado, que cospe ~40 `any` pré-existentes).
- **Commit SELETIVO:** a árvore tem mudanças não relacionadas (logos `public/logo*.svg` deletados, vários `docs/**` untracked — **22 entradas** na última sessão). `git add` **só** nos arquivos da S1.3.
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S1.3 não precisa de migração** (coluna já existe). Se por algum motivo precisar: host real `postgres://sofia_db:<senha PAzo18**>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta pra OUTRO host — não usar pra migração); `migrate deploy` MANUAL **antes** do push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 1, fatia **S1.3**) + esta nota. **Confirmar comigo as 3 decisões acima ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v2s2-verify.ts` + `npx tsx scripts/v2s1-verify.ts` + `npx tsx scripts/g6-verify.ts` pra confirmar baseline verde.
3. Implementar a S1.3 **só em UI + CRUD** (coordinators/`groq.ts` INTOCADOS): `RosterEditor.tsx` (controles + fetch MCP), `page.tsx` (hidratação no edit), `validation.ts` + `team-roster.ts` (campo `capabilities`), `create-team.ts` + `api/teams/[id]/route.ts` (gravar). Preservar legado (sem toggle = sem política). Gravar **AgentMcpServer.id** na allowlist.
4. `scripts/v2s3-verify.ts` (casos a–d) + `npx tsc --noEmit` limpo. Sem migração.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Fecha a Sprint 1** — parar na S1.3 (não emendar a S2.1).

> Comece confirmando comigo as **decisões da S1.3** antes de escrever código.
