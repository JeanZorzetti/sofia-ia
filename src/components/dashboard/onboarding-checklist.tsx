'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react'

interface ChecklistStep {
  id: string
  label: string
  description: string
  href: string
  done: boolean
}

const STORAGE_KEY = 'sofia_checklist_dismissed'

export function OnboardingChecklist() {
  const [steps, setSteps] = useState<ChecklistStep[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) {
      setDismissed(true)
      return
    }
    loadProgress()
  }, [])

  async function loadProgress() {
    try {
      const [usageRes, orchRes] = await Promise.all([
        fetch('/api/user/usage').then(r => r.json()),
        fetch('/api/orchestrations?limit=1').then(r => r.json()).catch(() => ({ data: [] })),
      ])

      const hasAgent = (usageRes.agents?.current ?? 0) > 0
      const hasKB = (usageRes.knowledgeBases?.current ?? 0) > 0
      const hasOrch = orchRes?.data?.length > 0 || orchRes?.orchestrations?.length > 0

      const createdAt = usageRes.subscription?.createdAt
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      // If subscription was created more than 14 days ago and all done → hide
      if (createdAt && new Date(createdAt) < twoWeeksAgo && hasAgent && hasKB && hasOrch) {
        setDismissed(true)
        return
      }

      setSteps([
        {
          id: 'account',
          label: 'Criar conta',
          description: 'Você já está aqui!',
          href: '/dashboard',
          done: true,
        },
        {
          id: 'agent',
          label: 'Criar primeiro agente',
          description: 'Defina nome, instruções e modelo de IA',
          href: '/dashboard/agents',
          done: hasAgent,
        },
        {
          id: 'orchestration',
          label: 'Criar primeira orquestração',
          description: 'Pipeline de agentes para tarefas complexas',
          href: '/dashboard/orchestrations',
          done: hasOrch,
        },
        {
          id: 'kb',
          label: 'Conectar Knowledge Base',
          description: 'Faça upload de PDFs, URLs ou textos',
          href: '/dashboard/knowledge',
          done: hasKB,
        },
        {
          id: 'invite',
          label: 'Convidar um colega',
          description: 'Colabore com sua equipe',
          href: '/dashboard/settings/team',
          done: false,
        },
      ])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  function dismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  if (dismissed || loading) return null

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length
  const progress = steps.length > 0 ? (doneCount / steps.length) * 100 : 0

  // Auto-dismiss when all done after a short read time
  if (allDone) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 glass-card rounded-xl border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Primeiros passos</span>
          <span className="text-xs text-white/40 ml-1">{doneCount}/{steps.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-white/40 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={dismiss}
            className="p-1 rounded text-white/40 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="p-3 space-y-1">
          {steps.map(step => (
            <Link
              key={step.id}
              href={step.done ? '#' : step.href}
              onClick={e => step.done && e.preventDefault()}
              className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors group ${
                step.done
                  ? 'opacity-50 cursor-default'
                  : 'hover:bg-white/5 cursor-pointer'
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-white/20 mt-0.5 flex-shrink-0 group-hover:text-violet-400 transition-colors" />
              )}
              <div>
                <div className={`text-xs font-medium ${step.done ? 'line-through text-white/40' : 'text-white'}`}>
                  {step.label}
                </div>
                {!step.done && (
                  <div className="text-[10px] text-white/30 mt-0.5">{step.description}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
