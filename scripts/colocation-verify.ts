// scripts/colocation-verify.ts
// Local verification for the lead/reviewer co-location slice (003 — US2). No DB / no
// network: a fake sandbox + scripted chat. Asserts the enrichment fires ONLY on a
// non-worker turn of a code-run with a workdir + an injected resolveMemberRole, and is
// byte-identical to the legacy path otherwise (the invariant c0..c3 rely on).
// Run: npx tsx scripts/colocation-verify.ts
import assert from 'node:assert/strict'
import { buildColocationContext } from '../src/lib/orchestration/team/co-location'
import { createCodeChatFn } from '../src/lib/orchestration/team/code-agent'
import type { ChatFn, ChatMessageInput, TeamRole } from '../src/lib/orchestration/team/team-types'
import type { Sandbox, CommandResult, ExecOptions } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

type Responder = (cmd: string) => Partial<CommandResult>
function fakeSandbox(responder: Responder = () => ({})): Sandbox & { calls: string[] } {
  const calls: string[] = []
  return {
    id: 'sbx', calls,
    async exec(cmd: string, _opts?: ExecOptions): Promise<CommandResult> {
      calls.push(cmd)
      const r = responder(cmd)
      return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', exitCode: r.exitCode ?? 0, ms: 1 }
    },
    async writeFile() {}, async getPreviewUrl() { return '' }, async setTimeout() {}, async close() {},
  }
}

function scriptedChat(responses: string[]): ChatFn & { seen: ChatMessageInput[][]; n: number } {
  const fn = (async (_a, messages) => {
    fn.seen.push(messages.map(m => ({ ...m })))
    const msg = responses[Math.min(fn.n, responses.length - 1)]
    fn.n++
    return { message: msg, model: 'fake' }
  }) as ChatFn & { seen: ChatMessageInput[][]; n: number }
  fn.seen = []; fn.n = 0
  return fn
}

const roleResolver = (role: TeamRole | null) => async () => role
const treeResponder: Responder = cmd => (cmd.includes('git ls-files') ? { stdout: 'src/a.ts\nsrc/b.ts' } : {})

async function main() {
  // ── buildColocationContext (pure helper) ──
  console.log('buildColocationContext (pure)')
  {
    const sbx = fakeSandbox(cmd => (cmd.includes('git ls-files') ? { stdout: 'src/a.ts\nsrc/b.ts\nREADME.md' } : {}))
    const ctx = await buildColocationContext({ role: 'lead', sandbox: sbx, workdir: '/w' })
    assert.ok(ctx?.includes('Estrutura do repositório'), 'lead → repo tree header')
    assert.ok(ctx!.includes('src/a.ts') && ctx!.includes('README.md'), 'lead → real file list')
    ok('lead snapshot includes the real repo tree')
  }
  {
    const sbx = fakeSandbox(cmd => {
      if (cmd.includes('git ls-files')) return { stdout: 'pkg.json' }
      if (cmd.includes('cat -- ')) return { stdout: '{ "name": "x" }' }
      return {}
    })
    const ctx = await buildColocationContext({ role: 'lead', sandbox: sbx, workdir: '/w', keyFiles: ['pkg.json'] })
    assert.ok(ctx!.includes('### pkg.json') && ctx!.includes('"name": "x"'), 'key file content injected')
    ok('lead snapshot includes capped key-file contents')
  }
  {
    const sbx = fakeSandbox(cmd => {
      if (cmd.includes('git ls-files')) return { exitCode: 1, stderr: 'not a git repo' }
      if (cmd.includes('find .')) return { stdout: './x.txt\n./y.txt' }
      return {}
    })
    const ctx = await buildColocationContext({ role: 'lead', sandbox: sbx, workdir: '/w' })
    assert.ok(ctx!.includes('x.txt'), 'find fallback used when git ls-files fails')
    ok('lead snapshot falls back to find for a non-git dir')
  }
  {
    const sbx = fakeSandbox(() => ({ stdout: '' }))
    assert.equal(await buildColocationContext({ role: 'lead', sandbox: sbx, workdir: '/w' }), null)
    ok('lead snapshot returns null when there is nothing to show')
  }
  {
    const sbx = fakeSandbox()
    const ctx = await buildColocationContext({ role: 'reviewer', sandbox: sbx, workdir: '/w' })
    assert.ok(ctx?.includes('verificar') && ctx.includes('@RUN'), 'reviewer → verify hint')
    assert.equal(sbx.calls.length, 0, 'reviewer hint is static — no sandbox calls')
    ok('reviewer hint is the static verify block (no exec)')
  }

  // ── code-agent enrichment trigger ──
  console.log('code-agent enrichment trigger')
  {
    const sbx = fakeSandbox(treeResponder)
    const chat = scriptedChat(['resposta do lead'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/repo', resolveMemberRole: roleResolver('lead') })
    await codeChat('agent-lead', [{ role: 'user', content: 'planeje a missão' }], undefined, { memberId: 'm1' })
    const firstMsg = chat.seen[0][0].content
    assert.ok(firstMsg.includes('Estrutura do repositório') && firstMsg.includes('src/a.ts'), 'lead enriched with repo tree')
    assert.ok(firstMsg.includes('planeje a missão'), 'original prompt preserved')
    assert.ok(firstMsg.includes('@RUN'), 'protocol still injected on top')
    ok('lead turn (no taskId + workdir + role=lead) → repo snapshot injected')
  }
  {
    const sbx = fakeSandbox(treeResponder)
    const chat = scriptedChat(['@APPROVE'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/repo', resolveMemberRole: roleResolver('reviewer') })
    await codeChat('agent-rev', [{ role: 'user', content: '## Diff das mudanças\n+new\nAvalie' }], undefined, { memberId: 'm2' })
    const firstMsg = chat.seen[0][0].content
    assert.ok(firstMsg.includes('verificar') && firstMsg.includes('@RUN npm test'), 'reviewer enriched with verify hint')
    assert.ok(firstMsg.includes('## Diff das mudanças') && firstMsg.includes('+new'), 'diff preserved in the message')
    ok('reviewer turn (role=reviewer) → verify hint injected, diff preserved')
  }
  {
    const sbx = fakeSandbox(treeResponder)
    const chat = scriptedChat(['@DONE feito'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/repo', resolveMemberRole: roleResolver('lead') })
    await codeChat('agent-w', [{ role: 'user', content: 'execute a task' }], undefined, { taskId: 't1', memberId: 'm3' })
    const firstMsg = chat.seen[0][0].content
    assert.ok(!firstMsg.includes('Estrutura do repositório'), 'worker turn NOT enriched')
    assert.ok(firstMsg.includes('execute a task'), 'original prompt intact')
    ok('worker turn (taskId present) → no enrichment')
  }
  {
    const sbx = fakeSandbox(treeResponder)
    const chat = scriptedChat(['x'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/repo', resolveMemberRole: roleResolver('worker') })
    await codeChat('a', [{ role: 'user', content: 'oi' }], undefined, { memberId: 'm' })
    assert.ok(!chat.seen[0][0].content.includes('Estrutura do repositório'), 'role=worker not enriched')
    ok('resolved role=worker → no enrichment (only lead/reviewer)')
  }

  // ── byte-identical to legacy when not triggered ──
  console.log('byte-identical to legacy (FR-009 / Princípio II)')
  const msgs = (): ChatMessageInput[] => [{ role: 'user', content: 'oi' }]
  {
    // workdir present but NO resolver → identical to legacy (what c0..c3 rely on)
    const sbx = fakeSandbox(treeResponder)
    const a = scriptedChat(['x']); const b = scriptedChat(['x'])
    await createCodeChatFn(sbx, a, { workdir: '/repo' })('a', msgs(), undefined, { memberId: 'm' })
    await createCodeChatFn(sbx, b, { workdir: '/repo' })('a', msgs(), undefined, { memberId: 'm' })
    assert.deepEqual(a.seen[0], b.seen[0], 'no resolver → identical messages')
    ok('resolveMemberRole absent → byte-identical to legacy')
  }
  {
    // resolver present but NO workdir → identical to legacy
    const sbx = fakeSandbox(treeResponder)
    const a = scriptedChat(['x']); const b = scriptedChat(['x'])
    await createCodeChatFn(sbx, a, { resolveMemberRole: roleResolver('lead') })('a', msgs(), undefined, { memberId: 'm' })
    await createCodeChatFn(sbx, b, {})('a', msgs(), undefined, { memberId: 'm' })
    assert.deepEqual(a.seen[0], b.seen[0], 'no workdir → identical messages')
    ok('no workdir → byte-identical to legacy (no enrichment)')
  }

  console.log(`\n✅ all ${passed} assertions passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
