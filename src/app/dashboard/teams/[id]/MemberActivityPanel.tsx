// src/app/dashboard/teams/[id]/MemberActivityPanel.tsx
// Teams V2 — fatia S2.1 (Tema D2): additive "per-member" view in the TeamRunView. Groups the
// data the SSE already delivers (messages/tasks/team.members) by member: messages sent/received
// (+ breakdown by kind), assigned tasks and their status, retries, and a short activity timeline.
// Reuses the existing SSE events — no new route/query. Pure aggregation lives in member-stats.ts
// (so it's testable via tsx without React); this component only renders. Per S2.1 decisions:
// always-visible section (not a tab), system messages (null member) ignored, counters basic +
// retries (token/cost-per-member is S2.2, which needs schema). Additive — the board/feed/topology
// are untouched.
'use client'

import {
  Crown, Hammer, ShieldCheck, Send, Inbox, Repeat, ListChecks, Users, ArrowRight, Sparkles, Coins,
} from 'lucide-react'
import { computeMemberStats, type MemberLike, type MessageLike, type TaskLike } from './member-stats'
import { costForModel } from './member-usage'

interface UsageEntry { memberId: string | null; tokens: number }

const ROLE_ICON: Record<string, typeof Crown> = { lead: Crown, worker: Hammer, reviewer: ShieldCheck }
const ROLE_CHIP: Record<string, string> = {
  lead: 'bg-amber-500/20 text-amber-400',
  worker: 'bg-blue-500/20 text-blue-400',
  reviewer: 'bg-purple-500/20 text-purple-400',
}

// Same palette the kanban uses, extended to the non-board statuses so a member's mini-board
// stays visually consistent with the main board.
const STATUS_DOT: Record<string, string> = {
  todo: 'bg-white/30', doing: 'bg-blue-400', review: 'bg-purple-400', done: 'bg-emerald-400',
  rejected: 'bg-red-400', blocked: 'bg-amber-400', clarify: 'bg-cyan-400',
}
const STATUS_LABEL: Record<string, string> = {
  todo: 'A fazer', doing: 'Fazendo', review: 'Review', done: 'Concluído',
  rejected: 'Rejeitado', blocked: 'Bloqueado', clarify: 'Dúvida',
}
const KIND_LABEL: Record<string, string> = {
  message: 'msg', assignment: 'atribuição', review: 'review', system: 'sistema',
}

function entries(rec: Record<string, number>): [string, number][] {
  return Object.entries(rec).filter(([, n]) => n > 0)
}

export function MemberActivityPanel({
  members, messages, tasks, usageByMember = [],
}: {
  members: MemberLike[]
  messages: MessageLike[]
  tasks: TaskLike[]
  usageByMember?: UsageEntry[]
}) {
  const stats = computeMemberStats(members, messages, tasks)
  if (stats.length === 0) return null

  // Build a lookup from memberId → tokens for the current run.
  const usageMap = new Map<string, number>()
  for (const u of usageByMember) {
    if (u.memberId) usageMap.set(u.memberId, (usageMap.get(u.memberId) ?? 0) + u.tokens)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-white/40" /> Por membro
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {stats.map(s => {
          const Icon = ROLE_ICON[s.role] ?? Hammer
          const sentKinds = entries(s.sentByKind)
          const statusCounts = entries(s.tasksByStatus)
          // Keep the timeline short — most recent activity is the most useful for debugging.
          const recent = s.timeline.slice(-6).reverse()
          const idle = s.sent === 0 && s.received === 0 && s.tasks.length === 0

          const memberTokens = usageMap.get(s.memberId) ?? 0
          const memberCost = costForModel(null, memberTokens) // flat rate per member (model breakdown not available here)

          return (
            <div key={s.memberId} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-3">
              {/* Identity */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${ROLE_CHIP[s.role] ?? 'bg-white/10 text-white/60'}`}>
                  <Icon className="h-3 w-3" /> {s.role}
                </span>
                <span className="text-sm font-medium text-white/90 truncate">{s.name}</span>
              </div>

              {/* Counters */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/50">
                <span className="inline-flex items-center gap-1"><Send className="h-3 w-3" />{s.sent} env</span>
                <span className="inline-flex items-center gap-1"><Inbox className="h-3 w-3" />{s.received} rec</span>
                {s.retries > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-400/80"><Repeat className="h-3 w-3" />{s.retries} retries</span>
                )}
                {memberTokens > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1 text-blue-400/70"><Sparkles className="h-3 w-3" />{memberTokens.toLocaleString()} tok</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400/70"><Coins className="h-3 w-3" />${memberCost.toFixed(4)}</span>
                  </>
                )}
              </div>
              {sentKinds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sentKinds.map(([kind, n]) => (
                    <span key={kind} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/50">
                      {KIND_LABEL[kind] ?? kind} {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Mini-board: tasks by status */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1 flex items-center gap-1">
                  <ListChecks className="h-3 w-3" /> Tasks {s.tasks.length > 0 && `(${s.tasks.length})`}
                </div>
                {statusCounts.length === 0 ? (
                  <p className="text-[11px] text-white/30">Nenhuma task atribuída.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {statusCounts.map(([status, n]) => (
                      <span key={status} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/60">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-white/30'}`} />
                        {STATUS_LABEL[status] ?? status} {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline (most recent first) */}
              {recent.length > 0 && (
                <div className="space-y-1 border-t border-white/5 pt-2">
                  {recent.map(e => (
                    <div key={`${e.direction}-${e.id}`} className="flex items-start gap-1.5 text-[11px]">
                      {e.direction === 'sent'
                        ? <ArrowRight className="h-3 w-3 text-blue-400/70 shrink-0 mt-0.5" />
                        : <Inbox className="h-3 w-3 text-white/30 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <span className="text-white/40">
                          {e.direction === 'sent' ? `→ ${e.counterpartName}` : `← ${e.counterpartName}`}
                          <span className="ml-1 uppercase tracking-wider text-white/25">{KIND_LABEL[e.kind] ?? e.kind}</span>
                        </span>
                        <p className="text-white/70 line-clamp-2 break-words">{e.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {idle && <p className="text-[11px] text-white/25">Sem atividade ainda.</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
