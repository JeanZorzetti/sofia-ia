# Polaris Teams V2.2 — Prompt inicial da Sessão 2

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S2 — Efforts por modelo (item 2): `MODEL_EFFORTS` + dropdown derivado do modelo (S2.1) e fiar o `effort` no caminho Claude Code CLI (S2.2).**

---

## Contexto pra continuar (ciclo Polaris Teams V2.2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.2/`** → **`ROADMAP.md`** (executável; leia a fatia **S2**). Plano espelhado em `~/.claude/plans/c-users-jeanz-onedrive-desktop-roi-labs-buzzing-penguin.md`. Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**As 5 lacunas do ciclo (do usuário):** (1) modelos só iam até Opus 4.6, queria Opus 4.8; (2) efforts correspondendo exatamente ao que a Claude oferece; (3) system prompt do TIME (além do por-agente); (4) enviar mensagens DURANTE a execução; (5) vista "Visualizar" (grafo) **+** suporte a imagens.

**Decisões já tomadas (AskUserQuestion, Sessão 1):**
- **Item 5 = ambos** (vista grafo expandida + imagens).
- **Modelos novos rodam via Claude Code CLI** (mesmo caminho do Opus 4.6). Isso habilita os efforts completos (`low→max`) **mas exige fiar o effort no caminho CLI** — é exatamente o que a S2.2 faz.
- Efforts reais da Claude = **`low / medium / high / xhigh / max`**. **"Ultracode" NÃO existe na Claude** (é rótulo do Agent Teams AI) → topo = `max` (e `xhigh`).

**Sequência do ciclo:** **S1 ✅ → S2 🔜 → S3 → S4 → S5 → S6.**

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam**. A S2 mexe em: helper PURO novo de capacidade de effort, o `RosterEditor` (UI), a validação no save do roster, `chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)) e `ClaudeCliService` ([claude-cli-service.ts](../../src/services/claude-cli-service.ts)). **Coordinator não.** `flow-canvas` e `output-webhooks` preservados.
2. **Sem schema/migração nesta fatia** — `TeamMember.effort` (VARCHAR(20)) já existe; a S2 só muda **quais valores** são oferecidos/validados e **se o CLI honra** o valor. (Se um dia precisar migrar: host real `sofia_db@2.24.207.200:5435`, `migrate deploy` MANUAL antes do push — o `.env` aponta pra OUTRO host; lição [[sofia_next_db_push_runner_fails]].)
3. **Script de verificação** `scripts/v22s2-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — `effort: 'inherit'/null` e modelos sem reasoning caem no comportamento de hoje. **Regressão: sem effort = byte-idêntico ao atual** (mesma chamada de hoje).

### O que JÁ foi feito ✅ — S1 (Sessão 1) — NÃO refazer

- **S1 (commit `16bca9d`, main):** adicionados **Opus 4.8** (`claude-opus-4-8`) e **Opus 4.7** (`claude-opus-4-7`) ao caminho Claude Code CLI — em [models/route.ts](../../src/app/api/models/route.ts) (seção "Claude Code CLI models", linhas ~34-36) e no `CLAUDE_CLI_MODEL_MAP` de [claude-models.ts](../../src/lib/ai/claude-models.ts). `model-availability.ts` já trata `claude-*` como `claude-cli` (status `unknown`, resolvido pelo "testar") → sem mudança lá. Sem schema. `tsc` limpo + pre-commit hook passou.
- **Pendente da S1 (com o usuário):** E2E real no host com Claude CLI rodando um membro em **Opus 4.8** ponta-a-ponta. **Não bloqueia a S2.**
- **⚠️ A S1 listou os modelos, mas o effort ainda NÃO é honrado neles** — porque o branch Claude CLI de `chatWithAgent` **descarta** o effort hoje. É justamente o buraco que a **S2.2** fecha.

---

## Onde a S2 mexe — código real

### Estado atual do effort (mapeado na Sessão 1)
- **Dropdown fixo** `auto/low/medium/high` em [RosterEditor.tsx](../../src/app/dashboard/teams/RosterEditor.tsx) — constante `EFFORTS` (linhas ~28-33). **Não varia por modelo** e **não tem xhigh/max**.
- **Tipo do roster** `RosterRow.effort` em [roster-mapping.ts](../../src/app/dashboard/teams/roster-mapping.ts) (linhas ~13-23); `rosterToMembers()` converte `'inherit'`→`null` (linhas ~47-59).
- **Persistido** em `TeamMember.effort` (schema linha ~1245) via o save do roster (rota de update do time, `src/app/api/teams/[id]/route.ts`).
- **Aplicado SÓ no path OpenRouter:** [groq.ts](../../src/lib/ai/groq.ts) — `const reasoningEffort = options?.effort || null` (linha ~150) → `...(reasoningEffort ? { reasoning_effort: reasoningEffort as 'low'|'medium'|'high' } : {})` (linha ~609). O cast assume só 3 valores.
- **DESCARTADO no path Claude Code CLI:** o branch CLI (~linhas 340-350) chama `ClaudeCliService.generate()` **sem repassar o effort**. [claude-cli-service.ts](../../src/services/claude-cli-service.ts) monta `claude --print --dangerously-skip-permissions --output-format json [--model ...]` (≈ linha 43) — **nenhuma flag de effort/thinking**.
- **Groq nativo / Ollama:** não têm reasoning — effort não se aplica (deixar como está; o mapa `MODEL_EFFORTS` declara isso = sem opções de effort, só `auto`).
- **Precedente de arquivo de capacidade PURO:** já existe `model-capabilities.ts` / `model-availability.ts` em `src/lib/ai/` — siga o mesmo padrão.

---

## Foco desta sessão: S2 — Efforts por modelo 🔜

**Objetivo:** o dropdown de effort de cada membro reflete **exatamente** os tiers que o modelo selecionado suporta, e o valor escolhido **chega de verdade ao modelo** (inclusive no caminho Claude Code CLI, que é o que o usuário escolheu para os modelos novos).

### S2.1 — Mapa de capacidade + dropdown derivado + clamp no servidor (sem schema)
1. **Helper PURO novo** `src/lib/ai/model-efforts.ts`: `effortsForModel(modelId): string[]` retornando os tiers reais por modelo. Mapa (baseado na skill `claude-api`):
   - Opus 4.8 / Opus 4.7 → `low, medium, high, xhigh, max`
   - Opus 4.6 / Sonnet 4.6 → `low, medium, high, max` (sem `xhigh`)
   - Sonnet 4.5 / Haiku 4.5 e anteriores → `low, medium, high` (sem `xhigh`/`max`)
   - modelos sem reasoning (Groq/Ollama/etc.) → `[]` (só `auto`/inherit)
   **PURO** (sem I/O), testável direto.
2. **RosterEditor:** trocar a constante fixa `EFFORTS` por opções derivadas de `effortsForModel(membro.model)` + sempre `auto` (inherit). Ao trocar o modelo do membro, se o effort atual não for suportado → resetar pra `auto`.
3. **Clamp no servidor:** na rota de save do roster (`api/teams/[id]/route.ts`), validar `effort ∈ effortsForModel(model) ∪ {null}`; valor inválido → `null` (auto). Evita persistir `max` num Haiku.

### S2.2 — Fiar o effort no caminho Claude Code CLI (sem schema)
1. **Threading:** repassar `options.effort` de `chatWithAgent` → `ClaudeCliService.generate()` (e ao sandbox CLI [sandbox-cli-agent.ts](../../src/lib/orchestration/team/sandbox-cli-agent.ts) se o code-run também deve honrar). Mesmo estilo de injeção do `model`/`effort`/`capabilities` do V2/V2.1.
2. **Montar a flag** no `shellCmd` do `claude-cli-service.ts` a partir do effort. ⚠️ **CONFIRMAR contra a versão instalada qual a flag real** (decisão #1) — não inventar nome de flag.
3. **OpenRouter:** ampliar/clampar o `reasoning_effort` — passar `xhigh`/`max` se o OpenRouter suportar para o modelo; senão **clampar a `high`** (o cast hoje é `'low'|'medium'|'high'`). Não emitir valor que o provider rejeite.
4. **Regressão:** sem effort (`null`) → chamada **idêntica** à de hoje em todos os paths.

**Padrão de teste** `scripts/v22s2-verify.ts`:
- (a) `effortsForModel('claude-opus-4-8')` inclui `xhigh`+`max`; `claude-opus-4-6` tem `max` mas **não** `xhigh`; `claude-haiku-4-5` só `low/medium/high`; modelo Groq → `[]`.
- (b) clamp: effort inválido pro modelo → vira `null`.
- (c) montagem da flag CLI: effort `high`/`xhigh`/`max` → flag correta (conforme decisão #1); `null` → **sem** flag (string de comando byte-idêntica à atual).
- (d) OpenRouter: clamp/translate conforme decidido; `null` → sem `reasoning_effort`.

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
0. **S2.1+S2.2 numa sessão só, ou só a S2.1?** Recomendação: **as duas juntas** — a S2.1 sozinha oferece efforts que o CLI ignora (mesmo sintoma da S1). Fechar a S2 inteira entrega valor real.
1. **Flag de effort do Claude Code CLI:** rodar `claude --help` (na versão instalada do host/máquina) **cedo** e confirmar **se/como** o CLI aceita effort ou thinking-budget no modo `--print`. Se a versão instalada **não** expuser flag de effort → documentar a limitação e decidir o fallback (ex.: só o path OpenRouter honra effort; ou usar `ANTHROPIC_*`/config). **Não prometer uma flag que não existe.** Este é o principal risco da S2.2.
2. **OpenRouter `xhigh`/`max`:** passar adiante se suportado, ou clampar a `high`? (Default seguro: clampar, e só liberar o que o provider aceitar.)
3. **Rótulos do dropdown:** usar os nomes reais da Claude (`low/medium/high/xhigh/max`) — confirmado pelo usuário ("corresponder exatamente ao que a Claude oferece"); **não** usar "Ultracode".

---

## ⚠️ Gotchas de ambiente desta máquina
- **Verificação confiável:** `npx tsx scripts/v22sN-verify.ts` (lógica pura) + `npx tsc --noEmit` (na Sessão 1 o `tsc` fechou **0 erros**). **Não rode jest** (errno -4094, OneDrive). `tsc` pode acusar erros de deps opcionais (bullmq/e2b/xterm/diff2html) — ignorar; o que importa são os arquivos da fatia.
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. `groq.ts`/services legados cospem `no-explicit-any`/`prefer-const` **pré-existentes** — o commit passa mesmo assim. **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, vários `docs/**` untracked). **`git add` só nos arquivos da S2** (`model-efforts.ts` novo, `RosterEditor.tsx`, a rota de save do roster, `groq.ts`/`claude-cli-service.ts`, `scripts/v22s2-verify.ts`, e marcar a S2 no `ROADMAP.md`).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S2 não precisa de migração** (sem mudança de schema — `TeamMember.effort` já existe).
- 🔐 **Higiene (expostos no chat, rotacionar):** segredos registrados em `secrets_to_rotate.md`.

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (fatia **S2**) + esta nota + a nota de memória `project_polaris_teams_v2_2`. **Confirmar comigo a decisão #0 e rodar `claude --help` (decisão #1) ANTES de codar** (regra global #2).
2. Implementar a **S2.1** (helper PURO `model-efforts.ts` + dropdown derivado no `RosterEditor` + clamp no save) e a **S2.2** (threading do effort até `ClaudeCliService` + montagem da flag CLI conforme `claude --help` + clamp/translate no OpenRouter). **Coordinator INTACTO**; **sem effort = chamada idêntica à de hoje**.
3. `scripts/v22s2-verify.ts` (casos a–d) + `npx tsc --noEmit` limpo. Sem migração.
4. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Marcar **S2 ✅** no `ROADMAP.md` e na nota de memória. **Parar na S2** (não emendar a S3). Abrir a `Sessão 3.md` apontando pro **S3** (system prompt do time).

> Comece confirmando comigo a **decisão #0** e rodando **`claude --help`** pra ancorar a flag de effort em algo REAL — antes de escrever código.
