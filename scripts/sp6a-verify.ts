// SP6a verification — pure, no DB. Asserts the Campaign roster is valid for Teams.
// Run: npx tsx scripts/sp6a-verify.ts
import assert from 'node:assert'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'
import { buildCampaignRoster } from './threads-campaign-roster'

const roster = buildCampaignRoster('00000000-0000-0000-0000-000000000000')

assert.equal(validateRoster(roster), null, 'roster da campanha deve ser válido')
assert.equal(roster.filter(m => m.role === 'lead').length, 1, 'exatamente 1 lead')
assert.equal(roster.filter(m => m.role === 'worker').length, 4, '4 workers (Estrategista, Analista, Copywriter, Gestor)')
assert.equal(roster.filter(m => m.role === 'reviewer').length, 1, '1 reviewer (Editor)')
assert.equal(roster.length, 6, '6 membros no total')
// posições contíguas 0..5
assert.deepEqual(roster.map(m => m.position), [0, 1, 2, 3, 4, 5], 'posições 0..5 em ordem do pipeline')

console.log('✅ sp6a-verify: roster da Campanha Threads válido (1 lead + 4 workers + 1 reviewer)')
