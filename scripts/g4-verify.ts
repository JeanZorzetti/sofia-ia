// scripts/g4-verify.ts
// Local verification for the G4 viz slice (no React Flow / no DOM / no DB).
// Jest can't run on this machine (OneDrive errno -4094), so this script asserts
// the builder contract via tsx. Run: npx tsx scripts/g4-verify.ts
//
// It exercises ONLY the pure `buildTeamGraph(members, tasks, activeId)`:
//   1. one node per task + member nodes still present (no member-viz regression)
//   2. owner→task edge per assigned task (none for an unassigned task)
//   3. task→task edge per id in dependsOn (and none for stale/dangling deps)
//   4. distinct color/style per status (all 6 statuses)
//   5. blocked badge (🔒 + data.blocked)
//   6. reviewer chip (🛡 + data.reviewer) only while in review
//   7. linear regression: tasks with empty dependsOn → 0 dependency edges
import assert from 'node:assert/strict'
import { buildTeamGraph, type GraphMember, type GraphTask } from '../src/lib/orchestration/team/team-graph-view'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const members: GraphMember[] = [
  { id: 'L', role: 'lead', name: 'Lia' },
  { id: 'WA', role: 'worker', name: 'Ana' },
  { id: 'WB', role: 'worker', name: 'Bob' },
  { id: 'R', role: 'reviewer', name: 'Rex' },
]

// Helpers to read back the built graph.
const dataOf = (n: { data?: unknown }) => (n.data ?? {}) as Record<string, unknown>
const taskNodes = (nodes: { data?: unknown }[]) => nodes.filter(n => dataOf(n).kind === 'task')
const memberNodes = (nodes: { data?: unknown }[]) => nodes.filter(n => dataOf(n).kind === 'member')
const bg = (n: { style?: unknown }) => ((n.style ?? {}) as Record<string, unknown>).background as string

async function main() {
  // ── 1 + 2 + 3: full board with assignees and dependencies ──
  console.log('buildTeamGraph (nodes + ownership + dependency edges)')
  {
    const tasks: GraphTask[] = [
      { id: 't1', title: 'A', status: 'doing', assigneeId: 'WA', dependsOn: [] },
      { id: 't2', title: 'B', status: 'review', assigneeId: 'WB', dependsOn: ['t1'] },
      { id: 't3', title: 'C', status: 'done', assigneeId: 'WA', dependsOn: [] },
      { id: 't4', title: 'D', status: 'rejected', assigneeId: 'WB', dependsOn: [] },
      { id: 't5', title: 'E', status: 'todo', assigneeId: 'WA', dependsOn: [] },
      { id: 't6', title: 'F', status: 'blocked', assigneeId: 'WB', dependsOn: ['t2'] },
      { id: 't7', title: 'G', status: 'todo', assigneeId: null, dependsOn: [] }, // unassigned
    ]
    const { nodes, edges } = buildTeamGraph(members, tasks, 'WA')

    // 1. one node per task; members still rendered.
    assert.equal(taskNodes(nodes).length, 7); ok('one node per task (7)')
    assert.equal(memberNodes(nodes).length, 4); ok('all 4 member nodes still present (no viz regression)')
    // member nodes are uniquely the member ids; task nodes are namespaced.
    assert.ok(nodes.some(n => n.id === 'L' && dataOf(n).kind === 'member')); ok('lead node present by id')
    assert.ok(nodes.some(n => n.id === 'task-t1' && dataOf(n).kind === 'task')); ok('task node id is namespaced (task-*)')

    // 2. owner→task edges: 6 assigned tasks, none for the unassigned t7.
    const ownerEdges = edges.filter(e => e.id.startsWith('o-'))
    assert.equal(ownerEdges.length, 6); ok('owner→task edge for each assigned task (6)')
    assert.ok(ownerEdges.every(e => members.some(m => m.id === e.source))); ok('owner edge source is always a member')
    assert.ok(!ownerEdges.some(e => e.target === 'task-t7')); ok('no owner edge for the unassigned task')
    const oa = ownerEdges.find(e => e.target === 'task-t1')!
    assert.equal(oa.source, 'WA'); ok('owner edge points from the assignee (WA→t1)')

    // 3. task→task dependency edges: t2←t1 and t6←t2.
    const depEdges = edges.filter(e => e.id.startsWith('d-'))
    assert.equal(depEdges.length, 2); ok('one task→task edge per dependency (2)')
    assert.ok(depEdges.some(e => e.source === 'task-t1' && e.target === 'task-t2')); ok('dep edge t1→t2 (direction: dep→dependent)')
    assert.ok(depEdges.some(e => e.source === 'task-t2' && e.target === 'task-t6')); ok('dep edge t2→t6')
    assert.ok(depEdges.every(e => e.animated === true)); ok('dependency edges are animated')

    // 4. distinct color/style per status (all 6 statuses present here except todo on assigned t5 too).
    const byTitle = (title: string) => nodes.find(n => dataOf(n).kind === 'task' && (dataOf(n).label as string).includes(title))!
    const colors = {
      todo: bg(byTitle('E')), doing: bg(byTitle('A')), review: bg(byTitle('B')),
      done: bg(byTitle('C')), rejected: bg(byTitle('D')), blocked: bg(byTitle('F')),
    }
    const distinct = new Set(Object.values(colors))
    assert.equal(distinct.size, 6); ok('all 6 statuses produce distinct background colors')
    assert.match(colors.doing, /59,130,246/); ok('doing = blue')
    assert.match(colors.review, /168,85,247/); ok('review = purple')
    assert.match(colors.done, /16,185,129/); ok('done = emerald')
    assert.match(colors.rejected, /239,68,68/); ok('rejected = red')
    assert.match(colors.blocked, /245,158,11/); ok('blocked = amber')

    // 5. blocked badge.
    const fNode = nodes.find(n => n.id === 'task-t6')!
    assert.equal(dataOf(fNode).blocked, true); ok('blocked task carries data.blocked = true')
    assert.match(dataOf(fNode).label as string, /🔒/); ok('blocked task label has the 🔒 badge')
    const aNode = nodes.find(n => n.id === 'task-t1')!
    assert.equal(dataOf(aNode).blocked, false); ok('non-blocked task has data.blocked = false')
    assert.doesNotMatch(dataOf(aNode).label as string, /🔒/); ok('non-blocked task has no 🔒 badge')

    // 6. reviewer chip only while in review.
    const bNode = nodes.find(n => n.id === 'task-t2')!
    assert.equal(dataOf(bNode).reviewer, 'Rex'); ok('review task carries data.reviewer = reviewer name')
    assert.match(dataOf(bNode).label as string, /🛡 Rex/); ok('review task label has the 🛡 reviewer chip')
    assert.equal(dataOf(aNode).reviewer, null); ok('non-review task has no reviewer chip')
  }

  // ── 7: linear regression — empty dependsOn → zero dependency edges ──
  console.log('buildTeamGraph (linear run — no dependency edges)')
  {
    const tasks: GraphTask[] = [
      { id: 't1', title: 'A', status: 'doing', assigneeId: 'WA', dependsOn: [] },
      { id: 't2', title: 'B', status: 'todo', assigneeId: 'WB', dependsOn: [] },
    ]
    const { nodes, edges } = buildTeamGraph(members, tasks, null)
    assert.equal(taskNodes(nodes).length, 2); ok('linear: task nodes still rendered (2)')
    assert.equal(edges.filter(e => e.id.startsWith('d-')).length, 0); ok('linear: zero task→task dependency edges')
    assert.equal(memberNodes(nodes).length, 4); ok('linear: member viz intact (4)')
  }

  // ── stale/dangling dep is skipped (defensive) ──
  console.log('buildTeamGraph (stale dependency skipped)')
  {
    const tasks: GraphTask[] = [
      { id: 't1', title: 'A', status: 'doing', assigneeId: 'WA', dependsOn: ['ghost'] },
    ]
    const { edges } = buildTeamGraph(members, tasks, null)
    assert.equal(edges.filter(e => e.id.startsWith('d-')).length, 0); ok('dangling dep (missing task) produces no edge')
  }

  // ── empty board still renders members ──
  console.log('buildTeamGraph (empty board)')
  {
    const { nodes, edges } = buildTeamGraph(members, [], null)
    assert.equal(taskNodes(nodes).length, 0); ok('empty board: no task nodes')
    assert.equal(memberNodes(nodes).length, 4); ok('empty board: members still drawn')
    assert.ok(edges.length > 0); ok('empty board: member edges present')
  }

  console.log(`\n✅ G4 verify: ${passed} assertions passed`)
  console.log('   (regression: run g1-verify (16) + g2-verify (22) + g3-verify)')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
