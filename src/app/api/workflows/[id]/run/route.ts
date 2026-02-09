import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkflowExecutor } from '@/lib/workflow-engine';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
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

    // Parse request body for context
    const body = await request.json().catch(() => ({}));
    const context = body.context || {};

    // Execute workflow
    const executor = new WorkflowExecutor(id, context);
    const result = await executor.execute();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Workflow executed successfully',
        data: result.output
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error running workflow:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run workflow' },
      { status: 500 }
    );
  }
}
