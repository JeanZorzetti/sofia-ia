# Polaris Teams V2.2 — Paridade com Agent Teams AI

Ciclo de gap-closing contra o app de terceiro **Agent Teams AI**, a partir de 5 lacunas
levantadas pelo usuário. Mesmo padrão dos ciclos V2 / V2.1:

- **1 fatia por sessão.** Nunca avançar para a próxima sem instrução explícita.
- **Coordinator (`runTeam`) INTOCADO.** Extensões entram por injeção/passthrough
  (`ChatOptions`, wrapper `chat`, `buildLeadContext`) — nunca na lógica do loop.
  `flow-canvas` e `output-webhooks` preservados.
- Verify por fatia: `v22sN` (asserts) + `tsc --noEmit` limpo. Jest = gate em CI
  (não roda local, OneDrive errno -4094). E2E autenticado em prod com o usuário.
- Migração só onde indicado, **aplicada à mão** via `migrate deploy` no host real
  `sofia_db@2.24.207.200:5435` **antes do push** (o `db push` do runner falha
  silencioso no standalone).

## Decisões (confirmadas com o usuário)

- **Item 5 = ambos**: vista "Visualizar" (grafo expandido) **e** suporte a imagens.
- **Modelos novos rodam via Claude Code CLI** (mesmo caminho do Opus 4.6). Habilita
  efforts completos (`low→max`), mas exige fiar o effort no caminho CLI (hoje descartado).
- Efforts reais da Claude: `low / medium / high / xhigh / max`. "Ultracode" não existe
  na Claude (rótulo do Agent Teams AI) → topo mapeado para `max`/`xhigh`.

## Fatias

| Fatia | Item | Escopo | Migração | Status |
|-------|------|--------|----------|--------|
| **S1** | 1 | Opus 4.8/4.7 no caminho Claude Code CLI (`models/route.ts` + `CLAUDE_CLI_MODEL_MAP`) | não | ✅ `16bca9d` |
| **S2.1** | 2 | Helper PURO `model-efforts.ts` (`effortsForModel`) + dropdown derivado do modelo no `RosterEditor` + clamp no save (PATCH + `create-team`) | não | ✅ |
| **S2.2** | 2 | Fiar `effort` no caminho Claude Code CLI (`ClaudeCliService` `--effort` + branch CLI em `groq.ts`); clamp xhigh/max→high no OpenRouter | não | ✅ |
| **S3** | 3 | `Team.config.systemPrompt` + `appendTeamSystemPrompt` em `groq.ts` + injeção via wrapper `chat` (coordinator intacto) | não | — |
| **S4** | 4 | `POST .../runs/[runId]/messages` (`kind:'user'`) + surfacing no `buildLeadContext` + composer ao vivo no `TeamRunView` | não | — |
| **S5** | 5a | Botão "Visualizar" → vista grafo/canvas expandida (`@xyflow/react` + `team-graph-view`), nós enriquecidos | não | — |
| **S6** | 5b | Imagens/visão: campos de mídia no `TeamMessage`, upload no composer, pass-through ao Claude CLI, render no feed | **sim** | — |

Ordem por valor/risco: **S1 → S2 → S3 → S4 → S5 → S6**.

## S1 — Modelos atuais da Claude (item 1)

Adicionar **Claude Opus 4.8** (`claude-opus-4-8`) e **Claude Opus 4.7** (`claude-opus-4-7`)
ao caminho Claude Code CLI:

- `src/app/api/models/route.ts` — seção "Claude Code CLI models" (lista hardcoded).
- `src/lib/ai/claude-models.ts` — `CLAUDE_CLI_MODEL_MAP` (ID Polaris → flag `--model`).

`model-availability.ts` já trata qualquer `claude-*` como `claude-cli` → os novos IDs
recebem `unknown` (resolvido pelo botão "testar"); sem mudança lá.

**Verify**: model picker do RosterEditor lista Opus 4.8/4.7; `tsc` limpo; teste live de um
membro em Opus 4.8 conclui no host com CLI.

## S2 — Efforts por modelo (item 2) ✅

Decisões confirmadas (AskUserQuestion, Sessão 2): **S2.1+S2.2 juntas**; OpenRouter **clampa
xhigh/max → high** (o cast era `'low'|'medium'|'high'`); modelos sem effort real
(Haiku 4.5 / Sonnet 4.5 / Groq / Ollama / Opencode / OpenAI) → **só `auto`** (capacidade real
da skill `claude-api`, **diverge do rascunho** que dava low/medium/high a esses). Flag CLI
**confirmada** via `claude --help`: `--effort low|medium|high|xhigh|max`.

Entregue:
- **Helper PURO** `src/lib/ai/model-efforts.ts` (mesmo padrão de `model-availability.ts`):
  - `effortsForModel(id)` — matriz por versão Claude (Opus 4.7/4.8=full · Opus 4.6/Sonnet 4.6=+max−xhigh · Opus 4.5=base · resto=`[]`); inherit/null = permissivo (todos os tiers).
  - `clampEffort(model, effort)` — descarta tier inválido pro modelo → null (save guard).
  - `openRouterReasoningEffort(effort)` — xhigh/max → high; null/desconhecido → sem key.
  - `claudeCliEffortFlag(effort)` — ` --effort <tier>` ou `''` (byte-idêntico ao legado).
- **S2.1**: `RosterEditor` deriva o dropdown de effort por `effortsForModel(model)` + reseta
  effort para `auto` ao trocar pra um modelo que não suporta o tier atual. Clamp no save em
  **ambos** os caminhos: `api/teams/[id]` (PATCH) e `create-team.ts` (POST/magic-create/templates).
- **S2.2**: `ClaudeCliService.generate` ganhou param `effort` → flag `--effort` (branch CLI de
  `groq.ts` passa `reasoningEffort`); OpenRouter (groq.ts ~609) clampado via helper.
- **Coordinator INTACTO**; sem migração; sem dep nova. `scripts/v22s2-verify.ts` (casos a–d) +
  `tsc --noEmit` = 0 erros. **E2E live (Opus 4.8 com `--effort xhigh` no host) pendente.**
- **Deferido**: honrar effort no caminho **sandbox/code-run** (`sandbox-cli-agent.ts`) — fora do
  escopo S2 (chat-run apenas); DeepSeek-R1-on-OpenRouter perde low/medium/high (sem fonte
  autoritativa de que honra `reasoning_effort`; coerente com "capacidade real").
