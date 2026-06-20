// src/lib/git/repo-lifecycle.ts
// Git lifecycle for code-runs (Sub-projeto C — C1). The WORKER (not the agent)
// owns clone/commit/push/PR; the GitHub token NEVER enters the agent's context.
//
// Security model (decision 2 of the C1 spec):
//  - the token is passed to git via `-c http.extraHeader=...`, so it is never
//    persisted in `.git/config` nor in the remote URL;
//  - the remote is the token-less https URL;
//  - the Pull Request is opened worker-side via the GitHub REST API (`fetch`),
//    so the token never touches the sandbox for that step.
//
// Pure except for the injected `Sandbox` (port) + `fetch`, so the helpers and the
// orchestration are unit-testable with a fake sandbox and a fake fetch.

import type { Sandbox } from '../sandbox/types'

export interface ChangedFile {
  path: string
  status: string // git status letter: A | M | D | R | C | T | U
  patch?: string // unified diff for this file (C2), capped; absent when binary/over-cap
  truncated?: boolean // patch was clipped (per-file cap) OR dropped (total/file-count cap)
  binary?: boolean // git reported "Binary files ... differ" (no textual patch)
}

// ── Diff caps (C2) ─────────────────────────────────────────────────────────
// Keep payloads bounded: the patch rides inside `changedFiles` (Json) → DB + SSE.
export const DIFF_MAX_LINES_PER_FILE = 500
export const DIFF_MAX_BYTES_PER_FILE = 64 * 1024 // 64KB
export const DIFF_MAX_TOTAL_BYTES = 512 * 1024 // 512KB across all files
export const DIFF_MAX_FILES = 50 // files that get a patch attached

export interface SetupRepoInput {
  repoUrl: string // full URL or `owner/repo` shorthand
  token: string
  branch: string // working branch, e.g. polaris/run-<runId>
  base: string // branch to clone/branch from (PR target)
  workdir: string // absolute path inside the sandbox
  authorName: string
  authorEmail: string
}

export interface CommitPushInput {
  repoUrl: string
  token: string
  branch: string
  base: string // effective base branch, to diff/count the delivery against (origin/<base>)
  workdir: string
  message: string // commit subject (will be reduced to a safe single line)
}

export interface CommitPushResult {
  hasChanges: boolean
  commitSha: string | null
  changedFiles: ChangedFile[]
}

export interface OpenPullRequestInput {
  repoUrl: string
  token: string
  head: string // working branch
  base: string // target branch
  title: string
  body: string
  draft: boolean
}

export interface PullRequestResult {
  prUrl: string
  prNumber: number
}

// ── Pure helpers (exported for tsx unit tests) ─────────────────────────────

/** Extract { owner, repo } from an https/ssh GitHub URL or an `owner/repo` shorthand. */
export function parseRepoSlug(url: string): { owner: string; repo: string } {
  let s = url.trim().replace(/\.git$/i, '')
  s = s.replace(/^[a-z]+:\/\//i, '') // scheme: https:// , ssh://
  s = s.replace(/^git@/i, '') // ssh user
  s = s.replace(/^github\.com[/:]/i, '') // host (https `/` or ssh `:`)
  const parts = s.split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`Não consegui extrair owner/repo de "${url}"`)
  }
  return { owner: parts[0], repo: parts[1] }
}

/** Canonical https clone URL (token-less) for a repo URL/shorthand. */
export function toCloneUrl(url: string): string {
  const { owner, repo } = parseRepoSlug(url)
  return `https://github.com/${owner}/${repo}.git`
}

/**
 * git global args that inject Basic auth via an HTTP header (token NOT persisted
 * to .git/config). Username is irrelevant for PATs; we use `x-access-token`.
 */
export function authHeaderArgs(token: string): string {
  const b64 = Buffer.from(`x-access-token:${token}`).toString('base64')
  return `-c http.extraHeader="AUTHORIZATION: basic ${b64}"`
}

/** POSIX single-quote a value so it is safe to embed in a shell command. */
export function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/**
 * Regenerable build-artifact directories that must NEVER be committed. They blow past
 * GitHub's 100MB/file limit (e.g. `node_modules/@next/swc-linux-x64-gnu/*.node` ≈ 125MB),
 * which makes the push fail with `GH001: Large files detected` / `pre-receive hook declined`.
 * We exclude them from `git add` as a SAFETY NET for client repos that lack a proper
 * `.gitignore`. A repo that already ignores these is unaffected (the exclude is redundant);
 * a repo that legitimately versions a `dist/` is the rare exception (it can keep a custom
 * `.gitignore`/branch). The agent edits source — build outputs are never the deliverable.
 */
export const STAGE_EXCLUDE_DIRS = [
  'node_modules',
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', '.parcel-cache',
  'dist', 'build', 'out', 'coverage',
  '__pycache__', '.venv', 'venv',
  'target', '.gradle',
] as const

/**
 * `git` exclude pathspecs that drop each artifact dir at ANY depth (monorepo-safe),
 * using the `exclude,glob` pathspec magic. Used to scope `git add` so it stages
 * everything except those dirs. e.g. node_modules -> exclude glob of its contents.
 */
export function stageExcludePathspecs(dirs: readonly string[] = STAGE_EXCLUDE_DIRS): string[] {
  return dirs.map(d => `:(exclude,glob)**/${d}/**`)
}

/** Reduce an arbitrary string to a safe one-line commit subject (≤72 chars). */
export function sanitizeCommitSubject(s: string): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  const clipped = oneLine.length > 72 ? `${oneLine.slice(0, 69)}...` : oneLine
  return clipped || 'Polaris Teams code-run'
}

/** Parse `git show --name-status` / `git diff --name-status` output. */
export function parseChangedFiles(stdout: string): ChangedFile[] {
  const out: ChangedFile[] = []
  for (const raw of stdout.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split('\t')
    if (parts.length < 2) continue
    const status = parts[0][0] // first char (R100 -> R, etc.)
    const path = parts[parts.length - 1] // renames: status\told\tnew -> take new
    out.push({ path, status })
  }
  return out
}

// ── Diff content (C2) ──────────────────────────────────────────────────────

/** Strip the leading `a/` or `b/` that git puts on diff paths. */
function stripDiffPrefix(p: string): string {
  return p.startsWith('a/') || p.startsWith('b/') ? p.slice(2) : p
}

/** Parse the `diff --git a/<x> b/<y>` header into its two paths (heuristic; OK for no-space paths). */
function headerPaths(line: string): { a: string; b: string } {
  const rest = line.startsWith('diff --git ') ? line.slice('diff --git '.length) : line
  const sep = rest.indexOf(' b/')
  if (sep === -1) return { a: '', b: '' }
  return {
    a: rest.slice(0, sep).replace(/^a\//, ''),
    b: rest.slice(sep + 1).replace(/^b\//, ''),
  }
}

/** The key path for a single-file diff chunk — matches what `--name-status` reports. */
function diffChunkPath(chunkLines: string[]): string | null {
  let newPath: string | null = null
  let oldPath: string | null = null
  for (const l of chunkLines) {
    if (l.startsWith('+++ ')) {
      const p = l.slice(4).trim()
      if (p !== '/dev/null') newPath = stripDiffPrefix(p)
    } else if (l.startsWith('--- ')) {
      const p = l.slice(4).trim()
      if (p !== '/dev/null') oldPath = stripDiffPrefix(p)
    }
  }
  if (newPath) return newPath // add/modify/rename → new path (matches name-status)
  if (oldPath) return oldPath // deletion → old path
  const hp = headerPaths(chunkLines[0] ?? '') // binary/no-hunk → parse the header
  return hp.b || hp.a || null
}

/** Split a full `git diff` output into per-file unified-diff chunks, keyed by path. */
export function splitUnifiedDiff(fullPatch: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!fullPatch) return out
  let current: string[] | null = null
  const flush = () => {
    if (!current) return
    const key = diffChunkPath(current)
    if (key) out[key] = current.join('\n')
    current = null
  }
  for (const line of fullPatch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      flush()
      current = [line]
    } else if (current) {
      current.push(line)
    }
  }
  flush()
  return out
}

/** True if a per-file chunk is a binary diff (no textual patch to show). */
export function isBinaryDiff(patch: string): boolean {
  return /^Binary files .* differ$/m.test(patch) || patch.includes('GIT binary patch')
}

/** Clip a single file's patch to a line and byte budget. */
export function capPatch(patch: string, opts: { maxLines: number; maxBytes: number }): { patch: string; truncated: boolean } {
  let truncated = false
  let lines = patch.split('\n')
  if (lines.length > opts.maxLines) {
    lines = lines.slice(0, opts.maxLines)
    truncated = true
  }
  let result = lines.join('\n')
  if (Buffer.byteLength(result, 'utf8') > opts.maxBytes) {
    result = Buffer.from(result, 'utf8').subarray(0, opts.maxBytes).toString('utf8')
    truncated = true
  }
  return { patch: result, truncated }
}

export interface DiffCaps {
  maxLinesPerFile: number
  maxBytesPerFile: number
  maxTotalBytes: number
  maxFiles: number
}

const DEFAULT_DIFF_CAPS: DiffCaps = {
  maxLinesPerFile: DIFF_MAX_LINES_PER_FILE,
  maxBytesPerFile: DIFF_MAX_BYTES_PER_FILE,
  maxTotalBytes: DIFF_MAX_TOTAL_BYTES,
  maxFiles: DIFF_MAX_FILES,
}

/**
 * Attach per-file unified-diff content to the `--name-status` entries, respecting
 * the caps. Binary files get `binary:true` (no patch); files beyond the total/count
 * cap get `truncated:true` (no patch). Pure — unit-tested in scripts/c2-verify.ts.
 */
export function attachDiffs(changedFiles: ChangedFile[], fullPatch: string, caps: DiffCaps = DEFAULT_DIFF_CAPS): ChangedFile[] {
  const byPath = splitUnifiedDiff(fullPatch)
  let totalBytes = 0
  let filesWithPatch = 0
  return changedFiles.map(f => {
    const raw = byPath[f.path]
    if (!raw) return f
    if (isBinaryDiff(raw)) return { ...f, binary: true }
    if (filesWithPatch >= caps.maxFiles) return { ...f, truncated: true }
    const capped = capPatch(raw, { maxLines: caps.maxLinesPerFile, maxBytes: caps.maxBytesPerFile })
    const bytes = Buffer.byteLength(capped.patch, 'utf8')
    if (totalBytes + bytes > caps.maxTotalBytes) return { ...f, truncated: true }
    totalBytes += bytes
    filesWithPatch += 1
    const entry: ChangedFile = { ...f, patch: capped.patch }
    if (capped.truncated) entry.truncated = true
    return entry
  })
}

/**
 * Capture the WORKING-TREE diff against the base, per file, capped (C3).
 * Used to feed the reviewer the real changes mid-run — BEFORE any commit, so it
 * diffs `<base>` (the cloned base branch, e.g. `main`/`master`), NOT
 * `origin/<base>..HEAD` like `commitAndPush`. Because the code-agent edits files
 * but does not commit per-task, this is the diff accumulated since the base (it
 * includes earlier approved tasks' changes — the reviewer sees the real state).
 *
 * Fully best-effort: any failure (non-zero exit, exception) returns `[]` so a
 * diff problem never blocks the review. Pure-ish — unit-tested with a fake
 * sandbox in scripts/c3-verify.ts.
 */
export async function captureWorkingDiff(
  sandbox: Sandbox,
  opts: { workdir: string; base: string; caps?: DiffCaps },
): Promise<ChangedFile[]> {
  const wd = shQuote(opts.workdir)
  const baseRef = shQuote(opts.base)
  try {
    const nameStatus = await sandbox.exec(`git -C ${wd} diff --name-status ${baseRef}`)
    if (nameStatus.exitCode !== 0) return []
    const changedFiles = parseChangedFiles(nameStatus.stdout)
    if (changedFiles.length === 0) return []
    const full = await sandbox.exec(`git -C ${wd} diff ${baseRef}`)
    if (full.exitCode !== 0) return changedFiles // name-only is still useful to the reviewer
    return attachDiffs(changedFiles, full.stdout, opts.caps ?? DEFAULT_DIFF_CAPS)
  } catch {
    return []
  }
}

/** Markdown body for the PR: mission + completed tasks + changed files. */
export function buildPrBody(
  mission: string,
  tasks: { title: string; status: string }[],
  changedFiles: ChangedFile[],
): string {
  const lines: string[] = []
  lines.push('## Missão', '', mission.trim(), '')
  const done = tasks.filter(t => t.status === 'done')
  if (done.length > 0) {
    lines.push('## Tarefas concluídas', '')
    for (const t of done) lines.push(`- ${t.title}`)
    lines.push('')
  }
  if (changedFiles.length > 0) {
    lines.push('## Arquivos alterados', '')
    for (const f of changedFiles) lines.push(`- \`${f.status}\` ${f.path}`)
    lines.push('')
  }
  lines.push('---', '', '_Aberto automaticamente pela Polaris Teams (Code Factory)._')
  return lines.join('\n')
}

// ── Sandbox exec helper ────────────────────────────────────────────────────

async function run(sandbox: Sandbox, cmd: string, label: string): Promise<string> {
  const r = await sandbox.exec(cmd)
  if (r.exitCode !== 0) {
    throw new Error(`git lifecycle (${label}) falhou [exit ${r.exitCode}]: ${r.stderr || r.stdout}`)
  }
  return r.stdout
}

// ── Orchestration (worker-side) ─────────────────────────────────────────────

/**
 * Clone the repo into `workdir`, create the working branch, set the commit identity.
 * Robust to the repo's actual default branch (main/master/…): it only pins the
 * requested base if that branch really exists on the remote, otherwise it clones
 * the default branch and uses that as the base. Returns the EFFECTIVE base branch
 * (what the PR must target). Empty repos (no commits) fail with a clear message.
 */
export async function setupRepo(sandbox: Sandbox, input: SetupRepoInput): Promise<{ base: string }> {
  const { token, branch, base, workdir, authorName, authorEmail } = input
  const cloneUrl = toCloneUrl(input.repoUrl)
  const auth = authHeaderArgs(token)
  const wd = shQuote(workdir)

  // Does the requested base exist on the remote? (ls-remote needs auth for private repos.)
  let cloneArgs = '--depth 50'
  let effectiveBase = ''
  if (base) {
    const ls = await sandbox.exec(`git ${auth} ls-remote --heads ${shQuote(cloneUrl)} ${shQuote(base)}`)
    if (ls.exitCode === 0 && ls.stdout.trim()) {
      cloneArgs += ` --branch ${shQuote(base)}`
      effectiveBase = base
    }
  }

  // Clone (token only in the HTTP header). If base didn't exist, clones the default branch.
  await run(sandbox, `git ${auth} clone ${cloneArgs} ${shQuote(cloneUrl)} ${wd}`, 'clone')

  // Reject empty repos — can't branch off / PR against nothing.
  const head = await sandbox.exec(`git -C ${wd} rev-parse HEAD`)
  if (head.exitCode !== 0) {
    throw new Error('Repositório vazio (sem commits). Adicione um commit inicial (ex.: README) antes de usar o code-team.')
  }
  // If the requested base wasn't found, the effective base is the cloned default branch.
  if (!effectiveBase) {
    effectiveBase = (await run(sandbox, `git -C ${wd} rev-parse --abbrev-ref HEAD`, 'default-branch')).trim()
  }

  // Working branch: create it UNLESS the caller asked to work on the base itself.
  // Direct mode (S3.1) passes branch === base → stay on the cloned base branch (no
  // new branch). PR mode passes branch = polaris/run-<id> (never equal to a base name),
  // so this stays byte-identical to the pre-S3.1 behavior.
  if (branch !== base) {
    await run(sandbox, `git -C ${wd} checkout -b ${shQuote(branch)}`, 'checkout')
  }
  await run(sandbox, `git -C ${wd} config user.name ${shQuote(authorName)}`, 'config name')
  await run(sandbox, `git -C ${wd} config user.email ${shQuote(authorEmail)}`, 'config email')
  return { base: effectiveBase }
}

/**
 * Stage + commit any uncommitted work, then push the branch IF it has commits
 * ahead of the base. Robust to the agent having already committed inside the
 * sandbox (working tree clean but branch ahead) — the delivery is decided by
 * `origin/<base>..HEAD`, not by a dirty working tree.
 */
export async function commitAndPush(sandbox: Sandbox, input: CommitPushInput): Promise<CommitPushResult> {
  const { token, branch, base, workdir } = input
  const auth = authHeaderArgs(token)
  const wd = shQuote(workdir)
  const baseRef = `origin/${base}`

  // Stage everything EXCEPT regenerable build artifacts (node_modules, .next, …), so a
  // repo without a proper .gitignore doesn't get a >100MB binary rejected on push.
  const excludeSpecs = stageExcludePathspecs().map(shQuote).join(' ')
  await run(sandbox, `git -C ${wd} add -A -- ${shQuote('.')} ${excludeSpecs}`, 'add')

  // Commit uncommitted work. (If the agent already committed, the tree is clean → skip.)
  const status = await run(sandbox, `git -C ${wd} status --porcelain`, 'status')
  if (status.trim()) {
    const subject = sanitizeCommitSubject(input.message)
    await run(sandbox, `git -C ${wd} commit -m ${shQuote(subject)}`, 'commit')
  }

  // Anything to deliver? = commits on this branch ahead of the base.
  const ahead = (await run(sandbox, `git -C ${wd} rev-list --count ${shQuote(`${baseRef}..HEAD`)}`, 'rev-list')).trim()
  if (ahead === '0' || ahead === '') {
    return { hasChanges: false, commitSha: null, changedFiles: [] }
  }

  const nameStatus = await run(sandbox, `git -C ${wd} diff --name-status ${shQuote(baseRef)} HEAD`, 'diff')
  let changedFiles = parseChangedFiles(nameStatus)

  // C2: capture the per-file diff CONTENT (best-effort — must never break the delivery).
  try {
    const full = await sandbox.exec(`git -C ${wd} diff ${shQuote(baseRef)} HEAD`)
    if (full.exitCode === 0) changedFiles = attachDiffs(changedFiles, full.stdout)
  } catch {
    // keep the name-only list; the PR + delivery still go through
  }

  const sha = (await run(sandbox, `git -C ${wd} rev-parse HEAD`, 'rev-parse')).trim()

  await run(sandbox, `git -C ${wd} ${auth} push origin ${shQuote(branch)}`, 'push')

  return { hasChanges: true, commitSha: sha, changedFiles }
}

/** Open a draft Pull Request via the GitHub REST API (worker-side; token off-sandbox). */
export async function openPullRequest(
  input: OpenPullRequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestResult> {
  const { owner, repo } = parseRepoSlug(input.repoUrl)
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'polaris-teams',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
      draft: input.draft,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Abertura de PR falhou [${res.status}]: ${text}`)
  }

  const data = (await res.json()) as { html_url?: string; number?: number }
  if (!data.html_url || typeof data.number !== 'number') {
    throw new Error('Resposta inesperada da API de PR do GitHub (sem html_url/number)')
  }
  return { prUrl: data.html_url, prNumber: data.number }
}
