# Polaris Teams V2 — Análise de Gap vs Agent Teams AI

> **Tipo:** documento de análise + recomendações (não é roadmap executável).
> **Data:** 2026-06-18.
> **Objetivo:** inventariar tudo que o **Agent Teams AI** (ATA — Electron OSS, `C:\dev\agent-teams-ai`) tem e a feature `/teams` da Polaris **ainda não capturou**, e dar um veredito frio por capacidade: **PEGAR / ADAPTAR / DESCARTAR**. Insumo de decisão para o próximo ciclo da feature.

---

## 1. Contexto e método

### O que a Polaris `/teams` já entrega
Todos os programas estão concluídos (commits na main; E2E autenticado em prod pendente em algumas fatias):

- **Sub-projeto A (core):** entidade `Team` + roster Lead/Worker/Reviewer, coordinator síncrono, protocolo `@TASK/@MESSAGE/@DONE/@APPROVE/@REJECT`, message bus intra-run. 5 modelos Prisma (`Team/TeamMember/TeamRun/TeamTask/TeamMessage`).
- **Sub-projeto B (UX):** run ao vivo via `after()` + SSE, override de model/effort por membro, UI list/create/edit, `TeamRunView` (kanban + feed + histórico + métricas), `TeamGraph` (XY Flow, read-only).
- **Sub-projeto C (code factory):** C0 fila BullMQ + worker + sandbox E2B; C1 git→PR no worker (clone/branch/commit/push/PR via REST, token nunca no sandbox); C2 diff2html + xterm.js streaming; C2.1 streaming incremental; C3 code-review com `git diff` real por task.
- **SP1-SP5 (migração Orquestrações→Teams):** magic-create, output webhooks (`Team.config.outputWebhooks`), scheduling/cron (`ScheduledTeamRun`), API pública/v1 (API-key), templates (8 rosters). **SP6** dropou a engine legada de orquestrações.
- **G0-G6 (grafo):** topologia opt-in (`config.topology`), DAG de dependências (`TeamTask.dependsOn`), agenda state-machine, agendas paralelas (`config.maxParallel` + `runWithConcurrency`), viz com edges de dependência, partículas/estado ao vivo, clarificação Lead↔worker (`@CLARIFY`, `status:'clarify'`).

### O que foi importado vs descartado do ATA no roadmap original
Importamos **conceito/UX/protocolo**: papéis Lead/Worker/Reviewer, campos canônicos de mensagem, lógica de kanban/review pura, e — "o maior ganho" — os **prompts de coordenação**. Nunca importamos o **runtime** (binário `claude-multimodel`, `child_process`, `node-pty`, `ssh2`, casca Electron, IPC/preload, storage em `~/.claude`), porque a Polaris já tem engine de execução (API LLM) + Postgres/Prisma superiores.

### Lente de fit (critério de avaliação)
A arquitetura Polaris é **web/serverless + Postgres/Prisma**, com o coordinator **imutável** (`runTeam` em [team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) — extensões só entram por **injeção** (`RunTeamDeps`: `store`, `chat`, `getTaskDiff?`, `now?`) ou pelos **callers** ([start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts), worker BullMQ, cron, rotas API). Toda recomendação aqui respeita esse seam. O ATA é **Electron + filesystem local + processos nativos**; qualquer coisa amarrada a isso entra como **DESCARTAR** de saída.

**Escala de veredito:**
- **PEGAR** — alto valor, bom fit, custo proporcional. Candidato real ao próximo ciclo.
- **ADAPTAR** — valor real, mas exige redesenho para o nosso modelo (não dá copy/paste de conceito).
- **DESCARTAR** — preso ao Electron/local-fs, já coberto, ou YAGNI para o nosso público.

---

## 2. Tabela-mestra comparativa

| # | Capacidade no ATA | Onde no ATA | Status Polaris | Valor | Fit | Veredito |
|---|---|---|---|---|---|---|
| 1 | Roster Lead/Worker/Reviewer | `shared/types/team.ts` | ✅ equivalente | — | — | já temos |
| 2 | Override model/effort por membro | `TeamMember.model/effort` | ✅ equivalente (B) | — | — | já temos |
| 3 | Multi-provider mix no mesmo time (Claude+Codex+OpenCode+OpenRouter+Ollama) | `features/runtime-provider-management/` | ⚠️ parcial (model por membro; OpenRouter/Ollama/Claude CLI suportados em `chatWithAgent`) | Médio | Bom | **ADAPTAR** (item D5) |
| 4 | **MCP/Tools/Skills/Plugins por membro** + política (`inheritLead/strictAllowlist/scope`) | `shared/types/team.ts` (TeamMemberMcpPolicy), `services/extensions/` | ⚠️ **parcial** — capacidades carregam do `Agent`, mas execução gated a coder/OpenRouter e **sem política por membro** | **Alto** | Bom | **PEGAR** (Tema A) |
| 5 | Tool-approval gate humano (allow/deny por tool) | `RuntimeToolApprovalCoordinator.ts`, `toolApprovalRules.ts` | ❌ ausente (reviewer 100% automático) | Médio-Alto | Difícil | **ADAPTAR** (Tema B) |
| 6 | Escalação ao usuário (pausar/retomar run) | (kanban review humano) | ❌ ausente (G6.1 deferido) | Alto | Difícil | **ADAPTAR** (Tema B) |
| 7 | Review hunk-a-hunk humano (CodeMirror merge, accept/reject) | `components/team/review/*`, `ReviewApplierService.ts` | ❌ `DiffViewer` é read-only | Médio | Difícil | **ADAPTAR** (Tema B) |
| 8 | Cross-team messaging + cascade guard | `CrossTeamService.ts`, `crossTeamTools.ts` | ❌ times isolados | Médio | Médio | **ADAPTAR** (Tema C) |
| 9 | Drag-drop kanban (mover task entre colunas) | `kanban/KanbanBoard.tsx` (dnd-kit) | ❌ board read-only (Slice 6 deferido) | Baixo-Médio | Bom | **ADAPTAR** (Tema D) |
| 10 | Painel de logs por membro + deep session analysis (tokens por categoria) | `taskLogs/{exact,activity,stream}`, `MemberStatsComputer.ts` | ⚠️ temos terminal de sandbox + métricas de run, sem log estruturado por membro | Médio | Bom | **PEGAR** (Tema D) |
| 11 | Anexos em task (auto-attach de imagens/arquivos) | `TeamAttachmentStore.ts` | ❌ ausente | Baixo-Médio | Bom | **ADAPTAR** (Tema D) |
| 12 | Multi-reviewer (lista de reviewers) | `TeamKanbanManager.ts` (reviewer list) | ⚠️ ≤1 reviewer | Baixo | Bom | **ADAPTAR** (Tema D) |
| 13 | Relações de task além de dependsOn (blocked-by/blocks/related) | `mcp-server/tools/taskTools.ts` | ⚠️ só `dependsOn[]` (G1) | Baixo | Bom | backlog |
| 14 | Scheduling/cron | `SchedulerService.ts` (croner) | ✅ equivalente (SP3) | — | — | já temos |
| 15 | Custo/tokens visibilidade | `resources/pricing.json` | ⚠️ temos `estimatedCost` flat ($0.5/1M); sem tabela por modelo | Baixo-Médio | Bom | backlog |
| 16 | MCP HTTP server (FastMCP, agentes externos chamam) | `AgentTeamsMcpHttpServer.ts` | ❌ N/A (nosso modelo é caller→coordinator) | Baixo | Ruim | **DESCARTAR** |
| 17 | Git worktree isolado por membro | `TeamMemberWorktreeManager.ts` | ❌ um branch por run (C1) | Baixo | Ruim | **DESCARTAR** (worktree é conceito local-fs; nosso worker é efêmero) |
| 18 | Casca Electron / IPC / preload / terminal nativo | `src/main`, `src/preload` | ❌ N/A | — | Ruim | **DESCARTAR** |
| 19 | Storage local `~/.claude/teams` + post-compact recovery | `services/team/bootstrap/` | ❌ N/A (temos Postgres) | — | Ruim | **DESCARTAR** |
| 20 | Provisioning prompt free-form / SOUL.md | `services/team/provisioning/` | ⚠️ temos magic-create + templates | Baixo | — | backlog |

---

## 3. Deep-dives por tema

### Tema A — Capacidade dos agentes (Tools / MCP / Skills / Plugins por membro)

**O que o ATA faz.** Cada membro do time carrega uma **política MCP própria** (`TeamMemberMcpPolicy` em `src/shared/types/team.ts`): modo `inheritLead | inheritScopes | strictAllowlist | appOnly`, filtros de escopo (`user | project | local`) e **allowlist de servidores MCP por membro**. Ou seja, o time controla *quais* ferramentas cada agente pode usar, independentemente do que o agente "sabe" fazer.

**O que a Polaris tem hoje (correção importante).** Os membros do time **não são loop LLM puro** — o coordinator injeta o `chatWithAgent` **real** como `ChatFn` ([start-team-run.ts:91](../../src/lib/orchestration/team/start-team-run.ts#L91): `chat: (agentId, messages, ctx, opts) => chatWithAgent(...)`). E o `chatWithAgent` ([groq.ts:105](../../src/lib/ai/groq.ts#L105)) **já carrega as capacidades configuradas no `Agent`**:
- **Prompt-skills** + **descrição de plugins** → injetados no system prompt **para qualquer modelo** ([groq.ts:159-199](../../src/lib/ai/groq.ts#L159)).
- **Tool-skills (function calling) + MCP tools + filesystem read** → só são realmente **executáveis** quando `toolsEnabled = isCoderModel && !rawText`, e isso vive **só no path OpenRouter** (`agent.model.includes('/')`), com `isCoderModel = model.includes('coder') || model.includes('qwen')` ([groq.ts:404-405](../../src/lib/ai/groq.ts#L404)).

O schema confirma o lastro: `Agent` tem `plugins AgentPlugin[]`, `agentSkills AgentSkill[]`, `agentMcpServers AgentMcpServer[]` ([schema.prisma:222-226](../../prisma/schema.prisma#L222)).

**Gap concreto (dois, não um):**
1. **Gate de execução estreito.** Um membro que não seja modelo *coder do OpenRouter* recebe a *descrição* das tools no prompt, mas **não consegue invocá-las** (function calling desligado). Times que usam Groq/Claude/Ollama como Worker ficam sem MCP/tool-skills de fato.
2. **Sem política por membro.** As capacidades são herdadas 100% do registro `Agent`, **tudo-ou-nada**. Não existe o equivalente ao `TeamMemberMcpPolicy` — o time não consegue restringir/ampliar/escopar tools por papel (ex.: dar MCP de DB só ao Worker de dados, negar ao Reviewer).

**Valor:** **Alto.** É o maior salto de poder real das execuções — transforma membros de "redatores de texto" em agentes que de fato usam ferramentas. E grande parte do encanamento já existe.

**Custo/risco:** Médio. (1) Generalizar o gate de tools para além de coder/OpenRouter exige cuidado: o gate atual protege code-runs (que escrevem via `@RUN` no sandbox, não via FS tools do provider) — qualquer mudança precisa preservar `rawText`/sandbox. (2) Política por membro = campo novo em `TeamMember` (Json) + filtragem na montagem das tools dentro de `chatWithAgent` (ou via novo param em `ChatOptions`, sem tocar o coordinator).

**Fit arquitetural:** **Bom.** Encaixa via `ChatOptions`/`ChatFn` (já é o ponto de injeção) e um campo Json em `TeamMember` — coordinator intacto. Migração formal de schema (lição SP2/SP3: aplicar `migrate deploy` manual no host real antes do push).

**Veredito:** **PEGAR.** Reformular para: "religar/ampliar execução de tools no loop do time + política de capacidade por membro". É fiação + um campo, não construção do zero.

**Esboço de adaptação (prosa):** Adicionar `TeamMember.capabilities` (Json) com forma inspirada no `TeamMemberMcpPolicy` (modo + allowlist + escopo). Passar isso adiante por `ChatOptions` (4º param do `ChatFn`, que o coordinator já repassa). Dentro do `chatWithAgent`, (a) desacoplar `toolsEnabled` de `isCoderModel` quando a chamada vem de um membro de time com tools habilitadas, e (b) filtrar `toolSkillDefinitions`/`mcpToolDefinitions` pela política do membro antes de montar `apiTools`. Nada disso toca `runTeam`.

---

### Tema B — Human-in-the-loop

**O que o ATA faz.** Três mecanismos distintos:
1. **Tool-approval gate:** antes de rodar uma tool perigosa, o agente pede aprovação; o app mostra allow/deny; regras auto-resolvem (`RuntimeToolApprovalCoordinator.ts`, `toolApprovalRules.ts`).
2. **Review humano de código hunk-a-hunk:** `ChangeReviewDialog.tsx` + `CodeMirrorDiffView.tsx` com `HunkDecision[]`, aplicação atômica das mudanças aprovadas (`ReviewApplierService.ts`), diálogo de conflito.
3. **Multi-reviewer + transições manuais** no kanban.

**O que a Polaris tem hoje.** Reviewer é um **papel automático** (LLM emite `@APPROVE/@REJECT` com retry cap); não há pausa para humano. O `DiffViewer.tsx` é **read-only** (visualização diff2html, sem aceitar/rejeitar). Já há precedente de decisão: **G6.1 desenhou** escalação ao usuário (`needsClarification: user`, novo `RunStatus waiting_for_input` + endpoint de resume + input na UI) e **deferiu**; o roadmap marcou "tool-approval sheet — não portado, avaliar se vale".

**Gap concreto:** não existe nenhum ponto em que a run **para e espera um humano** — seja para aprovar uma tool, aprovar/editar um diff antes do PR, ou responder uma dúvida do time.

**Valor:** **Alto** (confiança/controle em runs que mexem em código ou produção), mas concentrado em quem roda code-runs.

**Custo/risco:** **Alto e estrutural.** O modelo de execução é **fire-and-forget** (`after()` para chat, BullMQ para code). Introduzir espera por humano exige: novo estado `TeamRun.status = 'waiting_for_input'`, persistência do ponto de retomada, endpoint de resume, e UI de fila de aprovação. No worker BullMQ isso é especialmente caro (o job teria que suspender/re-enfileirar). É a maior tensão de fit do documento.

**Fit arquitetural:** **Difícil** — mas há um caminho de **menor custo** específico para review de código: nosso fluxo já **termina em PR no GitHub**. Em vez de reconstruir um merge editor (CodeMirror + apply atômico), **delegar o review hunk-a-hunk ao próprio GitHub PR** (o humano aprova/comenta lá) e, opcionalmente, deixar o time reagir ao resultado do review. Isso entrega 80% do valor sem estado `waiting_for_input`.

**Veredito:** **ADAPTAR**, com sub-decisões:
- **Tool-approval gate** → ADAPTAR, mas provavelmente **só para code-runs/tools perigosas** (não para todo o loop). Depende do Tema A existir primeiro (sem tools executáveis, não há o que aprovar).
- **Review hunk-a-hunk** → **ADAPTAR via GitHub PR** (recomendado) em vez de merge editor próprio. Ver Questão Aberta #1.
- **Escalação ao usuário (resume)** → ADAPTAR, reaproveitando o desenho do G6.1, mas é o item mais caro — só se houver demanda real.

**Esboço de adaptação (prosa):** Para o caminho barato: como o PR já é aberto pelo worker (C1), adicionar uma **modalidade "PR-gated"** em que a run termina em PR **draft** e o resultado é o link — o humano revisa no GitHub. Para a versão completa (resume), seguir o desenho G6.1: `waiting_for_input` + `/api/teams/[id]/runs/[runId]/resume` + painel de input; o coordinator continua intacto (a pausa acontece no caller/worker, que persiste estado e sai; o resume re-dispara).

---

### Tema C — Colaboração entre times (cross-team)

**O que o ATA faz.** `CrossTeamService.ts` permite um time mandar mensagem para outro: detecção automática do lead destino, **cascade guard** por profundidade de cadeia (`chain depth`) contra loops circulares, outbox de rastreio (`CrossTeamOutbox.ts`), tools MCP `cross_team_send` / `cross_team_list_targets`.

**O que a Polaris tem hoje.** Times são **isolados**: uma `TeamRun` por invocação, e `TeamMessage` é **intra-run** (só entre membros do mesmo time). Não há canal entre times nem entre runs.

**Gap concreto:** um time não consegue acionar/consultar outro time (ex.: time "Pesquisa" entrega insumo para time "Conteúdo").

**Valor:** **Médio.** No ATA faz sentido por ser desktop multi-projeto com vários times vivos ao mesmo tempo. Na Polaris, o caso de uso equivalente hoje é **coberto parcialmente** por: (a) grafo de tasks dentro de um time (G1), e (b) **output webhooks** (SP2) — um time pode disparar um webhook que aciona outro fluxo. A pergunta é se vale um canal *nativo* time→time.

**Custo/risco:** Médio. Exige um message bus cross-run (novo modelo ou extensão de `TeamMessage` com `fromRunId/toTeamId`), guarda de profundidade, e uma forma de o time-alvo "acordar" (provavelmente reusar `startTeamRun`).

**Fit arquitetural:** Médio. Encaixa como **caller** (um time, ao terminar/no meio, chama `startTeamRun` de outro time com a mensagem como mission) — coordinator intacto. A cascade guard vira um contador em `config`/run.

**Veredito:** **ADAPTAR — mas validar se não é YAGNI** primeiro (Questão Aberta #2). Se a necessidade for "time A passa resultado para time B", **output webhooks + magic-create/templates** podem já resolver sem feature nova.

**Esboço de adaptação (prosa):** Tool/diretiva nova no protocolo do Lead (ex.: `@HANDOFF <team> <mensagem>`) que, no caller, chama `startTeamRun(targetTeamId, { mission, ... , chainDepth: n+1 })`; recusar acima de um teto de profundidade. Persistir o vínculo em `TeamRun` (campo `parentRunId`) para rastreio.

---

### Tema D — UX / observabilidade

Quatro itens menores, independentes:

**D1 — Drag-drop kanban.** ATA move tasks entre colunas com dnd-kit (`KanbanBoard.tsx`). Nosso board é **read-only e dirigido por agente** (Slice 6 deferido por "valor marginal + dep nova `@dnd-kit` + risco OneDrive"). **Veredito: ADAPTAR só se houver demanda.** Como o board é dirigido por agente, mover manualmente conflita com o loop; só faz sentido junto com human-in-the-loop (Tema B). Mantém-se deferido.

**D2 — Painel de logs por membro + deep session analysis.** ATA tem logs estruturados por membro (`taskLogs/{exact,activity,stream}`) e análise de sessão (tokens por categoria, reasoning, tool outputs) via `MemberStatsComputer.ts`. Temos terminal de sandbox (xterm, code-runs) e métricas agregadas de run (`turnsUsed/tokensUsed/estimatedCost`), mas **nada estruturado por membro** para chat-runs. **Veredito: PEGAR.** É observabilidade pura, bom fit, e a UI (`TeamRunView`) já agrega eventos SSE — falta só uma visão por membro. Valor real para depurar/auditar runs. Baixo risco (sem mudar coordinator; é leitura/UI sobre `TeamMessage` + métricas).

**D3 — Anexos em task.** ATA auto-anexa imagens/arquivos gerados ao resultado da task (`TeamAttachmentStore.ts`). Inexistente na Polaris. **Veredito: ADAPTAR (backlog).** Valor baixo-médio, fit bom (campo em `TeamTask.artifacts` Json já existe), mas precisa de storage de blob (não temos hoje) — provavelmente só em code-runs.

**D4 — Multi-reviewer.** ATA mantém lista de reviewers. Temos ≤1 reviewer no roster. **Veredito: ADAPTAR (baixa prioridade).** O roster já aceita N membros; permitir >1 `role:'reviewer'` é pequeno, mas o coordinator hoje assume um reviewer — exigiria lógica de quórum. Baixo valor atual.

**D5 — Multi-provider mix explícito.** Já temos override de model por membro e `chatWithAgent` suporta OpenRouter/Ollama/Claude CLI/Groq. O gap vs ATA é só **UX de descoberta/seleção de provider** por membro. **Veredito: ADAPTAR (cosmético), backlog.**

---

## 4. Explicitamente DESCARTADO (registro, para não reabrir)

- **Casca Electron / IPC / preload / terminal nativo** — N/A para web.
- **`child_process` / `node-pty` / `ssh2` / binário `claude-multimodel`** — nosso runtime é API LLM + sandbox E2B.
- **Storage local `~/.claude/teams` + post-compact context recovery** — atrelado ao modelo de sessão local do Claude Code; temos Postgres como fonte de verdade.
- **Git worktree isolado por membro** — conceito local-fs; nosso worker é efêmero e usa um branch por run.
- **MCP HTTP server (FastMCP) expondo o time para agentes externos** — inverte o nosso modelo (caller→coordinator); se um dia precisar, a API pública/v1 (SP4) já cobre integração externa.

---

## 5. Ordem de prioridade recomendada

Entre os vereditos **PEGAR/ADAPTAR**, a sequência sugerida (por valor ÷ custo e por dependência):

1. **Tema A — Capacidade dos agentes (PEGAR).** Maior valor, fit bom, encanamento majoritariamente pronto. Desbloqueia o resto (sem tools executáveis, tool-approval do Tema B não tem o que aprovar).
2. **Tema D2 — Painel de logs por membro (PEGAR).** Barato, alto retorno de observabilidade, sem tocar coordinator. Bom "quick win" em paralelo.
3. **Tema B — Human-in-the-loop, caminho barato (ADAPTAR).** Review via **GitHub PR** primeiro (alto valor, baixo custo); tool-approval e resume completo só depois e só com demanda.
4. **Tema C — Cross-team (ADAPTAR).** Só após validar que não é YAGNI vs output webhooks.
5. **Tema D1/D3/D4/D5 (backlog).** Reabrir pontualmente conforme feedback de uso.

> **Não decomposto em fatias de propósito** — se aprovado, cada tema PEGAR/ADAPTAR vira um sub-projeto no padrão dos roadmaps existentes (1 fatia/sessão, seam por injeção, migração formal manual quando houver schema, coordinator intacto).

---

## 6. Questões em aberto → RESOLVIDAS (2026-06-18)

Decididas com o usuário; viraram o [ROADMAP.md](./ROADMAP.md) deste diretório.

1. **Review humano de código:** ✅ **GitHub PR** (não merge editor próprio). Code-runs já terminam em PR; GitHub já faz review hunk-a-hunk/merge.
2. **Cross-team é YAGNI?** ✅ **Adiar (backlog).** Output webhooks (SP2) cobrem o caso near-term; desenho `@HANDOFF` preservado no backlog.
3. **Tema A — escopo do gate:** ✅ **Política por membro + check de suporte a tools** (não blanket). Tool-calling nativo em Groq/Ollama/Claude-CLI = backlog.
4. **Tema B — resume completo:** ✅ **PR-gate basta neste ciclo.** Resume `waiting_for_input` + tool-approval interativo = backlog.

**Decisão adicional:** entrega git de code-runs oferece **PR (gate) OU direto pra main** (Sprint 3 do roadmap).

---

## Anexo — arquivos de referência

**Polaris (`Imob/sofia-next/`):**
- Engine: [team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts), [team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts), [team-executor.ts](../../src/lib/orchestration/team/team-executor.ts), [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts), [team-types.ts](../../src/lib/orchestration/team/team-types.ts), [team-prompts.ts](../../src/lib/orchestration/team/team-prompts.ts), [team-protocol.ts](../../src/lib/orchestration/team/team-protocol.ts).
- Execução de tools por agente: [groq.ts](../../src/lib/ai/groq.ts) (`chatWithAgent`, gate `toolsEnabled`).
- Schema: [schema.prisma](../../prisma/schema.prisma) (`Agent` + relações Skill/Plugin/McpServer; models `Team*`).
- UI: `src/app/dashboard/teams/**` (`TeamRunView.tsx`, `DiffViewer.tsx`, `SandboxTerminal.tsx`, `TeamGraph.tsx`, `RosterEditor.tsx`).

**Agent Teams AI (`C:\dev\agent-teams-ai/`):**
- `src/shared/types/team.ts` (`TeamMember`, `TeamMemberMcpPolicy`, `ToolApprovalRequest`).
- `src/main/services/team/` (`TeamKanbanManager.ts`, `CrossTeamService.ts`, `TeamAttachmentStore.ts`, `MemberStatsComputer.ts`, `approvals/RuntimeToolApprovalCoordinator.ts`).
- `src/renderer/components/team/review/` (`ChangeReviewDialog.tsx`, `CodeMirrorDiffView.tsx`).
- `src/main/services/schedule/` (`SchedulerService.ts`).
- `mcp-server/src/tools/` (`taskTools.ts`, `crossTeamTools.ts`, `reviewTools.ts`).
