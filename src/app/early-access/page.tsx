'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  BrainCircuit,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Users,
  MessageSquare,
  Loader2,
  AlertCircle,
  Gift,
  Map,
  Badge
} from 'lucide-react'

const benefits = [
  {
    icon: Gift,
    title: '3 meses grátis no plano Pro',
    description: 'R$ 297/mês de valor, sem custo. Acesso a orquestrações ilimitadas, 20 agentes e WhatsApp integrado.',
  },
  {
    icon: Badge,
    title: 'Badge exclusivo de Early Adopter',
    description: 'Seu perfil recebe o badge especial de fundador da Sofia AI — reconhecimento permanente na plataforma.',
  },
  {
    icon: Map,
    title: 'Influência direta no roadmap',
    description: 'Votação prioritária em features, acesso antecipado a novidades e canal direto com a equipe fundadora.',
  },
  {
    icon: MessageSquare,
    title: 'Acesso ao grupo privado',
    description: 'Grupo exclusivo com outros early adopters, fundadores e time de produto para troca de experiências.',
  },
]

const usageOptions = [
  'Marketing e conteúdo',
  'Suporte ao cliente',
  'Vendas e SDR',
  'Jurídico e compliance',
  'E-commerce e varejo',
  'RH e recrutamento',
  'Pesquisa e análise',
  'Desenvolvimento de produto',
  'Outro',
]

export default function EarlyAccessPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    usage: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/crm/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          subject: 'early_access',
          message: `Tipo de uso: ${formData.usage}${formData.message ? ` | Mensagem: ${formData.message}` : ''}`,
          phone: '',
        }),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        const json = await res.json()
        setStatus('error')
        setErrorMessage(json.error || 'Erro ao enviar. Tente novamente.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Erro de rede. Verifique sua conexão e tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navbar */}
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
          </Link>
          <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
            Acessar Plataforma <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[300px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-sm text-yellow-300 mb-6">
            <Star className="w-4 h-4" />
            Vagas limitadas — Programa Early Adopter
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Seja um{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Early Adopter
            </span>{' '}
            da Sofia AI
          </h1>

          <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
            Junte-se aos primeiros usuários da plataforma de orquestração de agentes IA mais completa
            do Brasil. Benefícios exclusivos para quem entrar agora.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-white/40 mb-4">
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400" /> 3 meses grátis Pro</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-400" /> Grupo exclusivo</span>
            <span className="flex items-center gap-1.5"><Map className="w-4 h-4 text-purple-400" /> Influência no roadmap</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Benefits */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">O que você recebe</h2>
            <div className="space-y-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="glass-card p-5 rounded-xl flex gap-4 hover:border-white/15 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                    <p className="text-sm text-white/50">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div>
            {status === 'success' ? (
              <div className="glass-card p-8 rounded-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Inscrição recebida!</h3>
                <p className="text-white/50 mb-6 text-sm">
                  Nossa equipe entrará em contato em até 24h para confirmar seu acesso ao programa
                  Early Adopter e ativar seus benefícios.
                </p>
                <Link
                  href="/login"
                  className="button-luxury px-6 py-3 text-sm inline-flex items-center gap-2"
                >
                  Acessar a Plataforma <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="glass-card p-6 rounded-2xl border border-yellow-500/20">
                <h2 className="text-xl font-bold text-white mb-1">Garanta sua vaga</h2>
                <p className="text-sm text-white/40 mb-6">
                  Preencha o formulário abaixo. Selecionamos os candidatos manualmente para garantir
                  o melhor aproveitamento do programa.
                </p>

                {errorMessage && (
                  <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Nome completo *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="João Silva"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/40 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="joao@empresa.com"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/40 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Empresa / Organização</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Nome da sua empresa ou projeto"
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Principal caso de uso *</label>
                    <select
                      name="usage"
                      value={formData.usage}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/40 transition-all"
                    >
                      <option value="" className="bg-[#0a0a0f]">Selecione...</option>
                      {usageOptions.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#0a0a0f]">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">
                      O que você quer automatizar? (opcional)
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Descreva brevemente o processo que você quer automatizar com IA..."
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/40 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {status === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Star className="w-4 h-4" />
                        Quero ser Early Adopter
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-white/30 text-center">
                    Sem compromisso. Os 3 meses grátis são ativados após aprovação da sua candidatura.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Sofia AI</span>
          </Link>
          <p className="text-white/30 text-xs">&copy; 2026 ROI Labs. Programa de Early Adopters.</p>
          <div className="flex gap-4 text-xs text-white/30">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/preco" className="hover:text-white transition-colors">Preços</Link>
            <Link href="/contato" className="hover:text-white transition-colors">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
