// scripts/v22s3-verify.ts
// Local verification for Teams V2.2 — S3 (item 3): TEAM-wide system prompt. The
// concat/read logic lives in PURE helpers (team-system-prompt.ts + team-config-ui.ts);
// this asserts them via tsx — no jest (OneDrive errno -4094).
// Run: npx tsx scripts/v22s3-verify.ts
//
// Required cases (ROADMAP S3 + Sessão 3.md):
//   (a) appendTeamSystemPrompt: ''/null/undefined/whitespace → base UNCHANGED (regression);
//       non-empty → base + "\n\n## Diretrizes do time\n<trimmed>".
//   (b) readTeamSystemPrompt: reads config.systemPrompt (trimmed); missing/non-string/
//       empty/whitespace/non-object → null.
//   (c) stack order agente → time → workflow: applying team THEN workflow yields both
//       blocks in that order; empty team + empty workflow → byte-identical to agent prompt.
//   (d) buildTeamConfig + systemPromptOf: systemPrompt persists WITHOUT erasing existing
//       config keys (outputWebhooks/schedules), and is DROPPED when empty; roundtrip read.
import assert from 'node:assert/strict'
import {
  appendTeamSystemPrompt,
  readTeamSystemPrompt,
  TEAM_SYSTEM_PROMPT_HEADING,
} from '../src/lib/orchestration/team/team-system-prompt'
import { appendMemberWorkflow, MEMBER_WORKFLOW_HEADING } from '../src/lib/orchestration/team/member-workflow'
import { buildTeamConfig, systemPromptOf } from '../src/lib/orchestration/team/team-config-ui'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

function main() {
  const base = 'Você é um agente de vendas.'
  const team = 'Tom cordial. Nunca prometa prazos. PT-BR sempre.'

  // ── (a) appendTeamSystemPrompt — concat + regression ──
  console.log('(a) appendTeamSystemPrompt concatena com cabeçalho; vazio → inalterado')
  {
    // Absent / null / undefined / whitespace → base byte-identical (legacy).
    assert.equal(appendTeamSystemPrompt(base, ''), base)
    assert.equal(appendTeamSystemPrompt(base, null), base)
    assert.equal(appendTeamSystemPrompt(base, undefined), base)
    assert.equal(appendTeamSystemPrompt(base, '   \n\t  '), base)
    // Non-empty → heading + trimmed text appended.
    assert.equal(appendTeamSystemPrompt(base, team), `${base}\n\n${TEAM_SYSTEM_PROMPT_HEADING}\n${team}`)
    assert.equal(TEAM_SYSTEM_PROMPT_HEADING, '## Diretrizes do time')
    // Surrounding whitespace is trimmed off the injected text.
    assert.equal(appendTeamSystemPrompt(base, `  ${team}  `), `${base}\n\n${TEAM_SYSTEM_PROMPT_HEADING}\n${team}`)
    ok('(a) ""/null/undefined/whitespace → base; texto → "\\n\\n## Diretrizes do time\\n<trim>"')
  }

  // ── (b) readTeamSystemPrompt — pure config reader ──
  console.log('(b) readTeamSystemPrompt lê config.systemPrompt; ausente/inválido → null')
  {
    assert.equal(readTeamSystemPrompt({ systemPrompt: team }), team)
    assert.equal(readTeamSystemPrompt({ systemPrompt: `  ${team}  ` }), team, 'trim no read')
    // Missing / empty / whitespace / wrong type / non-object → null (legacy: no block).
    assert.equal(readTeamSystemPrompt({}), null)
    assert.equal(readTeamSystemPrompt({ systemPrompt: '' }), null)
    assert.equal(readTeamSystemPrompt({ systemPrompt: '   ' }), null)
    assert.equal(readTeamSystemPrompt({ systemPrompt: 123 }), null)
    assert.equal(readTeamSystemPrompt({ repoUrl: 'x' }), null, 'outras keys → null')
    assert.equal(readTeamSystemPrompt(null), null)
    assert.equal(readTeamSystemPrompt(undefined), null)
    assert.equal(readTeamSystemPrompt('not an object'), null)
    ok('(b) lê+trim; missing/empty/whitespace/non-string/non-object → null')
  }

  // ── (c) stack order agente → time → workflow + full regression ──
  console.log('(c) ordem agente → time → workflow; vazios → prompt byte-idêntico ao agente')
  {
    const workflow = 'Sempre confirme o orçamento antes de fechar.'
    // chatWithAgent applies team THEN workflow (groq.ts), so the team block comes first.
    let p = base
    p = appendTeamSystemPrompt(p, team)
    p = appendMemberWorkflow(p, workflow)
    const expected = `${base}\n\n${TEAM_SYSTEM_PROMPT_HEADING}\n${team}\n\n${MEMBER_WORKFLOW_HEADING}\n${workflow}`
    assert.equal(p, expected)
    // The team heading appears BEFORE the workflow heading.
    assert.ok(p.indexOf(TEAM_SYSTEM_PROMPT_HEADING) < p.indexOf(MEMBER_WORKFLOW_HEADING), 'time antes do workflow')
    // REGRESSION: no team + no workflow → agent prompt unchanged (a team without a
    // configured prompt runs exactly as before this slice).
    let legacy = base
    legacy = appendTeamSystemPrompt(legacy, null)
    legacy = appendMemberWorkflow(legacy, null)
    assert.equal(legacy, base, 'sem time + sem workflow = prompt do agente intacto')
    // Team set but no workflow → only the team block.
    assert.equal(appendMemberWorkflow(appendTeamSystemPrompt(base, team), null), `${base}\n\n${TEAM_SYSTEM_PROMPT_HEADING}\n${team}`)
    ok('(c) time antes do workflow; ambos vazios → byte-idêntico ao agente')
  }

  // ── (d) buildTeamConfig + systemPromptOf — UI shaping persists/preserves/drops ──
  console.log('(d) buildTeamConfig persiste systemPrompt sem apagar outras keys; vazio → dropa')
  {
    // Existing config carries unrelated keys (SP2 outputWebhooks + SP3 schedules + repo).
    const existing = { outputWebhooks: [{ url: 'https://x' }], schedules: ['daily'], repoUrl: 'github.com/o/r', topology: 'graph', maxParallel: 3 }
    const merged = buildTeamConfig(existing, { systemPrompt: team, topology: 'graph', maxParallel: '3', repoUrl: 'github.com/o/r' })
    assert.equal(merged.systemPrompt, team, 'systemPrompt persistido')
    assert.deepEqual(merged.outputWebhooks, existing.outputWebhooks, 'outputWebhooks preservado')
    assert.deepEqual(merged.schedules, existing.schedules, 'schedules preservado')
    assert.equal(merged.repoUrl, 'github.com/o/r', 'repoUrl preservado')
    assert.equal(merged.topology, 'graph')
    assert.equal(merged.maxParallel, 3)
    // Empty / whitespace systemPrompt → key DROPPED (and other keys untouched).
    const dropped = buildTeamConfig({ ...existing, systemPrompt: team }, { systemPrompt: '   ' })
    assert.equal('systemPrompt' in dropped, false, 'vazio → key removida')
    assert.deepEqual(dropped.outputWebhooks, existing.outputWebhooks, 'outputWebhooks intacto ao dropar')
    // Trimmed on persist.
    assert.equal(buildTeamConfig({}, { systemPrompt: `  ${team}  ` }).systemPrompt, team)
    // systemPromptOf roundtrip: read back what was stored; '' when unset/non-string.
    assert.equal(systemPromptOf(merged), team)
    assert.equal(systemPromptOf(dropped), '')
    assert.equal(systemPromptOf({}), '')
    assert.equal(systemPromptOf({ systemPrompt: 42 }), '')
    assert.equal(systemPromptOf(null), '')
    ok('(d) persiste+preserva (webhooks/schedules/repo); vazio dropa; trim; systemPromptOf roundtrip')
  }

  console.log(`\n✅ v22s3 verify: ${passed} assertions passed`)
}

main()
