/**
 * GET /api/cron/retrain-knowledge
 * Cron diário que re-sincroniza pastas do Google Drive configuradas
 * em cada Knowledge Base e re-vetoriza documentos alterados.
 *
 * Acionado pelo Vercel Cron (vercel.json: "0 3 * * *" → 3h BRT).
 * Protegido por Authorization: Bearer {CRON_SECRET}.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listDriveFiles, downloadDriveFile, mimeTypeToExtension } from '@/lib/google-drive'
import { processDocumentVectorization } from '@/lib/ai/knowledge-context'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET || 'sofia-cron-secret-2026'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[cron/retrain-knowledge] Unauthorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const summary: Array<{
    kbId: string
    kbName: string
    folderId: string
    created: number
    updated: number
    errors: number
  }> = []

  try {
    // Buscar todas as KBs que têm driveFolder configurado
    const kbs = await prisma.knowledgeBase.findMany({
      select: { id: true, name: true, config: true },
    })

    const driveSyncKbs = kbs.filter(kb => {
      const config = (kb.config || {}) as Record<string, unknown>
      return typeof config.driveFolder === 'string' && config.driveFolder.length > 0
    })

    console.log(`[cron/retrain-knowledge] ${driveSyncKbs.length} KBs com Drive configurado`)

    for (const kb of driveSyncKbs) {
      const config = (kb.config || {}) as Record<string, unknown>
      const folderId = config.driveFolder as string
      const userId = config.driveUserId as string | undefined

      if (!userId) {
        console.warn(`[cron/retrain-knowledge] KB ${kb.id} sem driveUserId no config — pulando`)
        continue
      }

      let created = 0
      let updated = 0
      let errors = 0

      try {
        const driveFiles = await listDriveFiles(userId, folderId)
        console.log(`[cron/retrain-knowledge] KB "${kb.name}": ${driveFiles.length} arquivos`)

        for (const file of driveFiles) {
          try {
            const sourceUrl = `drive://${file.id}`
            const existing = await prisma.knowledgeDocument.findFirst({
              where: { knowledgeBaseId: kb.id, sourceUrl },
              select: { id: true, updatedAt: true },
            })

            if (existing) {
              const driveModified = new Date(file.modifiedTime)
              if (existing.updatedAt >= driveModified) continue
            }

            const { buffer, effectiveMimeType } = await downloadDriveFile(userId, file.id, file.mimeType)
            const ext = mimeTypeToExtension(effectiveMimeType)
            const content = await extractText(buffer, effectiveMimeType, ext)

            if (!content.trim()) {
              errors++
              continue
            }

            let documentId: string
            if (existing) {
              await prisma.knowledgeDocument.update({
                where: { id: existing.id },
                data: { content, status: 'processing', chunks: [] },
              })
              documentId = existing.id
              updated++
            } else {
              const doc = await prisma.knowledgeDocument.create({
                data: {
                  knowledgeBaseId: kb.id,
                  title: file.name.replace(/\.[^.]+$/, ''),
                  content,
                  sourceUrl,
                  fileType: ext,
                  chunks: [],
                  status: 'processing',
                },
              })
              documentId = doc.id
              created++
            }

            processDocumentVectorization(documentId, content).catch(err =>
              console.error(`[cron/retrain-knowledge] Vectorização falhou para ${file.name}:`, err)
            )
          } catch (fileErr) {
            console.error(`[cron/retrain-knowledge] Erro no arquivo ${file.name}:`, fileErr)
            errors++
          }
        }

        // Atualizar lastSync
        await prisma.knowledgeBase.update({
          where: { id: kb.id },
          data: {
            config: { ...config, lastSync: new Date().toISOString() },
          },
        })

        summary.push({ kbId: kb.id, kbName: kb.name, folderId, created, updated, errors })
      } catch (kbErr) {
        console.error(`[cron/retrain-knowledge] Erro na KB ${kb.id}:`, kbErr)
        summary.push({ kbId: kb.id, kbName: kb.name, folderId, created, updated, errors: errors + 1 })
      }
    }

    const durationMs = Date.now() - startedAt
    console.log(`[cron/retrain-knowledge] Concluído em ${durationMs}ms`)

    return NextResponse.json({
      success: true,
      kbsProcessed: driveSyncKbs.length,
      durationMs,
      summary,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno'
    console.error('[cron/retrain-knowledge] Fatal:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── Extração de texto ──────────────────────────────────────────────────────────

async function extractText(buffer: Buffer, mimeType: string, ext: string): Promise<string> {
  if (['txt', 'md'].includes(ext) || mimeType === 'text/plain') {
    return buffer.toString('utf-8')
  }
  if (ext === 'csv' || mimeType === 'text/csv') {
    const lines = buffer.toString('utf-8').split('\n').filter(l => l.trim())
    return lines.slice(0, 501).join('\n')
  }
  if (ext === 'json') {
    return buffer.toString('utf-8')
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
