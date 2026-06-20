// src/app/dashboard/teams/[id]/TeamGraphView.tsx
'use client'

import { useEffect, useMemo } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X } from 'lucide-react'
import {
  buildFancyTeamGraph, GRAPH_COLORS,
  type GraphMember, type GraphTask, type GraphUsage, type GraphRelations,
} from '@/lib/orchestration/team/team-graph-fancy'
import { graphNodeTypes, graphEdgeTypes } from './graph-parts'

// "Visualizar" — the EXPANDED graph view. A fullscreen modal that renders the
// mission-console graph (custom station/satellite nodes + the live handoff pulse)
// for the same board state already on the client. The compact sidebar
// `TeamGraph.tsx` is untouched (it keeps the original React Flow renderer).
// Mounted client-only via `dynamic(ssr:false)` from TeamRunView.

// MiniMap dot color mirrors each node's accent (role) / status.
function miniNodeColor(n: Node): string {
  const d = (n.data ?? {}) as Record<string, unknown>
  if (n.type === 'task') return GRAPH_COLORS.status[String(d.status)] ?? GRAPH_COLORS.status.todo
  const role = String(d.role)
  return role === 'lead' ? GRAPH_COLORS.lead : role === 'reviewer' ? GRAPH_COLORS.reviewer : GRAPH_COLORS.worker
}

export default function TeamGraphView({
  members, tasks, activeId, handoff, running, usageByMember, relations, onClose,
}: {
  members: GraphMember[]
  tasks: GraphTask[]
  activeId: string | null
  handoff?: { fromMemberId: string; toMemberId: string } | null
  running?: boolean
  usageByMember?: GraphUsage[]
  relations?: Map<string, GraphRelations>
  onClose: () => void
}) {
  const { nodes, edges } = useMemo(
    () => buildFancyTeamGraph(members, tasks, activeId, { handoff, running, usageByMember, relations }),
    [members, tasks, activeId, handoff, running, usageByMember, relations],
  )

  // Close on Escape (the backdrop click + the × button cover the rest).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Stop propagation so clicks inside the panel don't close the modal. */}
      <div className="m-4 flex-1 flex flex-col rounded-2xl border border-white/10 bg-[#07080f] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div>
            <h2 className="font-semibold text-white text-sm">Visualizar — grafo do time</h2>
            <p className="text-[11px] text-white/40">Estações, tarefas e o sinal de handoff ao vivo. Arraste para mover, role para dar zoom.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>

        <div className="relative flex-1" style={{ background: 'radial-gradient(circle at 50% 28%, #0d1226 0%, #07080f 72%)' }}>
          <style>{`
            .fancy-node {
              position: relative; width: 100%; box-sizing: border-box;
              border: 1px solid; border-radius: 14px; padding: 9px 11px;
              background: linear-gradient(160deg, rgba(20,27,46,0.92), rgba(9,12,24,0.94));
              -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
              color: #e8eefc; font-size: 12px; line-height: 1.2;
            }
            .fancy-node--thinking::after {
              content: ''; position: absolute; inset: -3px; border-radius: 16px;
              border: 1.5px solid var(--accent); opacity: 0; pointer-events: none;
              animation: fancyRing 1.8s ease-out infinite;
            }
            @keyframes fancyRing { 0% { opacity: .5; transform: scale(1); } 100% { opacity: 0; transform: scale(1.13); } }
            .fancy-node__row { display: flex; align-items: center; gap: 9px; }
            .fancy-node__icon { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; }
            .fancy-node__body { min-width: 0; }
            .fancy-node__name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .fancy-node__meta { display: flex; align-items: center; gap: 5px; margin-top: 2px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.09em; color: rgba(232,238,252,0.5); }
            .fancy-sep { color: rgba(232,238,252,0.3); }
            .fancy-task {
              box-sizing: border-box; border: 1px solid; border-radius: 11px; padding: 6px 9px;
              color: #e8eefc; font-size: 11px; line-height: 1.25;
            }
            .fancy-task__title { display: flex; align-items: center; gap: 5px; font-weight: 500; }
            .fancy-task__title > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .fancy-task__meta { display: flex; align-items: center; gap: 5px; margin-top: 3px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(232,238,252,0.5); }
            .fancy-task__owner { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .fancy-task__chip { display: inline-flex; align-items: center; gap: 3px; margin-left: auto; }
            .fancy-handle { opacity: 0; width: 1px; height: 1px; min-width: 0; min-height: 0; border: 0; }
            @media (prefers-reduced-motion: reduce) {
              .fancy-node--thinking::after { animation: none; }
            }
          `}</style>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={graphNodeTypes}
            edgeTypes={graphEdgeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: false }}
            style={{ background: 'transparent' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(120,160,220,0.12)" />
            <Controls showInteractive={false} className="!bg-white/5 !border-white/10" />
            <MiniMap pannable zoomable nodeColor={miniNodeColor} nodeStrokeWidth={0} className="!bg-white/5" maskColor="rgba(0,0,0,0.6)" />
          </ReactFlow>

          {/* Legend — the edge vocabulary this view uses. */}
          <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-[10px] text-white/60 space-y-1 pointer-events-none">
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2" style={{ borderColor: GRAPH_COLORS.signal }} /> handoff ao vivo</div>
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t border-dashed" style={{ borderColor: GRAPH_COLORS.depend }} /> depende de</div>
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t border-dashed" style={{ borderColor: GRAPH_COLORS.related }} /> relacionada</div>
          </div>
        </div>
      </div>
    </div>
  )
}
