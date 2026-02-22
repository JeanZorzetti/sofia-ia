'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BrainCircuit, ArrowLeft, Send, CheckCircle, Building2, Layers, MessageSquare } from 'lucide-react'

const types = [
  {
    value: 'enterprise',
    label: 'Enterprise',
    icon: Building2,
    description: 'Self-hosted, SSO, SLA e compliance para grandes organizações',
  },
  {
    value: 'whitelabel',
    label: 'White-label',
    icon: Layers,
    description: 'Revenda Sofia com sua marca para seus clientes',
  },
  {
    value: 'general',
    label: 'Geral',
    icon: MessageSquare,
    description: 'Dúvidas, parcerias ou outro assunto',
  },
]

export default function ContatoPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    type: 'enterprise',
    message: '',
    employees: '',
    useCase: '',
  })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Mensagem recebida!</h1>
          <p className="text-foreground-tertiary mb-8">
            Retornaremos em até 1 dia útil para o email <strong className="text-white">{form.email}</strong>.
          </p>
          <Link href="/" className="button-luxury px-8 py-3 inline-flex items-center gap-2">
            Voltar para home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-16 pb-24">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>

          <h1 className="text-4xl font-bold text-white mb-3">Fale com nossa equipe</h1>
          <p className="text-foreground-tertiary mb-10 text-lg">
            Retornamos em até 1 dia útil. Para suporte técnico, acesse o <Link href="/comunidade" className="text-blue-400 hover:underline">Discord</Link>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">Qual é o assunto?</label>
              <div className="grid grid-cols-3 gap-3">
                {types.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      form.type === t.value
                        ? 'border-blue-500/60 bg-blue-500/10 text-white'
                        : 'border-white/10 hover:border-white/20 text-white/60'
                    }`}
                  >
                    <t.icon className="w-5 h-5 mb-2" />
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="text-xs text-white/40 mt-1 leading-tight">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Nome + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="João Silva"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="joao@empresa.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm"
                />
              </div>
            </div>

            {/* Empresa + Telefone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Empresa</label>
                <input
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Telefone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+55 11 99999-9999"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm"
                />
              </div>
            </div>

            {/* Funcionários (apenas enterprise/whitelabel) */}
            {(form.type === 'enterprise' || form.type === 'whitelabel') && (
              <div>
                <label className="block text-sm text-white/60 mb-1.5">
                  {form.type === 'whitelabel' ? 'Número estimado de clientes' : 'Número de funcionários'}
                </label>
                <select
                  value={form.employees}
                  onChange={e => setForm(f => ({ ...f, employees: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 text-sm"
                >
                  <option value="" className="bg-gray-900">Selecione...</option>
                  <option value="1-10" className="bg-gray-900">1–10</option>
                  <option value="11-50" className="bg-gray-900">11–50</option>
                  <option value="51-200" className="bg-gray-900">51–200</option>
                  <option value="200+" className="bg-gray-900">200+</option>
                </select>
              </div>
            )}

            {/* Mensagem */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Mensagem *</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder={
                  form.type === 'enterprise'
                    ? 'Descreva seu caso de uso, volume esperado e requisitos técnicos...'
                    : form.type === 'whitelabel'
                    ? 'Conte sobre sua agência/consultoria e como planeja usar o white-label...'
                    : 'Como podemos ajudar?'
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full button-luxury py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar mensagem
                </>
              )}
            </button>

            <p className="text-center text-xs text-white/30">
              Ao enviar, você concorda com nossa{' '}
              <Link href="/privacidade" className="hover:text-white/60 transition-colors">
                Política de Privacidade
              </Link>.
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}
