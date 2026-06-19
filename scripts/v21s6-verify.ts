// scripts/v21s6-verify.ts
// Local verification for Teams V2.1 — fatia S3.2 (Tema F2): task relations
// `blocks` (DERIVED inverse of dependsOn) + `related` (persisted free cross-link,
// shown symmetrically). The DECISION logic lives in PURE helpers:
//   • task-relations.ts  — deriveTaskRelations (blocks + symmetric related)
//   • team-protocol.ts   — parseLeadActions parses `@TASK [related:#n]`
//   • team-board.ts      — depsSatisfied (the DAG gate — must IGNORE relations)
// Asserted via tsx — no jest (OneDrive errno -4094). Run: npx tsx scripts/v21s6-verify.ts
//
// Required cases (from ROADMAP S3.2 + Sessão 7.md, line 48):
//   (a) blocks is the correct inverse of dependsOn.
//   (b) related is the symmetric union (declared ∪ back-pointing); self/dangling dropped.
//   (c) a relation-free board → every entry EMPTY (regression: legacy card unchanged).
//   (d) parser: `@TASK [related:#n]` → LeadAction.related; coexists with [after:]/[worker:].
//   (e) DAG UNCHANGED: depsSatisfied gates on dependsOn alone — `related` never affects it.
import assert from 'node:assert/strict'
import { deriveTaskRelations, relationsFor } from '../src/lib/orchestration/team/task-relations'
import { parseLeadActions } from '../src/lib/orchestration/team/team-protocol'
import { depsSatisfied } from '../src/lib/orchestration/team/team-board'
import type { TaskRow } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const sorted = (a: string[]) => [...a].sort()

/** Minimal TaskRow builder (mirrors the other graph verify scripts). */
function mk(id: string, over: Partial<TaskRow> = {}): TaskRow {
  return {
    id, title: id, body: null, status: 'todo', assigneeId: null, result: null,
    reviewNote: null, retryCount: 0, position: 0, dependsOn: [], ...over,
  }
}

function main() {
  // ── (a) blocks = inverse of dependsOn ──
  console.log('(a) blocks é o inverso exato de dependsOn')
  {
    // a→(nothing); b depends on a; c depends on a,b. So a.blocks={b,c}, b.blocks={c}, c.blocks={}.
    const tasks = [
      { id: 'a', dependsOn: [], related: [] },
      { id: 'b', dependsOn: ['a'], related: [] },
      { id: 'c', dependsOn: ['a', 'b'], related: [] },
    ]
    const m = deriveTaskRelations(tasks)
    assert.deepEqual(sorted(relationsFor(m, 'a').blocks), ['b', 'c'], 'a bloqueia b e c')
    assert.deepEqual(relationsFor(m, 'b').blocks, ['c'], 'b bloqueia c')
    assert.deepEqual(relationsFor(m, 'c').blocks, [], 'c não bloqueia ninguém')
    // related stays empty when no cross-links declared.
    assert.deepEqual(relationsFor(m, 'a').related, [], 'sem related declarado → []')
    ok('(a) deriveTaskRelations inverte dependsOn corretamente em blocks')
  }

  // ── (b) related = symmetric union; self-ref + dangling dropped ──
  console.log('(b) related é simétrico (declarado ∪ apontado); self/dangling caem fora')
  {
    // a declares related:[b]; the link must surface on BOTH a and b.
    // a also declares related to itself (ignored) and to 'ghost' (not on board → dropped).
    const tasks = [
      { id: 'a', dependsOn: [], related: ['b', 'a', 'ghost'] },
      { id: 'b', dependsOn: [], related: [] },
      { id: 'c', dependsOn: [], related: ['a'] }, // c→a: a must also see c
    ]
    const m = deriveTaskRelations(tasks)
    assert.deepEqual(sorted(relationsFor(m, 'a').related), ['b', 'c'], 'a vê b (declarado) e c (apontando de volta)')
    assert.deepEqual(relationsFor(m, 'b').related, ['a'], 'b vê a mesmo sem declarar (simetria)')
    assert.deepEqual(relationsFor(m, 'c').related, ['a'], 'c vê a')
    assert.ok(!relationsFor(m, 'a').related.includes('a'), 'self-relation é ignorada')
    assert.ok(!relationsFor(m, 'a').related.includes('ghost'), 'relação dangling (id fora do board) é descartada')
    // dangling dependency is likewise ignored for blocks (no phantom entries).
    ok('(b) related é a união simétrica; self e dangling não geram chip')
  }

  // ── (c) regression: relation-free board → every entry EMPTY ──
  console.log('(c) board sem relações → toda entrada vazia (regressão: card legado)')
  {
    const tasks = [
      { id: 'x', dependsOn: [], related: [] },
      { id: 'y', dependsOn: [], related: [] },
    ]
    const m = deriveTaskRelations(tasks)
    assert.deepEqual(relationsFor(m, 'x'), { blocks: [], related: [] }, 'x sem relações')
    assert.deepEqual(relationsFor(m, 'y'), { blocks: [], related: [] }, 'y sem relações')
    // empty board → empty map; unknown id → EMPTY via relationsFor.
    const empty = deriveTaskRelations([])
    assert.equal(empty.size, 0, 'board vazio → mapa vazio')
    assert.deepEqual(relationsFor(empty, 'nope'), { blocks: [], related: [] }, 'id desconhecido → EMPTY')
    ok('(c) board sem relações renderiza zero chips (legado byte-equivalente)')
  }

  // ── (d) parser: @TASK [related:#n] → LeadAction.related ──
  console.log('(d) parser reconhece [related:#n] e convive com [after:]/[worker:]')
  {
    const single = parseLeadActions('@TASK [related:#2] Documentar API')
    assert.equal(single[0].type, 'task')
    assert.deepEqual(single[0].related, [2], 'um único [related:#2]')
    assert.equal(single[0].title, 'Documentar API', 'o título sobra limpo')
    assert.equal(single[0].dependsOn, undefined, 'sem [after:] → dependsOn ausente')

    const multi = parseLeadActions('@TASK [worker:Ana] [after:#1] [related:#1,#3] Build')
    assert.deepEqual(multi[0].dependsOn, [1], '[after:#1] vira dependsOn')
    assert.deepEqual(multi[0].related, [1, 3], '[related:#1,#3] vira related')
    assert.deepEqual(multi[0].assignTo, { kind: 'name', value: 'Ana' }, '[worker:Ana] continua sendo o alvo')
    assert.equal(multi[0].title, 'Build', 'título limpo após três diretivas')

    const none = parseLeadActions('@TASK [worker:Bob] Tarefa simples')
    assert.equal(none[0].related, undefined, 'sem [related:] → a chave não existe (legado)')
    ok('(d) [related:#n] (único/múltiplo) parseia e coexiste com as diretivas existentes')
  }

  // ── (e) DAG UNCHANGED: depsSatisfied ignores `related` entirely ──
  console.log('(e) depsSatisfied gateia só por dependsOn — related não muda o agendamento')
  {
    const depPending = [mk('dep', { status: 'doing' }), mk('a', { dependsOn: ['dep'] })]
    const depDone = [mk('dep', { status: 'done' }), mk('a', { dependsOn: ['dep'] })]
    assert.equal(depsSatisfied(depPending[1], depPending), false, 'dep não-done → não pode rodar')
    assert.equal(depsSatisfied(depDone[1], depDone), true, 'dep done → pode rodar')

    // Adding a `related` set to BOTH the task and its dependency must not change the gate.
    const withRel = [
      mk('dep', { status: 'doing', related: ['a'] }),
      mk('a', { dependsOn: ['dep'], related: ['dep', 'ghost'] }),
    ]
    assert.equal(depsSatisfied(withRel[1], withRel), false, 'related não destrava um dep pendente')

    // A task whose ONLY relation is `related` (no dependsOn) is always runnable —
    // related never gates, exactly like a relation-free task.
    const relOnly = [mk('a', { related: ['b'] }), mk('b', { status: 'todo' })]
    assert.equal(depsSatisfied(relOnly[0], relOnly), true, 'só related (sem dependsOn) → sempre satisfeito')
    ok('(e) related/blocks são DISPLAY-only; a agenda/DAG segue idêntica')
  }

  console.log(`\n✅ v21s6 verify: ${passed} assertions passed`)
}

main()
