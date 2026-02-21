'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Loader2, XCircle, User } from 'lucide-react'
import { motion } from 'framer-motion'

export type AgentNodeData = {
  role: string
  agentName: string
  status?: 'idle' | 'running' | 'completed' | 'error'
  output?: string
  durationMs?: number
  tokensUsed?: number
}

function AgentNodeComponent({ data, isConnectable }: NodeProps) {
  const { role, agentName, status = 'idle', output, durationMs, tokensUsed } = data as AgentNodeData

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Circle className="h-5 w-5 text-white/20" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-500 shadow-green-500/50'
      case 'running':
        return 'border-blue-500 shadow-blue-500/50 animate-pulse'
      case 'error':
        return 'border-red-500 shadow-red-500/50'
      default:
        return 'border-white/20'
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-gray-800/90 backdrop-blur-sm rounded-lg border-2 ${getStatusColor()} p-4 min-w-[220px] shadow-lg`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Node Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
          <User className="h-5 w-5 text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white text-sm truncate">{role}</h3>
            {getStatusIcon()}
          </div>
          <p className="text-xs text-white/60 truncate">{agentName}</p>
        </div>
      </div>

      {/* Metrics */}
      {(durationMs !== undefined || tokensUsed !== undefined) && (
        <div className="flex gap-2 mb-2">
          {durationMs !== undefined && (
            <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/60">
              {formatDuration(durationMs)}
            </Badge>
          )}
          {tokensUsed !== undefined && tokensUsed > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-300">
              {tokensUsed} tokens
            </Badge>
          )}
        </div>
      )}

      {/* Output Preview */}
      {status === 'completed' && output && (
        <div className="mt-2 p-2 rounded bg-black/20 border border-white/10">
          <p className="text-[10px] text-white/40 mb-1">Output:</p>
          <p className="text-xs text-white/80 line-clamp-2">{output}</p>
        </div>
      )}

      {/* Running Indicator */}
      {status === 'running' && (
        <div className="mt-2">
          <motion.p
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs text-blue-300"
          >
            Processando...
          </motion.p>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />
    </motion.div>
  )
}

export const AgentNode = memo(AgentNodeComponent)
