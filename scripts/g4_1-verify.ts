// scripts/g4_1-verify.ts
// Local verification for the G4.1 topology-toggle slice (no React / no DOM / no DB).
// Jest can't run on this machine (OneDrive errno -4094), so this asserts the pure
// config-shaping contract via tsx. Run: npx tsx scripts/g4_1-verify.ts
//
// It exercises ONLY the pure `buildTeamConfig` / `topologyOf` / `maxParallelOf`:
//   1. linear is the default → topology key is omitted (existing teams untouched)
//   2. graph is stored as the explicit opt-in
//   3. maxParallel: parsed positive int in graph mode; dropped otherwise
//   4. unrelated config keys (maxTurns/retryCap) are PRESERVED
//   5. repo binding still merged/dropped as before (no regression)
//   6. read-back round-trips (topologyOf / maxParallelOf)
import assert from 'node:assert/strict'
import { buildTeamConfig, topologyOf, maxParallelOf } from '../src/lib/orchestration/team/team-config-ui'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

async function main() {
  // ── 1. linear default omits the key ──
  console.log('buildTeamConfig (topology)')
  {
    const cfg = buildTeamConfig({}, { topology: 'linear' })
    assert.equal('topology' in cfg, false); ok('linear → topology key omitted')

    const g = buildTeamConfig({}, { topology: 'graph' })
    assert.equal(g.topology, 'graph'); ok('graph → topology = "graph"')

    // editing graph → linear removes the key from an existing config.
    const back = buildTeamConfig({ topology: 'graph' }, { topology: 'linear' })
    assert.equal('topology' in back, false); ok('graph→linear drops the stored topology key')
  }

  // ── 2. maxParallel ──
  console.log('buildTeamConfig (maxParallel)')
  {
    const c = buildTeamConfig({}, { topology: 'graph', maxParallel: '3' })
    assert.equal(c.maxParallel, 3); ok('graph + "3" → maxParallel = 3 (number)')

    const empty = buildTeamConfig({}, { topology: 'graph', maxParallel: '' })
    assert.equal('maxParallel' in empty, false); ok('graph + empty → maxParallel dropped (auto)')

    const zero = buildTeamConfig({}, { topology: 'graph', maxParallel: '0' })
    assert.equal('maxParallel' in zero, false); ok('graph + "0" → dropped (must be ≥1)')

    const nan = buildTeamConfig({}, { topology: 'graph', maxParallel: 'abc' })
    assert.equal('maxParallel' in nan, false); ok('graph + non-numeric → dropped')

    // maxParallel is meaningless in linear mode → always dropped.
    const lin = buildTeamConfig({ maxParallel: 5 }, { topology: 'linear', maxParallel: '5' })
    assert.equal('maxParallel' in lin, false); ok('linear → maxParallel dropped even if provided/stored')
  }

  // ── 3. preserves unrelated keys + repo binding regression ──
  console.log('buildTeamConfig (preserve + repo)')
  {
    const cfg = buildTeamConfig(
      { maxTurns: 6, retryCap: 2, topology: 'graph', maxParallel: 4 },
      { topology: 'graph', maxParallel: '4', repoUrl: 'github.com/o/r', defaultBranch: 'main' },
    )
    assert.equal(cfg.maxTurns, 6); assert.equal(cfg.retryCap, 2); ok('unrelated keys (maxTurns/retryCap) preserved')
    assert.equal(cfg.repoUrl, 'github.com/o/r'); assert.equal(cfg.defaultBranch, 'main'); ok('repo binding merged')
    assert.equal(cfg.topology, 'graph'); assert.equal(cfg.maxParallel, 4); ok('graph + maxParallel kept alongside')

    const dropped = buildTeamConfig({ repoUrl: 'x', defaultBranch: 'y' }, { repoUrl: '', defaultBranch: '' })
    assert.equal('repoUrl' in dropped, false); assert.equal('defaultBranch' in dropped, false); ok('empty repo fields dropped (no regression)')
  }

  // ── 4. read-back helpers round-trip ──
  console.log('topologyOf / maxParallelOf (read-back)')
  {
    assert.equal(topologyOf({ topology: 'graph' }), 'graph'); ok('topologyOf graph')
    assert.equal(topologyOf({}), 'linear'); ok('topologyOf {} → linear')
    assert.equal(topologyOf(null), 'linear'); ok('topologyOf null → linear (defensive)')
    assert.equal(topologyOf({ topology: 'weird' }), 'linear'); ok('topologyOf unknown value → linear')
    assert.equal(maxParallelOf({ maxParallel: 3 }), '3'); ok('maxParallelOf number → string')
    assert.equal(maxParallelOf({}), ''); ok('maxParallelOf unset → ""')
    assert.equal(maxParallelOf({ maxParallel: 'x' }), ''); ok('maxParallelOf non-number → ""')

    // full round-trip: build → read-back matches the form inputs.
    const cfg = buildTeamConfig({}, { topology: 'graph', maxParallel: '2' })
    assert.equal(topologyOf(cfg), 'graph'); assert.equal(maxParallelOf(cfg), '2'); ok('round-trip graph/2')
  }

  console.log(`\n✅ G4.1 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
