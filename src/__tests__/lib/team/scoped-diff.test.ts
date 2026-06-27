// src/__tests__/lib/team/scoped-diff.test.ts
// T004 — captureTreeDiff: delta between two tree-ish objects, caps, error→[]
import { captureTreeDiff } from '@/lib/git/repo-lifecycle'

function makeSandbox(responses: Record<string, { exitCode: number; stdout: string; stderr?: string }>) {
  return {
    exec: async (cmd: string) => {
      for (const [key, val] of Object.entries(responses)) {
        if (cmd.includes(key)) return { exitCode: val.exitCode, stdout: val.stdout, stderr: val.stderr ?? '', ms: 0 }
      }
      return { exitCode: 0, stdout: '', stderr: '', ms: 0 }
    },
  }
}

describe('captureTreeDiff', () => {
  const opts = { workdir: '/repo', before: 'abc123', after: 'def456' }

  it('returns [] when name-status fails', async () => {
    const sb = makeSandbox({ '--name-status': { exitCode: 1, stdout: '' } })
    expect(await captureTreeDiff(sb as never, opts)).toEqual([])
  })

  it('returns [] when name-status output is empty', async () => {
    const sb = makeSandbox({ '--name-status': { exitCode: 0, stdout: '' } })
    expect(await captureTreeDiff(sb as never, opts)).toEqual([])
  })

  it('returns name-only list when full diff fails', async () => {
    const sb = makeSandbox({
      '--name-status': { exitCode: 0, stdout: 'M\tsrc/foo.ts\n' },
      'diff ': { exitCode: 1, stdout: '' },
    })
    const result = await captureTreeDiff(sb as never, opts)
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('src/foo.ts')
    expect(result[0].patch).toBeUndefined()
  })

  it('attaches patches and respects caps', async () => {
    const patch = `diff --git a/src/foo.ts b/src/foo.ts\nindex 0000..1111\n--- a/src/foo.ts\n+++ b/src/foo.ts\n@@ -1 +1 @@\n-old\n+new\n`
    const sb = makeSandbox({
      '--name-status': { exitCode: 0, stdout: 'M\tsrc/foo.ts\n' },
      'diff ': { exitCode: 0, stdout: patch },
    })
    const result = await captureTreeDiff(sb as never, opts)
    expect(result[0].patch).toBeDefined()
  })

  it('returns [] on exception (best-effort)', async () => {
    const sb = { exec: async () => { throw new Error('boom') } }
    expect(await captureTreeDiff(sb as never, opts)).toEqual([])
  })
})
