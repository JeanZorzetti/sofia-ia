// src/app/dashboard/teams/RosterEditor.tsx
// Shared roster editor used by both create (page.tsx) and edit (EditTeamModal).
// The model picker reflects availability from /api/models: a colored dot per
// status and unavailable models disabled (a run with a dead provider fails).
// S1.3 (Teams V2 — Tema A): per-member tool-capability controls (tri-state Herdar/
// Ligar/Desligar + MCP multiselect + tool-skills/filesystem toggles). The pure
// roster<->payload mapping lives in ./roster-mapping so v2s3-verify can test it.
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Cpu, Crown, Hammer, ShieldCheck, Search, Wrench, Server } from 'lucide-react'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  INHERIT, rosterToMembers, mcpConnectionToOption,
  type Role, type RosterRow, type McpOption,
} from './roster-mapping'

// Re-exported so existing importers (page.tsx) keep importing from './RosterEditor'.
export { INHERIT, rosterToMembers }
export type { Role, RosterRow }

export type Availability = 'available' | 'unavailable' | 'unknown'
export interface AgentLite { id: string; name: string }
export interface ModelOption { id: string; name: string; provider: string; availability?: Availability }

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

// Tri-state tool gate (decision S1.3 #2): Herdar = no policy written (legacy coder gate),
// Ligar = capabilities.tools:true (reveals MCP/skills/filesystem), Desligar = tools:false.
type ToolMode = 'inherit' | 'on' | 'off'
const TOOL_MODE_HINT: Record<ToolMode, string> = {
  inherit: 'usa o gate padrão (modelo coder)',
  on: 'habilita function calling neste membro',
  off: 'desliga todas as ferramentas, mesmo em modelo coder',
}
function toolModeOf(row: RosterRow): ToolMode {
  if (!row.caps) return 'inherit'
  if (row.caps.tools === false) return 'off'
  return 'on'
}

function dotCls(status?: Availability) {
  return status === 'available' ? 'bg-emerald-400'
    : status === 'unavailable' ? 'bg-red-400'
    : status === 'unknown' ? 'bg-amber-400'
    : 'bg-white/30'
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

  const [query, setQuery] = useState('')

  // MCP servers per agent for the multiselect: lazy fetch on first "Ligar", cached by
  // agentId (decision S1.3 #3). The ref guarantees one fetch per agent even across the
  // effect re-running (agents can have 0..N servers — no N up-front requests).
  const [mcpCache, setMcpCache] = useState<Record<string, McpOption[] | 'loading'>>({})
  const fetchedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    value.forEach(r => {
      if (r.caps?.tools === true && !fetchedRef.current.has(r.agentId)) {
        const agentId = r.agentId
        fetchedRef.current.add(agentId)
        setMcpCache(c => ({ ...c, [agentId]: 'loading' }))
        fetch(`/api/agents/${agentId}/mcp`)
          .then(res => res.json())
          .then(j => {
            const opts = (j?.success && Array.isArray(j.data) ? j.data : []).map(mcpConnectionToOption)
            setMcpCache(c => ({ ...c, [agentId]: opts }))
          })
          .catch(() => setMcpCache(c => ({ ...c, [agentId]: [] })))
      }
    })
  }, [value])

  function toggleAgent(agentId: string) {
    onChange(
      value.some(r => r.agentId === agentId)
        ? value.filter(r => r.agentId !== agentId)
        : [...value, { agentId, role: value.length === 0 ? 'lead' : 'worker', model: INHERIT, effort: INHERIT }],
    )
  }
  const patchRow = (agentId: string, patch: Partial<RosterRow>) =>
    onChange(value.map(r => (r.agentId === agentId ? { ...r, ...patch } : r)))

  function setToolMode(agentId: string, mode: ToolMode) {
    const row = value.find(r => r.agentId === agentId)
    if (mode === 'inherit') return patchRow(agentId, { caps: undefined })
    if (mode === 'off') return patchRow(agentId, { caps: { tools: false } })
    // 'on': keep sub-fields if we were already on, else start minimal { tools:true }.
    const prev = row?.caps && row.caps.tools !== false ? row.caps : {}
    patchRow(agentId, { caps: { ...prev, tools: true } })
  }

  // MCP multiselect: absent allowlist = all servers allowed; toggling normalizes "all
  // selected" back to absent (byte-identical to legacy: every MCP tool passes).
  const mcpChecked = (row: RosterRow, amsId: string) => {
    const allow = row.caps?.mcpAllowlist
    return allow ? allow.includes(amsId) : true
  }
  function toggleMcp(agentId: string, amsId: string, allIds: string[]) {
    const row = value.find(r => r.agentId === agentId)
    if (!row?.caps) return
    const current = row.caps.mcpAllowlist ?? allIds
    const next = current.includes(amsId) ? current.filter(x => x !== amsId) : [...current, amsId]
    const caps = { ...row.caps }
    if (next.length === allIds.length && allIds.every(id => next.includes(id))) delete caps.mcpAllowlist
    else caps.mcpAllowlist = next
    patchRow(agentId, { caps })
  }
  // toolSkills/filesystem: absent → inherit (included); explicit false → excluded. Keep the
  // object minimal — checked drops the key, unchecked writes false (matches selectApiTools).
  function setFlag(agentId: string, key: 'toolSkills' | 'filesystem', enabled: boolean) {
    const row = value.find(r => r.agentId === agentId)
    if (!row?.caps) return
    const caps = { ...row.caps }
    if (enabled) delete caps[key]
    else caps[key] = false
    patchRow(agentId, { caps })
  }

  // Selected agents float to the top so the active roster stays visible no
  // matter how many agents exist; then filter by name. Ordering keys off the
  // current selection only (not on each keystroke) to avoid jumpy reordering.
  const selectedIds = useMemo(() => new Set(value.map(r => r.agentId)), [value])
  const visibleAgents = useMemo(() => {
    const q = query.trim().toLowerCase()
    const ordered = [...agents].sort((a, b) => {
      const sa = selectedIds.has(a.id) ? 0 : 1
      const sb = selectedIds.has(b.id) ? 0 : 1
      return sa - sb
    })
    return q ? ordered.filter(a => a.name.toLowerCase().includes(q)) : ordered
  }, [agents, selectedIds, query])

  return (
    <div className="space-y-2">
      {agents.length === 0 && <p className="text-white/40 text-sm">Nenhum agente disponível. Crie um agente primeiro.</p>}

      {agents.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              placeholder="Buscar agente…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-white/40 whitespace-nowrap">Selecionados ({value.length})</span>
        </div>
      )}

      <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
      {agents.length > 0 && visibleAgents.length === 0 && (
        <p className="text-white/40 text-sm py-2">Nenhum agente corresponde a “{query}”.</p>
      )}
      {visibleAgents.map(a => {
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

            {row && (() => {
              const mode = toolModeOf(row)
              const mcp = mcpCache[a.id]
              return (
                <div className="mt-2 pl-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                      <Wrench className="h-3.5 w-3.5" /> Ferramentas
                    </span>
                    <Select value={mode} onValueChange={v => setToolMode(a.id, v as ToolMode)}>
                      <SelectTrigger className={`${triggerCls} w-[120px]`}><SelectValue /></SelectTrigger>
                      <SelectContent className={contentCls}>
                        <SelectItem value="inherit">Herdar</SelectItem>
                        <SelectItem value="on">Ligar</SelectItem>
                        <SelectItem value="off">Desligar</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[11px] text-white/30">{TOOL_MODE_HINT[mode]}</span>
                  </div>

                  {mode === 'on' && (
                    <div className="mt-2 space-y-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Server className="h-3 w-3" /> MCP servers
                        </p>
                        {(mcp === undefined || mcp === 'loading') && <p className="text-[11px] text-white/30">Carregando…</p>}
                        {Array.isArray(mcp) && mcp.length === 0 && (
                          <p className="text-[11px] text-white/30">Nenhum MCP server configurado neste agente.</p>
                        )}
                        {Array.isArray(mcp) && mcp.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {mcp.map(opt => {
                              const checked = mcpChecked(row, opt.amsId)
                              return (
                                <button
                                  key={opt.amsId}
                                  type="button"
                                  onClick={() => toggleMcp(a.id, opt.amsId, mcp.map(o => o.amsId))}
                                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                    checked ? 'border-blue-400/40 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
                                  }`}
                                  title={checked ? 'Permitido — clique para remover' : 'Bloqueado — clique para permitir'}
                                >
                                  {opt.name}{opt.toolCount > 0 ? ` · ${opt.toolCount}` : ''}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {Array.isArray(mcp) && mcp.length > 0 && (
                          <p className="text-[10px] text-white/25 mt-1">Todos permitidos = sem restrição. Desmarque para escopar.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-white/60 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-blue-500"
                            checked={row.caps?.toolSkills !== false}
                            onChange={e => setFlag(a.id, 'toolSkills', e.target.checked)}
                          />
                          Tool-skills
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-white/60 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-blue-500"
                            checked={row.caps?.filesystem !== false}
                            onChange={e => setFlag(a.id, 'filesystem', e.target.checked)}
                          />
                          Filesystem (read-only)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )
      })}
      </div>
    </div>
  )
}
