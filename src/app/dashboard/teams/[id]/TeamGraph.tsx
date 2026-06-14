// src/app/dashboard/teams/[id]/TeamGraph.tsx
'use client'

import type { CSSProperties } from 'react'
import { ReactFlow, Background, Position, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export interface GraphMember { id: string; role: string; name: string }

function nodeStyle(active: boolean): CSSProperties {
  return {
    background: active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.15)'}`,
    color: 'white',
    borderRadius: 12,
    fontSize: 12,
    padding: '6px 10px',
    width: 140,
    textAlign: 'center',
    boxShadow: active ? '0 0 16px rgba(59,130,246,0.35)' : 'none',
  }
}

const label = (role: string, name: string) => {
  const g = role === 'lead' ? '👑' : role === 'reviewer' ? '🛡' : '🛠'
  return `${g} ${name}`
}

export default function TeamGraph({ members, activeId }: { members: GraphMember[]; activeId: string | null }) {
  const lead = members.find(m => m.role === 'lead')
  const workers = members.filter(m => m.role === 'worker')
  const reviewer = members.find(m => m.role === 'reviewer')

  const gap = 170
  const totalW = Math.max(workers.length, 1) * gap
  const centerX = totalW / 2 - 70

  const nodes: Node[] = []
  const edges: Edge[] = []

  if (lead) {
    nodes.push({
      id: lead.id, position: { x: centerX, y: 0 }, data: { label: label('lead', lead.name) },
      style: nodeStyle(lead.id === activeId), sourcePosition: Position.Bottom, targetPosition: Position.Top,
      draggable: false, selectable: false,
    })
  }
  workers.forEach((w, i) => {
    nodes.push({
      id: w.id, position: { x: i * gap, y: 130 }, data: { label: label('worker', w.name) },
      style: nodeStyle(w.id === activeId), sourcePosition: Position.Bottom, targetPosition: Position.Top,
      draggable: false, selectable: false,
    })
    if (lead) edges.push({ id: `l-${w.id}`, source: lead.id, target: w.id, animated: w.id === activeId, style: { stroke: 'rgba(255,255,255,0.2)' } })
    if (reviewer) edges.push({ id: `${w.id}-r`, source: w.id, target: reviewer.id, animated: w.id === activeId, style: { stroke: 'rgba(255,255,255,0.2)' } })
  })
  if (reviewer) {
    nodes.push({
      id: reviewer.id, position: { x: centerX, y: 260 }, data: { label: label('reviewer', reviewer.name) },
      style: nodeStyle(reviewer.id === activeId), sourcePosition: Position.Bottom, targetPosition: Position.Top,
      draggable: false, selectable: false,
    })
    if (lead) edges.push({ id: `r-l`, source: reviewer.id, target: lead.id, animated: reviewer.id === activeId, style: { stroke: 'rgba(255,255,255,0.12)', strokeDasharray: '4 4' } })
  }

  return (
    <div className="h-[260px] w-full rounded-lg overflow-hidden">
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
