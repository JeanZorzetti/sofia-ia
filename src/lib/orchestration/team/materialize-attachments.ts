// Teams V2.2 — S6: materialize a run's image attachments from MinIO to a local temp
// dir so the Claude CLI member can Read them (vision). Idempotent — skips files that
// already exist. Best-effort per file (a failed download is logged, never thrown:
// the run continues with the path surfaced; the member just can't read that one).
//
// Chat-runs execute in the SAME process that received the upload (Next `after()`), so
// the downloaded files are visible to the spawned CLI. Called at run start and after
// each live (mid-run) attachment POST.
import fs from 'fs'
import { prisma } from '@/lib/prisma'
import { parseAttachments, attachmentRunDir, attachmentLocalPath } from './team-attachments'
import { downloadAttachmentTo, getAttachmentBuffer } from '@/lib/storage/minio'
import type { Sandbox } from '@/lib/sandbox/types'

/**
 * Download every image attached to the run's messages into the per-run temp dir.
 * Returns the run dir when the run has at least one attachment, else null (so the
 * caller only passes `--add-dir` / injects `attachmentDir` when there's something to read).
 */
export async function materializeRunAttachments(runId: string): Promise<string | null> {
  let rows: { attachments: unknown }[]
  try {
    // Fetch all of the run's messages and filter in JS (parseAttachments returns [] for
    // null/legacy rows). Bounded by turns × members, so no need for a Json-null filter.
    rows = await prisma.teamMessage.findMany({
      where: { runId },
      select: { attachments: true },
    })
  } catch (err) {
    console.error('[Teams S6] failed to list attachments:', err)
    return null
  }

  const all = rows.flatMap(r => parseAttachments(r.attachments))
  if (all.length === 0) return null

  const dir = attachmentRunDir(runId)
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (err) {
    console.error('[Teams S6] failed to create attachment dir:', err)
    return null
  }

  for (const att of all) {
    const dest = attachmentLocalPath(runId, att.key)
    if (fs.existsSync(dest)) continue // idempotent
    try {
      await downloadAttachmentTo(att.key, dest)
    } catch (err) {
      console.error(`[Teams S6] failed to materialize ${att.key}:`, err)
    }
  }
  return dir
}

/**
 * S6 (code-runs): materialize the run's images INTO an E2B sandbox at the SAME
 * deterministic path used elsewhere (`attachmentLocalPath`), so the in-sandbox Claude
 * CLI can Read them with `--add-dir <runDir>`. Code-runs execute in a separate worker
 * process whose sandbox FS is NOT the worker host FS, so we can't reuse the host
 * materializer above. Idempotent (skips files already present via `test -f`) so it can
 * be called before every worker turn (picks up mission + live-steering images alike).
 * Binary-safe via base64 (Sandbox.writeFile only takes a string). Returns the run dir
 * when there is ≥1 attachment, else null.
 */
export async function materializeRunAttachmentsToSandbox(sandbox: Sandbox, runId: string): Promise<string | null> {
  let rows: { attachments: unknown }[]
  try {
    rows = await prisma.teamMessage.findMany({ where: { runId }, select: { attachments: true } })
  } catch (err) {
    console.error('[Teams S6] failed to list attachments (sandbox):', err)
    return null
  }

  const all = rows.flatMap(r => parseAttachments(r.attachments))
  if (all.length === 0) return null

  const dir = attachmentRunDir(runId)
  await sandbox.exec(`mkdir -p "${dir}"`).catch(() => {})

  for (const att of all) {
    const dest = attachmentLocalPath(runId, att.key)
    // idempotent: skip if the sandbox already has this file (exit 0 = present).
    const present = await sandbox.exec(`test -f "${dest}"`).then(r => r.exitCode === 0).catch(() => false)
    if (present) continue
    try {
      const buf = await getAttachmentBuffer(att.key)
      const b64Path = `${dest}.b64`
      await sandbox.writeFile(b64Path, buf.toString('base64'))
      await sandbox.exec(`base64 -d "${b64Path}" > "${dest}" && rm -f "${b64Path}"`)
    } catch (err) {
      console.error(`[Teams S6] failed to materialize ${att.key} into sandbox:`, err)
    }
  }
  return dir
}
