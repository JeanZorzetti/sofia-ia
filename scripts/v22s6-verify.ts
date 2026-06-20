// scripts/v22s6-verify.ts
// Local verification for Teams V2.2 — S6 (item 5b): image/vision attachments.
// All testable logic is PURE (team-attachments.ts) + the steering surfacing
// (buildUserSteeringBlock via buildLeadContext). Asserted via tsx — no jest
// (OneDrive errno -4094).
// Run: npx tsx scripts/v22s6-verify.ts
//
// Required cases (ROADMAP S6 + Sessão 6.md):
//   (a) parseAttachments: keeps valid image entries, drops malformed / bad mime /
//       missing key, caps at MAX_ATTACHMENTS; null/non-array → [].
//   (b) validateUpload / isImageMime: accepts the 4 image types, rejects other mime,
//       zero/negative size and oversize.
//   (c) keys & paths: safeAttachmentName strips dirs/odd chars; attachmentObjectKey is
//       prefixed; attachmentLocalPath uses the key basename under the per-run dir.
//   (d) buildAttachmentRefLines: [] for none; surfaces the local path + delegation note.
//   (e) steering surfacing: a `user` message WITHOUT attachments → buildLeadContext is
//       BYTE-IDENTICAL to the no-attachment baseline (legacy S4); WITH attachments it
//       gains the path ref lines; a run with no user message has no steering section.
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  parseAttachments, validateUpload, isImageMime, safeAttachmentName,
  attachmentObjectKey, attachmentLocalPath, attachmentRunDir, resolveAttachments,
  buildAttachmentRefLines, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES,
} from '../src/lib/orchestration/team/team-attachments'
import { buildLeadContext } from '../src/lib/orchestration/team/team-prompts'
import type { MemberCtx, MessageRow, TaskRow } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const MEMBERS: MemberCtx[] = [
  { id: 'L', agentId: 'a1', agentName: 'Ana', role: 'lead', model: null, effort: null },
  { id: 'W', agentId: 'a2', agentName: 'Bia', role: 'worker', model: null, effort: null },
]
const TASKS: TaskRow[] = []

function main() {
  // ── (a) parseAttachments ──
  console.log('(a) parseAttachments: válidos mantidos, inválidos descartados, cap, null→[]')
  {
    assert.deepEqual(parseAttachments(null), [], 'null → []')
    assert.deepEqual(parseAttachments('nope'), [], 'non-array → []')
    const mixed = parseAttachments([
      { name: 'a.png', mime: 'image/png', size: 10, key: 'teams/r/x-a.png' }, // ok
      { name: 'b.txt', mime: 'text/plain', size: 10, key: 'teams/r/y-b.txt' }, // bad mime
      { name: '', mime: 'image/png', size: 10, key: 'teams/r/z.png' },         // no name
      { name: 'c.png', mime: 'image/png', size: 10 },                          // no key
      'garbage',                                                               // not object
    ])
    assert.equal(mixed.length, 1, 'só 1 entrada válida')
    assert.equal(mixed[0].name, 'a.png')
    const many = parseAttachments(
      Array.from({ length: 10 }, (_, i) => ({ name: `i${i}.png`, mime: 'image/png', size: 1, key: `teams/r/k${i}.png` })),
    )
    assert.equal(many.length, MAX_ATTACHMENTS, `cap em MAX_ATTACHMENTS (${MAX_ATTACHMENTS})`)
    ok('(a) parse defensivo + cap + null/non-array → []')
  }

  // ── (b) validateUpload / isImageMime ──
  console.log('(b) validateUpload / isImageMime')
  {
    for (const m of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      assert.ok(isImageMime(m), `${m} é imagem`)
    }
    assert.ok(!isImageMime('application/pdf'), 'pdf não é imagem')
    assert.ok(!isImageMime(undefined), 'undefined não é imagem')
    assert.equal(validateUpload({ name: 'a.png', mime: 'image/png', size: 100 }).ok, true, 'png 100B ok')
    assert.equal(validateUpload({ name: 'a.txt', mime: 'text/plain', size: 100 }).ok, false, 'txt rejeitado')
    assert.equal(validateUpload({ name: 'a.png', mime: 'image/png', size: 0 }).ok, false, 'tamanho 0 rejeitado')
    assert.equal(validateUpload({ name: 'a.png', mime: 'image/png', size: MAX_ATTACHMENT_BYTES + 1 }).ok, false, 'acima do limite rejeitado')
    ok('(b) mime/tamanho validados')
  }

  // ── (c) keys & paths ──
  console.log('(c) safeAttachmentName / attachmentObjectKey / attachmentLocalPath')
  {
    assert.equal(safeAttachmentName('../../etc/passwd'), 'passwd', 'remove diretórios')
    assert.equal(safeAttachmentName('My Photo (1).PNG'), 'My_Photo_1_.PNG', 'normaliza chars')
    assert.equal(safeAttachmentName(''), 'image', 'vazio → image')
    const key = attachmentObjectKey('run1', 'foo bar.png', 'abc123')
    assert.equal(key, 'teams/run1/abc123-foo_bar.png', 'key prefixada + rand + safe name')
    // local path = per-run dir + key basename (injectable base for the test).
    const expected = path.join('/base', 'polaris-team-att', 'run1', 'abc123-foo_bar.png')
    assert.equal(attachmentLocalPath('run1', key, '/base'), expected, 'local path = runDir + basename(key)')
    assert.equal(attachmentRunDir('run1', '/base'), path.join('/base', 'polaris-team-att', 'run1'), 'runDir determinístico')
    // code-run invariant: the file lives UNDER the run dir, so `--add-dir <runDir>`
    // (chat-run host + code-run sandbox) always grants the CLI access to read it.
    assert.ok(
      attachmentLocalPath('run1', key, '/base').startsWith(attachmentRunDir('run1', '/base') + path.sep),
      'arquivo fica dentro do runDir → --add-dir cobre',
    )
    const resolved = resolveAttachments('run1', [{ name: 'a.png', mime: 'image/png', size: 1, key }], '/base')
    assert.equal(resolved[0].path, expected, 'resolveAttachments anexa o path local')
    ok('(c) nomes/keys/paths determinísticos e seguros; arquivo dentro do --add-dir')
  }

  // ── (d) buildAttachmentRefLines ──
  console.log('(d) buildAttachmentRefLines')
  {
    assert.deepEqual(buildAttachmentRefLines(undefined), [], 'undefined → []')
    assert.deepEqual(buildAttachmentRefLines([]), [], 'vazio → []')
    const lines = buildAttachmentRefLines([{ name: 'a.png', mime: 'image/png', size: 1, key: 'k', path: '/tmp/a.png' }])
    const joined = lines.join('\n')
    assert.ok(joined.includes('/tmp/a.png'), 'inclui o caminho local')
    assert.ok(joined.includes('a.png'), 'inclui o nome')
    assert.ok(/vis(ã|a)o/i.test(joined), 'menciona delegação a membro com visão')
    ok('(d) ref-lines com path + nota de delegação; vazio → []')
  }

  // ── (e) steering surfacing byte-identical without attachments ──
  console.log('(e) buildLeadContext: sem anexo = byte-idêntico ao baseline; com anexo ganha as ref-lines')
  {
    const baseMsg: MessageRow = { id: 'm1', fromMemberId: null, toMemberId: null, summary: null, content: 'olhe isso', kind: 'user', taskId: null }
    const baseline = buildLeadContext('missão', TASKS, [baseMsg], MEMBERS)
    // an identical run where the user message carries attachments
    const withAtt: MessageRow = { ...baseMsg, attachments: [{ name: 'a.png', mime: 'image/png', size: 1, key: 'k', path: '/tmp/a.png' }] }
    const enriched = buildLeadContext('missão', TASKS, [withAtt], MEMBERS)

    assert.notEqual(enriched, baseline, 'com anexo o contexto muda')
    assert.ok(enriched.includes('/tmp/a.png'), 'contexto enriquecido referencia o path')
    // baseline (no attachments) must NOT contain any attachment ref artifacts.
    assert.ok(!baseline.includes('/tmp/a.png'), 'baseline não cita path')
    assert.ok(!baseline.includes('leia o arquivo local'), 'baseline byte-idêntico ao S4 (sem ref-lines)')
    // the enriched context is the baseline with the ref lines spliced under the bullet:
    // removing the added lines yields the baseline.
    const reflines = buildAttachmentRefLines(withAtt.attachments)
    const stripped = enriched.split('\n').filter(l => !reflines.includes(l)).join('\n')
    assert.equal(stripped, baseline, 'remover as ref-lines reproduz o baseline (aditivo)')

    // a run with NO user message → no steering section at all (legacy).
    const noUser = buildLeadContext('missão', TASKS, [{ ...baseMsg, kind: 'message' }], MEMBERS)
    assert.ok(!noUser.includes('Mensagens do usuário durante a execução'), 'sem msg user → sem seção de steering')
    ok('(e) anexo é aditivo; sem anexo/sem user = legado byte-idêntico')
  }

  console.log(`\n✅ v22s6 verify: ${passed} assertions passed`)
}

main()
