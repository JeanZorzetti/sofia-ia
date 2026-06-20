// Teams V2.2 — S6: image/media attachments (vision).
//
// PURE logic only (no IO) so it can be tested in scripts/v22s6-verify.ts without
// jest (OneDrive errno -4094). The MinIO upload/download lives in
// `@/lib/storage/minio` and the per-run download in `materialize-attachments.ts`.
//
// Shape persisted on `TeamMessage.attachments` (JSONB): an array of TeamAttachment.
// `key` is the MinIO object key (durable). At run time the worker materializes each
// object to a local temp file (deterministic path below) and references that PATH in
// the Lead's context so a Claude-CLI member can Read it (the Read tool renders images).
import os from 'os'
import path from 'path'

/** What we persist per attachment. `key` = MinIO object key (the durable copy). */
export interface TeamAttachment {
  name: string
  mime: string
  size: number
  key: string
}

/** What the coordinator/UI see: a persisted attachment plus the resolved LOCAL path
 *  (computed deterministically from runId + key) the Claude CLI can Read. */
export interface MessageAttachment extends TeamAttachment {
  /** Absolute local path where the worker materializes the object for this run. */
  path: string
}

/** Hard caps. Images are capped so the MinIO bucket / temp disk stay bounded. */
export const MAX_ATTACHMENTS = 4
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024 // 5 MB

/** Vision-capable image types the Claude CLI Read tool renders. */
export const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

export function isImageMime(mime: unknown): boolean {
  return typeof mime === 'string' && ALLOWED_IMAGE_MIME.has(mime.toLowerCase())
}

/** Validate a single upload before we touch MinIO. Pure. */
export function validateUpload(
  file: { name?: unknown; mime?: unknown; size?: unknown },
): { ok: true } | { ok: false; error: string } {
  if (!isImageMime(file.mime)) {
    return { ok: false, error: 'Tipo de arquivo não suportado (use PNG, JPEG, WebP ou GIF)' }
  }
  const size = typeof file.size === 'number' ? file.size : NaN
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: 'Arquivo inválido' }
  }
  if (size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: 'Imagem muito grande (máx. 5 MB)' }
  }
  return { ok: true }
}

/** Strip a filename down to a filesystem/URL-safe basename (no paths, no spaces). */
export function safeAttachmentName(name: unknown): string {
  const raw = typeof name === 'string' ? name : ''
  const base = raw.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+/, '')
    .slice(0, 80)
  return cleaned || 'image'
}

/** Deterministic MinIO object key for an upload. Unique per call via `rand`. */
export function attachmentObjectKey(runId: string, name: unknown, rand: string): string {
  return `teams/${runId}/${rand}-${safeAttachmentName(name)}`
}

/** Per-run local directory where objects are materialized. Defaults to the OS temp
 *  dir; `baseDir` is injectable for tests. */
export function attachmentRunDir(runId: string, baseDir: string = os.tmpdir()): string {
  return path.join(baseDir, 'polaris-team-att', runId)
}

/** Deterministic local path for a materialized object (basename of the key). */
export function attachmentLocalPath(runId: string, key: string, baseDir: string = os.tmpdir()): string {
  const base = key.split('/').pop() || 'image'
  return path.join(attachmentRunDir(runId, baseDir), base)
}

/** Defensive parse of the JSONB column into TeamAttachment[]. Drops anything
 *  malformed and caps the count. Returns [] for null/undefined/non-array. */
export function parseAttachments(value: unknown): TeamAttachment[] {
  if (!Array.isArray(value)) return []
  const out: TeamAttachment[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const name = typeof a.name === 'string' ? a.name : ''
    const mime = typeof a.mime === 'string' ? a.mime : ''
    const key = typeof a.key === 'string' ? a.key : ''
    const size = typeof a.size === 'number' && Number.isFinite(a.size) ? a.size : 0
    if (!name || !key || !isImageMime(mime)) continue
    out.push({ name, mime, size, key })
    if (out.length >= MAX_ATTACHMENTS) break
  }
  return out
}

/** Resolve persisted attachments → MessageAttachment[] with the local path the CLI
 *  reads. Pure: the file is materialized elsewhere; this only computes the path. */
export function resolveAttachments(
  runId: string,
  value: unknown,
  baseDir: string = os.tmpdir(),
): MessageAttachment[] {
  return parseAttachments(value).map(a => ({
    ...a,
    path: attachmentLocalPath(runId, a.key, baseDir),
  }))
}

/** Render the steering-block reference lines for a `user` message's attachments.
 *  Returns [] when there are none → the steering block stays byte-identical to S4.
 *  Decision 3: the Lead surfaces the local path and DELEGATES visual analysis to a
 *  vision-capable (Claude) member; non-vision members only see the path as text. */
export function buildAttachmentRefLines(attachments: MessageAttachment[] | undefined): string[] {
  if (!attachments || attachments.length === 0) return []
  const refs = attachments
    .map(a => `  - imagem "${a.name}" → leia o arquivo local: ${a.path}`)
    .join('\n')
  return [
    refs,
    '  (Delegue a análise visual a um membro com modelo de visão (Claude); ele deve LER o caminho acima.)',
  ]
}
