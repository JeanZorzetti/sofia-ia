'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

const siteTypes = [
  { value: 'landing', label: 'Landing page' },
  { value: 'institucional', label: 'Site institucional' },
  { value: 'site-blog', label: 'Site + blog' },
]

export function IntakeForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    siteType: '',
    currentSite: '',
    goal: '',
    website: '', // honeypot — deve ficar sempre vazio
  })

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/crm/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject: 'site-intake' }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar. Tente novamente.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="glass-card p-10 rounded-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Brief recebido!</h3>
        <p className="text-foreground-tertiary text-sm max-w-sm mx-auto">
          Nossa equipe vai analisar e retornar com uma proposta de escopo e preço fechado em até 1 dia útil.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative glass-card p-8 rounded-2xl space-y-5">
      {/* Honeypot — invisível para humanos, tentador para bots */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Deixe este campo vazio</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={set('website')}
        />
      </div>

      {/* Nome + Email */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Nome *</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={set('name')}
            placeholder="João Silva"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            placeholder="joao@empresa.com"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* WhatsApp + Negócio */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">WhatsApp</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+55 11 99999-9999"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Nome do negócio</label>
          <input
            type="text"
            value={form.company}
            onChange={set('company')}
            placeholder="Acme LTDA"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Tipo de site + Site atual */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Tipo de site</label>
          <select
            value={form.siteType}
            onChange={set('siteType')}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
          >
            <option value="" className="bg-gray-900">Selecione...</option>
            {siteTypes.map((t) => (
              <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Site atual (se tiver)</label>
          <input
            type="text"
            value={form.currentSite}
            onChange={set('currentSite')}
            placeholder="seusite.com.br"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Objetivo */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5">O que você precisa que esse site faça?</label>
        <textarea
          rows={4}
          value={form.goal}
          onChange={set('goal')}
          placeholder="Ex: gerar leads pro meu negócio de estética, mostrar meus serviços, vender online..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full button-luxury py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            Enviar brief
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-xs text-white/25 text-center">
        Ao enviar, você concorda com nossa{' '}
        <a href="/privacidade" className="underline hover:text-white/50 transition-colors">
          Política de Privacidade
        </a>.
      </p>
    </form>
  )
}
