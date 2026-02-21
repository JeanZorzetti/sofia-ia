'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    Connection,
    addEdge,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    ReactFlowProvider,
    useReactFlow,
    Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EditableAgentNode, EditableAgentNodeData } from './flow-nodes/editable-agent-node'
import { TaskSplitterNode, TaskSplitterNodeData } from './flow-nodes/task-splitter-node'
import { TaskSplitterConfigPanel } from './flow-nodes/task-splitter-config-panel'
import { DeletableEdge } from './flow-nodes/deletable-edge'
import { ContextMenu, ContextMenuItem } from './flow-nodes/context-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, LayoutGrid, Undo2, AlertCircle, Trash2, Copy, Unlink, MousePointerClick, Edit3, Scissors } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Agent {
    id: string
    name: string
    description?: string | null
}

interface AgentStep {
    agentId: string
    role: string
    type?: 'agent' | 'task_splitter'
    splitterConfig?: {
        taskPattern: string
        confirmationMode: 'auto' | 'manual'
        contextMode: 'isolated' | 'accumulated'
        maxTasksPerRun?: number
    }
}

interface EditableFlowCanvasProps {
    steps: AgentStep[]
    agents: Agent[]
    strategy: string
    onSave: (steps: AgentStep[]) => void
    onCancel: () => void
    saving?: boolean
}

const nodeTypes = {
    editableAgentNode: EditableAgentNode,
    taskSplitterNode: TaskSplitterNode
}

const edgeTypes = {
    deletable: DeletableEdge
}

// Edge style for edit mode
const defaultEdgeStyle = {
    stroke: 'rgba(99, 102, 241, 0.6)',
    strokeWidth: 2
}

function EditableFlowCanvasInner({
    steps,
    agents,
    strategy,
    onSave,
    onCancel,
    saving = false
}: EditableFlowCanvasProps) {
    const reactFlowInstance = useReactFlow()
    const [hasChanges, setHasChanges] = useState(false)

    // Task Splitter config panel state
    const [splitterConfigNodeId, setSplitterConfigNodeId] = useState<string | null>(null)
    const splitterConfigVisible = splitterConfigNodeId !== null

    // Context menu state
    const [paneMenu, setPaneMenu] = useState<{ x: number; y: number } | null>(null)
    const [nodeMenu, setNodeMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
    const canvasRef = useRef<HTMLDivElement>(null)

    // Use refs for callbacks so they can be passed to nodes without TDZ issues
    const handleNodeUpdateRef = useRef<(nodeId: string, field: string, value: string) => void>(() => { })
    const handleNodeDeleteRef = useRef<(nodeId: string) => void>(() => { })

    // Generate agent name from ID
    const getAgentName = useCallback(
        (agentId: string) => agents.find(a => a.id === agentId)?.name || 'Agente Desconhecido',
        [agents]
    )

    // Stable wrappers that delegate to refs (these won't change identity)
    const stableOnUpdate = useCallback((nodeId: string, field: string, value: string) => {
        handleNodeUpdateRef.current(nodeId, field, value)
    }, [])

    const stableOnDelete = useCallback((nodeId: string) => {
        handleNodeDeleteRef.current(nodeId)
    }, [])

    const stableOnConfigure = useCallback((nodeId: string) => {
        setSplitterConfigNodeId(nodeId)
    }, [])

    const defaultSplitterConfig = {
        taskPattern: '\\*\\*Task\\s+(WF-\\d+):\\*\\*\\s*(.+)',
        confirmationMode: 'auto' as const,
        contextMode: 'isolated' as const,
    }

    // Convert steps to initial nodes (only called once for initial state)
    const createInitialNodes = (): Node[] => {
        return steps.map((step, index) => {
            if (step.type === 'task_splitter') {
                return {
                    id: `step-${index}`,
                    type: 'taskSplitterNode',
                    position: { x: index * 340, y: 150 },
                    data: {
                        stepIndex: index,
                        splitterConfig: step.splitterConfig || defaultSplitterConfig,
                        onUpdate: stableOnUpdate,
                        onDelete: stableOnDelete,
                        onConfigure: stableOnConfigure,
                    } as TaskSplitterNodeData
                }
            }
            return {
                id: `step-${index}`,
                type: 'editableAgentNode',
                position: { x: index * 340, y: 150 },
                data: {
                    role: step.role,
                    agentId: step.agentId,
                    agentName: getAgentName(step.agentId),
                    stepIndex: index,
                    agents: agents.map(a => ({ id: a.id, name: a.name })),
                    onUpdate: stableOnUpdate,
                    onDelete: stableOnDelete
                } as EditableAgentNodeData
            }
        })
    }

    // Convert steps to initial edges
    const createInitialEdges = (): Edge[] => {
        if (strategy === 'parallel' || steps.length <= 1) return []
        return steps.slice(0, -1).map((_, index) => ({
            id: `edge-${index}-${index + 1}`,
            source: `step-${index}`,
            target: `step-${index + 1}`,
            type: 'deletable',
            style: defaultEdgeStyle,
            animated: true
        }))
    }

    const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes())
    const [edges, setEdges, onEdgesChange] = useEdgesState(createInitialEdges())

    // Handle new connections
    const onConnect = useCallback(
        (connection: Connection) => {
            setEdges((eds) => addEdge({
                ...connection,
                type: 'deletable',
                style: defaultEdgeStyle,
                animated: true
            }, eds))
            setHasChanges(true)
        },
        [setEdges]
    )

    // Handle node data updates (role, agentId)
    const handleNodeUpdate = useCallback(
        (nodeId: string, field: string, value: string) => {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id !== nodeId) return node
                    const updatedData = { ...node.data } as any
                    updatedData[field] = value
                    if (field === 'agentId') {
                        updatedData.agentName = agents.find(a => a.id === value)?.name || 'Desconhecido'
                    }
                    return { ...node, data: updatedData }
                })
            )
            setHasChanges(true)
        },
        [setNodes, agents]
    )

    // Handle node deletion
    const handleNodeDelete = useCallback(
        (nodeId: string) => {
            setNodes((nds) => {
                const filtered = nds.filter((n) => n.id !== nodeId)
                return filtered.map((node, index) => ({
                    ...node,
                    data: { ...node.data, stepIndex: index }
                }))
            })
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
            setHasChanges(true)
        },
        [setNodes, setEdges]
    )

    // Keep refs in sync with latest callbacks
    useEffect(() => {
        handleNodeUpdateRef.current = handleNodeUpdate
    }, [handleNodeUpdate])

    useEffect(() => {
        handleNodeDeleteRef.current = handleNodeDelete
    }, [handleNodeDelete])

    // Add new node
    const addNode = useCallback((posX?: number, posY?: number) => {
        const currentNodes = reactFlowInstance.getNodes()
        const lastNode = currentNodes[currentNodes.length - 1]
        const newX = posX ?? (lastNode ? lastNode.position.x + 340 : 0)
        const newY = posY ?? (lastNode ? lastNode.position.y : 150)
        const newIndex = currentNodes.length

        const newNodeId = `step-${Date.now()}`
        const newNode: Node = {
            id: newNodeId,
            type: 'editableAgentNode',
            position: { x: newX, y: newY },
            data: {
                role: '',
                agentId: '',
                agentName: '',
                stepIndex: newIndex,
                agents: agents.map(a => ({ id: a.id, name: a.name })),
                onUpdate: stableOnUpdate,
                onDelete: stableOnDelete
            } as EditableAgentNodeData
        }

        setNodes((nds) => [...nds, newNode])

        // Auto-connect to last node if sequential
        if (strategy !== 'parallel' && lastNode) {
            const newEdge: Edge = {
                id: `edge-${lastNode.id}-${newNodeId}`,
                source: lastNode.id,
                target: newNodeId,
                type: 'deletable',
                style: defaultEdgeStyle,
                animated: true
            }
            setEdges((eds) => [...eds, newEdge])
        }

        setHasChanges(true)

        setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
        }, 100)
    }, [reactFlowInstance, agents, strategy, stableOnUpdate, stableOnDelete, setNodes, setEdges])

    // Add new Task Splitter node
    const addSplitterNode = useCallback((posX?: number, posY?: number) => {
        const currentNodes = reactFlowInstance.getNodes()
        const lastNode = currentNodes[currentNodes.length - 1]
        const newX = posX ?? (lastNode ? lastNode.position.x + 340 : 0)
        const newY = posY ?? (lastNode ? lastNode.position.y : 150)
        const newIndex = currentNodes.length

        const newNodeId = `step-${Date.now()}`
        const newNode: Node = {
            id: newNodeId,
            type: 'taskSplitterNode',
            position: { x: newX, y: newY },
            data: {
                stepIndex: newIndex,
                splitterConfig: { ...defaultSplitterConfig },
                onUpdate: stableOnUpdate,
                onDelete: stableOnDelete,
                onConfigure: stableOnConfigure,
            } as TaskSplitterNodeData
        }

        setNodes((nds) => [...nds, newNode])

        // Auto-connect to last node if sequential
        if (strategy !== 'parallel' && lastNode) {
            const newEdge: Edge = {
                id: `edge-${lastNode.id}-${newNodeId}`,
                source: lastNode.id,
                target: newNodeId,
                type: 'deletable',
                style: defaultEdgeStyle,
                animated: true
            }
            setEdges((eds) => [...eds, newEdge])
        }

        setHasChanges(true)

        setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
        }, 100)
    }, [reactFlowInstance, strategy, stableOnUpdate, stableOnDelete, stableOnConfigure, setNodes, setEdges])

    // Handle splitter config save
    const handleSplitterConfigSave = useCallback((config: any) => {
        if (!splitterConfigNodeId) return
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id !== splitterConfigNodeId) return node
                return {
                    ...node,
                    data: { ...node.data, splitterConfig: config }
                }
            })
        )
        setHasChanges(true)
    }, [splitterConfigNodeId, setNodes])

    // Duplicate a node
    const duplicateNode = useCallback((nodeId: string) => {
        const sourceNode = reactFlowInstance.getNodes().find(n => n.id === nodeId)
        if (!sourceNode) return

        const newNodeId = `step-${Date.now()}`
        const newNode: Node = {
            id: newNodeId,
            type: 'editableAgentNode',
            position: { x: sourceNode.position.x + 50, y: sourceNode.position.y + 80 },
            data: {
                ...(sourceNode.data as EditableAgentNodeData),
                stepIndex: reactFlowInstance.getNodes().length,
                onUpdate: stableOnUpdate,
                onDelete: stableOnDelete
            }
        }

        setNodes((nds) => [...nds, newNode])
        setHasChanges(true)
    }, [reactFlowInstance, stableOnUpdate, stableOnDelete, setNodes])

    // Disconnect all edges from a node
    const disconnectNode = useCallback((nodeId: string) => {
        setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
        setHasChanges(true)
    }, [setEdges])

    // Clear all edges
    const clearAllEdges = useCallback(() => {
        setEdges([])
        setHasChanges(true)
    }, [setEdges])

    // Select all nodes
    const selectAllNodes = useCallback(() => {
        setNodes((nds) => nds.map(n => ({ ...n, selected: true })))
    }, [setNodes])

    // Context Menu: Pane (background)
    const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
        event.preventDefault()
        setNodeMenu(null)
        const bounds = canvasRef.current?.getBoundingClientRect()
        if (bounds) {
            setPaneMenu({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
        }
    }, [])

    // Context Menu: Node
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault()
        setPaneMenu(null)
        const bounds = canvasRef.current?.getBoundingClientRect()
        if (bounds) {
            setNodeMenu({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, nodeId: node.id })
        }
    }, [])

    // Close all context menus on pane click
    const onPaneClick = useCallback(() => {
        setPaneMenu(null)
        setNodeMenu(null)
    }, [])

    // Auto-layout
    const autoLayout = useCallback(() => {
        setNodes((nds) => {
            if (strategy === 'parallel') {
                return nds.map((node, index) => ({
                    ...node,
                    position: { x: 150, y: index * 180 }
                }))
            }
            return nds.map((node, index) => ({
                ...node,
                position: { x: index * 340, y: 150 }
            }))
        })

        if (strategy !== 'parallel') {
            setEdges(() => {
                const currentNodes = reactFlowInstance.getNodes()
                return currentNodes.slice(0, -1).map((node, index) => ({
                    id: `edge-${node.id}-${currentNodes[index + 1].id}`,
                    source: node.id,
                    target: currentNodes[index + 1].id,
                    type: 'deletable',
                    style: defaultEdgeStyle,
                    animated: true
                }))
            })
        }

        setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
        }, 100)

        setHasChanges(true)
    }, [strategy, setNodes, setEdges, reactFlowInstance])

    // Build pane context menu items
    const paneMenuItems: ContextMenuItem[] = paneMenu ? [
        {
            label: 'Adicionar Agente',
            icon: <Plus className="h-3.5 w-3.5" />,
            onClick: () => {
                const screenPos = paneMenu
                const flowPos = reactFlowInstance.screenToFlowPosition({
                    x: screenPos.x + (canvasRef.current?.getBoundingClientRect().left || 0),
                    y: screenPos.y + (canvasRef.current?.getBoundingClientRect().top || 0)
                })
                addNode(flowPos.x, flowPos.y)
            }
        },
        {
            label: 'Adicionar Task Splitter',
            icon: <Scissors className="h-3.5 w-3.5" />,
            onClick: () => {
                const screenPos = paneMenu
                const flowPos = reactFlowInstance.screenToFlowPosition({
                    x: screenPos.x + (canvasRef.current?.getBoundingClientRect().left || 0),
                    y: screenPos.y + (canvasRef.current?.getBoundingClientRect().top || 0)
                })
                addSplitterNode(flowPos.x, flowPos.y)
            }
        },
        {
            label: 'Auto-Layout',
            icon: <LayoutGrid className="h-3.5 w-3.5" />,
            onClick: autoLayout
        },
        {
            label: 'Selecionar Tudo',
            icon: <MousePointerClick className="h-3.5 w-3.5" />,
            onClick: selectAllNodes
        },
        {
            label: 'Limpar Conexões',
            icon: <Unlink className="h-3.5 w-3.5" />,
            onClick: clearAllEdges,
            danger: true,
            divider: true
        }
    ] : []

    // Build node context menu items
    const nodeMenuItems: ContextMenuItem[] = nodeMenu ? [
        {
            label: 'Editar Papel',
            icon: <Edit3 className="h-3.5 w-3.5" />,
            onClick: () => {
                const nodeEl = document.querySelector(`[data-id="${nodeMenu.nodeId}"] h3`)
                if (nodeEl) (nodeEl as HTMLElement).click()
            }
        },
        {
            label: 'Duplicar',
            icon: <Copy className="h-3.5 w-3.5" />,
            onClick: () => duplicateNode(nodeMenu.nodeId)
        },
        {
            label: 'Desconectar',
            icon: <Unlink className="h-3.5 w-3.5" />,
            onClick: () => disconnectNode(nodeMenu.nodeId),
            divider: true
        },
        {
            label: 'Excluir',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: () => handleNodeDelete(nodeMenu.nodeId),
            danger: true,
            divider: true
        }
    ] : []


    // Save: convert nodes/edges back to AgentStep[]
    const handleSave = useCallback(() => {
        const currentNodes = reactFlowInstance.getNodes()
        const currentEdges = reactFlowInstance.getEdges()

        const adjacency = new Map<string, string>()
        currentEdges.forEach(e => {
            adjacency.set(e.source, e.target)
        })

        const targets = new Set(currentEdges.map(e => e.target))
        const startNodes = currentNodes.filter(n => !targets.has(n.id))

        const ordered: Node[] = []
        const visited = new Set<string>()

        const traverse = (nodeId: string) => {
            if (visited.has(nodeId)) return
            visited.add(nodeId)
            const node = currentNodes.find(n => n.id === nodeId)
            if (node) {
                ordered.push(node)
                const next = adjacency.get(nodeId)
                if (next) traverse(next)
            }
        }

        startNodes.forEach(n => traverse(n.id))

        currentNodes.forEach(n => {
            if (!visited.has(n.id)) {
                ordered.push(n)
            }
        })

        const newSteps: AgentStep[] = ordered.map(node => {
            if (node.type === 'taskSplitterNode') {
                return {
                    agentId: '',
                    role: 'Task Splitter',
                    type: 'task_splitter' as const,
                    splitterConfig: (node.data as any).splitterConfig || defaultSplitterConfig,
                }
            }
            return {
                agentId: (node.data as any).agentId || '',
                role: (node.data as any).role || '',
                type: 'agent' as const,
            }
        }).filter(step => step.type === 'task_splitter' || step.agentId)

        if (newSteps.length === 0) {
            return
        }

        onSave(newSteps)
    }, [reactFlowInstance, onSave])

    // Update node agents list when it changes
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node, index) => ({
                ...node,
                data: {
                    ...node.data,
                    stepIndex: index,
                    agents: agents.map(a => ({ id: a.id, name: a.name })),
                    onUpdate: stableOnUpdate,
                    onDelete: stableOnDelete
                }
            }))
        )
    }, [agents, stableOnUpdate, stableOnDelete, setNodes])

    return (
        <div ref={canvasRef} className="w-full h-[500px] bg-gray-950 rounded-xl border border-white/10 overflow-hidden relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={(changes) => {
                    onNodesChange(changes)
                    if (changes.some(c => c.type === 'position' && (c as any).dragging === false)) {
                        setHasChanges(true)
                    }
                }}
                onEdgesChange={(changes) => {
                    onEdgesChange(changes)
                    setHasChanges(true)
                }}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onPaneContextMenu={onPaneContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={onPaneClick}
                fitView
                minZoom={0.3}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'deletable',
                    style: defaultEdgeStyle,
                    animated: true
                }}
                proOptions={{ hideAttribution: true }}
                deleteKeyCode="Delete"
                snapToGrid
                snapGrid={[20, 20]}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(255, 255, 255, 0.05)"
                />
                <Controls className="!bg-gray-800 !border-white/10 !rounded-lg !shadow-lg [&>button]:!bg-gray-700 [&>button]:!border-white/10 [&>button]:!text-white [&>button:hover]:!bg-gray-600" />
                <MiniMap
                    nodeColor={(n) => n.type === 'taskSplitterNode' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(99, 102, 241, 0.5)'}
                    maskColor="rgba(0, 0, 0, 0.7)"
                    className="!bg-gray-900 !border !border-white/10 !rounded-lg"
                />

                {/* Top Toolbar Panel */}
                <Panel position="top-left" className="flex gap-2 items-center">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 px-3 py-1.5 text-xs font-medium">
                        ✏️ Modo Edição
                    </Badge>
                    <span className="text-white/40 text-xs ml-2">
                        {nodes.length} agente{nodes.length !== 1 ? 's' : ''} · {edges.length} conex{edges.length !== 1 ? 'ões' : 'ão'}
                    </span>
                </Panel>

                {/* Action Buttons Panel */}
                <Panel position="top-right" className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addNode()}
                        className="gap-1.5 bg-gray-800/80 border-white/10 text-white hover:bg-gray-700 hover:text-white text-xs"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Agente
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={autoLayout}
                        className="gap-1.5 bg-gray-800/80 border-white/10 text-white hover:bg-gray-700 hover:text-white text-xs"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Auto-Layout
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addSplitterNode()}
                        className="gap-1.5 bg-gray-800/80 border-amber-500/20 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 text-xs"
                    >
                        <Scissors className="h-3.5 w-3.5" />
                        Splitter
                    </Button>
                </Panel>

                {/* Bottom Save Panel */}
                <Panel position="bottom-center" className="flex gap-2 items-center">
                    <AnimatePresence>
                        {hasChanges && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shadow-xl"
                            >
                                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-xs text-white/60">Alterações não salvas</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={onCancel}
                                    className="text-xs h-7 px-2 text-white/60 hover:text-white hover:bg-white/10"
                                >
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="text-xs h-7 px-3 bg-green-600 hover:bg-green-500 text-white gap-1"
                                >
                                    <Save className="h-3 w-3" />
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Panel>
            </ReactFlow>

            {/* Empty State */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <p className="text-white/40 text-sm mb-3">Nenhum agente no pipeline</p>
                        <Button
                            size="sm"
                            onClick={() => addNode()}
                            className="gap-1.5 pointer-events-auto bg-blue-600 hover:bg-blue-500"
                        >
                            <Plus className="h-4 w-4" />
                            Adicionar Primeiro Agente
                        </Button>
                    </div>
                </div>
            )}


            {/* Context Menus */}
            <ContextMenu
                x={paneMenu?.x ?? 0}
                y={paneMenu?.y ?? 0}
                items={paneMenuItems}
                onClose={() => setPaneMenu(null)}
                visible={!!paneMenu}
            />
            <ContextMenu
                x={nodeMenu?.x ?? 0}
                y={nodeMenu?.y ?? 0}
                items={nodeMenuItems}
                onClose={() => setNodeMenu(null)}
                visible={!!nodeMenu}
            />
            {/* Task Splitter Config Panel */}
            <TaskSplitterConfigPanel
                visible={splitterConfigVisible}
                config={
                    splitterConfigNodeId
                        ? ((reactFlowInstance.getNodes().find(n => n.id === splitterConfigNodeId)?.data as any)?.splitterConfig || defaultSplitterConfig)
                        : defaultSplitterConfig
                }
                onSave={handleSplitterConfigSave}
                onClose={() => setSplitterConfigNodeId(null)}
            />
        </div>
    )
}

// Wrapper with ReactFlowProvider
export function EditableFlowCanvas(props: EditableFlowCanvasProps) {
    return (
        <ReactFlowProvider>
            <EditableFlowCanvasInner {...props} />
        </ReactFlowProvider>
    )
}
