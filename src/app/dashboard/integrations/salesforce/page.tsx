'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, ExternalLink, Unlink, Loader2, AlertCircle, Users, Search } from 'lucide-react'

interface SalesforceStatus {
  connected: boolean
  configured: boolean
  message?: string
  metadata?: {
    instanceUrl?: string
    username?: string
    email?: string
    orgId?: string
    connectedAt?: string
  } | null
}

export default function SalesforceIntegrationPage() {
  const [status, setStatus] = useState<SalesforceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchStatus()

    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
      fetchStatus()
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/salesforce/status')
      const data = await res.json()
      if (data.success) setStatus(data.data)
    } catch (error) {
      console.error('Error fetching Salesforce status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Salesforce?')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/salesforce/disconnect', { method: 'DELETE' })
      if (res.ok) fetchStatus()
    } catch (error) {
      console.error('Error disconnecting Salesforce:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  const salesforceTools = [
    {
      icon: Users,
      name: 'salesforce_create_lead',
      description: 'Cria um novo Lead no Salesforce',
      params: 'firstName, lastName, email, company',
      example: 'Crie um lead para João Silva da Empresa ABC, email joao@abc.com.br',
    },
    {
      icon: Search,
      name: 'salesforce_query',
      description: 'Executa uma SOQL query (somente leitura) no Salesforce',
      params: 'soql (string SOQL)',
      example: 'Busque todos os leads criados esta semana: SELECT Id, Name, Email FROM Lead WHERE CreatedDate = THIS_WEEK',
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
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <span className="text-2xl">☁️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Salesforce CRM</h1>
            <p className="text-white/60 text-sm">Qualifique leads e consulte dados do Salesforce com agentes IA</p>
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
                  Configure as variáveis <code className="text-yellow-400">SALESFORCE_CLIENT_ID</code> e <code className="text-yellow-400">SALESFORCE_CLIENT_SECRET</code> no Vercel. Crie um Connected App no Salesforce Setup.
                </p>
                <a
                  href="https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" /> Criar Connected App no Salesforce
                </a>
              </div>
            </div>
          ) : status?.connected ? (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-300 font-medium">Salesforce conectado</p>
                {status.metadata?.username && (
                  <p className="text-white/60 text-sm mt-1">Usuário: <span className="text-white">{status.metadata.username}</span></p>
                )}
                {status.metadata?.instanceUrl && (
                  <p className="text-white/60 text-sm">Instância: <span className="text-white">{status.metadata.instanceUrl}</span></p>
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
                <p className="text-white font-medium">Salesforce não conectado</p>
                <p className="text-white/60 text-sm mt-1">Conecte sua org Salesforce para qualificar leads e consultar dados via agentes IA.</p>
              </div>
              <a
                href="/api/integrations/salesforce/connect"
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Conectar Salesforce
              </a>
            </div>
          )}
        </>
      )}

      {/* Tools disponíveis */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Tools disponíveis para agentes</h2>
        <div className="space-y-3">
          {salesforceTools.map((tool) => {
            const Icon = tool.icon
            return (
              <div key={tool.name} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <code className="text-sm text-blue-400 font-mono">{tool.name}</code>
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
        <h3 className="text-white font-medium mb-2">Como configurar no Salesforce</h3>
        <ol className="text-white/70 text-sm space-y-1.5">
          <li><span className="text-blue-400 font-mono">1.</span> No Salesforce Setup, crie um Connected App com OAuth habilitado</li>
          <li><span className="text-blue-400 font-mono">2.</span> Configure callback URL: <code className="text-white/60">https://sofiaia.roilabs.com.br/api/integrations/salesforce/callback</code></li>
          <li><span className="text-blue-400 font-mono">3.</span> Copie Consumer Key e Secret para as env vars do Vercel</li>
          <li><span className="text-blue-400 font-mono">4.</span> Clique em &ldquo;Conectar Salesforce&rdquo; acima</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <a
          href="https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Docs Salesforce REST API
        </a>
      </div>
    </div>
  )
}
