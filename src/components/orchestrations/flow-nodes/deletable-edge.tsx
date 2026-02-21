'use client'

import { memo } from 'react'
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    useReactFlow,
} from '@xyflow/react'
import { X } from 'lucide-react'

function DeletableEdgeComponent({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
}: EdgeProps) {
    const { setEdges } = useReactFlow()

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    const onEdgeDelete = (evt: React.MouseEvent) => {
        evt.stopPropagation()
        setEdges((eds) => eds.filter((e) => e.id !== id))
    }

    return (
        <>
            <BaseEdge path={edgePath} style={style} />
            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan group/edge"
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                >
                    <button
                        onClick={onEdgeDelete}
                        className="
                            w-6 h-6 rounded-full flex items-center justify-center
                            bg-gray-800/90 border border-white/20
                            opacity-0 group-hover/edge:opacity-100
                            hover:bg-red-500 hover:border-red-400
                            transition-all duration-150 shadow-lg
                            cursor-pointer
                        "
                        title="Excluir conexão"
                    >
                        <X className="h-3 w-3 text-white" />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    )
}

export const DeletableEdge = memo(DeletableEdgeComponent)
