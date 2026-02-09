import Link from 'next/link'
import { ArrowRight, Bot, MessageSquare, TrendingUp, Shield, Zap, BarChart3, BrainCircuit, Users, Workflow, Headphones, DollarSign, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="logo-sofia text-white font-bold text-xl tracking-tight">ROI Labs</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#solucoes" className="text-foreground-secondary hover:text-white transition-colors text-sm">Soluções</a>
            <a href="#resultados" className="text-foreground-secondary hover:text-white transition-colors text-sm">Resultados</a>
            <a href="#verticais" className="text-foreground-secondary hover:text-white transition-colors text-sm">Verticais</a>
            <a href="#sobre" className="text-foreground-secondary hover:text-white transition-colors text-sm">Sobre</a>
          </div>
          <Link href="/login" className="button-luxury px-6 py-2 text-sm">
            Acessar Plataforma
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-foreground-secondary mb-8">
            <BrainCircuit className="w-4 h-4" />
            IA Agentica + Automação Inteligente
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
            IA e Automação<br />
            <span className="text-foreground-secondary">para Cada Área do Seu Negócio</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-tertiary max-w-2xl mx-auto mb-12">
            Reduzimos custos, multiplicamos produtividade e escalamos operações
            com soluções de IA sob medida — do atendimento ao financeiro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contato" className="button-luxury px-8 py-3 text-lg inline-flex items-center gap-2 justify-center">
              Agende um Diagnóstico Gratuito <ArrowRight className="w-5 h-5" />
            </a>
            <a href="#solucoes" className="px-8 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-lg text-center">
              Conheça Nossas Soluções
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
            {[
              { value: 'Até 30%', label: 'Redução de Custos' },
              { value: '42%', label: 'Mais Velocidade' },
              { value: '3.7x', label: 'ROI Médio' },
              { value: '24/7', label: 'Agentes Ativos' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-foreground-tertiary mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problemas */}
      <section className="px-6 py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Sua empresa enfrenta esses desafios?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { text: 'Processos manuais travando o crescimento', icon: Workflow },
              { text: 'Equipe sobrecarregada com tarefas repetitivas', icon: Users },
              { text: 'Dados valiosos sendo desperdiçados sem inteligência', icon: BarChart3 },
            ].map((item) => (
              <div key={item.text} className="glass-card p-6 flex items-start gap-4">
                <item.icon className="w-6 h-6 text-white/60 flex-shrink-0 mt-0.5" />
                <p className="text-foreground-secondary text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soluções */}
      <section id="solucoes" className="px-6 py-24 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Soluções que Entregam Resultado</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Do diagnóstico à execução — implementamos automações inteligentes que funcionam de ponta a ponta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: 'Agentes de IA',
                description: 'Agentes inteligentes que atendem, qualificam e vendem 24 horas por dia, 7 dias por semana — via WhatsApp, chat ou e-mail.',
              },
              {
                icon: Workflow,
                title: 'Automação de Processos',
                description: 'Eliminamos tarefas manuais e repetitivas. Fluxos inteligentes que conectam sistemas e aceleram operações.',
              },
              {
                icon: BrainCircuit,
                title: 'IA Generativa Aplicada',
                description: 'Modelos de linguagem treinados para o seu contexto. Relatórios, análises e respostas gerados automaticamente.',
              },
              {
                icon: BarChart3,
                title: 'Analytics & BI com IA',
                description: 'Dashboards inteligentes que transformam dados brutos em decisões estratégicas. Insights em tempo real.',
              },
              {
                icon: Shield,
                title: 'Segurança & Compliance',
                description: 'Governança de IA integrada em cada solução. Segurança enterprise-grade, auditoria e conformidade regulatória.',
              },
              {
                icon: Zap,
                title: 'Integrações Inteligentes',
                description: 'Conectamos qualquer sistema — CRM, ERP, WhatsApp, e-mail, bancos de dados — em uma operação unificada e autônoma.',
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

      {/* Resultados */}
      <section id="resultados" className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Resultados Comprovados</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Não vendemos tecnologia. Entregamos ROI mensurável desde o primeiro mês.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { value: '30%', label: 'Redução média em custos operacionais', icon: DollarSign },
              { value: '42%', label: 'Mais velocidade na execução de processos', icon: Zap },
              { value: '50%', label: 'Do atendimento resolvido por agentes IA', icon: Headphones },
              { value: '12 meses', label: 'Tempo médio para ROI comprovado', icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center">
                <stat.icon className="w-8 h-8 text-white/60 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <p className="text-foreground-tertiary text-xs leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verticais */}
      <section id="verticais" className="px-6 py-24 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Automação para Cada Departamento</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Não importa a área — identificamos oportunidades e implementamos soluções que geram impacto real.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Atendimento ao Cliente',
                items: ['Agentes IA 24/7 com 93% de precisão', 'Deflexão de até 30% dos tickets', 'Resolução autônoma de até 50% do volume'],
              },
              {
                title: 'Vendas & Marketing',
                items: ['Qualificação automática de leads', 'Follow-up inteligente e personalizado', 'Redução de até 45% no custo de aquisição'],
              },
              {
                title: 'Financeiro',
                items: ['Automação de faturas e pagamentos', 'Detecção de fraude inteligente', 'Redução de 70-90% no tempo de processamento'],
              },
              {
                title: 'RH & People',
                items: ['Triagem de currículos com IA', 'Onboarding automatizado', '50% mais rápido no time-to-hire'],
              },
              {
                title: 'Operações',
                items: ['Roteamento inteligente de processos', 'Gestão de supply chain com IA', 'Monitoramento e alertas em tempo real'],
              },
              {
                title: 'Jurídico & Compliance',
                items: ['Pesquisa jurídica automatizada', 'Auditoria de compliance com IA', '60% menos horas de pesquisa manual'],
              },
            ].map((vertical) => (
              <div key={vertical.title} className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">{vertical.title}</h3>
                <ul className="space-y-2">
                  {vertical.items.map((item) => (
                    <li key={item} className="text-sm text-foreground-secondary flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferencial */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-10 md:p-14 text-center">
            <Sparkles className="w-10 h-10 text-white/60 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Por que a ROI Labs?
            </h2>
            <p className="text-foreground-tertiary max-w-2xl mx-auto mb-8 leading-relaxed">
              95% dos projetos de IA falham. Nós entregamos os 5% que geram ROI real.
              Não somos um fornecedor de software — somos seu parceiro estratégico de
              transformação digital, do diagnóstico à execução.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              {[
                { title: 'Diagnóstico Gratuito', desc: 'Auditamos seus processos e identificamos as maiores oportunidades de automação.' },
                { title: 'Implementação Completa', desc: 'Desenvolvemos, integramos e colocamos em produção — sem dor de cabeça pra você.' },
                { title: 'ROI Mensurável', desc: 'Acompanhamos métricas de perto e otimizamos continuamente para maximizar resultados.' },
              ].map((item) => (
                <div key={item.title} className="p-4">
                  <h4 className="font-semibold mb-2 text-white">{item.title}</h4>
                  <p className="text-foreground-tertiary text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contato" className="px-6 py-24 bg-background-secondary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" id="sobre">
            Pronto para transformar sua operação?
          </h2>
          <p className="text-foreground-tertiary mb-8 text-lg">
            Agende um diagnóstico gratuito e descubra como IA e automação
            podem reduzir custos e escalar seu negócio.
          </p>
          <a
            href="https://wa.me/5500000000000?text=Olá! Gostaria de agendar um diagnóstico gratuito de IA e Automação."
            target="_blank"
            rel="noopener noreferrer"
            className="button-luxury px-10 py-4 text-lg inline-flex items-center gap-2"
          >
            Falar com um Especialista <MessageSquare className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-white font-bold text-sm tracking-tight">ROI Labs</span>
          <p className="text-foreground-tertiary text-sm">
            &copy; 2026 ROI Labs. Soluções em IA e Automação para Empresas.
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
