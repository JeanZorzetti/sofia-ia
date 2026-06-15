// scripts/optionb-verify.ts
// Local verification for Option B: Claude CLI running inside the sandbox for WORKER
// turns (Sub-projeto C). No DB / no network. Run: npx tsx scripts/optionb-verify.ts
import assert from 'node:assert/strict'
import { createCodeChatFn } from '../src/lib/orchestration/team/code-agent'
import { parseStreamJson } from '../src/lib/orchestration/team/sandbox-cli-agent'
import type { ChatFn } from '../src/lib/orchestration/team/team-types'
import type { Sandbox, CommandResult, ExecOptions } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const SAMPLE_STREAM = [
  '{"type":"system","subtype":"init"}',
  '{"type":"assistant","message":{"content":[{"type":"text","text":"vou criar"},{"type":"tool_use","id":"tu1","name":"Bash","input":{"command":"echo hi > f.txt"}}]}}',
  '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"tu2","name":"Write","input":{"file_path":"f.txt"}}]}}',
  '{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tu1","content":"ok"}]}}',
  '{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tu2","content":[{"type":"text","text":"escrito"}]}]}}',
  '{"type":"result","subtype":"success","result":"Criei o arquivo f.txt","usage":{"input_tokens":100,"output_tokens":20}}',
].join('\n')

function fakeSandbox(stdout = ''): Sandbox & {
  execCalls: { cmd: string; opts?: ExecOptions }[]
  writes: { path: string; content: string }[]
} {
  const execCalls: { cmd: string; opts?: ExecOptions }[] = []
  const writes: { path: string; content: string }[] = []
  return {
    id: 'sbx', execCalls, writes,
    async exec(cmd: string, opts?: ExecOptions): Promise<CommandResult> {
      execCalls.push({ cmd, opts })
      return { stdout, stderr: '', exitCode: 0, ms: 1 }
    },
    async writeFile(path: string, content: string): Promise<void> { writes.push({ path, content }) },
    async close() {},
  }
}

function scriptedChat(responses: string[]): ChatFn & { n: number } {
  const fn = (async () => {
    const msg = responses[Math.min(fn.n, responses.length - 1)] ?? ''
    fn.n++
    return { message: msg, model: 'fake/model', usage: { total_tokens: 5 } }
  }) as unknown as ChatFn & { n: number }
  fn.n = 0
  return fn
}

async function main() {
  // ── parseStreamJson ────────────────────────────────────────────────
  console.log('parseStreamJson')
  {
    const p = parseStreamJson(SAMPLE_STREAM)
    assert.equal(p.message, 'Criei o arquivo f.txt')
    assert.equal(p.totalTokens, 120)
    assert.equal(p.commands.length, 2)
    assert.equal(p.commands[0].cmd, 'echo hi > f.txt')
    assert.equal(p.commands[0].stdout, 'ok')
    assert.equal(p.commands[1].cmd, '# write f.txt')
    assert.equal(p.commands[1].stdout, 'escrito')
    ok('extracts result text, token usage and command log')
  }
  {
    // no result event → falls back to concatenated assistant text
    const p = parseStreamJson('{"type":"assistant","message":{"content":[{"type":"text","text":"só texto"}]}}')
    assert.equal(p.message, 'só texto')
    assert.equal(p.commands.length, 0)
    ok('no result event → assistant-text fallback')
  }
  {
    assert.deepEqual(parseStreamJson('lixo não-json\n{ quebrado'), { message: '', totalTokens: 0, commands: [] })
    ok('tolerant to garbage lines')
  }

  // ── createCodeChatFn routing ───────────────────────────────────────
  console.log('createCodeChatFn (Option B routing)')
  {
    // A: worker turn + claude-* + token → runs claude IN the sandbox (no @RUN proxy).
    const sbx = fakeSandbox(SAMPLE_STREAM)
    const chat = scriptedChat(['NUNCA CHAMADO'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/home/user/repo', claudeToken: 'tok-123' })
    const res = await codeChat('w1', [{ role: 'user', content: 'crie f.txt' }], undefined, { model: 'claude-sonnet-4-6', taskId: 't1' })

    assert.equal(chat.n, 0, 'baseChat NOT used for sandbox-CLI worker')
    assert.equal(sbx.writes.length >= 1, true, 'prompt written into sandbox')
    assert.equal(sbx.execCalls.length, 1)
    assert.ok(sbx.execCalls[0].cmd.includes('claude --print'), 'runs claude in sandbox')
    assert.ok(sbx.execCalls[0].cmd.includes('--model claude-sonnet-4-6'), 'maps model id')
    assert.equal(sbx.execCalls[0].opts?.cwd, '/home/user/repo', 'cwd = repo dir')
    assert.equal(sbx.execCalls[0].opts?.env?.CLAUDE_CODE_OAUTH_TOKEN, 'tok-123', 'token via env')
    assert.equal(sbx.execCalls[0].opts?.env?.IS_SANDBOX, '1')
    assert.equal(res.message, 'Criei o arquivo f.txt')
    assert.equal(res.artifacts?.commands.length, 2)
    ok('worker + claude-* + token → claude runs inside the sandbox')
  }
  {
    // B: worker turn + plain LLM → stays on the @RUN proxy (baseChat drives it).
    const sbx = fakeSandbox(SAMPLE_STREAM)
    const chat = scriptedChat(['sem comandos, resposta direta'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/home/user/repo', claudeToken: 'tok-123' })
    const res = await codeChat('w1', [{ role: 'user', content: 'faça algo' }], undefined, { model: 'llama-3.3-70b-versatile', taskId: 't1' })

    assert.equal(chat.n, 1, 'baseChat used (@RUN proxy)')
    assert.equal(sbx.writes.length, 0, 'no in-sandbox CLI write')
    assert.equal(res.message, 'sem comandos, resposta direta')
    ok('worker + plain LLM → @RUN proxy unchanged')
  }
  {
    // C: NON-worker turn (no taskId) + claude-* → NOT sandbox-CLI (text path).
    const sbx = fakeSandbox(SAMPLE_STREAM)
    const chat = scriptedChat(['@APPROVE'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/home/user/repo', claudeToken: 'tok-123' })
    const res = await codeChat('rev', [{ role: 'user', content: 'revise' }], undefined, { model: 'claude-sonnet-4-6' })

    assert.equal(chat.n, 1, 'baseChat used for reviewer/lead')
    assert.equal(sbx.writes.length, 0, 'reviewer does NOT run claude in sandbox')
    assert.equal(res.message, '@APPROVE')
    ok('non-worker claude turn → text path (no sandbox CLI)')
  }
  {
    // D: worker + claude-* but NO token → falls back to @RUN proxy.
    const sbx = fakeSandbox(SAMPLE_STREAM)
    const chat = scriptedChat(['fallback'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/home/user/repo' })
    await codeChat('w1', [{ role: 'user', content: 'x' }], undefined, { model: 'claude-sonnet-4-6', taskId: 't1' })

    assert.equal(chat.n, 1, 'no token → baseChat fallback')
    assert.equal(sbx.writes.length, 0)
    ok('worker + claude-* without token → @RUN fallback')
  }

  console.log(`\n✅ all ${passed} assertions passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
