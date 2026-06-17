// src/app/dashboard/teams/[id]/TeamGraph.tsx
'use client'

import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { buildTeamGraph, type GraphMember, type GraphTask } from '@/lib/orchestration/team/team-graph-view'

// Re-export so callers can keep importing the member type from here.
export type { GraphMember, GraphTask } from '@/lib/orchestration/team/team-graph-view'

// Thin renderer (G4): all layout/styling lives in the pure `buildTeamGraph`.
// Board-driven — task nodes show for every run; a linear run just has no
// task→task edges (empty dependsOn).
//
// G5: forwards the live `handoff` (Lead→Worker / Worker→Reviewer) and `running`
// flag so the builder animates the matching member edge and flags the active
// member as thinking. The "thinking" pulse itself is the CSS keyframe below,
// keyed off the `rf-thinking` className the builder emits (keeps the builder pure).
export default function TeamGraph({
  members, tasks, activeId, handoff, running,
}: {
  members: GraphMember[]
  tasks?: GraphTask[]
  activeId: string | null
  handoff?: { fromMemberId: string; toMemberId: string } | null
  running?: boolean
}) {
  const { nodes, edges } = buildTeamGraph(members, tasks ?? [], activeId, { handoff, running })

  return (
    <div className="h-[360px] w-full rounded-lg overflow-hidden">
      <style>{`
        @keyframes rfThinkingPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          50% { box-shadow: 0 0 0 7px rgba(59,130,246,0); }
        }
        .react-flow__node.rf-thinking { animation: rfThinkingPulse 1.4s ease-in-out infinite; }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
      >
        <Background color="rgba(255,255,255,0.06)" gap={18} />
      </ReactFlow>
    </div>
  )
}
