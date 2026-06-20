// scripts/stage-exclude-verify.ts
// Verifies the git lifecycle never stages build-artifact dirs (node_modules, .next, …),
// so a repo WITHOUT a proper .gitignore doesn't get a 125MB binary
// (e.g. node_modules/@next/swc-*.node) rejected by GitHub's 100MB/file limit on push.
// Run: npx tsx scripts/stage-exclude-verify.ts
import assert from 'node:assert/strict'
import {
  commitAndPush,
  stageExcludePathspecs,
  STAGE_EXCLUDE_DIRS,
} from '../src/lib/git/repo-lifecycle'
import type { Sandbox, CommandResult } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

type Responder = (cmd: string) => Partial<CommandResult>
function scriptedSandbox(responder: Responder = () => ({})): Sandbox & { calls: { cmd: string }[] } {
  const calls: { cmd: string }[] = []
  return {
    id: 'sbx', calls,
    async exec(cmd: string): Promise<CommandResult> {
      calls.push({ cmd })
      const r = responder(cmd)
      return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', exitCode: r.exitCode ?? 0, ms: 1 }
    },
    async writeFile() {}, async getPreviewUrl() { return '' },
    async setTimeout() {}, async close() {},
  }
}

async function main() {
  // ── pure helper ──────────────────────────────────────────────────
  console.log('stageExcludePathspecs (pure)')
  {
    const specs = stageExcludePathspecs()
    assert.equal(specs.length, STAGE_EXCLUDE_DIRS.length, 'one pathspec per excluded dir')
    assert.ok(specs.includes(':(exclude,glob)**/node_modules/**'), 'node_modules excluded at any depth')
    assert.ok(specs.includes(':(exclude,glob)**/.next/**'), '.next excluded at any depth')
    assert.ok(specs.every(s => s.startsWith(':(exclude,glob)')), 'every spec is an exclude glob pathspec')
    ok('builds one `:(exclude,glob)**/<dir>/**` pathspec per artifact dir')
    const custom = stageExcludePathspecs(['foo'])
    assert.deepEqual(custom, [':(exclude,glob)**/foo/**'])
    ok('honors a custom dir list')
  }

  // ── commitAndPush wiring ─────────────────────────────────────────
  console.log('commitAndPush excludes build artifacts from staging')
  {
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('status --porcelain')) return { stdout: '' }
      if (cmd.includes('rev-list --count')) return { stdout: '1\n' }
      if (cmd.includes('diff --name-status')) return { stdout: 'M\tsrc/a.ts' }
      if (cmd.includes('rev-parse')) return { stdout: 'abc\n' }
      return {}
    })
    await commitAndPush(sbx, { repoUrl: 'o/r', token: 't', branch: 'b', base: 'main', workdir: '/w', message: 'x' })
    const addCall = sbx.calls.find(c => / add /.test(c.cmd))
    assert.ok(addCall, 'an add command ran')
    assert.match(addCall!.cmd, /node_modules/, 'add excludes node_modules')
    assert.match(addCall!.cmd, /:\(exclude,glob\)/, 'add uses exclude glob pathspecs')
    // still a `-A` add (stages deletions too) scoped to the worktree root
    assert.match(addCall!.cmd, / add -A /, 'still stages all changes (-A)')
    ok('git add stages everything except artifact dirs')
  }

  console.log(`\n✅ all ${passed} assertions passed`)
}
main().catch(e => { console.error(e); process.exit(1) })
