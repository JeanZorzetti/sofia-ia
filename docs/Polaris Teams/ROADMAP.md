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

### Pendências de B (próxima iteração) ⏳
Itens de gestão/fluxo que faltam para o B ficar "redondo" antes de partir pro C:
1. **Excluir times** — UI no `/dashboard/teams`. Backend já existe (`DELETE /api/teams/[id]` faz archive `status='archived'`); falta o botão + confirmação. (Avaliar: archive vs delete real.)
2. **Editar times** — UI de edição (nome + roster + modelo/effort por membro). Backend já existe (`PATCH /api/teams/[id]`, substitui roster inteiro). Extrair o editor de roster do criar-time num componente compartilhado (reuso criar/editar).
3. **Verificação de disponibilidade de modelo** — **antes de /teams no fluxo de trabalho.** Hoje o picker oferece TODOS os modelos de `/api/models` mesmo que o provider não esteja configurado/alcançável → o run falha em tempo de execução. Precisa checar disponibilidade (config de chaves/integrações e/ou ping) e refletir no picker (e idealmente uma etapa "Modelos" no fluxo). *Design a confirmar.*
4. **Navegação:** `/dashboard/teams` **não está no Sidebar** (página órfã hoje). Adicionar em "Plataforma" perto de "Orquestrações" — e "Modelos" antes de "Teams" se virar etapa própria.
5. **Slice 6 — drag-drop human-in-the-loop** (kanban arrastável + `PATCH` de task): **deferido por decisão** (2026-06-14) — board é dirigido por agente (valor marginal) + dep nova (`@dnd-kit`, risco OneDrive). Reabrir só se sentir falta.
6. **Não portado da Agent Teams AI (avaliar se vale):** tool-approval sheet (human-in-the-loop), painel de logs de execução.

---

## Sub-projeto C — Code Factory (vertical nova) 🏭

> **STATUS: ✅ Fatia C0 ENTREGUE E VALIDADA EM PROD (2026-06-14).** E2E confirmado: code-team rodou `echo/cat/ls` num sandbox E2B (dashboard E2B mostrou 1 sandbox subindo e sendo destruído), terminal ao vivo, run `completed` 3.2s/$0.0028, com llama-3.3-70b (Groq). Infra provisionada: Redis durável, E2B (`E2B_API_KEY`), serviço worker EasyPanel (`Dockerfile.worker`, start `npm run worker`), migração aplicada. Spec em `Sub-projeto C - C0 spec.md`. C0 = thread vertical fina: fila durável **BullMQ** (sobre o `ioredis` do stack, só code-runs; chat-runs seguem no `after()`), porta **`SandboxProvider`** + impl **E2B** (`src/lib/sandbox/`), **code-agent ChatFn** (loop `@RUN`/`@DONE` no sandbox, `src/lib/orchestration/team/code-agent.ts` + `code-protocol.ts`, 12/12 testes tsx), **worker** separado (`src/worker/index.ts`, start `npm run worker`), schema `TeamRun.mode/sandboxId` + `TeamTask.artifacts`, evento SSE `terminal` + painel de terminal + toggle Chat/Código na run view. Coordinator (`runTeam`) **intacto**. **Pré-deploy:** provisionar Redis (`REDIS_URL`), conta E2B (`E2B_API_KEY`), serviço worker na EasyPanel, `prisma migrate deploy`. Próximas fatias: **C1** git · **C2** terminal/diff rico · **C3** code-review com diff.

**Objetivo:** permitir que um Team rode agentes de **CÓDIGO** (não só LLM) — versão cloud da Agent Teams AI / "software house na nuvem". Casa com a tese da **Estética Fábrica**.

**Natureza:** **produto novo, não import.** O runtime de código da Agent Teams AI (`claude-multimodel` + `child_process` + filesystem local) **não porta para web**. Precisa ser reconstruído como serviço cloud.

**O que é net-new (infra pesada):**
- Sandbox isolado por run (avaliar E2B / Daytona / Modal / Firecracker / Docker-per-run).
- Integração git (clone/branch/commit/PR) + exec seguro de comandos.
- Streaming de terminal/diff para a UI (substitui xterm/node-pty do desktop).
- Workflow de code review com diff (ref. conceitual: `agent-teams-controller` módulo `review` + `node-diff3`).

**O que reusa:**
- O spine de coordenação do **A** (roster, message bus, board, reviewer loop) — mesmo cérebro, runtime diferente.
- A UX do **B** (kanban, timeline, grafo) — só troca o painel de saída por terminal/diff.

**Esforço:** Alto · **Risco:** Alto · **Dependências:** **A e B prontos.** Provavelmente exige fila assíncrona (BullMQ/Temporal) — hoje a execução da Polaris é síncrona/in-process. Spec e plano **próprios**, em track separado.

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

### Gap técnico transversal a vigiar
A execução da Polaris hoje é **síncrona/in-process** (sem fila). A e B aguentam assim; **C quase certamente exige fila assíncrona** (BullMQ/Temporal + Redis, que já está no stack). Decidir a fila no spec do C, não antes.

---

## Próximos passos (cadência acordada: um sprint por sessão)

1. ~~Sub-projeto A (Teams Core)~~ — ✅ **FEITO** (2026-06-13).
2. ~~Sub-projeto B (Teams UX), núcleo~~ — ✅ **FEITO** (2026-06-14).
3. **Agora: fechar as "Pendências de B"** (acima) — excluir/editar times, verificação de disponibilidade de modelo (antes de /teams) e nav no Sidebar. Iteração de gestão/fluxo, não um sub-projeto novo.
4. **Depois: Sub-projeto C (Code Factory)** — produto novo, spec/plano próprios. É onde entra a **fila durável** (BullMQ/Temporal + Redis) que foi adiada de propósito (o B usa `after()` in-process + reconciliação por TTL).

> Decisão de cadência mantida: um sprint por sessão; C tratado como produto novo com seu próprio spec.

## Verificação deste roadmap
Não há código a rodar — o entregável é o mapa. Validação = revisão humana de que a decomposição A→B→C e o escopo de cada fatia batem com a intenção, antes de abrir a sessão de spec do A.
