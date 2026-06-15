'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Frequency = 'daily' | 'weekly' | 'monthly'

type Schedule = {
  id: string
  cronExpr: string
  label: string | null
  mission: string
  mode: 'chat' | 'code'
  nextRunAt: string
  lastRunAt: string | null
  lastStatus: string | null
  lastRunId: string | null
  isActive: boolean
}

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Friendly label derived from the stored cronExpr (no extra DB column).
function describe(cronExpr: string): string {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return cronExpr
  const [min, hour, dom, , dow] = parts
  const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  if (dow !== '*') return `Toda ${DOW[parseInt(dow, 10) % 7]} às ${time}`
  if (dom !== '*') return `Todo dia ${dom} às ${time}`
  return `Todo dia às ${time}`
}

export function TeamSchedulesPanel({ teamId }: { teamId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [saving, setSaving] = useState(false)
  // form state
  const [mission, setMission] = useState('')
  const [label, setLabel] = useState('')
  const [mode, setMode] = useState<'chat' | 'code'>('chat')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayOfMonth, setDayOfMonth] = useState(1)

  async function load() {
    try {
      const r = await fetch(`/api/teams/${teamId}/schedules`)
      const j = await r.json()
      if (j.success) setSchedules(j.data)
    } catch {
      /* ignore — panel is best-effort */
    }
  }
  useEffect(() => { load() }, [teamId])

  function buildPreset() {
    if (frequency === 'weekly') return { frequency, hour, minute, dayOfWeek }
    if (frequency === 'monthly') return { frequency, hour, minute, dayOfMonth }
    return { frequency, hour, minute }
  }

  async function create() {
    if (!mission.trim()) { toast.error('Missão é obrigatória'); return }
    setSaving(true)
    try {
      const r = await fetch(`/api/teams/${teamId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: buildPreset(), mission, label, mode }),
      })
      const j = await r.json()
      if (!j.success) throw new Error(j.error || 'Falha ao criar')
      toast.success('Agendamento criado')
      setMission(''); setLabel('')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(s: Schedule) {
    const r = await fetch(`/api/teams/${teamId}/schedules/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    const j = await r.json()
    if (j.success) setSchedules(prev => prev.map(x => (x.id === s.id ? j.data : x)))
  }

  async function remove(s: Schedule) {
    const r = await fetch(`/api/teams/${teamId}/schedules/${s.id}`, { method: 'DELETE' })
    const j = await r.json()
    if (j.success) setSchedules(prev => prev.filter(x => x.id !== s.id))
  }

  const inputCls = 'bg-transparent border border-white/10 rounded px-2 py-1 text-xs'

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-sm font-semibold">Agendamentos</h3>

      {schedules.length === 0 && (
        <p className="text-xs text-white/50">Nenhum agendamento. Crie um para rodar a missão automaticamente.</p>
      )}

      {schedules.map((s) => (
        <div key={s.id} className="flex items-center gap-2 rounded border border-white/10 p-2">
          <input type="checkbox" checked={s.isActive} onChange={() => toggle(s)} title="Ativo" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{s.label || s.mission}</div>
            <div className="text-[11px] text-white/50">
              {describe(s.cronExpr)} · {s.mode} · próximo {new Date(s.nextRunAt).toLocaleString('pt-BR')}
              {s.lastRunAt && (
                <> · último{' '}
                  {s.lastRunId
                    ? <a href={`/dashboard/teams/${teamId}?run=${s.lastRunId}`} className="underline hover:text-white/80">{s.lastStatus}</a>
                    : s.lastStatus}
                </>
              )}
            </div>
          </div>
          <button onClick={() => remove(s)} className="text-xs text-red-400 hover:text-red-300 px-2">excluir</button>
        </div>
      ))}

      {/* New schedule form */}
      <div className="rounded border border-white/10 p-3 space-y-2">
        <textarea
          className={`${inputCls} w-full`}
          rows={2}
          placeholder="Missão a executar (ex.: gere o relatório semanal de leads)"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputCls} flex-1 min-w-[8rem]`} placeholder="rótulo (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as 'chat' | 'code')}>
            <option value="chat">Chat</option>
            <option value="code">Código</option>
          </select>
          <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
          {frequency === 'weekly' && (
            <select className={inputCls} value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}>
              {DOW.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          )}
          {frequency === 'monthly' && (
            <select className={inputCls} value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>dia {d}</option>)}
            </select>
          )}
          <select className={inputCls} value={hour} onChange={(e) => setHour(parseInt(e.target.value, 10))}>
            {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
          </select>
          <select className={inputCls} value={minute} onChange={(e) => setMinute(parseInt(e.target.value, 10))}>
            {[0, 15, 30, 45].map((m) => <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>)}
          </select>
          <button onClick={create} disabled={saving} className="text-xs rounded bg-white/15 px-3 py-1.5 hover:bg-white/25 disabled:opacity-50">
            {saving ? 'Criando...' : '+ Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
