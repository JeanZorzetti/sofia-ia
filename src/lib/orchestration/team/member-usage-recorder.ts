// src/lib/orchestration/team/member-usage-recorder.ts
// Wraps a ChatFn to record per-member token usage after each successful call.
// Best-effort: a write failure NEVER interrupts the run. Mirrors the FK tolerance
// pattern of addMessage (P2003 on member → record without member attribution).
import type { ChatFn } from './team-types'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

function isMemberFkViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2003' &&
    typeof (err.meta as Record<string, unknown>)?.field_name === 'string' &&
    ((err.meta as Record<string, unknown>).field_name as string).includes('member_id')
  )
}

export function withUsageTracking(inner: ChatFn): ChatFn {
  return async (agentId, messages, ctx, opts) => {
    const result = await inner(agentId, messages, ctx, opts)
    const tokens = result.usage?.total_tokens ?? 0
    // Only record when there's something to attribute (runId required; memberId optional).
    if (tokens > 0 && opts?.runId) {
      try {
        await prisma.teamMemberUsage.create({
          data: {
            runId: opts.runId,
            memberId: opts.memberId ?? null,
            model: result.model ?? null,
            tokens,
          },
        })
      } catch (err) {
        if (isMemberFkViolation(err)) {
          // Member was deleted mid-run — record without attribution (never drop usage).
          try {
            await prisma.teamMemberUsage.create({
              data: { runId: opts.runId, memberId: null, model: result.model ?? null, tokens },
            })
          } catch { /* best-effort */ }
        }
        // All other errors (runId FK, transient network) silently swallowed.
      }
    }
    return result
  }
}
