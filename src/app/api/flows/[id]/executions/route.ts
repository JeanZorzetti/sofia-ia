// ─────────────────────────────────────────────────────────
// /api/flows/[id]/executions — Execution history
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/flows/:id/executions
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '20', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const status = searchParams.get('status')

        // Verify flow exists and is owned by user
        const flow = await prisma.flow.findUnique({
            where: { id },
            select: { id: true, createdBy: true },
        })
        if (!flow || flow.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        const where: any = { flowId: id }
        if (status) where.status = status

        const [executions, total] = await Promise.all([
            prisma.flowExecution.findMany({
                where,
                orderBy: { startedAt: 'desc' },
                take: Math.min(limit, 100),
                skip: offset,
            }),
            prisma.flowExecution.count({ where }),
        ])

        return NextResponse.json({
            data: { executions, total, limit, offset },
            error: null,
        })
    } catch (error: any) {
        console.error('[Flows API] Executions error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
