/**
 * POST /api/knowledge/[id]/sync-drive
 * Sincroniza arquivos de uma pasta do Google Drive com a Knowledge Base.
 *
 * Body: { folderId: string }  (pode vir do config salvo na KB também)
 *
 * Fluxo:
 *  1. Lista arquivos suportados na pasta do Drive
 *  2. Para cada arquivo novo/modificado, baixa e extrai texto
 *  3. Cria ou atualiza KnowledgeDocument
 *  4. Dispara vectorização em background
 *  5. Salva driveFolder + lastSync no config da KB
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { listDriveFiles, downloadDriveFile, mimeTypeToExtension } from '@/lib/google-drive'
import { processDocumentVectorization } from '@/lib/ai/knowledge-context'

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const knowledgeBase = await prisma.knowledgeBase.findUnique({ where: { id } })
    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({})) as { folderId?: string }
    const config = (knowledgeBase.config || {}) as Record<string, unknown>
    const folderId = (body.folderId || config.driveFolder) as string | undefined

    if (!folderId) {
      return NextResponse.json(
        { error: 'Informe o folderId ou configure driveFolder na Knowledge Base' },
        { status: 400 }
      )
    }

    // Listar arquivos na pasta do Drive
    const driveFiles = await listDriveFiles(auth.id, folderId)
    console.log(`[sync-drive] ${driveFiles.length} arquivos suportados em ${folderId}`)

    const results: Array<{ name: string; status: string; documentId?: string; error?: string }> = []

    for (const file of driveFiles) {
      try {
        // Verificar se documento com essa sourceUrl já existe
        const sourceUrl = `drive://${file.id}`
        const existing = await prisma.knowledgeDocument.findFirst({
          where: { knowledgeBaseId: id, sourceUrl },
          select: { id: true, updatedAt: true },
        })

        // Se já existe e não foi modificado, pular
        if (existing) {
          const driveModified = new Date(file.modifiedTime)
          if (existing.updatedAt >= driveModified) {
            results.push({ name: file.name, status: 'skipped' })
            continue
          }
        }

        // Baixar arquivo
        const { buffer, effectiveMimeType } = await downloadDriveFile(auth.id, file.id, file.mimeType)
        const fileExt = mimeTypeToExtension(effectiveMimeType)

        // Extrair texto conforme tipo
        const textContent = await extractText(buffer, effectiveMimeType, fileExt)
        if (!textContent.trim()) {
          results.push({ name: file.name, status: 'error', error: 'Sem texto extraível' })
          continue
        }

        let documentId: string

        if (existing) {
          // Atualizar documento existente
          await prisma.knowledgeDocument.update({
            where: { id: existing.id },
            data: { content: textContent, status: 'processing', chunks: [] },
          })
          documentId = existing.id
        } else {
          // Criar novo documento
          const doc = await prisma.knowledgeDocument.create({
            data: {
              knowledgeBaseId: id,
              title: file.name.replace(/\.[^.]+$/, ''),
              content: textContent,
              sourceUrl,
              fileType: fileExt,
              chunks: [],
              status: 'processing',
            },
          })
          documentId = doc.id
        }

        // Vectorizar em background
        processDocumentVectorization(documentId, textContent).catch(err => {
          console.error(`[sync-drive] Vectorização falhou para ${file.name}:`, err)
        })

        results.push({ name: file.name, status: existing ? 'updated' : 'created', documentId })
      } catch (fileError: unknown) {
        const msg = fileError instanceof Error ? fileError.message : 'Erro desconhecido'
        results.push({ name: file.name, status: 'error', error: msg })
      }
    }

    // Salvar driveFolder + lastSync no config da KB
    await prisma.knowledgeBase.update({
      where: { id },
      data: {
        config: {
          ...config,
          driveFolder: folderId,
          lastSync: new Date().toISOString(),
        },
      },
    })

    const created = results.filter(r => r.status === 'created').length
    const updated = results.filter(r => r.status === 'updated').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const errors  = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      summary: { total: driveFiles.length, created, updated, skipped, errors },
      results,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno'
    console.error('[sync-drive] Erro:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── Extração de texto por tipo ─────────────────────────────────────────────────

async function extractText(buffer: Buffer, mimeType: string, ext: string): Promise<string> {
  if (['txt', 'md'].includes(ext) || mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8')
  }

  if (ext === 'csv' || mimeType === 'text/csv') {
    return convertCsvToText(buffer.toString('utf-8'))
  }

  if (ext === 'json') {
    try {
      return convertJsonToText(JSON.parse(buffer.toString('utf-8')))
    } catch {
      return buffer.toString('utf-8')
    }
  }

  if (ext === 'pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (b: Buffer) => Promise<{ text: string }> = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.text.replace(/\n{3,}/g, '\n\n').trim()
  }

  if (ext === 'docx' || ext === 'doc') {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ buffer })
    return result.value.replace(/\n{3,}/g, '\n\n').trim()
  }

  return buffer.toString('utf-8')
}

function convertCsvToText(csv: string): string {
  const lines = csv.split('\n').filter(l => l.trim())
  if (!lines.length) return ''
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const rows = lines.slice(1, 501).map((line, i) => {
    const vals = line.split(',').map(v => v.replace(/"/g, '').trim())
    return `Registro ${i + 1}: ${headers.map((h, j) => `${h}: ${vals[j] || ''}`).join(' | ')}`
  })
  return [`Planilha com ${lines.length - 1} registros`, `Colunas: ${headers.join(', ')}`, '', ...rows].join('\n')
}

function convertJsonToText(data: unknown, depth = 0): string {
  if (depth > 5) return JSON.stringify(data)
  if (Array.isArray(data)) {
    return data.slice(0, 50).map((item, i) => `Item ${i + 1}: ${convertJsonToText(item, depth + 1)}`).join('\n')
  }
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${convertJsonToText(v, depth + 1)}`)
      .join('\n')
  }
  return String(data)
}
