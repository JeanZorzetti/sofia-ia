// scripts/v21s4-verify.ts
// Local verification for Teams V2.1 — fatia S2.1 (Tema E): persist a per-task
// append-only lifecycle timeline. The store appends events at the exact points it
// already persists each transition, so `team-coordinator.ts` stays byte-identical.
// The DECISION (transition → event) lives in the PURE helper task-history.ts; this
// script asserts it via tsx — no jest (OneDrive errno -4094).
// Run: npx tsx scripts/v21s4-verify.ts
//
// Required cases (from ROADMAP S2.1 + Sessão 4.md):
//   (a) full lifecycle (todo→doing→review→done) builds the expected timeline IN ORDER.
//   (b) review→todo and review→rejected map to review_changes_requested; review→done → review_approved.
//   (c) owner_changed when assigneeId changes; task_created on creation.
//   (d) a non-transition update (reviewDiff/result/retry only, or same status) yields NO event.
//   (e) no events / null column → behavior identical to today (regression).
//   (f) S2.2 read-side: taskEventView maps each event type → label/tone/iconKey
//       (status_changed embeds the pt-BR from→to); taskStatusLabel falls back safely.
import assert from 'node:assert/strict'
import {
  appendTaskEvent, taskCreatedEvent, taskEventFromUpdate,
  ACTOR_LEAD, ACTOR_REVIEWER, type TaskHistoryEvent,
} from '../src/lib/orchestration/team/task-history'
import { taskEventView, taskStatusLabel } from '../src/lib/orchestration/team/task-event-view'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const AT = '2026-06-19T12:00:00.000Z'

// Mirror the store's append step: returns the new timeline, or the old one
// UNTOUCHED when the update isn't a trackable transition (store guards `if (event)`).
function applyUpdate(
  history: TaskHistoryEvent[] | null,
  prev: { status: string; assigneeId: string | null },
  data: { status?: string; assigneeId?: string | null },
): TaskHistoryEvent[] | null {
  const ev = taskEventFromUpdate(prev, data, AT)
  return ev ? appendTaskEvent(history, ev) : history
}

function main() {
  // ── (a) full lifecycle todo→doing→review→done builds the timeline in order ──
  console.log('(a) lifecycle todo→doing→review→done → timeline na ordem certa')
  {
    let h: TaskHistoryEvent[] | null = [taskCreatedEvent({ assigneeId: 'w1', status: 'todo' }, AT)]
    h = applyUpdate(h, { status: 'todo', assigneeId: 'w1' }, { status: 'doing' })
    h = applyUpdate(h, { status: 'doing', assigneeId: 'w1' }, { status: 'review' })
    h = applyUpdate(h, { status: 'review', assigneeId: 'w1' }, { status: 'done' })

    assert.ok(h)
    assert.deepEqual(h!.map(e => e.type), [
      'task_created', 'status_changed', 'review_requested', 'review_approved',
    ])
    // actors: worker carries created→doing→review; the reviewer owns the verdict.
    assert.equal(h![0].actor, ACTOR_LEAD)        // task_created seeded by the lead
    assert.equal(h![1].actor, 'w1')              // worker started
    assert.equal(h![2].actor, 'w1')              // worker delivered for review
    assert.equal(h![3].actor, ACTOR_REVIEWER)    // reviewer approved
    // status_changed carries {from,to}.
    assert.deepEqual(h![1].detail, { from: 'todo', to: 'doing' })
    assert.deepEqual(h![3].detail, { from: 'review', to: 'done' })
    // timestamps preserved.
    assert.ok(h!.every(e => e.at === AT))
    ok('(a) full lifecycle yields task_created→status_changed→review_requested→review_approved in order')
  }

  // ── (b) review verdicts map to the right type ──
  console.log('(b) review→todo/rejected = review_changes_requested; review→done = review_approved')
  {
    const approved = taskEventFromUpdate({ status: 'review', assigneeId: 'w1' }, { status: 'done' }, AT)
    assert.equal(approved?.type, 'review_approved')
    assert.equal(approved?.actor, ACTOR_REVIEWER)

    const retry = taskEventFromUpdate({ status: 'review', assigneeId: 'w1' }, { status: 'todo' }, AT)
    assert.equal(retry?.type, 'review_changes_requested')
    assert.deepEqual(retry?.detail, { from: 'review', to: 'todo' })

    const rejected = taskEventFromUpdate({ status: 'review', assigneeId: 'w1' }, { status: 'rejected' }, AT)
    assert.equal(rejected?.type, 'review_changes_requested')
    assert.deepEqual(rejected?.detail, { from: 'review', to: 'rejected' })
    assert.equal(rejected?.actor, ACTOR_REVIEWER)

    // doing→done with NO reviewer is a plain status change (not a review verdict).
    const direct = taskEventFromUpdate({ status: 'doing', assigneeId: 'w1' }, { status: 'done' }, AT)
    assert.equal(direct?.type, 'status_changed')
    assert.equal(direct?.actor, 'w1')
    ok('(b) review verdicts mapped: approved/changes_requested; doing→done = status_changed')
  }

  // ── (c) owner_changed on reassignment; task_created on creation ──
  console.log('(c) owner_changed quando assigneeId muda; task_created na criação')
  {
    const reassigned = taskEventFromUpdate({ status: 'todo', assigneeId: 'w1' }, { assigneeId: 'w2' }, AT)
    assert.equal(reassigned?.type, 'owner_changed')
    assert.equal(reassigned?.actor, ACTOR_LEAD)
    assert.deepEqual(reassigned?.detail, { from: 'w1', to: 'w2' })

    // assign-from-unassigned also counts as an owner change.
    const assignedNow = taskEventFromUpdate({ status: 'todo', assigneeId: null }, { assigneeId: 'w3' }, AT)
    assert.equal(assignedNow?.type, 'owner_changed')
    assert.deepEqual(assignedNow?.detail, { from: null, to: 'w3' })

    const created = taskCreatedEvent({ assigneeId: 'w1', status: 'todo' }, AT)
    assert.equal(created.type, 'task_created')
    assert.equal(created.actor, ACTOR_LEAD)
    assert.deepEqual(created.detail, { status: 'todo', assigneeId: 'w1' })

    // creation with no assignee (anti-stall / FK-fallback path) omits assigneeId.
    const createdUnassigned = taskCreatedEvent({ assigneeId: null, status: 'todo' }, AT)
    assert.deepEqual(createdUnassigned.detail, { status: 'todo' })
    ok('(c) owner_changed (from/to incl. null) + task_created with/without assignee')
  }

  // ── (d) non-transition updates yield NO event ──
  console.log('(d) update que não é transição (reviewDiff/result/retry/same-status) → sem evento')
  {
    const prev = { status: 'doing', assigneeId: 'w1' }
    // reviewDiff-/result-/retry-only writes carry neither status nor assigneeId.
    assert.equal(taskEventFromUpdate(prev, {}, AT), null)
    assert.equal(taskEventFromUpdate(prev, { status: undefined, assigneeId: undefined }, AT), null)
    // same value = no transition.
    assert.equal(taskEventFromUpdate(prev, { status: 'doing' }, AT), null)
    assert.equal(taskEventFromUpdate(prev, { assigneeId: 'w1' }, AT), null)
    ok('(d) reviewDiff/result/retry-only and same-value updates produce null (timeline untouched)')
  }

  // ── (e) regression: no events / null column behaves like today ──
  console.log('(e) sem eventos / coluna nula → comportamento idêntico ao atual')
  {
    // A legacy task whose column is null and that only ever gets non-transition
    // updates keeps its history UNTOUCHED (store guards `if (event)`).
    let h: TaskHistoryEvent[] | null = null
    h = applyUpdate(h, { status: 'doing', assigneeId: 'w1' }, {})                 // result-only write
    h = applyUpdate(h, { status: 'doing', assigneeId: 'w1' }, { status: 'doing' }) // same status
    assert.equal(h, null, 'no transition → column stays null (legacy, byte-identical)')

    // appendTaskEvent never mutates the input and coerces a null/garbage column to [].
    const original: TaskHistoryEvent[] = [taskCreatedEvent({ status: 'todo' }, AT)]
    const next = appendTaskEvent(original, { type: 'status_changed', actor: 'w1', at: AT, detail: { from: 'todo', to: 'doing' } })
    assert.equal(original.length, 1, 'input array not mutated')
    assert.equal(next.length, 2)
    assert.deepEqual(appendTaskEvent(null, original[0]), [original[0]])
    assert.deepEqual(appendTaskEvent(undefined, original[0]), [original[0]])
    assert.deepEqual(appendTaskEvent('garbage' as unknown, original[0]), [original[0]])
    ok('(e) non-transitions leave the column null; appendTaskEvent is immutable + coerces non-arrays')
  }

  // ── (f) S2.2 read-side: taskEventView maps event → label/tone/iconKey ──
  console.log('(f) S2.2 read-side: taskEventView → label/tone/iconKey por tipo')
  {
    // status_changed embeds the pt-BR from→to.
    const status = taskEventView({ type: 'status_changed', actor: 'w1', at: AT, detail: { from: 'todo', to: 'doing' } })
    assert.equal(status.label, 'A fazer → Fazendo')
    assert.equal(status.iconKey, 'status')
    assert.equal(status.tone, 'text-blue-400')

    // each type maps to its own iconKey (no collisions) + a stable label.
    assert.equal(taskEventView({ type: 'task_created', actor: ACTOR_LEAD, at: AT }).iconKey, 'created')
    assert.equal(taskEventView({ type: 'review_requested', actor: 'w1', at: AT }).iconKey, 'review_requested')
    assert.equal(taskEventView({ type: 'review_approved', actor: ACTOR_REVIEWER, at: AT }).iconKey, 'approved')
    assert.equal(taskEventView({ type: 'review_changes_requested', actor: ACTOR_REVIEWER, at: AT }).iconKey, 'changes')

    // owner_changed: first assignment vs reassignment (component appends the name).
    assert.equal(taskEventView({ type: 'owner_changed', actor: ACTOR_LEAD, at: AT, detail: { from: null, to: 'w2' } }).label, 'Atribuída a')
    assert.equal(taskEventView({ type: 'owner_changed', actor: ACTOR_LEAD, at: AT, detail: { from: 'w1', to: 'w2' } }).label, 'Reatribuída para')

    // taskStatusLabel: known → pt-BR, unknown → raw, non-string → em-dash.
    assert.equal(taskStatusLabel('review'), 'Review')
    assert.equal(taskStatusLabel('weird'), 'weird')
    assert.equal(taskStatusLabel(undefined), '—')

    // a status change into an unknown target degrades to the raw value (no crash).
    assert.equal(
      taskEventView({ type: 'status_changed', actor: 'w1', at: AT, detail: { from: 'review', to: 'rejected' } }).label,
      'Review → Rejeitado',
    )
    ok('(f) taskEventView maps type→label/tone/iconKey; taskStatusLabel falls back safely')
  }

  console.log(`\n✅ v21s4 verify: ${passed} assertions passed`)
}

main()
