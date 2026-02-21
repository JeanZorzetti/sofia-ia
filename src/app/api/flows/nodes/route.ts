// ─────────────────────────────────────────────────────────
// /api/flows/nodes — List all available node types
// ─────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { getAllNodeDefinitions, getNodesByCategory } from '@/lib/flow-engine'

// GET /api/flows/nodes — Returns the node catalog for the builder UI
export async function GET() {
    try {
        const allNodes = getAllNodeDefinitions()

        // Group by category for the node palette
        const catalog = {
            trigger: getNodesByCategory('trigger').map(n => ({
                type: n.type,
                label: n.label,
                description: n.description,
                icon: n.icon,
                color: n.color,
                configFields: n.configFields,
                inputs: n.inputs,
                outputs: n.outputs,
            })),
            action: getNodesByCategory('action').map(n => ({
                type: n.type,
                label: n.label,
                description: n.description,
                icon: n.icon,
                color: n.color,
                configFields: n.configFields,
                inputs: n.inputs,
                outputs: n.outputs,
            })),
            logic: getNodesByCategory('logic').map(n => ({
                type: n.type,
                label: n.label,
                description: n.description,
                icon: n.icon,
                color: n.color,
                configFields: n.configFields,
                inputs: n.inputs,
                outputs: n.outputs,
            })),
            transform: getNodesByCategory('transform').map(n => ({
                type: n.type,
                label: n.label,
                description: n.description,
                icon: n.icon,
                color: n.color,
                configFields: n.configFields,
                inputs: n.inputs,
                outputs: n.outputs,
            })),
        }

        return NextResponse.json({
            data: {
                catalog,
                totalNodes: allNodes.length,
            },
            error: null,
        })
    } catch (error: any) {
        console.error('[Flows API] Nodes error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}
