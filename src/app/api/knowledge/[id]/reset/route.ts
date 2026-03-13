/**
 * POST /api/knowledge/[id]/reset
 * Limpa todos os documentos e embeddings de uma Knowledge Base,
 * mantendo a KB e sua configuração intactas.
 *
 * Equivalente ao padrão "Deleta Conteúdo" do workflow n8n 03_setup_banco_dados.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

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

    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 })
    }

    // Contar antes de deletar
    const docCount = await prisma.knowledgeDocument.count({ where: { knowledgeBaseId: id } })

    // Deletar documentos (embeddings cascadeiam via onDelete: Cascade)
    await prisma.knowledgeDocument.deleteMany({ where: { knowledgeBaseId: id } })

    console.log(`[reset-kb] KB "${knowledgeBase.name}" (${id}): ${docCount} documentos removidos`)

    return NextResponse.json({
      success: true,
      deleted: docCount,
      message: `${docCount} documento(s) removido(s) da base "${knowledgeBase.name}"`,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno'
    console.error('[reset-kb] Erro:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
