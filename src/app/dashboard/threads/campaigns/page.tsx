'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Play,
  Pause,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignPost {
  id: string
  position: number
  tema: string
  angle?: string
  status: string
  scheduledAt?: string
}

interface Campaign {
  id: string
  name: string
  objective: string
  theme: string
  description?: string
  status: string
  startDate: string
  endDate: string
  posts: CampaignPost[]
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OBJECTIVES = {
  awareness: { label: 'Awareness', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  leads: { label: 'Leads', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  activation: { label: 'Ativação', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
  retention: { label: 'Retenção', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  engagement: { label: 'Engajamento', color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-500/30' },
}

const STATUSES = {
  planning: { label: 'Planejamento', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', Icon: Clock },
  approved: { label: 'Aprovada', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', Icon: CheckCircle2 },
  active: { label: 'Ativa', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', Icon: Zap },
  completed: { label: 'Concluída', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', Icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', Icon: XCircle },
}

const POST_STATUSES = {
  draft: { label: 'Rascunho', color: 'text-gray-500' },
  approved: { label: 'Aprovado', color: 'text-blue-400' },
  scheduled: { label: 'Agendado', color: 'text-amber-400' },
  published: { label: 'Publicado', color: 'text-emerald-400' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── New Campaign Modal ───────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    objective: 'awareness',
    theme: '',
    description: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    if (!form.theme.trim()) { setError('Tema central é obrigatório'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/threads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao criar campanha'); return }
      onSaved()
      onClose()
    } catch { setError('Erro de rede') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Nova Campanha</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Nome da campanha</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder='ex: "Semana de Automação", "Lançamento Plano Pro"'
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Objetivo</label>
            <select
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/50 transition-all [color-scheme:dark]"
            >
              {Object.entries(OBJECTIVES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Tema central</label>
            <input
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              placeholder='ex: "Como a IA está mudando o marketing digital em 2026"'
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Descrição (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Contexto adicional para os agentes..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Início</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/50 transition-all [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Fim</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/50 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2 text-sm font-medium text-white shadow-lg hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
            {saving ? 'Criando...' : 'Criar campanha'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onStatusChange,
  updatingId,
}: {
  campaign: Campaign
  onStatusChange: (id: string, status: string) => void
  updatingId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const st = STATUSES[campaign.status as keyof typeof STATUSES] ?? STATUSES.planning
  const obj = OBJECTIVES[campaign.objective as keyof typeof OBJECTIVES] ?? OBJECTIVES.awareness
  const { Icon } = st

  const days = daysRemaining(campaign.endDate)
  const totalPosts = campaign.posts.length
  const publishedPosts = campaign.posts.filter((p) => p.status === 'published').length
  const scheduledPosts = campaign.posts.filter((p) => p.status === 'scheduled').length
  const progress = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}>
                <Icon className="h-3 w-3" />
                {st.label}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${obj.bg} ${obj.color}`}>
                {obj.label}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">{campaign.name}</h3>
            <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{campaign.theme}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {campaign.status === 'planning' && (
              <button
                onClick={() => onStatusChange(campaign.id, 'approved')}
                disabled={updatingId === campaign.id}
                className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
              >
                {updatingId === campaign.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Aprovar
              </button>
            )}
            {campaign.status === 'approved' && (
              <button
                onClick={() => onStatusChange(campaign.id, 'active')}
                disabled={updatingId === campaign.id}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Play className="h-3 w-3" />
                Ativar
              </button>
            )}
            {campaign.status === 'active' && (
              <button
                onClick={() => onStatusChange(campaign.id, 'completed')}
                disabled={updatingId === campaign.id}
                className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-50"
              >
                <Pause className="h-3 w-3" />
                Concluir
              </button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}
          </span>
          {days > 0 && campaign.status === 'active' && (
            <span className="text-amber-500">{days}d restantes</span>
          )}
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {totalPosts} posts
          </span>
          {scheduledPosts > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="h-3 w-3" />
              {scheduledPosts} agendados
            </span>
          )}
          {publishedPosts > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {publishedPosts} publicados
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalPosts > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
              <span>Progresso</span>
              <span>{progress}% ({publishedPosts}/{totalPosts})</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Posts expandable */}
      {totalPosts > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between border-t border-white/8 px-5 py-3 text-xs text-gray-500 hover:bg-white/3 transition-all"
          >
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3" />
              {totalPosts} posts na campanha
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="border-t border-white/8 px-5 py-3 space-y-2">
              {campaign.posts.map((post) => {
                const ps = POST_STATUSES[post.status as keyof typeof POST_STATUSES] ?? POST_STATUSES.draft
                return (
                  <div key={post.id} className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/3 px-3 py-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-white/8 text-xs font-bold text-gray-500">
                      {post.position + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-gray-300 line-clamp-1">{post.tema}</span>
                    <span className={`flex-shrink-0 text-xs font-medium ${ps.color}`}>{ps.label}</span>
                    {post.scheduledAt && (
                      <span className="flex-shrink-0 text-xs text-gray-600">
                        {new Date(post.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ThreadsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterStatus !== 'all' ? `/api/threads/campaigns?status=${filterStatus}` : '/api/threads/campaigns'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) setCampaigns(data.data ?? [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      await fetch(`/api/threads/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await fetchCampaigns()
    } finally {
      setUpdatingId(null)
    }
  }

  // Stats
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length
  const planningCampaigns = campaigns.filter((c) => c.status === 'planning').length
  const totalPosts = campaigns.reduce((s, c) => s + c.posts.length, 0)

  const filtered = filterStatus === 'all' ? campaigns : campaigns.filter((c) => c.status === filterStatus)

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 shadow-lg shadow-orange-500/25">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Campanhas de Conteúdo</h1>
              <p className="text-sm text-gray-500">Threads — séries temáticas com arco narrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/orchestrations"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <Zap className="h-3.5 w-3.5" />
              Planejar com IA
            </a>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:from-orange-400 hover:to-pink-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              Nova campanha
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Campanhas ativas', value: activeCampaigns, color: 'text-emerald-400' },
            { label: 'Em planejamento', value: planningCampaigns, color: 'text-amber-400' },
            { label: 'Posts planejados', value: totalPosts, color: 'text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="mt-0.5 text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-1.5">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'planning', label: 'Planejamento' },
            { value: 'approved', label: 'Aprovadas' },
            { value: 'active', label: 'Ativas' },
            { value: 'completed', label: 'Concluídas' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                filterStatus === value
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                  : 'border border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Megaphone className="h-7 w-7 text-gray-600" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">Nenhuma campanha</h3>
            <p className="mb-4 text-sm text-gray-500">
              Crie uma campanha manualmente ou use a Orquestração{' '}
              <strong className="text-gray-300">Planejamento de Campanha Threads</strong> para gerar tudo automaticamente.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-all"
            >
              <Plus className="h-4 w-4" />
              Criar primeira campanha
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onStatusChange={handleStatusChange}
                updatingId={updatingId}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewCampaignModal
          onClose={() => setShowModal(false)}
          onSaved={fetchCampaigns}
        />
      )}
    </div>
  )
}
