'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, CheckCircle, GitBranch, ExternalLink, Key, AlertCircle } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  keyPreview: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="ml-2 p-1 rounded hover:bg-white/10 transition-colors" title="Copiar">
      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <CopyButton text={code} />
      <pre className="text-green-400 whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

export default function N8nIntegrationPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/api-keys')
      .then(r => r.json())
      .then(d => { if (d.success) setApiKeys(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const firstKey = apiKeys[0]
  const baseUrl = 'https://sofiaia.roilabs.com.br'
  const authHeader = firstKey ? `Bearer ${firstKey.keyPreview}` : 'Bearer sk-xxxxxxxxxxxxxxxx'

  const httpRequestNode = JSON.stringify({
    nodes: [
      {
        name: "Execute Sofia Orchestration",
        type: "n8n-nodes-base.httpRequest",
        parameters: {
          method: "POST",
          url: `${baseUrl}/api/v1/integrations/zapier/execute`,
          authentication: "genericCredentialType",
          genericAuthType: "httpHeaderAuth",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "Authorization", value: authHeader },
              { name: "Content-Type", value: "application/json" }
            ]
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "orchestrationId", value: "={{ $json.orchestrationId }}" },
              { name: "input", value: "={{ $json.input }}" }
            ]
          }
        }
      }
    ]
  }, null, 2)

  const pollNode = JSON.stringify({
    name: "Get Recent Executions",
    type: "n8n-nodes-base.httpRequest",
    parameters: {
      method: "GET",
      url: `${baseUrl}/api/v1/integrations/zapier/poll`,
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Authorization", value: authHeader }]
      }
    }
  }, null, 2)

  const curlTest = `curl -X POST "${baseUrl}/api/v1/integrations/zapier/execute" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"orchestrationId": "SEU_ORCHESTRATION_ID", "input": "teste"}'`

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/integrations">
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <GitBranch className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Integração com n8n</h1>
            <p className="text-white/60 text-sm">Workflows self-hosted com o HTTP Request node</p>
          </div>
        </div>
      </div>

      {/* API Key warning */}
      {!loading && apiKeys.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-medium">Você ainda não tem uma API Key</p>
            <p className="text-white/60 text-sm mt-1">Crie uma API Key para usar nos exemplos abaixo.</p>
            <Link href="/dashboard/api-keys" className="inline-flex items-center gap-1 text-sm text-green-400 hover:underline mt-2">
              <Key className="w-3 h-3" /> Criar API Key
            </Link>
          </div>
        </div>
      )}

      {!loading && apiKeys.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-300 font-medium">API Key detectada: {firstKey.name}</p>
            <p className="text-white/60 text-sm mt-1">Os exemplos já estão preenchidos com <code className="text-green-400">{firstKey.keyPreview}</code>.</p>
          </div>
        </div>
      )}

      {/* Conceito */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <h3 className="text-white font-medium mb-2">Por que n8n + Sofia AI?</h3>
        <p className="text-white/60 text-sm">n8n é open-source e pode rodar self-hosted. Ideal para times que precisam de privacidade de dados. O node <strong className="text-green-400">HTTP Request</strong> integra diretamente com a API REST do Sofia AI.</p>
      </div>

      {/* Passo 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">1</span>
          <h2 className="text-lg font-semibold text-white">Criar API Key no Sofia AI</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Acesse <Link href="/dashboard/api-keys" className="text-green-400 hover:underline">Dashboard → API Keys</Link> e crie uma key. Copie o valor completo (exibido apenas uma vez).</p>
      </div>

      {/* Passo 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">2</span>
          <h2 className="text-lg font-semibold text-white">Adicionar credencial no n8n</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">No n8n, vá em <strong>Credentials → New</strong> → selecione <strong>Header Auth</strong>. Configure:</p>
        <div className="ml-10 grid grid-cols-2 gap-2 text-sm">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-white/40 text-xs mb-1">Name</p>
            <p className="text-green-400 font-mono text-xs">Authorization</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-white/40 text-xs mb-1">Value</p>
            <p className="text-green-400 font-mono text-xs break-all">{authHeader}</p>
          </div>
        </div>
      </div>

      {/* Passo 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">3</span>
          <h2 className="text-lg font-semibold text-white">Importar node HTTP Request</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Adicione um node <strong>HTTP Request</strong> no seu workflow. Você pode copiar esta configuração JSON e importar diretamente:</p>
        <div className="ml-10">
          <CodeBlock code={httpRequestNode} />
        </div>
      </div>

      {/* Passo 4 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">4</span>
          <h2 className="text-lg font-semibold text-white">Buscar execuções recentes (Polling Trigger)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Para usar como trigger de novos resultados, configure um node de polling:</p>
        <div className="ml-10">
          <CodeBlock code={pollNode} />
        </div>
      </div>

      {/* Passo 5 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">5</span>
          <h2 className="text-lg font-semibold text-white">Testar via cURL antes de configurar no n8n</h2>
        </div>
        <div className="ml-10">
          <CodeBlock code={curlTest} />
        </div>
      </div>

      {/* Casos de uso */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <h3 className="text-white font-medium mb-3">Workflows populares com n8n</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-white/70">
          <div className="flex items-start gap-2"><span className="text-green-400">→</span> Webhook → Orquestração IA → PostgreSQL</div>
          <div className="flex items-start gap-2"><span className="text-green-400">→</span> RSS feed → Análise → Telegram bot</div>
          <div className="flex items-start gap-2"><span className="text-green-400">→</span> GitHub issues → Triage IA → Slack</div>
          <div className="flex items-start gap-2"><span className="text-green-400">→</span> Cron job → Relatório IA → Email</div>
        </div>
      </div>

      {/* Dica self-hosted */}
      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
        <h3 className="text-green-400 font-medium mb-2 text-sm">Dica: n8n Self-Hosted</h3>
        <p className="text-white/60 text-xs">Rodando n8n localmente? Use <code className="text-green-400">WEBHOOK_URL</code> e certifique-se que seu servidor tem acesso externo para receber callbacks. O Sofia AI está hospedado em Vercel (HTTPS).</p>
      </div>

      {/* Links */}
      <div className="flex gap-3">
        <Link href="/dashboard/api-keys" className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors">
          <Key className="w-4 h-4" /> Gerenciar API Keys
        </Link>
        <a href="https://n8n.io/integrations/http-request/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
          <ExternalLink className="w-4 h-4" /> Docs n8n HTTP Request
        </a>
      </div>
    </div>
  )
}
