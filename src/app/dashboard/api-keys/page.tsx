'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Key, Copy, Trash2, RefreshCw, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  keyPreview: string
  status: string
  lastUsedAt: string | null
  createdAt: string
}

interface NewKey {
  id: string
  name: string
  key: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState<NewKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/api-keys')
      const data = await res.json()
      if (data.success) setKeys(data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error); return }
      setNewKey(data.data)
      setNewKeyName('')
      setShowForm(false)
      fetchKeys()
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revogar esta chave? Integrações que a usam vão parar de funcionar.')) return
    await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' })
    fetchKeys()
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">API Keys</h1>
            <p className="text-foreground-tertiary text-sm">Gerencie suas chaves de acesso à API pública</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setNewKey(null) }}
            className="button-luxury px-5 py-2.5 text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova chave
          </button>
        </div>

        {/* Nova chave revelada — mostrar só uma vez */}
        {newKey && (
          <div className="glass-card p-5 rounded-xl mb-6 border border-green-500/20">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white text-sm">Chave criada: <span className="text-green-400">{newKey.name}</span></p>
                <p className="text-xs text-white/40 mt-0.5">Copie agora — ela não será exibida novamente.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-green-300 font-mono overflow-x-auto">
                {newKey.key}
              </code>
              <button
                onClick={copyKey}
                className="flex-shrink-0 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="Copiar"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
              </button>
            </div>
          </div>
        )}

        {/* Formulário nova chave */}
        {showForm && (
          <div className="glass-card p-5 rounded-xl mb-6">
            <h3 className="font-semibold text-white mb-4 text-sm">Nova API Key</h3>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                autoFocus
                required
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="Ex: Produção, Integração n8n, Teste..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50"
              />
              <button type="submit" disabled={creating} className="button-luxury px-5 py-2.5 text-sm disabled:opacity-50">
                {creating ? 'Criando...' : 'Criar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm border border-white/10 rounded-lg hover:bg-white/5 text-white transition-colors">
                Cancelar
              </button>
            </form>
            {error && (
              <div className="flex items-center gap-2 mt-3 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>
        )}

        {/* Lista de chaves */}
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="glass-card p-12 rounded-xl text-center">
            <Key className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nenhuma API key criada ainda.</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-blue-400 hover:text-blue-300 text-sm transition-colors">
              Criar primeira chave →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className="glass-card p-4 rounded-xl flex items-center gap-4">
                <Key className="w-4 h-4 text-white/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-white text-sm">{k.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${k.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {k.status === 'active' ? 'Ativa' : 'Revogada'}
                    </span>
                  </div>
                  <code className="text-xs text-white/40 font-mono">{k.keyPreview}</code>
                  <div className="text-xs text-white/30 mt-0.5">
                    Criada {new Date(k.createdAt).toLocaleDateString('pt-BR')}
                    {k.lastUsedAt && ` · Usado em ${new Date(k.lastUsedAt).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                {k.status === 'active' && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Revogar chave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Link para docs */}
        <div className="mt-8 p-4 glass-card rounded-xl flex items-center gap-3 text-sm text-white/40">
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          <span>Veja como usar sua chave na{' '}
            <Link href="/docs" className="text-blue-400 hover:text-blue-300 transition-colors">
              documentação da API →
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
