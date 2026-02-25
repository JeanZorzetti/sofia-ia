'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Save,
  Search,
  BookOpen,
  Building2,
} from 'lucide-react'
import Link from 'next/link'

interface TotvsConfig {
  apiUrl: string
  username: string
  connected: boolean
}

export default function TotvsIntegrationPage() {
  const [config, setConfig] = useState<TotvsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ apiUrl: '', username: '', password: '' })
  const [testCode, setTestCode] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/totvs/status')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        if (data.connected) {
          setFormData(f => ({ ...f, apiUrl: data.apiUrl || '', username: data.username || '' }))
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    if (!formData.apiUrl || !formData.username || !formData.password) {
      alert('Preencha todos os campos obrigatorios')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/integrations/totvs/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        alert('Configuracao Totvs salva com sucesso!')
        fetchConfig()
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch {
      alert('Erro de conexao')
    } finally {
      setSaving(false)
    }
  }

  const handleTestCustomer = async () => {
    if (!testCode) { alert('Informe o codigo do cliente'); return }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/totvs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: testCode }),
      })
      const data = await res.json()
      setTestResult(JSON.stringify(data, null, 2))
    } catch {
      setTestResult('Erro de conexao')
    } finally {
      setTesting(false)
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
            <Building2 className="h-6 w-6 text-blue-700" />
            Totvs Protheus
          </h1>
          <p className="text-muted-foreground text-sm">
            Integre seus agentes IA com o ERP Totvs Protheus
          </p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status da Conexao</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </div>
          ) : config?.connected ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700">Configurado</span>
              <Badge variant="default" className="bg-green-600">Ativo</Badge>
              {config.apiUrl && (
                <span className="text-xs text-muted-foreground ml-2">{config.apiUrl}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Nao configurado</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credenciais do Protheus REST</CardTitle>
          <CardDescription>
            Configure a URL e as credenciais de acesso ao Totvs Protheus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiUrl">URL da API Protheus</Label>
            <Input
              id="apiUrl"
              placeholder="https://protheus.suaempresa.com/rest"
              value={formData.apiUrl}
              onChange={e => setFormData(f => ({ ...f, apiUrl: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL base da API REST do Totvs Protheus ou Fluig
            </p>
          </div>
          <div>
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              placeholder="admin"
              value={formData.username}
              onChange={e => setFormData(f => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Senha do Protheus"
              value={formData.password}
              onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Salvar Configuracao</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tools disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tools Disponiveis para Agentes</CardTitle>
          <CardDescription>
            Quando configurado, seus agentes podem usar estas tools automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: 'totvs_get_customer',
                desc: 'Busca dados de um cliente pelo codigo. Retorna nome, CNPJ, endereco.',
                params: 'code',
              },
              {
                name: 'totvs_create_order',
                desc: 'Cria pedido de venda no Protheus para um cliente com itens especificados.',
                params: 'customerId, items[]',
              },
            ].map(tool => (
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
      {config?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testar Busca de Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testCode">Codigo do Cliente (A1_COD)</Label>
              <Input
                id="testCode"
                placeholder="000001"
                value={testCode}
                onChange={e => setTestCode(e.target.value)}
              />
            </div>
            <Button onClick={handleTestCustomer} disabled={testing}>
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />Buscar Cliente</>
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
            <li>• <strong>Atendimento ao cliente</strong>: agente consulta dados do cliente no ERP durante o chat</li>
            <li>• <strong>Criacao de pedidos</strong>: agente cria pedido de venda diretamente pelo WhatsApp</li>
            <li>• <strong>Consulta de estoque</strong>: agente verifica disponibilidade de produtos</li>
            <li>• <strong>Relatorios automaticos</strong>: agente agendado busca dados e gera resumo gerencial</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
