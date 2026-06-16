// Pure-logic verification for SP4 API. Run: npx tsx scripts/sp4-verify.ts
// Imports are RELATIVE so tsx can load the module without path aliases.
import assert from 'node:assert'
import { parseTeamRunBody, TEAM_RUN_STATUS_BY_CODE } from '../src/lib/orchestration/team/team-run-api'

// mission direto
assert.equal(parseTeamRunBody({ mission: 'do x' }).mission, 'do x')
// alias input
assert.equal(parseTeamRunBody({ input: 'from input' }).mission, 'from input')
// alias message
assert.equal(parseTeamRunBody({ message: 'from message' }).mission, 'from message')
// precedência mission > input > message
assert.equal(parseTeamRunBody({ mission: 'm', input: 'i', message: 'g' }).mission, 'm')
assert.equal(parseTeamRunBody({ input: 'i', message: 'g' }).mission, 'i')
// trim de espaços
assert.equal(parseTeamRunBody({ mission: '  spaced  ' }).mission, 'spaced')
// vazio → ''
assert.equal(parseTeamRunBody({}).mission, '')
// body não-objeto → '' (defensivo)
assert.equal(parseTeamRunBody(null).mission, '')
assert.equal(parseTeamRunBody('str').mission, '')
assert.equal(parseTeamRunBody(undefined).mission, '')
// mode default chat
assert.equal(parseTeamRunBody({ mission: 'x' }).mode, 'chat')
// mode code
assert.equal(parseTeamRunBody({ mission: 'x', mode: 'code' }).mode, 'code')
// mode inválido → chat
assert.equal(parseTeamRunBody({ mission: 'x', mode: 'weird' }).mode, 'chat')
// repoUrl / base presentes
{
  const p = parseTeamRunBody({ mission: 'x', repoUrl: 'https://r', base: 'dev' })
  assert.equal(p.repoUrl, 'https://r')
  assert.equal(p.base, 'dev')
}
// repoUrl / base ausentes → null
assert.equal(parseTeamRunBody({ mission: 'x' }).repoUrl, null)
assert.equal(parseTeamRunBody({ mission: 'x' }).base, null)
// status map: 4 códigos
assert.equal(TEAM_RUN_STATUS_BY_CODE.not_found, 404)
assert.equal(TEAM_RUN_STATUS_BY_CODE.invalid_roster, 400)
assert.equal(TEAM_RUN_STATUS_BY_CODE.missing_mission, 400)
assert.equal(TEAM_RUN_STATUS_BY_CODE.queue_unavailable, 503)

console.log('✅ SP4 team-run-api.ts checks passed')
