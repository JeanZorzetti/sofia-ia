// Teams V2.2 — S6: parse image files out of a multipart FormData, validate, upload to
// MinIO and return the persistable metadata. Shared by the run route (mission images)
// and the live steering route (mid-run images). Server-only.
import { randomBytes } from 'crypto'
import {
  validateUpload, attachmentObjectKey, MAX_ATTACHMENTS, type TeamAttachment,
} from './team-attachments'
import { putAttachment } from '@/lib/storage/minio'

/**
 * Read up to MAX_ATTACHMENTS image files from `form` (field name `images`), upload each
 * to MinIO and return the metadata. `prefixId` is only the object-key prefix (teamId for
 * mission uploads, runId for live uploads). Throws on the first invalid file so the route
 * can surface a 400; returns [] when there are no files.
 */
export async function uploadImagesFromForm(prefixId: string, form: FormData): Promise<TeamAttachment[]> {
  const files = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return []
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`Máximo de ${MAX_ATTACHMENTS} imagens por mensagem`)
  }

  const out: TeamAttachment[] = []
  for (const file of files) {
    const check = validateUpload({ name: file.name, mime: file.type, size: file.size })
    if (!check.ok) throw new Error(check.error)
    const buffer = Buffer.from(await file.arrayBuffer())
    const key = attachmentObjectKey(prefixId, file.name, randomBytes(6).toString('hex'))
    await putAttachment(key, buffer, file.type)
    out.push({ name: file.name, mime: file.type, size: file.size, key })
  }
  return out
}
