# Spec — Sub-projeto A: Teams Core (Polaris)

> Programa **Polaris Teams**, fatia A (keystone). Roadmap geral em `docs/Polaris Teams/ROADMAP.md`.
> Este documento é o spec de implementação do A. B (Teams UX) e C (Code Factory) têm specs próprios depois.

## 1. Objetivo

Transformar a orquestração efêmera da Polaris ("executa e morre") numa entidade **Team persistente** com coordenação real entre agentes: roster com papéis fixos (Lead / Worker / Reviewer), um **message bus** peer-to-peer, um **board** (kanban lógico) por missão, e um **loop de reviewer** automático. É a espinha dorsal que destrava B (UX) e C (Code Factory).

Importa-se da Agent Teams AI **conceito/UX/protocolo** (metáfora de time, mensageria, board, reviewer loop, prompts de coordenação) — **nunca** o engine de runtime (binário, child_process, Electron, storage local). A Polaris já tem motor de execução (API LLM + Postgres/Prisma) superior.

## 2. Decisões de design (fechadas no brainstorm)

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Modelo no banco | **Entidade nova dedicada** (tabelas próprias + rotas `/api/teams/*`), reusando `chatWithAgent` e o *padrão* de SSE, sem acoplar ao execute route de orquestração. |
| 2 | Coordenação | **Lead-orquestrado**: o Lead é o cérebro do turno; decide tasks/atribuições/mensagens, Workers executam, Reviewer aprova/rejeita, Lead consolida. |
| 3 | Reviewer gate | **Automático** (agente Reviewer emite APPROVE/REJECT; reusa o protocolo `[REJECT]`+retry). Schema já prevê gate humano (`review`/`blocked`) para o B. |
| 4 | UI | **Mínima de verificação** (criar time, disparar missão, ver board + mensagens + output via SSE). Kanban/timeline/grafo = B. |
| 5 | Roster | **Tabela relacional `TeamMember`** (FK limpa para assignee/from/to), não roster em JSON. |
| 6 | Board/mensagens | Pendurados no **`TeamRun`** (por missão), não num board global mutável. Time persiste e acumula runs. |
| 7 | Protocolo do Lead | **Diretivas por linha** (`@TASK`/`@MESSAGE`/`@DONE`/`@APPROVE`/`@REJECT`), parser por regex, função pura — não JSON estrito (evita fragilidade de parsing de LLM). |

Execução permanece **síncrona/in-process** (sem fila); o gap de fila assíncrona é problema do C, decidido lá.

## 3. Schema Prisma (5 tabelas novas)

Migração formal via `prisma migrate` (regra do projeto: nunca `db execute` manual). Convenções do schema atual: `@db.Uuid` com `@default(uuid())`, `@map` snake_case, `@@map` plural, timestamps `@db.Timestamptz()`.

### 3.1 `Team`
```prisma
model Team {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(255)
  description String?  @db.Text
  config      Json     @default("{}")        // { maxTurns, retryCap, defaultModel, defaultEffort }
  status      String   @default("active") @db.VarChar(20) // active | archived
  createdBy   String   @map("created_by") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  creator User         @relation(fields: [createdBy], references: [id])
  members TeamMember[]
  runs    TeamRun[]

  @@index([createdBy])
  @@index([status])
  @@map("teams")
}
```

### 3.2 `TeamMember`
```prisma
model TeamMember {
  id        String   @id @default(uuid()) @db.Uuid
  teamId    String   @map("team_id") @db.Uuid
  agentId   String   @map("agent_id") @db.Uuid     // referência a Agent existente
  role      String   @db.VarChar(20)               // lead | worker | reviewer
  model     String?  @db.VarChar(100)              // override opcional do modelo
  effort    String?  @db.VarChar(20)               // low | medium | high
  position  Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()

  team  Team  @relation(fields: [teamId], references: [id], onDelete: Cascade)
  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)

  assignedTasks TeamTask[]
  messagesFrom  TeamMessage[] @relation("MessagesFrom")
  messagesTo    TeamMessage[] @relation("MessagesTo")

  @@index([teamId])
  @@index([agentId])
  @@map("team_members")
}
```

**Regra de roster:** exatamente **um** membro `role=lead` por time. Pelo menos um `worker`. Reviewer é opcional — sem reviewer, tasks pulam direto de `review`→`done` (auto-approve). Validado na criação (POST /api/teams) e na partida do run.

### 3.3 `TeamRun`
```prisma
model TeamRun {
  id            String    @id @default(uuid()) @db.Uuid
  teamId        String    @map("team_id") @db.Uuid
  mission       String    @db.Text
  status        String    @default("pending") @db.VarChar(20) // pending | running | completed | failed | cancelled | rate_limited
  output        String?   @db.Text
  turnsUsed     Int?      @map("turns_used")
  tokensUsed    Int?      @map("tokens_used")
  estimatedCost Float?    @map("estimated_cost")
  durationMs    Int?      @map("duration_ms")
  error         String?   @db.Text
  startedAt     DateTime  @default(now()) @map("started_at") @db.Timestamptz()
  completedAt   DateTime? @map("completed_at") @db.Timestamptz()
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  team     Team          @relation(fields: [teamId], references: [id], onDelete: Cascade)
  tasks    TeamTask[]
  messages TeamMessage[]

  @@index([teamId])
  @@index([status])
  @@index([startedAt(sort: Desc)])
  @@map("team_runs")
}
```

### 3.4 `TeamTask`
```prisma
model TeamTask {
  id         String   @id @default(uuid()) @db.Uuid
  runId      String   @map("run_id") @db.Uuid
  title      String   @db.VarChar(500)
  body       String?  @db.Text
  status     String   @default("todo") @db.VarChar(20) // todo | doing | review | done | rejected | blocked
  assigneeId String?  @map("assignee_id") @db.Uuid     // TeamMember.id
  result     String?  @db.Text                          // output do worker
  reviewNote String?  @map("review_note") @db.Text      // feedback do reviewer
  retryCount Int      @default(0) @map("retry_count")
  position   Int      @default(0)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  run      TeamRun     @relation(fields: [runId], references: [id], onDelete: Cascade)
  assignee TeamMember? @relation(fields: [assigneeId], references: [id], onDelete: SetNull)

  @@index([runId])
  @@index([status])
  @@map("team_tasks")
}
```

Estados do board: `todo → doing → review → done`. Caminhos alternativos: `review → rejected → todo` (retry com feedback) e `blocked` (reservado p/ gate humano do B — não usado no A).

### 3.5 `TeamMessage`
```prisma
model TeamMessage {
  id           String   @id @default(uuid()) @db.Uuid
  runId        String   @map("run_id") @db.Uuid
  fromMemberId String?  @map("from_member_id") @db.Uuid // null = sistema/coordenador
  toMemberId   String?  @map("to_member_id") @db.Uuid   // null = broadcast
  summary      String?  @db.Text                         // campo canônico { summary }
  content      String   @db.Text                         // campo canônico { message }
  kind         String   @default("message") @db.VarChar(20) // message | assignment | review | system
  taskId       String?  @map("task_id") @db.Uuid
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz()

  run        TeamRun     @relation(fields: [runId], references: [id], onDelete: Cascade)
  fromMember TeamMember? @relation("MessagesFrom", fields: [fromMemberId], references: [id], onDelete: SetNull)
  toMember   TeamMember? @relation("MessagesTo", fields: [toMemberId], references: [id], onDelete: SetNull)

  @@index([runId])
  @@index([createdAt])
  @@map("team_messages")
}
```

### 3.6 Back-relations (edição em modelos existentes)
- `User`: adicionar `teams Team[]`.
- `Agent`: adicionar `teamMemberships TeamMember[]`.

## 4. Engine de coordenação

Módulo novo `src/lib/orchestration/team/`:
- `team-types.ts` — tipos compartilhados (`TeamMemberCtx`, `BoardSnapshot`, `LeadAction`, `ReviewVerdict`).
- `team-protocol.ts` — parser puro das diretivas do Lead/Reviewer (sem I/O).
- `team-prompts.ts` — builders de prompt de coordenação (portados conceitualmente da Agent Teams AI).
- `team-coordinator.ts` — `runTeam(runId)`: o loop. Único ponto que toca DB + `chatWithAgent`.

### 4.1 Primitiva de execução
Cada membro roda via `chatWithAgent(agentId, messages, opts)` (`src/lib/ai/groq.ts`). `model`/`effort` do `TeamMember`, quando presentes, sobrepõem o default do agente (efforts mapeiam para temperatura/limite de tokens em `opts`).

### 4.2 Loop `runTeam(runId)` (síncrono, `maxDuration=300`)

```
carregar run + team + members (lead, workers[], reviewer?)
marcar run.status = 'running'
turn = 0
enquanto turn < maxTurns:
  turn++
  ── PLANEJAMENTO (Lead) ──
  snapshot = buildBoardSnapshot(tasks, messages)
  leadOut  = chatWithAgent(lead, [buildLeadContext(mission, snapshot)])
  actions  = parseLeadActions(leadOut)          // @TASK / @MESSAGE / @DONE
  se actions tem @DONE e board sem pendências:
     run.output = texto do @DONE; status='completed'; break
  aplicar @TASK  -> criar TeamTask(status='todo', assignee resolvido por nome/role)
  aplicar @MESSAGE -> criar TeamMessage(kind='assignment'|'message')

  ── EXECUÇÃO (Workers) ──
  para cada task 'todo' com assignee worker:
     checar cancelamento  -> se cancelled: encerrar gracioso
     task.status='doing'
     workerOut = chatWithAgent(worker, [buildTaskPrompt(task, contexto, feedback?)])
     task.result = workerOut; task.status = reviewer? 'review' : 'done'
     TeamMessage(from=worker, to=reviewer|lead, kind='message', summary=...)
     persistir incremental

  ── REVIEW (Reviewer, se existir) ──
  para cada task 'review':
     revOut = chatWithAgent(reviewer, [buildReviewPrompt(task)])
     verdict = parseReviewVerdict(revOut)        // @APPROVE | @REJECT motivo
     se APPROVE: task.status='done'
     senão: task.reviewNote=motivo; task.retryCount++
            se retryCount <= retryCap: task.status='todo' (re-fila p/ worker c/ feedback)
            senão: task.status='rejected' (desiste; entra na consolidação como falha)
     TeamMessage(from=reviewer, to=worker, kind='review')
     persistir incremental

  se board todo em done/rejected e nada novo a fazer:
     ── CONSOLIDAÇÃO (Lead) ──
     leadFinal = chatWithAgent(lead, [buildConsolidationPrompt(board)])
     run.output = leadFinal; status='completed'; break

se saiu por maxTurns sem completar: status='completed' com output parcial + nota de teto.
finalizar: métricas (turnsUsed, tokensUsed somando usage, estimatedCost, durationMs), completedAt.
```

**Guard-rails (orçamento p/ caber em 300s):**
- `maxTurns` (config, default **6**) — teto de passadas do Lead.
- `retryCap` (config, default **2**) — retries por task antes de `rejected`.
- **Rate-limit:** reusar a detecção do execute route (`hit your limit`/`429`/etc.) → parada graciosa, `run.status='rate_limited'`, output parcial salvo.
- **Cancelamento:** `DELETE` seta `cancelled`; o loop checa `run.status` entre cada sub-etapa (igual ao execute route) e encerra retornando o board parcial.

### 4.3 Resolução de assignee
`@TASK [worker:Nome|role]` resolve para um `TeamMember`: primeiro por `agent.name` (case-insensitive) entre os workers; senão por `role`; senão round-robin entre workers. Lead e Reviewer não recebem tasks de board (são coordenação/gate).

## 5. Protocolo de diretivas (`team-protocol.ts`)

Parser puro, tolerante a ruído de LLM, regex por linha. Formato emitido pelo Lead:

```
@TASK [worker:Ana] Implementar validação do formulário
  Critério: cobre campos obrigatórios e e-mail. Retornar diff.
@TASK [role:worker] Escrever testes da validação
@MESSAGE [para:Ana] Priorize o caso de e-mail inválido.
@DONE Resumo consolidado da missão: ...
```

Reviewer:
```
@APPROVE
@REJECT O teste de e-mail não cobre domínio sem TLD; refazer.
```

Regras de parsing:
- Diretiva começa no início da linha (`^@TASK`, `^@MESSAGE`, `^@DONE`, `^@APPROVE`, `^@REJECT`). Linhas indentadas após `@TASK` até a próxima diretiva = `body`.
- `[worker:Nome]` / `[role:worker]` / `[para:Nome]` opcionais, extraídos por sub-regex; ausência cai nas regras de fallback (§4.3).
- Texto sem nenhuma diretiva: tratado como `@DONE` implícito **somente** na etapa de consolidação; na etapa de planejamento, ausência de `@TASK` com board vazio → cria uma task única com o output como corpo (fallback anti-travamento, espelha o "pass through" do task-parser atual).
- Funções exportadas: `parseLeadActions(text): LeadAction[]`, `parseReviewVerdict(text): { approved: boolean; reason?: string }`.

## 6. Prompts de coordenação (`team-prompts.ts`)

Builders (portados conceitualmente de `TeamProvisioningPromptBuilders.ts` / `actionModeInstructions.ts`):
- `buildLeadContext(mission, snapshot, roster)` — papel de Lead, missão, snapshot do board (tasks por coluna + últimas mensagens), e o **contrato de diretivas** (`@TASK/@MESSAGE/@DONE`). Inclui o roster (nomes + papéis) para o Lead atribuir por nome.
- `buildBoardSnapshot(tasks, messages)` — texto compacto do estado (colunas + assignees + mensagens recentes).
- `buildTaskPrompt(task, accumulatedContext, feedback?)` — papel de Worker; foco exclusivo na task; se `feedback` (vinda de `@REJECT`), injeta "refaça corrigindo: …".
- `buildReviewPrompt(task)` — papel de Reviewer; recebe título/corpo/critério + `result` do worker; deve responder `@APPROVE` ou `@REJECT motivo`.
- `buildConsolidationPrompt(board)` — Lead resume os resultados `done` numa entrega final.

Cada builder retorna `string` (a `content` da mensagem `user` para `chatWithAgent`). System prompt vem do próprio Agent de cada membro.

## 7. Rotas API (`src/app/api/teams/`)

Padrões obrigatórios: `params: Promise<{...}>` + `await params`; `getAuthFromRequest(request)` retornando `JWTPayload` com `.id`; `import { prisma } from '@/lib/prisma'`; Groq lazy (já garantido por `chatWithAgent`).

| Método/Rota | Função |
|---|---|
| `POST /api/teams` | Cria time + roster (valida: 1 lead, ≥1 worker). |
| `GET /api/teams` | Lista times do usuário. |
| `GET /api/teams/[id]` | Detalhe: roster + runs recentes. |
| `PATCH /api/teams/[id]` | Edita nome/descrição/config/roster. |
| `DELETE /api/teams/[id]` | Arquiva (`status='archived'`). |
| `POST /api/teams/[id]/run` | Cria `TeamRun` (mission) e roda `runTeam()` síncrono. `maxDuration=300`. |
| `GET /api/teams/[id]/runs/[runId]` | Board + mensagens + output. |
| `GET /api/teams/[id]/runs/[runId]/stream` | SSE: porta o padrão polling-diff de `orchestrations/[id]/stream` (poll do `TeamRun`/tasks/messages, emite eventos `task_updated`, `message`, `status`). |
| `DELETE /api/teams/[id]/runs/[runId]` | Cancela run em andamento. |

## 8. UI mínima de verificação (`src/app/dashboard/teams/`)

- `page.tsx` — lista de times + botão "Novo time" (form: nome, escolher Agents existentes, atribuir papel a cada um).
- `[id]/page.tsx` — roster; campo "Nova missão" → `POST run`; **visão do run ativo**: board como 4 listas (todo/doing/review/done) com título+assignee+status, **log de mensagens** (from→to, kind, summary), e **output final**. Atualização ao vivo via `EventSource` no endpoint `/stream`.

Componentes shadcn já presentes (Card, Badge, Button, Textarea). Sem drag-drop, force-graph ou timeline — Sub-projeto B.

## 9. Estratégia de testes (TDD)

- **Unit (puro, sem DB):**
  - `team-protocol.test.ts` — `parseLeadActions` (vários formatos, ruído, fallback) e `parseReviewVerdict` (approve/reject/sem diretiva).
  - `team-prompts.test.ts` — builders contêm missão, roster, contrato de diretivas, feedback quando presente.
  - board state machine — helper puro de transição (`nextStatus(task, event)`), se extraído.
- **Integração (`chatWithAgent` mockado):**
  - `team-coordinator.test.ts` — roteiro: Lead cria 2 tasks → workers produzem → reviewer aprova uma e rejeita outra → retry → consolida. Assert: transições do board, `retryCount`, mensagens emitidas, `run.output`, métricas, respeito a `maxTurns`/`retryCap`, e parada por cancelamento.

Usa o jest já configurado (`jest.config.js`, `jest.setup.js`).

## 10. Entregáveis (checklist do A)

1. Migração Prisma com as 5 tabelas + 2 back-relations (`prisma migrate`).
2. `src/lib/orchestration/team/` (types, protocol, prompts, coordinator) com testes.
3. Rotas `/api/teams/*` (CRUD + run + runs + stream + cancel).
4. UI mínima em `/dashboard/teams`.
5. Build verde (`prisma generate` antes de `next build`) e testes passando.

## 11. Fora de escopo (explícito)

- Kanban drag-drop, activity timeline, grafo do time, tool-approval sheet → **Sub-projeto B**.
- Runtime de código, sandbox, git, terminal/diff, fila assíncrona → **Sub-projeto C**.
- Gate humano de aprovação (pausa/retoma run) → **B** (o schema só deixa o caminho aberto via status `review`/`blocked`).
- Agendamento de runs de time via cron → fora do A (a infra de `ScheduledExecution` existe e pode ser estendida depois).

## 12. Critérios de aceite

- Criar um time com Lead + 2 Workers + Reviewer a partir de agentes existentes.
- Disparar uma missão e, via `/stream`, ver tasks transitando todo→doing→review→done, ao menos um `@REJECT` gerando retry com feedback, e um `output` final consolidado pelo Lead.
- `TeamRun` persiste com métricas; board e mensagens daquele run permanecem navegáveis depois de concluído.
- Suite de testes (unit + integração mockada) verde; build de produção sem erros de TS.
