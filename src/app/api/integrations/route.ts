import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

// GET /api/integrations - List all integrations
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const integrations = await prisma.integration.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Remove sensitive credentials from response
    const sanitizedIntegrations = integrations.map((integration) => ({
      ...integration,
      credentials: undefined,
      hasCredentials: Object.keys(integration.credentials as Record<string, unknown>).length > 0,
    }));

    return NextResponse.json(sanitizedIntegrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar integrações' },
      { status: 500 }
    );
  }
}

// POST /api/integrations - Create new integration
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, config, credentials, status } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nome e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        config: config || {},
        credentials: credentials || {},
        status: status || 'inactive',
      },
    });

    // Remove sensitive credentials from response
    const sanitizedIntegration = {
      ...integration,
      credentials: undefined,
      hasCredentials: Object.keys(integration.credentials as Record<string, unknown>).length > 0,
    };

    return NextResponse.json(sanitizedIntegration, { status: 201 });
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Erro ao criar integração' },
      { status: 500 }
    );
  }
}
