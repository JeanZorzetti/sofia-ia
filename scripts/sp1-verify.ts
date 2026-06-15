// scripts/sp1-verify.ts
// Local verification for SP1 (Magic Create → Teams). Pure: no DB / no network / no Groq.
// Run: npx tsx scripts/sp1-verify.ts
import assert from 'node:assert/strict'
import { parseMagicRoster } from '../src/lib/orchestration/team/magic-roster'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// Fakes de saída do LLM (o que o Groq devolveria como string em message.content).
const WITH_QA = JSON.stringify({
  name: 'Time de Conteúdo',
  description: 'Pesquisa, escreve e revisa posts',
  members: [
    { role: 'lead', name: 'Coordenador', systemPrompt: 'Você coordena e delega o trabalho do time.', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'Pesquisador', systemPrompt: 'Você pesquisa tendências e fontes.', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'Redator', systemPrompt: 'Você escreve o texto final.', model: 'llama-3.3-70b-versatile' },
    { role: 'reviewer', name: 'Revisor', systemPrompt: 'Você revisa tom, clareza e qualidade antes de aprovar.', model: 'llama-3.3-70b-versatile' },
  ],
})

const NO_QA = JSON.stringify({
  name: 'Time de Captação',
  description: 'Busca e qualifica leads',
  members: [
    { role: 'lead', name: 'Coordenador', systemPrompt: 'Você coordena e delega o trabalho do time.', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'Caçador de Leads', systemPrompt: 'Você busca leads no LinkedIn.', model: 'llama-3.3-70b-versatile' },
  ],
})

console.log('parseMagicRoster — caminho feliz')
{
  const r = parseMagicRoster(WITH_QA)
  assert.ok(r.ok, 'JSON com QA deve parsear')
  if (r.ok) {
    assert.equal(r.roster.members.length, 4)
    assert.equal(r.roster.members.filter(m => m.role === 'lead').length, 1)
    assert.equal(r.roster.members.filter(m => m.role === 'reviewer').length, 1)
    // O roster gerado passa em validateRoster (composição) usando agentIds placeholder.
    assert.equal(validateRoster(r.roster.members.map((m, i) => ({ agentId: String(i), role: m.role }))), null)
  }
  ok('processo com QA → inclui reviewer e passa em validateRoster')
}
{
  const r = parseMagicRoster(NO_QA)
  assert.ok(r.ok, 'JSON sem QA deve parsear')
  if (r.ok) {
    assert.equal(r.roster.members.length, 2)
    assert.equal(r.roster.members.filter(m => m.role === 'reviewer').length, 0)
    assert.equal(validateRoster(r.roster.members.map((m, i) => ({ agentId: String(i), role: m.role }))), null)
  }
  ok('processo sem QA → sem reviewer e passa em validateRoster')
}
{
  // JSON embrulhado em markdown fence deve parsear (LLM costuma fazer isso).
  const fenced = '```json\n' + NO_QA + '\n```'
  const r = parseMagicRoster(fenced)
  assert.ok(r.ok, 'fence markdown deve ser removido')
  ok('JSON em ```json fence``` → parseia')
}
{
  // Regressão: systemPrompt contendo ``` dentro de um JSON fenced NÃO pode corromper o parse.
  const inner = JSON.stringify({
    name: 'Time Técnico',
    description: 'd',
    members: [
      { role: 'lead', name: 'L', systemPrompt: 'Use blocos ```assim``` quando útil.', model: 'llama-3.3-70b-versatile' },
      { role: 'worker', name: 'W', systemPrompt: 'trabalha', model: 'llama-3.3-70b-versatile' },
    ],
  })
  const r = parseMagicRoster('```json\n' + inner + '\n```')
  assert.ok(r.ok, 'systemPrompt com ``` dentro de fence deve parsear')
  if (r.ok) assert.ok(r.roster.members[0].systemPrompt.includes('```assim```'), 'backticks internos preservados')
  ok('systemPrompt com ``` preservado (fence não-destrutivo)')
}

console.log('parseMagicRoster — erros')
{
  const r = parseMagicRoster('isto não é json {')
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'O modelo retornou um JSON inválido. Tente novamente.')
  ok('JSON inválido → erro de parse')
}
{
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'Estrutura do time inválida. Tente novamente.')
  ok('members vazio → estrutura inválida')
}
{
  const r = parseMagicRoster(JSON.stringify({ name: '', members: [{ role: 'lead', name: 'L', systemPrompt: 'p' }] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'Estrutura do time inválida. Tente novamente.')
  ok('name vazio → estrutura inválida')
}
{
  // 0 leads → erro de composição vindo do validateRoster
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'worker', name: 'W', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
  ] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'O time precisa de exatamente 1 Lead')
  ok('0 leads → "precisa de exatamente 1 Lead"')
}
{
  // 1 lead, 0 workers → erro de composição
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'lead', name: 'L', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
  ] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'O time precisa de ao menos 1 Worker')
  ok('0 workers → "precisa de ao menos 1 Worker"')
}
{
  // 2 reviewers → erro de composição
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'lead', name: 'L', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'W', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
    { role: 'reviewer', name: 'R1', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
    { role: 'reviewer', name: 'R2', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
  ] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'No máximo 1 Reviewer')
  ok('2 reviewers → "No máximo 1 Reviewer"')
}
{
  // model ausente → default llama-3.3-70b-versatile
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'lead', name: 'L', systemPrompt: 'p' },
    { role: 'worker', name: 'W', systemPrompt: 'p' },
  ] }))
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.roster.members[0].model, 'llama-3.3-70b-versatile')
  ok('model ausente → default llama-3.3-70b-versatile')
}

console.log(`\n✅ all ${passed} assertions passed`)
