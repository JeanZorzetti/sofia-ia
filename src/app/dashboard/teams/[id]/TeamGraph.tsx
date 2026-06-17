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
export default function TeamGraph({
  members, tasks, activeId,
}: {
  members: GraphMember[]
  tasks?: GraphTask[]
  activeId: string | null
}) {
  const { nodes, edges } = buildTeamGraph(members, tasks ?? [], activeId)

  return (
    <div className="h-[360px] w-full rounded-lg overflow-hidden">
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
