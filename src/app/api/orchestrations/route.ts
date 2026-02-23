import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { trackEvent, isFirstEvent } from '@/lib/analytics'

// GET /api/orchestrations - List all orchestrations
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const orchestrations = await prisma.agentOrchestration.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        executions: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            executions: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: orchestrations })
  } catch (error: any) {
    console.error('Error fetching orchestrations:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orchestrations' },
      { status: 500 }
    )
  }
}

// POST /api/orchestrations - Create new orchestration
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, agents, strategy, config, fromTemplate } = body

    // If creating from template, load template data
    if (fromTemplate) {
      const { getTemplateById } = await import('@/lib/orchestration/orchestration-templates')
      const template = getTemplateById(fromTemplate)

      if (!template) {
        return NextResponse.json(
          { success: false, error: `Template "${fromTemplate}" not found` },
          { status: 404 }
        )
      }

      const orchName = name || template.name

      // Create a folder for this orchestration's agents
      const folder = await prisma.agentFolder.create({
        data: {
          name: orchName,
          color: '#a855f7', // purple — orquestração
          userId: auth.id,
        },
      })

      // Create real Agent records for each template agent
      const resolvedAgents = await Promise.all(
        template.agents.map(async (ta) => {
          // Reuse existing agent if user already has one with this name
          const existing = await prisma.agent.findFirst({
            where: { name: ta.role, createdBy: auth.id },
          })
          if (existing) {
            await prisma.agent.update({
              where: { id: existing.id },
              data: { folderId: folder.id },
            })
            return { agentId: existing.id, role: ta.role, prompt: ta.prompt, order: ta.order }
          }

          const created = await prisma.agent.create({
            data: {
              name: ta.role,
              description: `Agente do pipeline "${orchName}"`,
              systemPrompt: ta.prompt,
              model: 'llama-3.3-70b-versatile',
              temperature: 0.7,
              status: 'active',
              createdBy: auth.id,
              folderId: folder.id,
              config: {},
            },
          })
          return { agentId: created.id, role: ta.role, prompt: ta.prompt, order: ta.order }
        })
      )

      const orchestration = await prisma.agentOrchestration.create({
        data: {
          name: orchName,
          description: description || template.description,
          agents: resolvedAgents as any,
          strategy: template.strategy,
          config: { fromTemplate: template.id, ...config },
          createdBy: auth.id
        }
      })

      // Track first orchestration creation (fire and forget)
      isFirstEvent('first_orchestration_created', auth.id).then((isFirst) => {
        if (isFirst) {
          trackEvent('first_orchestration_created', auth.id, { orchestrationId: orchestration.id, fromTemplate: template.id }).catch(() => {})
        }
      }).catch(() => {})

      return NextResponse.json({ success: true, data: orchestration })
    }

    // Manual creation
    if (!name || !agents || !Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name and agents array are required' },
        { status: 400 }
      )
    }

    const orchestration = await prisma.agentOrchestration.create({
      data: {
        name,
        description: description || null,
        agents: agents,
        strategy: strategy || 'sequential',
        config: config || {},
        createdBy: auth.id
      }
    })

    // Track first orchestration creation (fire and forget)
    isFirstEvent('first_orchestration_created', auth.id).then((isFirst) => {
      if (isFirst) {
        trackEvent('first_orchestration_created', auth.id, { orchestrationId: orchestration.id }).catch(() => {})
      }
    }).catch(() => {})

    return NextResponse.json({ success: true, data: orchestration })
  } catch (error: any) {
    console.error('Error creating orchestration:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create orchestration' },
      { status: 500 }
    )
  }
}
