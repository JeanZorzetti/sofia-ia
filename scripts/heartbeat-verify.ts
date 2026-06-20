// scripts/heartbeat-verify.ts
// Verifies the sandbox heartbeat keeps a long code-run's sandbox alive: it renews the
// E2B lifetime on a fixed interval so the teardown (git add/commit/push) never hits
// "Sandbox is probably not running anymore". Run: npx tsx scripts/heartbeat-verify.ts
import assert from 'node:assert/strict'
import { startSandboxHeartbeat, type HeartbeatScheduler } from '../src/lib/sandbox/heartbeat'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

type Tick = () => void
function fakeScheduler() {
  const timers: { id: number; fn: Tick; ms: number; cleared: boolean }[] = []
  let nextId = 1
  const sched: HeartbeatScheduler & { timers: typeof timers } = {
    timers,
    setInterval: (fn: () => void, ms: number) => {
      const id = nextId++
      timers.push({ id, fn, ms, cleared: false })
      return { id, unref() {} }
    },
    clearInterval: (handle: unknown) => {
      const t = timers.find(t => t.id === (handle as { id: number })?.id)
      if (t) t.cleared = true
    },
  }
  return sched
}
const flush = () => new Promise(r => setImmediate(r))

async function main() {
  console.log('startSandboxHeartbeat')
  {
    const calls: number[] = []
    const sandbox = { setTimeout: async (ms: number) => { calls.push(ms) } }
    const sched = fakeScheduler()
    const hb = startSandboxHeartbeat(sandbox, { ttlMs: 900_000 }, sched)
    assert.equal(sched.timers.length, 1, 'one interval scheduled')
    assert.equal(sched.timers[0].ms, 300_000, 'renews at ttl/3 (5 min for a 15 min ttl)')
    sched.timers[0].fn(); sched.timers[0].fn()
    await flush()
    assert.deepEqual(calls, [900_000, 900_000], 'each tick renews lifetime to ttl')
    ok('renews sandbox lifetime to ttl on each tick at the ttl/3 interval')
    hb.stop()
    assert.equal(sched.timers[0].cleared, true)
    ok('stop() clears the interval (no further renewals)')
    hb.stop() // idempotent
    ok('stop() is idempotent')
  }
  {
    const interval: number[] = []
    const sandbox = { setTimeout: async () => {} }
    const sched = fakeScheduler()
    startSandboxHeartbeat(sandbox, { ttlMs: 30_000 }, sched) // ttl/3 = 10s < 30s floor
    interval.push(sched.timers[0].ms)
    assert.equal(interval[0], 30_000, 'interval floored at 30s')
    ok('interval is floored at 30s for short ttls')
  }
  {
    const errs: unknown[] = []
    const sandbox = { setTimeout: async () => { throw new Error('boom') } }
    const sched = fakeScheduler()
    startSandboxHeartbeat(sandbox, { ttlMs: 600_000, onError: e => errs.push(e) }, sched)
    assert.doesNotThrow(() => sched.timers[0].fn(), 'tick never throws out')
    await flush()
    assert.equal(errs.length, 1, 'onError received the rejection')
    ok('a failed renewal is caught (onError), never crashes the tick')
  }
  console.log(`\n✅ all ${passed} assertions passed`)
}
main().catch(e => { console.error(e); process.exit(1) })
