// scripts/v22s5-verify.ts
// Local verification for Teams V2.2 — S5 (item 5a): the expanded "Visualizar" graph.
// All enrichment lives in the PURE `buildTeamGraph` (team-graph-view.ts), gated on
// `opts.expanded`. Asserted via tsx — no jest (OneDrive errno -4094).
// Run: npx tsx scripts/v22s5-verify.ts
//
// Required cases (ROADMAP S5 + Sessão 5.md):
//   (a) Gating / regression: WITHOUT `expanded`, passing `usageByMember`/`relations`
//       has ZERO effect — output is deep-equal to the bare compact call, no token
//       suffix on any label, no `rel-` edge. (The compact sidebar stays byte-id.)
//   (b) Member enrichment: `expanded` + `usageByMember` → member label gains the
//       formatted token total (sum per member; null memberId ignored; k/M scaling);
//       a member with no usage keeps its plain label.
//   (c) Task enrichment: `expanded` task label spells out the owner (🛠 name) + a
//       readable status; the reviewer chip still appears for a task in review; an
//       unowned task has no owner chip.
//   (d) Relations: `expanded` + `relations` → exactly ONE `related` edge per
//       unordered pair (symmetric → de-duped, id sorted); `blocks` is NOT drawn
//       (it is the inverse of dependsOn, already a dependency edge).
import assert from 'node:assert/strict'
import { buildTeamGraph, type GraphMember, type GraphTask, type GraphUsage } from '../src/lib/orchestration/team/team-graph-view'
import { deriveTaskRelations } from '../src/lib/orchestration/team/task-relations'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const MEMBERS: GraphMember[] = [
  { id: 'L', role: 'lead', name: 'Ana' },
  { id: 'W1', role: 'worker', name: 'Bia' },
  { id: 'W2', role: 'worker', name: 'Cau' },
  { id: 'R', role: 'reviewer', name: 'Dan' },
]
const TASKS: GraphTask[] = [
  { id: 't1', title: 'Setup', status: 'doing', assigneeId: 'W1', dependsOn: [] },
  { id: 't2', title: 'API', status: 'review', assigneeId: 'W2', dependsOn: ['t1'] },
  { id: 't3', title: 'Docs', status: 'todo', assigneeId: null, dependsOn: [] },
]
// t1 ↔ t3 are cross-linked (related); t2 dependsOn t1 → t1.blocks ∋ t2.
const RELATIONS = deriveTaskRelations([
  { id: 't1', dependsOn: [], related: ['t3'] },
  { id: 't2', dependsOn: ['t1'], related: [] },
  { id: 't3', dependsOn: [], related: [] },
])
const USAGE: GraphUsage[] = [
  { memberId: 'L', tokens: 500 },
  { memberId: 'W1', tokens: 1500 },
  { memberId: 'W1', tokens: 300 },        // summed with the above → 1800
  { memberId: 'R', tokens: 2_500_000 },
  { memberId: null, tokens: 9999 },        // null memberId → ignored
]

type LabelledNode = { id: string; data: { label?: unknown } }
function labelOf(nodes: LabelledNode[], id: string): string {
  const n = nodes.find(x => x.id === id)
  assert.ok(n, `node ${id} present`)
  return String(n!.data.label)
}

function main() {
  // ── (a) gating: no `expanded` → enrichment inert, output unchanged ──
  console.log('(a) sem expanded → usage/relations ignorados; saída idêntica ao compacto')
  {
    const bare = buildTeamGraph(MEMBERS, TASKS, 'W1', { running: true })
    const gated = buildTeamGraph(MEMBERS, TASKS, 'W1', { running: true, usageByMember: USAGE, relations: RELATIONS })
    assert.deepEqual(gated, bare, 'usage/relations sem expanded não mudam o grafo')
    assert.ok(!gated.nodes.some(n => String(n.data.label).includes('tok')), 'nenhum label com token no compacto')
    assert.ok(!gated.edges.some(e => e.id.startsWith('rel-')), 'nenhuma aresta related no compacto')
    ok('(a) flag off → deep-equal ao compacto, sem tokens, sem rel-edges')
  }

  // ── (b) member enrichment: token suffix, summed, scaled; no-usage stays plain ──
  console.log('(b) expanded + usageByMember → tokens no nó do membro (soma, k/M, null ignorado)')
  {
    const g = buildTeamGraph(MEMBERS, TASKS, 'W1', { running: true, expanded: true, usageByMember: USAGE, relations: RELATIONS })
    assert.equal(labelOf(g.nodes, 'L'), '👑 Ana · 500 tok', 'lead 500 → "500 tok"')
    assert.equal(labelOf(g.nodes, 'W1'), '🛠 Bia · 1.8k tok', 'worker somado 1800 → "1.8k tok"')
    assert.equal(labelOf(g.nodes, 'R'), '🛡 Dan · 2.5M tok', 'reviewer 2.5M → "2.5M tok"')
    assert.equal(labelOf(g.nodes, 'W2'), '🛠 Cau', 'membro sem uso → label simples')
    ok('(b) tokens somados/escalados por membro; sem uso = label simples')
  }

  // ── (c) task enrichment: owner chip + status label + reviewer chip in review ──
  console.log('(c) expanded → owner + status no nó da tarefa; chip do reviewer em review')
  {
    const g = buildTeamGraph(MEMBERS, TASKS, 'W1', { running: true, expanded: true, usageByMember: USAGE, relations: RELATIONS })
    assert.equal(labelOf(g.nodes, 'task-t1'), 'Setup · 🛠 Bia · Fazendo', 'tarefa doing com owner')
    assert.equal(labelOf(g.nodes, 'task-t2'), 'API · 🛠 Cau · Review · 🛡 Dan', 'tarefa review com owner + reviewer')
    assert.equal(labelOf(g.nodes, 'task-t3'), 'Docs · A fazer', 'tarefa sem owner → sem chip de owner')
    ok('(c) owner + status legível; chip do reviewer só em review; unowned sem owner')
  }

  // ── (d) related edges: one per pair (deduped), blocks NOT drawn ──
  console.log('(d) expanded + relations → 1 aresta por par related (dedup); blocks não vira aresta')
  {
    const g = buildTeamGraph(MEMBERS, TASKS, 'W1', { running: true, expanded: true, usageByMember: USAGE, relations: RELATIONS })
    const rel = g.edges.filter(e => e.id.startsWith('rel-'))
    assert.equal(rel.length, 1, 'par simétrico t1↔t3 → exatamente uma aresta')
    assert.equal(rel[0].id, 'rel-t1-t3', 'id ordenado (t1<t3)')
    // blocks (t1 blocks t2) is the inverse of dependsOn → must NOT add a rel edge.
    assert.ok(!g.edges.some(e => e.id === 'rel-t1-t2'), 'blocks não desenha aresta related')
    // the dependency it came from is still drawn as a dependency edge.
    assert.ok(g.edges.some(e => e.id === 'd-t1-t2'), 'dependsOn t2→t1 segue como aresta de dependência')
    ok('(d) 1 aresta related deduplicada; blocks fora; dependência preservada')
  }

  console.log(`\n✅ v22s5 verify: ${passed} assertions passed`)
}

main()
