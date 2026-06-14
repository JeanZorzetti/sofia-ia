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
}

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

  await run(sandbox, `git -C ${wd} checkout -b ${shQuote(branch)}`, 'checkout')
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

  await run(sandbox, `git -C ${wd} add -A`, 'add')

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
  const changedFiles = parseChangedFiles(nameStatus)
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
