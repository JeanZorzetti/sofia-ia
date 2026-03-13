/**
 * Google Drive API v3 service
 * Lista e baixa arquivos de uma pasta do Drive para sincronização com Knowledge Base.
 *
 * Suporta:
 *  - Arquivos nativos Google (Docs → text/plain, Sheets → text/csv) via export
 *  - Arquivos binários (PDF, DOCX, TXT etc.) via download direto
 */

import { getOAuthConnection } from '@/lib/integrations/oauth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
}

/** Tipos Google Docs e seus equivalentes exportáveis */
const GOOGLE_EXPORT_TYPES: Record<string, string> = {
  'application/vnd.google-apps.document':     'text/plain',
  'application/vnd.google-apps.spreadsheet':  'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
}

/** Extensões tratadas na pipeline de extração de texto (upload) */
const SUPPORTED_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
])

/**
 * Lista arquivos dentro de uma pasta do Drive.
 * @param userId  ID do usuário (para buscar OAuth connection)
 * @param folderId  ID da pasta no Drive (ou "root")
 */
export async function listDriveFiles(userId: string, folderId: string): Promise<DriveFile[]> {
  const conn = await getOAuthConnection(userId, 'google-drive')
  if (!conn) throw new Error('Google Drive não conectado. Configure a integração primeiro.')

  const q = `'${folderId}' in parents and trashed = false`
  const fields = 'files(id,name,mimeType,modifiedTime,size)'
  const url =
    `${DRIVE_API}/files` +
    `?q=${encodeURIComponent(q)}` +
    `&fields=${encodeURIComponent(fields)}` +
    `&includeItemsFromAllDrives=true` +
    `&supportsAllDrives=true` +
    `&pageSize=100`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${conn.accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Drive API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { files?: DriveFile[] }
  const files = (data.files || []).filter(f => SUPPORTED_MIME_TYPES.has(f.mimeType))
  return files
}

/**
 * Baixa o conteúdo de um arquivo do Drive como Buffer.
 * Arquivos Google nativos são exportados como texto/CSV.
 */
export async function downloadDriveFile(
  userId: string,
  fileId: string,
  mimeType: string,
): Promise<{ buffer: Buffer; effectiveMimeType: string }> {
  const conn = await getOAuthConnection(userId, 'google-drive')
  if (!conn) throw new Error('Google Drive não conectado.')

  const exportMime = GOOGLE_EXPORT_TYPES[mimeType]
  let url: string
  let effectiveMimeType: string

  if (exportMime) {
    // Google Docs nativo → exportar como texto
    url = `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`
    effectiveMimeType = exportMime
  } else {
    // Arquivo binário → baixar direto
    url = `${DRIVE_API}/files/${fileId}?alt=media`
    effectiveMimeType = mimeType
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${conn.accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Drive download error ${res.status}: ${err}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, effectiveMimeType }
}

/**
 * Mimetypes → extensão de arquivo para logging e tipo do documento.
 */
export function mimeTypeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv',
    'application/json': 'json',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.google-apps.document': 'txt',
    'application/vnd.google-apps.spreadsheet': 'csv',
    'application/vnd.google-apps.presentation': 'txt',
  }
  return map[mimeType] || 'txt'
}
