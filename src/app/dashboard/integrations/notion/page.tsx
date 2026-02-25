'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Plus,
  BookOpen,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function NotionIntegrationPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [testDatabaseId, setTestDatabaseId] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/integrations/notion/status')
      if (res.ok) {
        const data = await res.json()
        if (data.connected) {
          setStatus('connected')
          setMetadata(data.metadata || {})
        } else {
          setStatus('disconnected')
        }
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }

  const handleConnect = () => {
    window.location.href = '/api/integrations/notion/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Notion?')) return
    try {
      const res = await fetch('/api/integrations/notion/disconnect', { method: 'DELETE' })
      if (res.ok) {
        setStatus('disconnected')
        setMetadata({})
      }
    } catch {
      alert('Erro ao desconectar')
    }
  }

  const handleTest = async () => {
    if (!testDatabaseId) {
      alert('Informe o ID do database')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/notion/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId: testDatabaseId }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult(JSON.stringify(data, null, 2))
      } else {
        setTestResult(`Erro: ${data.error}`)
      }
    } catch {
      setTestResult('Erro de conexao')
    } finally {
      setTesting(false)
    }
  }

  const successParam = searchParams.get('success')
  const errorParam = searchParams.get('error')

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/integrations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Notion
          </h1>
          <p className="text-muted-foreground text-sm">
            Crie e atualize paginas no Notion com seus agentes IA
          </p>
        </div>
      </div>

      {successParam === 'true' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          Notion conectado com sucesso!
        </div>
      )}

      {errorParam && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <XCircle className="h-5 w-5" />
          Erro ao conectar: {errorParam}
        </div>
      )}

      {/* Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Status da Conexao</CardTitle>
            <Button variant="ghost" size="sm" onClick={checkStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando conexao...
            </div>
          ) : status === 'connected' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">Conectado</span>
                <Badge variant="default" className="bg-green-600">Ativo</Badge>
              </div>
              {metadata.workspaceName && (
                <div className="text-sm text-muted-foreground">
                  Workspace: <span className="font-medium text-foreground">{metadata.workspaceName}</span>
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Nao conectado</span>
              </div>
              <Button onClick={handleConnect} className="bg-black hover:bg-gray-900 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Conectar Notion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tools Disponiveis para Agentes</CardTitle>
          <CardDescription>
            Quando conectado, seus agentes podem usar estas tools automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: 'notion_create_page',
                desc: 'Cria uma pagina em um database. Ideal para registrar novos items.',
                params: 'databaseId, properties',
              },
              {
                name: 'notion_query_database',
                desc: 'Busca paginas em um database com filtro opcional. Retorna ate 20 resultados.',
                params: 'databaseId, filter?',
              },
              {
                name: 'notion_update_page',
                desc: 'Atualiza propriedades de uma pagina existente.',
                params: 'pageId, properties',
              },
            ].map((tool) => (
              <div key={tool.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="font-mono text-sm bg-background px-2 py-1 rounded border shrink-0">
                  {tool.name}
                </div>
                <div className="min-w-0">
                  <p className="text-sm">{tool.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Parametros: <code className="bg-background px-1 rounded">{tool.params}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Testar */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testar Database</CardTitle>
            <CardDescription>
              Teste a conexao buscando dados de um database do Notion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="databaseId">ID do Database</Label>
              <Input
                id="databaseId"
                placeholder="8a4d1c2e3f4b5a6c7d8e9f0a1b2c3d4e"
                value={testDatabaseId}
                onChange={(e) => setTestDatabaseId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre abrindo o database no Notion e copiando o ID da URL
              </p>
            </div>
            <Button onClick={handleTest} disabled={testing}>
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando...</>
              ) : (
                'Testar Query'
              )}
            </Button>
            {testResult && (
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                {testResult}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* Casos de uso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Casos de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Wiki de conhecimento</strong>: agente cria paginas com pesquisas e resumos</li>
            <li>• <strong>Gestao de tarefas</strong>: agente cria e atualiza tarefas no Notion</li>
            <li>• <strong>CRM no Notion</strong>: agente registra leads e clientes automaticamente</li>
            <li>• <strong>Notas de reuniao</strong>: agente processa transcricao e cria nota estruturada</li>
            <li>• <strong>Pipeline de conteudo</strong>: agente busca pauta e cria rascunhos de artigos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
