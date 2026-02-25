'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Play, Loader2, CheckCircle, XCircle, Power, Code2 } from 'lucide-react'
import { PLUGIN_TEMPLATES } from '@/lib/plugins/executor'

interface Plugin {
  id: string
  agentId: string
  name: string
  description: string | null
  code: string
  inputSchema: string
  enabled: boolean
  createdAt: string
}

export default function AgentPluginsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params)
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; output?: unknown; error?: string }>>({})
  const [testInputs, setTestInputs] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [agentName, setAgentName] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": { "type": "string" }\n  },\n  "required": ["input"]\n}',
    code: '// Escreva sua função aqui\n// O parâmetro "input" contém os dados passados pelo agente\nreturn input.input + " processado pelo plugin";',
  })

  useEffect(() => {
    fetchPlugins()
    fetchAgent()
  }, [agentId])

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`)
      const data = await res.json()
      if (data.success) setAgentName(data.data.name)
    } catch { /* silently fail */ }
  }

  const fetchPlugins = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agents/${agentId}/plugins`)
      const data = await res.json()
      if (data.success) setPlugins(data.data)
    } catch (error) {
      console.error('Error fetching plugins:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name || !form.code) {
      alert('Nome e código são obrigatórios')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/plugins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setForm({
          name: '',
          description: '',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": { "type": "string" }\n  },\n  "required": ["input"]\n}',
          code: '// Escreva sua função aqui\nreturn input.input;',
        })
        fetchPlugins()
      } else {
        alert(data.error || 'Erro ao criar plugin')
      }
    } catch (error) {
      alert('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (plugin: Plugin) => {
    try {
      await fetch(`/api/agents/${agentId}/plugins/${plugin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !plugin.enabled }),
      })
      fetchPlugins()
    } catch (error) {
      console.error('Error toggling plugin:', error)
    }
  }

  const handleDelete = async (pluginId: string) => {
    if (!confirm('Tem certeza que deseja remover este plugin?')) return
    try {
      await fetch(`/api/agents/${agentId}/plugins/${pluginId}`, { method: 'DELETE' })
      fetchPlugins()
    } catch (error) {
      console.error('Error deleting plugin:', error)
    }
  }

  const handleTest = async (pluginId: string) => {
    const inputStr = testInputs[pluginId] || '{}'
    let input: Record<string, unknown>
    try {
      input = JSON.parse(inputStr)
    } catch {
      alert('JSON de input inválido')
      return
    }

    setTesting(pluginId)
    try {
      const res = await fetch(`/api/agents/${agentId}/plugins/${pluginId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResults(prev => ({ ...prev, [pluginId]: data.data.result }))
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [pluginId]: { success: false, error: 'Erro de conexão' } }))
    } finally {
      setTesting(null)
    }
  }

  const loadTemplate = (templateKey: keyof typeof PLUGIN_TEMPLATES) => {
    const tpl = PLUGIN_TEMPLATES[templateKey]
    setForm({
      name: tpl.name,
      description: tpl.description,
      inputSchema: tpl.inputSchema,
      code: tpl.code,
    })
  }

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
            <h1 className="text-2xl font-bold text-white">Plugins</h1>
            <p className="text-white/60 text-sm">
              {agentName ? `Agente: ${agentName}` : 'Funções JavaScript customizadas para o agente'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Plugin
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-white/80 text-sm">
          <strong className="text-white">Plugins</strong> permitem adicionar funções JavaScript customizadas aos agentes. O agente pode chamar esses plugins como tools durante uma conversa, executando lógica local (formatação, cálculos, transformações) sem chamadas externas.
        </p>
      </div>

      {/* Lista de plugins */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Code2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum plugin criado ainda.</p>
          <p className="text-sm mt-1">Clique em &ldquo;Novo Plugin&rdquo; para adicionar uma função customizada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${plugin.enabled ? 'bg-green-400' : 'bg-white/20'}`} />
                    <h3 className="font-medium text-white truncate">{plugin.name}</h3>
                    <span className="text-xs font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">
                      plugin
                    </span>
                  </div>
                  {plugin.description && (
                    <p className="text-white/60 text-sm mb-2">{plugin.description}</p>
                  )}
                  <details className="text-xs">
                    <summary className="text-white/40 cursor-pointer hover:text-white/60">Ver código</summary>
                    <pre className="mt-2 p-3 bg-black/40 rounded text-green-400 overflow-x-auto text-xs whitespace-pre-wrap">
                      {plugin.code}
                    </pre>
                  </details>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(plugin)}
                    className={`p-1.5 rounded-lg transition-colors ${plugin.enabled ? 'text-green-400 hover:bg-green-500/20' : 'text-white/30 hover:bg-white/10'}`}
                    title={plugin.enabled ? 'Desabilitar' : 'Habilitar'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plugin.id)}
                    className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remover plugin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Área de teste */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/40 mb-2">Testar plugin:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder='{"input": "valor de teste"}'
                    value={testInputs[plugin.id] || ''}
                    onChange={(e) => setTestInputs(prev => ({ ...prev, [plugin.id]: e.target.value }))}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={() => handleTest(plugin.id)}
                    disabled={testing === plugin.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors"
                  >
                    {testing === plugin.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    Testar
                  </button>
                </div>
                {testResults[plugin.id] && (
                  <div className={`mt-2 p-2 rounded-lg text-xs font-mono ${testResults[plugin.id].success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    {testResults[plugin.id].success ? (
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-green-400">
                          {JSON.stringify(testResults[plugin.id].output, null, 2)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-red-400">{testResults[plugin.id].error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f10] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Novo Plugin</h2>

              {/* Templates */}
              <div>
                <p className="text-xs text-white/40 mb-2">Templates prontos:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PLUGIN_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      onClick={() => loadTemplate(key as keyof typeof PLUGIN_TEMPLATES)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs rounded-lg transition-colors"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Calculadora, Formatador de CPF..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="O que este plugin faz?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Input Schema (JSON Schema)</label>
                  <textarea
                    value={form.inputSchema}
                    onChange={(e) => setForm({ ...form, inputSchema: e.target.value })}
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-y"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Código JavaScript *</label>
                  <textarea
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    rows={10}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-green-400 text-xs font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-y"
                    spellCheck={false}
                  />
                  <p className="text-xs text-white/30 mt-1">
                    O parâmetro <code className="text-white/50">input</code> contém os dados enviados pelo agente. Retorne o resultado com <code className="text-white/50">return valor</code>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
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
                  Criar Plugin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
