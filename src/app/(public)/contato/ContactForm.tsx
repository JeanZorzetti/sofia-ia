'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

const subjects = [
  { value: 'sales', label: 'Quero contratar um plano' },
  { value: 'demo', label: 'Quero uma demonstração' },
  { value: 'partnership', label: 'Parceria / integração' },
  { value: 'support', label: 'Suporte técnico' },
  { value: 'other', label: 'Outro assunto' },
]

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
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
        body: JSON.stringify(form),
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
        <h3 className="text-xl font-bold text-white mb-2">Mensagem recebida!</h3>
        <p className="text-foreground-tertiary text-sm max-w-sm mx-auto">
          Sua solicitação foi registrada em nosso CRM. Nossa equipe entrará em contato em breve.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 rounded-2xl space-y-5">
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

      {/* Telefone + Empresa */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Telefone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+55 11 99999-9999"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Empresa</label>
          <input
            type="text"
            value={form.company}
            onChange={set('company')}
            placeholder="Acme LTDA"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Assunto */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5">Assunto *</label>
        <select
          required
          value={form.subject}
          onChange={set('subject')}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
        >
          <option value="" disabled className="bg-gray-900">Selecione um assunto</option>
          {subjects.map((s) => (
            <option key={s.value} value={s.value} className="bg-gray-900">{s.label}</option>
          ))}
        </select>
      </div>

      {/* Mensagem */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5">Mensagem *</label>
        <textarea
          required
          minLength={10}
          rows={4}
          value={form.message}
          onChange={set('message')}
          placeholder="Conte um pouco sobre seu projeto ou dúvida..."
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
            Enviar mensagem
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
