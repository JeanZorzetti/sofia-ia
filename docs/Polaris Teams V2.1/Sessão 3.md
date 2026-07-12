# Polaris Teams V2.1 — Prompt inicial da Sessão 3

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S1.3 — Política → flags nos providers-agente (Claude CLI / Opencode CLI).**

---

## Contexto pra continuar (ciclo Polaris Teams V2.1)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.1/`** → **`ROADMAP.md`** (executável; leia a **Sprint 1, fatia S1.3**) + `ANALISE-GAP-V2.1.md` (análise; a tese central é o **eixo-autonomia**). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → **S1.3 🔜, ou defer ao backlog — ver decisão #0**) → Sprint 2 (S2.1 → S2.2) → Sprint 3 (S3.1 → S3.2 → S3.3).

**O gap que o Sprint 1 fecha:** o V2 S1 entregou a **política de capacidade por membro**, mas a **execução** de tools só rodava no path **OpenRouter**. A **S1.1 destravou o Groq nativo** e a **S1.2 destravou o Ollama** (ambos OpenAI-compatible → a Polaris monta o loop de function-calling ela mesma e a política encaixa sem redesenho). **A S1.3 é de natureza DIFERENTE:** os providers-agente (**Claude CLI / Opencode CLI**) **já executam tools nativas** — aqui não se monta loop, **traduz-se a política em flags do CLI**. E tem um **caveat de FS do host** em chat-runs que pode tornar a fatia cara (ver decisão #0).

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) não mudam. A S1.3 mexe em: o helper PURO novo de montagem de flags, os dois services CLI ([claude-cli-service.ts](../../src/services/claude-cli-service.ts), [opencode-cli-service.ts](../../src/services/opencode-cli-service.ts)), o sandbox CLI ([sandbox-cli-agent.ts](../../src/lib/orchestration/team/sandbox-cli-agent.ts)) e o plumbing em `chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)) + callers. **Coordinator não.**
2. **Migração formal + `migrate deploy` manual ANTES do push** (lição SP2/SP3) — **mas a S1.3 NÃO mexe no schema** (a política `capabilities` já existe desde o V2 S1) → **sem migração nesta fatia.**
3. **Script de verificação** `scripts/v21s3-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — todo caminho novo é opt-in; membro sem política / contexto sem mudança cai no comportamento atual. **Regressão: sem `capabilities` = byte-idêntico ao atual** (mesmas flags de hoje).

### O que JÁ foi feito ✅ — S1.1 + S1.2 — NÃO refazer, a S1.3 NÃO reusa o loop (natureza diferente)

- **S1.1 (commit `3e2f3ed`, 2026-06-19):** loop de tools no **path Groq nativo**. Extraiu os helpers compartilhados `buildAgentToolDefs` + `executeAgentToolCall` ([agent-tools.ts](../../src/lib/ai/agent-tools.ts)) e `modelSupportsTools` passou a reconhecer ids Groq (`GROQ_TOOL_CAPABLE_PREFIXES`). Verificação: `scripts/v21s1-verify.ts` (12 asserts).
- **S1.2 (commit `e37a4ef`, 2026-06-19):** loop de tools no **path Ollama** ([groq.ts](../../src/lib/ai/groq.ts), bloco `// ── Ollama com tools por política de capacidade (Teams V2.1 — S1.2) ──`). `modelSupportsTools` trata o prefixo `ollama/` (strip de `ollama/` + da tag `:`, allowlist conservadora `OLLAMA_TOOL_CAPABLE_PREFIXES` = llama3.1/3.2/3.3, qwen2.5/qwen3, mistral/mixtral, command-r(+plus), firefunction-v2, hermes3, llama3-groq-tool-use). `rawText` força completion plana. Verificação: `scripts/v21s2-verify.ts` (15 asserts) + `tsc` limpo. Sem schema/migração. Coordinator intacto.
- **Pendente das S1.1/S1.2 (com o usuário):** E2E autenticado em prod (rodar time com Worker Groq/Ollama tool-capable e confirmar invocação no feed). **Não bloqueia a S1.3.**
- **⚠️ Por que a S1.3 NÃO copia o bloco-template:** Groq/Ollama recebem `tools` e a Polaris executa o loop. **Claude/Opencode CLI já fazem isso sozinhos** — a política vira **flags de linha de comando**, não um loop ReAct. `buildAgentToolDefs`/`selectApiTools`/`executeAgentToolCall` **não se aplicam** aqui (são pra montar/executar tool-calls OpenAI-format). A S1.3 escreve um helper PURO novo.

---

## Onde a S1.3 mexe — os 3 pontos de injeção de flags (código real)

Hoje **nenhum** dos três honra a `capabilityPolicy` — todos passam tools sem controle. `chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)) tem `const capabilityPolicy` em escopo (linha ~124) mas os branches Claude/Opencode (linhas ~285-388) **ignoram** a política.

### 1. Chat-run Claude — `ClaudeCliService.generate` ⚠️ FURO DE ISOLAMENTO
[claude-cli-service.ts:43](../../src/services/claude-cli-service.ts#L43) monta **hard-coded**:
```ts
let shellCmd = `claude --print --dangerously-skip-permissions --output-format json`;
```
Isso roda no **FS do worker/host** (não há sandbox em chat-run). `--dangerously-skip-permissions` aqui = Write/Bash livres no `/app` do worker. **Este é o caveat de FS do ROADMAP.** Default seguro da S1.3: em chat-run, política só libera **read-only/MCP**; **tools de escrita BLOQUEADAS** fora do sandbox.

### 2. Code-run Claude — `runClaudeInSandbox` (E2B) ✅ isolamento OK, gap = só MCP
[sandbox-cli-agent.ts:130-136](../../src/lib/orchestration/team/sandbox-cli-agent.ts#L130) também usa `--dangerously-skip-permissions`, **mas dentro do E2B** (o CLI edita `/home/user/repo`, `commitAndPush` pega). Aqui Write/Bash são **legítimos** (é o que entrega o code-run). **Gap único:** honrar a `mcpAllowlist` na invocação (montar `--mcp-config` a partir dos `AgentMcpServer` permitidos). **Não regredir** o comportamento de escrita.

### 3. Chat-run Opencode — `OpencodeCliService.generate`
[opencode-cli-service.ts:34](../../src/services/opencode-cli-service.ts#L34) monta `opencode run -q [-m model]`. A superfície de flags do opencode é **mais limitada/instável** que a do Claude CLI — **confirmar quais flags de tool/permission o binário instalado realmente expõe antes de prometer** (decisão #2). Se não houver equivalente confiável, **documentar a limitação** e aplicar só o que existe (não inventar flag).

**Flags do Claude Code CLI a mapear (CONFIRMAR contra a versão instalada — decisão #2):**
- `--allowedTools` / `--disallowedTools` ← de `tools` / `toolSkills` / `filesystem` (ex.: read-only → permitir `Read`,`Glob`,`Grep`,`LS`; bloquear `Write`,`Edit`,`Bash`).
- `--mcp-config <json|file>` ← de `mcpAllowlist` (ids de `AgentMcpServer`).
- `--permission-mode` (ex.: `plan`/`default`/`acceptEdits`) **em vez de** `--dangerously-skip-permissions` **cego** — só usar skip no sandbox E2B (code-run).

---

## Foco desta sessão: S1.3 — Política → flags 🔜 (ou defer — ver decisão #0)

**Objetivo (do ROADMAP, fatia S1.3):** traduzir a `CapabilityPolicy` do membro em **flags do CLI** nos 3 pontos acima, com o **default seguro** em chat-run (read-only/MCP; sem escrita fora do sandbox) e **honrando `mcpAllowlist`** no code-run E2B. Sem política → flags de hoje (regressão byte-idêntica).

**Mudanças concretas (se decidir EXECUTAR):**
1. **Helper PURO novo** `src/lib/ai/cli-tool-flags.ts` (ou `cli-capabilities.ts`): `buildCliToolFlags({ capabilities, context })` → `{ allowedTools?, disallowedTools?, permissionMode?, mcpConfig? }`, onde `context` distingue **`chat-run`** (host, sem escrita) de **`code-run-sandbox`** (E2B, escrita OK). **PURO** (sem I/O) → testável direto, mesmo padrão de `model-capabilities.ts`.
2. **Threading da política** até os 3 callers: passar `capabilityPolicy` de `chatWithAgent` para `ClaudeCliService.generate` e `OpencodeCliService.generate`; e até `runClaudeInSandbox` via o caller de code-run ([code-agent.ts] / worker). Mesmo estilo de injeção do `model`/`effort`/`capabilities` do V2.
3. **Aplicar as flags** montadas pelo helper em cada `shellCmd`/`flags`, substituindo o `--dangerously-skip-permissions` **cego** do chat-run por `--permission-mode` + allow/deny derivados; **manter** o skip **só** no path E2B (mas agora com `--mcp-config` da allowlist).

**Padrão de teste (sem DB/rede):** `scripts/v21s3-verify.ts` — casos do ROADMAP:
- (a) policy read-only (chat-run) → `--allowedTools` **sem** Write/Bash/Edit;
- (b) `mcpAllowlist` → `--mcp-config` correto (ids de `AgentMcpServer`);
- (c) chat-run **nunca** emite flag de escrita fora do sandbox (mesmo com `tools:true`);
- (d) code-run-sandbox → escrita preservada **+** `mcpAllowlist` aplicada;
- (e) **sem policy → flags idênticas ao atual** (regressão; chat e sandbox).

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
0. **EXECUTAR a S1.3 ou DEFER ao backlog?** O ROADMAP (linha ~48) abre explicitamente: *"se o caveat de FS tornar a S1.3 cara demais, ela pode ser adiada para backlog e o ciclo entregar tools só nos providers de function-calling (S1.1/S1.2)"*. **Pergunte isto PRIMEIRO.** Se defer → fechar o Sprint 1 com S1.1+S1.2 e pular pro **Sprint 2 (S2.1)**. Recomendação: a parte de **code-run E2B (honrar `mcpAllowlist`)** é barata e segura e vale fazer; a parte de **chat-run host** é a cara/arriscada (caveat de FS) — possível meio-termo: entregar só o code-run + o default seguro de chat-run (read-only/sem escrita), deixando o mapeamento fino de flags pro backlog.
1. **Mapa exato política → flags do Claude CLI** + confirmar que a versão instalada expõe `--allowedTools`/`--disallowedTools`/`--permission-mode`/`--mcp-config` (rodar `claude --help` no começo). Conservador: flag desconhecida → não emitir (cai no comportamento atual, sem quebrar o spawn).
2. **Opencode CLI:** quais flags de tool/permission o binário realmente tem. Se nenhuma confiável → documentar e aplicar só o possível (não inventar flag).
3. **Default de chat-run:** confirmar "read-only/MCP, escrita bloqueada fora do sandbox" como padrão (mesmo com `tools:true`), já que o FS é do host.

---

## ⚠️ Gotchas de ambiente desta máquina

- **Na S1.1/S1.2 funcionaram normalmente:** `npx tsx scripts/v21sN-verify.ts` e `npx tsc --noEmit` (exit 0). Se algo travar com `UNKNOWN read`/errno -4094, é corrupção de `node_modules` pelo OneDrive — não insista, diagnostique.
- **Verificação confiável:** `npx tsx scripts/*.ts` (lógica pura) + `npx tsc --noEmit`. **Não rode jest.** `tsc` pode acusar erros de deps opcionais (bullmq/e2b/xterm/diff2html) — ignorar; o que importa são os arquivos da fatia. (Na S1.2 o `tsc --noEmit` fechou com **0 erros**.)
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. `groq.ts`/services legados cospem dezenas de `no-explicit-any`/`prefer-const` **pré-existentes** — o commit passa mesmo assim (a S1.2 passou com 34 desses). **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, vários `docs/**` untracked). **`git add` só nos arquivos da S1.3** (o helper novo, os services CLI tocados, `sandbox-cli-agent.ts`, `groq.ts`/caller, `scripts/v21s3-verify.ts`).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S1.3 não precisa de migração** (sem mudança de schema). Se algum dia precisar: host real `sofia_db@2.24.207.200:5435` (o `.env` aponta pra OUTRO host — não usar pra migração); `migrate deploy` MANUAL com `DATABASE_URL` inline **antes** do push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 1, fatia **S1.3**) + `ANALISE-GAP-V2.1.md` (§4 Tema A') + esta nota. **Confirmar comigo a decisão #0 (executar vs defer) e depois as 3 decisões acima ANTES de codar** (regra global #2). Rodar `claude --help` (e `opencode --help`) cedo pra ancorar o mapa de flags em flags REAIS.
2. Rodar `npx tsx scripts/v21s2-verify.ts` (e `v21s1`) pra confirmar baseline verde.
3. Se EXECUTAR: implementar a S1.3 — helper PURO `cli-tool-flags.ts` + threading da `capabilityPolicy` + aplicar flags nos 3 pontos (chat-run host = sem escrita; code-run E2B = escrita + `mcpAllowlist`); **coordinator INTACTO**; **sem policy = flags de hoje**.
4. `scripts/v21s3-verify.ts` (casos a–e) + `npx tsc --noEmit` limpo. Sem migração.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S1.3** (não emendar o Sprint 2). Se defer: registrar no `ROADMAP.md` (S1.3 → backlog) e abrir a `Sessão 4.md` apontando pro **S2.1**.

> Comece confirmando comigo a **decisão #0 (executar a S1.3 ou adiar)** e, se executar, as **3 decisões da S1.3** — antes de escrever código.
