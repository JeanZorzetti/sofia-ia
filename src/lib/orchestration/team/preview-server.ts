// Preview mode (Lovable-style) — start a project's preview inside the run's E2B sandbox
// and expose a public URL. Pure detection (testable) is split from the sandbox-touching
// start routine. The coordinator (runTeam) never imports this — worker + route concern.
//
// Two preview kinds:
//   - 'dev'    → run the framework dev server (Next/Vite/a `dev` script): npm install + dev
//   - 'static' → serve a plain HTML site (has index.html, no dev script) with a tiny
//                zero-dep node server written into the sandbox.
// The project may live in a SUBDIRECTORY (agents often scaffold into e.g. `teste 2/`), so
// the worker derives the dir from the run's changed files (deriveProjectDir).
import type { Sandbox } from '@/lib/sandbox/types'

/** How long a preview stays alive after going live (and per "Estender" click). */
export const PREVIEW_TTL_MS = 15 * 60_000
/** Extra slack on the E2B sandbox timeout over the preview TTL, so the reaper (or a
 *  manual stop) wins the race against the provider's own self-destruct. */
export const PREVIEW_SANDBOX_MARGIN_MS = 60_000

export type PreviewKind = 'dev' | 'static'

/** Resolved plan for booting a preview in a project dir. */
export interface PreviewPlan {
  kind: PreviewKind
  /** Port the server binds to AND the port we expose publicly. */
  port: number
  /** kind 'dev' only: dev server command, with `{PORT}` already substituted. */
  devCommand?: string
  /** kind 'dev' only: idempotent dependency install run before the dev server. */
  installCommand?: string
}

/** Per-team overrides read from `Team.config.preview`. */
export interface PreviewOverride {
  command?: string
  port?: number
  installCommand?: string
}

const DEFAULT_INSTALL = 'npm install'

function parsePkg(raw: string | null): { deps: Record<string, unknown>; scripts: Record<string, unknown> } {
  if (!raw) return { deps: {}, scripts: {} }
  try {
    const pkg = JSON.parse(raw) as Record<string, unknown>
    return {
      deps: {
        ...(pkg.dependencies as Record<string, unknown> | undefined),
        ...(pkg.devDependencies as Record<string, unknown> | undefined),
      },
      scripts: (pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {}) as Record<string, unknown>,
    }
  } catch {
    return { deps: {}, scripts: {} }
  }
}

/**
 * PURE. Decide how to preview a project dir from its package.json + whether it has an
 * index.html. Next/Vite/`dev` script → run the dev server; plain index.html → serve it
 * statically. Honors per-team overrides. `{PORT}` in any dev command is substituted.
 */
export function detectPreviewPlan(packageJsonRaw: string | null, hasIndexHtml: boolean, override?: PreviewOverride): PreviewPlan {
  const { deps, scripts } = parsePkg(packageJsonRaw)
  const dev = (port: number, cmd: string): PreviewPlan => ({
    kind: 'dev', port,
    devCommand: cmd.replace(/\{PORT\}/g, String(port)),
    installCommand: override?.installCommand ?? DEFAULT_INSTALL,
  })

  if (override?.command) return dev(override.port ?? 3000, override.command)
  if ('next' in deps) return dev(override?.port ?? 3000, 'npm run dev -- -p {PORT} -H 0.0.0.0')
  if ('vite' in deps) return dev(override?.port ?? 5173, 'npm run dev -- --port {PORT} --host 0.0.0.0')
  if (typeof scripts.dev === 'string') return dev(override?.port ?? 3000, 'npm run dev')
  if (hasIndexHtml) return { kind: 'static', port: override?.port ?? 3000 }
  // Nothing detected — last resort dev (fails clearly; the caller records previewError).
  return dev(override?.port ?? 3000, 'npm run dev')
}

/**
 * PURE. Common parent directory of a run's changed files → the project to preview.
 * Returns '' (repo root) when files live at the root or the set is empty/ambiguous.
 * e.g. ['teste 2/index.html','teste 2/script.js'] → 'teste 2'.
 */
export function deriveProjectDir(changedFiles: Array<{ path: string }> | null | undefined): string {
  if (!changedFiles || changedFiles.length === 0) return ''
  const dirs = changedFiles.map(f => {
    const p = f?.path ?? ''
    const i = p.lastIndexOf('/')
    return i === -1 ? '' : p.slice(0, i)
  })
  let common = dirs[0].split('/')
  for (const d of dirs.slice(1)) {
    const segs = d.split('/')
    let k = 0
    while (k < common.length && k < segs.length && common[k] === segs[k]) k++
    common = common.slice(0, k)
  }
  return common.join('/')
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

/** HTTP status of a port inside the sandbox, '000' when nothing answers. */
async function probePort(sandbox: Sandbox, workdir: string, port: number): Promise<string> {
  const r = await sandbox
    .exec(`curl -s -o /dev/null -m 3 -w "%{http_code}" http://localhost:${port}`, { cwd: workdir, timeoutMs: 8_000 })
    .catch(() => null)
  return (r?.stdout || '').trim() || '000'
}

/** Single-quote a path for safe embedding in a shell command (handles spaces, e.g. `teste 2`). */
function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

// Tiny zero-dep static file server written into the sandbox (.cjs → always CommonJS,
// regardless of the project's package.json "type"). node is guaranteed in the template.
const STATIC_SERVER_PATH = '/tmp/polaris-static-server.cjs'
const STATIC_SERVER_SRC = [
  "const http=require('http'),fs=require('fs'),path=require('path');",
  "const port=Number(process.argv[2]||3000),root=process.argv[3]||'.';",
  "const MIME={'.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.map':'application/json'};",
  "http.createServer((req,res)=>{try{let u=decodeURIComponent((req.url||'/').split('?')[0]);if(u.indexOf('..')!==-1){res.writeHead(400);return res.end('bad request');}let fp=path.join(root,u);if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,'index.html');if(!fs.existsSync(fp))fp=path.join(root,'index.html');const data=fs.readFileSync(fp);res.writeHead(200,{'Content-Type':MIME[path.extname(fp).toLowerCase()]||'application/octet-stream'});res.end(data);}catch(e){res.writeHead(404);res.end('Not found');}}).listen(port,'0.0.0.0',()=>console.log('polaris static server on '+port+' root='+root));",
].join('\n')

export interface StartPreviewResult {
  url: string
  port: number
}

/**
 * Boot the preview (dev server OR static server) DETACHED, poll the port until it answers,
 * and return the public preview URL. Throws with a log tail if install fails or the server
 * never comes up — the caller marks the preview 'failed' (the run already delivered its
 * diff/PR, so this never fails the run).
 */
export async function startPreviewServer(
  sandbox: Sandbox,
  opts: { workdir: string; plan: PreviewPlan; installTimeoutMs?: number; readyTimeoutMs?: number },
): Promise<StartPreviewResult> {
  const { workdir, plan } = opts
  const installTimeoutMs = opts.installTimeoutMs ?? 5 * 60_000
  const readyTimeoutMs = opts.readyTimeoutMs ?? 90_000

  // Continuation: the dev/static server from the previous run is likely still bound on this
  // port (the sandbox is reused). Reuse it — files are already updated (HMR for dev; the
  // static server reads per-request) — so we skip install + a duplicate server.
  if ((await probePort(sandbox, workdir, plan.port)) !== '000') {
    return { url: await sandbox.getPreviewUrl(plan.port), port: plan.port }
  }

  let command: string
  if (plan.kind === 'dev') {
    const install = await sandbox.exec(plan.installCommand ?? DEFAULT_INSTALL, { cwd: workdir, timeoutMs: installTimeoutMs })
    if (install.exitCode !== 0) {
      throw new Error(`install falhou (exit ${install.exitCode}): ${tail(install.stderr || install.stdout)}`)
    }
    command = plan.devCommand ?? 'npm run dev'
  } else {
    // Static: write the server once, run it serving the (possibly space-containing) dir.
    await sandbox.writeFile(STATIC_SERVER_PATH, STATIC_SERVER_SRC)
    command = `node ${STATIC_SERVER_PATH} ${plan.port} ${shQuote(workdir)}`
  }

  // Detached: `nohup ... &` backgrounds it so this exec returns at once; output → a file
  // we can tail if the server never binds.
  const startCmd = `nohup ${command} > /tmp/polaris-preview.log 2>&1 & echo $!`
  await sandbox.exec(startCmd, { cwd: workdir, timeoutMs: 15_000 })

  // Poll the port — any HTTP status (even 404/500) means the server is bound.
  const deadline = Date.now() + readyTimeoutMs
  let lastCode = '000'
  while (Date.now() < deadline) {
    lastCode = await probePort(sandbox, workdir, plan.port)
    if (lastCode !== '000') break
    await delay(2_000)
  }
  if (lastCode === '000') {
    const log = await sandbox
      .exec('tail -n 40 /tmp/polaris-preview.log', { cwd: workdir, timeoutMs: 8_000 })
      .catch(() => null)
    throw new Error(
      `servidor (${plan.kind}) não respondeu na porta ${plan.port} em ${Math.round(readyTimeoutMs / 1000)}s.\n${tail(log?.stdout ?? '')}`,
    )
  }

  const url = await sandbox.getPreviewUrl(plan.port)
  return { url, port: plan.port }
}
