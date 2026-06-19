// scripts/v22s4-verify.ts
// Local verification for Teams V2.2 — S4 (item 4): mid-run human steering messages.
// The surfacing logic lives in the PURE `buildLeadContext` (team-prompts.ts): a
// `kind:'user'` message becomes a block BETWEEN the board and the protocol; with no
// such message the context is byte-identical to the legacy one. Asserted via tsx —
// no jest (OneDrive errno -4094).
// Run: npx tsx scripts/v22s4-verify.ts
//
// Required cases (ROADMAP S4 + Sessão 4.md):
//   (a) Regression: NO `kind:'user'` message (empty log OR only message/assignment/
//       review kinds) → no steering heading; board stays adjacent to the protocol.
//   (b) Block present + content: `kind:'user'` messages render under the heading, one
//       trimmed bullet each, in array order.
//   (c) Position: the steering block sits AFTER the board and BEFORE the protocol,
//       with the exact board→steering adjacency (proves the splice point).
//   (d) Only `kind:'user'` triggers it; the heading constant is the agreed string.
import assert from 'node:assert/strict'
import { buildLeadContext, USER_STEERING_HEADING } from '../src/lib/orchestration/team/team-prompts'
import type { MemberCtx, MessageRow, TaskRow } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const MISSION = 'Lançar a landing page'
const MEMBERS: MemberCtx[] = [
  { id: 'L', agentId: 'a1', agentName: 'Ana', role: 'lead', model: null, effort: null },
  { id: 'W', agentId: 'a2', agentName: 'Bia', role: 'worker', model: null, effort: null },
]
const NO_TASKS: TaskRow[] = []
const BOARD_EMPTY = '## Estado atual do board\nBoard vazio (nenhuma tarefa criada ainda).'
const STEER_H = `## ${USER_STEERING_HEADING}`

let seq = 0
function msg(kind: MessageRow['kind'], content: string): MessageRow {
  return { id: `m${seq++}`, fromMemberId: null, toMemberId: null, summary: null, content, kind, taskId: null }
}

function main() {
  // ── (d') heading constant ──
  assert.equal(USER_STEERING_HEADING, 'Mensagens do usuário durante a execução')

  // ── (a) regression: no user message → no steering block ──
  console.log('(a) sem mensagem kind:user → sem bloco; board encostado no protocolo (legado)')
  {
    const empty = buildLeadContext(MISSION, NO_TASKS, [], MEMBERS)
    assert.ok(!empty.includes(USER_STEERING_HEADING), 'log vazio não cria heading')
    // Byte-identical adjacency: board section immediately precedes the protocol.
    assert.ok(empty.includes(`${BOARD_EMPTY}\n\n## Protocolo de resposta`), 'board → protocolo direto (log vazio)')

    // Only non-user kinds present → still no steering block.
    const noisy = buildLeadContext(MISSION, NO_TASKS, [msg('message', 'oi'), msg('assignment', 'faça X'), msg('review', '@APPROVE')], MEMBERS)
    assert.ok(!noisy.includes(USER_STEERING_HEADING), 'message/assignment/review não disparam o bloco')
    assert.ok(noisy.includes(`${BOARD_EMPTY}\n\n## Protocolo de resposta`), 'board → protocolo direto (kinds não-user)')
    ok('(a) log vazio / só kinds não-user → sem heading, board adjacente ao protocolo')
  }

  // ── (b) block present + content + order + trim ──
  console.log('(b) mensagens kind:user → bloco com bullet trimado por mensagem, na ordem')
  {
    const out = buildLeadContext(
      MISSION, NO_TASKS,
      [msg('user', '  foca no SEO primeiro  '), msg('message', 'barulho'), msg('user', 'depois a conversão')],
      MEMBERS,
    )
    assert.ok(out.includes(STEER_H), 'heading presente quando há kind:user')
    assert.ok(out.includes('- foca no SEO primeiro'), 'conteúdo 1 trimado como bullet')
    assert.ok(out.includes('- depois a conversão'), 'conteúdo 2 como bullet')
    // Order follows the message array.
    assert.ok(out.indexOf('- foca no SEO primeiro') < out.indexOf('- depois a conversão'), 'ordem preservada')
    // The non-user message is NOT promoted into the steering block.
    assert.ok(!out.includes('- barulho'), 'mensagem não-user fora do bloco de steering')
    ok('(b) heading + bullets trimados na ordem; não-user fica de fora')
  }

  // ── (c) position: board → steering → protocol, exact splice ──
  console.log('(c) bloco entre board e protocolo, na junção exata')
  {
    const out = buildLeadContext(MISSION, NO_TASKS, [msg('user', 'use tom formal')], MEMBERS)
    const iBoard = out.indexOf('## Estado atual do board')
    const iSteer = out.indexOf(STEER_H)
    const iProto = out.indexOf('## Protocolo de resposta')
    assert.ok(iBoard >= 0 && iSteer >= 0 && iProto >= 0, 'as três seções presentes')
    assert.ok(iBoard < iSteer && iSteer < iProto, 'board < steering < protocolo')
    // Exact adjacency at the splice point (board snapshot → steering heading).
    assert.ok(out.includes(`${BOARD_EMPTY}\n\n${STEER_H}\n- use tom formal`), 'junção board → steering exata')
    ok('(c) board < steering < protocolo; junção exata')
  }

  console.log(`\n✅ v22s4 verify: ${passed} assertions passed`)
}

main()
