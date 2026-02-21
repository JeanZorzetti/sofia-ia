// ─────────────────────────────────────────────────────────
// Node Registry — Central catalog of all node types
// ─────────────────────────────────────────────────────────

import type { NodeDefinition } from './types'

/** Internal storage for registered node definitions */
const registry = new Map<string, NodeDefinition>()

/**
 * Register a node definition. Called once per node type at initialization.
 */
export function registerNode(definition: NodeDefinition): void {
    if (registry.has(definition.type)) {
        console.warn(`[NodeRegistry] Overwriting node type: ${definition.type}`)
    }
    registry.set(definition.type, definition)
}

/**
 * Get a node definition by type string.
 */
export function getNodeDefinition(type: string): NodeDefinition | undefined {
    return registry.get(type)
}

/**
 * Get all registered node definitions.
 */
export function getAllNodeDefinitions(): NodeDefinition[] {
    return Array.from(registry.values())
}

/**
 * Get node definitions filtered by category.
 */
export function getNodesByCategory(category: NodeDefinition['category']): NodeDefinition[] {
    return getAllNodeDefinitions().filter(n => n.category === category)
}

/**
 * Get a summary of the registry for debugging.
 */
export function getRegistrySummary(): Record<string, number> {
    const summary: Record<string, number> = { trigger: 0, action: 0, logic: 0, transform: 0 }
    for (const def of registry.values()) {
        summary[def.category] = (summary[def.category] || 0) + 1
    }
    return summary
}
