# Polaris Team Setup — Dogfooding do MVP da 002-teams-dashboard (code-mode)

Configuração pronta para usar a **Polaris (Teams · code-mode)** para implementar o MVP (User Story 1)
da feature 002-teams-dashboard no próprio repo `JeanZorzetti/sofia-ia`, com **commit direto na `main`**.

---

## ⚠️ 0. PRÉ-REQUISITO QUE DECIDE TUDO: a infra de code-mode

O code-mode ("Code Factory") **não roda no app web** — ele depende de um **worker BullMQ separado**
(`src/worker/index.ts`, `Dockerfile.worker`, `npm run worker`) que consome a fila `code-run` (Redis),
sobe um **sandbox E2B**, roda o **Claude CLI dentro do sandbox** e faz clone/commit/push/PR.

**Verificação local feita nesta sessão (gap encontrado):**
- `docker-compose.yml` versionado sobe **só `app` + `postgres` + `redis`** — **NÃO** sobe o worker.
- `.env` / `.env.local` têm só `GROQ_API_KEY` e `DATABASE_URL`. **Faltam** `GITHUB_TOKEN`, `E2B_API_KEY`,
  `CLAUDE_CODE_OAUTH_TOKEN(S)`. O `.env.example` nem documenta essas chaves.
- ⇒ Forte indício de que o **Code Factory worker nunca foi deployado em produção** (o sub-projeto C foi
  validado em `repo-de-teste`, mas o E2E/deploy sempre ficou pendente).

**Antes de qualquer run em code-mode, garanta (no EasyPanel):**

| Requisito | Onde | Observação |
|---|---|---|
| Serviço **worker** deployado | EasyPanel, serviço separado do `app`, mesma imagem/repo | start: `npm run worker` (precisa devDeps/`tsx`). Usar `Dockerfile.worker`. |
| `REDIS_URL` | app **e** worker | fila durável `code-run` (BullMQ). O app enfileira; o worker consome. |
| `E2B_API_KEY` | worker | sandbox de execução (`SANDBOX_PROVIDER=e2b`, default). |
| `GITHUB_TOKEN` | worker | PAT com **push na `main`** de `JeanZorzetti/sofia-ia`. ⚠️ ver alerta de branch protegida abaixo. |
| `CLAUDE_CODE_OAUTH_TOKEN` ou `CLAUDE_CODE_OAUTH_TOKENS` | worker | auth de assinatura p/ o Claude CLI (sandbox **e** local-spawn). Pool (`…_TOKENS`, separado por vírgula) recomendado p/ failover de rate-limit. |
| `DATABASE_URL` | worker | mesmo banco do app. |
| (opcional) `SANDBOX_TEMPLATE` | worker | template E2B com `claude`/`git`/`node` pré-instalados → 1ª execução mais rápida. |
| (opcional) `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL`, `CODE_RUN_CONCURRENCY`, `SANDBOX_TIMEOUT_MS` | worker | defaults: "Polaris Teams" / polaris@polarisia.com.br / 2 / 15min. |

> ⚠️ **`gitMode='direct'` empurra direto na `main`.** Se a `main` do `sofia-ia` for **branch protegida**
> no GitHub, o push falha. Confirme que o `GITHUB_TOKEN` consegue push direto na `main` — senão use
> `gitMode='pr'`.

> 💡 **Os 3 agentes usam models do provider "Claude Code"** (claude-opus / claude-sonnet) → **todos**
> dependem de `CLAUDE_CODE_OAUTH_TOKEN(S)`. Worker em code-mode roda o CLI no sandbox; Lead/Reviewer
> (chat) rodam o CLI no host do worker (local-spawn). Mesma pool de token.

> 🆕 **Alternativa self-hosted (003 — VPS executor):** em vez do E2B, defina **`SANDBOX_PROVIDER=vps-local`**
> no worker. O "sandbox" passa a ser um **diretório por run** dentro do próprio container do worker
> (`${VPS_RUNS_DIR}/<id>/repo`), o que **remove o teto de ~1h do E2B** (missões longas concluem). Requisitos:
> - **`VPS_RUNS_DIR`** apontando para um **volume montado** no serviço do worker (ex.: `/runs`). Sem volume,
>   os dirs de run somem a cada redeploy e a continuação (preview/Lovable) quebra.
> - **`CODE_RUN_CONCURRENCY` conservador** (1–2): os runs compartilham CPU/disco do worker.
> - **`E2B_API_KEY` deixa de ser necessária** (execução local). Preview fica **off** nesta fase
>   (`getPreviewUrl` → erro "Fase 2"); o run conclui normalmente, só sem iframe de preview.
> - Limpeza de dirs órfãos é automática (sweep no boot do worker + no cron `reap-preview-sandboxes`).
> O worker continua sendo um **serviço EasyPanel dedicado** (mesma imagem/repo, start `npm run worker`).

---

## ⚙️ Como a informação chega a cada membro (LEIA — define os prompts)

Confirmado no código (`team-coordinator.ts:122`, `code-agent.ts:134-159`):

| Membro | Roda onde | Lê o repo? | O que ele realmente recebe |
|---|---|---|---|
| **Lead** | chat (fora do sandbox) | ❌ não | seu system prompt + Diretrizes do time + a **missão** + roster/board. Planeja daí. |
| **Worker** | Claude CLI **dentro do sandbox** | ✅ sim | **APENAS o corpo da @TASK que o Lead escrever** — NÃO recebe o system prompt do agente Worker, NÃO recebe as Diretrizes do time, NÃO recebe a missão. |
| **Reviewer** | chat (fora do sandbox) | ❌ não | seu system prompt + Diretrizes do time + o **diff git real** da tarefa. |

➡️ **Consequência:** o **único canal** de instruções para o Worker que codifica é o **corpo da @TASK**.
Por isso o **prompt do Lead** é o que importa: ele precisa escrever @TASKs **autossuficientes**
(arquivos a ler + não-negociáveis + critérios + gate). O system prompt do agente Worker e as
Diretrizes do time **não chegam** ao CLI-no-sandbox — servem só para briefar Lead e Reviewer.

> 🆕 **003 US2 (co-localização) muda o "❌ não lê o repo":** quando o worker injeta o resolver de papel
> (automático), Lead e Reviewer passam a receber, no 1º turno, um **retrato real do repo** — Lead: árvore
> de arquivos (capada) + arquivos-chave; Reviewer: um **bloco de verificação read-only** (pode `@RUN npm
> test`/`build`/`grep` contra o repo vivo, além do diff que já recebe). Vale para `vps-local` e E2B (lê via
> `sandbox.exec`, no sandbox correto). O turno do Worker continua **sem** enriquecimento (byte-idêntico).

## 1. Agentes (criar 3 em `/dashboard/agents`)

> ⚠️ **REGRA DE OURO (descoberta na prática): SÓ o WORKER pode ser `claude-*`.** Apenas o turno do
> worker (com `taskId`) roda no sandbox; **Lead e Reviewer rodam o CLI no HOST `/app`**. Se o **Reviewer**
> for `claude-*`, ele lê o `/app` intocado e **rejeita o trabalho real do worker** → loop infinito (foi o
> que aconteceu). Portanto: **Lead e Reviewer = modelo de chat NÃO-claude** (ex.: `llama-3.3-70b-versatile`/Groq);
> **Worker = `claude-*`** (ele é o único que edita dentro do sandbox).

### Agente 1 — `Arquiteto Polaris`  ·  role no time: **lead**  ·  model: `llama-3.3-70b-versatile` (Groq — NÃO claude)
System prompt:
```
Você é o LEAD/arquiteto. Você ORQUESTRA — não codifica você mesmo.

CRÍTICO: o Worker que executa cada tarefa roda ISOLADO num sandbox e só recebe o TÍTULO + CORPO da @TASK que VOCÊ escrever. Ele NÃO vê esta conversa, NÃO vê a missão e NÃO vê estas diretrizes. Portanto TODA @TASK precisa ser AUTOSSUFICIENTE: incluir os arquivos a ler, os não-negociáveis, o critério de aceite e o gate.

Decomponha o MVP (User Story 1) da feature 002-teams-dashboard em 3 tarefas, nesta ordem (cada uma depende da anterior):
1. Criar o endpoint GET /api/teams/overview.
2. Reescrever src/app/dashboard/page.tsx para Teams-first.
3. Gate de build completo (UMA vez só), depois da #1 e #2.

Em TODA @TASK, inclua SEMPRE este bloco de contexto + o detalhe específico da tarefa:

[CONTEXTO OBRIGATÓRIO — repita em cada @TASK]
"Antes de codar, leia no repositório: specs/002-teams-dashboard/spec.md, plan.md, data-model.md, contracts/teams-overview.md; o CLAUDE.md da raiz; e os arquivos de referência src/app/api/analytics/overview/route.ts e src/app/dashboard/page.tsx + src/app/dashboard/DashboardActivityChart.tsx.
Não-negociáveis: NÃO toque em src/lib/orchestration/team/team-coordinator.ts; SEM migração (use só as tabelas existentes Team/TeamRun/TeamTask/TeamMemberUsage); getAuthFromRequest() retorna auth.id (NUNCA auth.userId); Prisma só via singleton import { prisma } from '@/lib/prisma'; converta Float do Prisma com Number(); multi-tenant: TODA query escopada por team: { createdBy: auth.id }.
Ao terminar a SUA tarefa, rode `npm run typecheck` e corrija até passar. NÃO rode `npm run build` por tarefa — o build completo é a tarefa final separada; isso evita builds repetidos e mantém cada turno curto."

[DETALHE — Tarefa 1: endpoint]
"Criar src/app/api/teams/overview/route.ts espelhando src/app/api/analytics/overview/route.ts: export const GET = withAll(handler, { ttl: TTL.MEDIUM, limiter: rateLimiters.analytics }); getAuthFromRequest→401 se sem auth; parsePeriod(period, startDate?, endDate?). Retornar os KPIs essenciais (conforme contracts/teams-overview.md e data-model.md): teams (count de Team status='active' do usuário), runs no período por startedAt (total/completed/failed/running), successRate (completed ÷ finalizados), tasksExecuted (TeamTask status='done'). Tudo escopado por team: { createdBy: auth.id }."

[DETALHE — Tarefa 2: page]
"Reescrever src/app/dashboard/page.tsx: REMOVER todos os widgets de atendimento (Conversas Ativas, Taxa de Conversão, Leads Qualificados, Tempo Médio Resposta, Total Mensagens, Conversas Recentes), o hook useRecentConversations e o fetch de /api/analytics/overview. RENDERIZAR os KPIs de Teams a partir de GET /api/teams/overview?period=... ADICIONAR um CTA primário 'Criar Team' + estado vazio convidativo quando não houver Teams. PRESERVAR: seletor de período 7/30/90, badge de saúde (useApiHealth) e o fluxo de onboarding. Estados de loading/erro sem spinner infinito."

[DETALHE — Tarefa 3: gate de build]
"Rodar `npm run typecheck` e depois `npm run build` no repositório (o working tree já tem as mudanças acumuladas das tarefas 1 e 2). Corrigir qualquer erro de TypeScript/compilação até o build terminar com sucesso (`Compiled successfully`). Não mude comportamento — só correções de compilação se necessário."

Atribua cada @TASK ao Worker 'Engenheiro Next.js'. Encaminhe ao Reviewer. Só emita @DONE quando o Reviewer aprovar e o gate estiver verde. Escreva em português.
```

### Agente 2 — `Engenheiro Next.js`  ·  role no time: **worker**  ·  model: `claude-sonnet-4-6` (claude-* — ÚNICO que roda no sandbox; pode ser `claude-opus-4-8`)
> ⚠️ Em code-mode este system prompt **não é enviado** ao CLI-no-sandbox (ver tabela acima) — o briefing real do Worker é o **corpo da @TASK** que o Lead escreve. Mantenha-o assim mesmo (documenta a intenção e seria usado caso o model fosse não-claude/chat).
System prompt:
```
Você é um engenheiro sênior Next.js 16 + TypeScript + Prisma. Você roda como Claude Code CLI dentro de um sandbox com o repositório sofia-next clonado — edite os arquivos REAIS com suas tools.
Para cada tarefa atribuída:
- Primeiro leia os arquivos de spec e referência citados nas Diretrizes do time.
- Implemente EXATAMENTE a tarefa, seguindo todos os não-negociáveis.
- Rode `npm run typecheck` e `npm run build`; corrija até passarem antes de declarar a tarefa pronta.
- Não toque no coordinator runTeam. Não crie migração. Mantenha o diff escopado à tarefa.
Ao terminar, responda com um resumo do que mudou (arquivos + decisões).
```

### Agente 3 — `Revisor de Código`  ·  role no time: **reviewer**  ·  model: `llama-3.3-70b-versatile` (Groq — NÃO claude; senão lê o /app intocado e rejeita tudo)
System prompt:
```
Você é o REVIEWER. Você recebe o DIFF git real das mudanças. Avalie criticamente contra os critérios de aceite do spec e os não-negociáveis do time.
Cheque especificamente:
- Endpoint: usa withAll + parsePeriod + getAuthFromRequest→auth.id (401 sem auth); TODA agregação escopada por team: { createdBy: auth.id }; Number() em estimatedCost.
- page.tsx: ZERO widget de atendimento remanescente (conversas, mensagens, conversão, leads); KPIs de Teams presentes; CTA "Criar Team" + estado vazio; seletor 7/30/90, badge de saúde e onboarding PRESERVADOS.
- Sem migração; coordinator intocado; convenções Next 16; o build passaria.
Responda só com @APPROVE (cumpre) ou @REJECT <motivo objetivo> (precisa refazer).
```

---

## 2. Knowledge base — **não usar** (N/A em code-mode)
RAG não é injetado no Claude CLI do sandbox. A "knowledge" já está no repo e o CLI lê direto:
`specs/002-teams-dashboard/*`, `CLAUDE.md` (raiz) e os arquivos de referência. A missão + os system
prompts apontam esses caminhos. (Só faria sentido uma KnowledgeBase para um time **chat-mode**.)

## 3. Skills — **não usar** (N/A em code-mode)
O Claude CLI traz as próprias tools (Read/Edit/Bash/Grep/Write). Nenhuma skill custom necessária.
MCP é opcional (`mcpAllowlist`) e dispensável para uma feature read-side.

---

## 4. System prompt do time (`Team.config.systemPrompt` — "Diretrizes do time")
```
Você faz parte de um time que edita o repositório real da Polaris (sofia-next): Next.js 16 (App Router, RSC-first) + Prisma + Groq. Trabalho em code-mode: o Worker edita arquivos de verdade num sandbox com o repo clonado.

ANTES DE CODAR, leia: specs/002-teams-dashboard/{spec,plan,research,data-model}.md, specs/002-teams-dashboard/contracts/teams-overview.md, o CLAUDE.md da raiz, e os arquivos de referência src/app/api/analytics/overview/route.ts e src/app/dashboard/page.tsx + src/app/dashboard/DashboardActivityChart.tsx.

NÃO-NEGOCIÁVEIS:
- Coordinator runTeam (src/lib/orchestration/team/team-coordinator.ts) é INTOCADO. Esta feature é 100% read-side.
- SEM migração de schema. Usa só tabelas existentes: Team, TeamRun, TeamTask, TeamMemberUsage, TeamMember.
- Next.js 16: getAuthFromRequest() retorna auth.id (NUNCA auth.userId). Prisma só via singleton import { prisma } from '@/lib/prisma'. Groq lazy init. Decimais do Prisma convertidos com Number(). (Route params são Promise + await SÓ se houver [id]; o endpoint novo não tem [id].)
- Multi-tenant: TODA query escopada por team: { createdBy: auth.id } — zero IDOR, zero vazamento entre tenants.
- Espelhe os padrões existentes: o endpoint novo segue src/app/api/analytics/overview/route.ts (withAll({ ttl: TTL.MEDIUM, limiter: rateLimiters.analytics }) + parsePeriod + getAuthFromRequest→401); o gráfico/code-split seguem DashboardActivityChart.tsx (dynamic, ssr:false).

GATE antes de finalizar: rode `npm run typecheck` e `npm run build` e exija sucesso. Não entregue código que não compila.

Idioma: respostas/docs em PT; comentários de código e mensagens de commit em EN.
```

## 5. Configuração do Team (criar em `/dashboard/teams`)
- **Nome:** `Code Factory — Dashboard Teams-first`
- **Repo binding:** `repoUrl = github.com/JeanZorzetti/sofia-ia` · `defaultBranch = main`
- **Topologia:** `linear` · `maxParallel = 1` (1 worker; US1 mexe nos mesmos arquivos → sem paralelismo)
- **System prompt do time:** o texto do item 4
- **Membros:** Arquiteto Polaris (lead) · Engenheiro Next.js (worker) · Revisor de Código (reviewer)

## 6. Run (composer do Team)
- **Mode:** `code`
- **Git delivery:** `direct` (commit direto na `main`)
- **Preview:** off
- **Missão:**
```
Implementar o MVP (User Story 1) da feature 002-teams-dashboard conforme specs/002-teams-dashboard/.
Entregar: (1) o endpoint GET /api/teams/overview (T002) e (2) a reescrita da home src/app/dashboard/page.tsx para Teams-first com KPIs essenciais de Teams, CTA "Criar Team" e estados vazio/erro (T003–T005).
Leia spec.md, plan.md, data-model.md, contracts/teams-overview.md e o CLAUDE.md da raiz antes de codar. Não toque no coordinator; sem migração. Rode typecheck + build e garanta verde.
```

---

## Passo-a-passo
1. **(Infra)** Confirmar/subir o worker no EasyPanel + setar os segredos do item 0. Sem isso o run fica `pending` para sempre.
2. **(Agentes)** Criar os 3 agentes do item 1 (atenção aos models — Worker = `claude-opus-4-8`).
3. **(Team)** Criar o Team do item 5 (repo binding + topologia + system prompt + 3 membros nos papéis lead/worker/reviewer).
4. **(Run)** Disparar em `code` + `direct` com a missão do item 6.
5. **(Acompanhar)** Ver o board (Lead → @TASK → Worker → Reviewer → @DONE) + terminal/diff ao vivo na tela do run.

## Verificação (sucesso do teste)
- Run chega a `@DONE`; `TeamRun.status='completed'`; `commitSha` setado; `changedFiles` lista `route.ts` + `page.tsx`.
- **Novo commit na `main`** de `sofia-ia` com as duas mudanças.
- Gate de build verde (no log do run / aprovação do Reviewer).
- Manual (puxando a `main`): `GET /api/teams/overview?period=30d` responde KPIs escopados por `auth.id`; `/dashboard` Teams-first sem widgets de atendimento; seletor/health/onboarding intactos.
- `team-coordinator.ts` inalterado; nenhuma migração criada; multi-tenant respeitado.

## Arquivos que o Time vai mexer (referência)
- **Criar:** `src/app/api/teams/overview/route.ts`
- **Reescrever:** `src/app/dashboard/page.tsx`
- **Ler (não editar):** `src/app/api/analytics/overview/route.ts`, `src/app/dashboard/DashboardActivityChart.tsx`
- **NÃO tocar:** `src/lib/orchestration/team/team-coordinator.ts`, `prisma/schema.prisma`
