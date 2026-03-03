'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Network, RefreshCw, Loader2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

interface McpServerTool {
  id: string
  name: string
  description: string | null
  inputSchema: Record<string, unknown> | null
}

interface McpServer {
  id: string
  name: string
  url: string
  description: string | null
  transport: string
  headers: Record<string, string>
  status: string
  createdAt: string
  tools: McpServerTool[]
}

const defaultForm = {
  name: '',
  url: '',
  description: '',
  headers: '{}',
}

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState(defaultForm)
  const [copied, setCopied] = useState(false)
  const [sofiaUrl, setSofiaUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSofiaUrl(`${window.location.origin}/api/mcp`)
    }
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/mcp/servers')
      const data = await res.json()
      if (data.success) setServers(data.data ?? [])
    } catch (error) {
      console.error('Error fetching MCP servers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name || !form.url) {
      alert('Nome e URL são obrigatórios')
      return
    }

    let parsedHeaders: Record<string, string> = {}
    try {
      parsedHeaders = JSON.parse(form.headers)
    } catch {
      alert('Headers deve ser um JSON valido. Ex: {"Authorization": "Bearer token"}')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          description: form.description,
          headers: parsedHeaders,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setForm(defaultForm)
        fetchServers()
      } else {
        alert(data.error || 'Erro ao criar servidor MCP')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (serverId: string) => {
    if (!confirm('Tem certeza que deseja remover este servidor MCP?')) return
    try {
      await fetch(`/api/mcp/servers/${serverId}`, { method: 'DELETE' })
      fetchServers()
    } catch (error) {
      console.error('Error deleting MCP server:', error)
    }
  }

  const handleToggle = async (server: McpServer) => {
    try {
      await fetch(`/api/mcp/servers/${server.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: server.status === 'active' ? 'inactive' : 'active' }),
      })
      fetchServers()
    } catch (error) {
      console.error('Error toggling MCP server:', error)
    }
  }

  const handleSyncTools = async (serverId: string) => {
    setSyncingId(serverId)
    try {
      const res = await fetch(`/api/mcp/servers/${serverId}/tools`)
      const data = await res.json()
      if (data.success) {
        fetchServers()
        setExpandedTools((prev) => ({ ...prev, [serverId]: true }))
      } else {
        alert(data.error || 'Erro ao sincronizar tools')
      }
    } catch (error) {
      console.error('Error syncing tools:', error)
      alert('Erro de conexão ao sincronizar tools')
    } finally {
      setSyncingId(null)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(sofiaUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const toggleToolsExpanded = (serverId: string) => {
    setExpandedTools((prev) => ({ ...prev, [serverId]: !prev[serverId] }))
  }


  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">MCP Servers</h1>
          <p className="text-white/60 text-sm mt-1">
            Gerencie servidores Model Context Protocol para expandir capacidades dos agentes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Conectar Servidor
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-white/80 text-sm">
          <strong className="text-white">Model Context Protocol (MCP)</strong> permite que agentes se conectem a servidores externos que expõem tools padronizadas. Conecte servidores MCP para dar aos agentes acesso a ferramentas de terceiros.
        </p>
      </div>

      {/* Sofia como servidor MCP */}
      <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Network className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Sofia como Servidor MCP</h2>
            <p className="text-white/50 text-sm">Exponha os agentes da Sofia para outros sistemas via MCP</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/40 mb-1">Endpoint MCP</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-green-400 text-sm font-mono">
                {sofiaUrl || 'Carregando...'}
              </code>
              <button
                onClick={handleCopyUrl}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Copiar URL"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-1">Autenticacao</p>
            <code className="block bg-black/40 rounded-lg px-3 py-2 text-yellow-400 text-sm font-mono">
              X-API-Key: sua-api-key
            </code>
            <p className="text-xs text-white/30 mt-1">
              Obtenha sua API Key em{' '}
              <a href="/dashboard/api-keys" className="text-blue-400 hover:underline">
                Configuracoes &gt; API Keys
              </a>
            </p>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-2">Tools disponibilizadas</p>
            <div className="grid grid-cols-2 gap-2">
              {['list_agents', 'call_agent', 'search_knowledge', 'publish_threads'].map((tool) => (
                <div key={tool} className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  <code className="text-purple-300 text-xs font-mono">{tool}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de servidores externos */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          Servidores Conectados
          <span className="text-sm font-normal text-white/40">({servers.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-12 text-white/40 bg-white/5 border border-white/10 rounded-lg">
            <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum servidor MCP conectado ainda.</p>
            <p className="text-sm mt-1">Clique em &ldquo;Conectar Servidor&rdquo; para adicionar um servidor MCP externo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {servers.map((server) => (
              <div key={server.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${server.status === "active" ? 'bg-green-400' : 'bg-white/20'}`} />
                      <h3 className="font-medium text-white">{server.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{server.transport}</span>
                      <span className="text-xs text-white/40">
                        {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
                      </span>
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
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                  <code className="text-blue-300 text-xs font-mono">{tool.name}</code>
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
                      disabled={syncingId === server.id}
                      className="p-1.5 rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Sincronizar tools"
                    >
                      {syncingId === server.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(server)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        server.status === "active" ? 'bg-blue-500' : 'bg-white/10'
                      }`}
                      title={server.status === "active" ? 'Desabilitar' : 'Habilitar'}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          server.status === "active" ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remover servidor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f10] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Conectar Servidor MCP</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Servidor de Busca, GitHub MCP..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">URL *</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://meu-servidor-mcp.com/mcp"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Descricao</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Para que serve este servidor?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Headers HTTP (JSON)</label>
                  <textarea
                    value={form.headers}
                    onChange={(e) => setForm({ ...form, headers: e.target.value })}
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-yellow-400 text-xs font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none"
                    spellCheck={false}
                  />
                  <p className="text-xs text-white/30 mt-1">
                    Opcional. Para autenticacao: Authorization: Bearer token
                  </p>
                </div>
              </div>

              <p className="text-xs text-white/30">
                Ao conectar, as tools do servidor serao sincronizadas automaticamente.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowModal(false); setForm(defaultForm) }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Conectar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
