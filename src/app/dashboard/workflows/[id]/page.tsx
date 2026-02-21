'use client'

// ─────────────────────────────────────────────────────────
// Flow Builder Page — Full-screen N8N-style visual builder
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, useRef, use } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Play, Power, PowerOff, Variable, History, Clock,
} from 'lucide-react'

import { FlowCustomNode } from '@/components/flows/flow-custom-node'
import { FlowCustomEdge } from '@/components/flows/flow-custom-edge'
import { NodePalette, NODE_CATALOG, type NodeTypeInfo } from '@/components/flows/node-palette'
import { NodeConfigPanel } from '@/components/flows/node-config-panel'
import { FlowVariablesPanel } from '@/components/flows/flow-variables-panel'
import { ExecutionHistoryPanel } from '@/components/flows/execution-history-panel'

// ── Custom node/edge types ─────────────────────────────────
const nodeTypes = { flowNode: FlowCustomNode }
const edgeTypes = { flowEdge: FlowCustomEdge }

// ── Config fields lookup by nodeType ───────────────────────
const CONFIG_FIELDS: Record<string, any[]> = {}

async function loadConfigFields() {
  try {
    const res = await fetch('/api/flows/nodes')
    const { data } = await res.json()
    if (data?.catalog) {
      for (const category of Object.values(data.catalog) as any[]) {
        for (const node of category) {
          CONFIG_FIELDS[node.type] = node.configFields || []
        }
      }
    }
  } catch {
    // Fallback: no config fields
  }
}

// ── Helper: create a React Flow node from a NodeTypeInfo ───
function createFlowNode(nodeInfo: NodeTypeInfo, position: { x: number; y: number }): Node {
  const id = `${nodeInfo.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    type: 'flowNode',
    position,
    data: {
      label: nodeInfo.label,
      nodeType: nodeInfo.type,
      category: nodeInfo.category,
      icon: nodeInfo.icon,
      config: {},
      outputs: nodeInfo.outputs || [{ name: 'main' }],
      inputs: nodeInfo.inputs || (nodeInfo.category === 'trigger' ? [] : [{ name: 'main' }]),
    },
  }
}

// ── Main builder component ──────────────────────────────────

function FlowBuilderInner({ flowId }: { flowId: string }) {
  const router = useRouter()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

  // Flow metadata
  const [flowName, setFlowName] = useState('')
  const [flowDescription, setFlowDescription] = useState('')
  const [flowStatus, setFlowStatus] = useState('draft')
  const [isEditingName, setIsEditingName] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)

  // Variables & versioning panel state
  const [flowVariables, setFlowVariables] = useState<Record<string, any>>({})
  const [showVariablesPanel, setShowVariablesPanel] = useState(false)
  const [flowVersion, setFlowVersion] = useState(1)
  const [flowCronExpression, setFlowCronExpression] = useState('')
  const [flowTriggerType, setFlowTriggerType] = useState('manual')
  const [showHistory, setShowHistory] = useState(false)

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Config panel state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  // ── Load flow data ──────────────────────────────────────
  useEffect(() => {
    loadConfigFields()

    if (flowId === 'new') {
      setFlowName('Novo Workflow')
      setFlowDescription('')
      setLoading(false)
      return
    }

    async function load() {
      try {
        const res = await fetch(`/api/flows/${flowId}`)
        const { data, error } = await res.json()
        if (error) throw new Error(error)

        setFlowName(data.name)
        setFlowDescription(data.description || '')
        setFlowStatus(data.status)
        setFlowVariables(data.variables || {})
        setFlowVersion(data.version || 1)
        setFlowTriggerType(data.triggerType || 'manual')
        setFlowCronExpression(data.cronExpression || '')

        // Convert stored FlowNodes → React Flow nodes
        const rfNodes: Node[] = (data.nodes || []).map((n: any) => ({
          id: n.id,
          type: 'flowNode',
          position: n.position,
          data: {
            label: n.data.label,
            nodeType: n.type,
            category: n.type.split('_')[0],
            icon: getIconForType(n.type),
            config: n.data.config || {},
            outputs: getOutputsForType(n.type),
            inputs: getInputsForType(n.type),
          },
        }))

        const rfEdges: Edge[] = (data.edges || []).map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          type: 'flowEdge',
          data: { onDelete: handleDeleteEdge },
          label: e.label,
        }))

        setNodes(rfNodes)
        setEdges(rfEdges)
      } catch (error: any) {
        toast.error('Erro ao carregar flow: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId])

  // ── Save flow ───────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const flowNodes = nodes.map(n => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        data: { label: n.data.label, config: n.data.config || {} },
      }))

      const flowEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        label: e.label,
      }))

      const triggerNode = nodes.find(n => (n.data as any).category === 'trigger')
      const triggerType = triggerNode
        ? (triggerNode.data as any).nodeType.replace('trigger_', '')
        : 'manual'

      const payload = {
        name: flowName, description: flowDescription,
        nodes: flowNodes, edges: flowEdges, triggerType,
        variables: flowVariables,
        ...(triggerType === 'cron' && flowCronExpression ? { cronExpression: flowCronExpression } : {}),
      }

      if (flowId === 'new') {
        const res = await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const { data, error } = await res.json()
        if (error) throw new Error(error)
        toast.success('Workflow criado!')
        router.push(`/dashboard/workflows/${data.id}`)
      } else {
        const res = await fetch(`/api/flows/${flowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const { error } = await res.json()
        if (error) throw new Error(error)
        toast.success('Workflow salvo!')
      }
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }, [nodes, edges, flowName, flowDescription, flowId, router])

  // ── Execute flow ────────────────────────────────────────
  const handleExecute = useCallback(async () => {
    if (flowId === 'new') { toast.error('Salve o workflow antes de executar'); return }
    setExecuting(true)
    try {
      const res = await fetch(`/api/flows/${flowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerData: {} }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)

      if (data.status === 'success') toast.success(`Executado com sucesso! (${data.duration}ms)`)
      else if (data.status === 'failed') toast.error(`Execução falhou: ${data.error}`)
      else toast.info('Execução em andamento...')

      if (data.nodeResults) {
        setNodes(nds => nds.map(n => ({
          ...n,
          data: { ...n.data, executionStatus: data.nodeResults[n.id]?.status || undefined },
        })))

        setTimeout(() => {
          setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, executionStatus: undefined } })))
        }, 5000)
      }
    } catch (error: any) {
      toast.error('Erro ao executar: ' + error.message)
    } finally {
      setExecuting(false)
    }
  }, [flowId, setNodes])

  // ── Toggle status ───────────────────────────────────────
  const handleToggleStatus = useCallback(async () => {
    if (flowId === 'new') return
    const newStatus = flowStatus === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      setFlowStatus(newStatus)
      toast.success(newStatus === 'active' ? 'Workflow ativado!' : 'Workflow desativado')
    } catch (error: any) {
      toast.error('Erro: ' + error.message)
    }
  }, [flowId, flowStatus])

  // ── Callbacks ───────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'flowEdge', data: { onDelete: handleDeleteEdge } }, eds))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setEdges]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => { setSelectedNodeId(null) }, [])

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId))
  }, [setEdges])

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId))
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
    setSelectedNodeId(null)
  }, [setNodes, setEdges])

  const handleNodeConfigUpdate = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, config } } : n))
  }, [setNodes])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeData = event.dataTransfer.getData('application/reactflow-node')
      if (!nodeData) return
      const nodeInfo: NodeTypeInfo = JSON.parse(nodeData)
      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX, y: event.clientY,
      }) || { x: 250, y: 250 }
      const newNode = createFlowNode(nodeInfo, position)
      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance, setNodes]
  )

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-white/50">Carregando workflow...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* ── Top toolbar ──────────────────────────────────── */}
      <div className="h-14 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/workflows')} className="text-white/60 hover:text-white h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditingName ? (
            <Input autoFocus value={flowName} onChange={(e) => setFlowName(e.target.value)}
              onBlur={() => setIsEditingName(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="h-7 text-sm bg-white/5 border-white/20 text-white max-w-[300px]"
            />
          ) : (
            <button onClick={() => setIsEditingName(true)} className="text-sm font-medium text-white hover:text-white/80 truncate max-w-[300px]">
              {flowName || 'Sem nome'}
            </button>
          )}
          <Badge className={`text-[10px] px-1.5 py-0 ${flowStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            flowStatus === 'draft' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
              'bg-white/10 text-white/50 border-white/20'
            }`}>
            {flowStatus === 'active' ? 'Ativo' : flowStatus === 'draft' ? 'Rascunho' : 'Inativo'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 font-mono">v{flowVersion}</span>
          <Button variant="ghost" size="sm" onClick={() => setShowVariablesPanel(v => !v)}
            className={`h-8 text-xs ${showVariablesPanel ? 'text-violet-400' : 'text-white/50 hover:text-white'}`}>
            <Variable className="h-3.5 w-3.5 mr-1.5" />
            Variáveis
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(v => !v)} disabled={flowId === 'new'}
            className={`h-8 text-xs ${showHistory ? 'text-blue-400' : 'text-white/50 hover:text-white'}`}>
            <History className="h-3.5 w-3.5 mr-1.5" />
            Histórico
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToggleStatus} disabled={flowId === 'new'}
            className={`h-8 text-xs ${flowStatus === 'active' ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/50 hover:text-white'}`}>
            {flowStatus === 'active' ? <PowerOff className="h-3.5 w-3.5 mr-1.5" /> : <Power className="h-3.5 w-3.5 mr-1.5" />}
            {flowStatus === 'active' ? 'Desativar' : 'Ativar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExecute} disabled={executing || flowId === 'new'}
            className="h-8 text-xs text-blue-400 hover:text-blue-300">
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {executing ? 'Executando...' : 'Executar'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[240px] flex-shrink-0">
          <NodePalette />
        </div>

        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodeClick={onNodeClick} onPaneClick={onPaneClick}
            onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'flowEdge', data: { onDelete: handleDeleteEdge } }}
            fitView proOptions={{ hideAttribution: true }}
            className="bg-slate-950" style={{ backgroundColor: '#020617' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148, 163, 184, 0.1)" />
            <Controls className="!bg-slate-800/80 !border-white/10 !shadow-xl [&>button]:!bg-slate-800 [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-slate-700" position="bottom-right" />
            <MiniMap
              nodeColor={(n) => {
                const cat = n.data?.category
                if (cat === 'trigger') return '#34d399'
                if (cat === 'action') return '#60a5fa'
                if (cat === 'logic') return '#fbbf24'
                if (cat === 'transform') return '#a78bfa'
                return '#64748b'
              }}
              maskColor="rgba(0, 0, 0, 0.7)"
              className="!bg-slate-900/80 !border-white/10"
              position="bottom-left"
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-32 text-center animate-fade-in-up">
                  <div className="text-white/20 text-lg font-medium mb-2">
                    Arraste um nó da paleta para começar
                  </div>
                  <div className="text-white/10 text-sm">
                    ou clique com botão direito no canvas
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="w-[280px] flex-shrink-0">
            <NodeConfigPanel
              nodeId={selectedNode.id} nodeLabel={(selectedNode.data as any).label}
              nodeType={(selectedNode.data as any).nodeType} category={(selectedNode.data as any).category}
              config={(selectedNode.data as any).config || {}}
              configFields={CONFIG_FIELDS[(selectedNode.data as any).nodeType] || []}
              onUpdate={handleNodeConfigUpdate} onDelete={handleDeleteNode}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>
        )}
      </div>

      {/* ── Variables Panel ─────────────────────────────── */}
      {showVariablesPanel && (
        <FlowVariablesPanel
          variables={flowVariables}
          onUpdate={(vars) => {
            setFlowVariables(vars)
            setShowVariablesPanel(false)
          }}
          onClose={() => setShowVariablesPanel(false)}
        />
      )}

      {/* ── Execution History ─────────────────────────────── */}
      {showHistory && flowId !== 'new' && (
        <ExecutionHistoryPanel
          flowId={flowId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────
function getIconForType(type: string): string {
  return NODE_CATALOG.find(n => n.type === type)?.icon || 'Zap'
}
function getOutputsForType(type: string) {
  return NODE_CATALOG.find(n => n.type === type)?.outputs || [{ name: 'main' }]
}
function getInputsForType(type: string) {
  return NODE_CATALOG.find(n => n.type === type)?.inputs || [{ name: 'main' }]
}

// ── Page wrapper ─────────────────────────────────────────
export default function FlowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <ReactFlowProvider>
      <FlowBuilderInner flowId={id} />
    </ReactFlowProvider>
  )
}
