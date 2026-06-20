// Teams V2.2 — S6: MinIO (S3-compatible) object storage for team image attachments.
//
// Lazy client (mirrors the Groq lazy-init pattern) so the build never instantiates a
// client at import time, and the `minio` module is only loaded server-side at runtime
// inside the EasyPanel container (not during the local typecheck).
//
// Required env (set on the APP container in EasyPanel):
//   MINIO_SERVER_URL   e.g. https://sofia-minio.7c17iw.easypanel.host
//   MINIO_ROOT_USER    access key
//   MINIO_ROOT_PASSWORD secret key
//   MINIO_BUCKET       optional (default: team-attachments)
import type { Client } from 'minio'
import { Readable } from 'stream'

let client: Client | null = null

function getBucket(): string {
  return process.env.MINIO_BUCKET || 'team-attachments'
}

export function isMinioConfigured(): boolean {
  return Boolean(process.env.MINIO_SERVER_URL && process.env.MINIO_ROOT_USER && process.env.MINIO_ROOT_PASSWORD)
}

async function getClient(): Promise<Client> {
  if (client) return client
  const url = process.env.MINIO_SERVER_URL
  if (!url || !process.env.MINIO_ROOT_USER || !process.env.MINIO_ROOT_PASSWORD) {
    throw new Error('MinIO não configurado (MINIO_SERVER_URL / MINIO_ROOT_USER / MINIO_ROOT_PASSWORD)')
  }
  const parsed = new URL(url)
  const useSSL = parsed.protocol === 'https:'
  const { Client: MinioClient } = await import('minio')
  client = new MinioClient({
    endPoint: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : (useSSL ? 443 : 80),
    useSSL,
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
  })
  return client
}

async function ensureBucket(c: Client): Promise<void> {
  const bucket = getBucket()
  const exists = await c.bucketExists(bucket).catch(() => false)
  if (!exists) await c.makeBucket(bucket)
}

/** Upload an attachment buffer. Returns nothing — the caller already holds the key. */
export async function putAttachment(key: string, buffer: Buffer, mime: string): Promise<void> {
  const c = await getClient()
  await ensureBucket(c)
  await c.putObject(getBucket(), key, buffer, buffer.length, { 'Content-Type': mime })
}

/** Download an object to a local file path (used to materialize for the Claude CLI). */
export async function downloadAttachmentTo(key: string, destPath: string): Promise<void> {
  const c = await getClient()
  await c.fGetObject(getBucket(), key, destPath)
}

/** Fetch an object fully into a Buffer (used to materialize an image INTO an E2B
 *  sandbox for code-runs, where we can't write to the worker host FS the CLI reads). */
export async function getAttachmentBuffer(key: string): Promise<Buffer> {
  const c = await getClient()
  const stream = await c.getObject(getBucket(), key)
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

/** Fetch an object as a stream + content type (used by the proxy GET route to render
 *  the image in the feed). */
export async function getAttachmentStream(key: string): Promise<{ stream: Readable; mime: string }> {
  const c = await getClient()
  const stat = await c.statObject(getBucket(), key).catch(() => null)
  const mime = (stat?.metaData?.['content-type'] as string) || 'application/octet-stream'
  const stream = await c.getObject(getBucket(), key)
  return { stream, mime }
}
