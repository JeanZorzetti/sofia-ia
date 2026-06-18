// scripts/claude-pool-verify.ts
// Local verification for the Claude OAuth token pool + failover (Polaris Teams).
// No DB / no network. Run: npx tsx scripts/claude-pool-verify.ts
import assert from 'node:assert/strict'
import {
  loadClaudeTokens, hasClaudeTokenPool, primaryClaudeToken,
  isClaudeRateLimit, availableTokens,
  withClaudeTokenFailover, ClaudeRateLimitError, _resetClaudeTokenPool,
} from '../src/lib/ai/claude-token-pool'
import { runClaudeInSandbox } from '../src/lib/orchestration/team/sandbox-cli-agent'
import { isRateLimit } from '../src/lib/orchestration/team/team-board'
import type { Sandbox, CommandResult, ExecOptions } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const POOL_ENV_KEYS = [
  'CLAUDE_CODE_OAUTH_TOKENS', 'CLAUDE_CODE_OAUTH_TOKEN',
  'CLAUDE_CODE_OAUTH_TOKEN_1', 'CLAUDE_CODE_OAUTH_TOKEN_2', 'CLAUDE_CODE_OAUTH_TOKEN_3',
  'CLAUDE_TOKEN_COOLDOWN_MS',
]
function setEnv(vars: Record<string, string | undefined>) {
  for (const k of POOL_ENV_KEYS) delete process.env[k]
  for (const [k, v] of Object.entries(vars)) if (v !== undefined) process.env[k] = v
  _resetClaudeTokenPool()
}

/** Fake sandbox: returns scripted CommandResults in order, recording exec env. */
function fakeSandbox(results: CommandResult[]): Sandbox & { execCalls: { cmd: string; opts?: ExecOptions }[] } {
  const execCalls: { cmd: string; opts?: ExecOptions }[] = []
  let i = 0
  return {
    id: 'sbx', execCalls,
    async exec(cmd: string, opts?: ExecOptions): Promise<CommandResult> {
      execCalls.push({ cmd, opts })
      return results[Math.min(i++, results.length - 1)]
    },
    async writeFile(): Promise<void> {},
    async close(): Promise<void> {},
  }
}

async function main() {
  // ── token parsing ────────────────────────────────────────────────────
  console.log('loadClaudeTokens')
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 'a, b\nc' })
    assert.deepEqual(loadClaudeTokens(), ['a', 'b', 'c'])
    assert.equal(hasClaudeTokenPool(), true)
    assert.equal(primaryClaudeToken(), 'a')
    ok('list (comma/newline) parsed + trimmed, primary = first')
  }
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKEN_1: 't1', CLAUDE_CODE_OAUTH_TOKEN_2: 't2' })
    assert.deepEqual(loadClaudeTokens(), ['t1', 't2'])
    ok('numbered tokens parsed')
  }
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKEN: 'solo' })
    assert.deepEqual(loadClaudeTokens(), ['solo'])
    assert.equal(primaryClaudeToken(), 'solo')
    ok('single token (back-compat)')
  }
  {
    // footgun-proof: singular var name holding a comma-list is also accepted
    setEnv({ CLAUDE_CODE_OAUTH_TOKEN: 'a,b,c' })
    assert.deepEqual(loadClaudeTokens(), ['a', 'b', 'c'])
    ok('singular var with comma-list is accepted too (common mistake)')
  }
  {
    setEnv({})
    assert.deepEqual(loadClaudeTokens(), [])
    assert.equal(hasClaudeTokenPool(), false)
    assert.equal(primaryClaudeToken(), undefined)
    ok('empty → no pool')
  }
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 'dup, dup, x' })
    assert.deepEqual(loadClaudeTokens(), ['dup', 'x'])
    ok('de-dups preserving order')
  }

  // ── isClaudeRateLimit ─────────────────────────────────────────────────
  console.log('isClaudeRateLimit')
  {
    for (const s of ['You hit your limit', 'rate limit exceeded', 'usage limit reached', 'HTTP 429', 'out of quota']) {
      assert.equal(isClaudeRateLimit(s), true, s)
    }
    for (const s of ['compilation error', 'file not found', '', undefined, null]) {
      assert.equal(isClaudeRateLimit(s), false, String(s))
    }
    ok('matches limit phrases, ignores others/empty/null')
  }

  // ── withClaudeTokenFailover ───────────────────────────────────────────
  console.log('withClaudeTokenFailover')
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 't1,t2,t3' })
    const seen: (string | undefined)[] = []
    const r = await withClaudeTokenFailover(async (tok) => { seen.push(tok); return `ok:${tok}` }, { isLimited: () => false })
    assert.equal(r, 'ok:t1')
    assert.deepEqual(seen, ['t1'])
    ok('success on first token, no failover')
  }
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 't1,t2,t3' })
    const seen: (string | undefined)[] = []
    const r = await withClaudeTokenFailover(async (tok) => {
      seen.push(tok)
      if (tok === 't1') throw new Error('usage limit reached')
      return `ok:${tok}`
    }, { isLimited: (e) => isClaudeRateLimit(String((e as Error).message)) })
    assert.equal(r, 'ok:t2')
    assert.deepEqual(seen, ['t1', 't2'])
    // t1 is now in cooldown → skipped on the next selection (no setEnv reset here)
    assert.deepEqual(availableTokens().map((a) => a.token), ['t2', 't3'])
    ok('limited first → fails over to next; spent account enters cooldown')
  }
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 't1,t2' })
    let calls = 0
    await assert.rejects(
      withClaudeTokenFailover(async () => { calls++; throw new Error('rate limit') }, { isLimited: () => true }),
      (e: unknown) => e instanceof ClaudeRateLimitError,
    )
    assert.equal(calls, 2)
    ok('all accounts limited → tries each then throws ClaudeRateLimitError')
  }
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 't1,t2' })
    await assert.rejects(
      withClaudeTokenFailover(async () => { throw new Error('compile error') }, { isLimited: () => false }),
      (e: unknown) => (e as Error).message === 'compile error',
    )
    ok('non-limit error surfaces immediately (no failover)')
  }
  {
    setEnv({}) // empty pool
    const seen: (string | undefined)[] = []
    const r = await withClaudeTokenFailover(async (tok) => { seen.push(tok); return 'amb' }, { isLimited: () => false, fallbackToken: 'FB' })
    assert.equal(r, 'amb')
    assert.deepEqual(seen, ['FB'])
    ok('empty pool → single attempt with fallbackToken (back-compat)')
  }
  {
    // observability: a rotation emits a [claude-pool] warn line
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 't1,t2,t3' })
    const logs: string[] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
    try {
      await withClaudeTokenFailover(
        async (tok) => { if (tok === 't1') throw new Error('usage limit reached'); return 'ok' },
        { isLimited: (e) => isClaudeRateLimit(String((e as Error).message)) },
      )
    } finally {
      console.warn = orig
    }
    assert.ok(logs.some((l) => l.includes('[claude-pool]') && l.includes('rotacionando')), 'rotation log emitted')
    ok('failover logs a [claude-pool] rotation line (observability)')
  }

  // ── sandbox integration: rate-limit throws → failover rotates token ────
  console.log('runClaudeInSandbox + failover')
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 'tokA,tokB' })
    const okStream = '{"type":"result","subtype":"success","result":"done","usage":{"input_tokens":1,"output_tokens":1}}'
    const sb = fakeSandbox([
      { stdout: '', stderr: 'You have hit your usage limit', exitCode: 1, ms: 1 },
      { stdout: okStream, stderr: '', exitCode: 0, ms: 1 },
    ])
    const result = await withClaudeTokenFailover(
      (token) => runClaudeInSandbox(sb, { workdir: '/r', model: 'claude-sonnet-4-6', prompt: 'p', token: token ?? '' }),
      { isLimited: (e) => e instanceof ClaudeRateLimitError },
    )
    assert.equal(result.message, 'done')
    assert.equal(sb.execCalls[0].opts?.env?.CLAUDE_CODE_OAUTH_TOKEN, 'tokA')
    assert.equal(sb.execCalls[1].opts?.env?.CLAUDE_CODE_OAUTH_TOKEN, 'tokB')
    ok('rate-limited sandbox run throws → failover reruns with next account token')
  }

  // ── coordinator contract: isRateLimit() recognizes the failover error ──
  console.log('coordinator isRateLimit() recognizes ClaudeRateLimitError')
  {
    assert.equal(isRateLimit(new ClaudeRateLimitError('Todas as 3 conta(s) Claude no limite')), true)
    assert.equal(isRateLimit(new Error('hit your limit')), true)        // pre-existing regex path
    assert.equal(isRateLimit(new Error('compile error')), false)
    ok('typed ClaudeRateLimitError → run finishes rate_limited (not hard-failed)')
  }

  console.log(`\n✅ claude-pool-verify: ${passed} checks passed`)
}

main().catch((e) => { console.error('❌ verify failed:', e); process.exit(1) })
