# Polaris Teams V2 — Prompt inicial da Sessão 7

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S3.2 — toggle PR/direto na UI do compositor de run (FECHA a Sprint 3 e o escopo planejado do ciclo V2).**
>
> ℹ️ **Nota de numeração:** Sprint 1 (S1.1→S1.2→S1.3) fechou nas Sessões 1–3; Sprint 2 (S2.1 Sessão 4 + S2.2 Sessão 5) FECHADA; **Sprint 3: S3.1 (Sessão 6, `fe33543`) FEITA**. Esta é a **Sessão 7** = **S3.2**, a **segunda e última** fatia da Sprint 3 (S3.1 comportamento ✅ → S3.2 UI 🔜).
>
> ℹ️ **Nota de convenção do verify:** convenção firmada é **incremental `v2s{n}`**: S1.1=v2s1 … S2.2=v2s5, S3.1=v2s6 → **S3.2 = `scripts/v2s7-verify.ts`**. Use `v2s7`.

---

## Contexto pra continuar (ciclo Polaris Teams V2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2/`** → **`ROADMAP.md`** (executável; leia a **Sprint 3, fatia S3.2**) + `ANALISE-GAP-AGENT-TEAMS-AI.md` (análise). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅) → Sprint 2 (S2.1 ✅ → S2.2 ✅) → **Sprint 3 (S3.1 ✅ → S3.2 🔜 — toggle na UI).**

**O que a S3.2 é (do ROADMAP):** a S3.1 já entregou TODO o comportamento — `TeamRun.gitMode` (`'pr'|'direct'`), parsing, persistência sanitizada e o worker que no modo `'direct'` commita direto na base **sem abrir PR**. **Falta só a PONTA da UI:** um toggle no compositor de run (modo Código) que deixe o usuário escolher **"Abrir PR (revisar no GitHub)"** vs **"Commit direto na main"**, default PR, e **enviar `gitMode` no POST de run**. Nada de IA, nada de schema, nada de worker.

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO.** `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam**. A S3.2 é puramente **front-end + 1 campo no body do POST**.
2. **`chatWithAgent` / `groq.ts` / `code-agent.ts` / `worker/index.ts` / `repo-lifecycle.ts` INTOCADOS.** O comportamento PR-vs-direto já existe e está testado (S3.1). A S3.2 só **manda o flag** que esses já consomem.
3. **Sem schema, sem migração.** A coluna `team_runs.git_mode` (VarChar 20, nullable) **já existe em prod** (aplicada na S3.1, host real `sofia_db@2.24.207.200:5435`). A S3.2 **não toca o banco**.
4. **Defaults preservam o legado.** Default do toggle = **PR**. Chat-run continua mandando `{ mission, mode }` byte-idêntico (sem `gitMode`). Code-run sem escolha explícita = PR. O servidor já trata `gitMode` ausente/≠'direct' como `'pr'` (`planGitDelivery`).
5. **Script de verificação** `scripts/v2s7-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094). Como UI não é testável em script puro, **extrair um helper PURO** que monta o body do POST a partir do estado do compositor (ver decisão #1) e testar ESSE helper. O E2E real (clicar nos dois modos) fica manual.

### O que JÁ foi feito ✅ (NÃO refazer)

- **Sprint 1 FECHADA:** S1.1 (`ca612d0`) capabilities plumbadas · S1.2 (`390a693`) gate enforçado em groq.ts ([model-capabilities.ts](../../src/lib/ai/model-capabilities.ts)) · S1.3 (`33d7088`) UI no RosterEditor ([roster-mapping.ts](../../src/app/dashboard/teams/roster-mapping.ts)).
- **Sprint 2 FECHADA:** S2.1 (`48a391c`) painel "Por membro" puro UI ([member-stats.ts](../../src/app/dashboard/teams/[id]/member-stats.ts) + [MemberActivityPanel.tsx](../../src/app/dashboard/teams/[id]/MemberActivityPanel.tsx)) · S2.2 (`a38349e`) tokens/custo por membro (tabela `team_member_usage`, helper [member-usage.ts](../../src/app/dashboard/teams/[id]/member-usage.ts)).
- **S3.1 (`fe33543`, Sessão 6) — comportamento gitMode:** coluna `TeamRun.gitMode` (migração `20260618160000_add_team_run_git_mode`, aplicada no host real); helper PURO [git-delivery-plan.ts](../../src/lib/git/git-delivery-plan.ts) (`planGitDelivery(gitMode,{runId,base}) → {branch, openPr}`: `'direct'`→branch=base+`openPr:false`; qualquer-outra→`polaris/run-<id>`+`openPr:true`); `parseTeamRunBody.gitMode` ([team-run-api.ts](../../src/lib/orchestration/team/team-run-api.ts)); `StartTeamRunInput.gitMode`+`startTeamRun` grava **sanitizado** (só `'direct'`|null entra na coluna) ([start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts)); rota de sessão passa `body?.gitMode` ([run/route.ts](../../src/app/api/teams/[id]/run/route.ts)); worker `runWithRepo` lê `gitMode`, usa `plan.branch`, pula `openPullRequest` no direct (persiste `commitSha`+`changedFiles`); `setupRepo` pula `checkout -b` quando `branch===base`. v2s6=13 asserts, suíte v2s1–v2s6 verde (92), tsc=0.
- **Pendente (com o usuário):** E2E autenticado de S1.1–S3.1 em prod. **Não bloqueia a S3.2.** Em especial o E2E git da S3.1 (precisa `GITHUB_TOKEN` no worker + `repo-de-teste`) pode ser feito JUNTO com o E2E da S3.2 (ambos exercitam PR vs direto).

---

## Onde a S3.2 mexe — recap do código real (LEIA antes de codar)

Quase tudo num arquivo: **[TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx)** (`'use client'`).

### 1. O estado e o disparo do compositor (HOJE)
- Estado do modo: `const [mode, setMode] = useState<RunMode>('chat')` (≈L74). `RunMode` = `'chat' | 'code'`.
- `startRun()` (≈L148-166) faz: `fetch(\`/api/teams/${teamId}/run\`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mission, mode }) })`. **É AQUI que `gitMode` precisa entrar** (≈L154).
- O `gitMode` NÃO é estado ainda — **criar `const [gitMode, setGitMode] = useState<GitMode>('pr')`** (importar `type GitMode` de [git-delivery-plan.ts](../../src/lib/git/git-delivery-plan.ts) — import type, OK em client component).

### 2. O toggle de modo (chat/Código) — padrão visual a espelhar (HOJE)
- Por volta de L245-258: um grupo de `<button>` mapeado de `[{key:'chat',...},{key:'code',label:'Código',Icon:Code2}]`, cada um com `onClick={() => setMode(key)}` e classe condicional `mode === key ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white/80'`. **Espelhar esse mesmo segmented control pro `gitMode`.**
- Logo abaixo (L259-263), **só quando `mode === 'code'`**, já existe um hint inline: `<span>… <TerminalIcon/> roda em sandbox isolado</span>`. **O toggle de gitMode entra nesse mesmo bloco `{mode === 'code' && ( … )}`** (ao lado/abaixo do hint).

### 3. Como o repo é resolvido (por que o toggle só faz sentido em Código)
- O compositor **NÃO tem input de repoUrl/base** — o repo vem de `Team.config` (resolvido no [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts): `repoUrl = input.repoUrl ?? cfg.repoUrl`). Logo `gitMode` só importa em **code-run bound a repo**. Em chat-run e code-run C0 (sem repo) ele é **inerte** (o worker nem entra em `runWithRepo`). ⇒ **Só mostrar o toggle quando `mode === 'code'`** e **só mandar `gitMode` no body quando `mode === 'code'`** (chat-run fica byte-idêntico).

### 4. O painel de entrega (SEM mudança nesta fatia)
- O painel "Entrega de código" do TeamRunView já renderiza `prUrl` **condicionalmente** (S3.1 confirmou: modo direto = `prUrl` null → mostra branch+commit+arquivos, sem botão de PR). ⇒ **A S3.2 não mexe na exibição da entrega**, só no INPUT (o toggle).

---

## Foco desta sessão: S3.2 — toggle na UI do compositor 🔜

**Objetivo (ROADMAP, fatia S3.2):** segmented control no compositor (modo Código) **"Abrir PR (revisar no GitHub)" / "Commit direto na main"**, default PR; copy deixando claro que "direto na main" é autônomo (sem gate); enviar `gitMode` no POST de run.

**Mudanças concretas (arquivo a arquivo):**
1. **Helper PURO novo** (decisão #1) — algo como `src/app/dashboard/teams/[id]/run-request.ts`: `buildRunRequest({ mission, mode, gitMode }) → { mission, mode, gitMode? }`. Regras: sempre `{mission, mode}`; **inclui `gitMode` SÓ quando `mode === 'code'`** (chat-run omite). Fonte única do payload, testável no v2s7 sem React. (Espelha [roster-mapping.ts](../../src/app/dashboard/teams/roster-mapping.ts)/[member-stats.ts](../../src/app/dashboard/teams/[id]/member-stats.ts).)
2. **[TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx):**
   - `import type { GitMode } from '@/lib/git/git-delivery-plan'` + `import { buildRunRequest } from './run-request'`.
   - `const [gitMode, setGitMode] = useState<GitMode>('pr')`.
   - No `startRun()` (≈L154), trocar o `body` por `JSON.stringify(buildRunRequest({ mission, mode, gitMode }))`.
   - Dentro do bloco `{mode === 'code' && ( … )}` (≈L259), adicionar o segmented control (espelhando o toggle de modo): dois botões PR/direto, classe ativa `bg-blue-500/20 text-blue-300`, `disabled={running}`, + um micro-aviso quando `gitMode === 'direct'` ("⚠️ commita direto na main, sem revisão").
3. **`scripts/v2s7-verify.ts`** — sobre `buildRunRequest` (casos a–d abaixo).

**Padrão de teste — `scripts/v2s7-verify.ts`** (sobre o helper PURO `buildRunRequest`):
- (a) **chat-run byte-idêntico ao legado:** `buildRunRequest({mission:'x', mode:'chat', gitMode:'pr'})` → `{ mission:'x', mode:'chat' }` (SEM chave `gitMode`).
- (b) **chat ignora gitMode:** mesmo com `gitMode:'direct'`, modo chat **não** inclui `gitMode` (inerte).
- (c) **code + 'pr':** `{ mission, mode:'code', gitMode:'pr' }` → body com `gitMode:'pr'`.
- (d) **code + 'direct':** body com `gitMode:'direct'`.
- Mais o **E2E manual:** rodar code-run contra `JeanZorzetti/repo-de-teste` em cada modo via a UI — "Abrir PR" → PR draft; "Commit direto na main" → commit na base sem PR.

### Decisões pra confirmar com o usuário ANTES de codar
1. **Onde mora a montagem do body:** **helper puro novo** `buildRunRequest` em `src/app/dashboard/teams/[id]/run-request.ts` (testável no v2s7, fonte única) **ou** inline no `startRun`? (Recomendado: **helper puro** — único jeito de cobrir no v2s7 sem jest; segue o padrão da S1.3/S2.1.)
2. **Enviar `gitMode` só no modo Código (omitir no chat) e default `'pr'`** **ou** sempre enviar? (Recomendado: **só no Código, default `'pr'`** — chat-run permanece `{mission, mode}` byte-idêntico; o servidor já trata ausência como `'pr'`.)
3. **UX do toggle:** segmented control inline (espelhando o toggle de modo) **dentro do bloco `{mode==='code'}`**, com copy "Abrir PR (revisar no GitHub)" / "Commit direto na main" + micro-aviso de que o direto é autônomo/sem gate. (Recomendado: **sim** — consistente com o segmented control de modo já existente; o aviso evita o usuário commitar na main sem perceber.)

---

## ⚠️ Gotchas de ambiente / implementação
- **Sem schema/migração nesta fatia.** Não rodar `migrate`/`db push`. A coluna já existe em prod (S3.1).
- **Só mostrar/enviar `gitMode` no modo Código.** Não plumbar nada no path chat. Se quiser refinar, dá pra esconder o toggle quando o time não tem repo em `Team.config` (code-run C0) — **mas isso exige expor `config.repoUrl` ao cliente**; recomendo **NÃO** fazer agora (toggle sempre visível em Código é inofensivo: gitMode é inerte em C0, igual ao servidor). Anotar como refino opcional, fora do escopo.
- **`GitMode` é type-only no cliente.** `import type { GitMode }` — não importar valor de [git-delivery-plan.ts](../../src/lib/git/git-delivery-plan.ts) no client bundle à toa (a função `planGitDelivery` é server/worker-side; o cliente só precisa do tipo).
- **Pre-commit hook:** typecheck = gate (bloqueia) + eslint = informativo (NÃO bloqueia). O TeamRunView **já acusa eslint PRÉ-EXISTENTE** (loadTeam effect, `(team as any)` do TeamOutputsPanel) — ignorar, **não introduzir NOVOS**.
- **Commit SELETIVO:** a árvore tem muitas mudanças não relacionadas (logos deletados, `docs/**` untracked). `git add` só nos arquivos da S3.2 (`run-request.ts` + `TeamRunView.tsx` + `scripts/v2s7-verify.ts`). Pathspec literal pro caminho com colchetes: `git add ':(literal)src/app/dashboard/teams/[id]/TeamRunView.tsx'`.
- **Commit message:** preferir `git commit -F <arquivo>` (here-string do PowerShell quebra no passthrough de `·`/`$`/etc — lição das Sessões 5/6). Terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Verificação confiável:** `npx tsx scripts/v2s7-verify.ts` + `npx tsc --noEmit` (**0 erros**). Rodar antes os baselines verdes: `v2s6`…`v2s1`. **Não rodar jest.**
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app). **E2E pela UI fica com o usuário** (login + time com repo configurado + `GITHUB_TOKEN` no worker + `repo-de-teste`).

## Banco de produção / segredos
- **A S3.2 NÃO tem migração.** (Se precisar do host por algum motivo: `postgres://sofia_db:<senha família PAzo18**>@2.24.207.200:5435/sofia_db?sslmode=disable`; o `.env` aponta pra OUTRO host `bot@31.97...` inalcançável local — não usar.)
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 3, fatia **S3.2**) + esta nota + o recap do código real acima. **Confirmar comigo as 3 decisões ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v2s6-verify.ts` + `v2s5`…`v2s1` pra confirmar baseline verde.
3. Implementar: helper puro `buildRunRequest`; `gitMode` state no TeamRunView; segmented control no bloco `{mode==='code'}`; `startRun` manda `buildRunRequest(...)`. **Coordinator, groq.ts, worker, repo-lifecycle INTOCADOS.**
4. `scripts/v2s7-verify.ts` (casos a–d) + `npx tsc --noEmit` limpo.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S3.2.**
6. 🏁 **Com a S3.2, a Sprint 3 e o escopo planejado do ciclo V2 (vereditos PEGAR + ADAPTAR-barato) fecham.** O que sobra é o **backlog explícito** do ROADMAP (cross-team `@HANDOFF`, resume `waiting_for_input`, tool-calling nativo non-OpenRouter, drag-drop kanban, anexos, multi-reviewer etc.) — **só abrir com instrução explícita**. Sugerir ao usuário rodar o **E2E final do ciclo** (seção "E2E final" do ROADMAP) em prod.

> Comece confirmando comigo as **3 decisões da S3.2** antes de escrever código.
