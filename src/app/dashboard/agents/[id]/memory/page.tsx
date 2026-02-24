'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Brain, Trash2, RefreshCw, Plus, AlertCircle } from 'lucide-react'

interface MemoryEntry {
  id: string
  key: string
  value: string
  updatedAt: string
}

export default function AgentMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function fetchMemories() {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/agents/${id}/memory`)
      const data = await res.json()
      if (data.success) setMemories(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMemories() }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/agents/${id}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), value: newValue.trim() }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Erro ao salvar'); return }
      setNewKey('')
      setNewValue('')
      setShowForm(false)
      fetchMemories()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Deletar memória "${key}"?`)) return
    await fetch(`/api/dashboard/agents/${id}/memory?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
    fetchMemories()
  }

  async function handleClearAll() {
    if (!confirm('Limpar toda a memória deste agente para este usuário?')) return
    await fetch(`/api/dashboard/agents/${id}/memory`, { method: 'DELETE' })
    fetchMemories()
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/dashboard/agents/${id}`} className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">Memória do Agente</h1>
            </div>
            <p className="text-white/40 text-sm mt-0.5">
              Fatos e contexto persistido entre conversas
            </p>
          </div>
          <div className="flex gap-2">
            {memories.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Limpar tudo
              </button>
            )}
            <button
              onClick={() => { setShowForm(true); setError('') }}
              className="button-luxury px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nova entrada
            </button>
          </div>
        </div>

        {/* Formulário nova entrada */}
        {showForm && (
          <div className="glass-card p-5 rounded-xl mb-6">
            <h3 className="font-semibold text-white text-sm mb-4">Nova entrada de memória</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Chave</label>
                <input
                  autoFocus
                  required
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="Ex: nome_usuario, idioma_preferido, setor..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Valor</label>
                <textarea
                  required
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Ex: João Silva, português, tecnologia..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="button-luxury px-5 py-2 text-sm disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/5 text-white transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de memórias */}
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : memories.length === 0 ? (
          <div className="glass-card p-12 rounded-xl text-center">
            <Brain className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nenhuma memória registrada ainda.</p>
            <p className="text-white/20 text-xs mt-1">O agente vai salvar contexto automaticamente durante conversas (se memória estiver ativada).</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-purple-400 hover:text-purple-300 text-sm transition-colors">
              Adicionar manualmente →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {memories.map((m) => (
              <div key={m.id} className="glass-card p-4 rounded-xl flex items-start gap-3 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded">
                      {m.key}
                    </code>
                    <span className="text-xs text-white/20">
                      {new Date(m.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 break-words">{m.value}</p>
                </div>
                <button
                  onClick={() => handleDelete(m.key)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Deletar entrada"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info sobre memória */}
        <div className="mt-8 p-4 glass-card rounded-xl text-sm text-white/40">
          <p className="font-medium text-white/60 mb-1">Como funciona a memória</p>
          <p>Quando a memória está ativada no agente, ele pode salvar e recuperar fatos sobre o usuário usando as tools <code className="text-purple-300 text-xs">save_memory</code> e <code className="text-purple-300 text-xs">recall_memory</code>. Essas informações são injetadas automaticamente no início de cada conversa.</p>
        </div>
      </div>
    </div>
  )
}
