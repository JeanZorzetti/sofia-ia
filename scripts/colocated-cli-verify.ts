// scripts/colocated-cli-verify.ts
// Verifies the co-located CLI slice (003 follow-up): lead/reviewer/consolidation turns
// run their Claude CLI in the run dir (vps-local) read-only, instead of the worker /app.
// Two testable risks, no CLI spawn:
//   1. code-agent threads `claudeCliCwd` ONLY for a non-worker turn with a host-local repo.
//   2. the chat-run read-only posture (what protects the diff) really blocks writes.
// Run: npx tsx scripts/colocated-cli-verify.ts
import assert from 'node:assert/strict'
import { createCodeChatFn } from '../src/lib/orchestration/team/code-agent'
import { buildCliToolFlags, READ_ONLY_CLI_TOOLS } from '../src/lib/ai/cli-tool-flags'
import type { ChatFn, ChatOptions } from '../src/lib/orchestration/team/team-types'
import type { Sandbox, CommandResult } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

function fakeSandbox(rootDir?: string): Sandbox {
  return {
    id: 'sbx', rootDir,
    async exec(): Promise<CommandResult> { return { stdout: '', stderr: '', exitCode: 0, ms: 1 } },
    async writeFile() {}, async getPreviewUrl() { return '' }, async setTimeout() {}, async close() {},
  }
}

function recordingChat(): ChatFn & { lastOptions?: ChatOptions } {
  const fn = (async (_a, _m, _ctx, opts) => {
    fn.lastOptions = opts
    return { message: 'ok', model: 'fake' }
  }) as ChatFn & { lastOptions?: ChatOptions }
  return fn
}

async function main() {
  // ── 1. code-agent threads claudeCliCwd ───────────────────────────────
  console.log('code-agent: claudeCliCwd threading')
  {
    // non-worker (no taskId) + vps-local (rootDir set) + workdir → cwd = run dir
    const chat = recordingChat()
    const codeChat = createCodeChatFn(fakeSandbox('/runs/abc'), chat, { workdir: '/runs/abc/repo' })
    await codeChat('a', [{ role: 'user', content: 'plan' }], undefined, { memberId: 'm' })
    assert.equal(chat.lastOptions?.claudeCliCwd, '/runs/abc/repo')
    ok('non-worker + vps-local rootDir + workdir → claudeCliCwd = run dir')
  }
  {
    // worker turn (taskId present) → unset (worker must keep write access in the sandbox)
    const chat = recordingChat()
    const codeChat = createCodeChatFn(fakeSandbox('/runs/abc'), chat, { workdir: '/runs/abc/repo' })
    await codeChat('a', [{ role: 'user', content: 'do' }], undefined, { taskId: 't1', memberId: 'm' })
    assert.equal(chat.lastOptions?.claudeCliCwd, undefined)
    ok('worker turn (taskId) → claudeCliCwd unset')
  }
  {
    // E2B (no rootDir) → unset (run dir is remote; local-spawn must stay on /app/legacy)
    const chat = recordingChat()
    const codeChat = createCodeChatFn(fakeSandbox(undefined), chat, { workdir: '/home/user/repo' })
    await codeChat('a', [{ role: 'user', content: 'plan' }], undefined, { memberId: 'm' })
    assert.equal(chat.lastOptions?.claudeCliCwd, undefined)
    ok('E2B (no rootDir) → claudeCliCwd unset (legacy cwd)')
  }
  {
    // no workdir → unset
    const chat = recordingChat()
    const codeChat = createCodeChatFn(fakeSandbox('/runs/abc'), chat, {})
    await codeChat('a', [{ role: 'user', content: 'plan' }], undefined, { memberId: 'm' })
    assert.equal(chat.lastOptions?.claudeCliCwd, undefined)
    ok('no workdir → claudeCliCwd unset')
  }

  // ── 2. read-only posture that protects the diff ──────────────────────
  console.log('co-located read-only posture (chat-run)')
  {
    // groq.ts passes `capabilityPolicy ?? {}` when co-located → chat-run forces read-only.
    const flags = buildCliToolFlags({ capabilities: {}, context: 'chat-run' })
    assert.equal(flags.permissionMode, 'plan', 'plan mode (no edits/exec)')
    assert.equal(flags.skipPermissions, false, 'NOT --dangerously-skip-permissions')
    assert.deepEqual(flags.allowedTools, [...READ_ONLY_CLI_TOOLS], 'only Read/Glob/Grep/LS allowed')
    assert.ok(flags.disallowedTools?.includes('Bash'), 'Bash blocked (no test/build → no diff taint)')
    assert.ok(flags.disallowedTools?.includes('Write') && flags.disallowedTools?.includes('Edit'), 'Write/Edit blocked')
    ok('{} policy in chat-run → read-only (Read/Grep only; Write/Edit/Bash blocked; plan mode)')
  }
  {
    // regression: a member WITHOUT a policy stays legacy (empty flags → skip-permissions)
    assert.deepEqual(buildCliToolFlags({ capabilities: null, context: 'chat-run' }), {})
    ok('no policy → {} (legacy --dangerously-skip-permissions preserved for non-co-located)')
  }

  console.log(`\n✅ all ${passed} assertions passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
