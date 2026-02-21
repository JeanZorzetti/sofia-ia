// ─────────────────────────────────────────────────────────
// /api/flows/[id] — Single flow CRUD
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/flows/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params

        const flow = await prisma.flow.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, name: true, email: true } },
                executions: {
                    orderBy: { startedAt: 'desc' },
                    take: 10,
                },
            },
        })

        if (!flow || flow.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ data: flow, error: null })
    } catch (error: any) {
        console.error('[Flows API] GET error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}

// PUT /api/flows/:id — Update flow
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        // Verify ownership
        const existing = await prisma.flow.findUnique({ where: { id } })
        if (!existing || existing.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        const {
            name, description, nodes, edges, settings, variables,
            triggerType, cronExpression, tags, icon, color, status,
        } = body

        // If changing to webhook trigger and no webhook ID exists, generate one
        let webhookId = existing.webhookId
        if (triggerType === 'webhook' && !webhookId) {
            webhookId = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
        }

        // Auto-snapshot: if nodes or edges changed, save current version
        const graphChanged = nodes !== undefined || edges !== undefined
        let newVersion = existing.version
        if (graphChanged) {
            try {
                await prisma.flowVersion.create({
                    data: {
                        flowId: id,
                        version: existing.version,
                        nodes: existing.nodes as any,
                        edges: existing.edges as any,
                        settings: existing.settings as any,
                        variables: existing.variables as any,
                    },
                })
            } catch {
                // Version already exists (duplicate save), skip
            }
            newVersion = existing.version + 1
        }

        const flow = await prisma.flow.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description }),
                ...(nodes !== undefined && { nodes }),
                ...(edges !== undefined && { edges }),
                ...(settings !== undefined && { settings }),
                ...(variables !== undefined && { variables }),
                ...(triggerType !== undefined && { triggerType }),
                ...(cronExpression !== undefined && { cronExpression }),
                ...(tags !== undefined && { tags }),
                ...(icon !== undefined && { icon }),
                ...(color !== undefined && { color }),
                ...(status !== undefined && { status }),
                webhookId,
                ...(graphChanged && { version: newVersion }),
            },
            include: {
                creator: { select: { id: true, name: true, email: true } },
            },
        })

        return NextResponse.json({ data: flow, error: null })
    } catch (error: any) {
        console.error('[Flows API] PUT error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}

// DELETE /api/flows/:id
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params

        const existing = await prisma.flow.findUnique({ where: { id } })
        if (!existing || existing.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        await prisma.flow.delete({ where: { id } })

        return NextResponse.json({ data: { deleted: true }, error: null })
    } catch (error: any) {
        console.error('[Flows API] DELETE error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
