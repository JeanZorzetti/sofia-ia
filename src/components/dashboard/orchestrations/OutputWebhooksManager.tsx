'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, CheckCircle, Hash, Loader2, Mail, Plus, Save, Trash2, Webhook, XCircle } from 'lucide-react'

type WebhookType = 'webhook' | 'email' | 'slack'

interface OutputWebhook {
  type: WebhookType
  url?: string
  webhookUrl?: string
  to?: string
  subject?: string
  secret?: string
  enabled: boolean
}

interface OutputWebhooksManagerProps {
  outputWebhooks: OutputWebhook[]
  savingWebhooks: boolean
  executions: any[]
  onWebhooksChange: (webhooks: OutputWebhook[]) => void
  onSave: () => void
}

export function OutputWebhooksManager({
  outputWebhooks,
  savingWebhooks,
  executions,
  onWebhooksChange,
  onSave,
}: OutputWebhooksManagerProps) {
  const [newType, setNewType] = useState<WebhookType>('webhook')
  const [newValue, setNewValue] = useState('')

  const handleAdd = () => {
    const value = newValue.trim()
    if (!value) return
    const entry: OutputWebhook =
      newType === 'webhook'
        ? { type: 'webhook', url: value, enabled: true }
        : newType === 'slack'
        ? { type: 'slack', webhookUrl: value, enabled: true }
        : { type: 'email', to: value, enabled: true }
    onWebhooksChange([...outputWebhooks, entry])
    setNewValue('')
  }

  const handleRemove = (index: number) => {
    onWebhooksChange(outputWebhooks.filter((_, i) => i !== index))
  }

  const handleToggle = (index: number) => {
    onWebhooksChange(outputWebhooks.map((w, i) => (i === index ? { ...w, enabled: !w.enabled } : w)))
  }

  // Collect dispatch history from executions
  const dispatches: any[] = []
  for (const exec of (executions || []).slice(0, 5)) {
    const wh = exec?.output?.webhookDispatches
    if (Array.isArray(wh)) wh.forEach((d: any) => dispatches.push({ ...d, executionId: exec.id }))
  }

  return (
    <Card className="bg-gray-900/50 border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg text-white">Outputs & Notificações</CardTitle>
          </div>
          <Button size="sm" onClick={onSave} disabled={savingWebhooks} className="gap-1.5">
            {savingWebhooks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {savingWebhooks ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <CardDescription className="text-white/50 text-xs">
          Envie o resultado da execução para webhook, e-mail ou Slack automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configured outputs */}
        {outputWebhooks.length > 0 ? (
          <div className="space-y-2">
            {outputWebhooks.map((wh, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                <div className="flex-shrink-0">
                  {wh.type === 'email' ? (
                    <Mail className="h-4 w-4 text-blue-400" />
                  ) : wh.type === 'slack' ? (
                    <Hash className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Webhook className="h-4 w-4 text-green-400" />
                  )}
                </div>
                <span className="flex-1 text-sm text-white/80 truncate font-mono">
                  {wh.type === 'email' ? wh.to : wh.type === 'slack' ? wh.webhookUrl : wh.url}
                </span>
                <Switch checked={wh.enabled} onCheckedChange={() => handleToggle(idx)} className="flex-shrink-0" />
                <button
                  onClick={() => handleRemove(idx)}
                  className="flex-shrink-0 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 text-center py-2">Nenhum output configurado.</p>
        )}

        {/* Dispatch history */}
        {dispatches.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Histórico de disparos</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {dispatches.slice(0, 10).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                  {d.status === 'sent'
                    ? <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                  <span className="capitalize text-white/50">{d.type}</span>
                  <span className="truncate flex-1 font-mono">{d.destination}</span>
                  {d.error && <span className="text-red-400 truncate max-w-[120px]">{d.error}</span>}
                  <span className="text-white/30 flex-shrink-0">
                    {d.sentAt ? new Date(d.sentAt).toLocaleTimeString('pt-BR') : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new output */}
        <div className="flex gap-2 pt-1">
          <Select value={newType} onValueChange={(v) => setNewType(v as WebhookType)}>
            <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="flex-1 bg-white/5 border-white/10 text-white text-xs h-8 placeholder:text-white/30"
            placeholder={newType === 'email' ? 'email@exemplo.com' : 'https://...'}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-8 px-3">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
