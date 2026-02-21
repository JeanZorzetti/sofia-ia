// ─────────────────────────────────────────────────────────
// /api/flows/[id]/execute — Execute a flow
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { executeFlow } from '@/lib/flow-engine'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/flows/:id/execute
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params

        // Verify flow exists and is owned by user
        const flow = await prisma.flow.findUnique({ where: { id } })
        if (!flow || flow.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        // Parse optional trigger data
        let triggerData = {}
        try {
            const body = await request.json()
            triggerData = body.triggerData || body || {}
        } catch {
            // Empty body is OK for manual triggers
        }

        // Fire-and-forget async execution
        const executionPromise = executeFlow(id, { triggerData, mode: 'manual' })

        // For manual execution, we wait for the result (up to 30s)
        // For webhook-triggered, we return immediately with 202
        const result = await Promise.race([
            executionPromise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000)),
        ])

        if (result) {
            return NextResponse.json({
                data: {
                    executionId: result.executionId,
                    status: result.status,
                    duration: result.duration,
                    nodeResults: result.nodeResults,
                    error: result.error,
                },
                error: null,
            })
        }

        // Execution is still running after 30s timeout
        return NextResponse.json({
            data: { message: 'Execução em andamento. Verifique o histórico para o resultado.' },
            error: null,
        }, { status: 202 })
    } catch (error: any) {
        console.error('[Flows API] Execute error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
