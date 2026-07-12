# Polaris Teams V2 — Prompt inicial da Sessão 6

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S3.1 — `gitMode` no run + branch direto no worker (abre a Sprint 3).**
>
> ℹ️ **Nota de numeração:** Sprint 1 (S1.1→S1.2→S1.3) fechou nas Sessões 1–3; Sprint 2 (S2.1 na Sessão 4 + **S2.2 na Sessão 5**) FECHADA. Esta é a **Sessão 6** = **S3.1**, a **primeira** das duas fatias da Sprint 3 (S3.1 comportamento → S3.2 UI).
>
> ℹ️ **Nota de convenção do verify:** o ROADMAP cita `scripts/v2s3-verify.ts` para a S3.1, mas isso é PRÉ-convenção (texto antigo). A convenção real que se firmou é **incremental `v2s{n}`**: S1.1=v2s1, S1.2=v2s2, S1.3=v2s3, S2.1=v2s4, S2.2=v2s5 → **S3.1 = `scripts/v2s6-verify.ts`**. Use `v2s6`.

---

## Contexto pra continuar (ciclo Polaris Teams V2)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2/`** → **`ROADMAP.md`** (executável; leia a **Sprint 3, fatia S3.1**) + `ANALISE-GAP-AGENT-TEAMS-AI.md` (análise). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → S1.2 ✅ → S1.3 ✅ — FECHADA) → Sprint 2 (S2.1 ✅ → S2.2 ✅ — FECHADA) → **Sprint 3 (S3.1 🔜 → S3.2 — gitMode PR vs direto).**

**Decisão fechada que motiva a Sprint 3 (do ROADMAP, Q1/Q4 + pedido do usuário):** code-runs hoje **sempre** abrem PR draft (C1). O usuário quer **escolher por run**: **PR (gate humana via GitHub)** OU **commit direto na main** (autônomo, sem gate). Review fica no GitHub (não construir editor de merge próprio); sem resume/`waiting_for_input`.

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO.** `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) **não mudam**. A S3.1 **não toca o coordinator** — a decisão PR-vs-direto vive 100% no **worker** (`runWithRepo`, o teardown git que roda DEPOIS do `runTeam`). Diferente da S2.2 (que precisou de 1 toque de passthrough no coordinator), a S3.1 **não precisa de nenhum toque no coordinator** — `gitMode` é um campo do `TeamRun` que o worker lê, não passa pelo `chat()`.
2. **`chatWithAgent` / `groq.ts` / `code-agent.ts` INTOCADOS.** A S3.1 é puramente entrega git (clone/branch/commit/push/PR), que já está isolada em [worker/index.ts](../../src/worker/index.ts) + [repo-lifecycle.ts](../../src/lib/git/repo-lifecycle.ts). Nada de IA muda.
3. **Schema: tem migração nesta fatia.** A S3.1 adiciona **uma coluna** (`TeamRun.gitMode`) → `prisma migrate` formal **E** `migrate deploy` MANUAL no host real `sofia_db@2.24.207.200:5435` **ANTES** do push (lição SP2/SP3/S2.2: `db push` do standalone NÃO cria coluna em prod; coluna nova ausente → client regenerado quebra TODA read da tabela = 500). Esta é uma coluna nova numa tabela **enorme e quente** (`team_runs`) — atenção redobrada à ordem migração-antes-do-push.
4. **Defaults preservam o legado.** `gitMode` ausente/null → comportamento ATUAL (PR draft, branch `polaris/run-<id>`). Runs antigos sem a coluna, chat-runs e code-runs C0 (sem repo) **rodam idênticos**. O modo `'direct'` é estritamente OPT-IN.
5. **Script de verificação** `scripts/v2s6-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094). O comportamento do worker é impuro (sandbox/git/prisma) → **extrair um helper PURO** (ver decisão #2) que decide branch + abrir-PR a partir de `gitMode`, e testar ESSE helper. O E2E git real fica manual (com o usuário, contra `JeanZorzetti/repo-de-teste`).

### O que JÁ foi feito ✅ (NÃO refazer)

- **Sprint 1 FECHADA:** S1.1 (`ca612d0`) capabilities plumbadas · S1.2 (`390a693`) gate enforçado em groq.ts ([model-capabilities.ts](../../src/lib/ai/model-capabilities.ts)) · S1.3 (`33d7088`) UI no RosterEditor ([roster-mapping.ts](../../src/app/dashboard/teams/roster-mapping.ts)).
- **Sprint 2 FECHADA:** S2.1 (`48a391c`) painel "Por membro" puro UI ([member-stats.ts](../../src/app/dashboard/teams/[id]/member-stats.ts) + [MemberActivityPanel.tsx](../../src/app/dashboard/teams/[id]/MemberActivityPanel.tsx)) · **S2.2 (`a38349e`, Sessão 5)** tokens/custo por membro: tabela `team_member_usage` (append-only, FK SetNull), `ChatOptions.memberId` passthrough, `withUsageTracking` ([member-usage-recorder.ts](../../src/lib/orchestration/team/member-usage-recorder.ts)) nos 3 injetores, helper puro [member-usage.ts](../../src/app/dashboard/teams/[id]/member-usage.ts) (`aggregateUsageByMember`/`costForModel`), `usageByMember` no SSE `status`, card "X tok · $Y". v2s5=18 asserts. Migração `20260618140000_add_team_member_usage` aplicada no host real.
- **Pendente (com o usuário):** E2E autenticado de S1.1–S2.2 em prod. **Não bloqueia a S3.1.**

---

## Onde a S3.1 mexe — recap do código real (LEIA antes de codar)

### 1. Como a entrega git funciona HOJE (sempre PR draft)
Tudo em [worker/index.ts](../../src/worker/index.ts), função `runWithRepo(sandbox, runId, repoUrl, baseBranch)` (só roda em **code-run bound a repo**; chat-runs e C0 sem repo nem entram aqui):
- `const branch = ` polaris/run-${runId}` ` — sempre cria uma **working branch nova**.
- `setupRepo(sandbox, { repoUrl, token, branch, base, workdir, ... })` → clona + cria a branch; devolve `effectiveBase` (o default real do repo se `base` ausente). Persiste `branch` + `baseBranch: effectiveBase` no `TeamRun`.
- `runTeamByTopology(runId, { store, chat: codeChat, getTaskDiff })` — **o coordinator roda aqui (INTACTO)**.
- TEARDOWN (só se `status === 'completed'`): `commitAndPush(sandbox, { branch, base: effectiveBase, message, ... })`. Se `!result.hasChanges` → grava `changedFiles: []` e retorna (sem PR). Senão: `openPullRequest({ head: branch, base: effectiveBase, title, body, draft: true })` → persiste `commitSha`, `prUrl`, `prNumber`, `changedFiles`.
- Falha de teardown NÃO derruba o job (status fica `completed`, grava `error`).

⇒ **Hoje é sempre branch nova + PR draft.** A S3.1 adiciona o modo `'direct'`: **sem branch nova, commit direto na base, sem PR**.

### 2. As assinaturas de git que importam ([repo-lifecycle.ts](../../src/lib/git/repo-lifecycle.ts))
- `setupRepo(sandbox, { repoUrl, token, branch, base, workdir, authorName, authorEmail }) → { base }` — clona e cria/checkouta `branch` a partir de `base`. ⚠️ **Verificar o que acontece quando `branch === base`** (modo direto: queremos trabalhar na própria base sem criar branch nova). Pode precisar de um ramo no `setupRepo` ("se branch===base, só checkout") OU manter `setupRepo` intacto e no modo direto **não chamar setupRepo com branch nova** — ver decisão #2/gotchas.
- `commitAndPush(sandbox, { repoUrl, token, branch, base, workdir, message }) → { hasChanges, commitSha, changedFiles }` — faz add/commit/push da `branch`. No modo direto, `branch = effectiveBase` → push direto na base.
- `openPullRequest({ repoUrl, token, head, base, title, body, draft }) → { prUrl, prNumber }` — **só chamar no modo `'pr'`.**

### 3. O schema atual ([schema.prisma](../../prisma/schema.prisma), model `TeamRun`)
Já tem os campos de entrega: `repoUrl`, `baseBranch`, `branch`, `commitSha`, `prUrl`, `prNumber`, `changedFiles Json?`. **Falta `gitMode`.** É só adicionar a coluna; nenhum back-relation novo.

### 4. Como `mission`/`mode`/`repoUrl`/`base` chegam ao run hoje (onde `gitMode` entra junto)
`startTeamRun(teamId, input)` ([start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts)) recebe `StartTeamRunInput { mission, mode, userId, repoUrl?, base?, onComplete? }` e faz `prisma.teamRun.create({ data: { ..., repoUrl, baseBranch } })`. Os callers:
- **Rota de sessão** [run/route.ts](../../src/app/api/teams/[id]/run/route.ts) — mapeia campos **manualmente** (`mission: body?.mission, mode, repoUrl: body?.repoUrl, base: body?.base`). **NÃO usa `parseTeamRunBody`** → precisa adicionar `gitMode: body?.gitMode` à mão aqui.
- **API key** [v1/teams/[id]/run](../../src/app/api/v1/teams/[id]/run/route.ts) **e** [public/teams/[id]/run](../../src/app/api/public/teams/[id]/run/route.ts) — fazem `startTeamRun(id, { ...parseTeamRunBody(body), userId })`. **Ganham `gitMode` de graça** assim que `parseTeamRunBody` ([team-run-api.ts](../../src/lib/orchestration/team/team-run-api.ts)) passar a extrair `gitMode`.
- **Cron** [run-scheduled-teams](../../src/app/api/cron/run-scheduled-teams/route.ts) — dispara de `ScheduledTeamRun` (chat-only na prática; não passa `repoUrl`). `gitMode` é irrelevante aqui salvo se o schedule virar code-run com repo (fora do escopo S3.1). Não precisa tocar.

### 5. Como a UI exibe a entrega hoje (sem mudança na S3.1)
[TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx) já renderiza o painel "Entrega de código" com `branch` + `commitSha` + `prUrl` (condicional!) + `changedFiles`. **`prUrl` null já é tratado** (mostra branch+commit+arquivos sem o botão de PR). ⇒ O modo `'direct'` (prUrl null, branch = base) **renderiza graciosamente sem nenhuma mudança de UI na S3.1**. O **toggle no compositor é a S3.2** (próxima sessão).

---

## Foco desta sessão: S3.1 — `gitMode` no run + branch direto 🔜

**Objetivo (ROADMAP, fatia S3.1):** adicionar `TeamRun.gitMode` (`'pr' | 'direct'`, default `'pr'`); plumbar do body→`startTeamRun`→`TeamRun`; no worker, ler `gitMode` e no modo `'direct'` commitar direto na base **sem abrir PR**.

**Mudanças concretas (arquivo a arquivo):**
1. **Schema — `TeamRun.gitMode`** em [schema.prisma](../../prisma/schema.prisma):
   ```prisma
   gitMode String? @map("git_mode") @db.VarChar(20)  // 'pr' (default/legado) | 'direct' (commit na base, sem PR)
   ```
   Migração `2026..._add_team_run_git_mode` (formal + **`migrate deploy` MANUAL no host real ANTES do push**). Coluna nullable, sem backfill (null = legado = `'pr'`).
2. **`parseTeamRunBody`** ([team-run-api.ts](../../src/lib/orchestration/team/team-run-api.ts)) — adicionar `gitMode: 'pr' | 'direct' | null` ao `ParsedTeamRunBody` (sanitizar: só aceita `'direct'`, qualquer outra coisa → null/`'pr'`). v1/public ganham de graça.
3. **`StartTeamRunInput` + `startTeamRun`** ([start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts)) — aceitar `gitMode?` e gravar em `prisma.teamRun.create({ data: { ..., gitMode } })`. (Vale só pra code-run com repo, mas grava sempre; é inerte em chat-run.)
4. **Rota de sessão** [run/route.ts](../../src/app/api/teams/[id]/run/route.ts) — adicionar `gitMode: body?.gitMode` na chamada a `startTeamRun` (mapeamento manual).
5. **Helper PURO** (decisão #2) — algo como `src/lib/git/git-delivery-plan.ts`: `planGitDelivery(gitMode, { runId, base }) → { branch, openPr }`. Modo `'pr'`/null → `{ branch: ` polaris/run-${runId}` `, openPr: true }`; `'direct'` → `{ branch: base, openPr: false }`. **Fonte única** da decisão, testável sem sandbox/git.
6. **Worker** ([worker/index.ts](../../src/worker/index.ts), `runWithRepo`) — ler `gitMode` do `TeamRun` (já carregado no `worker` handler — incluir no `select`), chamar `planGitDelivery`, usar `plan.branch` no `setupRepo`/`commitAndPush`, e **pular `openPullRequest` quando `!plan.openPr`** (persistir só `commitSha` + `changedFiles`, deixar `prUrl`/`prNumber` null). **Verificar o caso `branch === base` no `setupRepo`** (gotcha abaixo).

**Padrão de teste — `scripts/v2s6-verify.ts`** (sobre o helper PURO `planGitDelivery`):
- (a) **`'pr'` byte-idêntico ao legado:** `planGitDelivery('pr', {runId, base})` → branch `polaris/run-<id>`, `openPr: true`.
- (b) **`null`/ausente = `'pr'`:** default preserva o legado.
- (c) **`'direct'`:** branch = base, `openPr: false`.
- (d) **robustez:** valor inválido (`'xpto'`) cai em `'pr'` sem crash.
- Mais o **E2E manual:** rodar code-run contra `JeanZorzetti/repo-de-teste` em cada modo — `'pr'` abre PR draft; `'direct'` commita na base sem PR.

### Decisões pra confirmar com o usuário ANTES de codar
1. **Default da coluna:** `gitMode String?` nullable tratado como `'pr'` no app (null = legado, **mais backward-compatible**, espelha o invariante #4) **ou** `String? @default("pr")` no banco? (Recomendado: **nullable + default no app/helper** — runs antigos já existentes ficam null e o helper os trata como `'pr'`; evita escrever default em milhares de linhas existentes.)
2. **Onde mora a decisão branch/PR:** **helper puro novo** `planGitDelivery(gitMode, {runId, base})` em `src/lib/git/git-delivery-plan.ts` (testável no v2s6, fonte única) **ou** inline no `runWithRepo`? (Recomendado: **helper puro** — é o único jeito de cobrir a S3.1 em script puro sem jest, e segue o padrão de [schedule.ts](../../src/lib/orchestration/team/schedule.ts)/[member-usage.ts](../../src/app/dashboard/teams/[id]/member-usage.ts).)
3. **Modo direto ainda persiste `changedFiles` (pro painel/diff viewer)?** Sim, manter `changedFiles` + `commitSha` (a UI de diff continua útil), só **não** abrir PR (`prUrl`/`prNumber` null) **ou** modo direto é "fire-and-forget" sem gravar diff? (Recomendado: **manter `changedFiles`+`commitSha`** — o painel já renderiza graciosamente sem PR; perder o diff seria regressão de observabilidade.)

---

## ⚠️ Gotchas de ambiente / implementação
- **`setupRepo` com `branch === base` (modo direto):** hoje `setupRepo` cria uma branch nova a partir da base. No modo direto queremos trabalhar **na própria base**. LER `repo-lifecycle.ts` (`setupRepo`) e decidir: (i) `setupRepo` ganha um ramo "se branch===base, só `git checkout base` sem `-b`", OU (ii) o worker no modo direto chama um caminho que não cria branch. **Não quebrar o modo `'pr'`** (byte-idêntico). Cobrir o `'pr'` no E2E pra garantir zero regressão.
- **`commitAndPush` empurra pra `branch`:** no modo direto `branch = base`, então o push vai direto pra `main` (ou default do repo). **Isso é o comportamento desejado e autônomo** — deixar explícito na copy da S3.2, mas a S3.1 já faz o push direto. Garantir que o `GITHUB_TOKEN` do worker tem permissão de push na base (mesma que já usa pra branch).
- **`gitMode` só afeta code-run bound a repo.** Chat-run (`mode:'chat'`) e code-run C0 (sem `repoUrl`) **ignoram** `gitMode` — nem entram em `runWithRepo`. Não plumbar nada no path C0/chat além de gravar a coluna (inerte).
- **Coluna nova em `team_runs` (tabela quente):** o SELECT do worker handler (`prisma.teamRun.findUnique({ select: { repoUrl, baseBranch } })`) precisa incluir `gitMode`. O SSE `stream/route.ts` **NÃO precisa** de `gitMode` (a UI deriva PR-vs-direto de `prUrl` presente/ausente). Não inflar o select do SSE à toa.
- **Migração ANTES do push, SEMPRE.** `team_runs` é lida em DEZENAS de rotas. Se o push subir o client (regenerado no build) esperando `git_mode` e a coluna não existir no host → 500 em TODA read de run. Aplicar `migrate deploy` no host real e confirmar a coluna existindo ANTES de `git push`.
- **Helper puro = testável sem sandbox/git/prisma:** `git-delivery-plan.ts` só recebe strings e devolve `{branch, openPr}`. O worker (com sandbox/prisma) e `repo-lifecycle.ts` NÃO entram no verify.
- **Verificação confiável:** `npx tsx scripts/v2s6-verify.ts` + `npx tsc --noEmit` (**0 erros**). Rodar antes os baselines verdes: `v2s5`/`v2s4`/`v2s3`/`v2s2`/`v2s1`. **Não rodar jest.**
- **Pre-commit hook:** typecheck = gate (bloqueia) + eslint = informativo (NÃO bloqueia). O TeamRunView já acusa eslint PRÉ-EXISTENTE (loadTeam effect, `(team as any)` do TeamOutputsPanel) — ignorar, não introduzir NOVOS.
- **Commit SELETIVO:** a árvore tem muitas mudanças não relacionadas (logos deletados, `docs/**` untracked). `git add` só nos arquivos da S3.1 (`schema.prisma` + pasta da migração `prisma/migrations/2026..._add_team_run_git_mode/` + `team-run-api.ts` + `start-team-run.ts` + `run/route.ts` + `git-delivery-plan.ts` + `worker/index.ts` + `scripts/v2s6-verify.ts`). Pathspec literal pro caminho com colchetes: `git add ':(literal)src/app/api/teams/[id]/run/route.ts'`.
- **Commit message:** preferir `git commit -F <arquivo>` (here-string do PowerShell quebra no passthrough de `·`/`$`/etc — lição da Sessão 5). Terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E git autenticado fica com o usuário** (precisa `GITHUB_TOKEN` no worker + `repo-de-teste`).

## Banco de produção / segredos
- **A S3.1 TEM migração.** Host real: `postgres://sofia_db:<senha família PAzo18**>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta pra OUTRO host `bot@31.97...` — **NÃO usar pra migração**; é inalcançável local de qualquer forma). Fluxo que funcionou na S2.2: setar `$env:DATABASE_URL` pro host real e rodar **`npx prisma migrate deploy`** (aplica as migrações pendentes da pasta `prisma/migrations/`). Como o `migrate dev` não alcança o banco local, **criar a pasta de migração + `migration.sql` à mão** (espelhando o padrão das migrações existentes) e depois `migrate deploy` no host real. Verificar a coluna existindo antes de push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 3, fatia **S3.1**) + esta nota + o recap do código real acima. **Confirmar comigo as 3 decisões ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v2s5-verify.ts` + `v2s4`/`v2s3`/`v2s2`/`v2s1` pra confirmar baseline verde.
3. **LER `repo-lifecycle.ts` (`setupRepo`/`commitAndPush`/`openPullRequest`)** pra resolver o gotcha `branch === base` antes de codar o worker.
4. **Migração primeiro:** `TeamRun.gitMode` no schema + pasta de migração + **`migrate deploy` MANUAL no host real** + verificar a coluna existindo + `prisma generate`.
5. Implementar: `parseTeamRunBody.gitMode`; `StartTeamRunInput.gitMode` + gravar no `create`; rota de sessão passa `body?.gitMode`; helper puro `planGitDelivery`; worker `runWithRepo` lê `gitMode`, usa `plan.branch`, pula PR no modo direto. **Coordinator, `groq.ts`, `code-agent.ts` INTOCADOS.**
6. `scripts/v2s6-verify.ts` (casos a–d) + `npx tsc --noEmit` limpo.
7. **Commit limpo só da fatia (inclui schema + pasta de migração) + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S3.1.** Próxima fatia (S3.2 — toggle na UI do compositor) só com instrução explícita.

> Comece confirmando comigo as **3 decisões da S3.1** antes de escrever código.
