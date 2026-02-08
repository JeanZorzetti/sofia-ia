import Link from 'next/link'
import { ArrowRight, Bot, MessageSquare, TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="logo-sofia text-white">SOFIA</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground-secondary hover:text-white transition-colors text-sm">Recursos</a>
            <a href="#pricing" className="text-foreground-secondary hover:text-white transition-colors text-sm">Planos</a>
            <a href="#about" className="text-foreground-secondary hover:text-white transition-colors text-sm">Sobre</a>
          </div>
          <Link href="/login" className="button-luxury px-6 py-2 text-sm">
            Acessar Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-foreground-secondary mb-8">
            <Zap className="w-4 h-4" />
            Powered by Llama 3.3 70B
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
            SDR Inteligente<br />
            <span className="text-foreground-secondary">para Imobiliarias</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-tertiary max-w-2xl mx-auto mb-12">
            Qualifique leads automaticamente via WhatsApp com IA avancada.
            Aumente suas conversoes em ate 300% enquanto dorme.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-8 py-3 text-lg inline-flex items-center gap-2 justify-center">
              Comecar Agora <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="px-8 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-lg text-center">
              Saiba Mais
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
            {[
              { value: '322+', label: 'Conversas/dia' },
              { value: '26.1%', label: 'Taxa de Conversao' },
              { value: '<200ms', label: 'Tempo de Resposta' },
              { value: '84%', label: 'Mais Barato' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-foreground-tertiary mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Recursos Poderosos</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Tudo que voce precisa para automatizar seu processo de vendas imobiliarias.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: 'IA Conversacional',
                description: 'Sofia conversa naturalmente com seus leads, qualificando-os automaticamente com base em interesse, regiao e faixa de preco.',
              },
              {
                icon: MessageSquare,
                title: 'WhatsApp Multi-Instancia',
                description: 'Conecte multiplos numeros de WhatsApp. Gerencie todos de um unico dashboard com QR code instantaneo.',
              },
              {
                icon: TrendingUp,
                title: 'Lead Scoring Inteligente',
                description: 'Score de 0-100 para cada lead. Priorize os leads quentes e nunca perca uma oportunidade.',
              },
              {
                icon: BarChart3,
                title: 'Dashboard em Tempo Real',
                description: 'Metricas atualizadas a cada 30 segundos. Conversas, conversoes, leads e performance em um so lugar.',
              },
              {
                icon: Shield,
                title: 'Seguranca Enterprise',
                description: 'JWT com cookies HTTP-only, rate limiting, validacao de entrada e criptografia em todas as comunicacoes.',
              },
              {
                icon: Zap,
                title: 'Automacoes Internas',
                description: 'Follow-up inteligente, alertas de leads quentes e respostas automaticas sem depender de ferramentas externas.',
              },
            ].map((feature) => (
              <div key={feature.title} className="glass-card p-8 hover-scale">
                <feature.icon className="w-10 h-10 text-white mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-foreground-tertiary text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos Acessiveis</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Ate 84% mais barato que os concorrentes. Sem surpresas, sem taxas ocultas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '67',
                features: ['15.000 tokens/mes', '1 WhatsApp', 'Dashboard basico', 'Suporte por email'],
                popular: false,
              },
              {
                name: 'Professional',
                price: '97',
                features: ['50.000 tokens/mes', '3 WhatsApps', 'Dashboard completo', 'IA avancada', 'Suporte prioritario'],
                popular: true,
              },
              {
                name: 'Enterprise',
                price: '297',
                features: ['Tokens ilimitados', 'WhatsApps ilimitados', 'API dedicada', 'Onboarding personalizado', 'Suporte 24/7'],
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`glass-card p-8 relative ${plan.popular ? 'border-white/20 scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-xs font-semibold rounded-full">
                    POPULAR
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">R$ {plan.price}</span>
                  <span className="text-foreground-tertiary text-sm">/mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-foreground-secondary flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={plan.popular ? 'button-luxury w-full py-3 text-center block' : 'w-full py-3 text-center block rounded-full border border-white/10 hover:bg-white/5 transition-colors'}
                >
                  Comecar
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="px-6 py-24 bg-background-secondary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para transformar suas vendas?
          </h2>
          <p className="text-foreground-tertiary mb-8 text-lg">
            Junte-se a centenas de imobiliarias que ja usam Sofia IA para
            qualificar leads e fechar mais negocios.
          </p>
          <Link href="/login" className="button-luxury px-10 py-4 text-lg inline-flex items-center gap-2">
            Comecar Gratuitamente <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="logo-sofia text-white text-sm">SOFIA</span>
          <p className="text-foreground-tertiary text-sm">
            &copy; 2026 ROI Labs. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-foreground-tertiary hover:text-white text-sm transition-colors">Termos</a>
            <a href="#" className="text-foreground-tertiary hover:text-white text-sm transition-colors">Privacidade</a>
            <a href="mailto:contato@roilabs.com.br" className="text-foreground-tertiary hover:text-white text-sm transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
