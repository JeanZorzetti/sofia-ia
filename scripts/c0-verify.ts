// scripts/c0-verify.ts
// Local verification for the C0 pure core (no DB / no external deps).
// Run: npx tsx scripts/c0-verify.ts
import assert from 'node:assert/strict'
import { parseCodeActions } from '../src/lib/orchestration/team/code-protocol'
import { createCodeChatFn } from '../src/lib/orchestration/team/code-agent'
import type { ChatFn, ChatMessageInput } from '../src/lib/orchestration/team/team-types'
import type { Sandbox, CommandResult } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── parseCodeActions ───────────────────────────────────────────────
console.log('parseCodeActions')
{
  const a = parseCodeActions('@RUN ls -la')
  assert.deepEqual(a, [{ type: 'run', command: 'ls -la' }])
  ok('single @RUN')
}
{
  const a = parseCodeActions('@RUN ls\n@RUN pwd')
  assert.equal(a.length, 2)
  assert.equal(a[0].command, 'ls')
  assert.equal(a[1].command, 'pwd')
  ok('multiple @RUN')
}
{
  const a = parseCodeActions('@RUN `echo hi`')
  assert.equal(a[0].command, 'echo hi')
  ok('strips surrounding backticks')
}
{
  const a = parseCodeActions('@RUN $ pwd')
  assert.equal(a[0].command, 'pwd')
  ok('strips leading shell prompt')
}
{
  const a = parseCodeActions('@DONE tudo certo\nmais detalhes')
  assert.deepEqual(a, [{ type: 'done', text: 'tudo certo\nmais detalhes' }])
  ok('@DONE accumulates trailing lines')
}
{
  const a = parseCodeActions('penso, logo:\n@RUN make\nblá\n@DONE pronto')
  assert.equal(a.length, 2)
  assert.equal(a[0].type, 'run')
  assert.equal(a[0].command, 'make')
  assert.equal(a[1].type, 'done')
  assert.equal(a[1].text, 'pronto')
  ok('ignores noise lines, mixes run + done')
}
{
  assert.deepEqual(parseCodeActions('só conversa, sem diretiva'), [])
  ok('no directives → empty')
}

// ── createCodeChatFn ───────────────────────────────────────────────
function fakeSandbox(): Sandbox & { calls: string[] } {
  const calls: string[] = []
  return {
    id: 'sbx-test',
    calls,
    async exec(cmd: string): Promise<CommandResult> {
      calls.push(cmd)
      return { stdout: `out:${cmd}`, stderr: '', exitCode: 0, ms: 1 }
    },
    async writeFile() {},
    async getPreviewUrl() { return '' },
    async setTimeout() {},
    async close() {},
  }
}

// scripted chat: returns the next message each call, recording the messages it saw
function scriptedChat(responses: string[]): ChatFn & { seen: ChatMessageInput[][]; n: number } {
  const fn = (async (_agentId, messages) => {
    fn.seen.push(messages.map(m => ({ ...m })))
    const msg = responses[Math.min(fn.n, responses.length - 1)]
    fn.n++
    return { message: msg, model: 'fake/model', usage: { total_tokens: 10 } }
  }) as ChatFn & { seen: ChatMessageInput[][]; n: number }
  fn.seen = []
  fn.n = 0
  return fn
}

async function main() {
console.log('createCodeChatFn')
{
  // Scenario A: run two commands, then finish.
  const sbx = fakeSandbox()
  const chat = scriptedChat(['@RUN ls\n@RUN pwd', '@DONE tudo certo'])
  const codeChat = createCodeChatFn(sbx, chat)
  const res = await codeChat('agent-1', [{ role: 'user', content: 'liste e mostre o dir' }], undefined, { model: 'm' })

  assert.deepEqual(sbx.calls, ['ls', 'pwd'])
  assert.equal(res.message, 'tudo certo')
  assert.equal(res.artifacts?.commands.length, 2)
  assert.equal(res.artifacts?.commands[0].cmd, 'ls')
  assert.equal(res.artifacts?.commands[0].stdout, 'out:ls')
  assert.equal(res.usage?.total_tokens, 20) // two LLM turns × 10
  assert.equal(chat.n, 2)
  ok('runs commands → feeds output → finishes on @DONE')

  // protocol injected into first user message
  assert.ok(chat.seen[0][0].content.includes('@RUN'), 'protocol injected')
  assert.ok(chat.seen[0][0].content.includes('liste e mostre o dir'), 'original prompt preserved')
  ok('injects exec protocol into first user message')

  // observation fed back on the 2nd turn
  const turn2 = chat.seen[1]
  assert.ok(turn2.some(m => m.role === 'user' && m.content.includes('out:ls')), 'observation fed back')
  ok('feeds command output back into the conversation')
}

{
  // Scenario B: pure text, no commands → finishes immediately.
  const sbx = fakeSandbox()
  const chat = scriptedChat(['Não preciso rodar nada, a resposta é 42.'])
  const codeChat = createCodeChatFn(sbx, chat)
  const res = await codeChat('agent-1', [{ role: 'user', content: 'qual a resposta?' }])
  assert.equal(sbx.calls.length, 0)
  assert.equal(res.message, 'Não preciso rodar nada, a resposta é 42.')
  assert.equal(res.artifacts?.commands.length, 0)
  assert.equal(chat.n, 1)
  ok('no commands → single turn, finishes')
}

{
  // Scenario C: never finishes → bounded by maxSteps.
  const sbx = fakeSandbox()
  const chat = scriptedChat(['@RUN loop'])
  const codeChat = createCodeChatFn(sbx, chat, { maxSteps: 3 })
  const res = await codeChat('agent-1', [{ role: 'user', content: 'go' }])
  assert.equal(sbx.calls.length, 3)
  assert.equal(chat.n, 3)
  assert.equal(res.artifacts?.commands.length, 3)
  ok('maxSteps caps the loop')
}

console.log(`\n✅ all ${passed} assertions passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
