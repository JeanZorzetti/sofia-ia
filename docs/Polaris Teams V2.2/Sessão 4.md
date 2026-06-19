# Polaris Teams V2.2 — Prompt inicial da Sessão 4

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S4 — Mensagens DURANTE a execução (item 4): `POST /api/teams/[id]/runs/[runId]/messages` (`kind:'user'`) + surfacing no `buildLeadContext` + composer ao vivo no `TeamRunView` (coordinator INTACTO).**

---

## Contexto pra continuar (ciclo Polaris Teams V2.2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.2/`** → **`ROADMAP.md`** (executável; leia a fatia **S4**). Plano espelhado em `~/.claude/plans/c-users-jeanz-onedrive-desktop-roi-labs-buzzing-penguin.md`. Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**As 5 lacunas do ciclo (do usuário):** (1) modelos só iam até Opus 4.6, queria Opus 4.8; (2) efforts correspondendo exatamente ao que a Claude oferece; (3) system prompt do TIME (além do por-agente); (4) **enviar mensagens DURANTE a execução** ← S4; (5) vista "Visualizar" (grafo) **+** suporte a imagens.

**Sequência do ciclo:** **S1 ✅ → S2 ✅ → S3 ✅ → S4 🔜 → S5 → S6.**

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam**. Extensões entram por injeção/passthrough. `flow-canvas` e `output-webhooks` preservados.
2. **Migração só onde indicado** — a S4 é **sem migração** (mensagens já moram em `TeamMessage`; `kind` já existe — confirmar). Se um dia precisar migrar: host real `sofia_db@2.24.207.200:5435`, `migrate deploy` MANUAL **antes** do push (o `.env` aponta pra OUTRO host; lição [[sofia_next_db_push_runner_fails]]).
3. **Script de verificação** `scripts/v22s4-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — run sem mensagens injetadas → comportamento **byte-idêntico** ao atual.

### O que JÁ foi feito ✅ — NÃO refazer

- **S1 (commit `16bca9d`, main):** Opus 4.8/4.7 add ao caminho Claude Code CLI.
- **S2 (commit `b861938`, main):** efforts por modelo (helper PURO `model-efforts.ts` + dropdown derivado + `--effort` no CLI + clamp xhigh/max→high no OpenRouter).
- **S3 (Sessão 3):** system prompt do TIME. Helper PURO `src/lib/orchestration/team/team-system-prompt.ts` (`appendTeamSystemPrompt` + `readTeamSystemPrompt` + `TEAM_SYSTEM_PROMPT_HEADING='## Diretrizes do time'`); aplicado em `groq.ts` `chatWithAgent` ENTRE `agent.systemPrompt` e `appendMemberWorkflow` (ordem agente → time → workflow); injetado via wrapper `chat` em `start-team-run.ts` (ambos callers) lendo `team.config.systemPrompt` — **coordinator INTACTO** (constante de time, sem tocar call-sites). Persistência: `config` é `z.record` aberto + PATCH merge raso (sem migração, sem rota nova). UI: campo textarea no editor de time (`team-config-ui.ts` `systemPrompt`/`buildTeamConfig`/`systemPromptOf` + `TeamSystemPromptField` em `page.tsx`). `scripts/v22s3-verify.ts` (a–d) + tsc 0 erros. **Code-runs deferidos** (worker/CLI-nativo, mesma limitação da S3.1). E2E live pendente. Detalhes em `ROADMAP.md` → "## S3".

---

## Foco desta sessão: S4 — Mensagens durante a execução 🔜

**Objetivo:** enquanto um run está `running`, o usuário pode mandar uma mensagem (steering cooperativo) que o **Lead** pega no próximo turno — sem interromper a chamada em curso. Run sem mensagem injetada = comportamento atual.

### Onde mexer (mapeado no ROADMAP — confirmar no código antes de codar)
- **Rota nova:** `POST /api/teams/[id]/runs/[runId]/messages` que grava uma `TeamMessage` `kind:'user'` (auth + ownership; confirmar se `kind` já existe no enum/schema — provável que sim, sem migração). Next.js 16 **async params** (`Promise<{ id, runId }>`).
- **Surfacing:** o coordinator já relê `listMessages` por turno → o `buildLeadContext` (em `team-prompts.ts`) deve incluir as mensagens `kind:'user'` injetadas no contexto do Lead do próximo turno. **NÃO mudar o loop do coordinator** — só o builder do contexto (passthrough).
- **UI:** composer ao vivo no `TeamRunView` quando `status === 'running'` (input + enviar → POST). O SSE (`runs/[runId]/stream/route.ts`) já transmite mensagens → a injetada aparece no feed.

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
1. **Quem "recebe"** a mensagem injetada: só o **Lead** no próximo turno (recomendado — steering via planejamento) ou também workers em tarefas em curso?
2. **Surfacing**: como bloco no `buildLeadContext` (ex.: `## Mensagens do usuário durante a execução`) — confirmar cabeçalho/posição.
3. **Escopo da UI**: já entregar o composer ao vivo + rota + surfacing numa fatia só (recomendado), ou só rota + surfacing e UI depois?

---

## ⚠️ Gotchas de ambiente desta máquina
- **Verificação confiável:** `npx tsx scripts/v22sN-verify.ts` (lógica pura) + `npx tsc --noEmit` (S1/S2/S3 fecharam **0 erros**). **Não rode jest** (errno -4094, OneDrive).
- **Pre-commit hook:** typecheck (gate real — bloqueia) + eslint (informativo — NÃO bloqueia). `groq.ts`/services legados cospem `no-explicit-any`/`prefer-const` **pré-existentes** — o commit passa. **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, docs untracked de outras sessões). **`git add` só nos arquivos da S4.**
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (fatia **S4**) + esta nota + a nota de memória `project_polaris_teams_v2_2`. **Confirmar comigo as decisões 1–3 ANTES de codar** (regra global #2).
2. Implementar S4: rota `POST .../runs/[runId]/messages` (`kind:'user'`) + surfacing no `buildLeadContext` + composer ao vivo no `TeamRunView` (**coordinator INTACTO**; **sem mensagem injetada = run idêntico ao de hoje**).
3. `scripts/v22s4-verify.ts` + `npx tsc --noEmit` limpo. Sem migração (confirmar `kind`).
4. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Marcar **S4 ✅** no `ROADMAP.md` e na nota de memória. **Parar na S4** (não emendar a S5). Abrir a `Sessão 5.md` apontando pro **S5** (vista grafo "Visualizar").

> Comece confirmando comigo as **decisões 1–3** e validando no código se `TeamMessage.kind` já aceita `'user'` e onde o `buildLeadContext` é montado — antes de escrever código.
