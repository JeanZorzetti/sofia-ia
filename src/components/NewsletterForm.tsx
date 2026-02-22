'use client'

import { useState } from 'react'
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface NewsletterFormProps {
  source?: string
  compact?: boolean
  title?: string
  description?: string
}

export default function NewsletterForm({
  source = 'footer',
  compact = false,
  title = 'Fique por dentro das novidades',
  description = 'Templates, casos de uso e tutoriais de IA toda semana. Sem spam.',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })

      const json = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(json.message || 'Inscricao realizada! Verifique seu email.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(json.error || 'Erro ao inscrever. Tente novamente.')
      }
    } catch {
      setStatus('error')
      setMessage('Erro de rede. Tente novamente.')
    }
  }

  if (compact) {
    return (
      <div className="w-full max-w-sm">
        {status === 'success' ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={status === 'loading'}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-blue-500/50 disabled:opacity-50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex-shrink-0"
            >
              {status === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="glass-card p-6 rounded-2xl text-center">
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Mail className="w-5 h-5 text-blue-400" />
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 mb-5 max-w-sm mx-auto">{description}</p>

      {status === 'success' ? (
        <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-5 h-5" />
          <span>{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={status === 'loading'}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50 disabled:opacity-50 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            {status === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Inscrever <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="mt-3 text-xs text-red-400 flex items-center justify-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {message}
        </p>
      )}

      <p className="text-[10px] text-white/20 mt-3">
        Sem spam. Cancele quando quiser.
      </p>
    </div>
  )
}
