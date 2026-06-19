# Polaris Teams V2.2 — Prompt inicial da Sessão 3

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S3 — System prompt do TIME (item 3): `Team.config.systemPrompt` + helper `appendTeamSystemPrompt` em `groq.ts`, injetado via wrapper `chat` (coordinator INTACTO).**

---

## Contexto pra continuar (ciclo Polaris Teams V2.2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.2/`** → **`ROADMAP.md`** (executável; leia a fatia **S3**). Plano espelhado em `~/.claude/plans/c-users-jeanz-onedrive-desktop-roi-labs-buzzing-penguin.md`. Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**As 5 lacunas do ciclo (do usuário):** (1) modelos só iam até Opus 4.6, queria Opus 4.8; (2) efforts correspondendo exatamente ao que a Claude oferece; (3) **system prompt do TIME (além do por-agente)** ← S3; (4) enviar mensagens DURANTE a execução; (5) vista "Visualizar" (grafo) **+** suporte a imagens.

**Sequência do ciclo:** **S1 ✅ → S2 ✅ → S3 🔜 → S4 → S5 → S6.**

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam**. Extensões entram por injeção/passthrough (`ChatOptions`, wrapper `chat`, `buildLeadContext`). `flow-canvas` e `output-webhooks` preservados.
2. **Migração só onde indicado** — a S3 é **sem migração** (`systemPrompt` mora em `Team.config`, que é JSON). Se um dia precisar migrar: host real `sofia_db@2.24.207.200:5435`, `migrate deploy` MANUAL **antes** do push (o `.env` aponta pra OUTRO host; lição [[sofia_next_db_push_runner_fails]]).
3. **Script de verificação** `scripts/v22s3-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — time sem `systemPrompt` (ou vazio) → prompt **byte-idêntico** ao atual (mesma chamada de hoje).

### O que JÁ foi feito ✅ — NÃO refazer

- **S1 (commit `16bca9d`, main):** Opus 4.8/4.7 add ao caminho Claude Code CLI (`models/route.ts` seção CLI + `CLAUDE_CLI_MODEL_MAP` em `claude-models.ts`). Sem schema. E2E live pendente.
- **S2 (Sessão 2):** efforts por modelo. Helper PURO `src/lib/ai/model-efforts.ts` (`effortsForModel`/`clampEffort`/`openRouterReasoningEffort`/`claudeCliEffortFlag`); `RosterEditor` deriva o dropdown do modelo + reseta ao trocar; clamp no save (PATCH `api/teams/[id]` + `create-team.ts`); `ClaudeCliService.generate` ganhou `--effort` (branch CLI de `groq.ts` passa `reasoningEffort`); OpenRouter clampa xhigh/max→high. `scripts/v22s2-verify.ts` (a–d) + tsc 0 erros. **Coordinator intacto, sem migração.** E2E live (Opus 4.8 `--effort xhigh` no host) pendente. Detalhes em `ROADMAP.md` → "## S2".

---

## Foco desta sessão: S3 — System prompt do TIME 🔜

**Objetivo:** o time inteiro pode carregar um system prompt comum (cultura/guard-rails/tom), aplicado a TODO membro, **além** do prompt por-agente e do `workflow` por-membro (S3.1 do V2.1). Vazio = legado.

### Onde mexer (mapeado no ROADMAP — confirmar no código antes de codar)
- **Persistência:** `Team.config.systemPrompt` (string opcional dentro do JSON `config`). Já há precedente: `config.outputWebhooks` (SP2), `config` é mesclado raso no PATCH `api/teams/[id]`. **Sem migração.**
- **UI:** um campo de texto no editor de time (onde `name`/`description`/`config` são editados — provável `EditTeamModal` / `page.tsx` de criação). Salva em `config.systemPrompt`.
- **Aplicação:** helper PURO novo `appendTeamSystemPrompt(systemPrompt, teamPrompt)` em `groq.ts` (ou arquivo puro irmão tipo `member-workflow.ts`), concatenado **entre** `agent.systemPrompt` e o `appendMemberWorkflow` (ordem: agente → **time** → workflow do membro → memória/lead/plugins). Vazio → retorna inalterado (byte-idêntico).
- **Injeção:** via o caminho que já passa opções por-membro a `chatWithAgent` (wrapper `chat` / `ChatOptions` montado no caller que dispara o run — provável `start-team-run.ts` / `team-coordinator` caller). **NÃO no coordinator (`runTeam`)** — segue o padrão do ciclo (injeção no worker/caller). Confirmar onde o `ChatOptions` por-membro é montado (model/effort/capabilities/workflow já trafegam por lá — o teamPrompt entra junto).

### Padrão de teste `scripts/v22s3-verify.ts`
- `appendTeamSystemPrompt(base, '')` / `(base, null)` → `base` inalterado (regressão).
- `appendTeamSystemPrompt(base, team)` → concatena na posição/formato definidos, idempotente e na ordem certa relativa ao workflow.
- (se houver helper de merge de config) `systemPrompt` persiste no `config` sem apagar `outputWebhooks`/`schedules` existentes (merge raso).

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
1. **Posição do prompt do time** na pilha: agente → **time** → workflow-do-membro (recomendado: o do time é "cultura comum", o workflow é o mais específico e deve colorir por último) — confirmar.
2. **Formato/cabeçalho** do bloco injetado (ex.: `\n\n## Diretrizes do time\n{texto}`) ou concat cru — confirmar 1 linha.
3. **Escopo da UI nesta sessão:** já entregar o campo no editor + persistência + aplicação numa fatia só (recomendado, fecha valor real), ou só persistência+aplicação e UI depois?

---

## ⚠️ Gotchas de ambiente desta máquina
- **Verificação confiável:** `npx tsx scripts/v22sN-verify.ts` (lógica pura) + `npx tsc --noEmit` (S1 e S2 fecharam **0 erros**). **Não rode jest** (errno -4094, OneDrive).
- **Pre-commit hook:** typecheck (gate real — bloqueia) + eslint (informativo — NÃO bloqueia). `groq.ts`/services legados cospem `no-explicit-any`/`prefer-const` **pré-existentes** — o commit passa. **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada. **`git add` só nos arquivos da S3.**
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (fatia **S3**) + esta nota + a nota de memória `project_polaris_teams_v2_2`. **Confirmar comigo as decisões 1–3 ANTES de codar** (regra global #2).
2. Implementar S3: `Team.config.systemPrompt` (persistência + UI) + `appendTeamSystemPrompt` (puro) + injeção via wrapper `chat`/`ChatOptions` (**coordinator INTACTO**; **sem team prompt = chamada idêntica à de hoje**).
3. `scripts/v22s3-verify.ts` + `npx tsc --noEmit` limpo. Sem migração.
4. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Marcar **S3 ✅** no `ROADMAP.md` e na nota de memória. **Parar na S3** (não emendar a S4). Abrir a `Sessão 4.md` apontando pro **S4** (mensagens durante a execução).

> Comece confirmando comigo as **decisões 1–3** e validando no código onde o `ChatOptions` por-membro é montado — antes de escrever código.
