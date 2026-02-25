import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, CheckCircle, Star, Zap, Award, TrendingUp, Shield, Gift, Handshake, Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Programa de Parceiros — Sofia AI | Bronze, Silver, Gold',
  description: 'Junte-se ao programa de parceiros Sofia AI. Revenda, integre ou indique e ganhe comissões recorrentes. Tiers Bronze, Silver e Gold com benefícios exclusivos.',
  keywords: ['programa parceiros sofia ai', 'revenda ia', 'afiliados ia', 'parceiro roilabs', 'comissão ia'],
  openGraph: {
    title: 'Programa de Parceiros Sofia AI',
    description: 'Ganhe comissões recorrentes revendendo a plataforma de orquestração de agentes IA mais completa do Brasil.',
    type: 'website',
    locale: 'pt_BR',
  },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/parceiros' },
}

const tiers = [
  {
    name: 'Bronze',
    Icon: Award,
    gradient: 'from-orange-800/30 to-orange-700/10',
    border: 'border-orange-600/30',
    iconColor: 'text-orange-400',
    badge: null,
    requirement: 'A partir de 1 cliente indicado',
    commission: '15%',
    commissionNote: 'recorrente sobre MRR',
    benefits: [
      'Link de afiliado personalizado',
      '15% de comissão recorrente',
      'Acesso ao portal de parceiros',
      'Materiais de marketing prontos',
      'Suporte por email',
      'Badge "Parceiro Oficial"',
    ],
    cta: 'Começar como Bronze',
  },
  {
    name: 'Silver',
    Icon: Star,
    gradient: 'from-slate-500/20 to-slate-400/10',
    border: 'border-slate-400/40',
    iconColor: 'text-slate-300',
    badge: 'Mais escolhido',
    requirement: 'A partir de 5 clientes ativos',
    commission: '25%',
    commissionNote: 'recorrente sobre MRR',
    benefits: [
      'Tudo do Bronze',
      '25% de comissão recorrente',
      'Co-marketing (blog, redes sociais)',
      'Call mensal de estratégia',
      'Leads qualificados da ROI Labs',
      'Acesso antecipado a features',
      'Suporte prioritário (SLA 24h)',
      'Treinamento exclusivo da plataforma',
    ],
    cta: 'Quero ser Silver',
  },
  {
    name: 'Gold',
    Icon: TrendingUp,
    gradient: 'from-yellow-600/20 to-yellow-500/10',
    border: 'border-yellow-500/40',
    iconColor: 'text-yellow-400',
    badge: 'Elite',
    requirement: 'A partir de 20 clientes ativos',
    commission: '35%',
    commissionNote: 'recorrente + bônus trimestral',
    benefits: [
      'Tudo do Silver',
      '35% de comissão recorrente',
      'Bônus trimestral por volume',
      'Revenue share em White-label',
      'Gerente de parceria dedicado',
      'SLA 4h garantido',
      'Co-venda (demos conjuntas)',
      'Página de parceiro no site Sofia AI',
      'Acesso ao roadmap privado',
      'Contrato de parceria formal',
    ],
    cta: 'Quero ser Gold',
  },
]

const howItWorks = [
  { step: '01', title: 'Cadastre-se', desc: 'Preencha o formulário de interesse. Nossa equipe entra em contato em até 24h.' },
  { step: '02', title: 'Receba seu link', desc: 'Ganhe acesso ao portal de parceiros com seu link único de afiliado rastreável.' },
  { step: '03', title: 'Indique clientes', desc: 'Compartilhe Sofia AI com sua rede. Cada cliente que assinar gera comissão sua.' },
  { step: '04', title: 'Receba recorrente', desc: 'Comissões depositadas mensalmente enquanto o cliente permanecer ativo.' },
]

const faqs = [
  { q: 'Quanto tempo dura a comissão?', a: 'A comissão é recorrente pelo tempo que o cliente permanecer ativo. Não há prazo de expiração para parceiros ativos.' },
  { q: 'Como são calculadas as comissões?', a: 'Sobre o valor líquido da assinatura mensal do cliente. Ex.: cliente Pro (R$297) × 25% = R$74,25/mês recorrente.' },
  { q: 'Como subir de tier?', a: 'O tier sobe automaticamente quando você atinge o número de clientes ativos do próximo nível.' },
  { q: 'Posso combinar parceria com White-label?', a: 'Sim. Parceiros Gold têm acesso ao programa White-label com revenue share especial negociado individualmente.' },
  { q: 'Quando recebo o pagamento?', a: 'Todo dia 10 do mês seguinte via PIX ou TED. Mínimo para saque: R$ 50.' },
]

export default function ParceirosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />



      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-sm text-yellow-300 mb-6">
            <Handshake className="w-4 h-4" /> Comissões recorrentes de até 35%
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Programa de{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Parceiros
            </span>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-xl mx-auto mb-10">
            Indique Sofia AI, cresça com seus clientes e ganhe comissões recorrentes todo mês enquanto eles ficarem ativos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            {[
              { Icon: Gift, text: 'Comissão recorrente vitalícia' },
              { Icon: Shield, text: 'Pagamento garantido dia 10' },
              { Icon: Zap, text: 'Portal de parceiros dedicado' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-yellow-400" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-7 relative flex flex-col bg-gradient-to-b ${tier.gradient} border ${tier.border}`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 rounded-full text-xs font-medium text-black whitespace-nowrap">
                  {tier.badge}
                </div>
              )}
              <div className="mb-6">
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${tier.iconColor}`}>
                  <tier.Icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{tier.name}</h2>
                <p className="text-white/40 text-xs mb-4">{tier.requirement}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.commission}</span>
                  <span className="text-white/40 text-sm">{tier.commissionNote}</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground-secondary">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/contato?type=parceiro"
                className="block text-center py-3 px-6 rounded-xl font-medium transition-all border border-white/20 hover:bg-white/5 text-white"
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Como funciona</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((s) => (
              <div key={s.step} className="text-center">
                <div className="text-4xl font-bold text-white/10 mb-3">{s.step}</div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-foreground-tertiary">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* White-label CTA */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <Building2 className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Quer mais? Conheça o White-label</h2>
          <p className="text-foreground-tertiary text-sm mb-6 max-w-xl mx-auto">
            Além de indicar, revenda Sofia AI com sua própria marca. Margem bruta de 40–70%.
          </p>
          <Link href="/whitelabel" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">
            Saiba mais sobre White-label <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass-card p-5 rounded-xl">
                <h3 className="font-medium text-white mb-2 text-sm">{faq.q}</h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20 bg-background-secondary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-foreground-tertiary mb-8">Cadastre-se agora e comece a ganhar comissões recorrentes.</p>
          <Link href="/contato?type=parceiro" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2">
            Quero ser Parceiro <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>


    </div>
  )
}
