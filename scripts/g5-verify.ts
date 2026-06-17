// scripts/g5-verify.ts
// Local verification for the G5 viz slice (no React Flow / no DOM / no DB).
// Jest can't run on this machine (OneDrive errno -4094), so this script asserts
// the builder contract via tsx. Run: npx tsx scripts/g5-verify.ts
//
// It exercises ONLY the pure `buildTeamGraph(members, tasks, activeId, opts)` 4th
// param (handoff + running):
//   1. assignment handoff Lead→Worker animates the `l-<worker>` edge with the
//      cyan handoff style — and only that edge.
//   2. review handoff Worker→Reviewer animates the `<worker>-r` edge.
//   3. no handoff (and the legacy 3-arg call) → zero handoff-styled edges.
//   4. handoff requires `running` — a handoff with running:false animates nothing.
//   5. the active member carries data.thinking === true while running (and the
//      `rf-thinking` className); non-active members and not-running → false.
//   6. backward-compat: a legacy 3-arg call yields thinking=false everywhere and
//      still builds the G4 task/member nodes (no regression).
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
const tasks: GraphTask[] = [
  { id: 't1', title: 'A', status: 'doing', assigneeId: 'WA', dependsOn: [] },
  { id: 't2', title: 'B', status: 'review', assigneeId: 'WB', dependsOn: [] },
]

const HANDOFF_STROKE = '#22d3ee'
type AnyEdge = { id: string; animated?: boolean; style?: unknown }
type AnyNode = { id: string; data?: unknown; className?: string }
const styleOf = (e: AnyEdge) => (e.style ?? {}) as Record<string, unknown>
const isHandoffStyled = (e: AnyEdge) => styleOf(e).stroke === HANDOFF_STROKE
const dataOf = (n: AnyNode) => (n.data ?? {}) as Record<string, unknown>
const memberNodes = (nodes: AnyNode[]) => nodes.filter(n => dataOf(n).kind === 'member')

async function main() {
  // ── 1: assignment handoff Lead→Worker animates l-<worker> (and only it) ──
  console.log('buildTeamGraph (assignment handoff Lead→Worker)')
  {
    const { edges } = buildTeamGraph(members, tasks, 'WA', {
      handoff: { fromMemberId: 'L', toMemberId: 'WA' }, running: true,
    })
    const lWA = edges.find(e => e.id === 'l-WA') as AnyEdge
    assert.ok(lWA && lWA.animated === true && isHandoffStyled(lWA)); ok('l-WA is animated with the handoff style')
    assert.equal(edges.filter(isHandoffStyled).length, 1); ok('exactly one edge carries the handoff style')
    const lWB = edges.find(e => e.id === 'l-WB') as AnyEdge
    assert.ok(!isHandoffStyled(lWB)); ok('the other worker edge (l-WB) is NOT handoff-styled')
    const waR = edges.find(e => e.id === 'WA-r') as AnyEdge
    assert.ok(!isHandoffStyled(waR)); ok('worker→reviewer edge is NOT handoff-styled on an assignment')
  }

  // ── 2: review handoff Worker→Reviewer animates <worker>-r ──
  console.log('buildTeamGraph (review handoff Worker→Reviewer)')
  {
    const { edges } = buildTeamGraph(members, tasks, 'WB', {
      handoff: { fromMemberId: 'WB', toMemberId: 'R' }, running: true,
    })
    const wbR = edges.find(e => e.id === 'WB-r') as AnyEdge
    assert.ok(wbR && wbR.animated === true && isHandoffStyled(wbR)); ok('WB-r is animated with the handoff style')
    assert.equal(edges.filter(isHandoffStyled).length, 1); ok('exactly one edge carries the handoff style (review)')
    const lWB = edges.find(e => e.id === 'l-WB') as AnyEdge
    assert.ok(!isHandoffStyled(lWB)); ok('lead→worker edge is NOT handoff-styled on a review')
  }

  // ── 3: no handoff → zero handoff-styled edges (regression) ──
  console.log('buildTeamGraph (no handoff)')
  {
    const { edges: running } = buildTeamGraph(members, tasks, 'WA', { running: true })
    assert.equal(running.filter(isHandoffStyled).length, 0); ok('running without a handoff → no handoff-styled edge')
    const { edges: legacy } = buildTeamGraph(members, tasks, 'WA')
    assert.equal(legacy.filter(isHandoffStyled).length, 0); ok('legacy 3-arg call → no handoff-styled edge')
  }

  // ── 4: handoff requires running ──
  console.log('buildTeamGraph (handoff ignored when not running)')
  {
    const { edges } = buildTeamGraph(members, tasks, 'WA', {
      handoff: { fromMemberId: 'L', toMemberId: 'WA' }, running: false,
    })
    assert.equal(edges.filter(isHandoffStyled).length, 0); ok('handoff with running:false animates nothing')
  }

  // ── 5: thinking state on the active member while running ──
  console.log('buildTeamGraph (active member thinking)')
  {
    const { nodes } = buildTeamGraph(members, tasks, 'WA', { running: true })
    const wa = nodes.find(n => n.id === 'WA') as AnyNode
    assert.equal(dataOf(wa).thinking, true); ok('active member carries data.thinking === true while running')
    assert.equal((wa as AnyNode).className, 'rf-thinking'); ok('active member gets the rf-thinking className')
    const wb = nodes.find(n => n.id === 'WB') as AnyNode
    assert.equal(dataOf(wb).thinking, false); ok('non-active member has data.thinking === false')
    assert.notEqual((wb as AnyNode).className, 'rf-thinking'); ok('non-active member has no rf-thinking className')

    const { nodes: notRunning } = buildTeamGraph(members, tasks, 'WA', { running: false })
    const waOff = notRunning.find(n => n.id === 'WA') as AnyNode
    assert.equal(dataOf(waOff).thinking, false); ok('active id but not running → thinking false')
  }

  // ── 6: backward-compat — legacy 3-arg yields no thinking + G4 nodes intact ──
  console.log('buildTeamGraph (legacy 3-arg backward-compat)')
  {
    const { nodes } = buildTeamGraph(members, tasks, 'WA')
    assert.ok(memberNodes(nodes).every(n => dataOf(n).thinking === false)); ok('legacy call → thinking false on every member')
    assert.equal(memberNodes(nodes).length, 4); ok('legacy call → all 4 member nodes still built (no regression)')
    assert.equal(nodes.filter(n => dataOf(n).kind === 'task').length, 2); ok('legacy call → task nodes still built (no regression)')
  }

  console.log(`\n✅ G5 verify: ${passed} assertions passed`)
  console.log('   (regression: run g4-verify (32) + g1 (16) + g2 (22) + g3 (18) + g4_1 (20))')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
