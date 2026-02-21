// ─────────────────────────────────────────────────────────
// /api/flows/[id]/duplicate — Duplicate a flow
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/flows/:id/duplicate
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id } = await params

        const original = await prisma.flow.findUnique({ where: { id } })
        if (!original || original.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        const clone = await prisma.flow.create({
            data: {
                name: `${original.name} (cópia)`,
                description: original.description,
                nodes: original.nodes as any,
                edges: original.edges as any,
                settings: original.settings as any,
                variables: original.variables as any,
                triggerType: original.triggerType === 'webhook' ? 'manual' : original.triggerType,
                tags: original.tags,
                icon: original.icon,
                color: original.color,
                status: 'draft',
                createdBy: user.id,
            },
            include: {
                creator: { select: { id: true, name: true, email: true } },
            },
        })

        return NextResponse.json({ data: clone, error: null }, { status: 201 })
    } catch (error: any) {
        console.error('[Flows API] Duplicate error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
