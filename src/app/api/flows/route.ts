// ─────────────────────────────────────────────────────────
// /api/flows — CRUD for flows
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/flows — List all flows for the current user
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const tag = searchParams.get('tag')

        const where: any = { createdBy: user.id }
        if (status && status !== 'all') where.status = status
        if (tag) where.tags = { has: tag }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ]
        }

        const flows = await prisma.flow.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                creator: { select: { id: true, name: true, email: true } },
                _count: { select: { executions: true } },
            },
        })

        return NextResponse.json({ data: flows, error: null })
    } catch (error: any) {
        console.error('[Flows API] GET error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}

// POST /api/flows — Create a new flow
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, nodes, edges, settings, variables, triggerType, tags, icon, color } = body

        if (!name?.trim()) {
            return NextResponse.json({ data: null, error: 'Nome é obrigatório' }, { status: 400 })
        }

        // Generate a unique webhook ID if trigger is webhook
        let webhookId: string | null = null
        if (triggerType === 'webhook') {
            webhookId = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
        }

        const flow = await prisma.flow.create({
            data: {
                name: name.trim(),
                description: description || null,
                nodes: nodes || [],
                edges: edges || [],
                settings: settings || {},
                variables: variables || {},
                triggerType: triggerType || 'manual',
                tags: tags || [],
                icon: icon || null,
                color: color || null,
                webhookId,
                status: 'draft',
                createdBy: user.id,
            },
            include: {
                creator: { select: { id: true, name: true, email: true } },
            },
        })

        return NextResponse.json({ data: flow, error: null }, { status: 201 })
    } catch (error: any) {
        console.error('[Flows API] POST error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
