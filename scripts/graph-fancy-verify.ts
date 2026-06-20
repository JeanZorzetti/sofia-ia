// scripts/graph-fancy-verify.ts
// Local verification for the "Visualizar" enriched graph builder (no React Flow /
// no DOM / no DB). Jest can't run on this machine (OneDrive errno -4094), so this
// asserts the pure `buildFancyTeamGraph` contract via tsx.
//   Run: npx tsx scripts/graph-fancy-verify.ts
//
// Covers: custom node types + counts, member role/active/thinking + token label,
// task status/blocked/statusLabel + reviewer chip, the live handoff becoming a
// `type:'handoff'` edge (and only it), dependency + related edges, and that no
// handoff edge appears without `running`.
import assert from 'node:assert/strict'
import {
  buildFancyTeamGraph, GRAPH_COLORS,
  type GraphMember, type GraphTask, type GraphRelations,
} from '../src/lib/orchestration/team/team-graph-fancy'

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
  { id: 't2', title: 'B', status: 'review', assigneeId: 'WB', dependsOn: ['t1'] },
  { id: 't3', title: 'C', status: 'blocked', assigneeId: 'WA', dependsOn: ['t2'] },
]

type AnyNode = { id: string; type?: string; data?: Record<string, unknown> }
type AnyEdge = { id: string; type?: string; source: string; target: string; animated?: boolean; style?: Record<string, unknown> }
const dataOf = (n: AnyNode) => (n.data ?? {}) as Record<string, unknown>
const styleOf = (e: AnyEdge) => (e.style ?? {}) as Record<string, unknown>
const memberNodes = (ns: AnyNode[]) => ns.filter(n => n.type === 'member')
const taskNodes = (ns: AnyNode[]) => ns.filter(n => n.type === 'task')

async function main() {
  // ── 1: member nodes ──
  console.log('buildFancyTeamGraph (member nodes)')
  {
    const { nodes } = buildFancyTeamGraph(members, tasks, 'WA', { running: true })
    assert.equal(memberNodes(nodes).length, 4); ok('one member node per member')
    const lead = nodes.find(n => n.id === 'L') as AnyNode
    assert.equal(lead.type, 'member'); assert.equal(dataOf(lead).role, 'lead'); ok('lead node carries role=lead')
    const wa = nodes.find(n => n.id === 'WA') as AnyNode
    assert.equal(dataOf(wa).active, true); assert.equal(dataOf(wa).thinking, true); ok('active member is active + thinking while running')
    const wb = nodes.find(n => n.id === 'WB') as AnyNode
    assert.equal(dataOf(wb).active, false); assert.equal(dataOf(wb).thinking, false); ok('non-active member is neither active nor thinking')
  }

  // ── 2: task nodes ──
  console.log('buildFancyTeamGraph (task nodes)')
  {
    const { nodes } = buildFancyTeamGraph(members, tasks, null)
    assert.equal(taskNodes(nodes).length, 3); ok('one task node per task')
    const t3 = nodes.find(n => n.id === 'task-t3') as AnyNode
    assert.equal(t3.type, 'task'); assert.equal(dataOf(t3).blocked, true); ok('blocked task flags data.blocked')
    assert.equal(dataOf(t3).statusLabel, 'Bloqueado'); ok('status label is humanized (Bloqueado)')
    const t2 = nodes.find(n => n.id === 'task-t2') as AnyNode
    assert.equal(dataOf(t2).reviewerName, 'Rex'); ok('task in review shows the reviewer chip name')
    assert.equal(dataOf(t2).ownerName, 'Bob'); ok('task carries its owner name')
  }

  // ── 3: live handoff becomes a `type:'handoff'` edge (and only it) ──
  console.log('buildFancyTeamGraph (handoff pulse edge)')
  {
    const { edges } = buildFancyTeamGraph(members, tasks, 'WA', {
      handoff: { fromMemberId: 'L', toMemberId: 'WA' }, running: true,
    })
    const handoffEdges = (edges as AnyEdge[]).filter(e => e.type === 'handoff')
    assert.equal(handoffEdges.length, 1); ok('exactly one handoff edge')
    assert.equal(handoffEdges[0].id, 'l-WA'); ok('the handoff edge is the live Lead→Worker edge (l-WA)')
  }

  // ── 4: no handoff edge without running (or without a handoff) ──
  console.log('buildFancyTeamGraph (no handoff)')
  {
    const { edges: notRunning } = buildFancyTeamGraph(members, tasks, 'WA', {
      handoff: { fromMemberId: 'L', toMemberId: 'WA' }, running: false,
    })
    assert.equal((notRunning as AnyEdge[]).filter(e => e.type === 'handoff').length, 0); ok('handoff with running:false → no handoff edge')
    const { edges: legacy } = buildFancyTeamGraph(members, tasks, 'WA')
    assert.equal((legacy as AnyEdge[]).filter(e => e.type === 'handoff').length, 0); ok('no opts → no handoff edge')
  }

  // ── 5: dependency edges from dependsOn (amber dashed) ──
  console.log('buildFancyTeamGraph (dependency edges)')
  {
    const { edges } = buildFancyTeamGraph(members, tasks, null)
    const dep = (edges as AnyEdge[]).find(e => e.id === 'd-t1-t2') as AnyEdge
    assert.ok(dep && dep.source === 'task-t1' && dep.target === 'task-t2'); ok('dependency edge points dep → dependent task')
    assert.equal(styleOf(dep).stroke, GRAPH_COLORS.depend); assert.equal(dep.animated, true); ok('dependency edge is amber + animated')
    // a dangling dep id must be skipped
    const dangling = buildFancyTeamGraph(members, [{ id: 'x', title: 'X', status: 'todo', assigneeId: 'WA', dependsOn: ['nope'] }], null)
    assert.equal((dangling.edges as AnyEdge[]).filter(e => e.id.startsWith('d-')).length, 0); ok('dangling dependency id is skipped')
  }

  // ── 6: related cross-links (symmetric, de-duped) ──
  console.log('buildFancyTeamGraph (related cross-links)')
  {
    const relations = new Map<string, GraphRelations>([
      ['t1', { blocks: [], related: ['t2'] }],
      ['t2', { blocks: [], related: ['t1'] }], // symmetric — must collapse to ONE edge
    ])
    const { edges } = buildFancyTeamGraph(members, tasks, null, { relations })
    const rel = (edges as AnyEdge[]).filter(e => e.id.startsWith('rel-'))
    assert.equal(rel.length, 1); ok('symmetric related pair de-dupes to a single edge')
    assert.equal(styleOf(rel[0]).stroke, GRAPH_COLORS.related); ok('related edge uses the violet style')
    const { edges: none } = buildFancyTeamGraph(members, tasks, null)
    assert.equal((none as AnyEdge[]).filter(e => e.id.startsWith('rel-')).length, 0); ok('no relations map → no related edges')
  }

  // ── 7: token label on members when usage is provided ──
  console.log('buildFancyTeamGraph (token labels)')
  {
    const { nodes } = buildFancyTeamGraph(members, tasks, null, {
      usageByMember: [{ memberId: 'WA', tokens: 12_345 }, { memberId: 'WA', tokens: 1_000 }],
    })
    const wa = nodes.find(n => n.id === 'WA') as AnyNode
    assert.equal(dataOf(wa).tokensLabel, '13.3k tok'); ok('per-member token totals are summed + formatted')
    const wb = nodes.find(n => n.id === 'WB') as AnyNode
    assert.equal(dataOf(wb).tokensLabel, null); ok('member without usage has null token label')
  }

  console.log(`\n✅ graph-fancy verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
