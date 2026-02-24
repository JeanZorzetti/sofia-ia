import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanLimit } from '@/lib/plan-limits';
import { trackEvent, isFirstEvent } from '@/lib/analytics';
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (status) where.status = status;

    // Fetch agents with their channels
    const agents = await prisma.agent.findMany({
      where,
      include: {
        channels: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        folder: {
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: agents
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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
      channels,
      status,
      config
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'name is required and must be a string' },
        { status: 400 }
      );
    }

    // Check plan limits
    const limitCheck = await checkPlanLimit(user.id, 'agents');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: limitCheck.message || 'Limite de agentes atingido para seu plano.' },
        { status: 403 }
      );
    }

    if (!systemPrompt || typeof systemPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'systemPrompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Log payload for debugging
    console.log('Creating agent with payload:', {
      name,
      description,
      systemPrompt,
      model,
      temperature,
      status,
      channels,
      userId: user.id
    });

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description: description || null,
        systemPrompt,
        model: model || 'llama-3.3-70b-versatile',
        temperature: temperature !== undefined ? temperature : 0.7,
        status: status || 'active',
        createdBy: user.id,
        config: config || {},
        channels: channels && Array.isArray(channels) ? {
          create: channels.map((ch: any) => ({
            channel: ch.channel,
            config: ch.config || {},
            isActive: ch.isActive !== undefined ? ch.isActive : true
          }))
        } : undefined
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

    // Audit log
    logAudit(user.id, 'agent.created', 'agent', agent.id, { name: agent.name }, undefined, getIpFromRequest(request), getUserAgentFromRequest(request))

    // Track first agent creation (fire and forget)
    isFirstEvent('first_agent_created', user.id).then((isFirst) => {
      if (isFirst) {
        trackEvent('first_agent_created', user.id, { agentId: agent.id, agentName: agent.name }).catch(() => {})
      }
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      data: agent,
      message: 'Agent created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create agent', details: error.message },
      { status: 500 }
    );
  }
}
