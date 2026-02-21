// ─────────────────────────────────────────────────────────
// Flow Engine — Barrel export & auto-registration
// ─────────────────────────────────────────────────────────

import { registerNode } from './node-registry'
import { triggerNodes } from './nodes/triggers'
import { actionNodes } from './nodes/actions'
import { logicNodes } from './nodes/logic'
import { transformNodes } from './nodes/transforms'

// ── Auto-register all built-in nodes ─────────────────────

const allNodes = [...triggerNodes, ...actionNodes, ...logicNodes, ...transformNodes]

let initialized = false

export function initializeNodeRegistry(): void {
    if (initialized) return
    for (const node of allNodes) {
        registerNode(node)
    }
    initialized = true
    console.log(`[FlowEngine] Registered ${allNodes.length} node types (${triggerNodes.length} triggers, ${actionNodes.length} actions, ${logicNodes.length} logic, ${transformNodes.length} transforms)`)
}

// Auto-init on import
initializeNodeRegistry()

// ── Re-exports ───────────────────────────────────────────

export { executeFlow } from './flow-engine'
export type { ExecuteFlowOptions, ExecuteFlowResult } from './flow-engine'
export { getNodeDefinition, getAllNodeDefinitions, getNodesByCategory, getRegistrySummary } from './node-registry'
export type {
    FlowNode,
    FlowEdge,
    NodeDefinition,
    ExecutionContext,
    NodeResult,
    NodeExecutionResult,
    ConfigField,
    PortDefinition,
    FlowExecutionStatus,
} from './types'
