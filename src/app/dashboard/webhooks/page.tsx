'use client'

import { useState, useEffect } from 'react'
import {
  Webhook,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react'

interface WebhookConfig {
  id: string
  name: string
  type: string
  url?: string
  email?: string
  events: string[]
  isActive: boolean
  createdAt: string
}

const WEBHOOK_TYPES = [
  { id: 'slack', label: 'Slack', icon: '💬', placeholder: 'https://hooks.slack.com/services/...' },
  { id: 'discord', label: 'Discord', icon: '🎮', placeholder: 'https://discord.com/api/webhooks/...' },
  { id: 'email', label: 'E-mail', icon: '📧', placeholder: 'seu@email.com' },
  { id: 'generic', label: 'HTTP Genérico', icon: '🔗', placeholder: 'https://meu-servidor.com/webhook' },
]

const AVAILABLE_EVENTS = [
  { id: 'orchestration_completed', label: 'Orquestração concluída' },
  { id: 'orchestration_failed', label: 'Orquestração falhou' },
  { id: 'agent_response', label: 'Resposta de agente' },
  { id: 'execution_started', label: 'Execução iniciada' },
]

export default function WebhooksPage() {
  const [configs, setConfigs] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('slack')
  const [formUrl, setFormUrl] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>(['orchestration_completed'])

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    setLoading(true)
    try {
      const res = await fetch('/api/webhooks/config')
      if (res.ok) {
        const json = await res.json()
        setConfigs(json.data || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const body: Record<string, unknown> = {
        name: formName,
        type: formType,
        events: formEvents,
      }
      if (formType === 'email') {
        body.email = formEmail
      } else {
        body.url = formUrl
      }

      const res = await fetch('/api/webhooks/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao criar webhook')
      } else {
        setSuccess('Webhook criado com sucesso!')
        setConfigs((prev) => [json.data, ...prev])
        // Reset form
        setFormName('')
        setFormType('slack')
        setFormUrl('')
        setFormEmail('')
        setFormEvents(['orchestration_completed'])
        setShowForm(false)
      }
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string) {
    try {
      const res = await fetch(`/api/webhooks/config/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const json = await res.json()
        setConfigs((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: json.data.isActive } : c))
        )
      }
    } catch {
      // silent
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este webhook?')) return
    try {
      const res = await fetch(`/api/webhooks/config/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      // silent
    }
  }

  function toggleEvent(eventId: string) {
    setFormEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  const selectedType = WEBHOOK_TYPES.find((t) => t.id === formType)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-blue-400" />
            </div>
            Webhooks de Output
          </h1>
          <p className="text-white/40 text-sm mt-1 ml-[52px]">
            Receba notificacoes no Slack, Discord, email ou qualquer HTTP endpoint
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Webhook
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass-card p-6 rounded-xl mb-6 border border-blue-500/20"
        >
          <h2 className="font-semibold text-white mb-4">Novo Webhook</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Nome</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Notificacoes Slack do Time"
                required
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/30"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Tipo</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                {WEBHOOK_TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#0a0a0f]">
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* URL or Email */}
          <div className="mb-4">
            <label className="block text-xs text-white/50 mb-1.5">
              {formType === 'email' ? 'Email de destino' : 'URL do Webhook'}
            </label>
            {formType === 'email' ? (
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder={selectedType?.placeholder}
                required
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/30"
              />
            ) : (
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder={selectedType?.placeholder}
                required
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/30"
              />
            )}
          </div>

          {/* Events */}
          <div className="mb-6">
            <label className="block text-xs text-white/50 mb-2">Eventos para notificar</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => toggleEvent(ev.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    formEvents.includes(ev.id)
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || formEvents.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Webhook
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/60 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : configs.length === 0 ? (
        <div className="glass-card p-12 rounded-xl text-center">
          <Webhook className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">Nenhum webhook configurado</h3>
          <p className="text-white/40 text-sm mb-4">
            Configure webhooks para receber notificacoes quando orquestracoes forem concluidas.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Criar Primeiro Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => {
            const typeInfo = WEBHOOK_TYPES.find((t) => t.id === config.type)
            return (
              <div
                key={config.id}
                className="glass-card p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{typeInfo?.icon || '🔗'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white text-sm truncate">{config.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 flex-shrink-0">
                        {typeInfo?.label || config.type}
                      </span>
                      {!config.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 flex-shrink-0">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/30 truncate">
                      {config.url || config.email || '—'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {config.events.map((ev) => (
                        <span
                          key={ev}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400"
                        >
                          {ev.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {(config.url || config.email) && (
                    <a
                      href={config.url || `mailto:${config.email}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                      title="Abrir URL"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleToggle(config.id)}
                    className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${
                      config.isActive ? 'text-green-400' : 'text-white/30'
                    }`}
                    title={config.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {config.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 rounded-xl bg-white/2 border border-white/5 text-xs text-white/30">
        <p className="font-medium text-white/50 mb-1">Sobre os webhooks</p>
        <p>
          Webhooks enviam notificacoes automaticas quando eventos ocorrem nas suas orquestracoes.
          Suporte a Slack (Incoming Webhooks), Discord (Webhooks de servidor), email via Resend e
          qualquer endpoint HTTP customizado.
        </p>
      </div>
    </div>
  )
}
