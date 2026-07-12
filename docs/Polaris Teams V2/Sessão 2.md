# Polaris Teams V2 — Prompt inicial da Sessão 2

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S1.2 — Enforcement do gate de capacidade (comportamento).**

---

## Contexto pra continuar (ciclo Polaris Teams V2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2/`** → **`ROADMAP.md`** (executável; leia a **Sprint 1**) + `ANALISE-GAP-AGENT-TEAMS-AI.md` (análise). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → **S1.2 🔜** → S1.3) → Sprint 2 (S2.1) → Sprint 3 (S3.1 → S3.2).

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) não mudam de comportamento. Extensões entram por **injeção no `options` (4º param do `ChatFn`)** ou pelos callers. **A S1.2 NÃO toca os coordinators** — toda a mudança é dentro de `chatWithAgent` (groq.ts).
2. **Migração formal + `migrate deploy` manual no host real ANTES do push** (lição SP2/SP3) — **mas a S1.2 NÃO mexe no schema** (a coluna `capabilities` já existe desde a S1.1) → **sem migração nesta fatia.**
3. **Script de verificação** `scripts/v2sN-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — todo caminho novo é opt-in; membro sem política cai no comportamento atual.

### O que JÁ foi feito ✅ — S1.1 (commit `ca612d0`, 2026-06-18) — NÃO refazer

Fatia S1.1 = **dados + plumbing da política de capacidade por membro, SEM mudança de comportamento.** Já está em prod (pushed na main, migração aplicada). O que já existe e a S1.2 vai **consumir**:

- **Tipo `CapabilityPolicy`** em [team-types.ts](../../src/lib/orchestration/team/team-types.ts): `{ tools?: boolean; mcpAllowlist?: string[]; toolSkills?: boolean; filesystem?: boolean }`. Todos os campos opcionais → ausência = legado.
- **Fluxo já fiado member → opts → chatWithAgent:** `MemberCtx.capabilities` (carregado no `loadRun` de [team-store.ts](../../src/lib/orchestration/team/team-store.ts)) → os **4 call sites** de cada coordinator (lead plan/consolidação, worker, reviewer) já passam `capabilities: <member>.capabilities` no `options` → `ChatOptions.capabilities`.
- **`chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)) já LÊ a política** (hoje de forma **inerte**): logo após `const { prisma } = await import(...)` existe:
  ```ts
  const capabilityPolicy: CapabilityPolicy | null = options?.capabilities ?? null
  if (capabilityPolicy && process.env.DEBUG_TEAM_CAPABILITIES === '1') { console.log(...) }
  ```
  A assinatura de `options` já inclui `capabilities?: CapabilityPolicy | null`. **A S1.2 só precisa USAR `capabilityPolicy` para mudar o gate** — a fiação toda já está pronta.
- **Schema:** `TeamMember.capabilities Json?` + migração `20260618120000_add_team_member_capabilities` **já aplicada no host real** `sofia_db@2.24.207.200:5435`. Prisma Client local já regenerado.
- Verificação da S1.1: [scripts/v2s1-verify.ts](../../scripts/v2s1-verify.ts) (20 asserts) + g6-verify (35, regressão). **Rode os dois no começo pra confirmar baseline verde.**
- **Pendente da S1.1 (com o usuário):** E2E autenticado em prod após o deploy concluir. Não bloqueia a S1.2.

---

## Onde a S1.2 mexe — o gate de tools em `chatWithAgent` (recap do código real)

Tudo vive **dentro do path OpenRouter** — o `if (agent.model.includes('/')) { ... }` em [groq.ts](../../src/lib/ai/groq.ts) (~linha 397). **Só esse path tem o loop de tools (ReAct);** Groq/Ollama/Claude-CLI **não** têm function-calling nativo → ficam no **backlog** (não é desta fatia).

**1) O gate atual** (hoje ~linhas 417-418, logo dentro do try do OpenRouter):
```ts
const isCoderModel = agent.model.includes('coder') || agent.model.includes('qwen')
let toolsEnabled = isCoderModel && !options?.rawText
```

**2) A montagem das tool defs** (hoje ~linhas 442-466):
- `toolSkillDefinitions` = `agentSkills` filtrados por `skill.type === 'tool'` → function defs.
- `mcpToolDefinitions` = `agentMcpServers.flatMap(...)`; cada tool vira `{ name: 'mcp__' + ams.mcpServer.id.slice(0,8) + '__' + tool.name, ... }`.
- `allTools = [...readOnlyToolDefinitions, ...toolSkillDefinitions, ...mcpToolDefinitions]`
- `apiTools = toolsEnabled ? allTools : undefined`

**Proteção que NÃO pode regredir:** `rawText` (code-runs) força completion plano — o code-team escreve no sandbox via `@RUN`/blocos markdown, então tool de FS do provider seria errado. **`&& !options?.rawText` tem que continuar valendo sempre.**

---

## Foco desta sessão: S1.2 — Enforcement do gate (comportamento) 🔜

**Objetivo (do ROADMAP, fatia S1.2):** soltar a execução de tools do gate `isCoderModel` quando o membro tem política, e escopar as tools pela política — preservando `rawText`/sandbox e caindo gracioso quando o modelo não suporta function calling.

**Mudanças concretas (dentro de `chatWithAgent`, path OpenRouter):**
1. Trocar `toolsEnabled = isCoderModel && !rawText` por:
   ```
   toolsEnabled = (capabilityPolicy?.tools === true || isCoderModel) && !rawText && modelSupportsTools(agent.model)
   ```
2. **`modelSupportsTools(model)`** — helper novo (lista/flag dos modelos OpenRouter que suportam function calling, com **fallback gracioso**: modelo sem suporte → tools off, cai em texto, **sem crashar**). Provavelmente em `src/lib/ai/` (ex.: `model-capabilities.ts`), função **pura** e testável.
3. **Filtrar as defs pela política antes de montar `apiTools`:**
   - `toolSkillDefinitions` → incluídas só se `capabilityPolicy?.toolSkills !== false` (definir a semântica: opt-in vs herdar; ver decisão #2).
   - `mcpToolDefinitions` → se `capabilityPolicy?.mcpAllowlist` existe, manter só os servers cujo id está na allowlist. **⚠️ Cuidar o id:** o nome da tool usa `ams.mcpServer.id` (o McpServer), mas o ROADMAP descreve a allowlist como **"ids de AgentMcpServer"** (a junção). Confirmar qual id a UI da S1.3 vai gravar e filtrar pelo mesmo. Alinhar com o multiselect que a S1.3 fará no RosterEditor.
   - `readOnlyToolDefinitions` (filesystem) → gated por `capabilityPolicy?.filesystem` quando houver política (senão legado).

**Padrão de teste (importante p/ ser testável sem DB/rede):** `chatWithAgent` busca Agent no Prisma e chama OpenRouter — **não dá pra testar o end-to-end via tsx.** Então **extraia a decisão pura**: ex. `resolveToolGate({ capabilities, isCoderModel, rawText, modelSupportsTools })` → `boolean`, e `selectApiTools({ capabilities, toolSkillDefs, mcpDefs, readOnlyDefs })` → array filtrado. O `chatWithAgent` chama essas funções; o verify testa as funções puras. (Mesmo padrão de `team-board.ts`/`team-graph-agenda.ts`.)

**Verificação — `scripts/v2s2-verify.ts`** (nome no ROADMAP; é da fatia S1.2, não da Sprint 2 — convenção `v2s{n}` por fatia incremental). Casos exigidos:
- (a) member com `tools:true` em modelo **não-coder** (mas suportado) → gate habilita function calling;
- (b) `mcpAllowlist` filtra os MCP servers (só os permitidos entram em `apiTools`);
- (c) `rawText`/code-run **não regride** (tools off mesmo com `tools:true`);
- (d) modelo **sem** suporte a tools → cai em texto, sem crash;
- (e) regressão: member **sem** política + modelo coder → idêntico ao legado (`isCoderModel` ainda liga).

### Decisões pra confirmar com o usuário ANTES de codar
1. **`modelSupportsTools`:** allowlist explícita de modelos OpenRouter conhecidos por suportar tools, ou heurística + fallback? (Recomendado: allowlist pequena + default conservador, pra não habilitar tool-calling em modelo que vai 400.)
2. **Semântica dos flags da política:** `toolSkills`/`filesystem` **ausentes** = herdam o gate legado (ligam junto com `toolsEnabled`) ou = **off** até marcados? E `tools:false` explícito desliga tudo mesmo em modelo coder? (Recomendado: ausente = herda; `false` explícito = desliga.)
3. **Id da `mcpAllowlist`:** `AgentMcpServer.id` (junção) vs `McpServer.id` — alinhar com o que a S1.3 vai gravar.

---

## ⚠️ Gotchas de ambiente desta máquina

- **Nesta sessão (S1.1) FUNCIONARAM normalmente** (OneDrive não travou): `npx prisma generate` (484ms), `npx tsx scripts/v2s1-verify.ts`, `npx tsc --noEmit` (exit 0) e `npx prisma migrate deploy`/`migrate status` com `DATABASE_URL` inline. Ou seja: **`npx prisma ...` funcionou** (contra avisos antigos de "não reconhecido"). Ainda assim, se algum comando travar com `UNKNOWN read`/errno -4094, é corrupção de `node_modules` pelo OneDrive — não insista, diagnostique.
- **Verificação confiável:** `npx tsx scripts/*.ts` (lógica pura) + `npx tsc --noEmit`. **Não rode jest.** `tsc` pode acusar erros de deps opcionais não instaladas (bullmq/e2b/xterm/diff2html) — ignorar; o que importa são os arquivos da fatia.
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. O `groq.ts` é legado e cospe ~40 erros de `no-explicit-any`/`prefer-const` **pré-existentes** — o commit passa mesmo assim. **Não "conserte" esses any de passagem;** só garanta que SUAS linhas novas não somem erros.
- **Commit SELETIVO:** a árvore tem mudanças não relacionadas (logos `public/logo*.svg` deletados, vários `docs/**` untracked) — **NÃO** entram no commit da fatia. `git add` só nos arquivos da S1.2.
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S1.2 não precisa de migração** (sem mudança de schema). Se por algum motivo precisar: host real `postgres://sofia_db:<senha PAzo18**>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta pra OUTRO host — não usar pra migração); `npx prisma migrate deploy` com `DATABASE_URL` inline; `migrate deploy` MANUAL **antes** do push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 1, fatia **S1.2**) + esta nota. **Confirmar comigo as 3 decisões acima ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v2s1-verify.ts` e `npx tsx scripts/g6-verify.ts` pra confirmar baseline verde.
3. Implementar a S1.2 **só em `chatWithAgent`/helpers de `src/lib/ai/`** (coordinators INTACTOS): extrair gate/seleção de tools puros + religar; `modelSupportsTools` com fallback gracioso; filtrar tool-skills/MCP/filesystem pela política; **preservar `rawText`/sandbox**.
4. `scripts/v2s2-verify.ts` (casos a–e) + `npx tsc --noEmit` limpo. Sem migração.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S1.2** (não emendar a S1.3).

> Comece confirmando comigo as **decisões da S1.2** antes de escrever código.
