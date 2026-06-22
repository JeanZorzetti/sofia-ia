// scripts/vps-local-verify.ts
// Local verification for the VpsLocalProvider (003 — VPS executor). Exercises REAL fs
// ops in an isolated temp dir. The lifecycle assertions avoid bash, so this stays green
// on the dev host (Windows, where bash may be absent); `exec` is only checked for the
// port's "never throws / returns a numeric exitCode" invariant.
// Run: npx tsx scripts/vps-local-verify.ts
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

// Point the provider at an isolated temp base. `vpsRunsBaseDir()` reads the env at call
// time, so this takes effect for everything main() does.
const TMP_BASE = path.join(os.tmpdir(), `polaris-vps-verify-${Date.now()}`)
process.env.VPS_RUNS_DIR = TMP_BASE

import { createVpsLocalProvider, sweepVpsRunDirs, vpsRunsBaseDir } from '../src/lib/sandbox/vps-local'
import { getSandboxProvider } from '../src/lib/sandbox'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

async function main() {
  assert.equal(vpsRunsBaseDir(), TMP_BASE, 'VPS_RUNS_DIR honored')
  const provider = createVpsLocalProvider()

  console.log('create + namespacing (FR-005)')
  {
    const a = await provider.create()
    const b = await provider.create()
    assert.ok(a.id && b.id && a.id !== b.id, 'distinct ids per run')
    assert.ok(a.rootDir && b.rootDir && a.rootDir !== b.rootDir, 'distinct rootDirs per run')
    assert.equal(a.rootDir, path.join(TMP_BASE, a.id), 'rootDir = base/<id>')
    assert.ok(existsSync(a.rootDir!) && existsSync(b.rootDir!), 'both run dirs created')

    // write into A's repo dir; B must not see it (isolation)
    await a.writeFile(path.join(a.rootDir!, 'repo', 'hello.txt'), 'from A')
    assert.ok(existsSync(path.join(a.rootDir!, 'repo', 'hello.txt')), 'writeFile creates parents + file')
    assert.ok(!existsSync(path.join(b.rootDir!, 'repo', 'hello.txt')), 'B run dir isolated from A')
    assert.equal(await fs.readFile(path.join(a.rootDir!, 'repo', 'hello.txt'), 'utf8'), 'from A', 'content round-trips')
    ok('two runs get isolated namespaced dirs; writeFile is scoped + creates parents')
    await a.close(); await b.close()
  }

  console.log('setTimeout no-op (FR-002 — no ceiling)')
  {
    const s = await provider.create()
    const before = await fs.readdir(TMP_BASE)
    await s.setTimeout(60_000) // must resolve, change nothing, never throw
    assert.deepEqual(await fs.readdir(TMP_BASE), before, 'setTimeout changes nothing')
    assert.ok(existsSync(s.rootDir!), 'sandbox still alive after setTimeout')
    ok('setTimeout resolves as a no-op (removes the ~1h ceiling)')
    await s.close()
  }

  console.log('close = rm -rf (idempotent, FR-012)')
  {
    const s = await provider.create()
    await s.writeFile(path.join(s.rootDir!, 'repo', 'x', 'y.txt'), 'deep')
    assert.ok(existsSync(s.rootDir!))
    await s.close()
    assert.ok(!existsSync(s.rootDir!), 'close removes the whole run dir recursively')
    await s.close() // idempotent — must not throw on a missing dir
    ok('close removes the dir recursively and is idempotent')
  }

  console.log('connect (FR-013)')
  {
    const s = await provider.create()
    const re = await provider.connect(s.id)
    assert.equal(re.id, s.id, 'reconnect keeps the id')
    assert.equal(re.rootDir, s.rootDir, 'reconnect recomposes rootDir')
    await s.close()
    await assert.rejects(() => provider.connect(s.id), /não existe mais|expirou/, 'connect throws on a missing dir')
    ok('connect reattaches an existing dir and throws clearly when it is gone')
  }

  console.log('getPreviewUrl throws (preview off in Phase 1)')
  {
    const s = await provider.create()
    await assert.rejects(() => s.getPreviewUrl(3000), /Fase 2|indisponível/, 'getPreviewUrl rejects')
    ok('getPreviewUrl throws a clear Phase-2 error')
    await s.close()
  }

  console.log('exec never throws (port invariant)')
  {
    const s = await provider.create()
    // bash may be absent on the dev host; either way exec must resolve with a numeric
    // exitCode and never throw — that is the port contract.
    const r = await s.exec('echo hi', { timeoutMs: 5_000 })
    assert.equal(typeof r.exitCode, 'number', 'exec returns a numeric exitCode')
    assert.equal(typeof r.stdout, 'string')
    assert.equal(typeof r.stderr, 'string')
    assert.ok(r.ms >= 0, 'exec reports elapsed ms')
    ok('exec resolves (never throws), returns a CommandResult shape')
    await s.close()
  }

  console.log('sweepVpsRunDirs (boot + cron, FR-012)')
  {
    const s = await provider.create()
    // fresh dir (mtime now) protected by the age threshold
    assert.ok(!(await sweepVpsRunDirs({ maxAgeMs: 60_000 })).includes(s.id), 'fresh dir not swept')
    assert.ok(existsSync(s.rootDir!), 'fresh dir survives')
    // old-enough by age, but protected by activeIds
    assert.ok(!(await sweepVpsRunDirs({ maxAgeMs: 0, activeIds: new Set([s.id]) })).includes(s.id), 'active dir protected')
    assert.ok(existsSync(s.rootDir!), 'active dir survives')
    // orphan + old-enough → swept
    assert.ok((await sweepVpsRunDirs({ maxAgeMs: 0 })).includes(s.id), 'orphan dir swept')
    assert.ok(!existsSync(s.rootDir!), 'swept dir removed')
    ok('sweep respects age threshold + activeIds protection; removes true orphans')
  }

  console.log('factory selection (FR-003)')
  {
    process.env.SANDBOX_PROVIDER = 'vps-local'
    const s = await getSandboxProvider().create()
    assert.ok(s.rootDir?.startsWith(TMP_BASE), 'getSandboxProvider() resolves vps-local to the new provider')
    await s.close()
    delete process.env.SANDBOX_PROVIDER
    ok('getSandboxProvider() returns VpsLocal for SANDBOX_PROVIDER=vps-local')
  }

  await fs.rm(TMP_BASE, { recursive: true, force: true }).catch(() => {})
  console.log(`\n✅ all ${passed} assertions passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
