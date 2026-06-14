// src/lib/sandbox/index.ts
// Factory: pick the sandbox provider by env (Sub-projeto C — C0).
import type { SandboxProvider } from './types'
import { createE2BProvider } from './e2b'

export function getSandboxProvider(): SandboxProvider {
  const name = (process.env.SANDBOX_PROVIDER ?? 'e2b').toLowerCase()
  switch (name) {
    case 'e2b':
      return createE2BProvider()
    default:
      throw new Error(`SANDBOX_PROVIDER desconhecido: "${name}" (suportado: e2b)`)
  }
}

export type { Sandbox, SandboxProvider, CommandResult, ExecOptions, CreateSandboxOptions } from './types'
