import type { Metadata } from 'next'
import Link from 'next/link'
import { Key, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integracao Make | Polaris IA — Automate with Make (Integromat)',
  description:
    'Conecte Polaris IA ao Make (Integromat) e automatize fluxos com centenas de apps. Guia passo-a-passo com HTTP module.',
  openGraph: {
    title: 'Polaris IA + Make',
    description: 'Automatize orquestracoes de IA com Make (Integromat).',
    images: [{ url: 'https://polarisia.com.br/opengraph-image', width: 1200, height: 630, alt: 'Polaris IA — Orquestração de Agentes IA' }],

  },
}

const STEPS = [
  {
    num: '1',
    title: 'Gere sua API Key',
    description:
      'No dashboard da Polaris IA, acesse /dashboard/api-keys e gere uma nova chave. Anote o token sk_live_ gerado.',
    code: null,
    cta: { label: 'Gerar API Key', href: '/dashboard/api-keys' },
  },
  {
    num: '2',
    title: 'Crie um novo Cenario no Make',
    description:
      'No Make (make.com), crie um novo Scenario. Adicione o trigger de sua preferencia (Webhook, Google Sheets, Gmail, etc.).',
    code: null,
    cta: { label: 'Ir para Make', href: 'https://make.com' },
  },
  {
    num: '3',
    title: 'Adicione o modulo HTTP',
    description:
      'Adicione o modulo "HTTP" > "Make a request". Configure metodo POST, URL do endpoint Polaris IA, e os headers necessarios.',
    code: `Metodo: POST
URL: https://polarisia.com.br/api/v1/integrations/zapier/execute

Headers:
  x-api-key: sk_live_SEU_TOKEN
  Content-Type: application/json

Body type: Raw
Content-Type: application/json
Content:
{
  "orchestrationId": "ID_DA_ORQUESTRACAO",
  "input": "{{trigger.data}}"
}`,
    cta: null,
  },
  {
    num: '4',
    title: 'Mapeie os dados do trigger',
    description:
      'Use o mapeamento visual do Make para inserir os dados do trigger no campo "input". Por exemplo, o conteudo de um formulario ou email.',
    code: null,
    cta: null,
  },
  {
    num: '5',
    title: 'Ative e monitore',
    description:
      'Ative o cenario no Make e monitore as execucoes tanto no Make quanto no dashboard da Polaris IA.',
    code: null,
    cta: { label: 'Dashboard Polaris IA', href: '/dashboard/orchestrations' },
  },
]

const USE_CASES = [
  {
    title: 'TypeForm → Analise de Sentimento',
    description:
      'Formulario preenchido → Make captura respostas → Polaris IA analisa sentimento e urgencia → atualiza CRM.',
    icon: '📝',
  },
  {
    title: 'Instagram → Repurposing',
    description:
      'Post publicado no Instagram → Make detecta → Polaris IA gera variacoes para LinkedIn, Twitter e newsletter.',
    icon: '📸',
  },
  {
    title: 'Google Calendar → Briefing',
    description:
      'Reuniao criada no Google Calendar → Make dispara → Polaris IA gera briefing automatico com contexto.',
    icon: '📅',
  },
  {
    title: 'Slack → Resumo de Canal',
    description:
      'Mensagens do Slack coletadas pelo Make → Polaris IA resume e extrai action items → posta no canal de gestao.',
    icon: '💬',
  },
]

export default function MakeIntegrationPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/integrations"
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Integracoes
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white/60 text-sm">Make</span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-purple-300">M</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Polaris IA + Make</h1>
            <p className="text-white/50 mt-1">
              Automacao visual com o modulo HTTP do Make (Integromat)
            </p>
          </div>
        </div>

        <p className="text-white/60 text-lg leading-relaxed mb-12">
          O Make e uma plataforma visual de automacao com centenas de integracoes nativas.
          Com o modulo HTTP, voce conecta a Polaris IA a qualquer ferramenta em minutos —
          sem codigo, sem instalacoes adicionais.
        </p>

        {/* Steps */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Como Configurar</h2>
          <div className="space-y-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-white/[0.03] border border-white/5 rounded-xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-400">{step.num}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-white/50 mb-3">{step.description}</p>
                    {step.code && (
                      <div className="bg-black/40 rounded-lg p-4 font-mono text-xs overflow-x-auto mb-3">
                        <pre className="text-white/70 whitespace-pre">{step.code}</pre>
                      </div>
                    )}
                    {step.cta && (
                      <a
                        href={step.cta.href}
                        target={step.cta.href.startsWith('http') ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {step.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Exemplos de Cenarios</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="bg-white/[0.03] border border-white/5 rounded-xl p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{uc.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{uc.title}</h3>
                    <p className="text-sm text-white/50">{uc.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tip */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6 mb-12">
          <h3 className="font-semibold text-purple-300 mb-2">Dica: Use Webhooks como Trigger</h3>
          <p className="text-sm text-white/50">
            Para receber o resultado da execucao em tempo real, configure a Polaris IA para enviar
            um webhook de saida em /dashboard/settings/webhooks. Adicione o URL de um webhook
            do Make como destino para capturar o output da orquestracao.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Comece a automatizar agora</h2>
          <p className="text-white/50 mb-6">
            Gere sua API Key e crie seu primeiro cenario no Make em minutos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard/api-keys"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-medium transition-colors"
            >
              <Key className="w-4 h-4" /> Gerar API Key
            </Link>
            <a
              href="https://make.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/80 font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Abrir Make
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
