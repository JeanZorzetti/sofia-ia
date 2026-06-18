# Polaris Teams V2 — Roadmap de Execução

> **Base:** [ANALISE-GAP-AGENT-TEAMS-AI.md](./ANALISE-GAP-AGENT-TEAMS-AI.md) (gap analysis ATA vs Polaris).
> **Data:** 2026-06-18.
> **Escopo deste ciclo:** os vereditos **PEGAR** + o caminho barato de **ADAPTAR**. Cross-team e human-in-the-loop "caro" ficam no backlog (justificado abaixo).
> **Regra de execução (CLAUDE.md global #4):** **1 fatia por sessão**, sem continuar automaticamente para a próxima. Commit + push ao fechar cada fatia.

---

## Decisões fechadas (resolvem as 4 questões da análise)

| # | Questão | Decisão | Porquê |
|---|---------|---------|--------|
| Q1 | Review de código: GitHub PR vs merge editor próprio | **GitHub PR** | Code-runs já terminam em PR (C1). GitHub já faz review hunk-a-hunk/approve/merge e é onde o dev trabalha. Editor próprio duplica algo maduro e cria 2ª fonte de verdade. |
| Q2 | Cross-team é YAGNI? | **Adiar (backlog)** | Output webhooks (SP2) já cobrem "time A → fluxo B" no curto prazo; sem times reais em prod, canal nativo é especulativo. Desenho `@HANDOFF` preservado no backlog. |
| Q3 | Escopo do gate de tools (Tema A) | **Política por membro + check de suporte**, não blanket | Soltar `isCoderModel` dentro do path OpenRouter quando o membro tem tools on; tool-calling nativo em Groq/Ollama/Claude-CLI = backlog. Preservar proteção `rawText`/sandbox. |
| Q4 | Resume completo (`waiting_for_input`)? | **PR-gate basta agora** | O toggle PR/direto é a gate humana para código sem custo de pausar/retomar run. Resume + tool-approval interativo = backlog. |

**Decisão adicional do usuário:** entrega git de code-runs deve oferecer **opção de PR (gate) OU direto pra main** (Sprint 3).

---

## Princípios de execução (invariantes — valem para toda fatia)

1. **Coordinator intacto.** `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` não mudam de comportamento. Extensões entram por:
   - **injeção** — campos em `RunTeamDeps` ou no `options` (4º param) do `ChatFn` (mesmo padrão de model/effort do B e `taskId` do C2.1);
   - **callers** — [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts), [worker/index.ts](../../src/worker/index.ts), cron, rotas API.
2. **Migração formal + manual.** Qualquer mudança de schema → `prisma migrate` formal **e** `migrate deploy` manual no host real `sofia_db@2.24.207.200:5435` **antes** do push (lição SP2/SP3: `db push` do standalone não cria coluna em prod).
3. **Script de verificação por fatia** no padrão existente (`scripts/gN-verify.ts`): asserts puros + `tsc` limpo, sem depender de jest (OneDrive errno -4094).
4. **Defaults preservam comportamento atual** — todo campo novo é opcional/nullable e cai no caminho legado quando ausente.

---

## Sprint 1 — Capacidades por membro (análise Tema A · PEGAR)

**Problema:** membros do time já carregam plugins/prompt-skills do `Agent` no prompt, mas a **execução** de tools (MCP, tool-skills, filesystem) só liga para modelo coder do OpenRouter ([groq.ts:404-405](../../src/lib/ai/groq.ts#L404)) e **não há política por membro** (tudo-ou-nada herdado do `Agent`). Falta: (a) soltar o gate por política, (b) escopar tools por membro.

### Fatia S1.1 — Política de capacidade no roster (dados + plumbing, sem mudança de comportamento)
- **Schema:** `TeamMember.capabilities Json?` — forma inspirada no `TeamMemberMcpPolicy` do ATA: `{ tools: boolean, mcpAllowlist?: string[] (ids de AgentMcpServer), toolSkills?: boolean, filesystem?: boolean }`. Migração `2026..._add_team_member_capabilities` (formal + manual).
- **Tipo:** adicionar `capabilities?: CapabilityPolicy` em `ChatOptions` ([team-types.ts](../../src/lib/orchestration/team/team-types.ts)).
- **Plumbing:** no ponto onde o coordinator monta `options` por membro (mesmo lugar que já injeta `model`/`effort`), incluir `capabilities: member.capabilities`. `chatWithAgent` recebe mas **ainda não muda comportamento** (apenas lê/loga).
- **Verificação:** `scripts/v2s1-verify.ts` — assert que `capabilities` flui member→opts→chatWithAgent; `tsc` limpo; run legado (member sem `capabilities`) idêntico.

### Fatia S1.2 — Enforcement do gate por política (comportamento)
- **`chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)):** dentro do path OpenRouter, trocar `toolsEnabled = isCoderModel && !rawText` por: tools ligadas quando **(member.capabilities.tools === true) OU (isCoderModel)**, sempre `&& !rawText` **e** `&& modelSupportsTools(agent.model)` (lista/flag de modelos que suportam function calling, com fallback gracioso). Filtrar `toolSkillDefinitions` e `mcpToolDefinitions` ([groq.ts:442-462](../../src/lib/ai/groq.ts#L442)) pela `mcpAllowlist`/flags da política antes de montar `apiTools`.
- **Proteção preservada:** `rawText` (code-runs) continua forçando completion plano; sandbox `@RUN` intacto.
- **Verificação:** `scripts/v2s2-verify.ts` — (a) member com `tools:true` em modelo não-coder habilita function calling; (b) allowlist filtra MCP servers; (c) `rawText`/code-run não regride; (d) modelo sem suporte cai em texto sem crashar.

### Fatia S1.3 — UI no RosterEditor
- **[RosterEditor.tsx](../../src/app/dashboard/teams/RosterEditor.tsx):** por membro, toggle "habilitar ferramentas" + multiselect dos MCP servers configurados naquele `Agent` (vira `mcpAllowlist`) + toggles tool-skills/filesystem. Persistir em `TeamMember.capabilities` via o CRUD de time existente.
- **Verificação:** E2E manual — criar time, habilitar MCP só no Worker, rodar e confirmar no feed que o Worker invocou a tool e o Reviewer não.

> **Backlog derivado:** tool-calling nativo nos paths Groq / Ollama / Claude-CLI (hoje só OpenRouter tem o loop de tools) — esforço maior, fora deste ciclo.

---

## Sprint 2 — Observabilidade por membro (análise Tema D2 · PEGAR / quick win)

**Problema:** temos terminal de sandbox (code-runs) e métricas agregadas de run, mas nenhuma visão **por membro** para depurar/auditar (o ATA tem `taskLogs/*` + `MemberStatsComputer`).

### Fatia S2.1 — Painel "por membro" no TeamRunView (puro UI, sem schema)
- **[TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx):** nova aba/visão que **agrupa por membro** os dados que o SSE já entrega — mensagens enviadas/recebidas (`TeamMessage.fromMemberId/toMemberId/kind`), tasks atribuídas e seus status, e timeline de atividade. Reusa os eventos SSE atuais (board/message), sem nova rota.
- **Verificação:** E2E manual — rodar time de 3 membros, confirmar que cada membro mostra suas mensagens/tasks/contadores corretos.

### Fatia S2.2 (opcional) — Atribuição de tokens/custo por membro
- **Schema:** capturar `usage` por chamada `chat()` e somar por membro (campo em `TeamMessage` ou tabela leve de uso). Migração formal + manual.
- **Plumbing:** `ChatResult.usage` já existe; o coordinator/caller persiste por membro. Substitui o `estimatedCost` flat ($0.5/1M) por custo real por modelo quando houver tabela de preços.
- **Verificação:** `scripts/v2s2b-verify.ts` — soma por membro = total da run.
- **Status:** só executar se o painel S2.1 mostrar que custo por membro é demanda real.

---

## Sprint 3 — Entrega git: PR-gate vs direto pra main (análise Tema B · ADAPTAR barato + pedido do usuário)

**Problema:** code-runs **sempre** abrem PR draft (C1). O usuário quer escolher: **PR (gate humana via GitHub)** OU **commit direto na main** (autônomo). Isso também é a resposta às Q1/Q4 (review no GitHub, sem resume).

### Fatia S3.1 — `gitMode` no run + branch direto no worker (comportamento)
- **Schema:** `TeamRun.gitMode String?` (`'pr' | 'direct'`, default `'pr'`). Migração `2026..._add_team_run_git_mode` (formal + manual).
- **Parsing/plumbing:** aceitar `gitMode` em [team-run-api.ts](../../src/lib/orchestration/team/team-run-api.ts) (`parseTeamRunBody`) e em [start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts) (gravar no `TeamRun`). Vale para rota de sessão, API v1/public e schedule.
- **Worker ([worker/index.ts](../../src/worker/index.ts), `runWithRepo`):** ler `gitMode`. Se `'direct'`: `branch = effectiveBase`, `commitAndPush` na base, **pular `openPullRequest`**, persistir só `commitSha`. Se `'pr'` (default): comportamento atual (branch `polaris/run-${runId}` + PR draft).
- **Verificação:** `scripts/v2s3-verify.ts` — (a) `'pr'` byte-idêntico ao fluxo atual; (b) `'direct'` faz commit na base e não chama `openPullRequest`; (c) ausência de `gitMode` = `'pr'`.

### Fatia S3.2 — Toggle na UI do compositor de run
- **[TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx):** no compositor de mission (modo Código), segmented control **"Abrir PR (revisar no GitHub)" / "Commit direto na main"**, default PR. Enviar `gitMode` no POST de run.
- **Copy:** deixar claro que "direto na main" é autônomo (sem gate). PR draft = humano revisa/mergeia no GitHub.
- **Verificação:** E2E manual — rodar nos dois modos contra `JeanZorzetti/repo-de-teste`; confirmar PR draft num caso e commit direto no outro.

---

## Backlog explícito (NÃO neste ciclo — registrado para não reabrir por engano)

| Item | Veredito | Por que fora agora |
|------|----------|--------------------|
| Cross-team `@HANDOFF` (análise Tema C) | ADAPTAR | YAGNI; output webhooks cobrem o caso near-term. Desenho: diretiva `@HANDOFF <team> <msg>` → caller chama `startTeamRun(target, {chainDepth+1})` com teto de profundidade + `TeamRun.parentRunId`. |
| Tool-approval interativo + `waiting_for_input`/resume (Tema B caro) | ADAPTAR | Alto custo estrutural (pausar/retomar run no `after()`/BullMQ). A política de capacidade (S1) já é gate estático; PR-gate (S3) é gate humano de código. |
| Tool-calling nativo em Groq/Ollama/Claude-CLI | — | Hoje só path OpenRouter tem loop de tools; estender é esforço próprio grande. |
| Drag-drop kanban (Slice 6, Tema D1) | ADAPTAR | Board é dirigido por agente; só faz sentido com human-in-the-loop. Mantém deferido (`@dnd-kit`, risco OneDrive). |
| Anexos em task (Tema D3) | ADAPTAR | Precisa storage de blob (não temos); valor baixo-médio, só code-runs. |
| Multi-reviewer (Tema D4) | ADAPTAR | Coordinator assume 1 reviewer; exigiria lógica de quórum. Baixo valor atual. |
| UX de provider por membro (Tema D5) | ADAPTAR | Cosmético; `chatWithAgent` já suporta os providers. |
| Relações de task blocked-by/blocks/related (item 13) | backlog | Só `dependsOn[]` (G1) hoje; demanda não comprovada. |

---

## Sequência recomendada e verificação E2E final

**Ordem:** Sprint 1 (S1.1 → S1.2 → S1.3) → Sprint 2 (S2.1) → Sprint 3 (S3.1 → S3.2). S2.2 e backlog conforme demanda.

**Por quê nessa ordem:** Tema A é o maior salto de valor e desbloqueia o resto; S2.1 é quick win de observabilidade barato; Sprint 3 entrega o pedido explícito (PR/direto) com baixo custo.

**E2E final do ciclo (em prod, com o usuário — gate real = EasyPanel + login):**
1. Time com Worker tool-capable: rodar mission que exige MCP/tool-skill, confirmar invocação no feed + filtragem por política.
2. Painel por membro: validar contadores/timeline batem com o run.
3. Code-run em modo PR → PR draft aberto; code-run em modo direto → commit na main sem PR.
4. Regressão: time chat legado (sem `capabilities`) e code-run sem `gitMode` rodam idênticos ao atual.
