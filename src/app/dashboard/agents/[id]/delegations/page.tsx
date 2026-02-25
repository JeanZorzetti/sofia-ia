'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Delegation {
  id: string
  fromAgentId: string
  toAgentId: string
  message: string
  response: string | null
  status: string
  depth: number
  createdAt: string
  fromAgent?: { id: string; name: string }
  toAgent?: { id: string; name: string }
}

interface DelegationData {
  agent: { id: string; name: string }
  sent: Delegation[]
  received: Delegation[]
}

export default function AgentDelegationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params)
  const [data, setData] = useState<DelegationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'sent' | 'received'>('sent')

  useEffect(() => {
    fetchDelegations()
  }, [agentId])

  const fetchDelegations = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agents/${agentId}/delegations`)
      const result = await res.json()
      if (result.success) setData(result.data)
    } catch (error) {
      console.error('Error fetching delegations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const displayDelegations = tab === 'sent' ? (data?.sent ?? []) : (data?.received ?? [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/agents/${agentId}`}>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Delegações</h1>
          <p className="text-white/60 text-sm">
            {data?.agent?.name ? `Agente: ${data.agent.name}` : 'Histórico de delegações agent-to-agent'}
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-white/80 text-sm">
          <strong className="text-white">Delegações</strong> ocorrem quando um agente usa a tool <code className="text-purple-400">delegate_to_agent</code> para pedir ajuda a outro agente especialista. Máximo de 3 níveis de profundidade para evitar loops infinitos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['sent', 'received'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              tab === t
                ? 'border-blue-400 text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'sent' ? 'Enviadas' : 'Recebidas'}
            {data && (
              <span className="ml-2 text-xs bg-white/10 px-1.5 py-0.5 rounded">
                {t === 'sent' ? data.sent.length : data.received.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : displayDelegations.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <ArrowRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma delegação {tab === 'sent' ? 'enviada' : 'recebida'} ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayDelegations.map((delegation) => (
            <div key={delegation.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {getStatusIcon(delegation.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs text-white/40 font-mono">
                        {tab === 'sent'
                          ? `Para: ${delegation.toAgent?.name || delegation.toAgentId.slice(0, 8)}`
                          : `De: ${delegation.fromAgent?.name || delegation.fromAgentId.slice(0, 8)}`
                        }
                      </span>
                      <span className="text-xs text-white/20">•</span>
                      <span className="text-xs text-white/30">Nível {delegation.depth}</span>
                      <span className="text-xs text-white/20">•</span>
                      <span className="text-xs text-white/30">
                        {new Date(delegation.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 bg-black/20 rounded text-sm text-white/70">
                        <span className="text-white/30 text-xs">Mensagem:</span>
                        <p className="mt-0.5 line-clamp-2">{delegation.message}</p>
                      </div>
                      {delegation.response && (
                        <div className="p-2 bg-green-500/5 border border-green-500/10 rounded text-sm text-white/70">
                          <span className="text-white/30 text-xs">Resposta:</span>
                          <p className="mt-0.5 line-clamp-3">{delegation.response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
