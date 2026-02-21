// ─────────────────────────────────────────────────────────
// /api/flows/[id]/versions — Flow versioning
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/flows/:id/versions — List all versions
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params

        // Verify ownership
        const flow = await prisma.flow.findUnique({
            where: { id },
            select: { id: true, createdBy: true, version: true },
        })
        if (!flow || flow.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        const versions = await prisma.flowVersion.findMany({
            where: { flowId: id },
            orderBy: { version: 'desc' },
            select: {
                id: true,
                version: true,
                label: true,
                createdAt: true,
            },
        })

        return NextResponse.json({
            data: {
                currentVersion: flow.version,
                versions,
            },
            error: null,
        })
    } catch (error: any) {
        console.error('[Flows API] Versions GET error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}

// POST /api/flows/:id/versions — Create a snapshot of the current version
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params

        // Verify ownership
        const flow = await prisma.flow.findUnique({ where: { id } })
        if (!flow || flow.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        // Parse optional label
        let label: string | null = null
        try {
            const body = await request.json()
            label = body.label || null
        } catch {
            // No body is OK
        }

        // Create version snapshot
        const version = await prisma.flowVersion.create({
            data: {
                flowId: id,
                version: flow.version,
                label,
                nodes: flow.nodes as any,
                edges: flow.edges as any,
                settings: flow.settings as any,
                variables: flow.variables as any,
            },
        })

        return NextResponse.json({ data: version, error: null }, { status: 201 })
    } catch (error: any) {
        console.error('[Flows API] Versions POST error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
