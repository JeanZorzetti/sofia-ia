// src/lib/sandbox/types.ts
// Provider-agnostic sandbox port (Sub-projeto C — Code Factory).
// The coordination engine depends ONLY on these interfaces, so the E2B impl
// can be swapped for Docker-per-run later without touching the code-agent.

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
  ms: number
}

export interface ExecOptions {
  /** Hard timeout for the command, in ms. */
  timeoutMs?: number
  /** Working directory inside the sandbox. */
  cwd?: string
  /** Extra environment variables for this command (e.g. CLAUDE_CODE_OAUTH_TOKEN).
   *  Passed via the provider's env channel — NOT inlined in the command string, so
   *  secrets never land in logs. */
  env?: Record<string, string>
}

/** An isolated, ephemeral execution environment for a single run. */
export interface Sandbox {
  /** Provider-assigned id (for logging / debugging). */
  readonly id: string
  /** Run a shell command; never throws on non-zero exit — returns exitCode instead. */
  exec(cmd: string, opts?: ExecOptions): Promise<CommandResult>
  /** Write a file inside the sandbox (used to hand large prompts to in-sandbox CLIs
   *  without shell-escaping). Creates parent dirs as needed. */
  writeFile(path: string, content: string): Promise<void>
  /** Public URL that proxies to a port bound inside the sandbox (Preview mode).
   *  E2B: `https://{port}-{sandboxId}.e2b.app`. Used to embed a dev server in an iframe. */
  getPreviewUrl(port: number): Promise<string>
  /** Extend the sandbox lifetime to `ms` from NOW (Preview mode keep-alive). This is
   *  the hard cost ceiling: the provider self-destructs the sandbox when it elapses,
   *  even if the reaper never runs. */
  setTimeout(ms: number): Promise<void>
  /** Tear the sandbox down (idempotent; call in a finally). */
  close(): Promise<void>
}

export interface CreateSandboxOptions {
  /** Provider template/image id (defaults to the provider's base image). */
  templateId?: string
  /** Default sandbox lifetime, in ms (provider may cap this). */
  timeoutMs?: number
}

export interface SandboxProvider {
  create(opts?: CreateSandboxOptions): Promise<Sandbox>
  /** Reconnect to an already-running sandbox by id (Preview mode: extend/stop/reap run
   *  in the web app, not the worker that created it). Throws if the sandbox is gone. */
  connect(id: string): Promise<Sandbox>
}
