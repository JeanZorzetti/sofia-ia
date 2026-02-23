import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: userId'
        },
        { status: 400 }
      )
    }

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
    } else if (template.type === 'orchestration') {
      const orchData: any = template.config
      const rawAgents: any[] = orchData.agents || []
      const orchName: string = orchData.name || template.name

      // Create a folder for this orchestration's agents
      const folder = await prisma.agentFolder.create({
        data: {
          name: orchName,
          color: '#a855f7', // purple — orquestração
          userId,
        },
      })

      // Fetch all agent templates at once to avoid N+1
      const agentNames = rawAgents
        .filter((a) => a.agentId === 'auto')
        .map((a) => a.agentName || a.role)
        .filter(Boolean)

      const agentTemplates = await prisma.template.findMany({
        where: { name: { in: agentNames }, type: 'agent' },
      })
      const tplByName = Object.fromEntries(
        agentTemplates.map((t) => [t.name, t.config as any])
      )

      // Resolve each agent (create if missing, assign to folder)
      const resolvedAgents = await Promise.all(
        rawAgents.map(async (agentRef: any) => {
          if (agentRef.agentId !== 'auto') return agentRef

          const agentName: string = agentRef.agentName || agentRef.role || 'Agente'
          const tplConfig = tplByName[agentName] || {}

          // Reuse existing agent if user already has one with this name
          const existing = await prisma.agent.findFirst({
            where: { name: agentName, createdBy: userId },
          })
          if (existing) {
            // Move it into the folder
            await prisma.agent.update({
              where: { id: existing.id },
              data: { folderId: folder.id },
            })
            return { ...agentRef, agentId: existing.id }
          }

          // Build agent data from template config (all fields)
          const systemPrompt =
            tplConfig.systemPrompt ||
            `Você é ${agentName}.${agentRef.role ? ` Papel nesta orquestração: ${agentRef.role}.` : ''} Responda de forma clara e profissional.`
          const agentModel = tplConfig.model || 'llama-3.3-70b-versatile'
          const temperature = tplConfig.temperature ?? 0.7
          const description = tplConfig.description || (agentRef.role ? `Papel: ${agentRef.role}` : null)

          const created = await prisma.agent.create({
            data: {
              name: agentName,
              description,
              systemPrompt,
              model: agentModel,
              temperature,
              status: 'active',
              createdBy: userId,
              folderId: folder.id,
              config: {},
            },
          })

          // Create channels from template config
          const channels: any[] = tplConfig.channels || []
          if (channels.length > 0) {
            await prisma.agentChannel.createMany({
              data: channels.map((ch: any) => ({
                agentId: created.id,
                channel: ch.name || ch.channel || ch,
                config: ch.config || {},
                isActive: true,
              })),
            })
          }

          return { ...agentRef, agentId: created.id }
        })
      )

      createdResource = await prisma.agentOrchestration.create({
        data: {
          name: orchName,
          description: orchData.description || template.description,
          agents: resolvedAgents,
          strategy: orchData.strategy || 'sequential',
          config: orchData.config || {},
          createdBy: userId,
        },
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
