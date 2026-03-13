'use client'

import { useState, useEffect, Suspense } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Loader2, CalendarDays, ArrowLeft, RefreshCw, Zap } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface Agent {
  id: string
  name: string
  config: Record<string, unknown>
}

function GoogleCalendarContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [agents, setAgents] = useState<Agent[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkStatus()
    fetchAgents()
  }, [])

  useEffect(() => {
    const s = searchParams.get('success')
    const e = searchParams.get('error')
    if (s) toast.success('Google Calendar conectado com sucesso!')
    if (e) toast.error(`Erro: ${e}`)
  }, [searchParams])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google-calendar/status')
      const data = await res.json()
      setStatus(data.connected ? 'connected' : 'disconnected')
      setMetadata(data.metadata || {})
    } catch {
      setStatus('disconnected')
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(
        (data.agents || []).map((a: { id: string; name: string; config: unknown }) => ({
          id: a.id,
          name: a.name,
          config: (a.config || {}) as Record<string, unknown>,
        }))
      )
    } catch { /* ignore */ }
  }

  const handleConnect = () => {
    window.location.href = '/api/integrations/google-calendar/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar Google Calendar?')) return
    await fetch('/api/integrations/google-calendar/disconnect', { method: 'DELETE' })
    setStatus('disconnected')
    setMetadata({})
  }

  const toggleCalendarForAgent = async (agentId: string, currentConfig: Record<string, unknown>) => {
    // Se já está habilitado, desabilitar
    const willEnable = !currentConfig.calendarEnabled

    // Ao habilitar, guardar o userId do OAuth no config do agente
    let calendarUserId = currentConfig.calendarUserId
    if (willEnable && !calendarUserId) {
      // Buscar o userId do usuário atual a partir do status
      const statusRes = await fetch('/api/integrations/google-calendar/status')
      const statusData = await statusRes.json()
      if (!statusData.connected) {
        toast.error('Conecte o Google Calendar primeiro')
        return
      }
      // O calendarUserId será injetado pelo backend ao salvar
      calendarUserId = 'auto'
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            ...currentConfig,
            calendarEnabled: willEnable,
            // calendarUserId será preenchido pelo backend via /api/agents/[id]/enable-calendar
          },
        }),
      })

      if (res.ok) {
        toast.success(willEnable ? 'Calendário habilitado no agente!' : 'Calendário desabilitado')
        fetchAgents()
      } else {
        toast.error('Erro ao atualizar agente')
      }
    } finally {
      setSaving(false)
    }
  }

  const enableCalendarForAgent = async (agentId: string, agentConfig: Record<string, unknown>) => {
    setSaving(true)
    try {
      // Habilitar calendário + salvar calendarUserId do usuário logado
      const res = await fetch(`/api/agents/${agentId}/enable-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        toast.success('Calendário habilitado! O agente já pode agendar reuniões.')
        fetchAgents()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao habilitar calendário')
      }
    } finally {
      setSaving(false)
    }
  }

  const disableCalendarForAgent = async (agentId: string, agentConfig: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { ...agentConfig, calendarEnabled: false, calendarUserId: null },
        }),
      })
      if (res.ok) {
        toast.success('Calendário desabilitado')
        fetchAgents()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/integrations">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Integrações</Button>
        </Link>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Google Calendar</h1>
        </div>
      </div>

      {/* Conexão OAuth */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conta Google</CardTitle>
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'connected' && <Badge className="bg-green-100 text-green-800">Conectado</Badge>}
            {status === 'disconnected' && <Badge variant="secondary">Desconectado</Badge>}
          </div>
          <CardDescription>Conecte uma conta Google com acesso ao Google Calendar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'connected' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{metadata.email || 'Conta conectada'}</p>
                {metadata.name && <p className="text-sm text-green-600">{metadata.name}</p>}
              </div>
            </div>
          )}
          {status === 'disconnected' && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <XCircle className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-500">Nenhuma conta conectada</p>
            </div>
          )}
          <div className="flex gap-2">
            {status === 'connected' ? (
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>Desconectar</Button>
            ) : (
              <Button onClick={handleConnect} disabled={status === 'loading'}>
                <CalendarDays className="h-4 w-4 mr-2" />Conectar Google Calendar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={checkStatus}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Agentes */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />Habilitar por Agente
            </CardTitle>
            <CardDescription>
              Escolha quais agentes podem agendar, cancelar e reagendar reuniões pelo WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum agente encontrado.</p>
            )}
            {agents.map(agent => {
              const enabled = !!agent.config.calendarEnabled
              return (
                <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    {enabled && (
                      <p className="text-xs text-green-600">Calendário ativo — pode agendar reuniões</p>
                    )}
                  </div>
                  {enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disableCalendarForAgent(agent.id, agent.config)}
                      disabled={saving}
                    >
                      Desabilitar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => enableCalendarForAgent(agent.id, agent.config)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Habilitar'}
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Como funciona */}
      <Card>
        <CardHeader><CardTitle>Como funciona</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <p className="font-medium">O agente detecta intenção de agendamento na conversa e:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Coleta nome, email e data/hora do usuário</li>
              <li>Verifica disponibilidade no Google Calendar</li>
              <li>Cria evento com link Google Meet e convida o participante</li>
              <li>Envia confirmação com data e link pelo WhatsApp</li>
            </ol>
          </div>
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="font-medium">Lembretes automáticos (cron):</p>
            <p className="text-muted-foreground">• 2 horas antes da reunião</p>
            <p className="text-muted-foreground">• 5 minutos antes da reunião</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Adicione <code className="bg-muted px-1 rounded">*/5 * * * *</code> no Vercel/Easypanel apontando para{' '}
            <code className="bg-muted px-1 rounded">/api/cron/calendar-reminders</code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GoogleCalendarPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <GoogleCalendarContent />
    </Suspense>
  )
}
