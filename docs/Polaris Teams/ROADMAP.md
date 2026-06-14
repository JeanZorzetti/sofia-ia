# Roadmap — Programa "Polaris Teams"

## Context

Pergunta de origem: *"o que dá pra importar da Agent Teams AI (app Electron OSS de orquestração de times de agentes de código, em `C:\dev\agent-teams-ai`) para a Polaris (antiga Sofia, `polarisia.com.br`, código em `sofia-next`)?"*

**Achado que redefine a pergunta:** a Polaris **já é** uma plataforma de orquestração multi-agente madura — não é mais um SDR imobiliário. Hoje ela tem agentes (CRUD, pastas, plugins, **delegação agente→agente**, memória, skills, MCP), **orquestrações** (sequential/parallel/**consensus**, task-splitting PM→tarefas, protocolo de rejeição/retry, streaming SSE), **Flows** (motor DAG estilo n8n com versionamento), execuções **agendadas via cron**, pipeline cognitivo multi-estágio, RAG pgvector, analytics de custo/token/gantt e multi-tenant/whitelabel (226 rotas de API, 595 arquivos TS).

**Conclusão:** Polaris e Agent Teams AI são produtos **convergentes**. Não se importa o *engine* da Agent Teams AI — a Polaris já tem motor melhor para agentes-LLM. O que a Agent Teams AI tem de superior e vale trazer (como **conceito/UX/protocolo**, não como código de runtime) é: a **metáfora de time persistente**, a **mensageria peer-to-peer entre agentes**, o **task board/kanban**, o **loop de reviewer/aprovação**, e o **prompt-engineering de coordenação**. Além disso há uma direção ambiciosa separada: orquestrar **agentes de código** na nuvem (vertical nova).

**Resultado pretendido deste documento:** decompor o "importar tudo" em **3 sub-projetos independentes e sequenciados**. Este é um **roadmap/mapa de programa**, NÃO um spec de implementação. Cada sub-projeto será brainstormado e especificado em **sua própria sessão** (regra: um sprint por sessão).

**Formato e destino:** Markdown (legível por humano + LLM, versiona/diffa no git; JSON só se houver consumidor de máquina — não há). Este roadmap vive no repo da Polaris em `sofia-next\docs\Polaris Teams\ROADMAP.md`.

### Descartado de vez (não porta nem falta)
Binário `claude-multimodel`, spawn via `child_process`, `node-pty`, `ssh2`, casca Electron, IPC/preload, storage em `~/.claude/teams`. A Polaris já tem engine de execução (API LLM) + Postgres/Prisma superiores. Não gastar tempo aqui.

---

## Sub-projeto A — Teams Core (a espinha) 🏗️ ✅ ENTREGUE

> **STATUS: ✅ ENTREGUE (2026-06-13), em prod.** Implementado como **entidade dedicada** (tabelas `Team/TeamMember/TeamRun/TeamTask/TeamMessage` + rotas `/api/teams/*`), **NÃO** como strategy `'team'` no execute route de orchestrations (esse acoplamento foi rejeitado por design). Coordenação **Lead-orquestrada síncrona** em `src/lib/orchestration/team/` (`runTeam`), reviewer automático, protocolo de diretivas por linha `@TASK/@MESSAGE/@DONE/@APPROVE/@REJECT`. Coordinator recebe `TeamStore` (porta) + `chat` injetados → testável sem DB.

**Objetivo:** transformar a orquestração efêmera ("executa e morre") numa entidade **Team persistente** com coordenação real entre agentes.

**O que importar da Agent Teams AI (conceito/lógica portável):**
- Modelo de papéis Lead / Worker / Reviewer — ref. `src/shared/types/team.ts` (`TeamConfig`, `TeamMember`: role, model, effort, workflow) e `src/shared/utils/leadDetection.ts`.
- Protocolo de mensagem entre agentes — ref. `agent-teams-controller/src/internal/memberMessagingProtocol.js` (campos canônicos `{to, summary, message}`).
- Lógica de estado de tarefas/kanban/review (pura, sem Electron) — ref. `agent-teams-controller/src/controller.js` (módulos tasks/kanban/review/messages).
- **Prompts de coordenação** (o maior ganho de qualidade) — ref. `src/main/services/team/provisioning/TeamProvisioningPromptBuilders.ts` (`buildMembersPrompt`, `buildPersistentLeadContext`, `buildTaskBoardSnapshot`, `buildMemberSpawnMessage`) e `src/main/services/team/actionModeInstructions.ts` (`buildActionModeProtocol`).

**O que reusar da Polaris (já existe):**
- `AgentOrchestration` / `OrchestrationExecution` (`prisma/schema.prisma` ~linhas 529/551) como base do Team/Run.
- `AgentDelegation` (`prisma/schema.prisma` ~846 + `src/lib/ai/delegation.ts`) — **evoluir** para message bus peer-to-peer (hoje só sub-agente top-down).
- Task-splitting existente: `src/lib/orchestration/task-parser.ts` — **evoluir** para board com colunas/status.
- Execução: `src/app/api/orchestrations/[id]/execute/route.ts` — adicionar nova strategy `'team'`.
- `chatWithAgent()` em `src/lib/ai/groq.ts` como primitiva de execução de cada membro.
- Streaming já pronto: `/api/orchestrations/[id]/stream` (SSE).

**O que é novo (schema + lógica):**
- Entidade `Team` (roster + papéis fixos + config persistente) e `TeamMessage` (inbox/barramento entre agentes).
- Estado de board (`TeamTask` com status/coluna/assignee) — pode estender `OrchestrationExecution.agentResults`.
- Loop de reviewer/aprovação (reusa o protocolo de rejeição/consensus que já existe, mas com papel explícito de Reviewer + gate).

**Entregáveis:** migração Prisma; strategy `'team'` no execute route; serviço de coordenação (message bus + board) em `src/lib/orchestration/`; prompts de coordenação portados. Backend + UI mínima de verificação.

**Esforço:** Médio-Alto · **Risco:** Baixo (100% sobre infra existente) · **Dependências:** nenhuma. **É o keystone — destrava B e C.**

---

## Sub-projeto B — Teams UX 🎨 ✅ NÚCLEO ENTREGUE

> **STATUS: ✅ NÚCLEO ENTREGUE (2026-06-14), em prod.** Slices 1-5 na `main`:
> 1. **Run ao vivo (sem fila):** `POST /api/teams/[id]/run` dispara o coordinator via **`after()` do `next/server`** e retorna `{runId}` na hora (era síncrono, ~5min). O SSE de `runs/[runId]/stream` **já existia e já fazia polling do DB** — só era inútil porque o POST era síncrono; agora reflete progresso ao vivo. Órfãos reconciliados por TTL (`team-reconcile.ts`). Fila durável segue adiada pro C.
> 2. **Override de modelo + effort por membro:** campos `TeamMember.model/effort` já existiam; faltava FIAR no engine. `ChatFn` ganhou 4º param `options`; coordinator passa `{model,effort}` do membro; `chatWithAgent` aplica mutando `agent.model` + `reasoning_effort` (só OpenRouter).
> 3-5. **UI no design system:** lista + criar-time repaginados com pickers modelo/effort; **run view ao vivo** (`TeamRunView`: kanban 4-col, feed de atividade consolidado, histórico de runs, progresso + métricas); **grafo de topologia** read-only (`TeamGraph`, XY Flow, destaca membro ativo).
>
> **Difere do plano original deste roadmap:** o grafo usa **XY Flow** (já no stack), não `packages/agent-graph`. Tool-approval sheet e logs panel **não** foram portados (ver pendências). SSE reusado do próprio `/api/teams/.../stream` (não o de orchestrations).

**Objetivo:** a "sala do time" no dashboard — tornar o trabalho do Team visível e operável.

**O que importar (componentes React adaptáveis ao web):**
- **Kanban board** — `src/renderer/components/team/activity/` (ActiveTasksBlock, etc.).
- **Activity timeline** — `src/renderer/components/team/activity/ActivityTimeline.tsx`.
- **Mensagens entre agentes / pending replies** — `ChatHistory.tsx` + `PendingRepliesBlock.tsx`.
- **Grafo do time** — `packages/agent-graph/` (já é pacote React isolado, force-directed; melhor candidato a port direto).
- **Tool-approval sheet** (human-in-the-loop) — padrão `ToolApprovalSheet`.
- **Logs de execução** — `ClaudeLogsPanel.tsx`.

**O que reusar da Polaris:**
- Stack de UI já presente: React 19, Tailwind 4, Radix, shadcn/ui, **XY Flow** (avaliar XY Flow vs `agent-graph` para o grafo — possível redundância).
- SSE de `/api/orchestrations/[id]/stream` para tempo real.
- Dashboard host: `src/app/dashboard/agents/` (nova seção "Teams").

**Esforço:** Médio · **Risco:** Baixo-Médio (adaptar componentes Electron→web) · **Dependências:** **precisa do A** para ter dado real (dá pra prototipar com mock antes).

### Pendências de B
1. ~~**Excluir times**~~ — ✅ FEITO (2026-06-14). Botão + confirmação; reusa `DELETE /api/teams/[id]` (archive `status='archived'`, a lista filtra `active`).
2. ~~**Editar times**~~ — ✅ FEITO (2026-06-14). Modal de edição via `PATCH /api/teams/[id]`; editor de roster extraído num `RosterEditor` compartilhado (criar/editar).
3. ~~**Verificação de disponibilidade de modelo**~~ — ✅ FEITO (2026-06-14). `src/lib/ai/model-availability.ts` (`providerOf` espelha o roteamento do `chatWithAgent` + status por config); `/api/models` retorna `availability`; `POST /api/models/test` faz ping ao vivo; página `/dashboard/models`. Picker desabilita indisponíveis.
4. ~~**Navegação**~~ — ✅ FEITO (2026-06-14). Sidebar ganhou "Modelos" (antes) e "Teams" em "Plataforma".
5. **Slice 6 — drag-drop human-in-the-loop** (kanban arrastável + `PATCH` de task): **deferido por decisão** (2026-06-14) — board é dirigido por agente (valor marginal) + dep nova (`@dnd-kit`, risco OneDrive). ⏳ Reabrir só se sentir falta.
6. **Não portado da Agent Teams AI (avaliar se vale):** tool-approval sheet (human-in-the-loop), painel de logs de execução. ⏳

---

## Sub-projeto C — Code Factory (vertical nova) 🏭

> **STATUS: ✅ Fatias C0 + C1 + C2 + C2.1 ENTREGUES E VALIDADAS EM PROD (2026-06-14).** C2.1: terminal renderiza comandos **ao vivo durante a run** e o diff/PR aparecem **ao concluir sem reload** (validado em prod). C2: terminal **xterm.js** (cores, por task) + **diff viewer** (`diff2html`, side-by-side/unificado) do patch real — validado em prod (`hello.txt` + edição de `README.md`). C1: code-team clonou `JeanZorzetti/repo-de-teste`, criou `hello.txt` e abriu **PR draft #1** (ver bloco C1 abaixo). C0: code-team rodou `echo/cat/ls` num sandbox E2B (dashboard E2B mostrou 1 sandbox subindo e sendo destruído), terminal ao vivo, run `completed` 3.2s/$0.0028, com llama-3.3-70b (Groq). Infra provisionada: Redis durável, E2B (`E2B_API_KEY`), serviço worker EasyPanel (`Dockerfile.worker`, start `npm run worker`), migração aplicada. Spec em `Sub-projeto C - C0 spec.md`. C0 = thread vertical fina: fila durável **BullMQ** (sobre o `ioredis` do stack, só code-runs; chat-runs seguem no `after()`), porta **`SandboxProvider`** + impl **E2B** (`src/lib/sandbox/`), **code-agent ChatFn** (loop `@RUN`/`@DONE` no sandbox, `src/lib/orchestration/team/code-agent.ts` + `code-protocol.ts`, 12/12 testes tsx), **worker** separado (`src/worker/index.ts`, start `npm run worker`), schema `TeamRun.mode/sandboxId` + `TeamTask.artifacts`, evento SSE `terminal` + painel de terminal + toggle Chat/Código na run view. Coordinator (`runTeam`) **intacto**. **Pré-deploy:** provisionar Redis (`REDIS_URL`), conta E2B (`E2B_API_KEY`), serviço worker na EasyPanel, `prisma migrate deploy`. **Próxima fatia: C3 — code-review com diff** (plano/gancho na seção C3 abaixo).

**Objetivo:** permitir que um Team rode agentes de **CÓDIGO** (não só LLM) — versão cloud da Agent Teams AI / "software house na nuvem". Casa com a tese da **Estética Fábrica**.

**Natureza:** **produto novo, não import.** O runtime de código da Agent Teams AI (`claude-multimodel` + `child_process` + filesystem local) **não porta para web**. Precisa ser reconstruído como serviço cloud.

**O que reusa (já construído no C0):**
- O spine de coordenação do **A** (`runTeam` intacto, roster, board, reviewer loop) — invocado via o seam `ChatFn`.
- A UX do **B** (kanban, feed, grafo) + o novo painel de terminal.
- A infra do **C0**: porta `SandboxProvider` + impl E2B (`src/lib/sandbox/`), fila BullMQ + worker (`src/lib/queue/`, `src/worker/index.ts`, `Dockerfile.worker`), code-agent loop (`code-agent.ts`/`code-protocol.ts`), schema `TeamRun.mode/sandboxId` + `TeamTask.artifacts`.

**Esforço:** Alto · **Risco:** Alto · **Dependências:** A, B e C0 prontos. Spec e plano por fatia, um sprint por sessão.

### Fatias do Sub-projeto C

**C0 — Durable code-run + sandbox exec ✅ ENTREGUE (2026-06-14).** Ver bloco STATUS acima e `Sub-projeto C - C0 spec.md`. Um code-team roda comandos shell num sandbox E2B via fila durável, com terminal ao vivo. **Sandbox é 1-por-run** (filesystem persiste entre tasks).

---

**C1 — Git: do sandbox pro Pull Request ✅ ENTREGUE E VALIDADA EM PROD (2026-06-14).**

*Validado E2E:* code-team rodou sobre `JeanZorzetti/repo-de-teste`, criou `hello.txt` e abriu **PR draft #1** (branch `polaris/run-<id>`, 1 commit à frente de `main`, autor "Polaris Teams"). Spec/plano detalhado no plano da Sessão 4 (`~/.claude/plans/...tranquil-unicorn.md`).

*O que foi construído:* **lifecycle do repo no worker**, em volta do `runTeam` (coordinator **INTACTO**): setup (clone + branch) → `runTeam` (agentes editam no repo via `@RUN`, com `cwd`=workdir) → teardown (commit/push/PR). Módulo `src/lib/git/repo-lifecycle.ts` (`setupRepo`/`commitAndPush`/`openPullRequest` + helpers puros; 23 testes tsx em `scripts/c1-verify.ts`). Schema: `TeamRun` ganhou `repoUrl/baseBranch/branch/commitSha/prUrl/prNumber/changedFiles` (migração `20260614130000_code_factory_c1` aplicada em prod). UI: campos de repo no criar/editar time + painel "Entrega de código" (branch + link do PR + arquivos alterados) + banner de erro da run.

*Decisões tomadas (confirmadas com o usuário):* (1) **GitHub-only** (git CLI clone/push + GitHub REST API pro PR, sem `gh`); (2) **worker faz push/PR, token NUNCA no contexto do agente** — token via `http.extraHeader` (não persiste no `.git/config`/remote); (3) **PAT classic/fine-grained no env do worker** (`GITHUB_TOKEN`), nada no DB; (4) binding **híbrido** (`Team.config.repoUrl/defaultBranch` + override por-run); (5) **1 branch/run + PR draft**, título/corpo derivados do sumário do run; (6) **estender models** (sem tabelas novas).

*Gotchas resolvidos no E2E (importante p/ próximas fatias):*
- (a) clone rígido `--branch main` quebra em repo cujo default é `master` ou que está **vazio** → agora detecta o default via `ls-remote` (clona `--branch` só se existir, senão o default) e dá erro claro se o repo for vazio. Retorna o **base efetivo** pro PR.
- (b) **o agente commita sozinho** dentro do sandbox (working tree fica limpa) → o teardown decide a entrega por **commits à frente do base** (`rev-list origin/<base>..HEAD`), não por working tree suja; só commita o que ficou pendente; diff vem de `base..HEAD`.
- (c) erro de provider em code-run era **engolido** no branch OpenRouter → run "Concluído" **falso** sem PR → agora code-run **propaga** o erro (vira `rate_limited`/`failed` honesto, com motivo no banner).

*Também entregue nesta sessão (em serviço do E2E):* **provider Ollama** (`ollama/<modelo>` → endpoint OpenAI-compat self-hosted via `OLLAMA_BASE_URL`); **`rawText` p/ code-runs** (desliga as tools/escrita-de-arquivo do branch OpenRouter em modelos coder/qwen — rodariam na FS do worker, não no sandbox → quebravam o `@RUN`); modelos pagos baratos no catálogo (`openai/gpt-4o-mini`, `deepseek/deepseek-chat`).

*Aprendizado de modelo (relevante p/ operar):* OpenRouter `:free` dá **429** sob a rajada de chamadas do code-team (não é cobrança — é cota do tier free). Reviewer + `maxTurns` altos = mais chamadas. Para velocidade/confiabilidade: modelo cloud **pago barato**; Ollama é fallback self-hosted (lento na CPU 7B). **Pendência opcional:** expor `maxTurns`/`retryCap` no editor de time (hoje default 6/2, fixo) p/ poder enxugar chamadas.

*Esforço (realizado):* Médio-Alto · *Risco real:* a segurança (token) foi tranquila; o que deu trabalho foi o lifecycle do git (default branch, agente commitando, swallow de erro) — tudo resolvido e coberto por testes.

---

**C2 — Terminal/diff streaming rico ✅ ENTREGUE E VALIDADA EM PROD (2026-06-14).**

*Validado E2E:* code-team em `JeanZorzetti/repo-de-teste` criou `hello.txt` e editou `README.md`; o terminal renderizou os comandos coloridos/agrupados por task e o `git diff` apareceu no diff viewer.

*O que foi construído (batch melhorado):* captura do **conteúdo do diff** no teardown (`commitAndPush` roda `git diff origin/<base>..HEAD`, fatia por arquivo via `splitUnifiedDiff`, aplica teto via `capPatch` + budgets, mescla nos itens de `changedFiles`; tudo **best-effort** — falha no diff nunca quebra a entrega). UI: **xterm.js** (`SandboxTerminal.tsx`, cores ANSI, por task) + **diff2html** (`DiffViewer.tsx`, toggle side-by-side/unificado, badges truncado/binário), ambos client-only via `next/dynamic`. Em `src/app/dashboard/teams/[id]/`. Testes puros em `scripts/c2-verify.ts`.

*Decisões tomadas (confirmadas com o usuário):* (1) **batch melhorado** (captura no fim; incremental real → C2.1); (2/3) **usar libs** — `xterm.js` + `diff2html` (consome patch unificado direto); (4/5) **capturar no sandbox e persistir, por-arquivo com teto** (linhas/bytes por arquivo + teto total/nº); (6) **estender os itens de `changedFiles`** → `{path,status,patch?,truncated?,binary?}` → **sem migração** (reusa `Json`), **sem mudança no SSE** (diff pega carona no `changedFiles` do evento `status`).

*Deps novas (pinadas, via `--package-lock-only`):* `@xterm/xterm@6.0.0`, `@xterm/addon-fit@0.11.0`, `diff2html@3.4.56`.

---

**C2.1 — Streaming incremental ✅ ENTREGUE E VALIDADA EM PROD (2026-06-14).**

*Validado E2E:* os comandos aparecem **ao vivo durante a run** (não só ao fim da task) e o diff/PR surgem **ao concluir sem recarregar a página**.

*O que foi construído:* **(A) terminal ao vivo** — o code-agent persiste artifacts **parciais após cada comando** (best-effort); o SSE já faz poll por tamanho do `artifacts` → streama sem mudança no SSE. **(B1) diff no fim sem reload** — o SSE mantém o code-run aberto após `completed` até o teardown gravar `changedFiles`/`prUrl` (ou grace de 45s); chat-runs/C0/falhas fecham na hora.

*Crux de segurança:* o `taskId` chega ao code-agent pelo **`options` (4º param do `ChatFn`)**, **não** pelo `leadContext` — o `chatWithAgent` só lê `model/effort/rawText/useVectorSearch` e ignora chaves extras → **chat-run A/B provadamente intacto**. Mudança no coordinator = **1 linha aditiva** (`runTeam` intacto); worker compartilha **um** `TeamStore` entre `runTeam` e `createCodeChatFn`.

*Fora de escopo (ficou pra depois):* **B2** — diff parcial DURANTE a run (rodar `git diff` entre tasks; working-tree ruidoso, baixo valor).

---

**C3 — Code-review com diff 🔜 (PRÓXIMA FATIA — plano/gancho).**

*Objetivo:* o **Reviewer** do time deixa de avaliar só o texto do worker e passa a avaliar o **diff real** das mudanças — um gate de aprovação sobre o que de fato mudou, antes do PR. Ref. conceitual: módulo `review` da `agent-teams-controller`.

*O que reusa (não reescrever):* todo C0/C1/C2 — o loop de reviewer **já existe** no coordinator (`runTeam` faz `status:'review'` → reviewer → `@APPROVE`/`@REJECT` → retry); o **conteúdo do diff por-arquivo já é capturado** (C2: `changedFiles[].patch`); `team-prompts.ts` monta os prompts; `TeamTask.artifacts` carrega os comandos. O reviewer **hoje** recebe o `result`/texto do worker — falta dar a ele o **diff**.

*Net-new desta fatia:* injetar o diff (ou um resumo/seleção dele, respeitando teto de tokens) no **prompt do reviewer**; possivelmente capturar o diff **por-task** (não só no teardown final) pra o reviewer ver as mudanças daquela task; ajustar o gate de aprovação pra considerar o diff.

*Decisões a fechar no spec do C3 (confirmar escopo com o usuário ANTES de codar):*
1. **Fonte do diff pro reviewer:** o diff final do run (teardown, já existe) **vs diff por-task** capturado no momento do review (mais preciso, mas exige rodar `git diff` por task no sandbox — mexe no fluxo do code-agent/coordinator).
2. **O que entra no prompt:** patch bruto truncado **vs** resumo estruturado (arquivos + hunks principais) pra caber no contexto e não estourar tokens/custo.
3. **Granularidade do gate:** reviewer aprova/rejeita o **run inteiro** (hoje é por-task) **vs** por-arquivo/por-task com o diff respectivo.
4. **Reviewer = code-agent ou chat puro?** ele precisa rodar comandos no sandbox (ex.: `git diff`, rodar testes) **vs** só raciocinar sobre o diff que recebe pronto (mais barato/simples).
5. **Modelo de dados:** estender (consistente com C0/C1/C2) — provavelmente reusar `TeamTask.artifacts`/`reviewNote` e o `changedFiles`, sem tabelas novas.
6. **Custo/limites:** teto de tokens do diff no prompt do reviewer (diffs grandes = caro); reusar os budgets do C2 (`capPatch`).

*Esforço:* Médio · *Risco:* Baixo-Médio (reusa o loop de review existente + o diff já capturado; o risco sobe se for diff por-task, que mexe no fluxo). **Começar a sessão confirmando o escopo + as 6 decisões** antes de escrever spec ou código.

---

## Sequência e racional

```
A (Teams Core)  →  B (Teams UX)  →  C (Code Factory)
   keystone          valor visível      aposta grande
   risco baixo        risco baixo        risco alto
```

- **A → B** entrega o upgrade de produto da Polaris (orquestração vira "time vivo"): valor imediato, risco baixo, 100% sobre o engine existente.
- **C** é a aposta de nova vertical, construída só depois da fundação (A) e da UX (B) provadas.
- Cada seta é uma **sessão de brainstorm→spec→plano→implementação separada** (um sprint por vez).

### Gap técnico transversal — ✅ resolvido (parcialmente) no C0
Era: execução da Polaris síncrona/in-process (sem fila). **C0 trouxe a fila durável (BullMQ + Redis), mas só para code-runs** — chat-runs (A/B) seguem no `after()` + reconciliação por TTL, que aguenta bem. Migrar chat-runs pra fila é limpeza opcional, não urgente.

---

## Próximos passos (cadência acordada: um sprint por sessão)

1. ~~Sub-projeto A (Teams Core)~~ — ✅ **FEITO** (2026-06-13).
2. ~~Sub-projeto B (Teams UX), núcleo + gestão/disponibilidade~~ — ✅ **FEITO** (2026-06-14). Falta só Slice 6 (drag-drop, deferido) e o que não foi portado (tool-approval/logs).
3. ~~Sub-projeto C, fatia C0 (durable code-run + sandbox)~~ — ✅ **FEITO e VALIDADO EM PROD** (2026-06-14).
4. ~~Sub-projeto C, fatia C1 (Git → Pull Request)~~ — ✅ **FEITO e VALIDADO EM PROD** (2026-06-14). PR draft #1 aberto pelo code-team. Ver "Fatias do Sub-projeto C → C1".
5. ~~Sub-projeto C, fatia C2 (terminal/diff streaming rico)~~ — ✅ **FEITO e VALIDADO EM PROD** (2026-06-14). xterm.js + diff2html, batch. Ver "Fatias do Sub-projeto C → C2".
6. ~~Sub-projeto C, fatia C2.1 (streaming incremental)~~ — ✅ **FEITO e VALIDADO EM PROD** (2026-06-14). Terminal ao vivo + diff no fim sem reload. Ver "Fatias do Sub-projeto C → C2.1".
7. **Agora: Sub-projeto C, fatia C3 (code-review com diff)** — ver "Fatias do Sub-projeto C → C3" acima. **Começar a sessão confirmando o escopo + as 6 decisões** (fonte do diff, o que entra no prompt, granularidade do gate, reviewer code-agent vs chat, modelo de dados, custo/limites) antes de escrever spec ou código.

> Cadência mantida: um sprint por sessão; cada fatia do C tem seu próprio spec/plano.

## Verificação deste roadmap
Não há código a rodar — o entregável é o mapa. Validação = revisão humana de que a decomposição (A→B→C, e as fatias C0→C1→C2→C2.1→C3) e o escopo batem com a intenção, antes de abrir a sessão de spec de cada fatia.
