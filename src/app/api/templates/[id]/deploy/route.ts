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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = auth.id

    const template = await prisma.template.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found'
        },
        { status: 404 }
      )
    }

    let createdResource: any = null

    if (template.type === 'agent') {
      const agentData: any = template.config
      createdResource = await prisma.agent.create({
        data: {
          name: agentData.name || template.name,
          description: agentData.description || template.description,
          systemPrompt: agentData.systemPrompt || '',
          model: agentData.model || 'llama-3.3-70b-versatile',
          temperature: agentData.temperature || 0.7,
          status: 'active',
          createdBy: userId,
          config: agentData.config || {}
        }
      })

      if (agentData.channels && Array.isArray(agentData.channels)) {
        for (const channel of agentData.channels) {
          await prisma.agentChannel.create({
            data: {
              agentId: createdResource.id,
              channel: channel.name || channel,
              config: channel.config || {},
              isActive: true
            }
          })
        }
      }
    } else if (template.type === 'workflow') {
      const workflowData: any = template.config
      createdResource = await prisma.flow.create({
        data: {
          name: workflowData.name || template.name,
          description: workflowData.description || template.description,
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          variables: workflowData.variables || {},
          triggerType: workflowData.triggerType || 'manual',
          cronExpression: workflowData.cronExpression || null,
          tags: workflowData.tags || [],
          icon: workflowData.icon || template.icon || null,
          color: workflowData.color || null,
          status: 'draft',
          createdBy: userId
        }
      })
    }

    await prisma.template.update({
      where: { id },
      data: {
        usageCount: { increment: 1 }
      }
    })

    return NextResponse.json({
      success: true,
      data: createdResource,
      type: template.type
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error deploying template:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deploy template',
        message: error.message
      },
      { status: 500 }
    )
  }
}
