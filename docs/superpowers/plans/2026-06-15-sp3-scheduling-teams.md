# SP3 — Scheduling/cron → Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow scheduling recurring Team runs ("run this mission every Monday 8am"), re-homing the Orchestrations scheduling capability onto Teams.

**Architecture:** A new clean `ScheduledTeamRun` model points at `Team`. A pure `schedule.ts` module holds cron logic (preset→cron + next-run). A shared `startTeamRun()` helper (extracted from the run route, reused by SP4) creates the `TeamRun` and dispatches it via `after()` (chat) / BullMQ (code). A new cron endpoint scans due schedules and calls the helper. The coordinator (`runTeam`) stays INTACT — the cron is just another caller. Legacy `ScheduledExecution`/`run-scheduled` are untouched (die in SP6).

**Tech Stack:** Next.js 16 (App Router, `after()`), Prisma 7 (Postgres), BullMQ (code-runs), tsx + node:assert (pure-logic tests).

**Environment constraints (this machine — OneDrive corrupts node_modules):** do NOT run `npm install`, `prisma generate`, `jest`, or `next build` locally. Pure-logic gate = `npx tsx scripts/sp3-verify.ts`. Border gate = `npx tsc --noEmit` (accept only pre-existing errors from uninstalled modules / stale Prisma client — new schema fields appear/disappear in the EasyPanel build). Real gate = deploy on EasyPanel + E2E with the user. Schema migration MUST be a formal migration file applied MANUALLY to the real prod host (see Task 7) — the Dockerfile `db push` does NOT run on the standalone runner (SP2 lesson).

**Spec:** `docs/superpowers/specs/2026-06-15-sp3-scheduling-teams-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/orchestration/team/schedule.ts` | Pure cron logic: `cronFromPreset`, `getNextRunAt`, `isDue`, `SchedulePreset` type | Create |
| `scripts/sp3-verify.ts` | tsx verification of the pure module | Create |
| `prisma/schema.prisma` | `ScheduledTeamRun` model + back-relations on `Team`/`User` | Modify |
| `prisma/migrations/20260615130000_add_scheduled_team_runs/migration.sql` | Formal additive migration | Create |
| `src/lib/orchestration/team/start-team-run.ts` | Shared `startTeamRun()` trigger + `TeamRunError` | Create |
| `src/app/api/teams/[id]/run/route.ts` | Refactor to call `startTeamRun()` (no behavior change) | Modify |
| `src/app/api/cron/run-scheduled-teams/route.ts` | Cron: scan due schedules → dispatch → advance `nextRunAt` | Create |
| `src/app/api/teams/[id]/schedules/route.ts` | GET list / POST create | Create |
| `src/app/api/teams/[id]/schedules/[scheduleId]/route.ts` | PATCH toggle/edit / DELETE | Create |
| `src/app/dashboard/teams/[id]/TeamSchedulesPanel.tsx` | UI panel in the team room | Create |
| `src/app/dashboard/teams/[id]/TeamRunView.tsx` | Mount the panel | Modify |

---

## Task 1: Pure scheduling module + verification script

**Files:**
- Create: `src/lib/orchestration/team/schedule.ts`
- Create (test): `scripts/sp3-verify.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/sp3-verify.ts`:

```typescript
// Pure-logic verification for SP3 scheduling. Run: npx tsx scripts/sp3-verify.ts
// Imports are RELATIVE so tsx can load the module without path aliases.
import assert from 'node:assert'
import { cronFromPreset, getNextRunAt, isDue } from '../src/lib/orchestration/team/schedule'

// cronFromPreset — friendly preset → 5-field cron "m h dom * dow"
assert.equal(cronFromPreset({ frequency: 'daily', hour: 8, minute: 0 }), '0 8 * * *')
assert.equal(cronFromPreset({ frequency: 'weekly', hour: 8, minute: 30, dayOfWeek: 1 }), '30 8 * * 1')
assert.equal(cronFromPreset({ frequency: 'monthly', hour: 9, minute: 0, dayOfMonth: 15 }), '0 9 15 * *')
// clamp out-of-range values
assert.equal(cronFromPreset({ frequency: 'daily', hour: 99, minute: -5 }), '0 23 * * *')

// getNextRunAt — daily, time already passed today → tomorrow
{
  const next = getNextRunAt('0 8 * * *', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getDate(), 16)
  assert.equal(next.getHours(), 8)
  assert.equal(next.getMinutes(), 0)
}
// getNextRunAt — daily, time still ahead today → today
{
  const next = getNextRunAt('0 8 * * *', new Date('2026-06-15T06:00:00'))
  assert.equal(next.getDate(), 15)
  assert.equal(next.getHours(), 8)
}
// weekly — 2026-06-15 is Monday(1); target Wed(3) → +2 days = the 17th
{
  const next = getNextRunAt('0 8 * * 3', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getDay(), 3)
  assert.equal(next.getDate(), 17)
}
// weekly — target day == today (Mon) but time passed → +7 = the 22nd
{
  const next = getNextRunAt('0 8 * * 1', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getDay(), 1)
  assert.equal(next.getDate(), 22)
}
// monthly — day-of-month already passed → next month
{
  const next = getNextRunAt('0 8 10 * *', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getMonth(), 6) // July (0-indexed)
  assert.equal(next.getDate(), 10)
}
// malformed expression → next round hour
{
  const next = getNextRunAt('garbage', new Date('2026-06-15T10:30:00'))
  assert.equal(next.getHours(), 11)
  assert.equal(next.getMinutes(), 0)
}
// isDue
assert.equal(isDue(new Date('2026-06-15T09:00:00'), new Date('2026-06-15T10:00:00')), true)
assert.equal(isDue(new Date('2026-06-15T11:00:00'), new Date('2026-06-15T10:00:00')), false)

console.log('✅ SP3 schedule.ts checks passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/sp3-verify.ts`
Expected: FAIL — `Cannot find module '../src/lib/orchestration/team/schedule'` (module not created yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/orchestration/team/schedule.ts`:

```typescript
// Pure scheduling logic for SP3 (Scheduling/cron → Teams). No DB imports — tsx-testable.
// Consolidates the getNextRunAt logic previously DUPLICATED in
// src/app/api/cron/run-scheduled/route.ts and
// src/app/api/dashboard/scheduled-executions/route.ts (both legacy, untouched here).

export type SchedulePreset =
  | { frequency: 'daily'; hour: number; minute: number }
  | { frequency: 'weekly'; hour: number; minute: number; dayOfWeek: number } // 0=Sun..6=Sat
  | { frequency: 'monthly'; hour: number; minute: number; dayOfMonth: number } // 1..31

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, Math.trunc(n)))
}

/** Build a 5-field cron expression "m h dom * dow" from a friendly preset. */
export function cronFromPreset(p: SchedulePreset): string {
  const m = clamp(p.minute, 0, 59)
  const h = clamp(p.hour, 0, 23)
  if (p.frequency === 'weekly') {
    return `${m} ${h} * * ${clamp(p.dayOfWeek, 0, 6)}`
  }
  if (p.frequency === 'monthly') {
    return `${m} ${h} ${clamp(p.dayOfMonth, 1, 31)} * *`
  }
  return `${m} ${h} * * *`
}

/**
 * Next run time for a simple 5-field cron ("min hour dayOfMonth month dayOfWeek").
 * Covers the subset our presets generate (daily / weekly-by-dow / monthly-by-dom).
 * Always returns a Date strictly after `from`. Malformed expressions fall back to
 * the next round hour.
 */
export function getNextRunAt(cronExpr: string, from: Date = new Date()): Date {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) {
    const next = new Date(from)
    next.setHours(next.getHours() + 1, 0, 0, 0)
    return next
  }

  const [min, hour, dayOfMonth, , dayOfWeek] = parts
  const next = new Date(from)
  const targetMin = min === '*' ? 0 : parseInt(min, 10)
  const targetHour = hour === '*' ? from.getHours() : parseInt(hour, 10)
  next.setHours(targetHour, targetMin, 0, 0)

  if (dayOfWeek !== '*') {
    const targetDay = parseInt(dayOfWeek, 10) % 7
    const currentDay = from.getDay()
    let daysUntil = (targetDay - currentDay + 7) % 7
    if (daysUntil === 0 && next <= from) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
  } else if (dayOfMonth !== '*') {
    const targetDom = parseInt(dayOfMonth, 10)
    next.setDate(targetDom)
    if (next <= from) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(targetDom)
    }
  } else if (next <= from) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

/** A schedule is due when its nextRunAt is at or before now. */
export function isDue(nextRunAt: Date, now: Date = new Date()): boolean {
  return nextRunAt.getTime() <= now.getTime()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/sp3-verify.ts`
Expected: PASS — prints `✅ SP3 schedule.ts checks passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/orchestration/team/schedule.ts scripts/sp3-verify.ts
git commit -m "feat(sp3): pure schedule module (cronFromPreset/getNextRunAt/isDue) + verify"
```

---

## Task 2: ScheduledTeamRun model + formal migration

**Files:**
- Modify: `prisma/schema.prisma` (add model after `ScheduledExecution` at line ~961; add back-relations on `Team` and `User`)
- Create: `prisma/migrations/20260615130000_add_scheduled_team_runs/migration.sql`

- [ ] **Step 1: Add the model to schema.prisma**

After the `ScheduledExecution` model closing brace (`@@map("scheduled_executions")` block, line ~961), insert:

```prisma
// ─────────────────────────────────────────────────────────
// ScheduledTeamRun — SP3: agendamento de runs de Team (sucessor de ScheduledExecution)
// ─────────────────────────────────────────────────────────
model ScheduledTeamRun {
  id         String    @id @default(uuid()) @db.Uuid
  teamId     String    @map("team_id") @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  cronExpr   String    @map("cron_expr") @db.VarChar(100)   // gerado do preset, ex. "0 8 * * 1"
  label      String?   @db.VarChar(255)
  mission    String    @db.Text                              // o que o Team run consome
  mode       String    @default("chat") @db.VarChar(20)      // 'chat' | 'code'
  nextRunAt  DateTime  @map("next_run_at") @db.Timestamptz()
  lastRunAt  DateTime? @map("last_run_at") @db.Timestamptz()
  lastStatus String?   @map("last_status") @db.VarChar(20)   // 'dispatched' | 'failed' (disparo, não resultado)
  lastRunId  String?   @map("last_run_id") @db.Uuid          // ponteiro p/ o TeamRun gerado (não-FK)
  isActive   Boolean   @default(true) @map("is_active")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt  DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@index([userId])
  @@index([isActive])
  @@index([nextRunAt])
  @@map("scheduled_team_runs")
}
```

- [ ] **Step 2: Add back-relations**

In `model Team` (line ~1311), inside the relations block (next to `runs TeamRun[]`), add:

```prisma
  scheduledTeamRuns ScheduledTeamRun[]
```

In `model User` (line ~10), in its relations list, add:

```prisma
  scheduledTeamRuns ScheduledTeamRun[]
```

- [ ] **Step 3: Create the formal migration file**

Create `prisma/migrations/20260615130000_add_scheduled_team_runs/migration.sql`:

```sql
-- SP3: schedule recurring Team runs (Scheduling/cron → Teams).
-- Additive, new table — no data migration, no backfill.

-- CreateTable
CREATE TABLE "scheduled_team_runs" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cron_expr" VARCHAR(100) NOT NULL,
    "label" VARCHAR(255),
    "mission" TEXT NOT NULL,
    "mode" VARCHAR(20) NOT NULL DEFAULT 'chat',
    "next_run_at" TIMESTAMPTZ NOT NULL,
    "last_run_at" TIMESTAMPTZ,
    "last_status" VARCHAR(20),
    "last_run_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_team_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_team_runs_team_id_idx" ON "scheduled_team_runs"("team_id");
CREATE INDEX "scheduled_team_runs_user_id_idx" ON "scheduled_team_runs"("user_id");
CREATE INDEX "scheduled_team_runs_is_active_idx" ON "scheduled_team_runs"("is_active");
CREATE INDEX "scheduled_team_runs_next_run_at_idx" ON "scheduled_team_runs"("next_run_at");

-- AddForeignKey
ALTER TABLE "scheduled_team_runs" ADD CONSTRAINT "scheduled_team_runs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_team_runs" ADD CONSTRAINT "scheduled_team_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Verify schema is internally consistent**

Run: `npx tsc --noEmit`
Expected: no NEW errors referencing `scheduledTeamRun` beyond the known "Prisma client stale" pattern (the model isn't in the generated client locally; this resolves in the EasyPanel build where `prisma generate` runs). Do NOT run `prisma generate` locally.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma "prisma/migrations/20260615130000_add_scheduled_team_runs/migration.sql"
git commit -m "feat(sp3): ScheduledTeamRun model + formal migration"
```

> Migration is APPLIED to the real prod DB in Task 7, manually — never trust the Dockerfile `db push`.

---

## Task 3: Shared `startTeamRun()` helper + refactor run route

**Files:**
- Create: `src/lib/orchestration/team/start-team-run.ts`
- Modify: `src/app/api/teams/[id]/run/route.ts` (replace inline dispatch with the helper)

This is a faithful extraction — the run route's external behavior (status codes, body shape) must NOT change.

- [ ] **Step 1: Create the helper**

Create `src/lib/orchestration/team/start-team-run.ts`:

```typescript
// Shared "start a Team run" trigger. Extracted from POST /api/teams/[id]/run so the
// run route (session), the SP3 cron, and the SP4 API-key route all dispatch identically.
// The coordinator (runTeam) stays INTACT — this is just a caller.
// after() is valid inside any request handler (run route OR cron GET).
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'

export type TeamRunMode = 'chat' | 'code'

export type StartTeamRunInput = {
  mission: string
  mode: TeamRunMode
  userId: string
  repoUrl?: string | null
  base?: string | null
}

export type StartTeamRunResult = { runId: string; mode: TeamRunMode }

export type TeamRunErrorCode = 'not_found' | 'invalid_roster' | 'missing_mission' | 'queue_unavailable'

export class TeamRunError extends Error {
  code: TeamRunErrorCode
  constructor(code: TeamRunErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'TeamRunError'
  }
}

export async function startTeamRun(teamId: string, input: StartTeamRunInput): Promise<StartTeamRunResult> {
  const mission = input.mission?.trim()
  if (!mission) throw new TeamRunError('missing_mission', 'Missão é obrigatória')
  const mode: TeamRunMode = input.mode === 'code' ? 'code' : 'chat'

  const team = await prisma.team.findFirst({
    where: { id: teamId, createdBy: input.userId },
    include: { members: true },
  })
  if (!team) throw new TeamRunError('not_found', 'Team not found')
  if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
    throw new TeamRunError('invalid_roster', 'Roster inválido (precisa de Lead e Worker)')
  }

  // Repo binding (code-runs only): hybrid resolution — request override, then Team.config.
  // The git token is NEVER stored here; it lives only in the worker env.
  let repoUrl: string | null = null
  let baseBranch: string | null = null
  if (mode === 'code') {
    const cfg = (team.config && typeof team.config === 'object' ? team.config : {}) as Record<string, unknown>
    const pick = (...vals: unknown[]) => vals.map(v => (typeof v === 'string' ? v.trim() : '')).find(Boolean) ?? ''
    repoUrl = pick(input.repoUrl, cfg.repoUrl) || null
    if (repoUrl) baseBranch = pick(input.base, cfg.defaultBranch) || 'main'
  }

  const run = await prisma.teamRun.create({
    data: { teamId, mission, status: 'pending', mode, repoUrl, baseBranch },
  })

  if (mode === 'code') {
    // Code-runs go through a DURABLE queue consumed by a separate worker service.
    try {
      const { enqueueCodeRun } = await import('@/lib/queue/code-run-queue')
      await enqueueCodeRun(run.id)
    } catch (err) {
      await prisma.teamRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: 'Fila indisponível (REDIS_URL não configurada?)' },
      })
      console.error('[Teams] enqueue code-run failed:', err)
      throw new TeamRunError('queue_unavailable', 'Fila de code-runs indisponível')
    }
  } else {
    // Chat-runs: run the coordinator AFTER the response is flushed.
    after(async () => {
      try {
        const { runTeam } = await import('@/lib/orchestration/team/team-coordinator')
        const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
        const { chatWithAgent } = await import('@/lib/ai/groq')
        await runTeam(run.id, {
          store: createPrismaTeamStore(),
          chat: (agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, opts),
        })
        const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
        await dispatchTeamOutputs(run.id)
      } catch (err) {
        console.error('[Teams] background run failed:', err)
      }
    })
  }

  return { runId: run.id, mode }
}
```

- [ ] **Step 2: Refactor the run route to use the helper**

Replace the ENTIRE contents of `src/app/api/teams/[id]/run/route.ts` with:

```typescript
// src/app/api/teams/[id]/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'

// The coordination loop runs in the background (after the response is flushed).
export const maxDuration = 300

const STATUS_BY_CODE: Record<string, number> = {
  not_found: 404,
  invalid_roster: 400,
  missing_mission: 400,
  queue_unavailable: 503,
}

// POST /api/teams/[id]/run — create a run and execute it in the background.
// Returns { runId } immediately; clients follow progress via the SSE stream.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const result = await startTeamRun(id, {
      mission: body?.mission,
      mode: body?.mode === 'code' ? 'code' : 'chat',
      userId: auth.id,
      repoUrl: body?.repoUrl,
      base: body?.base,
    })

    return NextResponse.json(
      { success: true, data: { runId: result.runId, status: 'pending', mode: result.mode } },
      { status: 202 },
    )
  } catch (error: unknown) {
    if (error instanceof TeamRunError) {
      return NextResponse.json({ success: false, error: error.message }, { status: STATUS_BY_CODE[error.code] ?? 400 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to run team'
    console.error('Error running team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no NEW errors from these two files (pre-existing `bullmq`/`@xterm`/stale-client errors may remain — they are baseline).

- [ ] **Step 4: Commit**

```bash
git add src/lib/orchestration/team/start-team-run.ts "src/app/api/teams/[id]/run/route.ts"
git commit -m "refactor(sp3): extract startTeamRun() helper; run route calls it (no behavior change)"
```

---

## Task 4: Cron endpoint `/api/cron/run-scheduled-teams`

**Files:**
- Create: `src/app/api/cron/run-scheduled-teams/route.ts`

- [ ] **Step 1: Create the cron route**

Create `src/app/api/cron/run-scheduled-teams/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startTeamRun } from '@/lib/orchestration/team/start-team-run'
import { getNextRunAt } from '@/lib/orchestration/team/schedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET || 'sofia-cron-secret-2026'

/**
 * GET /api/cron/run-scheduled-teams
 * Hit by cron-job.org. Protected by Authorization: Bearer {CRON_SECRET}.
 * Finds due ScheduledTeamRun rows, dispatches each via startTeamRun(), and advances nextRunAt.
 * lastStatus reflects DISPATCH ('dispatched'|'failed'), not the run's final outcome —
 * follow lastRunId to the TeamRun for the real status.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[cron/run-scheduled-teams] Unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Array<{ scheduleId: string; status: string; runId?: string; error?: string }> = []

  try {
    const due = await prisma.scheduledTeamRun.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
      take: 50,
    })
    console.log(`[cron/run-scheduled-teams] Found ${due.length} due at ${now.toISOString()}`)

    for (const s of due) {
      const nextRunAt = getNextRunAt(s.cronExpr, now)
      try {
        const { runId } = await startTeamRun(s.teamId, {
          mission: s.mission,
          mode: s.mode === 'code' ? 'code' : 'chat',
          userId: s.userId,
        })
        await prisma.scheduledTeamRun.update({
          where: { id: s.id },
          data: { lastRunAt: now, lastStatus: 'dispatched', lastRunId: runId, nextRunAt },
        })
        results.push({ scheduleId: s.id, status: 'dispatched', runId })
        console.log(`[cron/run-scheduled-teams] ${s.id} dispatched run ${runId}. Next: ${nextRunAt.toISOString()}`)
      } catch (err: any) {
        await prisma.scheduledTeamRun.update({
          where: { id: s.id },
          data: { lastRunAt: now, lastStatus: 'failed', nextRunAt },
        }).catch(() => {})
        results.push({ scheduleId: s.id, status: 'failed', error: err?.message })
        console.error(`[cron/run-scheduled-teams] ${s.id} failed:`, err)
      }
    }

    return NextResponse.json({ processed: due.length, results, timestamp: now.toISOString() })
  } catch (error: any) {
    console.error('[cron/run-scheduled-teams] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no NEW errors (the `prisma.scheduledTeamRun` access is the known stale-client pattern, resolves in the EasyPanel build).

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/cron/run-scheduled-teams/route.ts"
git commit -m "feat(sp3): cron endpoint run-scheduled-teams (dispatch due schedules via startTeamRun)"
```

---

## Task 5: Schedules CRUD API

**Files:**
- Create: `src/app/api/teams/[id]/schedules/route.ts`
- Create: `src/app/api/teams/[id]/schedules/[scheduleId]/route.ts`

- [ ] **Step 1: Create the collection route (GET list / POST create)**

Create `src/app/api/teams/[id]/schedules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { cronFromPreset, getNextRunAt, type SchedulePreset } from '@/lib/orchestration/team/schedule'

export const dynamic = 'force-dynamic'

async function ownedTeam(teamId: string, userId: string) {
  return prisma.team.findFirst({ where: { id: teamId, createdBy: userId }, include: { members: true } })
}

// GET /api/teams/[id]/schedules — list the team's schedules.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const team = await ownedTeam(id, auth.id)
  if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })

  const schedules = await prisma.scheduledTeamRun.findMany({
    where: { teamId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ success: true, data: schedules })
}

// POST /api/teams/[id]/schedules — create a schedule.
// Body: { preset: SchedulePreset, mission: string, mode?: 'chat'|'code', label?: string }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const team = await ownedTeam(id, auth.id)
  if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
  if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
    return NextResponse.json({ success: false, error: 'Roster inválido (precisa de Lead e Worker)' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const preset = body?.preset as SchedulePreset | undefined
  const mission = (body?.mission as string | undefined)?.trim()
  const mode = body?.mode === 'code' ? 'code' : 'chat'
  const label = (body?.label as string | undefined)?.trim() || null

  if (!preset || !preset.frequency) {
    return NextResponse.json({ success: false, error: 'preset é obrigatório' }, { status: 400 })
  }
  if (!mission) {
    return NextResponse.json({ success: false, error: 'mission é obrigatória' }, { status: 400 })
  }

  const cronExpr = cronFromPreset(preset)
  const nextRunAt = getNextRunAt(cronExpr)

  const schedule = await prisma.scheduledTeamRun.create({
    data: { teamId: id, userId: auth.id, cronExpr, label, mission, mode, nextRunAt, isActive: true },
  })
  return NextResponse.json({ success: true, data: schedule }, { status: 201 })
}
```

- [ ] **Step 2: Create the item route (PATCH / DELETE)**

Create `src/app/api/teams/[id]/schedules/[scheduleId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { cronFromPreset, getNextRunAt, type SchedulePreset } from '@/lib/orchestration/team/schedule'

export const dynamic = 'force-dynamic'

// Returns the schedule only if the parent team belongs to the user.
async function ownedSchedule(teamId: string, scheduleId: string, userId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, createdBy: userId } })
  if (!team) return null
  return prisma.scheduledTeamRun.findFirst({ where: { id: scheduleId, teamId } })
}

// PATCH /api/teams/[id]/schedules/[scheduleId] — toggle isActive and/or edit fields.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, scheduleId } = await params
  const existing = await ownedSchedule(id, scheduleId, auth.id)
  if (!existing) return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body?.isActive === 'boolean') data.isActive = body.isActive
  if (typeof body?.label === 'string') data.label = body.label.trim() || null
  if (typeof body?.mission === 'string' && body.mission.trim()) data.mission = body.mission.trim()
  if (body?.mode === 'chat' || body?.mode === 'code') data.mode = body.mode
  if (body?.preset && (body.preset as SchedulePreset).frequency) {
    const cronExpr = cronFromPreset(body.preset as SchedulePreset)
    data.cronExpr = cronExpr
    data.nextRunAt = getNextRunAt(cronExpr)
  }

  const updated = await prisma.scheduledTeamRun.update({ where: { id: scheduleId }, data })
  return NextResponse.json({ success: true, data: updated })
}

// DELETE /api/teams/[id]/schedules/[scheduleId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, scheduleId } = await params
  const existing = await ownedSchedule(id, scheduleId, auth.id)
  if (!existing) return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 })

  await prisma.scheduledTeamRun.delete({ where: { id: scheduleId } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no NEW errors beyond the stale-client baseline.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/teams/[id]/schedules/route.ts" "src/app/api/teams/[id]/schedules/[scheduleId]/route.ts"
git commit -m "feat(sp3): schedules CRUD API (list/create/toggle/edit/delete) for a team"
```

---

## Task 6: UI — TeamSchedulesPanel + mount

**Files:**
- Create: `src/app/dashboard/teams/[id]/TeamSchedulesPanel.tsx`
- Modify: `src/app/dashboard/teams/[id]/TeamRunView.tsx` (import + mount after the outputs panel)

- [ ] **Step 1: Create the panel component**

Create `src/app/dashboard/teams/[id]/TeamSchedulesPanel.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Frequency = 'daily' | 'weekly' | 'monthly'

type Schedule = {
  id: string
  cronExpr: string
  label: string | null
  mission: string
  mode: 'chat' | 'code'
  nextRunAt: string
  lastRunAt: string | null
  lastStatus: string | null
  lastRunId: string | null
  isActive: boolean
}

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Friendly label derived from the stored cronExpr (no extra DB column).
function describe(cronExpr: string): string {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return cronExpr
  const [min, hour, dom, , dow] = parts
  const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  if (dow !== '*') return `Toda ${DOW[parseInt(dow, 10) % 7]} às ${time}`
  if (dom !== '*') return `Todo dia ${dom} às ${time}`
  return `Todo dia às ${time}`
}

export function TeamSchedulesPanel({ teamId }: { teamId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [saving, setSaving] = useState(false)
  // form state
  const [mission, setMission] = useState('')
  const [label, setLabel] = useState('')
  const [mode, setMode] = useState<'chat' | 'code'>('chat')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayOfMonth, setDayOfMonth] = useState(1)

  async function load() {
    try {
      const r = await fetch(`/api/teams/${teamId}/schedules`)
      const j = await r.json()
      if (j.success) setSchedules(j.data)
    } catch {
      /* ignore — panel is best-effort */
    }
  }
  useEffect(() => { load() }, [teamId])

  function buildPreset() {
    if (frequency === 'weekly') return { frequency, hour, minute, dayOfWeek }
    if (frequency === 'monthly') return { frequency, hour, minute, dayOfMonth }
    return { frequency, hour, minute }
  }

  async function create() {
    if (!mission.trim()) { toast.error('Missão é obrigatória'); return }
    setSaving(true)
    try {
      const r = await fetch(`/api/teams/${teamId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: buildPreset(), mission, label, mode }),
      })
      const j = await r.json()
      if (!j.success) throw new Error(j.error || 'Falha ao criar')
      toast.success('Agendamento criado')
      setMission(''); setLabel('')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(s: Schedule) {
    const r = await fetch(`/api/teams/${teamId}/schedules/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    const j = await r.json()
    if (j.success) setSchedules(prev => prev.map(x => (x.id === s.id ? j.data : x)))
  }

  async function remove(s: Schedule) {
    const r = await fetch(`/api/teams/${teamId}/schedules/${s.id}`, { method: 'DELETE' })
    const j = await r.json()
    if (j.success) setSchedules(prev => prev.filter(x => x.id !== s.id))
  }

  const inputCls = 'bg-transparent border border-white/10 rounded px-2 py-1 text-xs'

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-sm font-semibold">Agendamentos</h3>

      {schedules.length === 0 && (
        <p className="text-xs text-white/50">Nenhum agendamento. Crie um para rodar a missão automaticamente.</p>
      )}

      {schedules.map((s) => (
        <div key={s.id} className="flex items-center gap-2 rounded border border-white/10 p-2">
          <input type="checkbox" checked={s.isActive} onChange={() => toggle(s)} title="Ativo" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{s.label || s.mission}</div>
            <div className="text-[11px] text-white/50">
              {describe(s.cronExpr)} · {s.mode} · próximo {new Date(s.nextRunAt).toLocaleString('pt-BR')}
              {s.lastRunAt && (
                <> · último{' '}
                  {s.lastRunId
                    ? <a href={`/dashboard/teams/${teamId}?run=${s.lastRunId}`} className="underline hover:text-white/80">{s.lastStatus}</a>
                    : s.lastStatus}
                </>
              )}
            </div>
          </div>
          <button onClick={() => remove(s)} className="text-xs text-red-400 hover:text-red-300 px-2">excluir</button>
        </div>
      ))}

      {/* New schedule form */}
      <div className="rounded border border-white/10 p-3 space-y-2">
        <textarea
          className={`${inputCls} w-full`}
          rows={2}
          placeholder="Missão a executar (ex.: gere o relatório semanal de leads)"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputCls} flex-1 min-w-[8rem]`} placeholder="rótulo (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as 'chat' | 'code')}>
            <option value="chat">Chat</option>
            <option value="code">Código</option>
          </select>
          <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
          {frequency === 'weekly' && (
            <select className={inputCls} value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}>
              {DOW.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          )}
          {frequency === 'monthly' && (
            <select className={inputCls} value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>dia {d}</option>)}
            </select>
          )}
          <select className={inputCls} value={hour} onChange={(e) => setHour(parseInt(e.target.value, 10))}>
            {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
          </select>
          <select className={inputCls} value={minute} onChange={(e) => setMinute(parseInt(e.target.value, 10))}>
            {[0, 15, 30, 45].map((m) => <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>)}
          </select>
          <button onClick={create} disabled={saving} className="text-xs rounded bg-white/15 px-3 py-1.5 hover:bg-white/25 disabled:opacity-50">
            {saving ? 'Criando...' : '+ Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Mount the panel in TeamRunView**

In `src/app/dashboard/teams/[id]/TeamRunView.tsx`, add the import next to the existing `TeamOutputsPanel` import (line ~14):

```tsx
import { TeamSchedulesPanel } from './TeamSchedulesPanel'
```

Then, immediately AFTER the outputs panel block (the `{team && (<TeamOutputsPanel ... />)}` ending at line ~218), add:

```tsx
      {/* Schedules panel: recurring runs (SP3) */}
      {team && <TeamSchedulesPanel teamId={teamId} />}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no NEW errors from the two UI files.

- [ ] **Step 4: Commit**

```bash
git add "src/app/dashboard/teams/[id]/TeamSchedulesPanel.tsx" "src/app/dashboard/teams/[id]/TeamRunView.tsx"
git commit -m "feat(sp3): TeamSchedulesPanel UI (create/list/toggle/delete) in the team room"
```

---

## Task 7: Apply migration to prod, deploy, E2E

**Files:** none (operational).

- [ ] **Step 1: Apply the migration MANUALLY to the real prod host**

The Dockerfile `db push` does NOT run on the standalone runner — apply by hand. From the `sofia-next` dir, with the inline real-host URL (the `.env` `bot@31.97...` host times out — do NOT use it):

```bash
DATABASE_URL="postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable" \
  node node_modules/prisma/build/index.js migrate deploy
```

Expected: `migrate deploy` reports `20260615130000_add_scheduled_team_runs` applied. (`npx prisma` gives "not recognized"; the direct binary works even on OneDrive.)

- [ ] **Step 2: Push to main (deploys app + worker on EasyPanel)**

```bash
git push origin main
```

This redeploys both services. `prisma generate` runs in the build, so the client picks up `ScheduledTeamRun`.

- [ ] **Step 3: E2E with the user (real gate)**

1. Open a team room at `polarisia.com.br/dashboard/teams/<id>`, create a schedule (mission + weekly + a near time), confirm it lists with the friendly recurrence.
2. Hit the cron endpoint:
   ```bash
   curl -s -H "Authorization: Bearer $CRON_SECRET" https://polarisia.com.br/api/cron/run-scheduled-teams
   ```
   (Set a schedule with `nextRunAt` already in the past, or wait, so it's "due".)
   Expected JSON: `{ processed: >=1, results: [{ status: "dispatched", runId: "..." }], ... }`.
3. Confirm a new `TeamRun` exists for the team and `nextRunAt` advanced (re-fetch the schedules list; `lastStatus: "dispatched"`, `lastRunId` set).
4. Register the new endpoint URL in cron-job.org (like Compass) with the `Authorization: Bearer <CRON_SECRET>` header; confirm `CRON_SECRET` is set in EasyPanel env.

- [ ] **Step 4: Update memory**

Append to `MEMORY.md`'s Polaris Teams line: SP3 (Scheduling → Teams) entregue — `ScheduledTeamRun` + `startTeamRun()` helper (reuso p/ SP4) + `schedule.ts` puro + cron `run-scheduled-teams` + `TeamSchedulesPanel`. Migração `20260615130000` aplicada manual. Restam SP4 (API/v1) · SP5 (templates) · SP6 (teardown).

---

## Self-Review

**Spec coverage:**
- Modelo `ScheduledTeamRun` → Task 2 ✅
- Helper `startTeamRun` + refactor da rota → Task 3 ✅
- Módulo puro `schedule.ts` (cronFromPreset/getNextRunAt/isDue) → Task 1 ✅
- Cron `run-scheduled-teams` → Task 4 ✅
- CRUD `/api/teams/[id]/schedules` (+ `[scheduleId]`) → Task 5 ✅
- UI `TeamSchedulesPanel` + mount → Task 6 ✅
- Migração formal + aplicar manual → Task 2 (file) + Task 7 (apply) ✅
- Semântica `lastStatus='dispatched'` + `lastRunId` link → Task 4 + Task 6 (UI link) ✅
- Verify script (cronFromPreset/getNextRunAt/isDue) → Task 1 ✅
- Legado intacto (sem tocar ScheduledExecution/run-scheduled/scheduled-executions) → respeitado (nenhuma task os modifica) ✅
- chat+code mode → helper resolve repo do Team.config; UI expõe toggle ✅

**Type consistency:** `SchedulePreset`, `cronFromPreset`, `getNextRunAt`, `isDue` (Task 1) reused identically in Tasks 4/5/6. `startTeamRun`/`TeamRunError`/`TeamRunErrorCode` (Task 3) reused in Task 4 and the run route. `Schedule` UI type (Task 6) matches the model fields (Task 2). No naming drift.

**Placeholder scan:** only intentional secret placeholder `<senha>` in Task 7 (real password injected at run time). No TBD/TODO/"handle edge cases".
