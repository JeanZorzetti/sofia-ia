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

    // Check if workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id }
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get query params for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = { workflowId: id };
    if (status) where.status = status;

    // Fetch executions
    const executions = await prisma.workflowExecution.findMany({
      where,
      orderBy: {
        startedAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Get total count
    const total = await prisma.workflowExecution.count({ where });

    return NextResponse.json({
      success: true,
      data: executions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + executions.length < total
      }
    });

  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow executions' },
      { status: 500 }
    );
  }
}
