'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { User, Trash2, GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'

export type EditableAgentNodeData = {
    role: string
    agentId: string
    agentName: string
    stepIndex: number
    agents: { id: string; name: string }[]
    onUpdate?: (nodeId: string, field: string, value: string) => void
    onDelete?: (nodeId: string) => void
}

function EditableAgentNodeComponent({ id, data, isConnectable, selected }: NodeProps) {
    const {
        role,
        agentId,
        agentName,
        stepIndex,
        agents = [],
        onUpdate,
        onDelete
    } = data as EditableAgentNodeData

    const [editingRole, setEditingRole] = useState(false)
    const [roleValue, setRoleValue] = useState(role)
    const roleInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (editingRole && roleInputRef.current) {
            roleInputRef.current.focus()
            roleInputRef.current.select()
        }
    }, [editingRole])

    const handleRoleSave = () => {
        setEditingRole(false)
        if (roleValue.trim() && roleValue !== role) {
            onUpdate?.(id, 'role', roleValue.trim())
        } else {
            setRoleValue(role)
        }
    }

    const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate?.(id, 'agentId', e.target.value)
    }

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`relative bg-gray-800/95 backdrop-blur-sm rounded-xl border-2 ${selected ? 'border-blue-500 shadow-blue-500/30 shadow-lg' : 'border-white/20 hover:border-white/40'
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

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="!bg-blue-500 !w-3.5 !h-3.5 !border-2 !border-gray-900 !-left-[7px]"
            />

            {/* Step Badge + Agent Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-blue-500/50 relative">
                    <User className="h-5 w-5 text-blue-400" />
                    <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-[9px] bg-blue-600 border-gray-900 border-2">
                        {stepIndex + 1}
                    </Badge>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Editable Role */}
                    {editingRole ? (
                        <input
                            ref={roleInputRef}
                            type="text"
                            value={roleValue}
                            onChange={(e) => setRoleValue(e.target.value)}
                            onBlur={handleRoleSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRoleSave()
                                if (e.key === 'Escape') {
                                    setRoleValue(role)
                                    setEditingRole(false)
                                }
                            }}
                            className="bg-white/10 border border-blue-500/50 rounded px-2 py-0.5 text-white text-sm font-semibold w-full outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    ) : (
                        <h3
                            className="font-semibold text-white text-sm truncate cursor-pointer hover:text-blue-300 transition-colors"
                            onClick={() => setEditingRole(true)}
                            title="Clique para editar o papel"
                        >
                            {role || 'Clique para definir...'}
                        </h3>
                    )}

                    {/* Agent Selector */}
                    <select
                        value={agentId}
                        onChange={handleAgentChange}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded text-xs text-white/70 px-1.5 py-1 outline-none cursor-pointer hover:border-white/30 focus:border-blue-500 transition-colors appearance-none"
                    >
                        <option value="" className="bg-gray-900">Selecione um agente...</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id} className="bg-gray-900">
                                {agent.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Agent Name Display */}
            <div className="text-xs text-white/40 truncate pl-[52px]">
                {agentName || 'Nenhum agente selecionado'}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!bg-green-500 !w-3.5 !h-3.5 !border-2 !border-gray-900 !-right-[7px]"
            />
        </motion.div>
    )
}

export const EditableAgentNode = memo(EditableAgentNodeComponent)
