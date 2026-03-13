'use client'

import { useState, useEffect, Suspense } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle,
  XCircle,
  Loader2,
  Table,
  ArrowLeft,
  RefreshCw,
  Plus,
  BookOpen,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface Agent {
  id: string
  name: string
  config: Record<string, unknown>
}

function GoogleSheetsContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [testSpreadsheetId, setTestSpreadsheetId] = useState('')
  const [testRange, setTestRange] = useState('Sheet1!A1:D5')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [importConfig, setImportConfig] = useState<Record<string, { spreadsheetId: string; sheetName: string }>>({})
  const [savingImport, setSavingImport] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
    fetchAgents()
  }, [])

  useEffect(() => {
    const s = searchParams.get('success')
    const e = searchParams.get('error')
    if (s === 'true') toast.success('Google Sheets conectado com sucesso!')
    if (e) toast.error(`Erro ao conectar: ${e}`)
  }, [searchParams])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google-sheets/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data.connected ? 'connected' : 'disconnected')
        setMetadata(data.metadata || {})
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      const list: Agent[] = (data.agents || []).map((a: { id: string; name: string; config: unknown }) => ({
        id: a.id,
        name: a.name,
        config: (a.config || {}) as Record<string, unknown>,
      }))
      setAgents(list)
      // Pré-preencher campos com config existente
      const initial: Record<string, { spreadsheetId: string; sheetName: string }> = {}
      for (const a of list) {
        initial[a.id] = {
          spreadsheetId: (a.config.sheetsImportSpreadsheetId as string) || '',
          sheetName: (a.config.sheetsImportSheetName as string) || 'Sheet1',
        }
      }
      setImportConfig(initial)
    } catch { /* ignore */ }
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
        toast.success('Desconectado')
      }
    } catch {
      toast.error('Erro ao desconectar')
    }
  }

  const handleTestRead = async () => {
    if (!testSpreadsheetId) {
      toast.error('Informe o ID da planilha')
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
      setTestResult(res.ok ? JSON.stringify(data, null, 2) : `Erro: ${data.error}`)
    } catch {
      setTestResult('Erro de conexão')
    } finally {
      setTesting(false)
    }
  }

  const enableImportForAgent = async (agentId: string) => {
    const cfg = importConfig[agentId]
    if (!cfg?.spreadsheetId) {
      toast.error('Informe o ID da planilha')
      return
    }
    setSavingImport(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/sheets-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: cfg.spreadsheetId, sheetName: cfg.sheetName || 'Sheet1' }),
      })
      if (res.ok) {
        toast.success('Importação de leads configurada!')
        fetchAgents()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Erro ao configurar')
      }
    } finally {
      setSavingImport(null)
    }
  }

  const disableImportForAgent = async (agentId: string) => {
    setSavingImport(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/sheets-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })
      if (res.ok) {
        toast.success('Importação desabilitada')
        fetchAgents()
      }
    } finally {
      setSavingImport(null)
    }
  }

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

      {/* Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Status da Conexão</CardTitle>
            <Button variant="ghost" size="sm" onClick={checkStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando conexão...
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
                <span className="text-muted-foreground">Não conectado</span>
              </div>
              <Button onClick={handleConnect} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Conectar Google Sheets
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Importação de Leads */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Importação de Leads por Agente
            </CardTitle>
            <CardDescription>
              Configure qual agente importa leads de uma planilha e envia saudação automática via WhatsApp.
              Colunas esperadas: A=Telefone, B=Nome, C=Empresa, D=Notas, E=Status (preenchido pelo cron).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agents.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum agente encontrado.</p>
            )}
            {agents.map(agent => {
              const enabled = !!agent.config.sheetsImportEnabled
              const cfg = importConfig[agent.id] || { spreadsheetId: '', sheetName: 'Sheet1' }
              return (
                <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{agent.name}</p>
                    {enabled && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Ativo</Badge>
                    )}
                  </div>
                  {enabled && (
                    <p className="text-xs text-green-600">
                      Planilha: <code className="bg-muted px-1 rounded">{agent.config.sheetsImportSpreadsheetId as string}</code>
                      {' '}· Aba: <code className="bg-muted px-1 rounded">{agent.config.sheetsImportSheetName as string || 'Sheet1'}</code>
                    </p>
                  )}
                  {!enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">ID da Planilha</Label>
                        <Input
                          placeholder="1BxiMVs0XRA..."
                          value={cfg.spreadsheetId}
                          onChange={e => setImportConfig(prev => ({
                            ...prev,
                            [agent.id]: { ...prev[agent.id], spreadsheetId: e.target.value },
                          }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Nome da Aba</Label>
                        <Input
                          placeholder="Sheet1"
                          value={cfg.sheetName}
                          onChange={e => setImportConfig(prev => ({
                            ...prev,
                            [agent.id]: { ...prev[agent.id], sheetName: e.target.value },
                          }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {enabled ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disableImportForAgent(agent.id)}
                          disabled={savingImport === agent.id}
                        >
                          Desabilitar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAgents(prev => prev.map(a =>
                              a.id === agent.id ? { ...a, config: { ...a.config, sheetsImportEnabled: false } } : a
                            ))
                          }}
                          className="text-xs text-muted-foreground"
                        >
                          Alterar config
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => enableImportForAgent(agent.id)}
                        disabled={savingImport === agent.id}
                      >
                        {savingImport === agent.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : 'Habilitar Importação'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <p className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Cron de importação
              </p>
              <p className="text-muted-foreground">
                Configure <code className="bg-background px-1 rounded">0 9 1 * *</code> (mensal) ou{' '}
                <code className="bg-background px-1 rounded">0 9 * * 1</code> (semanal) apontando para{' '}
                <code className="bg-background px-1 rounded">/api/cron/sheets-import</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tools Disponíveis para Agentes</CardTitle>
          <CardDescription>
            Quando conectado, seus agentes podem usar estas tools automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: 'sheets_read',
                desc: 'Lê células de uma planilha. Ideal para buscar dados existentes.',
                params: 'spreadsheetId, range',
              },
              {
                name: 'sheets_write',
                desc: 'Escreve/atualiza células. Ideal para atualizar dados existentes.',
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
                    Parâmetros: <code className="bg-background px-1 rounded">{tool.params}</code>
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
              Teste a conexão lendo dados de uma planilha
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
            <li>• <strong>Importação de leads</strong>: importe lista de contatos e envie saudação automática</li>
            <li>• <strong>CRM simples</strong>: agente registra leads em planilha automaticamente</li>
            <li>• <strong>Relatório diário</strong>: agente agendado lê dados e gera resumo</li>
            <li>• <strong>Monitoramento de estoque</strong>: agente verifica disponibilidade e alerta</li>
            <li>• <strong>Pipeline de conteúdo</strong>: agente lê pauta da planilha e gera textos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GoogleSheetsIntegrationPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <GoogleSheetsContent />
    </Suspense>
  )
}
