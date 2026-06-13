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
