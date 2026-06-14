// src/app/dashboard/teams/RosterEditor.tsx
// Shared roster editor used by both create (page.tsx) and edit (EditTeamModal).
// The model picker reflects availability from /api/models: a colored dot per
// status and unavailable models disabled (a run with a dead provider fails).
'use client'

import { Cpu, Crown, Hammer, ShieldCheck } from 'lucide-react'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export type Role = 'lead' | 'worker' | 'reviewer'
export type Availability = 'available' | 'unavailable' | 'unknown'
export interface AgentLite { id: string; name: string }
export interface ModelOption { id: string; name: string; provider: string; availability?: Availability }
export interface RosterRow { agentId: string; role: Role; model: string; effort: string }

export const INHERIT = 'inherit'

const EFFORTS = [
  { value: INHERIT, label: 'Effort: auto' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const ROLE_CHIP: Record<Role, string> = {
  lead: 'bg-amber-500/20 text-amber-400',
  worker: 'bg-blue-500/20 text-blue-400',
  reviewer: 'bg-purple-500/20 text-purple-400',
}
const ROLE_ICON: Record<Role, typeof Crown> = { lead: Crown, worker: Hammer, reviewer: ShieldCheck }
const ROLE_LABEL: Record<Role, string> = { lead: 'Lead', worker: 'Worker', reviewer: 'Reviewer' }

function dotCls(status?: Availability) {
  return status === 'available' ? 'bg-emerald-400'
    : status === 'unavailable' ? 'bg-red-400'
    : status === 'unknown' ? 'bg-amber-400'
    : 'bg-white/30'
}

/** Build the roster for the API: 'inherit' sentinel → null. */
export function rosterToMembers(rows: RosterRow[]) {
  return rows.map((r, i) => ({
    agentId: r.agentId,
    role: r.role,
    model: r.model === INHERIT ? null : r.model,
    effort: r.effort === INHERIT ? null : r.effort,
    position: i,
  }))
}

export default function RosterEditor({ agents, models, value, onChange }: {
  agents: AgentLite[]
  models: ModelOption[]
  value: RosterRow[]
  onChange: (rows: RosterRow[]) => void
}) {
  const providers = Array.from(new Set(models.map(m => m.provider)))
  const triggerCls = 'h-8 bg-white/5 border-white/10 text-white text-xs'
  const contentCls = 'bg-[#0a0a0b] border-white/10 text-white'

  function toggleAgent(agentId: string) {
    onChange(
      value.some(r => r.agentId === agentId)
        ? value.filter(r => r.agentId !== agentId)
        : [...value, { agentId, role: value.length === 0 ? 'lead' : 'worker', model: INHERIT, effort: INHERIT }],
    )
  }
  const patchRow = (agentId: string, patch: Partial<RosterRow>) =>
    onChange(value.map(r => (r.agentId === agentId ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-2">
      {agents.length === 0 && <p className="text-white/40 text-sm">Nenhum agente disponível. Crie um agente primeiro.</p>}
      {agents.map(a => {
        const row = value.find(r => r.agentId === a.id)
        const selected = !!row
        return (
          <div
            key={a.id}
            className={`rounded-lg border p-3 transition-colors ${selected ? 'border-white/20 bg-white/[0.07]' : 'border-white/10 bg-white/[0.02]'}`}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-blue-500" checked={selected} onChange={() => toggleAgent(a.id)} />
              <span className="text-sm text-white font-medium flex-1">{a.name}</span>
              {row && (() => {
                const Icon = ROLE_ICON[row.role]
                return (
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_CHIP[row.role]}`}>
                    <Icon className="h-3 w-3" /> {ROLE_LABEL[row.role]}
                  </span>
                )
              })()}
            </label>

            {row && (
              <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                <Select value={row.role} onValueChange={v => patchRow(a.id, { role: v as Role })}>
                  <SelectTrigger className={`${triggerCls} w-[120px]`}><SelectValue /></SelectTrigger>
                  <SelectContent className={contentCls}>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-white/30" />
                  <Select value={row.model} onValueChange={v => patchRow(a.id, { model: v })}>
                    <SelectTrigger className={`${triggerCls} w-[200px]`}><SelectValue /></SelectTrigger>
                    <SelectContent className={contentCls}>
                      <SelectItem value={INHERIT}>Herdar do agente</SelectItem>
                      {providers.map(prov => (
                        <SelectGroup key={prov}>
                          <SelectLabel className="text-white/40 text-[11px] uppercase tracking-wider">{prov}</SelectLabel>
                          {models.filter(m => m.provider === prov).map(m => (
                            <SelectItem key={m.id} value={m.id} disabled={m.availability === 'unavailable'}>
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${dotCls(m.availability)}`} />
                                {m.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={row.effort} onValueChange={v => patchRow(a.id, { effort: v })}>
                  <SelectTrigger className={`${triggerCls} w-[120px]`}><SelectValue /></SelectTrigger>
                  <SelectContent className={contentCls}>
                    {EFFORTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
