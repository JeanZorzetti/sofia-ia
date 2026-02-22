import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { ORCHESTRATION_TEMPLATES } from '@/lib/orchestration/orchestration-templates'

// GET /api/orchestrations/templates - List available templates
export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request)
        if (!auth) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        // Return templates with summary info (no full prompts in listing)
        const templates = ORCHESTRATION_TEMPLATES.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            icon: t.icon,
            strategy: t.strategy,
            agentCount: t.agents.length,
            agentRoles: t.agents.map(a => a.role),
            exampleInput: t.exampleInput,
            expectedOutput: t.expectedOutput,
            estimatedDuration: t.estimatedDuration,
            tags: t.tags,
        }))

        return NextResponse.json({ success: true, data: templates })
    } catch (error: any) {
        console.error('Error fetching templates:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch templates' },
            { status: 500 }
        )
    }
}
