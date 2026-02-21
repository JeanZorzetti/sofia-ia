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
  Settings,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { PredictiveNodeSuggestions } from '@/components/orchestrations/predictive/predictive-node-suggestions'
import { WorkflowNodeSuggestion } from '@/lib/ai/predictive-workflow'

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
  /** When provided, enables auto-save via PUT /api/workflows/[workflowId] after 1.5s debounce */
  workflowId?: string
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

/** Compose a unique string ID for a connection */
const connId = (conn: Connection) => `${conn.from}|${conn.to}`

export function PredictiveWorkflowBuilder({
  initialNodes = [],
  initialConnections = [],
  onChange,
  workflowId,
}: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<NodeData[]>(initialNodes)
  const [connections, setConnections] = useState<Connection[]>(initialConnections)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  /** Currently selected connection ID (format: "fromId|toId") */
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)
  const [showNodeMenu, setShowNodeMenu] = useState<boolean>(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [suggestions, setSuggestions] = useState<WorkflowNodeSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Notify parent whenever nodes or connections change
  useEffect(() => {
    if (onChange) {
      onChange(nodes, connections)
    }
  }, [nodes, connections])

  // Predictive suggestions
  useEffect(() => {
    if (nodes.length > 0) {
      setIsLoadingSuggestions(true)
      const timer = setTimeout(() => {
        setSuggestions([
          {
            nodeId: 'suggestion-1',
            type: 'action',
            label: 'Enviar Notificação',
            confidence: 0.85,
            metadata: {
              description: 'Envia uma notificação por email, SMS ou WhatsApp',
              example: 'Enviar mensagem de boas-vindas para o novo lead',
              successRate: 85
            }
          },
          {
            nodeId: 'suggestion-2',
            type: 'delay',
            label: 'Atraso Temporizado',
            confidence: 0.72,
            metadata: {
              description: 'Adiciona um intervalo de tempo antes da próxima ação',
              example: 'Aguardar 24 horas antes de enviar follow-up',
              successRate: 72
            }
          }
        ])
        setIsLoadingSuggestions(false)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
    }
  }, [nodes])

  // ── Auto-save (debounced, 1.5s) ────────────────────────────────────────────
  const scheduleAutoSave = useCallback(
    (updatedNodes: NodeData[], updatedConnections: Connection[]) => {
      if (!workflowId) return
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/workflows/${workflowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodes: updatedNodes,
              edges: updatedConnections.map(c => ({ from: c.from, to: c.to })),
            }),
          })
        } catch (err) {
          console.error('[PredictiveWorkflowBuilder] Auto-save failed:', err)
        }
      }, 1500)
    },
    [workflowId]
  )

  // ── Keyboard: Delete / Backspace removes the selected connection ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (!selectedConnection) return

      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return

      e.preventDefault()

      const [from, to] = selectedConnection.split('|')
      const updated = connections.filter(c => !(c.from === from && c.to === to))
      setConnections(updated)
      setSelectedConnection(null)
      toast.success('Conexão removida')
      scheduleAutoSave(nodes, updated)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedConnection, connections, nodes, scheduleAutoSave])

  // ── Cleanup auto-save timer on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  // ── Node management ────────────────────────────────────────────────────────
  const addNode = useCallback(
    (type: 'trigger' | 'action' | 'condition', nodeType: any) => {
      const newNode: NodeData = {
        id: `node-${Date.now()}`,
        type,
        label: nodeType.label,
        icon: nodeType.icon,
        position: { x: menuPosition.x - 100, y: menuPosition.y - 50 },
        config: {},
      }
      setNodes([...nodes, newNode])
      setShowNodeMenu(false)
    },
    [nodes, menuPosition]
  )

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
    setNodes(nodes.map(node => (node.id === nodeId ? { ...node, position: { x, y } } : node)))
  }

  const handleNodeDragEnd = () => {
    setDraggingNode(null)
  }

  const handleConnectStart = (nodeId: string) => {
    setConnectingFrom(nodeId)
  }

  const handleConnectEnd = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) {
      const newConnection: Connection = { from: connectingFrom, to: nodeId }
      setConnections([...connections, newConnection])
    }
    setConnectingFrom(null)
  }

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = nodes.filter(node => node.id !== nodeId)
    const updatedConnections = connections.filter(c => c.from !== nodeId && c.to !== nodeId)
    setNodes(updatedNodes)
    setConnections(updatedConnections)
    setSelectedNode(null)
    if (selectedConnection) {
      const [from, to] = selectedConnection.split('|')
      if (from === nodeId || to === nodeId) setSelectedConnection(null)
    }
  }

  // ── Connection management ──────────────────────────────────────────────────
  const handleDeleteConnection = useCallback(
    (id: string) => {
      const [from, to] = id.split('|')
      const updated = connections.filter(c => !(c.from === from && c.to === to))
      setConnections(updated)
      setSelectedConnection(null)
      toast.success('Conexão removida')
      scheduleAutoSave(nodes, updated)
    },
    [connections, nodes, scheduleAutoSave]
  )

  // ── Canvas event handlers ──────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedNode(null)
      setSelectedConnection(null)
      setShowNodeMenu(false)
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

  const handleSuggestionSelect = (suggestion: WorkflowNodeSuggestion) => {
    const newNode: NodeData = {
      id: `node-${Date.now()}`,
      type: suggestion.type === 'condition' ? 'condition' : 'action',
      label: suggestion.label,
      icon:
        suggestion.type === 'notification'
          ? 'send'
          : suggestion.type === 'delay'
          ? 'clock'
          : suggestion.type === 'data_update'
          ? 'database'
          : suggestion.type === 'integration'
          ? 'webhook'
          : 'zap',
      position: { x: 200, y: 200 },
      config: {},
    }
    setNodes([...nodes, newNode])
    setSuggestions([])
  }

  // ── Renderers ──────────────────────────────────────────────────────────────
  const renderConnection = (conn: Connection) => {
    const fromNode = nodes.find(n => n.id === conn.from)
    const toNode = nodes.find(n => n.id === conn.to)
    if (!fromNode || !toNode) return null

    const startX = fromNode.position.x + 100
    const startY = fromNode.position.y + 50
    const endX = toNode.position.x + 100
    const endY = toNode.position.y + 50

    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`

    const id = connId(conn)
    const isSelected = selectedConnection === id

    return (
      <g
        key={id}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedConnection(isSelected ? null : id)
          setSelectedNode(null)
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* Wide transparent hit-area for easier clicking */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth="16"
          fill="none"
          style={{ pointerEvents: 'stroke' }}
        />

        {/* Visible path */}
        <path
          d={path}
          stroke={isSelected ? '#ef4444' : 'rgba(255, 255, 255, 0.3)'}
          strokeWidth={isSelected ? 3 : 2}
          fill="none"
          style={{ pointerEvents: 'none' }}
          className={isSelected ? '' : 'transition-[stroke] duration-150'}
        />

        {/* Arrow tip */}
        <circle
          cx={endX}
          cy={endY}
          r={3}
          fill={isSelected ? '#ef4444' : 'rgba(255,255,255,0.5)'}
          style={{ pointerEvents: 'none' }}
        />

        {/* Delete button at bezier midpoint */}
        {isSelected && (
          <g
            transform={`translate(${midX}, ${midY})`}
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteConnection(id)
            }}
            style={{ cursor: 'pointer' }}
            aria-label="Remover conexão"
          >
            <circle r="11" fill="#ef4444" />
            <line x1="-5" y1="-5" x2="5" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="-5" x2="-5" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
      </g>
    )
  }

  const renderNode = (node: NodeData) => {
    const Icon = iconMap[node.icon] || Zap

    return (
      <div
        key={node.id}
        className={`absolute cursor-move transition-all ${
          selectedNode === node.id ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/50' : ''
        } ${draggingNode === node.id ? 'opacity-70 scale-105' : ''}`}
        style={{
          left: `${node.position.x}px`,
          top: `${node.position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleNodeDragStart(node.id)
          setSelectedNode(node.id)
          setSelectedConnection(null)
        }}
        onMouseMove={(e) => handleNodeDrag(e, node.id)}
        onMouseUp={handleNodeDragEnd}
      >
        <Card
          className={`w-48 glass-card p-4 ${
            node.type === 'trigger'
              ? 'border-green-500/50'
              : node.type === 'action'
              ? 'border-blue-500/50'
              : 'border-yellow-500/50'
          } border-2 hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`p-2 rounded-lg ${
                node.type === 'trigger'
                  ? 'bg-green-500/20'
                  : node.type === 'action'
                  ? 'bg-blue-500/20'
                  : 'bg-yellow-500/20'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  node.type === 'trigger'
                    ? 'text-green-400'
                    : node.type === 'action'
                    ? 'text-blue-400'
                    : 'text-yellow-400'
                }`}
              />
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
                handleConnectEnd(node.id)
              }}
            >
              ✓
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <Card className="glass-card lg:col-span-3 h-[600px] bg-white/5 rounded-lg overflow-hidden relative">
        <div
          ref={canvasRef}
          className="relative w-full h-full"
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasRightClick}
        >
          {/* SVG layer — pointer events enabled so edges are clickable */}
          <svg className="absolute inset-0 w-full h-full">
            {connections.map(renderConnection)}
          </svg>

          {nodes.map(renderNode)}

          {/* Hint banner when a connection is selected */}
          {selectedConnection && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-red-500/90 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none select-none">
              Conexão selecionada — pressione <kbd className="font-bold">Delete</kbd> ou clique em ✕ para remover
            </div>
          )}

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
              top: `${menuPosition.y}px`,
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
                    {React.createElement(iconMap[nodeType.icon] || Zap, {
                      className: 'h-4 w-4 text-green-400',
                    })}
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
                    {React.createElement(iconMap[nodeType.icon] || Zap, {
                      className: 'h-4 w-4 text-blue-400',
                    })}
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
                    {React.createElement(iconMap[nodeType.icon] || Zap, {
                      className: 'h-4 w-4 text-yellow-400',
                    })}
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
      </Card>

      <Card className="glass-card lg:col-span-1 h-[600px] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center mb-4">
            <Sparkles className="h-5 w-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Sugestões Inteligentes</h3>
          </div>
          <PredictiveNodeSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            isLoading={isLoadingSuggestions}
          />
        </div>
      </Card>
    </div>
  )
}
