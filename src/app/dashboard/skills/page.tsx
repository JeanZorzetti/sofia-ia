'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Sparkles, Loader2, Code2, FileText } from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string | null
  type: 'tool' | 'prompt'
  category: string
  isBuiltin: boolean
  toolDefinition?: Record<string, unknown> | null
  toolCode?: string | null
  promptBlock?: string | null
  createdAt: string
}

const CATEGORIES = [
  { value: 'research', label: 'Pesquisa' },
  { value: 'integration', label: 'Integração' },
  { value: 'development', label: 'Desenvolvimento' },
  { value: 'social-media', label: 'Redes Sociais' },
  { value: 'sales', label: 'Vendas' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'content', label: 'Conteúdo' },
  { value: 'custom', label: 'Customizada' },
]

const defaultForm = {
  name: '',
  description: '',
  type: 'tool' as 'tool' | 'prompt',
  category: 'custom',
  toolDefinition: '{\n  "name": "my_tool",\n  "description": "Descrição da ferramenta",\n  "parameters": {\n    "type": "object",\n    "properties": {\n      "input": { "type": "string" }\n    },\n    "required": ["input"]\n  }\n}',
  toolCode: '// Código JavaScript da skill\n// Parâmetro "input" contém os dados do agente\nreturn input.input;',
  promptBlock: '// Bloco de prompt que será injetado no contexto do agente\n// Use {{variavel}} para interpolação dinâmica',
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    fetchSkills()
  }, [])

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/skills')
      const data = await res.json()
      if (data.success) setSkills(data.data ?? [])
    } catch (error) {
      console.error('Error fetching skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name) {
      alert('Nome é obrigatório')
      return
    }
    if (form.type === 'prompt' && !form.promptBlock) {
      alert('Bloco de prompt é obrigatório para skills do tipo prompt')
      return
    }

    setSaving(true)
    try {
      let toolDefinitionParsed: Record<string, unknown> | undefined
      if (form.type === 'tool' && form.toolDefinition) {
        try {
          toolDefinitionParsed = JSON.parse(form.toolDefinition)
        } catch {
          alert('Tool Definition deve ser um JSON válido')
          setSaving(false)
          return
        }
      }

      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        type: form.type,
        category: form.category,
      }

      if (form.type === 'tool') {
        body.toolDefinition = toolDefinitionParsed
        body.toolCode = form.toolCode
      } else {
        body.promptBlock = form.promptBlock
      }

      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setForm(defaultForm)
        fetchSkills()
      } else {
        alert(data.error || 'Erro ao criar skill')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (skillId: string) => {
    if (!confirm('Tem certeza que deseja remover esta skill?')) return
    try {
      await fetch(`/api/skills/${skillId}`, { method: 'DELETE' })
      fetchSkills()
    } catch (error) {
      console.error('Error deleting skill:', error)
    }
  }

  const builtinSkills = skills.filter((s) => s.isBuiltin)
  const customSkills = skills.filter((s) => !s.isBuiltin)

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label || value

  const SkillCard = ({ skill }: { skill: Skill }) => (
    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-medium text-white">{skill.name}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                skill.type === 'tool'
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
          </div>
          {skill.description && (
            <p className="text-white/60 text-sm">{skill.description}</p>
          )}
        </div>
        {!skill.isBuiltin && (
          <button
            onClick={() => handleDelete(skill.id)}
            className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            title="Remover skill"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Skills</h1>
          <p className="text-white/60 text-sm mt-1">
            Ferramentas e blocos de prompt que potencializam seus agentes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Skill
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-white/80 text-sm">
          <strong className="text-white">Skills</strong> são capacidades reutilizáveis que podem ser vinculadas a agentes. Skills do tipo{' '}
          <span className="text-blue-400 font-medium">Tool</span> permitem que o agente execute ações com código JavaScript, enquanto skills do tipo{' '}
          <span className="text-purple-400 font-medium">Prompt</span> injetam blocos de texto no contexto do agente.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Skills Nativas */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Skills Nativas
              <span className="text-sm font-normal text-white/40">({builtinSkills.length})</span>
            </h2>
            {builtinSkills.length === 0 ? (
              <div className="text-center py-8 text-white/40 bg-white/5 border border-white/10 rounded-lg">
                <p>Nenhuma skill nativa disponível.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {builtinSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </div>

          {/* Suas Skills */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-400" />
              Suas Skills
              <span className="text-sm font-normal text-white/40">({customSkills.length})</span>
            </h2>
            {customSkills.length === 0 ? (
              <div className="text-center py-8 text-white/40 bg-white/5 border border-white/10 rounded-lg">
                <p>Nenhuma skill customizada criada ainda.</p>
                <p className="text-sm mt-1">Clique em &ldquo;Nova Skill&rdquo; para criar sua primeira skill.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f10] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Nova Skill</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Busca na Web, Gerador de Relatório..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="O que esta skill faz?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Tipo *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as 'tool' | 'prompt' })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="tool">Tool (executa código)</option>
                      <option value="prompt">Prompt (injeta contexto)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-white/60 block mb-1">Categoria</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.type === 'prompt' ? (
                  <div>
                    <label className="text-sm text-white/60 block mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Bloco de Prompt *
                    </label>
                    <textarea
                      value={form.promptBlock}
                      onChange={(e) => setForm({ ...form, promptBlock: e.target.value })}
                      rows={8}
                      placeholder="Texto que será injetado no contexto do agente..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-y"
                    />
                    <p className="text-xs text-white/30 mt-1">
                      Este bloco será adicionado ao system prompt do agente quando a skill estiver ativa.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm text-white/60 block mb-1 flex items-center gap-1">
                        <Code2 className="w-3.5 h-3.5" />
                        Tool Definition (JSON)
                      </label>
                      <textarea
                        value={form.toolDefinition}
                        onChange={(e) => setForm({ ...form, toolDefinition: e.target.value })}
                        rows={8}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-yellow-400 text-xs font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-y"
                        spellCheck={false}
                      />
                      <p className="text-xs text-white/30 mt-1">
                        Schema JSON que descreve a ferramenta para o modelo de IA.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-white/60 block mb-1 flex items-center gap-1">
                        <Code2 className="w-3.5 h-3.5" />
                        Código JavaScript
                      </label>
                      <textarea
                        value={form.toolCode}
                        onChange={(e) => setForm({ ...form, toolCode: e.target.value })}
                        rows={8}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-green-400 text-xs font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-y"
                        spellCheck={false}
                      />
                      <p className="text-xs text-white/30 mt-1">
                        Código executado quando o agente chamar esta tool. Use <code className="text-white/50">return valor</code> para retornar o resultado.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowModal(false); setForm(defaultForm) }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Criar Skill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
