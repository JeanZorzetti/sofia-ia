// scripts/c2-verify.ts
// Local verification for the C2 diff-content capture (no DB / no network / no real git).
// Run: npx tsx scripts/c2-verify.ts
import assert from 'node:assert/strict'
import {
  splitUnifiedDiff, isBinaryDiff, capPatch, attachDiffs, commitAndPush,
  type ChangedFile,
} from '../src/lib/git/repo-lifecycle'
import type { Sandbox, CommandResult, ExecOptions } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// A realistic multi-file `git diff` covering modify / add / rename / delete / binary.
const MULTI_DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,2 +1,2 @@',
  '-old line',
  '+new line',
  ' context',
  'diff --git a/src/new.ts b/src/new.ts',
  'new file mode 100644',
  'index 0000000..3333333',
  '--- /dev/null',
  '+++ b/src/new.ts',
  '@@ -0,0 +1 @@',
  '+hello',
  'diff --git a/old.txt b/renamed.txt',
  'similarity index 100%',
  'rename from old.txt',
  'rename to renamed.txt',
  'diff --git a/gone.txt b/gone.txt',
  'deleted file mode 100644',
  'index 4444444..0000000',
  '--- a/gone.txt',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-bye',
  'diff --git a/logo.png b/logo.png',
  'new file mode 100644',
  'index 0000000..5555555',
  'Binary files /dev/null and b/logo.png differ',
].join('\n')

// ── splitUnifiedDiff ───────────────────────────────────────────────
console.log('splitUnifiedDiff')
{
  const chunks = splitUnifiedDiff(MULTI_DIFF)
  assert.deepEqual(
    Object.keys(chunks).sort(),
    ['gone.txt', 'logo.png', 'renamed.txt', 'src/a.ts', 'src/new.ts'],
  )
  ok('keys every file by its name-status path (modify/add/rename/delete/binary)')
  assert.ok(chunks['src/a.ts'].startsWith('diff --git a/src/a.ts'))
  assert.ok(chunks['src/a.ts'].includes('+new line') && chunks['src/a.ts'].includes('-old line'))
  ok('modify chunk carries the hunk body')
  assert.ok(chunks['renamed.txt'].includes('rename to renamed.txt'))
  ok('rename → keyed by the NEW path (matches name-status R)')
  assert.ok(chunks['gone.txt'].includes('-bye'))
  ok('delete → keyed by the OLD path')
  assert.deepEqual(splitUnifiedDiff(''), {})
  ok('empty input → {}')
}

// ── isBinaryDiff ───────────────────────────────────────────────────
console.log('isBinaryDiff')
{
  const chunks = splitUnifiedDiff(MULTI_DIFF)
  assert.equal(isBinaryDiff(chunks['logo.png']), true)
  assert.equal(isBinaryDiff(chunks['src/a.ts']), false)
  assert.equal(isBinaryDiff('GIT binary patch\nliteral 0'), true)
  ok('detects "Binary files ... differ" and "GIT binary patch"')
}

// ── capPatch ───────────────────────────────────────────────────────
console.log('capPatch')
{
  const tenLines = Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\n')
  const byLines = capPatch(tenLines, { maxLines: 5, maxBytes: 1_000_000 })
  assert.equal(byLines.truncated, true)
  assert.equal(byLines.patch.split('\n').length, 5)
  ok('truncates by line budget')

  const byBytes = capPatch(tenLines, { maxLines: 1000, maxBytes: 10 })
  assert.equal(byBytes.truncated, true)
  assert.ok(Buffer.byteLength(byBytes.patch, 'utf8') <= 10)
  ok('truncates by byte budget')

  const small = capPatch('a\nb', { maxLines: 100, maxBytes: 100 })
  assert.equal(small.truncated, false)
  assert.equal(small.patch, 'a\nb')
  ok('within budget → unchanged, not truncated')
}

// ── attachDiffs ────────────────────────────────────────────────────
console.log('attachDiffs')
{
  const files: ChangedFile[] = [
    { status: 'M', path: 'src/a.ts' },
    { status: 'A', path: 'src/new.ts' },
    { status: 'R', path: 'renamed.txt' },
    { status: 'D', path: 'gone.txt' },
    { status: 'A', path: 'logo.png' },
  ]
  const out = attachDiffs(files, MULTI_DIFF)
  const byPath = Object.fromEntries(out.map(f => [f.path, f]))
  assert.ok(byPath['src/a.ts'].patch?.includes('+new line'))
  assert.equal(byPath['src/a.ts'].truncated, undefined)
  assert.equal(byPath['src/a.ts'].binary, undefined)
  ok('text file → patch attached, no truncated/binary keys')
  assert.equal(byPath['logo.png'].binary, true)
  assert.equal(byPath['logo.png'].patch, undefined)
  ok('binary file → binary:true, no patch')
  assert.ok(byPath['renamed.txt'].patch?.includes('rename to renamed.txt'))
  assert.ok(byPath['gone.txt'].patch?.includes('-bye'))
  ok('rename + delete patches attached to the right entries')
}
{
  // total/byte cap: budget fits the first file exactly, the rest are truncated (no patch)
  const files: ChangedFile[] = [
    { status: 'M', path: 'src/a.ts' },
    { status: 'A', path: 'src/new.ts' },
  ]
  const firstChunkBytes = Buffer.byteLength(splitUnifiedDiff(MULTI_DIFF)['src/a.ts'], 'utf8')
  const out = attachDiffs(files, MULTI_DIFF, {
    maxLinesPerFile: 1000, maxBytesPerFile: 1_000_000, maxTotalBytes: firstChunkBytes, maxFiles: 50,
  })
  assert.ok(out[0].patch && out[0].patch.length > 0)
  assert.equal(out[1].patch, undefined)
  assert.equal(out[1].truncated, true)
  ok('total byte cap → later files dropped with truncated:true')
}
{
  // file-count cap
  const files: ChangedFile[] = [
    { status: 'M', path: 'src/a.ts' },
    { status: 'A', path: 'src/new.ts' },
  ]
  const out = attachDiffs(files, MULTI_DIFF, {
    maxLinesPerFile: 1000, maxBytesPerFile: 1_000_000, maxTotalBytes: 1_000_000, maxFiles: 1,
  })
  assert.ok(out[0].patch)
  assert.equal(out[1].patch, undefined)
  assert.equal(out[1].truncated, true)
  ok('file-count cap → files beyond the cap dropped with truncated:true')
}
{
  // per-file line cap stamps truncated on the file that got clipped
  const big = ['diff --git a/big.txt b/big.txt', '--- a/big.txt', '+++ b/big.txt', '@@ -0,0 +1,5 @@',
    '+1', '+2', '+3', '+4', '+5'].join('\n')
  const out = attachDiffs([{ status: 'A', path: 'big.txt' }], big, {
    maxLinesPerFile: 4, maxBytesPerFile: 1_000_000, maxTotalBytes: 1_000_000, maxFiles: 50,
  })
  assert.equal(out[0].truncated, true)
  assert.ok(out[0].patch && out[0].patch.split('\n').length === 4)
  ok('per-file line cap → patch clipped + truncated:true')
}

// ── fakes (mirror c1-verify) ───────────────────────────────────────
type Responder = (cmd: string) => Partial<CommandResult>
function scriptedSandbox(responder: Responder = () => ({})): Sandbox & { calls: { cmd: string; opts?: ExecOptions }[] } {
  const calls: { cmd: string; opts?: ExecOptions }[] = []
  return {
    id: 'sbx-test', calls,
    async exec(cmd: string, opts?: ExecOptions): Promise<CommandResult> {
      calls.push({ cmd, opts })
      const r = responder(cmd)
      return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', exitCode: r.exitCode ?? 0, ms: 1 }
    },
    async close() {},
  }
}

const SINGLE_DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1..2 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1 +1 @@',
  '-old',
  '+new',
].join('\n')

async function main() {
  // ── commitAndPush attaches diff content (C2) ─────────────────────
  console.log('commitAndPush + diff content')
  {
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('status --porcelain')) return { stdout: '' }
      if (cmd.includes('rev-list --count')) return { stdout: '1\n' }
      if (cmd.includes('diff --name-status')) return { stdout: 'M\tsrc/a.ts' }
      if (cmd.includes(' diff ')) return { stdout: SINGLE_DIFF } // full diff (no --name-status)
      if (cmd.includes('rev-parse')) return { stdout: 'abc1234\n' }
      return {}
    })
    const res = await commitAndPush(sbx, {
      repoUrl: 'owner/repo', token: 't', branch: 'b', base: 'main', workdir: '/w', message: 'x',
    })
    assert.equal(res.hasChanges, true)
    assert.equal(res.changedFiles.length, 1)
    assert.equal(res.changedFiles[0].path, 'src/a.ts')
    assert.ok(res.changedFiles[0].patch?.includes('+new'), 'per-file patch attached')
    ok('commitAndPush runs a full `git diff` and attaches the per-file patch')
  }
  {
    // diff capture failing must NOT break the delivery (name-only list survives)
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('status --porcelain')) return { stdout: '' }
      if (cmd.includes('rev-list --count')) return { stdout: '1\n' }
      if (cmd.includes('diff --name-status')) return { stdout: 'M\tsrc/a.ts' }
      if (cmd.includes(' diff ')) return { exitCode: 1, stderr: 'boom' } // full diff fails
      if (cmd.includes('rev-parse')) return { stdout: 'abc1234\n' }
      return {}
    })
    const res = await commitAndPush(sbx, {
      repoUrl: 'owner/repo', token: 't', branch: 'b', base: 'main', workdir: '/w', message: 'x',
    })
    assert.equal(res.hasChanges, true)
    assert.deepEqual(res.changedFiles, [{ status: 'M', path: 'src/a.ts' }])
    assert.ok(sbx.calls.some(c => c.cmd.includes('push origin')), 'still pushes')
    ok('diff capture failure → name-only list kept, delivery intact (best-effort)')
  }

  console.log(`\n✅ all ${passed} assertions passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
