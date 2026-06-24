'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bot, UserPlus, X } from 'lucide-react'
import { LAYER_LABEL, LAYER_ORDER, type CompanyRoleDTO, type AgentOption } from './types'

interface OrgChartProps {
  roles: CompanyRoleDTO[]
  agents: AgentOption[]
  onStaff: (roleKey: string, agentId: string) => Promise<void> | void
  onUnstaff: (roleKey: string) => Promise<void> | void
}

function RoleNode({ role, agents, onStaff, onUnstaff }: { role: CompanyRoleDTO } & Pick<OrgChartProps, 'agents' | 'onStaff' | 'onUnstaff'>) {
  const [busy, setBusy] = useState(false)
  const occupied = !!role.agent

  const handleStaff = async (agentId: string) => {
    setBusy(true)
    try { await onStaff(role.key, agentId) } finally { setBusy(false) }
  }
  const handleUnstaff = async () => {
    setBusy(true)
    try { await onUnstaff(role.key) } finally { setBusy(false) }
  }

  return (
    <Card className={`p-3 border ${occupied ? 'border-white/10 bg-card' : 'border-dashed border-amber-400/30 bg-amber-500/5'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{role.title}</p>
          {role.department && <p className="text-[11px] text-white/40 truncate">{role.department}</p>}
        </div>
        {occupied
          ? <Badge variant="default" className="text-[10px] shrink-0">Ocupado</Badge>
          : <Badge variant="outline" className="text-[10px] shrink-0 border-amber-400/40 text-amber-300">Vaga</Badge>}
      </div>

      <div className="mt-3">
        {occupied ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1.5">
            <span className="flex items-center gap-1.5 min-w-0 text-xs text-white/80">
              <Bot className="h-3.5 w-3.5 shrink-0 text-blue-300" />
              <span className="truncate">{role.agent!.name}</span>
            </span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" disabled={busy} onClick={handleUnstaff} title="Desencaixar">
              <X className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </div>
        ) : (
          <Select disabled={busy || agents.length === 0} onValueChange={handleStaff}>
            <SelectTrigger className="h-8 text-xs">
              <span className="flex items-center gap-1.5 text-white/50">
                <UserPlus className="h-3.5 w-3.5" />
                <SelectValue placeholder={agents.length ? 'Encaixar agente…' : 'Sem agentes'} />
              </span>
            </SelectTrigger>
            <SelectContent>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </Card>
  )
}

export function OrgChart({ roles, agents, onStaff, onUnstaff }: OrgChartProps) {
  return (
    <div className="space-y-6">
      {LAYER_ORDER.map(layer => {
        const layerRoles = roles.filter(r => r.layer === layer)
        if (layerRoles.length === 0) return null
        return (
          <section key={layer}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">{LAYER_LABEL[layer]}</h3>
              <span className="text-xs text-white/30">{layerRoles.length} cargo{layerRoles.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {layerRoles.map(role => (
                <RoleNode key={role.id} role={role} agents={agents} onStaff={onStaff} onUnstaff={onUnstaff} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
