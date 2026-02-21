'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AgentNode, AgentNodeData } from './flow-nodes/agent-node'
import { AnimatedEdge, AnimatedEdgeData } from './flow-edges/animated-edge'

interface AgentStep {
  agentId: string
  role: string
  agentName?: string
}

interface StepResult {
  agentId: string
  agentName: string
  role: string
  output: string
  durationMs?: number
  tokensUsed?: number
}

interface OrchestrationFlowCanvasProps {
  steps: AgentStep[]
  results?: StepResult[]
  isRunning?: boolean
  currentStepIndex?: number
  strategy?: string
}

const nodeTypes = {
  agentNode: AgentNode
}

const edgeTypes = {
  animatedEdge: AnimatedEdge
}

export function OrchestrationFlowCanvas({
  steps,
  results = [],
  isRunning = false,
  currentStepIndex = 0,
  strategy = 'sequential'
}: OrchestrationFlowCanvasProps) {
  // Calculate node positions based on strategy
  const calculateNodePositions = useCallback(() => {
    if (strategy === 'parallel') {
      // Parallel: vertical stack
      return steps.map((_, index) => ({
        x: 250,
        y: index * 200
      }))
    } else {
      // Sequential/Consensus: horizontal flow
      return steps.map((_, index) => ({
        x: index * 300,
        y: 200
      }))
    }
  }, [steps, strategy])

  // Generate nodes
  const initialNodes: Node<AgentNodeData>[] = useMemo(() => {
    const positions = calculateNodePositions()

    return steps.map((step, index) => {
      const result = results.find(r => r.role === step.role) || results[index]
      const isCompleted = !!result
      const isCurrent = isRunning && !result && (index === 0 || !!results[index - 1])

      const status = isCompleted
        ? 'completed'
        : isCurrent
        ? 'running'
        : 'idle'

      return {
        id: `agent-${index}`,
        type: 'agentNode',
        position: positions[index],
        data: {
          role: step.role,
          agentName: step.agentName || 'Unknown Agent',
          status,
          output: result?.output,
          durationMs: result?.durationMs,
          tokensUsed: result?.tokensUsed
        }
      }
    })
  }, [steps, results, isRunning, calculateNodePositions])

  // Generate edges
  const initialEdges: Edge<AnimatedEdgeData>[] = useMemo(() => {
    if (steps.length <= 1) return []

    if (strategy === 'parallel') {
      // Parallel: all connect to a start/end node (simplified - no edges for now)
      return []
    }

    // Sequential/Consensus: chain nodes
    return steps.slice(0, -1).map((_, index) => {
      const isCompleted = !!results[index + 1]
      const isActive = isRunning && currentStepIndex === index

      return {
        id: `edge-${index}-${index + 1}`,
        source: `agent-${index}`,
        target: `agent-${index + 1}`,
        type: 'animatedEdge',
        animated: isActive,
        data: {
          isActive,
          isCompleted
        }
      }
    })
  }, [steps, results, isRunning, currentStepIndex, strategy])

  const [nodes] = useNodesState(initialNodes)
  const [edges] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-[500px] bg-gray-900 rounded-lg border border-white/10 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          animated: false
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="rgba(255, 255, 255, 0.1)"
        />
        <Controls className="bg-gray-800 border-white/10" />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as AgentNodeData
            switch (data.status) {
              case 'completed':
                return '#22c55e'
              case 'running':
                return '#3b82f6'
              case 'error':
                return '#ef4444'
              default:
                return '#374151'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
          className="bg-gray-800 border border-white/10"
        />
      </ReactFlow>
    </div>
  )
}
