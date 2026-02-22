'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Users, RefreshCw, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Building2, Mail
} from 'lucide-react'

interface WhitelabelTenant {
  id: string
  name: string
  email: string
  status: string
  notes: string | null
  createdAt: string
}

interface WhitelabelAccount {
  plan: string
  status: string
  maxSubTenants: number
  trialEndsAt: string | null
  branding: { platformName?: string; logoUrl?: string; primaryColor?: string }
}

const statusColor: Record<string, string> = {
  active: 'text-green-400 bg-green-500/10',
  suspended: 'text-yellow-400 bg-yellow-500/10',
  canceled: 'text-red-400 bg-red-500/10',
}

const statusIcon: Record<string, typeof CheckCircle> = {
  active: CheckCircle,
  suspended: AlertCircle,
  canceled: XCircle,
}

export default function WhitelabelDashboardPage() {
  const [account, setAccount] = useState<WhitelabelAccount | null>(null)
  const [tenants, setTenants] = useState<WhitelabelTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', notes: '' })
  const [formError, setFormError] = useState('')
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [wlRes, meRes] = await Promise.all([
        fetch('/api/whitelabel/tenants'),
        fetch('/api/auth/me'),
      ])
      const wlData = await wlRes.json()
      if (wlData.success) {
        setAccount(wlData.data.account)
        setTenants(wlData.data.tenants)
      }
      if (meRes.ok) {
        const meData = await meRes.json()
        setIsAdmin(meData.data?.role === 'admin')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleActivate() {
    setActivating(true)
    try {
      const res = await fetch('/api/whitelabel/account', { method: 'POST' })
      const data = await res.json()
      if (data.success) fetchData()
    } finally {
      setActivating(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setFormError('')
    try {
      const res = await fetch('/api/whitelabel/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setShowForm(false)
      setForm({ name: '', email: '', notes: '' })
      fetchData()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar cliente')
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setActionMenu(null)
    await fetch(`/api/whitelabel/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  const activeTenants = tenants.filter(t => t.status === 'active').length

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center max-w-md glass-card p-10 rounded-2xl">
          <Building2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-3">Conta White-label não ativada</h2>
          <p className="text-foreground-tertiary text-sm mb-6">
            {isAdmin
              ? 'Ative sua conta white-label como administrador para acessar o painel.'
              : 'Para acessar o painel white-label, você precisa de uma conta ativa. Fale com nossa equipe.'}
          </p>
          {isAdmin ? (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="button-luxury px-8 py-3 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {activating ? 'Ativando...' : 'Ativar conta (Admin)'}
            </button>
          ) : (
            <Link href="/contato?type=whitelabel" className="button-luxury px-8 py-3 inline-flex items-center gap-2">
              Solicitar acesso
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Painel White-label</h1>
            <p className="text-foreground-tertiary text-sm">Gerencie seus clientes</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="button-luxury px-5 py-2.5 text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Plano', value: account.plan.charAt(0).toUpperCase() + account.plan.slice(1) },
            { label: 'Clientes ativos', value: `${activeTenants} / ${account.maxSubTenants}` },
            { label: 'Status conta', value: account.status === 'trial' ? 'Trial' : 'Ativo' },
          ].map(s => (
            <div key={s.label} className="glass-card p-5 rounded-xl">
              <div className="text-xs text-white/40 mb-1">{s.label}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Trial warning */}
        {account.status === 'trial' && account.trialEndsAt && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-300">
              Conta em período trial. Encerra em {new Date(account.trialEndsAt).toLocaleDateString('pt-BR')}.{' '}
              <Link href="/contato?type=whitelabel" className="underline">Ativar conta</Link>.
            </p>
          </div>
        )}

        {/* Form criar cliente */}
        {showForm && (
          <div className="glass-card p-6 rounded-xl mb-6">
            <h3 className="font-semibold text-white mb-4">Novo cliente</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Nome do cliente *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Empresa do Cliente"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Email do admin *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="admin@cliente.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Observações</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Contexto adicional sobre o cliente..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="button-luxury px-6 py-2 text-sm disabled:opacity-50">
                  {creating ? 'Criando...' : 'Criar cliente'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/5 text-white transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de tenants */}
        {tenants.length === 0 ? (
          <div className="glass-card p-12 rounded-xl text-center">
            <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nenhum cliente ainda. Crie o primeiro clicando em &quot;Novo Cliente&quot;.</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/40 font-medium">Cliente</th>
                  <th className="text-left p-4 text-white/40 font-medium">Email</th>
                  <th className="p-4 text-white/40 font-medium text-center">Status</th>
                  <th className="p-4 text-white/40 font-medium text-center">Criado em</th>
                  <th className="p-4 text-white/40 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const Icon = statusIcon[tenant.status] || AlertCircle
                  return (
                    <tr key={tenant.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                      <td className="p-4 text-white font-medium">{tenant.name}</td>
                      <td className="p-4 text-white/60">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> {tenant.email}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[tenant.status] || 'text-white/40'}`}>
                          <Icon className="w-3 h-3" />
                          {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4 text-center text-white/40">
                        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-center relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === tenant.id ? null : tenant.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenu === tenant.id && (
                          <div className="absolute right-4 top-12 z-10 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl py-1 min-w-36">
                            {tenant.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(tenant.id, 'suspended')}
                                className="w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-white/5 transition-colors"
                              >
                                Suspender
                              </button>
                            )}
                            {tenant.status === 'suspended' && (
                              <button
                                onClick={() => handleStatusChange(tenant.id, 'active')}
                                className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-white/5 transition-colors"
                              >
                                Reativar
                              </button>
                            )}
                            {tenant.status !== 'canceled' && (
                              <button
                                onClick={() => handleStatusChange(tenant.id, 'canceled')}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
