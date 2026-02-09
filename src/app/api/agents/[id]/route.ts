import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch agent with channels
    const agent = await prisma.agent.findUnique({
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
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if agent exists
    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      systemPrompt,
      model,
      temperature,
      status,
      config,
      channels
    } = body;

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
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if agent exists
    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

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
}
