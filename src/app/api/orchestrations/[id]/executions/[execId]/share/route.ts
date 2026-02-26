import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { trackEvent } from '@/lib/analytics'
import crypto from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; execId: string }> }
) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: orchestrationId, execId } = await params

  // Verify execution belongs to a orchestration owned by this user
  const execution = await prisma.orchestrationExecution.findFirst({
    where: {
      id: execId,
      orchestrationId,
      orchestration: { createdBy: auth.id },
    },
    select: { id: true, shareToken: true, status: true },
  })

  if (!execution) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Return existing token if already shared
  if (execution.shareToken) {
    return NextResponse.json({
      success: true,
      shareToken: execution.shareToken,
      shareUrl: `${APP_URL}/share/${execution.shareToken}`,
    })
  }

  // Generate a new unique token
  const shareToken = crypto.randomBytes(32).toString('hex')

  await prisma.orchestrationExecution.update({
    where: { id: execId },
    data: { shareToken },
  })

  await trackEvent('result_shared', auth.id, { executionId: execId })

  return NextResponse.json({
    success: true,
    shareToken,
    shareUrl: `${APP_URL}/share/${shareToken}`,
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; execId: string }> }
) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: orchestrationId, execId } = await params

  const execution = await prisma.orchestrationExecution.findFirst({
    where: {
      id: execId,
      orchestrationId,
      orchestration: { createdBy: auth.id },
    },
    select: { id: true },
  })

  if (!execution) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.orchestrationExecution.update({
    where: { id: execId },
    data: { shareToken: null },
  })

  return NextResponse.json({ success: true })
}
