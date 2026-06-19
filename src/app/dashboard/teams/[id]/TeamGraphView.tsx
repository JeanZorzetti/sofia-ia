// src/app/dashboard/teams/[id]/TeamGraphView.tsx
'use client'

import { useEffect } from 'react'
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X } from 'lucide-react'
import {
  buildTeamGraph,
  type GraphMember, type GraphTask, type GraphUsage, type GraphRelations,
} from '@/lib/orchestration/team/team-graph-view'

// V2.2 S5 — "Visualizar": the EXPANDED graph view. A fullscreen modal overlay that
// renders the same board-driven graph as the compact sidebar `TeamGraph.tsx`, but
// (a) interactive (pan / zoom / fit / minimap) and (b) enriched — member nodes show
// run tokens, task nodes spell out owner + status, and `related` cross-links appear
// as purple dashed edges. The compact `TeamGraph.tsx` is untouched; this is purely
// additive. Mounted client-only via `dynamic(ssr:false)` from TeamRunView.
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
  const { nodes, edges } = buildTeamGraph(members, tasks, activeId, {
    handoff, running, expanded: true, usageByMember, relations,
  })

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
      <div className="m-4 flex-1 flex flex-col rounded-2xl border border-white/10 bg-[#0b0b0f] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div>
            <h2 className="font-semibold text-white text-sm">Visualizar — grafo do time</h2>
            <p className="text-[11px] text-white/40">Membros, tarefas, dependências e relações. Arraste para mover, role para dar zoom.</p>
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

        <div className="relative flex-1">
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
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
          >
            <Background color="rgba(255,255,255,0.06)" gap={18} />
            <Controls showInteractive={false} className="!bg-white/5 !border-white/10" />
            <MiniMap pannable zoomable className="!bg-white/5" maskColor="rgba(0,0,0,0.6)" />
          </ReactFlow>

          {/* Legend — explains the edge vocabulary the enriched view adds. */}
          <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-[10px] text-white/60 space-y-1 pointer-events-none">
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t border-dashed" style={{ borderColor: 'rgba(245,158,11,0.7)' }} /> depende de</div>
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t border-dashed" style={{ borderColor: 'rgba(168,85,247,0.7)' }} /> relacionada</div>
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2" style={{ borderColor: '#22d3ee' }} /> handoff ativo</div>
          </div>
        </div>
      </div>
    </div>
  )
}
