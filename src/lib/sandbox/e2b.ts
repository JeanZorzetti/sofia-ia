// src/lib/sandbox/e2b.ts
// E2B implementation of the SandboxProvider port (Sub-projeto C — C0).
// Lazy-imports the SDK so the heavy module + its env requirements never load at
// build time (mirrors the Groq lazy-init rule in CLAUDE.md). The adapter is
// defensive about the SDK surface — confirm exact field names on first deploy.

import type {
  Sandbox as ISandbox, SandboxProvider, CommandResult, ExecOptions, CreateSandboxOptions,
} from './types'

type E2BModule = typeof import('e2b')
let mod: E2BModule | null = null
async function loadE2B(): Promise<E2BModule> {
  if (!mod) mod = await import('e2b')
  return mod
}

class E2BSandbox implements ISandbox {
  // `any` on purpose: keep this adapter decoupled from the exact SDK types.
  constructor(private readonly sbx: any) {}

  get id(): string {
    return this.sbx?.sandboxId ?? this.sbx?.id ?? 'unknown'
  }

  async exec(cmd: string, opts?: ExecOptions): Promise<CommandResult> {
    const start = Date.now()
    try {
      const r = await this.sbx.commands.run(cmd, { timeoutMs: opts?.timeoutMs, cwd: opts?.cwd, envs: opts?.env })
      return { stdout: r?.stdout ?? '', stderr: r?.stderr ?? '', exitCode: r?.exitCode ?? 0, ms: Date.now() - start }
    } catch (e: any) {
      // e2b throws CommandExitError on non-zero exit; it carries stdout/stderr/exitCode.
      return {
        stdout: e?.stdout ?? '',
        stderr: e?.stderr ?? e?.message ?? String(e),
        exitCode: typeof e?.exitCode === 'number' ? e.exitCode : 1,
        ms: Date.now() - start,
      }
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.sbx.files.write(path, content)
  }

  async getPreviewUrl(port: number): Promise<string> {
    // E2B exposes any bound port at `{port}-{sandboxId}.e2b.app`. getHost returns the
    // bare host (no scheme); wrap to https. `await` tolerates sync- or promise-returning SDKs.
    const host = await this.sbx.getHost(port)
    return `https://${host}`
  }

  async setTimeout(ms: number): Promise<void> {
    await this.sbx?.setTimeout?.(ms)
  }

  async close(): Promise<void> {
    await this.sbx?.kill?.()
  }
}

export function createE2BProvider(): SandboxProvider {
  return {
    async create(opts?: CreateSandboxOptions): Promise<ISandbox> {
      const apiKey = process.env.E2B_API_KEY
      if (!apiKey) throw new Error('E2B_API_KEY não configurada — code-runs precisam de um sandbox provider')
      const { Sandbox } = await loadE2B()
      const sbx = opts?.templateId
        ? await (Sandbox as any).create(opts.templateId, { apiKey, timeoutMs: opts?.timeoutMs })
        : await (Sandbox as any).create({ apiKey, timeoutMs: opts?.timeoutMs })
      return new E2BSandbox(sbx)
    },
    async connect(id: string): Promise<ISandbox> {
      const apiKey = process.env.E2B_API_KEY
      if (!apiKey) throw new Error('E2B_API_KEY não configurada — preview precisa reconectar ao sandbox')
      const { Sandbox } = await loadE2B()
      const sbx = await (Sandbox as any).connect(id, { apiKey })
      return new E2BSandbox(sbx)
    },
  }
}
