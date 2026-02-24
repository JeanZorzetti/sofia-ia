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

export default function MakeIntegrationPage() {
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

  const httpModuleConfig = JSON.stringify({
    url: `${baseUrl}/api/v1/integrations/zapier/execute`,
    method: "POST",
    headers: [{ name: "Authorization", value: authHeader }, { name: "Content-Type", value: "application/json" }],
    body: { orchestrationId: "SEU_ORCHESTRATION_ID", input: "{{1.data}}" }
  }, null, 2)

  const pollConfig = JSON.stringify({
    url: `${baseUrl}/api/v1/integrations/zapier/poll`,
    method: "GET",
    headers: [{ name: "Authorization", value: authHeader }]
  }, null, 2)

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
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <GitBranch className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Integração com Make</h1>
            <p className="text-white/60 text-sm">Crie cenários visuais complexos com o module HTTP do Make</p>
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
            <Link href="/dashboard/api-keys" className="inline-flex items-center gap-1 text-sm text-purple-400 hover:underline mt-2">
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
        <h3 className="text-white font-medium mb-2">Arquitetura no Make</h3>
        <p className="text-white/60 text-sm">No Make, você usa o módulo <strong className="text-purple-400">HTTP → Make a request</strong> para chamar a API do Sofia AI. É possível criar cenários que disparam orquestrações, consultam resultados e encadeiam com outros apps.</p>
      </div>

      {/* Passo 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center justify-center">1</span>
          <h2 className="text-lg font-semibold text-white">Obter API Key</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Acesse <Link href="/dashboard/api-keys" className="text-purple-400 hover:underline">Dashboard → API Keys</Link> e copie sua API Key.</p>
      </div>

      {/* Passo 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center justify-center">2</span>
          <h2 className="text-lg font-semibold text-white">Adicionar módulo HTTP no cenário</h2>
        </div>
        <div className="ml-10 space-y-2">
          <p className="text-white/60 text-sm">No Make, clique em <strong>+</strong> → pesquise <strong>HTTP</strong> → selecione <strong>Make a request</strong>. Configure os campos:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white/40 text-xs mb-1">URL</p>
              <p className="text-green-400 font-mono text-xs break-all">{baseUrl}/api/v1/integrations/zapier/execute</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white/40 text-xs mb-1">Método</p>
              <p className="text-green-400 font-mono text-xs">POST</p>
            </div>
            <div className="p-3 bg-white/5 col-span-2 rounded-lg">
              <p className="text-white/40 text-xs mb-1">Header Authorization</p>
              <p className="text-green-400 font-mono text-xs break-all">{authHeader}</p>
            </div>
          </div>
          <p className="text-white/50 text-xs font-mono mt-3">Configuração completa do módulo HTTP:</p>
          <CodeBlock code={httpModuleConfig} />
        </div>
      </div>

      {/* Passo 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center justify-center">3</span>
          <h2 className="text-lg font-semibold text-white">Monitorar execuções (opcional)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Para buscar as últimas execuções e usá-las como trigger, use este endpoint no módulo HTTP:</p>
        <div className="ml-10">
          <CodeBlock code={pollConfig} />
        </div>
      </div>

      {/* Passo 4 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center justify-center">4</span>
          <h2 className="text-lg font-semibold text-white">Processar a resposta</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">A API retorna <code className="text-green-400">{"{ executionId, status }"}</code>. Use o campo <code className="text-green-400">output</code> nos módulos seguintes para processar o resultado da orquestração.</p>
      </div>

      {/* Casos de uso */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <h3 className="text-white font-medium mb-3">Cenários populares no Make</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-white/70">
          <div className="flex items-start gap-2"><span className="text-purple-400">→</span> Google Sheets → Agente de análise → Slack</div>
          <div className="flex items-start gap-2"><span className="text-purple-400">→</span> Webhook → Orquestração → Email via Gmail</div>
          <div className="flex items-start gap-2"><span className="text-purple-400">→</span> HubSpot CRM → Qualificação IA → Atualiza deal</div>
          <div className="flex items-start gap-2"><span className="text-purple-400">→</span> Typeform → Análise IA → Notion database</div>
        </div>
      </div>

      {/* Links */}
      <div className="flex gap-3">
        <Link href="/dashboard/api-keys" className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors">
          <Key className="w-4 h-4" /> Gerenciar API Keys
        </Link>
        <a href="https://make.com/en/register" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
          <ExternalLink className="w-4 h-4" /> Abrir Make
        </a>
      </div>
    </div>
  )
}
