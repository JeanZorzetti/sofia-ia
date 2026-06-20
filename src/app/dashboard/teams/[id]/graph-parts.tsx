// src/app/dashboard/teams/[id]/graph-parts.tsx
'use client'

// Custom React Flow node/edge components for the "Visualizar" modal (the enriched
// mission-console graph). All ORIGINAL — only @xyflow/react + lucide. The visual
// language: glass "station" cards keyed to a role accent (gold lead / cyan worker
// / violet reviewer), task "satellites" tinted by status, and the signature — a
// cyan signal pulse travelling along the live handoff edge.
//
// nodeTypes/edgeTypes are defined at module scope so their identity is stable
// across renders (React Flow warns otherwise).
import type { CSSProperties } from 'react'
import {
  BaseEdge, getBezierPath, Handle, Position,
  type EdgeProps, type NodeProps,
} from '@xyflow/react'
import { Crown, Hammer, ShieldCheck, Lock } from 'lucide-react'
import { GRAPH_COLORS, type FancyMemberData, type FancyTaskData } from '@/lib/orchestration/team/team-graph-fancy'

function accentForRole(role: string): string {
  return role === 'lead' ? GRAPH_COLORS.lead : role === 'reviewer' ? GRAPH_COLORS.reviewer : GRAPH_COLORS.worker
}
function roleLabel(role: string): string {
  return role === 'lead' ? 'Lead' : role === 'reviewer' ? 'Revisor' : 'Worker'
}

function MemberNode({ data }: NodeProps) {
  const d = data as FancyMemberData
  const color = accentForRole(d.role)
  const Icon = d.role === 'lead' ? Crown : d.role === 'reviewer' ? ShieldCheck : Hammer
  return (
    <div
      className={`fancy-node${d.thinking ? ' fancy-node--thinking' : ''}`}
      style={{
        ['--accent' as string]: color,
        borderColor: d.active ? `${color}99` : 'rgba(150,180,230,0.18)',
        boxShadow: d.active ? `0 0 0 1px ${color}55, 0 0 24px ${color}55` : '0 0 0 1px rgba(150,180,230,0.10)',
      } as CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="fancy-handle" isConnectable={false} />
      <div className="fancy-node__row">
        <span className="fancy-node__icon" style={{ color, background: `${color}1f`, boxShadow: `0 0 12px ${color}44` }}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
        <div className="fancy-node__body">
          <div className="fancy-node__name">{d.name}</div>
          <div className="fancy-node__meta">
            <span style={{ color }}>{roleLabel(d.role)}</span>
            {d.tokensLabel && (<><span className="fancy-sep">·</span><span>{d.tokensLabel}</span></>)}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="fancy-handle" isConnectable={false} />
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const d = data as FancyTaskData
  const color = GRAPH_COLORS.status[d.status] ?? GRAPH_COLORS.status.todo
  return (
    <div
      className="fancy-task"
      style={{ borderColor: `${color}99`, background: `${color}1a`, boxShadow: `0 0 14px ${color}22` }}
    >
      <Handle type="target" position={Position.Top} className="fancy-handle" isConnectable={false} />
      <div className="fancy-task__title">
        {d.blocked && <Lock size={11} style={{ color, flexShrink: 0 }} />}
        <span>{d.title}</span>
      </div>
      <div className="fancy-task__meta">
        <span style={{ color }}>{d.statusLabel}</span>
        {d.ownerName && (<><span className="fancy-sep">·</span><span className="fancy-task__owner">{d.ownerName}</span></>)}
        {d.reviewerName && (
          <span className="fancy-task__chip" style={{ color: GRAPH_COLORS.reviewer }}>
            <ShieldCheck size={9} /> {d.reviewerName}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="fancy-handle" isConnectable={false} />
    </div>
  )
}

// The signature edge: a glowing cyan path with a single pulse travelling along it
// (source → target), mirroring an agent handing work off. Honors reduced motion.
function HandoffEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const c = GRAPH_COLORS.signal
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: c, strokeWidth: 2.25, filter: `drop-shadow(0 0 5px ${c})` }} />
      {!reduce && (
        <circle r={4} fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }}>
          <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  )
}

export const graphNodeTypes = { member: MemberNode, task: TaskNode }
export const graphEdgeTypes = { handoff: HandoffEdge }
