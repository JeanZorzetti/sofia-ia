import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  DollarSign,
  Users,
  TrendingUp,
  Share2,
  Gift,
  BarChart3,
  Star,
  Zap,
  MessageSquare,
  Globe,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Programa de Afiliados Sofia AI — Ganhe Indicando a Melhor Plataforma de IA',
  description:
    'Indique o Sofia AI e ganhe comissão recorrente por cada cliente que você trouxer. Programa de afiliados para agências, consultores e criadores de conteúdo de inteligência artificial.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/afiliados' },
  openGraph: {
    title: 'Afiliados Sofia AI — Comissão Recorrente por Indicação',
    description:
      'Ganhe indicando a melhor plataforma de orquestração de agentes IA do Brasil. Comissão recorrente, painel de acompanhamento e suporte dedicado.',
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
}

const benefits = [
  {
    icon: DollarSign,
    title: 'Comissão Recorrente',
    description:
      'Receba 20% de comissão todo mês enquanto seu indicado continuar ativo. Não é um pagamento único — é renda recorrente.',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
  },
  {
    icon: Zap,
    title: 'Fácil de Compartilhar',
    description:
      'Seu link personalizado está no dashboard. Compartilhe no LinkedIn, WhatsApp, email ou onde preferir. Cada clique é rastreado.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },
  {
    icon: BarChart3,
    title: 'Painel de Resultados',
    description:
      'Veja em tempo real quantas pessoas clicaram, se cadastraram e assinaram. Transparência total nos seus ganhos.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Gift,
    title: 'Bônus por Volume',
    description:
      'Quem indica mais, ganha mais. A partir de 5 clientes ativos, sua comissão sobe para 30%. A partir de 20, para 40%.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Users,
    title: 'Ideal para Agências',
    description:
      'Agências e consultores que já usam Sofia AI para seus clientes podem monetizar a indicação e ainda oferecer um produto premium.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Suporte Dedicado',
    description:
      'Afiliados ativos têm acesso ao canal exclusivo no Discord e suporte prioritário para responder dúvidas dos seus indicados.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
]

const tiers = [
  {
    name: 'Starter',
    clients: '1–4 clientes ativos',
    commission: '20%',
    highlight: false,
    perks: ['Link rastreável', 'Painel de comissões', 'Material de divulgação', 'Suporte por email'],
  },
  {
    name: 'Silver',
    clients: '5–19 clientes ativos',
    commission: '30%',
    highlight: true,
    perks: [
      'Tudo do Starter',
      'Canal exclusivo no Discord',
      'Badge de afiliado Silver no perfil',
      'Acesso antecipado a novidades',
    ],
  },
  {
    name: 'Gold',
    clients: '20+ clientes ativos',
    commission: '40%',
    highlight: false,
    perks: [
      'Tudo do Silver',
      'Co-marketing (menção no blog e redes)',
      'Gerente de parceria exclusivo',
      'Sessão mensal de estratégia',
    ],
  },
]

const howItWorks = [
  {
    step: '01',
    title: 'Cadastre-se gratuitamente',
    description: 'Crie sua conta no Sofia AI. Se já tem conta, acesse o painel e ative o programa de afiliados em um clique.',
  },
  {
    step: '02',
    title: 'Copie seu link único',
    description:
      'No dashboard, você encontra seu link personalizado (sofiaia.roilabs.com.br?ref=SEU_ID). Cada cadastro via esse link é atribuído a você.',
  },
  {
    step: '03',
    title: 'Compartilhe para sua audiência',
    description:
      'Poste no LinkedIn, escreva um artigo, grave um vídeo, mande no grupo do WhatsApp — qualquer canal onde seu público confia em você.',
  },
  {
    step: '04',
    title: 'Receba comissão todo mês',
    description:
      'Quando seu indicado assina qualquer plano pago, você começa a receber comissão recorrente todo mês, automaticamente.',
  },
]

const testimonials = [
  {
    name: 'Rafael Costa',
    role: 'Consultor de Marketing Digital',
    text: 'Indiquei Sofia AI para 3 clientes da minha carteira e em 2 meses já recuperei o valor da minha própria assinatura. Produto que vende sozinho.',
    stars: 5,
  },
  {
    name: 'Ana Lima',
    role: 'Agência de Conteúdo',
    text: 'Como agência, já usávamos Sofia para produção de conteúdo dos clientes. Quando vi que tinha programa de afiliados, foi natural indicar. Hoje tenho 12 clientes ativos.',
    stars: 5,
  },
  {
    name: 'Pedro Mendes',
    role: 'Criador de conteúdo sobre IA',
    text: 'Faço conteúdo sobre IA no LinkedIn. Coloquei o link em 1 artigo e trouxe 8 cadastros no primeiro mês. Comissão recorrente é a melhor forma de monetizar audiência.',
    stars: 5,
  },
]

const faqs = [
  {
    q: 'Quando começo a receber a comissão?',
    a: 'A comissão é creditada no mês seguinte à conversão do seu indicado para um plano pago. O pagamento é feito mensalmente via Pix ou transferência bancária.',
  },
  {
    q: 'Por quanto tempo dura a comissão?',
    a: 'Enquanto o cliente indicado mantiver a assinatura ativa. Se ele fizer upgrade para um plano maior, você ganha mais. Se cancelar, a comissão para.',
  },
  {
    q: 'Preciso ser cliente do Sofia AI para ser afiliado?',
    a: 'Sim, você precisa ter uma conta ativa (plano gratuito ou pago) para participar do programa. Isso garante que você indique com conhecimento de causa.',
  },
  {
    q: 'Tem limite de indicações?',
    a: 'Não. Quanto mais você indicar, maior sua comissão (pelo sistema de tiers). Não há teto de ganhos.',
  },
  {
    q: 'Como sei que a indicação foi atribuída a mim?',
    a: 'Usamos cookies de 90 dias e tracking por parâmetro ref= na URL. Se alguém clicar no seu link e se cadastrar em até 90 dias, a indicação é sua.',
  },
]

export default function AfiliadosPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/30 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
            <DollarSign className="h-4 w-4" />
            Programa de Afiliados
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Ganhe indicando
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Sofia AI
            </span>
          </h1>

          <p className="text-xl text-white/60 mb-4 max-w-2xl mx-auto leading-relaxed">
            Indique a plataforma de orquestração de agentes IA mais completa do Brasil e receba{' '}
            <strong className="text-white">comissão recorrente</strong> todo mês.
          </p>

          <p className="text-lg text-green-400 font-semibold mb-10">
            20% a 40% de comissão • Renda recorrente • Sem teto de ganhos
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all text-lg"
            >
              Quero ser afiliado
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium rounded-xl transition-all text-lg"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Números */}
      <section className="py-12 px-4 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '20–40%', label: 'Comissão recorrente' },
            { value: 'Ilimitado', label: 'Indicações por afiliado' },
            { value: '90 dias', label: 'Janela de atribuição' },
            { value: 'Mensal', label: 'Frequência de pagamento' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-green-400 mb-1">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Por que ser afiliado Sofia AI</h2>
          <p className="text-white/50 text-center mb-12 max-w-2xl mx-auto">
            Um produto que as pessoas adoram usar é fácil de indicar. E comissão recorrente significa renda que cresce com você.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className={`rounded-xl p-6 border ${b.bg} flex flex-col gap-3`}
              >
                <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${b.color}`}>
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white">{b.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Como funciona</h2>
          <p className="text-white/50 text-center mb-12">4 passos para começar a ganhar</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {howItWorks.map((step) => (
              <div key={step.step} className="flex gap-5 p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-sm">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers de comissão */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Tiers de comissão</h2>
          <p className="text-white/50 text-center mb-12">
            Quanto mais você cresce, mais você ganha. Os tiers sobem automaticamente conforme seus clientes ativos aumentam.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 border flex flex-col gap-4 ${
                  tier.highlight
                    ? 'border-green-500/40 bg-green-500/10 ring-1 ring-green-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {tier.highlight && (
                  <div className="text-xs font-semibold text-green-400 uppercase tracking-wider">Mais popular</div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                  <p className="text-sm text-white/50 mt-0.5">{tier.clients}</p>
                </div>
                <div className="text-4xl font-bold text-green-400">{tier.commission}</div>
                <ul className="space-y-2">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-white/70">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">O que dizem nossos afiliados</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl p-6 bg-white/5 border border-white/10 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-white/70 leading-relaxed italic">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-white text-sm">{t.name}</div>
                  <div className="text-xs text-white/40">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é ideal */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Ideal para quem</h2>
          <p className="text-white/50 text-center mb-10">
            Qualquer pessoa que fala com empresas ou criadores que se beneficiam de IA pode ser afiliado.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Agências de marketing' },
              { icon: Globe, label: 'Consultores de IA' },
              { icon: TrendingUp, label: 'Criadores de conteúdo' },
              { icon: Share2, label: 'Influencers de tecnologia' },
              { icon: Zap, label: 'Desenvolvedores freelancer' },
              { icon: BarChart3, label: 'Especialistas em automação' },
              { icon: MessageSquare, label: 'Coaches de negócios' },
              { icon: Gift, label: 'Entusiastas de IA' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 text-center"
              >
                <item.icon className="h-5 w-5 text-green-400" />
                <span className="text-xs text-white/70">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas frequentes</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl p-6 bg-white/5 border border-white/10">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 mb-6">
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comece a ganhar hoje
          </h2>
          <p className="text-white/60 mb-8 text-lg leading-relaxed">
            Crie sua conta gratuita, ative o programa de afiliados e compartilhe seu link. Simples assim.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all text-lg"
            >
              Criar conta grátis
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contato"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium rounded-xl transition-all text-lg"
            >
              Falar com a equipe
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
