'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { Scissors, Settings2, GripVertical, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

export type TaskSplitterNodeData = {
    stepIndex: number
    splitterConfig: {
        taskPattern: string
        confirmationMode: 'auto' | 'manual'
        contextMode: 'isolated' | 'accumulated'
        maxTasksPerRun?: number
    }
    onUpdate?: (nodeId: string, field: string, value: any) => void
    onDelete?: (nodeId: string) => void
    onConfigure?: (nodeId: string) => void
}

const defaultConfig: TaskSplitterNodeData['splitterConfig'] = {
    taskPattern: '\\*\\*Task\\s+(WF-\\d+):\\*\\*',
    confirmationMode: 'auto',
    contextMode: 'isolated',
}

function TaskSplitterNodeComponent({ id, data, isConnectable, selected }: NodeProps) {
    const {
        stepIndex,
        splitterConfig = defaultConfig,
        onUpdate,
        onDelete,
        onConfigure,
    } = data as TaskSplitterNodeData

    const modeLabel = splitterConfig.confirmationMode === 'auto' ? 'Automático' : 'Manual'
    const contextLabel = splitterConfig.contextMode === 'isolated' ? 'Isolado' : 'Acumulado'

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`relative bg-gray-800/95 backdrop-blur-sm rounded-xl border-2 ${selected
                ? 'border-amber-500 shadow-amber-500/30 shadow-lg'
                : 'border-amber-500/30 hover:border-amber-500/60'
                } p-4 min-w-[260px] max-w-[300px] transition-colors group`}
        >
            {/* Drag Handle Indicator */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-60 transition-opacity">
                <GripVertical className="h-3 w-3 text-white/40" />
            </div>

            {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(id)
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
            >
                <Trash2 className="h-3 w-3 text-white" />
            </button>

            {/* Configure Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onConfigure?.(id)
                }}
                className="absolute -top-2 right-6 w-6 h-6 bg-amber-500/80 hover:bg-amber-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
            >
                <Settings2 className="h-3 w-3 text-white" />
            </button>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="!bg-amber-500 !w-3.5 !h-3.5 !border-2 !border-gray-900 !-left-[7px]"
            />

            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center border border-amber-500/50 relative">
                    <Scissors className="h-5 w-5 text-amber-400" />
                    <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-[9px] bg-amber-600 border-gray-900 border-2">
                        {stepIndex + 1}
                    </Badge>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-amber-300 text-sm">
                        Task Splitter
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">
                        Divide tasks e executa uma a uma
                    </p>
                </div>
            </div>

            {/* Config Summary */}
            <div className="flex gap-1.5 flex-wrap pl-[52px]">
                <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 border-amber-500/30 ${splitterConfig.confirmationMode === 'auto'
                            ? 'text-green-400 bg-green-500/10'
                            : 'text-blue-400 bg-blue-500/10'
                        }`}
                >
                    {modeLabel}
                </Badge>
                <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-white/50 border-white/10"
                >
                    {contextLabel}
                </Badge>
                {splitterConfig.maxTasksPerRun && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-white/50 border-white/10"
                    >
                        Max: {splitterConfig.maxTasksPerRun}
                    </Badge>
                )}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!bg-amber-500 !w-3.5 !h-3.5 !border-2 !border-gray-900 !-right-[7px]"
            />
        </motion.div>
    )
}

export const TaskSplitterNode = memo(TaskSplitterNodeComponent)
