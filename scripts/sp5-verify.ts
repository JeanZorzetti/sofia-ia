// scripts/sp5-verify.ts
// Pure verification for SP5 Team Templates — run: npx tsx scripts/sp5-verify.ts
// No DB, no network. RELATIVE imports only (tsx doesn't resolve the @/ alias here).
import assert from 'node:assert'
import { TEAM_TEMPLATES, getTeamTemplateById, summarizeTemplate } from '../src/lib/orchestration/team/team-templates'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'

let passed = 0
function check(label: string, fn: () => void) {
  fn(); passed++; console.log(`  ✓ ${label}`)
}

check('catalog has 8 templates', () => {
  assert.equal(TEAM_TEMPLATES.length, 8)
})

check('template ids are unique', () => {
  const ids = TEAM_TEMPLATES.map(t => t.id)
  assert.equal(new Set(ids).size, ids.length)
})

for (const t of TEAM_TEMPLATES) {
  check(`"${t.id}" passes validateRoster (1 lead / >=1 worker / <=1 reviewer)`, () => {
    const err = validateRoster(t.members.map((m, i) => ({ agentId: String(i), role: m.role })))
    assert.equal(err, null, err ?? undefined)
  })
  check(`"${t.id}" members have name/systemPrompt/model`, () => {
    for (const m of t.members) {
      assert.ok(m.name.trim(), `member missing name in ${t.id}`)
      assert.ok(m.systemPrompt.trim().length > 20, `member ${m.name} systemPrompt too short in ${t.id}`)
      assert.ok(m.model.trim(), `member ${m.name} missing model in ${t.id}`)
    }
  })
  check(`"${t.id}" lead is first member`, () => {
    assert.equal(t.members[0].role, 'lead')
  })
}

check('reviewer policy holds (exactly marketing-content + suporte-inteligente)', () => {
  const withReviewer = TEAM_TEMPLATES.filter(t => t.members.some(m => m.role === 'reviewer')).map(t => t.id).sort()
  assert.deepEqual(withReviewer, ['marketing-content', 'suporte-inteligente'])
})

check('getTeamTemplateById finds and misses correctly', () => {
  assert.ok(getTeamTemplateById('marketing-content'))
  assert.equal(getTeamTemplateById('nope'), undefined)
})

check('summarizeTemplate omits systemPrompt, keeps members role/name', () => {
  const s = summarizeTemplate(TEAM_TEMPLATES[0])
  const m0 = s.members[0] as Record<string, unknown>
  assert.ok(!('systemPrompt' in m0))
  assert.equal(s.members.length, TEAM_TEMPLATES[0].members.length)
  assert.ok(m0.role && m0.name)
})

console.log(`\n✅ SP5 verify: ${passed} checks passed`)
