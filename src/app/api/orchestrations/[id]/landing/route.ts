import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// PATCH /api/orchestrations/[id]/landing — toggle isLandingTemplate (max 3 active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { isLandingTemplate, landingIcon, landingTime } = await request.json()

    // Verify ownership
    const existing = await prisma.agentOrchestration.findFirst({
      where: { id, createdBy: auth.id },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    // Enforce max 3 landing templates
    if (isLandingTemplate) {
      const count = await prisma.agentOrchestration.count({
        where: { isLandingTemplate: true, createdBy: auth.id, id: { not: id } },
      })
      if (count >= 3) {
        return NextResponse.json(
          { success: false, error: 'Máximo de 3 templates na landing page atingido.' },
          { status: 400 }
        )
      }
    }

    // Merge landingIcon/landingTime into config JSON
    const currentConfig = (existing.config as Record<string, unknown>) ?? {}
    const updatedConfig = {
      ...currentConfig,
      ...(landingIcon !== undefined ? { landingIcon } : {}),
      ...(landingTime !== undefined ? { landingTime } : {}),
    }

    const updated = await prisma.agentOrchestration.update({
      where: { id },
      data: {
        isLandingTemplate: Boolean(isLandingTemplate),
        config: updatedConfig,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    console.error('[landing toggle]', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
