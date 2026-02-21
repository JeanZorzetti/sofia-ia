// ─────────────────────────────────────────────────────────
// /api/flows/[id]/versions/[versionId]/restore — Restore flow
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string; versionId: string }> }

// POST /api/flows/:id/versions/:versionId/restore
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getAuthFromRequest(request)
        if (!user) {
            return NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 })
        }

        const { id, versionId } = await params

        // Verify flow ownership
        const flow = await prisma.flow.findUnique({ where: { id } })
        if (!flow || flow.createdBy !== user.id) {
            return NextResponse.json({ data: null, error: 'Flow não encontrado' }, { status: 404 })
        }

        // Find the version to restore
        const targetVersion = await prisma.flowVersion.findUnique({
            where: { id: versionId },
        })
        if (!targetVersion || targetVersion.flowId !== id) {
            return NextResponse.json({ data: null, error: 'Versão não encontrada' }, { status: 404 })
        }

        // Save current state as a new snapshot before restoring
        await prisma.flowVersion.create({
            data: {
                flowId: id,
                version: flow.version,
                label: `Auto-save antes de restaurar v${targetVersion.version}`,
                nodes: flow.nodes as any,
                edges: flow.edges as any,
                settings: flow.settings as any,
                variables: flow.variables as any,
            },
        })

        // Restore the flow to the target version
        const newVersion = flow.version + 1
        const updated = await prisma.flow.update({
            where: { id },
            data: {
                nodes: targetVersion.nodes as any,
                edges: targetVersion.edges as any,
                settings: targetVersion.settings as any,
                variables: targetVersion.variables as any,
                version: newVersion,
            },
            include: {
                creator: { select: { id: true, name: true, email: true } },
            },
        })

        return NextResponse.json({
            data: {
                flow: updated,
                restoredFrom: targetVersion.version,
                newVersion,
            },
            error: null,
        })
    } catch (error: any) {
        console.error('[Flows API] Restore error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
