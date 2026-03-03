'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Network, Loader2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'

interface McpServerTool {
  id: string
  name: string
  description: string | null
}

interface McpServer {
  id: string
  name: string
  url: string
  description: string | null
  authType: 'none' | 'bearer' | 'api-key'
  enabled: boolean
  tools: McpServerTool[]
}

interface AgentMcpConnection {
  id: string
  mcpServerId: string
  enabled: boolean
  mcpServer: McpServer
}

export default function AgentMcpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params)
  const [allServers, setAllServers] = useState<McpServer[]>([])
  const [agentConnections, setAgentConnections] = useState<AgentMcpConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [agentName, setAgentName] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchAgent()
    fetchData()
  }, [agentId])

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`)
      const data = await res.json()
      if (data.success) setAgentName(data.data.name)
    } catch { /* silently fail */ }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [allRes, agentRes] = await Promise.all([
        fetch('/api/mcp/servers'),
        fetch(`/api/agents/${agentId}/mcp`),
      ])
      const [allData, agentData] = await Promise.all([allRes.json(), agentRes.json()])
      if (allData.success) setAllServers(allData.servers)
      if (agentData.success) setAgentConnections(agentData.connections)
    } catch (error) {
      console.error('Error fetching MCP data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isServerConnected = (serverId: string): boolean => {
    const conn = agentConnections.find((c) => c.mcpServerId === serverId)
    return conn?.enabled ?? false
  }

  const handleToggle = async (server: McpServer) => {
    setTogglingId(server.id)
    try {
      const connected = isServerConnected(server.id)

      if (connected) {
        // Desconectar — DELETE
        await fetch(`/api/agents/${agentId}/mcp/${server.id}`, {
          method: 'DELETE',
        })
      } else {
        // Conectar — POST
        const res = await fetch(`/api/agents/${agentId}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mcpServerId: server.id, enabled: true }),
        })
        const data = await res.json()
        if (!data.success) {
          console.error('Error connecting MCP server:', data.error)
        }
      }

      await fetchData()
    } catch (error) {
      console.error('Error toggling MCP server:', error)
    } finally {
      setTogglingId(null)
    }
  }

  const handleSyncTools = async (serverId: string) => {
    setSyncingId(serverId)
    try {
      const res = await fetch(`/api/mcp/servers/${serverId}/tools`)
      const data = await res.json()
      if (data.success) {
        await fetchData()
        setExpandedTools((prev) => ({ ...prev, [serverId]: true }))
      } else {
        alert(data.error || 'Erro ao sincronizar tools')
      }
    } catch (error) {
      console.error('Error syncing tools:', error)
    } finally {
      setSyncingId(null)
    }
  }

  const toggleToolsExpanded = (serverId: string) => {
    setExpandedTools((prev) => ({ ...prev, [serverId]: !prev[serverId] }))
  }

  const getAuthBadge = (authType: string) => {
    switch (authType) {
      case 'bearer':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Bearer</span>
      case 'api-key':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">API Key</span>
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">Publico</span>
    }
  }

  const ServerRow = ({ server }: { server: McpServer }) => {
    const connected = isServerConnected(server.id)
    const isToggling = togglingId === server.id
    const isSyncing = syncingId === server.id

    return (
      <div
        className={`p-4 border rounded-lg transition-all ${
          connected
            ? 'bg-purple-500/10 border-purple-500/30'
            : 'bg-white/5 border-white/10'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${server.enabled ? 'bg-green-400' : 'bg-white/20'}`} />
              <h3 className="font-medium text-white">{server.name}</h3>
              {getAuthBadge(server.authType)}
              <span className="text-xs text-white/40">
                {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
              </span>
              {connected && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                  Conectado
                </span>
              )}
            </div>
            <p className="text-white/40 text-xs font-mono mb-1 truncate">{server.url}</p>
            {server.description && (
              <p className="text-white/60 text-sm">{server.description}</p>
            )}

            {/* Tools list */}
            {server.tools.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => toggleToolsExpanded(server.id)}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  {expandedTools[server.id] ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  Ver tools ({server.tools.length})
                </button>
                {expandedTools[server.id] && (
                  <div className="mt-2 grid grid-cols-1 gap-1.5">
                    {server.tools.map((tool) => (
                      <div key={tool.id} className="bg-black/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                          <code className="text-purple-300 text-xs font-mono">{tool.name}</code>
                        </div>
                        {tool.description && (
                          <p className="text-white/40 text-xs mt-0.5 ml-3.5">{tool.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleSyncTools(server.id)}
              disabled={isSyncing}
              className="p-1.5 rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              title="Sincronizar tools"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => handleToggle(server)}
              disabled={isToggling}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                connected ? 'bg-purple-500' : 'bg-white/10'
              } ${isToggling ? 'opacity-50' : ''}`}
              title={connected ? 'Desconectar servidor' : 'Conectar servidor'}
            >
              {isToggling ? (
                <Loader2 className="w-3 h-3 animate-spin absolute top-1.5 left-1.5 text-white" />
              ) : (
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    connected ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const connectedCount = allServers.filter((s) => isServerConnected(s.id)).length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/agents/${agentId}`}>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">MCP Servers do Agente</h1>
            {agentName && (
              <p className="text-white/60 text-sm">{agentName}</p>
            )}
          </div>
        </div>
        <Link href="/dashboard/mcp">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg text-sm transition-colors">
            <Network className="w-4 h-4" />
            Gerenciar Servidores
          </button>
        </Link>
      </div>

      {/* Info box */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-white/80 text-sm">
          <strong className="text-white">Servidores MCP conectados</strong> disponibilizam suas tools automaticamente para o agente durante conversas. O agente pode chamar qualquer tool dos servidores habilitados.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Network className="w-4 h-4" />
            <span>{connectedCount} de {allServers.length} servidor{allServers.length !== 1 ? 'es' : ''} conectado{connectedCount !== 1 ? 's' : ''}</span>
          </div>

          {allServers.length === 0 ? (
            <div className="text-center py-12 text-white/40 bg-white/5 border border-white/10 rounded-lg">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum servidor MCP disponivel.</p>
              <Link href="/dashboard/mcp" className="text-blue-400 text-sm hover:underline mt-1 block">
                Conectar servidores MCP
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {allServers.map((server) => (
                <ServerRow key={server.id} server={server} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
