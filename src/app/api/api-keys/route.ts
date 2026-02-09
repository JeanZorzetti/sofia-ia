import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where: {
      userId?: string;
    } = {};

    if (userId) where.userId = userId;

    const apiKeys = await prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        key: true,
        userId: true,
        lastUsedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Mask the keys for security (show only last 8 chars)
    const maskedKeys = apiKeys.map((key) => ({
      ...key,
      key: `...${key.key.slice(-8)}`,
    }));

    return NextResponse.json({ apiKeys: maskedKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, userId } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Name and userId are required' },
        { status: 400 }
      );
    }

    // Generate API key: roi_labs_ + UUID
    const apiKey = `roi_labs_${randomUUID().replace(/-/g, '')}`;

    const newApiKey = await prisma.apiKey.create({
      data: {
        name,
        key: apiKey,
        userId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        key: true,
        userId: true,
        status: true,
        createdAt: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'api_key.created',
        userId,
        resourceType: 'api_key',
        resourceId: newApiKey.id,
        details: { name },
      },
    });

    return NextResponse.json({
      apiKey: newApiKey,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
