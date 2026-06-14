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

> **STATUS: ✅ Fatia C0 ENTREGUE E VALIDADA EM PROD (2026-06-14).** E2E confirmado: code-team rodou `echo/cat/ls` num sandbox E2B (dashboard E2B mostrou 1 sandbox subindo e sendo destruído), terminal ao vivo, run `completed` 3.2s/$0.0028, com llama-3.3-70b (Groq). Infra provisionada: Redis durável, E2B (`E2B_API_KEY`), serviço worker EasyPanel (`Dockerfile.worker`, start `npm run worker`), migração aplicada. Spec em `Sub-projeto C - C0 spec.md`. C0 = thread vertical fina: fila durável **BullMQ** (sobre o `ioredis` do stack, só code-runs; chat-runs seguem no `after()`), porta **`SandboxProvider`** + impl **E2B** (`src/lib/sandbox/`), **code-agent ChatFn** (loop `@RUN`/`@DONE` no sandbox, `src/lib/orchestration/team/code-agent.ts` + `code-protocol.ts`, 12/12 testes tsx), **worker** separado (`src/worker/index.ts`, start `npm run worker`), schema `TeamRun.mode/sandboxId` + `TeamTask.artifacts`, evento SSE `terminal` + painel de terminal + toggle Chat/Código na run view. Coordinator (`runTeam`) **intacto**. **Pré-deploy:** provisionar Redis (`REDIS_URL`), conta E2B (`E2B_API_KEY`), serviço worker na EasyPanel, `prisma migrate deploy`. Próximas fatias: **C1** git · **C2** terminal/diff rico · **C3** code-review com diff.

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

**C1 — Git: do sandbox pro Pull Request 🔜 (PRÓXIMA FATIA — plano/gancho).**

*Objetivo:* o code-team deixa de operar num sandbox vazio e passa a trabalhar sobre um **repositório real** — clona, cria branch, os agentes editam arquivos (já via `@RUN`), e o trabalho vira **commit + push + Pull Request**. É o que transforma o C0 ("roda comando") em "entrega código de verdade", casando com a tese da Estética Fábrica.

*O que reusa (não reescrever):* todo o C0 — o sandbox já executa shell, então `git`/`gh` são "só mais comandos"; o que muda é **lifecycle do repo** (setup/teardown em volta do `runTeam`) + **auth/segredos**.

*Net-new desta fatia:*
- **Provisionamento do repo:** o worker clona o repo no sandbox **antes** do `runTeam` (setup) e cria a branch de trabalho (ex.: `polaris/run-<runId>`).
- **Auth git + manejo de segredo** (o ponto sensível — o C0 proíbe injetar segredo no sandbox, e o agente roda comando arbitrário lá dentro).
- **Teardown:** commit das mudanças + push + abertura de PR, com sumário do run no corpo do PR.
- **Captura de diff** (básica nesta fatia: arquivos alterados + link do PR; diff visual rico fica no C2).
- **Schema:** `TeamRun.repoUrl/branch/commitSha/prUrl` + binding de repo (provavelmente em `Team.config`).
- **UI:** mostrar branch + link do PR (+ lista de arquivos alterados) na run view.

*Decisões a fechar no spec do C1 (confirmar escopo com o usuário ANTES de codar):*
1. **Provider git:** GitHub-only nesta fatia (via `gh` CLI ou GitHub REST API)?
2. **Auth:** PAT fine-grained vs GitHub App (installation token). Onde guardar (env global do worker vs `Team.config` cifrado)?
3. **Binding do repo:** code-team amarrado a **um repo** (`Team.config.repoUrl`) vs URL **por-run** (na missão)?
4. **Quem faz push/PR — worker ou agente?** ⚠️ *Decisão de segurança.* Recomendação inicial: **worker faz clone/push/PR** (token NUNCA entra no sandbox — o agente só edita arquivos localmente; o worker re-adiciona o remote com token curto na hora do push). Alternativa (token efêmero no sandbox + `@RUN git push`) é mais simples mas expõe o token ao agente.
5. **Estratégia de branch/commit/PR:** 1 branch por run; mensagem de commit/PR derivada do sumário do run; PR como draft?
6. **Modelo de dados:** estender `TeamRun` + `Team.config` (consistente com a decisão (d) do C0 — estender, não criar tabelas).

*Esforço:* Médio-Alto · *Risco:* Médio (auth/segredo é o que assusta; sandbox/worker/agente já provados no C0).

---

**C2 — Terminal/diff streaming rico ⏳.** Substituir o painel de terminal simples por xterm-like + **diff viewer** (lado a lado), streaming incremental. Ref. conceitual: xterm/node-pty do desktop (não porta — recriar web) + `node-diff3`.

**C3 — Code-review com diff ⏳.** O Reviewer do time avalia o **diff** (não só o texto do worker): gate de aprovação sobre as mudanças reais antes do PR. Ref. conceitual: módulo `review` da `agent-teams-controller`.

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
4. **Agora: Sub-projeto C, fatia C1 (Git → Pull Request)** — ver "Fatias do Sub-projeto C → C1" acima. **Começar a sessão confirmando o escopo + as 6 decisões** (provider git, auth, binding de repo, push por worker vs agente, estratégia de branch/PR, modelo de dados) antes de escrever spec ou código.
5. Depois: C2 (terminal/diff rico) → C3 (code-review com diff).

> Cadência mantida: um sprint por sessão; cada fatia do C tem seu próprio spec/plano.

## Verificação deste roadmap
Não há código a rodar — o entregável é o mapa. Validação = revisão humana de que a decomposição (A→B→C, e as fatias C0→C1→C2→C3) e o escopo batem com a intenção, antes de abrir a sessão de spec de cada fatia.
