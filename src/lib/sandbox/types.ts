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
}

/** An isolated, ephemeral execution environment for a single run. */
export interface Sandbox {
  /** Provider-assigned id (for logging / debugging). */
  readonly id: string
  /** Run a shell command; never throws on non-zero exit — returns exitCode instead. */
  exec(cmd: string, opts?: ExecOptions): Promise<CommandResult>
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
}
