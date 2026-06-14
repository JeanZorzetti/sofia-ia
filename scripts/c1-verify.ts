// scripts/c1-verify.ts
// Local verification for the C1 git lifecycle (no DB / no network / no real git).
// Run: npx tsx scripts/c1-verify.ts
import assert from 'node:assert/strict'
import {
  parseRepoSlug, toCloneUrl, authHeaderArgs, shQuote, sanitizeCommitSubject,
  parseChangedFiles, buildPrBody, setupRepo, commitAndPush, openPullRequest,
} from '../src/lib/git/repo-lifecycle'
import { createCodeChatFn } from '../src/lib/orchestration/team/code-agent'
import type { ChatFn, ChatMessageInput } from '../src/lib/orchestration/team/team-types'
import type { Sandbox, CommandResult, ExecOptions } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── parseRepoSlug / toCloneUrl ─────────────────────────────────────
console.log('parseRepoSlug')
{
  assert.deepEqual(parseRepoSlug('https://github.com/owner/repo.git'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoSlug('https://github.com/owner/repo'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoSlug('git@github.com:owner/repo.git'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoSlug('owner/repo'), { owner: 'owner', repo: 'repo' })
  ok('parses https / ssh / shorthand')
  assert.throws(() => parseRepoSlug('justastring'))
  ok('throws on garbage')
  assert.equal(toCloneUrl('https://github.com/octo/Demo'), 'https://github.com/octo/Demo.git')
  ok('toCloneUrl canonicalizes')
}

// ── authHeaderArgs (token only as base64, never raw) ───────────────
console.log('authHeaderArgs')
{
  const b64 = Buffer.from('x-access-token:ghp_TEST').toString('base64')
  const args = authHeaderArgs('ghp_TEST')
  assert.equal(args, `-c http.extraHeader="AUTHORIZATION: basic ${b64}"`)
  assert.ok(!args.includes('ghp_TEST'), 'raw token must not appear')
  ok('builds Basic auth header without leaking the raw token')
}

// ── shQuote / sanitizeCommitSubject ────────────────────────────────
console.log('shQuote / sanitizeCommitSubject')
{
  assert.equal(shQuote("a'b"), `'a'\\''b'`)
  ok('escapes embedded single quotes')
  assert.equal(sanitizeCommitSubject('linha 1\nlinha 2   com   espaços'), 'linha 1 linha 2 com espaços')
  ok('collapses whitespace into one line')
  assert.equal(sanitizeCommitSubject('   '), 'Polaris Teams code-run')
  ok('falls back when empty')
  assert.ok(sanitizeCommitSubject('x'.repeat(200)).length <= 72)
  ok('truncates to ≤72 chars')
}

// ── parseChangedFiles ──────────────────────────────────────────────
console.log('parseChangedFiles')
{
  const files = parseChangedFiles('M\tsrc/a.ts\nA\tsrc/b.ts\n')
  assert.deepEqual(files, [{ status: 'M', path: 'src/a.ts' }, { status: 'A', path: 'src/b.ts' }])
  ok('parses name-status lines')
  const renamed = parseChangedFiles('R100\told.ts\tnew.ts')
  assert.deepEqual(renamed, [{ status: 'R', path: 'new.ts' }])
  ok('rename → status R, takes the new path')
  assert.deepEqual(parseChangedFiles('\n  \n'), [])
  ok('blank output → empty')
}

// ── buildPrBody ────────────────────────────────────────────────────
console.log('buildPrBody')
{
  const body = buildPrBody('Fazer X', [
    { title: 'tarefa 1', status: 'done' },
    { title: 'tarefa 2', status: 'rejected' },
  ], [{ status: 'A', path: 'a.txt' }])
  assert.ok(body.includes('## Missão') && body.includes('Fazer X'))
  assert.ok(body.includes('tarefa 1') && !body.includes('tarefa 2'), 'only done tasks listed')
  assert.ok(body.includes('`A` a.txt'))
  ok('renders mission + done tasks + changed files')
}

// ── fakes ──────────────────────────────────────────────────────────
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

async function main() {
  // ── setupRepo ────────────────────────────────────────────────────
  console.log('setupRepo')
  {
    // base exists on remote → clone --branch, returns that base
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('ls-remote')) return { stdout: 'abc\trefs/heads/main' }
      if (cmd.includes('rev-parse HEAD')) return { stdout: 'sha123\n' }
      return {}
    })
    const res = await setupRepo(sbx, {
      repoUrl: 'https://github.com/octo/demo', token: 'ghp_TEST',
      branch: 'polaris/run-r1', base: 'main', workdir: '/home/user/repo',
      authorName: 'Polaris Teams', authorEmail: 'polaris@x.com',
    })
    assert.deepEqual(res, { base: 'main' })
    const cmds = sbx.calls.map(c => c.cmd)
    const clone = cmds.find(c => c.includes('clone'))!
    assert.ok(clone.includes('http.extraHeader') && clone.includes("--branch 'main'"))
    assert.ok(clone.includes("'https://github.com/octo/demo.git'") && clone.includes("'/home/user/repo'"))
    assert.ok(!clone.includes('ghp_TEST'), 'token must not appear raw in clone')
    assert.ok(cmds.some(c => c.includes("checkout -b 'polaris/run-r1'")))
    assert.ok(cmds.some(c => c.includes("config user.name 'Polaris Teams'")))
    assert.ok(cmds.some(c => c.includes('config user.email')))
    ok('base exists → clone --branch, header auth, returns requested base')
  }
  {
    // requested base absent → clone default, base = repo default (master)
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('ls-remote')) return { stdout: '' } // base not found
      if (cmd.includes('rev-parse HEAD')) return { stdout: 'sha\n' }
      if (cmd.includes('rev-parse --abbrev-ref HEAD')) return { stdout: 'master\n' }
      return {}
    })
    const res = await setupRepo(sbx, {
      repoUrl: 'owner/repo', token: 't', branch: 'b', base: 'main',
      workdir: '/w', authorName: 'n', authorEmail: 'e',
    })
    assert.deepEqual(res, { base: 'master' })
    assert.ok(!sbx.calls.some(c => c.cmd.includes('--branch')), 'no --branch when base absent')
    ok('base absent → clones default, returns repo default branch')
  }
  {
    // empty repo → rev-parse HEAD fails → clear error
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('ls-remote')) return { stdout: '' }
      if (cmd.includes('rev-parse HEAD')) return { exitCode: 128, stderr: 'unknown revision' }
      return {}
    })
    await assert.rejects(() => setupRepo(sbx, {
      repoUrl: 'owner/repo', token: 't', branch: 'b', base: 'main', workdir: '/w', authorName: 'n', authorEmail: 'e',
    }), /vazio/)
    ok('empty repo → throws a clear "repositório vazio" error')
  }
  {
    const sbx = scriptedSandbox(cmd => (cmd.includes('clone') ? { exitCode: 128, stderr: 'auth failed' } : {}))
    await assert.rejects(() => setupRepo(sbx, {
      repoUrl: 'owner/repo', token: 't', branch: 'b', base: 'main',
      workdir: '/w', authorName: 'n', authorEmail: 'e',
    }), /clone/)
    ok('throws with context when a git step fails')
  }

  // ── commitAndPush ────────────────────────────────────────────────
  console.log('commitAndPush')
  {
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('status --porcelain')) return { stdout: ' M src/a.ts\n?? src/b.ts' }
      if (cmd.includes('show --pretty')) return { stdout: 'M\tsrc/a.ts\nA\tsrc/b.ts' }
      if (cmd.includes('rev-parse')) return { stdout: 'abc1234def\n' }
      return {}
    })
    const res = await commitAndPush(sbx, {
      repoUrl: 'owner/repo', token: 'ghp_TEST', branch: 'polaris/run-r1',
      workdir: '/home/user/repo', message: 'fazer X\ncom detalhes',
    })
    assert.equal(res.hasChanges, true)
    assert.equal(res.commitSha, 'abc1234def')
    assert.deepEqual(res.changedFiles, [{ status: 'M', path: 'src/a.ts' }, { status: 'A', path: 'src/b.ts' }])
    const pushCall = sbx.calls.find(c => c.cmd.includes('push origin'))
    assert.ok(pushCall && pushCall.cmd.includes('http.extraHeader'), 'push uses header auth')
    assert.ok(!pushCall!.cmd.includes('ghp_TEST'), 'token not raw in push')
    ok('stages, commits, parses diff + sha, pushes via header auth')
  }
  {
    const sbx = scriptedSandbox(cmd => (cmd.includes('status --porcelain') ? { stdout: '' } : {}))
    const res = await commitAndPush(sbx, {
      repoUrl: 'owner/repo', token: 't', branch: 'b', workdir: '/w', message: 'x',
    })
    assert.equal(res.hasChanges, false)
    assert.equal(res.commitSha, null)
    assert.ok(!sbx.calls.some(c => c.cmd.includes('commit') || c.cmd.includes('push')), 'no commit/push when clean')
    ok('no changes → no commit/push, hasChanges=false')
  }

  // ── openPullRequest ──────────────────────────────────────────────
  console.log('openPullRequest')
  {
    let recorded: { url: string; init: RequestInit } | null = null
    const fakeFetch = (async (url: string, init: RequestInit) => {
      recorded = { url, init }
      return {
        ok: true, status: 201,
        async json() { return { html_url: 'https://github.com/o/r/pull/7', number: 7 } },
        async text() { return '' },
      }
    }) as unknown as typeof fetch
    const pr = await openPullRequest({
      repoUrl: 'https://github.com/o/r', token: 'ghp_TEST', head: 'polaris/run-r1',
      base: 'main', title: 'T', body: 'B', draft: true,
    }, fakeFetch)
    assert.deepEqual(pr, { prUrl: 'https://github.com/o/r/pull/7', prNumber: 7 })
    assert.equal(recorded!.url, 'https://api.github.com/repos/o/r/pulls')
    assert.equal(recorded!.init.method, 'POST')
    const headers = recorded!.init.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Bearer ghp_TEST')
    const sent = JSON.parse(recorded!.init.body as string)
    assert.deepEqual(sent, { title: 'T', head: 'polaris/run-r1', base: 'main', body: 'B', draft: true })
    ok('POSTs a draft PR to the right repo with Bearer auth')
  }
  {
    const failFetch = (async () => ({
      ok: false, status: 422, async json() { return {} }, async text() { return 'validation failed' },
    })) as unknown as typeof fetch
    await assert.rejects(() => openPullRequest({
      repoUrl: 'o/r', token: 't', head: 'h', base: 'main', title: 'T', body: 'B', draft: true,
    }, failFetch), /422/)
    ok('throws on non-2xx from GitHub')
  }

  // ── code-agent workdir (C1 wiring) ───────────────────────────────
  console.log('createCodeChatFn workdir')
  function scriptedChat(responses: string[]): ChatFn & { seen: ChatMessageInput[][] } {
    let n = 0
    const fn = (async (_a, messages) => {
      fn.seen.push(messages.map(m => ({ ...m })))
      const msg = responses[Math.min(n, responses.length - 1)]; n++
      return { message: msg, model: 'fake', usage: { total_tokens: 1 } }
    }) as ChatFn & { seen: ChatMessageInput[][] }
    fn.seen = []
    return fn
  }
  {
    const sbx = scriptedSandbox()
    const chat = scriptedChat(['@RUN ls', '@DONE ok'])
    const codeChat = createCodeChatFn(sbx, chat, { workdir: '/home/user/repo' })
    await codeChat('a', [{ role: 'user', content: 'faça' }])
    assert.equal(sbx.calls[0].opts?.cwd, '/home/user/repo')
    assert.ok(chat.seen[0][0].content.includes('REPOSITÓRIO'), 'repo-context note injected')
    ok('passes workdir as cwd + injects repo-context note')
  }
  {
    const sbx = scriptedSandbox()
    const chat = scriptedChat(['@RUN ls', '@DONE ok'])
    const codeChat = createCodeChatFn(sbx, chat) // no workdir → C0 behavior
    await codeChat('a', [{ role: 'user', content: 'faça' }])
    assert.equal(sbx.calls[0].opts?.cwd, undefined)
    assert.ok(!chat.seen[0][0].content.includes('REPOSITÓRIO'), 'no repo note without workdir')
    ok('no workdir → undefined cwd, no repo note (C0 unchanged)')
  }

  console.log(`\n✅ all ${passed} assertions passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
