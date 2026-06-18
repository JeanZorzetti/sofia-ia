// src/lib/orchestration/team/team-coordinator.ts
// Lead-orchestrated team coordination loop. Synchronous, in-process.
// Depends only on an injected TeamStore + ChatFn (see team-store.ts / team-types.ts).

import type { ChatFn, ChatResult, LeadAction, TaskRow } from './team-types'
import type { TeamStore } from './team-store'
// type-only: does NOT pull git/sandbox runtime into the coordinator (invariant C).
import type { ChangedFile } from '../../git/repo-lifecycle'
import { parseLeadActions, parseReviewVerdict } from './team-protocol'
import { buildLeadContext, buildTaskPrompt, buildReviewPrompt, buildConsolidationPrompt } from './team-prompts'
import { resolveAssignee, isBoardSettled, isRateLimit } from './team-board'

const COST_PER_1M_TOKENS = 0.5

export interface RunTeamDeps {
  store: TeamStore
  chat: ChatFn
  /** C3: capture the working-tree diff (vs base) to feed the reviewer the real
   *  changes. Injected by the worker on repo-bound code-runs; undefined for
   *  chat-runs and repo-less code-runs (C0) → reviewer stays text-only. */
  getTaskDiff?: () => Promise<ChangedFile[]>
  now?: () => number
}

export async function runTeam(runId: string, deps: RunTeamDeps): Promise<void> {
  const { store, chat, getTaskDiff, now = () => Date.now() } = deps

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
      let leadOut: ChatResult
      try {
        leadOut = await chat(lead.agentId, [
          { role: 'user', content: buildLeadContext(mission, board0, msgs0, members) },
        ], undefined, { model: lead.model, effort: lead.effort, capabilities: lead.capabilities })
      } catch (e) {
        if (isRateLimit(e)) { await finish('rate_limited', null, 'Rate limit durante planejamento'); return }
        throw e
      }
      track(leadOut)

      let actions: LeadAction[]
      try { actions = parseLeadActions(leadOut.message) } catch { actions = [] }

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
          // taskId/runId ride in OPTIONS (not leadContext) so the code-agent can persist
          // partial artifacts mid-loop (C2.1); chatWithAgent ignores unknown option keys.
          out = await chat(worker.agentId, [{ role: 'user', content: buildTaskPrompt(t, t.reviewNote) }], undefined, { model: worker.model, effort: worker.effort, taskId: t.id, runId, capabilities: worker.capabilities })
        } catch (e) {
          if (isRateLimit(e)) { await finish('rate_limited', null, 'Rate limit durante execução'); return }
          throw e
        }
        track(out)
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
      }

      // ── REVIEW (Reviewer) ──
      if (reviewer) {
        const toReview = (await store.listTasks(runId)).filter(t => t.status === 'review')
        // C3: capture the working-tree diff ONCE per review pass (it's the same
        // accumulated state for every task being reviewed this turn). Best-effort:
        // a diff failure must never block the gate, so fall back to [] (text-only).
        const diff = toReview.length > 0 && getTaskDiff ? await getTaskDiff().catch(() => []) : []
        for (const t of toReview) {
          if (await cancelled()) { await finish('cancelled', null, 'Run cancelado pelo usuário'); return }
          // Persist what the reviewer sees so the UI can show it (best-effort, merged
          // with the command log via the store; never blocks the review).
          if (diff.length > 0) {
            await store.updateTask(t.id, { artifacts: { reviewDiff: diff } }).catch(() => {})
          }
          let out: ChatResult
          try {
            out = await chat(reviewer.agentId, [{ role: 'user', content: buildReviewPrompt(t, diff) }], undefined, { model: reviewer.model, effort: reviewer.effort, capabilities: reviewer.capabilities })
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
        let conso: ChatResult
        try {
          conso = await chat(lead.agentId, [{ role: 'user', content: buildConsolidationPrompt(board) }], undefined, { model: lead.model, effort: lead.effort, capabilities: lead.capabilities })
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
      // (The anti-stall sentinel above is gated on `!doneAction`, so an empty board with
      //  a @DONE action reaches here intentionally; it is NOT dead code.)
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
