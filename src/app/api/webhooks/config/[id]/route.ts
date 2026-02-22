/**
 * Webhook Config — Single item operations
 * PATCH  /api/webhooks/config/[id]  — toggle active/inactive
 * DELETE /api/webhooks/config/[id]  — delete webhook config
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── PATCH — toggle isActive ──────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: { isActive?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const config = await prisma.webhookConfig.findFirst({
      where: { id, userId: auth.id },
    })
    if (!config) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.webhookConfig.update({
      where: { id },
      data: {
        isActive: typeof body.isActive === 'boolean' ? body.isActive : !config.isActive,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[Webhooks Config] PATCH error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const config = await prisma.webhookConfig.findFirst({
      where: { id, userId: auth.id },
    })
    if (!config) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.webhookConfig.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Webhooks Config] DELETE error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
