'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Send,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledPost {
  id: string
  text: string
  scheduledAt: string
  status: 'pending' | 'published' | 'failed' | 'cancelled'
  postId: string | null
  createdBy: string | null
  approvedBy: string | null
  publishedAt: string | null
  errorMsg: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDatetime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function statusConfig(status: string) {
  switch (status) {
    case 'pending':   return { label: 'Agendado', color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30',  Icon: Clock }
    case 'published': return { label: 'Publicado', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', Icon: CheckCircle2 }
    case 'failed':    return { label: 'Falhou',   color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30',    Icon: XCircle }
    case 'cancelled': return { label: 'Cancelado', color: 'text-gray-500',   bg: 'bg-gray-500/10 border-gray-500/20',  Icon: XCircle }
    default:          return { label: status,      color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20',  Icon: AlertCircle }
  }
}

// ─── Add Post Modal ───────────────────────────────────────────────────────────

function AddPostModal({
  defaultDate,
  onClose,
  onSaved,
}: {
  defaultDate: Date
  onClose: () => void
  onSaved: () => void
}) {
  const toLocalDatetimeInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(defaultDate)
    d.setHours(10, 0, 0, 0)
    return toLocalDatetimeInput(d)
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const charCount = text.length
  const overLimit = charCount > 500

  const handleSave = async () => {
    setError('')
    if (!text.trim()) { setError('Texto é obrigatório'); return }
    if (overLimit) { setError('Texto excede 500 caracteres'); return }
    if (!scheduledAt) { setError('Data e hora são obrigatórias'); return }

    const scheduledDate = new Date(scheduledAt)
    if (scheduledDate <= new Date()) { setError('A data deve ser no futuro'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/threads/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          scheduledAt: scheduledDate.toISOString(),
          createdBy: 'user',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao agendar post'); return }
      onSaved()
      onClose()
    } catch {
      setError('Erro de rede')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Agendar Post</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {/* Text area */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Texto do post</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Digite o texto do post para o Threads..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
            <div className={`mt-1 text-right text-xs ${overLimit ? 'text-red-400' : charCount > 450 ? 'text-amber-400' : 'text-gray-600'}`}>
              {charCount}/500
            </div>
          </div>

          {/* Date/time */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Data e hora de publicação</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all [color-scheme:dark]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || overLimit}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2 text-sm font-medium text-white shadow-lg transition-all hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {saving ? 'Agendando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onApprove,
  onCancel,
  approving,
  cancelling,
}: {
  post: ScheduledPost
  onApprove: (id: string) => void
  onCancel: (id: string) => void
  approving: string | null
  cancelling: string | null
}) {
  const { label, color, bg, Icon } = statusConfig(post.status)
  const [expanded, setExpanded] = useState(false)
  const snippet = post.text.length > 80 ? post.text.slice(0, 80) + '…' : post.text

  return (
    <div className={`rounded-xl border p-3 transition-all ${bg}`}>
      {/* Status + time */}
      <div className="flex items-center justify-between mb-1.5">
        <div className={`flex items-center gap-1 text-xs font-medium ${color}`}>
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <span className="text-xs text-gray-500">{formatTime(post.scheduledAt)}</span>
      </div>

      {/* Text */}
      <p
        className="text-xs text-gray-300 leading-relaxed cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? post.text : snippet}
      </p>

      {/* Actions */}
      {post.status === 'pending' && (
        <div className="mt-2 flex items-center gap-1.5">
          {!post.approvedBy && (
            <button
              onClick={() => onApprove(post.id)}
              disabled={approving === post.id}
              className="flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              {approving === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Aprovar
            </button>
          )}
          {post.approvedBy && (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs text-emerald-500">
              <CheckCircle2 className="h-3 w-3" />
              Aprovado
            </span>
          )}
          <button
            onClick={() => onCancel(post.id)}
            disabled={cancelling === post.id}
            className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            {cancelling === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Cancelar
          </button>
        </div>
      )}

      {/* Published info */}
      {post.status === 'published' && post.postId && (
        <p className="mt-1.5 text-xs text-gray-500">
          ID: <span className="font-mono text-emerald-600">{post.postId.slice(0, 16)}…</span>
          {post.publishedAt && ` · ${formatDatetime(post.publishedAt)}`}
        </p>
      )}

      {/* Error */}
      {post.status === 'failed' && post.errorMsg && (
        <p className="mt-1.5 text-xs text-red-400 line-clamp-2">{post.errorMsg}</p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ThreadsCalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [approving, setApproving] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const weekDays = getWeekDays(weekOffset)
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(weekStart)
      from.setHours(0, 0, 0, 0)
      const to = new Date(weekEnd)
      to.setHours(23, 59, 59, 999)

      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      })
      const res = await fetch(`/api/threads/schedule?${params}`)
      const data = await res.json()
      if (data.success) setPosts(data.data ?? [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleApprove = async (id: string) => {
    setApproving(id)
    try {
      await fetch(`/api/threads/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: true }),
      })
      await fetchPosts()
    } finally {
      setApproving(null)
    }
  }

  const handleCancel = async (id: string) => {
    setCancelling(id)
    try {
      await fetch(`/api/threads/schedule/${id}`, { method: 'DELETE' })
      await fetchPosts()
    } finally {
      setCancelling(null)
    }
  }

  // Stats
  const totalPosts = posts.length
  const pendingPosts = posts.filter((p) => p.status === 'pending').length
  const publishedPosts = posts.filter((p) => p.status === 'published').length

  // Filtered
  const filteredPosts = filterStatus === 'all' ? posts : posts.filter((p) => p.status === filterStatus)

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Calendário de Conteúdo</h1>
                <p className="text-sm text-gray-500">Threads — fila de publicação agendada</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setSelectedDay(new Date()); setShowModal(true) }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/25 hover:from-purple-500 hover:to-violet-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Agendar post
          </button>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Esta semana', value: totalPosts, color: 'text-white' },
            { label: 'Pendentes', value: pendingPosts, color: 'text-amber-400' },
            { label: 'Publicados', value: publishedPosts, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="mt-0.5 text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Week navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-white">
              {weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {' — '}
              {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400 hover:text-white transition-all"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1.5">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'published', label: 'Publicados' },
              { value: 'cancelled', label: 'Cancelados' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`rounded-lg px-3 py-1 text-xs transition-all ${
                  filterStatus === value
                    ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                    : 'border border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date())
              const dayPosts = filteredPosts.filter((p) => isSameDay(new Date(p.scheduledAt), day))

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[200px] rounded-xl border p-3 transition-all ${
                    isToday
                      ? 'border-purple-500/40 bg-purple-500/5'
                      : 'border-white/8 bg-white/3 hover:border-white/15'
                  }`}
                >
                  {/* Day header */}
                  <div className="mb-2.5 flex items-center justify-between">
                    <div>
                      <div className={`text-xs font-medium uppercase tracking-wider ${isToday ? 'text-purple-400' : 'text-gray-500'}`}>
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-bold leading-tight ${isToday ? 'text-purple-300' : 'text-white'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedDay(day); setShowModal(true) }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-600 hover:bg-white/10 hover:text-gray-300 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Posts */}
                  <div className="space-y-2">
                    {dayPosts.length === 0 ? (
                      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/8">
                        <span className="text-xs text-gray-700">vazio</span>
                      </div>
                    ) : (
                      dayPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onApprove={handleApprove}
                          onCancel={handleCancel}
                          approving={approving}
                          cancelling={cancelling}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredPosts.length === 0 && (
          <div className="mt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Edit3 className="h-7 w-7 text-gray-500" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">Nenhum post agendado</h3>
            <p className="mb-4 text-sm text-gray-500">
              Agende posts para esta semana ou deixe o Gestor criar a fila automaticamente.
            </p>
            <button
              onClick={() => { setSelectedDay(new Date()); setShowModal(true) }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-all"
            >
              <Plus className="h-4 w-4" />
              Agendar primeiro post
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddPostModal
          defaultDate={selectedDay}
          onClose={() => setShowModal(false)}
          onSaved={fetchPosts}
        />
      )}
    </div>
  )
}
