# Polaris Teams V2.1 — Análise de Gap vs Agent Teams AI (varredura fresca)

> **Tipo:** documento de análise + recomendações (não é roadmap executável — esse é o [ROADMAP.md](./ROADMAP.md) deste diretório).
> **Data:** 2026-06-19.
> **Base:** estende a [ANALISE-GAP-AGENT-TEAMS-AI.md (V2)](../Polaris%20Teams%20V2/ANALISE-GAP-AGENT-TEAMS-AI.md) e o [ROADMAP.md (V2)](../Polaris%20Teams%20V2/ROADMAP.md), cujo ciclo (S1→S3) foi **concluído em 2026-06-18**.
> **Objetivo:** com o ciclo V2 fechado, fazer uma **varredura fresca do código do ATA** (`C:\dev\agent-teams-ai`, `team.ts` cresceu p/ ~57KB) atrás de capacidades que a tabela de 20 itens do V2 **não capturou**, reavaliar o backlog deferido, e dar um veredito frio por capacidade: **PEGAR / ADAPTAR / DESCARTAR**. Insumo de decisão para o próximo ciclo (V2.1).

---

## 1. O que mudou desde o V2 (não repetir trabalho)

O ciclo V2 entregou e está no código (confirmado nesta varredura):

| Sprint V2 | Entrega | Evidência no código |
|---|---|---|
| **S1** (Tema A) | Política de capacidade por membro (gate de tools + allowlist de MCP) | `TeamMember.capabilities Json?` ([schema.prisma:1248](../../prisma/schema.prisma#L1248)); `resolveToolGate`/`modelSupportsTools`/`selectApiTools` ([model-capabilities.ts](../../src/lib/ai/model-capabilities.ts)); `CapabilityPolicy` em `ChatOptions` |
| **S2** (Tema D2) | Painel por membro + custo/token por membro | `TeamMemberUsage` ([schema.prisma:1355](../../prisma/schema.prisma#L1355)); [member-usage-recorder.ts](../../src/lib/orchestration/team/member-usage-recorder.ts) |
| **S3** (Tema B barato) | Toggle `gitMode` PR/direto | `TeamRun.gitMode` ([schema.prisma:1278](../../prisma/schema.prisma#L1278)); [run-request.ts](../../src/lib/orchestration/team/run-request.ts) |

Verificação V2: scripts `v2s1`–`v2s7` (103 asserts) + `tsc` limpo. **Estes não voltam a ser candidatos.**

---

## 2. A lente do V2.1 — dois eixos de descarte, não um

O V2 descartava o que estava **preso ao Electron / local-fs**. A varredura fresca mostrou que quase tudo que é novo no ATA cai num **segundo eixo**, que precisa ser nomeado para o veredito ser honesto: **o grau de autonomia do membro**.

> **No ATA**, cada membro é um **processo independente, vivo e longevo** (um `claude`/`opencode`/`codex` rodando sozinho) que pode **travar no meio de um turno, morrer, driftar de contexto, ou bater rate-limit por conta própria**. Daí o ATA precisar de toda uma maquinaria de *domar processos autônomos*: stall monitor, work-sync nudge, auto-resume, runtime advisory por membro, máquina de estado de spawn, monitor de context-window.
>
> **Na Polaris**, o coordinator é **síncrono e turn-driven** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) **aguarda** a chamada `chat()` de cada membro e só então segue. Um membro **não para no meio do turno** silenciosamente: ou o `chat()` retorna, ou erra, ou estoura timeout — sempre de volta ao coordinator. **Logo, a maior parte da maquinaria de autonomia do ATA é estruturalmente desnecessária aqui.**

Esse eixo (somado ao do V2) é o que move a maioria dos achados novos para **DESCARTAR com justificativa forte** — e faz sobrar pouca coisa de alto valor, que é exatamente o que o ciclo V2.1 deve atacar.

**Escala de veredito** (mesma do V2): **PEGAR** (alto valor, bom fit, custo proporcional) · **ADAPTAR** (valor real, exige redesenho) · **DESCARTAR** (preso a Electron/local-fs, ao eixo-autonomia, já coberto, ou YAGNI).

---

## 3. Achados NOVOS da varredura (não estavam na tabela de 20 do V2)

| # | Capacidade no ATA | Onde no ATA | Eixo | Veredito |
|---|---|---|---|---|
| N1 | **Execução de tools fora do OpenRouter** — o gate/loop do S1 só roda no path OpenRouter; membros Groq/Claude-CLI/Ollama recebem a *descrição* das tools mas não as executam | (gap da própria Polaris, exposto pela varredura) | — | **PEGAR (topo)** — Tema A' |
| N2 | **Task history events** — log de auditoria append-only por task (`task_created`/`status_changed`/`owner_changed`/`review_*`) | `team.ts` (`TaskHistoryEvent`) | obs. | **ADAPTAR** — Tema E |
| N3 | **`workflow` por membro** — instrução custom injetada no spawn, além do prompt do Agent | `team.ts` (`TeamMember.workflow`) | — | **ADAPTAR (baixo)** — Tema F |
| N4 | **Task relations** `blocks`/`blockedBy`/`related` (1ª classe) | `team.ts` (`TeamTask`), `taskTools.ts` | — | **ADAPTAR (baixo)** — Tema F |
| N5 | **Member runtime advisory** — chip de `quota_exhausted`/`rate_limited`/`provider_overloaded` por membro | `team.ts` (`MemberRuntimeAdvisory`), `TeamMemberRuntimeAdvisoryService.ts` | obs./autonomia | **ADAPTAR (baixo)** — Tema F |
| N6 | **Task comments** (threads com `review_request`/`review_approved` + anexos) | `team.ts` (`TaskComment`) | — | backlog (sub de Tema E) |
| N7 | **Tool-approval settings granular** — `autoAllowAll`/`autoAllowFileEdits`/`autoAllowSafeBash` + `timeoutAction` | `team.ts` (`ToolApprovalSettings`) | — | **referência de design** p/ o backlog de human-in-the-loop |
| N8 | **Stall monitor + remediação** — detecta task `in_progress` sem progresso e cutuca/alerta | `stallMonitor/*` (`TeamTaskStallPolicy.ts`) | autonomia | **DESCARTAR** |
| N9 | **Work-sync nudge** — protocolo membro reporta `still_working`/`blocked`/`caught_up` | `mcp-server/.../workSyncTools.ts` | autonomia | **DESCARTAR** |
| N10 | **Auto-resume por rate-limit** — parseia horário de reset e re-prompta | `AutoResumeService.ts` | autonomia | **DESCARTAR** |
| N11 | **Lead context-window monitor** — `contextUsedPercent` da janela | `team.ts` (`LeadContextUsage`) | autonomia | **DESCARTAR** |
| N12 | **`fastMode` por membro** | `team.ts` (`TeamFastMode`) | provider-CLI | **DESCARTAR** |
| N13 | **`AgentActionMode`** `do`/`ask`/`delegate` (intent de entrega de msg) | `team.ts` | inbox-bound | **DESCARTAR** |
| N14 | **effort `xhigh`/`max`** (granularidade extra) | `team.ts` (`EffortLevel`) | — | cosmético/backlog |
| N15 | **`isolation:'worktree'` por membro**, `skipPermissions`, `extraCliArgs`, `limitContext` | `team.ts` (`TeamLaunchRequest`) | local-fs/CLI | **DESCARTAR** (já no DESCARTADO do V2) |

---

## 4. Deep-dives por tema

### Tema A' — Execução de tools fora do OpenRouter (N1 · PEGAR, topo)

**O gap (exposto pela varredura, é da própria Polaris).** O V2 S1 entregou a **política** de capacidade por membro, mas a **execução** de tools vive **só no path OpenRouter**. O próprio [model-capabilities.ts](../../src/lib/ai/model-capabilities.ts) é explícito: as funções puras são "called by **the OpenRouter path**", e `modelSupportsTools` casa **slugs de OpenRouter** (`openai/`, `anthropic/`, `google/gemini`, `meta-llama/llama-3`, `mistralai/`, `deepseek/deepseek-chat`, `x-ai/grok`) + `coder`/`qwen`.

O roteamento real de `chatWithAgent` ([groq.ts:284-346](../../src/lib/ai/groq.ts#L284)) tem **quatro paths**, e só um tem o loop de tools:

| Path | Como decide | Executa tools hoje? |
|---|---|---|
| **Claude CLI** | `agent.model.startsWith('claude-')` → `ClaudeCliService` (one-shot `--print`) | **Sim, mas nativamente** — o CLI é um agente autônomo (Read/Write/Bash/MCP próprios). **Não** usa o array `tools` da Polaris nem a política do S1. |
| **Opencode CLI** | `agent.model.startsWith('opencode-')` | idem Claude CLI (agente autônomo). |
| **OpenRouter** | `agent.model.includes('/')` | **Sim** — único com `resolveToolGate`/`selectApiTools` + loop `MAX_LOOPS`. |
| **Groq nativo** | fallback (`getGroqClient().chat.completions.create`) | **Não** — Groq é OpenAI-compatible e **suporta** tool calling, mas a Polaris não monta o loop aqui. |

**Consequência prática:** times cujos Workers são Groq/Claude/Ollama — **a maioria** — recebem a *descrição* das tools no prompt (S1 injeta) mas **não conseguem invocá-las de fato** (ou, no caso do CLI, invocam fora de qualquer controle de política). A feature do V2 S1 **só morde 1 provider**. Isto já estava registrado no backlog do V2 como "tool-calling nativo em Groq/Ollama/Claude-CLI" — a varredura confirma que **é o maior valor destravável agora**, porque reaproveita o investimento já feito.

**Duas naturezas de integração (isto define o escopo, ver ROADMAP Sprint 1):**
1. **Providers de function-calling (Groq, Ollama).** A Polaris monta o loop ela mesma. Estender = rodar o **mesmo** `resolveToolGate`/`selectApiTools`/loop no path Groq nativo (OpenAI-compatible: `tools` + `tool_calls`) e no path Ollama (`/api/chat` com `tools`). A política do S1 encaixa **sem redesenho** — é generalizar o loop, não recriá-lo. Ampliar `modelSupportsTools` para ids de modelo Groq/Ollama (hoje só reconhece slugs OpenRouter).
2. **Providers-agente (Claude CLI, Opencode CLI).** Já executam tools sozinhos. "Ligar tools" **não** é montar loop — é **traduzir a política de capacidade em flags do CLI** (`--allowedTools`/`--disallowedTools`, `--mcp-config`, `--permission-mode`) em vez do `--dangerously-skip-permissions` cego. **Porém:** em **chat-runs** o CLI roda no **FS do worker/host** ([sandbox-cli-agent.ts:5-9](../../src/lib/orchestration/team/sandbox-cli-agent.ts#L5) documenta exatamente esse risco) — dar Write/Bash ali é furo de isolamento; deve ficar **read-only/MCP-only** salvo dentro do sandbox. Em **code-runs** o Claude CLI **já roda no sandbox E2B com tools nativas** ([runClaudeInSandbox](../../src/lib/orchestration/team/sandbox-cli-agent.ts#L119)) — o gap ali é só **honrar a `mcpAllowlist`** da política na invocação.

**Valor:** **Alto** — é o que transforma o S1 de "política que só vale num provider" em "membros que de fato usam ferramentas no provider que o time escolheu". **Custo/risco:** Médio (function-calling) a Médio-Alto (CLI, pelo caveat de FS). **Fit:** **Bom** — encaixa no `chatWithAgent` por path, coordinator intacto, a política já existe.

**Veredito:** **PEGAR.** É a continuação natural do V2 S1.

### Tema E — Auditoria/timeline por task (N2/N6 · ADAPTAR, quick win)

**O que o ATA faz.** Cada `TeamTask` carrega `historyEvents: TaskHistoryEvent[]` — um log **append-only** de criação, mudança de status, troca de owner e transições de review, cada um com `actor`+`timestamp`. Mais `comments` (threads com tipos `review_request`/`review_approved` e anexos). É a fonte de verdade da timeline de uma task.

**O que a Polaris tem.** O feed (`TeamMessage`) + o board + o painel por membro (V2 S2). Mas **não há um log estruturado por task** — para reconstruir "quem mexeu nesta task e quando" é preciso varrer mensagens. O grafo (G) já **emite** eventos de agenda/estado; falta **persistir uma timeline por task** e expô-la.

**Valor:** **Médio** (observabilidade/auditoria, depurar runs longos do grafo). **Fit:** **Bom** — `TeamTask.artifacts`/`historyEvents Json` ou tabela leve `TeamTaskEvent`; o coordinator/grafo já tem os pontos de transição. **Veredito:** **ADAPTAR.** Quick win sobre o S2. Comments por task (N6) ficam como sub-item de backlog (precisam de UI de escrita + provavelmente storage de anexo).

### Tema F — Pacote de pequenos ADAPTAR (N3/N4/N5)

- **F1 — `workflow` por membro (N3).** Hoje o membro herda 100% do prompt do `Agent`. O ATA permite uma instrução **por membro-neste-time** injetada no spawn. Gap pequeno: campo `TeamMember.workflow String?` concatenado ao system prompt na montagem do `ChatOptions`. **ADAPTAR (baixo).**
- **F2 — Relations `blocks`/`blockedBy`/`related` (N4).** A Polaris só tem `TeamTask.dependsOn[]` (G1). O ATA trata as três relações como 1ª classe (navegação + bloqueio). `related`/`blocks` são incrementais sobre o DAG existente. **ADAPTAR (baixo)** — já era o item 13 do backlog do V2.
- **F3 — Advisory por membro (N5).** Chip de `quota_exhausted`/`rate_limited`/`provider_overloaded` por membro na UI, derivado do erro que o `chat()` já levanta (a Polaris já trata rate-limit do Claude via `claude-token-pool`). É surface, não nova engine. **ADAPTAR (baixo).**

Estes três cabem juntos numa fatia (Sprint 3), todos por injeção/UI, sem tocar o coordinator.

---

## 5. Backlog do V2 reavaliado (mantém ou muda?)

| Item do backlog V2 | Reavaliação V2.1 |
|---|---|
| **Tool-calling nativo Groq/Ollama/Claude-CLI** | **PROMOVIDO a Sprint 1 (Tema A').** Era o maior valor latente; a varredura confirmou que é o gargalo que trava o S1. |
| Resume `waiting_for_input` + tool-approval interativo | **Continua backlog.** Custo estrutural inalterado. O `ToolApprovalSettings` do ATA (N7: autoAllow por categoria + `timeoutAction`) fica como **referência de design** se houver demanda — e depende do Tema A' existir (sem tools executáveis fora do OpenRouter, não há o que aprovar). |
| Cross-team `@HANDOFF` | **Continua backlog.** Output webhooks (SP2) cobrem o near-term; YAGNI sem times reais em prod. |
| Drag-drop kanban / Multi-reviewer / Anexos em task / UX de provider | **Continua backlog** (sem mudança de veredito). |

---

## 6. Explicitamente DESCARTADO no V2.1 (registro, para não reabrir)

Tudo do **eixo-autonomia** — estruturalmente desnecessário no coordinator síncrono da Polaris:

- **Stall monitor + remediação (N8)** — não existe "membro travado no meio do turno"; o `chat()` sempre retorna/erra/timeouta de volta ao coordinator. O equivalente Polaris (se um dia precisar) é um **timeout/retry por turno de membro**, não um motor heurístico de transcript.
- **Work-sync nudge (N9)** — membros não são processos independentes que driftam; o coordinator já é o sincronizador.
- **Auto-resume por rate-limit (N10)** — a Polaris já faz failover/backoff de rate-limit (`claude-token-pool`); o playbook operacional é trocar p/ modelo pago/Ollama sob 429.
- **Context-window monitor (N11)** — cada `chat()` é uma chamada bounded; não há sessão-CLI longeva acumulando contexto a vigiar.
- **`fastMode` (N12), action-mode (N13), worktree/skipPermissions/extraCliArgs (N15)** — provider-CLI / local-fs bound (já no DESCARTADO do V2).

E, do V2, permanecem descartados: casca Electron/IPC/preload, `child_process`/`node-pty`/`ssh2`/binário `claude-multimodel`, storage local `~/.claude/teams`, git worktree por membro, MCP HTTP server (a API pública/v1 do SP4 já cobre integração externa).

---

## 7. Ordem de prioridade recomendada (vira o [ROADMAP.md](./ROADMAP.md))

1. **Sprint 1 — Tema A' (PEGAR).** Execução de tools além do OpenRouter. Maior valor: destrava o investimento do V2 S1 para os providers que os times realmente usam.
2. **Sprint 2 — Tema E (ADAPTAR).** Timeline/auditoria por task. Quick win de observabilidade sobre o S2.
3. **Sprint 3 — Tema F (ADAPTAR).** Pacote pequeno: `workflow` por membro + relations + advisory chip.
4. **Backlog** (registrado, não neste ciclo): resume/tool-approval interativo, cross-team, drag-drop, multi-reviewer, anexos, UX de provider, comments por task.

> Cada sprint segue o padrão dos roadmaps anteriores: **1 fatia/sessão**, seam por **injeção** (`RunTeamDeps`/`ChatOptions`) ou **callers**, **coordinator intacto**, migração formal **+ `migrate deploy` manual** no host real antes do push, script `v21sN-verify.ts` puro (sem jest).

---

## Anexo — arquivos de referência

**Polaris (`Imob/sofia-next/`):**
- Roteamento de provider + loop de tools: [groq.ts](../../src/lib/ai/groq.ts) (`chatWithAgent`, paths Claude CLI/Opencode/OpenRouter/Groq), [model-capabilities.ts](../../src/lib/ai/model-capabilities.ts) (`resolveToolGate`/`modelSupportsTools`/`selectApiTools`).
- Claude CLI no sandbox: [sandbox-cli-agent.ts](../../src/lib/orchestration/team/sandbox-cli-agent.ts) (`runClaudeInSandbox`).
- Engine (intocável): [team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts), [team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts), [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts), [team-types.ts](../../src/lib/orchestration/team/team-types.ts).
- V2 entregue: [member-usage-recorder.ts](../../src/lib/orchestration/team/member-usage-recorder.ts), [run-request.ts](../../src/lib/orchestration/team/run-request.ts); schema `TeamMember.capabilities`/`TeamRun.gitMode`/`TeamMemberUsage` ([schema.prisma](../../prisma/schema.prisma)).

**Agent Teams AI (`C:\dev\agent-teams-ai/`):**
- `src/shared/types/team.ts` (`TeamMember.workflow/fastMode`, `TaskHistoryEvent`, `TeamTask.blocks/blockedBy/related`, `TaskComment`, `MemberRuntimeAdvisory`, `LeadContextUsage`, `ToolApprovalSettings`, `AgentActionMode`).
- `src/main/services/team/stallMonitor/` (`TeamTaskStallMonitor.ts`, `TeamTaskStallPolicy.ts`), `AutoResumeService.ts`, `TeamMemberRuntimeAdvisoryService.ts`.
- `mcp-server/src/tools/` (`workSyncTools.ts`, `taskTools.ts`, `reviewTools.ts`, `kanbanTools.ts`).
