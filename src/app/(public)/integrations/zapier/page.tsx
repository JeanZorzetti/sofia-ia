import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Zap,
  Key,
  ArrowRight,
  CheckCircle,
  Code2,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integracao Zapier | Sofia AI — Automate with 7,000+ Apps',
  description:
    'Conecte Sofia AI ao Zapier e automatize workflows com mais de 7.000 apps sem escrever codigo. Guia passo-a-passo completo.',
  openGraph: {
    title: 'Sofia AI + Zapier',
    description: 'Automatize orquestracoes de IA com Zapier. Sem codigo necessario.',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
}

const STEPS = [
  {
    num: '1',
    title: 'Gere sua API Key',
    description:
      'Acesse o dashboard da Sofia AI e gere uma API Key em /dashboard/api-keys. Copie a chave que começa com sk_live_.',
    code: null,
    cta: { label: 'Gerar API Key', href: '/dashboard/api-keys' },
  },
  {
    num: '2',
    title: 'Crie um novo Zap',
    description:
      'No Zapier, crie um novo Zap. Escolha o trigger da sua preferencia (ex: "New Row in Google Sheets", "New Lead in HubSpot", "Webhook by Zapier").',
    code: null,
    cta: { label: 'Ir para Zapier', href: 'https://zapier.com/app/zaps' },
  },
  {
    num: '3',
    title: 'Adicione a Action HTTP Request',
    description:
      'Na etapa de Action, escolha "Webhooks by Zapier" > "POST". Configure a URL, adicione o header x-api-key com sua chave e o body JSON.',
    code: `URL: https://sofiaia.roilabs.com.br/api/v1/integrations/zapier/execute

Headers:
  x-api-key: sk_live_SEU_TOKEN
  Content-Type: application/json

Body (JSON):
{
  "orchestrationId": "ID_DA_ORQUESTRACAO",
  "input": "{{triggerData}}"
}`,
    cta: null,
  },
  {
    num: '4',
    title: 'Monitore as execucoes',
    description:
      'Acompanhe todas as execucoes disparadas pelo Zapier no seu dashboard da Sofia AI em tempo real.',
    code: null,
    cta: { label: 'Ver Dashboard', href: '/dashboard/orchestrations' },
  },
]

const USE_CASES = [
  {
    title: 'CRM → Proposta com IA',
    description:
      'Novo lead no HubSpot → Zapier dispara orquestracao → Sofia gera proposta personalizada → envia por email.',
    icon: '🎯',
  },
  {
    title: 'Email → Triagem Automatica',
    description:
      'Email recebido no Gmail → Zapier captura → Sofia classifica e responde → notifica no Slack.',
    icon: '📧',
  },
  {
    title: 'Planilha → Analise de Dados',
    description:
      'Nova linha no Google Sheets → Zapier envia para Sofia → agente analisa e gera resumo → salva em Notion.',
    icon: '📊',
  },
  {
    title: 'Formulario → Onboarding',
    description:
      'Form TypeForm preenchido → Zapier notifica → Sofia gera sequencia de onboarding personalizada.',
    icon: '📋',
  },
]

export default function ZapierIntegrationPage() {
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
            <span className="text-white/60 text-sm">Zapier</span>
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
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Popular
              </span>
            </div>
            <h1 className="text-3xl font-bold">Sofia AI + Zapier</h1>
            <p className="text-white/50 mt-1">
              Conecte orquestracoes de IA a 7.000+ apps sem escrever codigo
            </p>
          </div>
        </div>

        <p className="text-white/60 text-lg leading-relaxed mb-12">
          Com a integracao Zapier, voce pode disparar orquestracoes de IA da Sofia como action
          de qualquer Zap. Quando um formulario e preenchido, um email chega, um lead e criado
          no CRM ou qualquer outro evento — Sofia entra em acao automaticamente.
        </p>

        {/* Steps */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Como Configurar (Passo a Passo)</h2>
          <div className="space-y-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-white/[0.03] border border-white/5 rounded-xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-400">{step.num}</span>
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
                        className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors"
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

        {/* Polling endpoint */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Endpoint de Polling (Trigger)</h2>
          <p className="text-white/50 mb-6">
            Voce tambem pode usar a Sofia como trigger no Zapier via polling. O endpoint abaixo
            retorna as ultimas 10 execucoes concluidas, compativel com o formato de polling do Zapier.
          </p>
          <div className="bg-black/40 rounded-xl p-5 font-mono text-sm overflow-x-auto">
            <pre className="text-white/70 whitespace-pre">{`# Polling trigger: ultimas execucoes concluidas
GET https://sofiaia.roilabs.com.br/api/v1/integrations/zapier/poll
Headers:
  x-api-key: sk_live_SEU_TOKEN

# Resposta (array Zapier-compatible):
[
  {
    "id": "exec_123",
    "timestamp": "2026-02-24T10:30:00Z",
    "orchestrationId": "orch_456",
    "orchestrationName": "Agente de Vendas",
    "status": "completed",
    "output": { ... }
  }
]`}</pre>
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Casos de Uso</h2>
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

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Pronto para automatizar?</h2>
          <p className="text-white/50 mb-6">
            Gere sua API Key e conecte Sofia AI ao Zapier em menos de 5 minutos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard/api-keys"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-medium transition-colors"
            >
              <Key className="w-4 h-4" /> Gerar API Key
            </Link>
            <a
              href="https://zapier.com/app/zaps"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/80 font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Abrir Zapier
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
