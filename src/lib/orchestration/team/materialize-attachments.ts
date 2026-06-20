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
import { downloadAttachmentTo } from '@/lib/storage/minio'

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
