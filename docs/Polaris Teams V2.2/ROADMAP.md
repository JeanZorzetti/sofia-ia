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
| **S1** | 1 | Opus 4.8/4.7 no caminho Claude Code CLI (`models/route.ts` + `CLAUDE_CLI_MODEL_MAP`) | não | — |
| **S2.1** | 2 | Mapa `MODEL_EFFORTS` por modelo + dropdown derivado do modelo no `RosterEditor` + validação/clamp no servidor | não | — |
| **S2.2** | 2 | Fiar `effort` no caminho Claude Code CLI (`ClaudeCliService` + branch CLI em `groq.ts`); clamp no OpenRouter | não | — |
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
