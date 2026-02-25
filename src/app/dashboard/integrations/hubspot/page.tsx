'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, ExternalLink, Unlink, Loader2, AlertCircle, Users, DollarSign, Search } from 'lucide-react'

interface HubSpotStatus {
  connected: boolean
  configured: boolean
  message?: string
  metadata?: {
    hubId?: string
    hubDomain?: string
    email?: string
    connectedAt?: string
  } | null
}

export default function HubSpotIntegrationPage() {
  const [status, setStatus] = useState<HubSpotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchStatus()

    // Verificar parâmetros de retorno do OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      // Limpar URL
      window.history.replaceState({}, '', window.location.pathname)
      fetchStatus()
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/hubspot/status')
      const data = await res.json()
      if (data.success) setStatus(data.data)
    } catch (error) {
      console.error('Error fetching HubSpot status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o HubSpot? Os agentes perderão acesso às tools do CRM.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/hubspot/disconnect', { method: 'DELETE' })
      if (res.ok) {
        fetchStatus()
      }
    } catch (error) {
      console.error('Error disconnecting HubSpot:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  const hubspotTools = [
    {
      icon: Users,
      name: 'hubspot_create_contact',
      description: 'Cria um novo contato no HubSpot CRM',
      params: 'email, firstName, lastName, phone?',
      example: 'Crie um contato para joao@empresa.com, João Silva',
    },
    {
      icon: Search,
      name: 'hubspot_get_contact',
      description: 'Busca um contato pelo email no HubSpot',
      params: 'email',
      example: 'Busque o contato joao@empresa.com no CRM',
    },
    {
      icon: DollarSign,
      name: 'hubspot_create_deal',
      description: 'Cria um novo negócio/deal no pipeline',
      params: 'dealName, amount, stage, contactId?',
      example: 'Crie um deal "Plano Pro" de R$ 1.200 no estágio "Proposta enviada"',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/integrations">
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <span className="text-2xl">🧡</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">HubSpot CRM</h1>
            <p className="text-white/60 text-sm">Crie contatos e deals diretamente pelos seus agentes IA</p>
          </div>
        </div>
      </div>

      {/* Status */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          {!status?.configured ? (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 font-medium">Integração não configurada</p>
                <p className="text-white/60 text-sm mt-1">
                  Configure as variáveis de ambiente <code className="text-yellow-400">HUBSPOT_CLIENT_ID</code> e <code className="text-yellow-400">HUBSPOT_CLIENT_SECRET</code> no Vercel para ativar esta integração.
                </p>
                <a
                  href="https://developers.hubspot.com/docs/api/oauth-quickstart-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-orange-400 hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" /> Criar App HubSpot
                </a>
              </div>
            </div>
          ) : status?.connected ? (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-300 font-medium">HubSpot conectado</p>
                {status.metadata?.email && (
                  <p className="text-white/60 text-sm mt-1">Conta: <span className="text-white">{status.metadata.email}</span></p>
                )}
                {status.metadata?.hubDomain && (
                  <p className="text-white/60 text-sm">Hub: <span className="text-white">{status.metadata.hubDomain}</span></p>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
                Desconectar
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
              <XCircle className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-medium">HubSpot não conectado</p>
                <p className="text-white/60 text-sm mt-1">Conecte sua conta HubSpot para que os agentes possam criar contatos e deals automaticamente.</p>
              </div>
              <a
                href="/api/integrations/hubspot/connect"
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Conectar HubSpot
              </a>
            </div>
          )}
        </>
      )}

      {/* Tools disponíveis */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Tools disponíveis para agentes</h2>
        <p className="text-white/60 text-sm">
          Quando o HubSpot está conectado, essas tools ficam disponíveis automaticamente para seus agentes.
        </p>
        <div className="space-y-3">
          {hubspotTools.map((tool) => {
            const Icon = tool.icon
            return (
              <div key={tool.name} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-orange-500/20 rounded-lg flex-shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <code className="text-sm text-orange-400 font-mono">{tool.name}</code>
                    <p className="text-white/70 text-sm mt-1">{tool.description}</p>
                    <p className="text-white/40 text-xs mt-1">Parâmetros: <code className="text-white/60">{tool.params}</code></p>
                    <div className="mt-2 p-2 bg-black/30 rounded text-xs text-green-400 font-mono">
                      Exemplo: &ldquo;{tool.example}&rdquo;
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Como ativar */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h3 className="text-white font-medium mb-2">Como ativar as tools no agente</h3>
        <ol className="text-white/70 text-sm space-y-1.5">
          <li><span className="text-blue-400 font-mono">1.</span> Conecte sua conta HubSpot acima</li>
          <li><span className="text-blue-400 font-mono">2.</span> As tools serão injetadas automaticamente em todos os seus agentes</li>
          <li><span className="text-blue-400 font-mono">3.</span> No system prompt do agente, mencione quando usar: <em className="text-white/50">&ldquo;Quando qualificar um lead, use hubspot_create_contact para registrar no CRM&rdquo;</em></li>
        </ol>
      </div>

      {/* Link para docs HubSpot */}
      <div className="flex gap-3">
        <a
          href="https://developers.hubspot.com/docs/api/crm/contacts"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Docs HubSpot API
        </a>
        <Link
          href="/dashboard/agents"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          Configurar Agentes
        </Link>
      </div>
    </div>
  )
}
