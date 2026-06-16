import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { ownerId } from '@/lib/authz';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: ownerId(auth) },
      select: { name: true, userId: true },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'api_key.deleted',
        userId: apiKey.userId,
        resourceType: 'api_key',
        resourceId: id,
        details: { name: apiKey.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const owned = await prisma.apiKey.findFirst({
      where: { id, userId: ownerId(auth) },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'api_key.updated',
        userId: apiKey.userId,
        resourceType: 'api_key',
        resourceId: id,
        details: { status },
      },
    });

    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}
