// scripts/v2s4-verify.ts
// Local verification for Teams V2 — fatia S2.1 (per-member activity panel in TeamRunView).
// The panel itself is validated by manual E2E (ROADMAP); the PURE aggregation was extracted
// into src/app/dashboard/teams/[id]/member-stats.ts so it can be asserted here via tsx — no
// jest (OneDrive errno -4094). Run:
//   npx tsx scripts/v2s4-verify.ts
//
// Required cases (from Sessão 4 / ROADMAP S2.1):
//   (a) 3 members (lead/worker/reviewer) + varied messages → sent/received + by-kind per member.
//   (b) tasks with assigneeId distributed → each member lists only its own + status counts + retries.
//   (c) conservation: Σ sent per member = #messages with non-null fromMemberId;
//                     Σ member-tasks    = #tasks with non-null assigneeId.
//   (d) idle member → zeros, still present; null from/to/assignee never leaks into a member.
import assert from 'node:assert/strict'
import {
  computeMemberStats,
  type MemberLike, type MessageLike, type TaskLike,
} from '../src/app/dashboard/teams/[id]/member-stats'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── Shared dataset (lead / worker / reviewer + one idle worker) ──
const members: MemberLike[] = [
  { id: 'm-lead', role: 'lead', agent: { name: 'Lead' } },
  { id: 'm-worker', role: 'worker', agent: { name: 'Worker' } },
  { id: 'm-reviewer', role: 'reviewer', agent: { name: 'Reviewer' } },
  { id: 'm-idle', role: 'worker', agent: { name: 'Idle' } },
]

const msg = (
  id: string, from: string | null, to: string | null, kind: string,
  summary: string | null = null, content = '', taskId: string | null = null,
): MessageLike => ({ id, fromMemberId: from, toMemberId: to, kind, summary, content, taskId })

// Arrival order matters (timeline asserts depend on it).
const messages: MessageLike[] = [
  msg('x1', 'm-lead', 'm-worker', 'assignment', 'faça A'),
  msg('x2', 'm-lead', 'm-worker', 'assignment', 'faça B'),
  msg('x3', 'm-worker', 'm-lead', 'message', null, 'feito A'),
  msg('x4', 'm-reviewer', 'm-worker', 'review', 'ajuste isso'),
  msg('x5', null, null, 'system', 'run started'),       // system → no member
  msg('x6', 'm-lead', 'm-reviewer', 'message', 'revise por favor'),
]

const tasks: TaskLike[] = [
  { id: 't1', title: 'A', status: 'done', assigneeId: 'm-worker', retryCount: 0 },
  { id: 't2', title: 'B', status: 'doing', assigneeId: 'm-worker', retryCount: 2 },
  { id: 't3', title: 'C', status: 'review', assigneeId: 'm-reviewer', retryCount: 0 },
  { id: 't4', title: 'D', status: 'todo', assigneeId: null, retryCount: 1 },  // unassigned
  { id: 't5', title: 'E', status: 'done', assigneeId: 'm-lead', retryCount: 0 },
]

function main() {
  const stats = computeMemberStats(members, messages, tasks)
  const by = (id: string) => stats.find(s => s.memberId === id)!

  // ── (a) messages: sent/received + by-kind per member ──
  console.log('(a) 3 members + varied messages → sent/received + by-kind correct per member')
  {
    const lead = by('m-lead'), worker = by('m-worker'), reviewer = by('m-reviewer')

    assert.equal(lead.sent, 3)       // x1, x2, x6
    assert.equal(lead.received, 1)   // x3
    assert.deepEqual(lead.sentByKind, { assignment: 2, message: 1 })
    assert.deepEqual(lead.receivedByKind, { message: 1 })
    ok('lead: 3 sent (assignment 2 / message 1), 1 received (message 1)')

    assert.equal(worker.sent, 1)     // x3
    assert.equal(worker.received, 3) // x1, x2, x4
    assert.deepEqual(worker.sentByKind, { message: 1 })
    assert.deepEqual(worker.receivedByKind, { assignment: 2, review: 1 })
    ok('worker: 1 sent (message 1), 3 received (assignment 2 / review 1)')

    assert.equal(reviewer.sent, 1)     // x4
    assert.equal(reviewer.received, 1) // x6
    assert.deepEqual(reviewer.sentByKind, { review: 1 })
    ok('reviewer: 1 sent (review 1), 1 received')

    // timeline = sent+received in arrival order, with resolved counterpart names
    assert.deepEqual(lead.timeline.map(e => e.id), ['x1', 'x2', 'x3', 'x6'])
    assert.deepEqual(lead.timeline.map(e => e.direction), ['sent', 'sent', 'received', 'sent'])
    assert.equal(lead.timeline[0].counterpartName, 'Worker')
    assert.equal(lead.timeline[2].counterpartName, 'Worker')
    assert.equal(lead.timeline[0].text, 'faça A')          // summary wins
    assert.equal(lead.timeline[2].text, 'feito A')         // falls back to content
    ok('lead timeline in arrival order, direction + counterpart name + summary||content correct')
  }

  // ── (b) tasks: each member only its own + status counts + retries ──
  console.log('(b) tasks distributed → each member lists only its own + status counts + retries')
  {
    const lead = by('m-lead'), worker = by('m-worker'), reviewer = by('m-reviewer')

    assert.deepEqual(worker.tasks.map(t => t.id), ['t1', 't2'])
    assert.deepEqual(worker.tasksByStatus, { done: 1, doing: 1 })
    assert.equal(worker.retries, 2)
    ok('worker: tasks [t1,t2], status {done:1,doing:1}, retries 2 (sum of retryCount)')

    assert.deepEqual(reviewer.tasks.map(t => t.id), ['t3'])
    assert.deepEqual(reviewer.tasksByStatus, { review: 1 })
    assert.equal(reviewer.retries, 0)
    ok('reviewer: only t3, status {review:1}, retries 0')

    assert.deepEqual(lead.tasks.map(t => t.id), ['t5'])
    ok('lead: only t5 (does not see the unassigned t4 or others)')
  }

  // ── (c) conservation ──
  console.log('(c) conservation: Σ per member = totals attributable to a member')
  {
    const sumSent = stats.reduce((a, s) => a + s.sent, 0)
    const nonNullFrom = messages.filter(m => m.fromMemberId !== null).length
    assert.equal(sumSent, nonNullFrom)
    ok(`Σ sent (${sumSent}) === messages with non-null fromMemberId (${nonNullFrom})`)

    const sumReceived = stats.reduce((a, s) => a + s.received, 0)
    const nonNullTo = messages.filter(m => m.toMemberId !== null).length
    assert.equal(sumReceived, nonNullTo)
    ok(`Σ received (${sumReceived}) === messages with non-null toMemberId (${nonNullTo})`)

    const sumTasks = stats.reduce((a, s) => a + s.tasks.length, 0)
    const nonNullAssignee = tasks.filter(t => t.assigneeId !== null).length
    assert.equal(sumTasks, nonNullAssignee)
    ok(`Σ member-tasks (${sumTasks}) === tasks with non-null assigneeId (${nonNullAssignee})`)
  }

  // ── (d) idle member present with zeros; null never leaks ──
  console.log('(d) idle member → zeros, still present; null from/to/assignee never leaks')
  {
    assert.equal(stats.length, members.length)
    assert.deepEqual(stats.map(s => s.memberId), members.map(m => m.id))
    ok('one stat per member, in roster order (idle member NOT dropped)')

    const idle = by('m-idle')
    assert.equal(idle.sent, 0)
    assert.equal(idle.received, 0)
    assert.equal(idle.tasks.length, 0)
    assert.equal(idle.retries, 0)
    assert.deepEqual(idle.sentByKind, {})
    assert.deepEqual(idle.tasksByStatus, {})
    assert.deepEqual(idle.timeline, [])
    ok('idle member: all counters/lists empty (zeros, not absent)')

    // the system message (x5) and unassigned task (t4) belong to nobody
    const anyHasSystem = stats.some(s => s.timeline.some(e => e.id === 'x5'))
    assert.equal(anyHasSystem, false)
    const anyHasT4 = stats.some(s => s.tasks.some(t => t.id === 't4'))
    assert.equal(anyHasT4, false)
    ok('null-member system message (x5) and unassigned task (t4) leak into NO member')

    // empty inputs → empty result, no crash
    assert.deepEqual(computeMemberStats([], messages, tasks), [])
    ok('no members → [] (no crash)')
  }

  console.log(`\n✅ v2s4 verify: ${passed} assertions passed`)
}

main()
