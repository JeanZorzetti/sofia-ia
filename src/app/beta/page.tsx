'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Loader2, Rocket, Star, Zap, Shield, Users, MessageSquare } from 'lucide-react'
import Link from 'next/link'

const benefits = [
  { icon: Zap, title: 'Acesso Antecipado', desc: 'Use features antes de todos — semanas antes do lançamento oficial' },
  { icon: Star, title: 'Preco Especial', desc: 'Desconto exclusivo de 40% pelo primeiro ano como reconhecimento' },
  { icon: MessageSquare, title: 'Canal Privado no Discord', desc: 'Acesso ao canal #beta com a equipe de produto para feedback direto' },
  { icon: Shield, title: 'Influencia o Roadmap', desc: 'Suas sugestoes entram diretamente no planejamento de proximas features' },
  { icon: Users, title: 'Badge Beta Tester', desc: 'Badge exclusiva no perfil — reconhecimento permanente na comunidade' },
  { icon: Rocket, title: 'Onboarding Dedicado', desc: 'Call de onboarding 1:1 com a equipe para configurar seu caso de uso' },
]

export default function BetaPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    useCase: '',
    plan: 'pro',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.useCase) {
      setError('Preencha os campos obrigatorios')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/beta/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Erro ao enviar candidatura')
      }
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar minimal */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl">Sofia AI</Link>
        <Link href="/login">
          <Button variant="outline" size="sm">Entrar</Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Rocket className="h-4 w-4" />
          Programa Beta — Vagas Limitadas
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Seja um Early Adopter da Sofia AI
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Junte-se a um grupo seleto de empresas que estao moldando o futuro da
          orquestracao de agentes IA. Acesso antecipado, preco especial e canal direto com o time de produto.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Sem compromisso</span>
          <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Resposta em 48h</span>
          <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Cancelamento facil</span>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">O que voce recebe como Beta Tester</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="bg-background rounded-xl p-6 border">
                  <Icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-20 px-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Candidatar-se ao Beta</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Preencha o formulario e analisaremos sua candidatura em ate 48 horas.
            </p>

            {success ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Candidatura Recebida!</h3>
                <p className="text-muted-foreground mb-6">
                  Obrigado por se candidatar ao programa beta da Sofia AI.
                  Vamos avaliar sua candidatura e entrar em contato em ate 48 horas.
                </p>
                <p className="text-sm text-muted-foreground">
                  Enquanto isso, voce pode nos seguir no{' '}
                  <a href="https://discord.gg/sofiaia" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Discord
                  </a>{' '}
                  para atualizacoes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    placeholder="Joao Silva"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email profissional *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@empresa.com.br"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    placeholder="Nome da sua empresa"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="plan">Plano desejado</Label>
                  <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free (explorar funcionalidades)</SelectItem>
                      <SelectItem value="pro">Pro — R$ 297/mes (uso regular)</SelectItem>
                      <SelectItem value="business">Business — R$ 997/mes (time completo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="useCase">Como voce pretende usar Sofia AI? *</Label>
                  <Textarea
                    id="useCase"
                    placeholder="Descreva seu caso de uso: tipo de empresa, quais processos quer automatizar, qual resultado espera..."
                    value={form.useCase}
                    onChange={e => setForm(f => ({ ...f, useCase: e.target.value }))}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                  ) : (
                    <><Rocket className="h-4 w-4 mr-2" />Candidatar-se ao Beta</>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Ao se candidatar voce concorda com nossos{' '}
                  <Link href="/termos" className="underline hover:text-foreground">Termos de Uso</Link>.
                  Sem spam, prometemos.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
