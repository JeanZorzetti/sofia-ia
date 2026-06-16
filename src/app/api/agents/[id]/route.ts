import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit';
import { ownerId } from '@/lib/authz';
import { withAuth } from '@/lib/with-auth';
import { parseJson, updateAgentSchema } from '@/lib/validation';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const GET = withAuth(async (request, user, { params }: RouteParams) => {
  try {
    const { id } = await params;

    // Fetch agent with channels (scoped to owner; admin sees all)
    const agent = await prisma.agent.findFirst({
      where: { id, createdBy: ownerId(user) },
      include: {
        channels: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent
    });

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, user, { params }: RouteParams) => {
  try {
    const { id } = await params;

    // Check ownership (owner or admin) before updating
    const existingAgent = await prisma.agent.findFirst({
      where: { id, createdBy: ownerId(user) }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Validate + parse body (zod)
    const parsed = await parseJson(request, updateAgentSchema);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const {
      name,
      description,
      systemPrompt,
      model,
      temperature,
      status,
      config,
      knowledgeBaseId,
      folderId,
      channels
    } = parsed.data;

    // Update agent
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        systemPrompt: systemPrompt !== undefined ? systemPrompt : undefined,
        model: model !== undefined ? model : undefined,
        temperature: temperature !== undefined ? temperature : undefined,
        status: status !== undefined ? status : undefined,
        config: config !== undefined ? config : undefined,
        knowledgeBaseId: knowledgeBaseId !== undefined ? knowledgeBaseId : undefined,
        folderId: folderId !== undefined ? folderId : undefined,
        updatedAt: new Date()
      },
      include: {
        channels: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update channels if provided
    if (channels && Array.isArray(channels)) {
      // Delete existing channels
      await prisma.agentChannel.deleteMany({
        where: { agentId: id }
      });

      // Create new channels
      await prisma.agentChannel.createMany({
        data: channels.map((ch: any) => ({
          agentId: id,
          channel: ch.channel,
          config: ch.config || {},
          isActive: ch.isActive !== undefined ? ch.isActive : true
        }))
      });

      // Fetch updated agent with new channels
      const updatedAgent = await prisma.agent.findUnique({
        where: { id },
        include: {
          channels: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: updatedAgent,
        message: 'Agent updated successfully'
      });
    }

    logAudit(user.id, 'agent.updated', 'agent', agent.id, { name: agent.name })

    return NextResponse.json({
      success: true,
      data: agent,
      message: 'Agent updated successfully'
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, user, { params }: RouteParams) => {
  try {
    const { id } = await params;

    // Check ownership (owner or admin) before deleting
    const existingAgent = await prisma.agent.findFirst({
      where: { id, createdBy: ownerId(user) }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    logAudit(user.id, 'agent.deleted', 'agent', id, { name: existingAgent.name }, undefined, getIpFromRequest(request), getUserAgentFromRequest(request))

    // Delete agent (cascade will delete channels)
    await prisma.agent.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
});
