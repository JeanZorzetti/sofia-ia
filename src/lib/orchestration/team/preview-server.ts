// Preview mode (Lovable-style) — start a project's dev server inside the run's E2B
// sandbox and expose a public URL. Pure config detection (testable) is split from the
// sandbox-touching start routine. The coordinator (runTeam) never imports this — it's a
// worker + lifecycle-route concern.
import type { Sandbox } from '@/lib/sandbox/types'

/** How long a preview stays alive after going live (and per "Estender" click). */
export const PREVIEW_TTL_MS = 15 * 60_000
/** Extra slack on the E2B sandbox timeout over the preview TTL, so the reaper (or a
 *  manual stop) wins the race against the provider's own self-destruct. */
export const PREVIEW_SANDBOX_MARGIN_MS = 60_000

/** Resolved dev-server config used to boot the preview. */
export interface PreviewConfig {
  /** Dev server command, with `{PORT}` already substituted. */
  command: string
  /** Port the dev server binds to AND the port we expose publicly. */
  port: number
  /** Idempotent dependency install run before the dev server. */
  installCommand: string
}

/** Per-team overrides read from `Team.config.preview`. */
export interface PreviewOverride {
  command?: string
  port?: number
  installCommand?: string
}

const DEFAULT_INSTALL = 'npm install'

function parseDeps(packageJsonRaw: string | null): Record<string, unknown> {
  if (!packageJsonRaw) return {}
  try {
    const pkg = JSON.parse(packageJsonRaw) as Record<string, unknown>
    return {
      ...(pkg.dependencies as Record<string, unknown> | undefined),
      ...(pkg.devDependencies as Record<string, unknown> | undefined),
    }
  } catch {
    return {}
  }
}

/**
 * PURE. Pick the dev command + port from the project's package.json, honoring per-team
 * overrides. Next and Vite are first-class; anything else falls back to `npm run dev`
 * on :3000. `{PORT}` in the command (own or overridden) is substituted with the port.
 */
export function detectPreviewConfig(packageJsonRaw: string | null, override?: PreviewOverride): PreviewConfig {
  const deps = parseDeps(packageJsonRaw)
  let base: PreviewConfig
  if ('next' in deps) {
    base = { command: 'npm run dev -- -p {PORT} -H 0.0.0.0', port: 3000, installCommand: DEFAULT_INSTALL }
  } else if ('vite' in deps) {
    base = { command: 'npm run dev -- --port {PORT} --host 0.0.0.0', port: 5173, installCommand: DEFAULT_INSTALL }
  } else {
    base = { command: 'npm run dev', port: 3000, installCommand: DEFAULT_INSTALL }
  }
  const port = override?.port ?? base.port
  const command = (override?.command ?? base.command).replace(/\{PORT\}/g, String(port))
  const installCommand = override?.installCommand ?? base.installCommand
  return { command, port, installCommand }
}

/** PURE. Extract `Team.config.preview` overrides defensively (config is arbitrary JSON). */
export function readPreviewOverride(teamConfig: unknown): PreviewOverride {
  const cfg = (teamConfig && typeof teamConfig === 'object' ? teamConfig : {}) as Record<string, unknown>
  const p = (cfg.preview && typeof cfg.preview === 'object' ? cfg.preview : {}) as Record<string, unknown>
  const out: PreviewOverride = {}
  if (typeof p.command === 'string' && p.command.trim()) out.command = p.command.trim()
  if (typeof p.port === 'number' && Number.isFinite(p.port)) out.port = p.port
  if (typeof p.installCommand === 'string' && p.installCommand.trim()) out.installCommand = p.installCommand.trim()
  return out
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const tail = (s: string, n = 1200) => (s.length > n ? s.slice(-n) : s)

export interface StartPreviewResult {
  url: string
  port: number
}

/**
 * Install deps, start the dev server DETACHED (so exec returns immediately), poll the
 * port until it answers, and return the public preview URL. Throws with a log tail if
 * install fails or the server never comes up — the caller marks the preview 'failed'
 * (the run itself already delivered its diff/PR, so this never fails the run).
 */
export async function startPreviewServer(
  sandbox: Sandbox,
  opts: { workdir: string; config: PreviewConfig; installTimeoutMs?: number; readyTimeoutMs?: number },
): Promise<StartPreviewResult> {
  const { workdir, config } = opts
  const installTimeoutMs = opts.installTimeoutMs ?? 5 * 60_000
  const readyTimeoutMs = opts.readyTimeoutMs ?? 90_000

  // 1) Dependencies (idempotent — agents may already have installed during the run).
  const install = await sandbox.exec(config.installCommand, { cwd: workdir, timeoutMs: installTimeoutMs })
  if (install.exitCode !== 0) {
    throw new Error(`install falhou (exit ${install.exitCode}): ${tail(install.stderr || install.stdout)}`)
  }

  // 2) Dev server, detached. `nohup ... &` backgrounds it so this exec returns at once;
  //    output is captured to a file we can tail if the server never binds.
  const startCmd = `nohup ${config.command} > /tmp/polaris-preview.log 2>&1 & echo $!`
  await sandbox.exec(startCmd, { cwd: workdir, timeoutMs: 15_000 })

  // 3) Poll the port — any HTTP status (even 404/500) means the server is bound.
  const deadline = Date.now() + readyTimeoutMs
  let lastCode = '000'
  while (Date.now() < deadline) {
    const probe = await sandbox.exec(
      `curl -s -o /dev/null -m 3 -w "%{http_code}" http://localhost:${config.port}`,
      { cwd: workdir, timeoutMs: 8_000 },
    )
    lastCode = (probe.stdout || '').trim() || '000'
    if (lastCode !== '000') break
    await delay(2_000)
  }
  if (lastCode === '000') {
    const log = await sandbox
      .exec('tail -n 40 /tmp/polaris-preview.log', { cwd: workdir, timeoutMs: 8_000 })
      .catch(() => null)
    throw new Error(
      `dev server não respondeu na porta ${config.port} em ${Math.round(readyTimeoutMs / 1000)}s.\n${tail(log?.stdout ?? '')}`,
    )
  }

  const url = await sandbox.getPreviewUrl(config.port)
  return { url, port: config.port }
}
