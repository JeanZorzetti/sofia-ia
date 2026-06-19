// src/lib/orchestration/team/team-graph-coordinator.ts
// Graph-topology team executor — opt-in via `Team.config.topology = 'graph'`.
//
// Forked from runTeam (team-coordinator.ts) at G1. The linear coordinator stays
// INTACT (the program-wide invariant); this sibling adds DAG behaviour
// incrementally:
//   G1 — task dependencies: a task executes only once all its `dependsOn` tasks
//        are `done`; otherwise it is parked in `blocked`.
//   G2 — agenda state-machine (THIS fatia): the per-turn loop no longer runs
//        fixed phases with inline gating. Instead `buildAgenda(board)` derives
//        per task {nextAction, actionOwner} (deriveTaskAction in
//        team-graph-agenda.ts) and each bucket is routed to its owner — Lead
//        plans, owners execute/apply_changes, the reviewer reviews,
//        wait_dependency tasks park in `blocked`. This is behaviour-preserving:
//        the same gating/execution/review decisions, derived instead of inlined,
//        so a graph run settles to the SAME terminal state (hard regression).
//   G3 — parallel agendas (THIS fatia): the per-turn EXECUTE and REVIEW buckets
//        no longer run one task at a time. They fan out through
//        runWithConcurrency (≤ config.maxParallel in flight). The runnable tasks
//        of one turn are independent BY CONSTRUCTION — a task with unmet deps is
//        parked in `blocked` and can't share a turn with them — so concurrency is
//        safe and the fan-in is already guaranteed by the agenda. With ≤1 runnable
//        task per turn (every regression scenario) the terminal state is byte-
//        identical to G2 (hard regression).
//
// A graph team WITHOUT dependencies still behaves identically to the linear one.
import type { ChatResult, LeadAction, TaskRow } from './team-types'
import type { TeamStore } from './team-store'
// type-only: reuse the linear coordinator's deps shape AS-IS (store + chat +
// getTaskDiff + now). A type import does NOT touch the INTACT runTeam runtime.
import type { RunTeamDeps } from './team-coordinator'
import { parseLeadActions, parseReviewVerdict, parseWorkerOutput } from './team-protocol'
import { buildLeadContext, buildTaskPrompt, buildReviewPrompt, buildConsolidationPrompt } from './team-prompts'
import { resolveAssignee, isBoardSettled, isRateLimit } from './team-board'
import { buildAgenda } from './team-graph-agenda'
import { runWithConcurrency } from './team-concurrency'

const COST_PER_1M_TOKENS = 0.5

// G3: per-task outcome of a fan-out bucket. The worker/reviewer fn NEVER throws —
// it returns one of these so a failure in one in-flight task doesn't abort the
// bookkeeping of the others; the terminal decision is made once, after, from the
// collected outcomes (pickTerminal).
type TurnOutcome =
  | { kind: 'ok' }
  | { kind: 'rate_limited' }
  | { kind: 'error'; error: Error }

/** Reduce a fan-out's outcomes to a single terminal decision, matching the old
 *  sequential loop's precedence: any rate-limit short-circuits the run; else the
 *  FIRST hard error re-throws (→ finish('failed') in the outer catch). All `ok`
 *  → null (the turn proceeds). Pure. */
function pickTerminal(outcomes: TurnOutcome[]): Extract<TurnOutcome, { kind: 'rate_limited' | 'error' }> | null {
  if (outcomes.some(o => o.kind === 'rate_limited')) return { kind: 'rate_limited' }
  const err = outcomes.find((o): o is Extract<TurnOutcome, { kind: 'error' }> => o.kind === 'error')
  return err ?? null
}

export async function runTeamGraph(runId: string, deps: RunTeamDeps): Promise<void> {
  const { store, chat, getTaskDiff, now = () => Date.now() } = deps

  const loaded = await store.loadRun(runId)
  if (!loaded) throw new Error(`TeamRun ${runId} not found`)
  const { mission, config, members } = loaded

  const lead = members.find(m => m.role === 'lead')
  if (!lead) throw new Error('Team has no lead member')
  const workers = members.filter(m => m.role === 'worker')
  if (workers.length === 0) throw new Error('Team has no worker members')
  const reviewer = members.find(m => m.role === 'reviewer') ?? null

  // G3: fan-out cap for parallel agendas. Default = roster width (one task per
  // worker — "the whole team works at once"); a team sets `config.maxParallel` to
  // throttle (e.g. a `:free` provider that 429s under burst → maxParallel: 1).
  // Clamped to ≥1. runWithConcurrency further caps to the number of runnable tasks.
  const maxParallel = Math.max(1, config.maxParallel ?? workers.length)

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
      let leadOut: ChatResult
      try {
        leadOut = await chat(lead.agentId, [
          { role: 'user', content: buildLeadContext(mission, board0, msgs0, members) },
        ], undefined, { model: lead.model, effort: lead.effort, capabilities: lead.capabilities, workflow: lead.workflow, memberId: lead.id, runId })
      } catch (e) {
        if (isRateLimit(e)) { await finish('rate_limited', null, 'Rate limit durante planejamento'); return }
        throw e
      }
      track(leadOut)

      let actions: LeadAction[]
      try { actions = parseLeadActions(leadOut.message) } catch { actions = [] }

      // G1: map board DISPLAY ids (`#n` = position+1) → real task ids, so a
      // `@TASK [after:#n]` declaration resolves to dependency ids. Seeded with the
      // existing board and grown as tasks are created this turn, so a task can
      // depend on one created earlier in the same turn (backward refs). Unknown /
      // forward refs are dropped at resolution (filtered below).
      const displayToId = new Map<number, string>()
      for (const t of board0) displayToId.set(t.position + 1, t.id)

      for (const a of actions) {
        if (a.type === 'message') {
          const to = a.to ? (workers.find(w => w.agentName.toLowerCase() === a.to!.toLowerCase()) ?? null) : null
          await store.addMessage(runId, {
            fromMemberId: lead.id, toMemberId: to?.id ?? null,
            summary: a.summary ?? null, content: a.summary ?? '', kind: 'message',
          })
        } else if (a.type === 'task') {
          // Seed = current total task count, so successive @TASKs in a turn round-robin across workers.
          const seed = (await store.listTasks(runId)).length
          const assignee = resolveAssignee(workers, a.assignTo, seed)
          // Resolve `[after:#n]` display ids → real task ids (drop unknown ids).
          const dependsOn = (a.dependsOn ?? [])
            .map(n => displayToId.get(n))
            .filter((id): id is string => !!id)
          const created = await store.createTask(runId, {
            title: a.title ?? 'Tarefa', body: a.body ?? null,
            assigneeId: assignee?.id ?? null, status: 'todo', dependsOn,
          })
          displayToId.set(created.position + 1, created.id)
          await store.addMessage(runId, {
            fromMemberId: lead.id, toMemberId: assignee?.id ?? null,
            summary: a.title ?? null, content: a.body ?? a.title ?? '', kind: 'assignment', taskId: created.id,
          })
        } else if (a.type === 'clarify') {
          // G6: the Lead answers a parked `clarify` task. Resolve `#n`→real id and
          // re-queue it as `todo` with the answer as `reviewNote` (the existing
          // feedback channel buildTaskPrompt injects on re-run). NOT a rejection →
          // retryCount is left untouched. Unknown `#n` is ignored (nothing to route).
          const id = a.display != null ? displayToId.get(a.display) : undefined
          if (id) {
            await store.updateTask(id, { status: 'todo', reviewNote: a.answer ?? null })
            await store.addMessage(runId, {
              fromMemberId: lead.id, toMemberId: null,
              summary: 'Esclarecimento', content: a.answer ?? '', kind: 'message', taskId: id,
            })
          }
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

      // ── AGENDA (G2): derive {nextAction, actionOwner} per task and route ──
      // Replaces the fixed gate→execute→review phases with agenda-driven routing.
      // One snapshot drives PARK + EXECUTE (mirrors G1, which used `boardNow` for
      // both gating and `runnable`); REVIEW re-derives from a fresh board because
      // the workers below produce new `review` tasks within this same turn.
      const assignedToWorker = (t: TaskRow) => !!t.assigneeId && workers.some(w => w.id === t.assigneeId)
      const agenda = buildAgenda(boardNow)

      // PARK: wait_dependency tasks → `blocked` (deps not all `done`), unless
      // already blocked. Keeps the board unsettled so the run waits on the dep.
      for (const { task } of agenda.filter(i => i.nextAction === 'wait_dependency')) {
        if (task.status !== 'blocked') await store.updateTask(task.id, { status: 'blocked' })
      }

      // EXECUTE / APPLY_CHANGES: owners (workers) run their tasks. apply_changes is
      // the retry re-queue — same worker path, the reviewNote rides in the prompt.
      // Board order preserved (= position) → results collected in board order.
      // G3: the bucket FANS OUT (≤ maxParallel) instead of a sequential `for`. Each
      // task does its OWN bookkeeping and returns a TurnOutcome (never throws), so
      // the fan-out always settles; the terminal decision is made once, after.
      const runnable = agenda
        .filter(i => (i.nextAction === 'execute' || i.nextAction === 'apply_changes') && assignedToWorker(i.task))
        .map(i => i.task)
      if (runnable.length > 0) {
        if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }
        const outcomes = await runWithConcurrency(runnable, maxParallel, async (t): Promise<TurnOutcome> => {
          const worker = workers.find(w => w.id === t.assigneeId)!
          await store.updateTask(t.id, { status: 'doing' })
          let out: ChatResult
          try {
            // taskId/runId ride in OPTIONS (not leadContext) so the code-agent can persist
            // partial artifacts mid-loop (C2.1); chatWithAgent ignores unknown option keys.
            // G6: allowClarify is graph-only (OPT-IN) — lets this Worker emit @CLARIFY.
            out = await chat(worker.agentId, [{ role: 'user', content: buildTaskPrompt(t, t.reviewNote, { allowClarify: true }) }], undefined, { model: worker.model, effort: worker.effort, taskId: t.id, runId, capabilities: worker.capabilities, workflow: worker.workflow, memberId: worker.id })
          } catch (e) {
            if (isRateLimit(e)) return { kind: 'rate_limited' }
            return { kind: 'error', error: e as Error }
          }
          // track() runs AFTER the await — JS is single-threaded, so `tokensUsed +=`
          // never interleaves mid-statement; each task updates only its own row.
          track(out)
          // G6: a Worker that lacks essential info parks the task in `clarify` and
          // escalates the question to the Lead — NO result, NOT routed to review. The
          // agenda derives `clarify`→lead next turn; isBoardSettled keeps the run alive.
          const parsed = parseWorkerOutput(out.message)
          if (parsed.kind === 'clarify') {
            await store.updateTask(t.id, { status: 'clarify' })
            await store.addMessage(runId, {
              fromMemberId: worker.id, toMemberId: lead.id,
              summary: `❓ ${parsed.question}`, content: parsed.question, kind: 'message', taskId: t.id,
            })
            return { kind: 'ok' }
          }
          await store.updateTask(t.id, {
            status: reviewer ? 'review' : 'done', result: out.message, reviewNote: null,
            // code-runs carry sandbox command logs; chat-runs leave this undefined
            artifacts: out.artifacts,
          })
          await store.addMessage(runId, {
            fromMemberId: worker.id, toMemberId: reviewer?.id ?? lead.id,
            // message-log entry only — the full output is persisted in task.result
            summary: `Concluí: ${t.title}`, content: out.message.slice(0, 2000), kind: 'message', taskId: t.id,
          })
          return { kind: 'ok' }
        })
        const terminal = pickTerminal(outcomes)
        if (terminal) {
          if (terminal.kind === 'rate_limited') { await finish('rate_limited', null, 'Rate limit durante execução'); return }
          throw terminal.error
        }
      }

      // ── REVIEW (Reviewer) ── agenda re-derived: the workers above just moved
      // tasks into `review` this turn, so the bucket must reflect the fresh board.
      if (reviewer) {
        const toReview = buildAgenda(await store.listTasks(runId))
          .filter(i => i.nextAction === 'review')
          .map(i => i.task)
        // C3: capture the working-tree diff ONCE per review pass (it's the same
        // accumulated state for every task being reviewed this turn). Best-effort:
        // a diff failure must never block the gate, so fall back to [] (text-only).
        const diff = toReview.length > 0 && getTaskDiff ? await getTaskDiff().catch(() => []) : []
        if (toReview.length > 0) {
          if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }
          // G3: reviews FAN OUT too (≤ maxParallel). Same protocol as EXECUTE — each
          // review does its own bookkeeping and returns a TurnOutcome (never throws).
          const outcomes = await runWithConcurrency(toReview, maxParallel, async (t): Promise<TurnOutcome> => {
            // Persist what the reviewer sees so the UI can show it (best-effort, merged
            // with the command log via the store; never blocks the review).
            if (diff.length > 0) {
              await store.updateTask(t.id, { artifacts: { reviewDiff: diff } }).catch(() => {})
            }
            let out: ChatResult
            try {
              out = await chat(reviewer.agentId, [{ role: 'user', content: buildReviewPrompt(t, diff) }], undefined, { model: reviewer.model, effort: reviewer.effort, capabilities: reviewer.capabilities, workflow: reviewer.workflow, memberId: reviewer.id, runId })
            } catch (e) {
              if (isRateLimit(e)) return { kind: 'rate_limited' }
              return { kind: 'error', error: e as Error }
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
            return { kind: 'ok' }
          })
          const terminal = pickTerminal(outcomes)
          if (terminal) {
            if (terminal.kind === 'rate_limited') { await finish('rate_limited', null, 'Rate limit durante review'); return }
            throw terminal.error
          }
        }
      }

      // ── SETTLE / CONSOLIDATE ──
      // isBoardSettled is false while any task is `blocked` (it only counts
      // done/rejected as terminal), so the run can't complete with a dependency
      // still pending — the G1 invariant. A board permanently blocked (e.g. a dep
      // got rejected) is bounded by config.maxTurns below.
      const board = await store.listTasks(runId)
      if (isBoardSettled(board)) {
        if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }
        let conso: ChatResult
        try {
          conso = await chat(lead.agentId, [{ role: 'user', content: buildConsolidationPrompt(board) }], undefined, { model: lead.model, effort: lead.effort, capabilities: lead.capabilities, workflow: lead.workflow, memberId: lead.id, runId })
        } catch (e) {
          // Work is done and approved — don't lose it if the final synthesis call fails.
          // Fall back to a partial summary; surface rate-limits as such, else complete.
          const partial = board
            .filter((t: TaskRow) => t.status === 'done')
            .map((t: TaskRow) => `### ${t.title}\n${t.result ?? ''}`)
            .join('\n\n')
          await finish(
            isRateLimit(e) ? 'rate_limited' : 'completed',
            partial || null,
            isRateLimit(e) ? 'Rate limit durante consolidação' : null,
          )
          return
        }
        track(conso)
        await finish('completed', conso.message)
        return
      }
      // Lead declared @DONE with no tasks at all (e.g. trivial mission) — accept it.
      if (doneAction && board.length === 0) {
        await finish('completed', doneAction.text || leadOut.message)
        return
      }
      // else: pending work remains (a retry re-queued to todo, or a blocked task
      // waiting on its deps) → next turn.
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
