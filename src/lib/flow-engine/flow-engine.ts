// ─────────────────────────────────────────────────────────
// Flow Engine — Core DAG executor
// ─────────────────────────────────────────────────────────
//
// Resolves a flow graph topologically and executes each node
// in sequence, passing outputs from source nodes to target
// nodes via edges. Supports branching (IF/Switch) via
// sourceHandle on edges.
//
// Usage:
//   import { executeFlow } from '@/lib/flow-engine/flow-engine'
//   const result = await executeFlow(flowId, { triggerData, mode })
//

import { prisma } from '@/lib/prisma'
import { getNodeDefinition } from './node-registry'
import type {
    FlowNode,
    FlowEdge,
    ExecutionContext,
    NodeExecutionResult,
    FlowExecutionStatus,
} from './types'

// ── Public API ──────────────────────────────────────────

export interface ExecuteFlowOptions {
    triggerData?: any
    mode?: string // manual | webhook | cron | subflow
    depth?: number // sub-flow nesting depth
}

export interface ExecuteFlowResult {
    executionId: string
    status: FlowExecutionStatus
    nodeResults: Record<string, NodeExecutionResult>
    duration: number
    error?: string
}

/**
 * Execute a flow by its ID. Creates a FlowExecution record,
 * resolves the DAG, and runs each node sequentially.
 */
export async function executeFlow(
    flowId: string,
    options: ExecuteFlowOptions = {}
): Promise<ExecuteFlowResult> {
    const startTime = Date.now()
    const { triggerData = {}, mode = 'manual' } = options

    // ── 1. Load the flow ────────────────────────────────────
    const flow = await prisma.flow.findUnique({ where: { id: flowId } })
    if (!flow) throw new Error(`Flow not found: ${flowId}`)
    if (flow.status !== 'active' && mode !== 'manual') {
        throw new Error(`Flow is not active. Status: ${flow.status}`)
    }

    const nodes: FlowNode[] = flow.nodes as any as FlowNode[]
    const edges: FlowEdge[] = flow.edges as any as FlowEdge[]

    // ── 2. Create execution record ─────────────────────────
    const execution = await prisma.flowExecution.create({
        data: {
            flowId,
            status: 'running',
            mode,
            triggerData: triggerData ?? undefined,
            startedAt: new Date(),
        },
    })

    const nodeResults: Record<string, NodeExecutionResult> = {}
    let finalStatus: FlowExecutionStatus = 'success'
    let finalError: string | undefined
    let errorNodeId: string | undefined

    try {
        // ── 3. Topological sort ────────────────────────────────
        const sortedNodeIds = topologicalSort(nodes, edges)

        // ── 4. Build execution context ─────────────────────────
        const context: ExecutionContext = {
            nodeOutputs: {},
            triggerData,
            variables: (flow.variables as Record<string, any>) || {},
            executionId: execution.id,
            flowId,
            depth: options.depth || 0,
        }

        // ── 5. Execute nodes in order ──────────────────────────
        for (const nodeId of sortedNodeIds) {
            const node = nodes.find(n => n.id === nodeId)
            if (!node) continue

            const definition = getNodeDefinition(node.type)
            if (!definition) {
                nodeResults[nodeId] = {
                    status: 'failed',
                    error: `Unknown node type: ${node.type}`,
                }
                throw new Error(`Unknown node type: ${node.type}`)
            }

            // Check if this node should be skipped (branch not taken)
            if (shouldSkipNode(nodeId, nodes, edges, nodeResults, context)) {
                nodeResults[nodeId] = { status: 'skipped' }
                continue
            }

            // Collect input from incoming edges
            const nodeInput = collectNodeInput(nodeId, edges, context)

            // Mark node as running
            nodeResults[nodeId] = { status: 'running', input: nodeInput, startedAt: new Date().toISOString() }

            // Persist progress
            await persistNodeResults(execution.id, nodeResults)

            const nodeStartTime = Date.now()

            try {
                const result = await definition.execute(
                    node.data.config || {},
                    nodeInput,
                    context,
                )

                const nodeDuration = Date.now() - nodeStartTime

                // Store output in context for downstream nodes
                context.nodeOutputs[nodeId] = result.output

                nodeResults[nodeId] = {
                    status: 'success',
                    input: nodeInput,
                    output: result.output,
                    startedAt: nodeResults[nodeId].startedAt,
                    duration: nodeDuration,
                }
            } catch (nodeError: any) {
                const nodeDuration = Date.now() - nodeStartTime
                const errMsg = nodeError?.message || 'Unknown error'

                nodeResults[nodeId] = {
                    status: 'failed',
                    input: nodeInput,
                    startedAt: nodeResults[nodeId].startedAt,
                    duration: nodeDuration,
                    error: errMsg,
                }

                finalStatus = 'failed'
                finalError = `Node "${node.data.label}" (${nodeId}): ${errMsg}`
                errorNodeId = nodeId
                break // stop execution on error
            }
        }
    } catch (error: any) {
        finalStatus = 'failed'
        finalError = finalError || error.message || 'Unknown execution error'
    }

    const duration = Date.now() - startTime

    // ── 6. Finalize execution record ─────────────────────────
    await prisma.flowExecution.update({
        where: { id: execution.id },
        data: {
            status: finalStatus,
            nodeResults: nodeResults as any,
            completedAt: new Date(),
            duration,
            error: finalError || null,
            errorNodeId: errorNodeId || null,
        },
    })

    // ── 7. Update flow stats ──────────────────────────────────
    await prisma.flow.update({
        where: { id: flowId },
        data: {
            lastRunAt: new Date(),
            runCount: { increment: 1 },
            ...(finalStatus === 'success' ? { successCount: { increment: 1 } } : {}),
        },
    })

    return {
        executionId: execution.id,
        status: finalStatus,
        nodeResults,
        duration,
        error: finalError,
    }
}


// ── Internal helpers ────────────────────────────────────

/**
 * Topological sort using Kahn's algorithm.
 * Returns node IDs in execution order (sources first).
 */
function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): string[] {
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()

    // Initialize
    for (const node of nodes) {
        inDegree.set(node.id, 0)
        adjacency.set(node.id, [])
    }

    // Build graph
    for (const edge of edges) {
        const targets = adjacency.get(edge.source) || []
        targets.push(edge.target)
        adjacency.set(edge.source, targets)
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }

    // Start with nodes that have no incoming edges
    const queue: string[] = []
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) queue.push(nodeId)
    }

    const sorted: string[] = []
    while (queue.length > 0) {
        const current = queue.shift()!
        sorted.push(current)

        for (const neighbor of adjacency.get(current) || []) {
            const newDegree = (inDegree.get(neighbor) || 1) - 1
            inDegree.set(neighbor, newDegree)
            if (newDegree === 0) queue.push(neighbor)
        }
    }

    // If we didn't process all nodes, there's a cycle
    if (sorted.length !== nodes.length) {
        console.warn('[FlowEngine] Cycle detected in flow graph. Executing available nodes only.')
    }

    return sorted
}

/**
 * Collect input data for a node from all its incoming edges.
 * Merges outputs from all source nodes.
 */
function collectNodeInput(
    nodeId: string,
    edges: FlowEdge[],
    context: ExecutionContext
): any {
    const incomingEdges = edges.filter(e => e.target === nodeId)

    if (incomingEdges.length === 0) {
        // Trigger nodes or root nodes get triggerData
        return context.triggerData
    }

    if (incomingEdges.length === 1) {
        return context.nodeOutputs[incomingEdges[0].source] ?? {}
    }

    // Multiple inputs: merge into an object keyed by source nodeId
    const merged: Record<string, any> = {}
    for (const edge of incomingEdges) {
        merged[edge.source] = context.nodeOutputs[edge.source] ?? {}
    }
    return merged
}

/**
 * Check if a node should be skipped due to branching.
 * A node is skipped if ALL its incoming edges come from
 * sourceHandles that weren't taken (e.g. IF node chose 'true'
 * but this node connects to 'false').
 */
function shouldSkipNode(
    nodeId: string,
    nodes: FlowNode[],
    edges: FlowEdge[],
    nodeResults: Record<string, NodeExecutionResult>,
    context: ExecutionContext
): boolean {
    const incomingEdges = edges.filter(e => e.target === nodeId)

    if (incomingEdges.length === 0) return false

    // If ALL source nodes are skipped or failed, skip this node too
    const allSourcesSkipped = incomingEdges.every(edge => {
        const sourceResult = nodeResults[edge.source]
        if (!sourceResult) return false
        if (sourceResult.status === 'skipped') return true
        if (sourceResult.status === 'failed') return true

        // Check if this edge's sourceHandle matches the output
        if (edge.sourceHandle && sourceResult.output !== undefined) {
            // For branching nodes: output contains a `_branch` field
            const branchTaken = sourceResult.output?._branch
            if (branchTaken !== undefined && branchTaken !== edge.sourceHandle) {
                return true // this branch was not taken
            }
        }

        return false
    })

    return allSourcesSkipped
}

/**
 * Persist node results to the execution record (for live updates).
 */
async function persistNodeResults(
    executionId: string,
    nodeResults: Record<string, NodeExecutionResult>
): Promise<void> {
    try {
        await prisma.flowExecution.update({
            where: { id: executionId },
            data: { nodeResults: nodeResults as any },
        })
    } catch (err) {
        console.error('[FlowEngine] Failed to persist node results:', err)
    }
}
