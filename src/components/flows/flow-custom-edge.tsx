'use client'

// ─────────────────────────────────────────────────────────
// FlowCustomEdge — React Flow custom edge with delete button
// ─────────────────────────────────────────────────────────

import React from 'react'
import {
    BaseEdge,
    getBezierPath,
    EdgeLabelRenderer,
    type EdgeProps,
} from '@xyflow/react'
import { X } from 'lucide-react'

interface FlowEdgeData {
    onDelete?: (id: string) => void
}

export function FlowCustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    label,
    data,
}: EdgeProps & { data?: FlowEdgeData }) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    return (
        <>
            <BaseEdge
                path={edgePath}
                style={{
                    stroke: 'rgba(148, 163, 184, 0.4)',
                    strokeWidth: 2,
                    ...style,
                }}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan group"
                >
                    {/* Label */}
                    {label && (
                        <span className="text-[10px] text-white/40 bg-slate-900/80 px-1.5 py-0.5 rounded-md border border-white/10">
                            {label}
                        </span>
                    )}

                    {/* Delete button (shows on hover) */}
                    <button
                        className="
              absolute -top-3 -right-3
              hidden group-hover:flex
              items-center justify-center
              w-5 h-5 rounded-full
              bg-red-500/80 hover:bg-red-500
              text-white shadow-lg
              transition-all duration-150
            "
                        onClick={() => data?.onDelete?.(id)}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    )
}
