// src/lib/sandbox/vps-local.ts
// Self-hosted executor behind the SandboxProvider port (003 — VPS executor).
// The "sandbox" is a per-run working directory inside the worker's own container
// (already on the VPS): `${VPS_RUNS_DIR}/<id>`. This kills the ~1h E2B ceiling
// (setTimeout is a no-op) and co-locates the repo on a local FS so lead/reviewer
// can read the real working tree.
//
// No new external dependency: only node:fs / node:child_process / node:crypto.
// Lifecycle ops (create/close/writeFile) use fs primitives (cross-platform,
// idempotent); only `exec` shells out (`bash -lc`) — the target is a Linux container.
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type {
  Sandbox as ISandbox, SandboxProvider, CommandResult, ExecOptions, CreateSandboxOptions,
} from './types'

/** Base dir for all run dirs. Must be a mounted VOLUME on the worker in prod. */
export function vpsRunsBaseDir(): string {
  return process.env.VPS_RUNS_DIR || '/runs'
}

/** A dir is considered orphan once it is older than this (no live run keeps it fresh).
 *  Generous by default so a long-running mission (the whole point — no ceiling) is
 *  never swept; the cron also protects the sandboxIds of active runs. */
const DEFAULT_SWEEP_MAX_AGE_MS = Number(process.env.VPS_SWEEP_MAX_AGE_MS ?? 6 * 60 * 60_000)

/** SIGKILL grace after SIGTERM when a command exceeds its timeout. */
const SIGKILL_GRACE_MS = 2_000

class VpsLocalSandbox implements ISandbox {
  constructor(readonly id: string, readonly rootDir: string) {}

  async exec(cmd: string, opts?: ExecOptions): Promise<CommandResult> {
    const start = Date.now()
    return new Promise<CommandResult>((resolve) => {
      let settled = false
      let stdout = ''
      let stderr = ''
      let timedOut = false
      let killTimer: ReturnType<typeof setTimeout> | undefined
      let sigkillTimer: ReturnType<typeof setTimeout> | undefined
      const done = (r: CommandResult) => {
        if (settled) return
        settled = true
        if (killTimer) clearTimeout(killTimer)
        if (sigkillTimer) clearTimeout(sigkillTimer)
        resolve(r)
      }

      const child = spawn('bash', ['-lc', cmd], {
        cwd: opts?.cwd,
        // Merge the worker's env with the per-command env (secrets via the env channel,
        // never inlined in the command string — mirrors the port contract).
        env: { ...process.env, ...(opts?.env ?? {}) },
      })
      child.stdout?.on('data', (d) => { stdout += d.toString() })
      child.stderr?.on('data', (d) => { stderr += d.toString() })

      const timeoutMs = opts?.timeoutMs
      if (timeoutMs && timeoutMs > 0) {
        killTimer = setTimeout(() => {
          timedOut = true
          try { child.kill('SIGTERM') } catch { /* already gone */ }
          sigkillTimer = setTimeout(() => { try { child.kill('SIGKILL') } catch { /* gone */ } }, SIGKILL_GRACE_MS)
        }, timeoutMs)
      }

      // Never throw on spawn failure (e.g. bash missing) — report as non-zero exit,
      // exactly like the port contract for a non-zero command.
      child.on('error', (err: Error) => {
        done({ stdout, stderr: stderr || err.message || String(err), exitCode: 127, ms: Date.now() - start })
      })
      child.on('close', (code, signal) => {
        let exitCode = code ?? 0
        if (timedOut) {
          exitCode = exitCode || 124 // conventional timeout code
          stderr += `\n[vps-local] comando excedeu o timeout de ${timeoutMs}ms e foi terminado (${signal ?? 'SIGTERM'})`
        }
        done({ stdout, stderr, exitCode, ms: Date.now() - start })
      })
    })
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content)
  }

  // Lazy preview: the run's server binds the FIXED VPS_PREVIEW_PORT (forced by the worker),
  // and one public subdomain (VPS_PREVIEW_URL) is mapped to it in EasyPanel. The dynamic port
  // is ignored — one preview at a time. Unset → clear error (preview stays optional).
  async getPreviewUrl(_port: number): Promise<string> {
    const base = process.env.VPS_PREVIEW_URL
    if (!base) {
      throw new Error('preview self-hosted indisponível: configure VPS_PREVIEW_URL (subdomínio público → worker:VPS_PREVIEW_PORT)')
    }
    return base.replace(/\/+$/, '')
  }

  // No-op: removes the ~1h ceiling. The heartbeat keeps calling this harmlessly.
  async setTimeout(_ms: number): Promise<void> { /* intentionally a no-op */ }

  // Idempotent teardown — ignores a missing dir.
  async close(): Promise<void> {
    await fs.rm(this.rootDir, { recursive: true, force: true })
  }
}

export function createVpsLocalProvider(): SandboxProvider {
  return {
    async create(_opts?: CreateSandboxOptions): Promise<ISandbox> {
      // opts.templateId (no image) and opts.timeoutMs (no ceiling — FR-002) are ignored.
      const id = randomUUID()
      const rootDir = path.join(vpsRunsBaseDir(), id)
      await fs.mkdir(rootDir, { recursive: true })
      return new VpsLocalSandbox(id, rootDir)
    },
    async connect(id: string): Promise<ISandbox> {
      const rootDir = path.join(vpsRunsBaseDir(), id)
      if (!existsSync(rootDir)) {
        throw new Error(`Diretório de run "${id}" não existe mais — a sessão expirou; dispare uma nova missão`)
      }
      return new VpsLocalSandbox(id, rootDir)
    },
  }
}

/** Remove orphan run dirs under `${VPS_RUNS_DIR}` (FR-012). A dir is swept when it is
 *  NOT in `activeIds` AND older than `maxAgeMs`. Best-effort: never throws (returns the
 *  ids it managed to remove). Used by the worker boot sweep and the cron reaper. */
export async function sweepVpsRunDirs(opts?: { maxAgeMs?: number; activeIds?: Set<string> }): Promise<string[]> {
  const base = vpsRunsBaseDir()
  const maxAgeMs = opts?.maxAgeMs ?? DEFAULT_SWEEP_MAX_AGE_MS
  const active = opts?.activeIds
  const swept: string[] = []
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(base, { withFileTypes: true })
  } catch {
    return swept // base dir doesn't exist yet → nothing to sweep
  }
  const now = Date.now()
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (active?.has(e.name)) continue
    const dir = path.join(base, e.name)
    try {
      const st = await fs.stat(dir)
      if (now - st.mtimeMs < maxAgeMs) continue // too fresh — may belong to a live run
      await fs.rm(dir, { recursive: true, force: true })
      swept.push(e.name)
    } catch { /* best-effort per-dir */ }
  }
  return swept
}
