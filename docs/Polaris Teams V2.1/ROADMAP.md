# Polaris Teams V2.1 — Roadmap de Execução

> **Base:** [ANALISE-GAP-V2.1.md](./ANALISE-GAP-V2.1.md) (varredura fresca do ATA, pós-ciclo V2).
> **Data:** 2026-06-19.
> **Escopo deste ciclo:** os vereditos **PEGAR** + os **ADAPTAR** baratos. Backlog (resume/tool-approval interativo, cross-team, drag-drop, multi-reviewer, anexos) justificado ao final.
> **Regra de execução (CLAUDE.md global #4):** **1 fatia por sessão**, sem continuar automaticamente para a próxima. Commit + push ao fechar cada fatia.

---

## Princípios de execução (invariantes — valem para toda fatia)

1. **Coordinator intacto.** `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` não mudam de comportamento. Extensões entram por:
   - **injeção** — campos em `RunTeamDeps` ou no `options` (4º param) do `ChatFn` (mesmo padrão de `model`/`effort`/`capabilities` do V2 e `taskId` do C2.1);
   - **callers** — [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts), [worker/index.ts](../../src/worker/index.ts), cron, rotas API.
2. **Migração formal + manual.** Qualquer mudança de schema → `prisma migrate` formal **e** `migrate deploy` manual no host real `sofia_db@2.24.207.200:5435` **antes** do push (lição SP2/SP3: `db push` do standalone não cria coluna em prod).
3. **Script de verificação por fatia** no padrão existente (`scripts/v21sN-verify.ts`): asserts puros + `tsc` limpo, sem depender de jest (OneDrive errno -4094). Mesma técnica do V2: extrair a decisão em funções **puras** (como `model-capabilities.ts`) e testá-las direto.
4. **Defaults preservam comportamento atual** — todo campo novo é opcional/nullable e cai no caminho legado quando ausente. Regressão sempre verificada (membro/run sem o campo = byte-idêntico ao atual).

---

## Sprint 1 — Execução de tools além do OpenRouter (análise Tema A' · PEGAR, topo)

**Problema:** o V2 S1 entregou a **política** de capacidade por membro, mas a **execução** de tools só roda no path OpenRouter ([model-capabilities.ts](../../src/lib/ai/model-capabilities.ts) é chamado só ali; `modelSupportsTools` casa só slugs OpenRouter). Membros **Groq / Claude-CLI / Opencode-CLI / Ollama** — a maioria — não invocam tools de fato (ou, no CLI, invocam sem controle de política). Os 4 paths de `chatWithAgent` ([groq.ts:284-346](../../src/lib/ai/groq.ts#L284)) têm **duas naturezas**, e cada uma é uma fatia distinta.

> **Por que duas naturezas (não é detalhe):** Groq/Ollama são **OpenAI-compatible** — a Polaris monta o loop de function-calling ela mesma, e a política do S1 encaixa sem redesenho. Claude/Opencode CLI são **agentes autônomos** que já executam tools nativas; "ligar tools" lá é **traduzir a política em flags do CLI**, não montar loop — e tem caveat de FS do host em chat-runs.

### Fatia S1.1 — Tool loop no Groq nativo (function-calling) ✅ FEITA (commit `3e2f3ed`, 2026-06-19)

> **Entregue:** `src/lib/ai/agent-tools.ts` (helpers compartilhados `buildAgentToolDefs` + `executeAgentToolCall`, extraídos do path OpenRouter), `modelSupportsTools` agora reconhece ids Groq nativos (`GROQ_TOOL_CAPABLE_PREFIXES`), e o path Groq nativo de `chatWithAgent` roda o loop de tools gated por `resolveToolGate`. OpenRouter refatorado p/ usar os helpers (byte-idêntico). Verificação: `scripts/v21s1-verify.ts` (12 asserts) + `tsc` limpo. Sem schema/migração. Coordinator intacto. **Pendente:** E2E autenticado em prod (Worker Groq tool-capable). Handoff da próxima: `Sessão 2.md`.
- **`modelSupportsTools` ([model-capabilities.ts](../../src/lib/ai/model-capabilities.ts)):** ampliar para reconhecer ids de modelo Groq que suportam tools (ex.: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, famílias com tool use). Manter conservador: id desconhecido → `false` (fallback texto, sem 400). Os ids Groq **não têm `/`** — distingui-los do path OpenRouter no ponto de decisão.
- **`chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)) path Groq:** extrair o loop de tools do path OpenRouter para um helper compartilhado (mesma montagem `resolveToolGate`/`selectApiTools` → `tools` → `tool_calls` → execução → re-feed) e rodá-lo no path Groq quando o gate ligar. Groq retorna `tool_calls` no formato OpenAI — reusa o parser existente.
- **Proteção preservada:** `rawText` (code-runs) continua forçando completion plano; sandbox `@RUN` intacto.
- **Verificação:** `scripts/v21s1-verify.ts` — (a) membro Groq com `capabilities.tools:true` em modelo suportado habilita function calling; (b) `mcpAllowlist`/`toolSkills`/`filesystem` filtram igual ao OpenRouter; (c) modelo Groq sem suporte cai em texto sem crashar; (d) OpenRouter e Groq-sem-policy = byte-idênticos ao atual.

### Fatia S1.2 — Tool loop no Ollama (function-calling)
- **Path Ollama:** o endpoint `/api/chat` aceita `tools` e devolve `tool_calls` (formato OpenAI-like). Rodar o **mesmo** helper compartilhado da S1.1. Ampliar `modelSupportsTools` para o set de modelos Ollama com tool use (ex.: famílias `qwen`/`llama3.x`/`mistral` locais).
- **Caveat:** Ollama local é best-effort; manter o fallback gracioso (modelo sem suporte → texto).
- **Verificação:** `scripts/v21s2-verify.ts` — gate + filtragem de política no path Ollama; regressão (sem policy = atual).

### Fatia S1.3 — Política → flags nos providers-agente (Claude CLI / Opencode CLI) ✅ FEITA

> **Entregue (2026-06-19, versão segura completa):** helper PURO `src/lib/ai/cli-tool-flags.ts` (`buildCliToolFlags({capabilities,context,mcpServers})` + `renderClaudeCliFlags` + `toCliMcpDescriptor`). **Chat-run host** ([claude-cli-service.ts](../../src/services/claude-cli-service.ts)): política → read-only (`--allowedTools Read,Glob,Grep,LS`) + `--permission-mode plan` + `--mcp-config` da allowlist, **sem `--dangerously-skip-permissions`** (fecha o furo de FS — Write/Bash bloqueados mesmo com `tools:true`). **Code-run E2B** ([sandbox-cli-agent.ts](../../src/lib/orchestration/team/sandbox-cli-agent.ts)): escrita **preservada** (skip ON), só honra `mcpAllowlist` via `--mcp-config` (`filesystem:false` = opt-out a read-only). Threading: `chatWithAgent`→`generate` (chat) e `chatOptions.capabilities`+resolver MCP injetado no worker→`runClaudeInSandbox` (code). **Opencode = limitação documentada** (o binário instalado não expõe flag de tool/permission/MCP no `run`; nada inventado). **Sem `--dangerously-skip-permissions`/policy = comando byte-idêntico ao atual** (regressão). Verificação: `scripts/v21s3-verify.ts` (6 casos a–e) + `tsc` limpo. **Sem migração. Coordinator INTACTO.** Flags ancoradas no `claude --help` real. **Pendente:** E2E autenticado em prod.

- **Natureza diferente:** o CLI **já executa tools**. Traduzir `CapabilityPolicy` em flags em vez de montar loop:
  - `--allowedTools` / `--disallowedTools` a partir de `tools`/`toolSkills`/`filesystem`;
  - `--mcp-config` a partir de `mcpAllowlist` (ids de `AgentMcpServer`);
  - `--permission-mode` em vez de `--dangerously-skip-permissions` **cego**.
- **Caveat de segurança (decisão de escopo):** em **chat-runs** o Claude CLI roda no **FS do worker/host** ([sandbox-cli-agent.ts:5-9](../../src/lib/orchestration/team/sandbox-cli-agent.ts#L5)) — habilitar Write/Bash ali é furo de isolamento. **Default:** em chat-run, política só libera **read-only/MCP**; tools de escrita ficam **bloqueadas fora do sandbox**. Em **code-runs** o CLI já roda no sandbox E2B ([runClaudeInSandbox](../../src/lib/orchestration/team/sandbox-cli-agent.ts#L119)) com tools nativas — ali o gap é só **honrar a `mcpAllowlist`** na invocação.
- **Verificação:** `scripts/v21s3-verify.ts` (funções puras de montagem de flags) — (a) policy read-only → `--allowedTools` sem Write/Bash; (b) `mcpAllowlist` → `--mcp-config` correto; (c) chat-run nunca emite flag de escrita fora do sandbox; (d) sem policy = comportamento atual.

> **Sub-decisão em aberto p/ a sessão da S1.3:** se o caveat de FS tornar a S1.3 cara demais, ela pode ser **adiada para backlog** e o ciclo entregar tools só nos providers de function-calling (S1.1/S1.2) — onde a política já encaixa limpa e o ganho é imediato.

---

## Sprint 2 — Timeline/auditoria por task (análise Tema E · ADAPTAR, quick win)

**Problema:** não há log estruturado **por task** (só feed `TeamMessage` + board + painel por membro do V2 S2). O ATA tem `TaskHistoryEvent[]` append-only por task; o grafo da Polaris já **emite** transições, falta **persistir + expor**.

### Fatia S2.1 — Persistir eventos de lifecycle por task
- **Schema:** `TeamTask.historyEvents Json?` (append-only) **ou** tabela leve `TeamTaskEvent` (`taskId`, `type`, `actor`, `createdAt`, `detail Json`). Migração formal + manual. Forma inspirada no `TaskHistoryEvent` do ATA: `task_created`/`status_changed`/`owner_changed`/`review_requested`/`review_approved`/`review_changes_requested`.
- **Plumbing:** nos pontos onde o coordinator/grafo **já** muda status/owner/review (sem alterar a lógica), o **caller** anexa o evento. Coordinator intacto.
- **Verificação:** `scripts/v21s4-verify.ts` — sequência de transições gera a timeline esperada; ausência de eventos = run legado idêntico.

### Fatia S2.2 — Timeline por task no TeamRunView
- **[TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx):** no detalhe da task, aba "Histórico" renderizando os eventos em ordem (actor + timestamp + transição). Reusa o que o SSE já entrega quando possível.
- **Verificação:** E2E manual — rodar time, abrir uma task, confirmar que criação/atribuição/status/review aparecem na ordem certa.

> **Backlog derivado:** comments por task (threads + anexos, N6) — precisa de UI de escrita e storage de blob; fora deste ciclo.

---

## Sprint 3 — Pacote de pequenos ADAPTAR (análise Tema F)

Três itens independentes e baratos, todos por injeção/UI, **coordinator intacto**. Cabem juntos.

### Fatia S3.1 — `workflow` por membro (F1)
- **Schema:** `TeamMember.workflow String?` (instrução custom por membro-neste-time). Migração formal + manual.
- **Plumbing:** concatenar ao system prompt na montagem do `ChatOptions` por membro (mesmo lugar de `model`/`effort`/`capabilities`). Ausente = só o prompt do `Agent` (atual).
- **Verificação:** `scripts/v21s5-verify.ts` — `workflow` flui member→opts→prompt; ausência = idêntico ao atual.

### Fatia S3.2 — Relations de task `blocks`/`related` (F2)
- **Schema:** estender `TeamTask` com `blocks String[]` e `related String[]` (já há `dependsOn[]` do G1 = `blockedBy`). Migração formal + manual.
- **UI/uso:** navegação entre tasks relacionadas no board; `blocks` é o inverso de `dependsOn` (derivável ou persistido). Não muda a lógica de agendamento do DAG (G), só enriquece.
- **Verificação:** `scripts/v21s6-verify.ts` — relations persistem e renderizam; DAG/agenda inalterados.

### Fatia S3.3 — Advisory por membro (F3) ✅ FEITA (commit `2611799`, 2026-06-19)

> **Entregue:** chip de advisory por membro no painel "Por membro" com `quota_exhausted`/`rate_limited`/`provider_overloaded`, derivado do erro run-level que os coordinators já levantam. **SÓ UI — sem schema, sem migração, coordinator INTACTO.** Helper PURO `src/lib/orchestration/team/provider-advisory.ts`: `classifyProviderError(error, status)` refina a string/status nas 3 categorias (texto vence status; `null` = sem chip = legado) e `pickAdvisoryMemberId(members, tasks, messages)` faz a **atribuição read-side (decisão A, confirmada com o usuário)** — doing→owner, review→reviewer, sem-task-viva→lead (planejamento/consolidação), fallback→último autor. UI: chip ⚠ + label curto + **tooltip explicativo** (decisão de UX confirmada) na linha de identidade do card (`MemberActivityPanel.tsx`); `TeamRunView` passa `runStatus`/`runError`. Run sem erro = nenhum chip = painel byte-idêntico ao atual (regressão). A caixa "Erro" run-level abaixo do painel segue sendo a fonte da verdade honesta. Verificação: `scripts/v21s7-verify.ts` (3 grupos a–c) + `tsc --noEmit` limpo. **Pendente:** E2E manual (forçar 429 num membro). **🏁 Fecha o Sprint 3 e o ciclo V2.1.**

- **UI:** chip por membro no painel (V2 S2) com `quota_exhausted`/`rate_limited`/`provider_overloaded`, derivado do erro que o `chat()` já levanta (a Polaris já trata rate-limit Claude via `claude-token-pool`). Sem nova engine — é surface do que já existe.
- **Verificação:** E2E manual — forçar 429 num membro e confirmar o chip.

---

## Backlog explícito (NÃO neste ciclo — registrado para não reabrir por engano)

| Item | Veredito | Por que fora agora |
|------|----------|--------------------|
| Resume `waiting_for_input` + tool-approval interativo | ADAPTAR | Custo estrutural (pausar/retomar run no `after()`/BullMQ). Depende do Tema A' existir (sem tools executáveis fora do OpenRouter, não há o que aprovar). `ToolApprovalSettings` do ATA (autoAllow por categoria + `timeoutAction`) = **referência de design**. |
| Cross-team `@HANDOFF` (Tema C do V2) | ADAPTAR | YAGNI; output webhooks (SP2) cobrem o near-term. Desenho preservado: diretiva → caller chama `startTeamRun(target, {chainDepth+1})` + teto + `TeamRun.parentRunId`. |
| Comments por task (threads + anexos, N6) | ADAPTAR | Precisa UI de escrita + storage de blob (não temos). Sub-item do Tema E. |
| Drag-drop kanban | ADAPTAR | Board dirigido por agente; só faz sentido com human-in-the-loop. `@dnd-kit`, risco OneDrive. |
| Multi-reviewer | ADAPTAR | Coordinator assume 1 reviewer; exigiria quórum. Baixo valor atual. |
| UX de provider por membro / effort `xhigh`/`max` | ADAPTAR/cosmético | `chatWithAgent` já suporta os providers; granularidade extra é cosmética. |
| **DESCARTADO (eixo-autonomia):** stall monitor, work-sync nudge, auto-resume, context-window monitor, fastMode, action-mode, worktree | DESCARTAR | Estruturalmente desnecessário no coordinator síncrono/turn-driven da Polaris. Ver §6 da análise. |

---

## Sequência recomendada e verificação E2E final

**Ordem:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅) → Sprint 2 (S2.1 ✅ → S2.2 ✅) → Sprint 3 (S3.1 ✅ → S3.2 ✅ → S3.3 ✅). **🏁 CICLO V2.1 COMPLETO (2026-06-19).**

**Por quê nessa ordem:** Tema A' é o maior salto de valor e destrava o investimento do V2 S1; Tema E é quick win de observabilidade; Tema F é polimento barato. S1.3 pode cair para backlog se o caveat de FS pesar.

**E2E final do ciclo (em prod, com o usuário — gate real = EasyPanel + login):**
1. Time com Worker **Groq** tool-capable: rodar mission que exige MCP/tool-skill, confirmar invocação no feed + filtragem por política (mesmo teste que o V2 fez no OpenRouter, agora no Groq).
2. Time com Worker **Claude CLI**: confirmar que a política restringe tools via flags (read-only/MCP em chat-run; `mcpAllowlist` honrada em code-run no sandbox).
3. Timeline por task: abrir uma task e validar a ordem dos eventos de lifecycle.
4. Regressão: time chat legado (sem `capabilities`/`workflow`) e code-run sem `gitMode` rodam idênticos ao atual.
