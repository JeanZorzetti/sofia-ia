import type { Metadata } from 'next'
import Link from 'next/link'
import { Key, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integracao n8n | Sofia AI — Open Source Workflow Automation',
  description:
    'Conecte Sofia AI ao n8n com o HTTP Request node. Guia completo com exemplo de workflow JSON para automacao open source.',
  openGraph: {
    title: 'Sofia AI + n8n',
    description: 'Automatize orquestracoes de IA com n8n. Open source e self-hosted.',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
}

const N8N_WORKFLOW_JSON = `{
  "name": "Sofia AI - Executar Orquestracao",
  "nodes": [
    {
      "parameters": {},
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [240, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://sofiaia.roilabs.com.br/api/v1/integrations/zapier/execute",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "sk_live_SEU_TOKEN"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "bodyParameters": {
          "parameters": [
            {
              "name": "orchestrationId",
              "value": "ID_DA_ORQUESTRACAO"
            },
            {
              "name": "input",
              "value": "={{ $json.input }}"
            }
          ]
        }
      },
      "name": "Sofia AI - Execute",
      "type": "n8n-nodes-base.httpRequest",
      "position": [460, 300]
    }
  ],
  "connections": {
    "Manual Trigger": {
      "main": [[ { "node": "Sofia AI - Execute", "type": "main", "index": 0 } ]]
    }
  }
}`

const STEPS = [
  {
    num: '1',
    title: 'Gere sua API Key',
    description:
      'Acesse o dashboard da Sofia AI e gere uma API Key em /dashboard/api-keys. A chave comeca com sk_live_.',
    cta: { label: 'Gerar API Key', href: '/dashboard/api-keys' },
  },
  {
    num: '2',
    title: 'Abra o n8n e crie um workflow',
    description:
      'No n8n (app.n8n.cloud ou sua instancia self-hosted), crie um novo workflow. Adicione o trigger de sua escolha (Webhook, Cron, etc.).',
    cta: { label: 'Abrir n8n', href: 'https://app.n8n.cloud' },
  },
  {
    num: '3',
    title: 'Adicione o node HTTP Request',
    description:
      'Adicione o node "HTTP Request". Configure metodo POST, URL do endpoint e o header x-api-key com sua chave.',
    cta: null,
  },
  {
    num: '4',
    title: 'Configure o body JSON',
    description:
      'No campo Body, selecione JSON e passe o orchestrationId e o input (pode ser uma expressao do n8n como {{ $json.text }}).',
    cta: null,
  },
  {
    num: '5',
    title: 'Use o workflow JSON de exemplo',
    description:
      'Importe o workflow JSON abaixo diretamente no n8n (Menu > Import from JSON) para comecar mais rapido.',
    cta: null,
  },
]

const USE_CASES = [
  {
    title: 'Webhook → Processamento IA',
    description:
      'Webhook externo recebido → n8n processa → Sofia IA analisa e responde → resultado gravado no banco.',
    icon: '🔗',
  },
  {
    title: 'Cron → Relatorio Automatico',
    description:
      'Execucao agendada pelo n8n toda segunda-feira → Sofia gera relatorio semanal → envia por email.',
    icon: '⏰',
  },
  {
    title: 'Ticket de Suporte → Rascunho',
    description:
      'Novo ticket no Jira/Zendesk → n8n captura → Sofia gera rascunho de resposta → agente humano revisa.',
    icon: '🎫',
  },
  {
    title: 'RSS → Curadoria de Conteudo',
    description:
      'Feed RSS monitorado pelo n8n → Sofia AI resume e avalia relevancia → postar highlights no Slack.',
    icon: '📰',
  },
]

export default function N8nIntegrationPage() {
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
            <span className="text-white/60 text-sm">n8n</span>
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
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-green-300">n8n</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                Open Source
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">
                Self-hosted
              </span>
            </div>
            <h1 className="text-3xl font-bold">Sofia AI + n8n</h1>
            <p className="text-white/50 mt-1">
              Automacao open source e self-hosted com o HTTP Request node
            </p>
          </div>
        </div>

        <p className="text-white/60 text-lg leading-relaxed mb-12">
          O n8n e uma plataforma de automacao de workflows open source que pode ser
          self-hosted para maximo controle. Integre a Sofia AI via HTTP Request node
          para criar workflows poderosos que combinam IA com qualquer ferramenta.
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
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-400">{step.num}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-white/50 mb-3">{step.description}</p>
                    {step.cta && (
                      <a
                        href={step.cta.href}
                        target={step.cta.href.startsWith('http') ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors"
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

        {/* Workflow JSON */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Workflow JSON de Exemplo</h2>
          <p className="text-white/50 mb-4">
            Importe diretamente no n8n: Menu superior {'->'} Import from JSON {'->'} cole o conteudo abaixo.
          </p>
          <div className="bg-black/40 rounded-xl p-5 font-mono text-xs overflow-x-auto">
            <pre className="text-white/70 whitespace-pre">{N8N_WORKFLOW_JSON}</pre>
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Casos de Uso com n8n</h2>
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

        {/* Self-hosted tip */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 mb-12">
          <h3 className="font-semibold text-green-300 mb-2">n8n Self-Hosted</h3>
          <p className="text-sm text-white/50">
            Se voce usa n8n self-hosted, certifique-se que sua instancia consegue acessar
            sofiaia.roilabs.com.br. Para ambientes na mesma rede privada, use
            /api/v1/integrations/zapier/execute com o IP interno, se configurado.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Automatize com n8n hoje</h2>
          <p className="text-white/50 mb-6">
            Gere sua API Key e importe o workflow de exemplo no n8n para comecar em minutos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard/api-keys"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-medium transition-colors"
            >
              <Key className="w-4 h-4" /> Gerar API Key
            </Link>
            <a
              href="https://n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/80 font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Site do n8n
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
