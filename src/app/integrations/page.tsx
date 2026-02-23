import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Zap,
  Code2,
  Webhook,
  GitBranch,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Key,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integrações | Sofia AI — Conecte com Zapier, n8n, Make e mais',
  description:
    'Integre a Sofia AI com as ferramentas que você já usa: Zapier, n8n, Make, Slack, Discord e qualquer sistema via REST API. Sem código necessário.',
  openGraph: {
    title: 'Integrações Sofia AI',
    description: 'Conecte Sofia AI com Zapier, n8n, Make, Slack, Discord e API REST.',
  },
}

const INTEGRATIONS = [
  {
    id: 'zapier',
    name: 'Zapier',
    logo: 'https://cdn.brandfetch.io/id_ehFG80T/w/400/h/400/theme/dark/logo.png?c=1id_elSSS47-A13Q7h7',
    description:
      'Conecte Sofia AI a 7.000+ apps sem código. Dispare orquestrações quando um formulário é preenchido, um email chega ou uma nova linha aparece na planilha.',
    how: 'Use o webhook do Zapier como trigger ou action. Envie um POST para `/api/public/orchestrations/:id/run` com sua API Key.',
    useCases: [
      'Novo lead no CRM → gera proposta com IA',
      'Email recebido → triagem e resposta automática',
      'Nova linha no Google Sheets → análise e resumo',
    ],
    docsUrl: 'https://zapier.com/apps/webhooks',
    badge: 'Popular',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  },
  {
    id: 'n8n',
    name: 'n8n',
    logo: null,
    logoText: 'n8n',
    description:
      'Automação de fluxos open-source e self-hosted. Use o nó HTTP Request para chamar a API da Sofia e integrar com qualquer sistema interno.',
    how: 'Adicione um nó HTTP Request no seu workflow n8n apontando para `/api/public/orchestrations/:id/run` com header `x-api-key`.',
    useCases: [
      'Webhook externo → processa com IA → grava no banco',
      'Agenda → relatório automático via agentes',
      'Ticket de suporte → resposta rascunhada por IA',
    ],
    docsUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/',
    badge: 'Open Source',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30',
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    logo: null,
    logoText: 'Make',
    description:
      'Plataforma visual de automação com módulos HTTP. Construa cenários que acionam orquestrações de IA em resposta a qualquer evento.',
    how: 'Use o módulo HTTP > Make a Request no Make, configure método POST, URL da API Sofia e header `x-api-key` com sua chave.',
    useCases: [
      'Formulário TypeForm → análise de sentimento + CRM',
      'Post no Instagram → repurposing de conteúdo automático',
      'Evento no Google Calendar → briefing gerado por IA',
    ],
    docsUrl: 'https://www.make.com/en/help/tools/http',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'slack',
    name: 'Slack',
    logo: null,
    logoText: 'Slack',
    description:
      'Receba notificações de execuções concluídas diretamente no seu canal Slack. Configure via Incoming Webhook em Settings > Webhooks.',
    how: 'Crie um Incoming Webhook no Slack e adicione a URL em /dashboard/settings/webhooks. Escolha os eventos para notificar.',
    useCases: [
      'Orquestração concluída → mensagem no #marketing',
      'Execução falhou → alerta no #alerts',
      'Resumo diário → postado automaticamente no canal',
    ],
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'discord',
    name: 'Discord',
    logo: null,
    logoText: 'Discord',
    description:
      'Envie resultados de orquestrações para canais do Discord. Ideal para times que usam Discord como hub de comunicação.',
    how: 'Crie um Webhook no Discord (configurações do canal > Integrações > Webhooks) e adicione a URL em /dashboard/settings/webhooks.',
    useCases: [
      'Análise de competidores → postada no canal da equipe',
      'Geração de conteúdo → compartilhada para revisão',
      'Relatório de execuções → resumo diário automático',
    ],
    docsUrl: 'https://discord.com/developers/docs/resources/webhook',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'api',
    name: 'REST API Direta',
    logo: null,
    logoText: '</> API',
    description:
      'Integre a Sofia AI em qualquer sistema com nossa REST API. Perfeita para aplicações customizadas, scripts e integrações que não têm plataforma de automação.',
    how: 'Gere uma API Key em /dashboard/api-keys, use como header `x-api-key` e chame os endpoints disponíveis.',
    useCases: [
      'Aplicativo interno chama orquestração via backend',
      'Script Python processa documentos em lote',
      'Webhook de e-commerce aciona análise de pedido',
    ],
    docsUrl: '/docs',
    badge: 'Recomendado',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
]

const STEPS = [
  {
    step: '1',
    title: 'Crie uma API Key',
    description: 'Acesse /dashboard/api-keys e gere sua chave de acesso (sk_live_...).',
    href: '/dashboard/api-keys',
    icon: Key,
  },
  {
    step: '2',
    title: 'Escolha sua plataforma',
    description: 'Selecione Zapier, n8n, Make ou use a API REST diretamente.',
    href: null,
    icon: GitBranch,
  },
  {
    step: '3',
    title: 'Configure o endpoint',
    description: 'Aponte para /api/public/orchestrations/:id/run com sua API Key no header.',
    href: '/docs',
    icon: Webhook,
  },
  {
    step: '4',
    title: 'Monitore as execuções',
    description: 'Acompanhe todas as execuções no dashboard em tempo real.',
    href: '/dashboard/orchestrations',
    icon: CheckCircle,
  },
]

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500" />
            Sofia AI
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors"
            >
              Acessar dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm mb-6">
          <Zap className="w-3.5 h-3.5" />
          Integrações nativas e via API
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
          Conecte Sofia AI com
          <br />
          as ferramentas que você usa
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
          Zapier, n8n, Make, Slack, Discord ou API REST direta — integre orquestrações de IA
          em qualquer fluxo de trabalho sem escrever uma linha de código.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard/api-keys"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors"
          >
            <Key className="w-4 h-4" /> Gerar API Key
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/80 font-medium transition-colors"
          >
            <Code2 className="w-4 h-4" /> Ver documentação
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-10">Como funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.step}
              className="bg-white/[0.03] border border-white/5 rounded-xl p-5 relative"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <step.icon className="w-4 h-4 text-blue-400" />
              </div>
              <div className="absolute top-4 right-4 text-xs font-mono text-white/20">{step.step}</div>
              <h3 className="font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-white/50 mb-3">{step.description}</p>
              {step.href && (
                <Link
                  href={step.href}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  Ir para {step.href} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Integrations grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-2">Integrações disponíveis</h2>
        <p className="text-white/40 text-center text-sm mb-10">
          Qualquer plataforma que suporte HTTP pode se integrar com a Sofia AI
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.id}
              className="bg-white/[0.03] border border-white/5 rounded-xl p-6 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    {integration.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={integration.logo} alt={integration.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <span className="text-xs font-bold text-white/60">{integration.logoText}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white">{integration.name}</h3>
                </div>
                {integration.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${integration.badgeColor} flex-shrink-0`}>
                    {integration.badge}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-white/50 mb-4 flex-1">{integration.description}</p>

              {/* How */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 mb-4">
                <p className="text-xs text-white/30 font-medium mb-1 uppercase tracking-wider">Como configurar</p>
                <p className="text-xs text-white/50">{integration.how}</p>
              </div>

              {/* Use cases */}
              <div className="space-y-1.5 mb-4">
                {integration.useCases.map((uc, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-white/50">{uc}</span>
                  </div>
                ))}
              </div>

              {/* Link */}
              <a
                href={integration.docsUrl}
                target={integration.docsUrl.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-auto"
              >
                Ver documentação <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Code example */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-2">Exemplo rápido via cURL</h2>
          <p className="text-white/40 text-sm mb-6">
            Com sua API Key, disparar uma orquestração é uma única chamada HTTP.
          </p>
          <div className="bg-black/40 rounded-xl p-5 font-mono text-sm overflow-x-auto">
            <pre className="text-white/80 whitespace-pre">{`# 1. Listar suas orquestrações
curl https://sofiaia.roilabs.com.br/api/public/orchestrations \\
  -H "x-api-key: sk_live_SEU_TOKEN"

# 2. Disparar uma execução
curl -X POST https://sofiaia.roilabs.com.br/api/public/orchestrations/ID/run \\
  -H "x-api-key: sk_live_SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Crie um briefing para lançamento do produto X"}'

# 3. Verificar o resultado
curl https://sofiaia.roilabs.com.br/api/public/executions/EXECUTION_ID \\
  -H "x-api-key: sk_live_SEU_TOKEN"`}</pre>
          </div>
          <div className="flex gap-4 mt-6">
            <Link
              href="/docs"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
            >
              <Code2 className="w-4 h-4" /> Documentação completa
            </Link>
            <a
              href="/api/docs/openapi.json"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/70 text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> OpenAPI spec (JSON)
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Pronto para integrar?</h2>
        <p className="text-white/50 mb-8 max-w-xl mx-auto">
          Crie sua conta gratuita, gere uma API Key e conecte Sofia AI ao seu fluxo de trabalho hoje.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-semibold text-lg transition-all"
        >
          Criar conta grátis <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-white/30 text-sm">
        <p>© {new Date().getFullYear()} ROI Labs — Sofia AI</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/docs" className="hover:text-white/60 transition-colors">Docs</Link>
          <Link href="/blog" className="hover:text-white/60 transition-colors">Blog</Link>
          <Link href="/contato" className="hover:text-white/60 transition-colors">Contato</Link>
          <a href="/api/docs/openapi.json" className="hover:text-white/60 transition-colors">OpenAPI</a>
        </div>
      </footer>
    </div>
  )
}
