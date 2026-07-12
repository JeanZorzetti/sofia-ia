# Polaris Teams V2.2 — Prompt inicial da Sessão 6

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S6 — imagens/visão (item 5b): campos de mídia no `TeamMessage`, upload no composer, pass-through ao Claude CLI (aceita caminho de imagem), render no feed. ⚠️ ÚNICA fatia do ciclo COM MIGRAÇÃO — `migrate deploy` MANUAL no host real ANTES do push. Coordinator INTACTO.**

---

## Contexto pra continuar (ciclo Polaris Teams V2.2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.2/`** → **`ROADMAP.md`** (executável; leia a fatia **S6**). Plano espelhado em `~/.claude/plans/c-users-jeanz-onedrive-desktop-roi-labs-buzzing-penguin.md`. Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** (regra global #4). **S6 é a ÚLTIMA fatia do ciclo.**

**As 5 lacunas do ciclo (do usuário):** (1) Opus 4.8; (2) efforts reais da Claude; (3) system prompt do TIME; (4) mensagens DURANTE a execução; (5) **vista "Visualizar" (S5 ✅) + suporte a imagens ← S6 (item 5b)**.

**Sequência do ciclo:** **S1 ✅ → S2 ✅ → S3 ✅ → S4 ✅ → S5 ✅ → S6 🔜 (fecha o ciclo).**

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam**. Extensões via injeção/passthrough. `flow-canvas` e `output-webhooks` preservados.
2. **⚠️ S6 TEM MIGRAÇÃO** — campos de mídia no `TeamMessage`. Migração formal + `migrate deploy` **MANUAL** no host real `sofia_db@2.24.207.200:5435` **ANTES do push** (o `.env` aponta pra OUTRO host; o `db push` do runner falha silencioso no standalone → coluna nova nunca criada → client regenerado no build quebra TODAS as reads da tabela = 500). Lição [[sofia_next_db_push_runner_fails]]. **Precheck de dados antes de tocar a tabela** (lição do drop SP6: contar/olhar dados antes de migrar em prod).
3. **Script de verificação** `scripts/v22s6-verify.ts` — asserts puros (`node:assert`) sobre a lógica PURA (parsing/serialização de mídia, pass-through do caminho), imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — mensagem sem mídia = comportamento byte-idêntico ao atual (texto puro). Mídia é ADITIVA.

### O que JÁ foi feito ✅ — NÃO refazer

- **S1 (`16bca9d`):** Opus 4.8/4.7 no caminho Claude Code CLI.
- **S2 (`b861938`):** efforts por modelo (`model-efforts.ts` puro + dropdown + `--effort` CLI + clamp OpenRouter).
- **S3 (`c2152af`):** system prompt do TIME (`team-system-prompt.ts` puro, ordem agente→time→workflow, wrapper `chat`).
- **S4 (`8325850`):** mensagens DURANTE a execução (`MessageKind` +`'user'`, `buildUserSteeringBlock` no `buildLeadContext`, rota `POST .../runs/[runId]/messages`, composer ao vivo).
- **S5 (`9373494`):** vista "Visualizar" — `buildTeamGraph` (em `team-graph-view.ts`) **estendido** com modo `expanded` (gated; compacto byte-idêntico) → tokens/membro + owner/tarefa + status legível + arestas `related` deduplicadas; componente novo `TeamGraphView.tsx` (modal fullscreen interativo); botão "Visualizar" + `graphOpen` no `TeamRunView`. Coordinator INTACTO, sem migração. **Reaproveite o padrão: o composer ao vivo do S4 e o feed do `TeamRunView` são onde a mídia entra.**

---

## Foco desta sessão: S6 — imagens/visão (item 5b) 🔜

**Objetivo:** permitir anexar **imagens** a mensagens do time (composer do S4 e/ou na missão) e fazer o conteúdo visual chegar a um membro com modelo de **visão** (Claude via CLI aceita caminho de imagem). Render da imagem no feed do `TeamRunView`.

### Onde mexer (mapeado no ROADMAP — CONFIRMAR no código antes de codar)
- **Schema/migração** `TeamMessage` ganha campo(s) de mídia (ex.: `attachments Json?` ou `imageUrls String[]`). **Migração manual no host** (invariante #2).
- **Tipo** `team-types.ts` (`MessageRow`/`MessageKind`?) + lógica PURA de (de)serialização da mídia → testável no `v22s6-verify.ts`.
- **Pass-through ao Claude CLI** — `ClaudeCliService` / branch CLI em `groq.ts`: aceitar caminho(s) de imagem e repassar ao `claude` (confirmar a flag/sintaxe real via `claude --help`, como foi feito com `--effort` na S2).
- **Upload no composer** (`TeamRunView`) — onde guardar o arquivo (storage local do host? base64 inline? URL?). **Decisão de armazenamento é a principal a confirmar com o usuário.**
- **Render no feed** — mostrar a imagem anexada na mensagem (markdown/`<img>`).

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
1. **Armazenamento da imagem:** upload pra disco do host (caminho local que o CLI lê) · base64 inline no `TeamMessage` · URL externa/objeto? (o Claude CLI quer um **caminho de arquivo** — confirmar). Isso define o schema.
2. **Onde anexa:** só na **missão inicial** · só no **composer ao vivo (S4)** · **ambos**?
3. **Quem recebe a imagem:** o **Lead** (e ele referencia) · o **membro com modelo de visão** atribuído · todos? E o que acontece se o modelo do membro **não** tiver visão (fallback/aviso)?

---

## ⚠️ Gotchas de ambiente desta máquina
- **cwd:** o terminal abre em `C:\Users\jeanz\OneDrive\Desktop\ROI Labs` (raiz), **não** no `sofia-next` — começar com `Set-Location "...\Imob\sofia-next"`.
- **Verificação confiável:** `npx tsx scripts/v22sN-verify.ts` (lógica pura) + `npx tsc --noEmit` (S1–S5 fecharam **0 erros**). **Não rode jest** (errno -4094, OneDrive).
- **Pre-commit hook:** typecheck (gate real — bloqueia) + eslint (informativo — NÃO bloqueia). `TeamRunView.tsx` já cospe 3 `no-explicit-any` **pré-existentes** (~linhas 302-303, casts `(team as any).config` da SP2) — o commit passa. **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, docs untracked de outras sessões — incl. as `Sessão N.md`, que NÃO são commitadas). Use `GIT_LITERAL_PATHSPECS=1` no `git add` por causa do `[id]` no caminho. **`git add` só nos arquivos da S6.**
- **Hash no ROADMAP:** um commit não contém o próprio hash → na S5 fechei o feature commit e adicionei o hash num **2º commit de docs** (`docs(teams): record S5 commit hash`). Repita o padrão (ou amend pré-push) na S6.
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (fatia **S6**) + esta nota + a nota de memória `project_polaris_teams_v2_2`. **Confirmar comigo as decisões 1–3 ANTES de codar** (regra global #2).
2. Implementar S6: migração `TeamMessage` (mídia) + (de)serialização PURA + pass-through ao Claude CLI + upload no composer + render no feed (**coordinator INTACTO; flow-canvas/output-webhooks preservados**).
3. **Migração MANUAL** via `migrate deploy` no host `2.24.207.200:5435` **ANTES do push** (precheck de dados primeiro). `scripts/v22s6-verify.ts` + `npx tsc --noEmit` limpo.
4. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Marcar **S6 ✅** no `ROADMAP.md` e na nota de memória. **S6 fecha o ciclo V2.2** — registrar o fechamento (🏁) na memória. Não abrir Sessão 7 (não há mais fatias planejadas).

> Comece confirmando comigo as **decisões 1–3** e validando no código: o schema atual do `TeamMessage`, como o `ClaudeCliService`/branch CLI do `groq.ts` monta o comando `claude` (pra fiar o caminho da imagem), e a sintaxe real de imagem no `claude --help` — antes de escrever código.
