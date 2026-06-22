// src/lib/sandbox/index.ts
// Factory: pick the sandbox provider by env (Sub-projeto C — C0).
import type { SandboxProvider } from './types'
import { createE2BProvider } from './e2b'
import { createVpsLocalProvider } from './vps-local'

export function getSandboxProvider(): SandboxProvider {
  const name = (process.env.SANDBOX_PROVIDER ?? 'e2b').toLowerCase()
  switch (name) {
    case 'e2b':
      return createE2BProvider()
    case 'vps-local':
      return createVpsLocalProvider()
    default:
      throw new Error(`SANDBOX_PROVIDER desconhecido: "${name}" (suportado: e2b, vps-local)`)
  }
}

export type { Sandbox, SandboxProvider, CommandResult, ExecOptions, CreateSandboxOptions } from './types'
