// scripts/v21s5-verify.ts
// Local verification for Teams V2.1 — fatia S3.1 (Tema F1): per-member `workflow`
// instruction concatenated onto the Agent's system prompt ONLY within its team.
// The DECISION (concat / regression) lives in the PURE helper member-workflow.ts;
// the front-end serialization lives in roster-mapping.ts. This script asserts both
// via tsx — no jest (OneDrive errno -4094).
// Run: npx tsx scripts/v21s5-verify.ts
//
// Required cases (from ROADMAP S3.1 + Sessão 6.md, line 49):
//   (a) workflow present → appears CONCATENATED after the base prompt (via the helper).
//   (b) workflow null/empty/whitespace → prompt BYTE-IDENTICAL to agent.systemPrompt (regression).
//   (c) the runtime member/options types carry `workflow` (type-level + roundtrip).
//   (d) roster-mapping (front-end): rosterToMembers emits `workflow` only when non-empty
//       (trimmed); an untouched member serializes WITHOUT the key (legacy byte-identical).
import assert from 'node:assert/strict'
import { appendMemberWorkflow, MEMBER_WORKFLOW_HEADING } from '../src/lib/orchestration/team/member-workflow'
import { rosterToMembers, INHERIT, type RosterRow } from '../src/app/dashboard/teams/roster-mapping'
import type { MemberCtx, ChatOptions } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const BASE = 'Você é um agente especialista.\n\nSiga as regras do produto.'

function main() {
  // ── (a) workflow present → concatenated after the base prompt ──
  console.log('(a) workflow presente → aparece concatenado depois da base')
  {
    const wf = 'Sempre cite fontes e entregue em bullets curtos.'
    const out = appendMemberWorkflow(BASE, wf)

    assert.notEqual(out, BASE, 'a workflow muda o prompt')
    assert.ok(out.startsWith(BASE), 'a base é preservada como prefixo (workflow vem DEPOIS)')
    assert.ok(out.includes(MEMBER_WORKFLOW_HEADING), 'o bloco traz o heading do workflow')
    assert.ok(out.includes(wf), 'o texto do workflow aparece literal')
    assert.equal(out, `${BASE}\n\n${MEMBER_WORKFLOW_HEADING}\n${wf}`, 'formato exato do bloco')
    ok('(a) workflow não-vazio é anexado após a base com o heading correto')
  }

  // ── (b) regression: null/empty/whitespace → byte-identical to the base ──
  console.log('(b) workflow nulo/vazio/whitespace → prompt byte-idêntico à base (regressão)')
  {
    assert.equal(appendMemberWorkflow(BASE, null), BASE, 'null → inalterado')
    assert.equal(appendMemberWorkflow(BASE, undefined), BASE, 'undefined → inalterado')
    assert.equal(appendMemberWorkflow(BASE, ''), BASE, 'string vazia → inalterado')
    assert.equal(appendMemberWorkflow(BASE, '   '), BASE, 'só espaços → inalterado')
    assert.equal(appendMemberWorkflow(BASE, '\n\t  \n'), BASE, 'só whitespace → inalterado')
    // strict ===, no hidden mutation of the base.
    assert.ok(appendMemberWorkflow(BASE, null) === BASE)
    ok('(b) ausente/vazio/whitespace mantém o systemPrompt exatamente como o do Agent')
  }

  // ── (c) types carry workflow + the coordinator roundtrip (member → opts) ──
  console.log('(c) tipos runtime carregam workflow (member → ChatOptions → helper)')
  {
    // Constructing these proves the field exists on both interfaces (compile-time);
    // the coordinator does exactly `workflow: member.workflow` at every call-site.
    const member: MemberCtx = {
      id: 'm1', agentId: 'a1', agentName: 'Pesquisador', role: 'worker',
      model: null, effort: null, capabilities: null, workflow: 'Use tom formal.',
    }
    const opts: ChatOptions = { model: member.model, effort: member.effort, workflow: member.workflow }
    // The same value that the loader read flows into chatWithAgent's consumption.
    const prompt = appendMemberWorkflow(BASE, opts.workflow)
    assert.ok(prompt.includes('Use tom formal.'), 'o workflow do membro chega ao prompt via opts')

    // a member WITHOUT a workflow (legacy) is byte-identical.
    const legacy: MemberCtx = {
      id: 'm2', agentId: 'a2', agentName: 'Legacy', role: 'lead',
      model: null, effort: null,
    }
    assert.equal(appendMemberWorkflow(BASE, (legacy as MemberCtx).workflow), BASE, 'membro legado = prompt do Agent puro')
    ok('(c) MemberCtx/ChatOptions carregam workflow; membro legado degrada ao prompt base')
  }

  // ── (d) front-end serialization: only non-empty workflows reach the payload ──
  console.log('(d) roster-mapping: só workflow não-vazio (trimado) vira chave no payload')
  {
    const rows: RosterRow[] = [
      { agentId: 'a1', role: 'lead', model: INHERIT, effort: INHERIT },                       // legacy: no workflow
      { agentId: 'a2', role: 'worker', model: INHERIT, effort: INHERIT, workflow: '  Cite fontes.  ' }, // trims
      { agentId: 'a3', role: 'worker', model: INHERIT, effort: INHERIT, workflow: '   ' },     // whitespace → omit
    ]
    const payload = rosterToMembers(rows)

    // legacy member serializes WITHOUT the key (byte-identical to pre-S3.1).
    assert.ok(!('workflow' in payload[0]), 'membro sem workflow não carrega a chave (legado)')
    // non-empty workflow is emitted, TRIMMED.
    assert.equal(payload[1].workflow, 'Cite fontes.', 'workflow não-vazio é emitido e trimado')
    // whitespace-only collapses to "no key".
    assert.ok(!('workflow' in payload[2]), 'workflow só-whitespace não vira chave')
    ok('(d) rosterToMembers emite workflow só quando há instrução real (trimada)')
  }

  console.log(`\n✅ v21s5 verify: ${passed} assertions passed`)
}

main()
