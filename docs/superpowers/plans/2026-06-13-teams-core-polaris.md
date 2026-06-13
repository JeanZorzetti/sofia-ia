# Teams Core (Polaris) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, Lead-orchestrated multi-agent **Team** to Polaris — roster with fixed roles (Lead/Worker/Reviewer), a per-run board, a peer-to-peer message bus, and an automatic reviewer loop — built entirely on the existing engine (`chatWithAgent` + Prisma + SSE pattern).

**Architecture:** Five new Prisma tables (`Team`, `TeamMember`, `TeamRun`, `TeamTask`, `TeamMessage`). A coordination engine in `src/lib/orchestration/team/` whose `runTeam()` loop depends on an injected `TeamStore` port (Prisma-backed in prod, in-memory in tests) and an injected `chat` function — so the loop is unit-testable without mocking the DB. New `/api/teams/*` routes (CRUD + run + run detail + SSE stream + cancel). A minimal verification UI under `/dashboard/teams`.

**Tech Stack:** Next.js 16 (App Router, RSC-first), TypeScript, Prisma + PostgreSQL, Groq SDK (via `chatWithAgent`), Jest (jsdom, alias `@/`→`src/`), Tailwind + shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-06-13-teams-core-polaris-design.md`
**Branch:** `feat/teams-core` (already created and checked out).

---

## Conventions for every task

- **Prisma client:** always `import { prisma } from '@/lib/prisma'`. Never `new PrismaClient()`.
- **Route auth:** `const auth = await getAuthFromRequest(request); if (!auth) return 401`. The payload field is `auth.id` (NOT `auth.userId`).
- **Next 16 params:** route handlers use `{ params }: { params: Promise<{...}> }` then `const { id } = await params`.
- **Tests live in** `src/__tests__/...`. Run a single file with `npx jest <path>`. Run all with `npm test`.
- **Commits:** Conventional Commits, English. End every commit message body with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  (omitted from the short commands below for brevity — always append it).
- **chatWithAgent** signature: `chatWithAgent(agentId, messages, leadContext?, options?)` → returns `{ message: string; model: string; usage?: { total_tokens?: number } }`.

---

## File Structure

**New — coordination engine** (`src/lib/orchestration/team/`):
- `team-types.ts` — shared types (roles, statuses, rows, actions, `ChatFn`).
- `team-protocol.ts` — pure parsers `parseLeadActions`, `parseReviewVerdict`.
- `team-board.ts` — pure helpers `resolveMemberByName`, `resolveAssignee`, `isBoardSettled`, `isRateLimit`.
- `team-prompts.ts` — prompt builders `buildLeadContext`, `buildBoardSnapshot`, `buildTaskPrompt`, `buildReviewPrompt`, `buildConsolidationPrompt`.
- `team-store.ts` — `TeamStore` interface + `createPrismaTeamStore()` adapter.
- `team-coordinator.ts` — `runTeam(runId, { store, chat })` loop.
- `team-roster.ts` — pure `validateRoster()` used by the create route.

**New — API** (`src/app/api/teams/`):
- `route.ts` — `GET` list, `POST` create.
- `[id]/route.ts` — `GET`, `PATCH`, `DELETE`.
- `[id]/run/route.ts` — `POST` start a run (synchronous).
- `[id]/runs/[runId]/route.ts` — `GET` detail, `DELETE` cancel.
- `[id]/runs/[runId]/stream/route.ts` — `GET` SSE.

**New — UI** (`src/app/dashboard/teams/`):
- `page.tsx` — list + create.
- `[id]/page.tsx` — server page (loads team + recent runs).
- `[id]/TeamRunView.tsx` — client component (mission input + SSE board/messages/output).

**Modify:**
- `prisma/schema.prisma` — 5 new models + back-relations on `User` and `Agent`.

**Test files** (`src/__tests__/lib/team/` and `src/__tests__/lib/team/helpers/`):
- `team-protocol.test.ts`, `team-board.test.ts`, `team-prompts.test.ts`, `team-roster.test.ts`, `team-coordinator.test.ts`, `helpers/memory-store.ts`.

---

## Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma` (append 5 models; edit `User` ~line 50 and `Agent` ~line 264 to add back-relations)

- [ ] **Step 1: Add back-relation to `User`**

In `model User`, add this line alongside the other relation fields (e.g. after `flows Flow[]`):

```prisma
  teams                Team[]
```

- [ ] **Step 2: Add back-relation to `Agent`**

In `model Agent`, add this line alongside the other relation fields (e.g. after `agentMcpServers AgentMcpServer[]`):

```prisma
  teamMemberships TeamMember[]
```

- [ ] **Step 3: Append the 5 new models to the end of `prisma/schema.prisma`**

```prisma
// ─────────────────────────────────────────────────────────
// Polaris Teams — persistent multi-agent team (sub-project A)
// ─────────────────────────────────────────────────────────
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

model TeamMember {
  id        String   @id @default(uuid()) @db.Uuid
  teamId    String   @map("team_id") @db.Uuid
  agentId   String   @map("agent_id") @db.Uuid
  role      String   @db.VarChar(20)  // lead | worker | reviewer
  model     String?  @db.VarChar(100)
  effort    String?  @db.VarChar(20)  // low | medium | high
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

model TeamTask {
  id         String   @id @default(uuid()) @db.Uuid
  runId      String   @map("run_id") @db.Uuid
  title      String   @db.VarChar(500)
  body       String?  @db.Text
  status     String   @default("todo") @db.VarChar(20) // todo | doing | review | done | rejected | blocked
  assigneeId String?  @map("assignee_id") @db.Uuid
  result     String?  @db.Text
  reviewNote String?  @map("review_note") @db.Text
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

model TeamMessage {
  id           String   @id @default(uuid()) @db.Uuid
  runId        String   @map("run_id") @db.Uuid
  fromMemberId String?  @map("from_member_id") @db.Uuid
  toMemberId   String?  @map("to_member_id") @db.Uuid
  summary      String?  @db.Text
  content      String   @db.Text
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

- [ ] **Step 4: Validate the schema and create the migration**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

Then (requires DB reachable; `.env` `DATABASE_URL` must point at `31.97.23.166:5499`):
Run: `npx prisma migrate dev --name add_teams_core`
Expected: migration created under `prisma/migrations/<ts>_add_teams_core/` and applied; `prisma generate` runs automatically.

> If the dev DB is not reachable from this machine, fall back to: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` is NOT correct for creating; instead run `npx prisma generate` to refresh the client types and create the migration later against the deploy DB with `npx prisma migrate deploy`. Note this in the commit body.

- [ ] **Step 5: Verify the generated client has the new models**

Run: `node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); console.log(['team','teamMember','teamRun','teamTask','teamMessage'].map(k=>typeof p[k])); process.exit(0)"`
Expected: `[ 'object', 'object', 'object', 'object', 'object' ]`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(teams): add Team/TeamMember/TeamRun/TeamTask/TeamMessage schema"
```

---

## Task 2: Shared types (`team-types.ts`)

**Files:**
- Create: `src/lib/orchestration/team/team-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/orchestration/team/team-types.ts
// Shared types for the Polaris Teams coordination engine.

export type TeamRole = 'lead' | 'worker' | 'reviewer'
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'rejected' | 'blocked'
export type RunStatus =
  | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rate_limited'
export type MessageKind = 'message' | 'assignment' | 'review' | 'system'

/** A resolved roster member (joins TeamMember + Agent.name). */
export interface MemberCtx {
  id: string          // TeamMember.id
  agentId: string
  agentName: string
  role: TeamRole
  model: string | null
  effort: string | null
}

/** Board card as the coordinator sees it. */
export interface TaskRow {
  id: string
  title: string
  body: string | null
  status: TaskStatus
  assigneeId: string | null
  result: string | null
  reviewNote: string | null
  retryCount: number
  position: number
}

/** Message as the coordinator sees it. */
export interface MessageRow {
  id: string
  fromMemberId: string | null
  toMemberId: string | null
  summary: string | null
  content: string
  kind: MessageKind
  taskId: string | null
}

/** A directive parsed out of the Lead's output. */
export interface LeadAction {
  type: 'task' | 'message' | 'done'
  title?: string
  body?: string
  assignTo?: { kind: 'name' | 'role'; value: string }
  to?: string        // message target (member name)
  summary?: string   // message text
  text?: string      // done body
}

export interface ReviewVerdict {
  approved: boolean
  reason?: string
}

export interface ChatResult {
  message: string
  model: string
  usage?: { total_tokens?: number } | null
}

export type ChatMessageInput = { role: 'user' | 'assistant' | 'system'; content: string }

/** Injectable execution primitive (real impl: chatWithAgent). */
export type ChatFn = (
  agentId: string,
  messages: ChatMessageInput[],
  leadContext?: Record<string, unknown>,
) => Promise<ChatResult>
```

- [ ] **Step 2: Type-check the file compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `team-types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/orchestration/team/team-types.ts
git commit -m "feat(teams): shared coordination types"
```

---

## Task 3: Directive parser (`team-protocol.ts`) — TDD

**Files:**
- Create: `src/lib/orchestration/team/team-protocol.ts`
- Test: `src/__tests__/lib/team/team-protocol.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/lib/team/team-protocol.test.ts
import { parseLeadActions, parseReviewVerdict } from '@/lib/orchestration/team/team-protocol'

describe('parseLeadActions', () => {
  it('parses a @TASK with a named worker and indented body', () => {
    const out = [
      '@TASK [worker:Ana] Implementar validação',
      '  Critério: cobre e-mail inválido',
      '  e campos obrigatórios',
    ].join('\n')
    const actions = parseLeadActions(out)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      type: 'task',
      title: 'Implementar validação',
      assignTo: { kind: 'name', value: 'Ana' },
    })
    expect(actions[0].body).toContain('Critério: cobre e-mail inválido')
    expect(actions[0].body).toContain('campos obrigatórios')
  })

  it('parses @TASK [role:worker] as a role target', () => {
    const actions = parseLeadActions('@TASK [role:worker] Escrever testes')
    expect(actions[0].assignTo).toEqual({ kind: 'role', value: 'worker' })
    expect(actions[0].title).toBe('Escrever testes')
  })

  it('parses @MESSAGE with [para:Nome]', () => {
    const actions = parseLeadActions('@MESSAGE [para:Ana] Priorize e-mail inválido.')
    expect(actions).toEqual([
      { type: 'message', to: 'Ana', summary: 'Priorize e-mail inválido.' },
    ])
  })

  it('parses @DONE capturing following lines as text', () => {
    const out = '@DONE Resumo final:\nlinha 1\nlinha 2'
    const actions = parseLeadActions(out)
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('done')
    expect(actions[0].text).toBe('Resumo final:\nlinha 1\nlinha 2')
  })

  it('parses multiple tasks then a message', () => {
    const out = [
      '@TASK [worker:Ana] T1',
      '  corpo 1',
      '@TASK [worker:Bob] T2',
      '@MESSAGE [para:Ana] oi',
    ].join('\n')
    const actions = parseLeadActions(out)
    expect(actions.map(a => a.type)).toEqual(['task', 'task', 'message'])
    expect(actions[0].body).toBe('corpo 1')
    expect(actions[1].title).toBe('T2')
  })

  it('tolerates noise lines before the first directive', () => {
    const out = 'Vou organizar o trabalho.\n@TASK [worker:Ana] Fazer X'
    const actions = parseLeadActions(out)
    expect(actions).toHaveLength(1)
    expect(actions[0].title).toBe('Fazer X')
  })

  it('returns [] when there is no directive', () => {
    expect(parseLeadActions('apenas texto livre, sem diretivas')).toEqual([])
  })
})

describe('parseReviewVerdict', () => {
  it('detects @APPROVE', () => {
    expect(parseReviewVerdict('Tudo certo.\n@APPROVE')).toEqual({ approved: true })
  })
  it('detects @REJECT with reason', () => {
    expect(parseReviewVerdict('@REJECT falta cobrir TLD ausente')).toEqual({
      approved: false, reason: 'falta cobrir TLD ausente',
    })
  })
  it('reject wins when both appear', () => {
    expect(parseReviewVerdict('@APPROVE\n@REJECT na verdade não').approved).toBe(false)
  })
  it('defaults to approved when no directive (lenient, retryCap bounds loops)', () => {
    expect(parseReviewVerdict('parece ok pra mim')).toEqual({ approved: true })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/__tests__/lib/team/team-protocol.test.ts`
Expected: FAIL — `Cannot find module '@/lib/orchestration/team/team-protocol'`.

- [ ] **Step 3: Implement `team-protocol.ts`**

```typescript
// src/lib/orchestration/team/team-protocol.ts
// Pure parsers for the Lead/Reviewer line-directive protocol.
// No I/O — safe to unit test in isolation.

import type { LeadAction, ReviewVerdict } from './team-types'

/** Extracts a leading `[key:value]` target from a directive remainder. */
function extractTarget(rest: string): {
  assignTo?: { kind: 'name' | 'role'; value: string }
  text: string
} {
  const m = rest.match(/^\s*\[([a-zA-Z]+)\s*:\s*([^\]]+)\]\s*(.*)$/)
  if (!m) return { text: rest.trim() }
  const key = m[1].toLowerCase()
  const value = m[2].trim()
  const kind: 'name' | 'role' = key === 'role' ? 'role' : 'name'
  return { assignTo: { kind, value }, text: m[3].trim() }
}

/**
 * Parse the Lead's output into ordered actions.
 * Directives must start a line: @TASK / @MESSAGE / @DONE.
 * Indented / following lines after @TASK or @DONE accumulate as body/text.
 * Lines before the first directive are ignored.
 */
export function parseLeadActions(text: string): LeadAction[] {
  const lines = text.split(/\r?\n/)
  const actions: LeadAction[] = []
  let current: LeadAction | null = null

  const flush = () => {
    if (!current) return
    if (current.body !== undefined) current.body = current.body.trim()
    if (current.text !== undefined) current.text = current.text.trim()
    actions.push(current)
    current = null
  }

  for (const line of lines) {
    const taskM = line.match(/^@TASK\b\s*(.*)$/i)
    const msgM = line.match(/^@MESSAGE\b\s*(.*)$/i)
    const doneM = line.match(/^@DONE\b\s*(.*)$/i)

    if (taskM) {
      flush()
      const { assignTo, text } = extractTarget(taskM[1])
      current = { type: 'task', title: text || 'Tarefa', body: '', assignTo }
    } else if (msgM) {
      flush()
      const { assignTo, text } = extractTarget(msgM[1])
      actions.push({ type: 'message', to: assignTo?.value, summary: text })
      current = null
    } else if (doneM) {
      flush()
      current = { type: 'done', text: doneM[1] }
    } else if (current?.type === 'task') {
      current.body = current.body ? `${current.body}\n${line}` : line
    } else if (current?.type === 'done') {
      current.text = current.text ? `${current.text}\n${line}` : line
    }
  }
  flush()
  return actions
}

/**
 * Parse a Reviewer verdict. @REJECT (with optional reason) wins over @APPROVE.
 * No directive → lenient approve (the coordinator's retryCap bounds any loop).
 */
export function parseReviewVerdict(text: string): ReviewVerdict {
  const rejectM = text.match(/(?:^|\n)\s*@REJECT\b\s*([\s\S]*)/i)
  if (rejectM) {
    const reason = rejectM[1].trim()
    return { approved: false, reason: reason || undefined }
  }
  return { approved: true }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/__tests__/lib/team/team-protocol.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/orchestration/team/team-protocol.ts src/__tests__/lib/team/team-protocol.test.ts
git commit -m "feat(teams): line-directive protocol parser"
```

---

## Task 4: Board helpers (`team-board.ts`) — TDD

**Files:**
- Create: `src/lib/orchestration/team/team-board.ts`
- Test: `src/__tests__/lib/team/team-board.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/lib/team/team-board.test.ts
import {
  resolveMemberByName, resolveAssignee, isBoardSettled, isRateLimit,
} from '@/lib/orchestration/team/team-board'
import type { MemberCtx, TaskRow } from '@/lib/orchestration/team/team-types'

const worker = (id: string, name: string): MemberCtx =>
  ({ id, agentId: `a-${id}`, agentName: name, role: 'worker', model: null, effort: null })

const task = (status: TaskRow['status']): TaskRow =>
  ({ id: 't', title: 'x', body: null, status, assigneeId: null, result: null, reviewNote: null, retryCount: 0, position: 0 })

describe('resolveMemberByName', () => {
  it('matches case-insensitively, ignoring surrounding space', () => {
    const ms = [worker('1', 'Ana'), worker('2', 'Bob')]
    expect(resolveMemberByName(ms, '  ana ')?.id).toBe('1')
  })
  it('returns null when no match', () => {
    expect(resolveMemberByName([worker('1', 'Ana')], 'Zoe')).toBeNull()
  })
})

describe('resolveAssignee', () => {
  const workers = [worker('1', 'Ana'), worker('2', 'Bob')]
  it('resolves a name target to that worker', () => {
    expect(resolveAssignee(workers, { kind: 'name', value: 'Bob' }, 0)?.id).toBe('2')
  })
  it('falls back to round-robin by seed when name is unknown', () => {
    expect(resolveAssignee(workers, { kind: 'name', value: 'Zoe' }, 0)?.id).toBe('1')
    expect(resolveAssignee(workers, { kind: 'name', value: 'Zoe' }, 1)?.id).toBe('2')
  })
  it('round-robins for a role target', () => {
    expect(resolveAssignee(workers, { kind: 'role', value: 'worker' }, 3)?.id).toBe('2')
  })
  it('round-robins when no target given', () => {
    expect(resolveAssignee(workers, undefined, 2)?.id).toBe('1')
  })
  it('returns null when there are no workers', () => {
    expect(resolveAssignee([], undefined, 0)).toBeNull()
  })
})

describe('isBoardSettled', () => {
  it('false for empty board', () => {
    expect(isBoardSettled([])).toBe(false)
  })
  it('true when every task is done or rejected', () => {
    expect(isBoardSettled([task('done'), task('rejected')])).toBe(true)
  })
  it('false when any task is still active', () => {
    expect(isBoardSettled([task('done'), task('review')])).toBe(false)
  })
})

describe('isRateLimit', () => {
  it('detects common rate-limit phrasings and 429', () => {
    expect(isRateLimit(new Error('Request failed: 429 Too Many Requests'))).toBe(true)
    expect(isRateLimit(new Error('You hit your limit'))).toBe(true)
  })
  it('false for ordinary errors', () => {
    expect(isRateLimit(new Error('boom'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/__tests__/lib/team/team-board.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `team-board.ts`**

```typescript
// src/lib/orchestration/team/team-board.ts
// Pure board/roster helper functions.

import type { MemberCtx, TaskRow } from './team-types'

const norm = (s: string) => s.trim().toLowerCase()

export function resolveMemberByName(members: MemberCtx[], name: string): MemberCtx | null {
  const n = norm(name)
  return members.find(m => norm(m.agentName) === n) ?? null
}

/**
 * Resolve a task's worker. Name target → that worker if found.
 * Otherwise (unknown name, role target, or no target) → round-robin by `seed`.
 */
export function resolveAssignee(
  workers: MemberCtx[],
  assignTo: { kind: 'name' | 'role'; value: string } | undefined,
  seed: number,
): MemberCtx | null {
  if (workers.length === 0) return null
  if (assignTo?.kind === 'name') {
    const m = resolveMemberByName(workers, assignTo.value)
    if (m) return m
  }
  return workers[((seed % workers.length) + workers.length) % workers.length]
}

/** A board is settled when it is non-empty and has no active tasks. */
export function isBoardSettled(board: TaskRow[]): boolean {
  return board.length > 0 && board.every(t => t.status === 'done' || t.status === 'rejected')
}

/** Detect provider rate-limit errors (mirrors the orchestration execute route). */
export function isRateLimit(err: unknown): boolean {
  const e = err as { message?: string; stderr?: string }
  const msg = `${e?.message ?? ''} ${e?.stderr ?? ''}`
  return /hit your limit|rate limit|too many requests|\b429\b/i.test(msg)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/__tests__/lib/team/team-board.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/orchestration/team/team-board.ts src/__tests__/lib/team/team-board.test.ts
git commit -m "feat(teams): pure board/roster helpers"
```

---

## Task 5: Prompt builders (`team-prompts.ts`) — TDD

**Files:**
- Create: `src/lib/orchestration/team/team-prompts.ts`
- Test: `src/__tests__/lib/team/team-prompts.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/lib/team/team-prompts.test.ts
import {
  buildLeadContext, buildBoardSnapshot, buildTaskPrompt,
  buildReviewPrompt, buildConsolidationPrompt,
} from '@/lib/orchestration/team/team-prompts'
import type { MemberCtx, TaskRow, MessageRow } from '@/lib/orchestration/team/team-types'

const members: MemberCtx[] = [
  { id: 'L', agentId: 'al', agentName: 'Lia', role: 'lead', model: null, effort: null },
  { id: 'W', agentId: 'aw', agentName: 'Ana', role: 'worker', model: null, effort: null },
]
const task: TaskRow = {
  id: 't1', title: 'Validar form', body: 'cobrir e-mail', status: 'todo',
  assigneeId: 'W', result: null, reviewNote: null, retryCount: 0, position: 0,
}

describe('buildLeadContext', () => {
  it('includes mission, roster names, and the directive contract', () => {
    const out = buildLeadContext('Construir login', [], [], members)
    expect(out).toContain('Construir login')
    expect(out).toContain('Ana')           // roster
    expect(out).toContain('@TASK')         // contract
    expect(out).toContain('@DONE')
  })
})

describe('buildBoardSnapshot', () => {
  it('groups tasks by status', () => {
    const msgs: MessageRow[] = []
    const out = buildBoardSnapshot([task], msgs)
    expect(out).toContain('Validar form')
    expect(out.toLowerCase()).toContain('todo')
  })
})

describe('buildTaskPrompt', () => {
  it('focuses the worker on the single task', () => {
    const out = buildTaskPrompt(task, null)
    expect(out).toContain('Validar form')
    expect(out).toContain('cobrir e-mail')
  })
  it('injects reviewer feedback when present', () => {
    const out = buildTaskPrompt(task, 'faltou TLD ausente')
    expect(out).toContain('faltou TLD ausente')
  })
})

describe('buildReviewPrompt', () => {
  it('shows the worker result and asks for @APPROVE/@REJECT', () => {
    const out = buildReviewPrompt({ ...task, status: 'review', result: 'feito' })
    expect(out).toContain('feito')
    expect(out).toContain('@APPROVE')
    expect(out).toContain('@REJECT')
  })
})

describe('buildConsolidationPrompt', () => {
  it('includes done task results', () => {
    const out = buildConsolidationPrompt([{ ...task, status: 'done', result: 'pronto' }])
    expect(out).toContain('pronto')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/__tests__/lib/team/team-prompts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `team-prompts.ts`**

```typescript
// src/lib/orchestration/team/team-prompts.ts
// Coordination prompt builders (conceptually ported from Agent Teams AI).
// Each returns the `content` of the `user` message for chatWithAgent;
// the member's own systemPrompt provides its persona.

import type { MemberCtx, TaskRow, MessageRow } from './team-types'

const DIRECTIVE_CONTRACT = `
Responda SOMENTE com diretivas, uma por linha:
@TASK [worker:NomeDoAgente] Título curto da tarefa
  (linhas indentadas = corpo/critério de aceite)
@MESSAGE [para:NomeDoAgente] mensagem curta para um membro
@DONE Texto final consolidado (use só quando TODAS as tarefas estiverem concluídas)

Regras:
- Atribua cada @TASK a um Worker pelo nome do roster abaixo.
- Não duplique tarefas que já existem no board.
- Se o board já está todo concluído, responda apenas com @DONE e o resumo final.`.trim()

function rosterBlock(members: MemberCtx[]): string {
  return members
    .map(m => `- ${m.agentName} — ${m.role}`)
    .join('\n')
}

export function buildBoardSnapshot(tasks: TaskRow[], messages: MessageRow[]): string {
  if (tasks.length === 0) return 'Board vazio (nenhuma tarefa criada ainda).'
  const cols: TaskRow['status'][] = ['todo', 'doing', 'review', 'done', 'rejected']
  const parts: string[] = []
  for (const col of cols) {
    const items = tasks.filter(t => t.status === col)
    if (items.length === 0) continue
    parts.push(`[${col.toUpperCase()}]`)
    for (const t of items) {
      const note = t.reviewNote ? ` (feedback: ${t.reviewNote})` : ''
      parts.push(`  - ${t.title}${note}`)
    }
  }
  const recent = messages.slice(-5)
  if (recent.length > 0) {
    parts.push('\nMensagens recentes:')
    for (const m of recent) parts.push(`  • ${m.summary ?? m.content.slice(0, 120)}`)
  }
  return parts.join('\n')
}

export function buildLeadContext(
  mission: string,
  tasks: TaskRow[],
  messages: MessageRow[],
  members: MemberCtx[],
): string {
  return [
    'Você é o LEAD de um time de agentes. Coordene o trabalho para cumprir a missão.',
    '',
    `## Missão\n${mission}`,
    '',
    `## Roster\n${rosterBlock(members)}`,
    '',
    `## Estado atual do board\n${buildBoardSnapshot(tasks, messages)}`,
    '',
    `## Protocolo de resposta\n${DIRECTIVE_CONTRACT}`,
  ].join('\n')
}

export function buildTaskPrompt(task: TaskRow, feedback: string | null): string {
  const parts = [
    'Você é um WORKER do time. Execute EXCLUSIVAMENTE a tarefa abaixo e entregue o resultado completo.',
    '',
    `## Tarefa\n${task.title}`,
  ]
  if (task.body) parts.push(`\n${task.body}`)
  if (feedback) {
    parts.push(`\n## ⚠️ Correção solicitada pelo Reviewer\n${feedback}\n\nRefaça corrigindo os pontos acima.`)
  }
  parts.push('\nAo terminar, responda apenas com o resultado da tarefa.')
  return parts.join('\n')
}

export function buildReviewPrompt(task: TaskRow): string {
  return [
    'Você é o REVIEWER do time. Avalie criticamente o trabalho do Worker.',
    '',
    `## Tarefa\n${task.title}`,
    task.body ? `\n${task.body}` : '',
    '',
    `## Resultado entregue pelo Worker\n${task.result ?? '(vazio)'}`,
    '',
    'Responda SOMENTE com uma diretiva:',
    '@APPROVE  — se o resultado cumpre a tarefa',
    '@REJECT motivo objetivo  — se precisa ser refeito',
  ].join('\n')
}

export function buildConsolidationPrompt(tasks: TaskRow[]): string {
  const done = tasks
    .filter(t => t.status === 'done')
    .map(t => `### ${t.title}\n${t.result ?? ''}`)
    .join('\n\n')
  const failed = tasks.filter(t => t.status === 'rejected').map(t => `- ${t.title}`).join('\n')
  return [
    'Você é o LEAD. Consolide os resultados do time numa entrega final coesa para o usuário.',
    '',
    `## Resultados aprovados\n${done || '(nenhum)'}`,
    failed ? `\n## Tarefas não concluídas\n${failed}` : '',
    '',
    'Escreva a entrega final consolidada (texto livre, sem diretivas).',
  ].join('\n')
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/__tests__/lib/team/team-prompts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/orchestration/team/team-prompts.ts src/__tests__/lib/team/team-prompts.test.ts
git commit -m "feat(teams): coordination prompt builders"
```

---

## Task 6: Store port + Prisma adapter (`team-store.ts`)

**Files:**
- Create: `src/lib/orchestration/team/team-store.ts`

> This task defines the `TeamStore` interface and the production Prisma adapter. The in-memory test double is built in Task 7 (where it's first needed). No standalone unit test here — the adapter is exercised end-to-end by the route/build; the interface is exercised by Task 7's coordinator tests.

- [ ] **Step 1: Create `team-store.ts`**

```typescript
// src/lib/orchestration/team/team-store.ts
// Persistence port for the coordinator + the Prisma-backed implementation.
// The coordinator depends ONLY on the TeamStore interface, so it can be
// driven by an in-memory store in tests (no DB mock needed).

import { prisma } from '@/lib/prisma'
import type {
  MemberCtx, TaskRow, MessageRow, TaskStatus, RunStatus, MessageKind, TeamRole,
} from './team-types'

export interface LoadedRun {
  runId: string
  teamId: string
  mission: string
  config: { maxTurns: number; retryCap: number }
  members: MemberCtx[]
}

export interface CreateTaskInput {
  title: string
  body?: string | null
  assigneeId?: string | null
  status?: TaskStatus
  position?: number
}

export interface UpdateTaskInput {
  status?: TaskStatus
  result?: string | null
  reviewNote?: string | null
  retryCount?: number
  assigneeId?: string | null
}

export interface AddMessageInput {
  fromMemberId?: string | null
  toMemberId?: string | null
  summary?: string | null
  content: string
  kind: MessageKind
  taskId?: string | null
}

export interface FinishRunInput {
  status: RunStatus
  output?: string | null
  turnsUsed: number
  tokensUsed: number
  estimatedCost: number
  durationMs: number
  error?: string | null
}

export interface TeamStore {
  loadRun(runId: string): Promise<LoadedRun | null>
  getRunStatus(runId: string): Promise<RunStatus | null>
  setRunRunning(runId: string): Promise<void>
  finishRun(runId: string, data: FinishRunInput): Promise<void>
  listTasks(runId: string): Promise<TaskRow[]>
  createTask(runId: string, data: CreateTaskInput): Promise<TaskRow>
  updateTask(taskId: string, data: UpdateTaskInput): Promise<void>
  listMessages(runId: string): Promise<MessageRow[]>
  addMessage(runId: string, data: AddMessageInput): Promise<void>
}

function parseConfig(raw: unknown): { maxTurns: number; retryCap: number } {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const maxTurns = typeof c.maxTurns === 'number' && c.maxTurns > 0 ? c.maxTurns : 6
  const retryCap = typeof c.retryCap === 'number' && c.retryCap >= 0 ? c.retryCap : 2
  return { maxTurns, retryCap }
}

export function createPrismaTeamStore(): TeamStore {
  return {
    async loadRun(runId) {
      const run = await prisma.teamRun.findUnique({
        where: { id: runId },
        include: {
          team: {
            include: {
              members: {
                orderBy: { position: 'asc' },
                include: { agent: { select: { name: true } } },
              },
            },
          },
        },
      })
      if (!run) return null
      return {
        runId: run.id,
        teamId: run.teamId,
        mission: run.mission,
        config: parseConfig(run.team.config),
        members: run.team.members.map(m => ({
          id: m.id,
          agentId: m.agentId,
          agentName: m.agent.name,
          role: m.role as TeamRole,
          model: m.model,
          effort: m.effort,
        })),
      }
    },

    async getRunStatus(runId) {
      const r = await prisma.teamRun.findUnique({ where: { id: runId }, select: { status: true } })
      return (r?.status as RunStatus) ?? null
    },

    async setRunRunning(runId) {
      await prisma.teamRun.update({ where: { id: runId }, data: { status: 'running' } })
    },

    async finishRun(runId, data) {
      await prisma.teamRun.update({
        where: { id: runId },
        data: {
          status: data.status,
          output: data.output ?? null,
          error: data.error ?? null,
          turnsUsed: data.turnsUsed,
          tokensUsed: data.tokensUsed,
          estimatedCost: data.estimatedCost,
          durationMs: data.durationMs,
          completedAt: new Date(),
        },
      })
    },

    async listTasks(runId) {
      const rows = await prisma.teamTask.findMany({
        where: { runId },
        orderBy: { position: 'asc' },
      })
      return rows.map(t => ({
        id: t.id, title: t.title, body: t.body, status: t.status as TaskStatus,
        assigneeId: t.assigneeId, result: t.result, reviewNote: t.reviewNote,
        retryCount: t.retryCount, position: t.position,
      }))
    },

    async createTask(runId, data) {
      const count = await prisma.teamTask.count({ where: { runId } })
      const t = await prisma.teamTask.create({
        data: {
          runId,
          title: data.title.slice(0, 500),
          body: data.body ?? null,
          assigneeId: data.assigneeId ?? null,
          status: data.status ?? 'todo',
          position: data.position ?? count,
        },
      })
      return {
        id: t.id, title: t.title, body: t.body, status: t.status as TaskStatus,
        assigneeId: t.assigneeId, result: t.result, reviewNote: t.reviewNote,
        retryCount: t.retryCount, position: t.position,
      }
    },

    async updateTask(taskId, data) {
      await prisma.teamTask.update({ where: { id: taskId }, data })
    },

    async listMessages(runId) {
      const rows = await prisma.teamMessage.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
      })
      return rows.map(m => ({
        id: m.id, fromMemberId: m.fromMemberId, toMemberId: m.toMemberId,
        summary: m.summary, content: m.content, kind: m.kind as MessageKind, taskId: m.taskId,
      }))
    },

    async addMessage(runId, data) {
      await prisma.teamMessage.create({
        data: {
          runId,
          fromMemberId: data.fromMemberId ?? null,
          toMemberId: data.toMemberId ?? null,
          summary: data.summary ?? null,
          content: data.content,
          kind: data.kind,
          taskId: data.taskId ?? null,
        },
      })
    },
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `team-store.ts`. (If the Prisma client lacks the new models, Task 1 step 4 wasn't applied — generate the client.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/orchestration/team/team-store.ts
git commit -m "feat(teams): TeamStore port + Prisma adapter"
```

---

## Task 7: Coordinator loop (`team-coordinator.ts`) — TDD

**Files:**
- Create: `src/lib/orchestration/team/team-coordinator.ts`
- Create (test double): `src/__tests__/lib/team/helpers/memory-store.ts`
- Test: `src/__tests__/lib/team/team-coordinator.test.ts`

- [ ] **Step 1: Create the in-memory store test double**

```typescript
// src/__tests__/lib/team/helpers/memory-store.ts
// In-memory TeamStore for deterministic coordinator tests.
import type {
  TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput, FinishRunInput,
} from '@/lib/orchestration/team/team-store'
import type { MemberCtx, TaskRow, MessageRow, RunStatus } from '@/lib/orchestration/team/team-types'

export interface MemoryState {
  status: RunStatus
  finished?: FinishRunInput
  tasks: TaskRow[]
  messages: MessageRow[]
}

export function createMemoryStore(opts: {
  mission: string
  members: MemberCtx[]
  config?: { maxTurns: number; retryCap: number }
}): { store: TeamStore; state: MemoryState; cancel: () => void } {
  const state: MemoryState = { status: 'pending', tasks: [], messages: [] }
  let taskSeq = 0
  let msgSeq = 0
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

  const store: TeamStore = {
    async loadRun(): Promise<LoadedRun> {
      return {
        runId: 'run-1', teamId: 'team-1', mission: opts.mission,
        config: opts.config ?? { maxTurns: 6, retryCap: 2 },
        members: opts.members,
      }
    },
    async getRunStatus() { return state.status },
    async setRunRunning() { state.status = 'running' },
    async finishRun(_runId, data: FinishRunInput) { state.status = data.status; state.finished = data },
    async listTasks() { return clone(state.tasks) },
    async createTask(_runId, data: CreateTaskInput) {
      const row: TaskRow = {
        id: `t${++taskSeq}`, title: data.title, body: data.body ?? null,
        status: data.status ?? 'todo', assigneeId: data.assigneeId ?? null,
        result: null, reviewNote: null, retryCount: 0, position: state.tasks.length,
      }
      state.tasks.push(row)
      return clone(row)
    },
    async updateTask(taskId, data: UpdateTaskInput) {
      const t = state.tasks.find(x => x.id === taskId)
      if (t) Object.assign(t, data)
    },
    async listMessages() { return clone(state.messages) },
    async addMessage(_runId, data: AddMessageInput) {
      state.messages.push({
        id: `m${++msgSeq}`, fromMemberId: data.fromMemberId ?? null,
        toMemberId: data.toMemberId ?? null, summary: data.summary ?? null,
        content: data.content, kind: data.kind, taskId: data.taskId ?? null,
      })
    },
  }
  return { store, state, cancel: () => { state.status = 'cancelled' } }
}
```

- [ ] **Step 2: Write the failing coordinator tests**

```typescript
// src/__tests__/lib/team/team-coordinator.test.ts
import { runTeam } from '@/lib/orchestration/team/team-coordinator'
import { createMemoryStore } from './helpers/memory-store'
import type { MemberCtx, ChatFn, ChatResult } from '@/lib/orchestration/team/team-types'

const members: MemberCtx[] = [
  { id: 'L', agentId: 'al', agentName: 'Lia', role: 'lead', model: null, effort: null },
  { id: 'W', agentId: 'aw', agentName: 'Ana', role: 'worker', model: null, effort: null },
  { id: 'R', agentId: 'ar', agentName: 'Rex', role: 'reviewer', model: null, effort: null },
]
const reply = (message: string): ChatResult => ({ message, model: 'mock', usage: { total_tokens: 10 } })

/** Build a ChatFn that returns scripted replies by agentId, in call order. */
function scriptedChat(script: Record<string, string[]>): ChatFn {
  const idx: Record<string, number> = {}
  return async (agentId) => {
    const queue = script[agentId] ?? []
    const i = idx[agentId] ?? 0
    idx[agentId] = i + 1
    return reply(queue[Math.min(i, queue.length - 1)] ?? '@DONE vazio')
  }
}

describe('runTeam — happy path with reviewer approve', () => {
  it('drives a task todo→doing→review→done and consolidates', async () => {
    const { store, state } = createMemoryStore({ mission: 'Fazer X', members })
    const chat = scriptedChat({
      al: [
        '@TASK [worker:Ana] Implementar X\n  faça direito',  // turn 1 planning
        '@DONE concluído',                                    // (unused: consolidation uses its own call)
      ],
      aw: ['resultado da Ana'],
      ar: ['@APPROVE'],
    })
    await runTeam('run-1', { store, chat })

    expect(state.status).toBe('completed')
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].status).toBe('done')
    expect(state.tasks[0].result).toBe('resultado da Ana')
    expect(state.finished?.output).toBeTruthy()
    expect(state.finished?.tokensUsed).toBeGreaterThan(0)
  })
})

describe('runTeam — reject then retry then approve', () => {
  it('re-queues a rejected task with feedback and completes', async () => {
    const { store, state } = createMemoryStore({ mission: 'Fazer Y', members })
    let workerCalls = 0
    const chat: ChatFn = async (agentId) => {
      if (agentId === 'al') {
        // First planning call creates the task; later planning calls add nothing.
        return reply(state.tasks.length === 0 ? '@TASK [worker:Ana] Tarefa Y' : 'sem novas tarefas')
      }
      if (agentId === 'aw') { workerCalls++; return reply(`tentativa ${workerCalls}`) }
      if (agentId === 'ar') {
        const t = state.tasks[0]
        return reply(t.retryCount === 0 ? '@REJECT corrija o caso A' : '@APPROVE')
      }
      return reply('@DONE')
    }
    await runTeam('run-1', { store, chat })

    expect(state.status).toBe('completed')
    expect(workerCalls).toBe(2)                       // executed twice (retry)
    expect(state.tasks[0].status).toBe('done')
    expect(state.tasks[0].retryCount).toBe(1)
    // feedback message was emitted by the reviewer
    expect(state.messages.some(m => m.kind === 'review' && /corrija/.test(m.content))).toBe(true)
  })
})

describe('runTeam — no reviewer auto-approves', () => {
  it('moves worker output straight to done', async () => {
    const noReviewer = members.filter(m => m.role !== 'reviewer')
    const { store, state } = createMemoryStore({ mission: 'Z', members: noReviewer })
    const chat = scriptedChat({ al: ['@TASK [worker:Ana] Z'], aw: ['feito'] })
    await runTeam('run-1', { store, chat })
    expect(state.tasks[0].status).toBe('done')
    expect(state.status).toBe('completed')
  })
})

describe('runTeam — cancellation', () => {
  it('stops and marks cancelled when status flips mid-run', async () => {
    const { store, state, cancel } = createMemoryStore({ mission: 'C', members })
    const chat: ChatFn = async (agentId) => {
      if (agentId === 'al') { cancel(); return reply('@TASK [worker:Ana] X') }
      return reply('x')
    }
    await runTeam('run-1', { store, chat })
    expect(state.status).toBe('cancelled')
  })
})

describe('runTeam — maxTurns guard', () => {
  it('stops after maxTurns without an infinite loop', async () => {
    const { store, state } = createMemoryStore({
      mission: 'loop', members, config: { maxTurns: 2, retryCap: 5 },
    })
    // Reviewer always rejects; retryCap high → task keeps re-queuing until maxTurns.
    const chat: ChatFn = async (agentId) => {
      if (agentId === 'al') return reply(state.tasks.length === 0 ? '@TASK [worker:Ana] T' : 'nada')
      if (agentId === 'aw') return reply('tentativa')
      if (agentId === 'ar') return reply('@REJECT de novo')
      return reply('x')
    }
    await runTeam('run-1', { store, chat })
    expect(state.status).toBe('completed')
    expect(state.finished?.turnsUsed).toBe(2)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/__tests__/lib/team/team-coordinator.test.ts`
Expected: FAIL — `Cannot find module '@/lib/orchestration/team/team-coordinator'`.

- [ ] **Step 4: Implement `team-coordinator.ts`**

```typescript
// src/lib/orchestration/team/team-coordinator.ts
// Lead-orchestrated team coordination loop. Synchronous, in-process.
// Depends only on an injected TeamStore + ChatFn (see team-store.ts / team-types.ts).

import type { ChatFn, ChatResult, TaskRow } from './team-types'
import type { TeamStore } from './team-store'
import { parseLeadActions, parseReviewVerdict } from './team-protocol'
import { buildLeadContext, buildTaskPrompt, buildReviewPrompt, buildConsolidationPrompt } from './team-prompts'
import { resolveAssignee, isBoardSettled, isRateLimit } from './team-board'

const COST_PER_1M_TOKENS = 0.5

export interface RunTeamDeps {
  store: TeamStore
  chat: ChatFn
  now?: () => number
}

export async function runTeam(runId: string, deps: RunTeamDeps): Promise<void> {
  const { store, chat, now = () => Date.now() } = deps

  const loaded = await store.loadRun(runId)
  if (!loaded) throw new Error(`TeamRun ${runId} not found`)
  const { mission, config, members } = loaded

  const lead = members.find(m => m.role === 'lead')
  if (!lead) throw new Error('Team has no lead member')
  const workers = members.filter(m => m.role === 'worker')
  if (workers.length === 0) throw new Error('Team has no worker members')
  const reviewer = members.find(m => m.role === 'reviewer') ?? null

  const startMs = now()
  let tokensUsed = 0
  let turnsUsed = 0

  const track = (r: ChatResult) => { tokensUsed += r.usage?.total_tokens ?? 0 }
  const cancelled = async () => (await store.getRunStatus(runId)) === 'cancelled'
  const finish = (status: Parameters<TeamStore['finishRun']>[1]['status'], output?: string | null, error?: string | null) =>
    store.finishRun(runId, {
      status,
      output: output ?? null,
      error: error ?? null,
      turnsUsed,
      tokensUsed,
      estimatedCost: (tokensUsed / 1_000_000) * COST_PER_1M_TOKENS,
      durationMs: now() - startMs,
    })

  await store.setRunRunning(runId)

  try {
    for (let turn = 0; turn < config.maxTurns; turn++) {
      turnsUsed = turn + 1
      if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }

      // ── PLANNING (Lead) ──
      const board0 = await store.listTasks(runId)
      const msgs0 = await store.listMessages(runId)
      const leadOut = await chat(lead.agentId, [
        { role: 'user', content: buildLeadContext(mission, board0, msgs0, members) },
      ])
      track(leadOut)

      let actions
      try { actions = parseLeadActions(leadOut.message) } catch { actions = [] }

      for (const a of actions) {
        if (a.type === 'message') {
          const to = a.to ? (workers.find(w => w.agentName.toLowerCase() === a.to!.toLowerCase()) ?? null) : null
          await store.addMessage(runId, {
            fromMemberId: lead.id, toMemberId: to?.id ?? null,
            summary: a.summary ?? null, content: a.summary ?? '', kind: 'message',
          })
        } else if (a.type === 'task') {
          const seed = (await store.listTasks(runId)).length
          const assignee = resolveAssignee(workers, a.assignTo, seed)
          const created = await store.createTask(runId, {
            title: a.title ?? 'Tarefa', body: a.body ?? null,
            assigneeId: assignee?.id ?? null, status: 'todo',
          })
          await store.addMessage(runId, {
            fromMemberId: lead.id, toMemberId: assignee?.id ?? null,
            summary: a.title ?? null, content: a.body ?? a.title ?? '', kind: 'assignment', taskId: created.id,
          })
        }
      }

      const doneAction = actions.find(a => a.type === 'done')

      // Anti-stall: lead emitted neither tasks nor @DONE and the board is empty.
      let boardNow = await store.listTasks(runId)
      if (boardNow.length === 0 && !doneAction) {
        await store.createTask(runId, {
          title: 'Missão', body: leadOut.message, assigneeId: workers[0].id, status: 'todo',
        })
        boardNow = await store.listTasks(runId)
      }

      // ── EXECUTION (Workers) ──
      const todo = boardNow.filter(t => t.status === 'todo' && t.assigneeId && workers.some(w => w.id === t.assigneeId))
      for (const t of todo) {
        if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }
        const worker = workers.find(w => w.id === t.assigneeId)!
        await store.updateTask(t.id, { status: 'doing' })
        let out: ChatResult
        try {
          out = await chat(worker.agentId, [{ role: 'user', content: buildTaskPrompt(t, t.reviewNote) }])
        } catch (e) {
          if (isRateLimit(e)) { await finish('rate_limited', null, 'Rate limit durante execução'); return }
          throw e
        }
        track(out)
        await store.updateTask(t.id, {
          status: reviewer ? 'review' : 'done', result: out.message, reviewNote: null,
        })
        await store.addMessage(runId, {
          fromMemberId: worker.id, toMemberId: reviewer?.id ?? lead.id,
          summary: `Concluí: ${t.title}`, content: out.message.slice(0, 2000), kind: 'message', taskId: t.id,
        })
      }

      // ── REVIEW (Reviewer) ──
      if (reviewer) {
        const toReview = (await store.listTasks(runId)).filter(t => t.status === 'review')
        for (const t of toReview) {
          if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }
          let out: ChatResult
          try {
            out = await chat(reviewer.agentId, [{ role: 'user', content: buildReviewPrompt(t) }])
          } catch (e) {
            if (isRateLimit(e)) { await finish('rate_limited', null, 'Rate limit durante review'); return }
            throw e
          }
          track(out)
          const verdict = parseReviewVerdict(out.message)
          if (verdict.approved) {
            await store.updateTask(t.id, { status: 'done' })
            await store.addMessage(runId, {
              fromMemberId: reviewer.id, toMemberId: t.assigneeId, summary: 'Aprovado',
              content: '@APPROVE', kind: 'review', taskId: t.id,
            })
          } else {
            const nextRetry = t.retryCount + 1
            const reason = verdict.reason ?? 'Refazer'
            await store.updateTask(t.id, {
              status: nextRetry <= config.retryCap ? 'todo' : 'rejected',
              reviewNote: reason, retryCount: nextRetry,
            })
            await store.addMessage(runId, {
              fromMemberId: reviewer.id, toMemberId: t.assigneeId, summary: 'Rejeitado',
              content: reason, kind: 'review', taskId: t.id,
            })
          }
        }
      }

      // ── SETTLE / CONSOLIDATE ──
      const board = await store.listTasks(runId)
      if (isBoardSettled(board)) {
        if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }
        const conso = await chat(lead.agentId, [{ role: 'user', content: buildConsolidationPrompt(board) }])
        track(conso)
        await finish('completed', conso.message)
        return
      }
      if (doneAction && board.length === 0) {
        await finish('completed', doneAction.text || leadOut.message)
        return
      }
      // else: pending work remains (e.g. a retry re-queued to todo) → next turn.
    }

    // maxTurns reached without settling.
    const board = await store.listTasks(runId)
    const partial = board
      .filter((t: TaskRow) => t.status === 'done')
      .map((t: TaskRow) => `### ${t.title}\n${t.result ?? ''}`)
      .join('\n\n')
    await finish('completed', `⚠️ Teto de ${config.maxTurns} turnos atingido.\n\n${partial}`)
  } catch (e) {
    await finish('failed', null, (e as Error)?.message ?? 'Erro desconhecido')
    throw e
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/__tests__/lib/team/team-coordinator.test.ts`
Expected: PASS (all 5 describe blocks).

- [ ] **Step 6: Run the whole team suite**

Run: `npx jest src/__tests__/lib/team`
Expected: PASS (protocol, board, prompts, coordinator).

- [ ] **Step 7: Commit**

```bash
git add src/lib/orchestration/team/team-coordinator.ts src/__tests__/lib/team/team-coordinator.test.ts src/__tests__/lib/team/helpers/memory-store.ts
git commit -m "feat(teams): Lead-orchestrated coordinator loop"
```

---

## Task 8: Roster validation + Team CRUD routes

**Files:**
- Create: `src/lib/orchestration/team/team-roster.ts`
- Test: `src/__tests__/lib/team/team-roster.test.ts`
- Create: `src/app/api/teams/route.ts`
- Create: `src/app/api/teams/[id]/route.ts`

- [ ] **Step 1: Write the failing roster-validation test**

```typescript
// src/__tests__/lib/team/team-roster.test.ts
import { validateRoster } from '@/lib/orchestration/team/team-roster'

const M = (role: string, agentId = 'a') => ({ agentId, role })

describe('validateRoster', () => {
  it('accepts 1 lead + 1 worker', () => {
    expect(validateRoster([M('lead'), M('worker')])).toBeNull()
  })
  it('accepts 1 lead + worker + reviewer', () => {
    expect(validateRoster([M('lead'), M('worker'), M('reviewer')])).toBeNull()
  })
  it('rejects empty roster', () => {
    expect(validateRoster([])).toMatch(/vazio/i)
  })
  it('requires exactly one lead', () => {
    expect(validateRoster([M('worker')])).toMatch(/lead/i)
    expect(validateRoster([M('lead'), M('lead'), M('worker')])).toMatch(/lead/i)
  })
  it('requires at least one worker', () => {
    expect(validateRoster([M('lead')])).toMatch(/worker/i)
  })
  it('rejects more than one reviewer', () => {
    expect(validateRoster([M('lead'), M('worker'), M('reviewer'), M('reviewer')])).toMatch(/reviewer/i)
  })
  it('rejects invalid role', () => {
    expect(validateRoster([M('lead'), M('boss')])).toMatch(/papel/i)
  })
  it('rejects a member missing agentId', () => {
    expect(validateRoster([M('lead'), { role: 'worker', agentId: '' }])).toMatch(/agentId/i)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/__tests__/lib/team/team-roster.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `team-roster.ts`**

```typescript
// src/lib/orchestration/team/team-roster.ts
// Pure validation for a team roster submitted to POST /api/teams.

export interface RosterInput {
  agentId: string
  role: string
  model?: string | null
  effort?: string | null
  position?: number
}

const VALID_ROLES = new Set(['lead', 'worker', 'reviewer'])

/** Returns an error message, or null if the roster is valid. */
export function validateRoster(members: RosterInput[]): string | null {
  if (!Array.isArray(members) || members.length === 0) return 'Roster vazio'
  if (members.some(m => !VALID_ROLES.has(m.role))) return 'Papel inválido (use lead|worker|reviewer)'
  if (members.filter(m => m.role === 'lead').length !== 1) return 'O time precisa de exatamente 1 Lead'
  if (!members.some(m => m.role === 'worker')) return 'O time precisa de ao menos 1 Worker'
  if (members.filter(m => m.role === 'reviewer').length > 1) return 'No máximo 1 Reviewer'
  if (members.some(m => !m.agentId)) return 'Todo membro precisa de um agentId'
  return null
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/__tests__/lib/team/team-roster.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/app/api/teams/route.ts`**

```typescript
// src/app/api/teams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { validateRoster, type RosterInput } from '@/lib/orchestration/team/team-roster'

// GET /api/teams — list the current user's teams
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const teams = await prisma.team.findMany({
      where: { createdBy: auth.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } },
        _count: { select: { runs: true } },
      },
    })
    return NextResponse.json({ success: true, data: teams })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list teams'
    console.error('Error listing teams:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/teams — create a team with a roster
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, config, members } = body as {
      name?: string; description?: string; config?: Record<string, unknown>; members?: RosterInput[]
    }
    if (!name?.trim()) return NextResponse.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 })

    const rosterError = validateRoster(members ?? [])
    if (rosterError) return NextResponse.json({ success: false, error: rosterError }, { status: 400 })

    // Verify all referenced agents belong to the user.
    const agentIds = [...new Set((members ?? []).map(m => m.agentId))]
    const owned = await prisma.agent.count({ where: { id: { in: agentIds }, createdBy: auth.id } })
    if (owned !== agentIds.length) {
      return NextResponse.json({ success: false, error: 'Algum agente não pertence a você' }, { status: 400 })
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        config: (config ?? {}) as object,
        createdBy: auth.id,
        members: {
          create: (members ?? []).map((m, i) => ({
            agentId: m.agentId,
            role: m.role,
            model: m.model ?? null,
            effort: m.effort ?? null,
            position: m.position ?? i,
          })),
        },
      },
      include: { members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create team'
    console.error('Error creating team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create `src/app/api/teams/[id]/route.ts`**

```typescript
// src/app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { validateRoster, type RosterInput } from '@/lib/orchestration/team/team-roster'

async function ownTeam(id: string, userId: string) {
  return prisma.team.findFirst({ where: { id, createdBy: userId } })
}

// GET /api/teams/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const team = await prisma.team.findFirst({
      where: { id, createdBy: auth.id },
      include: {
        members: { include: { agent: { select: { id: true, name: true } } }, orderBy: { position: 'asc' } },
        runs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch team'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// PATCH /api/teams/[id] — update name/description/config and optionally replace roster
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    if (!(await ownTeam(id, auth.id))) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })

    const body = await request.json()
    const { name, description, config, members } = body as {
      name?: string; description?: string; config?: Record<string, unknown>; members?: RosterInput[]
    }

    if (members !== undefined) {
      const rosterError = validateRoster(members)
      if (rosterError) return NextResponse.json({ success: false, error: rosterError }, { status: 400 })
      const agentIds = [...new Set(members.map(m => m.agentId))]
      const owned = await prisma.agent.count({ where: { id: { in: agentIds }, createdBy: auth.id } })
      if (owned !== agentIds.length) {
        return NextResponse.json({ success: false, error: 'Algum agente não pertence a você' }, { status: 400 })
      }
      await prisma.teamMember.deleteMany({ where: { teamId: id } })
      await prisma.teamMember.createMany({
        data: members.map((m, i) => ({
          teamId: id, agentId: m.agentId, role: m.role,
          model: m.model ?? null, effort: m.effort ?? null, position: m.position ?? i,
        })),
      })
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(config !== undefined ? { config: config as object } : {}),
      },
      include: { members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update team'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// DELETE /api/teams/[id] — archive
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    if (!(await ownTeam(id, auth.id))) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })

    await prisma.team.update({ where: { id }, data: { status: 'archived' } })
    return NextResponse.json({ success: true, data: { id, status: 'archived' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to archive team'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 7: Type-check the routes**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `src/app/api/teams/`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/orchestration/team/team-roster.ts src/__tests__/lib/team/team-roster.test.ts src/app/api/teams/route.ts src/app/api/teams/[id]/route.ts
git commit -m "feat(teams): roster validation + Team CRUD routes"
```

---

## Task 9: Run + run-detail + cancel routes

**Files:**
- Create: `src/app/api/teams/[id]/run/route.ts`
- Create: `src/app/api/teams/[id]/runs/[runId]/route.ts`

- [ ] **Step 1: Create `src/app/api/teams/[id]/run/route.ts`**

```typescript
// src/app/api/teams/[id]/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// Allow up to 5 minutes for the synchronous coordination loop.
export const maxDuration = 300

// POST /api/teams/[id]/run — create a run and execute it synchronously
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const team = await prisma.team.findFirst({
      where: { id, createdBy: auth.id },
      include: { members: true },
    })
    if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
      return NextResponse.json({ success: false, error: 'Roster inválido (precisa de Lead e Worker)' }, { status: 400 })
    }

    const body = await request.json()
    const mission = (body?.mission as string | undefined)?.trim()
    if (!mission) return NextResponse.json({ success: false, error: 'Missão é obrigatória' }, { status: 400 })

    const run = await prisma.teamRun.create({ data: { teamId: id, mission, status: 'pending' } })

    const { runTeam } = await import('@/lib/orchestration/team/team-coordinator')
    const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
    const { chatWithAgent } = await import('@/lib/ai/groq')

    try {
      await runTeam(run.id, {
        store: createPrismaTeamStore(),
        chat: (agentId, messages, ctx) => chatWithAgent(agentId, messages as never, ctx),
      })
    } catch (err) {
      // runTeam already persisted status='failed'; log and continue to return the run.
      console.error('[Teams] run failed:', err)
    }

    const finalRun = await prisma.teamRun.findUnique({
      where: { id: run.id },
      include: { tasks: { orderBy: { position: 'asc' } }, messages: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: finalRun })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to run team'
    console.error('Error running team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/teams/[id]/runs/[runId]/route.ts`**

```typescript
// src/app/api/teams/[id]/runs/[runId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

async function ownRun(teamId: string, runId: string, userId: string) {
  return prisma.teamRun.findFirst({ where: { id: runId, teamId, team: { createdBy: userId } } })
}

// GET /api/teams/[id]/runs/[runId] — board + messages + output
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params

    const run = await prisma.teamRun.findFirst({
      where: { id: runId, teamId: id, team: { createdBy: auth.id } },
      include: { tasks: { orderBy: { position: 'asc' } }, messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: run })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch run'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/runs/[runId] — cancel a running run
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params

    const run = await ownRun(id, runId, auth.id)
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })
    if (run.status !== 'running' && run.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Run não está em andamento' }, { status: 400 })
    }

    await prisma.teamRun.update({
      where: { id: runId },
      data: { status: 'cancelled', completedAt: new Date(), error: 'Cancelado pelo usuário' },
    })
    return NextResponse.json({ success: true, data: { id: runId, status: 'cancelled' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to cancel run'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `src/app/api/teams/`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/teams/[id]/run src/app/api/teams/[id]/runs
git commit -m "feat(teams): synchronous run + run-detail + cancel routes"
```

---

## Task 10: SSE stream route

**Files:**
- Create: `src/app/api/teams/[id]/runs/[runId]/stream/route.ts`

- [ ] **Step 1: Create the stream route**

```typescript
// src/app/api/teams/[id]/runs/[runId]/stream/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'rate_limited'])

// GET /api/teams/[id]/runs/[runId]/stream — SSE updates by polling the run record.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return new Response('Unauthorized', { status: 401 })
  const { id, runId } = await params

  const run = await prisma.teamRun.findFirst({ where: { id: runId, teamId: id, team: { createdBy: auth.id } } })
  if (!run) return new Response('Run not found', { status: 404 })

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let isClosed = false
  let lastTaskSig = ''
  let lastMsgCount = 0
  let lastStatus = ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          isClosed = true
          if (intervalId) { clearInterval(intervalId); intervalId = null }
        }
      }

      send('connected', { runId, timestamp: new Date().toISOString() })

      let pollErrors = 0
      intervalId = setInterval(async () => {
        if (isClosed) { if (intervalId) { clearInterval(intervalId); intervalId = null } return }
        try {
          const current = await prisma.teamRun.findUnique({
            where: { id: runId },
            include: { tasks: { orderBy: { position: 'asc' } }, messages: { orderBy: { createdAt: 'asc' } } },
          })
          if (!current) return
          pollErrors = 0

          // Task board changes (signature of id:status:retry)
          const sig = current.tasks.map(t => `${t.id}:${t.status}:${t.retryCount}`).join('|')
          if (sig !== lastTaskSig) {
            send('board', {
              tasks: current.tasks.map(t => ({
                id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId,
                retryCount: t.retryCount, reviewNote: t.reviewNote,
                resultPreview: (t.result ?? '').slice(0, 300),
              })),
            })
            lastTaskSig = sig
          }

          // New messages
          if (current.messages.length > lastMsgCount) {
            for (let i = lastMsgCount; i < current.messages.length; i++) {
              const m = current.messages[i]
              send('message', {
                id: m.id, fromMemberId: m.fromMemberId, toMemberId: m.toMemberId,
                kind: m.kind, summary: m.summary, content: m.content.slice(0, 500), taskId: m.taskId,
              })
            }
            lastMsgCount = current.messages.length
          }

          // Status / metrics
          send('status', {
            status: current.status, output: current.output, error: current.error,
            turnsUsed: current.turnsUsed, tokensUsed: current.tokensUsed,
            estimatedCost: current.estimatedCost, durationMs: current.durationMs,
          })

          if (current.status !== lastStatus && TERMINAL.has(current.status)) {
            send('done', { status: current.status, output: current.output })
            isClosed = true
            if (intervalId) { clearInterval(intervalId); intervalId = null }
            try { controller.close() } catch { /* already closed */ }
          }
          lastStatus = current.status
        } catch (err) {
          pollErrors++
          console.error('Error polling team run:', err)
          if (pollErrors >= 5) {
            send('error', { message: 'Too many polling errors, stopping stream' })
            isClosed = true
            if (intervalId) { clearInterval(intervalId); intervalId = null }
            try { controller.close() } catch { /* already closed */ }
          }
        }
      }, 1000)

      // Stop when the client disconnects.
      request.signal.addEventListener('abort', () => {
        isClosed = true
        if (intervalId) { clearInterval(intervalId); intervalId = null }
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      isClosed = true
      if (intervalId) { clearInterval(intervalId); intervalId = null }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in the stream route.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/teams/[id]/runs/[runId]/stream/route.ts
git commit -m "feat(teams): SSE stream for run board/messages/status"
```

---

## Task 11: UI — teams list + create page

**Files:**
- Create: `src/app/dashboard/teams/page.tsx`

> Confirm available shadcn primitives before writing: `ls src/components/ui`. The code below uses plain Tailwind + native elements to avoid depending on components that may not exist; swap in shadcn `Card`/`Button` if present.

- [ ] **Step 1: Create the list/create page (client component)**

```tsx
// src/app/dashboard/teams/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AgentLite { id: string; name: string }
interface TeamLite { id: string; name: string; description: string | null; _count: { runs: number } }
type Role = 'lead' | 'worker' | 'reviewer'
interface RosterRow { agentId: string; role: Role }

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamLite[]>([])
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [name, setName] = useState('')
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [tRes, aRes] = await Promise.all([fetch('/api/teams'), fetch('/api/agents')])
    const t = await tRes.json()
    const a = await aRes.json()
    if (t.success) setTeams(t.data)
    // /api/agents may return {data:[...]} or an array; normalize.
    const agentList: AgentLite[] = Array.isArray(a) ? a : a.data ?? []
    setAgents(agentList)
  }

  useEffect(() => { load() }, [])

  function toggleAgent(agentId: string) {
    setRoster(prev =>
      prev.some(r => r.agentId === agentId)
        ? prev.filter(r => r.agentId !== agentId)
        : [...prev, { agentId, role: prev.length === 0 ? 'lead' : 'worker' }],
    )
  }
  function setRole(agentId: string, role: Role) {
    setRoster(prev => prev.map(r => (r.agentId === agentId ? { ...r, role } : r)))
  }

  async function createTeam() {
    setError(null); setSaving(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, members: roster }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error); return }
      setName(''); setRoster([])
      await load()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Times</h1>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Novo time</h2>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Nome do time"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Selecione agentes e atribua papéis (1 Lead, ≥1 Worker, Reviewer opcional):</p>
          {agents.map(a => {
            const row = roster.find(r => r.agentId === a.id)
            return (
              <div key={a.id} className="flex items-center gap-3">
                <label className="flex items-center gap-2 flex-1">
                  <input type="checkbox" checked={!!row} onChange={() => toggleAgent(a.id)} />
                  {a.name}
                </label>
                {row && (
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={row.role}
                    onChange={e => setRole(a.id, e.target.value as Role)}
                  >
                    <option value="lead">Lead</option>
                    <option value="worker">Worker</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                )}
              </div>
            )
          })}
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          disabled={saving || !name.trim() || roster.length === 0}
          onClick={createTeam}
        >
          {saving ? 'Criando…' : 'Criar time'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Seus times</h2>
        {teams.length === 0 && <p className="text-gray-500 text-sm">Nenhum time ainda.</p>}
        {teams.map(t => (
          <Link key={t.id} href={`/dashboard/teams/${t.id}`} className="block border rounded-lg p-4 hover:bg-gray-50">
            <div className="font-medium">{t.name}</div>
            <div className="text-sm text-gray-500">{t._count.runs} runs</div>
          </Link>
        ))}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify the agents endpoint shape**

Run: `npx jest --listTests >/dev/null 2>&1; grep -rn "NextResponse.json" src/app/api/agents/route.ts | head`
Expected: confirm whether `/api/agents` GET returns `{ success, data }` or a bare array. If it returns `{ data }`, the normalization in Step 1 already handles both. If the path differs, adjust the `fetch('/api/agents')` URL accordingly.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `src/app/dashboard/teams/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/teams/page.tsx
git commit -m "feat(teams): teams list + create UI"
```

---

## Task 12: UI — team detail + run view (SSE)

**Files:**
- Create: `src/app/dashboard/teams/[id]/page.tsx` (server component)
- Create: `src/app/dashboard/teams/[id]/TeamRunView.tsx` (client component)

- [ ] **Step 1: Create the server page**

```tsx
// src/app/dashboard/teams/[id]/page.tsx
import TeamRunView from './TeamRunView'

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeamRunView teamId={id} />
}
```

- [ ] **Step 2: Create the client run view**

```tsx
// src/app/dashboard/teams/[id]/TeamRunView.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface Member { id: string; role: string; agent: { id: string; name: string } }
interface Team { id: string; name: string; members: Member[] }
interface BoardTask { id: string; title: string; status: string; assigneeId: string | null; retryCount: number; reviewNote: string | null; resultPreview: string }
interface Msg { id: string; fromMemberId: string | null; toMemberId: string | null; kind: string; summary: string | null; content: string }

const COLUMNS: { key: string; label: string }[] = [
  { key: 'todo', label: 'A fazer' },
  { key: 'doing', label: 'Fazendo' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Concluído' },
]

export default function TeamRunView({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [mission, setMission] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [status, setStatus] = useState<string>('')
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetch(`/api/teams/${teamId}`).then(r => r.json()).then(j => { if (j.success) setTeam(j.data) })
    return () => { esRef.current?.close() }
  }, [teamId])

  function nameFor(memberId: string | null): string {
    if (!memberId) return '—'
    return team?.members.find(m => m.id === memberId)?.agent.name ?? '?'
  }

  function openStream(rid: string) {
    esRef.current?.close()
    const es = new EventSource(`/api/teams/${teamId}/runs/${rid}/stream`)
    esRef.current = es
    es.addEventListener('board', e => setTasks(JSON.parse((e as MessageEvent).data).tasks))
    es.addEventListener('message', e => setMessages(prev => [...prev, JSON.parse((e as MessageEvent).data)]))
    es.addEventListener('status', e => {
      const d = JSON.parse((e as MessageEvent).data)
      setStatus(d.status); setOutput(d.output)
    })
    es.addEventListener('done', () => { es.close(); setRunning(false) })
    es.addEventListener('error', () => { es.close(); setRunning(false) })
  }

  async function startRun() {
    if (!mission.trim()) return
    setRunning(true); setTasks([]); setMessages([]); setOutput(null); setStatus('pending')
    // The POST runs synchronously; open the stream first so we capture progress.
    const pending = fetch(`/api/teams/${teamId}/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission }),
    })
    // We don't yet have the runId until POST returns; poll the latest run via the response.
    const res = await pending
    const json = await res.json()
    if (json.success && json.data) {
      setRunId(json.data.id)
      setTasks((json.data.tasks ?? []).map((t: { id: string; title: string; status: string; assigneeId: string | null; retryCount: number; reviewNote: string | null; result: string | null }) => ({
        id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId,
        retryCount: t.retryCount, reviewNote: t.reviewNote, resultPreview: (t.result ?? '').slice(0, 300),
      })))
      setMessages((json.data.messages ?? []).map((m: Msg) => m))
      setStatus(json.data.status)
      setOutput(json.data.output ?? null)
    }
    setRunning(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{team?.name ?? 'Time'}</h1>
      <div className="text-sm text-gray-500">
        {team?.members.map(m => `${m.agent.name} (${m.role})`).join(' · ')}
      </div>

      <section className="space-y-2">
        <textarea
          className="border rounded w-full px-3 py-2"
          rows={3}
          placeholder="Descreva a missão do time…"
          value={mission}
          onChange={e => setMission(e.target.value)}
        />
        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          disabled={running || !mission.trim()}
          onClick={startRun}
        >
          {running ? 'Executando…' : 'Disparar missão'}
        </button>
        {status && <span className="ml-3 text-sm text-gray-600">Status: {status}</span>}
      </section>

      <section className="grid grid-cols-4 gap-3">
        {COLUMNS.map(col => (
          <div key={col.key} className="border rounded-lg p-2 min-h-[120px]">
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2">{col.label}</div>
            {tasks.filter(t => t.status === col.key).map(t => (
              <div key={t.id} className="border rounded p-2 mb-2 text-sm bg-white">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-gray-500">{nameFor(t.assigneeId)}{t.retryCount > 0 ? ` · retry ${t.retryCount}` : ''}</div>
                {t.reviewNote && <div className="text-xs text-amber-600 mt-1">↩ {t.reviewNote}</div>}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Mensagens</h2>
        <div className="space-y-1 max-h-64 overflow-auto text-sm">
          {messages.map(m => (
            <div key={m.id} className="border-b py-1">
              <span className="text-gray-500">{nameFor(m.fromMemberId)} → {nameFor(m.toMemberId)} [{m.kind}]: </span>
              {m.summary ?? m.content}
            </div>
          ))}
        </div>
      </section>

      {output && (
        <section>
          <h2 className="font-semibold mb-2">Entrega final</h2>
          <pre className="whitespace-pre-wrap border rounded p-3 text-sm bg-gray-50">{output}</pre>
        </section>
      )}
    </div>
  )
}
```

> **Note on SSE vs synchronous POST:** because `/run` blocks until the loop finishes, the live `openStream` path is most useful once the run is moved to a queue (sub-project C). For sub-project A, the POST returns the full final board, which this component renders directly. `openStream`/`runId` are wired and ready for when runs become asynchronous; they are intentionally not on the critical path now. This is acceptable for the "minimal verification UI" scope.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `src/app/dashboard/teams/[id]/`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/teams/[id]/page.tsx src/app/dashboard/teams/[id]/TeamRunView.tsx
git commit -m "feat(teams): team detail + run board UI"
```

---

## Task 13: Full verification + final commit

**Files:** none (verification only)

- [ ] **Step 1: Run the full team test suite**

Run: `npx jest src/__tests__/lib/team`
Expected: PASS — protocol, board, prompts, roster, coordinator.

- [ ] **Step 2: Run the entire unit test suite (no regressions)**

Run: `npm test`
Expected: PASS, or only pre-existing unrelated failures (note any in the commit body).

- [ ] **Step 3: Type-check the whole project**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 4: Production build**

Run: `npx prisma generate && npm run build`
Expected: build succeeds; `/dashboard/teams` and the `/api/teams/*` routes appear in the route list.

- [ ] **Step 5: Lint the new files**

Run: `npx eslint src/lib/orchestration/team src/app/api/teams "src/app/dashboard/teams/**/*.tsx"`
Expected: no errors (fix warnings as needed).

- [ ] **Step 6: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore(teams): verification pass (tests, types, build, lint)"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- §3 schema → Task 1 (all 5 models + back-relations). ✓
- §4 engine (coordinator, chatWithAgent primitive, loop, guard-rails, rate-limit, cancel) → Tasks 6–7. ✓
- §4.3 assignee resolution → Task 4 (`resolveAssignee`). ✓
- §5 directive protocol → Task 3. ✓
- §6 prompts → Task 5. ✓
- §7 routes (CRUD + run + runs + stream + cancel) → Tasks 8–10. ✓
- §8 minimal UI → Tasks 11–12. ✓
- §9 tests (protocol, prompts, board, roster, coordinator integration) → Tasks 3,4,5,7,8. ✓
- §10 deliverables checklist → covered across tasks + Task 13. ✓
- §12 acceptance criteria → exercised by Task 7 tests (transitions, reject/retry, consolidation, metrics) + Task 13 build. ✓

**2. Placeholder scan:** No TBD/TODO. Every code step contains complete code.

**3. Type consistency:** `TeamStore` method names match between `team-store.ts` (Task 6), the in-memory double (Task 7 step 1), and the coordinator (Task 7 step 4): `loadRun/getRunStatus/setRunRunning/finishRun/listTasks/createTask/updateTask/listMessages/addMessage`. `ChatFn`/`ChatResult` shape (`{ message, model, usage?.total_tokens }`) is consistent across types, coordinator, tests, and the `/run` route's `chatWithAgent` adapter. `LeadAction`/`ReviewVerdict` shapes match between protocol parser and coordinator usage. `validateRoster` signature matches its test and both routes.

**Known intentional limitation:** with synchronous `/run`, the SSE stream is wired but not on the critical path for A (POST returns the final board). Documented inline in Task 12. Becomes live when runs go async (sub-project C).
