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
  ExternalLink,
  Table,
  ArrowLeft,
  RefreshCw,
  Plus,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function GoogleSheetsIntegrationPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [testSpreadsheetId, setTestSpreadsheetId] = useState('')
  const [testRange, setTestRange] = useState('Sheet1!A1:D5')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google-sheets/status')
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
    window.location.href = '/api/integrations/google-sheets/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Google Sheets?')) return
    try {
      const res = await fetch('/api/integrations/google-sheets/disconnect', { method: 'DELETE' })
      if (res.ok) {
        setStatus('disconnected')
        setMetadata({})
      }
    } catch {
      alert('Erro ao desconectar')
    }
  }

  const handleTestRead = async () => {
    if (!testSpreadsheetId) {
      alert('Informe o ID da planilha')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/google-sheets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: testSpreadsheetId, range: testRange }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult(JSON.stringify(data, null, 2))
      } else {
        setTestResult(`Erro: ${data.error}`)
      }
    } catch (err) {
      setTestResult('Erro de conexão')
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
            <Table className="h-6 w-6 text-green-600" />
            Google Sheets
          </h1>
          <p className="text-muted-foreground text-sm">
            Leia e escreva dados em planilhas Google Sheets com seus agentes IA
          </p>
        </div>
      </div>

      {successParam === 'true' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          Google Sheets conectado com sucesso!
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
              {metadata.email && (
                <div className="text-sm text-muted-foreground">
                  Conta Google: <span className="font-medium text-foreground">{metadata.email}</span>
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
              <Button onClick={handleConnect} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Conectar Google Sheets
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
                name: 'sheets_read',
                desc: 'Le celulas de uma planilha. Ideal para buscar dados existentes.',
                params: 'spreadsheetId, range',
              },
              {
                name: 'sheets_write',
                desc: 'Escreve/atualiza celulas. Ideal para atualizar dados existentes.',
                params: 'spreadsheetId, range, values',
              },
              {
                name: 'sheets_append',
                desc: 'Adiciona nova linha ao final. Ideal para registrar novos dados.',
                params: 'spreadsheetId, sheetName, row',
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

      {/* Testar leitura */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testar Leitura</CardTitle>
            <CardDescription>
              Teste a conexao lendo dados de uma planilha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="spreadsheetId">ID da Planilha</Label>
              <Input
                id="spreadsheetId"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                value={testSpreadsheetId}
                onChange={(e) => setTestSpreadsheetId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre na URL: docs.google.com/spreadsheets/d/<strong>ID_AQUI</strong>/edit
              </p>
            </div>
            <div>
              <Label htmlFor="range">Range</Label>
              <Input
                id="range"
                placeholder="Sheet1!A1:D5"
                value={testRange}
                onChange={(e) => setTestRange(e.target.value)}
              />
            </div>
            <Button onClick={handleTestRead} disabled={testing}>
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Lendo...</>
              ) : (
                'Testar Leitura'
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
            <li>• <strong>CRM simples</strong>: agente registra leads em planilha automaticamente</li>
            <li>• <strong>Relatorio diario</strong>: agente agendado le dados e gera resumo</li>
            <li>• <strong>Monitoramento de estoque</strong>: agente verifica disponibilidade e alerta</li>
            <li>• <strong>Pipeline de conteudo</strong>: agente le pauta da planilha e gera textos</li>
            <li>• <strong>Coleta de pesquisa</strong>: agente busca dados e organiza em planilha</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
