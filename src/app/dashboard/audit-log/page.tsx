'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface AuditLogEntry {
  id: string
  action: string
  resource: string
  resourceId?: string
  metadata: Record<string, unknown>
  ip?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Pagination {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

const ACTION_COLORS: Record<string, string> = {
  'agent.created': 'bg-green-500/20 text-green-300',
  'agent.updated': 'bg-blue-500/20 text-blue-300',
  'agent.deleted': 'bg-red-500/20 text-red-300',
  'orchestration.executed': 'bg-purple-500/20 text-purple-300',
  'organization.created': 'bg-green-500/20 text-green-300',
  'organization.updated': 'bg-blue-500/20 text-blue-300',
  'organization.deleted': 'bg-red-500/20 text-red-300',
  'member.invited': 'bg-yellow-500/20 text-yellow-300',
  'member.joined': 'bg-green-500/20 text-green-300',
  'member.removed': 'bg-red-500/20 text-red-300',
  'member.roleChanged': 'bg-blue-500/20 text-blue-300',
  'apiKey.created': 'bg-yellow-500/20 text-yellow-300',
  'apiKey.revoked': 'bg-red-500/20 text-red-300',
}

const DAYS_OPTIONS = [
  { label: 'Ultimas 24h', value: '1' },
  { label: 'Ultimos 7 dias', value: '7' },
  { label: 'Ultimos 30 dias', value: '30' },
]

const ACTION_OPTIONS = [
  { label: 'Todas as acoes', value: 'all' },
  { label: 'Agentes', value: 'agent' },
  { label: 'Orquestracoes', value: 'orchestration' },
  { label: 'Organizacoes', value: 'organization' },
  { label: 'Membros', value: 'member' },
  { label: 'API Keys', value: 'apiKey' },
]

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('7')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        days,
        page: String(page),
      })
      if (actionFilter !== 'all') params.set('action', actionFilter)

      const res = await fetch(`/api/dashboard/audit-log?${params}`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.data)
        setPagination(data.pagination)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [days, actionFilter, page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    setPage(1)
  }, [days, actionFilter])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ days })
      if (actionFilter !== 'all') params.set('action', actionFilter)
      window.open(`/api/dashboard/audit-log/export?${params}`, '_blank')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-zinc-400 mt-1">
            Historico de acoes na plataforma. Total: {pagination?.total ?? '...'} registros.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>
            {pagination
              ? `Pagina ${pagination.page} de ${pagination.totalPages} (${pagination.total} total)`
              : 'Carregando...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum registro encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-2 text-zinc-400 font-medium">Data</th>
                    <th className="text-left py-3 px-2 text-zinc-400 font-medium">Acao</th>
                    <th className="text-left py-3 px-2 text-zinc-400 font-medium">Resource</th>
                    <th className="text-left py-3 px-2 text-zinc-400 font-medium">Detalhes</th>
                    <th className="text-left py-3 px-2 text-zinc-400 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                      <td className="py-3 px-2 text-zinc-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          className={`text-xs ${ACTION_COLORS[log.action] || 'bg-zinc-700 text-zinc-300'}`}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-zinc-300 capitalize">{log.resource}</td>
                      <td className="py-3 px-2 text-zinc-500 max-w-xs truncate">
                        {log.metadata && typeof log.metadata === 'object'
                          ? Object.entries(log.metadata as Record<string, unknown>)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(', ')
                          : '—'}
                      </td>
                      <td className="py-3 px-2 text-zinc-500">{log.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-zinc-400">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasMore}
              >
                Proxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
