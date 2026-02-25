'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Clock, Loader2, Search } from 'lucide-react'

interface BetaApplication {
  id: string
  name: string
  email: string
  company: string | null
  useCase: string
  plan: string
  status: string
  createdAt: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function AdminBetaPage() {
  const [applications, setApplications] = useState<BetaApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/beta/admin?${params}`)
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications)
        setTotal(data.total)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleAction = async (applicationId: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'aprovar' : 'rejeitar'
    if (!confirm(`Tem certeza que deseja ${label} esta candidatura?`)) return
    setActionLoading(applicationId)
    try {
      const res = await fetch('/api/beta/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action }),
      })
      if (res.ok) {
        fetchApplications()
      } else {
        const data = await res.json()
        alert(`Erro: ${data.error}`)
      }
    } catch {
      alert('Erro de conexao')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = applications.filter(a =>
    search === '' ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.company || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Candidaturas Beta</h1>
        <p className="text-muted-foreground text-sm">{total} candidaturas no total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {['pending', 'approved', 'rejected'].map(s => {
          const cfg = statusConfig[s]
          const Icon = cfg.icon
          const count = applications.filter(a => a.status === s).length
          return (
            <Card key={s} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{cfg.label}</span>
              </div>
              <div className="text-2xl font-bold mt-1">{count}</div>
            </Card>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma candidatura encontrada
              </CardContent>
            </Card>
          ) : (
            filtered.map(app => {
              const cfg = statusConfig[app.status] || statusConfig.pending
              return (
                <Card key={app.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{app.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <Badge variant="outline" className="text-xs">{app.plan}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{app.email}</p>
                        {app.company && <p className="text-sm text-muted-foreground">{app.company}</p>}
                        <p className="text-sm mt-2 line-clamp-2">{app.useCase}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(app.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {app.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={actionLoading === app.id}
                            onClick={() => handleAction(app.id, 'approve')}
                          >
                            {actionLoading === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aprovar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === app.id}
                            onClick={() => handleAction(app.id, 'reject')}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Pagina {page}</span>
          <Button variant="outline" size="sm" disabled={applications.length < 20} onClick={() => setPage(p => p + 1)}>
            Proxima
          </Button>
        </div>
      )}
    </div>
  )
}
