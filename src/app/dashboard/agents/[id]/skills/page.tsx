'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2, Code2, FileText } from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string | null
  type: 'tool' | 'prompt'
  category: string
  isBuiltin: boolean
}

interface AgentSkill {
  id: string
  skillId: string
  enabled: boolean
  skill: Skill
}

export default function AgentSkillsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params)
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [agentSkills, setAgentSkills] = useState<AgentSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [agentName, setAgentName] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAgent()
    fetchData()
  }, [agentId])

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`)
      const data = await res.json()
      if (data.success) setAgentName(data.data.name)
    } catch { /* silently fail */ }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [allRes, agentRes] = await Promise.all([
        fetch('/api/skills'),
        fetch(`/api/agents/${agentId}/skills`),
      ])
      const [allData, agentData] = await Promise.all([allRes.json(), agentRes.json()])
      if (allData.success) setAllSkills(allData.data ?? [])
      if (agentData.success) setAgentSkills(agentData.data ?? [])
    } catch (error) {
      console.error('Error fetching skills data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isSkillEnabled = (skillId: string): boolean => {
    const agentSkill = agentSkills.find((as) => as.skillId === skillId)
    return agentSkill?.enabled ?? false
  }

  const getAgentSkillId = (skillId: string): string | null => {
    return agentSkills.find((as) => as.skillId === skillId)?.id ?? null
  }

  const handleToggle = async (skill: Skill) => {
    setTogglingId(skill.id)
    try {
      const enabled = isSkillEnabled(skill.id)

      if (enabled) {
        // Desabilitar — DELETE
        await fetch(`/api/agents/${agentId}/skills/${skill.id}`, {
          method: 'DELETE',
        })
      } else {
        // Habilitar — POST
        const res = await fetch(`/api/agents/${agentId}/skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillId: skill.id, enabled: true }),
        })
        const data = await res.json()
        if (!data.success) {
          console.error('Error enabling skill:', data.error)
        }
      }

      await fetchData()
    } catch (error) {
      console.error('Error toggling skill:', error)
    } finally {
      setTogglingId(null)
    }
  }

  const getCategoryLabel = (value: string) => {
    const labels: Record<string, string> = {
      research: 'Pesquisa',
      integration: 'Integracao',
      development: 'Desenvolvimento',
      'social-media': 'Redes Sociais',
      sales: 'Vendas',
      analytics: 'Analytics',
      content: 'Conteudo',
      custom: 'Customizada',
    }
    return labels[value] || value
  }

  const builtinSkills = allSkills.filter((s) => s.isBuiltin)
  const customSkills = allSkills.filter((s) => !s.isBuiltin)

  const SkillRow = ({ skill }: { skill: Skill }) => {
    const enabled = isSkillEnabled(skill.id)
    const isToggling = togglingId === skill.id

    return (
      <div
        className={`p-4 border rounded-xl transition-all duration-300 ${enabled
            ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
            : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
          }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div className={`p-1 rounded ${skill.type === 'tool' ? 'text-blue-400' : 'text-purple-400'}`}>
                {skill.type === 'tool' ? (
                  <Code2 className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </div>
              <h3 className="font-medium text-white">{skill.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${skill.type === 'tool'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-purple-500/20 text-purple-400'
                  }`}
              >
                {skill.type === 'tool' ? 'Tool' : 'Prompt'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                {getCategoryLabel(skill.category)}
              </span>
              {skill.isBuiltin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  Nativa
                </span>
              )}
              {enabled && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  Ativa
                </span>
              )}
            </div>
            {skill.description && (
              <p className="text-white/60 text-sm ml-6">{skill.description}</p>
            )}
          </div>

          <button
            onClick={() => handleToggle(skill)}
            disabled={isToggling}
            className={`relative flex h-6 w-11 flex-shrink-0 items-center justify-start rounded-full p-[2px] transition-all duration-300 ease-in-out focus:outline-none ${enabled
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                : 'bg-white/10 hover:bg-white/20 hover:shadow-[0_0_8px_rgba(255,255,255,0.1)]'
              } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105'} `}
            title={enabled ? 'Desativar skill' : 'Ativar skill'}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
            >
              {isToggling && (
                <Loader2 className={`h-3 w-3 animate-spin ${enabled ? 'text-indigo-500' : 'text-gray-500'}`} />
              )}
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/agents/${agentId}`}>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Skills do Agente</h1>
            {agentName && (
              <p className="text-white/60 text-sm">{agentName}</p>
            )}
          </div>
        </div>
        <Link href="/dashboard/skills">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg text-sm transition-colors">
            <Sparkles className="w-4 h-4" />
            Gerenciar Skills
          </button>
        </Link>
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-white/80 text-sm">
          <strong className="text-white">Skills ativas</strong> sao injetadas automaticamente no contexto do agente durante conversas. Skills do tipo{' '}
          <span className="text-blue-400">Tool</span> dao ao agente capacidade de executar acoes, enquanto skills do tipo{' '}
          <span className="text-purple-400">Prompt</span> enriquecem o system prompt.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Skills nativas */}
          {builtinSkills.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Skills Nativas
                <span className="text-sm font-normal text-white/40">
                  ({builtinSkills.filter((s) => isSkillEnabled(s.id)).length}/{builtinSkills.length} ativas)
                </span>
              </h2>
              <div className="space-y-2">
                {builtinSkills.map((skill) => (
                  <SkillRow key={skill.id} skill={skill} />
                ))}
              </div>
            </div>
          )}

          {/* Skills customizadas */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-400" />
              Suas Skills
              <span className="text-sm font-normal text-white/40">
                ({customSkills.filter((s) => isSkillEnabled(s.id)).length}/{customSkills.length} ativas)
              </span>
            </h2>
            {customSkills.length === 0 ? (
              <div className="text-center py-8 text-white/40 bg-white/5 border border-white/10 rounded-lg">
                <p>Voce ainda nao criou skills customizadas.</p>
                <Link href="/dashboard/skills" className="text-blue-400 text-sm hover:underline mt-1 block">
                  Criar skills customizadas
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {customSkills.map((skill) => (
                  <SkillRow key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </div>

          {allSkills.length === 0 && (
            <div className="text-center py-12 text-white/40 bg-white/5 border border-white/10 rounded-lg">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma skill disponivel.</p>
              <Link href="/dashboard/skills" className="text-blue-400 text-sm hover:underline mt-1 block">
                Gerenciar Skills
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
