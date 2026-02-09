'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Zap,
  MessageCircle,
  Send,
  Database,
  Webhook,
  Clock,
  Filter,
  GitBranch,
  Plus,
  Trash2,
  Settings
} from 'lucide-react'

interface NodeData {
  id: string
  type: 'trigger' | 'action' | 'condition'
  label: string
  icon: string
  position: { x: number; y: number }
  config: any
}

interface Connection {
  from: string
  to: string
}

interface WorkflowCanvasProps {
  initialNodes?: NodeData[]
  initialConnections?: Connection[]
  onChange?: (nodes: NodeData[], connections: Connection[]) => void
}

const NODE_TYPES = {
  trigger: [
    { id: 'webhook', label: 'Webhook', icon: 'webhook' },
    { id: 'schedule', label: 'Agendamento', icon: 'clock' },
    { id: 'new_message', label: 'Nova Mensagem', icon: 'message' },
    { id: 'new_lead', label: 'Novo Lead', icon: 'database' },
  ],
  action: [
    { id: 'send_message', label: 'Enviar Mensagem', icon: 'send' },
    { id: 'call_api', label: 'Chamar API', icon: 'webhook' },
    { id: 'update_lead', label: 'Atualizar Lead', icon: 'database' },
    { id: 'ai_agent', label: 'Agente IA', icon: 'zap' },
  ],
  condition: [
    { id: 'if_then', label: 'Se/Então', icon: 'filter' },
    { id: 'switch', label: 'Switch', icon: 'git-branch' },
  ]
}

const iconMap: { [key: string]: any } = {
  webhook: Webhook,
  clock: Clock,
  message: MessageCircle,
  database: Database,
  send: Send,
  zap: Zap,
  filter: Filter,
  'git-branch': GitBranch,
}

export function WorkflowCanvas({ initialNodes = [], initialConnections = [], onChange }: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<NodeData[]>(initialNodes)
  const [connections, setConnections] = useState<Connection[]>(initialConnections)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showNodeMenu, setShowNodeMenu] = useState<boolean>(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (onChange) {
      onChange(nodes, connections)
    }
  }, [nodes, connections])

  const addNode = useCallback((type: 'trigger' | 'action' | 'condition', nodeType: any) => {
    const newNode: NodeData = {
      id: `node-${Date.now()}`,
      type,
      label: nodeType.label,
      icon: nodeType.icon,
      position: { x: menuPosition.x - 100, y: menuPosition.y - 50 },
      config: {}
    }
    setNodes([...nodes, newNode])
    setShowNodeMenu(false)
  }, [nodes, menuPosition])

  const handleNodeDragStart = (nodeId: string) => {
    setDraggingNode(nodeId)
  }

  const handleNodeDrag = (e: React.MouseEvent, nodeId: string) => {
    if (draggingNode !== nodeId) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setNodes(nodes.map(node =>
      node.id === nodeId
        ? { ...node, position: { x, y } }
        : node
    ))
  }

  const handleNodeDragEnd = () => {
    setDraggingNode(null)
  }

  const handleConnectStart = (nodeId: string) => {
    setConnectingFrom(nodeId)
  }

  const handleConnectEnd = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) {
      const newConnection: Connection = {
        from: connectingFrom,
        to: nodeId
      }
      setConnections([...connections, newConnection])
    }
    setConnectingFrom(null)
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId))
    setConnections(connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId))
    setSelectedNode(null)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedNode(null)
    }
  }

  const handleCanvasRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    setMenuPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setShowNodeMenu(true)
  }

  const renderConnection = (conn: Connection) => {
    const fromNode = nodes.find(n => n.id === conn.from)
    const toNode = nodes.find(n => n.id === conn.to)

    if (!fromNode || !toNode) return null

    const startX = fromNode.position.x + 100
    const startY = fromNode.position.y + 50
    const endX = toNode.position.x + 100
    const endY = toNode.position.y + 50

    const midX = (startX + endX) / 2
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`

    return (
      <path
        key={`${conn.from}-${conn.to}`}
        d={path}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="2"
        fill="none"
        className="hover:stroke-blue-400 transition-colors cursor-pointer"
      />
    )
  }

  const renderNode = (node: NodeData) => {
    const Icon = iconMap[node.icon] || Zap

    return (
      <div
        key={node.id}
        className={`absolute cursor-move transition-all ${
          selectedNode === node.id ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/50' : ''
        } ${
          draggingNode === node.id ? 'opacity-70 scale-105' : ''
        }`}
        style={{
          left: `${node.position.x}px`,
          top: `${node.position.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleNodeDragStart(node.id)
          setSelectedNode(node.id)
        }}
        onMouseMove={(e) => handleNodeDrag(e, node.id)}
        onMouseUp={handleNodeDragEnd}
      >
        <Card className={`w-48 glass-card p-4 ${
          node.type === 'trigger' ? 'border-green-500/50' :
          node.type === 'action' ? 'border-blue-500/50' :
          'border-yellow-500/50'
        } border-2 hover:shadow-lg transition-shadow`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              node.type === 'trigger' ? 'bg-green-500/20' :
              node.type === 'action' ? 'bg-blue-500/20' :
              'bg-yellow-500/20'
            }`}>
              <Icon className={`h-4 w-4 ${
                node.type === 'trigger' ? 'text-green-400' :
                node.type === 'action' ? 'text-blue-400' :
                'text-yellow-400'
              }`} />
            </div>
            <span className="text-white font-medium text-sm">{node.label}</span>
          </div>

          <div className="flex items-center gap-1 mt-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                handleConnectStart(node.id)
              }}
            >
              Conectar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteNode(node.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {connectingFrom === node.id && (
            <div className="absolute inset-0 border-2 border-blue-500 rounded-lg animate-pulse" />
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[600px] bg-white/5 rounded-lg overflow-hidden">
      <div
        ref={canvasRef}
        className="relative w-full h-full"
        onClick={handleCanvasClick}
        onContextMenu={handleCanvasRightClick}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map(renderConnection)}
        </svg>

        {nodes.map(renderNode)}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/60 mb-4">Clique com o botão direito para adicionar um nó</p>
              <p className="text-white/40 text-sm">ou arraste para organizar o workflow</p>
            </div>
          </div>
        )}
      </div>

      {showNodeMenu && (
        <div
          className="absolute z-50 bg-gray-900 border border-white/20 rounded-lg shadow-xl p-2 min-w-[200px]"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`
          }}
        >
          <div className="space-y-2">
            <div>
              <p className="text-xs text-white/60 px-2 py-1 font-semibold">Triggers</p>
              {NODE_TYPES.trigger.map(nodeType => (
                <button
                  key={nodeType.id}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
                  onClick={() => addNode('trigger', nodeType)}
                >
                  {React.createElement(iconMap[nodeType.icon] || Zap, { className: 'h-4 w-4 text-green-400' })}
                  {nodeType.label}
                </button>
              ))}
            </div>

            <div className="border-t border-white/20 pt-2">
              <p className="text-xs text-white/60 px-2 py-1 font-semibold">Actions</p>
              {NODE_TYPES.action.map(nodeType => (
                <button
                  key={nodeType.id}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
                  onClick={() => addNode('action', nodeType)}
                >
                  {React.createElement(iconMap[nodeType.icon] || Zap, { className: 'h-4 w-4 text-blue-400' })}
                  {nodeType.label}
                </button>
              ))}
            </div>

            <div className="border-t border-white/20 pt-2">
              <p className="text-xs text-white/60 px-2 py-1 font-semibold">Conditions</p>
              {NODE_TYPES.condition.map(nodeType => (
                <button
                  key={nodeType.id}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
                  onClick={() => addNode('condition', nodeType)}
                >
                  {React.createElement(iconMap[nodeType.icon] || Zap, { className: 'h-4 w-4 text-yellow-400' })}
                  {nodeType.label}
                </button>
              ))}
            </div>

            <div className="border-t border-white/20 pt-2">
              <button
                className="w-full text-left px-3 py-2 text-sm text-white/60 hover:bg-white/10 rounded"
                onClick={() => setShowNodeMenu(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
