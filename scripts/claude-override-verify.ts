// scripts/claude-override-verify.ts
// 011-byos regression guard. No DB / no network. Run: npx tsx scripts/claude-override-verify.ts
//
// Proves the per-run owner override behaves as specified WITHOUT touching the pool:
//   - no override  → withClaudeTokenFailover rotates + cools down exactly like today (US2)
//   - override     → exactly ONE attempt with the user's token; pool/cooldowns UNTOUCHED (US1)
//   - override + limit → ClaudeRateLimitError propagates for 007/008 (US4), no pool fallback
//
// `execViaCallSite` MIRRORS the branch in code-agent.ts / groq.ts (single attempt when the
// ALS override is set, else pool failover). ponytail: kept in sync by hand — if that branch
// changes, update here (the two are ~10 lines each, not worth a shared combinator).
import assert from 'node:assert/strict'
import {
  isClaudeRateLimit, availableTokens,
  withClaudeTokenFailover, ClaudeRateLimitError, _resetClaudeTokenPool,
} from '../src/lib/ai/claude-token-pool'
import { runWithClaudeToken, currentClaudeTokenOverride } from '../src/lib/ai/claude-token-override'
import { runClaudeInSandbox } from '../src/lib/orchestration/team/sandbox-cli-agent'
import { isRateLimit } from '../src/lib/orchestration/team/team-board'
import type { Sandbox, CommandResult, ExecOptions } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const POOL_ENV_KEYS = ['CLAUDE_CODE_OAUTH_TOKENS', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_TOKEN_COOLDOWN_MS']
function setEnv(vars: Record<string, string | undefined>) {
  for (const k of POOL_ENV_KEYS) delete process.env[k]
  for (const [k, v] of Object.entries(vars)) if (v !== undefined) process.env[k] = v
  _resetClaudeTokenPool()
}

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
    async getPreviewUrl(): Promise<string> { return '' },
    async setTimeout(): Promise<void> {},
    async close(): Promise<void> {},
  }
}

// Faithful copy of the code-agent.ts sandbox call-site branch.
async function execViaCallSite(sandbox: Sandbox, fallbackToken?: string) {
  const runOne = (token: string) =>
    runClaudeInSandbox(sandbox, { workdir: '/r', model: 'claude-sonnet-4-6', prompt: 'p', token })
  const override = currentClaudeTokenOverride()
  if (override) {
    try {
      return await runOne(override)
    } catch (e) {
      if (e instanceof ClaudeRateLimitError) throw new ClaudeRateLimitError(`${e.message} (assinatura Claude do usuário)`)
      throw e
    }
  }
  return withClaudeTokenFailover(
    (token) => runOne(token ?? ''),
    { isLimited: (e) => e instanceof ClaudeRateLimitError, fallbackToken },
  )
}

const OK_STREAM = '{"type":"result","subtype":"success","result":"done","usage":{"input_tokens":1,"output_tokens":1}}'
const LIMIT = { stdout: '', stderr: 'You have hit your usage limit', exitCode: 1, ms: 1 }

async function main() {
  console.log('no override → pool failover intact (US2)')
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 'tokA,tokB' })
    const sb = fakeSandbox([LIMIT, { stdout: OK_STREAM, stderr: '', exitCode: 0, ms: 1 }])
    const result = await execViaCallSite(sb)
    assert.equal(result.message, 'done')
    assert.equal(sb.execCalls.length, 2, 'failover attempts both tokens')
    assert.equal(sb.execCalls[0].opts?.env?.CLAUDE_CODE_OAUTH_TOKEN, 'tokA')
    assert.equal(sb.execCalls[1].opts?.env?.CLAUDE_CODE_OAUTH_TOKEN, 'tokB')
    assert.deepEqual(availableTokens().map((a) => a.token), ['tokB'], 'tokA cooled down (failover happened)')
    ok('no override → rotates tokA→tokB and cools tokA down (byte-identical)')
  }

  console.log('override → single attempt, pool untouched (US1)')
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 'tokA,tokB' })
    const sb = fakeSandbox([{ stdout: OK_STREAM, stderr: '', exitCode: 0, ms: 1 }])
    const result = await runWithClaudeToken('USER-TOKEN', () => execViaCallSite(sb))
    assert.equal(result.message, 'done')
    assert.equal(sb.execCalls.length, 1, 'exactly one attempt with the user token')
    assert.equal(sb.execCalls[0].opts?.env?.CLAUDE_CODE_OAUTH_TOKEN, 'USER-TOKEN')
    assert.deepEqual(availableTokens().map((a) => a.token), ['tokA', 'tokB'], 'pool + cooldowns untouched')
    ok('override → 1 attempt with user token; pool never consulted or cooled')
  }

  console.log('override + limit → ClaudeRateLimitError, no fallback (US4)')
  {
    setEnv({ CLAUDE_CODE_OAUTH_TOKENS: 'tokA,tokB' })
    const sb = fakeSandbox([LIMIT])
    let thrown: unknown
    await assert.rejects(
      runWithClaudeToken('USER-TOKEN', () => execViaCallSite(sb)),
      (e: unknown) => {
        thrown = e
        return e instanceof ClaudeRateLimitError && /assinatura Claude do usuário/.test((e as Error).message)
      },
    )
    assert.equal(sb.execCalls.length, 1, 'no pool fallback after the user token limits')
    assert.deepEqual(availableTokens().map((a) => a.token), ['tokA', 'tokB'], 'pool untouched')
    assert.equal(isRateLimit(thrown as Error), true, 'coordinator classifies it as rate_limited (007/008)')
    ok('override + limit → tagged ClaudeRateLimitError → 007/008 rate_limited, pool intact')
  }

  // sanity: the rate-limit regex still recognizes the underlying banner
  assert.equal(isClaudeRateLimit('You have hit your usage limit'), true)

  console.log(`\n✅ claude-override-verify: ${passed} checks passed`)
}

main().catch((e) => { console.error('❌ verify failed:', e); process.exit(1) })
