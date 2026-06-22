// src/lib/orchestration/team/co-location.ts
// Co-location context for lead/reviewer turns of a code-run (003 — US2). Pure helpers
// (the only side effect is the injected `sandbox.exec`), so they are fully unit-testable
// with a fake sandbox. The coordinator (runTeam) never sees this — it is prepended by
// the code-agent ChatFn before injectProtocol/baseChat.
//
// Goal (FR-006/FR-007): the lead plans against the REAL repo state the worker produced
// (a capped file tree + key files), and the reviewer is steered to VERIFY by running
// read-only commands against the live repo (it already gets the diff via C3).
import type { Sandbox } from '../../sandbox/types'

// Caps — same philosophy as the C2 diff caps (repo-lifecycle DIFF_MAX_*): bound every
// read so the snapshot can never blow the model context.
const TREE_MAX_FILES = 200       // entries in the file listing
const TREE_MAX_CHARS = 4_000     // chars of the rendered tree
const FILE_MAX_CHARS = 2_000     // chars per key file
const KEYFILES_MAX = 5           // key files included for the lead

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…[+${s.length - max} chars truncados]`
}

/** Single-quote a path for `bash -lc` so a mission-supplied filename can't inject shell. */
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

const LEAD_HEADER = `
CONTEXTO DO REPOSITÓRIO (estado real, no diretório de trabalho atual) — use isto para
planejar tarefas que referenciem arquivos que EXISTEM de fato, não suposições.
`.trim()

const REVIEWER_HINT = `
CONTEXTO — você revisa um code-run com o REPOSITÓRIO real disponível no diretório de trabalho.
Além do diff que você recebeu, você PODE verificar o trabalho rodando comandos read-only contra o repo vivo:
- @RUN npm test               (ou o script de teste do projeto)
- @RUN npm run build          (para confirmar que compila)
- @RUN grep -rn "<termo>" .   (para conferir que algo foi de fato aplicado)
Baseie seu @APPROVE/@REJECT em evidência da verificação, não só no diff.
`.trim()

/** List the repo files in `workdir`, capped. Tracked files first (clean — ignores
 *  node_modules/.git); falls back to `find` for a non-git or fresh dir. */
async function listRepoTree(sandbox: Pick<Sandbox, 'exec'>, workdir: string): Promise<string | null> {
  const tracked = await sandbox.exec(`git ls-files | head -n ${TREE_MAX_FILES}`, { cwd: workdir, timeoutMs: 10_000 })
  let out = tracked.exitCode === 0 ? tracked.stdout.trim() : ''
  if (!out) {
    const found = await sandbox.exec(
      `find . -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | head -n ${TREE_MAX_FILES}`,
      { cwd: workdir, timeoutMs: 10_000 },
    )
    out = found.exitCode === 0 ? found.stdout.trim() : ''
  }
  return out ? truncate(out, TREE_MAX_CHARS) : null
}

/** `cat` a single key file, capped. Returns null when missing/empty/over-error. */
async function readFileCapped(sandbox: Pick<Sandbox, 'exec'>, workdir: string, file: string): Promise<string | null> {
  const res = await sandbox.exec(`cat -- ${shellQuote(file)}`, { cwd: workdir, timeoutMs: 8_000 })
  if (res.exitCode !== 0 || !res.stdout.trim()) return null
  return truncate(res.stdout, FILE_MAX_CHARS)
}

/**
 * Build the text to PREPEND to the first user message of a lead/reviewer turn, or null
 * (nothing to add → caller leaves the message untouched).
 * - lead → capped repo tree + capped contents of `keyFiles`.
 * - reviewer → static "how to verify" block (the diff is already in its messages, C3).
 */
export async function buildColocationContext(input: {
  role: 'lead' | 'reviewer'
  sandbox: Pick<Sandbox, 'exec'>
  workdir: string
  keyFiles?: string[]
}): Promise<string | null> {
  if (input.role === 'reviewer') return REVIEWER_HINT

  // lead
  const parts: string[] = []
  const tree = await listRepoTree(input.sandbox, input.workdir)
  if (tree) parts.push(`### Estrutura do repositório\n${tree}`)
  for (const f of (input.keyFiles ?? []).slice(0, KEYFILES_MAX)) {
    const content = await readFileCapped(input.sandbox, input.workdir, f)
    if (content) parts.push(`### ${f}\n\`\`\`\n${content}\n\`\`\``)
  }
  if (parts.length === 0) return null
  return [LEAD_HEADER, ...parts].join('\n\n')
}
