// ─────────────────────────────────────────────────────────
// Flow Engine — Type definitions
// ─────────────────────────────────────────────────────────

/** A node stored in the Flow.nodes Json column */
export interface FlowNode {
    id: string
    type: string                          // e.g. 'trigger_manual', 'action_http', 'logic_if'
    position: { x: number; y: number }
    data: {
        label: string
        config: Record<string, any>         // node-type-specific configuration
        notes?: string
    }
}

/** An edge stored in the Flow.edges Json column */
export interface FlowEdge {
    id: string
    source: string                        // source nodeId
    target: string                        // target nodeId
    sourceHandle?: string                 // for branching (e.g. 'true' | 'false' on IF node)
    label?: string
}

/** Port definition for node inputs/outputs */
export interface PortDefinition {
    name: string                          // handle id (e.g. 'main', 'true', 'false')
    label?: string
    type: 'any' | 'string' | 'number' | 'boolean' | 'array' | 'object'
}

/** JSON Schema subset for node config forms */
export interface ConfigField {
    key: string
    label: string
    type: 'string' | 'number' | 'boolean' | 'select' | 'code' | 'json' | 'text' | 'expression'
    placeholder?: string
    required?: boolean
    default?: any
    options?: { label: string; value: string }[]    // for 'select' type
    description?: string
}

/** Result of executing a single node */
export interface NodeResult {
    output: any                           // data passed to next node(s)
    error?: string
}

/** Execution context passed to each node executor */
export interface ExecutionContext {
    /** All data from previous nodes, keyed by nodeId */
    nodeOutputs: Record<string, any>

    /** The trigger data that started this execution */
    triggerData: any

    /** Flow-level variables */
    variables: Record<string, any>

    /** The execution ID */
    executionId: string

    /** The flow ID */
    flowId: string

    /** Abort signal for cancellation */
    signal?: AbortSignal

    /** Sub-flow nesting depth (max 5 to prevent infinite loops) */
    depth?: number
}

/** Status of a node during execution */
export type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

/** Per-node result stored in FlowExecution.nodeResults */
export interface NodeExecutionResult {
    status: NodeExecutionStatus
    input?: any
    output?: any
    startedAt?: string
    duration?: number
    error?: string
}

/** Definition of a node type in the registry */
export interface NodeDefinition {
    type: string
    category: 'trigger' | 'action' | 'logic' | 'transform'
    label: string
    description: string
    icon: string                          // lucide icon name
    color: string                         // tailwind color class (e.g. 'emerald', 'blue')

    /** Configuration fields for the node config panel */
    configFields: ConfigField[]

    /** Input ports */
    inputs: PortDefinition[]

    /** Output ports */
    outputs: PortDefinition[]

    /** The executor function */
    execute: (config: Record<string, any>, input: any, context: ExecutionContext) => Promise<NodeResult>
}

/** Flow execution status */
export type FlowExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
